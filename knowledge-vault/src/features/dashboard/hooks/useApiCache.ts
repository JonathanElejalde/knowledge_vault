// API cache utility to prevent duplicate API calls
const ongoingRequests = new Map<string, Promise<any>>();

export function getCachedApiCall<T>(
  key: string,
  apiCall: () => Promise<T>
): Promise<T> {
  let existingRequest = ongoingRequests.get(key);
  
  if (!existingRequest) {
    // Start new request and cache it
    existingRequest = apiCall().finally(() => {
      // Remove from cache when completed
      ongoingRequests.delete(key);
    });
    
    ongoingRequests.set(key, existingRequest);
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