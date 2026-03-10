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

const SITE_VIEW = "site";
const APP_VIEW = "app";
const VERIFY_VIEW = "verify";

function parseHash() {
  const hash = window.location.hash.replace("#", "");

  if (hash === APP_VIEW) {
    return { view: APP_VIEW, verificationCode: "" };
  }

  if (hash.startsWith(`${VERIFY_VIEW}/`)) {
    return {
      view: VERIFY_VIEW,
      verificationCode: decodeURIComponent(hash.replace(`${VERIFY_VIEW}/`, "")),
    };
  }

  if (hash === VERIFY_VIEW) {
    return { view: VERIFY_VIEW, verificationCode: "" };
  }

  return { view: SITE_VIEW, verificationCode: "" };
}

function createCredentialRecord(payload, templateName, issuerName, index) {
  const suffix = String(index).padStart(4, "0");
  const today = new Date().toISOString().slice(0, 10);

  return {
    id: `CRD-${suffix}`,
    verificationCode: `NST-${payload.templateId.split("-")[1]}-${suffix}`,
    recipientName: payload.recipientName,
    recipientEmail: payload.recipientEmail,
    recipientWallet: payload.recipientWallet,
    templateId: payload.templateId,
    templateName,
    issuedBy: issuerName,
    issuedAt: today,
    status: "Valid",
    cohort: payload.cohort,
    summary: payload.summary,
  };
}

export default function App() {
  const initialRoute = parseHash();
  const [view, setView] = useState(initialRoute.view);
  const [organization, setOrganization] = useState(initialOrganization);
  const [templates, setTemplates] = useState(initialTemplates);
  const [issuers, setIssuers] = useState(initialIssuers);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [selectedVerificationCode, setSelectedVerificationCode] = useState(
    initialRoute.verificationCode || initialCredentials[0]?.verificationCode || ""
  );

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = parseHash();
      setView(nextRoute.view);
      if (nextRoute.view === VERIFY_VIEW) {
        setSelectedVerificationCode(nextRoute.verificationCode || initialCredentials[0]?.verificationCode || "");
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
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

  const syncView = (nextView, options = {}) => {
    if (nextView === APP_VIEW) {
      window.location.hash = "app";
      return;
    }

    if (nextView === VERIFY_VIEW) {
      const nextCode = options.verificationCode || selectedVerificationCode;
      window.location.hash = nextCode ? `verify/${encodeURIComponent(nextCode)}` : "verify";
      return;
    }

    window.location.hash = "";
  };

  const issueCredential = (payload) => {
    const template = templates.find((item) => item.id === payload.templateId);
    const issuer = issuers.find((item) => item.id === payload.issuerId) || issuers[0];
    const nextRecord = createCredentialRecord(
      payload,
      template?.name || "Custom Certificate",
      issuer?.name || "Authorized Issuer",
      credentials.length + 1001
    );

    setCredentials((current) => [nextRecord, ...current]);
    setSelectedVerificationCode(nextRecord.verificationCode);
    return nextRecord;
  };

  const revokeCredential = (credentialId) => {
    setCredentials((current) =>
      current.map((credential) =>
        credential.id === credentialId ? { ...credential, status: "Revoked" } : credential
      )
    );
  };

  const addTemplate = (template) => {
    setTemplates((current) => [template, ...current]);
  };

  const addIssuer = (issuer) => {
    setIssuers((current) => [issuer, ...current]);
  };

  const updateOrganization = (nextOrganization) => {
    setOrganization(nextOrganization);
  };

  if (view === APP_VIEW) {
    return (
      <DashboardApp
        organization={organization}
        templates={templates}
        issuers={issuers}
        credentials={credentials}
        stats={dashboardStats}
        onIssueCredential={issueCredential}
        onRevokeCredential={revokeCredential}
        onAddTemplate={addTemplate}
        onAddIssuer={addIssuer}
        onUpdateOrganization={updateOrganization}
        onBackToSite={() => syncView(SITE_VIEW)}
        onOpenVerifier={(verificationCode) => syncView(VERIFY_VIEW, { verificationCode })}
      />
    );
  }

  if (view === VERIFY_VIEW) {
    return (
      <VerifyPortal
        organization={organization}
        credentials={credentials}
        selectedVerificationCode={selectedVerificationCode}
        onSelectVerificationCode={setSelectedVerificationCode}
        onBackToSite={() => syncView(SITE_VIEW)}
        onLaunchApp={() => syncView(APP_VIEW)}
      />
    );
  }

  return (
    <MarketingSite
      organization={organization}
      stats={dashboardStats}
      sampleCredential={credentials[0]}
      onLaunchApp={() => syncView(APP_VIEW)}
      onOpenVerifier={(verificationCode) => syncView(VERIFY_VIEW, { verificationCode })}
    />
  );
}
