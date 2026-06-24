import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      </div>
    </div>
  );
}
