import { createHttpError } from "../lib/http.js";
import { requireWorkspaceManager } from "../lib/permissions.js";
import { normalizeTemplateFields } from "../lib/template-fields.js";
import { ensureUnique, requireFields, sanitizeText } from "../lib/validation.js";
import { readDb, writeDb } from "../store.js";
import { recordWorkspaceEvent } from "./activity-service.js";

function nextId(prefix, list, start = 1) {
  const numericValues = list
    .map((item) => Number(String(item.id || "").replace(/^[A-Z-]+/, "")))
    .filter((value) => Number.isFinite(value));

  const nextNumber = Math.max(start, ...numericValues) + 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function sanitizeTemplate(payload = {}) {
  return {
    name: sanitizeText(payload.name),
    category: sanitizeText(payload.category),
    validity: sanitizeText(payload.validity),
    summary: sanitizeText(payload.summary),
    fields: normalizeTemplateFields(payload.fields || []),
    status: sanitizeText(payload.status) || "Active",
  };
}

function nowIso() {
  return new Date().toISOString();
}

export async function listTemplates(auth) {
  const db = await readDb();
  return db.templates.filter((template) => template.organizationId === auth.organization.id);
}

export async function createTemplate(auth, payload) {
  requireWorkspaceManager(auth, "Only workspace owners or admins can create templates.");

  const db = await readDb();
  const templateInput = sanitizeTemplate(payload);

  requireFields(templateInput, ["name", "category", "validity", "summary"], "template fields");
  ensureUnique(
    db.templates,
    (template) =>
      template.organizationId === auth.organization.id
      && template.name.toLowerCase() === templateInput.name.toLowerCase(),
    "A template with that name already exists for this organization."
  );

  const template = {
    id: nextId("TPL-", db.templates, 100),
    organizationId: auth.organization.id,
    status: "Active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archivedAt: "",
    ...templateInput,
  };

  db.templates.unshift(template);
  recordWorkspaceEvent(db, {
    organizationId: auth.organization.id,
    actorUserId: auth.user.id,
    type: "template.created",
    details: {
      templateId: template.id,
      templateName: template.name,
      templateStatus: template.status,
      templateFieldCount: template.fields.length,
    },
  });

  await writeDb(db);
  return template;
}

export async function updateTemplate(auth, templateId, payload) {
  requireWorkspaceManager(auth, "Only workspace owners or admins can update templates.");

  const db = await readDb();
  const templateIndex = db.templates.findIndex(
    (template) => template.id === templateId && template.organizationId === auth.organization.id
  );

  if (templateIndex === -1) {
    throw createHttpError(404, "Template not found.");
  }

  const template = db.templates[templateIndex];
  const nextTemplate = sanitizeTemplate({
    ...template,
    ...payload,
  });

  requireFields(nextTemplate, ["name", "category", "validity", "summary", "status"], "template fields");

  ensureUnique(
    db.templates,
    (item) =>
      item.id !== template.id
      && item.organizationId === auth.organization.id
      && item.name.toLowerCase() === nextTemplate.name.toLowerCase(),
    "A template with that name already exists for this organization."
  );

  const archivedAt = nextTemplate.status === "Archived"
    ? template.archivedAt || nowIso()
    : "";

  db.templates[templateIndex] = {
    ...template,
    ...nextTemplate,
    updatedAt: nowIso(),
    archivedAt,
  };

  recordWorkspaceEvent(db, {
    organizationId: auth.organization.id,
    actorUserId: auth.user.id,
    type: "template.updated",
    details: {
      templateId: template.id,
      templateName: db.templates[templateIndex].name,
      templateStatus: db.templates[templateIndex].status,
      templateFieldCount: db.templates[templateIndex].fields.length,
    },
  });

  const savedDb = await writeDb(db);
  return savedDb.templates[templateIndex];
}
