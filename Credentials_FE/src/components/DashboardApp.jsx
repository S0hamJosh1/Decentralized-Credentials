import React, { useMemo, useState } from "react";
import { ethers } from "ethers";
import { ConnectButton } from "./ConnectButton";
import { FunctionRunner } from "./FunctionRunner";
import CredentialActions from "./CredentialActions";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config/contract";
import { getProvider, getSigner } from "../lib/eth";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "issue", label: "Issue" },
  { id: "credentials", label: "Issued credentials" },
  { id: "templates", label: "Templates" },
  { id: "issuers", label: "Issuer access" },
  { id: "registry", label: "Registry tools" },
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

function createTemplateId(currentCount) {
  return `TPL-${String(currentCount + 401).padStart(3, "0")}`;
}

function createIssuerId(currentCount) {
  return `ISS-${currentCount + 10}`;
}

export default function DashboardApp({
  organization,
  templates,
  issuers,
  credentials,
  stats,
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
  const [activeTab, setActiveTab] = useState("overview");
  const [issueForm, setIssueForm] = useState({
    templateId: templates[0]?.id || "",
    issuerId: issuers.find((issuer) => issuer.status === "Approved")?.id || issuers[0]?.id || "",
    recipientName: "",
    recipientEmail: "",
    recipientWallet: "",
    cohort: "",
    summary: "",
  });
  const [issueMessage, setIssueMessage] = useState("");
  const [templateForm, setTemplateForm] = useState({
    name: "",
    category: "",
    validity: "",
    summary: "",
  });
  const [issuerForm, setIssuerForm] = useState({
    name: "",
    role: "",
    wallet: "",
    status: "Pending",
  });
  const [organizationDraft, setOrganizationDraft] = useState(organization);
  const [search, setSearch] = useState("");

  const iface = useMemo(() => new ethers.Interface(CONTRACT_ABI), []);

  const filteredCredentials = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return credentials;

    return credentials.filter((credential) => {
      return [
        credential.recipientName,
        credential.templateName,
        credential.verificationCode,
        credential.issuedBy,
        credential.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [credentials, search]);

  const approvedIssuers = issuers.filter((issuer) => issuer.status === "Approved");

  const handleConnected = async () => {
    const nextProvider = await getProvider();
    setProvider(nextProvider);

    const nextSigner = await getSigner(nextProvider);
    setSigner(nextSigner);

    const address = await nextSigner.getAddress();
    setAccount(address);

    const network = await nextProvider.getNetwork();
    setNetworkOk(network.chainId === 11155111n);
  };

  const handleIssue = (event) => {
    event.preventDefault();

    const nextRecord = onIssueCredential(issueForm);
    setIssueMessage(`Issued ${nextRecord.templateName} for ${nextRecord.recipientName}. Verification code: ${nextRecord.verificationCode}`);
    setIssueForm((current) => ({
      ...current,
      recipientName: "",
      recipientEmail: "",
      recipientWallet: "",
      cohort: "",
      summary: "",
    }));
    setActiveTab("credentials");
  };

  const handleTemplateCreate = (event) => {
    event.preventDefault();
    onAddTemplate({
      id: createTemplateId(templates.length),
      ...templateForm,
    });
    setTemplateForm({ name: "", category: "", validity: "", summary: "" });
  };

  const handleIssuerCreate = (event) => {
    event.preventDefault();
    onAddIssuer({
      id: createIssuerId(issuers.length),
      ...issuerForm,
    });
    setIssuerForm({ name: "", role: "", wallet: "", status: "Pending" });
  };

  const handleOrganizationSave = (event) => {
    event.preventDefault();
    onUpdateOrganization(organizationDraft);
  };

  return (
    <>
      <div className="cyber-grid-bg" />
      <div className="dashboard-shell min-h-screen text-zinc-100">
        <div className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
          <header className="mb-8">
            <div className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-start md:justify-between">
              <div className="max-w-3xl">
                <button type="button" onClick={onBackToSite} className="site-ghost mb-5">
                  Back to product site
                </button>
                <p className="site-kicker">Issuer workspace</p>
                <h1 className="text-4xl font-extrabold tracking-tight text-zinc-50 md:text-6xl md:leading-[1.02]">
                  {organization.name}
                </h1>
                <p className="mt-4 max-w-2xl text-sm text-zinc-400 md:text-base">
                  Manage certificate templates, issuer access, recipient records, and verification links from one place.
                </p>
              </div>

              <div className="dashboard-meta flex flex-col items-start gap-3 md:items-end">
                <div className="neo-badge">
                  <span className="text-zinc-400">Status</span>
                  <span>{organization.status}</span>
                </div>
                <div className="neo-badge">
                  <span className="text-zinc-400">Network</span>
                  <span>{networkOk ? "Sepolia" : "Switch to Sepolia"}</span>
                </div>
                <div className="neo-badge">
                  <span className="text-zinc-400">Contract</span>
                  <span>{CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}</span>
                </div>
              </div>
            </div>
          </header>

          <section className="dashboard-toolbar mb-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-200/80">Access control</p>
              <p className="mt-2 max-w-2xl text-sm text-zinc-300">
                Approved issuer wallets can operate the registry. Everyone else should stay on the public website or verifier portal.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <ConnectButton onConnected={handleConnected} />
              <span className="text-sm text-zinc-400">
                {account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : "Connect an issuer wallet to begin."}
              </span>
            </div>
          </section>

          <nav className="tab-bar mb-8">
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

          <main className="space-y-7">
            {activeTab === "overview" && (
              <>
                <div className="metric-grid">
                  <Metric label="Issued credentials" value={stats.credentialCount} />
                  <Metric label="Valid" value={stats.validCount} tone="success" />
                  <Metric label="Revoked" value={stats.revokedCount} tone="danger" />
                  <Metric label="Approved issuers" value={stats.issuerCount} />
                </div>

                <div className="dashboard-two-col">
                  <Card title="Organization profile" subtitle="This becomes the trust anchor that verifiers recognize.">
                    <form className="space-y-4" onSubmit={handleOrganizationSave}>
                      <div className="dashboard-form-grid">
                        <label className="field-block">
                          <span className="neo-label">Organization name</span>
                          <input
                            className="neo-input mt-2"
                            value={organizationDraft.name}
                            onChange={(event) => setOrganizationDraft({ ...organizationDraft, name: event.target.value })}
                          />
                        </label>
                        <label className="field-block">
                          <span className="neo-label">Sector</span>
                          <input
                            className="neo-input mt-2"
                            value={organizationDraft.sector}
                            onChange={(event) => setOrganizationDraft({ ...organizationDraft, sector: event.target.value })}
                          />
                        </label>
                        <label className="field-block">
                          <span className="neo-label">Website</span>
                          <input
                            className="neo-input mt-2"
                            value={organizationDraft.website}
                            onChange={(event) => setOrganizationDraft({ ...organizationDraft, website: event.target.value })}
                          />
                        </label>
                        <label className="field-block">
                          <span className="neo-label">Verification domain</span>
                          <input
                            className="neo-input mt-2"
                            value={organizationDraft.verificationDomain}
                            onChange={(event) => setOrganizationDraft({ ...organizationDraft, verificationDomain: event.target.value })}
                          />
                        </label>
                      </div>
                      <label className="field-block">
                        <span className="neo-label">Organization description</span>
                        <textarea
                          className="neo-textarea mt-2"
                          rows="4"
                          value={organizationDraft.description}
                          onChange={(event) => setOrganizationDraft({ ...organizationDraft, description: event.target.value })}
                        />
                      </label>
                      <button type="submit" className="site-button">Save organization profile</button>
                    </form>
                  </Card>

                  <Card title="Trust snapshot" subtitle="This is the product story in operational form.">
                    <ul className="site-bullet-list mt-0">
                      <li>{organization.name} is framed as the issuing organization.</li>
                      <li>Templates standardize what gets issued.</li>
                      <li>Approved issuer wallets define who can create records.</li>
                      <li>Each credential gets a verification code for public lookup.</li>
                    </ul>
                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="site-panel-label">Sample verification domain</p>
                      <p className="mt-2 text-zinc-200">{organization.verificationDomain}</p>
                      <p className="mt-2 text-sm text-zinc-400">This is the surface a recruiter or partner should trust, not the internal dashboard.</p>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {activeTab === "issue" && (
              <div className="dashboard-two-col">
                <Card title="Issue a certificate" subtitle="Use structured business data instead of free-form contract inputs.">
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
                            <option key={template.id} value={template.id}>{template.name}</option>
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
                            <option key={issuer.id} value={issuer.id}>{issuer.name}</option>
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
                        <span className="neo-label">Cohort or program</span>
                        <input className="neo-input mt-2" value={issueForm.cohort} onChange={(event) => setIssueForm({ ...issueForm, cohort: event.target.value })} />
                      </label>
                    </div>
                    <label className="field-block">
                      <span className="neo-label">Credential summary</span>
                      <textarea
                        className="neo-textarea mt-2"
                        rows="4"
                        value={issueForm.summary}
                        onChange={(event) => setIssueForm({ ...issueForm, summary: event.target.value })}
                      />
                    </label>
                    <button type="submit" className="site-button">Create credential record</button>
                    {issueMessage ? <p className="text-sm text-emerald-200">{issueMessage}</p> : null}
                  </form>
                </Card>

                <Card title="Issuance guidance" subtitle="What this screen is proving in the product build.">
                  <ul className="site-bullet-list mt-0">
                    <li>Issuers select from templates instead of inventing their own credential format each time.</li>
                    <li>Recipient identity is captured in a structured record.</li>
                    <li>Every issued record can generate a public verification path.</li>
                    <li>The existing on-chain registry can remain the anchoring layer underneath.</li>
                  </ul>
                </Card>
              </div>
            )}

            {activeTab === "credentials" && (
              <Card
                title="Issued credentials"
                subtitle="These are the records recipients and verifiers care about."
                action={<input className="neo-input" placeholder="Search credentials" value={search} onChange={(event) => setSearch(event.target.value)} />}
              >
                <div className="record-list">
                  {filteredCredentials.map((credential) => (
                    <article key={credential.id} className="record-card">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`verification-pill ${credential.status === "Valid" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                              {credential.status}
                            </span>
                            <span className="neo-badge">{credential.verificationCode}</span>
                          </div>
                          <h3 className="mt-3 text-2xl font-semibold text-zinc-50">{credential.recipientName}</h3>
                          <p className="mt-1 text-zinc-300">{credential.templateName}</p>
                          <p className="mt-3 text-sm text-zinc-400">{credential.summary}</p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button type="button" className="site-ghost" onClick={() => onOpenVerifier(credential.verificationCode)}>
                            Open verifier
                          </button>
                          {credential.status === "Valid" ? (
                            <button type="button" className="neo-btn-danger" onClick={() => onRevokeCredential(credential.id)}>
                              Revoke
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="site-detail-grid mt-5">
                        <div>
                          <dt>Issued by</dt>
                          <dd>{credential.issuedBy}</dd>
                        </div>
                        <div>
                          <dt>Issue date</dt>
                          <dd>{formatDate(credential.issuedAt)}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{credential.recipientEmail}</dd>
                        </div>
                        <div>
                          <dt>Cohort</dt>
                          <dd>{credential.cohort}</dd>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </Card>
            )}

            {activeTab === "templates" && (
              <div className="dashboard-two-col">
                <Card title="Template library" subtitle="Templates make the product easier to explain and scale.">
                  <div className="record-list">
                    {templates.map((template) => (
                      <article key={template.id} className="record-card">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="neo-badge">{template.id}</span>
                          <span className="neo-badge">{template.category}</span>
                          <span className="neo-badge">{template.validity}</span>
                        </div>
                        <h3 className="mt-3 text-2xl font-semibold text-zinc-50">{template.name}</h3>
                        <p className="mt-3 text-sm text-zinc-400">{template.summary}</p>
                      </article>
                    ))}
                  </div>
                </Card>

                <Card title="Create a new template" subtitle="This is the business-facing replacement for raw credential labels.">
                  <form className="space-y-4" onSubmit={handleTemplateCreate}>
                    <label className="field-block">
                      <span className="neo-label">Template name</span>
                      <input className="neo-input mt-2" value={templateForm.name} onChange={(event) => setTemplateForm({ ...templateForm, name: event.target.value })} />
                    </label>
                    <label className="field-block">
                      <span className="neo-label">Category</span>
                      <input className="neo-input mt-2" value={templateForm.category} onChange={(event) => setTemplateForm({ ...templateForm, category: event.target.value })} />
                    </label>
                    <label className="field-block">
                      <span className="neo-label">Validity period</span>
                      <input className="neo-input mt-2" value={templateForm.validity} onChange={(event) => setTemplateForm({ ...templateForm, validity: event.target.value })} />
                    </label>
                    <label className="field-block">
                      <span className="neo-label">Summary</span>
                      <textarea className="neo-textarea mt-2" rows="4" value={templateForm.summary} onChange={(event) => setTemplateForm({ ...templateForm, summary: event.target.value })} />
                    </label>
                    <button type="submit" className="site-button">Add template</button>
                  </form>
                </Card>
              </div>
            )}

            {activeTab === "issuers" && (
              <div className="dashboard-two-col">
                <Card title="Issuer access" subtitle="Who is allowed to issue on behalf of the organization.">
                  <div className="record-list">
                    {issuers.map((issuer) => (
                      <article key={issuer.id} className="record-card">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`verification-pill ${issuer.status === "Approved" ? "verification-pill-valid" : "verification-pill-revoked"}`}>
                            {issuer.status}
                          </span>
                          <span className="neo-badge">{issuer.role}</span>
                        </div>
                        <h3 className="mt-3 text-2xl font-semibold text-zinc-50">{issuer.name}</h3>
                        <p className="mt-3 break-all text-sm text-zinc-400">{issuer.wallet}</p>
                      </article>
                    ))}
                  </div>
                </Card>

                <Card title="Add issuer" subtitle="This models the organization-level governance layer the current prototype is missing.">
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
                      <span className="neo-label">Wallet address</span>
                      <input className="neo-input mt-2" value={issuerForm.wallet} onChange={(event) => setIssuerForm({ ...issuerForm, wallet: event.target.value })} />
                    </label>
                    <label className="field-block">
                      <span className="neo-label">Status</span>
                      <select className="neo-select mt-2" value={issuerForm.status} onChange={(event) => setIssuerForm({ ...issuerForm, status: event.target.value })}>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                      </select>
                    </label>
                    <button type="submit" className="site-button">Add issuer</button>
                  </form>
                </Card>
              </div>
            )}

            {activeTab === "registry" && (
              <>
                <Card title="Registry-backed certificate actions" subtitle="Use the current contract workflow while the product backend evolves.">
                  <CredentialActions
                    contractAddress={CONTRACT_ADDRESS}
                    abi={CONTRACT_ABI}
                    provider={provider}
                    signer={signer}
                    networkOk={networkOk}
                    account={account}
                  />
                </Card>

                <Card title="Advanced contract tools" subtitle="Keep this for debugging and admin checks while the business workflow matures.">
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
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
