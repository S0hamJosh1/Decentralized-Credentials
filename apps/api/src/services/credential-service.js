import { buildVerificationUrl, readDb, writeDb } from "../store.js";
import { buildCredentialProof, createCredentialHash, getInitialAnchorStatus } from "../lib/credential-proof.js";
import { createHttpError } from "../lib/http.js";
import { requireApprovedIssuer } from "../lib/permissions.js";
import { mapCredentialFieldValues, validateCredentialFieldValues } from "../lib/template-fields.js";
import {
  requireEmailAddress,
  requireEthereumAddress,
  requireFields,
  requireHexHash32,
  sanitizeText,
} from "../lib/validation.js";
import { buildCredentialTimeline, recordWorkspaceEvent } from "./activity-service.js";
import { findIssuerForUserInOrganization } from "./workspace-access-service.js";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowIso() {
  return new Date().toISOString();
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
    recipientWallet: sanitizeText(payload.recipientWallet).toLowerCase(),
    cohort: sanitizeText(payload.cohort),
    summary: sanitizeText(payload.summary),
    fieldValues:
      typeof payload.fieldValues === "object" && payload.fieldValues !== null && !Array.isArray(payload.fieldValues)
        ? payload.fieldValues
        : {},
  };
}

function sanitizeAnchorPayload(payload = {}) {
  return {
    txHash: sanitizeText(payload.txHash).toLowerCase(),
    blockNumber: sanitizeText(payload.blockNumber),
    chainId: sanitizeText(payload.chainId),
    network: sanitizeText(payload.network) || "Sepolia",
    contractAddress: sanitizeText(payload.contractAddress).toLowerCase(),
    issuerWallet: sanitizeText(payload.issuerWallet).toLowerCase(),
  };
}

function validateAnchorPayload(payload, auth) {
  const input = sanitizeAnchorPayload(payload);

  requireFields(
    input,
    ["txHash", "blockNumber", "chainId", "network", "contractAddress", "issuerWallet"],
    "anchor fields"
  );

  input.txHash = requireHexHash32(input.txHash, "transaction hash");
  input.contractAddress = requireEthereumAddress(input.contractAddress, "contract address");
  input.issuerWallet = requireEthereumAddress(input.issuerWallet, "issuer wallet");

  if (input.chainId !== "11155111") {
    throw createHttpError(400, "Credential anchors must be written on Sepolia (chain id 11155111).");
  }

  if (input.network.toLowerCase() !== "sepolia") {
    throw createHttpError(400, "Credential anchors must be recorded against the Sepolia network.");
  }

  const expectedContractAddress = sanitizeText(process.env.SEPOLIA_CONTRACT_ADDRESS).toLowerCase();

  if (expectedContractAddress && input.contractAddress !== expectedContractAddress) {
    throw createHttpError(400, "The submitted contract address does not match the configured Sepolia registry.");
  }

  const approvedIssuer = requireApprovedIssuer(auth);

  if (!approvedIssuer.wallet) {
    throw createHttpError(400, "Link a wallet to your issuer profile before recording Sepolia proof.");
  }

  if (approvedIssuer.wallet.toLowerCase() !== input.issuerWallet) {
    throw createHttpError(403, "The connected wallet does not match your linked issuer wallet.");
  }

  input.network = "Sepolia";
  return input;
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
    credentialHash: "",
    anchorStatus: getInitialAnchorStatus(issuer.wallet || ""),
    chainId: "",
    network: "",
    contractAddress: "",
    txHash: "",
    blockNumber: "",
    anchoredAt: "",
    revokeTxHash: "",
    revokeBlockNumber: "",
    revokedOnChainAt: "",
    templateName: template.name,
    issuerWallet: issuer.wallet || "",
    issuedBy: issuer.name,
    issuedAt: today(),
    status: "Valid",
    revokedAt: "",
    revocationReason: "",
    ...credentialInput,
    issuerId: issuer.id,
    fieldValues,
  };
  credential.credentialHash = createCredentialHash(credential);

  db.credentials.unshift(credential);
  recordWorkspaceEvent(db, {
    organizationId: organization.id,
    actorUserId: auth.user.id,
    credentialId: credential.id,
    type: "credential.issued",
    details: {
      issuerId: issuer.id,
      issuerName: issuer.name,
      issuerWallet: issuer.wallet || "",
      recipientName: credential.recipientName,
      templateId: template.id,
      templateName: template.name,
      verificationCode,
      credentialHash: credential.credentialHash,
      anchorStatus: credential.anchorStatus,
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
    proof: buildCredentialProof(credential),
    timeline: buildCredentialTimeline(db, credential.id),
  };
}

export async function saveCredentialAnchor(auth, credentialId, payload) {
  const db = await readDb();
  const credential = db.credentials.find(
    (item) => item.id === credentialId && item.organizationId === auth.organization.id
  );

  if (!credential) {
    throw createHttpError(404, "Credential not found.");
  }

  const anchor = validateAnchorPayload(payload, auth);

  if (credential.issuerId !== auth.issuer?.id) {
    throw createHttpError(403, "Only the issuing issuer can record the Sepolia anchor for this credential.");
  }

  if (credential.credentialHash && payload?.credentialHash) {
    const nextHash = requireHexHash32(payload.credentialHash, "credential hash");

    if (nextHash !== credential.credentialHash) {
      throw createHttpError(400, "The submitted credential hash does not match this credential record.");
    }
  }

  credential.anchorStatus = "Anchored";
  credential.chainId = anchor.chainId;
  credential.network = anchor.network;
  credential.contractAddress = anchor.contractAddress;
  credential.txHash = anchor.txHash;
  credential.blockNumber = anchor.blockNumber;
  credential.anchoredAt = nowIso();
  credential.issuerWallet = anchor.issuerWallet;

  recordWorkspaceEvent(db, {
    organizationId: credential.organizationId,
    actorUserId: auth.user.id,
    credentialId: credential.id,
    type: "credential.anchored",
    details: {
      issuerId: credential.issuerId,
      issuerName: credential.issuedBy,
      issuerWallet: credential.issuerWallet,
      verificationCode: credential.verificationCode,
      credentialHash: credential.credentialHash,
      txHash: credential.txHash,
      contractAddress: credential.contractAddress,
      blockNumber: credential.blockNumber,
      network: credential.network,
    },
  });

  await writeDb(db);
  return credential;
}

export async function revokeCredential(auth, credentialId, reason, anchorPayload = null) {
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

  if (anchorPayload) {
    const anchor = validateAnchorPayload(anchorPayload, auth);
    credential.anchorStatus = "RevokedOnChain";
    credential.chainId = anchor.chainId;
    credential.network = anchor.network;
    credential.contractAddress = anchor.contractAddress;
    credential.revokeTxHash = anchor.txHash;
    credential.revokeBlockNumber = anchor.blockNumber;
    credential.revokedOnChainAt = nowIso();
  } else {
    credential.anchorStatus = "RevokedOffChain";
  }

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
      issuerWallet: credential.issuerWallet,
      txHash: credential.revokeTxHash,
      anchorStatus: credential.anchorStatus,
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
