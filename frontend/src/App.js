import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ShiftManagerDashboard from "@/pages/ShiftManagerDashboard";
import RequesterDashboard from "@/pages/RequesterDashboard";
import DriverDashboard from "@/pages/DriverDashboard";

function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full" /></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) {
    const routes = { admin: "/admin", jefe_turno: "/manager", solicitante: "/requester", conductor: "/driver" };
    return <Navigate to={routes[user?.role] || "/login"} replace />;
  }
  return children;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  const getDefaultRoute = () => {
    if (!isAuthenticated) return "/login";
    const routes = { admin: "/admin", jefe_turno: "/manager", solicitante: "/requester", conductor: "/driver" };
    return routes[user?.role] || "/login";
  };

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <LoginPage />} />
      <Route path="/admin" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/manager" element={<ProtectedRoute roles={["jefe_turno"]}><ShiftManagerDashboard /></ProtectedRoute>} />
      <Route path="/requester" element={<ProtectedRoute roles={["solicitante"]}><RequesterDashboard /></ProtectedRoute>} />
      <Route path="/driver" element={<ProtectedRoute roles={["conductor"]}><DriverDashboard /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
