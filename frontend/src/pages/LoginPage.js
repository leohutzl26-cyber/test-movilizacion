import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, User, Truck, Activity, ClipboardList, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showManuals, setShowManuals] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      
      if (user.status !== "aprobado" && user.status !== "approved") {
        toast.error("Tu cuenta está pendiente de aprobación por el administrador.");
        return;
      }

      toast.success(`Bienvenido, ${user.name}`);
      const routes = { 
        admin: "/admin", 
        coordinador: "/manager", 
        solicitante: "/requester", 
        conductor: "/driver",
        gestion_camas: "/gestion-camas",
        personal_clinico: "/clinical",
        panel: "/panel"
      };
      
      navigate(routes[user.role] || "/");
    } catch (err) {
      toast.error(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-50 flex items-center justify-center p-4" data-testid="login-page">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4">
            <img src="/logo.png" alt="Logo Hospital Curicó" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Hospital Curicó</h1>
          <p className="text-slate-500 mt-1 text-sm">Sistema de Movilización</p>
        </div>
    
        <Card className="shadow-xl border-slate-100 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <CardHeader className="pb-2 text-center">
            <h2 className="text-xl font-semibold text-slate-800">Ingreso al Sistema</h2>
            <p className="text-slate-400 text-xs mt-1">Ingrese sus credenciales de acceso</p>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
              <div className="space-y-2">
                <Label htmlFor="login-username">Nombre de Usuario</Label>
                {/* 
                  Mantenemos data-testid="login-email-input" para no romper posibles 
                  tests automatizados que busquen este selector en la pantalla de login.
                */}
                <Input 
                  id="login-username" 
                  data-testid="login-email-input" 
                  type="text" 
                  placeholder="ej: jsmith o correo institucional" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Contraseña</Label>
                <Input 
                  id="login-password" 
                  data-testid="login-password-input" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11 mt-2" disabled={loading} data-testid="login-submit-btn">
                {loading ? "Ingresando..." : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Link sutil a manuales */}
        <div className="text-center mt-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
          <button 
            type="button"
            onClick={() => setShowManuals(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-teal-600 transition-colors bg-transparent border-none cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            Manuales de Usuario del Sistema
          </button>
        </div>

        {/* Modal de manuales */}
        <Dialog open={showManuals} onOpenChange={setShowManuals}>
          <DialogContent className="max-w-md bg-white rounded-3xl p-6 border-none shadow-2xl">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-lg font-black uppercase text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-teal-600" />
                Manuales de Usuario
              </DialogTitle>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">
                Selecciona tu perfil para ver el manual correspondiente
              </p>
            </DialogHeader>

            <div className="grid grid-cols-1 gap-2.5 mt-2">
              <a 
                href="/manuales/manual_solicitante.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 hover:border-teal-200 hover:bg-teal-50/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-100">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-800 uppercase">Solicitante Clínico</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Médicos, Enfermeros y Matronas</p>
                </div>
              </a>

              <a 
                href="/manuales/manual_conductor.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 hover:border-sky-200 hover:bg-sky-50/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 group-hover:bg-sky-100">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-800 uppercase">Conductor</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Choferes y personal de ambulancia</p>
                </div>
              </a>

              <a 
                href="/manuales/manual_gestor_camas.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-800 uppercase">Gestor de Camas</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Unidad de Gestión de Camas</p>
                </div>
              </a>

              <a 
                href="/manuales/manual_coordinador.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-800 uppercase">Coordinador</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Central de Movilización y Turnos</p>
                </div>
              </a>

              <a 
                href="/manuales/manual_administrador.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black text-slate-800 uppercase">Administrador</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Soporte y configuración global</p>
                </div>
              </a>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
