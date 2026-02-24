// API cache utility to prevent duplicate API calls
const ongoingRequests = new Map<string, Promise<unknown>>();

export function getCachedApiCall<T>(
  key: string,
  apiCall: () => Promise<T>
): Promise<T> {
  let existingRequest = ongoingRequests.get(key) as Promise<T> | undefined;
  
  if (!existingRequest) {
    // Start new request and cache it
    existingRequest = apiCall().finally(() => {
      // Remove from cache when completed
      ongoingRequests.delete(key);
    });
    
    ongoingRequests.set(key, existingRequest as Promise<unknown>);
  }
  
  return existingRequest;
}

export function clearApiCache(key?: string): void {
  if (key) {
    ongoingRequests.delete(key);
  } else {
    ongoingRequests.clear();
  }
} 
