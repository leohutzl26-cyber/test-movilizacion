import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, Plus, Pencil, Trash2, FileDown } from "lucide-react";
import BulkUploader from "@/components/BulkUploader";
import * as XLSX from "xlsx";

export default function DestinationsMantenedor() {
  const [destinations, setDestinations] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingDest, setEditingDest] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", is_active: true });
  const [loading, setLoading] = useState(true);

  const fetchDestinations = useCallback(async () => {
    try { const r = await api.get("/destinations"); setDestinations(r.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchDestinations(); }, [fetchDestinations]);

  const openCreate = () => { setEditingDest(null); setFormData({ name: "", address: "", is_active: true }); setIsDialogOpen(true); };
  const openEdit = (d) => { setEditingDest(d); setFormData({ name: d.name, address: d.address || "", is_active: d.is_active !== false }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Ingrese un nombre"); return; }
    try {
      if (editingDest) { await api.put(`/destinations/${editingDest.id}`, formData); toast.success("Destino actualizado"); }
      else { await api.post("/destinations", formData); toast.success("Destino creado"); }
      setIsDialogOpen(false); fetchDestinations();
    } catch { toast.error("Error al guardar"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este destino?")) return;
    try { await api.delete(`/destinations/${id}`); toast.success("Destino eliminado"); fetchDestinations(); } catch { toast.error("Error"); }
  };

  const handleExportExcel = () => {
    if (destinations.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const dataToExport = destinations.map(d => ({
      "Nombre del Destino": d.name,
      "Dirección": d.address || "N/A",
      "Estado": d.is_active !== false ? "Activo" : "Inactivo"
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Destinos");
    XLSX.writeFile(wb, `Destinos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel generado con éxito");
  };

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-black text-slate-900">Mantenedor de Destinos</h1><p className="text-sm text-slate-500 mt-1">Administre las ubicaciones físicas de destino predefinidas para los traslados.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="font-bold h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50"><FileDown className="w-4 h-4 mr-1" /> Exportar Excel</Button>
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-10 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-1" /> Carga Masiva</Button>
          <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-md"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Destino</th>
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
                <th className="p-4 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {destinations.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{d.name}</td>
                  <td className="p-4 text-slate-600 font-medium">{d.address || "-"}</td>
                  <td className="p-4 text-center"><Button variant="ghost" size="icon" onClick={() => openEdit(d)} className="h-8 w-8 text-slate-500 hover:text-teal-600"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {destinations.length === 0 && !loading && <tr><td colSpan={3} className="text-center py-12 text-slate-400">No hay destinos registrados. Haga clic en "Agregar" para crear el primero.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingDest ? "Editar Destino" : "Nuevo Destino"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nombre del Destino *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Clínica Las Condes, Laboratorio Central" /></div>
            <div className="space-y-2"><Label>Dirección del Destino</Label><Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ej. Av. Las Condes 763" /></div>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">{editingDest ? "Guardar Cambios" : "Crear Destino"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Destinos"
        columns={[
          { key: "nombre", label: "Nombre del Destino", required: true },
          { key: "direccion", label: "Dirección del Destino" }
        ]}
        onImport={async (rows) => {
          const promises = rows.map(r => 
            api.post("/destinations", { name: r.nombre, address: r.direccion || "" })
          );
          await Promise.all(promises);
          fetchDestinations();
        }}
        exampleRows={[["Clínica Las Condes", "Av. Las Condes 763"], ["Laboratorio Central", "Av. Providencia 1234"]]}
      />
    </div>
  );
}
