import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History, Search, FileText, CheckCircle2, Stethoscope, MapPin, Clock, Calendar } from "lucide-react";
import api from "@/lib/api";
import ClinicalDetailDialog from "@/components/ClinicalDetailDialog";
import { formatScheduledDate } from "@/lib/tripUtils";
import { useAuth } from "@/contexts/AuthContext";

const findMyEscortEntry = (trip, userId, userName) => {
  let staffArr = trip.assigned_clinical_staff || [];
  if (typeof staffArr === "string") {
    try { staffArr = JSON.parse(staffArr); } catch (e) { staffArr = []; }
  }
  if (!Array.isArray(staffArr)) return null;

  const parsed = staffArr.map((s) => {
    if (typeof s === "string") {
      try { return JSON.parse(s); } catch (e) { return { staff_name: s }; }
    }
    return s;
  });

  const byId = parsed.find((s) => s.staff_id && s.staff_id === userId);
  if (byId) return byId;

  const uName = (userName || "").trim().toLowerCase();
  if (!uName) return null;
  return parsed.find((s) => !s.staff_id && (s.staff_name || "").trim().toLowerCase() === uName) || null;
};

export default function ClinicalHistorySection() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get("/trips/clinical");
      // Se muestra en el historial cuando el propio acompañante finalizó su
      // parte (no cuando el conductor termina el traslado), o si el
      // traslado se canceló (ya no hay nada que finalizar).
      setTrips((res.data || []).filter(t => {
        const mine = findMyEscortEntry(t, user?.id, user?.name)?.status;
        return mine === "completado" || t.status === "cancelado";
      }));
    } catch (e) {
      console.error("Error fetching clinical history:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredTrips = trips.filter(t =>
    (t.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.tracking_number || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.origin || "").toLowerCase().includes(search.toLowerCase()) ||
    (t.destination || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-teal-600" /> Historial de Asistencias Clínicas
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Registro histórico de acompañamientos y traslados asistidos completados.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por paciente, folio u origen..."
            className="pl-9 h-9 text-xs rounded-xl border-slate-200"
          />
        </div>
      </div>

      {filteredTrips.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-200 rounded-3xl bg-white">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-black text-slate-700 text-sm uppercase">Sin historial de traslados</h3>
          <p className="text-xs text-slate-400 mt-1">No se encontraron acompañamientos finalizados.</p>
        </Card>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-slate-100">
            {filteredTrips.map(t => {
              const mine = findMyEscortEntry(t, user?.id, user?.name)?.status;
              const isCancelled = t.status === "cancelado" && mine !== "completado";
              return (
              <div key={t.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                      #{t.tracking_number}
                    </span>
                    <Badge className={`text-[9px] font-black uppercase ${
                      isCancelled ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-emerald-100 text-emerald-800 border-emerald-200"
                    }`}>
                      {isCancelled ? "Cancelado" : "Acompañamiento finalizado"}
                    </Badge>
                    <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {t.scheduled_date ? formatScheduledDate(t.scheduled_date) : "Fecha no esp."}
                    </span>
                  </div>

                  <p className="font-black text-sm text-slate-900 uppercase">{t.patient_name || "Paciente"}</p>
                  <p className="text-xs text-slate-500 font-medium">
                    {t.origin} ➔ {t.destination} {t.patient_unit ? `(${t.patient_unit})` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setSelectedTrip(t)}
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold text-teal-700 border-teal-200 hover:bg-teal-50 h-8"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1" /> Ficha y Notas
                  </Button>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Ficha Clínica */}
      <ClinicalDetailDialog
        trip={selectedTrip}
        open={!!selectedTrip}
        onOpenChange={() => setSelectedTrip(null)}
        onRefresh={fetchHistory}
      />
    </div>
  );
}
