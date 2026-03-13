import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DB, DEFAULT_ORGANIZATION } from "./data/default-db.js";

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

function normalizeOrganization(organization = {}) {
  return {
    ...DEFAULT_ORGANIZATION,
    ...organization,
  };
}

export function normalizeDb(rawDb = {}) {
  const organization = normalizeOrganization(rawDb.organization);
  const organizationId = organization.id;

  const templates = (rawDb.templates || DEFAULT_DB.templates).map((template) => ({
    ...template,
    organizationId: template.organizationId || organizationId,
  }));

  const issuers = (rawDb.issuers || DEFAULT_DB.issuers).map((issuer) => ({
    ...issuer,
    organizationId: issuer.organizationId || organizationId,
  }));

  const credentials = (rawDb.credentials || DEFAULT_DB.credentials).map((credential) => {
    const status = credential.status || "Valid";
    const revokedAt =
      status === "Revoked" ? credential.revokedAt || credential.issuedAt || "" : credential.revokedAt || "";
    const revocationReason =
      status === "Revoked"
        ? credential.revocationReason || "Revoked by an authorized issuer."
        : credential.revocationReason || "";

    return {
      ...credential,
      organizationId: credential.organizationId || organizationId,
      verificationUrl: credential.verificationUrl || buildVerificationUrl(credential.verificationCode),
      revokedAt,
      revocationReason,
    };
  });

  return {
    organization,
    templates,
    issuers,
    credentials,
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

export { DEFAULT_DB, DEFAULT_ORGANIZATION };
