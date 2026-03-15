import React, { useState } from "react";
import DashboardApp from "./components/DashboardApp";
import IssuerAccessFlow from "./components/IssuerAccessFlow";
import MarketingSite from "./components/MarketingSite";
import VerifyPortal from "./components/VerifyPortal";
import { initialCredentials } from "./data/productData";
import { useIssuerSession } from "./hooks/useIssuerSession";
import { useProductData } from "./hooks/useProductData";
import { buildVerifyPath, parseRoute, pushRoute } from "./lib/routes";

export default function App() {
  const initialRoute = parseRoute(window.location.pathname);
  const [route, setRoute] = useState(initialRoute);
  const [selectedVerificationCode, setSelectedVerificationCode] = useState(initialRoute.verificationCode || "");
  const { issuerSession, saveIssuerSession, signOutIssuer } = useIssuerSession();
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
    initializeIssuerWorkspace,
  } = useProductData();

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

  const completeIssuerAccess = async (form) => {
    const verificationDomain = window.location.origin;
    const isDemoWorkspace = organization.slug === "northstar-skills";
    let activeOrganization = organization;
    let activeIssuer = null;

    if (isDemoWorkspace) {
      const bootstrap = await initializeIssuerWorkspace({
        ...form,
        verificationDomain,
      });

      activeOrganization = bootstrap.organization;
      activeIssuer = bootstrap.issuer || bootstrap.issuers?.[0] || null;
    } else {
      activeOrganization = await saveOrganization({
        ...organization,
        name: form.companyName,
        slug: form.companySlug,
        sector: form.sector || organization.sector,
        website: form.website || organization.website,
        verificationDomain,
        status: organization.status || "Active",
        description: organization.description || `${form.companyName} issues digital credentials through Credential Foundry.`,
      });

      activeIssuer =
        issuers.find((issuer) =>
          issuer.email?.toLowerCase() === form.workEmail.toLowerCase()
          || issuer.wallet?.toLowerCase() === form.workEmail.toLowerCase()
          || issuer.name.toLowerCase() === form.fullName.toLowerCase()
        ) || null;

      if (!activeIssuer) {
        activeIssuer = await addIssuer({
          name: form.fullName,
          role: form.role || "Issuer admin",
          email: form.workEmail,
          wallet: form.workEmail,
          status: "Approved",
        });
      }
    }

    saveIssuerSession({
      fullName: form.fullName,
      workEmail: form.workEmail,
      role: form.role || "Issuer admin",
      organizationId: activeOrganization.id,
      organizationName: activeOrganization.name,
      issuerId: activeIssuer?.id || "",
      signedInAt: new Date().toISOString(),
    });

    navigateTo("/app");
  };

  const handleOrganizationUpdate = async (payload) => {
    const savedOrganization = await saveOrganization(payload);

    if (issuerSession) {
      saveIssuerSession({
        ...issuerSession,
        organizationId: savedOrganization.id,
        organizationName: savedOrganization.name,
      });
    }

    return savedOrganization;
  };

  const openVerifier = (verificationCode) => {
    const nextCode = verificationCode || selectedVerificationCode || credentials[0]?.verificationCode || "";
    navigateTo(buildVerifyPath(nextCode));
  };

  const sampleCredential = credentials[0] || initialCredentials[0];

  const sharedProps = {
    organization,
    stats,
    apiMode,
    apiError,
  };

  if (route.view === "app") {
    if (!issuerSession) {
      return (
        <IssuerAccessFlow
          organization={organization}
          apiMode={apiMode}
          onComplete={completeIssuerAccess}
        />
      );
    }

    return (
      <DashboardApp
        {...sharedProps}
        issuerSession={issuerSession}
        currentIssuerId={issuerSession.issuerId}
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
        onSignOut={signOutIssuer}
      />
    );
  }

  if (route.view === "verify") {
    return (
      <VerifyPortal
        {...sharedProps}
        activeVerificationCode={route.verificationCode || ""}
        credentials={credentials}
        selectedVerificationCode={selectedVerificationCode}
        onSelectVerificationCode={setSelectedVerificationCode}
        onVerifyCode={openVerifier}
        onBackToSite={() => navigateTo("/")}
        onLaunchApp={() => navigateTo("/app")}
      />
    );
  }

  return (
    <MarketingSite
      {...sharedProps}
      sampleCredential={sampleCredential}
      onLaunchApp={() => navigateTo("/app")}
      onOpenVerifier={openVerifier}
    />
  );
}
