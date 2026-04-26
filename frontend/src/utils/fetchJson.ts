/**
 * fetchJson — Safe wrapper around fetch() that guards against HTML error pages.
 *
 * When the backend or Vite proxy returns an HTML page (e.g. 503 Service
 * Unavailable during startup) instead of JSON, calling `.json()` directly
 * throws "Unexpected token '<', "<!DOCTYPE "... is not valid JSON".
 *
 * This helper checks the response body text first. If it starts with '<'
 * it means we got an HTML page, and throws a friendly error instead.
 */
export async function fetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);

  // Read body as text first so we can inspect it before parsing.
  const text = await res.text();

  // Detect HTML response (proxy error page, Vite dev server error, etc.)
  if (text.trimStart().startsWith('<')) {
    throw new Error(
      res.status === 503
        ? 'Service unavailable — backend or ComfyUI is still starting up.'
        : `Server returned HTML instead of JSON (HTTP ${res.status}). ` +
          'Make sure the backend is running on port 8000.',
    );
  }

  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON response (HTTP ${res.status}): ${text.slice(0, 120)}`);
  }

  return data;
}
