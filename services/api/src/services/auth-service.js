import { createHttpError } from "../lib/http.js";
import { verifyGoogleIdToken } from "../lib/google-auth.js";
import { SESSION_TTL_MS, createPasswordHash, createSessionToken, verifyPassword } from "../lib/auth.js";
import { ensureUnique, requireFields, sanitizeText } from "../lib/validation.js";
import { readDb, writeDb } from "../store.js";

function nextId(prefix, list, start = 1) {
  const numericValues = list
    .map((item) => Number(String(item.id || "").replace(/^[A-Z-]+/, "")))
    .filter((value) => Number.isFinite(value));

  const nextNumber = Math.max(start, ...numericValues) + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function futureIso(durationMs) {
  return new Date(Date.now() + durationMs).toISOString();
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function sanitizeEmail(value) {
  return sanitizeText(value).toLowerCase();
}

function sanitizeRegisterPayload(payload = {}) {
  const companyName = sanitizeText(payload.companyName);

  return {
    fullName: sanitizeText(payload.fullName),
    workEmail: sanitizeEmail(payload.workEmail),
    password: sanitizeText(payload.password),
    companyName,
    companySlug: sanitizeText(payload.companySlug) || slugify(companyName),
    website: sanitizeText(payload.website),
    sector: sanitizeText(payload.sector) || "Credential issuing",
    verificationDomain: sanitizeText(payload.verificationDomain),
    role: sanitizeText(payload.role) || "Issuer admin",
  };
}

function sanitizeLoginPayload(payload = {}) {
  return {
    workEmail: sanitizeEmail(payload.workEmail),
    password: sanitizeText(payload.password),
  };
}

function sanitizeGooglePayload(payload = {}) {
  const companyName = sanitizeText(payload.companyName);

  return {
    credential: sanitizeText(payload.credential),
    companyName,
    companySlug: sanitizeText(payload.companySlug) || slugify(companyName),
    website: sanitizeText(payload.website),
    sector: sanitizeText(payload.sector) || "Credential issuing",
    verificationDomain: sanitizeText(payload.verificationDomain),
    role: sanitizeText(payload.role) || "Issuer admin",
  };
}

function removeExpiredSessions(db) {
  const now = Date.now();
  const nextSessions = db.sessions.filter((session) => {
    const expiresAt = Date.parse(session.expiresAt);
    return Number.isFinite(expiresAt) ? expiresAt > now : false;
  });

  const changed = nextSessions.length !== db.sessions.length;
  db.sessions = nextSessions;
  return changed;
}

function buildSessionPayload(db, session) {
  const user = db.users.find((item) => item.id === session.userId);

  if (!user) {
    throw createHttpError(401, "Your session is no longer valid. Please sign in again.");
  }

  const membership = db.memberships.find(
    (item) => item.userId === user.id && item.status === "Active"
  );

  if (!membership) {
    throw createHttpError(403, "This account is not linked to a workspace.");
  }

  const organization = db.organizations.find((item) => item.id === membership.organizationId);

  if (!organization) {
    throw createHttpError(404, "Workspace not found.");
  }

  const issuer = db.issuers.find(
    (item) =>
      item.organizationId === organization.id
      && (item.userId === user.id || item.email === user.email)
  ) || null;

  return {
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      authProvider: user.authProvider || "password",
      avatarUrl: user.avatarUrl || "",
    },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      verificationDomain: organization.verificationDomain,
    },
    membership: {
      id: membership.id,
      role: membership.role,
      status: membership.status,
    },
    issuer: issuer
      ? {
          id: issuer.id,
          role: issuer.role,
          status: issuer.status,
        }
      : null,
    session: {
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    },
  };
}

async function createSessionForUser(db, userId) {
  const session = {
    id: nextId("SES-", db.sessions),
    token: createSessionToken(),
    userId,
    createdAt: nowIso(),
    expiresAt: futureIso(SESSION_TTL_MS),
  };

  db.sessions.unshift(session);
  const savedDb = await writeDb(db);

  return {
    sessionToken: session.token,
    session: buildSessionPayload(savedDb, session),
  };
}

function mergeAuthProvider(currentValue, provider) {
  const providers = Array.from(
    new Set(
      String(currentValue || "")
        .split("+")
        .map((value) => sanitizeText(value))
        .filter(Boolean)
        .concat(provider)
    )
  );

  return providers.join("+");
}

function applyGoogleProfile(user, profile) {
  user.googleSubject = profile.subject;
  user.fullName = user.fullName || profile.fullName || user.email;
  user.authProvider = mergeAuthProvider(user.authProvider, "google");
  user.avatarUrl = profile.picture || user.avatarUrl || "";
  user.emailVerifiedAt = nowIso();
}

