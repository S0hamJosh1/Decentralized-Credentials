import { createHttpError } from "./http.js";
import { sanitizeText } from "./validation.js";

export const TEMPLATE_FIELD_TYPES = new Set([
  "text",
  "textarea",
  "number",
  "date",
  "email",
  "url",
]);

function slugifyFieldLabel(label) {
  return sanitizeText(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function normalizeTemplateFields(inputFields = []) {
  if (!Array.isArray(inputFields)) {
    throw createHttpError(400, "Template fields must be provided as an array.");
  }

  const normalized = inputFields.map((field, index) => {
    const label = sanitizeText(field?.label);
    const type = sanitizeText(field?.type) || "text";
    const key = sanitizeText(field?.key) || slugifyFieldLabel(label) || `field_${index + 1}`;

    if (!label) {
      throw createHttpError(400, "Each template field needs a label.");
    }

    if (!TEMPLATE_FIELD_TYPES.has(type)) {
      throw createHttpError(400, `Unsupported template field type: ${type}.`);
    }

    return {
      id: sanitizeText(field?.id) || `FLD-${String(index + 1).padStart(2, "0")}`,
      key,
      label,
      type,
      required: field?.required === true,
      placeholder: sanitizeText(field?.placeholder),
      helpText: sanitizeText(field?.helpText),
    };
  });

  const duplicateKey = normalized.find(
    (field, index) => normalized.findIndex((item) => item.key === field.key) !== index
  );

  if (duplicateKey) {
    throw createHttpError(400, `Template field keys must be unique. Duplicate key: ${duplicateKey.key}.`);
  }

  return normalized;
}

export function mapCredentialFieldValues(templateFields, inputValues = {}) {
  const source =
    typeof inputValues === "object" && inputValues !== null && !Array.isArray(inputValues)
      ? inputValues
      : {};

  return templateFields.map((field) => ({
    fieldId: field.id,
    key: field.key,
    label: field.label,
    type: field.type,
    value: sanitizeText(source[field.id] ?? source[field.key]),
  }));
}

export function validateCredentialFieldValues(templateFields, fieldValues) {
  const missingField = fieldValues.find(
    (fieldValue) =>
      templateFields.find((field) => field.id === fieldValue.fieldId)?.required
      && sanitizeText(fieldValue.value) === ""
  );

  if (missingField) {
    throw createHttpError(400, `Missing required credential field: ${missingField.label}.`);
  }
}
