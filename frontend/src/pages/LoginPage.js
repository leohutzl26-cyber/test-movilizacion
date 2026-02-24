import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Ambulance, UserPlus, LogIn, KeyRound } from "lucide-react";
import api from "@/lib/api";

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
          <p className="text-slate-500 mt-1 text-sm">Sistema de Gestion de Traslados</p>
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
              <TabsContent value="forgot"><ForgotForm /></TabsContent>
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
      toast.success(`Bienvenido, ${user.name}`);
      const routes = { admin: "/admin", coordinador: "/manager", solicitante: "/requester", conductor: "/driver" };
      navigate(routes[user.role] || "/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al iniciar sesion");
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
        <Label htmlFor="login-password">Contrasena</Label>
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
      toast.success("Registro exitoso. Espere aprobacion del administrador.");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error en el registro");
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
        <Label>Contrasena</Label>
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
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11" disabled={loading} data-testid="register-submit-btn">
        {loading ? "Registrando..." : "Crear Cuenta"}
      </Button>
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email });
      if (res.data.reset_token) setToken(res.data.reset_token);
      toast.success("Si el correo existe, recibira instrucciones.");
      setStep(2);
    } catch (err) {
      toast.error("Error al enviar correo");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: newPassword });
      toast.success("Contrasena actualizada. Puede iniciar sesion.");
      setStep(1);
      setEmail("");
      setToken("");
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al cambiar contrasena");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <form onSubmit={handleSendEmail} className="space-y-4" data-testid="forgot-form">
        <CardDescription>Ingrese su correo para recibir instrucciones de recuperacion.</CardDescription>
        <div className="space-y-2">
          <Label>Correo Institucional</Label>
          <Input data-testid="forgot-email-input" type="email" placeholder="usuario@hospital.cl" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11" disabled={loading} data-testid="forgot-submit-btn">
          {loading ? "Enviando..." : "Enviar Instrucciones"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-4" data-testid="reset-form">
      <CardDescription>Ingrese el token recibido y su nueva contrasena.</CardDescription>
      <div className="space-y-2">
        <Label>Token de Recuperacion</Label>
        <Input data-testid="reset-token-input" placeholder="Token recibido por email" value={token} onChange={(e) => setToken(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label>Nueva Contrasena</Label>
        <Input data-testid="reset-password-input" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-11" disabled={loading} data-testid="reset-submit-btn">
        {loading ? "Actualizando..." : "Cambiar Contrasena"}
      </Button>
    </form>
  );
}
