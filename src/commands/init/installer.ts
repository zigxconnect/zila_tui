import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { withRetry } from '../../utils/retry.js';

const execAsync = promisify(exec);

export async function installPythonDeps(targetDir: string): Promise<boolean> {
    const venvPath = path.join(targetDir, '.venv');
    const reqPath = path.join(targetDir, 'requirements.txt');
    if (!fs.existsSync(reqPath)) return false; // No requirements, skip
    if (fs.existsSync(venvPath)) return false; // Already exists, skip

    // 1. create virtual environment
    await execAsync(`python -m venv ${venvPath}`);

    // 2. Resolve the correct pip path based on OS
    const pipPath = process.platform === 'win32'
        ? `"${venvPath}\\Scripts\\pip" install -r "${reqPath}"`
        : `${venvPath}/bin/pip install -r "${reqPath}"`;

    // 3. Install dependencies with retry logic
    await withRetry(
        async () => {
            await execAsync(pipPath, {cwd: targetDir});
        },
        { maxAttempts: 3, baseDelaysMs: 1000 }
    );
    return true; // Installation completed successfully
}

export async function installNpmDepen