import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity, CalendarDays, Truck, User, AlertTriangle, RefreshCw, ClipboardList, Stethoscope, Plus, Trash2, XCircle, Search, Car, Bus, Users, Edit, Clock, Shield, Siren, TrendingUp, Gauge, Ban, Zap, Navigation, Award } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import api from "@/lib/api";

const COLORS_PIE = ["#0d9488", "#f59e0b", "#6366f1", "#ef4444", "#22c55e", "#8b5cf6"];
const COLORS_STATUS = { "Pendiente": "#f59e0b", "Por Visar": "#a855f7", "Asignado": "#3b82f6", "En Curso": "#0d9488", "Completado": "#22c55e", "Cancelado": "#ef4444" };

export default function AdminDashboard() {
  const [section, setSection] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dashboard" && <AdminOverview onNavigate={setSection} />}
        {section === "users" && <UsersManager />}
        {section === "destinations" && <DestinationsManager />}
        {section === "audit" && <AuditLogs />}
        {section === "trips" && <TripsManager />}
        {section === "vehicles" && <VehiclesManager />}
        {section === "drivers" && <DriversManager />}
      </main>
    </div>
  );
}

function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [advanced, setAdvanced] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await api.get("/stats");
        setStats(statsRes.data);
      } catch (e) {
        console.error("Error cargando stats:", e);
        setError("Error al cargar estadísticas básicas");
      }
      try {
        const advRes = await api.get("/stats/advanced");
        setAdvanced(advRes.data);
      } catch (e) {
        console.error("Error cargando stats avanzadas:", e);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 font-medium">Cargando panel analítico...</p>
        </div>
      </div>
    );
  }

  if (!stats && !advanced) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto" />
        <p className="text-slate-700 font-bold text-lg">No se pudieron cargar las estadísticas</p>
        <p className="text-slate-500 text-sm">{error || "Verifique que el backend esté corriendo."}</p>
        <Button onClick={() => window.location.reload()} className="bg-teal-600 hover:bg-teal-700 text-white mt-2">
          <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
        </Button>
      </div>
    </div>
  );

  if (!stats) return null;

  // Fallback si las estadísticas avanzadas no están disponibles aún
  const adv = advanced || {
    trips_today: 0, completed_today: 0, cancel_rate: 0, cancelled_trips: 0,
    total_km: 0, daily_trends: [], status_distribution: [], type_distribution: [],
    priority_distribution: [], top_destinations: [], top_drivers: [], users_by_role: []
  };

  const completionRate = stats.total_trips > 0 ? Math.round(stats.completed_trips / stats.total_trips * 100) : 0;

  return (
    <div className="animate-slide-up max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel Analítico</h1>
          <p className="text-slate-500 mt-1">Resumen operativo del sistema de movilización</p>
        </div>
        <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-xs font-bold px-3 py-1.5">
          <Activity className="w-3 h-3 mr-1" /> EN VIVO
        </Badge>
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          label="Traslados Hoy" value={adv.trips_today} 
          sub={`${adv.completed_today} completados`}
          icon={<CalendarDays className="w-5 h-5" />} color="teal" onClick={() => onNavigate("trips")} />
        <KPICard 
          label="En Curso" value={stats.active_trips} 
          sub="Viajes activos ahora"
          icon={<Navigation className="w-5 h-5" />} color="blue" />
        <KPICard 
          label="Tasa de Éxito" value={`${completionRate}%`} 
          sub={`${stats.completed_trips} completados`}
          icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
        <KPICard 
          label="Tasa Cancelación" value={`${adv.cancel_rate}%`} 
          sub={`${adv.cancelled_trips} cancelados`}
          icon={<Ban className="w-5 h-5" />} color="red" />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          label="Total Traslados" value={stats.total_trips.toLocaleString()} 
          sub="Histórico completo"
          icon={<ClipboardList className="w-5 h-5" />} color="indigo" />
        <KPICard 
          label="Pendientes" value={stats.pending_trips} 
          sub="Requieren acción"
          icon={<Clock className="w-5 h-5" />} color="amber" onClick={() => onNavigate("trips")} />
        <KPICard 
          label="Km Recorridos" value={adv.total_km.toLocaleString()} 
          sub="Kilometraje total"
          icon={<Gauge className="w-5 h-5" />} color="violet" />
        <KPICard 
          label="Usuarios Pend." value={stats.pending_users} 
          sub="Esperando aprobación"
          icon={<Users className="w-5 h-5" />} color="amber" onClick={() => onNavigate("users")} />
      </div>

      {/* Trends Chart */}
      <Card className="shadow-sm border-0 ring-1 ring-slate-200/60">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-1">Tendencia de Traslados</h2>
          <p className="text-xs text-slate-400 mb-4">Últimos 30 días</p>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={adv.daily_trends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", fontSize: 12 }} 
                labelFormatter={(v) => `Fecha: ${v}`}
              />
              <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradTotal)" name="Total" />
              <Area type="monotone" dataKey="completados" stroke="#0d9488" strokeWidth={2.5} fill="url(#gradCompleted)" name="Completados" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Row: Status + Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="shadow-sm border-0 ring-1 ring-slate-200/60">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Estado de Traslados</h2>
            <p className="text-xs text-slate-400 mb-4">Distribución actual</p>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={adv.status_distribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10, fontWeight: 700 }}>
                  {adv.status_distribution.map((entry, i) => (
                    <Cell key={i} fill={COLORS_STATUS[entry.name] || COLORS_PIE[i % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Type + Priority */}
        <Card className="shadow-sm border-0 ring-1 ring-slate-200/60">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Tipo y Prioridad</h2>
            <p className="text-xs text-slate-400 mb-4">Clasificación de traslados</p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Por Tipo</p>
                {adv.type_distribution.map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS_PIE[i] }} />
                      <span className="text-sm font-medium text-slate-700">{t.name}</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{t.value}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Por Prioridad</p>
                {adv.priority_distribution.map((p, i) => {
                  const priColor = { "Urgente": "#ef4444", "Normal": "#3b82f6", "Programado": "#22c55e" };
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: priColor[p.name] || "#94a3b8" }} />
                        <span className="text-sm font-medium text-slate-700">{p.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{p.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Row: Top Destinations + Top Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Destinations */}
        <Card className="shadow-sm border-0 ring-1 ring-slate-200/60">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Top 5 Destinos</h2>
            <p className="text-xs text-slate-400 mb-4">Destinos más frecuentes</p>
            {adv.top_destinations.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={adv.top_destinations} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", fontSize: 12 }} />
                  <Bar dataKey="viajes" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-400 py-10">Sin datos de destinos aún.</p>
            )}
          </CardContent>
        </Card>

        {/* Top Drivers */}
        <Card className="shadow-sm border-0 ring-1 ring-slate-200/60">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Top 5 Conductores</h2>
            <p className="text-xs text-slate-400 mb-4">Más viajes completados</p>
            {adv.top_drivers.length > 0 ? (
              <div className="space-y-3">
                {adv.top_drivers.map((d, i) => {
                  const maxViajes = adv.top_drivers[0]?.viajes || 1;
                  const pct = Math.round(d.viajes / maxViajes * 100);
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-800">
                          {i < 3 ? medals[i] : `#${i+1}`} {d.name}
                        </span>
                        <span className="text-sm font-black text-teal-700">{d.viajes}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: i === 0 ? "#0d9488" : i === 1 ? "#14b8a6" : "#5eead4" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-10">Sin datos de conductores aún.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fleet + Users Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Summary */}
        <Card className="shadow-sm border-0 ring-1 ring-slate-200/60 cursor-pointer hover:ring-teal-300 transition-all" onClick={() => onNavigate("vehicles")}>
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Estado de Flota</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-slate-900">{stats.vehicles_available}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Disponibles</p>
              </div>
              <div className="space-y-1">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto">
                  <Truck className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-2xl font-black text-slate-900">{stats.vehicles_en_uso}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">En Uso</p>
              </div>
              <div className="space-y-1">
                <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-2xl font-black text-slate-900">{stats.vehicles_fuera_de_servicio}</p>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">F. Servicio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card className="shadow-sm border-0 ring-1 ring-slate-200/60 cursor-pointer hover:ring-teal-300 transition-all" onClick={() => onNavigate("users")}>
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Usuarios por Rol</h2>
            {adv.users_by_role.length > 0 ? (
              <div className="space-y-3">
                {adv.users_by_role.map((u, i) => {
                  const total = adv.users_by_role.reduce((a, b) => a + b.value, 0);
                  const pct = Math.round(u.value / total * 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{u.name}</span>
                        <span className="text-sm font-black text-slate-900">{u.value} <span className="text-slate-400 font-normal text-xs">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: COLORS_PIE[i % COLORS_PIE.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-slate-400 py-10">Sin datos de usuarios.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KPICard({ label, value, sub, icon, color, onClick }) {
  const colorMap = {
    teal: "from-teal-500 to-teal-600 shadow-teal-200/50",
    blue: "from-blue-500 to-blue-600 shadow-blue-200/50",
    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-200/50",
    red: "from-red-500 to-red-600 shadow-red-200/50",
    indigo: "from-indigo-500 to-indigo-600 shadow-indigo-200/50",
    amber: "from-amber-500 to-amber-600 shadow-amber-200/50",
    violet: "from-violet-500 to-violet-600 shadow-violet-200/50",
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-4 text-white shadow-lg ${onClick ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : ""} transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-xl">{icon}</div>
      </div>
      <p className="text-2xl lg:text-3xl font-black tracking-tight">{value}</p>
      <p className="text-[10px] uppercase font-bold tracking-wider opacity-80 mt-0.5">{label}</p>
      <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>
    </div>
  );
}


function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try { const res = await api.get("/users"); setUsers(res.data); } 
    catch (error) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (id, action) => {
    try {
      if (action === "delete") {
        if (window.confirm("¿Eliminar usuario definitivamente?")) {
          await api.delete(`/users/${id}`); toast.success("Eliminado"); fetchUsers();
        }
      } else {
        await api.put(`/users/${id}/${action}`); toast.success("Estado actualizado"); fetchUsers();
      }
    } catch (e) { toast.error("Error en la operación"); }
  };

  const handleRoleChange = async (id, role) => {
    try { await api.put(`/users/${id}/role`, { role }); toast.success("Rol actualizado"); fetchUsers(); } 
    catch (e) { toast.error("Error al cambiar rol"); }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Gestión de Usuarios</h1>
      {loading ? <p className="text-slate-500 text-center py-10">Cargando usuarios...</p> : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr><th className="p-4">Nombre / Email</th><th className="p-4">Rol</th><th className="p-4 text-center">Estado</th><th className="p-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-4"><p className="font-bold text-slate-900">{u.name}</p><p className="text-slate-500">{u.email}</p></td>
                    <td className="p-4">
                      <Select value={u.role || ""} onValueChange={(val) => handleRoleChange(u.id, val)}>
                        <SelectTrigger className="w-40 h-8 text-xs font-bold"><SelectValue placeholder="Seleccione Rol"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solicitante">Solicitante</SelectItem>
                          <SelectItem value="conductor">Conductor</SelectItem>
                          <SelectItem value="coordinador">Coordinador</SelectItem>
                          <SelectItem value="gestion_camas">Gestión de Camas</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={u.status === "aprobado" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : u.status === "pendiente" ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-red-100 text-red-800 border-red-200"}>{u.status}</Badge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {u.status === "pendiente" && (
                        <><Button size="sm" onClick={() => handleAction(u.id, "approve")} className="bg-teal-600 hover:bg-teal-700 text-white h-8"><CheckCircle className="w-4 h-4 mr-1"/>Aprobar</Button>
                        <Button size="sm" variant="outline" onClick={() => handleAction(u.id, "reject")} className="text-red-600 border-red-200 hover:bg-red-50 h-8"><XCircle className="w-4 h-4 mr-1"/>Rechazar</Button></>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => handleAction(u.id, "delete")} className="text-slate-400 hover:text-red-600 h-8 w-8"><Trash2 className="w-4 h-4"/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DestinationsManager() {
  const [dests, setDests] = useState([]);
  const [name, setName] = useState("");
  const fetchDests = useCallback(async () => { try { const res = await api.get("/destinations"); setDests(res.data); } catch (e) {} }, []);
  useEffect(() => { fetchDests(); }, [fetchDests]);

  const handleAdd = async (e) => {
    e.preventDefault(); if(!name.trim()) return;
    try { await api.post("/destinations", { name }); setName(""); fetchDests(); toast.success("Destino agregado"); } 
    catch (e) { toast.error("Error al agregar"); }
  };
  
  const handleDelete = async (id) => {
    try { await api.delete(`/destinations/${id}`); fetchDests(); toast.success("Eliminado"); } 
    catch (e) { toast.error("Error al eliminar"); }
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Puntos Frecuentes (Orígenes/Destinos)</h1>
      <Card className="mb-6 shadow-sm"><CardContent className="p-5">
        <form onSubmit={handleAdd} className="flex gap-3 items-end">
          <div className="flex-1 space-y-2"><Label className="font-bold">Nombre del Destino</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Hospital Base, Cesfam X..." className="h-11" /></div>
          <Button type="submit" className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold">Agregar a Lista</Button>
        </form>
      </CardContent></Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dests.map(d => (
          <div key={d.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-teal-300 transition-colors">
            <span className="font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-500"/> {d.name}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all" onClick={()=>handleDelete(d.id)}><Trash2 className="w-4 h-4"/></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => { api.get("/audit-logs").then(r => setLogs(r.data)).catch(()=>{}); }, []);

  const filtered = logs.filter(l => 
    (l.user_name || "").toLowerCase().includes(search.toLowerCase()) || 
    (l.action || "").toLowerCase().includes(search.toLowerCase()) || 
    (l.details || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Registro de Auditoría</h1>
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
        <Input placeholder="Buscar por usuario, acción o detalles..." className="pl-11 h-12 bg-white border-slate-300 shadow-sm" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0">
              <tr><th className="p-4">Fecha/Hora</th><th className="p-4">Usuario</th><th className="p-4">Acción</th><th className="p-4">Detalle del Sistema</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-500 font-medium whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="p-4"><p className="font-bold text-slate-900">{l.user_name || "Sistema"}</p><p className="text-[10px] uppercase font-bold text-teal-600">{(l.user_role || "").replace(/_/g, " ")}</p></td>
                  <td className="p-4"><Badge variant="outline" className="bg-white">{l.action}</Badge></td>
                  <td className="p-4 text-slate-600 max-w-md truncate">{l.details}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-400">No se encontraron registros de auditoría.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function VehiclesManager() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ plate: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });

  const fetchVehicles = useCallback(async () => {
    try { const r = await api.get("/vehicles"); setVehicles(r.data); }
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/vehicles/${editingId}`, formData);
        toast.success("Vehículo actualizado exitosamente");
      } else {
        await api.post("/vehicles", formData);
        toast.success("Vehículo creado exitosamente");
      }
      closeDialog();
      fetchVehicles();
    } catch (e) { toast.error(editingId ? "Error al actualizar vehículo" : "Error al crear vehículo"); }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ plate: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });
  };

  const handleEdit = (v) => {
    setEditingId(v.id);
    setFormData({ 
      plate: v.plate, 
      brand: v.brand, 
      model: v.model, 
      type: v.type, 
      year: v.year, 
      mileage: v.mileage,
      next_maintenance_km: v.next_maintenance_km || 10000 
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar vehículo definitivamente?")) {
      try { await api.delete(`/vehicles/${id}`); toast.success("Eliminado"); fetchVehicles(); }
      catch (e) { toast.error("Error al eliminar"); }
    }
  };

  const vehicleIcons = {
    Ambulancia: <Siren className="w-4 h-4 text-red-600" />,
    camion: <Truck className="w-4 h-4 text-blue-600" />,
    "Auto/SUV": <Car className="w-4 h-4 text-slate-600" />,
    Camioneta: (
      <svg className="w-4 h-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 13h4l1-3h4l1 3h10v4H2z" />
        <path d="M12 13v4" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    ),
    Van: <Bus className="w-4 h-4 text-indigo-600" />
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Flota</h1>
        <Button onClick={() => { setEditingId(null); setFormData({ plate: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 }); setIsDialogOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11">
          <Plus className="w-4 h-4 mr-2" /> Agregar Vehículo
        </Button>
      </div>

      {loading ? <p className="text-slate-500">Cargando...</p> : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr><th className="p-4">Tipo</th><th className="p-4">Patente</th><th className="p-4">Marca/Modelo</th><th className="p-4">Año</th><th className="p-4">Kilometraje</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-4">{vehicleIcons[v.type] || <Car className="w-4 h-4" />}</td>
                    <td className="p-4 font-bold text-slate-900">{v.plate}</td>
                    <td className="p-4 text-slate-600">{v.brand} {v.model}</td>
                    <td className="p-4 text-slate-600">{v.year}</td>
                    <td className="p-4 font-bold text-slate-700">{v.mileage?.toLocaleString()} km</td>
                    <td className="p-4"><Badge variant="outline" className="uppercase text-[10px]">{v.status?.replace(/_/g, " ")}</Badge></td>
                    <td className="p-4 text-right space-x-2">
                       <Button size="icon" variant="ghost" onClick={() => handleEdit(v)} className="text-slate-400 hover:text-teal-600 h-8 w-8"><Edit className="w-4 h-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)} className="text-slate-400 hover:text-red-600 h-8 w-8"><Trash2 className="w-4 h-4"/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? "Editar Vehículo" : "Nuevo Vehículo"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Patente *</Label><Input value={formData.plate} onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})} placeholder="ABCD-12" required /></div>
              <div className="space-y-2">
                <Label>Tipo de Vehículo *</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccione Tipo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ambulancia">Ambulancia</SelectItem>
                    <SelectItem value="camion">Camión</SelectItem>
                    <SelectItem value="Auto/SUV">Auto / SUV</SelectItem>
                    <SelectItem value="Camioneta">Camioneta</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Marca</Label><Input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} placeholder="Ej: Toyota" /></div>
              <div className="space-y-2"><Label>Modelo</Label><Input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} placeholder="Ej: Hilux" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Año</Label><Input type="number" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value)})} /></div>
              <div className="space-y-2"><Label>Kilometraje Inicial</Label><Input type="number" value={formData.mileage} onChange={e => setFormData({...formData, mileage: parseFloat(e.target.value)})} /></div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white font-bold">Guardar Vehículo</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DriversManager() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [licenseDate, setLicenseDate] = useState("");

  const fetchDrivers = useCallback(async () => {
    try { const r = await api.get("/drivers"); setDrivers(r.data); }
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleEdit = (d) => {
    setSelectedDriver(d);
    setLicenseDate(d.license_expiry || "");
    setIsDialogOpen(true);
  };

  const saveLicense = async () => {
    try {
      await api.put(`/drivers/${selectedDriver.id}/license`, { license_expiry: licenseDate });
      toast.success("Fecha de licencia actualizada");
      setIsDialogOpen(false);
      fetchDrivers();
    } catch (e) { toast.error("Error al actualizar fecha"); }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Conductores Registrados</h1>
      {loading ? <p className="text-slate-500">Cargando...</p> : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr><th className="p-4">Nombre / Email</th><th className="p-4 text-center">Estado de Cuenta</th><th className="p-4 text-center">Vencimiento Licencia</th><th className="p-4 text-center">Disp. Horas Extra</th><th className="p-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-4"><p className="font-bold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.email}</p></td>
                    <td className="p-4 text-center"><Badge className="bg-emerald-100 text-emerald-800">{d.status}</Badge></td>
                    <td className="p-4 text-center text-slate-600 font-medium">{d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : "No registrada"}</td>
                    <td className="p-4 text-center">{d.extra_available ? <CheckCircle className="w-5 h-5 text-teal-500 mx-auto" /> : <XCircle className="w-5 h-5 text-slate-300 mx-auto" />}</td>
                    <td className="p-4 text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(d)} className="text-slate-400 hover:text-teal-600 h-8 w-8"><Edit className="w-4 h-4"/></Button>
                    </td>
                  </tr>
                ))}
                {drivers.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-400">No hay conductores registrados.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Fecha de Licencia</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
               <div><p className="font-bold text-slate-900">{selectedDriver?.name}</p><p className="text-xs text-slate-500">{selectedDriver?.email}</p></div>
            <div className="space-y-2">
              <Label>Nueva Fecha de Vencimiento</Label>
              <Input type="date" value={licenseDate} onChange={e => setLicenseDate(e.target.value)} className="h-11" />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveLicense} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-8">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function TripsManager() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/trips/history", { params: { folio: search } });
      setTrips(res.data);
    } catch (e) {
      toast.error("Error al cargar viajes");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleDeleteIndividual = async (id, tracking) => {
    if (window.confirm(`¿Seguro que desea eliminar el viaje ${tracking}? Esta acción es irreversible.`)) {
      try {
        await api.delete(`/trips/${id}`);
        toast.success("Viaje eliminado");
        fetchTrips();
      } catch (e) {
        toast.error("No se pudo eliminar el viaje");
      }
    }
  };

  const handleClearAll = async () => {
    const val = window.prompt("Escriba 'ELIMINAR TODO' para confirmar el borrado total de la base de datos de viajes.");
    if (val === "ELIMINAR TODO") {
      setIsDeletingAll(true);
      try {
        await api.delete("/trips/clear-all");
        toast.success("Base de datos de viajes limpiada");
        fetchTrips();
      } catch (e) {
        toast.error("Error en la limpieza total");
      } finally {
        setIsDeletingAll(false);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Viajes</h1>
        <Button 
          variant="destructive" 
          onClick={handleClearAll} 
          disabled={isDeletingAll}
          className="font-bold shadow-lg"
        >
          <XCircle className="w-4 h-4 mr-2" /> 
          {isDeletingAll ? "Limpiando..." : "Limpiar Todo (ADMIN)"}
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
        <Input 
          placeholder="Buscar viaje por Folio..." 
          className="pl-11 h-12 bg-white border-slate-300 shadow-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500">Cargando viajes...</div>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Folio</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Origen/Destino</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trips.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-teal-700">{t.tracking_number}</td>
                    <td className="p-4 text-slate-500">{t.scheduled_date}</td>
                    <td className="p-4 font-medium text-slate-900">{t.patient_name || "Cometido Func."}</td>
                    <td className="p-4 text-slate-600">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[120px]">{t.origin}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span className="truncate max-w-[120px]">{t.destination}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0.5">
                        {t.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="text-slate-300 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteIndividual(t.id, t.tracking_number)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {trips.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-20 text-slate-400 font-medium">
                      No se encontraron traslados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
