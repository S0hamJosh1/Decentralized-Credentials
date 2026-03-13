import { readDb, writeDb } from "../store.js";
import { createHttpError } from "../lib/http.js";
import { ensureUnique, requireFields, sanitizeText } from "../lib/validation.js";

function nextId(prefix, list, start = 1) {
  const numericValues = list
    .map((item) => Number(String(item.id || "").replace(/^[A-Z-]+/, "")))
    .filter((value) => Number.isFinite(value));

  const nextNumber = Math.max(start, ...numericValues) + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function sanitizeIssuer(payload = {}) {
  return {
    name: sanitizeText(payload.name),
    role: sanitizeText(payload.role),
    wallet: sanitizeText(payload.wallet),
    status: sanitizeText(payload.status) || "Pending",
  };
}

export async function listIssuers() {
  const db = await readDb();
  return db.issuers;
}

export async function createIssuer(payload) {
  const db = await readDb();
  const issuerInput = sanitizeIssuer(payload);

  requireFields(issuerInput, ["name", "role", "wallet", "status"], "issuer fields");
  ensureUnique(
    db.issuers,
    (issuer) => issuer.organizationId === db.organization.id && issuer.wallet.toLowerCase() === issuerInput.wallet.toLowerCase(),
    "That wallet is already registered for this organization."
  );

  const issuer = {
    id: nextId("ISS-", db.issuers),
    organizationId: db.organization.id,
    ...issuerInput,
  };

  db.issuers.unshift(issuer);
  await writeDb(db);
  return issuer;
}

export async function requireIssuer(issuerId) {
  const db = await readDb();
  const issuer = db.issuers.find((item) => item.id === issuerId);

  if (!issuer) {
    throw createHttpError(404, "Issuer not found.");
  }

  return { db, issuer };
}
