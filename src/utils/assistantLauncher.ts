import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { resolvePython } from "./python.js";

export interface LaunchResult {
  ok: boolean;
  error?: string;
  exitCode?: number | null;
}

export async function launchAssistant(
  assistantPath: string,
  curriculumPath: string,
  unmountInk: () => void,
): Promise<LaunchResult> {
  const mainPy = path.join(assistantPath, "main.py");

  if (!fs.existsSync(mainPy)) {
    return {
      ok: false,
      error: `main.py not found in ${assistantPath}. Run  zila init  to set up your workspace.`,
      exitCode: null,
    };
  }

  if (!fs.existsSync(curriculumPath)) {
    return {
      ok: false,
      error: `Curriculum directory not found at ${curriculumPath}. Run  zila init  to set up your workspace.`,
      exitCode: null,
    };
  }

  let python: { bin: string; version: string };

  try {
    python = await resolvePython(assistantPath);
  } catch (error) {
    return {
      ok: false,
      error: `Failed to resolve Python executable: ${error}`,
      exitCode: null,
    };
  }

  process.stdout.write("\x1b[?25h");

  unmountInk();

  // Spawn the assistant process

  return new Promise((resolve) => {
    const child = spawn(python.bin, [mainPy, curriculumPath], {
      cwd: assistantPath,
      stdio: "inherit",
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1", // Ensure unbuffered output for real-time logs
      },
    });

    child.on("error", (err) => {
      resolve({
        ok: false,
        error: `Failed to launch assistant: ${err}`,
        exitCode: null,
      });
    });

    child.on("close", (code) => {
      resolve({
        ok: true,
        exitCode: code,
      });
    });
  });
}
