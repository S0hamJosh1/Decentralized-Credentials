import { createPublicKey, createVerify } from "node:crypto";
import { createHttpError } from "./http.js";
import { sanitizeText } from "./validation.js";

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

let cachedJwks = {
  keys: [],
  expiresAt: 0,
};

function decodeBase64Url(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function decodeJsonSegment(segment, label) {
  try {
    return JSON.parse(decodeBase64Url(segment).toString("utf8"));
  } catch {
    throw createHttpError(400, `Invalid Google token ${label}.`);
  }
}

function parseGoogleToken(idToken) {
  const parts = String(idToken || "").split(".");

  if (parts.length !== 3) {
    throw createHttpError(400, "Invalid Google credential.");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  return {
    header: decodeJsonSegment(encodedHeader, "header"),
    payload: decodeJsonSegment(encodedPayload, "payload"),
    signature: decodeBase64Url(encodedSignature),
    signingInput: `${encodedHeader}.${encodedPayload}`,
  };
}

function getAllowedGoogleClientIds() {
  return Array.from(
    new Set(
      [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_IDS]
        .flatMap((value) => String(value || "").split(","))
        .map((value) => sanitizeText(value))
        .filter(Boolean)
    )
  );
}

function parseCacheMaxAgeMs(cacheControl = "") {
  const match = String(cacheControl).match(/max-age=(\d+)/i);
  const seconds = match ? Number(match[1]) : 300;
  return Math.max(60, Number.isFinite(seconds) ? seconds : 300) * 1000;
}

async function fetchGoogleJwks() {
  if (cachedJwks.keys.length > 0 && cachedJwks.expiresAt > Date.now()) {
    return cachedJwks.keys;
  }

  let response;

  try {
    response = await fetch(GOOGLE_CERTS_URL);
  } catch {
    throw createHttpError(502, "Google sign-in is unavailable right now. Please try again.");
  }

  if (!response.ok) {
    throw createHttpError(502, "Google sign-in is unavailable right now. Please try again.");
  }

  const payload = await response.json().catch(() => null);
  const keys = Array.isArray(payload?.keys) ? payload.keys : [];

  if (keys.length === 0) {
    throw createHttpError(502, "Google sign-in is unavailable right now. Please try again.");
  }

  cachedJwks = {
    keys,
    expiresAt: Date.now() + parseCacheMaxAgeMs(response.headers.get("cache-control")),
  };

  return keys;
}

function verifyJwtSignature(signingInput, signature, jwk) {
  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingInput);
  verifier.end();
  return verifier.verify(createPublicKey({ key: jwk, format: "jwk" }), signature);
}

function isAudienceAllowed(audience, allowedClientIds) {
  const audiences = Array.isArray(audience) ? audience : [audience];
  return audiences.some((value) => allowedClientIds.includes(String(value)));
}

function isGoogleAuthoritativeEmail(payload) {
  const email = String(payload.email || "").toLowerCase();
  return Boolean(payload.hd) || email.endsWith("@gmail.com");
}

export function clearGoogleJwksCache() {
  cachedJwks = {
    keys: [],
    expiresAt: 0,
  };
}

export async function verifyGoogleIdToken(idToken) {
  const allowedClientIds = getAllowedGoogleClientIds();

  if (allowedClientIds.length === 0) {
    throw createHttpError(500, "Google sign-in is not configured on this server.");
  }

  const { header, payload, signature, signingInput } = parseGoogleToken(idToken);

  if (header.alg !== "RS256" || !header.kid) {
    throw createHttpError(401, "Google credential could not be verified.");
  }

  if (!GOOGLE_ISSUERS.has(String(payload.iss || ""))) {
    throw createHttpError(401, "Google credential could not be verified.");
  }

  if (!isAudienceAllowed(payload.aud, allowedClientIds)) {
    throw createHttpError(401, "Google credential was issued for a different application.");
  }

  const expiresAt = Number(payload.exp) * 1000;

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw createHttpError(401, "Google credential has expired. Please try again.");
  }

  if (!payload.sub || !payload.email || payload.email_verified !== true) {
    throw createHttpError(401, "Google credential is missing required account information.");
  }

  let keys = await fetchGoogleJwks();
  let jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");

  if (!jwk) {
    clearGoogleJwksCache();
    keys = await fetchGoogleJwks();
    jwk = keys.find((key) => key.kid === header.kid && key.kty === "RSA");
  }

  if (!jwk || !verifyJwtSignature(signingInput, signature, jwk)) {
    throw createHttpError(401, "Google credential could not be verified.");
  }

  return {
    subject: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    fullName: sanitizeText(payload.name) || sanitizeText(payload.email),
    givenName: sanitizeText(payload.given_name),
    familyName: sanitizeText(payload.family_name),
    picture: sanitizeText(payload.picture),
    hostedDomain: sanitizeText(payload.hd).toLowerCase(),
    emailVerified: true,
    authoritativeEmail: isGoogleAuthoritativeEmail(payload),
  };
}
