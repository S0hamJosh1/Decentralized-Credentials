import { useCallback, useEffect, useState } from "react";
import {
  acceptGoogleInvitation,
  acceptInvitation,
  fetchAuthSession,
  loginGoogleAccount,
  loginAccount,
  logoutAccount,
  registerGoogleAccount,
  registerAccount,
  switchWorkspace,
} from "../lib/api";

export function useAuthSession() {
  const [state, setState] = useState({
    status: "loading",
    session: null,
    error: "",
  });

  const clearAuthSession = useCallback(() => {
    setState({
      status: "unauthenticated",
      session: null,
      error: "",
    });
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      setState({
        status: "authenticated",
        session,
        error: "",
      });
      return session;
    } catch (error) {
      if (error.status === 401) {
        clearAuthSession();
        return null;
      }

      setState({
        status: "error",
        session: null,
        error: error.message || "Unable to reach the authentication service.",
      });
      return null;
    }
  }, [clearAuthSession]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const registerWorkspace = async (payload) => {
    try {
      const session = await registerAccount(payload);
      setState({
        status: "authenticated",
        session,
        error: "",
      });
      return session;
    } catch (error) {
      setState((current) => ({
        ...current,
        status: current.session ? "authenticated" : "unauthenticated",
        error: error.message || "Unable to create your workspace account.",
      }));
      throw error;
    }
  };

  const signInAccount = async (payload) => {
    try {
      const session = await loginAccount(payload);
      setState({
        status: "authenticated",
        session,
        error: "",
      });
      return session;
    } catch (error) {
      setState({
        status: "unauthenticated",
        session: null,
        error: error.message || "Unable to sign in.",
      });
      throw error;
    }
  };

  const registerWorkspaceWithGoogle = async (payload) => {
    try {
      const session = await registerGoogleAccount(payload);
      setState({
        status: "authenticated",
        session,
        error: "",
      });
      return session;
    } catch (error) {
      setState((current) => ({
        ...current,
        status: current.session ? "authenticated" : "unauthenticated",
        error: error.message || "Unable to create your workspace with Google.",
      }));
      throw error;
    }
  };

  const signInWithGoogle = async (payload) => {
    try {
      const session = await loginGoogleAccount(payload);
      setState({
        status: "authenticated",
        session,
        error: "",
      });
      return session;
    } catch (error) {
      setState({
        status: "unauthenticated",
        session: null,
        error: error.message || "Unable to sign in with Google.",
      });
      throw error;
    }
  };

  const acceptWorkspaceInvitation = async (payload) => {
    try {
      const session = await acceptInvitation(payload);
      setState({
        status: "authenticated",
        session,
        error: "",
      });
      return session;
    } catch (error) {
      setState({
        status: "unauthenticated",
        session: null,
        error: error.message || "Unable to accept the workspace invitation.",
      });
      throw error;
    }
  };

  const acceptWorkspaceInvitationWithGoogle = async (payload) => {
    try {
      const session = await acceptGoogleInvitation(payload);
      setState({
        status: "authenticated",
        session,
        error: "",
      });
      return session;
    } catch (error) {
      setState({
        status: "unauthenticated",
        session: null,
        error: error.message || "Unable to accept the workspace invitation with Google.",
      });
      throw error;
    }
  };

  const switchActiveWorkspace = async (organizationId) => {
    try {
      const session = await switchWorkspace({ organizationId });
      setState({
        status: "authenticated",
        session,
        error: "",
      });
      return session;
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error.message || "Unable to switch workspaces.",
      }));
      throw error;
    }
  };

  const signOutAccount = async () => {
    try {
      await logoutAccount();
    } finally {
      clearAuthSession();
    }
  };

  return {
    authStatus: state.status,
    authSession: state.session,
    authError: state.error,
    registerWorkspace,
    signInAccount,
    registerWorkspaceWithGoogle,
    signInWithGoogle,
    acceptWorkspaceInvitation,
    acceptWorkspaceInvitationWithGoogle,
    switchActiveWorkspace,
    signOutAccount,
    refreshSession,
    clearAuthSession,
  };
}
