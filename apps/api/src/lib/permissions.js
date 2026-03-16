import { createHttpError } from "./http.js";

const WORKSPACE_MANAGER_ROLES = new Set(["Owner", "Admin"]);

export function isWorkspaceManager(auth) {
  return WORKSPACE_MANAGER_ROLES.has(auth?.membership?.role);
}

export function requireWorkspaceManager(
  auth,
  message = "Only workspace owners or admins can perform this action."
) {
  if (!isWorkspaceManager(auth)) {
    throw createHttpError(403, message);
  }
}

export function requireOwner(
  auth,
  message = "Only workspace owners can perform this action."
) {
  if (auth?.membership?.role !== "Owner") {
    throw createHttpError(403, message);
  }
}

export function requireApprovedIssuer(
  auth,
  message = "Only approved issuer accounts can perform this action."
) {
  if (!auth?.issuer?.id) {
    throw createHttpError(403, "Your account is not linked to an issuer profile in this workspace.");
  }

  if (auth.issuer.status !== "Approved") {
    throw createHttpError(403, message);
  }

  return auth.issuer;
}
