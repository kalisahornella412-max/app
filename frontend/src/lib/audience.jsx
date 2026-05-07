import { createContext, useContext, useEffect, useState } from "react";

const AudienceContext = createContext(null);

const KEY = "hyh_audience";

export function AudienceProvider({ children }) {
  const [audience, setAudienceState] = useState(() => {
    try { return localStorage.getItem(KEY) || "youth"; }
    catch { return "youth"; }
  });

  function setAudience(v) {
    setAudienceState(v);
    try { localStorage.setItem(KEY, v); } catch {}
  }

  useEffect(() => {
    document.documentElement.setAttribute("data-audience", audience);
  }, [audience]);

  return (
    <AudienceContext.Provider value={{ audience, setAudience }}>
      {children}
    </AudienceContext.Provider>
  );
}

export const useAudience = () => useContext(AudienceContext);
