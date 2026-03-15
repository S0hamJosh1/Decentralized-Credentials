import { createHttpError } from "../lib/http.js";
import { ensureUnique, requireFields, sanitizeText } from "../lib/validation.js";
import { readDb, writeDb } from "../store.js";

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
    email: sanitizeText(payload.email).toLowerCase(),
    wallet: sanitizeText(payload.wallet),
    status: sanitizeText(payload.status) || "Pending",
  };
}

export async function listIssuers(auth) {
  const db = await readDb();
  return db.issuers.filter((issuer) => issuer.organizationId === auth.organization.id);
}

export async function createIssuer(auth, payload) {
  const db = await readDb();
  const issuerInput = sanitizeIssuer(payload);

  requireFields(issuerInput, ["name", "role", "status"], "issuer fields");

  if (!issuerInput.wallet && !issuerInput.email) {
    throw createHttpError(400, "Provide a wallet or email for the issuer.");
  }

  ensureUnique(
    db.issuers,
    (issuer) =>
      issuer.organizationId === auth.organization.id
      && (
        (issuerInput.wallet && issuer.wallet?.toLowerCase() === issuerInput.wallet.toLowerCase())
        || (issuerInput.email && issuer.email?.toLowerCase() === issuerInput.email.toLowerCase())
      ),
    "That issuer is already registered for this organization."
  );

  const issuer = {
    id: nextId("ISS-", db.issuers),
    organizationId: auth.organization.id,
    userId: "",
    wallet: issuerInput.wallet || "",
    ...issuerInput,
  };

  db.issuers.unshift(issuer);
  await writeDb(db);
  return issuer;
}
