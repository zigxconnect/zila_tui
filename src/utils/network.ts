import dns from "node:dns/promises";

/** Thrown by probeNetwork() when there is no usable internet connection */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";
  }
}


export async function probeNetwork(): Promise<void> {
  try {
    await fetch("https://www.google.com", {
      method: "HEAD",
    });
  } catch {
    throw new NetworkError(
      "No internet connection detected.",
    );
  }
}
