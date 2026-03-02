import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ShiftManagerDashboard from "@/pages/ShiftManagerDashboard";
import DriverDashboard from "@/pages/DriverDashboard";
import RequesterDashboard from "@/pages/RequesterDashboard";
import GestionCamasDashboard from "@/pages/GestionCamasDashboard"; // NUEVA IMPORTACIÓN
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" />;
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
