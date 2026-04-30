import path from "node:path";
import fs from "node:fs";
import { spawn, type SpawnOptions } from "node:child_process";
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

/**
 * Launch the Python assistant, handing off the TTY completely.
 *
 * On Windows, we spawn Python with stdio: 'inherit' and then exit the Node process
 * so Python takes full control of the terminal. When Python exits, control returns
 * to the Node process (if still alive) or the shell.
 */
export async function launchAssistant(
  assistantPath: string,
  curriculumPath: string,
  unmountInk: () => void,
): Promise<LaunchResult> {
  logToFile("=== Assistant Launch Debug ===");
  logToFile(`assistantPath: ${assistantPath}`);
  logToFile(`curriculumPath: ${curriculumPath}`);

  const mainPy = path.join(assistantPath, "main.py");

  logToFile(`Checking main.py at: ${mainPy}`);
  if (!fs.existsSync(mainPy)) {
    logToFile(`ERROR: main.py not found at: ${mainPy}`);
    return {
      ok: false,
      error: `main.py not found in ${assistantPath}. Run  zila init  to set up your workspace.`,
      exitCode: null,
    };
  }
  logToFile(`OK: main.py exists`);

  logToFile(`Checking curriculum at: ${curriculumPath}`);
  if (!fs.existsSync(curriculumPath)) {
    logToFile(`ERROR: Curriculum not found at: ${curriculumPath}`);
    return {
      ok: false,
      error: `Curriculum directory not found at ${curriculumPath}. Run  zila init  to set up your workspace.`,
      exitCode: null,
    };
  }
  logToFile(`OK: Curriculum exists`);

  let python: { bin: string; version: string };

  try {
    logToFile(`Resolving Python for: ${assistantPath}`);
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

  logToFile(`Preparing TTY handoff to Python`);

  // Show cursor and clear any Ink state
  process.stdout.write("\x1b[?25h");
  process.stdout.write("\x1b[0m");

  // Unmount Ink to release TTY control
  unmountInk();

  // Give Ink a moment to clean up
  await new Promise((resolve) => setTimeout(resolve, 50));

  logToFile(`Spawning: ${python.bin} "${mainPy}" "${curriculumPath}"`);
  logToFile(`CWD: ${assistantPath}`);

  return new Promise((resolve) => {
    const options: SpawnOptions = {
      cwd: assistantPath,
      stdio: "inherit",
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
        PYTHONIOENCODING: "utf-8",
      },
    };

    const child = spawn(python.bin, [mainPy, curriculumPath], options);

    logToFile(`Spawn returned, PID: ${child.pid}`);

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

    child.on("spawn", () => {
      logToFile(`Spawn event fired for PID ${child.pid}`);
    });

    // Reconfigure stdout to use UTF-8 for Python child
    if (child.stdout) {
      child.stdout.setEncoding("utf-8");
    }
    if (child.stderr) {
      child.stderr.setEncoding("utf-8");
    }
  });
}
