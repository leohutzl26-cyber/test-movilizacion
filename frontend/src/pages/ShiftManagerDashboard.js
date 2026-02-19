import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Users, Truck, Clock, AlertTriangle, RefreshCw, User, MapPin, ArrowRight, ArrowLeftRight, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";

export default function ShiftManagerDashboard() {
  const [section, setSection] = useState("dispatch");
  return (
    <div className="min-h-screen bg-slate-50" data-testid="manager-dashboard">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {section === "dispatch" && <DispatchSection onNavigate={setSection} />}
          {section === "drivers" && <DriversSection />}
          {section === "vehicles" && <VehiclesSection />}
          {section === "assign" && <AssignSection />}
          {section === "calendar" && <CalendarSection />}
        </div>
      </main>
    </div>
  );
}

function DispatchSection({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [poolTrips, setPoolTrips] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, p, a] = await Promise.all([api.get("/stats"), api.get("/trips/pool"), api.get("/trips/active")]);
      setStats(s.data); setPoolTrips(p.data); setActiveTrips(a.data.filter(t => t.driver_id));
    } catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); const interval = setInterval(fetchAll, 15000); return () => clearInterval(interval); }, [fetchAll]);

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800" };
  const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900" data-testid="dispatch-title">Consola de Despacho</h1>
        <Button variant="outline" onClick={fetchAll} disabled={refreshing} data-testid="refresh-btn">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Actualizar
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pendientes", value: stats.pending_trips, icon: Clock, color: "text-amber-600 bg-amber-50", nav: "assign" },
            { label: "Activos", value: stats.active_trips, icon: Truck, color: "text-blue-600 bg-blue-50", nav: "assign" },
            { label: "Conductores", value: stats.total_drivers, icon: Users, color: "text-teal-600 bg-teal-50", nav: "drivers" },
            { label: "Vehiculos Disp.", value: stats.vehicles_available, icon: Truck, color: "text-emerald-600 bg-emerald-50", nav: "vehicles" },
          ].map(c => (
            <div key={c.label}
              className={`stat-card animate-slide-up ${c.nav ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all" : ""}`}
              onClick={() => c.nav && onNavigate(c.nav)}
              data-testid={`dispatch-stat-${c.label.toLowerCase().replace(/ /g,'-')}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
              {c.nav && <p className="text-xs text-teal-600 mt-1 font-medium">Ver detalle →</p>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Bolsa de Trabajo ({poolTrips.length})</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-teal-600" onClick={() => onNavigate("assign")} data-testid="go-to-assign">Asignar →</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {poolTrips.map(t => (
              <div key={t.id} className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm animate-slide-up" data-testid={`pool-trip-${t.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                  <span className="text-xs text-slate-400">{t.scheduled_date || new Date(t.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="font-medium text-slate-900">{t.patient_name || "Sin nombre"}</p>
                <p className="text-sm text-slate-500 mt-1">{t.origin} → {t.destination}</p>
              </div>
            ))}
            {poolTrips.length === 0 && <p className="text-center py-8 text-slate-400">Sin viajes pendientes</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" />Viajes Activos ({activeTrips.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {activeTrips.map(t => (
              <div key={t.id} className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm" data-testid={`active-trip-${t.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{t.driver_name}</span>
                </div>
                <p className="font-medium text-slate-900">{t.patient_name || "Sin nombre"}</p>
                <p className="text-sm text-slate-500">{t.origin} → {t.destination}</p>
              </div>
            ))}
            {activeTrips.length === 0 && <p className="text-center py-8 text-slate-400">Sin viajes activos</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function VehiclesSection() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchVehicles = useCallback(async () => { try { const r = await api.get("/vehicles"); setVehicles(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const statusColors = {
    disponible: "bg-green-100 text-green-800",
    en_servicio: "bg-blue-100 text-blue-800",
    en_limpieza: "bg-violet-100 text-violet-800",
    en_taller: "bg-orange-100 text-orange-800",
    fuera_de_servicio: "bg-red-100 text-red-800"
  };

  const alertIcon = (alert) => {
    if (alert === "rojo") return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (alert === "amarillo") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return null;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6" data-testid="vehicles-section-title">Flota de Vehiculos</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {["disponible", "en_servicio", "en_limpieza", "en_taller"].map(s => (
          <div key={s} className="stat-card text-center">
            <p className="text-2xl font-bold text-slate-900">{vehicles.filter(v => v.status === s).length}</p>
            <p className="text-xs text-slate-500 capitalize">{s.replace(/_/g, " ")}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map(v => (
          <Card key={v.id} className={`card-hover ${v.maintenance_alert === "rojo" ? "border-red-300 border-2" : v.maintenance_alert === "amarillo" ? "border-amber-300 border-2" : ""}`} data-testid={`fleet-vehicle-${v.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-teal-600" />
                  <span className="font-bold text-slate-900">{v.plate}</span>
                </div>
                <div className="flex items-center gap-1">
                  {alertIcon(v.maintenance_alert)}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[v.status] || "bg-slate-100"}`}>{v.status.replace(/_/g, " ")}</span>
                </div>
              </div>
              <p className="text-sm text-slate-600">{v.brand} {v.model} ({v.year})</p>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-slate-500">{(v.mileage || 0).toLocaleString()} km</span>
                <span className="text-slate-400 text-xs">Mant: {(v.next_maintenance_km || 0).toLocaleString()} km</span>
              </div>
              {v.maintenance_alert && (
                <div className={`mt-2 p-1.5 rounded text-xs font-medium ${v.maintenance_alert === "rojo" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                  {v.maintenance_alert === "rojo" ? "Mantencion excedida" : "Proxima a mantencion"}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {vehicles.length === 0 && !loading && <p className="text-slate-400 col-span-full text-center py-12">Sin vehiculos registrados</p>}
      </div>
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

  const fetchAll = useCallback(async () => {
    try {
      const [t, d, v] = await Promise.all([api.get("/trips/active"), api.get("/drivers"), api.get("/vehicles")]);
      setTrips(t.data); setDrivers(d.data.filter(d => d.status === "aprobado")); setVehicles(v.data);
    } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAssign = async () => {
    if (!selectedDriver) { toast.error("Seleccione un conductor"); return; }
    try {
      await api.put(`/trips/${assignDialog.id}/manager-assign`, { driver_id: selectedDriver, vehicle_id: selectedVehicle || null });
      toast.success("Viaje asignado exitosamente");
      setAssignDialog(null); setSelectedDriver(""); setSelectedVehicle(""); fetchAll();
    } catch (e) { toast.error(e.response?.data?.detail || "Error al asignar"); }
  };

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800" };
  const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };

  const filteredTrips = filter === "all" ? trips : trips.filter(t => t.status === filter);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4" data-testid="assign-title">Asignacion de Traslados</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {[{v:"all",l:"Todos"},{v:"pendiente",l:"Pendientes"},{v:"asignado",l:"Asignados"},{v:"en_curso",l:"En Curso"}].map(f => (
          <Button key={f.v} variant={filter === f.v ? "default" : "outline"} size="sm" onClick={() => setFilter(f.v)}
            className={filter === f.v ? "bg-teal-600 hover:bg-teal-700" : ""} data-testid={`filter-${f.v}`}>{f.l}</Button>
        ))}
      </div>
      <div className="space-y-3">
        {filteredTrips.map(t => (
          <Card key={t.id} className="card-hover" data-testid={`assign-trip-${t.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                    <span className="text-xs text-slate-400">{t.scheduled_date}</span>
                  </div>
                  <p className="font-semibold text-slate-900">{t.patient_name || "Sin nombre"}</p>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-teal-500" />{t.origin} <ArrowRight className="w-3 h-3" /> {t.destination}
                  </div>
                  {t.driver_name && <p className="text-sm text-teal-600 mt-1 font-medium">Conductor: {t.driver_name}</p>}
                  {t.vehicle_id && <p className="text-xs text-slate-500">Vehiculo: {vehicles.find(v => v.id === t.vehicle_id)?.plate || t.vehicle_id}</p>}
                </div>
                <Button onClick={() => { setAssignDialog(t); setSelectedDriver(t.driver_id || ""); setSelectedVehicle(t.vehicle_id || ""); }}
                  className={`shrink-0 ${t.driver_id ? "bg-amber-500 hover:bg-amber-600" : "bg-teal-600 hover:bg-teal-700"}`}
                  data-testid={`assign-btn-${t.id}`}>
                  <ArrowLeftRight className="w-4 h-4 mr-1" />{t.driver_id ? "Reasignar" : "Asignar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredTrips.length === 0 && !loading && <p className="text-center py-12 text-slate-400">Sin viajes en esta categoria</p>}
      </div>

      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent data-testid="assign-dialog">
          <DialogHeader><DialogTitle>{assignDialog?.driver_id ? "Reasignar Traslado" : "Asignar Traslado"}</DialogTitle></DialogHeader>
          {assignDialog && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-semibold text-sm">{assignDialog.patient_name || "Sin nombre"}</p>
                <p className="text-sm text-slate-500">{assignDialog.origin} → {assignDialog.destination}</p>
                <p className="text-xs text-slate-400 mt-1">Fecha: {assignDialog.scheduled_date} | Prioridad: {assignDialog.priority}</p>
              </div>
              <div className="space-y-2">
                <Label>Conductor *</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger data-testid="assign-driver-select"><SelectValue placeholder="Seleccione conductor" /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} ({d.shift_type}) {d.extra_available ? " - Extra" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Vehiculo (opcional)</Label>
                <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                  <SelectTrigger data-testid="assign-vehicle-select"><SelectValue placeholder="Seleccione vehiculo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vehiculo</SelectItem>
                    {vehicles.filter(v => v.status === "disponible").map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignDialog(null)}>Cancelar</Button>
                <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleAssign} data-testid="confirm-assign-btn">
                  {assignDialog.driver_id ? "Reasignar" : "Asignar"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CalendarSection() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const getWeekDates = (offset) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay() + 1 + (offset * 7));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDates(weekOffset);
  const startDate = weekDays[0].toISOString().split("T")[0];
  const endDate = weekDays[6].toISOString().split("T")[0];

  useEffect(() => {
    setLoading(true);
    api.get(`/trips/calendar?start_date=${startDate}&end_date=${endDate}`).then(r => { setTrips(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [startDate, endDate]);

  const dayNames = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const statusColors = { pendiente: "bg-amber-200", asignado: "bg-teal-200", en_curso: "bg-blue-200", completado: "bg-emerald-200" };
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900" data-testid="calendar-title">Calendario Semanal</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)} data-testid="prev-week"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} data-testid="today-btn">Hoy</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)} data-testid="next-week"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, i) => {
          const dateStr = day.toISOString().split("T")[0];
          const dayTrips = trips.filter(t => t.scheduled_date === dateStr);
          const isToday = dateStr === today;
          return (
            <div key={i} className={`min-h-[200px] rounded-lg border p-2 ${isToday ? "border-teal-500 bg-teal-50/30" : "border-slate-200 bg-white"}`} data-testid={`calendar-day-${dateStr}`}>
              <div className="text-center mb-2">
                <p className={`text-xs font-medium ${isToday ? "text-teal-600" : "text-slate-500"}`}>{dayNames[i]}</p>
                <p className={`text-lg font-bold ${isToday ? "text-teal-700" : "text-slate-900"}`}>{day.getDate()}</p>
              </div>
              <div className="space-y-1">
                {dayTrips.map(t => (
                  <div key={t.id} className={`p-1.5 rounded text-xs ${statusColors[t.status] || "bg-slate-100"}`} data-testid={`cal-trip-${t.id}`}>
                    <p className="font-semibold truncate">{t.patient_name || "Sin nombre"}</p>
                    <p className="text-[10px] truncate opacity-70">{t.origin}→{t.destination}</p>
                    {t.driver_name && <p className="text-[10px] truncate opacity-60">{t.driver_name}</p>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 mt-4 justify-center flex-wrap">
        {[{s:"pendiente",l:"Pendiente",c:"bg-amber-200"},{s:"asignado",l:"Asignado",c:"bg-teal-200"},{s:"en_curso",l:"En Curso",c:"bg-blue-200"},{s:"completado",l:"Completado",c:"bg-emerald-200"}].map(item => (
          <div key={item.s} className="flex items-center gap-1.5"><div className={`w-3 h-3 rounded ${item.c}`} /><span className="text-xs text-slate-600">{item.l}</span></div>
        ))}
      </div>
    </div>
  );
}

function DriversSection() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchDrivers = useCallback(async () => { try { const r = await api.get("/drivers"); setDrivers(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleLicenseUpdate = async (id, date) => {
    try { await api.put(`/drivers/${id}/license`, { license_expiry: date }); toast.success("Licencia actualizada"); fetchDrivers(); }
    catch (e) { toast.error("Error"); }
  };

  const isLicenseExpired = (expiry) => {
    if (!expiry) return false;
    try { return new Date(expiry) < new Date(); } catch { return false; }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6" data-testid="drivers-title">Gestion de Conductores</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map(d => (
          <Card key={d.id} className={`card-hover ${isLicenseExpired(d.license_expiry) ? "border-red-300 border-2" : ""}`} data-testid={`driver-${d.id}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.email}</p>
                </div>
                {d.extra_available && <Badge className="bg-teal-100 text-teal-700 border-0">Extra</Badge>}
              </div>
              {isLicenseExpired(d.license_expiry) && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-700 font-medium">Licencia vencida</span>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Venc. Licencia</p>
                  <input
                    type="date"
                    className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    value={d.license_expiry ? d.license_expiry.split("T")[0] : ""}
                    onChange={(e) => handleLicenseUpdate(d.id, e.target.value)}
                    data-testid={`license-date-${d.id}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {drivers.length === 0 && !loading && <p className="text-slate-400 col-span-full text-center py-12">Sin conductores registrados</p>}
      </div>
    </div>
  );
}
