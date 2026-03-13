import { useEffect, useMemo, useState } from "react";
import {
  initialCredentials,
  initialIssuers,
  initialOrganization,
  initialTemplates,
} from "../data/productData";
import {
  createCredential,
  createIssuer,
  createTemplate,
  fetchBootstrap,
  revokeCredentialRecord,
  updateOrganization,
} from "../lib/api";
import {
  createLocalCredential,
  createLocalIssuer,
  createLocalTemplate,
  revokeLocalCredential,
} from "../lib/local-product";
import { buildVerifyPath } from "../lib/routes";

export function useProductData() {
  const [organization, setOrganization] = useState(initialOrganization);
  const [templates, setTemplates] = useState(initialTemplates);
  const [issuers, setIssuers] = useState(initialIssuers);
  const [credentials, setCredentials] = useState(initialCredentials);
  const [apiMode, setApiMode] = useState("loading");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const bootstrap = await fetchBootstrap();
        setOrganization(bootstrap.organization || initialOrganization);
        setTemplates(bootstrap.templates || []);
        setIssuers(bootstrap.issuers || []);
        setCredentials(bootstrap.credentials || []);
        setApiMode("ready");
        setApiError("");
      } catch (error) {
        setApiMode("offline");
        setApiError(error.message || "API unavailable. Using seeded demo data.");
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
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

  const issueCredential = async (payload) => {
    if (apiMode === "ready") {
      const nextRecord = await createCredential(payload);
      setCredentials((current) => [nextRecord, ...current]);
      return nextRecord;
    }

    const nextRecord = createLocalCredential(payload, organization, templates, issuers, credentials);
    setCredentials((current) => [nextRecord, ...current]);
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

    const { nextCredentials, revokedRecord } = revokeLocalCredential(credentials, credentialId, reason);
    setCredentials(nextCredentials);
    return revokedRecord;
  };

  const addTemplate = async (payload) => {
    if (apiMode === "ready") {
      const nextTemplate = await createTemplate(payload);
      setTemplates((current) => [nextTemplate, ...current]);
      return nextTemplate;
    }

    const nextTemplate = createLocalTemplate(payload, organization.id, templates);
    setTemplates((current) => [nextTemplate, ...current]);
    return nextTemplate;
  };

  const addIssuer = async (payload) => {
    if (apiMode === "ready") {
      const nextIssuer = await createIssuer(payload);
      setIssuers((current) => [nextIssuer, ...current]);
      return nextIssuer;
    }

    const nextIssuer = createLocalIssuer(payload, organization.id, issuers);
    setIssuers((current) => [nextIssuer, ...current]);
    return nextIssuer;
  };

  const saveOrganization = async (payload) => {
    if (apiMode === "ready") {
      const savedOrganization = await updateOrganization(payload);
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

    setOrganization(payload);
    return payload;
  };

  return {
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
  };
}
