import React, { useMemo } from "react";
import { resolveVerificationUrl } from "../lib/routes";
import { useVerifyRecord } from "../hooks/useVerifyRecord";

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
  activeVerificationCode,
  selectedVerificationCode,
  onSelectVerificationCode,
  onVerifyCode,
  onBackToSite,
  onLaunchApp,
  apiMode,
  apiError,
}) {
  const fallbackRecord = useMemo(() => {
    const code = activeVerificationCode.trim().toUpperCase();
    if (!code) return null;
    return credentials.find((c) => c.verificationCode.toUpperCase() === code) || null;
  }, [credentials, activeVerificationCode]);

  const {
    displayOrganization,
    record,
    isLookupLoading,
    lookupError,
    notFound,
  } = useVerifyRecord({
    activeVerificationCode,
    fallbackRecord,
    fallbackOrganization: organization,
    apiMode,
  });

  return (
    <div className="site-shell min-h-screen text-stone-100">
      <div className="site-orb site-orb-left" />
      <div className="site-orb site-orb-right" />

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 md:px-8 md:py-8">
        {/* Nav bar */}
        <header className="site-nav">
          <div>
            <p className="site-brand">Credential Foundry</p>
            <p className="site-brand-subtitle">Verification</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="site-ghost" onClick={onBackToSite}>Back to workspace</button>
            <button type="button" className="site-button" onClick={onLaunchApp}>Open workspace</button>
          </div>
        </header>

        <main className="flex-1 py-8">
          {/* Alerts */}
          {apiError ? (
            <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{apiError}</div>
          ) : null}
          {lookupError ? (
            <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{lookupError}</div>
          ) : null}

          {/* Search bar — front and center */}
          <div className="site-panel mb-8">
            <p className="site-panel-label">Verify a credential</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                className="neo-input"
                value={selectedVerificationCode}
                onChange={(e) => onSelectVerificationCode(e.target.value)}
                placeholder="Enter verification code (e.g. NST-INT-1001)"
              />
              <button
                type="button"
                className="site-button"
                onClick={() => onVerifyCode(selectedVerificationCode)}
              >
                Verify
              </button>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              {credentials.length > 0 ? `Try: ${credentials[0]?.verificationCode}${credentials[1] ? `, ${credentials[1]?.verificationCode}` : ""}` : "No sample credentials yet."}
            </p>
          </div>

          {/* Result */}
          {isLookupLoading ? (
            <div className="site-panel">
              <p className="text-zinc-300">Looking up credential...</p>
            </div>
          ) : record ? (
            <article className="site-panel">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`verification-pill ${record.status === "Valid" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                  {record.status}
                </span>
                <span className="neo-badge">{record.verificationCode}</span>
              </div>

              <h2 className="mt-4 text-3xl font-semibold text-zinc-50" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                {record.recipientName}
              </h2>
              <p className="mt-1 text-zinc-300">{record.templateName}</p>
              {record.summary ? <p className="mt-3 text-zinc-400">{record.summary}</p> : null}

              <dl className="site-detail-grid mt-6">
                <div><dt>Issued by</dt><dd>{record.issuedBy}</dd></div>
                <div><dt>Organization</dt><dd>{displayOrganization.name}</dd></div>
                <div><dt>Issue date</dt><dd>{formatDate(record.issuedAt)}</dd></div>
                <div><dt>Cohort</dt><dd>{record.cohort}</dd></div>
                <div><dt>Recipient email</dt><dd>{record.recipientEmail}</dd></div>
                <div><dt>Verification link</dt><dd className="break-all">{resolveVerificationUrl(record.verificationUrl)}</dd></div>
                {record.status === "Revoked" ? (
                  <>
                    <div><dt>Revoked at</dt><dd>{record.revokedAt ? formatDate(record.revokedAt) : "—"}</dd></div>
                    <div><dt>Reason</dt><dd>{record.revocationReason || "—"}</dd></div>
                  </>
                ) : null}
              </dl>
            </article>
          ) : notFound || activeVerificationCode ? (
            <div className="site-panel">
              <p className="text-lg font-semibold text-zinc-50">No credential found for that code.</p>
              <p className="mt-2 text-zinc-400">Double-check the code or try one of the samples above.</p>
            </div>
          ) : (
            <div className="site-panel">
              <p className="text-zinc-400">Enter a verification code above to look up a credential.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
