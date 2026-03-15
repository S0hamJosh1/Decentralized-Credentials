import { useEffect, useMemo, useState } from "react";
import {
  createCredential,
  createIssuer,
  createTemplate,
  fetchBootstrap,
  revokeCredentialRecord,
  updateOrganization,
} from "../lib/api";
import { EMPTY_ORGANIZATION } from "../lib/company";

function emptyWorkspaceState() {
  return {
    organization: EMPTY_ORGANIZATION,
    templates: [],
    issuers: [],
    credentials: [],
  };
}

export function useProductData({ authStatus, onUnauthorized }) {
  const [organization, setOrganization] = useState(EMPTY_ORGANIZATION);
  const [templates, setTemplates] = useState([]);
  const [issuers, setIssuers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [apiMode, setApiMode] = useState("idle");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (authStatus === "loading") {
      setApiMode("loading");
      setApiError("");
      return;
    }

    if (authStatus !== "authenticated") {
      const nextState = emptyWorkspaceState();
      setOrganization(nextState.organization);
      setTemplates(nextState.templates);
      setIssuers(nextState.issuers);
      setCredentials(nextState.credentials);
      setApiMode("idle");
      setApiError("");
      return;
    }

    let cancelled = false;
    setApiMode("loading");
    setApiError("");

    fetchBootstrap()
      .then((bootstrap) => {
        if (cancelled) {
          return;
        }

        setOrganization(bootstrap.organization || EMPTY_ORGANIZATION);
        setTemplates(bootstrap.templates || []);
        setIssuers(bootstrap.issuers || []);
        setCredentials(bootstrap.credentials || []);
        setApiMode("ready");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        if (error.status === 401) {
          onUnauthorized?.();
          return;
        }

        const nextState = emptyWorkspaceState();
        setOrganization(nextState.organization);
        setTemplates(nextState.templates);
        setIssuers(nextState.issuers);
        setCredentials(nextState.credentials);
        setApiMode("error");
        setApiError(error.message || "Workspace data is unavailable right now.");
      });

    return () => {
      cancelled = true;
    };
  }, [authStatus, onUnauthorized]);

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

  const handleProtectedError = (error) => {
    if (error.status === 401) {
      onUnauthorized?.();
      throw new Error("Your session expired. Please sign in again.");
    }

    throw error;
  };

  const issueCredential = async (payload) => {
    try {
      const nextRecord = await createCredential(payload);
      setCredentials((current) => [nextRecord, ...current]);
      return nextRecord;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const revokeCredential = async (credentialId, reason) => {
    try {
      const nextRecord = await revokeCredentialRecord(credentialId, reason);
      setCredentials((current) =>
        current.map((credential) => (credential.id === credentialId ? nextRecord : credential))
      );
      return nextRecord;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const addTemplate = async (payload) => {
    try {
      const nextTemplate = await createTemplate(payload);
      setTemplates((current) => [nextTemplate, ...current]);
      return nextTemplate;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const addIssuer = async (payload) => {
    try {
      const nextIssuer = await createIssuer(payload);
      setIssuers((current) => [nextIssuer, ...current]);
      return nextIssuer;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const saveOrganization = async (payload) => {
    try {
      const savedOrganization = await updateOrganization(payload);
      setOrganization(savedOrganization);
      return savedOrganization;
    } catch (error) {
      handleProtectedError(error);
    }
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
