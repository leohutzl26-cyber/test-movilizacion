import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ClipboardList, Users, Truck, Clock, AlertTriangle, RefreshCw, User, MapPin, ArrowRight, ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, Search, Download, X as XIcon, Filter, Plus, Stethoscope, Activity, TrendingUp, Eye, CheckCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ByDriverSection from "./ByDriverSection";
import NewTripSection from "./NewTripSection";
const COLORS = { pendiente: '#f59e0b', asignado: '#0d9488', en_curso: '#3b82f6', completado: '#10b981', cancelado: '#ef4444', revision_gestor: '#8b5cf6' };
const pColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };
const sColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

export default function ShiftManagerDashboard() {
    const [section, setSection] = useState("dispatch");
    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar activeSection={section} onSectionChange={setSection} />
            <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
                {section === "dispatch" && <DispatchSection onNavigate={setSection} />}
                {section === "drivers" && <DriversSection />}
                {section === "new" && <NewTripSection onNavigate={setSection} />}
                {section === "vehicles" && <VehiclesSection />}
                {section === "assign" && <AssignSection />}
                {section === "byvehicle" && <ByDriverSection />}
                {section === "calendar" && <CalendarSection />}
                {section === "history" && <HistorySection />}
            </main>
        </div>
    );
}

