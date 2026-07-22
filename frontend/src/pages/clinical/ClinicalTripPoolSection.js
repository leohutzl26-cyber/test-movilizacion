import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, ArrowRight, Clock, CalendarDays, Activity, Stethoscope, UserCheck, RefreshCw, AlertCircle, ShoppingBag } from "lucide-react";
import api from "@/lib/api";
import { formatScheduledDate } from "@/lib/tripUtils";

export default function ClinicalTripPoolSection({ onAssignSuccess }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigningId, setAssigningId] = useState(null);

  const fetchPool = useCallback(async () => {
    try {
      const res = await api.get("/trips/clinical-pool");
      setTrips(res.data || []);
    } catch (e) {
      console.error("Error al cargar bolsa de viajes clínicos:", e);
      toast.error("Error al cargar la bolsa de viajes disponibles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPool();
    const interval = setInterval(fetchPool, 15000);
    return () => clearInterval(interval);
  }, [fetchPool]);

  const handleSelfAssign = async (tripId) => {
    setAssigningId(tripId);
    try {
      await api.put(`/trips/${tripId}/self-assign-clinical`);
      toast.success("¡Te has asignado correctamente como acompañante!");
      if (onAssignSuccess) onAssignSuccess();
      fetchPool();
    } catch (e) {
      console.error("Error al asignarse viaje:", e);
      toast.error("No se pudo realizar la auto-asignación");
    } finally {
      setAssigningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
        <Activity className="w-8 h-8 animate-spin text-teal-600" />
        <span className="text-sm font-bold uppercase tracking-wider">Cargando Bolsa de Viajes Clínicos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-teal-400" /> Bolsa de Viajes Clínicos
          </h2>
          <p className="text-xs text-teal-100/80 mt-0.5">
            Traslados que requieren acompañamiento y no tienen personal clínico asignado.
          </p>
        </div>
        <Badge className="bg-amber-400 text-amber-950 font-black text-xs px-3 py-1 rounded-full shrink-0 shadow-xs">
          {trips.length} Disponibles
        </Badge>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-16 bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 space-y-3">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-base font-black text-slate-700 uppercase tracking-wide">
            No hay solicitudes disponibles en la bolsa
          </p>
          <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">
            Todas las solicitudes clínicas actuales ya cuentan con personal de acompañamiento asignado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((t) => (
            <Card key={t.id} className="border border-slate-200 shadow-sm hover:shadow-md transition-all rounded-2xl bg-white overflow-hidden flex flex-col justify-between">
              <CardContent className="p-4 space-y-3">
                {/* Cabecera Tarjeta */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <span className="bg-teal-50 text-teal-700 border border-teal-200 font-mono px-2.5 py-1 rounded-lg text-xs font-black">
                    #{t.tracking_number || t.id.substring(0,6).toUpperCase()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Badge className={`text-[10px] font-black uppercase px-2 py-0.5 border-none ${
                      t.priority === "urgente" ? "bg-red-500 text-white animate-pulse" : t.priority === "alta" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {t.priority}
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800 border-none text-[10px] font-bold uppercase px-2 py-0.5">
                      Sin Acompañante
                    </Badge>
                  </div>
                </div>

                {/* Paciente y Cita */}
                <div>
                  <h3 className="font-black text-base text-slate-900 leading-tight">
                    {t.patient_name || "Paciente no especificado"}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                    Motivo: {t.transfer_reason || "Traslado Clínico"}
                  </p>
                </div>

                {/* Fecha y Hora */}
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
                    <span>{formatScheduledDate(t.scheduled_date)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{t.appointment_time || "--:--"}</span>
                  </div>
                </div>

                {/* Ruta Origen -> Destino */}
                <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs font-bold">
                  <div className="flex items-center gap-2 text-teal-800">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <span className="truncate">{t.origin}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-800">
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="truncate">{t.destination}</span>
                  </div>
                </div>

                {/* Botón de Auto-asignación */}
                <Button
                  onClick={() => handleSelfAssign(t.id)}
                  disabled={assigningId === t.id}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black text-xs h-11 rounded-xl uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer mt-2"
                >
                  {assigningId === t.id ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Asignando...
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Tomar Acompañamiento
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
