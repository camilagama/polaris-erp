import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import {
  collectModuleSpecifiers,
  findDependencyCycles,
  findSourceFiles,
  loadTypeScriptConfig,
  resolveTypeScriptModule,
} from "./boundary-test-helpers";

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  exports?: Record<string, unknown> | string;
  name: string;
  peerDependencies?: Record<string, string>;
}

interface WorkspaceProject {
  directory: string;
  kind: "app" | "package";
  manifest: PackageManifest;
  sourceDirectory: string;
  tsconfigPath: string;
}

const REPOSITORY_ROOT = resolve(process.cwd(), "..", "..");
const APP_PROJECTS_DIRECTORY = join(REPOSITORY_ROOT, "apps");
const PACKAGE_PROJECTS_DIRECTORY = join(REPOSITORY_ROOT, "packages");
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[a-z]:[\\/]/i;

const readWorkspaceProjects = (
  directory: string,
  kind: WorkspaceProject["kind"]
): WorkspaceProject[] =>
  readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const projectDirectory = join(directory, entry.name);
      const manifestPath = join(projectDirectory, "package.json");
      const tsconfigPath = join(projectDirectory, "tsconfig.json");

      if (!(existsSync(manifestPath) && existsSync(tsconfigPath))) {
        return [];
      }

      const manifest = JSON.parse(
        readFileSync(manifestPath, "utf8")
      ) as PackageManifest;

      return [
        {
          directory: projectDirectory,
          kind,
          manifest,
          sourceDirectory: join(projectDirectory, "src"),
          tsconfigPath,
        },
      ];
    });

const isPathInside = (directory: string, filePath: string): boolean => {
  const relativePath = relative(resolve(directory), resolve(filePath));

  return (
    relativePath === "" ||
    (!isAbsolute(relativePath) &&
      relativePath !== ".." &&
      !relativePath.startsWith(`..${sep}`))
  );
};

const getWorkspacePackageName = (specifier: string): string | null => {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("@/")
  ) {
    return null;
  }

  const [scopeOrName, scopedName] = specifier.split("/");
  return specifier.startsWith("@") && scopedName
    ? `${scopeOrName}/${scopedName}`
    : (scopeOrName ?? null);
};

const hasPublicExport = (
  packageProject: WorkspaceProject,
  specifier: string
): boolean => {
  const packageName = packageProject.manifest.name;
  if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) {
    return false;
  }

  const exportMap = packageProject.manifest.exports;
  const exportKeys =
    typeof exportMap === "string" ? ["."] : Object.keys(exportMap ?? {});
  const subpath =
    specifier === packageName ? "." : `.${specifier.slice(packageName.length)}`;

  return exportKeys.some((exportKey) => {
    if (!exportKey.includes("*")) {
      return exportKey === subpath;
    }

    const [prefix, suffix = ""] = exportKey.split("*");
    return (
      subpath.startsWith(prefix) &&
      subpath.endsWith(suffix) &&
      subpath.length >= prefix.length + suffix.length
    );
  });
};

const hasDeclaredWorkspaceDependency = (
  project: WorkspaceProject,
  packageName: string
): boolean => {
  const version =
    project.manifest.dependencies?.[packageName] ??
    project.manifest.devDependencies?.[packageName] ??
    project.manifest.peerDependencies?.[packageName];

  return version?.startsWith("workspace:") ?? false;
};

const matchesPathMapping = (
  specifier: string,
  pathPattern: string
): boolean => {
  const wildcardIndex = pathPattern.indexOf("*");
  if (wildcardIndex === -1) {
    return specifier === pathPattern;
  }

  const prefix = pathPattern.slice(0, wildcardIndex);
  const suffix = pathPattern.slice(wildcardIndex + 1);
  return (
    specifier.startsWith(prefix) &&
    specifier.endsWith(suffix) &&
    specifier.length >= prefix.length + suffix.length
  );
};

const needsTypeScriptResolution = (
  specifier: string,
  compilerOptions: ReturnType<typeof loadTypeScriptConfig>["options"]
): boolean => {
  const hasPathMapping = Object.keys(compilerOptions.paths ?? {}).some(
    (pathPattern) => matchesPathMapping(specifier, pathPattern)
  );
  const isRelativeOrAbsolutePath =
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    WINDOWS_ABSOLUTE_PATH_PATTERN.test(specifier);

  return (
    hasPathMapping ||
    isRelativeOrAbsolutePath ||
    Boolean(compilerOptions.baseUrl)
  );
};

