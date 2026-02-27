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
  const [assignDialog, setAssignDialog] = useState(null);
  const [driverId, setDriverId] = useState("");
  const fetchAll = useCallback(async () => { try { const [t, d] = await Promise.all([api.get("/trips/active"), api.get("/drivers")]); setTrips(t.data); setDrivers(d.data.filter(x=>x.status==="aprobado")); } catch{} }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);
  const handleAssign = async () => { if(!driverId) return; try { await api.put(`/trips/${assignDialog.id}/manager-assign`, {driver_id: driverId}); toast.success("Asignado"); setAssignDialog(null); fetchAll(); } catch{} };
  return <div><h1 className="text-2xl font-bold mb-4">Asignación</h1><div className="space-y-2">{trips.map(t => <Card key={t.id}><CardContent className="p-4 flex justify-between items-center"><p className="font-medium">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p><Button onClick={()=>setAssignDialog(t)}>Asignar</Button></CardContent></Card>)}</div>
  <Dialog open={!!assignDialog} onOpenChange={()=>setAssignDialog(null)}><DialogContent><DialogHeader><DialogTitle>Asignar</DialogTitle></DialogHeader><Select onValueChange={setDriverId}><SelectTrigger><SelectValue placeholder="Conductor"/></SelectTrigger><SelectContent>{drivers.map(d=><SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select><DialogFooter><Button onClick={handleAssign} className="bg-teal-600 text-white">Guardar</Button></DialogFooter></DialogContent></Dialog></div>;
}

function CalendarSection() {
  const [trips, setTrips] = useState([]);
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1 + i); return d; });
  useEffect(() => { api.get(`/trips/calendar?start_date=${days[0].toISOString().split("T")[0]}&end_date=${days[6].toISOString().split("T")[0]}`).then(r => setTrips(r.data)).catch(()=>{}); }, []);
  return <div><h1 className="text-2xl font-bold mb-4">Calendario Semanal</h1><div className="grid grid-cols-7 gap-2">{days.map((d, i) => (<div key={i} className="min-h-[150px] border rounded p-2 bg-white"><p className="text-center font-bold text-sm text-slate-500">{["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i]}</p><p className="text-center text-lg">{d.getDate()}</p><div className="space-y-1 mt-2">{trips.filter(t => t.scheduled_date === d.toISOString().split("T")[0]).map(t => <div key={t.id} className="text-[10px] bg-slate-100 p-1 rounded truncate">{t.trip_type==="clinico"?t.patient_name:t.task_details}</div>)}</div></div>))}</div></div>;
}

function ByVehicleSection() {
  const [data, setData] = useState([]);
  useEffect(() => { api.get(`/trips/by-vehicle?date=${new Date().toISOString().split("T")[0]}`).then(r => setData(r.data)).catch(()=>{}); }, []);
  return <div><h1 className="text-2xl font-bold mb-4">Pizarra de Programación</h1><div className="flex gap-4 overflow-x-auto">{data.map(d => <div key={d.vehicle.id} className="min-w-[300px] bg-slate-100 p-3 rounded-lg"><h3 className="font-bold mb-3 bg-white p-2 rounded shadow-sm">{d.vehicle.plate}</h3><div className="space-y-2">{d.trips.map(t => <div key={t.id} className="bg-white p-2 text-sm rounded shadow-sm">{t.trip_type==="clinico"?t.patient_name:t.task_details}</div>)}{d.trips.length===0 && <p className="text-xs text-center text-slate-400">Sin viajes</p>}</div></div>)}</div></div>;
}
