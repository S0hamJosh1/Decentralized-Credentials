const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

function buildHtmlFallbackMessage(path) {
  if (API_BASE) {
    return `The API request to ${path} returned HTML instead of JSON. Check that VITE_API_BASE_URL points to your backend service, not the frontend app.`;
  }

  return `The API request to ${path} returned HTML instead of JSON. Run the API on port 4000 locally, or set VITE_API_BASE_URL to your deployed backend.`;
}

async function readApiPayload(response, path) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      const error = new Error(`The API response for ${path} was not valid JSON.`);
      error.status = response.status;
      throw error;
    }
  }

  const text = await response.text();

  if (/<!doctype html|<html/i.test(text)) {
    const error = new Error(buildHtmlFallbackMessage(path));
    error.status = response.status || 500;
    throw error;
  }

  if (!text) {
    return null;
  }

  const error = new Error(`The API response for ${path} used an unsupported content type: ${contentType || "unknown"}.`);
  error.status = response.status || 500;
  throw error;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const payload = await readApiPayload(response, path);

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed: ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function registerAccount(payload) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginAccount(payload) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerGoogleAccount(payload) {
  return request("/api/auth/google/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginGoogleAccount(payload) {
  return request("/api/auth/google/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function acceptInvitation(payload) {
  return request("/api/auth/invitations/accept", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function acceptGoogleInvitation(payload) {
  return request("/api/auth/google/invitations/accept", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logoutAccount() {
  return request("/api/auth/logout", {
    method: "POST",
  });
}

export function fetchAuthSession() {
  return request("/api/auth/session");
}

export function switchWorkspace(payload) {
  return request("/api/auth/switch-workspace", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchBootstrap() {
  return request("/api/bootstrap");
}

export function fetchInvitation(code) {
  return request(`/api/invitations/${encodeURIComponent(code)}`);
}

export function fetchTeamAccess() {
  return request("/api/team");
}

export function createTeamInvitation(payload) {
  return request("/api/team/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateOrganization(payload) {
  return request("/api/organization", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createTemplate(payload) {
  return request("/api/templates", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTemplateRecord(id, payload) {
  return request(`/api/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createIssuer(payload) {
  return request("/api/issuers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIssuerRecord(id, payload) {
  return request(`/api/issuers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function createCredential(payload) {
  return request("/api/credentials", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function revokeCredentialRecord(id, reason) {
  return request(`/api/credentials/${id}/revoke`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });
}

export function fetchVerifyRecord(code) {
  return request(`/api/verify/${encodeURIComponent(code)}`);
}
