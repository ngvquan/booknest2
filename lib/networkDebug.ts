const globalWithFetchDebug = globalThis as typeof globalThis & {
  __bookNestFetchDebugInstalled?: boolean;
};

function getFetchUrl(input: unknown) {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (input && typeof input === "object" && "url" in input) {
    return String((input as { url?: unknown }).url || "");
  }
  return String(input || "");
}

if (__DEV__ && !globalWithFetchDebug.__bookNestFetchDebugInstalled) {
  const originalFetch = globalThis.fetch;
  globalWithFetchDebug.__bookNestFetchDebugInstalled = true;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await originalFetch(input, init);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[BookNest fetch failed] ${getFetchUrl(input)}: ${message}`);
      throw error;
    }
  };
}
