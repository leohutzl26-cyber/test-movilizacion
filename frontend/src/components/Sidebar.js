import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Home, Users, Truck, MapPin, ClipboardList, Clock, CalendarDays, Shield, Plus, Key, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";

export default function Sidebar({ activeSection, onSectionChange }) {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);

  const navItems = {
    admin: [
      { id: "dashboard", label: "Panel Analítico", icon: Home },
      { id: "users", label: "Usuarios", icon: Users },
      { id: "vehicles", label: "Flota", icon: Truck },
      { id: "destinations", label: "Destinos", icon: MapPin },
      { id: "drivers", label: "Conductores", icon: ClipboardList },
      { id: "audit", label: "Auditoría", icon: Shield },
    ],
    coordinador: [
      { id: "dispatch", label: "Despacho en Vivo", icon: Clock },
      { id: "new", label: "Nueva Solicitud", icon: Plus },
      { id: "assign", label: "Asignar", icon: ClipboardList },
      { id: "byvehicle", label: "Pizarra", icon: MapPin },
      { id: "calendar", label: "Calendario", icon: CalendarDays },
      { id: "vehicles", label: "Vehículos", icon: Truck },
      { id: "drivers", label: "Conductores", icon: Users },
      { id: "history", label: "Historial", icon: Home },
    ],
    conductor: [
      { id: "pool", label: "Bolsa de Viajes", icon: Clock },
      { id: "trips", label: "Mis Viajes", icon: Truck },
      { id: "vehicle", label: "Mi Vehículo", icon: ClipboardList },
    ],
    solicitante: [
      { id: "new", label: "Nueva Solicitud", icon: Plus },
      { id: "list", label: "Mis Solicitudes", icon: ClipboardList },
    ]
  };

  const links = user ? navItems[user.role] || [] : [];

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      toast.error("Las contraseñas nuevas no coinciden");
      return;
    }
    if (pwdForm.new_password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await api.put("/auth/change-password", {
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password
      });
      toast.success("Contraseña actualizada exitosamente");
      setPasswordDialog(false);
      setPwdForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Error al actualizar contraseña");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Barra superior móvil */}
      <div className="lg:hidden fixed top-0 left-0 w-full h-14 bg-teal-700 flex items-center justify-between px-4 z-50 shadow-md">
        <div className="flex items-center gap-2 text-white font-bold text-lg">
          <Truck className="w-5 h-5" /> Hosp. Curicó
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-white">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sombra de fondo para móvil */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />}

      {/* Panel Lateral */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-slate-300 flex flex-col z-50 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="h-16 flex items-center gap-3 px-6 bg-slate-950 text-white font-bold text-xl border-b border-slate-800 shrink-0">
          <Truck className="w-6 h-6 text-teal-500" />
          <span>Movilización</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 custom-scrollbar">
          {links.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <button
                key={link.id}
                onClick={() => { onSectionChange(link.id); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                  ${isActive ? "bg-teal-600 text-white shadow-md" : "hover:bg-slate-800 hover:text-white"}`}
              >
                <link.icon className={`w-5 h-5 ${isActive ? "text-teal-200" : "text-slate-400"}`} />
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zona del Usuario y Opciones de Sesión */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="mb-4 px-2">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <p className="text-[10px] uppercase tracking-wider text-teal-500 mt-1 font-bold">{user?.role}</p>
          </div>
          
          <button 
            onClick={() => setPasswordDialog(true)} 
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors mb-2"
          >
            <Key className="w-4 h-4" /> Cambiar Contraseña
          </button>

          <button 
            onClick={logout} 
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Ventana flotante de Cambio de Contraseña */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordChange} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Contraseña Actual</Label>
              <Input 
                type="password" 
                placeholder="Ingrese su contraseña actual" 
                value={pwdForm.current_password}
                onChange={(e) => setPwdForm({...pwdForm, current_password: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Nueva Contraseña</Label>
              <Input 
                type="password" 
                placeholder="Mínimo 6 caracteres" 
                value={pwdForm.new_password}
                onChange={(e) => setPwdForm({...pwdForm, new_password: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Nueva Contraseña</Label>
              <Input 
                type="password" 
                placeholder="Repita la nueva contraseña" 
                value={pwdForm.confirm_password}
                onChange={(e) => setPwdForm({...pwdForm, confirm_password: e.target.value})}
                required
              />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setPasswordDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white" disabled={loading}>
                {loading ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
