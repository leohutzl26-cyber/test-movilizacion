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
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = currentMonth.toLocaleString("es-ES", { month: "long", year: "numeric" });

  const selectedTrips = trips.filter(t => t.scheduled_date === selectedDate);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-teal-600" /> Agenda de Acompañamientos Clínicos
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Planificación mensual y programación por días asistidos.
          </p>
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
                  className={`min-h-[70px] p-1.5 rounded-xl border flex flex-col justify-between transition-all text-left ${
                    isSelected ? "border-teal-600 bg-teal-50 ring-2 ring-teal-500/20" :
                    isToday ? "border-slate-400 bg-slate-50 font-bold" : "border-slate-100 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className={`text-xs font-black ${isToday ? "text-teal-700" : "text-slate-700"}`}>
                    {dayDate.getDate()}
                  </span>

                  {dayTrips.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      <Badge className="bg-teal-600 text-white text-[8px] font-black px-1 py-0 block truncate">
                        {dayTrips.length} traslado{dayTrips.length > 1 ? "s" : ""}
                      </Badge>
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
