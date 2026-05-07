import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = checking; false = unauthenticated; object = user
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      return data;
    } catch {
      setUser(false);
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    setUser(data);
    return data;
  }

  async function register(email, password, name) {
    const { data } = await api.post("/auth/register", { email, password, name });
    setUser(data);
    return data;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {}
    setUser(false);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, refresh, formatApiErrorDetail }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
