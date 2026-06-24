import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { XCircle, Search, ArrowRight, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function TripsManager() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('trips').select('*').order('created_at', { ascending: false });
      if (search) {
        query = query.ilike('tracking_number', `%${search}%`);
      }
      const { data } = await query;
      if (data) setTrips(data || []);
    } catch (e) {
      toast.error("Error al cargar viajes");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleDeleteIndividual = async (id, tracking) => {
    if (window.confirm(`¿Seguro que desea eliminar el viaje ${tracking}? Esta acción es irreversible.`)) {
      try {
        await supabase.from('trips').delete().eq('id', id);
        toast.success("Viaje eliminado");
        fetchTrips();
      } catch (e) {
        toast.error("No se pudo eliminar el viaje");
      }
    }
  };

  const handleClearAll = async () => {
    const val = window.prompt("Escriba 'ELIMINAR TODO' para confirmar el borrado total de la base de datos de viajes.");
    if (val === "ELIMINAR TODO") {
      setIsDeletingAll(true);
      try {
        await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        toast.success("Base de datos de viajes limpiada");
        fetchTrips();
      } catch (e) {
        toast.error("Error en la limpieza total");
      } finally {
        setIsDeletingAll(false);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Viajes</h1>
        <Button
          variant="destructive"
          onClick={handleClearAll}
          disabled={isDeletingAll}
          className="font-bold shadow-lg"
        >
          <XCircle className="w-4 h-4 mr-2" />
          {isDeletingAll ? "Limpiando..." : "Limpiar Todo (ADMIN)"}
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Buscar viaje por Folio..."
          className="pl-11 h-12 bg-white border-slate-300 shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Cargando viajes...</div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Folio</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Origen/Destino</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-teal-700">{t.tracking_number}</td>
                    <td className="p-4 text-slate-500">{t.scheduled_date ? t.scheduled_date.split('T')[0] : "-"}</td>
                    <td className="p-4 font-medium text-slate-900">{t.patient_name || "Cometido Func."}</td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[120px]">{t.origin}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="truncate max-w-[120px]">{t.destination}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5">
                        {t.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-slate-300 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteIndividual(t.id, t.tracking_number)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {trips.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-slate-400 font-medium">
                      No se encontraron traslados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
