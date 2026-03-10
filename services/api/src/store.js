import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.resolve(__dirname, "../data");
const DEFAULT_DB_PATH = path.join(DEFAULT_DATA_DIR, "db.json");

export const DEFAULT_ORGANIZATION = {
  id: "ORG-1001",
  name: "Northstar Skills Institute",
  slug: "northstar-skills",
  sector: "Workforce training",
  website: "https://northstarskills.example",
  verificationDomain: "http://localhost:5173",
  status: "Active",
  description:
    "Northstar Skills Institute issues workforce certificates for internships, compliance training, and employer-sponsored learning cohorts.",
};

export const DEFAULT_DB = {
  organization: DEFAULT_ORGANIZATION,
  templates: [
    {
      id: "TPL-101",
      organizationId: DEFAULT_ORGANIZATION.id,
      name: "Internship Completion",
      category: "Career programs",
      validity: "Permanent",
      summary: "Confirms successful completion of a structured internship program.",
    },
    {
      id: "TPL-202",
      organizationId: DEFAULT_ORGANIZATION.id,
      name: "Compliance Training",
      category: "Workforce readiness",
      validity: "12 months",
      summary: "Used for internal policy, workplace safety, and onboarding requirements.",
    },
    {
      id: "TPL-303",
      organizationId: DEFAULT_ORGANIZATION.id,
      name: "Bootcamp Certificate",
      category: "Education",
      validity: "Permanent",
      summary: "Recognizes completion of a short-form training cohort with measurable outcomes.",
    }
  ],
  issuers: [
    {
      id: "ISS-1",
      organizationId: DEFAULT_ORGANIZATION.id,
      name: "Soham Joshua",
      role: "Platform owner",
      wallet: "0xA91C7E2f57D6B2dC3F43A700dA0D53f4814bA901",
      status: "Approved",
    },
    {
      id: "ISS-2",
      organizationId: DEFAULT_ORGANIZATION.id,
      name: "Mina Patel",
      role: "Program manager",
      wallet: "0x8fC920dA902D642F0D21871E9a085BBAFe132410",
      status: "Approved",
    },
    {
      id: "ISS-3",
      organizationId: DEFAULT_ORGANIZATION.id,
      name: "Aaron Brooks",
      role: "Operations",
      wallet: "0x4B4Ff3E6d4Ca51c5179cD4c4471A12d3357B9810",
      status: "Pending",
    }
  ],
  credentials: [
    {
      id: "CRD-1001",
      organizationId: DEFAULT_ORGANIZATION.id,
      verificationCode: "NST-INT-1001",
      verificationUrl: "/verify/NST-INT-1001",
      recipientName: "Jade Carter",
      recipientEmail: "jade.carter@example.com",
      recipientWallet: "0x19a9A706d8dF67e7030AEf7A6e5Da5c4b4D79F10",
      templateId: "TPL-101",
      templateName: "Internship Completion",
      issuerId: "ISS-2",
      issuedBy: "Mina Patel",
      issuedAt: "2026-03-02",
      status: "Valid",
      cohort: "Winter 2026",
      summary: "Completed the Business Operations Internship Program.",
      revokedAt: "",
      revocationReason: "",
    },
    {
      id: "CRD-1002",
      organizationId: DEFAULT_ORGANIZATION.id,
      verificationCode: "NST-CMP-1002",
      verificationUrl: "/verify/NST-CMP-1002",
      recipientName: "Daniel Kim",
      recipientEmail: "daniel.kim@example.com",
      recipientWallet: "0x2B8b2666a441F064e65E31a19A739dF21A4E1E62",
      templateId: "TPL-202",
      templateName: "Compliance Training",
      issuerId: "ISS-1",
      issuedBy: "Soham Joshua",
      issuedAt: "2026-02-20",
      status: "Valid",
      cohort: "Spring onboarding",
      summary: "Met annual compliance training requirements.",
      revokedAt: "",
      revocationReason: "",
    },
    {
      id: "CRD-1003",
      organizationId: DEFAULT_ORGANIZATION.id,
      verificationCode: "NST-BC-1003",
      verificationUrl: "/verify/NST-BC-1003",
      recipientName: "Lena Ortiz",
      recipientEmail: "lena.ortiz@example.com",
      recipientWallet: "0x0fD8637Aa9F9E76Cffdb1A1739Ad1f111ce9D3a3",
      templateId: "TPL-303",
      templateName: "Bootcamp Certificate",
      issuerId: "ISS-2",
      issuedBy: "Mina Patel",
      issuedAt: "2026-01-14",
      status: "Revoked",
      cohort: "Product Foundations",
      summary: "Bootcamp certificate revoked after duplicate issuance was corrected.",
      revokedAt: "2026-01-16",
      revocationReason: "Revoked after a corrected duplicate certificate was issued.",
    }
  ]
};

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
