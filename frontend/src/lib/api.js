export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
export const SOCKET_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null
        ? payload.message
        : payload;
    throw new Error(message || "Request failed");
  }

  return payload;
}

export const api = {
  get(path) {
    return request(path);
  },
  post(path, body) {
    return request(path, {
      method: "POST",
      body: JSON.stringify(body)
    });
  },
  put(path, body) {
    return request(path, {
      method: "PUT",
      body: JSON.stringify(body)
    });
  },
  delete(path) {
    return request(path, {
      method: "DELETE"
    });
  }
};
