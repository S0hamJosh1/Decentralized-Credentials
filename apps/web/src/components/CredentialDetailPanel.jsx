import React from "react";
import { buildSepoliaAddressUrl, buildSepoliaTxUrl, formatAnchorStatus, formatWalletAddress } from "../lib/blockchain";
import { formatFieldValue } from "../lib/template-fields";

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
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
      return `${event.actorName} issued the credential.`;
    case "credential.anchored":
      return `${event.actorName} anchored this credential on Sepolia.`;
    case "credential.revoked":
      return `${event.actorName} revoked the credential.`;
    default:
      return `${event.actorName} updated this credential record.`;
  }
}

export default function CredentialDetailPanel({ detailState, onClose, onOpenVerifier }) {
  const { status, payload, error } = detailState;
  const proof = payload?.proof || null;
  const issuerWalletUrl = buildSepoliaAddressUrl(proof?.issuerWallet);
  const issueTxUrl = buildSepoliaTxUrl(proof?.issueTxHash);
  const revokeTxUrl = buildSepoliaTxUrl(proof?.revokeTxHash);

  return (
    <section className="neo-card neo-outline">
      <div className="neo-card-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">Credential detail</h2>
          <p className="mt-2 text-sm text-zinc-400">Review the issued record, field snapshot, and audit history for this credential.</p>
        </div>
        <button type="button" className="site-ghost text-sm" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="neo-card-body">
        {status === "loading" ? <p className="text-sm text-zinc-400">Loading credential details...</p> : null}
        {status === "error" ? <p className="text-sm text-amber-100">{error}</p> : null}

        {status === "ready" && payload ? (
          <div className="space-y-6">
            <article className="record-card">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`verification-pill ${payload.credential.status === "Valid" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                      {payload.credential.status}
                    </span>
                    <span className="neo-badge">{payload.credential.verificationCode}</span>
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold text-zinc-50">{payload.credential.recipientName}</h3>
                  <p className="text-sm text-zinc-300">{payload.credential.templateName}</p>
                  {payload.credential.summary ? <p className="mt-2 text-sm text-zinc-400">{payload.credential.summary}</p> : null}
                </div>
                <button type="button" className="site-button text-sm" onClick={() => onOpenVerifier(payload.credential.verificationCode)}>
                  Open verifier
                </button>
              </div>

              <dl className="site-detail-grid mt-6">
                <div><dt>Organization</dt><dd>{payload.organization?.name || "-"}</dd></div>
                <div><dt>Issued by</dt><dd>{payload.credential.issuedBy}</dd></div>
                <div><dt>Issue date</dt><dd>{formatDate(payload.credential.issuedAt)}</dd></div>
                <div><dt>Recipient email</dt><dd>{payload.credential.recipientEmail}</dd></div>
                <div><dt>Validity</dt><dd>{payload.template?.validity || "-"}</dd></div>
                {payload.credential.cohort ? <div><dt>Program / cohort</dt><dd>{payload.credential.cohort}</dd></div> : null}
                {payload.credential.status === "Revoked" ? (
                  <>
                    <div><dt>Revoked at</dt><dd>{payload.credential.revokedAt ? formatDate(payload.credential.revokedAt) : "-"}</dd></div>
                    <div><dt>Reason</dt><dd>{payload.credential.revocationReason || "-"}</dd></div>
                  </>
                ) : null}
              </dl>
            </article>

            <article className="record-card">
              <h3 className="text-lg font-semibold text-zinc-50">Issued field snapshot</h3>
              {payload.credential.fieldValues?.length ? (
                <div className="site-detail-grid mt-4">
                  {payload.credential.fieldValues.map((fieldValue) => (
                    <div key={fieldValue.fieldId || fieldValue.key}>
                      <dt>{fieldValue.label}</dt>
                      <dd>{formatFieldValue(fieldValue)}</dd>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">This credential was issued without custom template fields.</p>
              )}
            </article>

            <article className="record-card">
              <h3 className="text-lg font-semibold text-zinc-50">Sepolia proof</h3>
              <dl className="site-detail-grid mt-4">
                <div><dt>Status</dt><dd>{formatAnchorStatus(proof?.status)}</dd></div>
                <div><dt>Credential hash</dt><dd className="break-all">{proof?.credentialHash || "-"}</dd></div>
                <div><dt>Issuer wallet</dt><dd>{proof?.issuerWallet ? formatWalletAddress(proof.issuerWallet) : "-"}</dd></div>
                <div><dt>Network</dt><dd>{proof?.network || "Sepolia planned"}</dd></div>
                <div><dt>Issue tx</dt><dd>{proof?.issueTxHash ? formatWalletAddress(proof.issueTxHash) : "-"}</dd></div>
                <div><dt>Revoke tx</dt><dd>{proof?.revokeTxHash ? formatWalletAddress(proof.revokeTxHash) : "-"}</dd></div>
                <div><dt>Contract</dt><dd className="break-all">{proof?.contractAddress || "-"}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                {issuerWalletUrl ? (
                  <a href={issuerWalletUrl} target="_blank" rel="noreferrer" className="site-ghost">
                    View issuer wallet
                  </a>
                ) : null}
                {issueTxUrl ? (
                  <a href={issueTxUrl} target="_blank" rel="noreferrer" className="site-ghost">
                    View issue tx
                  </a>
                ) : null}
                {revokeTxUrl ? (
                  <a href={revokeTxUrl} target="_blank" rel="noreferrer" className="site-ghost">
                    View revoke tx
                  </a>
                ) : null}
              </div>
            </article>

            <article className="record-card">
              <h3 className="text-lg font-semibold text-zinc-50">Audit timeline</h3>
              {payload.timeline?.length ? (
                <div className="mt-4 space-y-4">
                  {payload.timeline.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="neo-badge">{event.type}</span>
                        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{formatDateTime(event.createdAt)}</span>
                      </div>
                      <p className="mt-3 text-sm text-zinc-100">{describeTimelineEvent(event)}</p>
                      {event.reason ? <p className="mt-2 text-sm text-zinc-400">Reason: {event.reason}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">No timeline events were recorded for this credential.</p>
              )}
            </article>
          </div>
        ) : null}
      </div>
    </section>
  );
}
