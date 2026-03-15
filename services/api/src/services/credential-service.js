import { buildVerificationUrl, readDb, writeDb } from "../store.js";
import { createHttpError } from "../lib/http.js";
import { requireApprovedIssuer } from "../lib/permissions.js";
import { mapCredentialFieldValues, validateCredentialFieldValues } from "../lib/template-fields.js";
import { requireEmailAddress, requireFields, sanitizeText } from "../lib/validation.js";
import { buildCredentialTimeline, recordWorkspaceEvent } from "./activity-service.js";
import { findIssuerForUserInOrganization } from "./workspace-access-service.js";

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
    cohort: sanitizeText(payload.cohort),
    summary: sanitizeText(payload.summary),
    fieldValues:
      typeof payload.fieldValues === "object" && payload.fieldValues !== null && !Array.isArray(payload.fieldValues)
        ? payload.fieldValues
        : {},
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
  requireApprovedIssuer(auth, "Your issuer access must be approved before you can issue credentials.");

  const db = await readDb();
  const credentialInput = sanitizeCredential(payload);

  requireFields(
    credentialInput,
    ["templateId", "recipientName", "recipientEmail", "summary"],
    "credential fields"
  );
  credentialInput.recipientEmail = requireEmailAddress(credentialInput.recipientEmail, "recipient email");

  const organization = requireOrganization(db, auth.organization.id);
  const actingIssuer = findIssuerForUserInOrganization(db, organization.id, auth.user);

  if (!actingIssuer || actingIssuer.id !== auth.issuer?.id) {
    throw createHttpError(403, "Your account is not linked to an issuer profile in this workspace.");
  }

  if (credentialInput.issuerId && credentialInput.issuerId !== actingIssuer.id) {
    throw createHttpError(403, "You can only issue credentials as your own issuer account.");
  }

  const template = db.templates.find(
    (item) => item.id === credentialInput.templateId && item.organizationId === organization.id
  );
  const issuer = actingIssuer;

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

  const fieldValues = mapCredentialFieldValues(template.fields || [], credentialInput.fieldValues);
  validateCredentialFieldValues(template.fields || [], fieldValues);

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
    issuerId: issuer.id,
    fieldValues,
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
      fieldValues,
    },
  });

  await writeDb(db);
  return credential;
}

function buildCredentialDetail(db, credential) {
  const organization = db.organizations.find((item) => item.id === credential.organizationId);
  const template = db.templates.find((item) => item.id === credential.templateId) || null;
  const issuer = db.issuers.find((item) => item.id === credential.issuerId) || null;

  return {
    organization: organization || null,
    template,
    issuer,
    credential,
    timeline: buildCredentialTimeline(db, credential.id),
  };
}

export async function revokeCredential(auth, credentialId, reason) {
  requireApprovedIssuer(auth, "Your issuer access must be approved before you can revoke credentials.");

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

export async function getCredentialDetails(auth, credentialId) {
  const db = await readDb();
  const credential = db.credentials.find(
    (item) => item.id === credentialId && item.organizationId === auth.organization.id
  );

  if (!credential) {
    throw createHttpError(404, "Credential not found.");
  }

  return buildCredentialDetail(db, credential);
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

  return buildCredentialDetail(db, credential);
}
