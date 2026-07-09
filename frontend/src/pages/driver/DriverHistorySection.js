import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, RotateCcw, MapPin, ArrowRight, Navigation } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";

export default function DriverHistorySection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [historyNotesEdit, setHistoryNotesEdit] = useState("");
  const [savingHistoryNotes, setSavingHistoryNotes] = useState(false);

  const handleOpenHistoryDetails = (trip) => {
    setSelectedTrip(trip);
    setHistoryNotesEdit(trip.driver_notes || "");
  };

  const handleSaveHistoryNotes = async (tripId) => {
    setSavingHistoryNotes(true);
    try {
      await api.put(`/trips/${tripId}/status`, {
        driver_notes: historyNotesEdit,
      });
      toast.success("Observaciones guardadas correctamente");
      setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, driver_notes: historyNotesEdit } : t)));
      setSelectedTrip((prev) => (prev ? { ...prev, driver_notes: historyNotesEdit } : null));
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar observaciones");
    } finally {
      setSavingHistoryNotes(false);
    }
  };

  const fetchHistory = useCallback(async () => {
    try {
      console.log("[DEBUG] Fetching History V2...");
      const r = await api.get("/trips/v2/history");
      console.log("[DEBUG] History r.data:", r.data);
      if (r.data && Array.isArray(r.data.trips)) {
        setTrips(r.data.trips);
      } else {
        console.warn("[DEBUG] Unrecognized history format or null:", r.data);
        setTrips([]);
      }
    } catch (err) {
      console.error("Error fetching history:", err.response?.status, err.response?.data);
      toast.error("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const statusColors = {
    completado: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    cancelado: "bg-rose-100 text-rose-800 border border-rose-200",
    devuelto: "bg-amber-100 text-amber-800 border border-amber-200",
    revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200",
    asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200",
    en_curso: "bg-blue-100 text-blue-800 border border-blue-200",
  };

  if (loading) return <div className="flex justify-center py-20"><Clock className="w-10 h-10 animate-spin text-teal-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Historial de Viajes</h1>
        <Badge variant="outline" className="text-sm bg-white shadow-sm border-slate-200 text-slate-600 px-3 py-1">
          {trips.length} viajes
        </Badge>
      </div>
      <div className="space-y-4">
        {trips.map((t) => (
          <Card
            key={t.id}
            className={`shadow-sm cursor-pointer hover:shadow-md transition-all border-l-4 ${
              t._history_status === "devuelto" ? "border-l-amber-400" : t.status === "completado" ? "border-l-emerald-500" : "border-l-red-400"
            }`}
            onClick={() => handleOpenHistoryDetails(t)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{t.tracking_number}</span>
                  {t._history_status === "devuelto" ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-100 text-amber-800 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Devuelto
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[t.status] || "bg-slate-100"}`}>
                      {t.status === "completado" ? "Completado" : "Cancelado"}
                    </span>
                  )}
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                    {t.trip_type === "clinico" ? "Clínico" : "No Clínico"}
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500">{t.scheduled_date ? t.scheduled_date.split("T")[0] : ""}</span>
              </div>
              <p className="font-bold text-lg text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                <MapPin className="w-3 h-3 text-teal-500" /> <span>{t.origin}</span> <ArrowRight className="w-3 h-3" /> <span>{t.destination}</span>
              </div>
              {t.start_mileage !== undefined && t.end_mileage !== undefined && t.start_mileage !== null && t.end_mileage !== null && (
                <div className="mt-2 flex gap-4 text-xs text-slate-400">
                  <span>
                    Km inicio: <strong className="text-slate-600">{t.start_mileage}</strong>
                  </span>
                  <span>
                    Km final: <strong className="text-slate-600">{t.end_mileage}</strong>
                  </span>
                  <span>
                    Distancia: <strong className="text-teal-700">{(Number(t.end_mileage) - Number(t.start_mileage)).toFixed(1)} km</strong>
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-lg font-bold text-slate-500">Aún no tiene viajes finalizados</p>
          </div>
        )}
      </div>

      {selectedTrip && (
        <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl border-b pb-3">Detalle del Viaje</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2 text-sm">
              <div className="flex gap-2">
                <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{selectedTrip.tracking_number}</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[selectedTrip.status]}`}>
                  {selectedTrip.status}
                </span>
              </div>
              {selectedTrip.requester_name && (
                <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                  <p className="text-[10px] font-bold text-purple-600 uppercase">Solicitado por</p>
                  <p className="font-bold text-purple-900">{selectedTrip.requester_name}</p>
                </div>
              )}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-black text-lg text-slate-900">
                  {selectedTrip.trip_type === "clinico" ? selectedTrip.patient_name : selectedTrip.task_details}
                </p>
                {selectedTrip.trip_type === "clinico" && (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-500">RUT:</span> {selectedTrip.rut || "-"}
                    </div>
                    <div>
                      <span className="font-bold text-slate-500">Motivo:</span> {selectedTrip.transfer_reason || "-"}
                    </div>
                    <div>
                      <span className="font-bold text-slate-500">Servicio:</span> {selectedTrip.patient_unit || "-"}
                    </div>
                    <div>
                      <span className="font-bold text-slate-500">Médico:</span> {selectedTrip.attending_physician || "-"}
                    </div>
                  </div>
                )}
                {selectedTrip.trip_type === "no_clinico" && (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="font-bold text-slate-500">Cantidad de Funcionarios:</span> {selectedTrip.staff_count || "No especificado"}
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Origen</p>
                  <p className="font-bold text-slate-800">{selectedTrip.origin}</p>
                  {selectedTrip.origin_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{selectedTrip.origin_address}</p>}
                  {(selectedTrip.origin_maps_url || selectedTrip.origin) && (
                    <a
                      href={
                        selectedTrip.origin_maps_url ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          selectedTrip.origin_address || selectedTrip.origin
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                    >
                      <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                    </a>
                  )}
                </div>
                <div className="bg-white p-3 rounded-xl border shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Destino</p>
                  <p className="font-bold text-slate-800">{selectedTrip.destination}</p>
                  {selectedTrip.destination_address && <p className="text-xs font-bold text-slate-600 mt-0.5">{selectedTrip.destination_address}</p>}
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
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                    >
                      <Navigation className="w-3 h-3 rotate-45" /> Ver en Mapa
                    </a>
                  )}
                </div>
              </div>
              {selectedTrip.start_mileage && (
                <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 flex justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-teal-600 uppercase">Km Inicio</p>
                    <p className="font-black text-teal-900">{selectedTrip.start_mileage}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-teal-600 uppercase">Km Final</p>
                    <p className="font-black text-teal-900">{selectedTrip.end_mileage || "-"}</p>
                  </div>
                </div>
              )}
              {selectedTrip.notes && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                  <p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Notas</p>
                  <p className="text-slate-800">{selectedTrip.notes}</p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Observaciones del Conductor</Label>
                <textarea
                  className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white"
                  placeholder="Escriba aquí sus observaciones o comentarios sobre este traslado..."
                  value={historyNotesEdit}
                  onChange={(e) => setHistoryNotesEdit(e.target.value)}
                />
                <Button
                  onClick={() => handleSaveHistoryNotes(selectedTrip.id)}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 text-xs rounded-lg shadow-sm"
                  disabled={savingHistoryNotes}
                >
                  {savingHistoryNotes ? "Guardando..." : "Guardar Observaciones"}
                </Button>
              </div>

              <TripEvolutionLog tripId={selectedTrip.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
