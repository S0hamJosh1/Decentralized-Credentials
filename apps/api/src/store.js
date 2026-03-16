import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_DB } from "./data/default-db.js";
import { getPrismaClient, getStorageMode } from "./lib/prisma.js";

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
    authProvider: normalizeText(user.authProvider, "password") || "password",
    googleSubject: normalizeText(user.googleSubject),
    avatarUrl: normalizeText(user.avatarUrl),
    emailVerifiedAt: normalizeText(user.emailVerifiedAt),
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
    updatedAt: normalizeText(membership.updatedAt),
  };
}

function normalizeInvitation(invitation = {}) {
  return {
    id: normalizeText(invitation.id),
    organizationId: normalizeText(invitation.organizationId),
    code: normalizeText(invitation.code),
    name: normalizeText(invitation.name),
    email: normalizeText(invitation.email).toLowerCase(),
    membershipRole: normalizeText(invitation.membershipRole, "Member") || "Member",
    issuerRole: normalizeText(invitation.issuerRole, "Issuer") || "Issuer",
    issuerStatus: normalizeText(invitation.issuerStatus, "Pending") || "Pending",
    invitedByUserId: normalizeText(invitation.invitedByUserId),
    status: normalizeText(invitation.status, "Pending") || "Pending",
    createdAt: normalizeText(invitation.createdAt),
    acceptedAt: normalizeText(invitation.acceptedAt),
    revokedAt: normalizeText(invitation.revokedAt),
    lastSentAt: normalizeText(invitation.lastSentAt),
  };
}

function normalizeSession(session = {}) {
  return {
    id: normalizeText(session.id),
    token: normalizeText(session.token),
    userId: normalizeText(session.userId),
    activeOrganizationId: normalizeText(session.activeOrganizationId),
    createdAt: normalizeText(session.createdAt),
    expiresAt: normalizeText(session.expiresAt),
  };
}

function normalizeTemplateField(field = {}) {
  return {
    id: normalizeText(field.id),
    key: normalizeText(field.key),
    label: normalizeText(field.label),
    type: normalizeText(field.type, "text") || "text",
    required: field.required === true,
    placeholder: normalizeText(field.placeholder),
    helpText: normalizeText(field.helpText),
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
    fields: normalizeList(template.fields, normalizeTemplateField),
    status: normalizeText(template.status, "Active") || "Active",
    createdAt: normalizeText(template.createdAt),
    updatedAt: normalizeText(template.updatedAt),
    archivedAt: normalizeText(template.archivedAt),
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
    updatedAt: normalizeText(issuer.updatedAt),
    approvedAt: normalizeText(issuer.approvedAt),
  };
}

