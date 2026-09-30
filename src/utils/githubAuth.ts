import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';

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
  fs.chmodSync(GITHUB_AUTH_PATH, 0o600);
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

interface GitHubDeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
  error?: string;
  error_description?: string;
}

interface GitHubDeviceTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface DeviceFlowDependencies {
  fetchImpl?: typeof fetch;
  openBrowser?: (url: string) => void;
  wait?: (milliseconds: number) => Promise<void>;
}

function openBrowser(url: string): void {
  const command = process.platform === 'darwin'
    ? 'open'
    : process.platform === 'win32'
      ? 'cmd'
      : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  const browser = spawn(command, args, { detached: true, stdio: 'ignore' });
  browser.on('error', () => {});
  browser.unref();
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function authenticateWithGitHub(
  clientId: string,
  onVerification: (verificationUri: string, userCode: string) => void,
  dependencies: DeviceFlowDependencies = {},
): Promise<{ username: string; name: string | null; email: string | null }> {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const launchBrowser = dependencies.openBrowser ?? openBrowser;
  const pause = dependencies.wait ?? wait;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };

  const deviceResponse = await fetchImpl('https://github.com/login/device/code', {
    method: 'POST',
    headers,
    body: new URLSearchParams({ client_id: clientId, scope: 'repo read:user user:email' }),
  });
  const deviceData = await deviceResponse.json() as GitHubDeviceCodeResponse;
  if (!deviceResponse.ok || deviceData.error) {
    throw new Error(deviceData.error_description || deviceData.error || `GitHub device authorization failed (HTTP ${deviceResponse.status})`);
  }

  onVerification(deviceData.verification_uri, deviceData.user_code);
  launchBrowser(deviceData.verification_uri);

  const deadline = Date.now() + deviceData.expires_in * 1000;
  let interval = deviceData.interval * 1000;
  while (Date.now() < deadline) {
    await pause(interval);
    const tokenResponse = await fetchImpl('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers,
      body: new URLSearchParams({
        client_id: clientId,
        device_code: deviceData.device_code,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });
    const tokenData = await tokenResponse.json() as GitHubDeviceTokenResponse;

    if (tokenData.access_token) {
      const verification = await verifyGitHubToken(tokenData.access_token);
      if (!verification.valid || !verification.username) {
        throw new Error(verification.error || 'GitHub could not verify the authorized account.');
      }
      saveGitHubToken(tokenData.access_token, verification.username, verification.name || null, verification.email || null);
      return {
        username: verification.username,
        name: verification.name || null,
        email: verification.email || null,
      };
    }

    if (tokenData.error === 'authorization_pending') continue;
    if (tokenData.error === 'slow_down') {
      interval += 5000;
      continue;
    }
    if (tokenData.error === 'access_denied') throw new Error('GitHub authorization was denied.');
    if (tokenData.error === 'expired_token') throw new Error('GitHub authorization code expired. Run github-auth again.');
    throw new Error(tokenData.error_description || tokenData.error || 'GitHub did not return an access token.');
  }

  throw new Error('GitHub authorization timed out. Run github-auth again.');
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
