import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Plus, Search, Users, Pencil, Trash2, RefreshCw } from "lucide-react";
import BulkUploader from "@/components/BulkUploader";
import { PERSONNEL_TYPES } from "@/lib/tripUtils";

export default function ClinicalStaffMantenedor() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ name: "", role: "", is_active: true });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/clinical-staff");
      setStaff(res.data || []);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleSave = async () => {
    if (!formData.name || !formData.role) { toast.error("Nombre y rol son obligatorios"); return; }
    try {
      if (editingStaff) {
        await api.put(`/clinical-staff/${editingStaff.id}`, formData);
        toast.success("Personal actualizado");
      } else {
        await api.post("/clinical-staff", formData);
        toast.success("Personal creado");
      }
      setIsDialogOpen(false); fetchStaff();
    } catch (e) { toast.error("Error al guardar data"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que quiere eliminar este registro?")) {
      try {
        await api.delete(`/clinical-staff/${id}`);
        toast.success("Eliminado");
        fetchStaff();
      } catch (e) { toast.error("Error al eliminar"); }
    }
  };

  const openNew = () => { setEditingStaff(null); setFormData({ name: "", role: "", is_active: true }); setIsDialogOpen(true); };
  const openEdit = (s) => { setEditingStaff(s); setFormData({ name: s.name, role: s.role, is_active: s.is_active }); setIsDialogOpen(true); };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Mantenedor de Personal Clínico</h1>
          <p className="text-slate-500 font-medium mt-1">Gestione el personal de apoyo (Tens, Enfermeros, etc) para traslados.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-11 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-2" />Carga Masiva</Button>
          <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 flex gap-2">
            <Plus className="w-4 h-4" /> Agregar Personal
          </Button>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          placeholder="Buscar personal por nombre o tipo (ej. TENS)..." 
          className="pl-10 h-11 bg-white border-slate-200 shadow-sm rounded-xl focus:ring-teal-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-hidden">
          {loading ? <div className="py-20 flex justify-center text-teal-600"><RefreshCw className="w-8 h-8 animate-spin" /></div> : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Nombre Completo</th>
                  <th className="p-4">Rol / Cargo</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.filter(s => 
                  s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  s.role.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-teal-500" /> {s.name}</div></td>
                    <td className="p-4 text-slate-600">{s.role}</td>
                    <td className="p-4 text-center">
                      <Badge className={s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                        {s.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="text-blue-600"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
                {staff.length > 0 && staff.filter(s => 
                  s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  s.role.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <tr><td colSpan={4} className="text-center py-10 text-slate-400 font-medium">No se encontraron resultados para "{searchTerm}"</td></tr>
                )}
                {staff.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-400">No hay personal registrado.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingStaff ? "Editar Personal" : "Nuevo Personal Clínico"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Ana María Rojas" />
            </div>
            <div className="space-y-2">
              <Label>Cargo / Rol *</Label>
              <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccione rol" /></SelectTrigger>
                <SelectContent>{PERSONNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-center justify-between border p-3 rounded-lg mt-4">
              <Label>Estado Activo</Label>
              <input type="checkbox" className="w-5 h-5 accent-teal-600" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Personal Clínico"
        columns={[
          { key: "nombre", label: "Nombre Completo", required: true },
          { key: "rol", label: "Cargo / Rol", required: true }
        ]}
        onImport={async (rows) => {
          const promises = rows.map(r => 
            api.post("/clinical-staff", { name: r.nombre, role: r.rol, is_active: true })
          );
          await Promise.all(promises);
          fetchStaff();
        }}
        exampleRows={[
          ["Ana María Rojas", "TENS"],
          ["Carlos Pérez", "Enfermero/a"],
          ["Dr. Juan Silva", "Médico"]
        ]}
      />
    </div>
  );
}
