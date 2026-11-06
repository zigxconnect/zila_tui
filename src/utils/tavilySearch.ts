import fs from "fs";
import path from "path";
import os from "os";

export interface OpportunityItem {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface TavilySearchResult {
  success: boolean;
  query: string;
  results: OpportunityItem[];
  error?: string;
  needsKey?: boolean;
}

function getZilaDir(): string {
  const dir = path.join(os.homedir(), ".zila");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  return dir;
}

export function getTavilyConfigPath(): string {
  return path.join(getZilaDir(), "tavily.json");
}

export function getTavilyApiKey(): string | null {
  if (process.env.TAVILY_API_KEY && process.env.TAVILY_API_KEY.trim() !== "") {
    return process.env.TAVILY_API_KEY.trim();
  }

  try {
    const configPath = getTavilyConfigPath();
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
      if (data?.apiKey) {
        return String(data.apiKey).trim();
      }
    }

    // Check ai_credentials.json
    const credPath = path.join(getZilaDir(), "ai_credentials.json");
    if (fs.existsSync(credPath)) {
      const creds = JSON.parse(fs.readFileSync(credPath, "utf8"));
      if (creds?.tavilyApiKey) {
        return String(creds.tavilyApiKey).trim();
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function saveTavilyApiKey(key: string): void {
  const configPath = getTavilyConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(
    configPath,
    JSON.stringify({ apiKey: key.trim(), configuredAt: new Date().toISOString() }, null, 2),
    { mode: 0o600 }
  );
}

export async function searchOpportunities(
  customQuery?: string,
  context?: { domain?: string; level?: string }
): Promise<TavilySearchResult> {
  const apiKey = getTavilyApiKey();
  if (!apiKey) {
    return {
      success: false,
      query: customQuery || "",
      results: [],
      needsKey: true,
      error: "Tavily API key is not configured.",
    };
  }

  const domain = context?.domain || "Software Engineering";
  const level = context?.level || "junior intern";
  const query =
    customQuery && customQuery.trim().length > 0
      ? customQuery.trim()
      : `${domain} ${level} remote internships hackathons bounties 2026`;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 6,
        include_answer: false,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      return {
        success: false,
        query,
        results: [],
        error: `Tavily API responded with status ${res.status}: ${errBody || res.statusText}`,
      };
    }

    const data = (await res.json()) as any;
    const rawResults = Array.isArray(data?.results) ? data.results : [];

    const results: OpportunityItem[] = rawResults.map((r: any) => ({
      title: r.title || "Untitled Opportunity",
      url: r.url || "",
      content: r.content || "",
      score: r.score,
    }));

    return {
      success: true,
      query,
      results,
    };
  } catch (err: any) {
    return {
      success: false,
      query,
      results: [],
      error: err.message || "Failed to connect to Tavily Search API",
    };
  }
}
