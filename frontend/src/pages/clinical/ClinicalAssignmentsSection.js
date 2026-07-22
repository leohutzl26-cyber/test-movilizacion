import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Stethoscope, User, MapPin, ArrowRight, Clock, Truck, FileText, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import ClinicalDetailDialog from "@/components/ClinicalDetailDialog";
import { formatScheduledDate } from "@/lib/tripUtils";

export default function ClinicalAssignmentsSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState("pendientes");

  const fetchTrips = useCallback(async () => {
    try {
      const res = await api.get("/trips/clinical");
      setTrips(res.data || []);
    } catch (e) {
      console.error("Error fetching clinical assignments:", e);
      toast.error("Error al cargar traslados asignados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 15000);
    return () => clearInterval(interval);
  }, [fetchTrips]);

  const todayStr = new Date().toISOString().split("T")[0];

  const cleanDateStr = (dateStr) => {
    if (!dateStr) return "";
    return dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
  };

  const isTodayOrPast = (t) => {
    if (t.status === "en_curso") return true;
    const d = cleanDateStr(t.scheduled_date);
    return !d || d <= todayStr;
  };

  const activeTrips = trips.filter(t => t.status === "en_curso" || t.status === "asignado" || t.status === "pendiente");
  const completedTrips = trips.filter(t => t.status === "completado");
  const displayTrips = activeTab === "pendientes" ? activeTrips : completedTrips;

  const sortedTrips = [...displayTrips].sort((a, b) => {
    const aTop = isTodayOrPast(a);
    const bTop = isTodayOrPast(b);
    if (aTop && !bTop) return -1;
    if (!aTop && bTop) return 1;
    const dateA = cleanDateStr(a.scheduled_date) || "";
    const dateB = cleanDateStr(b.scheduled_date) || "";
    return dateA.localeCompare(dateB);
  });

  if (loading && trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-teal-600 mb-3" />
        <p className="font-bold text-xs">Cargando asignaciones clínicas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-teal-600" /> Mis Asignaciones Clínicas
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Traslados asistidos que requieren acompañamiento médico, enfermería o TENS.
          </p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("pendientes")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
              activeTab === "pendientes" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}
          >
            Pendientes / En Curso ({activeTrips.length})
          </button>
          <button
            onClick={() => setActiveTab("completados")}
            className={`px-4 py-2 text-xs font-black rounded-lg transition-all ${
              activeTab === "completados" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"
            }`}
          >
            Finalizados ({completedTrips.length})
          </button>
        </div>
      </div>

      {sortedTrips.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-200 rounded-3xl bg-white">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-black text-slate-700 text-sm uppercase">Sin traslados asignados</h3>
          <p className="text-xs text-slate-400 mt-1">
            No tienes acompañamientos registrados en este momento. Revisa la Bolsa de Viajes.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTrips.map(t => {
            const highlighted = isTodayOrPast(t) && t.status !== "completado";
            return (
              <Card
                key={t.id}
                className={`shadow-md hover:shadow-lg transition-all duration-300 border-2 rounded-2xl overflow-hidden flex flex-col justify-between ${
                  t.status === "en_curso" ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20" :
                  highlighted ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/30 shadow-emerald-100" :
                  t.priority === "urgente" ? "border-red-400 bg-red-50/20" : "border-slate-200 bg-white"
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Cabecera Tarjeta */}
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="bg-slate-900 text-white font-mono px-2 py-0.5 rounded text-xs font-black">
                          #{t.tracking_number}
                        </span>
                        {highlighted && (
                          <Badge className="bg-emerald-600 text-white font-black text-[9px] uppercase px-2 py-0.5 animate-pulse shadow-xs border-none">
                            🔥 ATENCIÓN HOY
                          </Badge>
                        )}
                        <Badge className={`text-[9px] font-black uppercase border-none ${
                          t.status === "en_curso" ? "bg-blue-600 text-white" :
                          t.status === "completado" ? "bg-emerald-600 text-white" : "bg-teal-600 text-white"
                        }`}>
                          {t.status === "en_curso" ? "EN RUTA" : (t.status || "").toUpperCase()}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 block">
                        Fecha: {t.scheduled_date ? formatScheduledDate(t.scheduled_date) : "Hoy"}
                      </span>
                    </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">Hora Citación</span>
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      {t.appointment_time || t.departure_time || "--:--"}
                    </span>
                  </div>
                </div>

                {/* Información Paciente */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paciente</span>
                    {t.patient_unit && (
                      <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
                        {t.patient_unit}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-sm text-slate-900 truncate uppercase">{t.patient_name || "Paciente sin nombre"}</p>
                  {t.diagnosis && (
                    <p className="text-[11px] font-semibold text-slate-600 line-clamp-2 italic">
                      "Diagnóstico: {t.diagnosis}"
                    </p>
                  )}
                </div>

                {/* Origen y Destino */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-slate-700 truncate">{t.origin}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="font-bold text-slate-700 truncate">{t.destination}</span>
                  </div>
                </div>

                {/* Requerimientos Clínicos */}
                {(t.patient_requirements || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {t.patient_requirements.map((r, i) => (
                      <span key={i} className="text-[9px] font-extrabold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded">
                        {typeof r === 'object' ? r.name || r.label : r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Botón Abrir Ficha Clínica */}
                <Button
                  onClick={() => setSelectedTrip(t)}
                  className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileText className="w-4 h-4" /> Ver Ficha y Confirmar
                </Button>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}

      {/* Modal Ficha Clínica */}
      <ClinicalDetailDialog
        trip={selectedTrip}
        open={!!selectedTrip}
        onOpenChange={() => setSelectedTrip(null)}
        onRefresh={fetchTrips}
      />
    </div>
  );
}
