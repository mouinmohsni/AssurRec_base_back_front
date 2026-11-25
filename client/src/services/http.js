const configuredBaseUrl =
  typeof import.meta.env?.VITE_API_BASE_URL === "string"
    ? import.meta.env.VITE_API_BASE_URL.trim()
    : "";

// La valeur de VITE_API_BASE_URL est l'origine seule (ex. https://api.example.tn).
// Les routes gardent leur préfixe /api afin d'éviter un double /api en production.
const apiBaseUrl = configuredBaseUrl.replace(/\/+$/, "").replace(/\/api$/i, "");
let csrfToken = "";
export class ApiError extends Error {
  constructor(message, status, fields, code) {
    super(message || "Une erreur est survenue.");
    this.name = "ApiError";
    this.status = Number.isInteger(status) ? status : 0;
    this.fields = fields && typeof fields === "object" ? fields : undefined;
    this.code = code || (this.status === 0 ? "NETWORK_UNAVAILABLE" : undefined);
  }
}
function resolveUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = String(path).startsWith("/")
    ? String(path)
    : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}
function dispatchSessionExpired() {
  if (
    typeof window === "undefined" ||
    typeof window.dispatchEvent !== "function"
  )
    return;
  if (typeof CustomEvent === "function")
    window.dispatchEvent(new CustomEvent("assurrec:session-expired"));
}
function isMutation(method) {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}
async function requestInternal(
  path,
  init = {},
  { skipSessionExpired = false, skipCsrf = false } = {},
) {
  const method = String(init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const body = init.body;
  const hasFormData =
    typeof FormData !== "undefined" && body instanceof FormData;
  if (
    body !== undefined &&
    body !== null &&
    !hasFormData &&
    !headers.has("Content-Type")
  )
    headers.set("Content-Type", "application/json");
  if (!skipCsrf && isMutation(method) && csrfToken)
    headers.set("X-CSRF-Token", csrfToken);
  try {
    const response = await fetch(resolveUrl(path), {
      ...init,
      headers,
      credentials: "include",
    });
    let payload = null;
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      const envelope =
        payload && typeof payload === "object" ? payload.error : null;
      const error = new ApiError(
        envelope?.message || `Erreur serveur (${response.status})`,
        response.status,
        envelope?.fields,
        envelope?.code,
      );
      if (response.status === 401 && !skipSessionExpired)
        dispatchSessionExpired();
      throw error;
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error?.name === "AbortError") throw error;
    throw new ApiError(
      "Service indisponible. Vérifiez votre connexion puis réessayez.",
      0,
      undefined,
      "NETWORK_UNAVAILABLE",
    );
  }
}
export function request(path, init = {}) {
  return requestInternal(path, init);
}
export function query(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "")
      search.set(key, String(value));
  });
  const queryString = search.toString();
  if (!queryString) return path;
  return `${path}${String(path).includes("?") ? "&" : "?"}${queryString}`;
}
export function mutation(path, method, body) {
  return request(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
export const api = {
  request,
  async me(options = {}) {
    const result = await requestInternal(
      "/api/auth/me",
      {},
      {
        skipSessionExpired: Boolean(options.initial),
      },
    );
    csrfToken = result?.csrfToken || "";
    return result?.user || null;
  },
  async login(email, password) {
    const result = await requestInternal(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      },
      {
        skipSessionExpired: true,
        skipCsrf: true,
      },
    );
    csrfToken = result?.csrfToken || "";
    return result?.user || null;
  },
  async logout() {
    try {
      await requestInternal("/api/auth/logout", {
        method: "POST",
      });
      csrfToken = "";
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) csrfToken = "";
      throw error;
    }
  },
  demoInfo: () => request("/api/demo-info"),
  agents: () => request("/api/agents"),
};
export default api;
