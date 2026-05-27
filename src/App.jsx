
import React from "react";
import AdminScreen from "./screens/AdminScreen.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

export default function App() {
  return (
    <AuthProvider>
      <div className="phone-shell">
        <AdminScreen />
      </div>
    </AuthProvider>
  );
}