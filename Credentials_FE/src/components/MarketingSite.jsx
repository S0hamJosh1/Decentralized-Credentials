import React from "react";

const steps = [
  {
    title: "Approve organizations",
    body: "Your platform approves which businesses can issue credentials, so trust starts before any certificate is created.",
  },
  {
    title: "Issue structured certificates",
    body: "Authorized teams use templates and recipient details instead of ad hoc text strings and manual PDF workflows.",
  },
  {
    title: "Verify with one link",
    body: "Recipients and third parties can validate status, issuer identity, and issue details from a public verification page.",
  },
];

const audiences = [
  {
    label: "Training businesses",
    text: "Issue completion certificates without relying on PDFs and manual email confirmation.",
  },
  {
    label: "Employers",
    text: "Prove internship, compliance, and internal learning achievements with clear issuer identity.",
  },
  {
    label: "Certification programs",
    text: "Give recipients a clean verification experience that protects your brand from fake claims.",
  },
];

const trustPoints = [
  "Approved issuer wallets control who can issue.",
  "Credential status can be exposed publicly without giving verifiers full contract access.",
  "Revocations remain visible instead of being hidden in email threads.",
  "The product website explains the value before users ever touch the app.",
];

export default function MarketingSite({ organization, stats, sampleCredential, onLaunchApp, onOpenVerifier }) {
  return (
    <div className="site-shell min-h-screen text-stone-100">
      <div className="site-orb site-orb-left" />
      <div className="site-orb site-orb-right" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 md:px-8 md:py-8">
        <header className="site-nav">
          <div>
            <p className="site-brand">Credential Foundry</p>
            <p className="site-brand-subtitle">Business-issued digital certificates</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a href="#how-it-works" className="site-ghost">
              How it works
            </a>
            <a href="#trust" className="site-ghost">
              Why it works
            </a>
            <button type="button" className="site-ghost" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
              Verify a credential
            </button>
            <button type="button" className="site-button" onClick={onLaunchApp}>
              Launch app
            </button>
          </div>
        </header>

        <main className="flex-1">
          <section className="site-hero">
            <div className="site-hero-copy">
              <p className="site-kicker">Business credential infrastructure</p>
              <h1 className="site-title">Issue digital certificates people can actually trust.</h1>
              <p className="site-lede">
                {organization.name} is the sample issuer in this build. The product now separates the public story,
                issuer workflow, and public verification path so the value is easy to understand.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="button" className="site-button" onClick={onLaunchApp}>
                  Open issuer app
                </button>
                <button type="button" className="site-ghost" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
                  Try verification demo
                </button>
              </div>

              <div className="site-stat-row">
                <div className="site-stat">
                  <span className="site-stat-value">{stats.issuerCount}</span>
                  <span className="site-stat-label">Approved issuers in the current organization</span>
                </div>
                <div className="site-stat">
                  <span className="site-stat-value">{stats.templateCount}</span>
                  <span className="site-stat-label">Certificate templates available to issue</span>
                </div>
                <div className="site-stat">
                  <span className="site-stat-value">{stats.credentialCount}</span>
                  <span className="site-stat-label">Sample issued credentials already modeled in-app</span>
                </div>
              </div>
            </div>

            <div className="site-panel site-panel-hero">
              <p className="site-panel-label">Product promise</p>
              <h2>Give every certificate a clear issuer, visible status, and public verification path.</h2>
              <p>
                The app handles operations for approved issuer wallets. The website handles explanation, positioning,
                and trust for everyone else.
              </p>

              <div className="site-mini-grid">
                <div>
                  <strong>For businesses</strong>
                  <p>Issue branded credentials and protect credibility.</p>
                </div>
                <div>
                  <strong>For recipients</strong>
                  <p>Share a proof link instead of forwarding PDFs and email screenshots.</p>
                </div>
                <div>
                  <strong>For verifiers</strong>
                  <p>Confirm authenticity instantly with issuer identity attached.</p>
                </div>
                <div>
                  <strong>For the product</strong>
                  <p>Separate marketing language from operational tooling.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="how-it-works" className="site-section">
            <div className="site-section-head">
              <p className="site-kicker">How it works</p>
              <h2>A business-friendly flow built on controlled issuance.</h2>
              <p>The biggest upgrade is clarity. Each part of the product now has a single purpose that is easy to explain.</p>
            </div>

            <div className="site-grid site-grid-steps">
              {steps.map((step, index) => (
                <article key={step.title} className="site-step">
                  <span className="site-step-number">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="site-section">
            <div className="site-section-head">
              <p className="site-kicker">Who it serves</p>
              <h2>Start narrow, solve a real verification problem, then expand.</h2>
              <p>The first version is optimized for training businesses, employers, and certification programs.</p>
            </div>

            <div className="site-grid site-grid-cards">
              {audiences.map((audience) => (
                <article key={audience.label} className="site-card">
                  <p className="site-card-label">Use case</p>
                  <h3>{audience.label}</h3>
                  <p>{audience.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="trust" className="site-section">
            <div className="site-section-head">
              <p className="site-kicker">Why it works</p>
              <h2>The trust model becomes understandable.</h2>
              <p>
                The core idea is simple: approved organizations issue credentials, recipients share proof, and verifiers
                see status plus issuer identity without learning any blockchain jargon.
              </p>
            </div>

            <div className="site-grid site-grid-trust">
              <div className="site-panel">
                <p className="site-panel-label">Trust chain</p>
                <ol className="site-sequence">
                  <li>Platform approves an organization.</li>
                  <li>The organization controls authorized issuer wallets.</li>
                  <li>Issuer teams create credentials for recipients.</li>
                  <li>Recipients share a public proof link.</li>
                  <li>Verifiers see issuer identity and status immediately.</li>
                </ol>
              </div>

              <div className="site-panel">
                <p className="site-panel-label">What changes from the prototype</p>
                <ul className="site-bullet-list">
                  {trustPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="site-cta">
            <div>
              <p className="site-kicker">Demo-ready product shell</p>
              <h2>We can keep building the real platform without throwing away the working registry prototype.</h2>
              <p>
                The current build now includes a public site, issuer workspace, templates, issuer governance,
                credential records, and a public verifier flow.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="site-button" onClick={onLaunchApp}>
                Launch issuer app
              </button>
              <button type="button" className="site-ghost" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
                Open verifier demo
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
