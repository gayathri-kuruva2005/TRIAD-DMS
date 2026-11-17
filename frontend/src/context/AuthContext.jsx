
import { useEffect, useState } from "react";
import api from "../services/api";
import AuthContext from "./authContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("access_token"))
  );

  // Check whether a user is already logged in
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    let cancelled = false;

    api.get("/auth/me")
      .then((response) => {
        if (!cancelled) {
          const userData = response.data.user ?? response.data;
          setUser(userData);
        }
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("access_token");
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Login
  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const token = response.data.access_token;

    if (!token) {
      throw new Error("Login response did not contain an access token.");
    }

    localStorage.setItem("access_token", token);

    try {
      const userResponse = await api.get("/auth/me");

      const userData = userResponse.data.user ?? userResponse.data;
      setUser(userData);

      return userData;
    } catch (error) {
      localStorage.removeItem("access_token");
      throw error;
    }
  };

  // Register
  const register = async (username, email, password, division) => {
    const response = await api.post("/auth/register", {
      username,
      email,
      password,
      division,
    });

    return response.data;
  };

  // Logout
  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
