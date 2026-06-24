import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ShiftManagerDashboard from "@/pages/ShiftManagerDashboard";
import DriverDashboard from "@/pages/DriverDashboard";
import RequesterDashboard from "@/pages/RequesterDashboard";
import GestionCamasDashboard from "@/pages/GestionCamasDashboard"; // NUEVA IMPORTACIÓN
import ChangePasswordForceScreen from "@/components/ChangePasswordForceScreen";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" />;

  // Si el usuario requiere cambiar su contraseña, forzar el renderizado de la pantalla de cambio
  if (user.must_change_password) {
    return <ChangePasswordForceScreen />;
  }

  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/admin/*" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/manager/*" element={<ProtectedRoute roles={["coordinador", "admin"]}><ShiftManagerDashboard /></ProtectedRoute>} />
          <Route path="/driver/*" element={<ProtectedRoute roles={["conductor"]}><DriverDashboard /></ProtectedRoute>} />
          <Route path="/requester/*" element={<ProtectedRoute roles={["solicitante", "coordinador", "admin"]}><RequesterDashboard /></ProtectedRoute>} />
          <Route path="/gestion-camas/*" element={<ProtectedRoute roles={["gestion_camas", "admin"]}><GestionCamasDashboard /></ProtectedRoute>} /> {/* NUEVA RUTA */}
        </Routes>
        <Toaster />
      </Router>
    </AuthProvider>
  );
}

export default App;
