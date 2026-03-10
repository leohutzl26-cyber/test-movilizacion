import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Users, User, Calendar as CalendarIcon, MapPin, ArrowRight, Clock, Activity, Truck, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

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
                <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[calc(100vh-280px)]">
                    {data.map((col) => (
                        <div key={col.driver.id} className={`flex-shrink-0 w-80 rounded-xl flex flex-col h-full border ${col.driver.id === "unassigned" ? "bg-amber-50/50 border-amber-200 border-dashed" : "bg-slate-50 border-slate-200 shadow-sm"}`}>
                            <div className={`p-4 rounded-t-xl border-b flex justify-between items-center ${col.driver.id === "unassigned" ? "bg-amber-100 border-amber-200" : "bg-white border-slate-100"}`}>
                                <div>
                                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                                        {col.driver.id === "unassigned" ? <AlertCircle className="w-5 h-5 text-amber-600" /> : <User className="w-5 h-5 text-teal-600" />}
                                        {col.driver.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-bold mt-1">{col.trips.length} viajes</p>
                                </div>
                            </div>
                            <Droppable droppableId={col.driver.id}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef} {...provided.droppableProps} className={`p-2 flex-grow overflow-y-auto space-y-2 transition-colors ${snapshot.isDraggingOver ? "bg-teal-50/50" : ""}`}>
                                        {col.trips.map((t, idx) => (
                                            <Draggable key={t.id} draggableId={t.id} index={idx}>
                                                {(provided, snap) => (
                                                    <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`bg-white p-3 rounded-lg shadow-sm border ${snap.isDragging ? "shadow-lg scale-105 border-teal-300 z-50" : "border-slate-200 hover:border-teal-200 hover:shadow-md"} transition-all cursor-grab`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <Badge className="bg-slate-800 font-mono text-[10px]">{t.tracking_number}</Badge>
                                                            {t.trip_type === "clinico" ? <Activity className="w-3.5 h-3.5 text-rose-500" /> : <Truck className="w-3.5 h-3.5 text-blue-500" />}
                                                        </div>
                                                        <p className="font-bold text-sm text-slate-800 leading-tight mb-2 truncate" title={t.trip_type === "clinico" ? t.patient_name : t.task_details}>{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                                                        <div className="text-xs space-y-1.5 text-slate-600">
                                                            <p className="flex items-center gap-1.5 truncate"><MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{t.origin}</p>
                                                            <p className="flex items-center gap-1.5 truncate"><ArrowRight className="w-3.5 h-3.5 text-teal-500 shrink-0" />{t.destination}</p>
                                                            <p className="flex items-center gap-1.5 mt-2 pt-2 border-t font-medium text-slate-700"><Clock className="w-3.5 h-3.5 shrink-0" />Salida: {t.departure_time || "-"}</p>
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
