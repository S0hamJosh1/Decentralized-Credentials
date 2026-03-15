import { createHttpError } from "../lib/http.js";
import { verifyGoogleIdToken } from "../lib/google-auth.js";
import { SESSION_TTL_MS, createPasswordHash, createSessionToken, verifyPassword } from "../lib/auth.js";
import {
  ensureUnique,
  requireEmailAddress,
  requireFields,
  requireHttpUrl,
  requireSlug,
  sanitizeText,
} from "../lib/validation.js";
import { readDb, writeDb } from "../store.js";
import { recordWorkspaceEvent } from "./activity-service.js";
import {
  buildWorkspaceEntries,
  ensureIssuerAccessForUser,
  ensureMembershipForUser,
  findIssuerForUserInOrganization,
  findOrganization,
  findPendingInvitationByCode,
  findUserByEmail,
  listUserMemberships,
  nextId,
  nowIso,
  resolveActiveMembership,
} from "./workspace-access-service.js";

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

function sanitizeInvitationPayload(payload = {}) {
  return {
    invitationCode: sanitizeText(payload.invitationCode),
    fullName: sanitizeText(payload.fullName),
    workEmail: sanitizeEmail(payload.workEmail),
    password: sanitizeText(payload.password),
  };
}

function sanitizeWorkspaceSwitchPayload(payload = {}) {
  return {
    organizationId: sanitizeText(payload.organizationId),
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

function buildSessionPayload(db, session) {
  const user = db.users.find((item) => item.id === session.userId);

  if (!user) {
    throw createHttpError(401, "Your session is no longer valid. Please sign in again.");
  }

  const membership = resolveActiveMembership(db, session);
  const organization = findOrganization(db, membership.organizationId);
  const issuer = findIssuerForUserInOrganization(db, organization.id, user);

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
    workspaces: buildWorkspaceEntries(db, user.id),
    session: {
      id: session.id,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      activeOrganizationId: organization.id,
    },
  };
}

async function createSessionForUser(db, userId, activeOrganizationId = "") {
  const memberships = listUserMemberships(db, userId);

  if (memberships.length === 0) {
    throw createHttpError(403, "This account is not linked to a workspace.");
  }

  const session = {
    id: nextId("SES-", db.sessions),
    token: createSessionToken(),
    userId,
    activeOrganizationId: activeOrganizationId || memberships[0].organizationId,
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

function createWorkspaceRecord(input, createdAt, db) {
  return {
    id: nextId("ORG-", db.organizations, 1000),
    name: input.companyName,
    slug: input.companySlug,
    sector: input.sector,
    website: input.website || `https://${input.companySlug}.example`,
    verificationDomain: input.verificationDomain,
    status: "Active",
    description: `${input.companyName} issues digital credentials through Credential Foundry.`,
  };
}

function createOwnerMembership(db, userId, organizationId, createdAt) {
  return {
    id: nextId("MBR-", db.memberships),
    userId,
    organizationId,
    role: "Owner",
    status: "Active",
    createdAt,
    updatedAt: createdAt,
  };
}

function createOwnerIssuer(db, organizationId, user, role, createdAt) {
  return {
    id: nextId("ISS-", db.issuers),
    organizationId,
    userId: user.id,
    name: user.fullName,
    role,
    email: user.email,
    wallet: "",
    status: "Approved",
    createdAt,
    updatedAt: createdAt,
    approvedAt: createdAt,
  };
}

function completeInvitationAcceptance(db, user, invitation) {
  const organization = findOrganization(db, invitation.organizationId);
  const membership = ensureMembershipForUser(db, {
    userId: user.id,
    organizationId: organization.id,
    role: invitation.membershipRole,
  });
  const issuer = ensureIssuerAccessForUser(db, {
    organizationId: organization.id,
    userId: user.id,
    name: user.fullName,
    email: user.email,
    role: invitation.issuerRole,
    status: invitation.issuerStatus,
  });

  invitation.status = "Accepted";
  invitation.acceptedAt = nowIso();
  invitation.revokedAt = "";

  recordWorkspaceEvent(db, {
    organizationId: organization.id,
    actorUserId: user.id,
    type: "invitation.accepted",
    details: {
      invitedEmail: invitation.email,
      invitedName: user.fullName,
      membershipRole: invitation.membershipRole,
      issuerRole: invitation.issuerRole,
    },
  });

  return {
    organization,
    membership,
    issuer,
  };
}

function ensureInvitationEmailMatches(invitation, email) {
  if (invitation.email !== sanitizeEmail(email)) {
    throw createHttpError(400, "That invitation belongs to a different email address.");
  }
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
  input.workEmail = requireEmailAddress(input.workEmail, "work email");
  input.companySlug = requireSlug(input.companySlug, "company slug");
  input.verificationDomain = requireHttpUrl(input.verificationDomain, "verification domain");
  if (input.website) {
    input.website = requireHttpUrl(input.website, "website URL");
  }

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
  const organization = createWorkspaceRecord(input, createdAt, db);

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

  db.organizations.unshift(organization);
  db.users.unshift(user);
  db.memberships.unshift(createOwnerMembership(db, user.id, organization.id, createdAt));
  db.issuers.unshift(createOwnerIssuer(db, organization.id, user, input.role, createdAt));

  return createSessionForUser(db, user.id, organization.id);
}

export async function loginAccount(payload) {
  const db = await readDb();
  removeExpiredSessions(db);

  const input = sanitizeLoginPayload(payload);
  requireFields(input, ["workEmail", "password"], "login fields");
  input.workEmail = requireEmailAddress(input.workEmail, "work email");

  const user = findUserByEmail(db, input.workEmail);

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
  input.companySlug = requireSlug(input.companySlug, "company slug");
  input.verificationDomain = requireHttpUrl(input.verificationDomain, "verification domain");
  if (input.website) {
    input.website = requireHttpUrl(input.website, "website URL");
  }

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
  const organization = createWorkspaceRecord(input, createdAt, db);

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

  db.organizations.unshift(organization);
  db.users.unshift(user);
  db.memberships.unshift(createOwnerMembership(db, user.id, organization.id, createdAt));
  db.issuers.unshift(createOwnerIssuer(db, organization.id, user, input.role, createdAt));

  return createSessionForUser(db, user.id, organization.id);
}

export async function loginGoogleAccount(payload) {
  const db = await readDb();
  removeExpiredSessions(db);

  const input = sanitizeGooglePayload(payload);
  requireFields(input, ["credential"], "Google sign-in fields");

  const googleProfile = await verifyGoogleIdToken(input.credential);
  const user =
    db.users.find((item) => item.googleSubject === googleProfile.subject)
    || findUserByEmail(db, googleProfile.email);

  if (!user) {
    throw createHttpError(404, "No workspace account is linked to this Google account yet. Create a workspace first.");
  }

  applyGoogleProfile(user, googleProfile);

  return createSessionForUser(db, user.id);
}

export async function acceptInvitationWithPassword(payload) {
  const db = await readDb();
  removeExpiredSessions(db);

  const input = sanitizeInvitationPayload(payload);
  requireFields(input, ["invitationCode", "workEmail"], "invitation acceptance fields");
  input.workEmail = requireEmailAddress(input.workEmail, "work email");

  const invitation = findPendingInvitationByCode(db, input.invitationCode);
  ensureInvitationEmailMatches(invitation, input.workEmail);

  let user = findUserByEmail(db, input.workEmail);

  if (user) {
    if (!input.password) {
      throw createHttpError(400, "Enter your password to join this workspace.");
    }

    if (!user.passwordHash) {
      throw createHttpError(400, "This account uses Google sign-in. Continue with Google to accept the invitation.");
    }

    if (!verifyPassword(input.password, user.passwordHash)) {
      throw createHttpError(401, "Invalid email or password.");
    }
  } else {
    requireFields(input, ["fullName", "password"], "new teammate account fields");

    if (input.password.length < 8) {
      throw createHttpError(400, "Password must be at least 8 characters.");
    }

    user = {
      id: nextId("USR-", db.users),
      fullName: input.fullName,
      email: input.workEmail,
      passwordHash: createPasswordHash(input.password),
      authProvider: "password",
      googleSubject: "",
      avatarUrl: "",
      emailVerifiedAt: "",
      createdAt: nowIso(),
    };

    db.users.unshift(user);
  }

  completeInvitationAcceptance(db, user, invitation);
  return createSessionForUser(db, user.id, invitation.organizationId);
}

export async function acceptInvitationWithGoogle(payload) {
  const db = await readDb();
  removeExpiredSessions(db);

  const input = {
    invitationCode: sanitizeText(payload.invitationCode),
    credential: sanitizeText(payload.credential),
  };

  requireFields(input, ["invitationCode", "credential"], "Google invitation acceptance fields");

  const invitation = findPendingInvitationByCode(db, input.invitationCode);
  const googleProfile = await verifyGoogleIdToken(input.credential);
  ensureInvitationEmailMatches(invitation, googleProfile.email);

  let user =
    db.users.find((item) => item.googleSubject === googleProfile.subject)
    || findUserByEmail(db, googleProfile.email);

  if (user) {
    applyGoogleProfile(user, googleProfile);
  } else {
    user = {
      id: nextId("USR-", db.users),
      fullName: googleProfile.fullName,
      email: googleProfile.email,
      passwordHash: "",
      authProvider: "google",
      googleSubject: googleProfile.subject,
      avatarUrl: googleProfile.picture,
      emailVerifiedAt: nowIso(),
      createdAt: nowIso(),
    };

    db.users.unshift(user);
  }

  completeInvitationAcceptance(db, user, invitation);
  return createSessionForUser(db, user.id, invitation.organizationId);
}

export async function getSessionPayload(token) {
  if (!token) {
    throw createHttpError(401, "Please sign in to access the workspace.");
  }

  const db = await readDb();
  let changed = removeExpiredSessions(db);
  const session = db.sessions.find((item) => item.token === token);

  if (!session) {
    if (changed) {
      await writeDb(db);
    }

    throw createHttpError(401, "Please sign in to access the workspace.");
  }

  const payload = buildSessionPayload(db, session);

  if (session.activeOrganizationId !== payload.organization.id) {
    session.activeOrganizationId = payload.organization.id;
    changed = true;
  }

  if (changed) {
    await writeDb(db);
  }

  return payload;
}

export async function switchWorkspace(token, payload) {
  const input = sanitizeWorkspaceSwitchPayload(payload);
  requireFields(input, ["organizationId"], "workspace switch fields");

  const db = await readDb();
  removeExpiredSessions(db);
  const session = db.sessions.find((item) => item.token === token);

  if (!session) {
    throw createHttpError(401, "Please sign in to access the workspace.");
  }

  const membership = db.memberships.find(
    (item) =>
      item.userId === session.userId
      && item.organizationId === input.organizationId
      && item.status === "Active"
  );

  if (!membership) {
    throw createHttpError(403, "You do not have access to that workspace.");
  }

  session.activeOrganizationId = input.organizationId;
  const savedDb = await writeDb(db);
  const savedSession = savedDb.sessions.find((item) => item.id === session.id) || session;
  return buildSessionPayload(savedDb, savedSession);
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
