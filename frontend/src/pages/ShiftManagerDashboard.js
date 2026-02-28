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
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
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
  const sColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800" };
  const pieData = stats ? [{ name: 'Pendientes', value: stats.pending_trips, color: '#f59e0b' }, { name: 'Activos', value: stats.active_trips, color: '#3b82f6' }, { name: 'Completados', value: stats.completed_trips, color: '#10b981' }].filter(i => i.value > 0) : []; 

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Consola de Despacho</h1>
        <Button variant="outline" onClick={fetchAll} disabled={refreshing}><RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Actualizar</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[{ l: "Pendientes", v: stats.pending_trips, i: Clock, c: "text-amber-600 bg-amber-50", n: "assign" }, { l: "Activos", v: stats.active_trips, i: Truck, c: "text-blue-600 bg-blue-50", n: "assign" }, { l: "Conductores", v: stats.total_drivers, i: Users, c: "text-teal-600 bg-teal-50", n: "drivers" }, { l: "Vehículos", v: stats.vehicles_available, i: Truck, c: "text-emerald-600 bg-emerald-50", n: "vehicles" }].map(c => (
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${pColors[t.priority] || pColors.normal}`}>{t.priority}</span>
                      <span className="text-xs text-slate-400">{t.scheduled_date || new Date(t.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="font-medium text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0"/> <span className="truncate">{t.origin}</span> <ArrowRight className="w-3 h-3 mx-1 shrink-0" /> <span className="truncate">{t.destination}</span></p>
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
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${sColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded-md flex items-center"><User className="w-3 h-3 mr-1" />{t.driver_name}</span>
                    </div>
                    <p className="font-medium text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0"/> <span className="truncate">{t.origin}</span> <ArrowRight className="w-3 h-3 mx-1 shrink-0" /> <span className="truncate">{t.destination}</span></p>
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

// --------------------------------------------------------
// AQUÍ ESTÁN LAS VISTAS RICAS RECUPERADAS (ASIGNAR, PIZARRA, CALENDARIO)
// --------------------------------------------------------

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
          <Card key={t.id} className="card-hover shadow-md border-l-4 border-l-teal-500">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="font-bold text-slate-900 text-lg mb-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details || "Sin descripción"}</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-2">
                    <MapPin className="w-4 h-4 text-teal-500 shrink-0" /><span className="truncate">{t.origin}</span> <ArrowRight className="w-3 h-3 shrink-0" /> <span className="truncate">{t.destination}</span>
                  </div>
                  {t.driver_name && <div className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-800 px-2.5 py-1 rounded-md text-xs font-semibold mt-1 mr-2"><User className="w-3.5 h-3.5"/> Conductor: {t.driver_name}</div>}
                  {t.vehicle_id && <div className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold mt-1"><Truck className="w-3.5 h-3.5"/> Vehículo: {vehicles.find(v => v.id === t.vehicle_id)?.plate || t.vehicle_id}</div>}
                </div>
                <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-[130px]">
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
                <p className="font-semibold text-sm text-slate-900">{assignDialog.trip_type === "clinico" ? assignDialog.patient_name : assignDialog.task_details}</p>
                <p className="text-sm text-slate-500 mt-1 flex items-center"><MapPin className="w-3 h-3 mr-1 text-teal-500"/> {assignDialog.origin} <ArrowRight className="w-3 h-3 mx-1"/> {assignDialog.destination}</p>
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
              <div className="space-y-2">
                <Label className="font-semibold">Vehículo (opcional)</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Seleccione vehículo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vehículo asignado</SelectItem>
                    {vehicles.filter(v => v.status === "disponible" || v.status === "en_servicio").map(v => (<SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</SelectItem>))}
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
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Cancelar Traslado</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Indique el motivo por el cual cancela este traslado desde Coordinación:</p>
            <textarea className="w-full min-h-[80px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:border-red-400 focus:ring-1 outline-none" placeholder="Ej: Vehículo en pana, traslado reagendado..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
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
  const [selectedTrip, setSelectedTrip] = useState(null); // Nuevo estado para el modal

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
  const statusColors = { pendiente: "bg-amber-100 border-amber-200 text-amber-900", asignado: "bg-teal-100 border-teal-200 text-teal-900", en_curso: "bg-blue-100 border-blue-200 text-blue-900", completado: "bg-emerald-100 border-emerald-200 text-emerald-900" };
  const today = new Date().toISOString().split("T")[0];

  // Etiquetas y colores para el modal de detalles
  const sLabels = { pendiente: "Pendiente", asignado: "Asignado", en_curso: "En Curso", completado: "Completado", cancelado: "Cancelado" };
  const sColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Calendario Semanal</h1>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w - 1)} className="h-8 w-8 hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)} className="h-8 font-medium">Semana Actual</Button>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset(w => w + 1)} className="h-8 w-8 hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day, i) => {
          const dateStr = day.toISOString().split("T")[0];
          const dayTrips = trips.filter(t => t.scheduled_date === dateStr);
          const isToday = dateStr === today;
          return (
            <div key={i} className={`min-h-[250px] rounded-xl border-2 p-3 transition-colors ${isToday ? "border-teal-500 bg-teal-50/30 shadow-md" : "border-slate-200 bg-white shadow-sm"}`}>
              <div className="text-center mb-4 border-b border-slate-100 pb-2">
                <p className={`text-xs font-bold uppercase tracking-widest ${isToday ? "text-teal-600" : "text-slate-500"}`}>{dayNames[i]}</p>
                <p className={`text-2xl font-black ${isToday ? "text-teal-700" : "text-slate-900"}`}>{day.getDate()}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{dayTrips.length} viajes</p>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-[400px] custom-scrollbar pr-1">
                {dayTrips.map(t => (
                  <div key={t.id} 
                       onClick={() => setSelectedTrip(t)} 
                       className={`p-2.5 rounded-lg border shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-teal-400 cursor-pointer ${statusColors[t.status] || "bg-slate-50 border-slate-200 text-slate-700"}`}>
                    <p className="font-bold text-[11px] leading-tight mb-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                    <p className="text-[10px] opacity-80 leading-tight flex items-center gap-1"><MapPin className="w-2.5 h-2.5 shrink-0"/> <span className="truncate">{t.origin}</span></p>
                    <p className="text-[10px] opacity-80 leading-tight flex items-center gap-1 mt-0.5"><ArrowRight className="w-2.5 h-2.5 shrink-0"/> <span className="truncate">{t.destination}</span></p>
                    {t.driver_name && <div className="mt-1.5 pt-1.5 border-t border-black/10 text-[9px] font-bold flex items-center gap-1"><User className="w-2.5 h-2.5"/>{t.driver_name}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalle (Reutilizado del Historial) */}
      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl text-slate-900 border-b pb-2">Detalle del Traslado</DialogTitle></DialogHeader>
          {selectedTrip && (
            <div className="space-y-5 text-sm pt-2">
              <div className="flex gap-2 mb-2">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${sColors[selectedTrip.status]}`}>{sLabels[selectedTrip.status]}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{selectedTrip.trip_type==="clinico"?"Traslado Clínico":"Traslado No Clínico"}</span>
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
                    {selectedTrip.accompaniment && selectedTrip.accompaniment !== "ninguno" && <div className="mt-3 pt-3 border-t border-teal-200"><p className="text-xs text-teal-800 font-bold">Acompañamiento: <span className="text-teal-900">{selectedTrip.accompaniment}</span></p></div>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cometido</p><p className="font-black text-lg text-slate-900">{selectedTrip.task_details}</p></div>
                  <div><p className="text-xs text-slate-500 font-bold">Cantidad de Funcionarios</p><p className="font-medium text-slate-800">{selectedTrip.staff_count}</p></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Origen</p><p className="font-bold text-slate-900">{selectedTrip.origin}</p><p className="text-xs text-slate-500 mt-1">{selectedTrip.patient_unit||""} {selectedTrip.bed?`(Cama ${selectedTrip.bed})`:""}</p></div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5"/> Destino</p><p className="font-bold text-slate-900">{selectedTrip.destination}</p></div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100"><p className="text-xs text-red-600 font-bold mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Horarios</p><p className="font-bold text-red-900 text-sm">Citación: {selectedTrip.appointment_time||"-"} | Salida: {selectedTrip.departure_time||"-"}</p><p className="text-xs text-red-700 mt-1">Fecha Prog: {selectedTrip.scheduled_date}</p></div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div><p className="text-xs text-slate-500 font-bold mb-1">Conductor Asignado</p><p className="font-bold text-teal-700 flex items-center gap-1.5"><User className="w-4 h-4"/>{selectedTrip.driver_name || "Sin asignar"}</p></div>
                <div><p className="text-xs text-slate-500 font-bold mb-1">Vehículo Asignado</p><p className="font-bold text-slate-800 flex items-center gap-1.5"><Truck className="w-4 h-4"/>{selectedTrip.vehicle_plate || "Sin asignar"}</p></div>
              </div>

              {(selectedTrip.start_mileage != null || selectedTrip.end_mileage != null) && (
                <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-5">
                  <div className="text-center p-2"><p className="text-xs text-slate-500">KM Inicio</p><p className="font-bold">{selectedTrip.start_mileage != null ? selectedTrip.start_mileage.toLocaleString() : "-"}</p></div>
                  <div className="text-center p-2"><p className="text-xs text-slate-500">KM Final</p><p className="font-bold">{selectedTrip.end_mileage != null ? selectedTrip.end_mileage.toLocaleString() : "-"}</p></div>
                  <div className="text-center p-2 bg-emerald-50 rounded-lg"><p className="text-xs text-emerald-700 font-bold">KM Recorridos</p><p className="font-black text-emerald-800">{(selectedTrip.start_mileage != null && selectedTrip.end_mileage != null) ? (selectedTrip.end_mileage - selectedTrip.start_mileage).toLocaleString() : "-"}</p></div>
                </div>
              )}

              {selectedTrip.notes && (<div className="border-t border-slate-200 pt-5"><p className="text-xs text-slate-500 font-bold mb-2">Notas Adicionales</p><p className="bg-amber-50 p-4 rounded-xl text-slate-800 border border-amber-100">{selectedTrip.notes}</p></div>)}
            </div>
          )}
        </DialogContent>
      </Dialog>
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
  const vehicleStatusColors = { disponible: "bg-emerald-100 text-emerald-800 border-emerald-200", en_servicio: "bg-blue-100 text-blue-800 border-blue-200", en_limpieza: "bg-violet-100 text-violet-800 border-violet-200", en_taller: "bg-orange-100 text-orange-800 border-orange-200" };

  const totalTrips = data.reduce((acc, d) => acc + d.trips.length, 0);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] animate-slide-up">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pizarra de Programación</h1>
          <p className="text-sm text-slate-500 font-medium">{totalTrips} traslados asignados para el {selectedDate}</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
          <CalendarDays className="w-5 h-5 text-teal-600 ml-1" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto h-9 border-0 bg-transparent focus-visible:ring-0 p-0 font-bold text-slate-700" />
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])} className="h-8">Ver Hoy</Button>
        </div>
      </div>

      {loading ? <div className="flex-1 flex flex-col items-center justify-center text-slate-400"><RefreshCw className="w-8 h-8 animate-spin mb-3 text-teal-500"/>Cargando estado de la flota...</div> : (
        <div className="flex-1 flex gap-5 overflow-x-auto pb-4 snap-x custom-scrollbar">
          {data.map(item => (
            <div key={item.vehicle.id} className="min-w-[340px] max-w-[340px] bg-slate-200/50 rounded-2xl p-3 flex flex-col snap-start border border-slate-200 shadow-inner">
              <div className="flex items-center justify-between mb-3 bg-white p-3.5 rounded-xl shadow-sm shrink-0 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center border border-teal-100">
                    <Truck className="w-6 h-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-lg leading-none">{item.vehicle.plate}</h3>
                    {item.vehicle.brand && <p className="text-xs text-slate-500 font-medium mt-1">{item.vehicle.brand} {item.vehicle.model}</p>}
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  {item.vehicle.status && <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider block mb-1.5 border ${vehicleStatusColors[item.vehicle.status] || "bg-slate-100"}`}>{item.vehicle.status.replace(/_/g, " ")}</span>}
                  <span className="text-[11px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-full">{item.trips.length} viajes</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {item.trips.map((t, index) => (
                  <div key={t.id} draggable onDragStart={() => setDraggedItem({ vehicleId: item.vehicle.id, tripIndex: index, tripId: t.id })} onDragOver={(e) => { e.preventDefault(); }} onDrop={(e) => { e.preventDefault(); handleDrop(item.vehicle.id, index); }} 
                    className={`p-3.5 bg-white rounded-xl border shadow-sm transition-all cursor-grab active:cursor-grabbing hover:shadow-md
                      ${draggedItem?.tripId === t.id ? 'opacity-50 scale-[0.98] border-dashed border-teal-500 border-2' : 'border-slate-200 hover:border-teal-300'}`}>
                    
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                      {t.status !== "completado" && t.status !== "pendiente" && (<Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setTripToUnassign(t.id); }} className="h-6 px-2 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200">Retirar</Button>)}
                    </div>
                    
                    <p className="font-bold text-sm text-slate-900 mb-1.5 leading-tight">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                    
                    <div className="flex items-center gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                      <p className="text-xs text-slate-600 font-medium truncate">{t.origin} <ArrowRight className="w-3 h-3 inline text-slate-400 mx-0.5" /> {t.destination}</p>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-teal-700 font-bold flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-md"><User className="w-3.5 h-3.5"/> {t.driver_name || "Sin asignar"}</span>
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${t.priority === "urgente" ? "bg-red-100 text-red-700" : t.priority === "alta" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                    </div>
                  </div>
                ))}
                {item.trips.length === 0 && (<div onDragOver={(e) => e.preventDefault()} className="h-full min-h-[150px] flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-300 rounded-xl bg-white/40"><p className="text-sm font-medium">Arrastra un viaje aquí</p></div>)}
              </div>
              
              <Button variant="outline" className="w-full mt-3 bg-white hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border-dashed border-2 shrink-0 transition-all text-sm font-bold h-12 shadow-sm" onClick={() => setAssignModal({ vehicle_id: item.vehicle.id, plate: item.vehicle.plate })}>+ Programar Aquí</Button>
            </div>
          ))}
          {data.length === 0 && <p className="w-full text-center py-12 text-slate-400 text-lg">No hay vehículos registrados en la flota</p>}
        </div>
      )}

      {/* Dialogs Pizarra */}
      <Dialog open={!!assignModal} onOpenChange={() => { setAssignModal(null); setSelectedTripId(""); setSelectedDriverId(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-xl">Programar Viaje</DialogTitle></DialogHeader>
          {assignModal && (
            <div className="space-y-5 pt-2">
              <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center justify-between"><span className="text-sm text-teal-800 font-bold">Vehículo seleccionado:</span><Badge className="bg-teal-600 text-sm py-1 px-3 shadow-sm">{assignModal.plate}</Badge></div>
              <div className="space-y-2"><Label className="font-bold text-slate-700">1. Seleccionar Viaje de la Bolsa</Label><Select value={selectedTripId} onValueChange={setSelectedTripId}><SelectTrigger className="h-12 border-slate-300"><SelectValue placeholder="Elija un viaje pendiente" /></SelectTrigger><SelectContent>{pendingTrips.length === 0 ? (<SelectItem value="none" disabled>No hay viajes pendientes</SelectItem>) : (pendingTrips.map(t => (<SelectItem key={t.id} value={t.id} className="py-2 font-medium">{t.trip_type === "clinico" ? t.patient_name : t.task_details} | {t.origin} → {t.destination}</SelectItem>)))}</SelectContent></Select></div>
              <div className="space-y-2"><Label className="font-bold text-slate-700">2. Asignar Conductor</Label><Select value={selectedDriverId} onValueChange={setSelectedDriverId}><SelectTrigger className="h-12 border-slate-300"><SelectValue placeholder="Elija un conductor" /></SelectTrigger><SelectContent>{drivers.map(d => (<SelectItem key={d.id} value={d.id} className="py-2 font-medium">{d.name} {d.extra_available ? "(Extra)" : ""}</SelectItem>))}</SelectContent></Select></div>
              <DialogFooter className="mt-6"><Button variant="outline" className="h-11" onClick={() => setAssignModal(null)}>Cancelar</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white h-11 font-bold" onClick={handleAssign}>Guardar Programación</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!tripToUnassign} onOpenChange={() => setTripToUnassign(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-red-600 flex items-center gap-2 text-xl"><AlertTriangle className="w-6 h-6" /> ¿Desasignar este viaje?</DialogTitle></DialogHeader>
          <p className="text-base text-slate-600 py-2">El traslado será removido de este vehículo y volverá a la bolsa de pendientes. ¿Desea continuar?</p>
          <DialogFooter className="mt-4"><Button variant="outline" className="h-11" onClick={() => setTripToUnassign(null)}>Cancelar</Button><Button className="bg-red-600 hover:bg-red-700 text-white h-11 font-bold" onClick={confirmUnassignAction}>Sí, retirar viaje</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --------------------------------------------------------
// LAS DEMÁS SECCIONES (NUEVO TRASLADO, VEHÍCULOS, ETC)
// --------------------------------------------------------

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
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-slate-900">Programar Nuevo Traslado</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => setTripType("clinico")} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${tripType === "clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white hover:border-teal-200 text-slate-500"}`}><Stethoscope className="w-8 h-8" /><span className="font-bold">Clínico</span></button>
        <button onClick={() => setTripType("no_clinico")} className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${tripType === "no_clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white hover:border-teal-200 text-slate-500"}`}><Truck className="w-8 h-8" /><span className="font-bold">No Clínico</span></button>
      </div>
      <Card className="border-t-4 border-t-teal-500 shadow-lg"><CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {tripType === "clinico" && (
            <><h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><User className="w-5 h-5"/> Datos Paciente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Nombre *</Label><Input value={f.patient_name} onChange={e=>setF({...f, patient_name: e.target.value})} /></div><div className="space-y-1"><Label>RUT</Label><Input value={f.rut} onChange={e=>setF({...f, rut: e.target.value})} /></div><div className="space-y-1"><Label>Edad</Label><Input value={f.age} onChange={e=>setF({...f, age: e.target.value})} /></div><div className="space-y-1"><Label>Peso</Label><Input value={f.weight} onChange={e=>setF({...f, weight: e.target.value})} /></div><div className="space-y-1 md:col-span-2"><Label>Diagnóstico</Label><Input value={f.diagnosis} onChange={e=>setF({...f, diagnosis: e.target.value})} /></div></div>
              <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mt-8 flex items-center gap-2"><Activity className="w-5 h-5"/> Detalles Médicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Solicitante Clínico *</Label><Input value={f.requester_person} onChange={e=>setF({...f, requester_person: e.target.value})} /></div><div className="space-y-1"><Label>Médico Tratante</Label><Input value={f.attending_physician} onChange={e=>setF({...f, attending_physician: e.target.value})} /></div><div className="space-y-1"><Label>Motivo *</Label><Select value={f.transfer_reason} onValueChange={v=>setF({...f, transfer_reason: v})}><SelectTrigger><SelectValue placeholder="Seleccione"/></SelectTrigger><SelectContent>{tOpt.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div></div></>
          )}
          {tripType === "no_clinico" && (
            <><h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><ClipboardList className="w-5 h-5"/> Detalle Cometido</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1 md:col-span-2"><Label>Cometido *</Label><Input value={f.task_details} onChange={e=>setF({...f, task_details: e.target.value})} /></div><div className="space-y-1"><Label>Cantidad Funcionarios *</Label><Input type="number" min="1" value={f.staff_count} onChange={e=>setF({...f, staff_count: e.target.value})} /></div></div></>
          )}
          <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mt-8 flex items-center gap-2"><MapPin className="w-5 h-5"/> Ubicación y Tiempos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Origen *</Label>{!useCO?<Select onValueChange={v=>v==="otro"?setUseCO(true):setF({...f, origin: v})}><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent>{destinations.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro (escribir)</SelectItem></SelectContent></Select>:<Input placeholder="Escriba origen (Doble clic para lista)" value={f.origin} onChange={e=>setF({...f, origin: e.target.value})} onDoubleClick={()=>setUseCO(false)}/>}</div><div className="space-y-1"><Label>Destino *</Label>{!useCD?<Select onValueChange={v=>v==="otro"?setUseCD(true):setF({...f, destination: v})}><SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent>{destinations.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro (escribir)</SelectItem></SelectContent></Select>:<Input placeholder="Escriba destino (Doble clic para lista)" value={f.destination} onChange={e=>setF({...f, destination: e.target.value})} onDoubleClick={()=>setUseCD(false)}/>}</div>
          {tripType === "clinico" && (<><div className="space-y-1"><Label>Unidad/Servicio *</Label><Input value={f.patient_unit} onChange={e=>setF({...f, patient_unit: e.target.value})} /></div><div className="space-y-1"><Label>Cama</Label><Input value={f.bed} onChange={e=>setF({...f, bed: e.target.value})} /></div><div className="space-y-1"><Label>Hora Citación *</Label><Input type="time" value={f.appointment_time} onChange={e=>setF({...f, appointment_time: e.target.value})} /></div></>)}
          <div className="space-y-1"><Label>Fecha Traslado</Label><Input type="date" value={f.scheduled_date} onChange={e=>setF({...f, scheduled_date: e.target.value})} /></div><div className="space-y-1"><Label>Hora Salida</Label><Input type="time" value={f.departure_time} onChange={e=>setF({...f, departure_time: e.target.value})} /></div></div>
          {tripType === "clinico" && (
            <><h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mt-8 flex items-center gap-2"><Plus className="w-5 h-5"/> Requerimientos</h3><div className="space-y-2"><Label>Personal *</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">{pOpt.map(o => (<label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.required_personnel.includes(o)} onChange={()=>handleCB("required_personnel", o)} className="w-4 h-4 text-teal-600 rounded" /> {o}</label>))}</div></div><div className="space-y-2"><Label>Requerimientos Paciente *</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">{rOpt.map(o => (<label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.patient_requirements.includes(o)} onChange={()=>handleCB("patient_requirements", o)} className="w-4 h-4 text-teal-600 rounded" /> {o}</label>))}</div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Acompañamiento</Label><Select value={f.accompaniment} onValueChange={v=>setF({...f, accompaniment: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="ninguno">Ninguno</SelectItem><SelectItem value="Materno">Materno</SelectItem><SelectItem value="Tutor">Tutor</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Prioridad</Label><Select value={f.priority} onValueChange={v=>setF({...f, priority: v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div></div></>
          )}
          <div className="space-y-2 pt-4"><Label>Notas Adicionales</Label><textarea className="w-full min-h-[100px] p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={f.notes} onChange={e=>setF({...f, notes: e.target.value})} placeholder="Información extra relevante..." /></div>
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 h-14 text-lg font-bold shadow-md mt-4" disabled={loading}>Guardar Solicitud de Traslado</Button>
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
      "KM Inicio": t.start_mileage||"", "KM Final": t.end_mileage||"", "KM Recorrido": (t.start_mileage&&t.end_mileage)?t.end_mileage-t.start_mileage:"", "Notas": t.notes || ""
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.writeFile(XLSX.utils.book_append_sheet(XLSX.utils.book_new(), ws, "Historial"), `historial_traslados_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  if (loading) return <div className="text-center py-12 text-slate-500"><Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-teal-600"/>Cargando historial...</div>;
  return (
    <div className="animate-slide-up">
      <div className="flex justify-between mb-6 flex-wrap gap-3"><h1 className="text-2xl md:text-3xl font-bold text-slate-900">Historial de Traslados</h1><div className="flex gap-2"><Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="w-4 h-4 mr-2" />Filtros</Button><Button onClick={expXL} className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"><Download className="w-4 h-4 mr-2" />Excel</Button></div></div>
      <div className="relative mb-4"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" /><Input placeholder="Buscar por paciente, cometido, conductor, RUT, diagnóstico..." className="pl-10 h-10 border-slate-300" value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} /></div>
      {showFilters && (
        <Card className="mb-6 border-teal-100 bg-teal-50/20 shadow-sm animate-slide-up"><CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="space-y-1"><Label className="text-xs font-bold text-slate-700">Estado</Label><Select onValueChange={v => setFilters({ ...filters, status: v === "all" ? "" : v })}><SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="pendiente">Pendiente</SelectItem><SelectItem value="asignado">Asignado</SelectItem><SelectItem value="en_curso">En Curso</SelectItem><SelectItem value="completado">Completado</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs font-bold text-slate-700">Tipo</Label><Select onValueChange={v => setFilters({ ...filters, trip_type: v === "all" ? "" : v })}><SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="clinico">Clínico</SelectItem><SelectItem value="no_clinico">No Clínico</SelectItem></SelectContent></Select></div>
          <div className="space-y-1"><Label className="text-xs font-bold text-slate-700">Desde</Label><Input type="date" className="h-9 bg-white" onChange={e => setFilters({ ...filters, date_from: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs font-bold text-slate-700">Hasta</Label><Input type="date" className="h-9 bg-white" onChange={e => setFilters({ ...filters, date_to: e.target.value })} /></div>
          <div className="flex items-end"><Button variant="ghost" size="sm" onClick={()=>setFilters({status:"",driver_name:"",origin:"",destination:"",trip_type:"",priority:"",date_from:"",date_to:"",search:""})} className="text-red-500 hover:text-red-700 hover:bg-red-50"><XIcon className="w-3 h-3 mr-1" />Limpiar</Button></div>
        </CardContent></Card>
      )}
      <p className="text-sm text-slate-500 mb-3 font-medium">Mostrando {filtered.length} de {trips.length} resultados</p>
      <Card className="shadow-md border-slate-200"><CardContent className="p-0 overflow-x-auto"><Table>
        <TableHeader className="bg-slate-100"><TableRow><TableHead className="font-bold text-slate-700">Estado</TableHead><TableHead className="font-bold text-slate-700">Tipo</TableHead><TableHead className="font-bold text-slate-700">Fecha</TableHead><TableHead className="font-bold text-slate-700">Detalle / Paciente</TableHead><TableHead className="font-bold text-slate-700">Origen</TableHead><TableHead className="font-bold text-slate-700">Destino</TableHead></TableRow></TableHeader>
        <TableBody>
          {filtered.map(t => (
            <TableRow key={t.id} className="cursor-pointer hover:bg-teal-50 transition-colors" onClick={() => setSelectedTrip(t)}>
              <TableCell><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sColors[t.status]}`}>{sLabels[t.status]}</span></TableCell>
              <TableCell className="text-xs font-semibold text-slate-600">{t.trip_type==="clinico"?"Clínico":"No Clínico"}</TableCell>
              <TableCell className="text-xs whitespace-nowrap text-slate-500">{t.scheduled_date}</TableCell>
              <TableCell className="text-sm font-bold text-slate-900 max-w-[200px] truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</TableCell>
              <TableCell className="text-xs text-slate-600">{t.origin}</TableCell>
              <TableCell className="text-xs text-slate-600">{t.destination}</TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-16 text-slate-400">Sin resultados para mostrar</TableCell></TableRow>}
        </TableBody>
      </Table></CardContent></Card>

      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl text-slate-900 border-b pb-2">Detalle del Traslado</DialogTitle></DialogHeader>
          {selectedTrip && (
            <div className="space-y-5 text-sm pt-2">
              <div className="flex gap-2 mb-2">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${sColors[selectedTrip.status]}`}>{sLabels[selectedTrip.status]}</span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{selectedTrip.trip_type==="clinico"?"Traslado Clínico":"Traslado No Clínico"}</span>
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
                    {selectedTrip.accompaniment && selectedTrip.accompaniment !== "ninguno" && <div className="mt-3 pt-3 border-t border-teal-200"><p className="text-xs text-teal-800 font-bold">Acompañamiento: <span className="text-teal-900">{selectedTrip.accompaniment}</span></p></div>}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-1 md:col-span-2"><p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Cometido</p><p className="font-black text-lg text-slate-900">{selectedTrip.task_details}</p></div>
                  <div><p className="text-xs text-slate-500 font-bold">Cantidad de Funcionarios</p><p className="font-medium text-slate-800">{selectedTrip.staff_count}</p></div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Origen</p><p className="font-bold text-slate-900">{selectedTrip.origin}</p><p className="text-xs text-slate-500 mt-1">{selectedTrip.patient_unit||""} {selectedTrip.bed?`(Cama ${selectedTrip.bed})`:""}</p></div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5"/> Destino</p><p className="font-bold text-slate-900">{selectedTrip.destination}</p></div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100"><p className="text-xs text-red-600 font-bold mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> Horarios</p><p className="font-bold text-red-900 text-sm">Citación: {selectedTrip.appointment_time||"-"} | Salida: {selectedTrip.departure_time||"-"}</p><p className="text-xs text-red-700 mt-1">Fecha Prog: {selectedTrip.scheduled_date}</p></div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div><p className="text-xs text-slate-500 font-bold mb-1">Conductor Asignado</p><p className="font-bold text-teal-700 flex items-center gap-1.5"><User className="w-4 h-4"/>{selectedTrip.driver_name || "Sin asignar"}</p></div>
                <div><p className="text-xs text-slate-500 font-bold mb-1">Vehículo Asignado</p><p className="font-bold text-slate-800 flex items-center gap-1.5"><Truck className="w-4 h-4"/>{selectedTrip.vehicle_plate || "Sin asignar"}</p></div>
              </div>

              {(selectedTrip.start_mileage != null || selectedTrip.end_mileage != null) && (
                <div className="grid grid-cols-3 gap-3 border-t border-slate-200 pt-5">
                  <div className="text-center p-2"><p className="text-xs text-slate-500">KM Inicio</p><p className="font-bold">{selectedTrip.start_mileage != null ? selectedTrip.start_mileage.toLocaleString() : "-"}</p></div>
                  <div className="text-center p-2"><p className="text-xs text-slate-500">KM Final</p><p className="font-bold">{selectedTrip.end_mileage != null ? selectedTrip.end_mileage.toLocaleString() : "-"}</p></div>
                  <div className="text-center p-2 bg-emerald-50 rounded-lg"><p className="text-xs text-emerald-700 font-bold">KM Recorridos</p><p className="font-black text-emerald-800">{(selectedTrip.start_mileage != null && selectedTrip.end_mileage != null) ? (selectedTrip.end_mileage - selectedTrip.start_mileage).toLocaleString() : "-"}</p></div>
                </div>
              )}

              {selectedTrip.notes && (<div className="border-t border-slate-200 pt-5"><p className="text-xs text-slate-500 font-bold mb-2">Notas Adicionales</p><p className="bg-amber-50 p-4 rounded-xl text-slate-800 border border-amber-100">{selectedTrip.notes}</p></div>)}
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
  const fetchVehicles = useCallback(async () => { try { const r = await api.get("/vehicles"); setVehicles(r.data); } catch {} finally { setLoading(false); } }, []);
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {statusOptions.map(s => (
          <div key={s} className="stat-card text-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-3xl font-black text-slate-900">{vehicles.filter(v => v.status === s).length}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mt-1">{s.replace(/_/g, " ")}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {vehicles.map(v => (
          <Card key={v.id} className={`shadow-sm transition-all hover:shadow-md ${v.maintenance_alert === "rojo" ? "border-red-400 border-2" : v.maintenance_alert === "amarillo" ? "border-amber-400 border-2" : "border-slate-200"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center"><Truck className="w-5 h-5 text-teal-600" /></div><span className="font-black text-xl text-slate-900">{v.plate}</span></div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[v.status] || "bg-slate-100"}`}>{v.status.replace(/_/g, " ")}</span>
              </div>
              <p className="text-sm font-medium text-slate-600 mb-4">{v.brand} {v.model} ({v.year})</p>
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 text-sm">
                <div><p className="text-[10px] uppercase font-bold text-slate-400">Kilometraje</p><p className="font-bold text-slate-800">{(v.mileage || 0).toLocaleString()} km</p></div>
                <div className="text-right"><p className="text-[10px] uppercase font-bold text-slate-400">Mantención</p><p className="font-bold text-slate-800">{(v.next_maintenance_km || 0).toLocaleString()} km</p></div>
              </div>
              <Select value={v.status} onValueChange={val => handleStatusChange(v.id, val)}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s} className="font-medium">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </CardContent>
          </Card>
        ))}
        {vehicles.length === 0 && !loading && <p className="text-slate-400 col-span-full text-center py-12">Sin vehículos registrados</p>}
      </div>
    </div>
  );
}

function DriversSection() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchDrivers = useCallback(async () => { try { const r = await api.get("/drivers"); setDrivers(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const isLicenseExpired = (expiry) => {
    if (!expiry) return false;
    try { return new Date(expiry) < new Date(); } catch { return false; }
  };

  return (
    <div className="animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Gestión de Conductores</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {drivers.map(d => (
          <Card key={d.id} className={`shadow-sm hover:shadow-md transition-all ${isLicenseExpired(d.license_expiry) ? "border-red-400 border-2" : "border-slate-200"}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center"><User className="w-5 h-5 text-indigo-600" /></div>
                  <div><p className="font-bold text-slate-900 text-lg">{d.name}</p><p className="text-xs font-medium text-slate-500">{d.email}</p></div>
                </div>
              </div>
              {d.extra_available && <Badge className="bg-teal-100 text-teal-800 border border-teal-200 w-full justify-center py-1.5 mb-3 shadow-sm">DISPONIBILIDAD EXTRA ACTIVA</Badge>}
              {isLicenseExpired(d.license_expiry) && (
                <div className="flex items-center justify-center gap-2 mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" /><span className="text-xs text-red-700 font-bold uppercase tracking-wider">Licencia Vencida</span>
                </div>
              )}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Vencimiento Licencia</p>
                <input type="date" className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm bg-white text-slate-700 font-medium cursor-not-allowed" value={d.license_expiry ? d.license_expiry.split("T")[0] : ""} disabled />
              </div>
            </CardContent>
          </Card>
        ))}
        {drivers.length === 0 && !loading && <p className="text-slate-400 col-span-full text-center py-12">Sin conductores registrados</p>}
      </div>
    </div>
  );
}
