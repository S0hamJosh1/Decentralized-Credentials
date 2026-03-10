import React from "react";
import { sitePathForPage } from "../lib/routes";

const navItems = [
  { id: "home", label: "Home" },
  { id: "how-it-works", label: "How It Works" },
  { id: "use-cases", label: "Use Cases" },
  { id: "trust", label: "Trust" },
];

const howSteps = [
  {
    title: "Set your issuing identity",
    body: "Create a clear organization profile, approve issuer wallets, and define the certificate templates your team can use.",
  },
  {
    title: "Issue structured certificates",
    body: "Staff issue recipient records from the issuer app instead of handcrafting PDFs or loose spreadsheet entries.",
  },
  {
    title: "Verify with one link",
    body: "Recipients share a stable verification URL and third parties instantly confirm issuer identity and current status.",
  },
];

const useCases = [
  {
    label: "Bootcamps and academies",
    text: "Show completion, specialization, and cohort credentials with a cleaner public proof experience.",
  },
  {
    label: "Internship programs",
    text: "Give hiring teams a verification path that proves the issuer and prevents fake completion claims.",
  },
  {
    label: "Compliance training",
    text: "Track internal readiness and keep revocations visible when requirements lapse or records change.",
  },
];

const trustPoints = [
  "Approved issuers control who can create records.",
  "The organization identity is shown alongside credential status.",
  "Verification does not require a wallet or product training.",
  "Legacy on-chain tools can remain as the technical proof layer without confusing business users.",
];

function SiteNavLink({ currentPage, id, label, onNavigatePage }) {
  const isActive = currentPage === id;

  return (
    <a
      href={sitePathForPage(id)}
      className={`site-ghost ${isActive ? "site-ghost-active" : ""}`}
      onClick={(event) => {
        event.preventDefault();
        onNavigatePage(id);
      }}
    >
      {label}
    </a>
  );
}

