import dns from "node:dns/promises";

export class NetworkError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NetworkError";
    }
}

/**
 * Resolves against github.com (since it is what we need to clone from there anyway).
 * Rejects quickly if the network is completely down.
 */
export async function probeNetwork(): Promise<void> {
  try {
    await dns.resolve('github.com');
  } catch (error: any) {
    throw new NetworkError('No network connection detected. DNS resolution failed.');
  }
}