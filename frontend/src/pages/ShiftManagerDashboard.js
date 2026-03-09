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
        {section === "dispatch" && <DispatchSection onNavigate={setSection} />}
        {section === "drivers" && <DriversSection />}
        {section === "vehicles" && <VehiclesSection />}
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
      const [s, p, a, h] = await Promise.all([api.get("/stats"), api.get("/trips/pool"), api.get("/trips/active"), api.get("/trips/history")]);
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
    </div>
  );
}

function CalendarSection() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null); // Para modal

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
    api.get(`/trips/calendar?start_date=${startDate}&end_date=${endDate}`).then(r => { setTrips(r.data); }).catch(() => { });
  }, [startDate, endDate]);

  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const statusColors = { pendiente: "bg-amber-100 border-amber-200 text-amber-900", asignado: "bg-teal-100 border-teal-200 text-teal-900", en_curso: "bg-blue-100 border-blue-200 text-blue-900", completado: "bg-emerald-100 border-emerald-200 text-emerald-900" };
  const today = new Date().toISOString().split("T")[0];

  // Reutilizo modal
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
                  <div key={t.id} onClick={() => setSelectedTrip(t)} className={`p-2.5 rounded-lg border shadow-sm transition-all hover:shadow-md hover:ring-2 hover:ring-teal-400 cursor-pointer ${statusColors[t.status] || "bg-slate-50 border-slate-200 text-slate-700"}`}>
                    <p className="font-bold text-[11px] leading-tight mb-1"><span className="text-teal-700 font-mono mr-1">[{t.tracking_number || t.id.substring(0, 4).toUpperCase()}]</span>{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                    <p className="text-[10px] opacity-80 leading-tight flex items-center gap-1"><MapPin className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">{t.origin}</span></p>
                    <p className="text-[10px] opacity-80 leading-tight flex items-center gap-1 mt-0.5"><ArrowRight className="w-2.5 h-2.5 shrink-0" /> <span className="truncate">{t.destination}</span></p>
                    {t.driver_name && <div className="mt-1.5 pt-1.5 border-t border-black/10 text-[9px] font-bold flex items-center gap-1"><User className="w-2.5 h-2.5" />{t.driver_name}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detalle */}
      <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl text-slate-900 border-b pb-2 flex items-center gap-3">Detalle del Traslado <Badge className="bg-slate-800 text-white font-mono text-sm px-2 py-1">{selectedTrip?.tracking_number || selectedTrip?.id.substring(0, 6).toUpperCase()}</Badge></DialogTitle></DialogHeader>
          {selectedTrip && (
            <div className="space-y-5 text-sm pt-2">
              <div className="flex gap-2 mb-2"><span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${sColors[selectedTrip.status]}`}>{sLabels[selectedTrip.status]}</span><span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold uppercase border border-slate-200">{selectedTrip.trip_type === "clinico" ? "Traslado Clínico" : "Traslado No Clínico"}</span><span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${selectedTrip.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700"}`}>{selectedTrip.priority}</span></div>
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
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Origen</p><p className="font-bold text-slate-900">{selectedTrip.origin}</p><p className="text-xs text-slate-500 mt-1">{selectedTrip.patient_unit || ""} {selectedTrip.bed ? `(Cama ${selectedTrip.bed})` : ""}</p></div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> Destino</p><p className="font-bold text-slate-900">{selectedTrip.destination}</p></div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100"><p className="text-xs text-red-600 font-bold mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Horarios</p><p className="font-bold text-red-900 text-sm">Citación: {selectedTrip.appointment_time || "-"} | Salida: {selectedTrip.departure_time || "-"}</p><p className="text-xs text-red-700 mt-1">Fecha Prog: {selectedTrip.scheduled_date}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Removed ByVehicleSection

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

  useEffect(() => { api.get("/destinations").then(r => setDestinations(r.data)).catch(() => { }); }, []);
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
            <><h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><User className="w-5 h-5" /> Datos Paciente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Nombre *</Label><Input value={f.patient_name} onChange={e => setF({ ...f, patient_name: e.target.value })} /></div><div className="space-y-1"><Label>RUT</Label><Input value={f.rut} onChange={e => setF({ ...f, rut: e.target.value })} /></div><div className="space-y-1"><Label>Edad</Label><Input value={f.age} onChange={e => setF({ ...f, age: e.target.value })} /></div><div className="space-y-1"><Label>Peso</Label><Input value={f.weight} onChange={e => setF({ ...f, weight: e.target.value })} /></div><div className="space-y-1 md:col-span-2"><Label>Diagnóstico</Label><Input value={f.diagnosis} onChange={e => setF({ ...f, diagnosis: e.target.value })} /></div></div>
              <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mt-8 flex items-center gap-2"><Activity className="w-5 h-5" /> Detalles Médicos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Solicitante Clínico *</Label><Input value={f.requester_person} onChange={e => setF({ ...f, requester_person: e.target.value })} /></div><div className="space-y-1"><Label>Médico Tratante</Label><Input value={f.attending_physician} onChange={e => setF({ ...f, attending_physician: e.target.value })} /></div><div className="space-y-1"><Label>Motivo *</Label><Select value={f.transfer_reason} onValueChange={v => setF({ ...f, transfer_reason: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{tOpt.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div></div></>
          )}
          {tripType === "no_clinico" && (
            <><h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Detalle Cometido</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1 md:col-span-2"><Label>Cometido *</Label><Input value={f.task_details} onChange={e => setF({ ...f, task_details: e.target.value })} /></div><div className="space-y-1"><Label>Cantidad Funcionarios *</Label><Input type="number" min="1" value={f.staff_count} onChange={e => setF({ ...f, staff_count: e.target.value })} /></div></div></>
          )}
          <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mt-8 flex items-center gap-2"><MapPin className="w-5 h-5" /> Ubicación y Tiempos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Origen *</Label>{!useCO ? <Select onValueChange={v => v === "otro" ? setUseCO(true) : setF({ ...f, origin: v })}><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro (escribir)</SelectItem></SelectContent></Select> : <Input placeholder="Escriba origen (Doble clic para lista)" value={f.origin} onChange={e => setF({ ...f, origin: e.target.value })} onDoubleClick={() => setUseCO(false)} />}</div><div className="space-y-1"><Label>Destino *</Label>{!useCD ? <Select onValueChange={v => v === "otro" ? setUseCD(true) : setF({ ...f, destination: v })}><SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro (escribir)</SelectItem></SelectContent></Select> : <Input placeholder="Escriba destino (Doble clic para lista)" value={f.destination} onChange={e => setF({ ...f, destination: e.target.value })} onDoubleClick={() => setUseCD(false)} />}</div>
            {tripType === "clinico" && (<><div className="space-y-1"><Label>Unidad/Servicio *</Label><Input value={f.patient_unit} onChange={e => setF({ ...f, patient_unit: e.target.value })} /></div><div className="space-y-1"><Label>Cama</Label><Input value={f.bed} onChange={e => setF({ ...f, bed: e.target.value })} /></div><div className="space-y-1"><Label>Hora Citación *</Label><Input type="time" value={f.appointment_time} onChange={e => setF({ ...f, appointment_time: e.target.value })} /></div></>)}
            <div className="space-y-1"><Label>Fecha Traslado</Label><Input type="date" value={f.scheduled_date} onChange={e => setF({ ...f, scheduled_date: e.target.value })} /></div><div className="space-y-1"><Label>Hora Salida</Label><Input type="time" value={f.departure_time} onChange={e => setF({ ...f, departure_time: e.target.value })} /></div></div>
          {tripType === "clinico" && (
            <><h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mt-8 flex items-center gap-2"><Plus className="w-5 h-5" /> Requerimientos</h3><div className="space-y-2"><Label>Personal *</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">{pOpt.map(o => (<label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.required_personnel.includes(o)} onChange={() => handleCB("required_personnel", o)} className="w-4 h-4 text-teal-600 rounded" /> {o}</label>))}</div></div><div className="space-y-2"><Label>Requerimientos Paciente *</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">{rOpt.map(o => (<label key={o} className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.patient_requirements.includes(o)} onChange={() => handleCB("patient_requirements", o)} className="w-4 h-4 text-teal-600 rounded" /> {o}</label>))}</div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-1"><Label>Acompañamiento</Label><Select value={f.accompaniment} onValueChange={v => setF({ ...f, accompaniment: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ninguno">Ninguno</SelectItem><SelectItem value="Materno">Materno</SelectItem><SelectItem value="Tutor">Tutor</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent></Select></div><div className="space-y-1"><Label>Prioridad</Label><Select value={f.priority} onValueChange={v => setF({ ...f, priority: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent></Select></div></div></>
          )}
          <div className="space-y-2 pt-4"><Label>Notas Adicionales</Label><textarea className="w-full min-h-[100px] p-3 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Información extra relevante..." /></div>
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
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Origen</p><p className="font-bold text-slate-900">{selectedTrip.origin}</p><p className="text-xs text-slate-500 mt-1">{selectedTrip.patient_unit || ""} {selectedTrip.bed ? `(Cama ${selectedTrip.bed})` : ""}</p></div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm"><p className="text-xs text-slate-500 font-bold mb-1 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> Destino</p><p className="font-bold text-slate-900">{selectedTrip.destination}</p></div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100"><p className="text-xs text-red-600 font-bold mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Horarios</p><p className="font-bold text-red-900 text-sm">Citación: {selectedTrip.appointment_time || "-"} | Salida: {selectedTrip.departure_time || "-"}</p><p className="text-xs text-red-700 mt-1">Fecha Prog: {selectedTrip.scheduled_date}</p></div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-5">
                <div><p className="text-xs text-slate-500 font-bold mb-1">Conductor Asignado</p><p className="font-bold text-teal-700 flex items-center gap-1.5"><User className="w-4 h-4" />{selectedTrip.driver_name || "Sin asignar"}</p></div>
                <div><p className="text-xs text-slate-500 font-bold mb-1">Vehículo Asignado</p><p className="font-bold text-slate-800 flex items-center gap-1.5"><Truck className="w-4 h-4" />{selectedTrip.vehicle_plate || "Sin asignar"}</p></div>
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
  const fetchDrivers = useCallback(async () => { try { const r = await api.get("/drivers"); setDrivers(r.data); } catch { } finally { setLoading(false); } }, []);
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
f u n c t i o n   B y D r i v e r S e c t i o n ( )   {  
         c o n s t   [ d a t a ,   s e t D a t a ]   =   u s e S t a t e ( [ ] ) ;  
         c o n s t   [ d a t e ,   s e t D a t e ]   =   u s e S t a t e ( n e w   D a t e ( ) . t o I S O S t r i n g ( ) . s p l i t ( " T " ) [ 0 ] ) ;  
         c o n s t   [ l o a d i n g ,   s e t L o a d i n g ]   =   u s e S t a t e ( t r u e ) ;  
  
         c o n s t   f e t c h B o a r d   =   u s e C a l l b a c k ( a s y n c   ( )   = >   {  
                 t r y   {  
                         c o n s t   r e s   =   a w a i t   a p i . g e t ( ` / t r i p s / b y - d r i v e r ? d a t e = $ { d a t e } ` ) ;  
                         s e t D a t a ( r e s . d a t a ) ;  
                 }   c a t c h   ( e )   {   t o a s t . e r r o r ( " E r r o r   a l   c a r g a r   l a   p i z a r r a   g r � � f i c a " ) ;   }  
                 f i n a l l y   {   s e t L o a d i n g ( f a l s e ) ;   }  
         } ,   [ d a t e ] ) ;  
  
         u s e E f f e c t ( ( )   = >   {   f e t c h B o a r d ( ) ;   } ,   [ f e t c h B o a r d ] ) ;  
  
         c o n s t   o n D r a g E n d   =   a s y n c   ( r e s u l t )   = >   {  
                 i f   ( ! r e s u l t . d e s t i n a t i o n )   r e t u r n ;  
                 c o n s t   s I d   =   r e s u l t . s o u r c e . d r o p p a b l e I d ;  
                 c o n s t   d I d   =   r e s u l t . d e s t i n a t i o n . d r o p p a b l e I d ;  
  
                 l e t   n e w D a t a   =   [ . . . d a t a ] ;  
                 c o n s t   s D r i v e r I n d e x   =   n e w D a t a . f i n d I n d e x ( d   = >   d . d r i v e r . i d   = = =   s I d ) ;  
                 c o n s t   d D r i v e r I n d e x   =   n e w D a t a . f i n d I n d e x ( d   = >   d . d r i v e r . i d   = = =   d I d ) ;  
  
                 i f   ( s D r i v e r I n d e x   = = =   - 1   | |   d D r i v e r I n d e x   = = =   - 1 )   r e t u r n ;  
  
                 c o n s t   s T r i p s   =   A r r a y . f r o m ( n e w D a t a [ s D r i v e r I n d e x ] . t r i p s ) ;  
                 c o n s t   d T r i p s   =   A r r a y . f r o m ( n e w D a t a [ d D r i v e r I n d e x ] . t r i p s ) ;  
                 c o n s t   [ m o v e d ]   =   s T r i p s . s p l i c e ( r e s u l t . s o u r c e . i n d e x ,   1 ) ;  
  
                 i f   ( s I d   = = =   d I d )   {  
                         s T r i p s . s p l i c e ( r e s u l t . d e s t i n a t i o n . i n d e x ,   0 ,   m o v e d ) ;  
                         n e w D a t a [ s D r i v e r I n d e x ] . t r i p s   =   s T r i p s ;  
                         s e t D a t a ( n e w D a t a ) ;  
                         t r y   {  
                                 a w a i t   a p i . p o s t ( " / t r i p s / r e o r d e r " ,   {   t r i p _ i d s :   s T r i p s . m a p ( t   = >   t . i d )   } ) ;  
                         }   c a t c h   ( e )   {   t o a s t . e r r o r ( " E r r o r   r e o r d e n a n d o " ) ;   f e t c h B o a r d ( ) ;   }  
                 }   e l s e   {  
                         d T r i p s . s p l i c e ( r e s u l t . d e s t i n a t i o n . i n d e x ,   0 ,   m o v e d ) ;  
                         n e w D a t a [ s D r i v e r I n d e x ] . t r i p s   =   s T r i p s ;  
                         n e w D a t a [ d D r i v e r I n d e x ] . t r i p s   =   d T r i p s ;  
                         s e t D a t a ( n e w D a t a ) ;  
  
                         t r y   {  
                                 i f   ( d I d   = = =   " u n a s s i g n e d " )   {  
                                         a w a i t   a p i . p u t ( ` / t r i p s / $ { m o v e d . i d } / u n a s s i g n ` ) ;  
                                 }   e l s e   {  
                                         a w a i t   a p i . p u t ( ` / t r i p s / $ { m o v e d . i d } / m a n a g e r - a s s i g n ` ,   {   d r i v e r _ i d :   d I d   } ) ;  
                                 }  
                                 a w a i t   a p i . p o s t ( " / t r i p s / r e o r d e r " ,   {   t r i p _ i d s :   d T r i p s . m a p ( t   = >   t . i d )   } ) ;  
                                 f e t c h B o a r d ( ) ;  
                         }   c a t c h   ( e )   {   t o a s t . e r r o r ( " E r r o r   m o d i f i c a n d o   c o n d u c t o r " ) ;   f e t c h B o a r d ( ) ;   }  
                 }  
         } ;  
  
         i f   ( l o a d i n g )   r e t u r n   < d i v   c l a s s N a m e = " t e x t - c e n t e r   p y - 1 2   t e x t - s l a t e - 5 0 0 " > < A c t i v i t y   c l a s s N a m e = " w - 8   h - 8   a n i m a t e - s p i n   m x - a u t o   m b - 2   t e x t - t e a l - 6 0 0 "   / > C a r g a n d o   p i z a r r a . . . < / d i v > ;  
  
         r e t u r n   (  
                 < d i v   c l a s s N a m e = " a n i m a t e - s l i d e - u p " >  
                         < d i v   c l a s s N a m e = " f l e x   j u s t i f y - b e t w e e n   i t e m s - c e n t e r   m b - 6 " >  
                                 < h 1   c l a s s N a m e = " t e x t - 2 x l   m d : t e x t - 3 x l   f o n t - b o l d   t e x t - s l a t e - 9 0 0   f l e x   i t e m s - c e n t e r   g a p - 3 " > < U s e r s   c l a s s N a m e = " w - 8   h - 8   t e x t - t e a l - 6 0 0 "   / >   P i z a r r a   G r � � f i c a   ( C o n d u c t o r e s ) < / h 1 >  
                                 < d i v   c l a s s N a m e = " f l e x   i t e m s - c e n t e r   g a p - 2   b g - w h i t e   r o u n d e d - l g   s h a d o w - s m   b o r d e r   b o r d e r - s l a t e - 2 0 0   p x - 3   p y - 1 " >  
                                         < C a l e n d a r I c o n   c l a s s N a m e = " w - 4   h - 4   t e x t - s l a t e - 5 0 0 "   / >  
                                         < I n p u t   t y p e = " d a t e "   v a l u e = { d a t e }   o n C h a n g e = { e   = >   {   s e t L o a d i n g ( t r u e ) ;   s e t D a t e ( e . t a r g e t . v a l u e ) ;   } }   c l a s s N a m e = " b o r d e r - 0   s h a d o w - n o n e   f o c u s - v i s i b l e : r i n g - 0   w - a u t o "   / >  
                                 < / d i v >  
                         < / d i v >  
  
                         < D r a g D r o p C o n t e x t   o n D r a g E n d = { o n D r a g E n d } >  
                                 < d i v   c l a s s N a m e = " f l e x   g a p - 4   o v e r f l o w - x - a u t o   p b - 4   i t e m s - s t a r t   h - [ c a l c ( 1 0 0 v h - 2 8 0 p x ) ] " >  
                                         { d a t a . m a p ( ( c o l )   = >   (  
                                                 < d i v   k e y = { c o l . d r i v e r . i d }   c l a s s N a m e = { ` f l e x - s h r i n k - 0   w - 8 0   r o u n d e d - x l   f l e x   f l e x - c o l   h - f u l l   b o r d e r   $ { c o l . d r i v e r . i d   = = =   " u n a s s i g n e d "   ?   " b g - a m b e r - 5 0 / 5 0   b o r d e r - a m b e r - 2 0 0   b o r d e r - d a s h e d "   :   " b g - s l a t e - 5 0   b o r d e r - s l a t e - 2 0 0   s h a d o w - s m " } ` } >  
                                                         < d i v   c l a s s N a m e = { ` p - 4   r o u n d e d - t - x l   b o r d e r - b   f l e x   j u s t i f y - b e t w e e n   i t e m s - c e n t e r   $ { c o l . d r i v e r . i d   = = =   " u n a s s i g n e d "   ?   " b g - a m b e r - 1 0 0   b o r d e r - a m b e r - 2 0 0 "   :   " b g - w h i t e   b o r d e r - s l a t e - 1 0 0 " } ` } >  
                                                                 < d i v >  
                                                                         < h 3   c l a s s N a m e = " f o n t - b l a c k   t e x t - s l a t e - 8 0 0   f l e x   i t e m s - c e n t e r   g a p - 2 " >  
                                                                                 { c o l . d r i v e r . i d   = = =   " u n a s s i g n e d "   ?   < A l e r t C i r c l e   c l a s s N a m e = " w - 5   h - 5   t e x t - a m b e r - 6 0 0 "   / >   :   < U s e r   c l a s s N a m e = " w - 5   h - 5   t e x t - t e a l - 6 0 0 "   / > }  
                                                                                 { c o l . d r i v e r . n a m e }  
                                                                         < / h 3 >  
                                                                         < p   c l a s s N a m e = " t e x t - x s   t e x t - s l a t e - 5 0 0   f o n t - b o l d   m t - 1 " > { c o l . t r i p s . l e n g t h }   v i a j e s < / p >  
                                                                 < / d i v >  
                                                         < / d i v >  
                                                         < D r o p p a b l e   d r o p p a b l e I d = { c o l . d r i v e r . i d } >  
                                                                 { ( p r o v i d e d ,   s n a p s h o t )   = >   (  
                                                                         < d i v   r e f = { p r o v i d e d . i n n e r R e f }   { . . . p r o v i d e d . d r o p p a b l e P r o p s }   c l a s s N a m e = { ` p - 2   f l e x - g r o w   o v e r f l o w - y - a u t o   s p a c e - y - 2   t r a n s i t i o n - c o l o r s   $ { s n a p s h o t . i s D r a g g i n g O v e r   ?   " b g - t e a l - 5 0 / 5 0 "   :   " " } ` } >  
                                                                                 { c o l . t r i p s . m a p ( ( t ,   i d x )   = >   (  
                                                                                         < D r a g g a b l e   k e y = { t . i d }   d r a g g a b l e I d = { t . i d }   i n d e x = { i d x } >  
                                                                                                 { ( p r o v i d e d ,   s n a p )   = >   (  
                                                                                                         < d i v   r e f = { p r o v i d e d . i n n e r R e f }   { . . . p r o v i d e d . d r a g g a b l e P r o p s }   { . . . p r o v i d e d . d r a g H a n d l e P r o p s }   c l a s s N a m e = { ` b g - w h i t e   p - 3   r o u n d e d - l g   s h a d o w - s m   b o r d e r   $ { s n a p . i s D r a g g i n g   ?   " s h a d o w - l g   s c a l e - 1 0 5   b o r d e r - t e a l - 3 0 0   z - 5 0 "   :   " b o r d e r - s l a t e - 2 0 0   h o v e r : b o r d e r - t e a l - 2 0 0   h o v e r : s h a d o w - m d " }   t r a n s i t i o n - a l l   c u r s o r - g r a b ` } >  
                                                                                                                 < d i v   c l a s s N a m e = " f l e x   j u s t i f y - b e t w e e n   i t e m s - s t a r t   m b - 2 " >  
                                                                                                                         < B a d g e   c l a s s N a m e = " b g - s l a t e - 8 0 0   f o n t - m o n o   t e x t - [ 1 0 p x ] " > { t . t r a c k i n g _ n u m b e r } < / B a d g e >  
                                                                                                                         { t . t r i p _ t y p e   = = =   " c l i n i c o "   ?   < A c t i v i t y   c l a s s N a m e = " w - 3 . 5   h - 3 . 5   t e x t - r o s e - 5 0 0 "   / >   :   < T r u c k   c l a s s N a m e = " w - 3 . 5   h - 3 . 5   t e x t - b l u e - 5 0 0 "   / > }  
                                                                                                                 < / d i v >  
                                                                                                                 < p   c l a s s N a m e = " f o n t - b o l d   t e x t - s m   t e x t - s l a t e - 8 0 0   l e a d i n g - t i g h t   m b - 2   t r u n c a t e "   t i t l e = { t . t r i p _ t y p e   = = =   " c l i n i c o "   ?   t . p a t i e n t _ n a m e   :   t . t a s k _ d e t a i l s } > { t . t r i p _ t y p e   = = =   " c l i n i c o "   ?   t . p a t i e n t _ n a m e   :   t . t a s k _ d e t a i l s } < / p >  
                                                                                                                 < d i v   c l a s s N a m e = " t e x t - x s   s p a c e - y - 1 . 5   t e x t - s l a t e - 6 0 0 " >  
                                                                                                                         < p   c l a s s N a m e = " f l e x   i t e m s - c e n t e r   g a p - 1 . 5   t r u n c a t e " > < M a p P i n   c l a s s N a m e = " w - 3 . 5   h - 3 . 5   t e x t - s l a t e - 4 0 0   s h r i n k - 0 "   / > { t . o r i g i n } < / p >  
                                                                                                                         < p   c l a s s N a m e = " f l e x   i t e m s - c e n t e r   g a p - 1 . 5   t r u n c a t e " > < A r r o w R i g h t   c l a s s N a m e = " w - 3 . 5   h - 3 . 5   t e x t - t e a l - 5 0 0   s h r i n k - 0 "   / > { t . d e s t i n a t i o n } < / p >  
                                                                                                                         < p   c l a s s N a m e = " f l e x   i t e m s - c e n t e r   g a p - 1 . 5   m t - 2   p t - 2   b o r d e r - t   f o n t - m e d i u m   t e x t - s l a t e - 7 0 0 " > < C l o c k   c l a s s N a m e = " w - 3 . 5   h - 3 . 5   s h r i n k - 0 "   / > S a l i d a :   { t . d e p a r t u r e _ t i m e   | |   " - " } < / p >  
                                                                                                                 < / d i v >  
                                                                                                         < / d i v >  
                                                                                                 ) }  
                                                                                         < / D r a g g a b l e >  
                                                                                 ) ) }  
                                                                                 { p r o v i d e d . p l a c e h o l d e r }  
                                                                         < / d i v >  
                                                                 ) }  
                                                         < / D r o p p a b l e >  
                                                 < / d i v >  
                                         ) ) }  
                                 < / d i v >  
                         < / D r a g D r o p C o n t e x t >  
                 < / d i v >  
         ) ;  
 }  
 