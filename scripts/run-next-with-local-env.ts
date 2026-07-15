import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

const [appName, command, ...arguments_] = process.argv.slice(2);
const supportedCommands = new Set(["build", "dev", "start"]);

if (!(appName && command && supportedCommands.has(command))) {
  throw new Error(
    "Usage: bun scripts/run-next-with-local-env.ts <app-name> <build|dev|start> [...args]"
  );
}

const workspaceRoot = resolve(import.meta.dir, "..");
const environmentFile = resolve(workspaceRoot, ".env.local");

if (existsSync(environmentFile)) {
  config({ override: true, path: environmentFile, processEnv: process.env });
}

const nextBinary = resolve(
  workspaceRoot,
  "node_modules",
  "next",
  "dist",
  "bin",
  "next"
);
const appDirectory = resolve(workspaceRoot, "apps", appName);
const nextProcess = spawn("node", [nextBinary, command, ...arguments_], {
  cwd: appDirectory,
  env: process.env,
  stdio: "inherit",
});

const exitCode = await new Promise<number>((resolveExitCode, reject) => {
  nextProcess.once("error", reject);
  nextProcess.once("exit", (code) => resolveExitCode(code ?? 1));
});

process.exit(exitCode);
