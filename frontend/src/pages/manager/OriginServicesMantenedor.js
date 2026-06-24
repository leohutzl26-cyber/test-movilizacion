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

export default function OriginServicesMantenedor() {
  const [services, setServices] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({ name: "", is_active: true });
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    try { const r = await api.get("/origin-services"); setServices(r.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchServices(); }, [fetchServices]);

  const openCreate = () => { setEditingService(null); setFormData({ name: "", is_active: true }); setIsDialogOpen(true); };
  const openEdit = (s) => { setEditingService(s); setFormData({ name: s.name, is_active: s.is_active !== false }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Ingrese un nombre"); return; }
    try {
      if (editingService) { await api.put(`/origin-services/${editingService.id}`, formData); toast.success("Servicio actualizado"); }
      else { await api.post("/origin-services", formData); toast.success("Servicio creado"); }
      setIsDialogOpen(false); fetchServices();
    } catch { toast.error("Error al guardar"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este servicio?")) return;
    try { await api.delete(`/origin-services/${id}`); toast.success("Servicio eliminado"); fetchServices(); } catch { toast.error("Error"); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-black text-slate-900">Mantenedor de Servicios de Origen</h1><p className="text-sm text-slate-500 mt-1">Administre los servicios que aparecen como opciones de origen al crear traslados.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-10 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-1" /> Carga Masiva</Button>
          <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-md"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr><th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Servicio</th><th className="p-4 text-center w-32">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {services.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{s.name}</td>
                  <td className="p-4 text-center"><Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8 text-slate-500 hover:text-teal-600"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {services.length === 0 && !loading && <tr><td colSpan={2} className="text-center py-12 text-slate-400">No hay servicios registrados. Haga clic en "Agregar" para crear el primero.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nombre del Servicio *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Urgencias, UCI Adulto, Pabellón" /></div>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">{editingService ? "Guardar Cambios" : "Crear Servicio"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Servicios de Origen"
        columns={[{ key: "nombre", label: "Nombre del Servicio", required: true }]}
        onImport={async (rows) => {
          const promises = rows.map(r => 
            api.post("/origin-services", { name: r.nombre })
          );
          await Promise.all(promises);
          fetchServices();
        }}
        exampleRows={[["Urgencias"], ["UCI Adulto"], ["Pabellón"], ["Medicina Quirúrgica"]]}
      />
    </div>
  );
}
