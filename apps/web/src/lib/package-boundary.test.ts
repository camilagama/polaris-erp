import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const PACKAGE_TEXT_FILE_PATTERN = /\.(json|jsonc|mjs|cjs|js|jsx|ts|tsx)$/;
const APP_IMPORT_PATTERN =
  /(?:from\s+|import\s*\(\s*|import\s+)["'](?:@\/|(?:\.\.\/)+apps\/web\/src\/)/;
const RELATIVE_WEB_IMPORT_PATTERN =
  /(?:from\s+|import\s*\(\s*|import\s+)["'](?:\.\.\/)+apps\/web\/src\//;
const SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;
const IMPORT_SPECIFIER_PATTERN =
  /(?:import\s+(?:type\s+)?[\s\S]*?\s+from\s+|export\s+(?:type\s+)?[\s\S]*?\s+from\s+|import\s*\(\s*)["']([^"']+)["']/g;
const UI_PUBLIC_IMPORT_PATTERN =
  /(?:from\s+|import\s*\(\s*|import\s+)["'](@polaris\/ui(?:\/[^"']+)?)["']/g;

const getPackageName = (specifier: string): string | null => {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("@/") ||
    specifier.endsWith(".css")
  ) {
    return null;
  }

  if (specifier.startsWith("@")) {
    const [scope, packageName] = specifier.split("/");
    return scope && packageName ? `${scope}/${packageName}` : specifier;
  }

  return specifier.split("/")[0] ?? specifier;
};

const findPackageFiles = (directory: string): string[] => {
  if (!existsSync(directory)) {
    return [];
  }

  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules") {
      continue;
    }

    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...findPackageFiles(path));
      continue;
    }

    if (PACKAGE_TEXT_FILE_PATTERN.test(entry)) {
      files.push(path);
    }
  }

  return files;
};

describe("package boundaries", () => {
  it("keeps shared packages independent from the web app source tree", () => {
    const packageDir = join(process.cwd(), "..", "..", "packages");
    const offenders = findPackageFiles(packageDir)
      .filter((file) => {
        const normalizedPath = relative(process.cwd(), file).replaceAll(
          "\\",
          "/"
        );
        const source = readFileSync(file, "utf8");

        if (normalizedPath.startsWith("../../packages/ui/")) {
          return RELATIVE_WEB_IMPORT_PATTERN.test(source);
        }

        return APP_IMPORT_PATTERN.test(source);
      })
      .map((file) => relative(process.cwd(), file).replaceAll("\\", "/"));

    expect(offenders).toEqual([]);
  });

  it("keeps @polaris/ui external imports declared in its manifest", () => {
    const packageDir = join(process.cwd(), "..", "..", "packages", "ui");
    const manifest = JSON.parse(
      readFileSync(join(packageDir, "package.json"), "utf8")
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const declaredPackages = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);
    const sourceDir = join(packageDir, "src");
    const importedPackages = new Set<string>();

    for (const file of findPackageFiles(sourceDir)) {
      if (!SOURCE_FILE_PATTERN.test(file) || TEST_FILE_PATTERN.test(file)) {
        continue;
      }

      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(IMPORT_SPECIFIER_PATTERN)) {
        const packageName = getPackageName(match[1]);

        if (packageName) {
          importedPackages.add(packageName);
        }
      }
    }

    expect([...importedPackages].sort()).toEqual(
      [...importedPackages].filter((name) => declaredPackages.has(name)).sort()
    );
  });

  it("keeps app imports from @polaris/ui within exported package subpaths", () => {
    const packageDir = join(process.cwd(), "..", "..", "packages", "ui");
    const manifest = JSON.parse(
      readFileSync(join(packageDir, "package.json"), "utf8")
    ) as { exports?: Record<string, string> };
    const exportedSubpaths = Object.keys(manifest.exports ?? {});
    const isExportedSpecifier = (specifier: string): boolean =>
      exportedSubpaths.some((subpath) => {
        const exportedSpecifier =
          subpath === "." ? "@polaris/ui" : `@polaris/ui/${subpath.slice(2)}`;

        if (!exportedSpecifier.includes("*")) {
          return specifier === exportedSpecifier;
        }

        const [prefix, suffix = ""] = exportedSpecifier.split("*");
        return specifier.startsWith(prefix) && specifier.endsWith(suffix);
      });
    const appDirs = [
      join(process.cwd(), "src"),
      join(process.cwd(), "..", "admin", "src"),
    ];
    const offenders: string[] = [];

    for (const appDir of appDirs) {
      for (const file of findPackageFiles(appDir)) {
        if (!SOURCE_FILE_PATTERN.test(file)) {
          continue;
        }

        const source = readFileSync(file, "utf8");
        for (const match of source.matchAll(UI_PUBLIC_IMPORT_PATTERN)) {
          if (!isExportedSpecifier(match[1])) {
            offenders.push(
              `${relative(process.cwd(), file).replaceAll("\\", "/")}: ${match[1]}`
            );
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
