import { useEffect, useMemo, useState } from "react";
import { fetchVerifyRecord } from "../lib/api";

export function useVerifyRecord({ activeVerificationCode, fallbackRecord, fallbackOrganization }) {
  const normalizedCode = useMemo(
    () => activeVerificationCode.trim().toUpperCase(),
    [activeVerificationCode]
  );
  const [lookupState, setLookupState] = useState({
    status: "idle",
    payload: null,
    error: "",
  });

  useEffect(() => {
    if (normalizedCode === "") {
      setLookupState({ status: "idle", payload: null, error: "" });
      return;
    }

    let cancelled = false;
    setLookupState((current) => ({
      status: "loading",
      payload: current.payload,
      error: "",
    }));

    fetchVerifyRecord(normalizedCode)
      .then((payload) => {
        if (!cancelled) {
          setLookupState({ status: "ready", payload, error: "" });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLookupState({ status: "error", payload: null, error: error.message || "Unable to verify credential." });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [normalizedCode]);

  const notFound = lookupState.status === "error" && lookupState.error === "Credential not found.";
  const isLookupLoading = normalizedCode !== "" && lookupState.status === "loading";
  const lookupError = !notFound ? lookupState.error : "";

  return {
    normalizedCode,
    displayOrganization: lookupState.payload?.organization || fallbackOrganization,
    record: notFound ? null : lookupState.payload?.credential || fallbackRecord,
    isLookupLoading,
    lookupError,
    notFound,
  };
}
