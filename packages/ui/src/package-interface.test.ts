import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const IMPORT_SPECIFIER_PATTERN =
  /(?:import\s+(?:type\s+)?[\s\S]*?\s+from\s+|import\s*\(\s*)["']([^"']+)["']/g;

const getSourceFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...getSourceFiles(path));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.slice(path.lastIndexOf(".")))) {
      files.push(path);
    }
  }

  return files;
};

const getPackageName = (specifier: string): string | null => {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("@/") ||
    specifier.startsWith("node:") ||
    specifier.startsWith("/")
  ) {
    return null;
  }

  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return scope && name ? `${scope}/${name}` : specifier;
  }

  return specifier.split("/")[0] ?? specifier;
};

describe("@polaris/ui package interface", () => {
  it("exports source-shared component, hook, lib, and css entry points explicitly", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as { exports: Record<string, string> };

    expect(packageJson.exports).toMatchObject({
      "./components/shared/*": "./src/components/shared/*.tsx",
      "./components/ui/*": "./src/components/ui/*.tsx",
      "./components/ui/svgs/*": "./src/components/ui/svgs/*.tsx",
      "./globals.css": "./src/globals.css",
      "./hooks/*": "./src/hooks/*.ts",
      "./lib/*": "./src/lib/*.ts",
    });
  });

  it("declares every bare runtime import used by package source", () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8")
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const declaredPackages = new Set([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
      ...Object.keys(packageJson.peerDependencies ?? {}),
    ]);
    const sourceDir = join(process.cwd(), "src");
    const offenders: string[] = [];

    for (const file of getSourceFiles(sourceDir)) {
      if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) {
        continue;
      }

      const source = readFileSync(file, "utf8");

      for (const match of source.matchAll(IMPORT_SPECIFIER_PATTERN)) {
        const packageName = getPackageName(match[1] ?? "");

        if (packageName && !declaredPackages.has(packageName)) {
          offenders.push(
            `${relative(process.cwd(), file).replaceAll("\\", "/")}: ${packageName}`
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
