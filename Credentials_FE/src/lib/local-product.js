import { buildVerifyPath } from "./routes";

export function createLocalCredential(payload, organization, templates, issuers, credentials) {
  const template = templates.find((item) => item.id === payload.templateId);
  const issuer = issuers.find((item) => item.id === payload.issuerId) || issuers[0];
  const id = `CRD-${String(credentials.length + 1001).padStart(4, "0")}`;
  const numericId = id.replace("CRD-", "");
  const code = template?.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const verificationPath = buildVerifyPath(`NST-${code}-${numericId}`);

  return {
    id,
    organizationId: organization.id,
    verificationCode: verificationPath.replace("/verify/", ""),
    verificationUrl: verificationPath,
    recipientName: payload.recipientName,
    recipientEmail: payload.recipientEmail,
    recipientWallet: payload.recipientWallet,
    templateId: payload.templateId,
    templateName: template?.name || "Custom Certificate",
    issuerId: payload.issuerId,
    issuedBy: issuer?.name || "Authorized Issuer",
    issuedAt: new Date().toISOString().slice(0, 10),
    status: "Valid",
    cohort: payload.cohort,
    summary: payload.summary,
    revokedAt: "",
    revocationReason: "",
  };
}

export function createLocalTemplate(payload, organizationId, templates) {
  return {
    id: `TPL-${String(templates.length + 401).padStart(3, "0")}`,
    organizationId,
    ...payload,
  };
}

export function createLocalIssuer(payload, organizationId, issuers) {
  return {
    id: `ISS-${issuers.length + 10}`,
    organizationId,
    ...payload,
  };
}

export function setupLocalWorkspace(payload, organization) {
  const nextOrganization = {
    ...organization,
    name: payload.companyName,
    slug: payload.companySlug,
    sector: payload.sector || "Credential issuing",
    website: payload.website || `https://${payload.companySlug || "issuer-workspace"}.example`,
    verificationDomain: payload.verificationDomain,
    status: "Active",
    description:
      payload.description || `${payload.companyName} issues digital credentials through Credential Foundry.`,
  };

  const nextIssuer = {
    id: "ISS-1",
    organizationId: nextOrganization.id,
    name: payload.fullName,
    role: payload.role || "Issuer admin",
    email: payload.workEmail,
    wallet: payload.workEmail,
    status: "Approved",
  };

  return {
    organization: nextOrganization,
    templates: [],
    issuers: [nextIssuer],
    credentials: [],
    issuer: nextIssuer,
  };
}

export function revokeLocalCredential(credentials, credentialId, reason) {
  let revokedRecord = null;

  const nextCredentials = credentials.map((credential) => {
    if (credential.id !== credentialId) {
      return credential;
    }

    revokedRecord = {
      ...credential,
      status: "Revoked",
      revokedAt: new Date().toISOString().slice(0, 10),
      revocationReason: reason || "Revoked by an authorized issuer.",
    };

    return revokedRecord;
  });

  return { nextCredentials, revokedRecord };
}
