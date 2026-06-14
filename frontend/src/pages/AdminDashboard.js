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
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity, CalendarDays, Truck, User, AlertTriangle, RefreshCw, ClipboardList, Stethoscope, Plus, Trash2, XCircle, Search, Car, Bus, Users, Edit, Clock, Shield, Siren, TrendingUp, Gauge, Ban, Zap, Navigation, Award, Upload } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from "recharts";
import { supabase } from "@/lib/supabase";
import LogbookReport from "@/components/LogbookReport";
import BulkUploader from "@/components/BulkUploader";

const COLORS_PIE = ["#0d9488", "#f59e0b", "#6366f1", "#ef4444", "#22c55e", "#8b5cf6"];
const COLORS_STATUS = { "Pendiente": "#f59e0b", "Por Visar": "#a855f7", "Asignado": "#3b82f6", "En Curso": "#0d9488", "Completado": "#22c55e", "Cancelado": "#ef4444" };

export default function AdminDashboard() {
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.admin.section") || "dashboard";
  });

  useEffect(() => {
    localStorage.setItem("movilizacion.admin.section", section);
  }, [section]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dashboard" && <AdminOverview onNavigate={setSection} />}
        {section === "users" && <UsersManager />}
        {section === "origins" && <OriginsManager />}
        {section === "destinations" && <DestinationsManager />}
        {section === "audit" && <AuditLogs />}
        {section === "trips" && <TripsManager />}
        {section === "vehicles" && <VehiclesManager />}
        {section === "drivers" && <DriversManager />}
        {section === "reports" && <LogbookReport />}
      </main>
    </div>
  );
}

