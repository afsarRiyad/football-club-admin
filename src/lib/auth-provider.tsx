"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { setTokens, clearTokens, getAccessToken } from "./api";

export type UserRole = "SUPER_ADMIN" | "CLUB_ADMIN" | "TEAM_MANAGER" | "COACH" | "SCORER" | "PLAYER" | "MEMBER";

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  photo?: string;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const { data } = await api.get("/auth/me");
      const u = data.data?.user || data.data;
      // Only allow admin roles
      if (u && ["SUPER_ADMIN", "CLUB_ADMIN"].includes(u.role)) {
        setUser(u);
      } else {
        clearTokens();
      }
    } catch {
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post("/auth/login", { email, password });
    const u = data.data?.user;
    if (!u || !["SUPER_ADMIN", "CLUB_ADMIN"].includes(u.role)) {
      throw new Error("Access denied. Admin privileges required.");
    }
    setTokens(data.accessToken, data.refreshToken);
    api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
    setUser(u);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearTokens();
      delete api.defaults.headers.common.Authorization;
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
