export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000, onRetry } = options;
  let attempt = 1;

  while (true) {
    try {
      return await operation();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (attempt >= maxAttempts) throw error;

      onRetry?.(attempt, error);

      // Exponential back-off: 1 s, 2 s, 4 s, …
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));

      attempt++;
    }
  }
}
