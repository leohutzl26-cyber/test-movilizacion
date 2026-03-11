import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity, CalendarDays, Truck, User, AlertTriangle, RefreshCw, ClipboardList, Stethoscope, Plus, Trash2, XCircle, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ByDriverSection from "./ByDriverSection";

// ========== RUT VALIDATION (MÓDULO 11) ==========
function validateRut(rut) {
  const clean = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase().trim();
  if (clean.length < 2) return { valid: false, formatted: rut };
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return { valid: false, formatted: rut };
  let total = 0, factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    total += parseInt(body[i]) * factor;
    factor = factor < 7 ? factor + 1 : 2;
  }
  const remainder = 11 - (total % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  const valid = dv === expected;
  let formatted = "";
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) formatted = "." + formatted;
    formatted = body[i] + formatted;
  }
  return { valid, formatted: `${formatted}-${expected}` };
}

const COLORS = { pendiente: '#f59e0b', asignado: '#0d9488', en_curso: '#3b82f6', completado: '#10b981', cancelado: '#ef4444', revision_gestor: '#8b5cf6' };
const pColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };
const sColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800", revision_gestor: "bg-purple-100 text-purple-800" };

function TripDetailDialog({ trip, open, onOpenChange, onRefresh }) {
    if (!trip) return null;

    const handleUnassign = async () => {
        try {
            await api.put(`/trips/${trip.id}/unassign`);
            toast.success("Traslado desasignado correctamente");
            onOpenChange(false);
            if (onRefresh) onRefresh();
        } catch (e) {
            toast.error("Error al desasignar traslado");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white rounded-3xl overflow-hidden border-none shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <Badge className={`${sColors[trip.status] || "bg-slate-100"} border-none text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full`}>{(trip.status || "").replace(/_/g, " ")}</Badge>
                        <Badge className={`${pColors[trip.priority] || pColors.normal} border-none text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full`}>{trip.priority}</Badge>
                    </div>
                    <DialogTitle className="text-3xl font-black text-slate-900 leading-tight">
                        {trip.trip_type === "clinico" ? "Detalle Traslado Clínico" : "Detalle de Cometido"}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-8 pt-4">
                    <div className="flex items-center justify-between bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl">
                        <div>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Folio de Seguimiento</p>
                            <p className="text-2xl font-mono font-black text-teal-400">{trip.tracking_number || trip.id.substring(0, 8).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mb-1">Tipo</p>
                            <p className="font-black text-xl uppercase italic">{trip.trip_type === "clinico" ? "Clínico" : "General"}</p>
                        </div>
                    </div>

                    {trip.trip_type === "clinico" ? (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><User className="w-3 h-3" /> Paciente</p>
                                    <p className="font-black text-slate-900 text-lg">{trip.patient_name}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-1">RUT: {trip.rut || "No registrado"}</p>
                                </div>
                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3 h-3" /> Estado Clínico</p>
                                    <p className="font-bold text-slate-800">{trip.transfer_reason || "Traslado programado"}</p>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{trip.diagnosis || "Sin diagnóstico detallado"}</p>
                                </div>
                            </div>
                            
                            <div className="bg-teal-50/50 p-5 rounded-3xl border border-teal-100/50">
                                <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest mb-3">Personal & Requerimientos</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-bold text-teal-600/70 uppercase mb-1">Equipo Clínico</p>
                                        <p className="text-sm font-black text-teal-900">{trip.required_personnel?.join(", ") || "No especificado"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-teal-600/70 uppercase mb-1">Equipamiento</p>
                                        <p className="text-sm font-black text-teal-900">{trip.patient_requirements?.join(", ") || "Estándar"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><ClipboardList className="w-3 h-3" /> Motivo del Cometido</p>
                            <p className="text-xl font-black text-slate-900">{trip.task_details}</p>
                            {trip.notes && <p className="text-sm text-slate-600 mt-3 italic">"{trip.notes}"</p>}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 shadow-inner"><MapPin className="w-6 h-6 text-teal-600" /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Origen</p>
                                <p className="font-black text-slate-900">{trip.origin}</p>
                                {trip.patient_unit && <p className="text-[10px] font-bold text-teal-600">{trip.patient_unit}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 shadow-inner"><ArrowRight className="w-6 h-6 text-blue-600" /></div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Destino</p>
                                <p className="font-black text-slate-900">{trip.destination}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Conductor Asignado</p>
                                {trip.driver_name ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center"><User className="w-4 h-4 text-slate-600" /></div>
                                        <p className="font-black text-slate-900">{trip.driver_name}</p>
                                        <Badge className="bg-teal-100 text-teal-800 border-none font-mono text-[10px]">{trip.vehicle_plate || "Móvil pendiente"}</Badge>
                                    </div>
                                ) : (
                                    <p className="text-sm font-bold text-slate-400 italic">No se ha asignado conductor aún</p>
                                )}
                            </div>
                            {trip.driver_id && trip.status === "asignado" && (
                                <Button onClick={handleUnassign} variant="destructive" size="sm" className="h-9 px-4 font-bold shadow-md">
                                    Desasignar
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-8 py-4 border-t border-slate-100">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Fecha</p>
                            <p className="text-sm font-black text-slate-700">{trip.scheduled_date || "Hoy"}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Hora Cita</p>
                            <p className="text-sm font-black text-teal-700">{trip.appointment_time || "--:--"}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Prioridad</p>
                            <p className={`text-sm font-black px-2 py-0.5 rounded ${pColors[trip.priority] || pColors.normal}`}>{trip.priority.toUpperCase()}</p>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function ShiftManagerDashboard_UTF8() {
    const [section, setSection] = useState("dispatch");
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, completed: 0 });

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get("/stats/dashboard");
            setStats(res.data);
        } catch (e) { }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar activeSection={section} onSectionChange={setSection} />
            <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
                <div className="max-w-7xl mx-auto">
                    {section === "dispatch" && <DispatchSection />}
                    {section === "assign" && <AssignSection />}
                    {section === "new" && <NewTripSection onNavigate={setSection} />}
                    {section === "calendar" && <CalendarSection />}
                    {section === "by_driver" && <ByDriverSection />}
                    {section === "vehicles" && <VehiclesSection />}
                    {section === "drivers" && <DriversSection />}
                    {section === "history" && <HistorySection />}
                </div>
            </main>
        </div>
    );
}

function DispatchSection() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTrips = useCallback(async () => {
        try {
            const res = await api.get("/trips/active");
            setTrips(res.data || []);
        } catch (e) { } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchTrips();
        const interval = setInterval(fetchTrips, 15000);
        return () => clearInterval(interval);
    }, [fetchTrips]);

    if (loading) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    return (
        <div className="animate-slide-up">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Despacho de Movilización</h1>
                <p className="text-slate-500 font-medium">Vista global de traslados en curso y por iniciar.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map(t => (
                    <Card key={t.id} className="card-hover overflow-hidden border-none shadow-sm ring-1 ring-slate-200">
                        <div className={`h-1.5 w-full bg-slate-200`} style={{ backgroundColor: COLORS[t.status] || '#cbd5e1' }}></div>
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex flex-col gap-1">
                                    <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold shadow-sm w-fit">{t.tracking_number}</span>
                                    <h3 className="font-black text-lg text-slate-900 leading-tight mt-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</h3>
                                </div>
                                <Badge className={`${sColors[t.status] || "bg-slate-100"} border-none shadow-sm text-[10px] font-black uppercase tracking-widest`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                            </div>

                            <div className="space-y-3 mb-5">
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                                    <div className="truncate"><span className="text-[10px] font-bold text-slate-400 block uppercase tracking-tighter">Origen</span>{t.origin}</div>
                                </div>
                                <div className="flex items-center gap-3 text-sm font-medium text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <ArrowRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                    <div className="truncate"><span className="text-[10px] font-bold text-slate-400 block uppercase tracking-tighter">Destino</span>{t.destination}</div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Truck className="w-4 h-4 text-slate-500" /></div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Conductor / Móvil</p>
                                        <p className="text-xs font-bold text-slate-700">{t.driver_name || "Sin asignar"}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Programado</p>
                                    <p className="text-xs font-bold text-slate-700">{t.appointment_time || "Inmediato"}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {trips.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 font-bold bg-white rounded-2xl border-2 border-dashed border-slate-200">No hay traslados activos en este momento.</div>}
            </div>
        </div>
    );
}

function AssignSection() {
    const [trips, setTrips] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assignDialog, setAssignDialog] = useState(null);
    const [cancelDialog, setCancelDialog] = useState(null);
    const [detailTrip, setDetailTrip] = useState(null);
    const [filter, setFilter] = useState("all");

    const fetchAll = useCallback(async () => {
        try {
            const [tRes, dRes] = await Promise.all([api.get("/trips/pool"), api.get("/drivers")]);
            setTrips(tRes.data || []); setDrivers(dRes.data || []);
        } catch (e) { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); const i = setInterval(fetchAll, 10000); return () => clearInterval(i); }, [fetchAll]);

    const handleAssign = async (tripId, driverId) => {
        try {
            await api.post(`/trips/${tripId}/manager-assign`, { driver_id: driverId });
            toast.success("Viaje asignado exitosamente");
            setAssignDialog(null); fetchAll();
        } catch (e) { toast.error("Error al asignar"); }
    };

    const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", revision_gestor: "bg-purple-100 text-purple-800" };
    const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };

    const filteredTrips = filter === "all" ? trips : trips.filter(t => t.status === filter);

    if (loading) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    return (
        <div className="animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bandeja de Asignación</h1>
                    <p className="text-slate-500 font-medium mt-1">Gestione solicitudes pendientes y asigne conductores.</p>
                </div>
                <div className="flex gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {["all", "pendiente", "asignado"].map(f => (
                        <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filter === f ? "bg-teal-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-100"}`}>{f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}</button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                {filteredTrips.map(t => (
                    <Card key={t.id} onClick={() => setDetailTrip(t)} className="card-hover border-l-4 border-l-teal-500 shadow-sm overflow-hidden cursor-pointer group">
                        <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded-md text-[10px] font-bold group-hover:bg-teal-600 group-hover:text-white transition-colors">{t.tracking_number || t.id.substring(0, 6).toUpperCase()}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sColors[t.status] || "bg-slate-100"}`}>{(t.status || "pendiente").replace(/_/g, " ")}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${pColors[t.priority] || pColors.normal}`}>{t.priority}</span>
                                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-4">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</h3>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0"><MapPin className="w-4 h-4 text-teal-600" /></div>
                                            <div className="truncate"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Origen</p><p className="text-sm font-bold text-slate-700">{t.origin}</p></div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><ArrowRight className="w-4 h-4 text-blue-600" /></div>
                                            <div className="truncate"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Destino</p><p className="text-sm font-bold text-slate-700">{t.destination}</p></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 w-full md:w-48" onClick={e => e.stopPropagation()}>
                                    <Button onClick={() => setAssignDialog(t)} className="h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md rounded-xl w-full">{t.driver_id ? "Reasignar" : "Asignar Conductor"}</Button>
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

            <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={() => setDetailTrip(null)} onRefresh={fetchAll} />


            <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{assignDialog?.driver_id ? "Reasignar Traslado" : "Asignar Traslado"}</DialogTitle></DialogHeader>
                    {assignDialog && (
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Destino</p>
                                <p className="font-bold text-slate-800">{assignDialog.destination}</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Seleccione Conductor Disponible</Label>
                                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                                    {drivers.map(d => (
                                        <button key={d.id} onClick={() => handleAssign(assignDialog.id, d.id)} className="w-full p-3 text-left bg-white border border-slate-200 rounded-xl hover:border-teal-400 hover:bg-teal-50 transition-all group">
                                            <p className="font-bold text-slate-900 group-hover:text-teal-700">{d.name}</p>
                                            <p className="text-xs text-slate-500">Vehículo: {d.vehicle_plate || "Sin asignar"}</p>
                                        </button>
                                    ))}
                                    {drivers.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No hay conductores disponibles actualmente.</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CalendarSection() {
    const [viewMode, setViewMode] = useState("daily");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detailTrip, setDetailTrip] = useState(null);

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

    const TripCardInternal = ({ t }) => (
        <div className={`p-2 rounded-lg border-l-2 mb-1 text-[10px] ${t.trip_type === "clinico" ? "border-l-teal-500 bg-teal-50/50" : "border-l-slate-400 bg-slate-50"}`}>
            <p className="font-bold text-slate-800 truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
            <p className="text-[9px] text-slate-500 font-mono">{t.appointment_time || "--:--"}</p>
        </div>
    );

    return (
        <div className="animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Calendario Global</h1>
                    <p className="text-slate-500 font-medium mt-1 capitalize">{getTitle()}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1 shadow-sm font-bold">
                        {[{ k: "daily", l: "Día" }, { k: "weekly", l: "Semana" }, { k: "monthly", l: "Mes" }].map(v => (
                            <button key={v.k} onClick={() => setViewMode(v.k)} className={`px-4 py-2 rounded-lg text-xs transition-all ${viewMode === v.k ? "bg-teal-600 text-white shadow-md font-bold" : "text-slate-500 hover:bg-slate-100"}`}>{v.l}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-50 rounded-lg">Hoy</button>
                        <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-teal-600" /></div> : (
                <>
                    {viewMode === "daily" && (
                        <div className="space-y-4">
                            {trips.length === 0 ? (
                                <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
                                    <CalendarDays className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                    <p className="text-xl font-bold text-slate-400">No hay traslados programados</p>
                                </div>
                            ) : trips.map(t => (
                                <Card key={t.id} onClick={() => setDetailTrip(t)} className="card-hover border-l-4 border-l-teal-500 shadow-sm cursor-pointer group">
                                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div className="flex items-center gap-5">
                                            <div className="bg-teal-50 border border-teal-100 px-4 py-2 rounded-2xl text-center min-w-[100px] shadow-inner group-hover:bg-teal-600 transition-colors">
                                                <p className="text-[10px] font-black text-teal-600 uppercase tracking-tighter group-hover:text-teal-100">Hora Cita</p>
                                                <p className="text-xl font-black text-slate-800 group-hover:text-white">{t.appointment_time || "--:--"}</p>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge className="bg-slate-800 font-mono text-[10px]">{t.tracking_number}</Badge>
                                                    <Badge className={`${sColors[t.status] || "bg-slate-100"} border-none text-[9px] uppercase font-black`}>{t.status.replace(/_/g, " ")}</Badge>
                                                </div>
                                                <h3 className="font-black text-slate-900 text-lg group-hover:text-teal-700 transition-colors">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</h3>
                                                <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-500" /> {t.origin} <ArrowRight className="w-3.5 h-3.5 text-slate-300" /> {t.destination}</p>
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable</p>
                                            <p className="text-sm font-black text-teal-800">{t.clinical_team || "Equipo no asignado"}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {viewMode === "weekly" && (
                        <div className="grid grid-cols-7 gap-3">
                            {getWeekDates().map((dateStr, i) => {
                                const dayTrips = tripsByDate(dateStr);
                                const isToday = dateStr === new Date().toISOString().split("T")[0];
                                return (
                                    <div key={dateStr} className={`bg-white rounded-2xl border-2 p-3 min-h-[350px] transition-all flex flex-col ${isToday ? "border-teal-400 shadow-lg shadow-teal-900/5 bg-teal-50/10" : "border-slate-100 shadow-sm"}`}>
                                        <div className={`text-center mb-4 pb-2 border-b-2 ${isToday ? "border-teal-200" : "border-slate-50"}`}>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dayNames[i]}</p>
                                            <p className={`text-xl font-black ${isToday ? "text-teal-700" : "text-slate-800"}`}>{dateStr.split("-")[2]}</p>
                                        </div>
                                        <div className="space-y-2 flex-1 overflow-y-auto custom-scrollbar">
                                            {dayTrips.map(t => (
                                                <div key={t.id} onClick={() => setDetailTrip(t)} className={`p-2 rounded-lg border-l-2 mb-1 text-[10px] cursor-pointer hover:bg-teal-50 transition-all ${t.trip_type === "clinico" ? "border-l-teal-500 bg-teal-50/50" : "border-l-slate-400 bg-slate-50"}`}>
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
                                        <div key={dateStr} onClick={() => { setCurrentDate(new Date(dateStr + "T12:00:00")); setViewMode("daily"); }} className={`min-h-[120px] p-3 cursor-pointer hover:bg-teal-50/30 transition-all border-r border-b border-slate-100 relative group ${isToday ? "bg-teal-50/20" : ""}`}>
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
                </>
            )}
            <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={() => setDetailTrip(null)} onRefresh={fetchCalendar} />
        </div>
    );
}

function VehiclesSection() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchVehicles = useCallback(async () => { try { const r = await api.get("/vehicles"); setVehicles(r.data || []); } catch { } finally { setLoading(false); } }, []);
    useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

    const handleStatusChange = async (vehicleId, status) => {
        try { await api.put(`/vehicles/${vehicleId}/status`, { status }); toast.success("Estado actualizado"); fetchVehicles(); }
        catch (e) { toast.error("Error al cambiar estado"); }
    };

    const statusColorsItems = { disponible: "bg-green-100 text-green-800 border-green-200", en_servicio: "bg-blue-100 text-blue-800 border-blue-200", en_limpieza: "bg-violet-100 text-violet-800 border-violet-200", en_taller: "bg-orange-100 text-orange-800 border-orange-200", fuera_de_servicio: "bg-red-100 text-red-800 border-red-200" };
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
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColorsItems[v.status] || "bg-slate-100"}`}>{v.status.replace(/_/g, " ")}</span>
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
    const fetchDrivers = useCallback(async () => { try { const r = await api.get("/drivers"); setDrivers(r.data || []); } catch { } finally { setLoading(false); } }, []);
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

function NewTripSection({ onNavigate }) {
    const [destinations, setDestinations] = useState([]);
    const [originServices, setOriginServices] = useState([]);
    const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
    const [tripType, setTripType] = useState("clinico");

    const [form, setForm] = useState({
        origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
        scheduled_date: new Date().toISOString().split("T")[0],
        rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
        attending_physician: "", appointment_time: "", departure_time: "",
        patient_requirements: [], accompaniment: "",
        task_details: "", staff_count: ""
    });

    const [staffRows, setStaffRows] = useState([]);
    const [rutStatus, setRutStatus] = useState(null);

    const [useCustomOrigin, setUseCustomOrigin] = useState(false);
    const [useCustomDest, setUseCustomDest] = useState(false);
    const [useCustomService, setUseCustomService] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        api.get("/destinations").then(r => setDestinations(r.data)).catch(() => { });
        api.get("/clinical-staff").then(r => setClinicalStaffOptions(r.data.filter(s => s.is_active))).catch(() => { });
        api.get("/origin-services").then(r => setOriginServices(r.data.filter(s => s.is_active !== false))).catch(() => { });
    }, []);

    const personnelTypes = ["TENS", "Matrón(a)", "Enfermero(a)", "Kinesiólogo(a)", "Fonoaudiólogo(a)", "Médico", "Terapeuta Ocupacional"];
    const requirementOptions = ["Camilla", "Incubadora", "Silla de rueda", "Oxigeno", "Monitor", "Aislamiento Aéreo", "Aislamiento Contacto", "Aislamiento Protector", "Dependiente severo"];
    const reasonOptions = ["Examen", "Hospitalización", "Dialisis", "Rescate", "Alta", "Procedimiento"];
    const accompanimentOptions = ["Materno", "Tutor", "Otro"];

    const handleCheckbox = (field, val) => {
        setForm(prev => {
            const arr = prev[field];
            if (arr.includes(val)) return { ...prev, [field]: arr.filter(i => i !== val) };
            return { ...prev, [field]: [...arr, val] };
        });
    };

    const handleRutChange = (value) => {
        setForm({ ...form, rut: value });
        if (value.trim().length >= 2) {
            const result = validateRut(value);
            setRutStatus(result);
        } else {
            setRutStatus(null);
        }
    };

    const addStaffRow = () => {
        setStaffRows([...staffRows, { type: "", staff_id: "", staff_name: "" }]);
    };
    const removeStaffRow = (index) => {
        setStaffRows(staffRows.filter((_, i) => i !== index));
    };
    const updateStaffRow = (index, field, value) => {
        setStaffRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            if (field === "type") {
                updated[index].staff_id = "";
                updated[index].staff_name = "";
            }
            if (field === "staff_id" && value) {
                const staff = clinicalStaffOptions.find(s => s.id === value);
                if (staff) updated[index].staff_name = staff.name;
            }
            return updated;
        });
    };

    const getStaffByType = (type) => {
        if (!type) return [];
        return clinicalStaffOptions.filter(s => s.role.toLowerCase() === type.toLowerCase());
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalOrigin = useCustomOrigin ? form.origin : form.origin;
        const finalDest = useCustomDest ? form.destination : form.destination;

        let newErrors = {};

        if (tripType === "clinico") {
            if (!form.patient_name) newErrors.patient_name = true;
            if (!form.patient_unit) newErrors.patient_unit = true;
            if (!form.transfer_reason) newErrors.transfer_reason = true;
            if (!form.appointment_time) newErrors.appointment_time = true;
            if (!finalOrigin) newErrors.origin = true;
            if (!finalDest) newErrors.destination = true;
            
            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                toast.error("Complete todos los campos obligatorios del traslado clínico"); return;
            }
            if (staffRows.length === 0) { 
                setErrors(prev => ({ ...prev, staff: true }));
                toast.error("Debe añadir al menos un personal clínico para traslados clínicos"); return; 
            }
            if (staffRows.some(r => !r.type || !r.staff_id)) { 
                toast.error("Complete tipo y nombre de todo el personal clínico añadido"); return; 
            }
            if (form.patient_requirements.length === 0) { toast.error("Seleccione requerimientos del paciente"); return; }
        } else {
            if (!finalOrigin) newErrors.origin = true;
            if (!finalDest) newErrors.destination = true;
            if (!form.task_details) newErrors.task_details = true;
            
            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                toast.error("Complete Origen, Destino y Cometido"); return;
            }
        }

        setLoading(true);
        setErrors({});
        try {
            const submitData = {
                ...form,
                origin: finalOrigin,
                destination: finalDest,
                trip_type: tripType,
                required_personnel: staffRows.map(r => `${r.type}: ${r.staff_name}`),
                assigned_clinical_staff: staffRows,
            };

            await api.post("/trips", submitData);
            toast.success("Solicitud creada exitosamente");
            setForm({
                origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
                scheduled_date: new Date().toISOString().split("T")[0], rut: "", age: "", diagnosis: "", weight: "", bed: "",
                transfer_reason: "", attending_physician: "", appointment_time: "", departure_time: "",
                patient_requirements: [], accompaniment: "", task_details: "", staff_count: ""
            });
            setStaffRows([]);
            setRutStatus(null);
            if (onNavigate) onNavigate("dispatch");
        } catch (e) { toast.error("Error al crear solicitud"); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-4xl mx-auto animate-slide-up">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">Nueva Solicitud de Traslado</h1>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <button type="button" onClick={() => setTripType("clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${tripType === "clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white text-slate-500 hover:border-teal-200"}`}>
                    <Stethoscope className="w-8 h-8" /><span className="font-bold">Traslado Clínico</span>
                </button>
                <button type="button" onClick={() => setTripType("no_clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${tripType === "no_clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white text-slate-500 hover:border-teal-200"}`}>
                    <Truck className="w-8 h-8" /><span className="font-bold">Traslado No Clínico</span>
                </button>
            </div>

            <Card className="shadow-lg border-t-4 border-t-teal-500">
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
                        {tripType === "clinico" && (
                            <>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><User className="w-5 h-5" /> Datos del Paciente</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1"><Label className={errors.patient_name ? "text-red-500" : ""}>Nombre Paciente *</Label><Input className={errors.patient_name ? "border-red-500 bg-red-50 shadow-inner" : ""} value={form.patient_name} onChange={e => { setForm({ ...form, patient_name: e.target.value }); if (errors.patient_name) setErrors(p => ({ ...p, patient_name: false })); }} /></div>
                                        <div className="space-y-1">
                                            <Label>RUT</Label>
                                            <div className="relative">
                                                <Input
                                                    value={form.rut}
                                                    onChange={e => handleRutChange(e.target.value)}
                                                    placeholder="Ej: 12345678-9"
                                                    className={rutStatus ? (rutStatus.valid ? "border-emerald-500 pr-10" : "border-red-500 pr-10") : "pr-10"}
                                                />
                                                {rutStatus && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                        {rutStatus.valid
                                                            ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                                                            : <XCircle className="w-5 h-5 text-red-500" />}
                                                    </div>
                                                )}
                                            </div>
                                            {rutStatus && !rutStatus.valid && <p className="text-xs text-red-500 font-medium mt-0.5">RUT inválido. Formato correcto: {rutStatus.formatted}</p>}
                                            {rutStatus && rutStatus.valid && <p className="text-xs text-emerald-600 font-medium mt-0.5">✓ RUT válido: {rutStatus.formatted}</p>}
                                        </div>
                                        <div className="space-y-1"><Label>Edad</Label><Input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                                        <div className="space-y-1"><Label>Peso</Label><Input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
                                        <div className="space-y-1 md:col-span-2"><Label>Diagnóstico</Label><Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Activity className="w-5 h-5" /> Detalles Médicos</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1"><Label>Médico Tratante</Label><Input value={form.attending_physician} onChange={e => setForm({ ...form, attending_physician: e.target.value })} /></div>
                                        <div className="space-y-1"><Label className={errors.transfer_reason ? "text-red-500" : ""}>Motivo Traslado *</Label>
                                            <Select value={form.transfer_reason} onValueChange={v => { setForm({ ...form, transfer_reason: v }); if (errors.transfer_reason) setErrors(p => ({ ...p, transfer_reason: false })); }}>
                                                <SelectTrigger className={errors.transfer_reason ? "border-red-500 bg-red-50" : ""}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                                <SelectContent>{reasonOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {tripType === "no_clinico" && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Detalle del Cometido</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1 md:col-span-2"><Label className={errors.task_details ? "text-red-500" : ""}>Cometido (Motivo) *</Label><Input className={errors.task_details ? "border-red-500 bg-red-50 shadow-inner" : ""} value={form.task_details} onChange={e => { setForm({ ...form, task_details: e.target.value }); if (errors.task_details) setErrors(p => ({ ...p, task_details: false })); }} placeholder="Ej: Búsqueda de insumos" /></div>
                                    <div className="space-y-1"><Label>Cantidad de Funcionarios</Label><Input type="number" min="0" value={form.staff_count} onChange={e => setForm({ ...form, staff_count: e.target.value })} /></div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><MapPin className="w-5 h-5" /> Ubicación y Tiempos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label className={errors.origin ? "text-red-500" : ""}>Origen *</Label>
                                    {!useCustomOrigin ? (
                                        <Select onValueChange={v => { 
                                            if (v === "otro") { setUseCustomOrigin(true); } 
                                            else { setForm({ ...form, origin: v }); if (errors.origin) setErrors(p => ({ ...p, origin: false })); }
                                        }}>
                                            <SelectTrigger className={errors.origin ? "border-red-500 bg-red-50" : ""}><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                            <SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent>
                                        </Select>
                                    ) : <Input className={errors.origin ? "border-red-500 bg-red-50" : ""} placeholder="Escriba origen" value={form.origin} onChange={e => { setForm({ ...form, origin: e.target.value }); if (errors.origin) setErrors(p => ({ ...p, origin: false })); }} onDoubleClick={() => setUseCustomOrigin(false)} />}
                                </div>
                                <div className="space-y-1"><Label className={errors.destination ? "text-red-500" : ""}>Destino *</Label>
                                    {!useCustomDest ? (
                                        <Select onValueChange={v => {
                                            if (v === "otro") { setUseCustomDest(true); } 
                                            else { setForm({ ...form, destination: v }); if (errors.destination) setErrors(p => ({ ...p, destination: false })); }
                                        }}>
                                            <SelectTrigger className={errors.destination ? "border-red-500 bg-red-50" : ""}><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                            <SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent>
                                        </Select>
                                    ) : <Input className={errors.destination ? "border-red-500 bg-red-50" : ""} placeholder="Escriba destino" value={form.destination} onChange={e => { setForm({ ...form, destination: e.target.value }); if (errors.destination) setErrors(p => ({ ...p, destination: false })); }} onDoubleClick={() => setUseCustomDest(false)} />}
                                </div>
                                {tripType === "clinico" && (
                                    <>
                                        <div className="space-y-1"><Label className={errors.patient_unit ? "text-red-500" : ""}>Servicio de Origen *</Label>
                                            {!useCustomService ? (
                                                <Select onValueChange={v => {
                                                    if (v === "otro") { setUseCustomService(true); }
                                                    else { setForm({ ...form, patient_unit: v }); if (errors.patient_unit) setErrors(p => ({ ...p, patient_unit: false })); }
                                                }}>
                                                    <SelectTrigger className={errors.patient_unit ? "border-red-500 bg-red-50" : ""}><SelectValue placeholder="Seleccione servicio" /></SelectTrigger>
                                                    <SelectContent>
                                                        {originServices.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                                        <SelectItem value="otro">Otro (escribir)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input className={errors.patient_unit ? "border-red-500 bg-red-50 shadow-inner" : ""} placeholder="Escriba servicio" value={form.patient_unit} onChange={e => { setForm({ ...form, patient_unit: e.target.value }); if (errors.patient_unit) setErrors(p => ({ ...p, patient_unit: false })); }} onDoubleClick={() => setUseCustomService(false)} />
                                            )}
                                        </div>
                                        <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })} /></div>
                                        <div className="space-y-1"><Label className={errors.appointment_time ? "text-red-500" : ""}>Hora de Citación *</Label><Input className={errors.appointment_time ? "border-red-500 bg-red-50 shadow-inner" : ""} type="time" value={form.appointment_time} onChange={e => { setForm({ ...form, appointment_time: e.target.value }); if (errors.appointment_time) setErrors(p => ({ ...p, appointment_time: false })); }} /></div>
                                    </>
                                )}
                                <div className="space-y-1"><Label>Fecha del Traslado</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Hora de Salida</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} /></div>
                            </div>
                        </div>

                        {tripType === "clinico" && (
                            <div className="space-y-4">
                                <h3 className={`font-bold border-b pb-2 flex items-center gap-2 ${errors.staff ? "text-red-600 border-red-200" : "text-teal-800 border-teal-100"}`}><Plus className="w-5 h-5" /> Personal Clínico Requerido *</h3>
                                
                                <Button type="button" variant="outline" onClick={() => { addStaffRow(); if (errors.staff) setErrors(p => ({ ...p, staff: false })); }} className={`font-bold h-10 flex items-center gap-2 ${errors.staff ? "border-red-500 text-red-700 bg-red-50" : "border-teal-200 text-teal-700 hover:bg-teal-50"}`}>
                                    <Plus className="w-4 h-4" /> Añadir Personal Clínico
                                </Button>

                                {staffRows.map((row, i) => (
                                    <div key={i} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-2">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Tipo de Personal</Label>
                                            <Select value={row.type} onValueChange={v => updateStaffRow(i, "type", v)}>
                                                <SelectTrigger className="h-10"><SelectValue placeholder="Seleccione tipo" /></SelectTrigger>
                                                <SelectContent>{personnelTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Nombre Funcionario</Label>
                                            <Select value={row.staff_id} onValueChange={v => updateStaffRow(i, "staff_id", v)} disabled={!row.type}>
                                                <SelectTrigger className="h-10"><SelectValue placeholder={row.type ? "Seleccione funcionario" : "Primero seleccione tipo"} /></SelectTrigger>
                                                <SelectContent>
                                                    {getStaffByType(row.type).length > 0
                                                        ? getStaffByType(row.type).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                                                        : <SelectItem value="__none" disabled>No hay personal de este tipo</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-end">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeStaffRow(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5">
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {staffRows.length === 0 && <p className="text-xs text-amber-600 font-medium italic">⚠ Se requiere al menos un personal clínico asignado</p>}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Notas Adicionales</Label>
                            <textarea className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm bg-slate-50/50" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Información extra relevante..." />
                        </div>

                        <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg font-black shadow-lg rounded-2xl transition-all active:scale-[0.98]" disabled={loading}>
                            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : "Enviar Solicitud de Traslado"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

function HistorySection() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchHistory = useCallback(async () => {
        try {
            const res = await api.get("/trips/history");
            setTrips(res.data || []);
        } catch (e) { toast.error("Error al cargar historial"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    if (loading) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    const sColorsLocal = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800", revision_gestor: "bg-purple-100 text-purple-800" };

    return (
        <div className="animate-slide-up">
            <h1 className="text-2xl font-bold text-slate-900 mb-6 font-black tracking-tight">Historial de Traslados</h1>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden shadow-teal-900/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Folio</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Paciente / Motivo</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Origen / Destino</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Conductor / Móvil</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Estado</th>
                                <th className="p-4 text-xs font-black text-slate-500 uppercase tracking-widest">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {trips.map(t => (
                                <tr key={t.id} className="hover:bg-teal-50/30 transition-colors">
                                    <td className="p-4 font-mono text-xs font-bold text-slate-500">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{t.tracking_number}</span>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-bold text-slate-900 text-sm leading-tight">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-tighter">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</p>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-teal-500" /> {t.origin}</p>
                                            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase ml-4 text-[9px] text-slate-400 tracking-tighter"><ArrowRight className="w-3 h-3 text-slate-300" /> {t.destination}</p>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {t.driver_name ? (
                                            <>
                                                <p className="text-xs font-black text-slate-800">{t.driver_name}</p>
                                                <p className="text-[10px] text-teal-600 font-bold font-mono">{t.vehicle_plate || ""}</p>
                                            </>
                                        ) : (
                                            <span className="text-xs text-slate-300 italic">No asignado</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <Badge className={`text-[9px] font-black uppercase tracking-widest border-none px-2 py-0.5 rounded-full ${sColorsLocal[t.status] || "bg-slate-100 text-slate-600 font-bold"}`}>{t.status.replace(/_/g, " ")}</Badge>
                                    </td>
                                    <td className="p-4">
                                        <p className="text-xs font-bold text-slate-600 whitespace-nowrap">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {trips.length === 0 && (
                    <div className="text-center py-20">
                        <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 font-medium">No hay registros históricos disponibles</p>
                    </div>
                )}
            </div>
        </div>
    );
}

