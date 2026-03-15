import { useState } from "react";
import { clearIssuerSession, readIssuerSession, writeIssuerSession } from "../lib/issuer-session";

export function useIssuerSession() {
  const [issuerSession, setIssuerSession] = useState(() => readIssuerSession());

  const saveIssuerSession = (session) => {
    writeIssuerSession(session);
    setIssuerSession(session);
    return session;
  };

  const signOutIssuer = () => {
    clearIssuerSession();
    setIssuerSession(null);
  };

  return {
    issuerSession,
    saveIssuerSession,
    signOutIssuer,
  };
}