function renderHero(currentPage, organization, stats, sampleCredential, sampleVerificationUrl, onLaunchApp, onOpenVerifier) {
  if (currentPage === "how-it-works") {
    return (
      <section className="site-hero">
        <div className="site-hero-copy">
          <p className="site-kicker">Product workflow</p>
          <h1 className="site-title">Turn certificate issuance into a repeatable business flow.</h1>
          <p className="site-lede">
            The product now separates public education, verification, and issuer operations so each route has a clear job.
          </p>
        </div>
        <div className="site-panel site-panel-hero">
          <p className="site-panel-label">Three surfaces</p>
          <div className="site-mini-grid">
            <div>
              <strong>Public site</strong>
              <p>Explains the offer and points visitors toward the right action.</p>
            </div>
            <div>
              <strong>Verifier</strong>
              <p>Shows credential status, issuer identity, and revocation details with no wallet friction.</p>
            </div>
            <div>
              <strong>Issuer app</strong>
              <p>Manages templates, issuers, recipient records, and operational controls.</p>
            </div>
            <div>
              <strong>Legacy registry</strong>
              <p>Remains available as an advanced surface instead of driving the core story.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (currentPage === "use-cases") {
    return (
      <section className="site-hero">
        <div className="site-hero-copy">
          <p className="site-kicker">Best first audience</p>
          <h1 className="site-title">Built first for training teams and certificate issuers.</h1>
          <p className="site-lede">
            Start with simple, high-trust use cases: internships, bootcamps, compliance programs, and workforce training.
          </p>
        </div>
        <div className="site-panel site-panel-hero">
          <p className="site-panel-label">Current demo organization</p>
          <h2>{organization.name}</h2>
          <p>{organization.description}</p>
          <div className="site-mini-grid">
            <div>
              <strong>{stats.templateCount}</strong>
              <p>Templates ready for structured issuance.</p>
            </div>
            <div>
              <strong>{stats.issuerCount}</strong>
              <p>Approved issuer records already modeled.</p>
            </div>
            <div>
              <strong>{stats.credentialCount}</strong>
              <p>Credential records available for verification.</p>
            </div>
            <div>
              <strong>{organization.sector}</strong>
              <p>Vertical the current product story is optimized for.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (currentPage === "trust") {
    return (
      <section className="site-hero">
        <div className="site-hero-copy">
          <p className="site-kicker">Trust model</p>
          <h1 className="site-title">Make issuer identity obvious before anyone asks for proof.</h1>
          <p className="site-lede">
            The strongest product move is not more jargon. It is showing who issued the credential, when it was issued, and whether it is still valid.
          </p>
        </div>
        <div className="site-panel site-panel-hero">
          <p className="site-panel-label">Sample verification URL</p>
          <h2>{sampleCredential?.verificationCode}</h2>
          <p className="break-all">{sampleVerificationUrl}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className="site-button" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
              Open verifier
            </button>
            <button type="button" className="site-ghost" onClick={onLaunchApp}>
              Launch app
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="site-hero">
      <div className="site-hero-copy">
        <p className="site-kicker">Business credential infrastructure</p>
        <h1 className="site-title">Issue digital certificates people can trust in seconds.</h1>
        <p className="site-lede">
          {organization.name} is the sample issuer in this build. The product now separates the public story, issuer workflow, and public verification path so the value is easy to understand.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button type="button" className="site-button" onClick={onLaunchApp}>
            Launch app
          </button>
          <button type="button" className="site-ghost" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
            Verify a credential
          </button>
        </div>

        <div className="site-stat-row">
          <div className="site-stat">
            <span className="site-stat-value">{stats.issuerCount}</span>
            <span className="site-stat-label">Approved issuers already modeled in the workspace</span>
          </div>
          <div className="site-stat">
            <span className="site-stat-value">{stats.templateCount}</span>
            <span className="site-stat-label">Certificate templates available to issue</span>
          </div>
          <div className="site-stat">
            <span className="site-stat-value">{stats.credentialCount}</span>
            <span className="site-stat-label">Credential records ready for public verification</span>
          </div>
        </div>
      </div>

      <div className="site-panel site-panel-hero">
        <p className="site-panel-label">Product promise</p>
        <h2>Give every certificate a clear issuer, visible status, and a shareable proof link.</h2>
        <p>
          The app handles operations for approved issuer wallets. The website handles explanation, positioning, and trust for everyone else.
        </p>
        <div className="site-mini-grid">
          <div>
            <strong>For businesses</strong>
            <p>Issue branded credentials and protect credibility.</p>
          </div>
          <div>
            <strong>For recipients</strong>
            <p>Share one proof link instead of forwarding PDFs and screenshots.</p>
          </div>
          <div>
            <strong>For verifiers</strong>
            <p>Confirm authenticity instantly with issuer identity attached.</p>
          </div>
          <div>
            <strong>For the product</strong>
            <p>Keep blockchain complexity behind the scenes unless an advanced user needs it.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
function renderSections(currentPage) {
  if (currentPage === "how-it-works") {
    return (
      <section className="site-section">
        <div className="site-section-head">
          <p className="site-kicker">How it works</p>
          <h2>A simpler route from issuing to verification.</h2>
          <p>The product story is now built around business outcomes instead of raw contract methods.</p>
        </div>

        <div className="site-grid site-grid-steps">
          {howSteps.map((step, index) => (
            <article key={step.title} className="site-step">
              <span className="site-step-number">0{index + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (currentPage === "use-cases") {
    return (
      <section className="site-section">
        <div className="site-section-head">
          <p className="site-kicker">Use cases</p>
          <h2>Start narrow, prove value, then expand.</h2>
          <p>The first version is most compelling when it solves a verification problem for training-led programs.</p>
        </div>

        <div className="site-grid site-grid-cards">
          {useCases.map((item) => (
            <article key={item.label} className="site-card">
              <p className="site-card-label">Use case</p>
              <h3>{item.label}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (currentPage === "trust") {
    return (
      <section className="site-section">
        <div className="site-section-head">
          <p className="site-kicker">Why it works</p>
          <h2>The trust chain becomes understandable.</h2>
          <p>Verifiers do not need to understand smart contracts. They need issuer identity, current status, and a clean record of changes.</p>
        </div>

        <div className="site-grid site-grid-trust">
          <div className="site-panel">
            <p className="site-panel-label">Trust chain</p>
            <ol className="site-sequence">
              <li>The organization defines its issuing identity and templates.</li>
              <li>Approved issuer records control who can create credentials.</li>
              <li>Each credential gets a stable verification code and URL.</li>
              <li>Revocations remain visible with a reason instead of disappearing silently.</li>
            </ol>
          </div>

          <div className="site-panel">
            <p className="site-panel-label">What changed from the prototype</p>
            <ul className="site-bullet-list">
              {trustPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="site-section">
        <div className="site-section-head">
          <p className="site-kicker">How it works</p>
          <h2>A business-friendly flow built on controlled issuance.</h2>
          <p>Each part of the product now has a clear purpose that is easy to explain to buyers, recipients, and verifiers.</p>
        </div>

        <div className="site-grid site-grid-steps">
          {howSteps.map((step, index) => (
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
          <p>The first version is optimized for training businesses, internship programs, and compliance-led certificate issuers.</p>
        </div>

        <div className="site-grid site-grid-cards">
          {useCases.map((item) => (
            <article key={item.label} className="site-card">
              <p className="site-card-label">Use case</p>
              <h3>{item.label}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export default function MarketingSite({
  organization,
  stats,
  apiMode,
  currentPage,
  sampleCredential,
  sampleVerificationUrl,
  onNavigatePage,
  onLaunchApp,
  onOpenVerifier,
}) {
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

          <div className="site-nav-links">
            {navItems.map((item) => (
              <SiteNavLink
                key={item.id}
                currentPage={currentPage}
                id={item.id}
                label={item.label}
                onNavigatePage={onNavigatePage}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="neo-badge">{apiMode === "ready" ? "Live API" : apiMode === "offline" ? "Seeded fallback" : "Loading"}</span>
            <button type="button" className="site-ghost" onClick={() => onOpenVerifier(sampleCredential?.verificationCode)}>
              Verify
            </button>
            <button type="button" className="site-button" onClick={onLaunchApp}>
              Launch App
            </button>
          </div>
        </header>

        <main className="flex-1">
          {renderHero(currentPage, organization, stats, sampleCredential, sampleVerificationUrl, onLaunchApp, onOpenVerifier)}
          {renderSections(currentPage)}

          <section className="site-cta">
            <div>
              <p className="site-kicker">Demo-ready product shell</p>
              <h2>One website, one verifier, one issuer app, and a cleaner product story.</h2>
              <p>
                The current build now includes persistent organization settings, business-facing templates, verification links, and revocation details without splitting into multiple frontends.
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
