import { useState, useEffect, useCallback, useRef } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw } from "lucide-react";
import { sColors } from "@/lib/tripUtils";
import TripDetailDialog from "./TripDetailDialog";

export default function CalendarSection() {
    const [viewMode, setViewMode] = useState("daily");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailTrip, setDetailTrip] = useState(null);
    const [draggedTripId, setDraggedTripId] = useState(null);
    const [dragOverDate, setDragOverDate] = useState(null);

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

    const getDateRange = useCallback(() => {
        const d = new Date(currentDate);
        if (viewMode === "daily") {
            const ds = d.toISOString().split("T")[0];
            return { start: ds, end: ds };
        }
        if (viewMode === "weekly") {
            const day = d.getDay();
            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
            const mon = new Date(d); mon.setDate(diff);
            const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
            return { start: mon.toISOString().split("T")[0], end: sun.toISOString().split("T")[0] };
        }
        const first = new Date(d.getFullYear(), d.getMonth(), 1);
        const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { start: first.toISOString().split("T")[0], end: last.toISOString().split("T")[0] };
    }, [currentDate, viewMode]);

    const fetchCalendar = useCallback(async () => {
        setLoading(true);
        try {
            const { start, end } = getDateRange();
            const res = await api.get(`/trips/calendar?start_date=${start}&end_date=${end}`);
            setTrips(res.data || []);
        } catch (e) { toast.error("Error al cargar calendario"); }
        finally { setLoading(false); }
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

    const tripsByDate = (dateStr) => trips.filter(t => { const d = t.scheduled_date || t.created_at; return d && d.split("T")[0] === dateStr; });

    const getWeekDates = () => {
        const { start } = getDateRange();
        const d = new Date(start + "T12:00:00");
        return Array.from({ length: 7 }, (_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd.toISOString().split("T")[0]; });
    };

    const getMonthGrid = () => {
        const y = currentDate.getFullYear(), m = currentDate.getMonth();
        const first = new Date(y, m, 1);
        const startDay = (first.getDay() + 6) % 7;
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const grid = [];
        for (let i = 0; i < startDay; i++) grid.push(null);
        for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(y, m, d).toISOString().split("T")[0]);
        return grid;
    };

    return (
        <div className="animate-slide-up space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Calendario Global</h1>
                    <p className="text-slate-500 font-bold text-xs mt-0.5 capitalize">{getTitle()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm font-bold">
                        {[{ k: "daily", l: "Día" }, { k: "weekly", l: "Semana" }, { k: "monthly", l: "Mes" }].map(v => (
                            <button key={v.k} onClick={() => setViewMode(v.k)} className={`px-4 py-2 rounded-lg text-xs transition-all ${viewMode === v.k ? "bg-teal-600 text-white shadow-md font-bold" : "text-slate-500 hover:bg-slate-100"}`}>{v.l}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button 
                            onClick={() => navigate(-1)} 
                            onDragOver={(e) => { e.preventDefault(); handleDragOverNavigate(-1); }}
                            onDragLeave={handleDragLeaveNavigate}
                            onDrop={handleDragLeaveNavigate}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-50 rounded-lg">Hoy</button>
                        <button 
                            onClick={() => navigate(1)} 
                            onDragOver={(e) => { e.preventDefault(); handleDragOverNavigate(1); }}
                            onDragLeave={handleDragLeaveNavigate}
                            onDrop={handleDragLeaveNavigate}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
                        >
                            <ChevronRight className="w-5 h-5" />
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

                {viewMode === "daily" && (() => {
                    const dailyTrips = tripsByDate(getDateRange().start);
                    return (
                        <div className="space-y-4">
                            {dailyTrips.length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
                                    <CalendarDays className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <p className="text-xl font-bold text-slate-400">No hay traslados programados</p>
                                </div>
                            ) : dailyTrips.map(t => (
                                <Card key={t.id} onClick={() => setDetailTrip(t)} className="card-hover border-l-4 border-l-teal-500 shadow-sm cursor-pointer group bg-white">
                                    <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-xl text-center min-w-[80px] group-hover:bg-teal-600 transition-colors">
                                                <p className="text-[10px] font-bold text-teal-600 group-hover:text-teal-100">Cita</p>
                                                <p className="text-base font-black text-slate-800 group-hover:text-white">{t.appointment_time || "--:--"}</p>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">#{t.tracking_number}</span>
                                                    <Badge className={`${sColors[t.status] || "bg-slate-100"} border-none text-xs uppercase font-bold px-2.5 py-1 rounded-full shadow-sm`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900 uppercase group-hover:text-teal-700 transition-colors">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</h4>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-right">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Responsable</p>
                                            <p className="text-sm font-bold text-teal-800">{t.clinical_team || "Equipo no asignado"}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    );
                })()}

                {viewMode === "weekly" && (
                    <div className="grid grid-cols-7 gap-3">
                        {getWeekDates().map((dateStr, i) => {
                            const dayTrips = tripsByDate(dateStr);
                            const isToday = dateStr === new Date().toISOString().split("T")[0];
                            const isOver = dragOverDate === dateStr;
                            return (
                                <div 
                                    key={dateStr} 
                                    onDragOver={(e) => { e.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); }}
                                    onDragLeave={() => { if (dragOverDate === dateStr) setDragOverDate(null); }}
                                    onDrop={async (e) => { e.preventDefault(); setDragOverDate(null); if (draggedTripId) { await handleMoveTrip(draggedTripId, dateStr); } }}
                                    onClick={() => { setCurrentDate(new Date(dateStr + "T12:00:00")); setViewMode("daily"); }}
                                    className={`bg-white rounded-2xl border-2 p-3 min-h-[350px] transition-all duration-200 flex flex-col cursor-pointer hover:bg-teal-50/10 ${
                                        isToday 
                                            ? "border-teal-400 shadow-lg shadow-teal-900/5 bg-teal-50/10" 
                                            : "border-slate-100 shadow-sm"
                                    } ${
                                        isOver 
                                            ? "bg-teal-50/30 border-teal-500 shadow-md ring-2 ring-teal-100 scale-[1.02]" 
                                            : ""
                                    }`}
                                >
                                    <div 
                                        className={`text-center mb-4 pb-2 border-b-2 rounded-xl transition-all py-1 ${isToday ? "border-teal-200 bg-teal-50/40" : "border-slate-50"}`}
                                        title="Ver vista diaria de este día"
                                    >
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayNames[i]}</p>
                                        <p className={`text-xl font-black ${isToday ? "text-teal-700" : "text-slate-800"}`}>{dateStr.split("-")[2]}</p>
                                    </div>
                                    <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                                        {dayTrips.map(t => (
                                            <div 
                                                key={t.id} 
                                                draggable={true}
                                                onDragStart={(e) => { e.stopPropagation(); setDraggedTripId(t.id); }}
                                                onDragEnd={(e) => { e.stopPropagation(); setDraggedTripId(null); handleDragLeaveNavigate(); }}
                                                onClick={(e) => { e.stopPropagation(); setDetailTrip(t); }} 
                                                className={`p-2 rounded-lg border-l-4 mb-1 text-[10px] cursor-pointer transition-all duration-200 ${
                                                    sColors[t.status] || "bg-slate-50 text-slate-800 border-slate-200"
                                                } ${
                                                    draggedTripId === t.id 
                                                        ? "opacity-40 scale-95 cursor-grabbing" 
                                                        : "cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-teal-50"
                                                }`}
                                            >
                                                <p className="font-bold text-slate-800 truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                                                <p className="text-[9px] text-slate-500 font-mono">{t.appointment_time || "--:--"}</p>
                                            </div>
                                        ))}
                                        {dayTrips.length === 0 && <p className="text-[10px] text-slate-300 text-center mt-8 italic">Sin traslados</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === "monthly" && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-bold">
                        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                            {dayNames.map(d => <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-4 tracking-widest">{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7">
                            {getMonthGrid().map((dateStr, i) => {
                                if (!dateStr) return <div key={`empty-${i}`} className="min-h-[120px] bg-slate-50/30 border-r border-b border-slate-50" />;
                                const dayTrips = tripsByDate(dateStr);
                                const isToday = dateStr === new Date().toISOString().split("T")[0];
                                return (
                                    <div key={dateStr} onClick={() => { setCurrentDate(new Date(dateStr + "T12:00:00")); setViewMode("weekly"); }} className={`min-h-[120px] p-3 cursor-pointer hover:bg-teal-50/30 transition-all border-r border-b border-slate-100 relative group ${isToday ? "bg-teal-50/20" : ""}`}>
                                        <p className={`text-sm font-black mb-2 ${isToday ? "text-teal-700 bg-teal-100 w-8 h-8 rounded-full flex items-center justify-center -ml-1 -mt-1 shadow-sm" : "text-slate-600 hover:text-teal-600"}`}>{parseInt(dateStr.split("-")[2])}</p>
                                        {dayTrips.length > 0 && (
                                            <div className="space-y-1">
                                                {dayTrips.slice(0, 3).map(t => (
                                                    <div key={t.id} className={`h-1.5 w-full rounded-full transition-all group-hover:scale-110 ${t.status === "completado" ? "bg-emerald-400" : ["pendiente", "revision_gestor"].includes(t.status) ? "bg-amber-400" : "bg-blue-400"}`} />
                                                ))}
                                                {dayTrips.length > 3 && <p className="text-[9px] font-black text-slate-400">+{dayTrips.length - 3} más</p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={() => setDetailTrip(null)} onRefresh={fetchCalendar} />
        </div>
    );
}
