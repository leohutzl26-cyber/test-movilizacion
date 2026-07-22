import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Stethoscope, User, Calendar as CalendarIcon, MapPin, ArrowRight, Clock, Activity, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { formatScheduledDate } from "@/lib/tripUtils";

const STATUS_CARD_STYLES = {
    revision_gestor: {
        bg: "bg-purple-50/40 border-purple-200 hover:border-purple-400 hover:shadow-md",
        indicator: "bg-purple-500",
        badge: "bg-purple-100 text-purple-800 border-purple-200",
        label: "Por Visar"
    },
    pendiente: {
        bg: "bg-amber-50/40 border-amber-200 hover:border-amber-400 hover:shadow-md",
        indicator: "bg-amber-500",
        badge: "bg-amber-100 text-amber-800 border-amber-200",
        label: "Visado"
    },
    asignado: {
        bg: "bg-teal-50/40 border-teal-200 hover:border-teal-400 hover:shadow-md",
        indicator: "bg-teal-500",
        badge: "bg-teal-100 text-teal-800 border-teal-200",
        label: "Asignado"
    },
    en_curso: {
        bg: "bg-blue-50/50 border-blue-200 hover:border-blue-400 hover:shadow-md",
        indicator: "bg-blue-500",
        badge: "bg-blue-100 text-blue-800 border-blue-200",
        label: "En Curso"
    },
    completado: {
        bg: "bg-emerald-50/40 border-emerald-200 hover:border-emerald-400 hover:shadow-md",
        indicator: "bg-emerald-500",
        badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
        label: "Completado"
    },
    cancelado: {
        bg: "bg-rose-50/40 border-rose-200 hover:border-rose-400 hover:shadow-md",
        indicator: "bg-rose-500",
        badge: "bg-rose-100 text-rose-800 border-rose-200",
        label: "Cancelado"
    }
};

