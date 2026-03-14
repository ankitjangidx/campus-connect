import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import LoadingState from "./LoadingState";

function ProtectedRoute() {
  const { user, ready } = useAuth();

  if (!ready) {
    return <LoadingState label="Checking session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
