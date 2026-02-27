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
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen">
        {section === "new" && <NewTripSection />}
        {section === "dispatch" && <DispatchSection onNavigate={setSection} />}
        {section === "drivers" && <DriversSection />}
        {section === "vehicles" && <VehiclesSection />}
        {section === "byvehicle" && <ByVehicleSection />}
        {section === "assign" && <AssignSection />}
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
      const [s, p, a, h] = await Promise.all([ api.get("/stats"), api.get("/trips/pool"), api.get("/trips/active"), api.get("/trips/history") ]);
      setStats(s.data); setPoolTrips(p.data); setActiveTrips(a.data.filter(t => t.driver_id));
      const trendData = [...Array(7)].map((_, i) => { 
        const d = new Date(); d.setDate(d.getDate() - i); const date = d.toISOString().split('T')[0];
        const count = h.data.filter(t => (t.scheduled_date === date) || (t.created_at && t.created_at.startsWith(date))).length;
        return { name: `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })}`, traslados: count };
      }).reverse();
      setTripsTrend(trendData);
    } catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); const interval = setInterval(fetchAll, 15000); return () => clearInterval(interval); }, [fetchAll]);

  const pColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };
  const pieData = stats ? [{ name: 'Pendientes', value: stats.pending_trips, color: '#f59e0b' }, { name: 'Activos', value: stats.active_trips, color: '#3b82f6' }, { name: 'Completados', value: stats.completed_trips, color: '#10b981' }].filter(i => i.value > 0) : []; 

  return (
    <div>
      <div className="flex justify-between mb-6"><h1 className="text-3xl font-bold text-slate-900">Consola de Despacho</h1><Button variant="outline" onClick={fetchAll} disabled={refreshing}><RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Actualizar</Button></div>
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[{ l: "Pendientes", v: stats.pending_trips, i: Clock, c: "text-amber-600 bg-amber-50", n: "assign" }, { l: "Activos", v: stats.active_trips, i: Truck, c: "text-blue-600 bg-blue-50", n: "assign" }, { l: "Conductores", v: stats.total_drivers, i: Users, c: "text-teal-600 bg-teal-50", n: "drivers" }, { l: "Vehículos", v: stats.vehicles_available, i: Truck, c: "text-emerald-600 bg-emerald-50", n: "vehicles" }].map(c => (
            <div key={c.l} className="stat-card cursor-pointer hover:shadow-lg transition-all" onClick={() => c.n && onNavigate(c.n)}><div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.c}`}><c.i className="w-5 h-5" /></div><p className="text-2xl font-bold">{c.v}</p><p className="text-xs text-slate-500">{c.l}</p></div>
          ))}
        </div>
      )}
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6"><TabsTrigger value="live">Operación en Vivo</TabsTrigger><TabsTrigger value="analytics">Panel Analítico</TabsTrigger></TabsList>
        <TabsContent value="live">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card><CardHeader className="pb-3"><div className="flex justify-between"><CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Bolsa ({poolTrips.length})</CardTitle><Button variant="ghost" size="sm" className="text-teal-600" onClick={() => onNavigate("assign")}>Asignar →</Button></div></CardHeader><CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                {poolTrips.map(t => (<div key={t.id} className="p-4 bg-white rounded-lg border shadow-sm"><div className="flex justify-between mb-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pColors[t.priority] || pColors.normal}`}>{t.priority}</span><span className="text-xs text-slate-400">{t.scheduled_date}</span></div><p className="font-medium text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p><p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-500"/> {t.origin} <ArrowRight className="w-3 h-3 mx-1" /> {t.destination}</p></div>))}
            </CardContent></Card>
            <Card><CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" />Activos ({activeTrips.length})</CardTitle></CardHeader><CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
                {activeTrips.map(t => (<div key={t.id} className="p-4 bg-white rounded-lg border shadow-sm"><div className="flex justify-between mb-2"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">{t.status.replace(/_/g, " ")}</span><span className="text-xs bg-slate-100 px-2 py-1 rounded-md"><User className="w-3 h-3 inline mr-1" />{t.driver_name}</span></div><p className="font-medium text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p><p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-500"/> {t.origin} <ArrowRight className="w-3 h-3 mx-1" /> {t.destination}</p></div>))}
            </CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-md"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-teal-600" />Últimos 7 días</CardTitle></CardHeader><CardContent><div className="h-[300px] w-full mt-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={tripsTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} /><RechartsTooltip cursor={{ fill: '#f1f5f9' }}/><Bar dataKey="traslados" fill="#0d9488" radius={[4, 4, 0, 0]} name="Viajes" /></BarChart></ResponsiveContainer></div></CardContent></Card>
            <Card className="shadow-md"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-teal-600" />Estado</CardTitle></CardHeader><CardContent className="flex flex-col items-center justify-center">{pieData.length > 0 ? (<div className="h-[240px] w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{pieData.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie><RechartsTooltip /></PieChart></ResponsiveContainer></div>) : (<div className="h-[240px] flex items-center justify-center text-slate-400">Sin datos</div>)}</CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewTripSection() {
  const [destinations, setDestinations] = useState([]);
  const [tripType, setTripType] = useState("clinico");
  const [f, setF] = useState({ origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "", scheduled_date: new Date().toISOString().split("T")[0], rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "", requester_person: "", attending_physician: "", appointment_time: "", departure_time: "", required_personnel: [], patient_requirements: [], accompaniment: "ninguno", task_details: "", staff_count: "" });
  const [useCO, setUseCO] = useState(false);
  const [useCD, setUseCD] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/destinations").then(r => setDestinations(r.data)).catch(() => {}); }, []);
  const pOpt = ["Tens", "Matron (a)", "Enfermero (a)", "Kinesiólogo (a)", "Fonoaudiólogo (a)", "Medico", "Terapeuta ocupacional"];
  const rOpt = ["Camilla", "Incubadora", "Silla de rueda", "Oxigeno", "Monitor", "Aislamiento Aéreo", "Aislamiento Contacto", "Aislamiento Protector", "Dependiente severo"];
  const tOpt = ["Examen", "Hospitalización", "Dialisis", "Rescate", "Alta", "Procedimiento"];

  const handleCB = (field, val) => { setF(p => ({ ...p, [field]: p[field].includes(val) ? p[field].filter(i => i !== val) : [...p[field], val] })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tripType === "clinico" && (!f.patient_name || !f.patient_unit || !f.transfer_reason || !f.requester_person || !f.appointment_time || (!useCO && !f.origin) || (!useCD && !f.destination))) { toast.error("Complete campos obligatorios clínicos"); return; }
    if (tripType === "no_clinico" && ((!useCO && !f.origin) || (!useCD && !f.destination) || !f.task_details || !f.staff_count)) { toast.error("Complete Origen, Destino, Cometido y Funcionarios"); return; }
    setLoading(true);
    try {
      await api.post("/trips", { ...f, trip_type: tripType });
      toast.success("Solicitud creada");
      setF({ origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "", scheduled_date: new Date().toISOString().split("T")[0], rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "", requester_person: "", attending_physician: "", appointment_time: "", departure_time: "", required_personnel: [], patient_requirements: [], accompaniment: "ninguno", task_details: "", staff_count: "" });
    } catch (err) { toast.error("Error al crear"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Programar Nuevo Traslado</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => setTripType("clinico")} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${tripType === "clinico" ? "border-teal-500 bg-teal-50 text-teal-800" : "border-slate-200"}`}><Stethoscope className="w-6 h-6" /><span className="font-bold">Clínico</span></button>
        <button onClick={() => setTripType("no_clinico")} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${tripType === "no_clinico" ? "border-teal-500 bg-teal-50 text-teal-800" : "border-slate-200"}`}><Truck className="w-6 h-6" /><span className="font-bold">No Clínico</span></button>
      </div>
      <Card className="border-t-4 border-t-teal-500"><CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {tripType === "clinico" && (
            <><h3 className="font-bold text-teal-800 border-b pb-2 flex items-center gap-2"><User className="w-5 h-5"/> Datos Paciente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Nombre *</Label><Input value={f.patient_name} onChange={e=>setF({...f, patient_name: e.target.value})} /></div><div className="space-y-1"><Label>RUT</Label><Input value={f.rut} onChange={e=>setF({...f, rut: e.target.value})} /></div><div className="space-y-1"><Label>Edad</Label><Input value={f.age} onChange={e=>setF({...f, age: e.target.value})} /></div><div className="space-y-1"><Label>Peso</Label><Input value={f.weight} onChange={e=>setF({...f, weight: e.target.value})} /></div><div className="space-y-1 md:col-span-2"><Label>Diagnóstico</Label><Input value={f.diagnosis} onChange={e=>setF({...f, diagnosis: e.target.value})} /></div></div>
              <h3 className="font-bold text-teal-800 border-b pb-2 mt-6 flex items-center gap-2"><Activity className="w-5 h-5"/> Detalles Médicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Solicitante *</Label><Input value={f.requester_person} onChange={e=>setF({...f, requester_person: e.target.value})} /></div><div className="space-y-1"><Label>Médico Tratante</Label><Input value={f.attending_physician} onChange={e=>setF({...f, attending_physician: e.target.value})} /></div><div className="space-y-1"><Label>Motivo *</Label><Select value={f.transfer_reason} onValueChange={v=>setF({...f, transfer_reason: v})}><SelectTrigger><SelectValue placeholder="Seleccione"/></SelectTrigger><SelectContent>{tOpt.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div></div></>
          )}
          {tripType === "no_clinico" && (
            <><h3 className="font-bold text-teal-800 border-b pb-2">Detalle Cometido</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1 md:col-span-2"><Label>Cometido *</Label><Input value={f.task_details} onChange={e=>setF({...f, task_details: e.target.value})} /></div><div className="space-y-1"><Label>Cantidad Funcionarios *</Label><Input type="number" min="1" value={f.staff_count} onChange={e=>setF({...f, staff_count: e.target.value})} /></div></div></>
          )}
          <h3 className="font-bold text-teal-800 border-b pb-2 mt-6 flex items-center gap-2"><MapPin className="w-5 h-5"/> Ubicación y Tiempos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Origen *</Label>{!useCO?<Select onValueChange={v=>v==="otro"?setUseCO(true):setF({...f, origin: v})}><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent>{destinations.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select>:<Input placeholder="Origen" value={f.origin} onChange={e=>setF({...f, origin: e.target.value})} onDoubleClick={()=>setUseCO(false)}/>}</div><div className="space-y-1"><Label>Destino *</Label>{!useCD?<Select onValueChange={v=>v==="otro"?setUseCD(true):setF({...f, destination: v})}><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent>{destinations.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select>:<Input placeholder="Destino" value={f.destination} onChange={e=>setF({...f, destination: e.target.value})} onDoubleClick={()=>setUseCD(false)}/>}</div>
          {tripType === "clinico" && (<><div className="space-y-1"><Label>Unidad/Servicio *</Label><Input value={f.patient_unit} onChange={e=>setF({...f, patient_unit: e.target.value})} /></div><div className="space-y-1"><Label>Cama</Label><Input value={f.bed} onChange={e=>setF({...f, bed: e.target.value})} /></div><div className="space-y-1"><Label>Hora Citación *</Label><Input type="time" value={f.appointment_time} onChange={e=>setF({...f, appointment_time: e.target.value})} /></div></>)}
          <div className="space-y-1"><Label>Fecha Traslado</Label><Input type="date" value={f.scheduled_date} onChange={e=>setF({...f, scheduled_date: e.target.value})} /></div><div className="space-y-1"><Label>Hora Salida</Label><Input type="time" value={f.departure_time} onChange={e=>setF({...f, departure_time: e.target.value})} /></div></div>
          {tripType === "clinico" && (
            <><h3 className="font-bold text-teal-800 border-b pb-2 mt-6">Requerimientos</h3><div className="space-y-2"><Label>Personal *</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">{pOpt.map(o => (<label key={o} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.required_personnel.includes(o)} onChange={()=>handleCB("required_personnel", o)} className="w-4 h-4 text-teal-600 rounded" /> {o}</label>))}</div></div><div className="space-y-2"><Label>Req. Paciente *</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">{rOpt.map(o => (<label key={o} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.patient_requirements.includes(o)} onChange={()=>handleCB("patient_requirements", o)} className="w-4 h-4 text-teal-600 rounded" /> {o}</label>))}</div></div>
            <div className="grid grid-cols-2 gap-4"><div className="space-y-1"><Label>Acompañamiento</Label><Select value={f.accompaniment} onValueChange={v=>setF({...f, accompaniment: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ninguno">Ninguno</SelectItem><SelectItem value="Materno">Materno</SelectItem><SelectItem value="Tutor">Tutor</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Prioridad</Label><Select value={f.priority} onValueChange={v=>setF({...f, priority: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div></div></>
          )}
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 h-14 text-lg" disabled={loading}>Guardar Solicitud</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}

function HistorySection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ status: "", driver_name: "", origin: "", destination: "", trip_type: "", priority: "", date_from: "", date_to: "", search: "" });

  useEffect(() => { api.get("/trips/history").then(r => setTrips(r.data)).catch(()=>{}).finally(()=>setLoading(false)); }, []);

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
      const fields = [t.patient_name, t.task_details, t.origin, t.destination, t.driver_name, t.rut, t.diagnosis];
      if (!fields.some(f => f && f.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const expXL = () => {
    const data = filtered.map(t => ({
      "Estado": sLabels[t.status] || t.status, "Tipo": t.trip_type==="clinico"?"Clínico":"No Clínico", "Prioridad": t.priority,
      "Paciente/Cometido": t.trip_type === "clinico" ? t.patient_name : t.task_details, "RUT": t.rut || "", "Edad": t.age || "", "Diagnóstico": t.diagnosis || "",
      "Motivo Clínico": t.transfer_reason || "", "Origen": t.origin, "Destino": t.destination, "Unidad/Servicio": t.patient_unit || "", "Cama": t.bed || "",
      "Fecha Programada": t.scheduled_date || "", "Hora Citación": t.appointment_time || "", "Hora Salida": t.departure_time || "",
      "Conductor": t.driver_name || "Sin asignar", "Vehículo": t.vehicle_plate || "", "Solicitante": t.requester_name || "", "Médico": t.attending_physician || "",
      "Personal Req": t.required_personnel?.join(", ") || "", "Req Paciente": t.patient_requirements?.join(", ") || "", "Acompañamiento": t.accompaniment || "", "Cant Func.": t.staff_count || "",
      "KM Inicio": t.start_mileage||"", "KM Final": t.end_mileage||"", "KM Recorrido": (t.start_mileage&&t.end_mileage)?t.end_mileage-t.start_mileage:""
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), ws, "Historial"), `historial_traslados.xlsx`);
  };

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando historial...</div>;
  return (
    <div>
      <div className="flex justify-between mb-4 flex-wrap gap-3"><h1 className="text-3xl font-bold">Historial</h1><div className="flex gap-2"><Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="w-4 h-4 mr-2" />Filtros</Button><Button onClick={expXL} className="bg-teal-600 text-white"><Download className="w-4 h-4 mr-2" />Excel</Button></div></div>
      <div className="relative mb-4"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><Input placeholder="Buscar por paciente, cometido, conductor, RUT..." className="pl-10" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} /></div>
      {showFilters && (
        <Card className="mb-4"><CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="space-y-1"><Label className="text-xs">Estado</Label><Select onValueChange={v => setFilters({ ...filters, status: v === "all" ? "" : v })}><SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="asignado">Asignado</SelectItem><SelectItem value="en_curso">En Curso</SelectItem><SelectItem value="completado">Completado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Tipo</Label><Select onValueChange={v => setFilters({ ...filters, trip_type: v === "all" ? "" : v })}><SelectTrigger className="h-9"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="clinico">Clínico</SelectItem><SelectItem value="no_clinico">No Clínico</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs">Desde</Label><Input type="date" className="h-9" onChange={e => setFilters({ ...filters, date_from: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Hasta</Label><Input type="date" className="h-9" onChange={e => setFilters({ ...filters, date_to: e.target.value })} /></div>
          <div className="flex items-end"><Button variant="ghost" size="sm" onClick={()=>setFilters({status:"",driver_name:"",origin:"",destination:"",trip_type:"",priority:"",date_from:"",date_to:"",search:""})}><XIcon className="w-3 h-3 mr-1" />Limpiar</Button></div>
        </CardContent></Card>
      )}
      <Card><CardContent className="p-0 overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Estado</TableHead><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead><TableHead>Detalle</TableHead><TableHead>Origen</TableHead><TableHead>Destino</TableHead></TableRow></TableHeader>
        <TableBody>
          {filtered.map(t => (
            <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelectedTrip(t)}>
              <TableCell><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${sColors[t.status]}`}>{sLabels[t.status]}</span></TableCell>
              <TableCell className="text-xs">{t.trip_type==="clinico"?"Clínico":"No Clínico"}</TableCell>
              <TableCell className="text-xs">{t.scheduled_date}</TableCell>
              <TableCell className="text-xs font-medium max-w-[200px] truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</TableCell>
              <TableCell className="text-xs">{t.origin}</TableCell>
              <TableCell className="text-xs">{t.destination}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalle Completo</DialogTitle></DialogHeader>
          {selectedTrip && (
            <div className="space-y-4 text-sm">
              <div className="flex gap-2 mb-2"><Badge>{selectedTrip.status}</Badge><Badge variant="outline">{selectedTrip.trip_type==="clinico"?"Clínico":"No Clínico"}</Badge></div>
              {selectedTrip.trip_type === "clinico" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border"><div><p className="text-xs text-slate-500">Paciente</p><p className="font-bold">{selectedTrip.patient_name}</p></div><div><p className="text-xs text-slate-500">RUT</p><p className="font-bold">{selectedTrip.rut || "-"}</p></div><div><p className="text-xs text-slate-500">Edad / Peso</p><p className="font-bold">{selectedTrip.age || "-"} / {selectedTrip.weight || "-"}</p></div><div><p className="text-xs text-slate-500">Diagnóstico</p><p className="font-bold">{selectedTrip.diagnosis || "-"}</p></div></div>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border"><div><p className="text-xs text-slate-500">Motivo</p><p className="font-bold">{selectedTrip.transfer_reason}</p></div><div><p className="text-xs text-slate-500">Médico</p><p className="font-bold">{selectedTrip.attending_physician || "-"}</p></div><div className="col-span-2"><p className="text-xs text-slate-500">Solicitante Clínico</p><p className="font-bold">{selectedTrip.requester_person}</p></div></div>
                  <div className="bg-teal-50 p-3 rounded-lg border border-teal-100">{selectedTrip.required_personnel?.length > 0 && <div className="mb-2"><p className="text-xs text-teal-700 font-bold">Personal</p><p>{selectedTrip.required_personnel.join(", ")}</p></div>}{selectedTrip.patient_requirements?.length > 0 && <div><p className="text-xs text-teal-700 font-bold">Requerimientos</p><p>{selectedTrip.patient_requirements.join(", ")}</p></div>}</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border"><div className="col-span-2"><p className="text-xs text-slate-500">Cometido</p><p className="font-bold">{selectedTrip.task_details}</p></div><div><p className="text-xs text-slate-500">Funcionarios</p><p className="font-bold">{selectedTrip.staff_count}</p></div></div>
              )}
              <div className="grid grid-cols-2 gap-2 border-t pt-3"><div><p className="text-xs text-slate-500">Origen / Unidad / Cama</p><p className="font-bold">{selectedTrip.origin} - {selectedTrip.patient_unit||""} {selectedTrip.bed?`(Cama ${selectedTrip.bed})`:""}</p></div><div><p className="text-xs text-slate-500">Destino</p><p className="font-bold">{selectedTrip.destination}</p></div><div><p className="text-xs text-slate-500">Hora Citación / Salida</p><p className="font-bold text-red-600">{selectedTrip.appointment_time||"-"} / {selectedTrip.departure_time||"-"}</p></div></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function VehiclesSection() {
  const [vehicles, setVehicles] = useState([]);
  useEffect(() => { api.get("/vehicles").then(r => setVehicles(r.data)).catch(()=>{}); }, []);
  return <div><h1 className="text-2xl font-bold mb-4">Flota</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{vehicles.map(v => <Card key={v.id}><CardContent className="p-4"><p className="font-bold">{v.plate}</p><p className="text-sm">{v.brand} - {v.model}</p><p className="text-xs text-slate-500">Estado: {v.status}</p></CardContent></Card>)}</div></div>;
}

function DriversSection() {
  const [drivers, setDrivers] = useState([]);
  useEffect(() => { api.get("/drivers").then(r => setDrivers(r.data)).catch(()=>{}); }, []);
  return <div><h1 className="text-2xl font-bold mb-4">Conductores</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{drivers.map(d => <Card key={d.id}><CardContent className="p-4"><p className="font-bold">{d.name}</p><p className="text-sm">{d.email}</p>{d.extra_available && <Badge className="mt-2">Disponible Extra</Badge>}</CardContent></Card>)}</div></div>;
}

function AssignSection() {
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [filter, setFilter] = useState("all");
  const [cancelDialog, setCancelDialog] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

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
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAssign = async () => {
    if (!selectedDriver) { toast.error("Seleccione un conductor"); return; }
    try {
      await api.put(`/trips/${assignDialog.id}/manager-assign`, { driver_id: selectedDriver, vehicle_id: selectedVehicle || null });
      toast.success("Viaje asignado exitosamente"); setAssignDialog(null); setSelectedDriver(""); setSelectedVehicle(""); fetchAll();
    } catch (e) { toast.error("Error al asignar"); }
  };

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800" };
  const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };

  const filteredTrips = filter === "all" ? trips : trips.filter(t => t.status === filter);

  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">Asignación de Traslados</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{v:"all",l:"Todos"},{v:"pendiente",l:"Pendientes"},{v:"asignado",l:"Asignados"},{v:"en_curso",l:"En Curso"}].map(f => (
          <Button key={f.v} variant={filter === f.v ? "default" : "outline"} size="sm" onClick={() => setFilter(f.v)} className={filter === f.v ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}>{f.l}</Button>
        ))}
      </div>
      <div className="space-y-3">
        {filteredTrips.map(t => (
          <Card key={t.id} className="card-hover shadow-sm border border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
                    <span className="text-xs text-slate-400">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-lg">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1"><MapPin className="w-3.5 h-3.5 text-teal-500" />{t.origin} <ArrowRight className="w-3 h-3" /> {t.destination}</div>
                  {t.driver_name && <p className="text-sm text-teal-600 mt-2 font-medium bg-teal-50 inline-block px-2 py-1 rounded">Conductor: {t.driver_name}</p>}
                  {t.vehicle_id && <p className="text-xs text-slate-500 mt-1">Vehículo: {vehicles.find(v => v.id === t.vehicle_id)?.plate || t.vehicle_id}</p>}
                </div>
                <div className="flex flex-col gap-2 shrink-0 w-[120px]">
                  <Button onClick={() => { setAssignDialog(t); setSelectedDriver(t.driver_id || ""); setSelectedVehicle(t.vehicle_id || ""); }} className={`h-9 text-xs w-full ${t.driver_id ? "bg-amber-500 hover:bg-amber-600" : "bg-teal-600 hover:bg-teal-700"}`}>
                    <ArrowLeftRight className="w-4 h-4 mr-1" />{t.driver_id ? "Reasignar" : "Asignar"}
                  </Button>
                  {["pendiente", "asignado"].includes(t.status) && (
                    <Button onClick={() => setCancelDialog(t)} variant="outline" className="h-9 text-xs text-red-500 border-red-200 hover:bg-red-50 w-full">Cancelar</Button>
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
                <p className="font-semibold text-sm">{assignDialog.trip_type === "clinico" ? assignDialog.patient_name : assignDialog.task_details}</p>
                <p className="text-sm text-slate-500">{assignDialog.origin} → {assignDialog.destination}</p>
              </div>
              <div className="space-y-2">
                <Label>Conductor *</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger><SelectValue placeholder="Seleccione conductor" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (<SelectItem key={d.id} value={d.id}>{d.name} {d.extra_available ? " - Extra" : ""}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vehículo (opcional)</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger><SelectValue placeholder="Seleccione vehículo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vehículo</SelectItem>
                    {vehicles.filter(v => v.status === "disponible").map(v => (<SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setAssignDialog(null)}>Cancelar</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleAssign}>{assignDialog.driver_id ? "Confirmar Reasignación" : "Confirmar Asignación"}</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
  
      <Dialog open={!!cancelDialog} onOpenChange={() => { setCancelDialog(null); setCancelReason(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Cancelar Traslado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Indique el motivo por el cual cancela este traslado:</p>
            <textarea className="w-full min-h-[80px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-red-400 focus:ring-1 outline-none" value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCancelDialog(null)}>Volver</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmCancel}>Confirmar Cancelación</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarSection() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [trips, setTrips] = useState([]);

  const getWeekDates = (offset) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1 + (offset * 7));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i); days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDates(weekOffset);
  const startDate = weekDays[0].toISOString().split("T")[0];
  const endDate = weekDays[6].toISOString().split("T")[0];

  useEffect(() => {
    api.get(`/trips/calendar?start_date=${startDate}&end_date=${endDate}`).then(r => { setTrips(r.data); }).catch(() => {});
  }, [startDate, endDate]);

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const statusColors = { pendiente: "bg-amber-200 text-amber-900 border-amber-300", asignado: "bg-teal-200 text-teal-900 border-teal-300", en_curso: "bg-blue-200 text-blue-900 border-blue-300", completado: "bg-emerald-200 text-emerald-900 border-emerald-300" };
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Calendario Semanal</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>Hoy</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day, i) => {
          const dateStr = day.toISOString().split("T")[0];
          const dayTrips = trips.filter(t => t.scheduled_date === dateStr);
          const isToday = dateStr === today;
          return (
            <div key={i} className={`min-h-[250px] rounded-xl border-2 p-3 ${isToday ? "border-teal-500 bg-teal-50/20" : "border-slate-200 bg-white shadow-sm"}`}>
              <div className="text-center mb-3">
                <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-teal-600" : "text-slate-500"}`}>{dayNames[i]}</p>
                <p className={`text-2xl font-black ${isToday ? "text-teal-700" : "text-slate-900"}`}>{day.getDate()}</p>
              </div>
              <div className="space-y-2">
                {dayTrips.map(t => (
                  <div key={t.id} className={`p-2 rounded-lg text-xs border shadow-sm ${statusColors[t.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                    <p className="font-bold truncate text-[11px] mb-0.5">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                    <p className="text-[10px] truncate opacity-90">{t.origin} → {t.destination}</p>
                    {t.driver_name && <p className="text-[10px] truncate font-medium mt-1"><User className="w-3 h-3 inline mr-1"/>{t.driver_name}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ByVehicleSection() {
  const [data, setData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);

  const [assignModal, setAssignModal] = useState(null);
  const [pendingTrips, setPendingTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  
  const [draggedItem, setDraggedItem] = useState(null);
  const [tripToUnassign, setTripToUnassign] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rData, rTrips, rDrivers] = await Promise.all([
        api.get(`/trips/by-vehicle?date=${selectedDate}`),
        api.get("/trips/pool"), 
        api.get("/drivers")
      ]);
      setData(rData.data);
      setPendingTrips(rTrips.data);
      setDrivers(rDrivers.data.filter(d => d.status === "aprobado"));
    } catch {} finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedTripId || !selectedDriverId) { toast.error("Seleccione un viaje y un conductor"); return; }
    try {
      await api.put(`/trips/${selectedTripId}`, { scheduled_date: selectedDate });
      await api.put(`/trips/${selectedTripId}/manager-assign`, {
        driver_id: selectedDriverId,
        vehicle_id: assignModal.vehicle_id !== "unassigned" ? assignModal.vehicle_id : null
      });
      toast.success("Viaje programado exitosamente");
      setAssignModal(null); setSelectedTripId(""); setSelectedDriverId("");
      fetchData(); 
    } catch (e) { toast.error("Error al programar el viaje"); }
  };

  const handleDrop = async (vehicleId, dropIndex) => {
    if (!draggedItem || draggedItem.vehicleId !== vehicleId) { setDraggedItem(null); return; }
    const newData = [...data];
    const vehicleIndex = newData.findIndex(v => v.vehicle.id === vehicleId);
    const vehicleTrips = [...newData[vehicleIndex].trips];
    const [movedTrip] = vehicleTrips.splice(draggedItem.tripIndex, 1);
    vehicleTrips.splice(dropIndex, 0, movedTrip);
    newData[vehicleIndex].trips = vehicleTrips;
    setData(newData);
    setDraggedItem(null);
    const newOrderIds = vehicleTrips.map(t => t.id);
    try { await api.put('/trips/reorder', { trip_ids: newOrderIds }); } catch (e) { toast.error("Error al guardar orden."); }
  };
  
  const confirmUnassignAction = async () => {
    if (!tripToUnassign) return;
    try { await api.put(`/trips/${tripToUnassign}/unassign`); toast.success("Viaje devuelto a la bolsa"); fetchData(); } 
    catch (e) { toast.error("Error al desasignar"); } finally { setTripToUnassign(null); }
  };
  
  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800" };
  const vehicleStatusColors = { disponible: "bg-green-100 text-green-700", en_servicio: "bg-blue-100 text-blue-700", en_limpieza: "bg-violet-100 text-violet-700", en_taller: "bg-orange-100 text-orange-700" };

  const totalTrips = data.reduce((acc, d) => acc + d.trips.length, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-slide-up">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pizarra de Programación</h1>
          <p className="text-sm text-slate-500">{totalTrips} traslados para el {selectedDate}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
          <CalendarDays className="w-5 h-5 text-teal-600" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto h-9 border-0 bg-transparent focus-visible:ring-0 p-0 font-medium" />
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])} className="h-8">Hoy</Button>
        </div>
      </div>

      {loading ? <div className="flex-1 flex items-center justify-center text-slate-500"><Activity className="w-6 h-6 animate-spin mr-2"/>Cargando pizarra...</div> : (
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x">
          {data.map(item => (
            <div key={item.vehicle.id} className="min-w-[320px] max-w-[320px] bg-slate-100/80 rounded-xl p-3 flex flex-col snap-start border border-slate-200">
              <div className="flex items-center justify-between mb-3 bg-white p-3 rounded-xl shadow-sm shrink-0 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center"><Truck className="w-5 h-5 text-teal-600" /></div>
                  <div>
                    <h3 className="font-bold text-slate-900">{item.vehicle.plate}</h3>
                    {item.vehicle.brand && <p className="text-[11px] text-slate-500 leading-tight">{item.vehicle.brand} {item.vehicle.model}</p>}
                  </div>
                </div>
                <div className="text-right">
                  {item.vehicle.status && <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold block mb-1 ${vehicleStatusColors[item.vehicle.status] || "bg-slate-100"}`}>{item.vehicle.status.replace(/_/g, " ")}</span>}
                  <span className="text-[11px] text-slate-500 font-bold">{item.trips.length} viajes</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {item.trips.map((t, index) => (
                  <div key={t.id} draggable onDragStart={() => setDraggedItem({ vehicleId: item.vehicle.id, tripIndex: index, tripId: t.id })} onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); handleDrop(item.vehicle.id, index); }} className={`p-3 bg-white rounded-lg border shadow-sm transition-all cursor-grab active:cursor-grabbing ${draggedItem?.tripId === t.id ? 'opacity-40 scale-[0.98] border-dashed border-teal-500' : 'border-slate-200 hover:border-teal-300'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                      {t.status !== "completado" && t.status !== "pendiente" && (<Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setTripToUnassign(t.id); }} className="h-6 px-2 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200">Desasignar</Button>)}
                    </div>
                    <p className="font-bold text-sm text-slate-900 truncate mb-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                    <div className="flex items-center gap-1 mt-1"><MapPin className="w-3 h-3 text-teal-500 shrink-0" /><p className="text-[11px] text-slate-500 truncate">{t.origin} <ArrowRight className="w-3 h-3 inline" /> {t.destination}</p></div>
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between"><span className="text-[11px] text-slate-600 font-medium flex items-center gap-1"><User className="w-3 h-3 text-teal-600"/> {t.driver_name || "Sin asignar"}</span><span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${t.priority === "urgente" ? "bg-red-100 text-red-700" : t.priority === "alta" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{t.priority}</span></div>
                  </div>
                ))}
                {item.trips.length === 0 && (<div onDragOver={(e) => e.preventDefault()} className="h-full flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-lg bg-white/50"><p className="text-xs font-medium">Arrastra un viaje aquí</p></div>)}
              </div>
              <Button variant="outline" className="w-full mt-3 bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border-dashed border-2 shrink-0 transition-all text-xs font-bold h-10" onClick={() => setAssignModal({ vehicle_id: item.vehicle.id, plate: item.vehicle.plate })}>+ Programar Aquí</Button>
            </div>
          ))}
          {data.length === 0 && <p className="w-full text-center py-12 text-slate-400">No hay vehículos registrados en la flota</p>}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={!!assignModal} onOpenChange={() => { setAssignModal(null); setSelectedTripId(""); setSelectedDriverId(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Programar para el {selectedDate}</DialogTitle></DialogHeader>
          {assignModal && (
            <div className="space-y-4 pt-2">
              <div className="bg-teal-50 p-3 rounded-lg border border-teal-100 flex items-center justify-between"><span className="text-sm text-teal-800 font-medium">Vehículo asignado:</span><Badge className="bg-teal-600 text-sm py-1">{assignModal.plate}</Badge></div>
              <div className="space-y-2"><Label className="font-bold">1. Seleccionar Viaje de la Bolsa</Label><Select value={selectedTripId} onValueChange={setSelectedTripId}><SelectTrigger className="h-11"><SelectValue placeholder="Elija un viaje pendiente" /></SelectTrigger><SelectContent>{pendingTrips.length === 0 ? (<SelectItem value="none" disabled>No hay viajes pendientes</SelectItem>) : (pendingTrips.map(t => (<SelectItem key={t.id} value={t.id}>{t.trip_type === "clinico" ? t.patient_name : t.task_details} | {t.origin} → {t.destination}</SelectItem>)))}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="font-bold">2. Asignar Conductor</Label><Select value={selectedDriverId} onValueChange={setSelectedDriverId}><SelectTrigger className="h-11"><SelectValue placeholder="Elija un conductor" /></SelectTrigger><SelectContent>{drivers.map(d => (<SelectItem key={d.id} value={d.id}>{d.name} {d.extra_available ? "(Extra)" : ""}</SelectItem>))}</SelectContent></Select></div>
              <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setAssignModal(null)}>Cancelar</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={handleAssign}>Guardar Programación</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!tripToUnassign} onOpenChange={() => setTripToUnassign(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> ¿Desasignar este viaje?</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 py-2">El traslado volverá a la bolsa de pendientes para ser reasignado. ¿Desea continuar?</p>
          <DialogFooter className="mt-2"><Button variant="outline" onClick={() => setTripToUnassign(null)}>Cancelar</Button><Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmUnassignAction}>Sí, desasignar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
