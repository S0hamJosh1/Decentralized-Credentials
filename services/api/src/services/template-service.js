import { readDb, writeDb } from "../store.js";
import { createHttpError } from "../lib/http.js";
import { ensureUnique, requireFields, sanitizeText } from "../lib/validation.js";

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
  };
}

export async function listTemplates() {
  const db = await readDb();
  return db.templates;
}

export async function createTemplate(payload) {
  const db = await readDb();
  const templateInput = sanitizeTemplate(payload);

  requireFields(templateInput, ["name", "category", "validity", "summary"], "template fields");
  ensureUnique(
    db.templates,
    (template) => template.organizationId === db.organization.id && template.name.toLowerCase() === templateInput.name.toLowerCase(),
    "A template with that name already exists for this organization."
  );

  const template = {
    id: nextId("TPL-", db.templates, 100),
    organizationId: db.organization.id,
    ...templateInput,
  };

  db.templates.unshift(template);
  await writeDb(db);
  return template;
}

export async function requireTemplate(templateId) {
  const db = await readDb();
  const template = db.templates.find((item) => item.id === templateId);

  if (!template) {
    throw createHttpError(404, "Template not found.");
  }

  return { db, template };
}
