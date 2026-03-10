import React, { useEffect, useMemo, useState } from "react";
import DashboardApp from "./components/DashboardApp";
import MarketingSite from "./components/MarketingSite";
import VerifyPortal from "./components/VerifyPortal";
import {
  initialCredentials,
  initialIssuers,
  initialOrganization,
  initialTemplates,
} from "./data/productData";
import {
  createCredential,
  createIssuer,
  createTemplate,
  fetchBootstrap,
  revokeCredentialRecord,
  updateOrganization,
} from "./lib/api";
import { buildVerifyPath, parseRoute, pushRoute, resolveVerificationUrl, sitePathForPage } from "./lib/routes";

function createLocalCredential(payload, organization, templates, issuers, credentials) {
  const template = templates.find((item) => item.id === payload.templateId);
  const issuer = issuers.find((item) => item.id === payload.issuerId) || issuers[0];
  const id = `CRD-${String(credentials.length + 1001).padStart(4, "0")}`;
  const numericId = id.replace("CRD-", "");
  const code = template?.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const verificationPath = buildVerifyPath(`NST-${code}-${numericId}`);

  return {
    id,
    organizationId: organization.id,
    verificationCode: verificationPath.replace("/verify/", ""),
    verificationUrl: verificationPath,
    recipientName: payload.recipientName,
    recipientEmail: payload.recipientEmail,
    recipientWallet: payload.recipientWallet,
    templateId: payload.templateId,
    templateName: template?.name || "Custom Certificate",
    issuerId: payload.issuerId,
    issuedBy: issuer?.name || "Authorized Issuer",
    issuedAt: new Date().toISOString().slice(0, 10),
    status: "Valid",
    cohort: payload.cohort,
    summary: payload.summary,
    revokedAt: "",
    revocationReason: "",
  };
}

export default function App() {
  const initialRoute = parseRoute(window.location.pathname);
  const [route, setRoute] = useState(initialRoute);
  const [organization, setOrganization] = useState(initialOrganization);
  const [templates, setTemplates] = useState(initialTemplates);
  const [issuers, setIssuers] = useState(initialIssuers);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [selectedVerificationCode, setSelectedVerificationCode] = useState(
    initialRoute.verificationCode || initialCredentials[0]?.verificationCode || ""
  );
  const [apiMode, setApiMode] = useState("loading");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const handleRouteChange = () => {
      const nextRoute = parseRoute(window.location.pathname);
      setRoute(nextRoute);
      if (nextRoute.view === "verify") {
        setSelectedVerificationCode(
          nextRoute.verificationCode || initialCredentials[0]?.verificationCode || ""
        );
      }
    };

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const bootstrap = await fetchBootstrap();
        setOrganization(bootstrap.organization || initialOrganization);
        setTemplates(bootstrap.templates || []);
        setIssuers(bootstrap.issuers || []);
        setCredentials(bootstrap.credentials || []);
        setSelectedVerificationCode((current) => current || bootstrap.credentials?.[0]?.verificationCode || "");
        setApiMode("ready");
        setApiError("");
      } catch (error) {
        setApiMode("offline");
        setApiError(error.message || "API unavailable. Using seeded demo data.");
      }
    };

    load();
  }, []);

  const dashboardStats = useMemo(() => {
    const validCount = credentials.filter((credential) => credential.status === "Valid").length;
    const revokedCount = credentials.filter((credential) => credential.status === "Revoked").length;

    return {
      credentialCount: credentials.length,
      templateCount: templates.length,
      issuerCount: issuers.filter((issuer) => issuer.status === "Approved").length,
      validCount,
      revokedCount,
    };
  }, [credentials, issuers, templates]);

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

  const issueCredential = async (payload) => {
    if (apiMode === "ready") {
      const nextRecord = await createCredential(payload);
      setCredentials((current) => [nextRecord, ...current]);
      setSelectedVerificationCode(nextRecord.verificationCode);
      return nextRecord;
    }

    const nextRecord = createLocalCredential(payload, organization, templates, issuers, credentials);
    setCredentials((current) => [nextRecord, ...current]);
    setSelectedVerificationCode(nextRecord.verificationCode);
    return nextRecord;
  };

  const revokeCredential = async (credentialId, reason) => {
    if (apiMode === "ready") {
      const nextRecord = await revokeCredentialRecord(credentialId, reason);
      setCredentials((current) =>
        current.map((credential) => (credential.id === credentialId ? nextRecord : credential))
      );
      return nextRecord;
    }

    let revokedRecord = null;
    setCredentials((current) =>
      current.map((credential) => {
        if (credential.id !== credentialId) {
          return credential;
        }

        revokedRecord = {
          ...credential,
          status: "Revoked",
          revokedAt: new Date().toISOString().slice(0, 10),
          revocationReason: reason || "Revoked by an authorized issuer.",
        };

        return revokedRecord;
      })
    );

    return revokedRecord;
  };

  const addTemplate = async (template) => {
    if (apiMode === "ready") {
      const nextTemplate = await createTemplate(template);
      setTemplates((current) => [nextTemplate, ...current]);
      return nextTemplate;
    }

    const localTemplate = {
      id: `TPL-${String(templates.length + 401).padStart(3, "0")}`,
      organizationId: organization.id,
      ...template,
    };
    setTemplates((current) => [localTemplate, ...current]);
    return localTemplate;
  };

  const addIssuer = async (issuer) => {
    if (apiMode === "ready") {
      const nextIssuer = await createIssuer(issuer);
      setIssuers((current) => [nextIssuer, ...current]);
      return nextIssuer;
    }

    const localIssuer = {
      id: `ISS-${issuers.length + 10}`,
      organizationId: organization.id,
      ...issuer,
    };
    setIssuers((current) => [localIssuer, ...current]);
    return localIssuer;
  };

  const saveOrganization = async (nextOrganization) => {
    if (apiMode === "ready") {
      const savedOrganization = await updateOrganization(nextOrganization);
      setOrganization(savedOrganization);
      setCredentials((current) =>
        current.map((credential) => ({
          ...credential,
          organizationId: savedOrganization.id,
          verificationUrl: credential.verificationUrl || buildVerifyPath(credential.verificationCode),
        }))
      );
      return savedOrganization;
    }

    setOrganization(nextOrganization);
    return nextOrganization;
  };

  const sampleCredential = credentials[0] || initialCredentials[0];
  const sampleVerificationUrl = sampleCredential?.verificationUrl
    ? resolveVerificationUrl(sampleCredential.verificationUrl)
    : resolveVerificationUrl(buildVerifyPath(sampleCredential?.verificationCode || ""));

  const sharedProps = {
    organization,
    stats: dashboardStats,
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
        onOpenVerifier={(verificationCode) => openVerifier(verificationCode)}
      />
    );
  }

  if (route.view === "verify") {
    return (
      <VerifyPortal
        {...sharedProps}
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
      onOpenVerifier={(verificationCode) => openVerifier(verificationCode)}
    />
  );
}
