import { buildVerificationUrl, readDb, writeDb } from "../store.js";
import { requireFields, sanitizeText } from "../lib/validation.js";

function sanitizeOrganization(payload = {}) {
  return {
    name: sanitizeText(payload.name),
    slug: sanitizeText(payload.slug),
    sector: sanitizeText(payload.sector),
    website: sanitizeText(payload.website),
    verificationDomain: sanitizeText(payload.verificationDomain),
    status: sanitizeText(payload.status) || "Active",
    description: sanitizeText(payload.description),
  };
}

export async function getOrganization() {
  const db = await readDb();
  return db.organization;
}

export async function updateOrganization(payload) {
  const db = await readDb();
  const nextOrganization = sanitizeOrganization({
    ...db.organization,
    ...payload,
  });

  requireFields(
    nextOrganization,
    ["name", "slug", "sector", "website", "verificationDomain", "description"],
    "organization fields"
  );

  db.organization = {
    ...db.organization,
    ...nextOrganization,
  };

  db.credentials = db.credentials.map((credential) => ({
    ...credential,
    organizationId: db.organization.id,
    verificationUrl: credential.verificationUrl || buildVerificationUrl(credential.verificationCode),
  }));

  const savedDb = await writeDb(db);
  return savedDb.organization;
}
