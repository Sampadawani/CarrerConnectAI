
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || ""
).replace(/\/$/, "");

export async function api(path, options = {}) {
  const token = localStorage.getItem("cc-token");
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options.headers,
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...options,
      headers,
      body:
        options.body && typeof options.body !== "string" && !isFormData
          ? JSON.stringify(options.body)
          : options.body,
    });
  } catch {
    throw new Error("Cannot reach the CareerConnect API. Check your connection.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}

export async function download(path, fallbackName) {
  const token = localStorage.getItem("cc-token");
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new Error("Cannot reach the CareerConnect API. Check your connection.");
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || `Download failed (${response.status}).`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  const filename =
    disposition?.match(/filename="?([^";]+)"?/i)?.[1] || fallbackName;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function saveSession({ token, user }) {
  localStorage.setItem("cc-token", token);
  localStorage.setItem("cc-user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("cc-token");
  localStorage.removeItem("cc-user");
}
