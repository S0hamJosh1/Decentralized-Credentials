import { createHttpError } from "../lib/http.js";
import { sanitizeText } from "../lib/validation.js";

export function nextId(prefix, list, start = 1) {
  const numericValues = list
    .map((item) => Number(String(item.id || "").replace(/^[A-Z-]+/, "")))
    .filter((value) => Number.isFinite(value));

  const nextNumber = Math.max(start, ...numericValues) + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function buildInvitationPath(code) {
  return `/join/${encodeURIComponent(code)}`;
}

export function buildInvitationUrl(organization, code) {
  const base = sanitizeText(organization?.verificationDomain) || "http://localhost:5173";
  return new URL(buildInvitationPath(code), base).toString();
}

export function listUserMemberships(db, userId) {
  return db.memberships.filter((membership) => membership.userId === userId && membership.status === "Active");
}

export function findUserByEmail(db, email) {
  const normalizedEmail = sanitizeText(email).toLowerCase();
  return db.users.find((user) => user.email === normalizedEmail) || null;
}

export function findOrganization(db, organizationId) {
  const organization = db.organizations.find((item) => item.id === organizationId);

  if (!organization) {
    throw createHttpError(404, "Workspace not found.");
  }

  return organization;
}

export function findIssuerForUserInOrganization(db, organizationId, user) {
  if (!user) {
    return null;
  }

  return (
    db.issuers.find(
      (issuer) =>
        issuer.organizationId === organizationId
        && (issuer.userId === user.id || (user.email && issuer.email === user.email))
    ) || null
  );
}

export function buildWorkspaceEntry(db, membership) {
  const organization = db.organizations.find((item) => item.id === membership.organizationId);

  if (!organization) {
    return null;
  }

  const user = db.users.find((item) => item.id === membership.userId) || null;
  const issuer = findIssuerForUserInOrganization(db, organization.id, user);

  return {
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
          wallet: issuer.wallet || "",
          walletVerifiedAt: issuer.walletVerifiedAt || "",
        }
      : null,
  };
}

export function buildWorkspaceEntries(db, userId) {
  return listUserMemberships(db, userId)
    .map((membership) => buildWorkspaceEntry(db, membership))
    .filter(Boolean)
    .sort((left, right) => left.organization.name.localeCompare(right.organization.name));
}

export function resolveActiveMembership(db, session) {
  const memberships = listUserMemberships(db, session.userId);

  if (memberships.length === 0) {
    throw createHttpError(403, "This account is not linked to a workspace.");
  }

  return (
    memberships.find((membership) => membership.organizationId === session.activeOrganizationId)
    || memberships[0]
  );
}

export function findPendingInvitationByCode(db, code) {
  const normalizedCode = sanitizeText(code);

  if (!normalizedCode) {
    throw createHttpError(400, "Invitation code is required.");
  }

  const invitation = db.invitations.find(
    (item) => item.code === normalizedCode && item.status === "Pending"
  );

  if (!invitation) {
    throw createHttpError(404, "Invitation not found.");
  }

  return invitation;
}

export function ensureMembershipForUser(db, input) {
  const existingMembership = db.memberships.find(
    (membership) =>
      membership.userId === input.userId
      && membership.organizationId === input.organizationId
      && membership.status === "Active"
  );

  if (existingMembership) {
    return existingMembership;
  }

  const membership = {
    id: nextId("MBR-", db.memberships),
    userId: input.userId,
    organizationId: input.organizationId,
    role: input.role || "Member",
    status: "Active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.memberships.unshift(membership);
  return membership;
}

export function ensureIssuerAccessForUser(db, input) {
  const existingIssuer = db.issuers.find(
    (issuer) =>
      issuer.organizationId === input.organizationId
      && (issuer.userId === input.userId || issuer.email === input.email)
  );

  if (existingIssuer) {
    existingIssuer.userId = input.userId;
    existingIssuer.name = input.name || existingIssuer.name;
    existingIssuer.email = input.email || existingIssuer.email;
    existingIssuer.role = input.role || existingIssuer.role;
    existingIssuer.status = input.status || existingIssuer.status;
    existingIssuer.updatedAt = nowIso();
    existingIssuer.wallet = existingIssuer.wallet || "";
    existingIssuer.walletVerifiedAt = existingIssuer.walletVerifiedAt || "";
    existingIssuer.approvedAt =
      existingIssuer.status === "Approved"
        ? existingIssuer.approvedAt || nowIso()
        : "";
    return existingIssuer;
  }

  const issuer = {
    id: nextId("ISS-", db.issuers),
    organizationId: input.organizationId,
    userId: input.userId,
    name: input.name,
    role: input.role || "Issuer",
    email: input.email,
    wallet: "",
    walletVerifiedAt: "",
    status: input.status || "Pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    approvedAt: input.status === "Approved" ? nowIso() : "",
  };

  db.issuers.unshift(issuer);
  return issuer;
}
