import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserPlus, LogIn, KeyRound } from "lucide-react";

export default function LoginPage() {
  const [tab, setTab] = useState("login");

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
          <Tabs value={tab} onValueChange={setTab}>
            <CardHeader className="pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1" data-testid="login-tab">
                  <LogIn className="w-4 h-4 mr-1.5" /> Ingresar
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1" data-testid="register-tab">
                  <UserPlus className="w-4 h-4 mr-1.5" /> Registro
                </TabsTrigger>
                <TabsTrigger value="forgot" className="flex-1" data-testid="forgot-tab">
                  <KeyRound className="w-4 h-4 mr-1.5" /> Clave
                </TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="login"><LoginForm /></TabsContent>
              <TabsContent value="register"><RegisterForm onSuccess={() => setTab("login")} /></TabsContent>
              <TabsContent value="forgot"><ForgotForm onSuccess={() => setTab("login")} /></TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      
      if (user.status !== "aprobado") {
        toast.error("Tu cuenta está pendiente de aprobación por el administrador.");
        return;
      }

      toast.success(`Bienvenido, ${user.name}`);
      const routes = { 
        admin: "/admin", 
        coordinador: "/manager", 
        solicitante: "/requester", 
        conductor: "/driver",
        gestion_camas: "/gestion-camas" 
      };
      
      navigate(routes[user.role] || "/");
    } catch (err) {
      toast.error(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="login-form">
      <div className="space-y-2">
        <Label htmlFor="login-email">Correo Institucional</Label>
        <Input id="login-email" data-testid="login-email-input" type="email" placeholder="usuario@hospital.cl" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Contraseña</Label>
        <Input id="login-password" data-testid="login-password-input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11" disabled={loading} data-testid="login-submit-btn">
        {loading ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}

function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "solicitante" });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success("Registro exitoso. Espere aprobación del administrador.");
      onSuccess();
    } catch (err) {
      toast.error(err.message || "Error en el registro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
      <div className="space-y-2">
        <Label>Nombre Completo</Label>
        <Input data-testid="register-name-input" placeholder="Juan Perez" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Correo Institucional</Label>
        <Input data-testid="register-email-input" type="email" placeholder="usuario@hospital.cl" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Contraseña</Label>
        <Input data-testid="register-password-input" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Rol</Label>
        <Select value={form.role} onValueChange={(val) => setForm({ ...form, role: val })} data-testid="register-role-select">
          <SelectTrigger data-testid="register-role-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solicitante">Solicitante</SelectItem>
            <SelectItem value="conductor">Conductor</SelectItem>
            <SelectItem value="coordinador">Coordinador</SelectItem>
            <SelectItem value="gestion_camas">Gestión de Camas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11" disabled={loading} data-testid="register-submit-btn">
        {loading ? "Registrando..." : "Crear Cuenta"}
      </Button>
    </form>
  );
}

function ForgotForm({ onSuccess }) {
  return (
    <div className="text-center py-8 space-y-4">
      <KeyRound className="w-12 h-12 text-slate-300 mx-auto" />
      <p className="text-slate-500 text-sm">La recuperación de contraseña ha sido movida a la gestión de Supabase. Contacte al administrador para restablecer su clave.</p>
      <Button variant="ghost" onClick={onSuccess}>Volver al inicio</Button>
    </div>
  );
}
