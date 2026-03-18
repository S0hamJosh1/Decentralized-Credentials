import { createHttpError } from "../lib/http.js";
import { isWorkspaceManager, requireWorkspaceManager } from "../lib/permissions.js";
import {
  ensureUnique,
  requireEmailAddress,
  requireEthereumAddress,
  requireFields,
  sanitizeText,
} from "../lib/validation.js";
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
    wallet: sanitizeText(payload.wallet).toLowerCase(),
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
  requireWorkspaceManager(auth, "Only workspace owners or admins can add issuers.");

  const db = await readDb();
  const issuerInput = sanitizeIssuer(payload);

  requireFields(issuerInput, ["name", "role", "email", "status"], "issuer fields");
  issuerInput.email = requireEmailAddress(issuerInput.email, "issuer email");
  issuerInput.wallet = issuerInput.wallet ? requireEthereumAddress(issuerInput.wallet, "issuer wallet") : "";

  ensureUnique(
    db.issuers,
    (issuer) =>
      issuer.organizationId === auth.organization.id
      && issuer.email?.toLowerCase() === issuerInput.email.toLowerCase(),
    "That issuer is already registered for this organization."
  );
  if (issuerInput.wallet) {
    ensureUnique(
      db.issuers,
      (issuer) =>
        issuer.organizationId === auth.organization.id
        && issuer.wallet?.toLowerCase() === issuerInput.wallet.toLowerCase(),
      "That wallet is already linked to another issuer in this organization."
    );
  }

  const issuer = {
    id: nextId("ISS-", db.issuers),
    organizationId: auth.organization.id,
    userId: "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    approvedAt: issuerInput.status === "Approved" ? nowIso() : "",
    walletVerifiedAt: issuerInput.wallet ? nowIso() : "",
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
        issuerWallet: issuer.wallet,
      },
    });

  await writeDb(db);
  return issuer;
}

export async function updateIssuer(auth, issuerId, payload) {
  requireWorkspaceManager(auth, "Only workspace owners or admins can update issuer access.");

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

  requireFields(nextIssuer, ["name", "role", "email", "status"], "issuer fields");
  nextIssuer.email = requireEmailAddress(nextIssuer.email, "issuer email");
  nextIssuer.wallet = nextIssuer.wallet ? requireEthereumAddress(nextIssuer.wallet, "issuer wallet") : "";

  ensureUnique(
    db.issuers,
    (item) =>
      item.id !== issuer.id
      && item.organizationId === auth.organization.id
      && item.email?.toLowerCase() === nextIssuer.email.toLowerCase(),
    "That issuer is already registered for this organization."
  );
  if (nextIssuer.wallet) {
    ensureUnique(
      db.issuers,
      (item) =>
        item.id !== issuer.id
        && item.organizationId === auth.organization.id
        && item.wallet?.toLowerCase() === nextIssuer.wallet.toLowerCase(),
      "That wallet is already linked to another issuer in this organization."
    );
  }

  db.issuers[issuerIndex] = {
    ...issuer,
    ...nextIssuer,
    updatedAt: nowIso(),
    approvedAt:
      nextIssuer.status === "Approved"
        ? issuer.approvedAt || nowIso()
        : "",
    walletVerifiedAt:
      nextIssuer.wallet === issuer.wallet
        ? issuer.walletVerifiedAt || (nextIssuer.wallet ? nowIso() : "")
        : nextIssuer.wallet
          ? nowIso()
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
        issuerWallet: db.issuers[issuerIndex].wallet,
      },
    });

  const savedDb = await writeDb(db);
  return savedDb.issuers[issuerIndex];
}

export async function linkIssuerWallet(auth, issuerId, payload) {
  const db = await readDb();
  const issuerIndex = db.issuers.findIndex(
    (issuer) => issuer.id === issuerId && issuer.organizationId === auth.organization.id
  );

  if (issuerIndex === -1) {
    throw createHttpError(404, "Issuer not found.");
  }

  const issuer = db.issuers[issuerIndex];
  const canLinkOwnWallet = auth.issuer?.id === issuer.id;

  if (!canLinkOwnWallet && !isWorkspaceManager(auth)) {
    throw createHttpError(403, "You can only link a wallet to your own issuer profile.");
  }

  const wallet = requireEthereumAddress(payload?.wallet, "issuer wallet");

  ensureUnique(
    db.issuers,
    (item) =>
      item.id !== issuer.id
      && item.organizationId === auth.organization.id
      && item.wallet?.toLowerCase() === wallet,
    "That wallet is already linked to another issuer in this organization."
  );

  db.issuers[issuerIndex] = {
    ...issuer,
    wallet,
    walletVerifiedAt: nowIso(),
    updatedAt: nowIso(),
  };

  recordWorkspaceEvent(db, {
    organizationId: auth.organization.id,
    actorUserId: auth.user.id,
    type: "issuer.wallet-linked",
    details: {
      issuerId: issuer.id,
      issuerName: db.issuers[issuerIndex].name,
      issuerStatus: db.issuers[issuerIndex].status,
      issuerWallet: wallet,
    },
  });

  const savedDb = await writeDb(db);
  return savedDb.issuers[issuerIndex];
}
