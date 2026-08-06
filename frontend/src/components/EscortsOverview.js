import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Stethoscope, RefreshCw } from "lucide-react";
import api from "@/lib/api";

export default function EscortsOverview() {
  const [escorts, setEscorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEscorts = useCallback(async () => {
    try {
      const res = await api.get("/trips/escorts-overview");
      setEscorts(res.data || []);
    } catch (e) {
      console.error("Error al cargar control de acompañantes:", e);
      toast.error("Error al cargar el control de acompañantes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscorts();
    const interval = setInterval(fetchEscorts, 30000);
    return () => clearInterval(interval);
  }, [fetchEscorts]);

  const filteredEscorts = escorts.filter((e) =>
    (e.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.department || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onDuty = escorts.filter((e) => e.is_working).length;
  const activeNow = escorts.reduce((sum, e) => sum + e.active_count, 0);

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex items-center gap-2 mb-1">
        <Stethoscope className="w-6 h-6 text-teal-600" />
        <h1 className="text-2xl font-bold text-slate-900">Control de Acompañantes</h1>
      </div>
      <p className="text-xs text-slate-500 font-medium mb-6">
        Disponibilidad, carga de trabajo actual e histórico de acompañamientos por persona.
      </p>

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total: {filteredEscorts.length} {filteredEscorts.length === 1 ? "acompañante" : "acompañantes"}
          </span>
          <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-black">
            🟢 {onDuty} en turno
          </Badge>
          <Badge className="bg-teal-100 text-teal-800 border-none text-[10px] font-black">
            {activeNow} acompañamientos activos ahora
          </Badge>
        </div>
        <div className="w-full sm:max-w-xs">
          <Input
            type="text"
            placeholder="Buscar por nombre o profesión..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 text-xs font-semibold rounded-xl border-slate-200 shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-600 mb-3" />
          <p className="font-bold text-xs">Cargando control de acompañantes...</p>
        </div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Nombre / Profesión</th>
                  <th className="p-4 text-center">Turno</th>
                  <th className="p-4 text-center">Carga Actual</th>
                  <th className="p-4 text-center">Histórico Completados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEscorts.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">{e.department}</p>
                    </td>
                    <td className="p-4 text-center">
                      {e.is_working ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-black">🟢 En Turno</Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-none text-[10px] font-black">⚪ Fuera de Turno</Badge>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={`border-none text-[10px] font-black ${e.active_count > 0 ? "bg-teal-100 text-teal-800" : "bg-slate-100 text-slate-500"}`}>
                        {e.active_count} {e.active_count === 1 ? "acompañamiento" : "acompañamientos"}
                      </Badge>
                    </td>
                    <td className="p-4 text-center text-slate-700 font-bold">
                      {e.completed_count}
                    </td>
                  </tr>
                ))}
                {filteredEscorts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-slate-400">
                      No hay acompañantes clínicos registrados.
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
