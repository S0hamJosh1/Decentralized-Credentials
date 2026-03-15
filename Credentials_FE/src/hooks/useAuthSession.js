import { useCallback, useEffect, useState } from "react";
import {
  fetchAuthSession,
  loginAccount,
  logoutAccount,
  registerAccount,
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
    signOutAccount,
    refreshSession,
    clearAuthSession,
  };
}
