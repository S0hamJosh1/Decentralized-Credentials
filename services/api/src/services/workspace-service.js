import { readDb, writeDb } from "../store.js";
import { requireFields, sanitizeText } from "../lib/validation.js";

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function sanitizeSetupPayload(payload = {}) {
  const companyName = sanitizeText(payload.companyName);

  return {
    companyName,
    companySlug: sanitizeText(payload.companySlug) || slugify(companyName),
    website: sanitizeText(payload.website),
    sector: sanitizeText(payload.sector) || "Credential issuing",
    verificationDomain: sanitizeText(payload.verificationDomain),
    description: sanitizeText(payload.description),
    fullName: sanitizeText(payload.fullName),
    workEmail: sanitizeText(payload.workEmail),
    role: sanitizeText(payload.role) || "Issuer admin",
  };
}

export async function setupWorkspace(payload) {
  const db = await readDb();
  const input = sanitizeSetupPayload(payload);

  requireFields(
    input,
    ["companyName", "companySlug", "verificationDomain", "fullName", "workEmail", "role"],
    "workspace setup fields"
  );

  const organization = {
    ...db.organization,
    name: input.companyName,
    slug: input.companySlug,
    sector: input.sector,
    website: input.website || `https://${input.companySlug}.example`,
    verificationDomain: input.verificationDomain,
    status: "Active",
    description: input.description || `${input.companyName} issues digital credentials through Credential Foundry.`,
  };

  const issuer = {
    id: "ISS-1",
    organizationId: organization.id,
    name: input.fullName,
    role: input.role,
    email: input.workEmail,
    wallet: input.workEmail,
    status: "Approved",
  };

  const nextDb = {
    organization,
    templates: [],
    issuers: [issuer],
    credentials: [],
  };

  const savedDb = await writeDb(nextDb);

  return {
    ...savedDb,
    issuer: savedDb.issuers[0] || null,
  };
}
