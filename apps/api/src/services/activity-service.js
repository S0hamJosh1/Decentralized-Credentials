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

function sortByCreatedAtDesc(items) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || 0);
    const rightTime = Date.parse(right.createdAt || 0);
    return rightTime - leftTime;
  });
}

function mapActivityEvent(db, event) {
  const actor = db.users.find((user) => user.id === event.actorUserId) || null;
  const credential = event.credentialId
    ? db.credentials.find((item) => item.id === event.credentialId) || null
    : null;
  const template = event.details.templateId
    ? db.templates.find((item) => item.id === event.details.templateId) || null
    : credential && credential.templateId
      ? db.templates.find((item) => item.id === credential.templateId) || null
      : null;
  const issuer = event.details.issuerId
    ? db.issuers.find((item) => item.id === event.details.issuerId) || null
    : credential && credential.issuerId
      ? db.issuers.find((item) => item.id === credential.issuerId) || null
      : null;

  return {
    id: event.id,
    type: event.type,
    createdAt: event.createdAt,
    actorName: actor?.fullName || "Workspace user",
    credentialId: credential?.id || event.credentialId || "",
    verificationCode: credential?.verificationCode || event.details.verificationCode || "",
    recipientName: credential?.recipientName || event.details.recipientName || "",
    templateId: template?.id || event.details.templateId || "",
    templateName: template?.name || event.details.templateName || "",
    templateStatus: template?.status || event.details.templateStatus || "",
    issuerId: issuer?.id || event.details.issuerId || "",
    issuerName: issuer?.name || event.details.issuerName || "",
    issuerStatus: issuer?.status || event.details.issuerStatus || "",
    organizationName: event.details.organizationName || "",
    reason: event.details.reason || "",
    invitedEmail: event.details.invitedEmail || "",
    invitedName: event.details.invitedName || "",
    details: event.details,
  };
}

export function recordWorkspaceEvent(db, input) {
  db.credentialEvents.unshift({
    id: nextId("EVT-", db.credentialEvents),
    credentialId: input.credentialId || "",
    organizationId: input.organizationId,
    actorUserId: input.actorUserId || "",
    type: input.type,
    createdAt: nowIso(),
    details: typeof input.details === "object" && input.details !== null ? input.details : {},
  });
}

export function buildActivityFeed(db, organizationId, limit = 12) {
  return sortByCreatedAtDesc(
    db.credentialEvents.filter((event) => event.organizationId === organizationId)
  )
    .slice(0, limit)
    .map((event) => mapActivityEvent(db, event));
}

export function buildCredentialTimeline(db, credentialId) {
  return sortByCreatedAtDesc(
    db.credentialEvents.filter((event) => event.credentialId === credentialId)
  ).map((event) => mapActivityEvent(db, event));
}
