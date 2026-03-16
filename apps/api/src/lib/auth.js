import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "credential_foundry_session";
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export function createPasswordHash(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash = "") {
  const [salt, originalHash] = String(storedHash).split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const nextHash = scryptSync(password, salt, 64);
  const originalBuffer = Buffer.from(originalHash, "hex");

  if (originalBuffer.length !== nextHash.length) {
    return false;
  }

  return timingSafeEqual(originalBuffer, nextHash);
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function parseCookies(header = "") {
  return String(header)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});
}

export function getSessionToken(request) {
  const cookies = parseCookies(request.headers.cookie || "");
  return cookies[SESSION_COOKIE_NAME] || "";
}

function getCookieSameSite() {
  const configuredValue = String(process.env.SESSION_COOKIE_SAME_SITE || "lax").toLowerCase();

  if (["strict", "lax", "none"].includes(configuredValue)) {
    return configuredValue;
  }

  return "lax";
}

function getCookieSecure() {
  if (typeof process.env.SESSION_COOKIE_SECURE === "string") {
    return process.env.SESSION_COOKIE_SECURE === "true";
  }

  return process.env.NODE_ENV === "production" || getCookieSameSite() === "none";
}

function buildSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: getCookieSameSite(),
    secure: getCookieSecure(),
    path: "/",
  };
}

export function setSessionCookie(response, token) {
  response.cookie(SESSION_COOKIE_NAME, token, {
    ...buildSessionCookieOptions(),
    maxAge: SESSION_TTL_MS,
  });
}

export function clearSessionCookie(response) {
  response.clearCookie(SESSION_COOKIE_NAME, {
    ...buildSessionCookieOptions(),
  });
}
