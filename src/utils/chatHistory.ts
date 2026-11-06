import fs from "fs";
import path from "path";
import os from "os";
import { API_BASE, loadAuth } from "./auth.js";

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface LocalChatSession {
  id: string;
  title: string;
  cohortId?: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredChatMessage[];
}

function getHistoryDir(): string {
  const dir = path.join(os.homedir(), ".zila", "history");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

function getIndexFilePath(): string {
  return path.join(getHistoryDir(), "sessions.json");
}

export function loadLocalChatSessions(): LocalChatSession[] {
  try {
    const filePath = getIndexFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (Array.isArray(data)) {
      return data;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveLocalChatSession(session: LocalChatSession): void {
  try {
    const sessions = loadLocalChatSessions();
    const existingIdx = sessions.findIndex((s) => s.id === session.id);
    if (existingIdx >= 0) {
      sessions[existingIdx] = session;
    } else {
      sessions.unshift(session);
    }

    // Keep top 50 sessions
    const trimmed = sessions.slice(0, 50);
    fs.writeFileSync(getIndexFilePath(), JSON.stringify(trimmed, null, 2), { mode: 0o600 });
  } catch {
    // Ignore local write failure
  }
}

export function deleteLocalChatSession(sessionId: string): void {
  try {
    const sessions = loadLocalChatSessions();
    const filtered = sessions.filter((s) => s.id !== sessionId);
    fs.writeFileSync(getIndexFilePath(), JSON.stringify(filtered, null, 2), { mode: 0o600 });
  } catch {
    // Ignore
  }
}

export async function syncChatSessionWithApi(session: LocalChatSession): Promise<boolean> {
  const auth = loadAuth();
  if (!auth?.token) return false;

  try {
    const res = await fetch(`${API_BASE}/chat/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({
        id: session.id,
        title: session.title,
        cohortId: session.cohortId,
        studentEmail: auth.email,
        messages: session.messages.filter((m) => m.role !== "system"),
      }),
    });

    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchRemoteChatSessions(): Promise<LocalChatSession[]> {
  const auth = loadAuth();
  if (!auth?.token) return [];

  try {
    const res = await fetch(`${API_BASE}/chat/sessions`, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as any;
    if (Array.isArray(data?.sessions)) {
      return data.sessions;
    }
    return [];
  } catch {
    return [];
  }
}
