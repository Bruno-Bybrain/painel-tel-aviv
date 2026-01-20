import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div>Carregando sessão...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const isAuthorized = allowedRoles ? allowedRoles.includes(user?.role) : true;

  if (!isAuthorized) {
    return <Navigate to="/logado" replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
