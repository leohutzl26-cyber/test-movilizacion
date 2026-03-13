import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // IMPORTACIÓN CORREGIDA AQUÍ
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, Shield, Trash2, Clock, MapPin, Search, Truck, Users, Activity, Car, Plus } from "lucide-react";
import api from "@/lib/api";

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
        {section === "vehicles" && <VehiclesManager />}
        {section === "drivers" && <DriversManager />}
      </main>
    </div>
  );
}

function AdminOverview({ onNavigate }) {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    api.get("/stats").then(res => setStats(res.data)).catch(() => {});
  }, []);

  return (
    <div className="animate-slide-up max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Panel de Administración</h1>
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-sm border-l-4 border-l-amber-500 cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate("users")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Usuarios Pendientes</p><p className="text-4xl font-black text-slate-900">{stats.pending_users}</p></div>
              <Clock className="w-12 h-12 text-amber-200" />
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-indigo-500 cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate("drivers")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Total Conductores</p><p className="text-4xl font-black text-slate-900">{stats.total_drivers}</p></div>
              <Shield className="w-12 h-12 text-indigo-200" />
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-teal-500 cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate("vehicles")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div><p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Vehículos Disponibles</p><p className="text-4xl font-black text-slate-900">{stats.vehicles_available}</p></div>
              <Truck className="w-12 h-12 text-teal-200" />
            </CardContent>
          </Card>
        </div>
      )}
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
  const [formData, setFormData] = useState({ plate: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });

  const fetchVehicles = useCallback(async () => {
    try { const r = await api.get("/vehicles"); setVehicles(r.data); }
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.post("/vehicles", formData);
      toast.success("Vehículo creado exitosamente");
      setIsDialogOpen(false);
      setFormData({ plate: "", brand: "", model: "", type: "Auto/SUV", year: 2024, mileage: 0 });
      fetchVehicles();
    } catch (e) { toast.error("Error al crear vehículo"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar vehículo definitivamente?")) {
      try { await api.delete(`/vehicles/${id}`); toast.success("Eliminado"); fetchVehicles(); }
      catch (e) { toast.error("Error al eliminar"); }
    }
  };

  const vehicleIcons = {
    Ambulancia: <Activity className="w-4 h-4 text-red-500" />,
    camion: <Truck className="w-4 h-4 text-blue-600" />,
    "Auto/SUV": <Car className="w-4 h-4 text-slate-600" />,
    Camioneta: <Truck className="w-4 h-4 text-emerald-600" />,
    Van: <Users className="w-4 h-4 text-indigo-600" />
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Flota</h1>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11">
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
                    <td className="p-4 text-right">
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(v.id)} className="text-slate-400 hover:text-red-600 h-8 w-8"><Trash2 className="w-4 h-4"/></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nuevo Vehículo</DialogTitle></DialogHeader>
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

  const fetchDrivers = useCallback(async () => {
    try { const r = await api.get("/drivers"); setDrivers(r.data); }
    catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Conductores Registrados</h1>
      {loading ? <p className="text-slate-500">Cargando...</p> : (
        <Card className="shadow-sm">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr><th className="p-4">Nombre / Email</th><th className="p-4 text-center">Estado de Cuenta</th><th className="p-4 text-center">Vencimiento Licencia</th><th className="p-4 text-center">Disp. Horas Extra</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-4"><p className="font-bold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.email}</p></td>
                    <td className="p-4 text-center"><Badge className="bg-emerald-100 text-emerald-800">{d.status}</Badge></td>
                    <td className="p-4 text-center text-slate-600 font-medium">{d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : "No registrada"}</td>
                    <td className="p-4 text-center">{d.extra_available ? <CheckCircle className="w-5 h-5 text-teal-500 mx-auto" /> : <XCircle className="w-5 h-5 text-slate-300 mx-auto" />}</td>
                  </tr>
                ))}
                {drivers.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-400">No hay conductores registrados.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
