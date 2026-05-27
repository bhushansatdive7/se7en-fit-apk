const BASE_URL = import.meta.env.VITE_API_URL || "";

async function request(method, path, body, options = {}) {
  if (!BASE_URL) {
    throw new Error("API base URL not configured");
  }

  const query = options.params
    ? "?" + new URLSearchParams(options.params).toString()
    : "";

  const response = await fetch(`${BASE_URL}${path}${query}`, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return { data };
}

const api = {
  get: (path, options) => request("GET", path, null, options),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),
};

export default api;