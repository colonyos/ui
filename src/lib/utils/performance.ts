// Performance monitoring utilities

export function measureAsyncOperation<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = performance.now();
  
  return operation()
    .then((result) => {
      const duration = performance.now() - startTime;
      
      if (import.meta.env.DEV) {
        console.log(`${operationName} completed in ${duration.toFixed(2)}ms`);
      }
      
      // Log slow operations in production
      if (duration > 2000) { // 2 seconds threshold
        console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    })
    .catch((error) => {
      const duration = performance.now() - startTime;
      console.error(`${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    });
}

export function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return operation().catch((error) => {
    if (maxRetries <= 0) {
      throw error;
    }
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        withRetry(operation, maxRetries - 1, delayMs * 2)
          .then(resolve)
          .catch(reject);
      }, delayMs);
    });
  });
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return ((...args: Parameters<T>): void => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}