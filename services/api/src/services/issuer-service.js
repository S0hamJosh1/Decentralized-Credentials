import { createHttpError } from "../lib/http.js";
import { ensureUnique, requireFields, sanitizeText } from "../lib/validation.js";
import { readDb, writeDb } from "../store.js";
import { recordWorkspaceEvent } from "./activity-service.js";

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

function nowIso() {
  return new Date().toISOString();
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
    createdAt: nowIso(),
    updatedAt: nowIso(),
    approvedAt: issuerInput.status === "Approved" ? nowIso() : "",
    ...issuerInput,
  };

  db.issuers.unshift(issuer);
  recordWorkspaceEvent(db, {
    organizationId: auth.organization.id,
    actorUserId: auth.user.id,
    type: "issuer.created",
    details: {
      issuerId: issuer.id,
      issuerName: issuer.name,
      issuerStatus: issuer.status,
    },
  });

  await writeDb(db);
  return issuer;
}

export async function updateIssuer(auth, issuerId, payload) {
  const db = await readDb();
  const issuerIndex = db.issuers.findIndex(
    (issuer) => issuer.id === issuerId && issuer.organizationId === auth.organization.id
  );

  if (issuerIndex === -1) {
    throw createHttpError(404, "Issuer not found.");
  }

  const issuer = db.issuers[issuerIndex];
  const nextIssuer = sanitizeIssuer({
    ...issuer,
    ...payload,
  });

  requireFields(nextIssuer, ["name", "role", "status"], "issuer fields");

  if (!nextIssuer.wallet && !nextIssuer.email) {
    throw createHttpError(400, "Provide a wallet or email for the issuer.");
  }

  ensureUnique(
    db.issuers,
    (item) =>
      item.id !== issuer.id
      && item.organizationId === auth.organization.id
      && (
        (nextIssuer.wallet && item.wallet?.toLowerCase() === nextIssuer.wallet.toLowerCase())
        || (nextIssuer.email && item.email?.toLowerCase() === nextIssuer.email.toLowerCase())
      ),
    "That issuer is already registered for this organization."
  );

  db.issuers[issuerIndex] = {
    ...issuer,
    ...nextIssuer,
    wallet: nextIssuer.wallet || "",
    updatedAt: nowIso(),
    approvedAt:
      nextIssuer.status === "Approved"
        ? issuer.approvedAt || nowIso()
        : "",
  };

  recordWorkspaceEvent(db, {
    organizationId: auth.organization.id,
    actorUserId: auth.user.id,
    type: "issuer.updated",
    details: {
      issuerId: issuer.id,
      issuerName: db.issuers[issuerIndex].name,
      issuerStatus: db.issuers[issuerIndex].status,
    },
  });

  const savedDb = await writeDb(db);
  return savedDb.issuers[issuerIndex];
}
