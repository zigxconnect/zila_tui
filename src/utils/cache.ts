import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Client-Side In-Memory and Disk Cache for lil-zila agent.
 * Eliminates repeated network and database round-trips for cohort, peers,
 * placements, and user data. Provides sub-millisecond instant terminal rendering.
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

export class ClientCache {
  private static memoryStore = new Map<string, CacheEntry<any>>();
  private static cacheDir = path.join(os.homedir(), ".zila");
  private static cacheFile = path.join(os.homedir(), ".zila", "cache.json");
  private static diskLoaded = false;

  private static initDisk(): void {
    if (this.diskLoaded) return;
    this.diskLoaded = true;

    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      if (fs.existsSync(this.cacheFile)) {
        const content = fs.readFileSync(this.cacheFile, "utf8");
        const parsed = JSON.parse(content) as Record<string, CacheEntry<any>>;
        const now = Date.now();
        for (const [key, entry] of Object.entries(parsed)) {
          if (entry && entry.cachedAt && now - entry.cachedAt < entry.ttlMs) {
            this.memoryStore.set(key, entry);
          }
        }
      }
    } catch {
      // Safe fallback if disk read fails
    }
  }

  private static persistDisk(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      const serializable: Record<string, any> = {};
      const now = Date.now();
      for (const [k, v] of this.memoryStore.entries()) {
        if (now - v.cachedAt < v.ttlMs) {
          serializable[k] = v;
        }
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(serializable, null, 2), "utf8");
    } catch {
      // Safe fallback if disk write fails
    }
  }

  /**
   * Get cached entry if valid and not expired
   */
  static get<T>(key: string): T | null {
    this.initDisk();
    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store value in cache with TTL (defaults to 120 seconds)
   */
  static set<T>(key: string, data: T, ttlSeconds: number = 120): void {
    this.initDisk();
    const entry: CacheEntry<T> = {
      data,
      cachedAt: Date.now(),
      ttlMs: ttlSeconds * 1000,
    };
    this.memoryStore.set(key, entry);
    this.persistDisk();
  }

  /**
   * Helper that wraps async fetcher: returns cached value or fetches and caches.
   */
  static async wrap<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<{ data: T; cached: boolean }> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return { data: cached, cached: true };
    }
    const fresh = await fetcher();
    this.set(key, fresh, ttlSeconds);
    return { data: fresh, cached: false };
  }

  /**
   * Invalidate a single key
   */
  static del(key: string): void {
    this.initDisk();
    this.memoryStore.delete(key);
    this.persistDisk();
  }

  /**
   * Clear all cache
   */
  static clear(): void {
    this.memoryStore.clear();
    try {
      if (fs.existsSync(this.cacheFile)) {
        fs.unlinkSync(this.cacheFile);
      }
    } catch {
      // ignore
    }
  }
}
