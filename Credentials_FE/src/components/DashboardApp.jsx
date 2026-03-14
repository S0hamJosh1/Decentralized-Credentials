import React, { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { ConnectButton } from "./ConnectButton";
import { FunctionRunner } from "./FunctionRunner";
import CredentialActions from "./CredentialActions";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config/contract";
import { getProvider, getSigner } from "../lib/eth";
import { resolveVerificationUrl } from "../lib/routes";

const tabs = [
  { id: "credentials", label: "Credentials" },
  { id: "settings", label: "Settings" },
  { id: "registry", label: "Advanced Registry" },
];

function Card({ title, subtitle, action, children }) {
  return (
    <section className="neo-card neo-outline">
      <div className="neo-card-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-50">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm text-zinc-400">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="neo-card-body">{children}</div>
    </section>
  );
}

function Metric({ label, value, tone = "default" }) {
  return (
    <div className={`metric-card ${tone !== "default" ? `metric-card-${tone}` : ""}`}>
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

function formatDate(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardApp({
  organization,
  templates,
  issuers,
  credentials,
  stats,
  apiMode,
  apiError,
  onIssueCredential,
  onRevokeCredential,
  onAddTemplate,
  onAddIssuer,
  onUpdateOrganization,
  onBackToSite,
  onOpenVerifier,
}) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [networkOk, setNetworkOk] = useState(false);
  const [activeTab, setActiveTab] = useState("credentials");
  const [busyAction, setBusyAction] = useState("");

  /* ----- Issue form ----- */
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({
    templateId: templates[0]?.id || "",
    issuerId: issuers.find((i) => i.status === "Approved")?.id || issuers[0]?.id || "",
    recipientName: "",
    recipientEmail: "",
    recipientWallet: "",
    cohort: "",
    summary: "",
  });
  const [issueMessage, setIssueMessage] = useState("");

  /* ----- Template form ----- */
  const [templateForm, setTemplateForm] = useState({ name: "", category: "", validity: "", summary: "" });

  /* ----- Issuer form ----- */
  const [issuerForm, setIssuerForm] = useState({ name: "", role: "", wallet: "", status: "Pending" });

  /* ----- Organization ----- */
  const [organizationDraft, setOrganizationDraft] = useState(organization);

  /* ----- Shared state ----- */
  const [search, setSearch] = useState("");
  const [revocationDrafts, setRevocationDrafts] = useState({});
  const [actionMessage, setActionMessage] = useState("");

  const iface = useMemo(() => new ethers.Interface(CONTRACT_ABI), []);

  useEffect(() => { setOrganizationDraft(organization); }, [organization]);

  useEffect(() => {
    setIssueForm((c) => ({
      ...c,
      templateId: c.templateId || templates[0]?.id || "",
      issuerId: c.issuerId || issuers.find((i) => i.status === "Approved")?.id || issuers[0]?.id || "",
    }));
  }, [issuers, templates]);

  const filteredCredentials = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return credentials;
    return credentials.filter((c) =>
      [c.recipientName, c.templateName, c.verificationCode, c.issuedBy, c.status]
        .join(" ").toLowerCase().includes(q)
    );
  }, [credentials, search]);

  const approvedIssuers = issuers.filter((i) => i.status === "Approved");

  /* ---------- handlers ---------- */

  const handleConnected = async () => {
    const p = await getProvider();
    setProvider(p);
    const s = await getSigner(p);
    setSigner(s);
    setAccount(await s.getAddress());
    const n = await p.getNetwork();
    setNetworkOk(n.chainId === 11155111n);
  };

  const handleIssue = async (e) => {
    e.preventDefault();
    setBusyAction("issue");
    setIssueMessage("");
    setActionMessage("");
    try {
      const rec = await onIssueCredential(issueForm);
      setIssueMessage(`Issued ${rec.templateName} for ${rec.recipientName}. Code: ${rec.verificationCode}`);
      setIssueForm((c) => ({ ...c, recipientName: "", recipientEmail: "", recipientWallet: "", cohort: "", summary: "" }));
      setShowIssueForm(false);
    } catch (err) {
      setIssueMessage(err.message || "Failed to issue credential.");
    } finally {
      setBusyAction("");
    }
  };

  const handleTemplateCreate = async (e) => {
    e.preventDefault();
    setBusyAction("template");
    setActionMessage("");
    try {
      await onAddTemplate(templateForm);
      setTemplateForm({ name: "", category: "", validity: "", summary: "" });
      setActionMessage("Template added.");
    } finally { setBusyAction(""); }
  };

  const handleIssuerCreate = async (e) => {
    e.preventDefault();
    setBusyAction("issuer");
    setActionMessage("");
    try {
      await onAddIssuer(issuerForm);
      setIssuerForm({ name: "", role: "", wallet: "", status: "Pending" });
      setActionMessage("Issuer added.");
    } finally { setBusyAction(""); }
  };

  const handleOrganizationSave = async (e) => {
    e.preventDefault();
    setBusyAction("organization");
    setActionMessage("");
    try {
      const saved = await onUpdateOrganization(organizationDraft);
      setOrganizationDraft(saved);
      setActionMessage("Organization settings saved.");
    } catch (err) {
      setActionMessage(err.message || "Unable to save.");
    } finally { setBusyAction(""); }
  };

  const handleCopyLink = async (credential) => {
    const link = resolveVerificationUrl(credential.verificationUrl);
    setActionMessage("");
    try {
      await navigator.clipboard.writeText(link);
      setActionMessage(`Copied link for ${credential.recipientName}.`);
    } catch {
      setActionMessage(`Copy failed. Link: ${link}`);
    }
  };

  const handleRevoke = async (id) => {
    const reason = revocationDrafts[id]?.trim() || "Revoked by an authorized issuer.";
    setBusyAction(`revoke:${id}`);
    setActionMessage("");
    try {
      const rec = await onRevokeCredential(id, reason);
      setRevocationDrafts((c) => ({ ...c, [id]: "" }));
      setActionMessage(`Revoked ${rec.recipientName}'s credential.`);
    } catch (err) {
      setActionMessage(err.message || "Unable to revoke.");
    } finally { setBusyAction(""); }
  };

  /* ========== RENDER ========== */

  return (
    <>
      <div className="cyber-grid-bg" />
      <div className="dashboard-shell min-h-screen text-zinc-100">
        <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8">

          {/* ---- Compact header ---- */}
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
            <div className="flex items-center gap-4">
              <button type="button" onClick={onBackToSite} className="site-ghost text-sm">← Back</button>
              <h1 className="text-2xl font-bold text-zinc-50">{organization.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="neo-badge">
                <span className={`inline-block h-2 w-2 rounded-full ${apiMode === "ready" ? "bg-emerald-400" : "bg-amber-400"}`} />
                {apiMode === "ready" ? "Live" : "Offline"}
              </span>
            </div>
          </header>

          {/* ---- Alerts ---- */}
          {apiError ? (
            <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{apiError}</div>
          ) : null}
          {actionMessage ? (
            <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">{actionMessage}</div>
          ) : null}

          {/* ---- Tabs ---- */}
          <nav className="tab-bar mb-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tab-pill ${activeTab === t.id ? "tab-pill-active" : ""}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* =============== CREDENTIALS TAB =============== */}
          {activeTab === "credentials" && (
            <main className="space-y-6">
              {/* Stats row */}
              <div className="metric-grid">
                <Metric label="Issued" value={stats.credentialCount} />
                <Metric label="Valid" value={stats.validCount} tone="success" />
                <Metric label="Revoked" value={stats.revokedCount} tone="danger" />
                <Metric label="Issuers" value={stats.issuerCount} />
              </div>

              {/* Issue form toggle */}
              {!showIssueForm ? (
                <button type="button" className="site-button" onClick={() => setShowIssueForm(true)}>
                  + Issue new credential
                </button>
              ) : (
                <Card title="Issue a credential">
                  <form className="space-y-4" onSubmit={handleIssue}>
                    <div className="dashboard-form-grid">
                      <label className="field-block">
                        <span className="neo-label">Template</span>
                        <select className="neo-select mt-2" value={issueForm.templateId} onChange={(e) => setIssueForm({ ...issueForm, templateId: e.target.value })}>
                          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Issuer</span>
                        <select className="neo-select mt-2" value={issueForm.issuerId} onChange={(e) => setIssueForm({ ...issueForm, issuerId: e.target.value })}>
                          {approvedIssuers.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                        </select>
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Recipient name</span>
                        <input className="neo-input mt-2" value={issueForm.recipientName} onChange={(e) => setIssueForm({ ...issueForm, recipientName: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Recipient email</span>
                        <input className="neo-input mt-2" value={issueForm.recipientEmail} onChange={(e) => setIssueForm({ ...issueForm, recipientEmail: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Recipient wallet</span>
                        <input className="neo-input mt-2" value={issueForm.recipientWallet} onChange={(e) => setIssueForm({ ...issueForm, recipientWallet: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Cohort / program</span>
                        <input className="neo-input mt-2" value={issueForm.cohort} onChange={(e) => setIssueForm({ ...issueForm, cohort: e.target.value })} />
                      </label>
                    </div>
                    <label className="field-block">
                      <span className="neo-label">Summary</span>
                      <textarea className="neo-textarea mt-2" rows="3" value={issueForm.summary} onChange={(e) => setIssueForm({ ...issueForm, summary: e.target.value })} />
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="submit" className="site-button" disabled={busyAction === "issue"}>
                        {busyAction === "issue" ? "Saving..." : "Create credential"}
                      </button>
                      <button type="button" className="site-ghost" onClick={() => setShowIssueForm(false)}>Cancel</button>
                    </div>
                    {issueMessage ? <p className="text-sm text-emerald-200">{issueMessage}</p> : null}
                  </form>
                </Card>
              )}

              {/* Credentials list */}
              <Card
                title="Issued credentials"
                action={<input className="neo-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />}
              >
                <div className="record-list">
                  {filteredCredentials.map((c) => {
                    const isRevoking = busyAction === `revoke:${c.id}`;
                    const link = resolveVerificationUrl(c.verificationUrl);

                    return (
                      <article key={c.id} className="record-card">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`verification-pill ${c.status === "Valid" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                                {c.status}
                              </span>
                              <span className="neo-badge">{c.verificationCode}</span>
                            </div>
                            <h3 className="mt-2 text-xl font-semibold text-zinc-50">{c.recipientName}</h3>
                            <p className="text-sm text-zinc-300">{c.templateName}</p>
                            {c.summary ? <p className="mt-2 text-sm text-zinc-400">{c.summary}</p> : null}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="site-ghost text-sm" onClick={() => onOpenVerifier(c.verificationCode)}>Verify</button>
                            <button type="button" className="site-button text-sm" onClick={() => handleCopyLink(c)}>Copy link</button>
                          </div>
                        </div>

                        <div className="site-detail-grid mt-4">
                          <div><dt>Issued by</dt><dd>{c.issuedBy}</dd></div>
                          <div><dt>Date</dt><dd>{formatDate(c.issuedAt)}</dd></div>
                          <div><dt>Email</dt><dd>{c.recipientEmail}</dd></div>
                          <div><dt>Cohort</dt><dd>{c.cohort}</dd></div>
                          {c.status === "Revoked" ? (
                            <>
                              <div><dt>Revoked at</dt><dd>{c.revokedAt ? formatDate(c.revokedAt) : "—"}</dd></div>
                              <div><dt>Reason</dt><dd>{c.revocationReason || "—"}</dd></div>
                            </>
                          ) : null}
                        </div>

                        {c.status === "Valid" ? (
                          <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                            <input
                              className="neo-input"
                              placeholder="Revocation reason"
                              value={revocationDrafts[c.id] || ""}
                              onChange={(e) => setRevocationDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                            />
                            <button type="button" className="neo-btn-danger" disabled={isRevoking} onClick={() => handleRevoke(c.id)}>
                              {isRevoking ? "Revoking..." : "Revoke"}
                            </button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </Card>
            </main>
          )}

          {/* =============== SETTINGS TAB =============== */}
          {activeTab === "settings" && (
            <main className="space-y-8">
              {/* --- Organization --- */}
              <section>
                <h2 className="text-xl font-bold text-zinc-50 mb-4">Organization</h2>
                <Card title={organization.name}>
                  <form className="space-y-4" onSubmit={handleOrganizationSave}>
                    <div className="dashboard-form-grid">
                      <label className="field-block">
                        <span className="neo-label">Name</span>
                        <input className="neo-input mt-2" value={organizationDraft.name} onChange={(e) => setOrganizationDraft({ ...organizationDraft, name: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Slug</span>
                        <input className="neo-input mt-2" value={organizationDraft.slug} onChange={(e) => setOrganizationDraft({ ...organizationDraft, slug: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Sector</span>
                        <input className="neo-input mt-2" value={organizationDraft.sector} onChange={(e) => setOrganizationDraft({ ...organizationDraft, sector: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Website</span>
                        <input className="neo-input mt-2" value={organizationDraft.website} onChange={(e) => setOrganizationDraft({ ...organizationDraft, website: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Verification domain</span>
                        <input className="neo-input mt-2" value={organizationDraft.verificationDomain} onChange={(e) => setOrganizationDraft({ ...organizationDraft, verificationDomain: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Status</span>
                        <select className="neo-select mt-2" value={organizationDraft.status} onChange={(e) => setOrganizationDraft({ ...organizationDraft, status: e.target.value })}>
                          <option value="Active">Active</option>
                          <option value="Pilot">Pilot</option>
                          <option value="Paused">Paused</option>
                        </select>
                      </label>
                    </div>
                    <label className="field-block">
                      <span className="neo-label">Description</span>
                      <textarea className="neo-textarea mt-2" rows="3" value={organizationDraft.description} onChange={(e) => setOrganizationDraft({ ...organizationDraft, description: e.target.value })} />
                    </label>
                    <button type="submit" className="site-button" disabled={busyAction === "organization"}>
                      {busyAction === "organization" ? "Saving..." : "Save settings"}
                    </button>
                  </form>
                </Card>
              </section>

              {/* --- Templates --- */}
              <section>
                <h2 className="text-xl font-bold text-zinc-50 mb-4">Templates</h2>
                <div className="dashboard-two-col">
                  <Card title="Template library">
                    <div className="record-list">
                      {templates.map((t) => (
                        <article key={t.id} className="record-card">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="neo-badge">{t.category}</span>
                            <span className="neo-badge">{t.validity}</span>
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-zinc-50">{t.name}</h3>
                          {t.summary ? <p className="mt-2 text-sm text-zinc-400">{t.summary}</p> : null}
                        </article>
                      ))}
                    </div>
                  </Card>

                  <Card title="Add template">
                    <form className="space-y-4" onSubmit={handleTemplateCreate}>
                      <label className="field-block">
                        <span className="neo-label">Name</span>
                        <input className="neo-input mt-2" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Category</span>
                        <input className="neo-input mt-2" value={templateForm.category} onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Validity</span>
                        <input className="neo-input mt-2" value={templateForm.validity} onChange={(e) => setTemplateForm({ ...templateForm, validity: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Summary</span>
                        <textarea className="neo-textarea mt-2" rows="3" value={templateForm.summary} onChange={(e) => setTemplateForm({ ...templateForm, summary: e.target.value })} />
                      </label>
                      <button type="submit" className="site-button" disabled={busyAction === "template"}>
                        {busyAction === "template" ? "Saving..." : "Add template"}
                      </button>
                    </form>
                  </Card>
                </div>
              </section>

              {/* --- Issuer Access --- */}
              <section>
                <h2 className="text-xl font-bold text-zinc-50 mb-4">Issuer Access</h2>
                <div className="dashboard-two-col">
                  <Card title="Current issuers">
                    <div className="record-list">
                      {issuers.map((i) => (
                        <article key={i.id} className="record-card">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`verification-pill ${i.status === "Approved" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                              {i.status}
                            </span>
                            <span className="neo-badge">{i.role}</span>
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-zinc-50">{i.name}</h3>
                          <p className="mt-1 break-all text-sm text-zinc-400">{i.wallet}</p>
                        </article>
                      ))}
                    </div>
                  </Card>

                  <Card title="Add issuer">
                    <form className="space-y-4" onSubmit={handleIssuerCreate}>
                      <label className="field-block">
                        <span className="neo-label">Name</span>
                        <input className="neo-input mt-2" value={issuerForm.name} onChange={(e) => setIssuerForm({ ...issuerForm, name: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Role</span>
                        <input className="neo-input mt-2" value={issuerForm.role} onChange={(e) => setIssuerForm({ ...issuerForm, role: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Wallet address</span>
                        <input className="neo-input mt-2" value={issuerForm.wallet} onChange={(e) => setIssuerForm({ ...issuerForm, wallet: e.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Status</span>
                        <select className="neo-select mt-2" value={issuerForm.status} onChange={(e) => setIssuerForm({ ...issuerForm, status: e.target.value })}>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </label>
                      <button type="submit" className="site-button" disabled={busyAction === "issuer"}>
                        {busyAction === "issuer" ? "Saving..." : "Add issuer"}
                      </button>
                    </form>
                  </Card>
                </div>
              </section>
            </main>
          )}

          {/* =============== REGISTRY TAB =============== */}
          {activeTab === "registry" && (
            <main className="space-y-6">
              {/* Wallet connect moved here */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
                <div className="flex flex-wrap items-center gap-4">
                  <ConnectButton onConnected={handleConnected} />
                  <span className="text-sm text-zinc-400">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect wallet to use registry."}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="neo-badge">
                    <span className="text-zinc-400">Network</span>
                    <span>{networkOk ? "Sepolia" : "Switch to Sepolia"}</span>
                  </span>
                  <span className="neo-badge">
                    <span className="text-zinc-400">Contract</span>
                    <span>{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span>
                  </span>
                </div>
              </div>

              <Card title="Certificate actions" subtitle="Issue, verify, or revoke via the on-chain registry.">
                <CredentialActions
                  contractAddress={CONTRACT_ADDRESS}
                  abi={CONTRACT_ABI}
                  provider={provider}
                  signer={signer}
                  networkOk={networkOk}
                  account={account}
                />
              </Card>

              <Card title="Contract tools" subtitle="Direct contract method invocation.">
                <FunctionRunner
                  iface={iface}
                  contractAddress={CONTRACT_ADDRESS}
                  abi={CONTRACT_ABI}
                  provider={provider}
                  signer={signer}
                  networkOk={networkOk}
                  account={account}
                />
              </Card>
            </main>
          )}
        </div>
      </div>
    </>
  );
}
