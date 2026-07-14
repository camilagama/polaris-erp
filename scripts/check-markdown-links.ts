import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const workspaceRoot = process.cwd();
const markdownLinkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const collectMarkdownFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);

    if (statSync(path).isDirectory()) {
      files.push(...collectMarkdownFiles(path));
      continue;
    }

    if (extname(path) === ".md") {
      files.push(path);
    }
  }

  return files;
};

const isExternalOrAnchorLink = (target: string): boolean =>
  target.startsWith("#") ||
  target.startsWith("http://") ||
  target.startsWith("https://") ||
  target.startsWith("mailto:");

const getPathTarget = (target: string): string => target.split("#", 1)[0];

const isExistingLocalTarget = (file: string, target: string): boolean => {
  const resolvedPath = resolve(file, "..", getPathTarget(target));

  return (
    resolvedPath.startsWith(workspaceRoot) &&
    statSync(resolvedPath, {
      throwIfNoEntry: false,
    })?.isFile() === true
  );
};

const main = (): void => {
  const markdownFiles = [
    join(workspaceRoot, "README.md"),
    ...collectMarkdownFiles(join(workspaceRoot, "docs")),
  ];
  const missingLinks: string[] = [];

  for (const file of markdownFiles) {
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(markdownLinkPattern)) {
      const target = match[1];

      if (!(target && !isExternalOrAnchorLink(target))) {
        continue;
      }

      if (!isExistingLocalTarget(file, target)) {
        missingLinks.push(
          `${file.replace(`${workspaceRoot}\\`, "")}: ${target}`
        );
      }
    }
  }

  if (missingLinks.length > 0) {
    throw new Error(
      `Markdown links point to missing local files:\n${missingLinks.join("\n")}`
    );
  }
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