function normalizeCredentialFieldValue(fieldValue = {}) {
  return {
    fieldId: normalizeText(fieldValue.fieldId),
    key: normalizeText(fieldValue.key),
    label: normalizeText(fieldValue.label),
    type: normalizeText(fieldValue.type, "text") || "text",
    value: normalizeText(fieldValue.value),
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
    fieldValues: normalizeList(credential.fieldValues, normalizeCredentialFieldValue),
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

function normalizePasswordResetToken(token = {}) {
  return {
    id: normalizeText(token.id),
    userId: normalizeText(token.userId),
    tokenHash: normalizeText(token.tokenHash),
    createdAt: normalizeText(token.createdAt),
    expiresAt: normalizeText(token.expiresAt),
    usedAt: normalizeText(token.usedAt),
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
    invitations: normalizeList(rawDb.invitations, normalizeInvitation),
    sessions: normalizeList(rawDb.sessions, normalizeSession),
    templates: normalizeList(rawDb.templates, normalizeTemplate),
    issuers: normalizeList(rawDb.issuers, normalizeIssuer),
    credentials: normalizeList(rawDb.credentials, normalizeCredential),
    credentialEvents: normalizeList(rawDb.credentialEvents, normalizeCredentialEvent),
    passwordResetTokens: normalizeList(rawDb.passwordResetTokens, normalizePasswordResetToken),
  };
}

function toDate(value) {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fromDate(value) {
  if (!value) {
    return "";
  }

  return value instanceof Date ? value.toISOString() : normalizeText(value);
}

async function readPrismaDb() {
  const prisma = getPrismaClient();

  const [
    organizations,
    users,
    memberships,
    invitations,
    sessions,
    templates,
    issuers,
    credentials,
    credentialEvents,
    passwordResetTokens,
  ] = await prisma.$transaction([
    prisma.organization.findMany(),
    prisma.user.findMany(),
    prisma.membership.findMany(),
    prisma.invitation.findMany(),
    prisma.session.findMany(),
    prisma.template.findMany({
      include: {
        fields: {
          orderBy: {
            fieldOrder: "asc",
          },
        },
      },
    }),
    prisma.issuer.findMany(),
    prisma.credential.findMany({
      include: {
        fieldValues: {
          orderBy: {
            fieldOrder: "asc",
          },
        },
      },
    }),
    prisma.credentialEvent.findMany(),
    prisma.passwordResetToken.findMany(),
  ]);

  return normalizeDb({
    organizations,
    users: users.map((user) => ({
      ...user,
      googleSubject: user.googleSubject || "",
      emailVerifiedAt: fromDate(user.emailVerifiedAt),
      createdAt: fromDate(user.createdAt),
    })),
    memberships: memberships.map((membership) => ({
      ...membership,
      createdAt: fromDate(membership.createdAt),
      updatedAt: fromDate(membership.updatedAt),
    })),
    invitations: invitations.map((invitation) => ({
      ...invitation,
      acceptedAt: fromDate(invitation.acceptedAt),
      revokedAt: fromDate(invitation.revokedAt),
      lastSentAt: fromDate(invitation.lastSentAt),
      createdAt: fromDate(invitation.createdAt),
    })),
    sessions: sessions.map((session) => ({
      ...session,
      createdAt: fromDate(session.createdAt),
      expiresAt: fromDate(session.expiresAt),
    })),
    templates: templates.map((template) => ({
      ...template,
      createdAt: fromDate(template.createdAt),
      updatedAt: fromDate(template.updatedAt),
      archivedAt: fromDate(template.archivedAt),
      fields: template.fields.map((field) => ({
        id: field.id,
        key: field.fieldKey,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder,
        helpText: field.helpText,
      })),
    })),
    issuers: issuers.map((issuer) => ({
      ...issuer,
      userId: issuer.userId || "",
      approvedAt: fromDate(issuer.approvedAt),
      createdAt: fromDate(issuer.createdAt),
      updatedAt: fromDate(issuer.updatedAt),
    })),
    credentials: credentials.map((credential) => ({
      ...credential,
      fieldValues: credential.fieldValues.map((fieldValue) => ({
        fieldId: fieldValue.fieldId,
        key: fieldValue.fieldKey,
        label: fieldValue.label,
        type: fieldValue.type,
        value: fieldValue.value,
      })),
    })),
    credentialEvents: credentialEvents.map((event) => ({
      ...event,
      credentialId: event.credentialId || "",
      actorUserId: event.actorUserId || "",
      createdAt: fromDate(event.createdAt),
    })),
    passwordResetTokens: passwordResetTokens.map((token) => ({
      ...token,
      createdAt: fromDate(token.createdAt),
      expiresAt: fromDate(token.expiresAt),
      usedAt: fromDate(token.usedAt),
    })),
  });
}

async function writePrismaDb(nextDb) {
  const prisma = getPrismaClient();
  const normalized = normalizeDb(nextDb);

  await prisma.$transaction(async (tx) => {
    await tx.credentialFieldValue.deleteMany();
    await tx.credentialEvent.deleteMany();
    await tx.credential.deleteMany();
    await tx.templateField.deleteMany();
    await tx.template.deleteMany();
    await tx.passwordResetToken.deleteMany();
    await tx.session.deleteMany();
    await tx.invitation.deleteMany();
    await tx.issuer.deleteMany();
    await tx.membership.deleteMany();
    await tx.organization.deleteMany();
    await tx.user.deleteMany();

    if (normalized.organizations.length > 0) {
      await tx.organization.createMany({
        data: normalized.organizations,
      });
    }

    if (normalized.users.length > 0) {
      await tx.user.createMany({
        data: normalized.users.map((user) => ({
          ...user,
          googleSubject: user.googleSubject || null,
          emailVerifiedAt: toDate(user.emailVerifiedAt),
          createdAt: toDate(user.createdAt) || new Date(),
        })),
      });
    }

    if (normalized.memberships.length > 0) {
      await tx.membership.createMany({
        data: normalized.memberships.map((membership) => ({
          ...membership,
          createdAt: toDate(membership.createdAt) || new Date(),
          updatedAt: toDate(membership.updatedAt) || new Date(),
        })),
      });
    }

    if (normalized.invitations.length > 0) {
      await tx.invitation.createMany({
        data: normalized.invitations.map((invitation) => ({
          ...invitation,
          acceptedAt: toDate(invitation.acceptedAt),
          revokedAt: toDate(invitation.revokedAt),
          lastSentAt: toDate(invitation.lastSentAt),
          createdAt: toDate(invitation.createdAt) || new Date(),
        })),
      });
    }

    if (normalized.sessions.length > 0) {
      await tx.session.createMany({
        data: normalized.sessions.map((session) => ({
          ...session,
          createdAt: toDate(session.createdAt) || new Date(),
          expiresAt: toDate(session.expiresAt) || new Date(),
        })),
      });
    }

    if (normalized.templates.length > 0) {
      await tx.template.createMany({
        data: normalized.templates.map((template) => ({
          id: template.id,
          organizationId: template.organizationId,
          name: template.name,
          category: template.category,
          validity: template.validity,
          summary: template.summary,
          status: template.status,
          createdAt: toDate(template.createdAt) || new Date(),
          updatedAt: toDate(template.updatedAt) || new Date(),
          archivedAt: toDate(template.archivedAt),
        })),
      });

      const templateFields = normalized.templates.flatMap((template) =>
        (template.fields || []).map((field, index) => ({
          id: field.id,
          templateId: template.id,
          fieldKey: field.key,
          label: field.label,
          type: field.type,
          required: field.required === true,
          placeholder: field.placeholder,
          helpText: field.helpText,
          fieldOrder: index,
        }))
      );

      if (templateFields.length > 0) {
        await tx.templateField.createMany({
          data: templateFields,
        });
      }
    }

    if (normalized.issuers.length > 0) {
      await tx.issuer.createMany({
        data: normalized.issuers.map((issuer) => ({
          ...issuer,
          userId: issuer.userId || null,
          approvedAt: toDate(issuer.approvedAt),
          createdAt: toDate(issuer.createdAt) || new Date(),
          updatedAt: toDate(issuer.updatedAt) || new Date(),
        })),
      });
    }

    if (normalized.credentials.length > 0) {
      await tx.credential.createMany({
        data: normalized.credentials.map((credential) => ({
          id: credential.id,
          organizationId: credential.organizationId,
          verificationCode: credential.verificationCode,
          verificationUrl: credential.verificationUrl,
          recipientName: credential.recipientName,
          recipientEmail: credential.recipientEmail,
          recipientWallet: credential.recipientWallet,
          templateId: credential.templateId,
          templateName: credential.templateName,
          issuerId: credential.issuerId,
          issuedBy: credential.issuedBy,
          issuedAt: credential.issuedAt,
          status: credential.status,
          cohort: credential.cohort,
          summary: credential.summary,
          revokedAt: credential.revokedAt,
          revocationReason: credential.revocationReason,
        })),
      });

      const fieldValues = normalized.credentials.flatMap((credential) =>
        (credential.fieldValues || []).map((fieldValue, index) => ({
          id: `${credential.id}:${fieldValue.fieldId || fieldValue.key || index}`,
          credentialId: credential.id,
          fieldId: fieldValue.fieldId,
          fieldKey: fieldValue.key,
          label: fieldValue.label,
          type: fieldValue.type,
          value: fieldValue.value,
          fieldOrder: index,
        }))
      );

      if (fieldValues.length > 0) {
        await tx.credentialFieldValue.createMany({
          data: fieldValues,
        });
      }
    }

    if (normalized.credentialEvents.length > 0) {
      await tx.credentialEvent.createMany({
        data: normalized.credentialEvents.map((event) => ({
          id: event.id,
          credentialId: event.credentialId || null,
          organizationId: event.organizationId,
          actorUserId: event.actorUserId || null,
          type: event.type,
          createdAt: toDate(event.createdAt) || new Date(),
          details: event.details,
        })),
      });
    }

    if (normalized.passwordResetTokens.length > 0) {
      await tx.passwordResetToken.createMany({
        data: normalized.passwordResetTokens.map((token) => ({
          ...token,
          createdAt: toDate(token.createdAt) || new Date(),
          expiresAt: toDate(token.expiresAt) || new Date(),
          usedAt: toDate(token.usedAt),
        })),
      });
    }
  });

  return normalized;
}

export async function ensureDb() {
  if (getStorageMode() === "database") {
    return;
  }

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
  if (getStorageMode() === "database") {
    return readPrismaDb();
  }

  const dbPath = getDbPath();
  await ensureDb();
  const raw = await readFile(dbPath, "utf8");
  return normalizeDb(JSON.parse(raw));
}

export async function writeDb(nextDb) {
  if (getStorageMode() === "database") {
    return writePrismaDb(nextDb);
  }

  const dbPath = getDbPath();
  await ensureDb();
  const normalized = normalizeDb(nextDb);
  await writeFile(dbPath, `${JSON.stringify(normalized, null, 2)}\n`);
  return normalized;
}

export { DEFAULT_DB };