export async function registerAccount(payload) {
  const db = await readDb();
  removeExpiredSessions(db);

  const input = sanitizeRegisterPayload(payload);

  requireFields(
    input,
    ["fullName", "workEmail", "password", "companyName", "companySlug", "verificationDomain", "role"],
    "registration fields"
  );

  if (input.password.length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters.");
  }

  ensureUnique(
    db.users,
    (user) => user.email === input.workEmail,
    "An account with that email already exists."
  );

  ensureUnique(
    db.organizations,
    (organization) => organization.slug === input.companySlug,
    "A workspace with that company slug already exists."
  );

  const createdAt = nowIso();
  const organization = {
    id: nextId("ORG-", db.organizations, 1000),
    name: input.companyName,
    slug: input.companySlug,
    sector: input.sector,
    website: input.website || `https://${input.companySlug}.example`,
    verificationDomain: input.verificationDomain,
    status: "Active",
    description: `${input.companyName} issues digital credentials through Credential Foundry.`,
  };

  const user = {
    id: nextId("USR-", db.users),
    fullName: input.fullName,
    email: input.workEmail,
    passwordHash: createPasswordHash(input.password),
    authProvider: "password",
    googleSubject: "",
    avatarUrl: "",
    emailVerifiedAt: "",
    createdAt,
  };

  const membership = {
    id: nextId("MBR-", db.memberships),
    userId: user.id,
    organizationId: organization.id,
    role: "Owner",
    status: "Active",
    createdAt,
  };

  const issuer = {
    id: nextId("ISS-", db.issuers),
    organizationId: organization.id,
    userId: user.id,
    name: input.fullName,
    role: input.role,
    email: input.workEmail,
    wallet: "",
    status: "Approved",
    createdAt,
  };

  db.organizations.unshift(organization);
  db.users.unshift(user);
  db.memberships.unshift(membership);
  db.issuers.unshift(issuer);

  return createSessionForUser(db, user.id);
}

export async function loginAccount(payload) {
  const db = await readDb();
  removeExpiredSessions(db);

  const input = sanitizeLoginPayload(payload);
  requireFields(input, ["workEmail", "password"], "login fields");

  const user = db.users.find((item) => item.email === input.workEmail);

  if (!user) {
    throw createHttpError(401, "Invalid email or password.");
  }

  if (!user.passwordHash) {
    throw createHttpError(400, "This workspace account uses Google sign-in. Continue with Google to access it.");
  }

  if (!verifyPassword(input.password, user.passwordHash)) {
    throw createHttpError(401, "Invalid email or password.");
  }

  return createSessionForUser(db, user.id);
}

export async function registerGoogleAccount(payload) {
  const db = await readDb();
  removeExpiredSessions(db);

  const input = sanitizeGooglePayload(payload);
  requireFields(
    input,
    ["credential", "companyName", "companySlug", "verificationDomain", "role"],
    "Google workspace registration fields"
  );

  const googleProfile = await verifyGoogleIdToken(input.credential);

  ensureUnique(
    db.users,
    (user) => user.googleSubject === googleProfile.subject || user.email === googleProfile.email,
    "A workspace account with that Google identity already exists."
  );

  ensureUnique(
    db.organizations,
    (organization) => organization.slug === input.companySlug,
    "A workspace with that company slug already exists."
  );

  const createdAt = nowIso();
  const organization = {
    id: nextId("ORG-", db.organizations, 1000),
    name: input.companyName,
    slug: input.companySlug,
    sector: input.sector,
    website: input.website || `https://${input.companySlug}.example`,
    verificationDomain: input.verificationDomain,
    status: "Active",
    description: `${input.companyName} issues digital credentials through Credential Foundry.`,
  };

  const user = {
    id: nextId("USR-", db.users),
    fullName: googleProfile.fullName,
    email: googleProfile.email,
    passwordHash: "",
    authProvider: "google",
    googleSubject: googleProfile.subject,
    avatarUrl: googleProfile.picture,
    emailVerifiedAt: createdAt,
    createdAt,
  };

  const membership = {
    id: nextId("MBR-", db.memberships),
    userId: user.id,
    organizationId: organization.id,
    role: "Owner",
    status: "Active",
    createdAt,
  };

  const issuer = {
    id: nextId("ISS-", db.issuers),
    organizationId: organization.id,
    userId: user.id,
    name: user.fullName,
    role: input.role,
    email: user.email,
    wallet: "",
    status: "Approved",
    createdAt,
  };

  db.organizations.unshift(organization);
  db.users.unshift(user);
  db.memberships.unshift(membership);
  db.issuers.unshift(issuer);

  return createSessionForUser(db, user.id);
}

export async function loginGoogleAccount(payload) {
  const db = await readDb();
  removeExpiredSessions(db);

  const input = sanitizeGooglePayload(payload);
  requireFields(input, ["credential"], "Google sign-in fields");

  const googleProfile = await verifyGoogleIdToken(input.credential);
  const user =
    db.users.find((item) => item.googleSubject === googleProfile.subject)
    || db.users.find((item) => item.email === googleProfile.email);

  if (!user) {
    throw createHttpError(404, "No workspace account is linked to this Google account yet. Create a workspace first.");
  }

  applyGoogleProfile(user, googleProfile);

  return createSessionForUser(db, user.id);
}

export async function getSessionPayload(token) {
  if (!token) {
    throw createHttpError(401, "Please sign in to access the workspace.");
  }

  const db = await readDb();
  const changed = removeExpiredSessions(db);
  const session = db.sessions.find((item) => item.token === token);

  if (!session) {
    if (changed) {
      await writeDb(db);
    }

    throw createHttpError(401, "Please sign in to access the workspace.");
  }

  if (changed) {
    await writeDb(db);
  }

  return buildSessionPayload(db, session);
}

export async function revokeSession(token) {
  if (!token) {
    return;
  }

  const db = await readDb();
  const nextSessions = db.sessions.filter((session) => session.token !== token);

  if (nextSessions.length !== db.sessions.length) {
    db.sessions = nextSessions;
    await writeDb(db);
  }
}
