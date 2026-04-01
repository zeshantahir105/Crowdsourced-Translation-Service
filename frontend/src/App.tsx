import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { Layout } from "./components/Layout";
import { Protected } from "./components/Protected";
import { Account } from "./pages/Account";
import { AdminUsers } from "./pages/AdminUsers";
import { AuthCallback } from "./pages/AuthCallback";
import { Dashboard } from "./pages/Dashboard";
import { Developer } from "./pages/Developer";
import { Documents } from "./pages/Documents";
import { Glossary } from "./pages/Glossary";
import { Login } from "./pages/Login";
import { Pricing } from "./pages/Pricing";
import { Register } from "./pages/Register";
import { VerifyEmail } from "./pages/VerifyEmail";
import { RequestDetail } from "./pages/RequestDetail";
import { Tasks } from "./pages/Tasks";
import { Home } from "./pages/Home";
import { Translator } from "./pages/Translator";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/oauth/callback" element={<AuthCallback />} />

      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/translator" element={<Translator />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />
        <Route
          path="/documents"
          element={
            <Protected>
              <Documents />
            </Protected>
          }
        />
        <Route
          path="/account"
          element={
            <Protected>
              <Account />
            </Protected>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <Protected>
              <Tasks />
            </Protected>
          }
        />
        <Route
          path="/requests/:id"
          element={
            <Protected>
              <RequestDetail />
            </Protected>
          }
        />
        <Route
          path="/glossary"
          element={
            <Protected>
              <Glossary />
            </Protected>
          }
        />
        <Route
          path="/developer"
          element={
            <Protected>
              <Developer />
            </Protected>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
