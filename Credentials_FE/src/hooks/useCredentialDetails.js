import { useEffect, useState } from "react";
import { fetchCredentialDetails } from "../lib/api";

export function useCredentialDetails(credentialId, refreshToken = 0) {
  const [state, setState] = useState({
    status: "idle",
    payload: null,
    error: "",
  });

  useEffect(() => {
    if (!credentialId) {
      setState({
        status: "idle",
        payload: null,
        error: "",
      });
      return;
    }

    let cancelled = false;
    setState({
      status: "loading",
      payload: null,
      error: "",
    });

    fetchCredentialDetails(credentialId)
      .then((payload) => {
        if (!cancelled) {
          setState({
            status: "ready",
            payload,
            error: "",
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "error",
            payload: null,
            error: error.message || "Unable to load credential details.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [credentialId, refreshToken]);

  return state;
}
