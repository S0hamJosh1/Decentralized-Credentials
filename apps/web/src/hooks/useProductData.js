import { useEffect, useMemo, useState } from "react";
import {
  createTeamInvitation,
  createCredential,
  createIssuer,
  createTemplate,
  fetchBootstrap,
  resendTeamInvitation,
  revokeCredentialRecord,
  revokeTeamInvitation,
  updateIssuerRecord,
  updateOrganization,
  updateTemplateRecord,
} from "../lib/api";
import { EMPTY_ORGANIZATION } from "../lib/company";

function emptyWorkspaceState() {
  return {
    organization: EMPTY_ORGANIZATION,
    templates: [],
    issuers: [],
    credentials: [],
    activity: [],
    members: [],
    invitations: [],
  };
}

export function useProductData({ authStatus, onUnauthorized }) {
  const [organization, setOrganization] = useState(EMPTY_ORGANIZATION);
  const [templates, setTemplates] = useState([]);
  const [issuers, setIssuers] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [activity, setActivity] = useState([]);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [apiMode, setApiMode] = useState("idle");
  const [apiError, setApiError] = useState("");

  const resetWorkspace = () => {
    const nextState = emptyWorkspaceState();
    setOrganization(nextState.organization);
    setTemplates(nextState.templates);
    setIssuers(nextState.issuers);
    setCredentials(nextState.credentials);
    setActivity(nextState.activity);
    setMembers(nextState.members);
    setInvitations(nextState.invitations);
  };

  const applyWorkspace = (bootstrap) => {
    setOrganization(bootstrap.organization || EMPTY_ORGANIZATION);
    setTemplates(bootstrap.templates || []);
    setIssuers(bootstrap.issuers || []);
    setCredentials(bootstrap.credentials || []);
    setActivity(bootstrap.activity || []);
    setMembers(bootstrap.members || []);
    setInvitations(bootstrap.invitations || []);
    setApiMode("ready");
  };

  const refreshWorkspace = async () => {
    try {
      const bootstrap = await fetchBootstrap();
      applyWorkspace(bootstrap);
      setApiError("");
      return bootstrap;
    } catch (error) {
      if (error.status === 401) {
        onUnauthorized?.();
        throw new Error("Your session expired. Please sign in again.");
      }

      resetWorkspace();
      setApiMode("error");
      setApiError(error.message || "Workspace data is unavailable right now.");
      throw error;
    }
  };

  useEffect(() => {
    if (authStatus === "loading") {
      setApiMode("loading");
      setApiError("");
      return;
    }

    if (authStatus !== "authenticated") {
      resetWorkspace();
      setApiMode("idle");
      setApiError("");
      return;
    }

    let cancelled = false;
    setApiMode("loading");
    setApiError("");

    fetchBootstrap()
      .then((bootstrap) => {
        if (!cancelled) {
          applyWorkspace(bootstrap);
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        if (error.status === 401) {
          onUnauthorized?.();
          return;
        }

        resetWorkspace();
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
      await refreshWorkspace();
      return nextRecord;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const revokeCredential = async (credentialId, reason) => {
    try {
      const nextRecord = await revokeCredentialRecord(credentialId, reason);
      await refreshWorkspace();
      return nextRecord;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const addTemplate = async (payload) => {
    try {
      const nextTemplate = await createTemplate(payload);
      await refreshWorkspace();
      return nextTemplate;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const updateTemplate = async (templateId, payload) => {
    try {
      const nextTemplate = await updateTemplateRecord(templateId, payload);
      await refreshWorkspace();
      return nextTemplate;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const addIssuer = async (payload) => {
    try {
      const nextIssuer = await createIssuer(payload);
      await refreshWorkspace();
      return nextIssuer;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const updateIssuer = async (issuerId, payload) => {
    try {
      const nextIssuer = await updateIssuerRecord(issuerId, payload);
      await refreshWorkspace();
      return nextIssuer;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const saveOrganization = async (payload) => {
    try {
      const savedOrganization = await updateOrganization(payload);
      await refreshWorkspace();
      return savedOrganization;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const inviteTeamMember = async (payload) => {
    try {
      const invitation = await createTeamInvitation(payload);
      await refreshWorkspace();
      return invitation;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const resendInvitation = async (invitationId) => {
    try {
      const invitation = await resendTeamInvitation(invitationId);
      await refreshWorkspace();
      return invitation;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  const revokeInvitation = async (invitationId) => {
    try {
      const invitation = await revokeTeamInvitation(invitationId);
      await refreshWorkspace();
      return invitation;
    } catch (error) {
      handleProtectedError(error);
    }
  };

  return {
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
    addTemplate,
    updateTemplate,
    addIssuer,
    updateIssuer,
    saveOrganization,
    inviteTeamMember,
    resendInvitation,
    revokeInvitation,
    refreshWorkspace,
  };
}
