import { createContext, useContext, useEffect, useState } from "react";

import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function bootstrapSession() {
      try {
        const response = await api.get("/auth/me");

        if (!ignore) {
          setUser(response.user);
        }
      } catch (_error) {
        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setReady(true);
        }
      }
    }

    bootstrapSession();

    return () => {
      ignore = true;
    };
  }, []);

  async function login(credentials) {
    setPending(true);

    try {
      const response = await api.post("/auth/login", credentials);
      setUser(response.user);
      return response.user;
    } finally {
      setPending(false);
    }
  }

  async function register(payload) {
    setPending(true);

    try {
      const response = await api.post("/auth/register", payload);
      setUser(response.user);
      return response.user;
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    try {
      await api.post("/auth/logout", {});
    } finally {
      setUser(null);
    }
  }

  function syncUser(nextUser) {
    setUser((current) => (current ? { ...current, ...nextUser } : current));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        ready,
        pending,
        login,
        register,
        logout,
        syncUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
