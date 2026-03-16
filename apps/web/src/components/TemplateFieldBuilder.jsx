import React from "react";
import { buildTemplateFieldDraft, TEMPLATE_FIELD_TYPE_OPTIONS } from "../lib/template-fields";

export default function TemplateFieldBuilder({ fields, onChange }) {
  const addField = () => {
    onChange([...(fields || []), buildTemplateFieldDraft((fields || []).length + 1)]);
  };

  const updateField = (fieldId, updates) => {
    onChange((fields || []).map((field) => (field.id === fieldId ? { ...field, ...updates } : field)));
  };

  const removeField = (fieldId) => {
    onChange((fields || []).filter((field) => field.id !== fieldId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="neo-label">Credential fields</p>
          <p className="mt-1 text-sm text-zinc-500">Define the data this template should collect when a credential is issued.</p>
        </div>
        <button type="button" className="site-ghost text-sm" onClick={addField}>
          Add field
        </button>
      </div>

      {(fields || []).length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-400">
          This template has no custom fields yet. Add fields like program name, completion date, grade, or license number.
        </div>
      ) : (
        <div className="space-y-4">
          {(fields || []).map((field, index) => (
            <article key={field.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-100">Field {index + 1}</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{field.key || "key generated from label"}</p>
                </div>
                <button type="button" className="site-ghost text-sm" onClick={() => removeField(field.id)}>
                  Remove
                </button>
              </div>

              <div className="dashboard-form-grid">
                <label className="field-block">
                  <span className="neo-label">Label</span>
                  <input
                    className="neo-input mt-2"
                    value={field.label}
                    onChange={(event) => updateField(field.id, { label: event.target.value })}
                    placeholder="Program name"
                  />
                </label>

                <label className="field-block">
                  <span className="neo-label">Type</span>
                  <select
                    className="neo-select mt-2"
                    value={field.type}
                    onChange={(event) => updateField(field.id, { type: event.target.value })}
                  >
                    {TEMPLATE_FIELD_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-block">
                  <span className="neo-label">Placeholder</span>
                  <input
                    className="neo-input mt-2"
                    value={field.placeholder}
                    onChange={(event) => updateField(field.id, { placeholder: event.target.value })}
                    placeholder="Advanced Safety Bootcamp"
                  />
                </label>

                <label className="field-block">
                  <span className="neo-label">Help text</span>
                  <input
                    className="neo-input mt-2"
                    value={field.helpText}
                    onChange={(event) => updateField(field.id, { helpText: event.target.value })}
                    placeholder="Shown to issuers while they fill in the credential."
                  />
                </label>
              </div>

              <label className="mt-4 flex items-center gap-3 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={field.required === true}
                  onChange={(event) => updateField(field.id, { required: event.target.checked })}
                />
                Required during issuance
              </label>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
