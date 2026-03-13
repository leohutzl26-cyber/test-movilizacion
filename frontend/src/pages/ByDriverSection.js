import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Users, User, Calendar as CalendarIcon, MapPin, ArrowRight, Clock, Activity, Truck, AlertCircle, Car, Bus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

const VEHICLE_ICONS = {
    Ambulancia: <Activity className="w-4 h-4 text-red-500" />,
    camion: <Truck className="w-4 h-4 text-blue-600" />,
    "Auto/SUV": <Car className="w-4 h-4 text-slate-600" />,
    Camioneta: <Truck className="w-4 h-4 text-emerald-600" />,
    Van: <Bus className="w-4 h-4 text-indigo-600" />
};

export default function ByDriverSection() {
    const [data, setData] = useState([]);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(true);

    const fetchBoard = useCallback(async () => {
        try {
            const res = await api.get(`/trips/by-driver?date=${date}`);
            setData(res.data);
        } catch (e) { toast.error("Error al cargar la pizarra gráfica"); }
        finally { setLoading(false); }
    }, [date]);

    useEffect(() => { fetchBoard(); }, [fetchBoard]);

    const onDragEnd = async (result) => {
        if (!result.destination) return;
        const sId = result.source.droppableId;
        const dId = result.destination.droppableId;

        let newData = [...data];
        const sDriverIndex = newData.findIndex(d => d.driver.id === sId);
        const dDriverIndex = newData.findIndex(d => d.driver.id === dId);

        if (sDriverIndex === -1 || dDriverIndex === -1) return;

        const sTrips = Array.from(newData[sDriverIndex].trips);
        const dTrips = Array.from(newData[dDriverIndex].trips);
        const [moved] = sTrips.splice(result.source.index, 1);

        if (sId === dId) {
            sTrips.splice(result.destination.index, 0, moved);
            newData[sDriverIndex].trips = sTrips;
            setData(newData);
            try {
                await api.put("/trips/reorder", { trip_ids: sTrips.map(t => t.id) });
            } catch (e) { toast.error("Error reordenando"); fetchBoard(); }
        } else {
            dTrips.splice(result.destination.index, 0, moved);
            newData[sDriverIndex].trips = sTrips;
            newData[dDriverIndex].trips = dTrips;
            setData(newData);

            try {
                if (dId === "unassigned") {
                    await api.put(`/trips/${moved.id}/unassign`);
                } else {
                    await api.put(`/trips/${moved.id}/manager-assign`, { driver_id: dId });
                }
                await api.put("/trips/reorder", { trip_ids: dTrips.map(t => t.id) });
                fetchBoard();
            } catch (e) { toast.error("Error modificando conductor"); fetchBoard(); }
        }
    };

    if (loading) return <div className="text-center py-12 text-slate-500"><Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />Cargando pizarra...</div>;

    return (
        <div className="animate-slide-up">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3"><Users className="w-8 h-8 text-teal-600" /> Pizarra Gráfica (Conductores)</h1>
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-slate-200 px-3 py-1">
                    <CalendarIcon className="w-4 h-4 text-slate-500" />
                    <Input type="date" value={date} onChange={e => { setLoading(true); setDate(e.target.value); }} className="border-0 shadow-none focus-visible:ring-0 w-auto" />
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 pb-8">
                    {data.map((col) => (
                        <div key={col.driver.id} className={`rounded-2xl flex flex-col min-h-[400px] border shadow-sm transition-all ${col.driver.id === "unassigned" ? "bg-amber-50/30 border-amber-200 border-dashed" : "bg-white border-slate-200"}`}>
                            {/* Cabecera compacta del Conductor */}
                            <div className={`p-3 rounded-t-2xl border-b flex justify-between items-center ${col.driver.id === "unassigned" ? "bg-amber-100/50" : "bg-slate-50/50"}`}>
                                <div className="min-w-0">
                                    <h3 className="font-black text-slate-800 text-xs flex items-center gap-1.5 uppercase truncate">
                                        {col.driver.id === "unassigned" ? <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" /> : <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                                        <span className="truncate">{col.driver.name}</span>
                                    </h3>
                                    {col.driver.vehicle_plate && (
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className="shrink-0">
                                                {col.driver.vehicle_type ? VEHICLE_ICONS[col.driver.vehicle_type] : <Truck className="w-3 h-3 text-teal-600/50" />}
                                            </div>
                                            <p className="text-[10px] font-mono font-bold text-teal-600/70 leading-none">{col.driver.vehicle_plate}</p>
                                        </div>
                                    )}
                                </div>
                                <Badge variant="outline" className="ml-2 bg-white text-[10px] font-black h-5 border-slate-200">{col.trips.length}</Badge>
                            </div>

                            <Droppable droppableId={col.driver.id}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className={`p-2 flex-grow space-y-2 transition-colors min-h-[100px] ${snapshot.isDraggingOver ? "bg-teal-50/50" : ""}`}>
                                        {col.trips.map((t, idx) => (
                                            <Draggable key={t.id} draggableId={t.id} index={idx}>
                                                {(provided, snap) => (
                                                    <div 
                                                        ref={provided.innerRef} 
                                                        {...provided.draggableProps} 
                                                        {...provided.dragHandleProps} 
                                                        className={`p-2.5 rounded-xl border group transition-all cursor-grab relative overflow-hidden ${
                                                            snap.isDragging 
                                                            ? "bg-white shadow-2xl scale-105 border-teal-500 z-50 ring-2 ring-teal-500/20" 
                                                            : t.status === "en_curso"
                                                                ? "bg-blue-50/50 border-blue-200 hover:border-blue-400"
                                                                : "bg-white border-slate-100 hover:border-teal-200 hover:shadow-md"
                                                        }`}
                                                    >
                                                        {/* Indicador de estado lateral */}
                                                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.status === "en_curso" ? "bg-blue-500" : "bg-teal-500"}`}></div>

                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="bg-slate-900 text-teal-400 px-1.5 py-0.5 rounded font-mono text-[9px] font-black">#{t.tracking_number}</span>
                                                                {t.status === "en_curso" && (
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                                                        <span className="text-[8px] font-black text-blue-600 uppercase">Ruta</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {t.trip_type === "clinico" ? <Activity className="w-3 h-3 text-rose-500" /> : (t.vehicle_type ? VEHICLE_ICONS[t.vehicle_type] : <Truck className="w-3 h-3 text-blue-500" />)}
                                                        </div>

                                                        <p className="font-black text-[11px] text-slate-800 leading-tight mb-2 uppercase line-clamp-2" title={t.trip_type === "clinico" ? t.patient_name : t.task_details}>
                                                            {t.trip_type === "clinico" ? t.patient_name : t.task_details}
                                                        </p>

                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                                <p className="text-[10px] font-bold text-slate-600 truncate uppercase">{t.origin}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <ArrowRight className="w-3 h-3 text-teal-500" />
                                                                <p className="text-[10px] font-bold text-slate-600 truncate uppercase">{t.destination}</p>
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
                                                            <div className="flex items-center gap-1 text-slate-500">
                                                                <Clock className="w-3 h-3" />
                                                                <span className="text-[9px] font-black uppercase">{t.appointment_time || t.departure_time || "--:--"}</span>
                                                            </div>
                                                            <div className={`h-1.5 w-1.5 rounded-full ${t.priority === "urgente" ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" : t.priority === "alta" ? "bg-orange-500" : "bg-slate-300"}`}></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
}
