import path from "node:path";
import fs from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

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

    if (fs.existsSync(venvPy)) {
      const version = await getPythonVersion(venvPy);
      if (version) return { bin: venvPy, version };
    }
  }

  // 2. Fallback to system python
  for (const bin of ["python3", "python"]) {
    const version = await getPythonVersion(bin);
    if (version) return { bin, version };
  }

  throw new Error(
    "Python 3 is not installed or not on PATH.\n" +
      "Install it from https://python.org, then run  zila init  again.",
  );
}

async function getPythonVersion(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`${bin} --version`);
    return stdout.trim().replace("Python ", "");
  } catch (error) {
    return null;
  }
}