export default function ByClinicalSection() {
    const { user } = useAuth();
    const [data, setData] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [viewType, setViewType] = useState(() => {
        return localStorage.getItem("movilizacion.by_clinical.view") || "diaria";
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        localStorage.setItem("movilizacion.by_clinical.view", viewType);
    }, [viewType]);

    const handlePrevDate = () => {
        setLoading(true);
        const current = new Date(date + "T12:00:00");
        if (viewType === "diaria") {
            current.setDate(current.getDate() - 1);
        } else if (viewType === "semanal") {
            current.setDate(current.getDate() - 7);
        } else if (viewType === "mensual") {
            current.setMonth(current.getMonth() - 1);
        }
        setDate(current.toISOString().split("T")[0]);
    };

    const handleNextDate = () => {
        setLoading(true);
        const current = new Date(date + "T12:00:00");
        if (viewType === "diaria") {
            current.setDate(current.getDate() + 1);
        } else if (viewType === "semanal") {
            current.setDate(current.getDate() + 7);
        } else if (viewType === "mensual") {
            current.setMonth(current.getMonth() + 1);
        }
        setDate(current.toISOString().split("T")[0]);
    };

    const fetchBoard = useCallback(async () => {
        try {
            const res = await api.get(`/trips/by-clinical?date=${date}&role=${user?.role || ''}&view=${viewType}`);
            if (res && Array.isArray(res.data)) {
                setData(res.data);
            } else {
                setData([
                    {
                        staff: { id: "unassigned", name: "Sin Personal Asignado", profession: "Pendiente", is_working: false },
                        trips: []
                    }
                ]);
            }
        } catch (e) {
            console.error("Error al cargar la pizarra gráfica clínica:", e);
            setData([
                {
                    staff: { id: "unassigned", name: "Sin Personal Asignado", profession: "Pendiente", is_working: false },
                    trips: []
                }
            ]);
        } finally {
            setLoading(false);
        }
    }, [date, user?.role, viewType]);

    useEffect(() => {
        fetchBoard();
    }, [fetchBoard]);

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const sId = result.source.droppableId;
        const dId = result.destination.droppableId;

        let newData = [...data];
        const sStaffIndex = newData.findIndex(s => s.staff.id === sId);
        const dStaffIndex = newData.findIndex(s => s.staff.id === dId);

        if (sStaffIndex === -1 || dStaffIndex === -1) return;

        const sTrips = Array.from(newData[sStaffIndex].trips);
        const dTrips = Array.from(newData[dStaffIndex].trips);

        const movedTrip = sTrips[result.source.index];
        if (movedTrip && movedTrip.status === "completado") {
            toast.error("No se puede mover un traslado completado");
            return;
        }

        const [moved] = sTrips.splice(result.source.index, 1);

        if (sId === dId) {
            sTrips.splice(result.destination.index, 0, moved);
            newData[sStaffIndex].trips = sTrips;
            setData(newData);
        } else {
            dTrips.splice(result.destination.index, 0, moved);
            newData[sStaffIndex].trips = sTrips;
            newData[dStaffIndex].trips = dTrips;
            setData(newData);

            const targetStaff = newData[dStaffIndex].staff;
            try {
                await api.put(`/trips/${moved.id}/clinical-assign`, {
                    staff_id: targetStaff.id,
                    staff_name: targetStaff.name,
                    staff_type: targetStaff.profession || "Acompañante"
                });
                toast.success(`Traslado asignado a ${targetStaff.name}`);
                fetchBoard();
            } catch (e) {
                toast.error("Error al reasignar funcionario clínico");
                fetchBoard();
            }
        }
    };

    if (loading) {
        return (
            <div className="text-center py-20 text-slate-500 font-medium">
                <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />
                Cargando pizarra de personal clínico...
            </div>
        );
    }

    const getFriendlyDateLabel = () => {
        const dateObj = new Date(date + "T12:00:00");
        if (viewType === "diaria") {
            return dateObj.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        }
        if (viewType === "semanal") {
            const dayOfWeek = dateObj.getDay();
            const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(dateObj);
            monday.setDate(dateObj.getDate() + distanceToMonday);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            
            const optMonthDay = { day: 'numeric', month: 'short' };
            const optYear = { year: 'numeric' };
            return `Semana: Lunes ${monday.toLocaleDateString('es-ES', optMonthDay)} - Domingo ${sunday.toLocaleDateString('es-ES', { ...optMonthDay, ...optYear })}`;
        }
        if (viewType === "mensual") {
            return dateObj.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
        }
        return "";
    };

    return (
        <div className="animate-slide-up space-y-6">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 flex items-center gap-3">
                        <Stethoscope className="w-8 h-8 text-teal-600" /> Pizarra Gráfica (Personal Clínico)
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        Monitoree la carga de trabajo y turnos en vivo del equipo de acompañamiento clínico.
                    </p>
                    <div className="mt-2 text-xs font-black text-teal-700 uppercase tracking-wider bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 w-fit">
                        📅 {getFriendlyDateLabel()}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto xl:justify-end">
                    {/* Selector de tipo de vista */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 shadow-xs">
                        <button
                            onClick={() => { setLoading(true); setViewType("diaria"); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                viewType === "diaria" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Diaria
                        </button>
                        <button
                            onClick={() => { setLoading(true); setViewType("semanal"); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                viewType === "semanal" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Semanal
                        </button>
                        <button
                            onClick={() => { setLoading(true); setViewType("mensual"); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                viewType === "mensual" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
                            }`}
                        >
                            Mensual
                        </button>
                    </div>

                    {/* Selector de fecha */}
                    <div className="flex items-center gap-1 bg-white rounded-xl shadow-xs border border-slate-200 p-1 shrink-0">
                        <button onClick={handlePrevDate} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title={viewType === "diaria" ? "Día Anterior" : viewType === "semanal" ? "Semana Anterior" : "Mes Anterior"}>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 px-2 py-1">
                            <CalendarIcon className="w-4 h-4 text-slate-500" />
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => { setLoading(true); setDate(e.target.value); }}
                                className="border-0 shadow-none focus-visible:ring-0 w-auto p-0 h-auto text-xs font-bold text-slate-700 bg-transparent cursor-pointer"
                            />
                        </div>
                        <button onClick={handleNextDate} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title={viewType === "diaria" ? "Día Siguiente" : viewType === "semanal" ? "Semana Siguiente" : "Mes Siguiente"}>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-8">
                    {data.map((col) => {
                        const isUnassigned = col.staff.id === "unassigned";
                        const isWorking = col.staff.is_working;

                        return (
                            <div
                                key={col.staff.id}
                                className={`rounded-2xl border flex flex-col max-h-[80vh] transition-all ${
                                    isUnassigned
                                        ? "bg-slate-100/70 border-slate-300"
                                        : isWorking
                                        ? "bg-teal-50/30 border-teal-300 shadow-sm ring-1 ring-teal-200"
                                        : "bg-slate-50/50 border-slate-200"
                                }`}
                            >
                                {/* HEADER COLUMNA */}
                                <div className={`p-4 border-b rounded-t-2xl ${
                                    isUnassigned
                                        ? "bg-slate-200/80 border-slate-300 text-slate-700"
                                        : isWorking
                                        ? "bg-teal-600 text-white border-teal-700 shadow-sm"
                                        : "bg-slate-200 text-slate-700 border-slate-300"
                                }`}>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {isUnassigned ? (
                                                <AlertCircle className="w-5 h-5 text-slate-600 shrink-0" />
                                            ) : (
                                                <User className="w-5 h-5 shrink-0" />
                                            )}
                                            <h3 className="font-black text-sm truncate uppercase tracking-tight">{col.staff.name}</h3>
                                        </div>
                                        <Badge className={`shrink-0 text-[10px] font-black uppercase px-2 py-0.5 border-none ${
                                            isUnassigned
                                                ? "bg-slate-300 text-slate-700"
                                                : isWorking
                                                ? "bg-emerald-400 text-emerald-950 animate-pulse"
                                                : "bg-slate-300 text-slate-600"
                                        }`}>
                                            {isUnassigned ? "Pendientes" : isWorking ? "🟢 En Turno" : "⚪ Fuera"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-semibold opacity-90">
                                        <span>{col.staff.profession}</span>
                                        <span className="font-bold text-[11px] px-1.5 py-0.5 rounded bg-black/10">
                                            {col.trips.length} {col.trips.length === 1 ? "traslado" : "traslados"}
                                        </span>
                                    </div>
                                </div>

                                {/* DROPPABLE AREA */}
                                <Droppable droppableId={col.staff.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`p-3 space-y-3 flex-1 overflow-y-auto min-h-[160px] transition-colors ${
                                                snapshot.isDraggingOver ? (isUnassigned ? "bg-amber-100/50" : "bg-teal-100/50") : ""
                                            }`}
                                        >
                                            {col.trips.map((trip, index) => {
                                                const cardStyle = STATUS_CARD_STYLES[trip.status] || STATUS_CARD_STYLES.pendiente;

                                                return (
                                                    <Draggable key={trip.id} draggableId={trip.id} index={index} isDragDisabled={trip.status === "completado"}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={`p-3 rounded-xl border transition-all ${cardStyle.bg} ${
                                                                    snapshot.isDragging ? "shadow-xl ring-2 ring-teal-500 rotate-1 scale-105" : "shadow-2xs"
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between gap-1 mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`w-2.5 h-2.5 rounded-full ${cardStyle.indicator}`} />
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                                                                            #{trip.tracking_number}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        {trip.priority === "urgente" && (
                                                                            <Badge className="bg-red-500 text-white font-black text-[9px] uppercase px-1 py-0 border-none">
                                                                                Urgente
                                                                            </Badge>
                                                                        )}
                                                                        <Badge className={`text-[9px] font-black uppercase border ${cardStyle.badge}`}>
                                                                            {cardStyle.label || trip.status}
                                                                        </Badge>
                                                                    </div>
                                                                </div>

                                                                {/* PACIENTE Y CITA */}
                                                                {trip.patient_name && (
                                                                    <div className="mb-2">
                                                                        <p className="font-extrabold text-xs text-slate-800 line-clamp-1">{trip.patient_name}</p>
                                                                        <p className="text-[10px] font-medium text-slate-500">
                                                                            RUT: {trip.rut || "Sin RUT"} {trip.bed ? `• Cama: ${trip.bed}` : ""}
                                                                        </p>
                                                                    </div>
                                                                )}

                                                                {/* RUTA */}
                                                                <div className="bg-white/70 p-2 rounded-lg border border-slate-200/60 mb-2 space-y-1 text-[11px] font-bold text-slate-700">
                                                                    <div className="flex items-center gap-1.5 text-teal-700">
                                                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-600" />
                                                                        <span className="truncate">{trip.origin || "Sin origen"}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1.5 text-indigo-700">
                                                                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
                                                                        <span className="truncate">{trip.destination || "Sin destino"}</span>
                                                                    </div>
                                                                </div>

                                                                {/* FOOTER TARJETA */}
                                                                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-1 border-t border-slate-200/50">
                                                                    <div className="flex items-center gap-1 text-slate-600 font-bold">
                                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                                        <span>
                                                                            {viewType !== "diaria" && trip.scheduled_date ? `${formatScheduledDate(trip.scheduled_date)} • ` : ""}
                                                                            {trip.appointment_time || trip.departure_time || "--:--"}
                                                                        </span>
                                                                    </div>
                                                                    {trip.transfer_reason && (
                                                                        <span className="truncate max-w-[120px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600">
                                                                            {trip.transfer_reason}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                );
                                            })}
                                            {provided.placeholder}
                                            {col.trips.length === 0 && (
                                                <div className="py-8 text-center text-xs text-slate-400 font-medium italic border-2 border-dashed border-slate-200/60 rounded-xl">
                                                    Sin traslados asignados
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        );
                    })}
                </div>
            </DragDropContext>
        </div>
    );
}
