import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DB } from "./data/default-db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.resolve(__dirname, "../data");
const DEFAULT_DB_PATH = path.join(DEFAULT_DATA_DIR, "db.json");

function getDbPath() {
  const configuredPath = process.env.CREDENTIAL_API_DB_PATH;
  return configuredPath ? path.resolve(configuredPath) : DEFAULT_DB_PATH;
}

function getDataDir() {
  return path.dirname(getDbPath());
}

export function buildVerificationUrl(verificationCode) {
  return `/verify/${encodeURIComponent(verificationCode)}`;
}

function normalizeText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeOrganization(organization = {}) {
  return {
    id: normalizeText(organization.id),
    name: normalizeText(organization.name),
    slug: normalizeText(organization.slug),
    sector: normalizeText(organization.sector),
    website: normalizeText(organization.website),
    verificationDomain: normalizeText(organization.verificationDomain),
    status: normalizeText(organization.status, "Active") || "Active",
    description: normalizeText(organization.description),
  };
}

function normalizeUser(user = {}) {
  return {
    id: normalizeText(user.id),
    fullName: normalizeText(user.fullName),
    email: normalizeText(user.email).toLowerCase(),
    passwordHash: normalizeText(user.passwordHash),
    createdAt: normalizeText(user.createdAt),
  };
}

function normalizeMembership(membership = {}) {
  return {
    id: normalizeText(membership.id),
    userId: normalizeText(membership.userId),
    organizationId: normalizeText(membership.organizationId),
    role: normalizeText(membership.role, "Member") || "Member",
    status: normalizeText(membership.status, "Active") || "Active",
    createdAt: normalizeText(membership.createdAt),
  };
}

function normalizeSession(session = {}) {
  return {
    id: normalizeText(session.id),
    token: normalizeText(session.token),
    userId: normalizeText(session.userId),
    createdAt: normalizeText(session.createdAt),
    expiresAt: normalizeText(session.expiresAt),
  };
}

function normalizeTemplate(template = {}) {
  return {
    id: normalizeText(template.id),
    organizationId: normalizeText(template.organizationId),
    name: normalizeText(template.name),
    category: normalizeText(template.category),
    validity: normalizeText(template.validity),
    summary: normalizeText(template.summary),
  };
}

function normalizeIssuer(issuer = {}) {
  return {
    id: normalizeText(issuer.id),
    organizationId: normalizeText(issuer.organizationId),
    userId: normalizeText(issuer.userId),
    name: normalizeText(issuer.name),
    role: normalizeText(issuer.role),
    email: normalizeText(issuer.email).toLowerCase(),
    wallet: normalizeText(issuer.wallet),
    status: normalizeText(issuer.status, "Pending") || "Pending",
    createdAt: normalizeText(issuer.createdAt),
  };
}

function normalizeCredential(credential = {}) {
  const status = normalizeText(credential.status, "Valid") || "Valid";
  const revokedAt =
    status === "Revoked"
      ? normalizeText(credential.revokedAt || credential.issuedAt)
      : normalizeText(credential.revokedAt);
  const revocationReason =
    status === "Revoked"
      ? normalizeText(credential.revocationReason, "Revoked by an authorized issuer.") || "Revoked by an authorized issuer."
      : normalizeText(credential.revocationReason);

  return {
    id: normalizeText(credential.id),
    organizationId: normalizeText(credential.organizationId),
    verificationCode: normalizeText(credential.verificationCode),
    verificationUrl: normalizeText(credential.verificationUrl) || buildVerificationUrl(normalizeText(credential.verificationCode)),
    recipientName: normalizeText(credential.recipientName),
    recipientEmail: normalizeText(credential.recipientEmail).toLowerCase(),
    recipientWallet: normalizeText(credential.recipientWallet),
    templateId: normalizeText(credential.templateId),
    templateName: normalizeText(credential.templateName),
    issuerId: normalizeText(credential.issuerId),
    issuedBy: normalizeText(credential.issuedBy),
    issuedAt: normalizeText(credential.issuedAt),
    status,
    cohort: normalizeText(credential.cohort),
    summary: normalizeText(credential.summary),
    revokedAt,
    revocationReason,
  };
}

function normalizeCredentialEvent(event = {}) {
  return {
    id: normalizeText(event.id),
    credentialId: normalizeText(event.credentialId),
    organizationId: normalizeText(event.organizationId),
    actorUserId: normalizeText(event.actorUserId),
    type: normalizeText(event.type),
    createdAt: normalizeText(event.createdAt),
    details: typeof event.details === "object" && event.details !== null ? event.details : {},
  };
}

function normalizeList(items, normalizer) {
  return Array.isArray(items) ? items.map(normalizer) : [];
}

export function normalizeDb(rawDb = {}) {
  return {
    organizations: normalizeList(rawDb.organizations, normalizeOrganization),
    users: normalizeList(rawDb.users, normalizeUser),
    memberships: normalizeList(rawDb.memberships, normalizeMembership),
    sessions: normalizeList(rawDb.sessions, normalizeSession),
    templates: normalizeList(rawDb.templates, normalizeTemplate),
    issuers: normalizeList(rawDb.issuers, normalizeIssuer),
    credentials: normalizeList(rawDb.credentials, normalizeCredential),
    credentialEvents: normalizeList(rawDb.credentialEvents, normalizeCredentialEvent),
  };
}

export async function ensureDb() {
  const dataDir = getDataDir();
  const dbPath = getDbPath();

  await mkdir(dataDir, { recursive: true });

  try {
    const raw = await readFile(dbPath, "utf8");
    const normalized = normalizeDb(JSON.parse(raw));
    if (raw !== `${JSON.stringify(normalized, null, 2)}\n`) {
      await writeFile(dbPath, `${JSON.stringify(normalized, null, 2)}\n`);
    }
  } catch {
    await writeFile(dbPath, `${JSON.stringify(DEFAULT_DB, null, 2)}\n`);
  }
}

export async function readDb() {
  const dbPath = getDbPath();
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  return normalizeDb(JSON.parse(raw));
}

export async function writeDb(nextDb) {
  const dbPath = getDbPath();
  await ensureDb();
  const normalized = normalizeDb(nextDb);
  await writeFile(dbPath, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export { DEFAULT_DB };
