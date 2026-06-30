import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, MapPin, User, Ambulance, Truck, Map } from "lucide-react";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { formatScheduledDate, sColors as statusColors, statusColorsSolid, statusHeaderStyles } from "@/lib/tripUtils";

export default function ClinicalCalendarSection() {
  const [viewMode, setViewMode] = useState("daily"); // daily, weekly, monthly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedTripId, setDraggedTripId] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [detailTrip, setDetailTrip] = useState(null);

  const navigateTimeoutRef = useRef(null);

  const handleDragOverNavigate = (dir) => {
    if (navigateTimeoutRef.current) return;
    navigateTimeoutRef.current = setTimeout(() => {
      navigate(dir);
      navigateTimeoutRef.current = null;
    }, 700);
  };

  const handleDragLeaveNavigate = () => {
    if (navigateTimeoutRef.current) {
      clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = null;
    }
  };

  const handleMoveTrip = async (tripId, targetDate) => {
    try {
      const tripToMove = trips.find(t => t.id === tripId);
      if (!tripToMove) return;

      await api.put(`/trips/${tripId}`, {
        ...tripToMove,
        scheduled_date: targetDate
      });

      toast.success(`Traslado re-programado para el ${targetDate}`);
      fetchCalendar();
    } catch (e) {
      toast.error("Error al re-programar el traslado");
    }
  };

  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDateRange = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === "daily") {
      const ds = formatLocalDate(d);
      return { start: ds, end: ds };
    }
    if (viewMode === "weekly") {
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d); mon.setDate(diff);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: formatLocalDate(mon), end: formatLocalDate(sun) };
    }
    // monthly
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: formatLocalDate(first), end: formatLocalDate(last) };
  }, [currentDate, viewMode]);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const res = await api.get(`/trips/calendar?start_date=${start}&end_date=${end}`);
      setTrips(res.data || []);
    } catch (e) { } finally { setLoading(false); }
  }, [getDateRange]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === "daily") d.setDate(d.getDate() + dir);
    else if (viewMode === "weekly") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const getTitle = () => {
    if (viewMode === "daily") return currentDate.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (viewMode === "weekly") { const { start, end } = getDateRange(); return `${start} — ${end}`; }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const tripsByDate = (dateStr) => trips.filter(t => {
    const d = t.scheduled_date || t.created_at;
    return d && d.split("T")[0] === dateStr;
  });

  // Weekly helper: get array of 7 date strings
  const getWeekDates = () => {
    const { start } = getDateRange();
    const [y, m, d] = start.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return Array.from({ length: 7 }, (_, i) => { 
      const nd = new Date(dateObj); 
      nd.setDate(dateObj.getDate() + i); 
      return formatLocalDate(nd); 
    });
  };

  // Monthly helper: get grid of dates
  const getMonthGrid = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(formatLocalDate(new Date(y, m, d)));
    return grid;
  };

  const TripCard = ({ t }) => (
    <div 
      draggable={true}
      onDragStart={() => setDraggedTripId(t.id)}
      onDragEnd={() => { setDraggedTripId(null); handleDragLeaveNavigate(); }}
      onClick={() => setDetailTrip(t)}
      className={`p-2 rounded-lg border-l-4 mb-1 text-xs transition-all duration-200 cursor-pointer ${
        statusColors[t.status] || "bg-slate-100 text-slate-800 border border-slate-200"
      } ${
        draggedTripId === t.id 
          ? "opacity-40 scale-95 cursor-grabbing" 
          : "cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-slate-100/50"
      }`}
    >
      <div className="flex justify-between items-center">
        <span className="font-mono font-bold text-[9px] text-slate-600">{t.tracking_number}</span>
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${statusColors[t.status] || "bg-slate-100"}`}>{(t.status || "").replace(/_/g, " ")}</span>
      </div>
      <p className="font-bold text-slate-800 truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
      {t.appointment_time && <p className="text-[10px] text-red-600 font-bold">🕐 {t.appointment_time}</p>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Calendario de Traslados</h1>
          <p className="text-slate-500 font-medium mt-1 capitalize">{getTitle()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border rounded-xl p-1 flex gap-1">
            {[{ k: "daily", l: "Día" }, { k: "weekly", l: "Semana" }, { k: "monthly", l: "Mes" }].map(v => (
              <button key={v.k} onClick={() => setViewMode(v.k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === v.k ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>{v.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border rounded-xl p-1">
            <button 
              onClick={() => navigate(-1)} 
              onDragOver={(e) => { e.preventDefault(); handleDragOverNavigate(-1); }}
              onDragLeave={handleDragLeaveNavigate}
              onDrop={handleDragLeaveNavigate}
              className="p-1.5 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-lg">Hoy</button>
            <button 
              onClick={() => navigate(1)} 
              onDragOver={(e) => { e.preventDefault(); handleDragOverNavigate(1); }}
              onDragLeave={handleDragLeaveNavigate}
              onDrop={handleDragLeaveNavigate}
              className="p-1.5 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {draggedTripId && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-teal-600 border border-teal-500 text-white rounded-2xl px-6 py-3 text-xs font-bold flex items-center gap-2 shadow-2xl animate-bounce">
          <span className="text-base">💡</span>
          <span>Arrastra el traslado sobre los botones de navegación (flechas) en la parte superior para moverlo a otra semana</span>
        </div>
      )}

      <div className="relative">
        {loading && (
          <div className="absolute inset-0 bg-slate-50/30 backdrop-blur-[1px] flex justify-center items-center z-50 rounded-3xl pointer-events-none">
            <RefreshCw className="w-10 h-10 animate-spin text-teal-600" />
          </div>
        )}

        {/* DAILY VIEW */}
        {viewMode === "daily" && (() => {
          const dailyTrips = tripsByDate(formatLocalDate(currentDate));
          return (
            <div className="space-y-3">
              {dailyTrips.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200"><CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-lg font-bold text-slate-500">Sin traslados para este día</p></div>
              ) : dailyTrips.map(t => (
                <Card key={t.id} onClick={() => setDetailTrip(t)} className="shadow-sm border-l-4 border-l-teal-500 cursor-pointer hover:shadow-md transition-shadow bg-white">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-slate-100 p-2 rounded-xl text-center min-w-[70px]"><p className="text-[9px] font-bold text-slate-500 uppercase">Cita</p><p className="text-base font-black text-slate-900">{t.appointment_time || "--:--"}</p></div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{t.tracking_number}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[t.status] || "bg-slate-100"}`}>{(t.status || "").replace(/_/g, " ")}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
                        </div>
                        <p className="font-bold text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                        <p className="text-xs text-slate-500 mt-0.5"><MapPin className="w-3 h-3 inline text-teal-500" /> {t.origin} → {t.destination}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border text-right"><p className="text-[9px] font-bold text-slate-400 uppercase">Personal</p><p className="text-xs font-black text-teal-800">{t.clinical_team || "Sin asignar"}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          );
        })()}

        {/* WEEKLY VIEW */}
        {viewMode === "weekly" && (
          <div className="grid grid-cols-7 gap-2">
            {getWeekDates().map((dateStr, i) => {
              const dayTrips = tripsByDate(dateStr);
              const isToday = dateStr === formatLocalDate(new Date());
              const isOver = dragOverDate === dateStr;
              return (
                <div 
                  key={dateStr} 
                  onDragOver={(e) => { e.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); }}
                  onDragLeave={() => { if (dragOverDate === dateStr) setDragOverDate(null); }}
                  onDrop={async (e) => { e.preventDefault(); setDragOverDate(null); if (draggedTripId) { await handleMoveTrip(draggedTripId, dateStr); } }}
                  className={`bg-white rounded-xl border p-2 min-h-[200px] transition-all duration-200 flex flex-col ${
                    isToday 
                      ? "border-teal-400 ring-2 ring-teal-100" 
                      : "border-slate-200"
                  } ${
                    isOver 
                      ? "bg-teal-50 border-teal-500 shadow-md ring-2 ring-teal-100 scale-[1.02]" 
                      : "shadow-sm"
                  }`}
                >
                  <div className={`text-center mb-2 pb-1 border-b ${isToday ? "border-teal-200" : "border-slate-100"}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{dayNames[i]}</p>
                    <p className={`text-sm font-black ${isToday ? "text-teal-700" : "text-slate-700"}`}>{dateStr.split("-")[2]}</p>
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-[250px] custom-scrollbar flex-1">
                    {dayTrips.map(t => <TripCard key={t.id} t={t} />)}
                    {dayTrips.length === 0 && <p className="text-[10px] text-slate-300 text-center mt-4">—</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MONTHLY VIEW */}
        {viewMode === "monthly" && (
          <div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {dayNames.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {getMonthGrid().map((dateStr, i) => {
                if (!dateStr) return <div key={`empty-${i}`} className="min-h-[80px]" />;
                const dayTrips = tripsByDate(dateStr);
                const isToday = dateStr === formatLocalDate(new Date());
                const counts = { pending: dayTrips.filter(t => ["pendiente", "revision_gestor"].includes(t.status)).length, active: dayTrips.filter(t => ["assigned", "en_curso"].includes(t.status)).length, done: dayTrips.filter(t => t.status === "completado").length };
                return (
                  <div key={dateStr} onClick={() => { setCurrentDate(new Date(dateStr + "T12:00:00")); setViewMode("weekly"); }} className={`min-h-[80px] bg-white rounded-lg border p-1.5 cursor-pointer hover:shadow-md transition-all ${isToday ? "border-teal-400 ring-1 ring-teal-100" : "border-slate-100"}`}>
                    <p className={`text-xs font-bold mb-1 ${isToday ? "text-teal-700" : "text-slate-600"}`}>{parseInt(dateStr.split("-")[2])}</p>
                    {dayTrips.length > 0 && (
                      <div className="space-y-0.5">
                        {counts.pending > 0 && <div className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1 py-0.5 rounded">{counts.pending} pend.</div>}
                        {counts.active > 0 && <div className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1 py-0.5 rounded">{counts.active} activo</div>}
                        {counts.done > 0 && <div className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1 py-0.5 rounded">{counts.done} hecho</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DIÁLOGO DE DETALLE DEL TRASLADO */}
      <Dialog open={!!detailTrip} onOpenChange={() => setDetailTrip(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
          {detailTrip && (
            <>
              <div className={`${statusHeaderStyles[detailTrip.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
                <div className="absolute top-6 right-14">
                  <Badge className={`${statusHeaderStyles[detailTrip.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                    {(detailTrip.status || "").replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 ${statusHeaderStyles[detailTrip.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                    <Ambulance className={`w-8 h-8 ${statusHeaderStyles[detailTrip.status]?.iconText || "text-teal-400"}`} />
                  </div>
                  <div>
                    <p className={`${statusHeaderStyles[detailTrip.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                      Folio #{detailTrip.tracking_number} — Consulta Informativa
                    </p>
                    <h2 className={`text-3xl font-black ${statusHeaderStyles[detailTrip.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                      Detalle del Traslado
                    </h2>
                  </div>
                </div>
              </div>
              <div className="p-8 pt-4 space-y-5">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-6 rounded-[2rem] shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Folio de Seguimiento</p>
                    <p className="text-2xl font-mono font-black text-slate-950">#{detailTrip.tracking_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Estado</p>
                    <Badge className={`font-black uppercase text-[10px] border-none tracking-widest px-3 py-1 rounded-full shadow-sm ${statusColorsSolid[detailTrip.status] || "bg-slate-100 text-slate-600"}`}>
                      {(detailTrip.status || "").replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <User className="w-4 h-4 text-teal-600" /> Información General
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Paciente:</span>
                      <p className="font-black text-slate-900 text-sm">{detailTrip.patient_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Motivo:</span>
                      <p className="font-black text-slate-800">{detailTrip.transfer_reason || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">RUT:</span>
                      <p className="font-black text-slate-800">{detailTrip.rut || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Cama / Unidad:</span>
                      <p className="font-black text-slate-800">{detailTrip.bed || "-"} ({detailTrip.patient_unit || "-"})</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Diagnóstico:</span>
                      <p className="font-black text-slate-800 leading-relaxed">{detailTrip.diagnosis || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <MapPin className="w-4 h-4 text-teal-600" /> Ruta y Tiempos
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Origen:</span>
                      <p className="font-black text-slate-800">{detailTrip.origin}</p>
                      {detailTrip.origin_address && (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{detailTrip.origin_address}</p>
                      )}
                      {(detailTrip.origin_maps_url || detailTrip.origin) && (
                        <a 
                          href={detailTrip.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailTrip.origin_address || detailTrip.origin)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Destino:</span>
                      <p className="font-black text-slate-800">{detailTrip.destination}</p>
                      {detailTrip.destination_address && (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{detailTrip.destination_address}</p>
                      )}
                      {(detailTrip.destination_maps_url || detailTrip.destination) && (
                        <a 
                          href={detailTrip.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailTrip.destination_address || detailTrip.destination)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Fecha Programada:</span>
                      <p className="font-black text-slate-800">{formatScheduledDate(detailTrip.scheduled_date)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Citación:</span>
                      <p className="font-black text-slate-800">{detailTrip.appointment_time || "--:--"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Salida:</span>
                      <p className="font-black text-slate-800">{detailTrip.departure_time || "--:--"}</p>
                    </div>
                  </div>
                </div>

                {(detailTrip.driver_name || detailTrip.vehicle_plate) && (
                  <div className="bg-gradient-to-r from-teal-50/50 to-emerald-50/50 p-5 rounded-2xl border border-teal-100/60 space-y-3 shadow-sm">
                    <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-teal-100/50 pb-1.5">
                      <Truck className="w-4 h-4 text-teal-600" /> Asignación de Transporte
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                      {detailTrip.driver_name && (
                        <div>
                          <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Conductor:</span>
                          <p className="font-black text-slate-900 text-sm">{detailTrip.driver_name}</p>
                        </div>
                      )}
                      {detailTrip.vehicle_plate && (
                        <div>
                          <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Vehículo / Patente:</span>
                          <p className="font-black text-teal-900 text-sm flex items-center gap-1">
                            <span className="bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-800 font-mono text-xs">{detailTrip.vehicle_plate}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {detailTrip.clinical_team && (
                  <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-2">
                    <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest leading-none">Equipo Clínico Asignado</p>
                    <p className="text-xs font-black text-teal-900">{detailTrip.clinical_team}</p>
                  </div>
                )}

                {detailTrip.notes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Notas del Traslado</p>
                    <p className="text-xs font-bold text-slate-800 whitespace-pre-line">{detailTrip.notes}</p>
                  </div>
                )}

                {detailTrip.driver_notes && (
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none">Observaciones del Conductor</p>
                    <p className="text-xs font-bold text-amber-900 whitespace-pre-line">{detailTrip.driver_notes}</p>
                  </div>
                )}

                {/* EVOLUCIÓN CRONOLÓGICA DEL TRASLADO */}
                <TripEvolutionLog tripId={detailTrip.id} />

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setDetailTrip(null)} className="bg-teal-600 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all">Volver</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
