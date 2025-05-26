// Global cache for ongoing API requests to prevent duplicates
// Based on: https://dev.to/anxiny/daily-share-a-custom-react-hook-that-handles-duplicate-api-call-41cd

const ongoingRequests = new Map<string, Promise<any>>();

export function getCachedApiCall<T>(
  key: string,
  apiCall: () => Promise<T>
): Promise<T> {
  // Check if this API call is already in progress
  let existingRequest = ongoingRequests.get(key);
  
  if (!existingRequest) {
    // Start new request and cache it
    existingRequest = apiCall().finally(() => {
      // Remove from cache when completed (success or error)
      ongoingRequests.delete(key);
    });
    
    ongoingRequests.set(key, existingRequest);
  }
  
  return existingRequest;
}

// Helper to clear cache (useful for testing or manual refresh)
export function clearApiCache(key?: string) {
  if (key) {
    ongoingRequests.delete(key);
  } else {
    ongoingRequests.clear();
  }
} 