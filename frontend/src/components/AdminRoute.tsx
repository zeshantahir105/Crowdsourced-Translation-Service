import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Protected } from "./Protected";

function AdminGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== "ADMIN") {
    return <Navigate to="/account" replace />;
  }
  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <Protected>
      <AdminGate>{children}</AdminGate>
    </Protected>
  );
}
