import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { resolvePython } from "./python.js";

export interface LaunchResult {
  ok: boolean;
  error?: string;
  exitCode?: number | null;
}

const LOG_FILE = path.join(process.cwd(), "zila-assistant-debug.log");

function logToFile(msg: string) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
}

export async function launchAssistant(
  assistantPath: string,
  curriculumPath: string,
  unmountInk: () => void,
): Promise<LaunchResult> {
  logToFile("=== Assistant Launch Debug ===");
  logToFile(`assistantPath: ${assistantPath}`);
  logToFile(`curriculumPath: ${curriculumPath}`);
  logToFile(`platform: ${process.platform}`);

  const mainPy = path.join(assistantPath, "main.py");

  if (!fs.existsSync(mainPy)) {
    logToFile(`ERROR: main.py not found at: ${mainPy}`);
    return {
      ok: false,
      error: `main.py not found in ${assistantPath}. Run  zila init  to set up your workspace.`,
      exitCode: null,
    };
  }
  logToFile("OK: main.py exists");

  if (!fs.existsSync(curriculumPath)) {
    logToFile(`ERROR: Curriculum not found at: ${curriculumPath}`);
    return {
      ok: false,
      error: `Curriculum directory not found at ${curriculumPath}. Run  zila init  to set up your workspace.`,
      exitCode: null,
    };
  }
  logToFile("OK: Curriculum exists");

  let python: { bin: string; version: string };
  try {
    python = await resolvePython(assistantPath);
    logToFile(`Found Python: ${python.bin} (v${python.version})`);
  } catch (error) {
    logToFile(`ERROR: Failed to resolve Python: ${error}`);
    return {
      ok: false,
      error: `Failed to resolve Python executable: ${error}`,
      exitCode: null,
    };
  }

  unmountInk();
  await new Promise((resolve) => setTimeout(resolve, 100));

  if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
    process.stdin.setRawMode(false);
  }
  process.stdout.write("\x1b[?25h"); // Show cursor
  process.stdout.write("\x1b[0m"); // Reset formatting
  process.stdout.write("\x1b[?1049l"); // Leave alternate screen

  await new Promise((resolve) => setTimeout(resolve, 50));
  await new Promise<void>((resolve) => {
    if (process.stdout.writableNeedDrain) {
      process.stdout.once("drain", resolve);
    } else {
      setImmediate(resolve);
    }
  });

  const venvDir = path.resolve(assistantPath, ".venv");
  const venvScripts =
    process.platform === "win32"
      ? path.join(venvDir, "Scripts")
      : path.join(venvDir, "bin");

  const spawnEnv = {
    ...process.env,
    PYTHONUNBUFFERED: "1",
    PYTHONIOENCODING: "utf-8",
    VIRTUAL_ENV: venvDir,
    PATH: `${venvScripts}${path.delimiter}${process.env.PATH}`,
  };

  logToFile(`Spawning: ${python.bin} "${mainPy}" "${curriculumPath}"`);
  logToFile(`CWD: ${assistantPath}`);

  return new Promise((resolve) => {
    const child = spawn(python.bin, [mainPy, curriculumPath], {
      cwd: assistantPath,
      stdio: "inherit",
      env: spawnEnv,
    });

    logToFile(`Spawn returned, PID: ${child.pid}`);

    child.on("error", (err) => {
      logToFile(`ERROR: Spawn error: ${err.message}`);
      resolve({ ok: false, error: err.message, exitCode: null });
    });

    child.on("close", (code) => {
      logToFile(`Python process closed with code: ${code}`);
      if (
        process.stdin.isTTY &&
        typeof process.stdin.setRawMode === "function"
      ) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      resolve({ ok: code === 0, exitCode: code });
    });
  });
}
