import { createHttpError } from "../lib/http.js";
import { requireFields, sanitizeText } from "../lib/validation.js";
import { readDb, writeDb } from "../store.js";

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

function requireOrganization(db, organizationId) {
  const organizationIndex = db.organizations.findIndex((item) => item.id === organizationId);

  if (organizationIndex === -1) {
    throw createHttpError(404, "Workspace not found.");
  }

  return {
    organizationIndex,
    organization: db.organizations[organizationIndex],
  };
}

export async function getOrganization(auth) {
  const db = await readDb();
  return requireOrganization(db, auth.organization.id).organization;
}

export async function updateOrganization(auth, payload) {
  const db = await readDb();
  const { organizationIndex, organization } = requireOrganization(db, auth.organization.id);
  const nextOrganization = sanitizeOrganization({
    ...organization,
    ...payload,
  });

  requireFields(
    nextOrganization,
    ["name", "slug", "sector", "website", "verificationDomain", "description"],
    "organization fields"
  );

  db.organizations[organizationIndex] = {
    ...organization,
    ...nextOrganization,
  };

  const savedDb = await writeDb(db);
  return savedDb.organizations[organizationIndex];
}
