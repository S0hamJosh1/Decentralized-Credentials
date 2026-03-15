import React, { useMemo, useState } from "react";
import { initialOrganization } from "../data/productData";
import { slugifyCompanyName } from "../lib/issuer-session";

function buildDefaultForm(organization) {
  const isDemoWorkspace = organization.slug === initialOrganization.slug;

  return {
    fullName: "",
    workEmail: "",
    role: "Issuer admin",
    companyName: isDemoWorkspace ? "" : organization.name,
    website: isDemoWorkspace ? "" : organization.website,
    sector: isDemoWorkspace ? "" : organization.sector,
  };
}

const setupHighlights = [
  {
    title: "Sign in as the issuer owner",
    body: "Start with the person who should control templates, staff access, and the first credentials.",
  },
  {
    title: "Create a clean company workspace",
    body: "First launch provisions your company profile and starts with a clean issuer workspace.",
  },
  {
    title: "Move straight into operations",
    body: "After setup, the workspace opens on the actual issuer dashboard for templates, issuers, and credentials.",
  },
];

export default function IssuerAccessFlow({ organization, apiMode, onComplete }) {
  const isDemoWorkspace = organization.slug === initialOrganization.slug;
  const [form, setForm] = useState(() => buildDefaultForm(organization));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const companySlug = useMemo(() => slugifyCompanyName(form.companyName), [form.companyName]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await onComplete({
        ...form,
        companySlug,
      });
    } catch (submitError) {
      setBusy(false);
      setError(submitError.message || "Unable to enter the issuer app.");
    }
  };

  return (
    <div className="site-shell min-h-screen text-stone-100">
      <div className="site-orb site-orb-left" />
      <div className="site-orb site-orb-right" />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 md:px-8 md:py-8">
        <header className="site-nav">
          <div>
            <p className="site-brand">Credential Foundry</p>
            <p className="site-brand-subtitle">Company workspace</p>
          </div>
          <span className="neo-badge">
            <span className={`inline-block h-2 w-2 rounded-full ${apiMode === "ready" ? "bg-emerald-400" : "bg-amber-400"}`} />
            {apiMode === "ready" ? "Saving to API" : "Saving locally"}
          </span>
        </header>

        <main className="issuer-access-layout flex-1 py-8">
          <section className="site-panel issuer-access-copy">
            <p className="site-panel-label">{isDemoWorkspace ? "First issuer setup" : "Sign in to issuer app"}</p>
            <h1 className="issuer-access-title">
              {isDemoWorkspace ? "Set up your company before entering the issuer workspace." : `Continue into ${organization.name}.`}
            </h1>
            <p className="site-lede issuer-access-lede">
              {isDemoWorkspace
                ? "Create the real company workspace and sign in the initial admin so you can manage templates, issuers, credentials, and verification from one place."
                : "Use your work identity to enter the issuer workspace. You can adjust company details here before heading into templates, issuers, and credentials."}
            </p>

            <div className="site-mini-grid issuer-access-highlights">
              {setupHighlights.map((item, index) => (
                <div key={item.title}>
                  <strong>
                    <span className="site-step-number issuer-step-number">{index + 1}</span>
                    {item.title}
                  </strong>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="site-panel">
            <p className="site-panel-label">{isDemoWorkspace ? "Create workspace" : "Issuer sign in"}</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {isDemoWorkspace ? "Who should own this company workspace?" : "Confirm your issuer details"}
            </h2>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="dashboard-form-grid">
                <label className="field-block">
                  <span className="neo-label">Full name</span>
                  <input
                    className="neo-input mt-2"
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Jane Founder"
                  />
                </label>

                <label className="field-block">
                  <span className="neo-label">Work email</span>
                  <input
                    className="neo-input mt-2"
                    type="email"
                    value={form.workEmail}
                    onChange={(event) => setForm((current) => ({ ...current, workEmail: event.target.value }))}
                    placeholder="jane@company.com"
                  />
                </label>

                <label className="field-block">
                  <span className="neo-label">Company name</span>
                  <input
                    className="neo-input mt-2"
                    value={form.companyName}
                    onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
                    placeholder="Acme Training Group"
                  />
                </label>

                <label className="field-block">
                  <span className="neo-label">Your role</span>
                  <input
                    className="neo-input mt-2"
                    value={form.role}
                    onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                    placeholder="Issuer admin"
                  />
                </label>

                <label className="field-block">
                  <span className="neo-label">Website</span>
                  <input
                    className="neo-input mt-2"
                    value={form.website}
                    onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                    placeholder="https://acmetraining.com"
                  />
                </label>

                <label className="field-block">
                  <span className="neo-label">Sector</span>
                  <input
                    className="neo-input mt-2"
                    value={form.sector}
                    onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))}
                    placeholder="Workforce training"
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                <p className="m-0">
                  Company slug: <span className="text-zinc-50">{companySlug || "generated after you enter a company name"}</span>
                </p>
                <p className="mb-0 mt-2 text-zinc-500">
                  {isDemoWorkspace
                    ? "Submitting this provisions your company workspace with a clean starting state."
                    : "Your existing workspace data stays in place. We just update company details and make sure your issuer account exists."}
                </p>
              </div>

              {error ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {error}
                </div>
              ) : null}

              <button type="submit" className="site-button" disabled={busy}>
                {busy ? "Opening issuer app..." : "Enter issuer app"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
