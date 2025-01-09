// utils/retry-utils.ts
export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryableErrors?: Array<string | RegExp>;
    onRetry?: (error: Error, attempt: number) => void;
    shouldRetry?: (error: Error) => boolean;
  }
  
  const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryableErrors: [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'EPIPE',
      'EHOSTUNREACH',
      'ENETUNREACH',
      'ETIMEDOUT',
      /^timeout$/i,
      /^network error$/i,
      /^service unavailable$/i,
      /^rate limit$/i,
      /^5\d{2}$/  // 5XX status codes
    ],
    onRetry: () => {},
    shouldRetry: () => true
  };
  
  export class RetryError extends Error {
    constructor(
      message: string,
      public originalError: Error,
      public attempts: number
    ) {
      super(message);
      this.name = 'RetryError';
    }
  }
  
  function isRetryableError(error: Error, options: Required<RetryOptions>): boolean {
    // Check custom shouldRetry function first
    if (!options.shouldRetry(error)) {
      return false;
    }
  
    // Check against retryable error patterns
    return options.retryableErrors.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(error.message) || pattern.test(error.name);
      }
      return error.message.includes(pattern) || error.name.includes(pattern);
    });
  }
  
  function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
    const delay = options.initialDelay * Math.pow(options.backoffFactor, attempt);
    const jitter = Math.random() * 200; // Add randomness to prevent thundering herd
    return Math.min(delay + jitter, options.maxDelay);
  }
  
  export async function withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;
    let attempt = 0;
  
    while (attempt < mergedOptions.maxRetries) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        attempt++;
  
        // Check if we should retry
        if (attempt >= mergedOptions.maxRetries || !isRetryableError(error, mergedOptions)) {
          break;
        }
  
        // Calculate delay for next attempt
        const delay = calculateDelay(attempt, mergedOptions);
  
        // Call onRetry callback
        mergedOptions.onRetry(error, attempt);
  
        // Wait before next attempt
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  
    // If we get here, all retries failed
    throw new RetryError(
      `Operation failed after ${attempt} attempts`,
      lastError!,
      attempt
    );
  }
  
  interface BatchRetryOptions extends RetryOptions {
    concurrency?: number;
    abortOnFailure?: boolean;
  }
  
  export async function withBatchRetry<T>(
    operations: Array<() => Promise<T>>,
    options: BatchRetryOptions = {}
  ): Promise<Array<T | Error>> {
    const {
      concurrency = 3,
      abortOnFailure = false,
      ...retryOptions
    } = options;
  
    const results: Array<T | Error> = new Array(operations.length);
    const pending = operations.map((op, index) => ({ op, index }));
    const active = new Set<number>();
  
    async function runOperation(operation: () => Promise<T>, index: number): Promise<void> {
      active.add(index);
      try {
        results[index] = await withRetry(operation, retryOptions);
      } catch (error: any) {
        results[index] = error;
        if (abortOnFailure) {
          throw error;
        }
      } finally {
        active.delete(index);
      }
    }
  
    while (pending.length > 0 || active.size > 0) {
      if (pending.length > 0 && active.size < concurrency) {
        const { op, index } = pending.shift()!;
        runOperation(op, index);
        continue;
      }
  
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  
    return results;
  }
  
  // Helper for retrying with progressive timeouts
  export function withProgressiveTimeout<T>(
    operation: () => Promise<T>,
    timeouts: number[]
  ): Promise<T> {
    return withRetry(operation, {
      maxRetries: timeouts.length,
      shouldRetry: (error) => error.name === 'TimeoutError',
      initialDelay: timeouts[0],
      onRetry: (_, attempt) => {
        if (attempt < timeouts.length) {
          operation.prototype.timeout = timeouts[attempt];
        }
      }
    });
  }
  
  // Helper for retrying with condition checking
  export async function retryUntil<T>(
    operation: () => Promise<T>,
    condition: (result: T) => boolean,
    options: RetryOptions = {}
  ): Promise<T> {
    return withRetry(
      async () => {
        const result = await operation();
        if (!condition(result)) {
          throw new Error('Condition not met');
        }
        return result;
      },
      options
    );
  }