const findWorkspaceImportViolations = (
  apps: WorkspaceProject[],
  packages: WorkspaceProject[]
): string[] => {
  const packageByName = new Map(
    packages.map((project) => [project.manifest.name, project])
  );
  const projects = [...apps, ...packages];
  const violations: string[] = [];

  for (const project of projects) {
    if (!existsSync(project.sourceDirectory)) {
      continue;
    }

    const compilerOptions = loadTypeScriptConfig(project.tsconfigPath).options;
    for (const sourceFile of findSourceFiles(project.sourceDirectory)) {
      const source = readFileSync(sourceFile, "utf8");
      const sourcePath = relative(REPOSITORY_ROOT, sourceFile).replaceAll(
        "\\",
        "/"
      );

      for (const specifier of collectModuleSpecifiers(source, sourceFile)) {
        const importedPackageName = getWorkspacePackageName(specifier);
        const importedPackage = importedPackageName
          ? packageByName.get(importedPackageName)
          : undefined;

        const importedAppByName = apps.find(
          (app) => app.manifest.name === importedPackageName
        );
        if (
          importedAppByName &&
          (project.kind === "package" || importedAppByName !== project)
        ) {
          violations.push(
            `${sourcePath}: ${project.kind} ${project.manifest.name} imports app package ${importedAppByName.manifest.name}`
          );
        }

        if (importedPackage && importedPackage !== project) {
          if (
            !hasDeclaredWorkspaceDependency(
              project,
              importedPackage.manifest.name
            )
          ) {
            violations.push(
              `${sourcePath}: ${specifier} requires a direct workspace dependency on ${importedPackage.manifest.name}`
            );
          }

          if (!hasPublicExport(importedPackage, specifier)) {
            violations.push(
              `${sourcePath}: ${specifier} is not exported by ${importedPackage.manifest.name}`
            );
          }
        }

        if (!needsTypeScriptResolution(specifier, compilerOptions)) {
          continue;
        }

        const resolvedModule = resolveTypeScriptModule(
          specifier,
          sourceFile,
          compilerOptions
        );
        if (!resolvedModule) {
          continue;
        }

        const importedApp = apps.find((app) =>
          isPathInside(app.sourceDirectory, resolvedModule)
        );
        if (importedApp) {
          if (project.kind === "package") {
            violations.push(
              `${sourcePath}: package ${project.manifest.name} imports app source ${relative(REPOSITORY_ROOT, resolvedModule).replaceAll("\\", "/")}`
            );
          } else if (importedApp !== project) {
            violations.push(
              `${sourcePath}: app ${project.manifest.name} imports app source ${importedApp.manifest.name}`
            );
          }
          continue;
        }

        const importedWorkspacePackage = packages.find((workspacePackage) =>
          isPathInside(workspacePackage.directory, resolvedModule)
        );
        if (
          importedWorkspacePackage &&
          importedWorkspacePackage !== project &&
          importedPackage !== importedWorkspacePackage
        ) {
          violations.push(
            `${sourcePath}: import ${specifier} reaches ${importedWorkspacePackage.manifest.name} source directly; use its public package export`
          );
        }
      }
    }
  }

  return [...new Set(violations)].sort();
};

const findPackageDependencyCycles = (
  packages: WorkspaceProject[]
): string[][] => {
  const packageNames = new Set(
    packages.map((project) => project.manifest.name)
  );
  const dependencyGraph = Object.fromEntries(
    packages.map((project) => {
      const declaredDependencies = {
        ...project.manifest.dependencies,
        ...project.manifest.devDependencies,
        ...project.manifest.peerDependencies,
      };

      return [
        project.manifest.name,
        Object.entries(declaredDependencies)
          .filter(
            ([dependencyName, version]) =>
              packageNames.has(dependencyName) &&
              version.startsWith("workspace:")
          )
          .map(([dependencyName]) => dependencyName),
      ];
    })
  );

  return findDependencyCycles(dependencyGraph);
};

describe("workspace dependency boundaries", () => {
  const apps = readWorkspaceProjects(APP_PROJECTS_DIRECTORY, "app");
  const packages = readWorkspaceProjects(PACKAGE_PROJECTS_DIRECTORY, "package");

  it("allows only declared public package imports and forbids cross-app imports", () => {
    expect(findWorkspaceImportViolations(apps, packages)).toEqual([]);
  });

  it("keeps the shared package dependency graph acyclic", () => {
    expect(findPackageDependencyCycles(packages)).toEqual([]);
  });

  it("reports cross-app, package-to-app, undeclared, and private imports", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "polaris-boundaries-"));
    const createProject = (
      projectPath: string,
      kind: WorkspaceProject["kind"],
      manifest: PackageManifest,
      source: string
    ): WorkspaceProject => {
      const directory = join(fixtureRoot, projectPath);
      const sourceDirectory = join(directory, "src");
      const tsconfigPath = join(directory, "tsconfig.json");
      mkdirSync(sourceDirectory, { recursive: true });
      writeFileSync(join(sourceDirectory, "index.ts"), source, "utf8");
      writeFileSync(
        join(directory, "package.json"),
        JSON.stringify(manifest),
        "utf8"
      );
      writeFileSync(
        tsconfigPath,
        JSON.stringify({
          compilerOptions: {
            module: "esnext",
            moduleResolution: "bundler",
            target: "es2022",
          },
        }),
        "utf8"
      );

      return {
        directory,
        kind,
        manifest,
        sourceDirectory,
        tsconfigPath,
      };
    };

    try {
      const web = createProject(
        "apps/web",
        "app",
        { name: "@fixture/web" },
        'import "../../admin/src";'
      );
      const admin = createProject(
        "apps/admin",
        "app",
        {
          dependencies: { "@fixture/shared": "workspace:*" },
          name: "@fixture/admin",
        },
        'import "@fixture/shared";'
      );
      const packageClient = createProject(
        "packages/client",
        "package",
        { name: "@fixture/client" },
        'import "../../../apps/web/src";\nimport "@fixture/shared";\nimport "@fixture/shared/private";'
      );
      const sharedPackage = createProject(
        "packages/shared",
        "package",
        {
          exports: { ".": "./src/index.ts" },
          name: "@fixture/shared",
        },
        "export const shared = true;"
      );

      expect(findWorkspaceImportViolations([admin], [sharedPackage])).toEqual(
        []
      );

      const violations = findWorkspaceImportViolations(
        [web, admin],
        [packageClient, sharedPackage]
      );

      expect(violations.join("\n")).toContain(
        "app @fixture/web imports app source @fixture/admin"
      );
      expect(violations.join("\n")).toContain(
        "package @fixture/client imports app source"
      );
      expect(violations.join("\n")).toContain(
        "requires a direct workspace dependency on @fixture/shared"
      );
      expect(violations.join("\n")).toContain(
        "@fixture/shared/private is not exported by @fixture/shared"
      );
    } finally {
      rmSync(fixtureRoot, { force: true, recursive: true });
    }
  });
});
