import React, { createContext, useContext } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const user = {
    name: "SE7EN FIT Admin",
    role: "admin",
  };

  const logout = () => {
    alert("Logout clicked");
  };

  return (
    <AuthContext.Provider value={{ user, loading: false, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}