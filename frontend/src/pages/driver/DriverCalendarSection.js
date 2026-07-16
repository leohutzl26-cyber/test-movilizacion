import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Clock, Navigation, Ambulance, ClipboardList, ChevronLeft, ChevronRight, MapPin, Truck } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { formatScheduledDate, statusColorsSolid, statusHeaderStyles } from "@/lib/tripUtils";

export default function DriverCalendarSection() {
  const [viewMode, setViewMode] = useState("monthly"); // monthly o weekly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [driverNotesEdit, setDriverNotesEdit] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/trips/driver");
      setTrips(res.data || []);
    } catch (e) {
      toast.error("Error al cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const handleOpenDetails = (trip) => {
    setSelectedTrip(trip);
    setDriverNotesEdit(trip.driver_notes || "");
  };

  const handleSaveDriverNotes = async (tripId) => {
    setSavingNotes(true);
    try {
      await api.put(`/trips/${tripId}/status`, {
        driver_notes: driverNotesEdit,
      });
      toast.success("Observaciones guardadas correctamente");
      setTrips((prev) => prev.map((t) => (t.id === tripId ? { ...t, driver_notes: driverNotesEdit } : t)));
      setSelectedTrip((prev) => (prev ? { ...prev, driver_notes: driverNotesEdit } : null));
    } catch (err) {
      console.error("Error saving notes:", err);
      toast.error("Error al guardar observaciones");
    } finally {
      setSavingNotes(false);
    }
  };

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === "weekly") {
      d.setDate(d.getDate() + dir * 7);
    } else {
      d.setMonth(d.getMonth() + dir);
    }
    setCurrentDate(d);
  };

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const getWeekDates = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const nd = new Date(monday);
      nd.setDate(monday.getDate() + i);
      return nd.toISOString().split("T")[0];
    });
  };

  const getMonthGrid = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(y, m, d).toISOString().split("T")[0]);
    }
    return grid;
  };

  const tripsByDate = (dateStr) => {
    return trips.filter((t) => {
      const d = t.scheduled_date || t.created_at;
      return d && d.split("T")[0] === dateStr;
    });
  };

  const getTitle = () => {
    if (viewMode === "weekly") {
      const weekDates = getWeekDates();
      return `${formatScheduledDate(weekDates[0])} — ${formatScheduledDate(weekDates[6])}`;
    }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const statusColors = {
    pendiente: "bg-amber-100 text-amber-800 border border-amber-200",
    revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200",
    asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200",
    en_curso: "bg-cyan-100 text-cyan-800 border border-cyan-200",
    completado: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    cancelado: "bg-rose-100 text-rose-800 border border-rose-200",
    devuelto: "bg-rose-100 text-rose-800 border border-rose-200",
  };

  const sLabels = {
    pendiente: "Pendiente",
    revision_gestor: "En Revisión",
    asignado: "Asignado",
    en_curso: "En Curso",
    completado: "Completado",
    cancelado: "Cancelado",
    devuelto: "Devuelto",
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Mi Calendario de Viajes</h1>
          <p className="text-slate-500 font-bold text-sm mt-0.5 capitalize">{getTitle()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm font-bold">
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-4 py-2 rounded-lg text-xs transition-all ${
                viewMode === "monthly" ? "bg-teal-600 text-white shadow-md font-bold" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode("weekly")}
              className={`px-4 py-2 rounded-lg text-xs transition-all ${
                viewMode === "weekly" ? "bg-teal-600 text-white shadow-md font-bold" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Semana
            </button>
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-50 rounded-lg"
            >
              Hoy
            </button>
            <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Clock className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      ) : (
        <>
          {viewMode === "monthly" && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-bold">
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                {dayNames.map((d) => (
                  <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-4 tracking-widest">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getMonthGrid().map((dateStr, i) => {
                  if (!dateStr) return <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 border-r border-b border-slate-50" />;
                  const dayTrips = tripsByDate(dateStr);
                  const isToday = dateStr === new Date().toISOString().split("T")[0];
                  return (
                    <div
                      key={dateStr}
                      onClick={() => {
                        setCurrentDate(new Date(dateStr + "T12:00:00"));
                        setViewMode("weekly");
                      }}
                      className={`min-h-[120px] p-2 cursor-pointer hover:bg-teal-50/20 transition-all border-r border-b border-slate-100 relative group flex flex-col justify-between ${
                        isToday ? "bg-teal-50/10" : ""
                      }`}
                    >
                      <span
                        className={`text-sm font-black mb-1 w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday ? "text-teal-700 bg-teal-100 shadow-xs" : "text-slate-600 group-hover:text-teal-600"
                        }`}
                      >
                        {parseInt(dateStr.split("-")[2])}
                      </span>
                      <div className="space-y-1 mt-1 flex-1 overflow-y-hidden flex flex-col justify-end">
                        {dayTrips.slice(0, 2).map((t) => {
                          const colorClass = statusColors[t.status] || "bg-slate-100 text-slate-800 border-slate-200";
                          return (
                            <div
                              key={t.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentDate(new Date(dateStr + "T12:00:00"));
                                setViewMode("weekly");
                              }}
                              className={`text-[9px] px-1.5 py-0.5 rounded border truncate font-bold leading-tight ${colorClass}`}
                              title={t.trip_type === "clinico" ? t.patient_name : t.task_details}
                            >
                              <span className="font-mono mr-0.5">{t.appointment_time || "--:--"}</span>{" "}
                              {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                            </div>
                          );
                        })}
                        {dayTrips.length > 2 && (
                          <p className="text-[8px] font-black text-slate-400 pl-1">
                            +{dayTrips.length - 2} más
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === "weekly" && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {getWeekDates().map((dateStr, i) => {
                const dayTrips = tripsByDate(dateStr);
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={dateStr}
                    className={`bg-white rounded-2xl border-2 p-3 min-h-[350px] transition-all duration-200 flex flex-col ${
                      isToday ? "border-teal-400 shadow-md shadow-teal-900/5 bg-teal-50/5" : "border-slate-150 shadow-sm"
                    }`}
                  >
                    <div className={`text-center mb-3 pb-2 border-b-2 rounded-xl py-1 ${isToday ? "border-teal-200 bg-teal-50/40" : "border-slate-50"}`}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayNames[i]}</p>
                      <p className={`text-lg font-black ${isToday ? "text-teal-700" : "text-slate-800"}`}>{dateStr.split("-")[2]}</p>
                    </div>
                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                      {dayTrips.map((t) => {
                        const colorClass = statusColors[t.status] || "bg-slate-100 text-slate-800 border-slate-200";
                        return (
                          <div
                            key={t.id}
                            onClick={() => handleOpenDetails(t)}
                            className={`p-2.5 rounded-xl border-l-4 mb-2 text-left cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.01] ${colorClass} shadow-sm`}
                          >
                            <div className="flex justify-between items-start gap-1 mb-1">
                              <span className="font-mono text-[9px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded leading-none">
                                {t.appointment_time || "--:--"}
                              </span>
                              <span className="text-[8px] font-mono tracking-widest opacity-80 font-bold uppercase">
                                {t.tracking_number}
                              </span>
                            </div>
                            <p className="font-black text-xs text-slate-800 leading-tight truncate">
                              {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                            </p>
                            <p className="text-[9px] text-slate-500 font-semibold truncate mt-1">
                              {t.origin} ➔ {t.destination}
                            </p>
                          </div>
                        );
                      })}
                      {dayTrips.length === 0 && (
                        <p className="text-[10px] text-slate-300 text-center mt-12 italic font-bold uppercase tracking-wider">
                          Sin viajes
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {selectedTrip && (
        <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0">
            <div className={`${statusHeaderStyles[selectedTrip.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
              <div className="absolute top-6 right-14">
                <Badge className={`${statusHeaderStyles[selectedTrip.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                  {(selectedTrip.status || "").replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center gap-5">
                <div className={`w-16 h-16 ${statusHeaderStyles[selectedTrip.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                  {selectedTrip.trip_type === "clinico" ? <Ambulance className={`w-8 h-8 ${statusHeaderStyles[selectedTrip.status]?.iconText || "text-teal-400"}`} /> : <ClipboardList className={`w-8 h-8 ${statusHeaderStyles[selectedTrip.status]?.iconText || "text-blue-400"}`} />}
                </div>
                <div>
                  <p className={`${statusHeaderStyles[selectedTrip.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                    Folio #{selectedTrip.tracking_number} — Detalle Completo
                  </p>
                  <h2 className={`text-3xl font-black ${statusHeaderStyles[selectedTrip.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                    {selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Cometido No Clínico"}
                  </h2>
                </div>
              </div>
            </div>
            <div className="p-8 pt-4 space-y-5 text-sm">
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
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${statusColorsSolid[selectedTrip.status] || "bg-slate-500 text-white"}`}>
                  {sLabels[selectedTrip.status] || selectedTrip.status}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">
                  {selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Traslado No Clínico"}
                </span>
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${
                  selectedTrip.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"
                }`}>
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
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          selectedTrip.origin_address || selectedTrip.origin
                        )}`
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
                  <p className="bg-amber-50 p-4 rounded-xl text-slate-800 font-medium border border-amber-200">
                    {selectedTrip.notes}
                  </p>
                </div>
              )}

              {selectedTrip.cancel_reason && (
                <div className="border-t border-slate-200 pt-5">
                  <p className="text-xs text-rose-500 font-bold mb-2 uppercase tracking-widest">Motivo de Cancelación / Rechazo</p>
                  <p className="bg-rose-50 p-4 rounded-xl text-rose-900 font-medium border border-rose-200">
                    {selectedTrip.cancel_reason}
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 pt-5 space-y-2">
                <Label className="text-xs text-slate-500 font-bold uppercase tracking-widest">Observaciones del Conductor</Label>
                <textarea
                  className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-sm font-medium focus:ring-2 focus:ring-teal-500 outline-none shadow-sm bg-white"
                  placeholder="Escriba aquí sus observaciones o comentarios sobre este traslado..."
                  value={driverNotesEdit}
                  onChange={(e) => setDriverNotesEdit(e.target.value)}
                />
                <Button
                  onClick={() => handleSaveDriverNotes(selectedTrip.id)}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 text-xs rounded-lg shadow-sm"
                  disabled={savingNotes}
                >
                  {savingNotes ? "Guardando..." : "Guardar Observaciones"}
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
