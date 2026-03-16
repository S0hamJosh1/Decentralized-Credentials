import { useEffect, useState } from "react";
import { fetchInvitation } from "../lib/api";

export function useInvitationLookup(invitationCode) {
  const [state, setState] = useState({
    status: invitationCode ? "loading" : "idle",
    payload: null,
    error: "",
  });

  useEffect(() => {
    if (!invitationCode) {
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

    fetchInvitation(invitationCode)
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
            error: error.message || "Unable to load invitation.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [invitationCode]);

  return {
    invitationStatus: state.status,
    invitationPayload: state.payload,
    invitationError: state.error,
  };
}
