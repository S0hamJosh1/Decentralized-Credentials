import React, { useMemo, useState } from "react";
import DashboardApp from "./components/DashboardApp";
import IssuerAccessFlow from "./components/IssuerAccessFlow";
import VerifyPortal from "./components/VerifyPortal";
import { useAuthSession } from "./hooks/useAuthSession";
import { useInvitationLookup } from "./hooks/useInvitationLookup";
import { useProductData } from "./hooks/useProductData";
import { useWalletSession } from "./hooks/useWalletSession";
import { normalizeWalletAddress } from "./lib/blockchain";
import { EMPTY_ORGANIZATION } from "./lib/company";
import {
  isSepoliaContractConfigured,
  issueCredentialOnSepolia,
  revokeCredentialOnSepolia,
} from "./lib/credential-registry";
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
    requestWorkspacePasswordReset,
    resetWorkspacePassword,
    signInWithGoogle,
    acceptWorkspaceInvitation,
    acceptWorkspaceInvitationWithGoogle,
    switchActiveWorkspace,
    signOutAccount,
    refreshSession,
    clearAuthSession,
  } = useAuthSession();
  const {
    organization,
    templates,
    issuers,
    credentials,
    activity,
    members,
    invitations,
    apiMode,
    apiError,
    stats,
    issueCredential,
    revokeCredential,
    saveCredentialAnchor,
    revokeCredentialWithAnchor,
    addTemplate,
    updateTemplate,
    addIssuer,
    updateIssuer,
    linkIssuerWallet,
    saveOrganization,
    inviteTeamMember,
    resendInvitation,
    revokeInvitation,
    refreshWorkspace,
  } = useProductData({
    authStatus,
    onUnauthorized: clearAuthSession,
  });
  const walletSession = useWalletSession();
  const { invitationStatus, invitationPayload, invitationError } = useInvitationLookup(
    route.view === "join" ? route.invitationCode || "" : ""
  );

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
      membershipRole: authSession.membership?.role || "Member",
      organizationId: authSession.organization?.id || "",
      organizationName: authSession.organization?.name || "",
      issuerId: authSession.issuer?.id || "",
      issuerWallet: authSession.issuer?.wallet || "",
      issuerWalletVerifiedAt: authSession.issuer?.walletVerifiedAt || "",
      signedInAt: authSession.session?.createdAt || "",
      workspaces: authSession.workspaces || [],
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

  const handlePasswordResetRequest = async (form) => {
    return requestWorkspacePasswordReset(form);
  };

  const handlePasswordReset = async (form) => {
    const result = await resetWorkspacePassword({
      ...form,
      token: route.resetToken,
    });
    navigateTo("/");
    return result;
  };

  const handleAcceptInvitation = async (form) => {
    await acceptWorkspaceInvitation({
      ...form,
      invitationCode: route.invitationCode,
    });
    navigateTo("/");
  };

  const handleAcceptInvitationWithGoogle = async (form) => {
    await acceptWorkspaceInvitationWithGoogle({
      ...form,
      invitationCode: route.invitationCode,
    });
    navigateTo("/");
  };

  const handleOrganizationUpdate = async (payload) => {
    const savedOrganization = await saveOrganization(payload);
    await refreshSession();
    return savedOrganization;
  };

  const handleWorkspaceSwitch = async (organizationId) => {
    await switchActiveWorkspace(organizationId);
    await refreshWorkspace();
  };

  const handleIssuerWalletLink = async (issuerId, wallet) => {
    const nextIssuer = await linkIssuerWallet(issuerId, wallet);
    await refreshSession();
    return nextIssuer;
  };

  const ensureSepoliaIssuePrerequisites = () => {
    if (!walletSession.isMetaMaskAvailable) {
      throw new Error("MetaMask is required for Sepolia-anchored issuance.");
    }

    if (!walletSession.account) {
      throw new Error("Connect MetaMask before issuing on Sepolia.");
    }

    if (!walletSession.isSupportedNetwork) {
      throw new Error("Switch MetaMask to Sepolia before issuing.");
    }

    const linkedWallet = normalizeWalletAddress(authSession?.issuer?.wallet || "");
    const connectedWallet = normalizeWalletAddress(walletSession.account || "");

    if (!linkedWallet) {
      throw new Error("Link your issuer wallet before issuing on Sepolia.");
    }

    if (linkedWallet !== connectedWallet) {
      throw new Error("The connected MetaMask account does not match your linked issuer wallet.");
    }
  };

  const handleIssueCredential = async (payload) => {
    const shouldAnchorOnSepolia = isSepoliaContractConfigured();

    if (shouldAnchorOnSepolia) {
      ensureSepoliaIssuePrerequisites();
    }

    const createdRecord = await issueCredential(payload);

    if (!shouldAnchorOnSepolia) {
      return createdRecord;
    }

    try {
      const anchor = await issueCredentialOnSepolia(createdRecord);
      return saveCredentialAnchor(createdRecord.id, {
        ...anchor,
        credentialHash: createdRecord.credentialHash,
      });
    } catch (error) {
      await refreshWorkspace();
      throw new Error(
        `${error.message || "Unable to anchor on Sepolia."} The credential record was still created in the workspace and remains ready for anchoring.`
      );
    }
  };

  const handleRevokeCredential = async (credentialId, reason) => {
    const credential = credentials.find((item) => item.id === credentialId);

    if (!credential) {
      throw new Error("Credential not found in the current workspace.");
    }

    const shouldUseOnChainRevoke =
      isSepoliaContractConfigured()
      && ["Anchored", "RevokedOnChain"].includes(credential.anchorStatus || "");

    if (!shouldUseOnChainRevoke) {
      return revokeCredential(credentialId, reason);
    }

    ensureSepoliaIssuePrerequisites();
    const anchor = await revokeCredentialOnSepolia(credentialId);
    return revokeCredentialWithAnchor(credentialId, reason, anchor);
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
        authError={route.view === "join" ? invitationError || authError : authError}
        invitationCode={route.view === "join" ? route.invitationCode || "" : ""}
        invitationStatus={route.view === "join" ? invitationStatus : "idle"}
        invitationPayload={route.view === "join" ? invitationPayload : null}
        resetToken={route.view === "reset-password" ? route.resetToken || "" : ""}
        onRegister={handleRegister}
        onSignIn={handleSignIn}
        onRequestPasswordReset={handlePasswordResetRequest}
        onResetPassword={handlePasswordReset}
        onGoogleRegister={handleGoogleRegister}
        onGoogleSignIn={handleGoogleSignIn}
        onAcceptInvitation={handleAcceptInvitation}
        onAcceptInvitationWithGoogle={handleAcceptInvitationWithGoogle}
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
      activity={activity}
      members={members}
      invitations={invitations}
      onIssueCredential={handleIssueCredential}
      onRevokeCredential={handleRevokeCredential}
      onAddTemplate={addTemplate}
      onUpdateTemplate={updateTemplate}
      onAddIssuer={addIssuer}
      onUpdateIssuer={updateIssuer}
      onInviteTeamMember={inviteTeamMember}
      onResendInvitation={resendInvitation}
      onRevokeInvitation={revokeInvitation}
      onUpdateOrganization={handleOrganizationUpdate}
      onSwitchWorkspace={handleWorkspaceSwitch}
      onBackToSite={() => navigateTo("/")}
      onOpenVerifier={openVerifier}
      onSignOut={signOutAccount}
      walletState={walletSession}
      onConnectWallet={walletSession.connectWallet}
      onSwitchWalletNetwork={walletSession.switchToSepolia}
      onLinkIssuerWallet={handleIssuerWalletLink}
    />
  );
}
