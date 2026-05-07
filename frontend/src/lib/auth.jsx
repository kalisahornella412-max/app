import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiErrorDetail } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // null = checking; false = unauthenticated; object = user
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    try {
      // Suppress 401 console noise for anon visitors
      const { data } = await api.get("/auth/me", { validateStatus: (s) => s < 500 });
      if (data && data.email) {
        setUser(data);
        return data;
      }
      setUser(false);
      return null;
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
