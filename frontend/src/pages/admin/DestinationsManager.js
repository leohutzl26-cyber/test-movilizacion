import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Upload, MapPin, Trash2 } from "lucide-react";
import api from "@/lib/api";
import BulkUploader from "@/components/BulkUploader";

export default function DestinationsManager() {
  const [dests, setDests] = useState([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);

  const handleOpenGoogleMaps = () => {
    if (!address.trim()) {
      toast.error("Por favor escriba una dirección primero");
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, "_blank");
  };

  const fetchDests = useCallback(async () => {
    try {
      const r = await api.get('/destinations');
      setDests(r.data || []);
    } catch (e) {
      toast.error("Error al cargar destinos");
    }
  }, []);

  useEffect(() => {
    fetchDests();
  }, [fetchDests]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/destinations', { name, address });
      setName("");
      setAddress("");
      fetchDests();
      toast.success("Destino agregado");
    } catch (e) {
      toast.error("Error al agregar");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/destinations/${id}`);
      fetchDests();
      toast.success("Eliminado");
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const handleBulkImport = async (rows) => {
    try {
      for (const r of rows) {
        await api.post('/destinations', { name: r.nombre, address: r.direccion || "" });
      }
      fetchDests();
      toast.success("Carga masiva finalizada");
    } catch (e) {
      toast.error("Error en la carga masiva");
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Puntos Frecuentes (Destinos)</h1>
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-5">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label className="font-bold">Nombre del Destino</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Clínica Las Condes, Laboratorio Central..."
                className="h-11"
              />
            </div>
            <div className="flex-1 space-y-2 w-full">
              <Label className="font-bold">Dirección del Destino</Label>
              <div className="flex gap-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Las Condes 763..."
                  className="h-11 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 shrink-0"
                  onClick={handleOpenGoogleMaps}
                >
                  <ExternalLink className="w-4 h-4 text-teal-600" />
                  <span className="hidden sm:inline text-xs font-bold">G-Maps</span>
                </Button>
              </div>
            </div>
            <Button type="submit" className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 shrink-0 w-full sm:w-auto">
              Agregar a Lista
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkOpen(true)}
              className="h-11 font-bold border-teal-200 text-teal-700 hover:bg-teal-50 px-6 shrink-0 w-full sm:w-auto"
            >
              <Upload className="w-4 h-4 mr-2 inline" />
              Carga Masiva
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dests.map((d) => (
          <div
            key={d.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col group hover:border-teal-300 transition-colors relative"
          >
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-500" /> {d.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all absolute right-2 top-2"
                onClick={() => handleDelete(d.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {d.address && <p className="text-xs text-slate-500 font-medium mt-1.5 pl-6">{d.address}</p>}
          </div>
        ))}
      </div>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Destinos"
        columns={[
          { key: "nombre", label: "Nombre del Destino", required: true },
          { key: "direccion", label: "Dirección del Destino" }
        ]}
        onImport={handleBulkImport}
        exampleRows={[
          ["Clínica Las Condes", "Av. Las Condes 763"],
          ["Laboratorio Central", "Av. Providencia 1234"]
        ]}
      />
    </div>
  );
}
