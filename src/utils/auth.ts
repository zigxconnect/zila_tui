import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export const API_BASE = "https://zila-api.onrender.com/api";
const ZILA_DIR = path.join(os.homedir(), ".zila");
const AUTH_PATH = path.join(ZILA_DIR, "auth.json");
const TOKEN_EXPIRY_DAYS = 30;

export interface AuthRecord {
  token: string;
  email: string;
  storedAt: string; // ISO timestamp
}

export class AuthExpiredError extends Error {
  constructor() {
    super("Session expired. Run  zila auth  to log in again.");
    this.name = "AuthExpiredError";
  }
}

export class AuthRequiredError extends Error {
  constructor() {
    super("Not authenticated. Run  zila auth  to log in.");
    this.name = "AuthRequiredError";
  }
}

export function saveToken(token: string, email: string): void {
  if (!fs.existsSync(ZILA_DIR)) fs.mkdirSync(ZILA_DIR, { recursive: true });
  const record: AuthRecord = {
    token,
    email,
    storedAt: new Date().toISOString(),
  };
  fs.writeFileSync(AUTH_PATH, JSON.stringify(record, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export function loadAuth(): AuthRecord | null {
  try {
    const raw = fs.readFileSync(AUTH_PATH, "utf-8");
    return JSON.parse(raw) as AuthRecord;
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  try {
    fs.unlinkSync(AUTH_PATH);
  } catch {
    /* already gone */
  }
}

export function isTokenFresh(record: AuthRecord): boolean {
  const stored = new Date(record.storedAt).getTime();
  const expiryMs = TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - stored < expiryMs;
}

export function isAuthenticated(): boolean {
  const record = loadAuth();
  return record !== null && isTokenFresh(record);
}

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  public?: boolean;
}


export async function zilaApi<T = unknown>(
  endpoint: string,
  options: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
 
  if (!options.public) {
    const record = loadAuth();
    if (!record) throw new AuthRequiredError();
    if (!isTokenFresh(record)) {
      clearAuth();
      throw new AuthExpiredError();
    }
    headers["Authorization"] = `Bearer ${record.token}`;
  }
 
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
 
  if (res.status === 401) {
    clearAuth();
    throw new AuthExpiredError();
  }
 
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data.message) msg = data.message;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
 
  return res.json() as Promise<T>;
}

export async function requestOtp(email: string): Promise<void> {
  await zilaApi("/auth/request-otp", {
    method: "POST",
    body: { email },
    public: true,
  });
}

export async function verifyOtp(email: string, otp: string): Promise<string> {
  const data = await zilaApi<{ token: string }>("/auth/verify-otp", {
    method: "POST",
    body: { email, otp },
    public: true,
  });
  if (!data.token) throw new Error("No token in server response.");
  return data.token;
}