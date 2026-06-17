import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldAlert, KeyRound, Eye, EyeOff } from "lucide-react";

export default function ChangePasswordForceScreen() {
  const { changePassword, logout, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Todos los campos son obligatorios");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("La nueva contraseña y su confirmación no coinciden");
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("La nueva contraseña debe ser distinta a la contraseña actual");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Contraseña actualizada con éxito. Ya puedes usar el sistema.");
    } catch (error) {
      toast.error(error.message || "Error al actualizar la contraseña. Verifique sus datos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 mb-4">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cambio de Contraseña Obligatorio</h1>
          <p className="text-slate-400 mt-2 text-sm max-w-sm mx-auto">
            Hola, <span className="text-teal-400 font-semibold">{user?.name}</span>. Por motivos de seguridad, debes cambiar tu contraseña temporal antes de acceder al sistema.
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-950 text-white shadow-2xl">
          <CardHeader className="border-b border-slate-900 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-teal-500" />
              Actualizar Credenciales
            </CardTitle>
            <CardDescription className="text-slate-500">
              Ingresa la contraseña temporal asignada y tu nueva contraseña personal.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña Temporal Actual</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrent ? "text" : "password"}
                    className="bg-slate-900 border-slate-800 text-white placeholder-slate-600 pr-10 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Contraseña por defecto (ej: 123456)"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    className="bg-slate-900 border-slate-800 text-white placeholder-slate-600 pr-10 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    className="bg-slate-900 border-slate-800 text-white placeholder-slate-600 pr-10 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="Repita la nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium h-11 transition-all"
                  disabled={loading}
                >
                  {loading ? "Actualizando..." : "Guardar y Continuar"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                  onClick={logout}
                >
                  Cerrar Sesión
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
