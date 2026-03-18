import { createHash } from "node:crypto";

export const CREDENTIAL_PROOF_VERSION = "cf-sepolia-v1";

export function getInitialAnchorStatus(issuerWallet = "") {
  return issuerWallet ? "ReadyForAnchoring" : "AwaitingIssuerWallet";
}

function normalizeFieldValues(fieldValues = []) {
  return [...fieldValues]
    .map((fieldValue) => ({
      fieldId: fieldValue.fieldId || "",
      key: fieldValue.key || "",
      label: fieldValue.label || "",
      type: fieldValue.type || "text",
      value: fieldValue.value || "",
    }))
    .sort((left, right) => {
      const leftKey = `${left.fieldId}:${left.key}:${left.label}`;
      const rightKey = `${right.fieldId}:${right.key}:${right.label}`;
      return leftKey.localeCompare(rightKey);
    });
}

export function buildCredentialHashPayload(credential) {
  return {
    version: CREDENTIAL_PROOF_VERSION,
    organizationId: credential.organizationId || "",
    templateId: credential.templateId || "",
    templateName: credential.templateName || "",
    issuerId: credential.issuerId || "",
    issuedBy: credential.issuedBy || "",
    issuerWallet: credential.issuerWallet || "",
    credentialId: credential.id || "",
    verificationCode: credential.verificationCode || "",
    recipientName: credential.recipientName || "",
    recipientEmail: credential.recipientEmail || "",
    cohort: credential.cohort || "",
    summary: credential.summary || "",
    issuedAt: credential.issuedAt || "",
    fieldValues: normalizeFieldValues(credential.fieldValues || []),
  };
}

export function createCredentialHash(credential) {
  const payload = buildCredentialHashPayload(credential);
  return `0x${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
}

export function buildCredentialProof(credential) {
  const status = credential.anchorStatus || getInitialAnchorStatus(credential.issuerWallet);

  return {
    version: CREDENTIAL_PROOF_VERSION,
    status,
    hashAlgorithm: "sha256",
    credentialHash: credential.credentialHash || "",
    issuerWallet: credential.issuerWallet || "",
    chainId: credential.chainId || "",
    network: credential.network || "",
    contractAddress: credential.contractAddress || "",
    issueTxHash: credential.txHash || "",
    issueBlockNumber: credential.blockNumber || "",
    anchoredAt: credential.anchoredAt || "",
    revokeTxHash: credential.revokeTxHash || "",
    revokeBlockNumber: credential.revokeBlockNumber || "",
    revokedOnChainAt: credential.revokedOnChainAt || "",
    isAnchored: status === "Anchored" || status === "RevokedOnChain",
  };
}
