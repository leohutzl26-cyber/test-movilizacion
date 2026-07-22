import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Stethoscope, FileText, User } from "lucide-react";
import api from "@/lib/api";
import ClinicalDetailDialog from "@/components/ClinicalDetailDialog";
import { formatScheduledDate } from "@/lib/tripUtils";

export default function ClinicalCalendarSection() {
  const [trips, setTrips] = useState([]);
  const [viewMode, setViewMode] = useState("mensual"); // "mensual" | "semanal"
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTrips = async () => {
    try {
      const res = await api.get("/trips/clinical");
      setTrips(res.data || []);
    } catch (e) {
      console.error("Error fetching clinical calendar:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const handlePrevMonth = () => {
    if (viewMode === "mensual") {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    } else {
      setCurrentMonth(prev => new Date(prev.setDate(prev.getDate() - 7)));
    }
  };

  const handleNextMonth = () => {
    if (viewMode === "mensual") {
      setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    } else {
      setCurrentMonth(prev => new Date(prev.setDate(prev.getDate() + 7)));
    }
  };

  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const getWeekDays = (baseDate) => {
    const current = new Date(baseDate);
    const dayOfWeek = current.getDay();
    const start = new Date(current);
    start.setDate(current.getDate() - dayOfWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(start));
      start.setDate(start.getDate() + 1);
    }
    return days;
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = viewMode === "mensual" ? getDaysInMonth(year, month) : getWeekDays(currentMonth);
  const monthName = currentMonth.toLocaleString("es-ES", { month: "long", year: "numeric" });

  const selectedTrips = trips.filter(t => t.scheduled_date === selectedDate);

  const getStatusBadge = (status) => {
    if (status === "completado") return { bg: "bg-emerald-600 text-white", label: "Completado" };
    if (status === "en_curso") return { bg: "bg-blue-600 text-white", label: "En Curso" };
    return { bg: "bg-indigo-600 text-white", label: "Asignado" };
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-teal-600" /> Agenda de Acompañamientos Clínicos
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Planificación semanal y mensual por estados codificados en color.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-200 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("semanal")}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${viewMode === "semanal" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              Semanal
            </button>
            <button
              onClick={() => setViewMode("mensual")}
              className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${viewMode === "mensual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              Mensual
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-7 w-7">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-black text-slate-800 uppercase px-2">{monthName}</span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-7 w-7">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Leyenda de Colores por Estado */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex-wrap">
        <span className="text-slate-400 uppercase tracking-wider text-[10px] font-black">Estados:</span>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-600"></span> Asignado</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-600"></span> En Ruta</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-600"></span> Completado</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendario Cuadrícula */}
        <Card className="lg:col-span-2 border border-slate-200 shadow-sm rounded-2xl p-4 bg-white">
          <div className="grid grid-cols-7 gap-1 text-center font-black text-[10px] text-slate-400 uppercase mb-2">
            <span>Dom</span><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {daysInMonth.map(dayDate => {
              const dateStr = dayDate.toISOString().split("T")[0];
              const dayTrips = trips.filter(t => t.scheduled_date === dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === new Date().toISOString().split("T")[0];

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`min-h-[75px] p-1.5 rounded-xl border flex flex-col justify-between transition-all text-left ${
                    isSelected ? "border-teal-600 bg-teal-50 ring-2 ring-teal-500/20" :
                    isToday ? "border-slate-400 bg-slate-50 font-bold" : "border-slate-100 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className={`text-xs font-black ${isToday ? "text-teal-700" : "text-slate-700"}`}>
                    {dayDate.getDate()}
                  </span>

                  {dayTrips.length > 0 && (
                    <div className="mt-1 space-y-0.5 w-full">
                      {dayTrips.slice(0, 2).map(t => {
                        const st = getStatusBadge(t.status);
                        return (
                          <span key={t.id} className={`text-[8px] font-black px-1 py-0.5 rounded block truncate ${st.bg}`}>
                            #{t.tracking_number || t.id.substring(0,4)}
                          </span>
                        );
                      })}
                      {dayTrips.length > 2 && (
                        <span className="text-[8px] font-black text-slate-500 block text-right">
                          +{dayTrips.length - 2} más
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Detalle del Día Seleccionado */}
        <Card className="border border-slate-200 shadow-sm rounded-2xl p-4 bg-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Día Seleccionado</span>
              <h3 className="text-lg font-black text-slate-900 capitalize">
                {formatScheduledDate(selectedDate)}
              </h3>
            </div>

            {selectedTrips.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Stethoscope className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">Sin traslados asignados para esta fecha</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {selectedTrips.map(t => (
                  <div key={t.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-teal-50/50 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs text-slate-800">#{t.tracking_number}</span>
                      <span className="text-xs font-bold text-teal-700 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {t.appointment_time || "Por hora"}
                      </span>
                    </div>

                    <p className="text-xs font-black text-slate-900 truncate uppercase">{t.patient_name || "Paciente"}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate">{t.origin} ➔ {t.destination}</p>

                    <Button
                      onClick={() => setSelectedTrip(t)}
                      size="sm"
                      className="w-full bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold h-7 rounded-lg"
                    >
                      <FileText className="w-3 h-3 mr-1" /> Ver Ficha
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

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
