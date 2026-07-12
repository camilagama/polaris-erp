import { readdirSync, readFileSync } from "node:fs";
import { join, parse } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const workspaceRoot = join(projectRoot, "..", "..");
const migrationsDir = join(workspaceRoot, "packages/db/src/migrations");
const journalPath = join(migrationsDir, "meta/_journal.json");

describe("database migration journal", () => {
  it("tracks every SQL migration file", () => {
    const sqlTags = readdirSync(migrationsDir)
      .filter((fileName) => fileName.endsWith(".sql"))
      .map((fileName) => parse(fileName).name)
      .sort();
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
      entries: Array<{ tag: string }>;
    };
    const journalTags = journal.entries.map((entry) => entry.tag).sort();

    expect(journalTags).toEqual(sqlTags);
  });
});
