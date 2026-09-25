"use client";

import React, { useState, useEffect, createContext, useContext } from "react";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  workspaceId: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUser({
          uid: data.user.uid,
          email: data.user.email,
          displayName: data.user.displayName || data.user.email.split("@")[0],
          role: data.user.role || "EDITOR",
          workspaceId: data.user.workspaceId || "ws-ecomspain",
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      window.location.reload();
    }
  };

  const value = { user, loading, logout, refreshUser: fetchUser };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
