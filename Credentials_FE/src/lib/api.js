const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export function fetchBootstrap() {
  return request("/api/bootstrap");
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

export function createIssuer(payload) {
  return request("/api/issuers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function setupWorkspace(payload) {
  return request("/api/workspace/setup", {
    method: "POST",
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
