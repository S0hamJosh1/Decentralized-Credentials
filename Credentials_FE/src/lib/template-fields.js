export const TEMPLATE_FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
];

function slugifyFieldLabel(label = "") {
  return String(label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function buildTemplateFieldDraft(index = 1) {
  return {
    id: `draft-${index}-${Math.random().toString(36).slice(2, 7)}`,
    label: "",
    key: "",
    type: "text",
    required: false,
    placeholder: "",
    helpText: "",
  };
}

export function prepareTemplateFields(fields = []) {
  return fields.map((field, index) => ({
    ...field,
    id: field.id || `FLD-${String(index + 1).padStart(2, "0")}`,
    key: field.key || slugifyFieldLabel(field.label) || `field_${index + 1}`,
  }));
}

export function createEmptyFieldValues(template) {
  return (template?.fields || []).reduce((values, field) => {
    values[field.id] = "";
    return values;
  }, {});
}

export function formatFieldValue(fieldValue) {
  if (!fieldValue?.value) {
    return "Not provided";
  }

  if (fieldValue.type === "date") {
    const parsed = new Date(`${fieldValue.value}T12:00:00`);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }

  return String(fieldValue.value);
}
