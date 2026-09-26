import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const ZILA_DIR = path.join(os.homedir(), '.zila');
const GITHUB_AUTH_PATH = path.join(ZILA_DIR, 'github.json');

export interface GitHubAuthRecord {
  token: string;
  username: string;
  name: string | null;
  email: string | null;
  storedAt: string;
}

export function saveGitHubToken(token: string, username: string, name: string | null, email: string | null): void {
  if (!fs.existsSync(ZILA_DIR)) {
    fs.mkdirSync(ZILA_DIR, { recursive: true });
  }

  const record: GitHubAuthRecord = {
    token,
    username,
    name,
    email,
    storedAt: new Date().toISOString(),
  };

  fs.writeFileSync(GITHUB_AUTH_PATH, JSON.stringify(record, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

export function loadGitHubAuth(): GitHubAuthRecord | null {
  try {
    const raw = fs.readFileSync(GITHUB_AUTH_PATH, 'utf-8');
    return JSON.parse(raw) as GitHubAuthRecord;
  } catch {
    return null;
  }
}

export function clearGitHubAuth(): void {
  try {
    fs.unlinkSync(GITHUB_AUTH_PATH);
  } catch {
    /* file not present */
  }
}

export function isGitHubAuthenticated(): boolean {
  const auth = loadGitHubAuth();
  return auth !== null && Boolean(auth.token);
}

/**
 * Validates a GitHub Personal Access Token against the GitHub API
 */
export async function verifyGitHubToken(token: string): Promise<{
  valid: boolean;
  username?: string;
  name?: string;
  email?: string;
  error?: string;
}> {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'User-Agent': 'Zigex-Zila-Agent/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { valid: false, error: 'Invalid or expired GitHub Personal Access Token' };
      }
      return { valid: false, error: `GitHub API error (HTTP ${res.status})` };
    }

    const userData = await res.json() as any;
    return {
      valid: true,
      username: userData.login,
      name: userData.name,
      email: userData.email,
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Network error verifying GitHub token' };
  }
}
