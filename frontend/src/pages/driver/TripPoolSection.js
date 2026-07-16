import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, Truck, MapPin, ArrowRight, Navigation, FileText, ShieldAlert, Siren, ClipboardList } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { formatScheduledDate } from "@/lib/tripUtils";

export default function TripPoolSection({ onNavigate }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [activeTab, setActiveTab] = useState("ambulance");

  const ambulanceTrips = trips.filter((t) => t.trip_type === "clinico");
  const otherTrips = trips.filter((t) => t.trip_type !== "clinico");
  const displayTrips = activeTab === "ambulance" ? ambulanceTrips : otherTrips;

  const fetchPool = useCallback(async () => {
    try {
      const r = await api.get("/trips/pool");
      console.log("Pool data:", r.data);
      setTrips(r.data || []);
    } catch (err) {
      console.error("Error fetching pool:", err.response?.status, err.response?.data, err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPool();
    const interval = setInterval(fetchPool, 10000);
    return () => clearInterval(interval);
  }, [fetchPool]);

  const handleTakeTrip = async (id) => {
    try {
      await api.put(`/trips/${id}/assign`);
      toast.success("¡Viaje tomado exitosamente!");
      fetchPool();
      onNavigate("trips");
    } catch (e) {
      toast.error("Error al tomar el viaje");
    }
  };

  const priorityColors = {
    urgente: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.45)] border border-red-400 font-black animate-pulse",
    alta: "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_8px_rgba(249,115,22,0.45)] border border-orange-400 font-black",
    normal: "bg-slate-100 text-slate-600 border border-slate-200 font-semibold",
  };
  const sLabels = { pendiente: "Pendiente", asignado: "Asignado", en_curso: "En Curso", completado: "Completado", cancelado: "Cancelado" };
  const sColors = {
    pendiente: "bg-amber-100 text-amber-800 border border-amber-200",
    revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200",
    asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200",
    en_curso: "bg-cyan-100 text-cyan-800 border border-cyan-200",
    completado: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    cancelado: "bg-rose-100 text-rose-800 border border-rose-200",
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <Clock className="w-10 h-10 animate-spin text-teal-600 mb-4" />
        <p>Buscando viajes disponibles...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Bolsa de Viajes</h1>
        <Badge variant="outline" className="text-sm bg-white shadow-sm border-teal-200 text-teal-800 px-3 py-1">
          {trips.length} en espera
        </Badge>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("ambulance")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${
            activeTab === "ambulance"
              ? "border-red-600 bg-red-50 text-red-800 shadow-sm"
              : "border-slate-200 bg-white text-slate-400 hover:border-red-200"
          }`}
        >
          <Siren className="w-4 h-4" /> Ambulancias ({ambulanceTrips.length})
        </button>
        <button
          onClick={() => setActiveTab("others")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${
            activeTab === "others"
              ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm"
              : "border-slate-200 bg-white text-slate-400 hover:border-teal-200"
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Otros ({otherTrips.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {displayTrips.map((t) => (
          <Card
            key={t.id}
            className={`shadow-md transition-all hover:shadow-lg ${
              t.priority === "urgente" 
                ? "border-t-8 border-t-red-600 ring-2 ring-red-500/20 shadow-red-50" 
                : t.priority === "alta" 
                  ? "border-t-8 border-t-orange-500 ring-2 ring-orange-500/20 shadow-orange-50" 
                  : "border-t-4 border-t-teal-500"
            }`}
          >
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2">
                  <span className="bg-slate-800 text-white font-mono px-3 py-1 rounded-md text-sm font-black self-start shadow-sm tracking-widest">
                    {t.tracking_number || t.id.substring(0, 6).toUpperCase()}
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider self-start flex items-center gap-1.5 shadow-sm ${
                      priorityColors[t.priority] || priorityColors.normal
                    }`}
                  >
                    {t.priority === "urgente" && "🚨"}
                    {t.priority === "alta" && "⚠️"}
                    {t.priority}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-700 bg-slate-200 px-3 py-1.5 rounded-md border border-slate-300 shadow-sm">
                  {t.scheduled_date ? formatScheduledDate(t.scheduled_date) : new Date(t.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="mb-4">
                <p className="font-black text-xl text-slate-900 leading-tight mb-2">
                  {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                </p>
                <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border border-slate-200">
                  {t.trip_type === "clinico" ? "Traslado Clínico" : "Cometido No Clínico"}
                </span>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 mb-4 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</p>
                    <p className="text-base font-bold text-slate-900 leading-snug">{t.origin}</p>
                    {t.origin_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{t.origin_address}</p>}
                    <p className="text-xs text-slate-500 font-medium">{t.patient_unit || ""}</p>
                    {(t.origin_maps_url || t.origin) && (
                      <a
                        href={
                          t.origin_maps_url ||
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.origin_address || t.origin)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                      >
                        <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                      </a>
                    )}
                  </div>
                </div>
                <div className="ml-2.5 pl-3.5 border-l-2 border-dashed border-slate-300 py-1"></div>
                <div className="flex items-start gap-3">
                  <Navigation className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destino</p>
                    <p className="text-base font-bold text-slate-900 leading-snug">{t.destination}</p>
                    {t.destination_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{t.destination_address}</p>}
                    {(t.destination_maps_url || t.destination) && (
                      <a
                        href={
                          t.destination_maps_url ||
                          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(t.destination_address || t.destination)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                      >
                        <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {t.trip_type === "clinico" && t.patient_requirements?.length > 0 && (
                <div className="mb-4 bg-amber-50 p-3 rounded-lg border border-amber-200 shadow-sm">
                  <p className="text-[10px] font-black text-amber-800 uppercase flex items-center gap-1.5 mb-1">
                    <ShieldAlert className="w-4 h-4" /> Requerimientos Especiales
                  </p>
                  <p className="text-xs text-amber-900 font-bold">{t.patient_requirements.join(", ")}</p>
                </div>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setSelectedTrip(t)}
                  className="flex-1 border-teal-200 text-teal-700 hover:bg-teal-50 font-bold h-12 rounded-xl text-xs sm:text-sm"
                >
                  <FileText className="w-5 h-5 mr-1.5" /> Detalles
                </Button>
                <Button
                  onClick={() => handleTakeTrip(t.id)}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-sm rounded-xl text-xs sm:text-sm"
                >
                  <Truck className="w-5 h-5 mr-1.5" /> Tomar Viaje
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {displayTrips.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-sm">
            <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-slate-50">
              {activeTab === "ambulance" ? <Siren className="w-10 h-10 text-slate-200" /> : <ClipboardList className="w-10 h-10 text-slate-200" />}
            </div>
            <p className="text-xl font-bold text-slate-500">No hay {activeTab === "ambulance" ? "ambulancias" : "otros viajes"} disponibles</p>
            <p className="text-sm font-medium mt-1">La bolsa de {activeTab === "ambulance" ? "ambulancias" : "otros traslados"} está vacía.</p>
          </div>
        )}
      </div>

      {selectedTrip && (
        <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 border-b pb-2 flex items-center justify-between">
                Detalle Completo{" "}
                <Badge className="bg-slate-800 text-white font-mono text-base px-3 py-1 tracking-widest">{selectedTrip.tracking_number}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 text-sm pt-2">
              <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm">
                <p className="text-sm text-red-600 font-black mb-1 flex items-center gap-1.5 uppercase tracking-wider">
                  <Clock className="w-5 h-5" /> Horarios de Traslado
                </p>
                <p className="font-black text-red-900 text-xl md:text-2xl mt-1">
                  Citación: {selectedTrip.appointment_time || "-"} <span className="text-slate-400 mx-2">|</span> Salida:{" "}
                  {selectedTrip.departure_time || "-"}
                </p>
                <p className="text-base font-bold text-red-800 mt-2 bg-red-100 inline-block px-3 py-1 rounded-lg">
                  Fecha: {formatScheduledDate(selectedTrip.scheduled_date)}
                </p>
              </div>
              <div className="flex gap-2 mb-2 mt-4">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${sColors[selectedTrip.status]}`}>
                  {sLabels[selectedTrip.status]}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">
                  {selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Traslado No Clínico"}
                </span>
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${selectedTrip.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>
                  {selectedTrip.priority}
                </span>
              </div>
              {selectedTrip.trip_type === "clinico" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="col-span-2 md:col-span-4 border-b border-slate-200 pb-2 mb-2">
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Paciente</p>
                      <p className="font-black text-xl text-slate-900">{selectedTrip.patient_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">RUT</p>
                      <p className="font-bold text-base text-slate-800">{selectedTrip.rut || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Edad / Peso</p>
                      <p className="font-bold text-base text-slate-800">
                        {selectedTrip.age || "-"} / {selectedTrip.weight || "-"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 font-bold">Diagnóstico</p>
                      <p className="font-bold text-base text-slate-800">{selectedTrip.diagnosis || "-"}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Motivo Clínico</p>
                      <p className="font-medium text-slate-800">{selectedTrip.transfer_reason}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">Médico Tratante</p>
                      <p className="font-medium text-slate-800">{selectedTrip.attending_physician || "-"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 font-bold">Solicitante</p>
                      <p className="font-medium text-slate-800">{selectedTrip.requester_person}</p>
                    </div>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-xl border border-teal-200 shadow-sm">
                    {selectedTrip.required_personnel?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-teal-800 uppercase tracking-wider font-black mb-1">Personal Requerido</p>
                        <p className="text-teal-900 font-bold text-base">{selectedTrip.required_personnel.join(", ")}</p>
                      </div>
                    )}
                    {selectedTrip.patient_requirements?.length > 0 && (
                      <div>
                        <p className="text-xs text-teal-800 uppercase tracking-wider font-black mb-1">Requerimientos Paciente</p>
                        <p className="text-teal-900 font-bold text-base bg-white inline-block px-3 py-1 rounded-lg border border-teal-100">
                          {selectedTrip.patient_requirements.join(", ")}
                        </p>
                      </div>
                    )}
                    {selectedTrip.accompaniment && selectedTrip.accompaniment !== "ninguno" && (
                      <div className="mt-3 pt-3 border-t border-teal-200">
                        <p className="text-sm text-teal-800 font-bold">
                          Acompañamiento: <span className="text-teal-900 font-black">{selectedTrip.accompaniment}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-1 md:col-span-2">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cometido</p>
                    <p className="font-black text-lg text-slate-900">{selectedTrip.task_details}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Cantidad de Funcionarios</p>
                    <p className="font-medium text-slate-800">{selectedTrip.staff_count}</p>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest">
                    <MapPin className="w-4 h-4 text-teal-600" /> Origen
                  </p>
                  <p className="font-black text-lg text-slate-900">{selectedTrip.origin}</p>
                  {selectedTrip.origin_address && <p className="text-sm font-bold text-slate-700 mt-1">{selectedTrip.origin_address}</p>}
                  <p className="text-sm font-medium text-slate-500 mt-1">
                    {selectedTrip.patient_unit || ""} {selectedTrip.bed ? `(Cama ${selectedTrip.bed})` : ""}
                  </p>
                  {(selectedTrip.origin_maps_url || selectedTrip.origin) && (
                    <a
                      href={
                        selectedTrip.origin_maps_url ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.origin_address || selectedTrip.origin)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg border border-teal-200 shadow-sm mt-3 w-full sm:w-auto justify-center"
                    >
                      <Navigation className="w-3.5 h-3.5 rotate-45" /> Ver en Google Maps
                    </a>
                  )}
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1 uppercase tracking-widest">
                    <Navigation className="w-4 h-4 text-blue-600" /> Destino
                  </p>
                  <p className="font-black text-lg text-slate-900">{selectedTrip.destination}</p>
                  {selectedTrip.destination_address && <p className="text-sm font-bold text-slate-700 mt-1">{selectedTrip.destination_address}</p>}
                  {(selectedTrip.destination_maps_url || selectedTrip.destination) && (
                    <a
                      href={
                        selectedTrip.destination_maps_url ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          selectedTrip.destination_address || selectedTrip.destination
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 shadow-sm mt-3 w-full sm:w-auto justify-center"
                    >
                      <Navigation className="w-3.5 h-3.5 rotate-45" /> Ver en Google Maps
                    </a>
                  )}
                </div>
              </div>
              {selectedTrip.notes && (
                <div className="border-t border-slate-200 pt-5">
                  <p className="text-xs text-slate-500 font-bold mb-2 uppercase tracking-widest">Notas Adicionales</p>
                  <p className="bg-amber-50 p-4 rounded-xl text-slate-800 font-medium border border-amber-200">{selectedTrip.notes}</p>
                </div>
              )}
              <Button
                onClick={() => {
                  handleTakeTrip(selectedTrip.id);
                  setSelectedTrip(null);
                }}
                className="w-full mt-4 bg-teal-600 hover:bg-teal-700 text-white font-bold h-14 text-lg rounded-xl shadow-md"
              >
                <Truck className="w-6 h-6 mr-2" /> Tomar este Viaje
              </Button>
              <TripEvolutionLog tripId={selectedTrip.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
