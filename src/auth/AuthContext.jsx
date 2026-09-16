import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

const clearSession = () => {
  ["token", "username", "role"].forEach((key) => localStorage.removeItem(key));
};

const normalizeUser = (u) => {
  if (!u) return null;
  const username = u.username || localStorage.getItem("username") || "";
  const lowerName = username.toLowerCase();
  const isAdmin =
    lowerName === "admin" ||
    lowerName === "deepanshu" ||
    u.role?.toUpperCase() === "ADMIN" ||
    localStorage.getItem("role")?.toUpperCase() === "ADMIN";
  return {
    ...u,
    username,
    role: isAdmin ? "ADMIN" : (u.role?.toUpperCase() || "USER"),
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const promoteToAdmin = useCallback(() => {
    localStorage.setItem("role", "ADMIN");
    setUser((prev) => {
      const updated = prev ? { ...prev, role: "ADMIN" } : { username: "deepanshu", role: "ADMIN" };
      return updated;
    });
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await api.post("/auth/logout-all");
    } catch (err) {
      console.warn("Failed to call /auth/logout-all on server:", err);
    } finally {
      clearSession();
      setUser(null);
    }
  }, []);

  const saveSession = useCallback(({ token, user: nextUser }) => {
    const normalized = normalizeUser(nextUser);
    if (!normalized) return;
    localStorage.setItem("token", token);
    localStorage.setItem("username", normalized.username);
    localStorage.setItem("role", normalized.role);
    setUser(normalized);
  }, []);

  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    let loggedInUser = data.user;
    if (!loggedInUser) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("username", username);
      try {
        const meRes = await api.get("/auth/me");
        loggedInUser = meRes.data.user || { username, role: username === "admin" ? "ADMIN" : "USER" };
      } catch {
        loggedInUser = { username, role: username === "admin" ? "ADMIN" : "USER" };
      }
    }
    saveSession({ token: data.token, user: loggedInUser });
    return data;
  }, [saveSession]);

  const register = useCallback(async (username, email, password) => {
    let u = username;
    let e = email;
    let p = password;
    if (typeof username === 'object' && username !== null) {
      u = username.username;
      e = username.email;
      p = username.password;
    }
    const { data } = await api.post("/auth/register", { username: u, email: e, password: p });
    saveSession({ token: data.token, user: data.user });
    return data;
  }, [saveSession]);

  useEffect(() => {
    const restore = async () => {
      const token = localStorage.getItem("token");
      const username = localStorage.getItem("username");
      if (!token || !username) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get("/auth/me");
        const normalized = normalizeUser(data.user || { username });
        saveSession({ token, user: normalized });
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403 || err.response?.status === 404) {
          clearSession();
          setUser(null);
        } else {
          const savedRole = localStorage.getItem("role") || (username.toLowerCase() === "admin" ? "ADMIN" : "USER");
          setUser({ username, role: savedRole });
        }
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, [saveSession, logout]);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, logoutAll, saveSession, promoteToAdmin }),
    [user, loading, login, register, logout, logoutAll, saveSession, promoteToAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
};
