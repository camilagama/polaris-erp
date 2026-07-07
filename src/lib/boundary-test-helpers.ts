import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx)$/;
const IMPORT_DECLARATION_PREFIX_PATTERN = String.raw`(?:from\s+|import\s*\(\s*|import\s+)`;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createInternalImportPattern = (moduleNames: string[]): RegExp => {
  const modulePattern = moduleNames.map(escapeRegExp).join("|");

  return new RegExp(
    `${IMPORT_DECLARATION_PREFIX_PATTERN}["']@/(?:${modulePattern})(?:/[^"']*)?["']`
  );
};

export const findSourceFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      files.push(...findSourceFiles(path));
      continue;
    }

    if (TYPESCRIPT_SOURCE_FILE_PATTERN.test(entry)) {
      files.push(path);
    }
  }

  return files;
};

export const findRuntimeSourceFiles = (directory: string): string[] =>
  findSourceFiles(directory).filter((file) => !file.includes(".test."));

export const findFilesMatching = (files: string[], pattern: RegExp): string[] =>
  files
    .filter((file) => pattern.test(readFileSync(file, "utf8")))
    .map((file) => relative(process.cwd(), file));
