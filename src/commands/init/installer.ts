import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { withRetry } from "../../utils/retry.js";

const execAsync = promisify(exec);

async function resolvePython(): Promise<string> {
  for (const bin of ["python3", "python"]) {
    try {
      await execAsync(`${bin} --version`);
      return bin;
    } catch {}
  }
  throw new Error(
    "python3 / python not found. Install Python 3 from https://python.org",
  );
}

export async function installPythonDependencies(
  targetDir: string,
  onRetry?: (attempt: number, error: Error) => void,
  ): Promise<boolean> {
  const absTargetDir = path.resolve(targetDir);

  const reqPath = path.join(absTargetDir, "requirements.txt");

  if (!fs.existsSync(reqPath)) return false; 

  const venvPath = path.join(absTargetDir, ".venv");

  if (fs.existsSync(venvPath)) return false; 

  const python = await resolvePython();

  // 1. Create virtual environment using absolute path
  await execAsync(`${python} -m venv "${venvPath}"`);

  // 2. Resolve pip inside the venv (cross-platform)
  const pipBin =
    process.platform === "win32"
      ? path.join(venvPath, "Scripts", "pip.exe")
      : path.join(venvPath, "bin", "pip");

  // 3. Install with retry
  await withRetry(
    async () => {
      // Use forward slashes for shell compatibility
      const pipBinNormalized = pipBin.replace(/\\/g, "/");
      const reqPathNormalized = reqPath.replace(/\\/g, "/");
      
      await execAsync(`"${pipBinNormalized}" install -r "${reqPathNormalized}"`, {
        cwd: absTargetDir,
      });
    },
    { maxAttempts: 3, baseDelayMs: 1000, ...(onRetry && { onRetry }) },
  );

  return true;
}

export async function installNpmDependencies(
  targetDir: string,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<boolean> {
  const absTargetDir = path.resolve(targetDir);
  
  const pkgPath = path.join(absTargetDir, "package.json");
  const modulesPath = path.join(absTargetDir, "node_modules");

  if (!fs.existsSync(pkgPath)) return false;
  // if (fs.existsSync(modulesPath)) return false;

  await withRetry(
    async () => {
      await execAsync("npm install", { cwd: absTargetDir });
    },
    {
      maxAttempts: 3,
      baseDelayMs: 1000,
      ...(onRetry && { onRetry }),
    },
  );

  return true;
}
