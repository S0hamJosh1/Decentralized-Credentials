const STORAGE_KEY = "credential-foundry.issuer-session.v1";

function hasWindow() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readIssuerSession() {
  if (!hasWindow()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeIssuerSession(session) {
  if (hasWindow()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  return session;
}

export function clearIssuerSession() {
  if (hasWindow()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export function slugifyCompanyName(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
