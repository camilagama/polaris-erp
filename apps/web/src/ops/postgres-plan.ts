export interface PostgresPlanNode {
  "Actual Total Time"?: number;
  "Execution Time"?: number;
  "Index Name"?: string;
  "Node Type"?: string;
  "Plan Rows"?: number;
  "Planning Time"?: number;
  Plans?: PostgresPlanNode[];
  "Total Cost"?: number;
}

export interface PostgresExplainResult {
  "Execution Time"?: number;
  Plan: PostgresPlanNode;
  "Planning Time"?: number;
}

export function collectPlanIndexNames(plan: PostgresPlanNode): string[] {
  const indexNames = new Set<string>();
  const pending = [plan];

  while (pending.length > 0) {
    const current = pending.pop();

    if (!current) {
      continue;
    }

    if (current["Index Name"]) {
      indexNames.add(current["Index Name"]);
    }

    for (const child of current.Plans ?? []) {
      pending.push(child);
    }
  }

  return Array.from(indexNames).sort((left, right) =>
    left.localeCompare(right)
  );
}

export function planUsesAnyIndex(
  plan: PostgresPlanNode,
  expectedIndexNames: string[]
): boolean {
  const usedIndexes = collectPlanIndexNames(plan);

  return expectedIndexNames.some((expectedIndex) =>
    usedIndexes.includes(expectedIndex)
  );
}
