import React, { useEffect, useMemo, useRef, useState } from "react";
import { slugifyCompanyName } from "../lib/company";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
let googleScriptPromise;

const setupHighlights = [
  {
    title: "Create the company workspace",
    body: "Set up the organization that will own templates, issuer access, credentials, and verification links.",
  },
  {
    title: "Invite real teammates",
    body: "Workspace access now supports join links so invited staff become actual company members, not just placeholder records.",
  },
  {
    title: "Move straight into operations",
    body: "Once you are in, you can manage templates, issuer approvals, team access, and credential verification from one dashboard.",
  },
];

function buildRegisterForm() {
  return {
    fullName: "",
    workEmail: "",
    password: "",
    role: "Issuer admin",
    companyName: "",
    website: "",
    sector: "",
  };
}

function buildSignInForm() {
  return {
    workEmail: "",
    password: "",
  };
}

function buildJoinForm(invitationPayload) {
  return {
    fullName: "",
    workEmail: invitationPayload?.invitation?.email || "",
    password: "",
  };
}

function loadGoogleIdentityScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Google sign-in.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export default function IssuerAccessFlow({
  authError,
  invitationCode,
  invitationStatus,
  invitationPayload,
  onRegister,
  onSignIn,
  onGoogleRegister,
  onGoogleSignIn,
  onAcceptInvitation,
  onAcceptInvitationWithGoogle,
}) {
  const isInvitationFlow = Boolean(invitationCode);
  const [mode, setMode] = useState(isInvitationFlow ? "join" : "register");
  const [registerForm, setRegisterForm] = useState(buildRegisterForm);
  const [signInForm, setSignInForm] = useState(buildSignInForm);
  const [joinForm, setJoinForm] = useState(buildJoinForm(invitationPayload));
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [googleError, setGoogleError] = useState("");
  const googleButtonRef = useRef(null);
  const googleActionRef = useRef(null);

  useEffect(() => {
    if (isInvitationFlow) {
      setMode("join");
    }
  }, [isInvitationFlow]);

  useEffect(() => {
    setJoinForm((current) => ({
      ...current,
      workEmail: invitationPayload?.invitation?.email || current.workEmail,
    }));
  }, [invitationPayload]);

  const companySlug = useMemo(
    () => slugifyCompanyName(registerForm.companyName),
    [registerForm.companyName]
  );

  const activeMode = isInvitationFlow ? "join" : mode;
  const activeError = localError || googleError || authError;
  const googleReady = Boolean(GOOGLE_CLIENT_ID && (onGoogleRegister || onGoogleSignIn || onAcceptInvitationWithGoogle));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setLocalError("");

    try {
      if (activeMode === "register") {
        await onRegister({
          ...registerForm,
          companySlug,
        });
      } else if (activeMode === "signin") {
        await onSignIn(signInForm);
      } else {
        await onAcceptInvitation({
          ...joinForm,
          invitationCode,
        });
      }
    } catch (submitError) {
      setLocalError(submitError.message || "Unable to continue.");
      setBusy(false);
      return;
    }

    setBusy(false);
  };

  useEffect(() => {
    googleActionRef.current = async (credential) => {
      setBusy(true);
      setLocalError("");
      setGoogleError("");

      try {
        if (activeMode === "register") {
          if (!registerForm.companyName || !companySlug || !registerForm.role) {
            throw new Error("Add your company details before continuing with Google.");
          }

          await onGoogleRegister?.({
            ...registerForm,
            companySlug,
            credential,
          });
        } else if (activeMode === "signin") {
          await onGoogleSignIn?.({ credential });
        } else {
          await onAcceptInvitationWithGoogle?.({
            invitationCode,
            credential,
          });
        }
      } catch (submitError) {
        setGoogleError(submitError.message || "Unable to continue with Google.");
      } finally {
        setBusy(false);
      }
    };
  }, [
    activeMode,
    companySlug,
    invitationCode,
    onAcceptInvitationWithGoogle,
    onGoogleRegister,
    onGoogleSignIn,
    registerForm,
  ]);

  useEffect(() => {
    if (!googleReady || !googleButtonRef.current) {
      return undefined;
    }

    let cancelled = false;
    setGoogleError("");

    loadGoogleIdentityScript()
      .then(() => {
        if (cancelled || !googleButtonRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response?.credential) {
              setGoogleError("Google sign-in did not return an account credential.");
              return;
            }

            googleActionRef.current?.(response.credential);
          },
        });

        googleButtonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 320,
          text: activeMode === "signin" ? "signin_with" : "continue_with",
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setGoogleError(error.message || "Unable to load Google sign-in.");
        }
      });

    return () => {
      cancelled = true;
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = "";
      }
    };
  }, [activeMode, googleReady]);

  const heading =
    activeMode === "register"
      ? "Who should own this workspace?"
      : activeMode === "signin"
        ? "Sign back into your workspace"
        : `Join ${invitationPayload?.organization?.name || "this workspace"}`;

  const panelLabel =
    activeMode === "register"
      ? "New company account"
      : activeMode === "signin"
        ? "Existing account"
        : "Workspace invitation";

  return (
    <div className="site-shell min-h-screen text-stone-100">
      <div className="site-orb site-orb-left" />
      <div className="site-orb site-orb-right" />

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6 md:px-8 md:py-8">
        <header className="site-nav">
          <div>
            <p className="site-brand">Credential Foundry</p>
            <p className="site-brand-subtitle">Company workspace</p>
          </div>
          <span className="neo-badge">Secure access</span>
        </header>

        <main className="issuer-access-layout flex-1 py-8">
          <section className="site-panel issuer-access-copy">
            <p className="site-panel-label">Credential operations</p>
            <h1 className="issuer-access-title">Issue trusted credentials from one secure company workspace.</h1>
            <p className="site-lede issuer-access-lede">
              Create the workspace once, invite teammates with join links, and manage templates, issuer access,
              credential records, and public verification from one product.
            </p>

            <div className="site-mini-grid issuer-access-highlights">
              {setupHighlights.map((item, index) => (
                <div key={item.title}>
                  <strong>
                    <span className="site-step-number issuer-step-number">{index + 1}</span>
                    {item.title}
                  </strong>
                  <p>{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="site-panel">
            {!isInvitationFlow ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={mode === "register" ? "site-button" : "site-ghost"}
                  onClick={() => {
                    setMode("register");
                    setLocalError("");
                  }}
                >
                  Create workspace
                </button>
                <button
                  type="button"
                  className={mode === "signin" ? "site-button" : "site-ghost"}
                  onClick={() => {
                    setMode("signin");
                    setLocalError("");
                  }}
                >
                  Sign in
                </button>
              </div>
            ) : null}

            <p className="site-panel-label mt-6">{panelLabel}</p>
            <h2 className="mt-3 text-3xl font-semibold text-zinc-50" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
              {heading}
            </h2>

            {activeMode === "join" ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                {invitationStatus === "loading" ? (
                  <p className="m-0">Loading invitation details...</p>
                ) : invitationPayload ? (
                  <>
                    <p className="m-0">
                      Invited workspace: <span className="text-zinc-50">{invitationPayload.organization.name}</span>
                    </p>
                    <p className="mb-0 mt-2">
                      Invite sent to <span className="text-zinc-50">{invitationPayload.invitation.email}</span>
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {activeMode === "register" ? (
                <>
                  <div className="dashboard-form-grid">
                    <label className="field-block">
                      <span className="neo-label">Full name</span>
                      <input
                        className="neo-input mt-2"
                        value={registerForm.fullName}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
                        placeholder="Jane Founder"
                      />
                    </label>

                    <label className="field-block">
                      <span className="neo-label">Work email</span>
                      <input
                        className="neo-input mt-2"
                        type="email"
                        value={registerForm.workEmail}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, workEmail: event.target.value }))}
                        placeholder="jane@company.com"
                      />
                    </label>

                    <label className="field-block">
                      <span className="neo-label">Password</span>
                      <input
                        className="neo-input mt-2"
                        type="password"
                        value={registerForm.password}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                        placeholder="At least 8 characters"
                      />
                    </label>

                    <label className="field-block">
                      <span className="neo-label">Your role</span>
                      <input
                        className="neo-input mt-2"
                        value={registerForm.role}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, role: event.target.value }))}
                        placeholder="Issuer admin"
                      />
                    </label>

                    <label className="field-block">
                      <span className="neo-label">Company name</span>
                      <input
                        className="neo-input mt-2"
                        value={registerForm.companyName}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, companyName: event.target.value }))}
                        placeholder="Acme Training Group"
                      />
                    </label>

                    <label className="field-block">
                      <span className="neo-label">Website</span>
                      <input
                        className="neo-input mt-2"
                        value={registerForm.website}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, website: event.target.value }))}
                        placeholder="https://acmetraining.com"
                      />
                    </label>

                    <label className="field-block">
                      <span className="neo-label">Sector</span>
                      <input
                        className="neo-input mt-2"
                        value={registerForm.sector}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, sector: event.target.value }))}
                        placeholder="Workforce training"
                      />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
                    <p className="m-0">
                      Company slug: <span className="text-zinc-50">{companySlug || "generated after you enter a company name"}</span>
                    </p>
                    <p className="mb-0 mt-2 text-zinc-500">
                      This becomes the internal workspace identifier for your company.
                    </p>
                  </div>
                </>
              ) : null}

              {activeMode === "signin" ? (
                <div className="dashboard-form-grid">
                  <label className="field-block">
                    <span className="neo-label">Work email</span>
                    <input
                      className="neo-input mt-2"
                      type="email"
                      value={signInForm.workEmail}
                      onChange={(event) => setSignInForm((current) => ({ ...current, workEmail: event.target.value }))}
                      placeholder="jane@company.com"
                    />
                  </label>

                  <label className="field-block">
                    <span className="neo-label">Password</span>
                    <input
                      className="neo-input mt-2"
                      type="password"
                      value={signInForm.password}
                      onChange={(event) => setSignInForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Enter your password"
                    />
                  </label>
                </div>
              ) : null}

              {activeMode === "join" ? (
                <div className="dashboard-form-grid">
                  <label className="field-block">
                    <span className="neo-label">Full name</span>
                    <input
                      className="neo-input mt-2"
                      value={joinForm.fullName}
                      onChange={(event) => setJoinForm((current) => ({ ...current, fullName: event.target.value }))}
                      placeholder="Jamie Teammate"
                    />
                  </label>

                  <label className="field-block">
                    <span className="neo-label">Work email</span>
                    <input
                      className="neo-input mt-2"
                      type="email"
                      value={joinForm.workEmail}
                      onChange={(event) => setJoinForm((current) => ({ ...current, workEmail: event.target.value }))}
                      placeholder="jamie@company.com"
                    />
                  </label>

                  <label className="field-block">
                    <span className="neo-label">Password</span>
                    <input
                      className="neo-input mt-2"
                      type="password"
                      value={joinForm.password}
                      onChange={(event) => setJoinForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Use your existing password, or create one"
                    />
                  </label>
                </div>
              ) : null}

              {activeError ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {activeError}
                </div>
              ) : null}

              {googleReady ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-zinc-500">
                    <span className="h-px flex-1 bg-white/10" />
                    Continue with
                    <span className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className={busy ? "pointer-events-none opacity-60" : ""}>
                    <div ref={googleButtonRef} />
                  </div>
                </div>
              ) : null}

              <button type="submit" className="site-button" disabled={busy || invitationStatus === "loading"}>
                {busy
                  ? activeMode === "register"
                    ? "Creating workspace..."
                    : activeMode === "signin"
                      ? "Signing in..."
                      : "Joining workspace..."
                  : activeMode === "register"
                    ? "Create workspace"
                    : activeMode === "signin"
                      ? "Sign in"
                      : "Join workspace"}
              </button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
