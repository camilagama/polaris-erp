import {
  existsSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { decodeHTML } from "entities";
import GithubSlugger from "github-slugger";
import { Marked, type Tokens } from "marked";
import { parseDocument } from "yaml";

const workspaceRoot = resolve(process.cwd());
const canonicalRootDocuments = [
  "README.md",
  "AGENTS.md",
  "PRODUCT.md",
  "DESIGN.md",
  "CONTEXT.md",
] as const;
const businessRuleDocuments = {
  rules: "docs/business-rules/normative/approved-rules.md",
  decisions: "docs/business-rules/decision-register.md",
  profiles: "docs/business-rules/normative/individual-rule-profiles.md",
  adherence: "docs/business-rules/normative/adherence-by-rule.md",
  decisionCoverage: "docs/business-rules/decision-coverage.md",
} as const;
const anchorMapSectionStart = "## Fontes canônicas e estado de reconciliação";
const anchorMapSectionEnd = "## Material histórico e planos";
const markdown = new Marked({ gfm: true });
const frontmatterStartPattern = /^---[ \t]*(?:\r?\n)/;
const frontmatterBlockPattern =
  /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
const whitespacePattern = /\s+/g;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const absoluteWindowsPathPattern = /^\/[a-z]:\//i;
const uriSchemePattern = /^[a-z][a-z\d+.-]*:/i;
const supersededWarningPattern = /não executar|do not execute/i;
const shorthandDecisionPattern = /\bDEC-\d{3}\b/;
const htmlLinkPattern =
  /<(?:a|img|source|video|audio)\b[^>]*\b(?:href|src)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
const htmlAnchorPattern =
  /\b(?:id|name)\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
const ruleHeadingPattern =
  /^#{2,6}\s+([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3})\s+[—-]/gm;
const ruleTableRowPattern =
  /^\|\s*([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{3})\s*\|/gm;
const decisionTableRowPattern = /^\|\s*(DEC-BR-\d{3})\s*\|/gm;
const decisionReferencePattern =
  /\bDEC-BR-(\d{3})((?:\s*(?:,|\/|[-–—]|\ba\b)\s*\d{3})*)/gi;
const decisionSuffixPattern = /(,|\/|[-–—]|\ba\b)\s*(\d{3})/gi;

type Frontmatter = Record<string, unknown>;
interface MarkdownLink {
  href: string;
  source: string;
}
type ResolvedTarget =
  | { kind: "external" }
  | { kind: "invalid"; message: string }
  | { fragment: string; kind: "local"; path: string };

interface MarkdownDocument {
  body: string;
  frontmatter?: Frontmatter;
  path: string;
  relativePath: string;
}

interface ParsedFrontmatter {
  body: string;
  data?: Frontmatter;
}

const toPosixPath = (path: string): string => path.split(sep).join("/");

const relativePath = (root: string, path: string): string =>
  toPosixPath(relative(root, path));

const isWithin = (root: string, candidate: string): boolean => {
  const pathFromRoot = relative(root, candidate);

  return (
    pathFromRoot === "" ||
    (pathFromRoot !== ".." &&
      !pathFromRoot.startsWith(`..${sep}`) &&
      !isAbsolute(pathFromRoot))
  );
};

const collectMarkdownFiles = (directory: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(path));
      continue;
    }

    if (entry.isFile() && extname(path).toLowerCase() === ".md") {
      files.push(path);
    }
  }

  return files.sort();
};

const extractFrontmatter = (
  source: string,
  file: string,
  errors: string[]
): ParsedFrontmatter => {
  if (!frontmatterStartPattern.test(source)) {
    return { body: source };
  }

  const match = frontmatterBlockPattern.exec(source);

  if (!match) {
    errors.push(`${file}: frontmatter started but has no closing delimiter`);
    return { body: source };
  }

  const document = parseDocument(match[1] ?? "", { uniqueKeys: true });

  for (const error of document.errors) {
    errors.push(
      `${file}: invalid YAML frontmatter: ${error.message.replace(whitespacePattern, " ")}`
    );
  }

  if (document.errors.length > 0) {
    return { body: source.slice(match[0].length) };
  }

  const data: unknown = document.toJS();

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    errors.push(`${file}: YAML frontmatter must be a mapping`);
    return { body: source.slice(match[0].length) };
  }

  return {
    body: source.slice(match[0].length),
    data: data as Frontmatter,
  };
};

