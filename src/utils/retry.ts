interface RetryOptions {
    maxAttempts?: number;
    baseDelaysMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const { maxAttempts = 5, baseDelaysMs = 1000, onRetry } = options;
    let attempt = 1;
    while (true) {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt >= maxAttempts) {
        throw error;
      }
      
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = baseDelaysMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      attempt++;
    }
  }
}