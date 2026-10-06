import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import type {
  CompilerOptions,
  ModuleResolutionHost,
  ParsedCommandLine,
} from "typescript";
import {
  createSourceFile,
  forEachChild,
  isCallExpression,
  isExportDeclaration,
  isExternalModuleReference,
  isIdentifier,
  isImportDeclaration,
  isImportEqualsDeclaration,
  isImportTypeNode,
  isLiteralTypeNode,
  isStringLiteralLike,
  parseJsonConfigFileContent,
  readConfigFile,
  resolveModuleName,
  ScriptKind,
  ScriptTarget,
  SyntaxKind,
  sys,
} from "typescript";

const TYPESCRIPT_SOURCE_FILE_PATTERN = /\.(ts|tsx|mts|cts)$/;
const IMPORT_DECLARATION_PREFIX_PATTERN = String.raw`(?:from\s+|import\s*\(\s*|import\s+)`;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const collectModuleSpecifiers = (
  source: string,
  fileName = "source.ts"
): string[] => {
  const sourceFile = createSourceFile(
    fileName,
    source,
    ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") ? ScriptKind.TSX : ScriptKind.TS
  );
  const specifiers: string[] = [];

  const visit = (node: Parameters<typeof forEachChild>[0]): void => {
    if (
      (isImportDeclaration(node) || isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      isCallExpression(node) &&
      node.arguments[0] &&
      isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === SyntaxKind.ImportKeyword ||
        (isIdentifier(node.expression) && node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    } else if (
      isImportTypeNode(node) &&
      isLiteralTypeNode(node.argument) &&
      isStringLiteralLike(node.argument.literal)
    ) {
      specifiers.push(node.argument.literal.text);
    } else if (
      isImportEqualsDeclaration(node) &&
      isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      isStringLiteralLike(node.moduleReference.expression)
    ) {
      specifiers.push(node.moduleReference.expression.text);
    }

    forEachChild(node, visit);
  };

  visit(sourceFile);
  return specifiers;
};

export const loadTypeScriptConfig = (configPath: string): ParsedCommandLine => {
  const configFile = readConfigFile(configPath, sys.readFile);

  if (configFile.error) {
    throw new Error(
      `Unable to read TypeScript config ${configPath}: ${configFile.error.messageText}`
    );
  }

  const parsedConfig = parseJsonConfigFileContent(
    configFile.config,
    sys,
    dirname(configPath),
    {},
    configPath
  );
  const configError = parsedConfig.errors[0];

  if (configError) {
    throw new Error(
      `Unable to parse TypeScript config ${configPath}: ${configError.messageText}`
    );
  }

  return parsedConfig;
};

export const resolveTypeScriptModule = (
  specifier: string,
  containingFile: string,
  compilerOptions: CompilerOptions,
  host: ModuleResolutionHost = sys
): string | undefined => {
  const resolvedFileName = resolveModuleName(
    specifier,
    containingFile,
    compilerOptions,
    host
  ).resolvedModule?.resolvedFileName;

  return resolvedFileName ? normalize(resolvedFileName) : undefined;
};

export const findDependencyCycles = (
  dependencies: Record<string, string[]>
): string[][] => {
  const cycles = new Map<string, string[]>();
  const activeNodes: string[] = [];
  const activeIndexes = new Map<string, number>();
  const visited = new Set<string>();

  const visit = (packageName: string): void => {
    if (visited.has(packageName)) {
      return;
    }

    activeIndexes.set(packageName, activeNodes.length);
    activeNodes.push(packageName);

    for (const dependency of [...(dependencies[packageName] ?? [])].sort()) {
      if (!Object.hasOwn(dependencies, dependency)) {
        continue;
      }

      const cycleStart = activeIndexes.get(dependency);
      if (cycleStart !== undefined) {
        const cycle = activeNodes.slice(cycleStart);
        const smallestName = [...cycle].sort()[0];
        const smallestIndex = cycle.indexOf(smallestName);
        const normalizedCycle = [
          ...cycle.slice(smallestIndex),
          ...cycle.slice(0, smallestIndex),
        ];
        const key = normalizedCycle.join(" -> ");
        cycles.set(key, [...normalizedCycle, normalizedCycle[0]]);
        continue;
      }

      visit(dependency);
    }

    activeNodes.pop();
    activeIndexes.delete(packageName);
    visited.add(packageName);
  };

  for (const packageName of Object.keys(dependencies).sort()) {
    visit(packageName);
  }

  return [...cycles.values()];
};

export const createInternalImportPattern = (moduleNames: string[]): RegExp => {
  const modulePattern = moduleNames.map(escapeRegExp).join("|");

  return new RegExp(
    `${IMPORT_DECLARATION_PREFIX_PATTERN}["']@/(?:${modulePattern})(?:/[^"']*)?["']`
  );
};

export const createExactInternalImportPattern = (
  moduleNames: string[]
): RegExp => {
  const modulePattern = moduleNames.map(escapeRegExp).join("|");

  return new RegExp(
    `${IMPORT_DECLARATION_PREFIX_PATTERN}["']@/(?:${modulePattern})["']`
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

export const findFilesMissingCompanionPattern = (
  files: string[],
  requiredPattern: RegExp,
  companionPattern: RegExp,
  sourceByFile?: Record<string, string>
): string[] =>
  files
    .filter((file) => {
      const source = sourceByFile?.[file] ?? readFileSync(file, "utf8");

      return requiredPattern.test(source) && !companionPattern.test(source);
    })
    .map((file) => relative(process.cwd(), file).replaceAll("\\", "/"));
