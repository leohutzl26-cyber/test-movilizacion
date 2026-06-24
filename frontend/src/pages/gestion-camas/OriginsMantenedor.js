import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Plus, Pencil, Trash2 } from "lucide-react";
import BulkUploader from "@/components/BulkUploader";

export default function OriginsMantenedor() {
  const [origins, setOrigins] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", is_active: true });
  const [loading, setLoading] = useState(true);

  const fetchOrigins = useCallback(async () => {
    try { const r = await api.get("/origins"); setOrigins(r.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchOrigins(); }, [fetchOrigins]);

  const openCreate = () => { setEditingOrigin(null); setFormData({ name: "", address: "", is_active: true }); setIsDialogOpen(true); };
  const openEdit = (o) => { setEditingOrigin(o); setFormData({ name: o.name, address: o.address || "", is_active: o.is_active !== false }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Ingrese un nombre"); return; }
    try {
      if (editingOrigin) { await api.put(`/origins/${editingOrigin.id}`, formData); toast.success("Origen actualizado"); }
      else { await api.post("/origins", formData); toast.success("Origen creado"); }
      setIsDialogOpen(false); fetchOrigins();
    } catch { toast.error("Error al guardar"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este origen?")) return;
    try { await api.delete(`/origins/${id}`); toast.success("Origen eliminado"); fetchOrigins(); } catch { toast.error("Error"); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-black text-slate-900">Mantenedor de Orígenes</h1><p className="text-sm text-slate-500 mt-1">Administre las ubicaciones físicas de origen predefinidas para los traslados.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-10 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-1" /> Carga Masiva</Button>
          <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-md"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Origen</th>
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
                <th className="p-4 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {origins.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{o.name}</td>
                  <td className="p-4 text-slate-600 font-medium">{o.address || "-"}</td>
                  <td className="p-4 text-center"><Button variant="ghost" size="icon" onClick={() => openEdit(o)} className="h-8 w-8 text-slate-500 hover:text-teal-600"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)} className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {origins.length === 0 && !loading && <tr><td colSpan={3} className="text-center py-12 text-slate-400">No hay orígenes registrados. Haga clic en "Agregar" para crear el primero.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingOrigin ? "Editar Origen" : "Nuevo Origen"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nombre del Origen *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Hospital Central, Bodega Central" /></div>
            <div className="space-y-2"><Label>Dirección del Origen</Label><Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ej. Av. Principal 123" /></div>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">{editingOrigin ? "Guardar Cambios" : "Crear Origen"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Orígenes"
        columns={[
          { key: "nombre", label: "Nombre del Origen", required: true },
          { key: "direccion", label: "Dirección del Origen" }
        ]}
        onImport={async (rows) => {
          const promises = rows.map(r => 
            api.post("/origins", { name: r.nombre, address: r.direccion || "" })
          );
          await Promise.all(promises);
          fetchOrigins();
        }}
        exampleRows={[["Hospital Central", "Av. Principal 123"], ["Bodega Central", "Sector Industrial 45"]]}
      />
    </div>
  );
}
