import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { Ambulance, LayoutDashboard, Users, Truck, MapPin, ClipboardList, LogOut, Menu, X, CalendarDays, History } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = {
 admin: [
    { label: "Dashboard", icon: LayoutDashboard, path: "/admin", section: "dashboard" },
    { label: "Usuarios", icon: Users, path: "/admin", section: "users" },
    { label: "Conductores", icon: Users, path: "/admin", section: "drivers" }, // <--- ¡Esta es la línea nueva!
    { label: "Vehiculos", icon: Truck, path: "/admin", section: "vehicles" },
    { label: "Destinos", icon: MapPin, path: "/admin", section: "destinations" },
    { label: "Registro", icon: ClipboardList, path: "/admin", section: "audit" },
  ],
  coordinador: [
    { label: "Despacho", icon: LayoutDashboard, path: "/manager", section: "dispatch" },
    { label: "Conductores", icon: Users, path: "/manager", section: "drivers" },
    { label: "Vehiculos", icon: Truck, path: "/manager", section: "vehicles" },
    { label: "Por Vehiculo", icon: Truck, path: "/manager", section: "byvehicle" },
    { label: "Asignacion", icon: ClipboardList, path: "/manager", section: "assign" },
    { label: "Calendario", icon: CalendarDays, path: "/manager", section: "calendar" },
    { label: "Historial", icon: History, path: "/manager", section: "history" },
  ],
  solicitante: [
    { label: "Nuevo Traslado", icon: ClipboardList, path: "/requester", section: "new" },
    { label: "Mis Solicitudes", icon: ClipboardList, path: "/requester", section: "history" },
  ],
  conductor: [
    { label: "Disponibles", icon: ClipboardList, path: "/driver", section: "pool" },
    { label: "Mis Viajes", icon: Truck, path: "/driver", section: "trips" },
    { label: "Vehiculo", icon: Truck, path: "/driver", section: "vehicle" },
  ],
};

export default function Sidebar({ activeSection, onSectionChange }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = navItems[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const roleLabels = {
    admin: "Administrador",
    coordinador: "Coordinador",
    solicitante: "Solicitante",
    conductor: "Conductor",
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Ambulance className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm text-slate-900">Traslados</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-btn">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        data-testid="sidebar"
      >
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shadow-md">
              <Ambulance className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900">Traslados</h2>
              <p className="text-xs text-slate-500">Hospital</p>
            </div>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="font-semibold text-sm text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-teal-600 font-medium">{roleLabels[user?.role]}</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.section}
              onClick={() => { onSectionChange(item.section); setMobileOpen(false); }}
              className={`sidebar-link w-full ${activeSection === item.section ? "active" : ""}`}
              data-testid={`nav-${item.section}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100">
          <button onClick={handleLogout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600" data-testid="logout-btn">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Cerrar Sesion
          </button>
        </div>
      </aside>
    </>
  );
}
