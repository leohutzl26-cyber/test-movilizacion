import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Edit, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { authApi } from "@/lib/supabase-api";

export default function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: "", rut: "", username: "", role: "solicitante", is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error) setUsers(data || []);
    } catch (e) {
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ name: "", rut: "", username: "", role: "solicitante", is_active: true });
  };

  const handleEdit = (u) => {
    setEditingId(u.id);
    setFormData({
      name: u.name || "",
      rut: u.rut || "",
      username: u.username || "",
      role: u.role || "solicitante",
      is_active: u.is_active !== undefined ? u.is_active : true
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim() || !formData.role) {
      toast.error("Nombre, nombre de usuario y rol son obligatorios");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const response = await authApi.adminUsers({
          action: 'update',
          id: editingId,
          name: formData.name,
          rut: formData.rut,
          username: formData.username,
          role: formData.role,
          is_active: formData.is_active
        });
        toast.success(response.message || "Usuario actualizado exitosamente");
      } else {
        const response = await authApi.adminUsers({
          action: 'create',
          name: formData.name,
          rut: formData.rut,
          username: formData.username,
          role: formData.role
        });
        toast.success(response.message || "Usuario creado exitosamente");
      }
      closeDialog();
      fetchUsers();
    } catch (e) {
      toast.error(e.message || "Error al guardar usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (u) => {
    if (window.confirm(`¿Seguro que deseas restablecer la contraseña de ${u.name}? Su nueva contraseña será '123456' y se le obligará a cambiarla en su próximo ingreso.`)) {
      try {
        const response = await authApi.adminUsers({
          action: 'reset_password',
          id: u.id
        });
        toast.success(response.message || "Contraseña restablecida exitosamente a 123456");
      } catch (e) {
        toast.error(e.message || "Error al restablecer contraseña");
      }
    }
  };

  const handleDelete = async (u) => {
    if (window.confirm(`¿Eliminar definitivamente al usuario ${u.name}? Esta acción es irreversible y removerá el perfil asociado.`)) {
      try {
        const { error } = await supabase.from('profiles').delete().eq('id', u.id);
        if (error) throw error;
        toast.success("Usuario eliminado exitosamente");
        fetchUsers();
      } catch (e) {
        toast.error("Error al eliminar usuario");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>
        <Button onClick={() => { setEditingId(null); setFormData({ name: "", rut: "", username: "", role: "solicitante", is_active: true }); setIsDialogOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11">
          <Plus className="w-4 h-4 mr-2" /> Crear Usuario
        </Button>
      </div>

      {loading ? <p className="text-slate-500 text-center py-10">Cargando usuarios...</p> : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Nombre / RUT</th>
                  <th className="p-4">Usuario (Login)</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.rut || "Sin RUT"}</p>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-600">{u.username || u.email}</td>
                    <td className="p-4">
                      <Badge variant="outline" className="text-xs capitalize">
                        {(u.role || "solicitante").replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      {u.is_active === false ? (
                        <Badge className="bg-red-100 text-red-800 border-red-200">Inactivo</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Activo</Badge>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(u)} className="text-slate-400 hover:text-teal-600 h-8 w-8" title="Editar"><Edit className="w-4 h-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleResetPassword(u)} className="text-slate-400 hover:text-amber-600 h-8 w-8" title="Restablecer Clave"><RefreshCw className="w-4 h-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(u)} className="text-slate-400 hover:text-red-600 h-8 w-8" title="Eliminar"><Trash2 className="w-4 h-4"/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md sm:rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
            <DialogDescription className="sr-only">
              Formulario para la creación y edición de usuarios en el sistema de movilización.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nombre Completo *</Label>
              <Input id="user-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ej: Juan Perez" required />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-username">Nombre de Usuario *</Label>
                <Input id="user-username" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})} placeholder="ej: jperez" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-rut">RUT (Opcional)</Label>
                <Input id="user-rut" value={formData.rut} onChange={e => setFormData({...formData, rut: e.target.value})} placeholder="12.345.678-9" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-role">Rol / Perfil *</Label>
                <Select value={formData.role} onValueChange={v => setFormData({...formData, role: v})}>
                  <SelectTrigger id="user-role"><SelectValue placeholder="Seleccione Rol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solicitante">Solicitante</SelectItem>
                    <SelectItem value="conductor">Conductor</SelectItem>
                    <SelectItem value="coordinador">Coordinador</SelectItem>
                    <SelectItem value="gestion_camas">Gestión de Camas</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingId && (
                <div className="space-y-2">
                  <Label htmlFor="user-status">Estado *</Label>
                  <Select value={formData.is_active ? "active" : "inactive"} onValueChange={v => setFormData({...formData, is_active: v === "active"})}>
                    <SelectTrigger id="user-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {!editingId && (
              <p className="text-xs text-slate-400 mt-2">
                * La contraseña por defecto para el nuevo usuario será <span className="font-bold text-slate-600">123456</span>. 
                Se le solicitará cambiarla obligatoriamente al ingresar por primera vez.
              </p>
            )}

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold" disabled={saving}>
                {saving ? "Guardando..." : "Guardar Usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
