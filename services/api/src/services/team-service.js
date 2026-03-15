import { createHttpError } from "../lib/http.js";
import { requireOwner, requireWorkspaceManager } from "../lib/permissions.js";
import { ensureUnique, requireEmailAddress, requireFields, sanitizeText } from "../lib/validation.js";
import { readDb, writeDb } from "../store.js";
import { recordWorkspaceEvent } from "./activity-service.js";
import {
  buildInvitationPath,
  buildInvitationUrl,
  ensureIssuerAccessForUser,
  findOrganization,
  findPendingInvitationByCode,
  findUserByEmail,
  nextId,
  nowIso,
} from "./workspace-access-service.js";

function sanitizeInvitationPayload(payload = {}) {
  return {
    name: sanitizeText(payload.name),
    email: sanitizeText(payload.email).toLowerCase(),
    membershipRole: sanitizeText(payload.membershipRole) || "Member",
    issuerRole: sanitizeText(payload.issuerRole) || "Issuer",
    issuerStatus: sanitizeText(payload.issuerStatus) || "Pending",
  };
}

function requireTeamManager(auth) {
  requireWorkspaceManager(auth, "Only workspace owners or admins can manage team access.");
}

function buildInvitationRecord(db, organization, invitation) {
  const inviter = db.users.find((user) => user.id === invitation.invitedByUserId) || null;

  return {
    id: invitation.id,
    code: invitation.code,
    email: invitation.email,
    membershipRole: invitation.membershipRole,
    issuerRole: invitation.issuerRole,
    issuerStatus: invitation.issuerStatus,
    status: invitation.status,
    createdAt: invitation.createdAt,
    acceptedAt: invitation.acceptedAt,
    revokedAt: invitation.revokedAt,
    joinPath: buildInvitationPath(invitation.code),
    joinUrl: buildInvitationUrl(organization, invitation.code),
    invitedBy: inviter?.fullName || "Workspace owner",
  };
}

export function buildTeamSnapshot(db, organization) {
  const members = db.memberships
    .filter((membership) => membership.organizationId === organization.id && membership.status === "Active")
    .map((membership) => {
      const user = db.users.find((item) => item.id === membership.userId) || null;
      const issuer =
        db.issuers.find(
          (item) =>
            item.organizationId === organization.id
            && (item.userId === membership.userId || (user?.email && item.email === user.email))
        ) || null;

      return {
        id: membership.id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.createdAt,
        user: user
          ? {
              id: user.id,
              fullName: user.fullName,
              email: user.email,
              avatarUrl: user.avatarUrl,
            }
          : null,
        issuer: issuer
          ? {
              id: issuer.id,
              role: issuer.role,
              status: issuer.status,
            }
          : null,
      };
    })
    .sort((left, right) => (left.user?.fullName || "").localeCompare(right.user?.fullName || ""));

  const invitations = db.invitations
    .filter((invitation) => invitation.organizationId === organization.id && invitation.status === "Pending")
    .map((invitation) => buildInvitationRecord(db, organization, invitation))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));

  return {
    members,
    invitations,
  };
}

export async function listTeamAccess(auth) {
  const db = await readDb();
  const organization = findOrganization(db, auth.organization.id);
  return buildTeamSnapshot(db, organization);
}

export async function createInvitation(auth, payload) {
  requireTeamManager(auth);

  const db = await readDb();
  const organization = findOrganization(db, auth.organization.id);
  const invitationInput = sanitizeInvitationPayload(payload);

  requireFields(
    invitationInput,
    ["name", "email", "membershipRole", "issuerRole", "issuerStatus"],
    "team invitation fields"
  );
  invitationInput.email = requireEmailAddress(invitationInput.email, "teammate email");

  if (invitationInput.membershipRole === "Owner") {
    requireOwner(auth, "Only workspace owners can invite another owner.");
  }

  const existingUser = findUserByEmail(db, invitationInput.email);
  const existingMembership = existingUser
    ? db.memberships.find(
        (membership) =>
          membership.userId === existingUser.id
          && membership.organizationId === organization.id
          && membership.status === "Active"
      )
    : null;

  if (existingMembership) {
    throw createHttpError(409, "That teammate already has access to this workspace.");
  }

  ensureUnique(
    db.invitations,
    (invitation) =>
      invitation.organizationId === organization.id
      && invitation.status === "Pending"
      && invitation.email === invitationInput.email,
    "A pending invitation already exists for that teammate."
  );

  ensureIssuerAccessForUser(db, {
    organizationId: organization.id,
    userId: existingUser?.id || "",
    name: invitationInput.name,
    email: invitationInput.email,
    role: invitationInput.issuerRole,
    status: invitationInput.issuerStatus,
  });

  const invitation = {
    id: nextId("INV-", db.invitations, 1000),
    organizationId: organization.id,
    code: `${nextId("JOIN-", db.invitations, 1000)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    email: invitationInput.email,
    membershipRole: invitationInput.membershipRole,
    issuerRole: invitationInput.issuerRole,
    issuerStatus: invitationInput.issuerStatus,
    invitedByUserId: auth.user.id,
    status: "Pending",
    createdAt: nowIso(),
    acceptedAt: "",
    revokedAt: "",
  };

  db.invitations.unshift(invitation);
  recordWorkspaceEvent(db, {
    organizationId: organization.id,
    actorUserId: auth.user.id,
    type: "invitation.created",
    details: {
      invitedEmail: invitation.email,
      invitedName: invitationInput.name,
      membershipRole: invitation.membershipRole,
      issuerRole: invitation.issuerRole,
      invitationCode: invitation.code,
    },
  });

  const savedDb = await writeDb(db);
  const savedOrganization = savedDb.organizations.find((item) => item.id === organization.id);
  return buildInvitationRecord(savedDb, savedOrganization, invitation);
}

export async function getInvitationDetails(code) {
  const db = await readDb();
  const invitation = findPendingInvitationByCode(db, code);
  const organization = findOrganization(db, invitation.organizationId);

  return {
    invitation: buildInvitationRecord(db, organization, invitation),
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      sector: organization.sector,
    },
  };
}
