import React, { useMemo, useState } from "react";
import DashboardApp from "./components/DashboardApp";
import IssuerAccessFlow from "./components/IssuerAccessFlow";
import VerifyPortal from "./components/VerifyPortal";
import { useAuthSession } from "./hooks/useAuthSession";
import { useProductData } from "./hooks/useProductData";
import { EMPTY_ORGANIZATION } from "./lib/company";
import { buildVerifyPath, parseRoute, pushRoute } from "./lib/routes";

function WorkspaceLoading({ title, body }) {
  return (
    <div className="site-shell min-h-screen text-stone-100">
      <div className="site-orb site-orb-left" />
      <div className="site-orb site-orb-right" />

      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-5 py-6 md:px-8 md:py-8">
        <section className="site-panel w-full">
          <p className="site-panel-label">Credential Foundry</p>
          <h1 className="mt-3 text-3xl font-semibold text-zinc-50" style={{ fontFamily: "'Fraunces', Georgia, serif" }}>
            {title}
          </h1>
          <p className="site-lede mt-4">{body}</p>
        </section>
      </div>
    </div>
  );
}

export default function App() {
  const initialRoute = parseRoute(window.location.pathname);
  const [route, setRoute] = useState(initialRoute);
  const [selectedVerificationCode, setSelectedVerificationCode] = useState(initialRoute.verificationCode || "");
  const {
    authStatus,
    authSession,
    authError,
    registerWorkspace,
    registerWorkspaceWithGoogle,
    signInAccount,
    signInWithGoogle,
    signOutAccount,
    refreshSession,
    clearAuthSession,
  } = useAuthSession();
  const {
    organization,
    templates,
    issuers,
    credentials,
    apiMode,
    apiError,
    stats,
    issueCredential,
    revokeCredential,
    addTemplate,
    addIssuer,
    saveOrganization,
  } = useProductData({
    authStatus,
    onUnauthorized: clearAuthSession,
  });

  React.useEffect(() => {
    const handleRouteChange = () => {
      const nextRoute = parseRoute(window.location.pathname);
      setRoute(nextRoute);
      if (nextRoute.view === "verify") {
        setSelectedVerificationCode(nextRoute.verificationCode || "");
      }
    };

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  const navigateTo = (pathname) => {
    pushRoute(pathname);
  };

  const workspaceSession = useMemo(() => {
    if (!authSession) {
      return null;
    }

    return {
      fullName: authSession.user.fullName,
      workEmail: authSession.user.email,
      role: authSession.issuer?.role || authSession.membership?.role || "Owner",
      organizationId: authSession.organization?.id || "",
      organizationName: authSession.organization?.name || "",
      issuerId: authSession.issuer?.id || "",
      signedInAt: authSession.session?.createdAt || "",
    };
  }, [authSession]);

  const handleRegister = async (form) => {
    await registerWorkspace({
      ...form,
      verificationDomain: window.location.origin,
    });
    navigateTo("/");
  };

  const handleSignIn = async (form) => {
    await signInAccount(form);
    navigateTo("/");
  };

  const handleGoogleRegister = async (form) => {
    await registerWorkspaceWithGoogle({
      ...form,
      verificationDomain: window.location.origin,
    });
    navigateTo("/");
  };

  const handleGoogleSignIn = async (form) => {
    await signInWithGoogle(form);
    navigateTo("/");
  };

  const handleOrganizationUpdate = async (payload) => {
    const savedOrganization = await saveOrganization(payload);
    await refreshSession();
    return savedOrganization;
  };

  const openVerifier = (verificationCode) => {
    const nextCode = verificationCode || selectedVerificationCode || credentials[0]?.verificationCode || "";
    navigateTo(buildVerifyPath(nextCode));
  };

  if (route.view === "verify") {
    return (
      <VerifyPortal
        organization={organization || EMPTY_ORGANIZATION}
        credentials={credentials}
        activeVerificationCode={route.verificationCode || ""}
        selectedVerificationCode={selectedVerificationCode}
        onSelectVerificationCode={setSelectedVerificationCode}
        onVerifyCode={openVerifier}
        onBackToSite={() => navigateTo("/")}
        onLaunchApp={() => navigateTo("/")}
        apiError=""
      />
    );
  }

  if (authStatus === "loading") {
    return (
      <WorkspaceLoading
        title="Loading secure workspace access."
        body="Checking your session and preparing the company workspace."
      />
    );
  }

  if (authStatus !== "authenticated") {
    return (
      <IssuerAccessFlow
        authError={authError}
        onRegister={handleRegister}
        onSignIn={handleSignIn}
        onGoogleRegister={handleGoogleRegister}
        onGoogleSignIn={handleGoogleSignIn}
      />
    );
  }

  if (apiMode === "loading") {
    return (
      <WorkspaceLoading
        title="Loading your company workspace."
        body="Pulling organization settings, issuer access, templates, and credentials."
      />
    );
  }

  if (apiMode === "error") {
    return (
      <WorkspaceLoading
        title="Workspace unavailable."
        body={apiError || "We could not load your workspace data right now. Please try signing in again."}
      />
    );
  }

  return (
    <DashboardApp
      organization={organization}
      stats={stats}
      apiMode={apiMode}
      apiError={apiError}
      issuerSession={workspaceSession}
      currentIssuerId={workspaceSession?.issuerId || ""}
      templates={templates}
      issuers={issuers}
      credentials={credentials}
      onIssueCredential={issueCredential}
      onRevokeCredential={revokeCredential}
      onAddTemplate={addTemplate}
      onAddIssuer={addIssuer}
      onUpdateOrganization={handleOrganizationUpdate}
      onBackToSite={() => navigateTo("/")}
      onOpenVerifier={openVerifier}
      onSignOut={signOutAccount}
    />
  );
}
