import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Upload, MapPin, Trash2 } from "lucide-react";
import api from "@/lib/api";
import BulkUploader from "@/components/BulkUploader";

export default function OriginsManager() {
  const [origins, setOrigins] = useState([]);
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

  const fetchOrigins = useCallback(async () => {
    try {
      const r = await api.get('/origins');
      setOrigins(r.data || []);
    } catch (e) {
      toast.error("Error al cargar orígenes");
    }
  }, []);

  useEffect(() => {
    fetchOrigins();
  }, [fetchOrigins]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/origins', { name, address });
      setName("");
      setAddress("");
      fetchOrigins();
      toast.success("Origen agregado");
    } catch (e) {
      toast.error("Error al agregar");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/origins/${id}`);
      fetchOrigins();
      toast.success("Eliminado");
    } catch (e) {
      toast.error("Error al eliminar");
    }
  };

  const handleBulkImport = async (rows) => {
    try {
      for (const r of rows) {
        await api.post('/origins', { name: r.nombre, address: r.direccion || "" });
      }
      fetchOrigins();
      toast.success("Carga masiva finalizada");
    } catch (e) {
      toast.error("Error en la carga masiva");
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Puntos Frecuentes (Orígenes)</h1>
      <Card className="mb-6 shadow-sm">
        <CardContent className="p-5">
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2 w-full">
              <Label className="font-bold">Nombre del Origen</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Hospital Central, Bodega Central..."
                className="h-11"
              />
            </div>
            <div className="flex-1 space-y-2 w-full">
              <Label className="font-bold">Dirección del Origen</Label>
              <div className="flex gap-2">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Principal 123..."
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
        {origins.map((o) => (
          <div
            key={o.id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col group hover:border-teal-300 transition-colors relative"
          >
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-500" /> {o.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all absolute right-2 top-2"
                onClick={() => handleDelete(o.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {o.address && <p className="text-xs text-slate-500 font-medium mt-1.5 pl-6">{o.address}</p>}
          </div>
        ))}
      </div>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Orígenes"
        columns={[
          { key: "nombre", label: "Nombre del Origen", required: true },
          { key: "direccion", label: "Dirección del Origen" }
        ]}
        onImport={handleBulkImport}
        exampleRows={[
          ["Hospital Central", "Av. Principal 123"],
          ["Bodega Central", "Sector Industrial 45"]
        ]}
      />
    </div>
  );
}
