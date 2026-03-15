import React, { useEffect, useMemo, useState } from "react";
import { resolveVerificationUrl } from "../lib/routes";

const tabs = [
  { id: "credentials", label: "Credentials" },
  { id: "settings", label: "Settings" },
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

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeActivity(event) {
  switch (event.type) {
    case "credential.issued":
      return `${event.actorName} issued ${event.templateName} for ${event.recipientName}.`;
    case "credential.revoked":
      return `${event.actorName} revoked ${event.recipientName}'s credential.`;
    case "template.created":
      return `${event.actorName} created the ${event.templateName} template.`;
    case "template.updated":
      return `${event.actorName} updated the ${event.templateName} template.`;
    case "issuer.created":
      return `${event.actorName} added ${event.issuerName} to issuer access.`;
    case "issuer.updated":
      return `${event.actorName} updated ${event.issuerName}'s issuer access.`;
    case "invitation.created":
      return `${event.actorName} invited ${event.invitedName || event.invitedEmail} to the workspace.`;
    case "invitation.accepted":
      return `${event.invitedEmail || event.actorName} joined the workspace.`;
    case "organization.updated":
      return `${event.actorName} updated organization settings.`;
    default:
      return `${event.actorName} updated the workspace.`;
  }
}

export default function DashboardApp({
  organization,
  templates,
  issuers,
  credentials,
  activity,
  members,
  invitations,
  stats,
  apiMode,
  apiError,
  issuerSession,
  currentIssuerId,
  onIssueCredential,
  onRevokeCredential,
  onAddTemplate,
  onUpdateTemplate,
  onAddIssuer,
  onUpdateIssuer,
  onInviteTeamMember,
  onUpdateOrganization,
  onSwitchWorkspace,
  onBackToSite,
  onOpenVerifier,
  onSignOut,
}) {
  const [activeTab, setActiveTab] = useState("credentials");
  const [busyAction, setBusyAction] = useState("");

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState({
    templateId: templates.find((template) => template.status !== "Archived")?.id || "",
    issuerId: currentIssuerId || issuers.find((issuer) => issuer.status === "Approved")?.id || issuers[0]?.id || "",
    recipientName: "",
    recipientEmail: "",
    recipientWallet: "",
    cohort: "",
    summary: "",
  });
  const [issueMessage, setIssueMessage] = useState("");

  const [templateForm, setTemplateForm] = useState({ name: "", category: "", validity: "", summary: "" });
  const [issuerForm, setIssuerForm] = useState({ name: "", role: "", email: "", wallet: "", status: "Pending" });
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    membershipRole: "Member",
    issuerRole: "Issuer",
    issuerStatus: "Pending",
  });
  const [organizationDraft, setOrganizationDraft] = useState(organization);

  const [search, setSearch] = useState("");
  const [revocationDrafts, setRevocationDrafts] = useState({});
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    setOrganizationDraft(organization);
  }, [organization]);

  useEffect(() => {
    setIssueForm((current) => ({
      ...current,
      templateId:
        current.templateId && templates.some((template) => template.id === current.templateId && template.status !== "Archived")
          ? current.templateId
          : templates.find((template) => template.status !== "Archived")?.id || "",
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
  const activeTemplates = templates.filter((template) => template.status !== "Archived");
  const canIssueCredentials = activeTemplates.length > 0 && approvedIssuers.length > 0;
  const canManageTeam = ["Owner", "Admin"].includes(issuerSession?.membershipRole || "");

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
    } catch (error) {
      setActionMessage(error.message || "Unable to add template.");
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
      setIssuerForm({ name: "", role: "", email: "", wallet: "", status: "Pending" });
      setActionMessage("Issuer added.");
    } catch (error) {
      setActionMessage(error.message || "Unable to add issuer.");
    } finally {
      setBusyAction("");
    }
  };

  const handleTeamInvite = async (event) => {
    event.preventDefault();
    setBusyAction("invite");
    setActionMessage("");

    try {
      const invitation = await onInviteTeamMember(inviteForm);
      setInviteForm({
        name: "",
        email: "",
        membershipRole: "Member",
        issuerRole: "Issuer",
        issuerStatus: "Pending",
      });
      setActionMessage(`Invitation created for ${invitation.email}.`);
    } catch (error) {
      setActionMessage(error.message || "Unable to invite teammate.");
    } finally {
      setBusyAction("");
    }
  };

  const handleTemplateStatusToggle = async (template) => {
    const nextStatus = template.status === "Archived" ? "Active" : "Archived";
    setBusyAction(`template:${template.id}`);
    setActionMessage("");

    try {
      await onUpdateTemplate(template.id, {
        ...template,
        status: nextStatus,
      });
      setActionMessage(`${template.name} is now ${nextStatus.toLowerCase()}.`);
    } catch (error) {
      setActionMessage(error.message || "Unable to update template.");
    } finally {
      setBusyAction("");
    }
  };

  const handleIssuerStatusToggle = async (issuer) => {
    const nextStatus = issuer.status === "Approved" ? "Pending" : "Approved";
    setBusyAction(`issuer:${issuer.id}`);
    setActionMessage("");

    try {
      await onUpdateIssuer(issuer.id, {
        ...issuer,
        status: nextStatus,
      });
      setActionMessage(`${issuer.name} is now ${nextStatus.toLowerCase()}.`);
    } catch (error) {
      setActionMessage(error.message || "Unable to update issuer.");
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

  const handleCopyInviteLink = async (invitation) => {
    setActionMessage("");

    try {
      await navigator.clipboard.writeText(invitation.joinUrl);
      setActionMessage(`Copied invite link for ${invitation.email}.`);
    } catch {
      setActionMessage(`Copy failed. Invite link: ${invitation.joinUrl}`);
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
              {issuerSession?.workspaces?.length > 1 ? (
                <select
                  className="neo-select text-sm"
                  value={issuerSession.organizationId}
                  onChange={(event) => onSwitchWorkspace(event.target.value)}
                >
                  {issuerSession.workspaces.map((workspace) => (
                    <option key={workspace.organization.id} value={workspace.organization.id}>
                      {workspace.organization.name}
                    </option>
                  ))}
                </select>
              ) : null}
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
                <Card title="Complete setup before issuing" subtitle="New issuer workspaces start empty on purpose. Add at least one active template in Settings, then return here to issue credentials.">
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
                          {activeTemplates.map((template) => (
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

              <Card title="Recent activity" subtitle="Track issuing, revocations, template changes, and issuer access updates.">
                <div className="record-list">
                  {activity.length === 0 ? (
                    <article className="record-card">
                      <h3 className="text-xl font-semibold text-zinc-50">No activity yet</h3>
                      <p className="mt-2 text-sm text-zinc-400">
                        Workspace actions will appear here as your team starts issuing credentials and managing access.
                      </p>
                    </article>
                  ) : (
                    activity.map((event) => (
                      <article key={event.id} className="record-card">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="neo-badge">{event.type}</span>
                          {event.verificationCode ? <span className="neo-badge">{event.verificationCode}</span> : null}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-zinc-50">{describeActivity(event)}</h3>
                        <p className="mt-2 text-sm text-zinc-400">{formatDateTime(event.createdAt)}</p>
                        {event.reason ? <p className="mt-2 text-sm text-zinc-400">Reason: {event.reason}</p> : null}
                      </article>
                    ))
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
                        templates.map((template) => {
                          const isUpdatingTemplate = busyAction === `template:${template.id}`;

                          return (
                            <article key={template.id} className="record-card">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="neo-badge">{template.category}</span>
                                <span className="neo-badge">{template.validity}</span>
                                <span className={`verification-pill ${template.status === "Active" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                                  {template.status}
                                </span>
                              </div>
                              <h3 className="mt-2 text-lg font-semibold text-zinc-50">{template.name}</h3>
                              {template.summary ? <p className="mt-2 text-sm text-zinc-400">{template.summary}</p> : null}
                              <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="site-ghost text-sm"
                                  disabled={isUpdatingTemplate}
                                  onClick={() => handleTemplateStatusToggle(template)}
                                >
                                  {isUpdatingTemplate
                                    ? "Saving..."
                                    : template.status === "Archived"
                                      ? "Reactivate"
                                      : "Archive"}
                                </button>
                              </div>
                            </article>
                          );
                        })
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
                <h2 className="mb-4 text-xl font-bold text-zinc-50">Team Access</h2>
                <div className="dashboard-two-col">
                  <Card title="Workspace members" subtitle="Members can belong to the workspace and, when linked, hold issuer access inside it.">
                    <div className="record-list">
                      {members.length === 0 ? (
                        <article className="record-card">
                          <h3 className="text-lg font-semibold text-zinc-50">No members yet</h3>
                          <p className="mt-2 text-sm text-zinc-400">Invite teammates and they will appear here after they join.</p>
                        </article>
                      ) : (
                        members.map((member) => (
                          <article key={member.id} className="record-card">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="neo-badge">{member.role}</span>
                              {member.issuer ? <span className="neo-badge">{member.issuer.role}</span> : null}
                              {member.issuer ? (
                                <span className={`verification-pill ${member.issuer.status === "Approved" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                                  {member.issuer.status}
                                </span>
                              ) : null}
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-zinc-50">{member.user?.fullName || "Workspace member"}</h3>
                            <p className="mt-1 break-all text-sm text-zinc-400">{member.user?.email || "-"}</p>
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
                              Joined {member.joinedAt ? formatDate(member.joinedAt.slice(0, 10)) : "recently"}
                            </p>
                          </article>
                        ))
                      )}
                    </div>
                  </Card>

                  <Card title="Invite teammate" subtitle="Send a join link that creates or connects a real workspace membership.">
                    {canManageTeam ? (
                      <form className="space-y-4" onSubmit={handleTeamInvite}>
                        <label className="field-block">
                          <span className="neo-label">Full name</span>
                          <input className="neo-input mt-2" value={inviteForm.name} onChange={(event) => setInviteForm({ ...inviteForm, name: event.target.value })} />
                        </label>
                        <label className="field-block">
                          <span className="neo-label">Work email</span>
                          <input className="neo-input mt-2" type="email" value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} />
                        </label>
                        <label className="field-block">
                          <span className="neo-label">Workspace role</span>
                          <select className="neo-select mt-2" value={inviteForm.membershipRole} onChange={(event) => setInviteForm({ ...inviteForm, membershipRole: event.target.value })}>
                            <option value="Member">Member</option>
                            <option value="Admin">Admin</option>
                            <option value="Owner">Owner</option>
                          </select>
                        </label>
                        <label className="field-block">
                          <span className="neo-label">Issuer role</span>
                          <input className="neo-input mt-2" value={inviteForm.issuerRole} onChange={(event) => setInviteForm({ ...inviteForm, issuerRole: event.target.value })} />
                        </label>
                        <label className="field-block">
                          <span className="neo-label">Issuer status</span>
                          <select className="neo-select mt-2" value={inviteForm.issuerStatus} onChange={(event) => setInviteForm({ ...inviteForm, issuerStatus: event.target.value })}>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                          </select>
                        </label>
                        <button type="submit" className="site-button" disabled={busyAction === "invite"}>
                          {busyAction === "invite" ? "Creating invite..." : "Create invite link"}
                        </button>
                      </form>
                    ) : (
                      <p className="text-sm text-zinc-400">
                        Workspace members can view access details here, but only owners and admins can create new invitations.
                      </p>
                    )}
                  </Card>
                </div>
              </section>

              <section>
                <h2 className="mb-4 text-xl font-bold text-zinc-50">Pending Invites</h2>
                <Card title="Invitation links" subtitle="These links let teammates join the workspace and attach the right issuer access.">
                  <div className="record-list">
                    {invitations.length === 0 ? (
                      <article className="record-card">
                        <h3 className="text-lg font-semibold text-zinc-50">No pending invites</h3>
                        <p className="mt-2 text-sm text-zinc-400">Create an invite above and it will appear here with a copyable join link.</p>
                      </article>
                    ) : (
                      invitations.map((invitation) => (
                        <article key={invitation.id} className="record-card">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="neo-badge">{invitation.membershipRole}</span>
                            <span className="neo-badge">{invitation.issuerRole}</span>
                            <span className={`verification-pill ${invitation.issuerStatus === "Approved" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                              {invitation.issuerStatus}
                            </span>
                          </div>
                          <h3 className="mt-2 text-lg font-semibold text-zinc-50">{invitation.email}</h3>
                          <p className="mt-1 break-all text-sm text-zinc-400">{invitation.joinUrl}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button type="button" className="site-button text-sm" onClick={() => handleCopyInviteLink(invitation)}>
                              Copy invite link
                            </button>
                          </div>
                        </article>
                      ))
                    )}
                  </div>
                </Card>
              </section>

              <section>
                <h2 className="mb-4 text-xl font-bold text-zinc-50">Issuer Access</h2>
                <div className="dashboard-two-col">
                  <Card title="Current issuers">
                    <div className="record-list">
                      {issuers.map((issuer) => {
                        const isUpdatingIssuer = busyAction === `issuer:${issuer.id}`;

                        return (
                          <article key={issuer.id} className="record-card">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`verification-pill ${issuer.status === "Approved" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                                {issuer.status}
                              </span>
                              <span className="neo-badge">{issuer.role}</span>
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-zinc-50">{issuer.name}</h3>
                            <p className="mt-1 break-all text-sm text-zinc-400">{issuer.email || issuer.wallet}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="site-ghost text-sm"
                                disabled={isUpdatingIssuer}
                                onClick={() => handleIssuerStatusToggle(issuer)}
                              >
                                {isUpdatingIssuer
                                  ? "Saving..."
                                  : issuer.status === "Approved"
                                    ? "Mark pending"
                                    : "Approve issuer"}
                              </button>
                            </div>
                          </article>
                        );
                      })}
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
                        <span className="neo-label">Email</span>
                        <input className="neo-input mt-2" value={issuerForm.email} onChange={(event) => setIssuerForm({ ...issuerForm, email: event.target.value })} />
                      </label>
                      <label className="field-block">
                        <span className="neo-label">Wallet</span>
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

        </div>
      </div>
    </>
  );
}
