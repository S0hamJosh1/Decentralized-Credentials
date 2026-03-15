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
  issuerSession,
  currentIssuerId,
  onIssueCredential,
  onRevokeCredential,
  onAddTemplate,
  onAddIssuer,
  onUpdateOrganization,
  onBackToSite,
  onOpenVerifier,
  onSignOut,
}) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [networkOk, setNetworkOk] = useState(false);
  const [activeTab, setActiveTab] = useState("credentials");
  const [busyAction, setBusyAction] = useState("");

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({
    templateId: templates[0]?.id || "",
    issuerId: currentIssuerId || issuers.find((issuer) => issuer.status === "Approved")?.id || issuers[0]?.id || "",
    recipientName: "",
    recipientEmail: "",
    recipientWallet: "",
    cohort: "",
    summary: "",
  });
  const [issueMessage, setIssueMessage] = useState("");

  const [templateForm, setTemplateForm] = useState({ name: "", category: "", validity: "", summary: "" });
  const [issuerForm, setIssuerForm] = useState({ name: "", role: "", wallet: "", status: "Pending" });
  const [organizationDraft, setOrganizationDraft] = useState(organization);

  const [search, setSearch] = useState("");
  const [revocationDrafts, setRevocationDrafts] = useState({});
  const [actionMessage, setActionMessage] = useState("");

  const iface = useMemo(() => new ethers.Interface(CONTRACT_ABI), []);

  useEffect(() => {
    setOrganizationDraft(organization);
  }, [organization]);

  useEffect(() => {
    setIssueForm((current) => ({
      ...current,
      templateId: current.templateId || templates[0]?.id || "",
      issuerId:
        current.issuerId
        || currentIssuerId
        || issuers.find((issuer) => issuer.status === "Approved")?.id
        || issuers[0]?.id
        || "",
    }));
  }, [currentIssuerId, issuers, templates]);

  const filteredCredentials = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return credentials;
    }

    return credentials.filter((credential) =>
      [credential.recipientName, credential.templateName, credential.verificationCode, credential.issuedBy, credential.status]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [credentials, search]);

  const approvedIssuers = issuers.filter((issuer) => issuer.status === "Approved");
  const canIssueCredentials = templates.length > 0 && approvedIssuers.length > 0;

  const handleConnected = async () => {
    const nextProvider = await getProvider();
    setProvider(nextProvider);

    const nextSigner = await getSigner(nextProvider);
    setSigner(nextSigner);
    setAccount(await nextSigner.getAddress());

    const network = await nextProvider.getNetwork();
    setNetworkOk(network.chainId === 11155111n);
  };

  const handleIssue = async (event) => {
    event.preventDefault();
    setBusyAction("issue");
    setIssueMessage("");
    setActionMessage("");

    try {
      const record = await onIssueCredential(issueForm);
      setIssueMessage(`Issued ${record.templateName} for ${record.recipientName}. Code: ${record.verificationCode}`);
      setIssueForm((current) => ({
        ...current,
        recipientName: "",
        recipientEmail: "",
        recipientWallet: "",
        cohort: "",
        summary: "",
      }));
      setShowIssueForm(false);
    } catch (error) {
      setIssueMessage(error.message || "Failed to issue credential.");
    } finally {
      setBusyAction("");
    }
  };

  const handleTemplateCreate = async (event) => {
    event.preventDefault();
    setBusyAction("template");
    setActionMessage("");

    try {
      await onAddTemplate(templateForm);
      setTemplateForm({ name: "", category: "", validity: "", summary: "" });
      setActionMessage("Template added.");
    } finally {
      setBusyAction("");
    }
  };

  const handleIssuerCreate = async (event) => {
    event.preventDefault();
    setBusyAction("issuer");
    setActionMessage("");

    try {
      await onAddIssuer(issuerForm);
      setIssuerForm({ name: "", role: "", wallet: "", status: "Pending" });
      setActionMessage("Issuer added.");
    } finally {
      setBusyAction("");
    }
  };

  const handleOrganizationSave = async (event) => {
    event.preventDefault();
    setBusyAction("organization");
    setActionMessage("");

    try {
      const saved = await onUpdateOrganization(organizationDraft);
      setOrganizationDraft(saved);
      setActionMessage("Organization settings saved.");
    } catch (error) {
      setActionMessage(error.message || "Unable to save.");
    } finally {
      setBusyAction("");
    }
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

  const handleRevoke = async (credentialId) => {
    const reason = revocationDrafts[credentialId]?.trim() || "Revoked by an authorized issuer.";
    setBusyAction(`revoke:${credentialId}`);
    setActionMessage("");

    try {
      const record = await onRevokeCredential(credentialId, reason);
      setRevocationDrafts((current) => ({ ...current, [credentialId]: "" }));
      setActionMessage(`Revoked ${record.recipientName}'s credential.`);
    } catch (error) {
      setActionMessage(error.message || "Unable to revoke.");
    } finally {
      setBusyAction("");
    }
  };

  return (
    <>
      <div className="cyber-grid-bg" />
      <div className="dashboard-shell min-h-screen text-zinc-100">
        <div className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-4">
              <button type="button" onClick={onBackToSite} className="site-ghost text-sm">
                Home
              </button>
              <div>
                <h1 className="text-2xl font-bold text-zinc-50">{organization.name}</h1>
                <p className="mt-1 text-sm text-zinc-400">
                  {issuerSession?.fullName ? `Issuer workspace for ${issuerSession.fullName}` : "Issuer workspace"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="neo-badge">
                <span className={`inline-block h-2 w-2 rounded-full ${apiMode === "ready" ? "bg-emerald-400" : "bg-amber-400"}`} />
                {apiMode === "ready" ? "Live" : "Offline"}
              </span>
              {issuerSession ? (
                <button type="button" className="site-ghost text-sm" onClick={onSignOut}>
                  Sign out
                </button>
              ) : null}
            </div>
          </header>

          {apiError ? (
            <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
              {apiError}
            </div>
          ) : null}
          {actionMessage ? (
            <div className="mb-5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
              {actionMessage}
            </div>
          ) : null}

          <nav className="tab-bar mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab-pill ${activeTab === tab.id ? "tab-pill-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {activeTab === "credentials" ? (
            <main className="space-y-6">
              <div className="metric-grid">
                <Metric label="Issued" value={stats.credentialCount} />
                <Metric label="Valid" value={stats.validCount} tone="success" />
                <Metric label="Revoked" value={stats.revokedCount} tone="danger" />
                <Metric label="Issuers" value={stats.issuerCount} />
              </div>

              {!canIssueCredentials ? (
                <Card title="Complete setup before issuing" subtitle="New issuer workspaces start empty on purpose. Add at least one template in Settings, then return here to issue credentials.">
                  <button type="button" className="site-button" onClick={() => setActiveTab("settings")}>
                    Go to settings
                  </button>
                </Card>
              ) : !showIssueForm ? (
                <button type="button" className="site-button" onClick={() => setShowIssueForm(true)}>
                  + Issue new credential
                </button>
              ) : (
                <Card title="Issue a credential">
                  <form className="space-y-4" onSubmit={handleIssue}>
                    <div className="dashboard-form-grid">
                      <label className="field-block">
                        <span className="neo-label">Template</span>
                        <select
                          className="neo-select mt-2"
                          value={issueForm.templateId}
                          onChange={(event) => setIssueForm({ ...issueForm, templateId: event.target.value })}
                        >
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Issuer</span>
                        <select
                          className="neo-select mt-2"
                          value={issueForm.issuerId}
                          onChange={(event) => setIssueForm({ ...issueForm, issuerId: event.target.value })}
                        >
                          {approvedIssuers.map((issuer) => (
                            <option key={issuer.id} value={issuer.id}>
                              {issuer.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Recipient name</span>
                        <input className="neo-input mt-2" value={issueForm.recipientName} onChange={(event) => setIssueForm({ ...issueForm, recipientName: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Recipient email</span>
                        <input className="neo-input mt-2" value={issueForm.recipientEmail} onChange={(event) => setIssueForm({ ...issueForm, recipientEmail: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Recipient wallet</span>
                        <input className="neo-input mt-2" value={issueForm.recipientWallet} onChange={(event) => setIssueForm({ ...issueForm, recipientWallet: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Cohort / program</span>
                        <input className="neo-input mt-2" value={issueForm.cohort} onChange={(event) => setIssueForm({ ...issueForm, cohort: event.target.value })} />
                      </label>
                    </div>
                    <label className="field-block">
                      <span className="neo-label">Summary</span>
                      <textarea className="neo-textarea mt-2" rows="3" value={issueForm.summary} onChange={(event) => setIssueForm({ ...issueForm, summary: event.target.value })} />
                    </label>
                    <div className="flex items-center gap-3">
                      <button type="submit" className="site-button" disabled={busyAction === "issue"}>
                        {busyAction === "issue" ? "Saving..." : "Create credential"}
                      </button>
                      <button type="button" className="site-ghost" onClick={() => setShowIssueForm(false)}>
                        Cancel
                      </button>
                    </div>
                    {issueMessage ? <p className="text-sm text-emerald-200">{issueMessage}</p> : null}
                  </form>
                </Card>
              )}

              <Card
                title="Issued credentials"
                action={<input className="neo-input" placeholder="Search..." value={search} onChange={(event) => setSearch(event.target.value)} />}
              >
                <div className="record-list">
                  {filteredCredentials.length === 0 ? (
                    <article className="record-card">
                      <h3 className="text-xl font-semibold text-zinc-50">No credentials issued yet</h3>
                      <p className="mt-2 text-sm text-zinc-400">
                        Once your templates are ready, issue the first credential from this workspace and it will appear here.
                      </p>
                    </article>
                  ) : (
                    filteredCredentials.map((credential) => {
                      const isRevoking = busyAction === `revoke:${credential.id}`;

                      return (
                        <article key={credential.id} className="record-card">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`verification-pill ${credential.status === "Valid" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                                  {credential.status}
                                </span>
                                <span className="neo-badge">{credential.verificationCode}</span>
                              </div>
                              <h3 className="mt-2 text-xl font-semibold text-zinc-50">{credential.recipientName}</h3>
                              <p className="text-sm text-zinc-300">{credential.templateName}</p>
                              {credential.summary ? <p className="mt-2 text-sm text-zinc-400">{credential.summary}</p> : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" className="site-ghost text-sm" onClick={() => onOpenVerifier(credential.verificationCode)}>
                                Verify
                              </button>
                              <button type="button" className="site-button text-sm" onClick={() => handleCopyLink(credential)}>
                                Copy link
                              </button>
                            </div>
                          </div>

                          <div className="site-detail-grid mt-4">
                            <div><dt>Issued by</dt><dd>{credential.issuedBy}</dd></div>
                            <div><dt>Date</dt><dd>{formatDate(credential.issuedAt)}</dd></div>
                            <div><dt>Email</dt><dd>{credential.recipientEmail}</dd></div>
                            <div><dt>Cohort</dt><dd>{credential.cohort}</dd></div>
                            {credential.status === "Revoked" ? (
                              <>
                                <div><dt>Revoked at</dt><dd>{credential.revokedAt ? formatDate(credential.revokedAt) : "-"}</dd></div>
                                <div><dt>Reason</dt><dd>{credential.revocationReason || "-"}</dd></div>
                              </>
                            ) : null}
                          </div>

                          {credential.status === "Valid" ? (
                            <div className="mt-4 flex flex-col gap-2 lg:flex-row lg:items-center">
                              <input
                                className="neo-input"
                                placeholder="Revocation reason"
                                value={revocationDrafts[credential.id] || ""}
                                onChange={(event) => setRevocationDrafts((current) => ({ ...current, [credential.id]: event.target.value }))}
                              />
                              <button type="button" className="neo-btn-danger" disabled={isRevoking} onClick={() => handleRevoke(credential.id)}>
                                {isRevoking ? "Revoking..." : "Revoke"}
                              </button>
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </Card>
            </main>
          ) : null}

          {activeTab === "settings" ? (
            <main className="space-y-8">
              <section>
                <h2 className="mb-4 text-xl font-bold text-zinc-50">Organization</h2>
                <Card title={organization.name}>
                  <form className="space-y-4" onSubmit={handleOrganizationSave}>
                    <div className="dashboard-form-grid">
                      <label className="field-block">
                        <span className="neo-label">Name</span>
                        <input className="neo-input mt-2" value={organizationDraft.name} onChange={(event) => setOrganizationDraft({ ...organizationDraft, name: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Slug</span>
                        <input className="neo-input mt-2" value={organizationDraft.slug} onChange={(event) => setOrganizationDraft({ ...organizationDraft, slug: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Sector</span>
                        <input className="neo-input mt-2" value={organizationDraft.sector} onChange={(event) => setOrganizationDraft({ ...organizationDraft, sector: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Website</span>
                        <input className="neo-input mt-2" value={organizationDraft.website} onChange={(event) => setOrganizationDraft({ ...organizationDraft, website: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Verification domain</span>
                        <input className="neo-input mt-2" value={organizationDraft.verificationDomain} onChange={(event) => setOrganizationDraft({ ...organizationDraft, verificationDomain: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Status</span>
                        <select className="neo-select mt-2" value={organizationDraft.status} onChange={(event) => setOrganizationDraft({ ...organizationDraft, status: event.target.value })}>
                          <option value="Active">Active</option>
                          <option value="Pilot">Pilot</option>
                          <option value="Paused">Paused</option>
                        </select>
                      </label>
                    </div>
                    <label className="field-block">
                      <span className="neo-label">Description</span>
                      <textarea className="neo-textarea mt-2" rows="3" value={organizationDraft.description} onChange={(event) => setOrganizationDraft({ ...organizationDraft, description: event.target.value })} />
                    </label>
                    <button type="submit" className="site-button" disabled={busyAction === "organization"}>
                      {busyAction === "organization" ? "Saving..." : "Save settings"}
                    </button>
                  </form>
                </Card>
              </section>

              <section>
                <h2 className="mb-4 text-xl font-bold text-zinc-50">Templates</h2>
                <div className="dashboard-two-col">
                  <Card title="Template library">
                    <div className="record-list">
                      {templates.length === 0 ? (
                        <article className="record-card">
                          <h3 className="text-lg font-semibold text-zinc-50">No templates yet</h3>
                          <p className="mt-2 text-sm text-zinc-400">Create your first certificate template to unlock issuing.</p>
                        </article>
                      ) : (
                        templates.map((template) => (
                          <article key={template.id} className="record-card">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="neo-badge">{template.category}</span>
                              <span className="neo-badge">{template.validity}</span>
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-zinc-50">{template.name}</h3>
                            {template.summary ? <p className="mt-2 text-sm text-zinc-400">{template.summary}</p> : null}
                          </article>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card title="Add template">
                    <form className="space-y-4" onSubmit={handleTemplateCreate}>
                      <label className="field-block">
                        <span className="neo-label">Name</span>
                        <input className="neo-input mt-2" value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Category</span>
                        <input className="neo-input mt-2" value={templateForm.category} onChange={(event) => setTemplateForm({ ...templateForm, category: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Validity</span>
                        <input className="neo-input mt-2" value={templateForm.validity} onChange={(event) => setTemplateForm({ ...templateForm, validity: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Summary</span>
                        <textarea className="neo-textarea mt-2" rows="3" value={templateForm.summary} onChange={(event) => setTemplateForm({ ...templateForm, summary: event.target.value })} />
                      </label>
                      <button type="submit" className="site-button" disabled={busyAction === "template"}>
                        {busyAction === "template" ? "Saving..." : "Add template"}
                      </button>
                    </form>
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-xl font-bold text-zinc-50">Issuer Access</h2>
                <div className="dashboard-two-col">
                  <Card title="Current issuers">
                    <div className="record-list">
                      {issuers.map((issuer) => (
                        <article key={issuer.id} className="record-card">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`verification-pill ${issuer.status === "Approved" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                              {issuer.status}
                            </span>
                            <span className="neo-badge">{issuer.role}</span>
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-zinc-50">{issuer.name}</h3>
                          <p className="mt-1 break-all text-sm text-zinc-400">{issuer.email || issuer.wallet}</p>
                        </article>
                      ))}
                    </div>
                  </Card>

                  <Card title="Add issuer">
                    <form className="space-y-4" onSubmit={handleIssuerCreate}>
                      <label className="field-block">
                        <span className="neo-label">Name</span>
                        <input className="neo-input mt-2" value={issuerForm.name} onChange={(event) => setIssuerForm({ ...issuerForm, name: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Role</span>
                        <input className="neo-input mt-2" value={issuerForm.role} onChange={(event) => setIssuerForm({ ...issuerForm, role: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Wallet or email</span>
                        <input className="neo-input mt-2" value={issuerForm.wallet} onChange={(event) => setIssuerForm({ ...issuerForm, wallet: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Status</span>
                        <select className="neo-select mt-2" value={issuerForm.status} onChange={(event) => setIssuerForm({ ...issuerForm, status: event.target.value })}>
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
          ) : null}

          {activeTab === "registry" ? (
            <main className="space-y-6">
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
          ) : null}
        </div>
      </div>
    </>
  );
}