const parseMarkdownDocument = (
  path: string,
  root: string,
  errors: string[]
): MarkdownDocument => {
  const source = readFileSync(path, "utf8");
  const parsedFrontmatter = extractFrontmatter(
    source,
    relativePath(root, path),
    errors
  );

  return {
    body: parsedFrontmatter.body,
    frontmatter: parsedFrontmatter.data,
    path,
    relativePath: relativePath(root, path),
  };
};

const parseDate = (value: unknown): boolean => {
  if (typeof value !== "string" || !isoDatePattern.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const resolveLocalTarget = (
  root: string,
  sourceFile: string,
  href: string
): ResolvedTarget => {
  const target = href.trim();

  if (
    !target ||
    target.startsWith("//") ||
    absoluteWindowsPathPattern.test(target) ||
    uriSchemePattern.test(target)
  ) {
    return target
      ? { kind: "external" }
      : { fragment: "", kind: "local", path: sourceFile };
  }

  const fragmentIndex = target.indexOf("#");
  const fragmentText =
    fragmentIndex >= 0 ? target.slice(fragmentIndex + 1) : "";
  const pathText = (
    fragmentIndex >= 0 ? target.slice(0, fragmentIndex) : target
  ).split("?", 1)[0];

  let decodedPath: string;
  let fragment: string;

  try {
    decodedPath = decodeURIComponent(pathText);
    fragment = decodeURIComponent(fragmentText);
  } catch {
    return {
      kind: "invalid",
      message: `invalid percent encoding in ${target}`,
    };
  }

  const candidate = decodedPath
    ? resolve(join(sourceFile, ".."), decodedPath)
    : sourceFile;

  if (!isWithin(root, candidate)) {
    return {
      kind: "invalid",
      message: `path escapes the workspace: ${target}`,
    };
  }

  if (!(existsSync(candidate) && statSync(candidate).isFile())) {
    return { kind: "invalid", message: `missing local target: ${target}` };
  }

  const canonicalRoot = realpathSync(root);
  const canonicalTarget = realpathSync(candidate);

  if (!isWithin(canonicalRoot, canonicalTarget)) {
    return {
      kind: "invalid",
      message: `target resolves outside the workspace: ${target}`,
    };
  }

  return { fragment, kind: "local", path: candidate };
};

const collectMarkdownLinks = (body: string, source: string): MarkdownLink[] => {
  const links: MarkdownLink[] = [];
  const tokens = markdown.lexer(body);

  markdown.walkTokens(tokens, (token) => {
    if (token.type === "link" || token.type === "image") {
      links.push({ href: token.href, source });
      return;
    }

    if (token.type === "html") {
      const attributes = token.text.matchAll(htmlLinkPattern);

      for (const attribute of attributes) {
        const href = attribute[1] ?? attribute[2] ?? attribute[3];

        if (href) {
          links.push({ href, source });
        }
      }
    }
  });

  return links;
};

const collectAnchors = (body: string): Set<string> => {
  const anchors = new Set<string>();
  const slugger = new GithubSlugger();
  const tokens = markdown.lexer(body);
  const textParser = new markdown.Parser();
  const textRenderer = new markdown.TextRenderer();

  markdown.walkTokens(tokens, (token) => {
    if (token.type === "heading") {
      const heading = token as Tokens.Heading;
      const headingText = textParser.parseInline(heading.tokens, textRenderer);
      anchors.add(slugger.slug(decodeHTML(headingText)));
      return;
    }

    if (token.type === "html") {
      const attributes = token.text.matchAll(htmlAnchorPattern);

      for (const attribute of attributes) {
        const id = attribute[1] ?? attribute[2] ?? attribute[3];

        if (id) {
          anchors.add(decodeHTML(id));
        }
      }
    }
  });

  return anchors;
};

const validateHistoricalMetadata = (
  document: MarkdownDocument,
  metadata: Frontmatter,
  errors: string[]
): void => {
  if (metadata.status === undefined) {
    if (metadata.snapshot_date !== undefined) {
      errors.push(
        `${document.relativePath}: snapshot_date requires status: historical`
      );
    }

    return;
  }

  if (metadata.status !== "historical") {
    errors.push(
      `${document.relativePath}: unsupported status ${String(metadata.status)}`
    );
  }

  if (
    metadata.snapshot_date !== undefined &&
    !parseDate(metadata.snapshot_date)
  ) {
    errors.push(
      `${document.relativePath}: snapshot_date must be a real YYYY-MM-DD date`
    );
  }
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const getSupersededDestinations = (
  document: MarkdownDocument,
  metadata: Frontmatter,
  errors: string[]
): string[] => {
  const values = Array.isArray(metadata.superseded_by)
    ? metadata.superseded_by
    : [metadata.superseded_by];

  if (values.length === 0 || !values.every(isNonEmptyString)) {
    errors.push(
      `${document.relativePath}: superseded documents require superseded_by paths`
    );
    return [];
  }

  return values;
};

const validateSupersededDestinations = (
  document: MarkdownDocument,
  root: string,
  destinations: string[],
  errors: string[]
): void => {
  for (const destination of destinations) {
    const resolved = resolveLocalTarget(root, document.path, destination);

    if (resolved.kind === "local") {
      continue;
    }

    const reason =
      resolved.kind === "external"
        ? "must point to a local path"
        : resolved.message;
    errors.push(
      `${document.relativePath}: invalid superseded_by ${destination}: ${reason}`
    );
  }
};

const validateExecutionMetadata = (
  document: MarkdownDocument,
  metadata: Frontmatter,
  root: string,
  errors: string[]
): void => {
  const status = metadata.execution_status;
  const allowedStatuses = new Set(["active", "completed", "superseded"]);

  if (
    status !== undefined &&
    (typeof status !== "string" || !allowedStatuses.has(status))
  ) {
    errors.push(
      `${document.relativePath}: execution_status must be active, completed, or superseded`
    );
  }

  if (status === "superseded") {
    const destinations = getSupersededDestinations(document, metadata, errors);

    if (!supersededWarningPattern.test(document.body)) {
      errors.push(
        `${document.relativePath}: superseded documents require a visible “Não executar” warning`
      );
    }

    validateSupersededDestinations(document, root, destinations, errors);
    return;
  }

  if (metadata.superseded_by !== undefined) {
    errors.push(
      `${document.relativePath}: superseded_by requires execution_status: superseded`
    );
  }
};

const validateFrontmatter = (
  document: MarkdownDocument,
  root: string,
  errors: string[]
): void => {
  const metadata = document.frontmatter;

  if (!metadata) {
    return;
  }

  validateHistoricalMetadata(document, metadata, errors);
  validateExecutionMetadata(document, metadata, root, errors);
};

const getCanonicalDocuments = (root: string, errors: string[]): string[] => {
  const docsDirectory = join(root, "docs");

  if (!(existsSync(docsDirectory) && statSync(docsDirectory).isDirectory())) {
    errors.push("docs/: canonical documentation directory is missing");
    return [];
  }

  const files: string[] = [];

  for (const relativeFile of canonicalRootDocuments) {
    const path = join(root, relativeFile);

    if (!(existsSync(path) && statSync(path).isFile())) {
      errors.push(
        `${relativeFile}: required canonical root document is missing`
      );
      continue;
    }

    files.push(path);
  }

  return [...files, ...collectMarkdownFiles(docsDirectory)];
};

const getAnchorValidationSources = (
  root: string,
  documents: MarkdownDocument[],
  errors: string[]
): Set<string> => {
  const sources = new Set(
    canonicalRootDocuments.map((file) => join(root, file))
  );
  const indexPath = join(root, "docs", "README.md");
  const index = documents.find((document) => document.path === indexPath);

  if (!index) {
    errors.push("docs/README.md: canonical documentation index is missing");
    return sources;
  }

  sources.add(indexPath);
  const sectionStart = index.body.indexOf(anchorMapSectionStart);
  const sectionEnd = index.body.indexOf(anchorMapSectionEnd, sectionStart);

  if (sectionStart < 0 || sectionEnd < 0) {
    errors.push(
      `docs/README.md: expected “${anchorMapSectionStart}” and “${anchorMapSectionEnd}” sections for the anchor map`
    );
    return sources;
  }

  const canonicalMap = index.body.slice(sectionStart, sectionEnd);

  for (const { href } of collectMarkdownLinks(canonicalMap, indexPath)) {
    const target = resolveLocalTarget(root, indexPath, href);

    if (
      target.kind === "local" &&
      isWithin(join(root, "docs"), target.path) &&
      extname(target.path).toLowerCase() === ".md"
    ) {
      sources.add(target.path);
    }
  }

  return sources;
};

const validateLinks = (
  root: string,
  documents: MarkdownDocument[],
  anchorSources: Set<string>,
  errors: string[]
): void => {
  const anchorCache = new Map<string, Set<string>>();

  for (const document of documents) {
    const links = collectMarkdownLinks(document.body, document.relativePath);

    for (const link of links) {
      const target = resolveLocalTarget(root, document.path, link.href);

      if (target.kind === "external") {
        continue;
      }

      if (target.kind === "invalid") {
        errors.push(`${link.source}: ${target.message}`);
        continue;
      }

      if (
        !(target.fragment && anchorSources.has(document.path)) ||
        extname(target.path).toLowerCase() !== ".md"
      ) {
        continue;
      }

      let anchors = anchorCache.get(target.path);

      if (!anchors) {
        const targetSource = readFileSync(target.path, "utf8");
        const targetFrontmatter = extractFrontmatter(
          targetSource,
          relativePath(root, target.path),
          errors
        );
        anchors = collectAnchors(targetFrontmatter.body);
        anchorCache.set(target.path, anchors);
      }

      if (!anchors.has(target.fragment)) {
        errors.push(
          `${link.source}: missing local anchor #${target.fragment} in ${relativePath(root, target.path)}`
        );
      }
    }
  }
};

const findRuleIds = (source: string): string[] => {
  const ids: string[] = [];

  for (const match of source.matchAll(ruleHeadingPattern)) {
    const id = match[1];

    if (id && !id.startsWith("DEC-BR-")) {
      ids.push(id);
    }
  }

  return ids;
};

const findTableRuleIds = (source: string): string[] => {
  const ids: string[] = [];

  for (const match of source.matchAll(ruleTableRowPattern)) {
    const id = match[1];

    if (id && !id.startsWith("DEC-BR-")) {
      ids.push(id);
    }
  }

  return ids;
};

const findDecisionIds = (source: string): string[] => {
  const ids: string[] = [];

  for (const match of source.matchAll(decisionTableRowPattern)) {
    if (match[1]) {
      ids.push(match[1]);
    }
  }

  return ids;
};

const findDecisionReferences = (source: string): string[] => {
  const references: string[] = [];

  for (const match of source.matchAll(decisionReferencePattern)) {
    const first = Number(match[1]);

    if (!Number.isInteger(first)) {
      continue;
    }

    references.push(`DEC-BR-${String(first).padStart(3, "0")}`);
    let previous = first;
    const suffixes = match[2] ?? "";

    for (const suffix of suffixes.matchAll(decisionSuffixPattern)) {
      const operator = (suffix[1] ?? "").trim().toLowerCase();
      const next = Number(suffix[2]);

      if (
        operator === "-" ||
        operator === "–" ||
        operator === "—" ||
        operator === "a"
      ) {
        const start = Math.min(previous, next);
        const end = Math.max(previous, next);

        for (let value = start + 1; value <= end; value += 1) {
          references.push(`DEC-BR-${String(value).padStart(3, "0")}`);
        }
      } else {
        references.push(`DEC-BR-${String(next).padStart(3, "0")}`);
      }

      previous = next;
    }
  }

  return references;
};

const validateUniqueIds = (
  ids: string[],
  file: string,
  label: string,
  errors: string[]
): Set<string> => {
  const unique = new Set<string>();

  for (const id of ids) {
    if (unique.has(id)) {
      errors.push(`${file}: duplicate ${label} ${id}`);
    }

    unique.add(id);
  }

  if (unique.size === 0) {
    errors.push(`${file}: no ${label} definitions were found`);
  }

  return unique;
};

const loadBusinessRuleDocuments = (
  root: string,
  errors: string[]
): Map<string, string> => {
  const contentByPath = new Map<string, string>();

  for (const [key, path] of Object.entries(businessRuleDocuments)) {
    const absolutePath = join(root, path);

    if (!(existsSync(absolutePath) && statSync(absolutePath).isFile())) {
      errors.push(`${path}: required canonical rule document is missing`);
      contentByPath.set(key, "");
      continue;
    }

    contentByPath.set(key, readFileSync(absolutePath, "utf8"));
  }

  return contentByPath;
};

const validateRuleMatrixCoverage = (
  ruleIds: Set<string>,
  matrixIds: Set<string>,
  file: string,
  errors: string[]
): void => {
  for (const id of matrixIds) {
    if (!ruleIds.has(id)) {
      errors.push(`${file}: ${id} has no canonical rule definition`);
    }
  }

  for (const id of ruleIds) {
    if (!matrixIds.has(id)) {
      errors.push(`${file}: missing matrix entry for ${id}`);
    }
  }
};

const validateDecisionReferences = (
  decisionIds: Set<string>,
  file: string,
  source: string,
  errors: string[]
): void => {
  if (
    file === businessRuleDocuments.profiles &&
    shorthandDecisionPattern.test(source)
  ) {
    errors.push(`${file}: use canonical DEC-BR-NNN decision IDs`);
  }

  for (const reference of findDecisionReferences(source)) {
    if (!decisionIds.has(reference)) {
      errors.push(`${file}: ${reference} has no canonical decision definition`);
    }
  }
};

const validateRuleAndDecisionIds = (root: string, errors: string[]): void => {
  const contentByPath = loadBusinessRuleDocuments(root, errors);

  const rulesPath = businessRuleDocuments.rules;
  const decisionsPath = businessRuleDocuments.decisions;
  const profilesPath = businessRuleDocuments.profiles;
  const adherencePath = businessRuleDocuments.adherence;
  const ruleIds = validateUniqueIds(
    findRuleIds(contentByPath.get("rules") ?? ""),
    rulesPath,
    "rule ID",
    errors
  );
  const decisionIds = validateUniqueIds(
    findDecisionIds(contentByPath.get("decisions") ?? ""),
    decisionsPath,
    "decision ID",
    errors
  );
  const profileIds = validateUniqueIds(
    findTableRuleIds(contentByPath.get("profiles") ?? ""),
    profilesPath,
    "profile rule ID",
    errors
  );
  const adherenceIds = validateUniqueIds(
    findTableRuleIds(contentByPath.get("adherence") ?? ""),
    adherencePath,
    "adherence rule ID",
    errors
  );

  validateRuleMatrixCoverage(ruleIds, profileIds, profilesPath, errors);
  validateRuleMatrixCoverage(ruleIds, adherenceIds, adherencePath, errors);

  const decisionReferenceSources = [
    [rulesPath, contentByPath.get("rules") ?? ""],
    [profilesPath, contentByPath.get("profiles") ?? ""],
    [
      businessRuleDocuments.decisionCoverage,
      contentByPath.get("decisionCoverage") ?? "",
    ],
  ] as const;

  for (const [file, source] of decisionReferenceSources) {
    validateDecisionReferences(decisionIds, file, source, errors);
  }
};

const main = (): void => {
  const errors: string[] = [];
  const filePaths = getCanonicalDocuments(workspaceRoot, errors);
  const documents = filePaths.map((path) =>
    parseMarkdownDocument(path, workspaceRoot, errors)
  );

  for (const document of documents) {
    validateFrontmatter(document, workspaceRoot, errors);
  }

  const anchorSources = getAnchorValidationSources(
    workspaceRoot,
    documents,
    errors
  );
  validateLinks(workspaceRoot, documents, anchorSources, errors);
  validateRuleAndDecisionIds(workspaceRoot, errors);

  if (errors.length > 0) {
    console.error(
      `Documentation checks failed:\n${[...new Set(errors)].sort().join("\n")}`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `Documentation checks passed (${documents.length} Markdown files).`
  );
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