function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: trips } = await supabase.from('trips').select('status');
        const { data: vehicles } = await supabase.from('vehicles').select('status');
        const { data: profiles } = await supabase.from('profiles').select('status');

        const activeTrips = trips?.filter(t => t.status === 'en_curso').length || 0;
        const pendingTrips = trips?.filter(t => t.status === 'pendiente').length || 0;
        const completedTrips = trips?.filter(t => t.status === 'completado').length || 0;
        const pendingUsers = profiles?.filter(p => p.status === 'pendiente').length || 0;

        setStats({
          total_trips: trips?.length || 0,
          active_trips: activeTrips,
          pending_trips: pendingTrips,
          completed_trips: completedTrips,
          pending_users: pendingUsers,
          vehicles_available: vehicles?.filter(v => v.status === 'disponible').length || 0,
          vehicles_en_uso: vehicles?.filter(v => v.status === 'en_uso').length || 0,
          vehicles_fuera_de_servicio: vehicles?.filter(v => v.status === 'fuera_de_servicio').length || 0,
        });
      } catch (e) {
        console.error("Error cargando estadísticas:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><RefreshCw className="animate-spin" /></div>;

  const completionRate = stats?.total_trips > 0 ? Math.round(stats.completed_trips / stats.total_trips * 100) : 0;

  return (
    <div className="animate-slide-up max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel Analítico</h1>
        <Badge className="bg-teal-50 text-teal-700">EN VIVO (SUPABASE)</Badge>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Traslados" value={stats?.total_trips} sub="Histórico" icon={<ClipboardList />} color="indigo" />
        <KPICard label="En Curso" value={stats?.active_trips} sub="Activos ahora" icon={<Navigation />} color="blue" />
        <KPICard label="Tasa de Éxito" value={`${completionRate}%`} sub="Completados" icon={<TrendingUp />} color="emerald" />
        <KPICard label="Usuarios Pend." value={stats?.pending_users} sub="Esperando" icon={<Users />} color="amber" onClick={() => onNavigate("users")} />
      </div>
      
      <p className="text-slate-400 text-sm">Estadísticas simplificadas para la migración inicial.</p>
    </div>
  );
}

function KPICard({ label, value, sub, icon, color, onClick }) {
  const colorMap = {
    teal: "from-teal-500 to-teal-600",
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    red: "from-red-500 to-red-600",
    indigo: "from-indigo-500 to-indigo-600",
    amber: "from-amber-500 to-amber-600",
  };

  return (
    <div onClick={onClick} className={`bg-gradient-to-br ${colorMap[color]} rounded-2xl p-4 text-white shadow-lg cursor-pointer transition-transform hover:scale-[1.02]`}>
      <div className="bg-white/20 p-2 rounded-lg w-fit mb-2">{icon}</div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] uppercase font-bold opacity-80">{label}</p>
      <p className="text-[10px] opacity-60">{sub}</p>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (!error) setUsers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleAction = async (id, action) => {
    try {
      if (action === "delete") {
        if (window.confirm("¿Eliminar perfil de usuario?")) {
          await supabase.from('profiles').delete().eq('id', id);
          toast.success("Eliminado");
          fetchUsers();
        }
      } else {
        const status = action === "approve" ? "aprobado" : "rechazado";
        await supabase.from('profiles').update({ status }).eq('id', id);
        toast.success("Estado actualizado");
        fetchUsers();
      }
    } catch (e) { toast.error("Error en la operación"); }
  };

  const handleRoleChange = async (id, role) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
    if (!error) {
      toast.success("Rol actualizado");
      fetchUsers();
    } else {
      toast.error("Error al cambiar rol");
    }
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
  const [address, setAddress] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const fetchDests = useCallback(async () => {
    const { data } = await supabase.from('destinations').select('*').order('name');
    if (data) setDests(data || []);
  }, []);
  useEffect(() => { fetchDests(); }, [fetchDests]);

  const handleAdd = async (e) => {
    e.preventDefault(); if(!name.trim()) return;
    try { 
      await supabase.from('destinations').insert([{ name, address }]);
      setName(""); setAddress(""); fetchDests(); toast.success("Destino agregado"); 
    } catch (e) { toast.error("Error al agregar"); }
  };
  
  const handleDelete = async (id) => {
    try { await supabase.from('destinations').delete().eq('id', id); fetchDests(); toast.success("Eliminado"); } 
    catch (e) { toast.error("Error al eliminar"); }
  };

  const handleBulkImport = async (rows) => {
    const inserts = rows.map(r => ({ name: r.nombre, address: r.direccion || "" }));
    const { error } = await supabase.from('destinations').insert(inserts);
    if (error) throw error;
    fetchDests();
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Puntos Frecuentes (Destinos)</h1>
      <Card className="mb-6 shadow-sm"><CardContent className="p-5">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-2 w-full"><Label className="font-bold">Nombre del Destino</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Clínica Las Condes, Laboratorio Central..." className="h-11" /></div>
          <div className="flex-1 space-y-2 w-full"><Label className="font-bold">Dirección del Destino</Label><Input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Ej: Av. Las Condes 763..." className="h-11" /></div>
          <Button type="submit" className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 shrink-0 w-full sm:w-auto">Agregar a Lista</Button>
          <Button type="button" variant="outline" onClick={() => setBulkOpen(true)} className="h-11 font-bold border-teal-200 text-teal-700 hover:bg-teal-50 px-6 shrink-0 w-full sm:w-auto"><Upload className="w-4 h-4 mr-2 inline" />Carga Masiva</Button>
        </form>
      </CardContent></Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {dests.map(d => (
          <div key={d.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col group hover:border-teal-300 transition-colors relative">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-500"/> {d.name}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all absolute right-2 top-2" onClick={()=>handleDelete(d.id)}><Trash2 className="w-4 h-4"/></Button>
            </div>
            {d.address && <p className="text-xs text-slate-500 font-medium mt-1.5 pl-6">{d.address}</p>}
          </div>
        ))}
      </div>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Destinos"
        columns={[
          { key: "nombre", label: "Nombre del Destino", required: true },
          { key: "direccion", label: "Dirección del Destino" }
        ]}
        onImport={handleBulkImport}
        exampleRows={[["Clínica Las Condes", "Av. Las Condes 763"], ["Laboratorio Central", "Av. Providencia 1234"]]}
      />
    </div>
  );
}

function OriginsManager() {
  const [origins, setOrigins] = useState([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const fetchOrigins = useCallback(async () => {
    const { data } = await supabase.from('origins').select('*').order('name');
    if (data) setOrigins(data || []);
  }, []);
  useEffect(() => { fetchOrigins(); }, [fetchOrigins]);

  const handleAdd = async (e) => {
    e.preventDefault(); if(!name.trim()) return;
    try { 
      await supabase.from('origins').insert([{ name, address }]);
      setName(""); setAddress(""); fetchOrigins(); toast.success("Origen agregado"); 
    } catch (e) { toast.error("Error al agregar"); }
  };
  
  const handleDelete = async (id) => {
    try { await supabase.from('origins').delete().eq('id', id); fetchOrigins(); toast.success("Eliminado"); } 
    catch (e) { toast.error("Error al eliminar"); }
  };

  const handleBulkImport = async (rows) => {
    const inserts = rows.map(r => ({ name: r.nombre, address: r.direccion || "" }));
    const { error } = await supabase.from('origins').insert(inserts);
    if (error) throw error;
    fetchOrigins();
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Puntos Frecuentes (Orígenes)</h1>
      <Card className="mb-6 shadow-sm"><CardContent className="p-5">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-2 w-full"><Label className="font-bold">Nombre del Origen</Label><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Ej: Hospital Central, Bodega Central..." className="h-11" /></div>
          <div className="flex-1 space-y-2 w-full"><Label className="font-bold">Dirección del Origen</Label><Input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Ej: Av. Principal 123..." className="h-11" /></div>
          <Button type="submit" className="h-11 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 shrink-0 w-full sm:w-auto">Agregar a Lista</Button>
          <Button type="button" variant="outline" onClick={() => setBulkOpen(true)} className="h-11 font-bold border-teal-200 text-teal-700 hover:bg-teal-50 px-6 shrink-0 w-full sm:w-auto"><Upload className="w-4 h-4 mr-2 inline" />Carga Masiva</Button>
        </form>
      </CardContent></Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {origins.map(o => (
          <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col group hover:border-teal-300 transition-colors relative">
            <div className="flex justify-between items-start">
              <span className="font-bold text-slate-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-500"/> {o.name}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all absolute right-2 top-2" onClick={()=>handleDelete(o.id)}><Trash2 className="w-4 h-4"/></Button>
            </div>
            {o.address && <p className="text-xs text-slate-500 font-medium mt-1.5 pl-6">{o.address}</p>}
          </div>
        ))}
      </div>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Orígenes"
        columns={[
          { key: "nombre", label: "Nombre del Origen", required: true },
          { key: "direccion", label: "Dirección del Origen" }
        ]}
        onImport={handleBulkImport}
        exampleRows={[["Hospital Central", "Av. Principal 123"], ["Bodega Central", "Sector Industrial 45"]]}
      />
    </div>
  );
}

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => { 
    supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).then(({ data }) => {
      if (data) setLogs(data || []);
    });
  }, []);

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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ plate: "", zonal_number: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });

  const fetchVehicles = useCallback(async () => {
    try { 
      const { data } = await supabase.from('vehicles').select('*').order('plate');
      if (data) setVehicles(data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await supabase.from('vehicles').update(formData).eq('id', editingId);
        toast.success("Vehículo actualizado exitosamente");
      } else {
        await supabase.from('vehicles').insert([formData]);
        toast.success("Vehículo creado exitosamente");
      }
      closeDialog();
      fetchVehicles();
    } catch (e) { toast.error(editingId ? "Error al actualizar vehículo" : "Error al crear vehículo"); }
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData({ plate: "", zonal_number: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });
  };

  const handleEdit = (v) => {
    setEditingId(v.id);
    setFormData({ 
      plate: v.plate, 
      zonal_number: v.zonal_number || "",
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
      try { await supabase.from('vehicles').delete().eq('id', id); toast.success("Eliminado"); fetchVehicles(); }
      catch (e) { toast.error("Error al eliminar"); }
    }
  };

  const vehicleIcons = {
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

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Flota</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-11 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-2" />Carga Masiva</Button>
          <Button onClick={() => { setEditingId(null); setFormData({ plate: "", zonal_number: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 }); setIsDialogOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11">
            <Plus className="w-4 h-4 mr-2" /> Agregar Vehículo
          </Button>
        </div>
      </div>

      {loading ? <p className="text-slate-500">Cargando...</p> : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr><th className="p-4">Tipo</th><th className="p-4">N° Zonal</th><th className="p-4">Patente</th><th className="p-4">Marca/Modelo</th><th className="p-4">Año</th><th className="p-4">Kilometraje</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-4">{vehicleIcons[v.type] || <Car className="w-4 h-4" />}</td>
                    <td className="p-4 font-bold text-teal-700">{v.zonal_number ? `Z-${v.zonal_number}` : "-"}</td>
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
              <div className="space-y-2"><Label>N° Zonal (Opcional)</Label><Input value={formData.zonal_number} onChange={e => setFormData({...formData, zonal_number: e.target.value})} placeholder="Ej: 012" maxLength={5} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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

      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Vehículos"
        columns={[
          { key: "patente", label: "Patente", required: true },
          { key: "numero_zonal", label: "N° Zonal", required: false },
          { key: "marca", label: "Marca", required: false },
          { key: "modelo", label: "Modelo", required: false },
          { key: "tipo", label: "Tipo (Ambulancia/Auto/SUV/Camioneta/Van/camion)", required: false },
          { key: "ano", label: "Año", required: false, validate: v => !v || !isNaN(parseInt(v)) },
          { key: "km", label: "Kilometraje", required: false, validate: v => !v || !isNaN(parseFloat(v)) }
        ]}
        onImport={async (rows) => {
          const inserts = rows.map(r => ({
            plate: r.patente.toUpperCase(),
            zonal_number: r.numero_zonal || "",
            brand: r.marca || "",
            model: r.modelo || "",
            type: r.tipo || "Auto/SUV",
            year: parseInt(r.ano) || 2024,
            mileage: parseFloat(r.km) || 0
          }));
          const { error } = await supabase.from('vehicles').insert(inserts);
          if (error) throw error;
          fetchVehicles();
        }}
        exampleRows={[
          ["ABCD-12", "012", "Toyota", "Hilux", "Camioneta", "2022", "45000"],
          ["WXYZ-34", "015", "Fiat", "Ducato", "Ambulancia", "2021", "82000"]
        ]}
      />
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
    try { 
      const { data } = await supabase.from('profiles').select('*').eq('role', 'conductor').order('name');
      if (data) setDrivers(data || []);
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleEdit = (d) => {
    setSelectedDriver(d);
    setLicenseDate(d.license_expiry || "");
    setIsDialogOpen(true);
  };

  const saveLicense = async () => {
    try {
      await supabase.from('profiles').update({ license_expiry: licenseDate }).eq('id', selectedDriver.id);
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
      let query = supabase.from('trips').select('*').order('created_at', { ascending: false });
      if (search) {
        query = query.ilike('tracking_number', `%${search}%`);
      }
      const { data } = await query;
      if (data) setTrips(data || []);
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
        await supabase.from('trips').delete().eq('id', id);
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
        await supabase.from('trips').delete().neq('id', '00000000-0000-0000-0000-000000000000');
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
                     <td className="p-4 text-slate-500">{t.scheduled_date ? t.scheduled_date.split('T')[0] : "-"}</td>
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
