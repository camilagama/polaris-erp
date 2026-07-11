import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CallExpression,
  createSourceFile,
  forEachChild,
  isArrowFunction,
  isCallExpression,
  isFunctionDeclaration,
  isFunctionExpression,
  isIdentifier,
  isMethodDeclaration,
  isVariableDeclaration,
  type Node,
  ScriptKind,
  ScriptTarget,
  type SourceFile,
} from "typescript";

export interface CoreAuditBoundary {
  filePath: string;
  functionNames: string[];
}

export interface CoreAuditBoundaryFinding {
  column: number;
  filePath: string;
  functionName: string;
  line: number;
}

export const CORE_AUDIT_BOUNDARIES: CoreAuditBoundary[] = [
  {
    filePath: join("apps", "web", "src", "features", "products", "actions.ts"),
    functionNames: [
      "createProductAction",
      "updateProductAction",
      "addProductStockAction",
      "writeOffProductStockAction",
      "replaceProductImageAction",
      "removeProductImageAction",
      "archiveProductAction",
      "unarchiveProductAction",
    ],
  },
  {
    filePath: join("apps", "web", "src", "features", "sales", "actions.ts"),
    functionNames: ["createSaleAction", "cancelSaleAction"],
  },
];

const isFunctionLike = (node: Node): boolean =>
  isFunctionDeclaration(node) ||
  isFunctionExpression(node) ||
  isArrowFunction(node) ||
  isMethodDeclaration(node);

const isRecordAuditEventCall = (node: Node): node is CallExpression =>
  isCallExpression(node) &&
  isIdentifier(node.expression) &&
  node.expression.text === "recordAuditEvent";

const getVariableFunctionName = (node: Node): string | null => {
  if (!(isVariableDeclaration(node) && isIdentifier(node.name))) {
    return null;
  }

  if (
    node.initializer &&
    (isArrowFunction(node.initializer) ||
      isFunctionExpression(node.initializer))
  ) {
    return node.name.text;
  }

  return null;
};

const getFunctionDeclarationName = (node: Node): string | null => {
  if (isFunctionDeclaration(node) && node.name) {
    return node.name.text;
  }

  return getVariableFunctionName(node);
};

const getInspectableBody = (node: Node): Node | undefined => {
  if (isFunctionDeclaration(node) || isFunctionExpression(node)) {
    return node.body;
  }

  if (
    isVariableDeclaration(node) &&
    node.initializer &&
    (isArrowFunction(node.initializer) ||
      isFunctionExpression(node.initializer))
  ) {
    return node.initializer.body;
  }

  return;
};

const inspectFunctionBody = ({
  body,
  filePath,
  functionName,
  sourceFile,
}: {
  body: Node;
  filePath: string;
  functionName: string;
  sourceFile: SourceFile;
}): CoreAuditBoundaryFinding[] => {
  const findings: CoreAuditBoundaryFinding[] = [];

  const visit = (node: Node): void => {
    if (node !== body && isFunctionLike(node)) {
      return;
    }

    if (isRecordAuditEventCall(node)) {
      const position = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile)
      );

      findings.push({
        column: position.character + 1,
        filePath,
        functionName,
        line: position.line + 1,
      });
    }

    forEachChild(node, visit);
  };

  visit(body);
  return findings;
};

export const findBestEffortAuditCallsInCoreFunctions = ({
  filePath,
  functionNames,
  sourceText,
}: {
  filePath: string;
  functionNames: string[];
  sourceText: string;
}): CoreAuditBoundaryFinding[] => {
  const sourceFile = createSourceFile(
    filePath,
    sourceText,
    ScriptTarget.Latest,
    true,
    ScriptKind.TS
  );
  const targetNames = new Set(functionNames);
  const findings: CoreAuditBoundaryFinding[] = [];

  const visit = (node: Node): void => {
    const functionName = getFunctionDeclarationName(node);

    if (functionName && targetNames.has(functionName)) {
      const body = getInspectableBody(node);

      if (body) {
        findings.push(
          ...inspectFunctionBody({
            body,
            filePath,
            functionName,
            sourceFile,
          })
        );
      }
    }

    forEachChild(node, visit);
  };

  visit(sourceFile);
  return findings;
};

export const checkCoreAuditBoundaries = (
  workspaceRoot = process.cwd()
): CoreAuditBoundaryFinding[] =>
  CORE_AUDIT_BOUNDARIES.flatMap((boundary) =>
    findBestEffortAuditCallsInCoreFunctions({
      filePath: boundary.filePath,
      functionNames: boundary.functionNames,
      sourceText: readFileSync(join(workspaceRoot, boundary.filePath), "utf8"),
    })
  );

const main = (): void => {
  const findings = checkCoreAuditBoundaries();

  if (findings.length > 0) {
    console.error(
      "Core ERP write actions must not use best-effort recordAuditEvent. Move audit into the domain transaction instead:"
    );

    for (const finding of findings) {
      console.error(
        `- ${finding.filePath}:${finding.line}:${finding.column} ${finding.functionName}`
      );
    }

    process.exit(1);
  }

  console.log("Core ERP audit boundary guard passed.");
};

if (import.meta.main) {
  main();
}
