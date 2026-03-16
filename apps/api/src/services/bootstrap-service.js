import { createHttpError } from "../lib/http.js";
import { readDb } from "../store.js";
import { buildActivityFeed } from "./activity-service.js";
import { buildTeamSnapshot } from "./team-service.js";

export async function getBootstrap(auth) {
  const db = await readDb();
  const organization = db.organizations.find((item) => item.id === auth.organization.id);

  if (!organization) {
    throw createHttpError(404, "Workspace not found.");
  }

  return {
    organization,
    templates: db.templates.filter((item) => item.organizationId === organization.id),
    issuers: db.issuers.filter((item) => item.organizationId === organization.id),
    credentials: db.credentials.filter((item) => item.organizationId === organization.id),
    activity: buildActivityFeed(db, organization.id),
    ...buildTeamSnapshot(db, organization),
  };
}
