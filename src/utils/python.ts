import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { logAssistantDiagnostic as logToFile } from "./diagnosticLog.js";

const execFileAsync = promisify(execFile);

export interface PythonInfo {
  bin: string;
  version: string;
}

export async function resolvePython(projectDir?: string): Promise<PythonInfo> {
  // 1. check if .venv inside given directory
  if (projectDir) {
    const isWin = process.platform === "win32";
    const venvPy = isWin
      ? path.join(projectDir, ".venv", "Scripts", "python.exe")
      : path.join(projectDir, ".venv", "bin", "python");

    logToFile(`[resolvePython] Checking venv at: ${venvPy}`);
    const exists = fs.existsSync(venvPy);
    logToFile(`[resolvePython] Exists: ${exists}`);

    if (exists) {
      const version = await getPythonVersion(venvPy);
      logToFile(`[resolvePython] Venv Python version: ${version}`);
      if (version) {
        logToFile(`[resolvePython] Using venv Python: ${venvPy}`);
        return { bin: venvPy, version };
      }
    }
  }

  // 2. Fallback to system python
  logToFile(`[resolvePython] Venv not found, trying system python`);
  for (const bin of ["python3", "python"]) {
    const version = await getPythonVersion(bin);
    if (version) {
      logToFile(`[resolvePython] Using system: ${bin} (v${version})`);
      return { bin, version };
    }
  }

  throw new Error(
    "Python 3 is not installed or not on PATH.\n" +
      "Install it from https://python.org, then run  zila init  again.",
  );
}

async function getPythonVersion(bin: string): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync(bin, ["--version"]);
    const output = (stdout.trim() || stderr.trim()).replace("Python ", "");
    return output || null;
  } catch (error) {
    logToFile(`[getPythonVersion] Failed to execute ${bin} --version: ${error}`);
    return null;
  }
}
