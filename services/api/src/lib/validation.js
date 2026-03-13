import { createHttpError } from "./http.js";

export function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

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
