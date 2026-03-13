import { buildVerificationUrl, readDb, writeDb } from "../store.js";
import { createHttpError } from "../lib/http.js";
import { requireFields, sanitizeText } from "../lib/validation.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextId(prefix, list, start = 1) {
  const numericValues = list
    .map((item) => Number(String(item.id || "").replace(/^[A-Z-]+/, "")))
    .filter((value) => Number.isFinite(value));

  const nextNumber = Math.max(start, ...numericValues) + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function templateCode(templateName) {
  return templateName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function sanitizeCredential(payload = {}) {
  return {
    templateId: sanitizeText(payload.templateId),
    issuerId: sanitizeText(payload.issuerId),
    recipientName: sanitizeText(payload.recipientName),
    recipientEmail: sanitizeText(payload.recipientEmail),
    recipientWallet: sanitizeText(payload.recipientWallet),
    cohort: sanitizeText(payload.cohort),
    summary: sanitizeText(payload.summary),
  };
}

export async function listCredentials() {
  const db = await readDb();
  return db.credentials;
}

export async function createCredential(payload) {
  const db = await readDb();
  const credentialInput = sanitizeCredential(payload);

  requireFields(
    credentialInput,
    ["templateId", "issuerId", "recipientName", "recipientEmail", "recipientWallet", "cohort", "summary"],
    "credential fields"
  );

  const template = db.templates.find((item) => item.id === credentialInput.templateId);
  const issuer = db.issuers.find((item) => item.id === credentialInput.issuerId);

  if (!template) {
    throw createHttpError(404, "Template not found.");
  }

  if (!issuer) {
    throw createHttpError(404, "Issuer not found.");
  }

  if (issuer.status !== "Approved") {
    throw createHttpError(400, "Only approved issuers can create credentials.");
  }

  if (issuer.organizationId !== template.organizationId) {
    throw createHttpError(400, "Issuer and template must belong to the same organization.");
  }

  const id = nextId("CRD-", db.credentials, 1000);
  const numericId = id.replace("CRD-", "");
  const verificationCode = `NST-${templateCode(template.name)}-${numericId}`;
  const credential = {
    id,
    organizationId: db.organization.id,
    verificationCode,
    verificationUrl: buildVerificationUrl(verificationCode),
    templateName: template.name,
    issuedBy: issuer.name,
    issuedAt: today(),
    status: "Valid",
    revokedAt: "",
    revocationReason: "",
    ...credentialInput,
  };

  db.credentials.unshift(credential);
  await writeDb(db);
  return credential;
}

export async function revokeCredential(credentialId, reason) {
  const db = await readDb();
  const credential = db.credentials.find((item) => item.id === credentialId);

  if (!credential) {
    throw createHttpError(404, "Credential not found.");
  }

  if (credential.status === "Revoked") {
    throw createHttpError(400, "Credential is already revoked.");
  }

  credential.status = "Revoked";
  credential.revokedAt = today();
  credential.revocationReason = sanitizeText(reason) || "Revoked by an authorized issuer.";

  await writeDb(db);
  return credential;
}

export async function getVerificationRecord(code) {
  const db = await readDb();
  const normalizedCode = decodeURIComponent(code).toUpperCase();
  const credential = db.credentials.find((item) => item.verificationCode.toUpperCase() === normalizedCode);

  if (!credential) {
    throw createHttpError(404, "Credential not found.");
  }

  return {
    organization: db.organization,
    credential,
  };
}
