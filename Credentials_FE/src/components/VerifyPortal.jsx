import React, { useMemo } from "react";
import { resolveVerificationUrl } from "../lib/routes";

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function VerifyPortal({
  organization,
  credentials,
  selectedVerificationCode,
  onSelectVerificationCode,
  onVerifyCode,
  onBackToSite,
  onLaunchApp,
  apiMode,
  apiError,
}) {
  const normalizedCode = selectedVerificationCode.trim().toUpperCase();
  const record = useMemo(
    () => credentials.find((credential) => credential.verificationCode.toUpperCase() === normalizedCode),
    [credentials, normalizedCode]
  );

  return (
    <div className="site-shell min-h-screen text-stone-100">
      <div className="site-orb site-orb-left" />
      <div className="site-orb site-orb-right" />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 md:px-8 md:py-8">
        <header className="site-nav">
          <div>
            <p className="site-brand">Verification portal</p>
            <p className="site-brand-subtitle">Public credential lookup</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="neo-badge">{apiMode === "ready" ? "Live API" : apiMode === "offline" ? "Seeded fallback" : "Loading"}</span>
            <button type="button" className="site-ghost" onClick={onBackToSite}>Back to site</button>
            <button type="button" className="site-button" onClick={onLaunchApp}>Launch issuer app</button>
          </div>
        </header>

        <main className="flex-1 py-10">
          {apiError ? (
            <div className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {apiError}
            </div>
          ) : null}

          <section className="site-section pt-0">
            <div className="site-section-head max-w-3xl">
              <p className="site-kicker">Instant verification</p>
              <h2>Check whether a credential is valid and who issued it.</h2>
              <p>This view is public. No wallet connection is required because the verifier only needs clarity.</p>
            </div>

            <div className="site-grid site-grid-trust">
              <div className="site-panel">
                <p className="site-panel-label">Search by verification code</p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    className="neo-input"
                    value={selectedVerificationCode}
                    onChange={(event) => onSelectVerificationCode(event.target.value)}
                    placeholder="Example: NST-INT-1001"
                  />
                  <button
                    type="button"
                    className="site-button"
                    onClick={() => onVerifyCode(selectedVerificationCode)}
                  >
                    Verify code
                  </button>
                </div>
                <p className="mt-4 text-sm text-zinc-400">
                  Try a sample code: {credentials[0]?.verificationCode}, {credentials[1]?.verificationCode}
                </p>
              </div>

              <div className="site-panel">
                <p className="site-panel-label">What a verifier should learn</p>
                <ul className="site-bullet-list">
                  <li>Which issuer created the credential</li>
                  <li>Whether the credential is valid or revoked</li>
                  <li>When it was issued and which template it used</li>
                  <li>Who the credential belongs to and where it came from</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="site-section">
            {record ? (
              <div className="site-grid site-grid-trust">
                <article className="site-panel">
                  <p className="site-panel-label">Verification result</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className={`verification-pill ${record.status === "Valid" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                      {record.status}
                    </span>
                    <span className="neo-badge">Code: {record.verificationCode}</span>
                  </div>

                  <h3 className="mt-5 text-3xl font-semibold text-zinc-50">{record.recipientName}</h3>
                  <p className="mt-2 text-zinc-300">{record.templateName}</p>
                  <p className="mt-4 text-zinc-400">{record.summary}</p>

                  <dl className="site-detail-grid mt-6">
                    <div>
                      <dt>Issued by</dt>
                      <dd>{record.issuedBy}</dd>
                    </div>
                    <div>
                      <dt>Organization</dt>
                      <dd>{organization.name}</dd>
                    </div>
                    <div>
                      <dt>Issue date</dt>
                      <dd>{formatDate(record.issuedAt)}</dd>
                    </div>
                    <div>
                      <dt>Cohort</dt>
                      <dd>{record.cohort}</dd>
                    </div>
                    <div>
                      <dt>Recipient email</dt>
                      <dd>{record.recipientEmail}</dd>
                    </div>
                    <div>
                      <dt>Verification link</dt>
                      <dd className="break-all">{resolveVerificationUrl(record.verificationUrl)}</dd>
                    </div>
                    {record.status === "Revoked" ? (
                      <>
                        <div>
                          <dt>Revoked at</dt>
                          <dd>{record.revokedAt ? formatDate(record.revokedAt) : "Not recorded"}</dd>
                        </div>
                        <div>
                          <dt>Revocation reason</dt>
                          <dd>{record.revocationReason || "Not recorded"}</dd>
                        </div>
                      </>
                    ) : null}
                  </dl>
                </article>

                <article className="site-panel">
                  <p className="site-panel-label">Trust summary</p>
                  <h3 className="mt-3 text-2xl font-semibold text-zinc-50">Why this verification page matters</h3>
                  <ul className="site-bullet-list">
                    <li>It shows issuer identity instead of forcing manual email confirmation.</li>
                    <li>It gives businesses a stable public proof surface.</li>
                    <li>It lets recipients share one link instead of a loose PDF.</li>
                    <li>It keeps revocations visible instead of silent.</li>
                  </ul>
                </article>
              </div>
            ) : (
              <article className="site-panel">
                <p className="site-panel-label">No result</p>
                <h3 className="mt-3 text-2xl font-semibold text-zinc-50">No credential matched that verification code.</h3>
                <p className="mt-3 text-zinc-300">Try one of the sample codes or issue a new credential from the dashboard.</p>
              </article>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
