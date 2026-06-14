import { useState, useEffect, useCallback, useMemo } from "react";
import * as XLSX from "xlsx";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapPin, ArrowRight, ShieldAlert, BadgeAlert, Droplets, CheckCircle, Activity, CalendarDays, Truck, User, Users, AlertTriangle, RefreshCw, ClipboardList, Stethoscope, Plus, Trash2, XCircle, ChevronLeft, ChevronRight, Clock, RotateCcw, Edit, Search, Car, Bus, Siren, FileDown, Eye, History, Filter, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import ByDriverSection from "./ByDriverSection";
import LogbookReport from "@/components/LogbookReport";

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
  return { valid, formatted: `${formatted}-${dv}` };
}

const formatScheduledDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const cleanDateStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = cleanDateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const year = date.getFullYear();
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      return `${day} ${months[date.getMonth()]} ${year}`;
    }
  } catch (e) {}
  return dateStr;
};

const COLORS = { pendiente: '#f59e0b', asignado: '#0d9488', en_curso: '#3b82f6', completado: '#10b981', cancelado: '#ef4444', revision_gestor: '#8b5cf6' };
const pColors = { urgente: "bg-red-500 text-white font-bold", alta: "bg-orange-500 text-white font-bold", normal: "bg-slate-100 text-slate-700 font-bold border border-slate-200" };
const sColors = { pendiente: "bg-amber-100 text-amber-800 border border-amber-200", asignado: "bg-teal-100 text-teal-800 border border-teal-200", en_curso: "bg-blue-100 text-blue-800 border border-blue-200", completado: "bg-emerald-100 text-emerald-800 border border-emerald-200", cancelado: "bg-red-100 text-red-800 border border-red-200", revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200" };

const VEHICLE_ICONS = {
    Ambulancia: <Siren className="w-6 h-6 text-red-600 drop-shadow-sm" />,
    camion: <Truck className="w-6 h-6 text-blue-600 drop-shadow-sm" />,
    "Auto/SUV": <Car className="w-6 h-6 text-purple-600 drop-shadow-sm" />,
    Camioneta: (
      <svg className="w-6 h-6 text-emerald-600 drop-shadow-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 13h4l1-3h4l1 3h10v4H2z" />
        <path d="M12 13v4" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
    Van: <Bus className="w-6 h-6 text-indigo-600 drop-shadow-sm" />
};

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
            <DialogContent className="max-w-4xl bg-slate-50 rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
                {/* Cabecera Estilizada */}
                <div className="bg-slate-900 p-8 pb-10 relative">
                    <div className="absolute top-6 right-6">
                        <Badge className={`${trip.status === 'completado' ? 'bg-emerald-500' : 'bg-teal-500'} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                            {(trip.status || "").replace(/_/g, " ")}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                            {trip.trip_type === "clinico" ? <Activity className="w-8 h-8 text-teal-400" /> : <Truck className="w-8 h-8 text-blue-400" />}
                        </div>
                        <div>
                            <p className="text-teal-400 text-[10px] uppercase tracking-[0.2em] font-black mb-1">
                                Folio #{trip.tracking_number || trip.id.substring(0, 8).toUpperCase()}
                            </p>
                            <h2 className="text-3xl font-black text-white leading-tight uppercase tracking-tight">
                                {trip.trip_type === "clinico" ? "Traslado Clínico" : "Cometido General"}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Contenido Principal */}
                <div className="p-8 -mt-6 bg-slate-50 rounded-t-[2rem] relative space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Columna Izquierda */}
                        <div className="space-y-6">
                            {/* Información General */}
                            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                                <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] flex items-center gap-2 border-b border-slate-100 pb-3">
                                    <User className="w-4 h-4 text-teal-600" /> Información General
                                </h3>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Paciente / Tarea</p>
                                    <p className="text-sm font-black text-slate-900">{trip.patient_name || trip.task_details || "-"}</p>
                                </div>
                                {trip.trip_type === "clinico" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">RUT</p>
                                            <p className="text-sm font-bold text-slate-800">{trip.rut || "-"}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cama/Unidad</p>
                                            <p className="text-sm font-bold text-slate-800">{trip.bed || "-"} ({trip.patient_unit || "-"})</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Motivo / Diagnóstico</p>
                                    <p className="text-sm font-bold text-slate-800">{trip.diagnosis || trip.transfer_reason || "-"}</p>
                                </div>
                                {trip.notes && (
                                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100/50 mt-2">
                                        <p className="text-[10px] uppercase font-black text-amber-600 tracking-wider mb-1">Notas Adicionales</p>
                                        <p className="text-xs font-bold text-amber-900 leading-relaxed">{trip.notes}</p>
                                    </div>
                                )}
                            </div>

                            {/* Ruta y Tiempos */}
                            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                                <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] flex items-center gap-2 border-b border-slate-100 pb-3">
                                    <MapPin className="w-4 h-4 text-teal-600" /> Ruta y Tiempos
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Origen</p>
                                        <p className="text-sm font-black text-slate-900">{trip.origin}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Destino</p>
                                        <p className="text-sm font-black text-slate-900">{trip.destination}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fecha Prog.</p>
                                        <p className="text-sm font-bold text-slate-800">{formatScheduledDate(trip.scheduled_date) || "Hoy"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Citación</p>
                                        <p className="text-sm font-black text-teal-600">{trip.appointment_time || "--:--"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha */}
                        <div className="space-y-6">
                            {/* Asignación Operativa */}
                            <div className="bg-white p-6 rounded-[1.5rem] border border-slate-200/60 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                                <h3 className="text-[10px] uppercase font-black text-slate-400 tracking-[0.15em] flex items-center gap-2 border-b border-slate-100 pb-3">
                                    <Truck className="w-4 h-4 text-teal-600" /> Asignación Operativa
                                </h3>
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <p className="text-[10px] uppercase font-black text-slate-500 tracking-wider mb-3">Conductor y Móvil</p>
                                    {trip.driver_name ? (
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-teal-700 border border-slate-200 shadow-sm">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-sm">{trip.driver_name}</p>
                                                    <Badge className="bg-teal-50 text-teal-800 border border-teal-200/50 font-mono text-[10px] shadow-sm mt-0.5">{trip.vehicle_plate || "Sin patente"}</Badge>
                                                </div>
                                            </div>
                                            {trip.driver_id && trip.status === "asignado" && (
                                                <Button onClick={handleUnassign} variant="destructive" size="sm" className="h-8 px-4 text-xs font-bold shadow-md rounded-xl">
                                                    Desasignar
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs font-semibold text-slate-400 italic">No se ha asignado conductor</p>
                                    )}
                                </div>

                                {trip.trip_type === "clinico" && (
                                    <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100/50">
                                        <p className="text-[10px] uppercase font-black text-teal-700 tracking-wider mb-3">Equipo Clínico</p>
                                        {trip.assigned_clinical_staff && trip.assigned_clinical_staff.length > 0 ? (
                                            <div className="space-y-2">
                                                {trip.assigned_clinical_staff.map((s, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-xs">
                                                        <span className="text-teal-600/80 font-bold uppercase tracking-wide text-[10px]">{s.type}</span>
                                                        <span className="font-black text-teal-900">{s.staff_name || "PDTE."}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs font-bold text-teal-900">
                                                {trip.required_personnel?.join(", ") || trip.clinical_team || "No especificado"}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {trip.patient_requirements && trip.patient_requirements.length > 0 && (
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 mt-4">Requerimientos</p>
                                        <div className="flex flex-wrap gap-2">
                                            {trip.patient_requirements.map((req, i) => (
                                                <span key={i} className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase border border-slate-200">
                                                    {req}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <TripEvolutionLog tripId={trip.id} />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200/60 mt-6">
                        <Button onClick={() => onOpenChange(false)} className="bg-slate-900 text-white rounded-2xl px-10 h-12 text-xs font-black uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all">Cerrar</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function ShiftManagerDashboard_UTF8() {
    const [section, setSection] = useState(() => {
        return localStorage.getItem("movilizacion.coordinador.section") || "dispatch";
    });

    useEffect(() => {
        localStorage.setItem("movilizacion.coordinador.section", section);
    }, [section]);
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
                    {section === "new" && <NewTripSection onNavigate={setSection} />}
                    {section === "assign" && <AssignSection />}
                    {section === "calendar" && <CalendarSection />}
                    {section === "by_driver" && <ByDriverSection />}
                    {section === "vehicles" && <VehiclesSection />}
                    {section === "drivers" && <DriversSection />}
                    {section === "logbook_monitor" && <LogbookMonitorSection />}
                    {section === "history" && <HistorySection />}
                    {section === "reports" && <LogbookReport />}
                </div>
            </main>
        </div>
    );
}

function DispatchSection() {
    const { user } = useAuth();
    const [trips, setTrips] = useState([]);

    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("pendiente");
    const [stats, setStats] = useState({ pendiente: 0, asignado: 0, en_curso: 0, completado: 0 });
    const [drivers, setDrivers] = useState([]);
    const [assignDialog, setAssignDialog] = useState(null);
    const [cancelDialog, setCancelDialog] = useState(null);
    const [returnDialog, setReturnDialog] = useState(null);
    const [editDialog, setEditDialog] = useState(null);
    const [detailTrip, setDetailTrip] = useState(null);
    const [driverSearch, setDriverSearch] = useState("");

    const fetchTrips = useCallback(async () => {
        try {
            const [activeRes, statsRes, driversRes] = await Promise.all([
                api.get("/trips/active"),
                api.get("/stats/dashboard"),
                api.get("/drivers")
            ]);
            const activeTrips = activeRes.data || [];
            setTrips(activeTrips);
            setDrivers(driversRes.data || []);
            
            setStats({
                pendiente: activeTrips.filter(t => t.status === "pendiente").length,
                asignado: activeTrips.filter(t => t.status === "asignado").length,
                en_curso: activeTrips.filter(t => t.status === "en_curso").length,
                completado: statsRes.data?.by_status?.completado || 0
            });
        } catch (e) { } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        fetchTrips();
        const interval = setInterval(fetchTrips, 15000);
        return () => clearInterval(interval);
    }, [fetchTrips]);

    const handleAssign = async (tripId, driverId) => {
        try {
            await api.put(`/trips/${tripId}/manager-assign`, { driver_id: driverId });
            toast.success("Viaje asignado exitosamente");
            setAssignDialog(null); fetchTrips();
        } catch (e) { toast.error("Error al asignar"); }
    };

    const handleCancel = async (e) => {
        e.preventDefault();
        const reason = e.target.reason.value;
        if (!reason) { toast.error("Debe indicar una justificación"); return; }
        try {
            await api.put(`/trips/${cancelDialog.id}/status`, { status: "cancelado", cancel_reason: reason });
            toast.success("Traslado cancelado");
            setCancelDialog(null); fetchTrips();
        } catch (e) { toast.error("Error al cancelar"); }
    };

    const handleReturnToManager = async () => {
        try {
            await api.put(`/trips/${returnDialog.id}/status`, { status: "revision_gestor" });
            toast.success("Traslado devuelto al gestor de camas");
            setReturnDialog(null); fetchTrips();
        } catch (e) { toast.error("Error al devolver traslado"); }
    };

    const handleDeleteTrip = async (tripId) => {
        if (!window.confirm("¿Seguro que deseas ELIMINAR PERMANENTEMENTE este viaje de la base de datos?")) return;
        try {
            await api.delete(`/trips/${tripId}`);
            toast.success("Viaje eliminado permanentemente");
            fetchTrips();
        } catch (e) {
            toast.error("Error al eliminar el viaje");
        }
    };

    const handleUnassign = async (tripId) => {
        if (!window.confirm("¿Deseas desasignar el conductor de este traslado? Volverá a estado pendiente.")) return;
        try {
            await api.put(`/trips/${tripId}/unassign`);
            toast.success("Traslado desasignado correctamente");
            fetchTrips();
        } catch (e) {
            toast.error("Error al desasignar traslado");
        }
    };

    const handleEditSubmission = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        try {
            await api.put(`/trips/${editDialog.id}`, data);
            toast.success("Traslado actualizado");
            setEditDialog(null); fetchTrips();
        } catch (e) { toast.error("Error al actualizar"); }
    };

    const filteredTrips = trips.filter(t => t.status === filterStatus);
    const clinicalTrips = filteredTrips.filter(t => t.trip_type === "clinico");
    const nonClinicalTrips = filteredTrips.filter(t => t.trip_type !== "clinico");

    if (loading) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    const StatusCard = ({ id, label, count, color, activeColor }) => (
        <button 
            onClick={() => setFilterStatus(id)}
            className={`flex-1 text-left p-4 rounded-2xl border-l-4 transition-all hover:scale-[1.01] shadow-sm 
                ${filterStatus === id ? `${activeColor} ring-1 ring-slate-900/5` : "bg-white border-l-slate-200"}`}
            style={{ borderLeftColor: filterStatus === id ? color : undefined }}
        >
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
            <p className={`text-2xl font-black ${filterStatus === id ? "text-slate-900" : "text-slate-500"}`}>{count}</p>
        </button>
    );

    const renderTripCard = (t) => (
        <Card key={t.id} className={`group overflow-hidden border-none shadow-md ring-1 ring-slate-200 hover:ring-teal-500 hover:shadow-lg transition-all duration-300 bg-white border-l-4 ${t.trip_type === "clinico" ? "border-l-teal-500" : "border-l-indigo-400"}`}>
            <CardContent className="p-4 space-y-3">
                {/* Cabecera de la Tarjeta */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                            className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm cursor-pointer hover:bg-teal-100 transition-colors"
                            onClick={() => setDetailTrip(t)}
                        >
                            #{t.tracking_number}
                        </span>
                        <Badge className={`text-[9px] font-black px-2 py-0.5 uppercase rounded-full border-none shadow-sm ${t.priority === "urgente" ? "bg-red-500 text-white" : t.priority === "alta" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>{t.priority}</Badge>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{formatScheduledDate(t.scheduled_date) || "Hoy"}</span>
                </div>

                {/* Título / Paciente / Cometido */}
                <div className="cursor-pointer" onClick={() => setDetailTrip(t)}>
                    <h3 className="text-sm font-black text-slate-900 leading-tight uppercase group-hover:text-teal-700 transition-colors truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            {t.trip_type === "clinico" ? <Stethoscope className="w-2.5 h-2.5 text-teal-600" /> : <Truck className="w-2.5 h-2.5 text-indigo-600" />}
                            {t.transfer_reason || "Gral."}
                        </p>
                        <p className={`text-[9px] font-bold px-1.5 rounded uppercase ${t.trip_type === "clinico" ? "text-teal-600 bg-teal-50" : "text-indigo-600 bg-indigo-50"}`}>{t.trip_type}</p>
                    </div>
                </div>

                {/* Ruta (Origen -> Destino) */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-[10px] font-bold text-slate-600">
                    <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate uppercase text-slate-800">{t.origin}</span>
                    </div>
                    <div className="flex items-center gap-1.5 pl-5 border-l border-dashed border-slate-300">
                        <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
                        <span className="truncate uppercase text-slate-800">{t.destination}</span>
                    </div>
                </div>

                {/* Estado Operativo / Cita */}
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold border-t border-slate-100 pt-2.5">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                            {t.vehicle_type ? VEHICLE_ICONS[t.vehicle_type] : <User className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Móvil / Cond.</p>
                            <p className="text-[10px] font-black text-slate-900 leading-none truncate uppercase">{t.driver_name ? t.driver_name.split(' ')[0] : "PDTE."}</p>
                            {t.vehicle_plate && <p className="text-[8px] font-bold text-teal-600 font-mono leading-none mt-0.5">{t.vehicle_plate}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase leading-none mb-0.5">Hora Cita</p>
                            <p className="text-[10px] font-black text-slate-900 leading-none">{t.appointment_time || "--:--"}</p>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="border-t border-slate-100 pt-2.5 flex flex-col gap-1.5">
                    {["pendiente", "asignado"].includes(t.status) && (
                        <>
                            <div className="flex gap-1.5 w-full">
                                <Button onClick={() => setAssignDialog(t)} className="flex-1 h-8 bg-teal-600 hover:bg-teal-700 text-white text-[9px] font-black uppercase shadow-sm rounded-xl">
                                    {t.driver_id ? "Reasignar" : "Asignar"}
                                </Button>
                                {t.driver_id && t.status === "asignado" && (
                                    <Button onClick={() => handleUnassign(t.id)} variant="ghost" className="flex-1 h-8 text-[9px] font-black uppercase text-amber-600 hover:bg-amber-50 shadow-sm border border-amber-100 italic rounded-xl">
                                        <RotateCcw className="w-3 h-3 mr-1" /> Quitar
                                    </Button>
                                )}
                            </div>
                            <div className="flex w-full gap-1">
                                <Button onClick={() => setEditDialog(t)} variant="outline" className="flex-1 h-7 text-[8px] font-black uppercase text-teal-600 border-teal-100 hover:bg-teal-50 rounded-lg" title="Editar Traslado">
                                    <Edit className="w-3 h-3 mr-1" /> Editar
                                </Button>
                                <Button onClick={() => setReturnDialog(t)} variant="outline" className="flex-1 h-7 text-[8px] font-black uppercase text-slate-600 border-slate-200 rounded-lg" title="Devolver al Gestor">
                                    <RotateCcw className="w-3 h-3 mr-1" /> Devolver
                                </Button>
                                <Button onClick={() => setCancelDialog(t)} variant="outline" className="h-7 w-7 p-0 text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 rounded-lg" title="Cancelar Traslado">
                                    <XCircle className="w-3 h-3" />
                                </Button>
                                {user?.role === 'admin' && (
                                    <Button onClick={() => handleDeleteTrip(t.id)} variant="outline" className="h-7 w-7 p-0 text-red-700 border-red-200 bg-red-50 hover:bg-red-100 rounded-lg" title="ELIMINAR PERMANENTEMENTE">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                    {t.status === "en_curso" && <Badge className="w-full justify-center bg-blue-100 text-blue-700 border-none font-black text-[9px] uppercase py-1 shadow-sm rounded-xl">En Ruta</Badge>}
                    {t.status === "completado" && <Badge className="w-full justify-center bg-emerald-100 text-emerald-700 border-none font-black text-[9px] uppercase py-1 shadow-sm rounded-xl">Finalizado</Badge>}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="animate-slide-up space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bandeja de Entrada</h1>
                    <p className="text-slate-500 font-bold text-xs">Gestión de Despacho en Tiempo Real.</p>
                </div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Live</span>
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatusCard id="pendiente" label="Por Despachar" count={stats.pendiente} color="#f59e0b" activeColor="bg-amber-50" />
                <StatusCard id="asignado" label="Con Conductor" count={stats.asignado} color="#0d9488" activeColor="bg-teal-50" />
                <StatusCard id="en_curso" label="En Tránsito" count={stats.en_curso} color="#3b82f6" activeColor="bg-blue-50" />
                <StatusCard id="completado" label="Finalizados" count={stats.completado} color="#10b981" activeColor="bg-emerald-50" />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <Activity className="w-6 h-6 text-teal-600" />
                        {filterStatus === "pendiente" ? "Traslados por Despachar" : 
                         filterStatus === "asignado" ? "Traslados con Conductor" :
                         filterStatus === "en_curso" ? "Traslados en Ruta" : "Traslados Finalizados Hoy"}
                        <Badge className="bg-teal-100 text-teal-800 border-none font-bold text-xs px-2.5 py-1 rounded-full shadow-sm">{filteredTrips.length}</Badge>
                    </h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Columna Traslados Clínicos */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-teal-100 pb-2.5">
                            <h2 className="text-sm font-black text-teal-800 flex items-center gap-2 uppercase tracking-widest">
                                <Stethoscope className="w-5 h-5 text-teal-600" /> Clínicos
                            </h2>
                            <Badge className="bg-teal-100 text-teal-800 border-none font-black px-3 py-1 rounded-full text-xs shadow-sm">
                                {clinicalTrips.length} activos
                            </Badge>
                        </div>
                        <div className="space-y-3">
                            {clinicalTrips.map(renderTripCard)}
                            {clinicalTrips.length === 0 && (
                                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Sin traslados clínicos activos
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Columna Traslados No Clínicos */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b-2 border-indigo-100 pb-2.5">
                            <h2 className="text-sm font-black text-indigo-900 flex items-center gap-2 uppercase tracking-widest">
                                <Truck className="w-5 h-5 text-indigo-600" /> No Clínicos
                            </h2>
                            <Badge className="bg-indigo-100 text-indigo-800 border-none font-black px-3 py-1 rounded-full text-xs shadow-sm">
                                {nonClinicalTrips.length} activos
                            </Badge>
                        </div>
                        <div className="space-y-3">
                            {nonClinicalTrips.map(renderTripCard)}
                            {nonClinicalTrips.length === 0 && (
                                <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Sin traslados no clínicos activos
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={() => setDetailTrip(null)} onRefresh={fetchTrips} />

            {/* DIALOGO ASIGNACIÓN REDISEÑADO PARA PC */}
            <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setDriverSearch(""); } }}>
                <DialogContent className="max-w-3xl bg-slate-50 border-none shadow-2xl p-0 overflow-hidden">
                    <div className="flex h-[500px]">
                        {/* Lateral Izquierdo: Resumen del viaje */}
                        <div className="w-1/3 bg-teal-50/70 border-r border-teal-100/50 p-6 text-slate-800 flex flex-col justify-between">
                            <div>
                                <Badge className="bg-teal-100 text-teal-800 border-none mb-4 uppercase text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md">Detalle del Traslado</Badge>
                                <h3 className="text-xl font-bold leading-tight mb-6 text-slate-900">{assignDialog?.trip_type === "clinico" ? assignDialog?.patient_name : assignDialog?.task_details}</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-teal-600 shrink-0"></div>
                                        <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">Origen</p><p className="text-sm font-bold leading-tight text-slate-800">{assignDialog?.origin}</p></div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                        <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">Destino</p><p className="text-sm font-bold leading-tight text-slate-800">{assignDialog?.destination}</p></div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-teal-100/60">
                                <p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-2 tracking-wider">Hora de Cita</p>
                                <p className="text-3xl font-black text-teal-600 font-mono">{assignDialog?.appointment_time || "--:--"}</p>
                            </div>
                        </div>

                        {/* Panel Derecho: Selector de Conductores */}
                        <div className="flex-1 bg-white flex flex-col">
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                    {assignDialog?.driver_id ? "Reasignar Móvil" : "Asignar Móvil Operativo"}
                                </h2>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-slate-400" /></div>
                                    <Input 
                                        placeholder="Buscar por nombre o patente..." 
                                        className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-teal-500"
                                        value={driverSearch}
                                        onChange={(e) => setDriverSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                                <div className="grid grid-cols-2 gap-3">
                                    {drivers.filter(d => 
                                        (d.name || "").toLowerCase().includes(driverSearch.toLowerCase()) || 
                                        (d.vehicle_plate && d.vehicle_plate.toLowerCase().includes(driverSearch.toLowerCase()))
                                    ).map(d => (
                                        <button 
                                            key={d.id} 
                                            onClick={() => handleAssign(assignDialog.id, d.id)}
                                            className="group flex flex-col p-3 bg-white border border-slate-200 rounded-2xl hover:border-teal-500 hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-teal-50 flex items-center justify-center text-slate-400 group-hover:text-teal-600 font-black text-sm transition-colors border border-slate-100 group-hover:border-teal-200">
                                                    {(d.name || "U").split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 text-[11px] leading-tight uppercase group-hover:text-teal-700 truncate">{d.name}</p>
                                                    <Badge className="bg-slate-100 group-hover:bg-teal-100 text-slate-500 group-hover:text-teal-700 border-none font-mono text-[9px] px-1.5 py-0 mt-0.5">
                                                        {d.vehicle_plate || "S/M"}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="mt-auto flex items-center justify-between">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Disponible Ahora</span>
                                                <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                                            </div>
                                            {/* Decoración hover */}
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        </button>
                                    ))}
                                    {drivers.length === 0 && (
                                        <div className="col-span-2 py-20 text-center">
                                            <User className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                                            <p className="text-xs font-black text-slate-400 uppercase">Sin conductores registrados</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                                <Button variant="ghost" onClick={() => setAssignDialog(null)} className="text-xs font-black uppercase text-slate-500">Cerrar</Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* DIALOGO CANCELACIÓN */}
            <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="text-lg font-black text-red-600 uppercase">Confirmar Cancelación</DialogTitle></DialogHeader>
                    <form onSubmit={handleCancel} className="space-y-4 pt-4">
                        <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-800 text-xs font-bold">
                            Esta acción cancelará definitivamente el traslado #{cancelDialog?.tracking_number}.
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-black uppercase text-slate-500">Justificación de la cancelación *</Label>
                            <textarea name="reason" className="w-full h-24 p-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none" placeholder="Indique el motivo de la cancelación..." required />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setCancelDialog(null)} className="text-xs font-black uppercase h-9">Volver</Button>
                            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase h-9 px-6">Confirmar Cancelación</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DIALOGO DEVOLVER AL GESTOR */}
            <Dialog open={!!returnDialog} onOpenChange={() => setReturnDialog(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="text-lg font-black text-slate-900 uppercase">Devolver Traslado</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-4">
                        <p className="text-sm text-slate-500 font-medium">¿Está seguro de devolver este traslado al Gestor de Camas para su revisión? El traslado saldrá de su bandeja activa hasta que sea aprobado nuevamente.</p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setReturnDialog(null)} className="text-xs font-black uppercase">Volver</Button>
                            <Button onClick={handleReturnToManager} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase">Sí, Devolver</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* DIALOGO EDICIÓN */}
            <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader><DialogTitle className="text-xl font-black uppercase">Editar Traslado #{editDialog?.tracking_number}</DialogTitle></DialogHeader>
                    {editDialog && (
                        <form onSubmit={handleEditSubmission} className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Origen</Label><Input name="origin" defaultValue={editDialog.origin} className="h-9 text-xs font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Destino</Label><Input name="destination" defaultValue={editDialog.destination} className="h-9 text-xs font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Paciente / Cometido</Label><Input name={editDialog.trip_type === "clinico" ? "patient_name" : "task_details"} defaultValue={editDialog.trip_type === "clinico" ? editDialog.patient_name : editDialog.task_details} className="h-9 text-xs font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Fecha Programada</Label><Input name="scheduled_date" type="date" defaultValue={editDialog.scheduled_date ? editDialog.scheduled_date.split('T')[0] : ""} className="h-9 text-xs font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Hora Cita</Label><Input name="appointment_time" type="time" defaultValue={editDialog.appointment_time} className="h-9 text-xs font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Hora Salida</Label><Input name="departure_time" type="time" defaultValue={editDialog.departure_time} className="h-9 text-xs font-bold" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-500">Prioridad</Label>
                                    <Select name="priority" defaultValue={editDialog.priority}>
                                        <SelectTrigger className="h-9 text-xs font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="urgente">Urgente</SelectItem>
                                            <SelectItem value="alta">Alta</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                                <Button type="button" variant="outline" onClick={() => setEditDialog(null)} className="text-xs font-black uppercase h-9">Cerrar</Button>
                                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase h-9 px-8 shadow-md transition-all active:scale-95">Guardar Cambios</Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}



function AssignSection() {
    const [trips, setTrips] = useState([]);
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [assignDialog, setAssignDialog] = useState(null);
    const [driverSearch, setDriverSearch] = useState("");
    const [detailTrip, setDetailTrip] = useState(null);

    const fetchAll = useCallback(async () => {
        try {
            const [t, d] = await Promise.all([api.get("/trips/active"), api.get("/drivers")]);
            setTrips(t.data || []); 
            setDrivers(d.data || []);
        } catch { } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleAssign = async (tripId, driverId) => {
        try {
            await api.put(`/trips/${tripId}/manager-assign`, { driver_id: driverId });
            toast.success("Viaje asignado exitosamente");
            setAssignDialog(null); fetchAll();
        } catch (e) { toast.error("Error al asignar"); }
    };

    const handleUnassign = async (tripId) => {
        if (!window.confirm("¿Seguro que deseas desasignar el conductor? El viaje volverá a estado pendiente.")) return;
        try {
            await api.put(`/trips/${tripId}/unassign`);
            toast.success("Conductor desasignado");
            fetchAll();
        } catch (e) { toast.error("Error al desasignar"); }
    };

    const filteredTrips = filter === "all" ? trips : trips.filter(t => t.status === filter);
    const clinicalTrips = filteredTrips.filter(t => t.trip_type === "clinico");
    const nonClinicalTrips = filteredTrips.filter(t => t.trip_type !== "clinico");

    if (loading) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    return (
        <div className="animate-slide-up space-y-6">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Asignación de Traslados</h1>
            <div className="flex gap-2 mb-4 flex-wrap">
                {[{ v: "all", l: "Todos" }, { v: "pendiente", l: "Pendientes" }, { v: "asignado", l: "Asignados" }, { v: "en_curso", l: "En Curso" }].map(f => (
                    <Button key={f.v} variant={filter === f.v ? "default" : "outline"} size="sm" onClick={() => setFilter(f.v)} className={`${filter === f.v ? "bg-teal-600 hover:bg-teal-700 text-white font-bold" : "font-bold shadow-sm"} h-10 px-6 rounded-xl`}>{f.l}</Button>
                ))}
            </div>
            
            {(() => {
                const renderTripCard = (t) => (
                    <Card key={t.id} className={`card-hover border-l-4 shadow-md bg-white transition-all duration-300 ${t.trip_type === "clinico" ? "border-l-teal-500" : "border-l-indigo-400"}`}>
                        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0" onClick={() => setDetailTrip(t)}>
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">#{t.tracking_number}</span>
                                    <Badge className={`${sColors[t.status] || "bg-slate-100"} border-none text-[10px] uppercase font-black px-2.5 py-1 rounded-full shadow-sm`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                                    <Badge className={`${pColors[t.priority] || pColors.normal} border-none text-[10px] uppercase font-black px-2.5 py-1 rounded-full shadow-sm`}>{t.priority}</Badge>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{formatScheduledDate(t.scheduled_date) || "Hoy"}</span>
                                </div>
                                <h4 className="text-sm font-black text-slate-900 uppercase truncate mb-2">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</h4>
                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" /> <span className="truncate">{t.origin}</span></div>
                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                    <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">{t.destination}</span></div>
                                </div>
                            </div>
                            
                            <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-[140px]">
                                {t.driver_name ? (
                                    <div className="flex flex-col gap-0.5 w-full bg-teal-50/50 p-2 rounded-xl border border-teal-100 mb-1 text-[10px]">
                                        <p className="text-[8px] font-black text-teal-800 uppercase tracking-widest leading-none">Asignado:</p>
                                        <p className="font-black text-teal-900 leading-tight truncate">{t.driver_name}</p>
                                        <p className="text-[8px] font-bold text-teal-600/70 font-mono uppercase leading-none mt-0.5">{t.vehicle_plate || "Sin Móvil"}</p>
                                    </div>
                                ) : null}
                                <Button onClick={() => setAssignDialog(t)} className={`h-9 w-full font-black uppercase text-[9px] shadow-md rounded-xl transition-all active:scale-95 ${t.driver_id ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-teal-600 hover:bg-teal-700 text-white"}`}>
                                    <ClipboardList className="w-3.5 h-3.5 mr-1.5" />{t.driver_id ? "Reasignar" : "Asignar"}
                                </Button>
                                {t.driver_id && t.status === "asignado" && (
                                    <Button onClick={() => handleUnassign(t.id)} variant="outline" className="h-8 w-full font-black uppercase text-[9px] text-red-600 border-red-100 hover:bg-red-50 rounded-xl transition-all">
                                        <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Quitar
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );

                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Columna Traslados Clínicos */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b-2 border-teal-100 pb-2.5">
                                <h2 className="text-sm font-black text-teal-800 flex items-center gap-2 uppercase tracking-widest">
                                    <Stethoscope className="w-5 h-5 text-teal-600" /> Clínicos
                                </h2>
                                <Badge className="bg-teal-100 text-teal-800 border-none font-black px-3 py-1 rounded-full text-xs shadow-sm">
                                    {clinicalTrips.length} activos
                                </Badge>
                            </div>
                            <div className="space-y-3">
                                {clinicalTrips.map(renderTripCard)}
                                {clinicalTrips.length === 0 && (
                                    <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Sin traslados clínicos activos
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Columna Traslados No Clínicos */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b-2 border-indigo-100 pb-2.5">
                                <h2 className="text-sm font-black text-indigo-900 flex items-center gap-2 uppercase tracking-widest">
                                    <Truck className="w-5 h-5 text-indigo-600" /> No Clínicos
                                </h2>
                                <Badge className="bg-indigo-100 text-indigo-800 border-none font-black px-3 py-1 rounded-full text-xs shadow-sm">
                                    {nonClinicalTrips.length} activos
                                </Badge>
                            </div>
                            <div className="space-y-3">
                                {nonClinicalTrips.map(renderTripCard)}
                                {nonClinicalTrips.length === 0 && (
                                    <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Sin traslados no clínicos activos
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={() => setDetailTrip(null)} onRefresh={fetchAll} />

            <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setDriverSearch(""); } }}>
                <DialogContent className="max-w-3xl bg-slate-50 border-none shadow-2xl p-0 overflow-hidden">
                    <div className="flex h-[500px]">
                        {/* Lateral Izquierdo: Resumen del viaje */}
                        <div className="w-1/3 bg-teal-50/70 border-r border-teal-100/50 p-6 text-slate-800 flex flex-col justify-between">
                            <div>
                                <Badge className="bg-teal-100 text-teal-800 border-none mb-4 uppercase text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md">Detalle del Traslado</Badge>
                                <h3 className="text-xl font-bold leading-tight mb-6 text-slate-900">{assignDialog?.trip_type === "clinico" ? assignDialog?.patient_name : assignDialog?.task_details}</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-teal-600 shrink-0"></div>
                                        <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">Origen</p><p className="text-sm font-bold leading-tight text-slate-800">{assignDialog?.origin}</p></div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                        <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">Destino</p><p className="text-sm font-bold leading-tight text-slate-800">{assignDialog?.destination}</p></div>
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-teal-100/60">
                                <p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-2 tracking-wider">Hora de Cita</p>
                                <p className="text-3xl font-black text-teal-600 font-mono">{assignDialog?.appointment_time || "--:--"}</p>
                            </div>
                        </div>

                        {/* Panel Derecho: Selector de Conductores */}
                        <div className="flex-1 bg-white flex flex-col">
                            <div className="p-6 border-b border-slate-100">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                                    {assignDialog?.driver_id ? "Reasignar Móvil" : "Asignar Móvil Operativo"}
                                </h2>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-slate-400" /></div>
                                    <Input 
                                        placeholder="Buscar por nombre o patente..." 
                                        className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-teal-500"
                                        value={driverSearch}
                                        onChange={(e) => setDriverSearch(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                                <div className="grid grid-cols-2 gap-3">
                                    {drivers.filter(d => 
                                        (d.name || "").toLowerCase().includes(driverSearch.toLowerCase()) || 
                                        (d.vehicle_plate && d.vehicle_plate.toLowerCase().includes(driverSearch.toLowerCase()))
                                    ).map(d => (
                                        <button 
                                            key={d.id} 
                                            onClick={() => handleAssign(assignDialog.id, d.id)}
                                            className="group flex flex-col p-3 bg-white border border-slate-200 rounded-2xl hover:border-teal-500 hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden"
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-teal-50 flex items-center justify-center text-slate-400 group-hover:text-teal-600 font-black text-sm transition-colors border border-slate-100 group-hover:border-teal-200">
                                                    {d.vehicle_type && VEHICLE_ICONS[d.vehicle_type] ? VEHICLE_ICONS[d.vehicle_type] : (d.name || "U").split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 text-[11px] leading-tight uppercase group-hover:text-teal-700 truncate">{d.name}</p>
                                                    <Badge className="bg-slate-100 group-hover:bg-teal-100 text-slate-500 group-hover:text-teal-700 border-none font-mono text-[9px] px-1.5 py-0 mt-0.5">
                                                        {d.vehicle_plate || "S/M"}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="mt-auto flex items-center justify-between">
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Disponible Ahora</span>
                                                <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                                <Button variant="ghost" onClick={() => setAssignDialog(null)} className="text-xs font-black uppercase text-slate-500">Cerrar</Button>
                            </div>
                        </div>
                    </div>
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
    const [draggedTripId, setDraggedTripId] = useState(null);
    const [dragOverDate, setDragOverDate] = useState(null);

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

    const TripCardInternal = ({ t }) => (
        <div className={`p-2 rounded-lg border-l-2 mb-1 text-[10px] ${t.trip_type === "clinico" ? "border-l-teal-500 bg-teal-50/50" : "border-l-slate-400 bg-slate-50"}`}>
            <p className="font-bold text-slate-800 truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
            <p className="text-[9px] text-slate-500 font-mono">{t.appointment_time || "--:--"}</p>
        </div>
    );

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
                        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-black text-teal-700 hover:bg-teal-50 rounded-lg">Hoy</button>
                        <button onClick={() => navigate(1)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>
            </div>

            {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-teal-600" /></div> : (
                <>
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
                                                    onDragEnd={(e) => { e.stopPropagation(); setDraggedTripId(null); }}
                                                    onClick={(e) => { e.stopPropagation(); setDetailTrip(t); }} 
                                                    className={`p-2 rounded-lg border-l-2 mb-1 text-[10px] cursor-pointer transition-all duration-200 ${
                                                        t.trip_type === "clinico" ? "border-l-teal-500 bg-teal-50/50" : "border-l-slate-400 bg-slate-50"
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
                </>
            )}
            <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={() => setDetailTrip(null)} onRefresh={fetchCalendar} />
        </div>
    );
}

function VehiclesSection() {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchVehicles = useCallback(async () => { 
        try { 
            const [vRes, tRes] = await Promise.all([
                api.get("/vehicles"),
                api.get("/trips/active")
            ]);
            const vehList = vRes.data || [];
            const activeTrips = tRes.data || [];
            
            // Map active trip details directly onto vehicle objects
            const mapped = vehList.map(veh => {
                const matchingTrip = activeTrips.find(t => t.vehicle_plate === veh.plate && t.status === "en_curso");
                if (matchingTrip) {
                    return {
                        ...veh,
                        current_driver: matchingTrip.driver_name,
                        current_destination: matchingTrip.destination,
                        current_clinical_team: matchingTrip.clinical_team
                    };
                }
                return veh;
            });
            setVehicles(mapped); 
        } catch { } 
        finally { setLoading(false); } 
    }, []);
    
    useEffect(() => { 
        fetchVehicles(); 
        const interval = setInterval(fetchVehicles, 20000);
        return () => clearInterval(interval);
    }, [fetchVehicles]);

    const handleStatusToggle = async (v) => {
        const isInactive = v.status === "fuera_de_servicio" || v.status === "no_disponible";
        const newStatus = isInactive ? "disponible" : "fuera_de_servicio";
        try { 
            await api.put(`/vehicles/${v.id}/status`, { status: newStatus }); 
            toast.success(`Móvil ${v.plate} ${newStatus === "disponible" ? "habilitado" : "fuera de servicio"}`); 
            fetchVehicles(); 
        } catch (e) { toast.error("Error al actualizar estado"); }
    };

    const statusConfig = {
        disponible: { 
            bg: "bg-emerald-50", 
            border: "border-emerald-200", 
            text: "text-emerald-700", 
            badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
            label: "Disponible",
            icon: <CheckCircle className="w-4 h-4" />
        },
        fuera_de_servicio: { 
            bg: "bg-rose-50", 
            border: "border-rose-200", 
            text: "text-rose-700", 
            badge: "bg-rose-100 text-rose-800 border-rose-200",
            label: "Fuera de Servicio",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        no_disponible: { 
            bg: "bg-rose-50", 
            border: "border-rose-200", 
            text: "text-rose-700", 
            badge: "bg-rose-100 text-rose-800 border-rose-200",
            label: "Fuera de Servicio",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        en_mantenimiento: { 
            bg: "bg-amber-50", 
            border: "border-amber-200", 
            text: "text-amber-700", 
            badge: "bg-amber-100 text-amber-800 border-amber-200",
            label: "Mantenimiento",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        en_curso: { 
            bg: "bg-blue-50/70", 
            border: "border-blue-300", 
            text: "text-blue-700", 
            badge: "bg-blue-100 text-blue-800 border-blue-200",
            label: "En Ruta",
            icon: <Activity className="w-4 h-4" />
        }
    };

    if (loading && vehicles.length === 0) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    const renderVehicleCard = (v) => {
        const cfg = statusConfig[v.status] || statusConfig.disponible;
        const isEnCurso = v.status === "en_curso";
        
        return (
            <Card 
                key={v.id} 
                className={`group overflow-hidden transition-all duration-300 border shadow-sm ${cfg.bg} ${cfg.border} hover:shadow-md ${isEnCurso ? "opacity-90 ring-1 ring-blue-300 shadow-blue-100/50" : ""}`}
                style={isEnCurso ? {
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 246, 255, 0.9), rgba(239, 246, 255, 0.9) 10px, rgba(219, 234, 254, 0.4) 10px, rgba(219, 234, 254, 0.4) 20px)'
                } : undefined}
            >
                <CardContent className="p-0">
                    {/* Cabecera compacta */}
                    <div className="p-2.5 flex items-center justify-between border-b border-inherit bg-white/40">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-sm border border-inherit`}>
                                {v.type === "Ambulancia" ? <Siren className={`w-3.5 h-3.5 ${cfg.text}`} /> : <Truck className={`w-3.5 h-3.5 ${cfg.text}`} />}
                            </div>
                            <div className="flex flex-col">
                                {v.zonal_number ? (
                                    <>
                                        <span className={`font-black text-sm tracking-tighter leading-tight ${cfg.text}`}>N° {v.zonal_number}</span>
                                        <span className={`font-bold text-[8px] opacity-70 leading-none ${cfg.text}`}>{v.plate}</span>
                                    </>
                                ) : (
                                    <span className={`font-black text-sm tracking-tighter ${cfg.text}`}>{v.plate}</span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full ${cfg.badge} select-none leading-none border shadow-2xs`}>
                                {cfg.label}
                            </span>
                            <div className="relative flex h-2 w-2">
                                {isEnCurso && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                )}
                                <div className={`w-2 h-2 rounded-full ${v.status === 'disponible' ? 'bg-emerald-500' : isEnCurso ? 'bg-blue-500' : 'bg-rose-500'} shadow-sm`}></div>
                            </div>
                        </div>
                    </div>

                    {/* Cuerpo compacto */}
                    <div className="p-2.5 space-y-2 min-h-[110px] flex flex-col justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-black text-slate-700 uppercase truncate leading-tight">{v.brand} {v.model}</p>
                            <p className="text-[9px] font-bold text-slate-400 leading-none">{v.type}</p>
                        </div>

                        {isEnCurso ? (
                            <div className="bg-white/85 rounded-lg p-2 border border-blue-200/80 shadow-3xs">
                                <div className="flex items-center gap-1.5 mb-1 text-blue-700">
                                    <User className="w-2.5 h-2.5 shrink-0" />
                                    <p className="text-[9px] font-black uppercase truncate">{v.current_driver || "En traslado"}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-blue-600">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    <p className="text-[9px] font-bold truncate">{v.current_destination || "Ruta"}</p>
                                </div>
                                {v.current_clinical_team && (
                                    <div className="flex items-center gap-1.5 text-purple-600 border-t border-blue-100/30 mt-1 pt-1">
                                        <Users className="w-2.5 h-2.5 shrink-0" />
                                        <p className="text-[8px] font-bold truncate italic leading-tight">{v.current_clinical_team}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center h-[42px] text-center border border-dashed border-inherit rounded-lg opacity-40 bg-white/20">
                                <p className="text-[8px] font-black uppercase text-inherit tracking-tighter">En reserva</p>
                            </div>
                        )}

                        {/* Botón de Acción ultra compacto */}
                        {user?.role !== "gestion_camas" && (
                            <div className="pt-1">
                                <Button 
                                    onClick={() => handleStatusToggle(v)}
                                    disabled={isEnCurso}
                                    variant="outline" 
                                    className={`w-full h-7 text-[8px] font-black uppercase tracking-tighter transition-all bg-white hover:bg-white/80 ${v.status === "fuera_de_servicio" || v.status === "no_disponible" ? "text-emerald-700 border-emerald-200" : "text-rose-700 border-rose-200"}`}
                                >
                                    {v.status === "fuera_de_servicio" || v.status === "no_disponible" ? "Habilitar" : "Fuera Serv."}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    const ambulancias = vehicles.filter(v => v.type === "Ambulancia").sort((a,b) => a.plate.localeCompare(b.plate));
    const otrosVehiculos = vehicles.filter(v => v.type !== "Ambulancia").sort((a,b) => a.plate.localeCompare(b.plate));

    return (
        <div className="animate-slide-up space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Control de Flota Operativa</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase">Estado actual de todos los móviles del hospital.</p>
                </div>
                <Badge variant="outline" className="h-8 px-4 font-black border-slate-200 bg-white">
                    TOTAL: {vehicles.length} MÓVILES
                </Badge>
            </div>

            <div className="space-y-8">
                {ambulancias.length > 0 && (
                    <div>
                        <h2 className="text-xs font-black text-teal-600 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Siren className="w-5 h-5" /> Ambulancias Clínicas
                            <Badge className="ml-2 bg-teal-100 text-teal-800 hover:bg-teal-200 border-none">{ambulancias.length}</Badge>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {ambulancias.map(renderVehicleCard)}
                        </div>
                    </div>
                )}

                {otrosVehiculos.length > 0 && (
                    <div>
                        <h2 className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
                            <Truck className="w-5 h-5" /> Vehículos Generales
                            <Badge className="ml-2 bg-slate-200 text-slate-800 hover:bg-slate-300 border-none">{otrosVehiculos.length}</Badge>
                        </h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                            {otrosVehiculos.map(renderVehicleCard)}
                        </div>
                    </div>
                )}
            </div>
            
            {vehicles.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest">No se encontraron vehículos registrados</p>
                </div>
            )}
        </div>
    );
}

function DriversSection() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchDrivers = useCallback(async () => { try { const r = await api.get("/drivers"); setDrivers(r.data || []); } catch { } finally { setLoading(false); } }, []);
    useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

    return (
        <div className="animate-slide-up space-y-4">
            <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Gestión de Conductores</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {drivers.map(d => (
                    <Card key={d.id} className="shadow-sm border-slate-200">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-indigo-600" /></div>
                                <div className="truncate"><p className="font-black text-slate-900 text-[11px] leading-none mb-0.5 uppercase truncate">{d.name.split(' ')[0]}</p><p className="text-[9px] font-bold text-slate-400 uppercase truncate leading-none">Móvil: {d.vehicle_plate || "N/A"}</p></div>
                            </div>
                            {d.extra_available && <Badge className="bg-emerald-50 text-emerald-700 border-none w-full text-[8px] font-black uppercase py-0.5 tracking-tighter">Extra Activa</Badge>}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function NewTripSection({ onNavigate }) {
    const [origins, setOrigins] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [originServices, setOriginServices] = useState([]);
    const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
    const [tripType, setTripType] = useState("clinico");

    const [form, setForm] = useState({
        origin: "", origin_address: "", origin_maps_url: "",
        destination: "", destination_address: "", destination_maps_url: "",
        patient_name: "", patient_unit: "", priority: "normal", notes: "",
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
        api.get("/origins").then(r => setOrigins(r.data || [])).catch(() => { });
        api.get("/destinations").then(r => setDestinations(r.data || [])).catch(() => { });
        api.get("/clinical-staff").then(r => setClinicalStaffOptions((r.data || []).filter(s => s.is_active))).catch(() => { });
        api.get("/origin-services").then(r => setOriginServices((r.data || []).filter(s => s.is_active !== false))).catch(() => { });
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
        if (!value) {
            setForm(prev => ({ ...prev, rut: "" }));
            setRutStatus(null);
            return;
        }
        const result = validateRut(value);
        setForm(prev => ({ ...prev, rut: result.formatted }));
        if (value.trim().length >= 2) {
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
            if (field === "staff_id") {
                if (value && value !== "none") {
                    const staff = clinicalStaffOptions.find(s => s.id === value);
                    if (staff) updated[index].staff_name = staff.name;
                } else {
                    updated[index].staff_id = "";
                    updated[index].staff_name = "";
                }
            }
            return updated;
        });
    };

    const getStaffByType = (type) => {
        if (!type) return [];
        return clinicalStaffOptions.filter(s => s.role.toLowerCase() === type.toLowerCase());
    };

    const handleOriginChange = (val) => {
        if (val === "otro") {
            setUseCustomOrigin(true);
            setForm(prev => ({ ...prev, origin: "", origin_address: "", origin_maps_url: "" }));
        } else {
            const matched = origins.find(o => o.name === val);
            const address = matched ? (matched.address || "") : "";
            const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val + ", " + address)}` : "";
            setForm(prev => ({ 
                ...prev, 
                origin: val, 
                origin_address: address,
                origin_maps_url: mapsUrl
            }));
        }
    };

    const handleDestChange = (val) => {
        if (val === "otro") {
            setUseCustomDest(true);
            setForm(prev => ({ ...prev, destination: "", destination_address: "", destination_maps_url: "" }));
        } else {
            const matched = destinations.find(d => d.name === val);
            const address = matched ? (matched.address || "") : "";
            const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(val + ", " + address)}` : "";
            setForm(prev => ({ 
                ...prev, 
                destination: val, 
                destination_address: address,
                destination_maps_url: mapsUrl
            }));
        }
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
            if (!finalOrigin) newErrors.origin = true;
            if (!finalDest) newErrors.destination = true;
            
            setErrors(newErrors);

            if (staffRows.length === 0 && form.transfer_reason !== "Alta") { 
                toast.error("Debe añadir al menos un personal clínico para traslados clínicos"); return; 
            }
            if (staffRows.length > 0 && staffRows.some(r => !r.type)) { 
                toast.error("Seleccione el tipo de personal para todas las filas añadidas"); return; 
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
                required_personnel: staffRows.map(r => `${r.type}: ${r.staff_name || "Por identificar"}`),
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
        <div className="max-w-6xl mx-auto animate-slide-up space-y-4">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Nueva Solicitud de Traslado</h1>

            <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setTripType("clinico")} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${tripType === "clinico" ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-teal-200"}`}>
                    <Stethoscope className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">Traslado Clínico</span>
                </button>
                <button type="button" onClick={() => setTripType("no_clinico")} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${tripType === "no_clinico" ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-teal-200"}`}>
                    <Truck className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">Traslado No Clínico</span>
                </button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-5">
                    <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
                        {tripType === "clinico" && (
                            <>
                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-teal-800 border-b border-teal-100 pb-1 flex items-center gap-1.5 uppercase tracking-widest leading-none"><User className="w-4 h-4" /> Paciente</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        <div className="space-y-1"><Label className={`text-[10px] font-bold ${errors.patient_name ? "text-red-500" : "text-slate-500"}`}>Nombre Paciente *</Label><Input className={`h-9 text-xs font-semibold ${errors.patient_name ? "border-red-500 bg-red-50" : ""}`} value={form.patient_name} onChange={e => { setForm({ ...form, patient_name: e.target.value }); if (errors.patient_name) setErrors(p => ({ ...p, patient_name: false })); }} /></div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-500">RUT</Label>
                                            <div className="relative">
                                                <Input
                                                    value={form.rut}
                                                    onChange={e => handleRutChange(e.target.value)}
                                                    placeholder="12345678-9"
                                                    className={`h-9 text-xs font-semibold pr-8 ${rutStatus ? (rutStatus.valid ? "border-emerald-500" : "border-red-500") : ""}`}
                                                />
                                                {rutStatus && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                        {rutStatus.valid
                                                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                            : <XCircle className="w-4 h-4 text-red-500" />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Edad</Label><Input className="h-9 text-xs font-semibold" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                                        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Peso (Kg)</Label><Input className="h-9 text-xs font-semibold" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
                                        <div className="space-y-1 lg:col-span-2 xl:col-span-3"><Label className="text-[10px] font-bold text-slate-500">Diagnóstico</Label><Input className="h-9 text-xs font-semibold" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-teal-800 border-b border-teal-100 pb-1 flex items-center gap-1.5 uppercase tracking-widest leading-none"><Activity className="w-4 h-4" /> Detalles Médicos</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Médico Tratante</Label><Input className="h-9 text-xs font-semibold" value={form.attending_physician} onChange={e => setForm({ ...form, attending_physician: e.target.value })} /></div>
                                        <div className="space-y-1"><Label className={`text-[10px] font-bold ${errors.transfer_reason ? "text-red-500" : "text-slate-500"}`}>Motivo Traslado *</Label>
                                            <Select value={form.transfer_reason} onValueChange={v => { setForm({ ...form, transfer_reason: v }); if (errors.transfer_reason) setErrors(p => ({ ...p, transfer_reason: false })); }}>
                                                <SelectTrigger className={`h-9 text-xs font-semibold ${errors.transfer_reason ? "border-red-500 bg-red-50" : ""}`}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
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

                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-teal-800 border-b border-teal-100 pb-1 flex items-center gap-1.5 uppercase tracking-widest leading-none"><MapPin className="w-4 h-4" /> Ubicación y Tiempos</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="space-y-1"><Label className={`text-[10px] font-bold ${errors.origin ? "text-red-500" : "text-slate-500"}`}>Origen *</Label>
                                    {!useCustomOrigin ? (
                                        <Select onValueChange={handleOriginChange}>
                                            <SelectTrigger className={`h-9 text-xs font-semibold ${errors.origin ? "border-red-500 bg-red-50" : ""}`}><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                            <SelectContent>{origins.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent>
                                        </Select>
                                    ) : <Input className={`h-9 text-xs font-semibold ${errors.origin ? "border-red-500 bg-red-50" : ""}`} placeholder="Escriba origen" value={form.origin} onChange={e => { setForm({ ...form, origin: e.target.value }); if (errors.origin) setErrors(p => ({ ...p, origin: false })); }} onDoubleClick={() => setUseCustomOrigin(false)} />}
                                </div>
                                <div className="space-y-1"><Label className={`text-[10px] font-bold ${errors.destination ? "text-red-500" : "text-slate-500"}`}>Destino *</Label>
                                    {!useCustomDest ? (
                                        <Select onValueChange={handleDestChange}>
                                            <SelectTrigger className={`h-9 text-xs font-semibold ${errors.destination ? "border-red-500 bg-red-50" : ""}`}><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                            <SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent>
                                        </Select>
                                    ) : <Input className={`h-9 text-xs font-semibold ${errors.destination ? "border-red-500 bg-red-50" : ""}`} placeholder="Escriba destino" value={form.destination} onChange={e => { setForm({ ...form, destination: e.target.value }); if (errors.destination) setErrors(p => ({ ...p, destination: false })); }} onDoubleClick={() => setUseCustomDest(false)} />}
                                </div>

                                {/* Direcciones y Maps */}
                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-[10px] font-bold">Dirección de Origen</Label>
                                    <Input className="h-9 text-xs font-semibold" placeholder="Dirección exacta o referencia" value={form.origin_address || ""} onChange={e => setForm({ ...form, origin_address: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-[10px] font-bold">Google Maps Origen (URL)</Label>
                                    <Input className="h-9 text-xs font-semibold" placeholder="https://maps.google.com/..." value={form.origin_maps_url || ""} onChange={e => setForm({ ...form, origin_maps_url: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-[10px] font-bold">Dirección de Destino</Label>
                                    <Input className="h-9 text-xs font-semibold" placeholder="Dirección exacta o referencia" value={form.destination_address || ""} onChange={e => setForm({ ...form, destination_address: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-slate-500 text-[10px] font-bold">Google Maps Destino (URL)</Label>
                                    <Input className="h-9 text-xs font-semibold" placeholder="https://maps.google.com/..." value={form.destination_maps_url || ""} onChange={e => setForm({ ...form, destination_maps_url: e.target.value })} />
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
                                                <Input className={errors.patient_unit ? "border-red-500 bg-red-50 shadow-inner" : ""} placeholder="Escriba servicio" value={form.patient_unit || ""} onChange={e => { setForm({ ...form, patient_unit: e.target.value }); if (errors.patient_unit) setErrors(p => ({ ...p, patient_unit: false })); }} onDoubleClick={() => setUseCustomService(false)} />
                                            )}
                                        </div>
                                        <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })} /></div>
                                    </>
                                )}
                                <div className="space-y-1"><Label>Fecha del Traslado</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Hora de Citación</Label><Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} /></div>
                                <div className="space-y-1"><Label>Hora de Salida</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} /></div>
                            </div>
                        </div>

                        {tripType === "clinico" && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2">
                                    <Plus className="w-5 h-5" /> Personal Clínico Requerido {form.transfer_reason !== "Alta" ? "*" : "(Opcional para Altas)"}
                                </h3>
                                
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
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Nombre Funcionario (Opcional)</Label>
                                            <Select value={row.staff_id || "none"} onValueChange={v => updateStaffRow(i, "staff_id", v)} disabled={!row.type}>
                                                <SelectTrigger className="h-10"><SelectValue placeholder={row.type ? "Opcional: Identificar luego..." : "Primero seleccione tipo"} /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Por identificar luego...</SelectItem>
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

                                <div className="space-y-2 mt-4">
                                    <Label className="text-xs font-bold text-slate-700">Requerimientos Paciente *</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        {requirementOptions.map(o => (
                                            <label key={o} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                                <input type="checkbox" checked={form.patient_requirements.includes(o)} onChange={() => handleCheckbox("patient_requirements", o)} className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500" /> {o}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500">Tipo de Acompañamiento Adicional</Label>
                                        <Select value={form.accompaniment || "ninguno"} onValueChange={v => setForm({ ...form, accompaniment: v === "ninguno" ? "" : v })}>
                                            <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ninguno">Ninguno</SelectItem>
                                                {accompanimentOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
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


function TripAuditDetailDialog({ trip, open, onOpenChange }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && trip?.id) {
            setLoading(true);
            api.get(`/trips/${trip.id}/audit`)
                .then(res => setLogs(res.data || []))
                .catch(() => toast.error("Error al cargar auditoría"))
                .finally(() => setLoading(false));
        }
    }, [open, trip]);

    if (!trip) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-white rounded-[2rem] border-none shadow-2xl p-0 max-h-[95vh] overflow-y-auto">
                <DialogHeader className="p-8 pb-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 bg-teal-50 border border-teal-100/50 rounded-2xl flex items-center justify-center shadow-sm">
                            <History className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">Registro de Acciones</DialogTitle>
                            <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Folio: <span className="text-teal-600 font-mono">#{trip.tracking_number}</span> — Historial de cambios
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 pt-4">
                    <div 
                        className="bg-slate-50 rounded-3xl border border-slate-100 p-6 custom-scrollbar"
                        style={{ 
                            height: '400px', 
                            overflowY: 'scroll', 
                            WebkitOverflowScrolling: 'touch',
                            display: 'block'
                        }}
                    >
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <RefreshCw className="w-10 h-10 text-teal-500 animate-spin" />
                                <p className="text-xs font-black text-teal-800 uppercase tracking-widest animate-pulse">Consultando Bóveda de Auditoría...</p>
                            </div>
                        ) : logs.length > 0 ? (
                            <div className="space-y-6 relative pb-10">
                                <div className="absolute left-[19px] top-2 bottom-10 w-0.5 bg-slate-200"></div>
                                {logs.map((log, idx) => (
                                    <div key={log.id || idx} className="relative pl-12">
                                        <div className="absolute left-0 top-1 w-10 h-10 bg-white rounded-xl border-2 border-slate-200 flex items-center justify-center z-10 shadow-sm">
                                            {log.action === "crear_traslado" ? <Plus className="w-4 h-4 text-emerald-500" /> :
                                             log.action === "aprobar" ? <CheckCircle className="w-4 h-4 text-purple-500" /> :
                                             log.action === "eliminar" ? <Trash2 className="w-4 h-4 text-rose-500" /> :
                                             <Activity className="w-4 h-4 text-blue-500" />}
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-teal-200 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Usuario / Rol</p>
                                                    <p className="text-xs font-black text-slate-900 uppercase">{log.user_name} <span className="text-slate-400 ml-1 opacity-60">[{log.user_role}]</span></p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fecha y Hora</p>
                                                    <p className="text-[11px] font-mono font-black text-slate-600">{new Date(log.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-50">
                                                <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest mb-1 italic">Acción: {log.action.replace(/_/g, " ")}</p>
                                                <p className="text-sm font-bold text-slate-700 leading-relaxed">{log.details || "Sin detalles adicionales"}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div className="h-4 w-full"></div> {/* Espacio extra al final */}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                <ShieldAlert className="w-16 h-16 opacity-20 mb-4" />
                                <p className="text-sm font-black uppercase tracking-[0.2em]">No se registran acciones auditables</p>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-8 flex justify-end">
                        <Button onClick={() => onOpenChange(false)} className="bg-teal-600 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all">Cerrar Detalle</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function HistorySection() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [auditOpen, setAuditOpen] = useState(false);
    const [sortField, setSortField] = useState("scheduled_date");
    const [sortDirection, setSortDirection] = useState("desc");
    
    const [filters, setFilters] = useState({
        folio: "",
        patient: "",
        status: "all",
        trip_type: "all",
        start_date: "",
        end_date: ""
    });

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.folio) params.append("folio", filters.folio);
            if (filters.patient) params.append("patient_name", filters.patient);
            if (filters.status !== "all") params.append("status", filters.status);
            if (filters.trip_type !== "all") params.append("trip_type", filters.trip_type);
            if (filters.start_date) params.append("start_date", filters.start_date);
            if (filters.end_date) params.append("end_date", filters.end_date);

            const res = await api.get(`/trips/history?${params.toString()}`);
            setTrips(res.data || []);
        } catch (e) { 
            toast.error("Error al cargar historial"); 
        } finally { 
            setLoading(false); 
        }
    }, [filters]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const sortedTrips = [...trips].sort((a, b) => {
        let valA, valB;
        if (sortField === "scheduled_date") {
            valA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
            valB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
            return sortDirection === "asc" ? valA - valB : valB - valA;
        }

        if (sortField === "tracking_number") {
            valA = a.tracking_number || "";
            valB = b.tracking_number || "";
        } else if (sortField === "patient_name") {
            valA = (a.trip_type === "clinico" ? a.patient_name : a.task_details) || "";
            valB = (b.trip_type === "clinico" ? b.patient_name : b.task_details) || "";
        } else if (sortField === "origin") {
            valA = a.origin || "";
            valB = b.origin || "";
        } else if (sortField === "driver_name") {
            valA = a.driver_name || "";
            valB = b.driver_name || "";
        } else if (sortField === "status") {
            valA = a.status || "";
            valB = b.status || "";
        } else {
            return 0;
        }

        const comp = valA.localeCompare(valB, "es", { sensitivity: "base" });
        return sortDirection === "asc" ? comp : -comp;
    });

    const handleExportExcel = () => {
        if (sortedTrips.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        const dataToExport = sortedTrips.map(t => ({
            "Folio": t.tracking_number,
            "Tipo": t.trip_type === "clinico" ? "Clínico" : "No Clínico",
            "Paciente/Cometido": t.trip_type === "clinico" ? t.patient_name : t.task_details,
            "RUT": t.rut || "N/A",
            "Origen": t.origin,
            "Destino": t.destination,
            "Servicio Origen": t.patient_unit || "N/A",
            "Estado": (t.status || "").replace(/_/g, " ").toUpperCase(),
            "Conductor": t.driver_name || "No asignado",
            "Móvil": t.vehicle_plate || "N/A",
            "Fecha Programada": t.scheduled_date,
            "KM Inicial": t.start_mileage || 0,
            "KM Final": t.end_mileage || 0,
            "Distancia (KM)": (t.end_mileage && t.start_mileage) ? (t.end_mileage - t.start_mileage) : 0,
            "Creado el": new Date(t.created_at).toLocaleString(),
            "Finalizado el": t.completed_at ? new Date(t.completed_at).toLocaleString() : "N/A"
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Historial Traslados");
        XLSX.writeFile(wb, `Historial_Traslados_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Excel generado con éxito");
    };

    const clearFilters = () => {
        setFilters({ folio: "", patient: "", status: "all", trip_type: "all", start_date: "", end_date: "" });
    };

    const sColorsLocal = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800", revision_gestor: "bg-purple-100 text-purple-800" };

    const renderSortHeader = (field, label, className = "", centered = false) => {
        const isActive = sortField === field;
        return (
            <th 
                onClick={() => handleSort(field)} 
                className={`px-6 py-5 text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer select-none hover:bg-slate-200/50 hover:text-slate-900 transition-all duration-200 group ${className} ${centered ? "text-center" : ""}`}
            >
                <div className={`flex items-center gap-1.5 ${centered ? "justify-center" : ""}`}>
                    <span className="text-slate-500 group-hover:text-slate-800 transition-colors">{label}</span>
                    {isActive ? (
                        sortDirection === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-teal-600 transition-transform duration-200 shrink-0" />
                        ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-teal-600 transition-transform duration-200 shrink-0" />
                        )
                    ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-slate-600 transition-all shrink-0" />
                    )}
                </div>
            </th>
        );
    };

    return (
        <div className="animate-slide-up space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <History className="w-8 h-8 text-teal-600" />
                        Historial de Traslados
                    </h1>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1 ml-11">Consulta y Control Central de Movilizaciones</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 h-12 font-black uppercase tracking-widest shadow-lg flex items-center gap-2 flex-1 md:flex-none">
                        <FileDown className="w-5 h-5" />
                        Descargar .XLSX
                    </Button>
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Registros Encontrados</p>
                        <p className="text-lg font-black text-slate-900">{sortedTrips.length}</p>
                    </div>
                </div>
            </div>

            {/* Panel de Filtros */}
            <Card className="shadow-sm border-slate-200 bg-white/50 backdrop-blur-sm rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Search className="w-3 h-3" /> Folio</Label>
                            <Input placeholder="Ej: TR-2603..." className="h-10 text-xs font-bold uppercase rounded-xl border-slate-200" value={filters.folio} onChange={e => setFilters({...filters, folio: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><User className="w-3 h-3" /> Paciente</Label>
                            <Input placeholder="Buscar por nombre..." className="h-10 text-xs font-bold rounded-xl border-slate-200" value={filters.patient} onChange={e => setFilters({...filters, patient: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Filter className="w-3 h-3" /> Estado</Label>
                            <Select value={filters.status} onValueChange={v => setFilters({...filters, status: v})}>
                                <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 uppercase"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">TODOS LOS ESTADOS</SelectItem>
                                    <SelectItem value="revision_gestor">POR VISAR</SelectItem>
                                    <SelectItem value="pendiente">PENDIENTE</SelectItem>
                                    <SelectItem value="asignado">ASIGNADO</SelectItem>
                                    <SelectItem value="en_curso">RECORRIENDO</SelectItem>
                                    <SelectItem value="completado">COMPLETADO</SelectItem>
                                    <SelectItem value="cancelado">CANCELADO</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Stethoscope className="w-3 h-3" /> Tipo</Label>
                            <Select value={filters.trip_type} onValueChange={v => setFilters({...filters, trip_type: v})}>
                                <SelectTrigger className="h-10 text-xs font-bold rounded-xl border-slate-200 uppercase"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">TODOS LOS TIPOS</SelectItem>
                                    <SelectItem value="clinico">CLÍNICO</SelectItem>
                                    <SelectItem value="no_clinico">NO CLÍNICO</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Desde</Label>
                            <Input type="date" className="h-10 text-xs font-bold rounded-xl border-slate-200" value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})} />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Hasta</Label>
                            <div className="flex gap-2">
                                <Input type="date" className="h-10 text-xs font-bold rounded-xl border-slate-200 flex-1" value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})} />
                                <Button variant="ghost" size="icon" onClick={clearFilters} className="h-10 w-10 text-slate-400 hover:text-rose-500 transition-colors bg-white rounded-xl border border-slate-200 shrink-0"><RotateCcw className="w-4 h-4" /></Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            
            <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-100/70 border-b border-slate-200/60">
                                {renderSortHeader("tracking_number", "Folio", "w-[140px]")}
                                {renderSortHeader("patient_name", "Detalle Solicitud")}
                                {renderSortHeader("origin", "Trayecto Centralizado")}
                                {renderSortHeader("driver_name", "Responsable Operativo")}
                                {renderSortHeader("scheduled_date", "Estado / Fecha")}
                                <th className="px-6 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-20 text-center">
                                        <RefreshCw className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
                                        <p className="text-xs font-black text-teal-800 uppercase tracking-[0.3em]">Actualizando Historial...</p>
                                    </td>
                                </tr>
                            ) : sortedTrips.length > 0 ? (
                                sortedTrips.map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50/80 transition-all cursor-default group">
                                        <td className="px-6 py-5">
                                            <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all group-hover:bg-white">#{t.tracking_number}</span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-slate-900 text-sm leading-tight uppercase line-clamp-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                                            <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide flex items-center gap-1.5">
                                                {t.trip_type === "clinico" ? <Stethoscope className="w-3 h-3 text-teal-600" /> : <ClipboardList className="w-3 h-3 text-teal-600" />}
                                                {t.transfer_reason || "Gral."} 
                                                <span className="opacity-40 px-1.5">|</span> 
                                                RUT: {t.rut || "S/R"}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="space-y-1.5">
                                                <p className="text-xs font-semibold text-slate-700 flex items-center gap-2 max-w-[200px] truncate"><div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0"></div> {t.origin}</p>
                                                <p className="text-xs font-semibold text-slate-400 flex items-center gap-2 max-w-[200px] truncate"><ArrowRight className="w-3 h-3 shrink-0" /> {t.destination}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            {t.driver_name ? (
                                                <div className="bg-teal-50/30 p-2 rounded-xl border border-teal-100/50 w-fit min-w-[140px] flex items-center gap-3 group-hover:bg-white transition-colors">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-teal-100 shadow-sm shrink-0 text-teal-600">
                                                        {t.vehicle_type === "Ambulancia" ? <Siren className="w-4 h-4" /> : 
                                                         t.vehicle_type === "Van" ? <Bus className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                                                    </div>
                                                    <div className="truncate">
                                                        <p className="text-xs font-bold text-teal-800 uppercase leading-none mb-1 truncate">{t.driver_name}</p>
                                                        <p className="text-xs text-teal-600/70 font-semibold font-mono uppercase italic leading-none">{t.vehicle_plate || "Sin Móvil"}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-300 italic font-bold">No asignado</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <Badge className={`text-xs font-bold uppercase border-none px-2.5 py-1 rounded-full shadow-sm mb-2 ${sColorsLocal[t.status] || "bg-slate-100 text-slate-600"}`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                                            <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 leading-none">
                                                <CalendarDays className="w-3.5 h-3.5" />
                                                {t.scheduled_date ? formatScheduledDate(t.scheduled_date) : new Date(t.created_at).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-center">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon" 
                                                    className="w-10 h-10 rounded-xl border-slate-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-600 transition-all shadow-sm"
                                                    onClick={() => {
                                                        setSelectedTrip(t);
                                                        setAuditOpen(true);
                                                    }}
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="px-6 py-32 text-center bg-slate-50/30">
                                        <ClipboardList className="w-20 h-20 text-slate-200 mx-auto mb-4" />
                                        <p className="text-xl font-black text-slate-300 uppercase tracking-[0.3em]">Bóveda de Datos Vacía</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">Intente ajustando los filtros de búsqueda</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TripAuditDetailDialog 
                trip={selectedTrip} 
                open={auditOpen} 
                onOpenChange={setAuditOpen} 
            />
        </div>
    );
}

function LogbookMonitorSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicles, setVehicles] = useState([]);

  const fetchLogs = useCallback(async () => {
    try {
      const [lRes, vRes] = await Promise.all([
        api.get(`/logbook-list/all${filter !== "all" ? `?type=${filter}` : ""}`),
        api.get("/vehicles")
      ]);
      setLogs(lRes.data || []);
      setVehicles(vRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 20000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const getVehiclePlate = (id) => vehicles.find(v => v.id === id)?.plate || "N/A";

  const filteredLogs = logs.filter(log => {
    const plate = getVehiclePlate(log.vehicle_id).toLowerCase();
    const driver = (log.driver_name || "").toLowerCase();
    const desc = (log.description || "").toLowerCase();
    const type = (log.incident_type || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return plate.includes(search) || driver.includes(search) || desc.includes(search) || type.includes(search);
  });

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Consolidado de Bitácora</h1>
          <p className="text-slate-500 font-medium italic">Seguimiento en tiempo real de incidentes y recargas</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar patente, conductor..." 
              className="pl-10 h-11 bg-white border-2 border-slate-200 rounded-xl w-full md:w-64 focus:border-teal-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            {[
              { id: "all", label: "Todos", icon: ClipboardList },
              { id: "incident", label: "Incidentes", icon: AlertTriangle },
              { id: "fuel", label: "Combustible", icon: Droplets }
            ].map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === t.id ? "bg-teal-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="h-40 flex items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200"><RefreshCw className="w-8 h-8 text-slate-300 animate-spin" /></div>
        ) : filteredLogs.length === 0 ? (
          <Card className="rounded-[2rem] border-dashed border-2 p-12 text-center bg-white">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No se encontraron registros</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <Card key={log.id} className={`overflow-hidden rounded-3xl border-none shadow-sm transition-all hover:shadow-md ${log.type === "incident" ? "bg-amber-50" : "bg-emerald-50"}`}>
                <div className="flex flex-col md:flex-row">
                  <div className={`w-full md:w-32 p-4 flex md:flex-col items-center justify-center gap-2 text-center border-b md:border-b-0 md:border-r border-white/50 ${log.type === "incident" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}`}>
                    {log.type === "incident" ? <AlertTriangle className="w-8 h-8" /> : <Droplets className="w-8 h-8" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{log.type === "incident" ? "Incidente" : "Carga"}</span>
                  </div>
                  <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white/80 text-slate-900 border-none font-black text-xs px-3">{getVehiclePlate(log.vehicle_id)}</Badge>
                        <span className="text-xs font-bold text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      {log.type === "incident" ? (
                        <div>
                          <p className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2 italic uppercase">
                             <span className={`w-2 h-2 rounded-full ${log.severity === 'alta' ? 'bg-red-500 animate-pulse' : log.severity === 'media' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                             {log.incident_type}: Gravedad {log.severity}
                          </p>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed bg-white/50 p-3 rounded-xl border border-white">{log.description}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                          <div className="bg-white/50 p-2 rounded-xl border border-white">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Kilometraje</p>
                            <p className="text-sm font-black text-slate-900">{log.mileage} km</p>
                          </div>
                          <div className="bg-white/50 p-2 rounded-xl border border-white">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Litros</p>
                            <p className="text-sm font-black text-slate-900">{log.liters} L</p>
                          </div>
                          <div className="bg-white/50 p-2 rounded-xl border border-white">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Inversión</p>
                            <p className="text-sm font-black text-slate-900">${log.amount?.toLocaleString()}</p>
                          </div>
                          <div className="bg-white/50 p-2 rounded-xl border border-white">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Folio Boleta</p>
                            <p className="text-sm font-black text-slate-900">{log.receipt_number || "-"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Informado por</p>
                      <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-white">
                        <User className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-xs font-black text-slate-800">{log.driver_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      }
      </div>
    </div>
  );
}


