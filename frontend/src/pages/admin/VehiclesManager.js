import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Car, Upload } from "lucide-react";
import api from "@/lib/api";
import BulkUploader from "@/components/BulkUploader";
import { formatZonalNumber, VEHICLE_ICONS } from "@/lib/tripUtils";

export default function VehiclesManager() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ plate: "", zonal_number: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = vehicles.filter(v =>
    v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.brand && v.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (v.model && v.model.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (v.zonal_number && v.zonal_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (v.type && v.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const fetchVehicles = useCallback(async () => {
    try {
      const r = await api.get('/vehicles');
      setVehicles(r.data || []);
    } catch (e) {
      toast.error("Error al cargar vehículos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const formattedZonal = formData.zonal_number ? formatZonalNumber(formData.zonal_number) : "";
      const dataToSave = { ...formData, zonal_number: formattedZonal };

      if (editingId) {
        await api.put(`/vehicles/${editingId}`, dataToSave);
        toast.success("Vehículo actualizado exitosamente");
      } else {
        await api.post('/vehicles', dataToSave);
        toast.success("Vehículo creado exitosamente");
      }
      closeDialog();
      fetchVehicles();
    } catch (e) {
      console.error(e);
      toast.error(e.message || (editingId ? "Error al actualizar vehículo" : "Error al crear vehículo"));
    }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ plate: "", zonal_number: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });
  };

  const handleEdit = (v) => {
    setEditingId(v.id);
    setFormData({
      plate: v.plate,
      zonal_number: v.zonal_number || "",
      brand: v.brand,
      model: v.model,
      type: v.type,
      year: v.year,
      mileage: v.mileage,
      next_maintenance_km: v.next_maintenance_km || 10000
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar vehículo definitivamente?")) {
      try {
        await api.delete(`/vehicles/${id}`);
        toast.success("Eliminado");
        fetchVehicles();
      } catch (e) {
        console.error(e);
        toast.error(e.message || "Error al eliminar");
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Flota</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-11 border-teal-200 text-teal-700 hover:bg-teal-50">
            <Upload className="w-4 h-4 mr-2" />Carga Masiva
          </Button>
          <Button
            onClick={() => {
              setEditingId(null);
              setFormData({ plate: "", zonal_number: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });
              setIsDialogOpen(true);
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11"
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar Vehículo
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-4">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Total: {filteredVehicles.length} {filteredVehicles.length === 1 ? 'vehículo' : 'vehículos'}
        </span>
        <div className="w-full sm:max-w-xs">
          <Input
            type="text"
            placeholder="Buscar por patente, marca, zonal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-xs font-semibold rounded-xl border-slate-200 shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">N° Zonal</th>
                  <th className="p-4">Patente</th>
                  <th className="p-4">Marca/Modelo</th>
                  <th className="p-4">Año</th>
                  <th className="p-4">Kilometraje</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-4">{VEHICLE_ICONS[v.type] || <Car className="w-4 h-4" />}</td>
                    <td className="p-4 font-bold text-teal-700">{v.zonal_number ? formatZonalNumber(v.zonal_number) : "-"}</td>
                    <td className="p-4 font-bold text-slate-900">{v.plate}</td>
                    <td className="p-4 text-slate-600">{v.brand} {v.model}</td>
                    <td className="p-4 text-slate-600">{v.year}</td>
                    <td className="p-4 font-bold text-slate-700">{v.mileage?.toLocaleString()} km</td>
                    <td className="p-4">
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {v.status?.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(v)} className="text-slate-400 hover:text-teal-600 h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)} className="text-slate-400 hover:text-red-600 h-8 w-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Patente *</Label>
                <Input value={formData.plate} onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })} placeholder="ABCD-12" required />
              </div>
              <div className="space-y-2">
                <Label>N° Zonal (Opcional)</Label>
                <Input value={formData.zonal_number} onChange={(e) => setFormData({ ...formData, zonal_number: e.target.value })} placeholder="Ej: 012" maxLength={5} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Vehículo *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccione Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ambulancia">Ambulancia</SelectItem>
                    <SelectItem value="camion">Camión</SelectItem>
                    <SelectItem value="Auto/SUV">Auto / SUV</SelectItem>
                    <SelectItem value="Camioneta">Camioneta</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Ej: Toyota" />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="Ej: Hilux" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Año</Label>
                <Input type="number" value={formData.year} onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Kilometraje Inicial</Label>
                <Input type="number" value={formData.mileage} onChange={(e) => setFormData({ ...formData, mileage: parseFloat(e.target.value) })} />
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold">Guardar Vehículo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Vehículos"
        columns={[
          { key: "patente", label: "Patente", required: true },
          { key: "numero_zonal", label: "N° Zonal", required: false },
          { key: "marca", label: "Marca", required: false },
          { key: "modelo", label: "Modelo", required: false },
          { key: "tipo", label: "Tipo (Ambulancia/Auto/SUV/Camioneta/Van/camion)", required: false },
          { key: "ano", label: "Año", required: false, validate: (v) => !v || !isNaN(parseInt(v)) },
          { key: "km", label: "Kilometraje", required: false, validate: (v) => !v || !isNaN(parseFloat(v)) }
        ]}
        onImport={async (rows) => {
          try {
            for (const r of rows) {
              await api.post('/vehicles', {
                plate: r.patente.toUpperCase(),
                zonal_number: r.numero_zonal ? formatZonalNumber(r.numero_zonal) : "",
                brand: r.marca || "",
                model: r.modelo || "",
                type: r.tipo || "Auto/SUV",
                year: parseInt(r.ano) || 2024,
                mileage: parseFloat(r.km) || 0
              });
            }
            fetchVehicles();
            toast.success("Carga masiva finalizada");
          } catch (e) {
            toast.error("Error en la carga masiva");
          }
        }}
        exampleRows={[
          ["ABCD-12", "012", "Toyota", "Hilux", "Camioneta", "2022", "45000"],
          ["WXYZ-34", "015", "Fiat", "Ducato", "Ambulancia", "2021", "82000"]
        ]}
      />
    </div>
  );
}
