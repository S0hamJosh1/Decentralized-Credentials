import React, { useState } from "react";
import DashboardApp from "./components/DashboardApp";
import MarketingSite from "./components/MarketingSite";
import VerifyPortal from "./components/VerifyPortal";
import { initialCredentials } from "./data/productData";
import { useProductData } from "./hooks/useProductData";
import { buildVerifyPath, parseRoute, pushRoute, resolveVerificationUrl, sitePathForPage } from "./lib/routes";

export default function App() {
  const initialRoute = parseRoute(window.location.pathname);
  const [route, setRoute] = useState(initialRoute);
  const [selectedVerificationCode, setSelectedVerificationCode] = useState(initialRoute.verificationCode || "");
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

  const navigateTo = (pathname, options = {}) => {
    pushRoute(pathname, options);
  };

  const openSitePage = (page = "home") => {
    navigateTo(sitePathForPage(page));
  };

  const openVerifier = (verificationCode) => {
    const nextCode = verificationCode || selectedVerificationCode || credentials[0]?.verificationCode || "";
    navigateTo(buildVerifyPath(nextCode));
  };

  const sampleCredential = credentials[0] || initialCredentials[0];
  const sampleVerificationUrl = sampleCredential?.verificationUrl
    ? resolveVerificationUrl(sampleCredential.verificationUrl)
    : resolveVerificationUrl(buildVerifyPath(sampleCredential?.verificationCode || ""));

  const sharedProps = {
    organization,
    stats,
    apiMode,
    apiError,
  };

  if (route.view === "app") {
    return (
      <DashboardApp
        {...sharedProps}
        templates={templates}
        issuers={issuers}
        credentials={credentials}
        onIssueCredential={issueCredential}
        onRevokeCredential={revokeCredential}
        onAddTemplate={addTemplate}
        onAddIssuer={addIssuer}
        onUpdateOrganization={saveOrganization}
        onBackToSite={() => openSitePage("home")}
        onOpenVerifier={openVerifier}
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
        onBackToSite={() => openSitePage("home")}
        onLaunchApp={() => navigateTo("/app")}
      />
    );
  }

  return (
    <MarketingSite
      {...sharedProps}
      currentPage={route.page}
      sampleCredential={sampleCredential}
      sampleVerificationUrl={sampleVerificationUrl}
      onNavigatePage={openSitePage}
      onLaunchApp={() => navigateTo("/app")}
      onOpenVerifier={openVerifier}
    />
  );
}
