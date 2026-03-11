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
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity, CalendarDays, Truck, User, AlertTriangle, RefreshCw, ClipboardList, Stethoscope, Plus, Trash2, XCircle } from "lucide-react";
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
const sColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

export default function ShiftManagerDashboard_UTF8() {
    const [section, setSection] = useState("dispatch");
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, completed: 0 });

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get("/trips/stats");
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
            const res = await api.get("/trips/all_active");
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
    const [filter, setFilter] = useState("all");

    const fetchAll = useCallback(async () => {
        try {
            const [tRes, dRes] = await Promise.all([api.get("/trips/pool"), api.get("/drivers/available")]);
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
                    <Card key={t.id} className="card-hover border-l-4 border-l-teal-500 shadow-sm overflow-hidden">
                        <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="bg-slate-200 text-slate-800 font-mono px-2 py-0.5 rounded-md text-[10px] font-bold">{t.tracking_number || t.id.substring(0, 6).toUpperCase()}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[t.status] || "bg-slate-100"}`}>{(t.status || "pendiente").replace(/_/g, " ")}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
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

                                <div className="flex flex-col gap-2 w-full md:w-48">
                                    <Button onClick={() => setAssignDialog(t)} className="h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md rounded-xl w-full">{t.driver_id ? "Reasignar Conductor" : "Asignar Conductor"}</Button>
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
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);

    const fetchBoard = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/trips/all_active");
            setTrips(res.data || []);
        } catch (e) { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchBoard(); }, [fetchBoard]);

    if (loading) return <div className="flex justify-center py-20 text-teal-600"><Activity className="w-10 h-10 animate-spin" /></div>;

    return (
        <div className="animate-slide-up">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Pizarra de Control</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.map(t => (
                    <Card key={t.id} className="cursor-pointer hover:shadow-md transition-all shadow-sm border-slate-200" onClick={() => setSelectedTrip(t)}>
                        <CardContent className="p-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.tracking_number}</span>
                                <Badge className={`${sColors[t.status] || "bg-slate-100"} border-none text-[9px] uppercase font-black tracking-widest`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                            </div>
                            <p className="font-black text-slate-900 mb-2 truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <Clock className="w-3 h-3 text-teal-600" /> <span className="font-bold">{t.appointment_time || "--:--"}</span>
                                <MapPin className="w-3 h-3 text-blue-600 ml-2" /> <span className="font-medium truncate">{t.destination}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle className="text-2xl font-black">{selectedTrip?.trip_type === "clinico" ? "Detalle Traslado Clínico" : "Detalle de Cometido"}</DialogTitle></DialogHeader>
                    {selectedTrip && (
                        <div className="space-y-6 pt-3">
                            <div className="flex items-center justify-between bg-slate-800 text-white p-4 rounded-xl shadow-lg">
                                <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Folio de Seguimiento</p><p className="text-xl font-mono font-black">{selectedTrip.tracking_number}</p></div>
                                <div className="text-right"><p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Estado Actual</p><p className="font-black text-teal-400 uppercase tracking-wider">{selectedTrip.status.replace(/_/g, " ")}</p></div>
                            </div>
                            
                            {selectedTrip.trip_type === "clinico" ? (
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2"><User className="w-4 h-4" /> Datos del Paciente</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <div className="col-span-2"><p className="text-xs text-slate-500 font-bold">Nombre Completo</p><p className="font-black text-lg text-slate-900">{selectedTrip.patient_name}</p></div>
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

        if (tripType === "clinico") {
            if (!form.patient_name || !form.patient_unit || !form.transfer_reason || !form.appointment_time || !finalOrigin || !finalDest) {
                toast.error("Complete todos los campos obligatorios del traslado clínico"); return;
            }
            if (staffRows.length === 0) { toast.error("Debe añadir al menos un personal clínico para traslados clínicos"); return; }
            if (staffRows.some(r => !r.type || !r.staff_id)) { toast.error("Complete tipo y nombre de todo el personal clínico añadido"); return; }
            if (form.patient_requirements.length === 0) { toast.error("Seleccione requerimientos del paciente"); return; }
        } else {
            if (!finalOrigin || !finalDest || !form.task_details) {
                toast.error("Complete Origen, Destino y Cometido"); return;
            }
        }

        setLoading(true);
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
                                        <div className="space-y-1"><Label>Nombre Paciente *</Label><Input value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} /></div>
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
                                        <div className="space-y-1"><Label>Motivo Traslado *</Label>
                                            <Select value={form.transfer_reason} onValueChange={v => setForm({ ...form, transfer_reason: v })}>
                                                <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
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
                                    <div className="space-y-1 md:col-span-2"><Label>Cometido (Motivo) *</Label><Input value={form.task_details} onChange={e => setForm({ ...form, task_details: e.target.value })} placeholder="Ej: Búsqueda de insumos" /></div>
                                    <div className="space-y-1"><Label>Cantidad de Funcionarios</Label><Input type="number" min="0" value={form.staff_count} onChange={e => setForm({ ...form, staff_count: e.target.value })} /></div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><MapPin className="w-5 h-5" /> Ubicación y Tiempos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1"><Label>Origen *</Label>
                                    {!useCustomOrigin ? (
                                        <Select onValueChange={v => v === "otro" ? setUseCustomOrigin(true) : setForm({ ...form, origin: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select>
                                    ) : <Input placeholder="Escriba origen" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} onDoubleClick={() => setUseCustomOrigin(false)} />}
                                </div>
                                <div className="space-y-1"><Label>Destino *</Label>
                                    {!useCustomDest ? (
                                        <Select onValueChange={v => v === "otro" ? setUseCustomDest(true) : setForm({ ...form, destination: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select>
                                    ) : <Input placeholder="Escriba destino" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} onDoubleClick={() => setUseCustomDest(false)} />}
                                </div>
                                {tripType === "clinico" && (
                                    <>
                                        <div className="space-y-1"><Label>Servicio de Origen *</Label>
                                            {!useCustomService ? (
                                                <Select onValueChange={v => {
                                                    if (v === "otro") { setUseCustomService(true); }
                                                    else { setForm({ ...form, patient_unit: v }); }
                                                }}>
                                                    <SelectTrigger><SelectValue placeholder="Seleccione servicio" /></SelectTrigger>
                                                    <SelectContent>
                                                        {originServices.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                                        <SelectItem value="otro">Otro (escribir)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input placeholder="Escriba servicio" value={form.patient_unit} onChange={e => setForm({ ...form, patient_unit: e.target.value })} onDoubleClick={() => setUseCustomService(false)} />
                                            )}
                                        </div>
                                        <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })} /></div>
                                        <div className="space-y-1"><Label>Hora de Citación *</Label><Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} /></div>
                                    </>
                                )}
                                <div className="space-y-1"><Label>Fecha del Traslado</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Hora de Salida</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} /></div>
                            </div>
                        </div>

                        {tripType === "clinico" && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Plus className="w-5 h-5" /> Personal Clínico Requerido *</h3>
                                
                                <Button type="button" variant="outline" onClick={addStaffRow} className="border-teal-200 text-teal-700 hover:bg-teal-50 font-bold h-10 flex items-center gap-2">
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