function DispatchSection({ onNavigate }) {
    const [stats, setStats] = useState(null);
    const [poolTrips, setPoolTrips] = useState([]);
    const [activeTrips, setActiveTrips] = useState([]);
    const [tripsTrend, setTripsTrend] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = useCallback(async () => {
        setRefreshing(true);
        try {
            const [s, p, a, h] = await Promise.all([api.get("/stats/dashboard"), api.get("/trips/pool"), api.get("/trips/active"), api.get("/trips/history")]);
            setStats(s.data); setPoolTrips(p.data); setActiveTrips(a.data.filter(t => t.driver_id));
            const trendData = [...Array(7)].map((_, i) => {
                const d = new Date(); d.setDate(d.getDate() - i); const date = d.toISOString().split('T')[0];
                const count = h.data.filter(t => (t.scheduled_date === date) || (t.created_at && t.created_at.startsWith(date))).length;
                return { name: `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })}`, traslados: count };
            }).reverse();
            setTripsTrend(trendData);
        } catch { } finally { setRefreshing(false); }
    }, []);

    useEffect(() => { fetchAll(); const interval = setInterval(fetchAll, 15000); return () => clearInterval(interval); }, [fetchAll]);

    const pieData = stats ? Object.entries(stats.by_status).map(([name, value]) => ({ name: name.replace(/_/g, " "), value: value, color: COLORS[name] || "#cbd5e1" })).filter(i => i.value > 0) : [];


    return (
        <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Consola de Despacho</h1>
                <Button variant="outline" onClick={fetchAll} disabled={refreshing}><RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Actualizar</Button>
            </div>

            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[{ l: "Pendientes", v: stats.by_status.pendiente, i: Clock, c: "text-amber-600 bg-amber-50", n: "assign" },
                    { l: "Activos", v: stats.by_status.asignado + stats.by_status.en_curso, i: Truck, c: "text-blue-600 bg-blue-50", n: "assign" },
                    { l: "Conductores", v: stats.active_drivers, i: Users, c: "text-teal-600 bg-teal-50", n: "drivers" },
                    { l: "Vehículos", v: stats.busy_drivers, i: Activity, c: "text-red-600 bg-red-50", n: "vehicles" }].map(c => (
                        <div key={c.l} className="stat-card cursor-pointer hover:shadow-lg transition-all" onClick={() => c.n && onNavigate(c.n)}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.c}`}><c.i className="w-5 h-5" /></div>
                            <p className="text-2xl font-bold">{c.v}</p><p className="text-xs text-slate-500">{c.l}</p>
                        </div>
                    ))}
                </div>
            )}

            <Tabs defaultValue="live" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-slate-200/60 p-1">
                    <TabsTrigger value="live" className="text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white">Operación en Vivo</TabsTrigger>
                    <TabsTrigger value="analytics" className="text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white">Panel Analítico</TabsTrigger>
                </TabsList>
                <TabsContent value="live">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Bolsa de Trabajo ({poolTrips.length})</CardTitle><Button variant="ghost" size="sm" className="text-teal-600" onClick={() => onNavigate("assign")}>Asignar →</Button></div></CardHeader>
                            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {poolTrips.map(t => (
                                    <div key={t.id} className="p-4 bg-white rounded-lg border shadow-sm hover:border-teal-300 transition-colors">
                                        <div className="flex justify-between mb-2">
                                            <div className="flex gap-2">
                                                <span className="bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded-md text-[10px] font-bold">{t.tracking_number || t.id.substring(0, 6).toUpperCase()}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${pColors[t.priority] || pColors.normal}`}>{t.priority}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400">{t.scheduled_date || new Date(t.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="font-medium text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p>
                                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" /> <span className="truncate">{t.origin}</span> <ArrowRight className="w-3 h-3 mx-1 shrink-0" /> <span className="truncate">{t.destination}</span></p>
                                    </div>
                                ))}
                                {poolTrips.length === 0 && <p className="text-center py-8 text-slate-400">Sin viajes pendientes</p>}
                            </CardContent>
                        </Card>
                        <Card><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" />Viajes Activos ({activeTrips.length})</CardTitle></CardHeader>
                            <CardContent className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                                {activeTrips.map(t => (
                                    <div key={t.id} className="p-4 bg-white rounded-lg border shadow-sm hover:border-teal-300 transition-colors">
                                        <div className="flex justify-between mb-2">
                                            <div className="flex gap-2">
                                                <span className="bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded-md text-[10px] font-bold">{t.tracking_number || t.id.substring(0, 6).toUpperCase()}</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                                            </div>
                                            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-md flex items-center"><User className="w-3 h-3 mr-1" />{t.driver_name}</span>
                                        </div>
                                        <p className="font-medium text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p>
                                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" /> <span className="truncate">{t.origin}</span> <ArrowRight className="w-3 h-3 mx-1 shrink-0" /> <span className="truncate">{t.destination}</span></p>
                                    </div>
                                ))}
                                {activeTrips.length === 0 && <p className="text-center py-8 text-slate-400">Sin viajes activos</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="analytics">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-2 shadow-md"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-teal-600" />Traslados últimos 7 días</CardTitle></CardHeader>
                            <CardContent><div className="h-[300px] w-full mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={tripsTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} /><RechartsTooltip cursor={{ fill: '#f1f5f9' }} /><Bar dataKey="traslados" fill="#0d9488" radius={[4, 4, 0, 0]} name="Viajes" /></BarChart></ResponsiveContainer></div></CardContent></Card>
                        <Card className="shadow-md"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-teal-600" />Estado Actual</CardTitle></CardHeader>
                            <CardContent className="flex flex-col items-center justify-center">
                                {pieData.length > 0 ? (<div className="h-[240px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer></div>) : (<div className="h-[240px] flex items-center justify-center text-slate-400">Sin datos</div>)}
                            </CardContent></Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function AssignSection() {
    const [trips, setTrips] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [filter, setFilter] = useState("all");
    const [cancelDialog, setCancelDialog] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [assignDialog, setAssignDialog] = useState(null);
    const [selectedDriver, setSelectedDriver] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState("");

    const confirmCancel = async () => {
        if (!cancelReason.trim()) { toast.error("Debe ingresar un motivo"); return; }
        try {
            await api.put(`/trips/${cancelDialog.id}/status`, { status: "cancelado", cancel_reason: cancelReason });
            toast.success("Traslado cancelado"); setCancelDialog(null); setCancelReason(""); fetchAll();
        } catch (e) { toast.error("Error al cancelar"); }
    };

    const fetchAll = useCallback(async () => {
        try {
            const [t, d, v] = await Promise.all([api.get("/trips/active"), api.get("/drivers"), api.get("/vehicles")]);
            setTrips(t.data); setDrivers(d.data.filter(dr => dr.status === "aprobado")); setVehicles(v.data);
        } catch { } finally { setLoading(false); }
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleAssign = async () => {
        if (!selectedDriver) { toast.error("Seleccione un conductor"); return; }
        try {
            await api.put(`/trips/${assignDialog.id}/manager-assign`, { driver_id: selectedDriver, vehicle_id: null });
            toast.success("Viaje asignado exitosamente"); setAssignDialog(null); setSelectedDriver(""); fetchAll();
        } catch (e) { toast.error("Error al asignar"); }
    };

    const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800" };
    const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };

    const filteredTrips = filter === "all" ? trips : trips.filter(t => t.status === filter);

    return (
        <div className="animate-slide-up">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Asignación de Traslados</h1>
            <div className="flex gap-2 mb-4 flex-wrap">
                {[{ v: "all", l: "Todos" }, { v: "pendiente", l: "Pendientes" }, { v: "asignado", l: "Asignados" }, { v: "en_curso", l: "En Curso" }].map(f => (
                    <Button key={f.v} variant={filter === f.v ? "default" : "outline"} size="sm" onClick={() => setFilter(f.v)} className={filter === f.v ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}>{f.l}</Button>
                ))}
            </div>
            <div className="space-y-3">
                {filteredTrips.map(t => (
                    <Card key={t.id} className="card-hover shadow-md border-l-4 border-l-teal-500">
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded-md text-[10px] font-bold">{t.tracking_number || t.id.substring(0, 6).toUpperCase()}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="font-bold text-slate-900 text-lg mb-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p>
                                    <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-2">
                                        <MapPin className="w-4 h-4 text-teal-500 shrink-0" /><span className="truncate">{t.origin}</span> <ArrowRight className="w-3 h-3 shrink-0" /> <span className="truncate">{t.destination}</span>
                                    </div>
                                    {t.driver_name && <div className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-md text-xs font-semibold mt-1 mr-2"><User className="w-3.5 h-3.5" /> Conductor: {t.driver_name}</div>}
                                    {t.vehicle_id && <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold mt-1"><Truck className="w-3.5 h-3.5" /> Vehículo: {vehicles.find(v => v.id === t.vehicle_id)?.plate || t.vehicle_id}</div>}
                                </div>
                                <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-[130px]">
                                    <Button onClick={() => setSelectedTrip(t)} variant="outline" className="h-10 text-xs w-full font-medium">
                                        <Eye className="w-4 h-4 mr-1.5" />Ver Detalles
                                    </Button>
                                    <Button onClick={() => { setAssignDialog(t); setSelectedDriver(t.driver_id || ""); setSelectedVehicle(t.vehicle_id || ""); }} className={`h-10 text-xs w-full ${t.driver_id ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white shadow-sm"}`}>
                                        <ArrowLeftRight className="w-4 h-4 mr-1.5" />{t.driver_id ? "Reasignar" : "Asignar"}
                                    </Button>
                                    {["pendiente", "asignado"].includes(t.status) && (
                                        <Button onClick={() => setCancelDialog(t)} variant="outline" className="h-10 text-xs text-red-600 border-red-200 hover:bg-red-50 w-full font-medium">Cancelar</Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {filteredTrips.length === 0 && !loading && <p className="text-center py-12 text-slate-400">Sin viajes en esta categoría</p>}
            </div>

            <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{assignDialog?.driver_id ? "Reasignar Traslado" : "Asignar Traslado"}</DialogTitle></DialogHeader>
                    {assignDialog && (
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-semibold text-sm text-slate-900">{assignDialog.trip_type === "clinico" ? assignDialog.patient_name : assignDialog.task_details}</p>
                                    <span className="bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded-md text-[10px] font-bold">{assignDialog.tracking_number || assignDialog.id.substring(0, 6).toUpperCase()}</span>
                                </div>
                                <p className="text-sm text-slate-500 mt-1 flex items-center"><MapPin className="w-3 h-3 mr-1 text-teal-500" /> {assignDialog.origin} <ArrowRight className="w-3 h-3 mx-1" /> {assignDialog.destination}</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="font-semibold">Conductor *</Label>
                                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Seleccione conductor" /></SelectTrigger>
                                    <SelectContent>
                                        {drivers.map(d => (<SelectItem key={d.id} value={d.id}>{d.name} {d.extra_available ? " (Disponible Extra)" : ""}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setAssignDialog(null)}>Cancelar</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleAssign}>{assignDialog.driver_id ? "Confirmar Reasignación" : "Confirmar Asignación"}</Button></DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>


            <Dialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setCancelReason(""); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Cancelar Traslado</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <p className="text-sm text-slate-600">Indique el motivo por el cual cancela este traslado desde Coordinación:</p>
                        <textarea className="w-full min-h-[80px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-red-400 focus:ring-1 outline-none" placeholder="Ej: Vehículo en pana, traslado reagendado..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setCancelDialog(null)}>Volver</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmCancel}>Confirmar Cancelación</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="text-2xl text-slate-900 border-b pb-2 flex items-center gap-3">Detalle del Traslado <Badge className="bg-slate-800 text-white font-mono text-sm px-2 py-1">{selectedTrip?.tracking_number || selectedTrip?.id.substring(0, 6).toUpperCase()}</Badge></DialogTitle></DialogHeader>
                    {selectedTrip && (
                        <div className="space-y-5 text-sm pt-2">
                            <div className="flex gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[selectedTrip.status]}`}>{selectedTrip.status.replace(/_/g, " ")}</span>
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Traslado No Clínico"}</span>
                            </div>
                            {selectedTrip.trip_type === "clinico" ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="col-span-2 md:col-span-4 border-b border-slate-200 pb-2 mb-2"><p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Paciente</p><p className="font-black text-lg text-slate-900">{selectedTrip.patient_name}</p></div>
                                        <div><p className="text-xs text-slate-500 font-bold">RUT</p><p className="font-medium text-slate-800">{selectedTrip.rut || "-"}</p></div>
                                        <div><p className="text-xs text-slate-500 font-bold">Edad / Peso</p><p className="font-medium text-slate-800">{selectedTrip.age || "-"} / {selectedTrip.weight || "-"}</p></div>
                                        <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Diagnóstico</p><p className="font-medium text-slate-800">{selectedTrip.diagnosis || "-"}</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div><p className="text-xs text-slate-500 font-bold">Motivo Clínico</p><p className="font-medium text-slate-800">{selectedTrip.transfer_reason}</p></div>
                                        <div><p className="text-xs text-slate-500 font-bold">Médico Tratante</p><p className="font-medium text-slate-800">{selectedTrip.attending_physician || "-"}</p></div>
                                        <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Solicitante</p><p className="font-medium text-slate-800">{selectedTrip.requester_person}</p></div>
                                    </div>
                                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                                        {selectedTrip.required_personnel?.length > 0 && <div className="mb-3"><p className="text-xs text-teal-800 uppercase tracking-wider font-bold mb-1">Personal Requerido</p><p className="text-teal-900 font-medium">{selectedTrip.required_personnel.join(", ")}</p></div>}
                                        {selectedTrip.patient_requirements?.length > 0 && <div><p className="text-xs text-teal-800 uppercase tracking-wider font-bold mb-1">Requerimientos Paciente</p><p className="text-teal-900 font-medium">{selectedTrip.patient_requirements.join(", ")}</p></div>}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cometido</p><p className="font-black text-lg text-slate-900">{selectedTrip.task_details}</p></div>
                                    <div><p className="text-xs text-slate-500 font-bold">Cantidad de Funcionarios</p><p className="font-medium text-slate-800">{selectedTrip.staff_count}</p></div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Origen</p><p className="font-bold text-slate-900">{selectedTrip.origin}</p></div>
                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> Destino</p><p className="font-bold text-slate-900">{selectedTrip.destination}</p></div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CalendarSection() {
    const [viewMode, setViewMode] = useState("weekly"); // daily, weekly, monthly
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);

    const getDateRange = useCallback(() => {
        const d = new Date(currentDate);
        if (viewMode === "daily") {
            const ds = d.toISOString().split("T")[0];
            return { start: ds, end: ds };
        }
        if (viewMode === "weekly") {
            const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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
            setTrips(res.data);
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

    const statusColors = { pendiente: "bg-amber-100 text-amber-800", revision_gestor: "bg-purple-100 text-purple-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };
    const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const getTitle = () => {
        if (viewMode === "daily") return currentDate.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        if (viewMode === "weekly") { const { start, end } = getDateRange(); return `${start} / ${end}`; }
        return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    };

    const tripsByDate = (dateStr) => trips.filter(t => t.scheduled_date === dateStr);

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

    const TripCard = ({ t }) => (
        <div onClick={() => setSelectedTrip(t)} className={`p-1.5 rounded-lg border-l-2 mb-1 text-[10px] cursor-pointer hover:shadow-sm transition-all ${t.trip_type === "clinico" ? "border-l-teal-500 bg-teal-50" : "border-l-slate-400 bg-slate-50"}`}>
            <p className="font-bold text-slate-800 truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
            <div className="flex justify-between items-center mt-1">
                <span className="font-mono text-[8px] opacity-70">{t.tracking_number}</span>
                <span className={`px-1 rounded text-[7px] font-bold uppercase ${statusColors[t.status] || "bg-slate-100"}`}>{(t.status || "").replace(/_/g, " ")}</span>
            </div>
        </div>
    );

    return (
        <div className="animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Calendario de Traslados</h1>
                    <p className="text-slate-500 font-medium capitalize">{getTitle()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white border rounded-lg p-1 flex gap-1">
                        {[{ k: "daily", l: "Día" }, { k: "weekly", l: "Sem." }, { k: "monthly", l: "Mes" }].map(v => (
                            <button key={v.k} onClick={() => setViewMode(v.k)} className={`px-2.5 py-1 rounded text-[10px] font-bold ${viewMode === v.k ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}>{v.l}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 bg-white border rounded-lg p-1">
                        <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-2 py-0.5 text-[10px] font-bold text-teal-700">Hoy</button>
                        <button onClick={() => navigate(1)} className="p-1 hover:bg-slate-100 rounded"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>

            {loading ? <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-8 h-8 animate-spin" /></div> : (
                <div className="grid grid-cols-1 gap-4">
                    {viewMode === "daily" && (
                        <div className="space-y-2">
                            {trips.length === 0 ? <p className="text-center py-12 text-slate-400">Sin traslados este día</p> : trips.map(t => (
                                <Card key={t.id} className="cursor-pointer hover:border-teal-400 transition-all" onClick={() => setSelectedTrip(t)}>
                                    <CardContent className="p-3 flex items-center justify-between">
                                        <div className="flex gap-3">
                                            <div className="text-center bg-slate-100 p-2 rounded min-w-[60px]"><p className="text-[8px] font-bold text-slate-400">CITA</p><p className="text-sm font-black">{t.appointment_time || "--:--"}</p></div>
                                            <div><p className="font-bold text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p><p className="text-[10px] text-slate-500">{t.origin} → {t.destination}</p></div>
                                        </div>
                                        <Badge className={`${statusColors[t.status]} text-[8px] uppercase font-black`}>{t.status.replace(/_/g, " ")}</Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                    {viewMode === "weekly" && (
                        <div className="grid grid-cols-7 gap-1">
                            {getWeekDates().map((d, i) => (
                                <div key={d} className={`bg-white rounded border p-1 min-h-[250px] ${d === new Date().toISOString().split("T")[0] ? "border-teal-400 ring-1 ring-teal-100" : ""}`}>
                                    <div className="text-center border-b pb-1 mb-1"><p className="text-[8px] font-bold text-slate-400">{dayNames[i]}</p><p className="text-xs font-black">{d.split("-")[2]}</p></div>
                                    <div className="space-y-1">{tripsByDate(d).map(t => <TripCard key={t.id} t={t} />)}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {viewMode === "monthly" && (
                        <div className="grid grid-cols-7 gap-1">
                            {getMonthGrid().map((d, i) => (
                                <div key={i} onClick={() => d && (setCurrentDate(new Date(d + "T12:00:00")), setViewMode("daily"))} className={`min-h-[70px] bg-white rounded border p-1 ${!d ? "bg-slate-50 opacity-40" : "cursor-pointer hover:shadow-sm"}`}>
                                    {d && <><p className="text-[10px] font-bold text-slate-500">{parseInt(d.split("-")[2])}</p><div className="mt-1">{tripsByDate(d).length > 0 && <span className="bg-teal-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[8px] font-bold">{tripsByDate(d).length}</span>}</div></>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="flex items-center gap-2">Folio: <Badge className="font-mono">{selectedTrip?.tracking_number}</Badge></DialogTitle></DialogHeader>
                    {selectedTrip && (
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg border">
                                    <Label className="text-[10px] font-bold text-slate-400">ORIGEN</Label>
                                    <p className="font-bold">{selectedTrip.origin}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border">
                                    <Label className="text-[10px] font-bold text-slate-400">DESTINO</Label>
                                    <p className="font-bold">{selectedTrip.destination}</p>
                                </div>
                            </div>
                            <div className="p-4 border rounded-xl space-y-2">
                                <p className="text-lg font-black text-slate-900">{selectedTrip.trip_type === "clinico" ? selectedTrip.patient_name : selectedTrip.task_details}</p>
                                <div className="flex gap-2"><Badge variant="outline">{selectedTrip.priority}</Badge><Badge className={statusColors[selectedTrip.status]}>{selectedTrip.status.replace(/_/g, " ")}</Badge></div>
                                {selectedTrip.rut && <p className="text-xs text-slate-500">RUT: {selectedTrip.rut}</p>}
                                {selectedTrip.diagnosis && <p className="text-xs text-slate-500">Diagnóstico: {selectedTrip.diagnosis}</p>}
                                {selectedTrip.clinical_team && <p className="text-xs text-teal-700 font-bold">Personal: {selectedTrip.clinical_team}</p>}
                                {selectedTrip.driver_name && <p className="text-xs text-blue-700 font-bold">Conductor: {selectedTrip.driver_name}</p>}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function HistorySection() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({ status: "", driver_name: "", origin: "", destination: "", trip_type: "", priority: "", date_from: "", date_to: "", search: "" });

    useEffect(() => { api.get("/trips/history").then(r => setTrips(r.data)).catch(() => { }).finally(() => setLoading(false)); }, []);

    const sLabels = { pendiente: "Pendiente", asignado: "Asignado", en_curso: "En Curso", completado: "Completado", cancelado: "Cancelado" };
    const sColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

    const filtered = trips.filter(t => {
        if (filters.status && t.status !== filters.status) return false;
        if (filters.trip_type && t.trip_type !== filters.trip_type) return false;
        if (filters.priority && t.priority !== filters.priority) return false;
        if (filters.driver_name && !(t.driver_name || "").toLowerCase().includes(filters.driver_name.toLowerCase())) return false;
        if (filters.origin && !(t.origin || "").toLowerCase().includes(filters.origin.toLowerCase())) return false;
        if (filters.destination && !(t.destination || "").toLowerCase().includes(filters.destination.toLowerCase())) return false;
        if (filters.date_from && (t.scheduled_date || "") < filters.date_from) return false;
        if (filters.date_to && (t.scheduled_date || "") > filters.date_to) return false;
        if (filters.search) {
            const q = filters.search.toLowerCase();
            const fields = [t.tracking_number, t.patient_name, t.task_details, t.origin, t.destination, t.driver_name, t.rut, t.diagnosis];
            if (!fields.some(f => f && f.toLowerCase().includes(q))) return false;
        }
        return true;
    });

    const expXL = () => {
        const data = filtered.map(t => ({
            "Folio": t.tracking_number || "",
            "Estado": sLabels[t.status] || t.status, "Tipo": t.trip_type === "clinico" ? "Clínico" : "No Clínico", "Prioridad": t.priority,
            "Paciente/Cometido": t.trip_type === "clinico" ? t.patient_name : t.task_details, "RUT": t.rut || "", "Edad": t.age || "", "Diagnóstico": t.diagnosis || "",
            "Motivo Clínico": t.transfer_reason || "", "Origen": t.origin, "Destino": t.destination, "Unidad/Servicio": t.patient_unit || "", "Cama": t.bed || "",
            "Fecha Programada": t.scheduled_date || "", "Hora Citación": t.appointment_time || "", "Hora Salida": t.departure_time || "",
            "Conductor": t.driver_name || "Sin asignar", "Vehículo": t.vehicle_plate || "", "Solicitante": t.requester_name || "", "Médico": t.attending_physician || "",
            "Personal Req": t.required_personnel?.join(", ") || "", "Req Paciente": t.patient_requirements?.join(", ") || "", "Acompañamiento": t.accompaniment || "", "Cant Func.": t.staff_count || "",
            "KM Inicio": t.start_mileage || "", "KM Final": t.end_mileage || "", "KM Recorrido": (t.start_mileage && t.end_mileage) ? t.end_mileage - t.start_mileage : "", "Notas": t.notes || ""
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), ws, "Historial"), `historial_traslados_${new Date().toISOString().split("T")[0]}.xlsx`);
    };

    if (loading) return <div className="text-center py-12 text-slate-500"><Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600" />Cargando historial...</div>;
    return (
        <div className="animate-slide-up">
            <div className="flex justify-between mb-6 flex-wrap gap-3"><h1 className="text-2xl md:text-3xl font-bold text-slate-900">Historial de Traslados</h1><div className="flex gap-2"><Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="w-4 h-4 mr-2" />Filtros</Button><Button onClick={expXL} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"><Download className="w-4 h-4 mr-2" />Excel</Button></div></div>
            <div className="relative mb-4"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><Input placeholder="Buscar por Folio, paciente, cometido, conductor, RUT, diagnóstico..." className="pl-10 h-10 border-slate-300" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} /></div>
            {showFilters && (
                <Card className="mb-6 border-teal-100 bg-teal-50/20 shadow-sm animate-slide-up"><CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-700">Estado</Label><Select onValueChange={v => setFilters({ ...filters, status: v === "all" ? "" : v })}><SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="asignado">Asignado</SelectItem><SelectItem value="en_curso">En Curso</SelectItem><SelectItem value="completado">Completado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-700">Tipo</Label><Select onValueChange={v => setFilters({ ...filters, trip_type: v === "all" ? "" : v })}><SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="clinico">Clínico</SelectItem><SelectItem value="no_clinico">No Clínico</SelectItem></SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-700">Desde</Label><Input type="date" className="h-9 bg-white" onChange={e => setFilters({ ...filters, date_from: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs font-bold text-slate-700">Hasta</Label><Input type="date" className="h-9 bg-white" onChange={e => setFilters({ ...filters, date_to: e.target.value })} /></div>
                    <div className="flex items-end"><Button variant="ghost" size="sm" onClick={() => setFilters({ status: "", driver_name: "", origin: "", destination: "", trip_type: "", priority: "", date_from: "", date_to: "", search: "" })} className="text-red-500 hover:text-red-700 hover:bg-red-50"><XIcon className="w-3 h-3 mr-1" />Limpiar</Button></div>
                </CardContent></Card>
            )}
            <p className="text-sm text-slate-500 mb-3 font-medium">Mostrando {filtered.length} de {trips.length} resultados</p>
            <Card className="shadow-md border-slate-200"><CardContent className="p-0 overflow-x-auto"><Table>
                <TableHeader className="bg-slate-100"><TableRow><TableHead className="font-bold text-slate-700">Folio</TableHead><TableHead className="font-bold text-slate-700">Estado</TableHead><TableHead className="font-bold text-slate-700">Tipo</TableHead><TableHead className="font-bold text-slate-700">Fecha</TableHead><TableHead className="font-bold text-slate-700">Detalle / Paciente</TableHead><TableHead className="font-bold text-slate-700">Origen</TableHead><TableHead className="font-bold text-slate-700">Destino</TableHead></TableRow></TableHeader>
                <TableBody>
                    {filtered.map(t => (
                        <TableRow key={t.id} className="cursor-pointer hover:bg-teal-50 transition-colors" onClick={() => setSelectedTrip(t)}>
                            <TableCell className="text-xs font-mono font-bold text-teal-700">{t.tracking_number || "-"}</TableCell>
                            <TableCell><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sColors[t.status]}`}>{sLabels[t.status]}</span></TableCell>
                            <TableCell className="text-xs font-semibold text-slate-600">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</TableCell>
                            <TableCell className="text-xs whitespace-nowrap text-slate-500">{t.scheduled_date}</TableCell>
                            <TableCell className="text-sm font-bold text-slate-900 max-w-[150px] truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</TableCell>
                            <TableCell className="text-xs text-slate-600">{t.origin}</TableCell>
                            <TableCell className="text-xs text-slate-600">{t.destination}</TableCell>
                        </TableRow>
                    ))}
                    {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-16 text-slate-400">Sin resultados para mostrar</TableCell></TableRow>}
                </TableBody>
            </Table></CardContent></Card>

            <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="text-2xl text-slate-900 border-b pb-2 flex items-center gap-3">Detalle del Traslado <Badge className="bg-slate-800 text-white font-mono text-sm px-2 py-1">{selectedTrip?.tracking_number || selectedTrip?.id.substring(0, 6).toUpperCase()}</Badge></DialogTitle></DialogHeader>
                    {selectedTrip && (
                        <div className="space-y-5 text-sm pt-2">
                            <div className="flex gap-2 mb-2">
                                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${sColors[selectedTrip.status]}`}>{sLabels[selectedTrip.status]}</span>
                                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Traslado No Clínico"}</span>
                                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${selectedTrip.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{selectedTrip.priority}</span>
                            </div>
                            {selectedTrip.trip_type === "clinico" ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="col-span-2 md:col-span-4 border-b border-slate-200 pb-2 mb-2"><p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Paciente</p><p className="font-black text-lg text-slate-900">{selectedTrip.patient_name}</p></div>
                                        <div><p className="text-xs text-slate-500 font-bold">RUT</p><p className="font-medium text-slate-800">{selectedTrip.rut || "-"}</p></div>
                                        <div><p className="text-xs text-slate-500 font-bold">Edad / Peso</p><p className="font-medium text-slate-800">{selectedTrip.age || "-"} / {selectedTrip.weight || "-"}</p></div>
                                        <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Diagnóstico</p><p className="font-medium text-slate-800">{selectedTrip.diagnosis || "-"}</p></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div><p className="text-xs text-slate-500 font-bold">Motivo Clínico</p><p className="font-medium text-slate-800">{selectedTrip.transfer_reason}</p></div>
                                        <div><p className="text-xs text-slate-500 font-bold">Médico Tratante</p><p className="font-medium text-slate-800">{selectedTrip.attending_physician || "-"}</p></div>
                                        <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Solicitante</p><p className="font-medium text-slate-800">{selectedTrip.requester_person}</p></div>
                                    </div>
                                    <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                                        {selectedTrip.required_personnel?.length > 0 && <div className="mb-3"><p className="text-xs text-teal-800 uppercase tracking-wider font-bold mb-1">Personal Requerido</p><p className="text-teal-900 font-medium">{selectedTrip.required_personnel.join(", ")}</p></div>}
                                        {selectedTrip.patient_requirements?.length > 0 && <div><p className="text-xs text-teal-800 uppercase tracking-wider font-bold mb-1">Requerimientos Paciente</p><p className="text-teal-900 font-medium">{selectedTrip.patient_requirements.join(", ")}</p></div>}
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cometido</p><p className="font-black text-lg text-slate-900">{selectedTrip.task_details}</p></div>
                                    <div><p className="text-xs text-slate-500 font-bold">Cantidad de Funcionarios</p><p className="font-medium text-slate-800">{selectedTrip.staff_count}</p></div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Origen</p><p className="font-bold text-slate-900">{selectedTrip.origin}</p></div>
                                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> Destino</p><p className="font-bold text-slate-900">{selectedTrip.destination}</p></div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function VehiclesSection() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchVehicles = useCallback(async () => { try { const r = await api.get("/vehicles"); setVehicles(r.data); } catch { } finally { setLoading(false); } }, []);
    useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

    const handleStatusChange = async (vehicleId, status) => {
        try { await api.put(`/vehicles/${vehicleId}/status`, { status }); toast.success("Estado actualizado"); fetchVehicles(); }
        catch (e) { toast.error("Error al cambiar estado"); }
    };

    const statusColors = { disponible: "bg-green-100 text-green-800 border-green-200", en_servicio: "bg-blue-100 text-blue-800 border-blue-200", en_limpieza: "bg-violet-100 text-violet-800 border-violet-200", en_taller: "bg-orange-100 text-orange-800 border-orange-200", fuera_de_servicio: "bg-red-100 text-red-800 border-red-200" };
    const statusOptions = ["disponible", "en_servicio", "en_limpieza", "en_taller", "fuera_de_servicio"];

    return (
        <div className="animate-slide-up">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Flota de Vehículos</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {vehicles.map(v => (
                    <Card key={v.id} className="shadow-sm border-slate-200">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center"><Truck className="w-5 h-5 text-teal-600" /></div><span className="font-black text-xl text-slate-900">{v.plate}</span></div>
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[v.status] || "bg-slate-100"}`}>{v.status.replace(/_/g, " ")}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-600 mb-4">{v.brand} {v.model} ({v.year})</p>
                            <Select value={v.status} onValueChange={val => handleStatusChange(v.id, val)}>
                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s} className="font-medium">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function DriversSection() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchDrivers = useCallback(async () => { try { const r = await api.get("/drivers"); setDrivers(r.data); } catch { } finally { setLoading(false); } }, []);
    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    return (
        <div className="animate-slide-up">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Gestión de Conductores</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {drivers.map(d => (
                    <Card key={d.id} className="shadow-sm border-slate-200">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-indigo-600" /></div>
                                    <div><p className="font-bold text-slate-900 text-lg">{d.name}</p><p className="text-xs font-medium text-slate-500">{d.email}</p></div>
                                </div>
                            </div>
                            {d.extra_available && <Badge className="bg-teal-100 text-teal-800 border border-teal-200 w-full justify-center py-1.5 mb-3 shadow-sm">DISPONIBILIDAD EXTRA ACTIVA</Badge>}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
