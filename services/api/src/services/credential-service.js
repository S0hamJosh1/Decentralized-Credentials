import { buildVerificationUrl, readDb, writeDb } from "../store.js";
import { createHttpError } from "../lib/http.js";
import { requireFields, sanitizeText } from "../lib/validation.js";
import { recordWorkspaceEvent } from "./activity-service.js";

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
  const firstWord = templateName.split(/\s+/).find(Boolean) || "";
  const normalized = firstWord.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase();

  if (normalized.length >= 2) {
    return normalized;
  }

  return templateName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function organizationCode(slug = "") {
  const code = slug
    .split("-")
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return code || "CF";
}

function sanitizeCredential(payload = {}) {
  return {
    templateId: sanitizeText(payload.templateId),
    issuerId: sanitizeText(payload.issuerId),
    recipientName: sanitizeText(payload.recipientName),
    recipientEmail: sanitizeText(payload.recipientEmail).toLowerCase(),
    recipientWallet: sanitizeText(payload.recipientWallet),
    cohort: sanitizeText(payload.cohort),
    summary: sanitizeText(payload.summary),
  };
}

function requireOrganization(db, organizationId) {
  const organization = db.organizations.find((item) => item.id === organizationId);

  if (!organization) {
    throw createHttpError(404, "Workspace not found.");
  }

  return organization;
}

export async function listCredentials(auth) {
  const db = await readDb();
  return db.credentials.filter((credential) => credential.organizationId === auth.organization.id);
}

export async function createCredential(auth, payload) {
  const db = await readDb();
  const credentialInput = sanitizeCredential(payload);

  requireFields(
    credentialInput,
    ["templateId", "issuerId", "recipientName", "recipientEmail", "cohort", "summary"],
    "credential fields"
  );

  const organization = requireOrganization(db, auth.organization.id);
  const template = db.templates.find(
    (item) => item.id === credentialInput.templateId && item.organizationId === organization.id
  );
  const issuer = db.issuers.find(
    (item) => item.id === credentialInput.issuerId && item.organizationId === organization.id
  );

  if (!template) {
    throw createHttpError(404, "Template not found.");
  }

  if (template.status !== "Active") {
    throw createHttpError(400, "Only active templates can issue credentials.");
  }

  if (!issuer) {
    throw createHttpError(404, "Issuer not found.");
  }

  if (issuer.status !== "Approved") {
    throw createHttpError(400, "Only approved issuers can create credentials.");
  }

  const id = nextId("CRD-", db.credentials, 1000);
  const numericId = id.replace("CRD-", "");
  const verificationCode = `${organizationCode(organization.slug)}-${templateCode(template.name)}-${numericId}`;
  const credential = {
    id,
    organizationId: organization.id,
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
  recordWorkspaceEvent(db, {
    organizationId: organization.id,
    actorUserId: auth.user.id,
    credentialId: credential.id,
    type: "credential.issued",
    details: {
      issuerId: issuer.id,
      issuerName: issuer.name,
      recipientName: credential.recipientName,
      templateId: template.id,
      templateName: template.name,
      verificationCode,
    },
  });

  await writeDb(db);
  return credential;
}

export async function revokeCredential(auth, credentialId, reason) {
  const db = await readDb();
  const credential = db.credentials.find(
    (item) => item.id === credentialId && item.organizationId === auth.organization.id
  );

  if (!credential) {
    throw createHttpError(404, "Credential not found.");
  }

  if (credential.status === "Revoked") {
    throw createHttpError(400, "Credential is already revoked.");
  }

  credential.status = "Revoked";
  credential.revokedAt = today();
  credential.revocationReason = sanitizeText(reason) || "Revoked by an authorized issuer.";

  recordWorkspaceEvent(db, {
    organizationId: credential.organizationId,
    actorUserId: auth.user.id,
    credentialId: credential.id,
    type: "credential.revoked",
    details: {
      reason: credential.revocationReason,
      recipientName: credential.recipientName,
      templateId: credential.templateId,
      templateName: credential.templateName,
      verificationCode: credential.verificationCode,
      issuerId: credential.issuerId,
      issuerName: credential.issuedBy,
    },
  });

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

  const organization = db.organizations.find((item) => item.id === credential.organizationId);

  if (!organization) {
    throw createHttpError(404, "Workspace not found.");
  }

  return {
    organization,
    credential,
  };
}
