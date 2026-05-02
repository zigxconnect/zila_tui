import path from "node:path";
import fs from "node:fs";
import { spawnSync, spawn, type SpawnOptions } from "node:child_process";
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

  // Pre-flight checks

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

  // Resolve Python

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

  if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
    process.stdin.setRawMode(false);
  }
  process.stdin.pause();
  process.stdout.write("\x1b[?25h");
  process.stdout.write("\x1b[0m");
  process.stdout.write("\x1b[?1049l"); // leave alternate screen
  process.stdout.write("\x1b[2J\x1b[H"); // clear and home
  unmountInk();

  process.stdout.write("yooo \n");

  await new Promise<void>((resolve) => {
    if (process.stdout.writableNeedDrain) {
      process.stdout.once("drain", resolve);
    } else {
      setImmediate(resolve);
    }
  });

  const spawnEnv = {
    ...process.env,
    PYTHONUNBUFFERED: "1",
    PYTHONIOENCODING: "utf-8",
  };

  logToFile(`Spawning: ${python.bin} "${mainPy}" "${curriculumPath}"`);
  logToFile(`CWD: ${assistantPath}`);

  if (process.platform !== "win32") {
    logToFile("Using spawnSync (Unix/Mac)");

    const result = spawnSync(python.bin, [mainPy, curriculumPath], {
      cwd: assistantPath,
      stdio: "inherit",
      env: spawnEnv,
    });

    logToFile(
      `spawnSync returned — status: ${result.status}, signal: ${result.signal}`,
    );

    if (result.error) {
      logToFile(`ERROR: spawnSync error: ${result.error.message}`);
      return {
        ok: false,
        error: `Failed to launch assistant: ${result.error.message}`,
        exitCode: null,
      };
    }

    const code = result.status;
    return {
      ok: code === 0,
      error: code !== 0 ? `Assistant exited with code ${code}` : undefined,
      exitCode: code,
    };
  }

  logToFile("Using piped spawn (Windows)");

  return new Promise((resolve) => {
    const child = spawn(python.bin, [mainPy, curriculumPath], {
      cwd: assistantPath,
      stdio: ["inherit", "pipe", "pipe"],
      env: spawnEnv,
    });

    logToFile(`Spawn returned, PID: ${child.pid}`);

    if (child.stdout) {
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        process.stdout.write(chunk);
      });
    }

    if (child.stderr) {
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        process.stderr.write(chunk);
      });
    }

    child.on("error", (err) => {
      logToFile(`ERROR: Spawn error: ${err.message}`);
      resolve({
        ok: false,
        error: `Failed to launch assistant: ${err.message}`,
        exitCode: null,
      });
    });

    child.on("close", (code) => {
      logToFile(`Python process closed with code: ${code}`);
      resolve({
        ok: code === 0,
        error: code !== 0 ? `Assistant exited with code ${code}` : undefined,
        exitCode: code,
      });
    });
  });
}
