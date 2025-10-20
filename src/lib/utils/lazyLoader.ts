// Utility for lazy loading heavy components
export function createLazyComponent<T>(loader: () => Promise<{ default: T }>) {
  let componentPromise: Promise<{ default: T }> | null = null;
  
  return () => {
    if (!componentPromise) {
      componentPromise = loader();
    }
    return componentPromise;
  };
}

// Pre-load components when user hovers over navigation
export function preloadComponent(loader: () => Promise<any>) {
  return () => {
    // Pre-load but don't wait for it
    loader().catch(() => {
      // Ignore preload errors
    });
  };
}