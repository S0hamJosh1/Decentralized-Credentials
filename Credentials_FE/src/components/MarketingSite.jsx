import React from "react";

const howSteps = [
  {
    title: "Set your issuing identity",
    body: "Create an organization profile, approve issuer wallets, and define certificate templates.",
  },
  {
    title: "Issue structured certificates",
    body: "Staff issue recipient records from the issuer app with consistent templates and tracking.",
  },
  {
    title: "Verify with one link",
    body: "Recipients share a stable verification URL. Third parties instantly confirm issuer identity and status.",
  },
];

const useCases = [
  {
    label: "Bootcamps & academies",
    text: "Completion, specialization, and cohort credentials with a clean public proof experience.",
  },
  {
    label: "Internship programs",
    text: "Give hiring teams a verification path that proves the issuer and prevents fake claims.",
  },
  {
    label: "Compliance training",
    text: "Track readiness and keep revocations visible when requirements lapse or records change.",
  },
];

export default function MarketingSite({
  organization,
  stats,
  apiMode,
  sampleCredential,
  sampleVerificationUrl,
  onLaunchApp,
  onOpenVerifier,
}) {
  return (
    <div className="site-shell min-h-screen text-stone-100">
      <div className="site-orb site-orb-left" />
      <div className="site-orb site-orb-right" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 md:px-8 md:py-8">
        {/* ---- Header ---- */}
        <header className="site-nav">
          <div>
            <p className="site-brand">Credential Foundry</p>
            <p className="site-brand-subtitle">Business-issued digital certificates</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="neo-badge">
              <span className={`inline-block h-2 w-2 rounded-full ${apiMode === "ready" ? "bg-emerald-400" : "bg-amber-400"}`} />
              {apiMode === "ready" ? "Live" : "Offline"}
            </span>
            <button type="button" className="site-ghost" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
              Verify
            </button>
            <button type="button" className="site-button" onClick={onLaunchApp}>
              Launch App
            </button>
          </div>
        </header>

        <main className="flex-1">
          {/* ---- Hero ---- */}
          <section className="site-hero">
            <div className="site-hero-copy">
              <p className="site-kicker">Business credential infrastructure</p>
              <h1 className="site-title">Issue digital certificates people can trust in seconds.</h1>
              <p className="site-lede">
                {organization.name} uses Credential Foundry to issue, verify, and manage digital credentials through a single workspace.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="button" className="site-button" onClick={onLaunchApp}>Launch app</button>
                <button type="button" className="site-ghost" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
                  Verify a credential
                </button>
              </div>

              <div className="site-stat-row">
                <div className="site-stat">
                  <span className="site-stat-value">{stats.issuerCount}</span>
                  <span className="site-stat-label">Approved issuers</span>
                </div>
                <div className="site-stat">
                  <span className="site-stat-value">{stats.templateCount}</span>
                  <span className="site-stat-label">Certificate templates</span>
                </div>
                <div className="site-stat">
                  <span className="site-stat-value">{stats.credentialCount}</span>
                  <span className="site-stat-label">Credentials issued</span>
                </div>
              </div>
            </div>

            <div className="site-panel site-panel-hero">
              <p className="site-panel-label">How it works</p>
              <div className="site-mini-grid" style={{ gridTemplateColumns: "1fr" }}>
                {howSteps.map((step, i) => (
                  <div key={step.title}>
                    <strong>
                      <span className="site-step-number" style={{ width: "1.6rem", height: "1.6rem", fontSize: "0.72rem", marginRight: "0.5rem" }}>
                        {i + 1}
                      </span>
                      {step.title}
                    </strong>
                    <p style={{ marginTop: "0.25rem" }}>{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ---- Use Cases ---- */}
          <section className="site-section">
            <div className="site-section-head">
              <p className="site-kicker">Who it's for</p>
              <h2>Start narrow, solve a real verification problem, then expand.</h2>
            </div>
            <div className="site-grid site-grid-cards">
              {useCases.map((item) => (
                <article key={item.label} className="site-card">
                  <h3>{item.label}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ---- CTA ---- */}
          <section className="site-cta">
            <div>
              <h2>Ready to start issuing?</h2>
              <p>One workspace for templates, issuers, credentials, and verification links.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="site-button" onClick={onLaunchApp}>Launch app</button>
              <button type="button" className="site-ghost" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
                Try the verifier
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
