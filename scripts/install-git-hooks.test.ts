import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const installScriptPath = fileURLToPath(
  new URL("./install-git-hooks.mjs", import.meta.url)
);
const temporaryDirectories: string[] = [];

const createFixture = (gitEntry: "file" | "directory") => {
  const root = mkdtempSync(join(tmpdir(), "polaris-git-hooks-"));
  temporaryDirectories.push(root);

  const gitPath = join(root, ".git");
  if (gitEntry === "file") {
    writeFileSync(gitPath, "gitdir: C:/fixture/repo/.git/worktrees/checkout\n");
  } else {
    mkdirSync(gitPath);
  }

  const fakeBinDirectory = join(root, "bin");
  mkdirSync(fakeBinDirectory);
  const markerPath = join(root, "lefthook-install-ran");
  const fakeBunPath = join(
    fakeBinDirectory,
    process.platform === "win32" ? "bun.cmd" : "bun"
  );
  const fakeBunScript =
    process.platform === "win32"
      ? `@echo off\r\n> "%LEFTHOOK_INSTALL_MARKER%" echo installed\r\nexit /b 0\r\n`
      : `#!/bin/sh\nprintf 'installed' > "$LEFTHOOK_INSTALL_MARKER"\n`;

  writeFileSync(fakeBunPath, fakeBunScript);
  if (process.platform !== "win32") {
    chmodSync(fakeBunPath, 0o755);
  }

  return {
    env: {
      ...process.env,
      CI: "false",
      LEFTHOOK_INSTALL_MARKER: markerPath,
      PATH: `${fakeBinDirectory}${delimiter}${process.env.PATH ?? ""}`,
      VERCEL: "0",
    },
    markerPath,
    root,
  };
};

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("Git hook installation", () => {
  it("skips install when .git is a linked-worktree pointer file", () => {
    const fixture = createFixture("file");
    const result = spawnSync(process.execPath, [installScriptPath], {
      cwd: fixture.root,
      encoding: "utf8",
      env: fixture.env,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(existsSync(fixture.markerPath)).toBe(false);
  });

  it("installs hooks when .git is a directory", () => {
    const fixture = createFixture("directory");
    const result = spawnSync(process.execPath, [installScriptPath], {
      cwd: fixture.root,
      encoding: "utf8",
      env: fixture.env,
    });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(0);
    expect(existsSync(fixture.markerPath)).toBe(true);
  });
});
