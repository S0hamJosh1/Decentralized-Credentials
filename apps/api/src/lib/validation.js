import { createHttpError } from "./http.js";

export function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ETHEREUM_ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/i;
const HEX_HASH_32_PATTERN = /^0x[a-f0-9]{64}$/i;

export function requireFields(payload, fields, entityName = "fields") {
  const missing = fields.filter((field) => sanitizeText(payload[field]) === "");

  if (missing.length > 0) {
    throw createHttpError(400, `Missing required ${entityName}: ${missing.join(", ")}.`);
  }
}

export function ensureUnique(items, predicate, message) {
  if (items.some(predicate)) {
    throw createHttpError(409, message);
  }
}

export function requireEmailAddress(value, fieldName = "email") {
  const normalizedValue = sanitizeText(value).toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedValue)) {
    throw createHttpError(400, `Enter a valid ${fieldName}.`);
  }

  return normalizedValue;
}

export function requireHttpUrl(value, fieldName = "URL") {
  const normalizedValue = sanitizeText(value);

  try {
    const parsedUrl = new URL(normalizedValue);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Unsupported protocol");
    }
  } catch {
    throw createHttpError(400, `Enter a valid ${fieldName}.`);
  }

  return normalizedValue;
}

export function requireSlug(value, fieldName = "slug") {
  const normalizedValue = sanitizeText(value).toLowerCase();

  if (!SLUG_PATTERN.test(normalizedValue)) {
    throw createHttpError(400, `Enter a valid ${fieldName} using lowercase letters, numbers, and hyphens only.`);
  }

  return normalizedValue;
}

export function requireEthereumAddress(value, fieldName = "wallet address") {
  const normalizedValue = sanitizeText(value).toLowerCase();

  if (!ETHEREUM_ADDRESS_PATTERN.test(normalizedValue)) {
    throw createHttpError(400, `Enter a valid ${fieldName}.`);
  }

  return normalizedValue;
}

export function requireHexHash32(value, fieldName = "hash") {
  const normalizedValue = sanitizeText(value).toLowerCase();

  if (!HEX_HASH_32_PATTERN.test(normalizedValue)) {
    throw createHttpError(400, `Enter a valid ${fieldName}.`);
  }

  return normalizedValue;
}
