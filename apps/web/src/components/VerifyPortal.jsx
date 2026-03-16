import React, { useMemo } from "react";
import { resolveVerificationUrl } from "../lib/routes";
import { formatFieldValue } from "../lib/template-fields";
import { useVerifyRecord } from "../hooks/useVerifyRecord";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeTimelineEvent(event) {
  switch (event.type) {
    case "credential.issued":
      return `${event.actorName} issued this credential.`;
    case "credential.revoked":
      return `${event.actorName} revoked this credential.`;
    default:
      return `${event.actorName} updated this record.`;
  }
}

function toExternalUrl(value) {
  if (!value) {
    return "";
  }

  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function renderFieldValue(fieldValue) {
  const formattedValue = formatFieldValue(fieldValue);

  if (formattedValue === "Not provided") {
    return <span className="text-zinc-500">Not provided</span>;
  }

  if (fieldValue.type === "url") {
    const href = toExternalUrl(fieldValue.value);

    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-emerald-200 underline decoration-emerald-400/35 underline-offset-4">
        {fieldValue.value}
      </a>
    );
  }

  if (fieldValue.type === "email") {
    return (
      <a href={`mailto:${fieldValue.value}`} className="text-emerald-200 underline decoration-emerald-400/35 underline-offset-4">
        {fieldValue.value}
      </a>
    );
  }

  return formattedValue;
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
  apiError,
}) {
  const fallbackRecord = useMemo(() => {
    const code = activeVerificationCode.trim().toUpperCase();
    if (!code) return null;
    return credentials.find((credential) => credential.verificationCode.toUpperCase() === code) || null;
  }, [credentials, activeVerificationCode]);

  const {
    payload,
    displayOrganization,
    record,
    isLookupLoading,
    lookupError,
    notFound,
  } = useVerifyRecord({
    activeVerificationCode,
    fallbackRecord,
    fallbackOrganization: organization,
  });

  const template = payload?.template || null;
  const issuer = payload?.issuer || null;
  const timeline = payload?.timeline || [];
  const organizationWebsite = toExternalUrl(displayOrganization?.website);
  const verificationDomain = toExternalUrl(displayOrganization?.verificationDomain);
  const verificationUrl = record ? resolveVerificationUrl(record.verificationUrl) : "";

  return (
    <div className="site-shell min-h-screen text-stone-100">
      <div className="site-orb site-orb-left" />
      <div className="site-orb site-orb-right" />

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 md:px-8 md:py-8">
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
          {apiError ? (
            <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{apiError}</div>
          ) : null}
          {lookupError ? (
            <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{lookupError}</div>
          ) : null}

          <div className="site-panel mb-8">
            <p className="site-panel-label">Verify a credential</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                className="neo-input"
                value={selectedVerificationCode}
                onChange={(event) => onSelectVerificationCode(event.target.value)}
                placeholder="Enter verification code (e.g. CF-INT-1001)"
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
              {credentials.length > 0
                ? `Recently issued in this workspace: ${credentials[0]?.verificationCode}${credentials[1] ? `, ${credentials[1]?.verificationCode}` : ""}`
                : "Verification codes appear here once your company starts issuing credentials."}
            </p>
          </div>

          {isLookupLoading ? (
            <div className="site-panel">
              <p className="text-zinc-300">Looking up credential...</p>
            </div>
          ) : record ? (
            <div className="space-y-6">
              <article className="site-panel">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`verification-pill ${record.status === "Valid" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                    {record.status}
                  </span>
                  <span className="neo-badge">{record.verificationCode}</span>
                  {displayOrganization?.status ? <span className="neo-badge">{displayOrganization.status} workspace</span> : null}
                </div>

                <div className="mt-5 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                  <div>
                    <h2 className="text-3xl font-semibold text-zinc-50" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
                      {record.recipientName}
                    </h2>
                    <p className="mt-1 text-zinc-300">{record.templateName}</p>
                    {record.summary ? <p className="mt-3 text-zinc-400">{record.summary}</p> : null}
                    <p className={`mt-4 text-sm ${record.status === "Valid" ? "text-emerald-100" : "text-rose-100"}`}>
                      {record.status === "Valid"
                        ? "This credential is active and verifiable against the issuing workspace."
                        : "This credential has been revoked and should not be accepted as an active record."}
                    </p>

                    <dl className="site-detail-grid mt-6">
                      <div><dt>Organization</dt><dd>{displayOrganization?.name || "Unknown organization"}</dd></div>
                      <div><dt>Issued by</dt><dd>{record.issuedBy}</dd></div>
                      <div><dt>Issue date</dt><dd>{formatDate(record.issuedAt)}</dd></div>
                      <div><dt>Template validity</dt><dd>{template?.validity || "-"}</dd></div>
                      <div><dt>Recipient email</dt><dd>{record.recipientEmail || "-"}</dd></div>
                      <div><dt>Program / cohort</dt><dd>{record.cohort || "-"}</dd></div>
                      <div><dt>Verification link</dt><dd className="break-all">{verificationUrl}</dd></div>
                      <div><dt>Verification events</dt><dd>{timeline.length || 1} recorded</dd></div>
                      {record.status === "Revoked" ? (
                        <>
                          <div><dt>Revoked at</dt><dd>{record.revokedAt ? formatDate(record.revokedAt) : "-"}</dd></div>
                          <div><dt>Revocation reason</dt><dd>{record.revocationReason || "-"}</dd></div>
                        </>
                      ) : null}
                    </dl>
                  </div>

                  <aside className="rounded-[28px] border border-white/10 bg-black/20 p-5">
                    <p className="site-panel-label">Trust context</p>
                    <div className="mt-4 space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Workspace</p>
                        <p className="mt-2 text-sm text-zinc-100">{displayOrganization?.name || "Unknown organization"}</p>
                        {displayOrganization?.sector ? <p className="mt-1 text-sm text-zinc-400">{displayOrganization.sector}</p> : null}
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Issuer</p>
                        <p className="mt-2 text-sm text-zinc-100">{issuer?.name || record.issuedBy}</p>
                        {issuer?.role ? <p className="mt-1 text-sm text-zinc-400">{issuer.role}</p> : null}
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Public trust links</p>
                        <div className="mt-2 space-y-2 text-sm">
                          {organizationWebsite ? (
                            <a href={organizationWebsite} target="_blank" rel="noreferrer" className="block break-all text-emerald-200 underline decoration-emerald-400/35 underline-offset-4">
                              {displayOrganization?.website}
                            </a>
                          ) : (
                            <p className="text-zinc-500">Website not configured</p>
                          )}
                          {verificationDomain ? (
                            <a href={verificationDomain} target="_blank" rel="noreferrer" className="block break-all text-emerald-200 underline decoration-emerald-400/35 underline-offset-4">
                              {displayOrganization?.verificationDomain}
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </article>

              <article className="site-panel">
                <p className="site-panel-label">Issued field snapshot</p>
                {record.fieldValues?.length ? (
                  <div className="site-detail-grid mt-4">
                    {record.fieldValues.map((fieldValue) => (
                      <div key={fieldValue.fieldId || fieldValue.key}>
                        <dt>{fieldValue.label}</dt>
                        <dd>{renderFieldValue(fieldValue)}</dd>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-zinc-400">This credential was issued without custom template fields.</p>
                )}
              </article>

              {timeline.length ? (
                <article className="site-panel">
                  <p className="site-panel-label">Audit timeline</p>
                  <div className="mt-4 space-y-4">
                    {timeline.map((event) => (
                      <div key={event.id} className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="neo-badge">{event.type}</span>
                          <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{formatDateTime(event.createdAt)}</span>
                        </div>
                        <p className="mt-3 text-sm text-zinc-100">{describeTimelineEvent(event)}</p>
                        {event.reason ? <p className="mt-2 text-sm text-zinc-400">Reason: {event.reason}</p> : null}
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}
            </div>
          ) : notFound || activeVerificationCode ? (
            <div className="site-panel">
              <p className="text-lg font-semibold text-zinc-50">No credential found for that code.</p>
              <p className="mt-2 text-zinc-400">Double-check the code or ask the issuing company to resend the verification link.</p>
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
