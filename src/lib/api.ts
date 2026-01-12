/**
 * Safe fetch wrapper that handles JSON parsing errors gracefully
 */
export async function safeFetch(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);

    // If response is not OK, return the response for handling
    if (!response.ok) {
      return response;
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Response is not JSON");
    }

    return response;
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch and parse JSON safely
 * Returns { ok: false, error: string } if parsing fails
 */
export async function fetchJSON<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const response = await safeFetch(url, options);

    // Check content type before parsing
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      return { ok: false, error: "Invalid response type" };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}
