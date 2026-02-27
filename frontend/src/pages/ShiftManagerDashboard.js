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
import { ClipboardList, Users, Truck, Clock, AlertTriangle, RefreshCw, User, MapPin, ArrowRight, ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight, Search, Download, X as XIcon, Filter, Plus, Stethoscope, Activity, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import * as XLSX from "xlsx";
import api from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function ShiftManagerDashboard() {
  const [section, setSection] = useState("dispatch");
  return (
    <div className="min-h-screen bg-slate-50" data-testid="manager-dashboard">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {section === "new" && <NewTripSection />}
          {section === "dispatch" && <DispatchSection onNavigate={setSection} />}
          {section === "drivers" && <DriversSection />}
          {section === "vehicles" && <VehiclesSection />}
          {section === "byvehicle" && <ByVehicleSection />}
          {section === "assign" && <AssignSection />}
          {section === "calendar" && <CalendarSection />}
          {section === "history" && <HistorySection />}
        </div>
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
      const [s, p, a, h] = await Promise.all([
        api.get("/stats"), api.get("/trips/pool"), api.get("/trips/active"), api.get("/trips/history")
      ]);
      setStats(s.data); setPoolTrips(p.data); setActiveTrips(a.data.filter(t => t.driver_id));
      const last7Days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return d.toISOString().split('T')[0]; }).reverse(); 
      const trendData = last7Days.map(date => {
        const dateObj = new Date(date + "T00:00:00");
        const count = h.data.filter(t => (t.scheduled_date === date) || (t.created_at && t.created_at.startsWith(date))).length;
        return { name: `${dateObj.getDate()} ${dateObj.toLocaleString('es-ES', { month: 'short' })}`, traslados: count };
      });
      setTripsTrend(trendData);
    } catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); const interval = setInterval(fetchAll, 15000); return () => clearInterval(interval); }, [fetchAll]);

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800" };
  const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };
  const pieData = stats ? [{ name: 'Pendientes', value: stats.pending_trips, color: '#f59e0b' }, { name: 'Activos', value: stats.active_trips, color: '#3b82f6' }, { name: 'Completados', value: stats.completed_trips, color: '#10b981' }].filter(i => i.value > 0) : []; 

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Consola de Despacho</h1>
        <Button variant="outline" onClick={fetchAll} disabled={refreshing}><RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Actualizar</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[{ label: "Pendientes", value: stats.pending_trips, icon: Clock, color: "text-amber-600 bg-amber-50", nav: "assign" }, { label: "Activos", value: stats.active_trips, icon: Truck, color: "text-blue-600 bg-blue-50", nav: "assign" }, { label: "Conductores", value: stats.total_drivers, icon: Users, color: "text-teal-600 bg-teal-50", nav: "drivers" }, { label: "Vehículos Disp.", value: stats.vehicles_available, icon: Truck, color: "text-emerald-600 bg-emerald-50", nav: "vehicles" }].map(c => (
            <div key={c.label} className={`stat-card animate-slide-up ${c.nav ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" : ""}`} onClick={() => c.nav && onNavigate(c.nav)}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-slate-900">{c.value}</p><p className="text-xs text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-slate-200/60 p-1">
          <TabsTrigger value="live" className="text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white">Operación en Vivo</TabsTrigger>
          <TabsTrigger value="analytics" className="text-sm font-semibold data-[state=active]:bg-teal-600 data-[state=active]:text-white">Panel Analítico</TabsTrigger>
        </TabsList>
        <TabsContent value="live" className="outline-none animate-slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Bolsa de Trabajo ({poolTrips.length})</CardTitle><Button variant="ghost" size="sm" className="text-xs text-teal-600" onClick={() => onNavigate("assign")}>Asignar →</Button></div></CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                {poolTrips.map(t => (<div key={t.id} className="p-4 bg-white rounded-lg border shadow-sm"><div className="flex justify-between mb-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span><span className="text-xs text-slate-400">{t.scheduled_date}</span></div><p className="font-medium text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p><p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-500"/> {t.origin} <ArrowRight className="w-3 h-3 mx-1" /> {t.destination}</p></div>))}
                {poolTrips.length === 0 && <p className="text-center py-8 text-slate-400">Sin viajes pendientes</p>}
              </CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" />Viajes Activos ({activeTrips.length})</CardTitle></CardHeader>
              <CardContent className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                {activeTrips.map(t => (<div key={t.id} className="p-4 bg-white rounded-lg border shadow-sm"><div className="flex justify-between mb-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span><span className="text-xs bg-slate-100 px-2 py-1 rounded-md"><User className="w-3 h-3 inline mr-1" />{t.driver_name}</span></div><p className="font-medium text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p><p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-500"/> {t.origin} <ArrowRight className="w-3 h-3 mx-1" /> {t.destination}</p></div>))}
                {activeTrips.length === 0 && <p className="text-center py-8 text-slate-400">Sin viajes activos</p>}
              </CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="outline-none animate-slide-up">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-md"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-teal-600" />Traslados últimos 7 días</CardTitle></CardHeader>
              <CardContent><div className="h-[300px] w-full mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={tripsTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} /><RechartsTooltip cursor={{ fill: '#f1f5f9' }}/><Bar dataKey="traslados" fill="#0d9488" radius={[4, 4, 0, 0]} name="Viajes" /></BarChart></ResponsiveContainer></div></CardContent></Card>
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

function NewTripSection() {
  const [destinations, setDestinations] = useState([]);
  const [tripType, setTripType] = useState("clinico");
  
  const [form, setForm] = useState({
    origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
    scheduled_date: new Date().toISOString().split("T")[0],
    rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
    requester_person: "", attending_physician: "", appointment_time: "", departure_time: "",
    required_personnel: [], patient_requirements: [], accompaniment: "",
    task_details: "", staff_count: ""
  });

  const [useCustomOrigin, setUseCustomOrigin] = useState(false);
  const [useCustomDest, setUseCustomDest] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/destinations").then(r => setDestinations(r.data)).catch(() => {}); }, []);

  const personnelOptions = ["Tens", "Matron (a)", "Enfermero (a)", "Kinesiólogo (a)", "Fonoaudiólogo (a)", "Medico", "Terapeuta ocupacional"];
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalOrigin = useCustomOrigin ? form.origin : form.origin;
    const finalDest = useCustomDest ? form.destination : form.destination;

    if (tripType === "clinico") {
      if (!form.patient_name || !form.patient_unit || !form.transfer_reason || !form.requester_person || !form.appointment_time || !finalOrigin || !finalDest) {
        toast.error("Complete todos los campos obligatorios del traslado clínico"); return;
      }
    } else {
      if (!finalOrigin || !finalDest || !form.task_details || !form.staff_count) {
        toast.error("Complete Origen, Destino, Cometido y Cantidad de funcionarios"); return;
      }
    }

    setLoading(true);
    try {
      await api.post("/trips", { ...form, origin: finalOrigin, destination: finalDest, trip_type: tripType });
      toast.success("Solicitud creada exitosamente");
      setForm({
        origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
        scheduled_date: new Date().toISOString().split("T")[0], rut: "", age: "", diagnosis: "", weight: "", bed: "",
        transfer_reason: "", requester_person: "", attending_physician: "", appointment_time: "", departure_time: "",
        required_personnel: [], patient_requirements: [], accompaniment: "", task_details: "", staff_count: ""
      });
    } catch (e) { toast.error("Error al crear solicitud"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Programar Nuevo Traslado</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => setTripType("clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tripType === "clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white"}`}><Stethoscope className="w-6 h-6" /><span className="font-bold">Clínico</span></button>
        <button onClick={() => setTripType("no_clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tripType === "no_clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white"}`}><Truck className="w-6 h-6" /><span className="font-bold">No Clínico</span></button>
      </div>

      <Card className="shadow-lg border-t-4 border-t-teal-500">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
            
            {tripType === "clinico" && (
              <>
                <div className="space-y-4">
                  <h3 className="font-bold text-teal-800 border-b pb-2 flex items-center gap-2"><User className="w-5 h-5"/> Datos del Paciente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Nombre Paciente *</Label><Input value={form.patient_name} onChange={e=>setForm({...form, patient_name: e.target.value})} /></div>
                    <div className="space-y-1"><Label>RUT</Label><Input value={form.rut} onChange={e=>setForm({...form, rut: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Edad</Label><Input value={form.age} onChange={e=>setForm({...form, age: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Peso</Label><Input value={form.weight} onChange={e=>setForm({...form, weight: e.target.value})} /></div>
                    <div className="space-y-1 md:col-span-2"><Label>Diagnóstico</Label><Input value={form.diagnosis} onChange={e=>setForm({...form, diagnosis: e.target.value})} /></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-teal-800 border-b pb-2 flex items-center gap-2"><Activity className="w-5 h-5"/> Detalles Médicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Quien solicita traslado *</Label><Input value={form.requester_person} onChange={e=>setForm({...form, requester_person: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Médico Tratante</Label><Input value={form.attending_physician} onChange={e=>setForm({...form, attending_physician: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Motivo Traslado *</Label><Select value={form.transfer_reason} onValueChange={v=>setForm({...form, transfer_reason: v})}><SelectTrigger><SelectValue placeholder="Seleccione"/></SelectTrigger><SelectContent>{reasonOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                </div>
              </>
            )}

            {tripType === "no_clinico" && (
              <div className="space-y-4">
                <h3 className="font-bold text-teal-800 border-b pb-2">Detalle del Cometido</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2"><Label>Cometido (Motivo) *</Label><Input value={form.task_details} onChange={e=>setForm({...form, task_details: e.target.value})} /></div>
                  <div className="space-y-1"><Label>Cantidad Funcionarios *</Label><Input type="number" min="1" value={form.staff_count} onChange={e=>setForm({...form, staff_count: e.target.value})} /></div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-bold text-teal-800 border-b pb-2 flex items-center gap-2"><MapPin className="w-5 h-5"/> Ubicación y Tiempos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Origen *</Label>{!useCustomOrigin ? <Select onValueChange={v => v==="otro" ? setUseCustomOrigin(true) : setForm({...form, origin: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{destinations.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input placeholder="Origen" value={form.origin} onChange={e=>setForm({...form, origin: e.target.value})} onDoubleClick={()=>setUseCustomOrigin(false)}/>}</div>
                <div className="space-y-1"><Label>Destino *</Label>{!useCustomDest ? <Select onValueChange={v => v==="otro" ? setUseCustomDest(true) : setForm({...form, destination: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{destinations.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input placeholder="Destino" value={form.destination} onChange={e=>setForm({...form, destination: e.target.value})} onDoubleClick={()=>setUseCustomDest(false)}/>}</div>
                {tripType === "clinico" && (
                  <>
                    <div className="space-y-1"><Label>Unidad/Servicio *</Label><Input value={form.patient_unit} onChange={e=>setForm({...form, patient_unit: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e=>setForm({...form, bed: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Hora Citación *</Label><Input type="time" value={form.appointment_time} onChange={e=>setForm({...form, appointment_time: e.target.value})} /></div>
                  </>
                )}
                <div className="space-y-1"><Label>Fecha Traslado</Label><Input type="date" value={form.scheduled_date} onChange={e=>setForm({...form, scheduled_date: e.target.value})} /></div>
                <div className="space-y-1"><Label>Hora Salida</Label><Input type="time" value={form.departure_time} onChange={e=>setForm({...form, departure_time: e.target.value})} /></div>
              </div>
            </div>

            {tripType === "clinico" && (
              <div className="space-y-6">
                <h3 className="font-bold text-teal-800 border-b pb-2">Requerimientos</h3>
                <div className="space-y-2"><Label>Personal *</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">{personnelOptions.map(o => (<label key={o} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.required_personnel.includes(o)} onChange={()=>handleCheckbox("required_personnel", o)} className="w-4 h-4 text-teal-600 rounded" /> {o}</label>))}</div></div>
                <div className="space-y-2"><Label>Requerimientos Paciente *</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">{requirementOptions.map(o => (<label key={o} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.patient_requirements.includes(o)} onChange={()=>handleCheckbox("patient_requirements", o)} className="w-4 h-4 text-teal-600 rounded" /> {o}</label>))}</div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Acompañamiento</Label><Select value={form.accompaniment} onValueChange={v=>setForm({...form, accompaniment: v})}><SelectTrigger><SelectValue placeholder="Ninguno"/></SelectTrigger><SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{accompanimentOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-1"><Label>Prioridad</Label><Select value={form.priority} onValueChange={v=>setForm({...form, priority: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 h-14 text-lg" disabled={loading}>Guardar Solicitud</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function HistorySection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: "", driver_name: "", origin: "", destination: "",
    trip_type: "", priority: "", date_from: "", date_to: "", search: ""
  });

  const fetchHistory = useCallback(async () => {
    try { const r = await api.get("/trips/history"); setTrips(r.data); }
    catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const statusLabels = { pendiente: "Pendiente", asignado: "Asignado", en_curso: "En Curso", completado: "Completado", cancelado: "Cancelado" };
  const typeLabels = { clinico: "Clínico", no_clinico: "No Clínico" };
  const priorityLabels = { normal: "Normal", alta: "Alta", urgente: "Urgente" };
  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

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
      const fields = [t.patient_name, t.task_details, t.origin, t.destination, t.driver_name, t.requester_name, t.notes, t.clinical_team, t.contact_person, t.rut, t.diagnosis].filter(Boolean);
      if (!fields.some(f => f.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const clearFilters = () => setFilters({ status: "", driver_name: "", origin: "", destination: "", trip_type: "", priority: "", date_from: "", date_to: "", search: "" });
  const activeFilterCount = Object.values(filters).filter(v => v).length;

  const formatDateTime = (iso) => {
    if (!iso) return "-";
    try { const d = new Date(iso); return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };

  const exportToExcel = () => {
    const data = filtered.map(t => ({
      "Estado": statusLabels[t.status] || t.status,
      "Tipo": typeLabels[t.trip_type] || t.trip_type || "General",
      "Prioridad": priorityLabels[t.priority] || t.priority,
      "Paciente/Cometido": t.trip_type === "clinico" ? t.patient_name : t.task_details,
      "RUT": t.rut || "",
      "Edad": t.age || "",
      "Diagnóstico": t.diagnosis || "",
      "Motivo Clínico": t.transfer_reason || "",
      "Origen": t.origin,
      "Destino": t.destination,
      "Unidad/Servicio": t.patient_unit || "",
      "Cama": t.bed || "",
      "Fecha Programada": t.scheduled_date || "",
      "Hora Citación": t.appointment_time || "",
      "Hora Salida": t.departure_time || "",
      "Conductor": t.driver_name || "Sin asignar",
      "Vehículo": t.vehicle_plate || "",
      "Solicitante": t.requester_name || "",
      "Médico Tratante": t.attending_physician || "",
      "Personal Requerido": t.required_personnel ? t.required_personnel.join(", ") : "",
      "Requerimientos Paciente": t.patient_requirements ? t.patient_requirements.join(", ") : "",
      "Acompañamiento": t.accompaniment || "",
      "Cant. Funcionarios": t.staff_count || "",
      "KM Inicio": t.start_mileage != null ? t.start_mileage : "",
      "KM Final": t.end_mileage != null ? t.end_mileage : "",
      "KM Recorridos": (t.start_mileage != null && t.end_mileage != null) ? t.end_mileage - t.start_mileage : "",
      "Notas": t.notes || "",
      "Fecha Creación": formatDateTime(t.created_at),
      "Fecha Completado": formatDateTime(t.completed_at),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length + 2, 15) }));
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Historial Traslados");
    XLSX.writeFile(wb, `historial_traslados_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Archivo Excel descargado");
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando historial...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Historial de Traslados</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4 mr-2" />Filtros {activeFilterCount > 0 && <span className="ml-1 bg-teal-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">{activeFilterCount}</span>}
          </Button>
          <Button onClick={exportToExcel} className="bg-teal-600 hover:bg-teal-700 text-white" disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-2" />Exportar Excel
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por paciente, cometido, conductor, origen, destino, RUT..." className="pl-10 h-11"
          value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} />
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card className="mb-4 animate-slide-up">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={filters.status} onValueChange={v => setFilters({ ...filters, status: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={filters.trip_type} onValueChange={v => setFilters({ ...filters, trip_type: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prioridad</Label>
                <Select value={filters.priority} onValueChange={v => setFilters({ ...filters, priority: v === "all" ? "" : v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(priorityLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Conductor</Label>
                <Input className="h-9 text-xs" placeholder="Nombre conductor" value={filters.driver_name}
                  onChange={e => setFilters({ ...filters, driver_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Origen</Label>
                <Input className="h-9 text-xs" placeholder="Buscar origen" value={filters.origin}
                  onChange={e => setFilters({ ...filters, origin: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destino</Label>
                <Input className="h-9 text-xs" placeholder="Buscar destino" value={filters.destination}
                  onChange={e => setFilters({ ...filters, destination: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="date" className="h-9 text-xs" value={filters.date_from}
                  onChange={e => setFilters({ ...filters, date_from: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" className="h-9 text-xs" value={filters.date_to}
                  onChange={e => setFilters({ ...filters, date_to: e.target.value })} />
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-slate-500">
                  <XIcon className="w-3 h-3 mr-1" />Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-slate-500 mb-3">Mostrando {filtered.length} de {trips.length} traslados</p>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Estado</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead><TableHead>Detalle</TableHead><TableHead>Origen</TableHead><TableHead>Destino</TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.map(t => (
              <TableRow key={t.id}
