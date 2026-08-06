import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Stethoscope, MapPin, ArrowRight, Clock, FileText, CheckCircle2, RefreshCw, Users } from "lucide-react";
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

export default function ClinicalAssignmentsSection() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState("pendientes");
  const [finalizeDialog, setFinalizeDialog] = useState(null); // { isGroup, trip? , groupId?, trips? }
  const [finalizeNotes, setFinalizeNotes] = useState("");
  const [finalizing, setFinalizing] = useState(false);

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

  const myStatus = (t) => findMyEscortEntry(t, user?.id, user?.name)?.status || "en_curso";

  const activeTrips = trips.filter((t) => myStatus(t) !== "completado");
  const completedTrips = trips.filter((t) => myStatus(t) === "completado");
  const displayTrips = activeTab === "pendientes" ? activeTrips : completedTrips;

  const groupedDisplayItems = (() => {
    const groupMap = new Map();
    const ungrouped = [];

    displayTrips.forEach((trip) => {
      const gId = trip.dispatch_group_id || trip.group_id;
      if (gId) {
        if (!groupMap.has(gId)) groupMap.set(gId, []);
        groupMap.get(gId).push(trip);
      } else {
        ungrouped.push(trip);
      }
    });

    const items = [];
    groupMap.forEach((tripsInGroup, gId) => {
      if (tripsInGroup.length > 1) {
        items.push({ isGroup: true, groupId: gId, trips: tripsInGroup });
      } else {
        items.push({ isGroup: false, trip: tripsInGroup[0] });
      }
    });

    ungrouped.forEach((trip) => items.push({ isGroup: false, trip }));

    const sortItems = (a, b) => {
      const tripA = a.isGroup ? a.trips[0] : a.trip;
      const tripB = b.isGroup ? b.trips[0] : b.trip;
      const aTop = isTodayOrPast(tripA);
      const bTop = isTodayOrPast(tripB);
      if (aTop && !bTop) return -1;
      if (!aTop && bTop) return 1;
      const dateA = cleanDateStr(tripA.scheduled_date) || "";
      const dateB = cleanDateStr(tripB.scheduled_date) || "";
      return dateA.localeCompare(dateB);
    };

    return items.sort(sortItems);
  })();

  const openFinalizeDialog = (target) => {
    setFinalizeNotes("");
    setFinalizeDialog(target);
  };

  const handleFinalize = async () => {
    if (!finalizeDialog) return;
    setFinalizing(true);
    try {
      const targetTrips = finalizeDialog.isGroup ? finalizeDialog.trips : [finalizeDialog.trip];
      // En una misión multitraslado, algún tramo puede ya estar finalizado
      // por el propio acompañante; se omite para no reenviar una transición
      // inválida (mismo criterio que el cierre grupal del conductor).
      const tripsToFinalize = targetTrips.filter((t) => myStatus(t) !== "completado");

      await Promise.all(
        tripsToFinalize.map((t) => {
          // Se agrega al final de las notas existentes en vez de
          // reemplazarlas, para no perder observaciones ya registradas.
          const closingNote = finalizeNotes
            ? `${t.clinical_notes ? t.clinical_notes + "\n" : ""}[Cierre de acompañamiento]: ${finalizeNotes}`
            : undefined;
          return api.put(`/trips/${t.id}/finalize-clinical`, { clinical_notes: closingNote });
        })
      );

      toast.success(
        finalizeDialog.isGroup ? "Acompañamiento de la misión finalizado" : "Acompañamiento finalizado exitosamente"
      );
      setFinalizeDialog(null);
      fetchTrips();
    } catch (e) {
      console.error("Error al finalizar acompañamiento:", e);
      toast.error("No se pudo finalizar el acompañamiento");
    } finally {
      setFinalizing(false);
    }
  };

  if (loading && trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-teal-600 mb-3" />
        <p className="font-bold text-xs">Cargando asignaciones clínicas...</p>
      </div>
    );
  }

  const renderStatusBadges = (t, mine) => (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className="bg-slate-900 text-white font-mono px-2 py-0.5 rounded text-xs font-black">
        #{t.tracking_number}
      </span>
      <Badge className={`text-[9px] font-black uppercase border-none ${
        t.status === "en_curso" ? "bg-blue-600 text-white" :
        t.status === "completado" ? "bg-emerald-600 text-white" : "bg-teal-600 text-white"
      }`}>
        {t.status === "en_curso" ? "TRASLADO EN RUTA" : (t.status || "").toUpperCase()}
      </Badge>
      {mine === "completado" ? (
        <Badge className="text-[9px] font-black uppercase border-none bg-slate-200 text-slate-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Acompañamiento finalizado
        </Badge>
      ) : (
        <Badge className="text-[9px] font-black uppercase border-none bg-teal-100 text-teal-800 flex items-center gap-1">
          <Stethoscope className="w-3 h-3" /> Acompañamiento en curso
        </Badge>
      )}
    </div>
  );

  const renderSingleCard = (t) => {
    const mine = myStatus(t);
    const highlighted = isTodayOrPast(t) && mine !== "completado";
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
          <div className="flex justify-between items-start">
            <div className="space-y-1.5">
              {renderStatusBadges(t, mine)}
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
          </div>

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

          <div className="flex gap-2">
            <Button
              onClick={() => setSelectedTrip(t)}
              variant="outline"
              className="flex-1 border-teal-200 text-teal-700 hover:bg-teal-50 font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4" /> Ver Ficha
            </Button>
            {mine !== "completado" && (
              <Button
                onClick={() => openFinalizeDialog({ isGroup: false, trip: t })}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> Finalizar Acompañamiento
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderGroupCard = (groupId, groupTrips) => {
    const allDone = groupTrips.every((t) => myStatus(t) === "completado");
    return (
      <Card key={groupId} className="border-2 border-indigo-500/90 shadow-lg rounded-2xl bg-gradient-to-br from-indigo-50/40 via-white to-white overflow-hidden md:col-span-2 lg:col-span-3">
        <CardContent className="p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className="bg-indigo-600 text-white font-mono text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> MISIÓN MULTITRASLADO #{groupId}
              </Badge>
              <Badge className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-black px-2 py-0.5">
                {groupTrips.length} tramos
              </Badge>
              {allDone && (
                <Badge className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Acompañamiento finalizado
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {groupTrips.map((subTrip, idx) => {
              const mine = myStatus(subTrip);
              return (
                <div key={subTrip.id} className="p-2.5 bg-white border border-indigo-100 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-900 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded">
                      Parada {idx + 1}
                    </span>
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${mine === "completado" ? "bg-slate-100 text-slate-500" : "bg-teal-100 text-teal-700"}`}>
                      {mine === "completado" ? "Finalizado" : "En curso"}
                    </span>
                  </div>
                  <p className="font-black text-slate-900 truncate">{subTrip.patient_name || "Paciente no especificado"}</p>
                  <p className="text-slate-500 font-bold truncate">{subTrip.origin} → {subTrip.destination}</p>
                  <button
                    onClick={() => setSelectedTrip(subTrip)}
                    className="text-teal-700 font-bold underline underline-offset-2"
                  >
                    Ver ficha
                  </button>
                </div>
              );
            })}
          </div>

          {!allDone && (
            <Button
              onClick={() => openFinalizeDialog({ isGroup: true, groupId, trips: groupTrips })}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-11 rounded-xl uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Finalizar Acompañamiento de la Misión ({groupTrips.length} tramos)
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

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
            En Curso ({activeTrips.length})
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

      {groupedDisplayItems.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-200 rounded-3xl bg-white">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-black text-slate-700 text-sm uppercase">Sin traslados asignados</h3>
          <p className="text-xs text-slate-400 mt-1">
            No tienes acompañamientos registrados en este momento. Revisa la Bolsa de Viajes.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedDisplayItems.map((item) =>
            item.isGroup ? renderGroupCard(item.groupId, item.trips) : renderSingleCard(item.trip)
          )}
        </div>
      )}

      <ClinicalDetailDialog
        trip={selectedTrip}
        open={!!selectedTrip}
        onOpenChange={() => setSelectedTrip(null)}
        onRefresh={fetchTrips}
      />

      <Dialog open={!!finalizeDialog} onOpenChange={(open) => !open && setFinalizeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Finalizar Acompañamiento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              {finalizeDialog?.isGroup
                ? `Vas a finalizar tu acompañamiento en los ${finalizeDialog.trips.length} tramos de esta misión multitraslado. Quedarás disponible para tomar otro traslado.`
                : "Vas a finalizar tu acompañamiento en este traslado. Quedarás disponible para tomar otro."}
            </p>
            <Textarea
              value={finalizeNotes}
              onChange={(e) => setFinalizeNotes(e.target.value)}
              placeholder="Observaciones de cierre (opcional)..."
              className="text-sm min-h-[80px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizeDialog(null)} disabled={finalizing}>
              Cancelar
            </Button>
            <Button onClick={handleFinalize} disabled={finalizing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {finalizing ? "Finalizando..." : "Confirmar y Finalizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
