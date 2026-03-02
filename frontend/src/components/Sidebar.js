import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Home, Users, PlusCircle, LogOut, FileText, Truck, MapPin, CalendarDays, BedDouble } from "lucide-react"; // Añadido BedDouble

export default function Sidebar({ activeSection, onSectionChange }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  const menuItems = {
    admin: [
      { id: "dashboard", label: "Panel Principal", icon: Home },
      { id: "users", label: "Usuarios", icon: Users },
      { id: "destinations", label: "Destinos", icon: MapPin },
      { id: "logs", label: "Auditoría", icon: FileText }
    ],
    coordinador: [
      { id: "dispatch", label: "Consola de Despacho", icon: Home },
      { id: "new", label: "Nuevo Traslado", icon: PlusCircle },
      { id: "assign", label: "Asignación Rápida", icon: FileText },
      { id: "byvehicle", label: "Pizarra Kanban", icon: Truck },
      { id: "calendar", label: "Calendario", icon: CalendarDays },
      { id: "drivers", label: "Conductores", icon: Users },
      { id: "vehicles", label: "Flota de Vehículos", icon: Truck },
      { id: "history", label: "Historial y Reportes", icon: FileText }
    ],
    conductor: [
      { id: "pool", label: "Bolsa de Viajes", icon: FileText },
      { id: "trips", label: "Mis Viajes Asignados", icon: Home },
      { id: "vehicle", label: "Mi Vehículo", icon: Truck }
    ],
    solicitante: [
      { id: "new", label: "Solicitar Traslado", icon: PlusCircle },
      { id: "list", label: "Mis Solicitudes", icon: FileText }
    ],
    gestion_camas: [ // NUEVO MENÚ PARA GESTIÓN DE CAMAS
      { id: "assign", label: "Asignar Personal Clínico", icon: BedDouble }
    ]
  };

  const items = menuItems[user?.role] || [];

  return (
    <>
      <div className="hidden lg:flex flex-col w-64 bg-slate-900 text-white min-h-screen fixed left-0 top-0 border-r border-slate-800 z-50">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center font-bold text-lg">M</div>
             <div>
                <h2 className="text-xl font-bold tracking-tight">Movili<span className="text-teal-400">APP</span></h2>
             </div>
          </div>
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-[10px] text-teal-400 uppercase tracking-widest font-bold mt-1">{user?.role.replace(/_/g, " ")}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {items.map((item) => (
            <Button
              key={item.id}
              variant={activeSection === item.id ? "secondary" : "ghost"}
              className={`w-full justify-start h-11 transition-all ${
                activeSection === item.id 
                  ? "bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 hover:text-teal-300" 
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
              onClick={() => onSectionChange(item.id)}
            >
              <item.icon className="mr-3 h-5 w-5" />
              {item.label}
            </Button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 h-11" onClick={handleLogout}>
            <LogOut className="mr-3 h-5 w-5" /> Cerrar Sesión
          </Button>
        </div>
      </div>
      
      {/* Mobile Topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 bg-teal-500 rounded flex items-center justify-center font-bold text-xs text-white">M</div>
           <span className="font-bold text-white tracking-tight">Movili<span className="text-teal-400">APP</span></span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="text-slate-300 h-8 w-8" onClick={() => {}}>
            <Home className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-400 h-8 w-8" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 pb-safe z-50">
        {items.slice(0, 4).map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            className={`flex-col h-14 w-full rounded-lg ${
              activeSection === item.id 
                ? "text-teal-400 bg-slate-800" 
                : "text-slate-400 hover:text-slate-300"
            }`}
            onClick={() => onSectionChange(item.id)}
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
          </Button>
        ))}
      </div>
    </>
  );
}
