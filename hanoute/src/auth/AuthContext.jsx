import { createContext, useContext, useState, useEffect } from "react";
import api from "../api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // Optionally verify token or fetch admin details
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await api.post("/admins/login", { username, password });

      const { token, admin } = res.data;
      setToken(token);
      setAdmin(admin);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(admin)); // ✅ Save user info

      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || "Login failed";
      throw new Error(message);
    }
  };


  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ admin, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
