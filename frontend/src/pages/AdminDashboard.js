import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Users, Truck, MapPin, ClipboardList, Plus, Check, X, Trash2, Edit, AlertTriangle, Shield, ScrollText, Search } from "lucide-react";
import api from "@/lib/api";

export default function AdminDashboard() {
  const [section, setSection] = useState("dashboard");
  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {section === "dashboard" && <DashboardSection />}
          {section === "users" && <UsersSection />}
          {section === "vehicles" && <VehiclesSection />}
          {section === "destinations" && <DestinationsSection />}
          {section === "audit" && <AuditSection />}
        </div>
      </main>
    </div>
  );
}

function DashboardSection() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get("/stats").then(r => setStats(r.data)).catch(() => {}); }, []);
  if (!stats) return <div className="text-center py-12 text-slate-500">Cargando...</div>;
  const cards = [
    { label: "Viajes Pendientes", value: stats.pending_trips, icon: ClipboardList, color: "text-amber-600 bg-amber-50" },
    { label: "Viajes Activos", value: stats.active_trips, icon: Truck, color: "text-blue-600 bg-blue-50" },
    { label: "Completados", value: stats.completed_trips, icon: Check, color: "text-emerald-600 bg-emerald-50" },
    { label: "Vehiculos Disponibles", value: `${stats.vehicles_available}/${stats.total_vehicles}`, icon: Truck, color: "text-teal-600 bg-teal-50" },
    { label: "Conductores", value: stats.total_drivers, icon: Users, color: "text-indigo-600 bg-indigo-50" },
    { label: "Usuarios Pendientes", value: stats.pending_users, icon: Shield, color: stats.pending_users > 0 ? "text-red-600 bg-red-50" : "text-slate-600 bg-slate-50" },
  ];
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6" data-testid="dashboard-title">Panel de Control</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="stat-card card-hover animate-slide-up" data-testid={`stat-${c.label.toLowerCase().replace(/ /g,'-')}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-5 h-5" /></div>
            <p className="text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchUsers = useCallback(async () => { try { const r = await api.get("/users"); setUsers(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleApprove = async (id) => { try { await api.put(`/users/${id}/approve`); toast.success("Usuario aprobado"); fetchUsers(); } catch (e) { toast.error("Error"); } };
  const handleReject = async (id) => { try { await api.put(`/users/${id}/reject`); toast.success("Usuario rechazado"); fetchUsers(); } catch (e) { toast.error("Error"); } };
  const handleDelete = async (id) => { try { await api.delete(`/users/${id}`); toast.success("Usuario eliminado"); fetchUsers(); } catch (e) { toast.error("Error"); } };
  const handleRoleChange = async (id, role) => { try { await api.put(`/users/${id}/role`, { role }); toast.success("Rol actualizado"); fetchUsers(); } catch (e) { toast.error("Error"); } };

  const roleLabels = { admin: "Admin", coordinador: "Coordinador", solicitante: "Solicitante", conductor: "Conductor" };
  const statusColors = { pendiente: "bg-amber-100 text-amber-800", aprobado: "bg-emerald-100 text-emerald-800", rechazado: "bg-red-100 text-red-800" };

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando usuarios...</div>;
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6" data-testid="users-title">Gestion de Usuarios</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol</TableHead><TableHead>Estado</TableHead><TableHead>Acciones</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-slate-500">{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(val) => handleRoleChange(u.id, val)}>
                      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`role-select-${u.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[u.status]}`}>{u.status}</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {u.status === "pendiente" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 hover:bg-emerald-50" onClick={() => handleApprove(u.id)} data-testid={`approve-${u.id}`}><Check className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => handleReject(u.id)} data-testid={`reject-${u.id}`}><X className="w-4 h-4" /></Button>
                        </>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(u.id)} data-testid={`delete-user-${u.id}`}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Sin usuarios registrados</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function VehiclesSection() {
  const [vehicles, setVehicles] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ plate: "", brand: "", model: "", year: 2024, mileage: 0, next_maintenance_km: 10000 });
  const [loading, setLoading] = useState(true);
  const fetchVehicles = useCallback(async () => { try { const r = await api.get("/vehicles"); setVehicles(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleCreate = async () => {
    await handleSave();
  };

  const handleStatusChange = async (id, status) => {
    try { await api.put(`/vehicles/${id}/status`, { status }); toast.success("Estado actualizado"); fetchVehicles(); }
    catch (e) { toast.error("Error"); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/vehicles/${id}`); toast.success("Vehiculo eliminado"); fetchVehicles(); }
    catch (e) { toast.error("Error al eliminar"); }
  };

  const handleEdit = (v) => {
    setForm({ plate: v.plate, brand: v.brand, model: v.model, year: v.year, mileage: v.mileage, next_maintenance_km: v.next_maintenance_km });
    setEditId(v.id);
    setShowDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await api.put(`/vehicles/${editId}`, form);
        toast.success("Vehiculo actualizado");
      } else {
        await api.post("/vehicles", form);
        toast.success("Vehiculo creado");
      }
      setShowDialog(false); setEditId(null); setForm({ plate: "", brand: "", model: "", year: 2024, mileage: 0, next_maintenance_km: 10000 }); fetchVehicles();
    } catch (e) { toast.error("Error"); }
  };

  const statusOptions = ["disponible", "en_servicio", "en_limpieza", "en_taller", "fuera_de_servicio"];
  const alertIcon = (alert) => {
    if (alert === "rojo") return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (alert === "amarillo") return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900" data-testid="vehicles-title">Gestion de Flota</h1>
        <Button onClick={() => { setEditId(null); setForm({ plate: "", brand: "", model: "", year: 2024, mileage: 0, next_maintenance_km: 10000 }); setShowDialog(true); }} className="bg-teal-600 hover:bg-teal-700" data-testid="add-vehicle-btn"><Plus className="w-4 h-4 mr-2" />Agregar Vehiculo</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <Card key={v.id} className={`card-hover ${v.maintenance_alert === "rojo" ? "alert-rojo border-2" : v.maintenance_alert === "amarillo" ? "alert-amarillo border-2" : ""}`} data-testid={`vehicle-${v.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{v.plate}</CardTitle>
                <div className="flex items-center gap-1">{alertIcon(v.maintenance_alert)}<span className={`px-2 py-1 rounded-full text-xs font-semibold status-${v.status}`}>{v.status}</span></div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">{v.brand} {v.model} ({v.year})</p>
              <div className="mt-3 flex items-center justify-between">
                <div><p className="text-xs text-slate-500">Kilometraje</p><p className="font-semibold">{(v.mileage || 0).toLocaleString()} km</p></div>
                <div><p className="text-xs text-slate-500">Prox. Mant.</p><p className="font-semibold">{(v.next_maintenance_km || 0).toLocaleString()} km</p></div>
              </div>
              <Select value={v.status} onValueChange={(val) => handleStatusChange(v.id, val)}>
                <SelectTrigger className="mt-3 h-9 text-xs" data-testid={`vehicle-status-${v.id}`}><SelectValue /></SelectTrigger>
                <SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => handleEdit(v)} data-testid={`edit-vehicle-${v.id}`}><Edit className="w-3 h-3 mr-1" />Editar</Button>
                <Button size="sm" variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 text-xs" onClick={() => handleDelete(v.id)} data-testid={`delete-vehicle-${v.id}`}><Trash2 className="w-3 h-3 mr-1" />Eliminar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {vehicles.length === 0 && !loading && <p className="text-slate-400 col-span-full text-center py-12">Sin vehiculos registrados</p>}
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="add-vehicle-dialog">
          <DialogHeader><DialogTitle>{editId ? "Editar Vehiculo" : "Agregar Vehiculo"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Patente</Label><Input data-testid="vehicle-plate-input" value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} /></div>
            <div className="space-y-2"><Label>Marca</Label><Input data-testid="vehicle-brand-input" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} /></div>
            <div className="space-y-2"><Label>Modelo</Label><Input data-testid="vehicle-model-input" value={form.model} onChange={e => setForm({...form, model: e.target.value})} /></div>
            <div className="space-y-2"><Label>Ano</Label><Input data-testid="vehicle-year-input" type="number" value={form.year} onChange={e => setForm({...form, year: parseInt(e.target.value)})} /></div>
            <div className="space-y-2"><Label>Kilometraje</Label><Input data-testid="vehicle-mileage-input" type="number" value={form.mileage} onChange={e => setForm({...form, mileage: parseFloat(e.target.value)})} /></div>
            <div className="space-y-2"><Label>Prox. Mantencion (km)</Label><Input data-testid="vehicle-maint-input" type="number" value={form.next_maintenance_km} onChange={e => setForm({...form, next_maintenance_km: parseFloat(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} data-testid="cancel-vehicle-btn">Cancelar</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700" data-testid="save-vehicle-btn">{editId ? "Actualizar" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DestinationsSection() {
  const [destinations, setDestinations] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });
  const [loading, setLoading] = useState(true);
  const fetchDest = useCallback(async () => { try { const r = await api.get("/destinations"); setDestinations(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchDest(); }, [fetchDest]);

  const handleCreate = async () => {
    try { await api.post("/destinations", form); toast.success("Destino creado"); setShowDialog(false); setForm({ name: "", address: "" }); fetchDest(); }
    catch (e) { toast.error("Error"); }
  };
  const handleDelete = async (id) => { try { await api.delete(`/destinations/${id}`); toast.success("Destino eliminado"); fetchDest(); } catch { toast.error("Error"); } };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900" data-testid="destinations-title">Destinos Frecuentes</h1>
        <Button onClick={() => setShowDialog(true)} className="bg-teal-600 hover:bg-teal-700" data-testid="add-destination-btn"><Plus className="w-4 h-4 mr-2" />Agregar Destino</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {destinations.map((d) => (
          <Card key={d.id} className="card-hover" data-testid={`destination-${d.id}`}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-600" /><p className="font-semibold text-slate-900">{d.name}</p></div>
                {d.address && <p className="text-sm text-slate-500 mt-1 ml-6">{d.address}</p>}
              </div>
              <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => handleDelete(d.id)} data-testid={`delete-dest-${d.id}`}><Trash2 className="w-4 h-4" /></Button>
            </CardContent>
          </Card>
        ))}
        {destinations.length === 0 && !loading && <p className="text-slate-400 col-span-full text-center py-12">Sin destinos registrados</p>}
      </div>
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent data-testid="add-destination-dialog">
          <DialogHeader><DialogTitle>Agregar Destino</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nombre</Label><Input data-testid="dest-name-input" placeholder="Ej: Urgencias" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div className="space-y-2"><Label>Direccion</Label><Input data-testid="dest-address-input" placeholder="Ej: Piso 1, Ala Norte" value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700" data-testid="save-destination-btn">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");

  useEffect(() => { api.get("/audit-logs").then(r => { setLogs(r.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const actionLabels = {
    registro: "Registro", aprobar_usuario: "Aprobar Usuario", rechazar_usuario: "Rechazar Usuario",
    cambiar_rol: "Cambiar Rol", eliminar_usuario: "Eliminar Usuario",
    crear_vehiculo: "Crear Vehiculo", cambiar_estado_vehiculo: "Cambiar Estado Vehiculo", eliminar_vehiculo: "Eliminar Vehiculo",
    crear_traslado: "Crear Traslado", asignar_traslado: "Asignar Traslado", tomar_traslado: "Tomar Traslado",
    cambiar_estado_traslado: "Cambiar Estado Traslado"
  };
  const entityLabels = { usuario: "Usuario", vehiculo: "Vehiculo", traslado: "Traslado" };
  const actionColors = {
    registro: "bg-blue-100 text-blue-700", aprobar_usuario: "bg-emerald-100 text-emerald-700",
    rechazar_usuario: "bg-red-100 text-red-700", cambiar_rol: "bg-violet-100 text-violet-700",
    eliminar_usuario: "bg-red-100 text-red-700", crear_vehiculo: "bg-teal-100 text-teal-700",
    cambiar_estado_vehiculo: "bg-amber-100 text-amber-700", eliminar_vehiculo: "bg-red-100 text-red-700",
    crear_traslado: "bg-teal-100 text-teal-700", asignar_traslado: "bg-blue-100 text-blue-700",
    tomar_traslado: "bg-blue-100 text-blue-700", cambiar_estado_traslado: "bg-amber-100 text-amber-700"
  };
  const roleLabels = { admin: "Admin", coordinador: "Coordinador", solicitante: "Solicitante", conductor: "Conductor" };

  const filtered = logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false;
    if (filterEntity && l.entity_type !== filterEntity) return false;
    if (search) {
      const q = search.toLowerCase();
      const fields = [l.user_name, l.action, l.entity_type, l.details].filter(Boolean);
      if (!fields.some(f => f.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const formatTs = (iso) => {
    if (!iso) return "-";
    try { const d = new Date(iso); return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }); }
    catch { return iso; }
  };

  const uniqueActions = [...new Set(logs.map(l => l.action))];
  const uniqueEntities = [...new Set(logs.map(l => l.entity_type))];

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando registro...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-4" data-testid="audit-title">Registro de Actividad</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por usuario, accion, detalle..." className="pl-10 h-10" value={search} onChange={e => setSearch(e.target.value)} data-testid="audit-search" />
        </div>
        <Select value={filterAction} onValueChange={v => setFilterAction(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[180px] h-10" data-testid="audit-filter-action"><SelectValue placeholder="Todas las acciones" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {uniqueActions.map(a => <SelectItem key={a} value={a}>{actionLabels[a] || a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={v => setFilterEntity(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[160px] h-10" data-testid="audit-filter-entity"><SelectValue placeholder="Todas las entidades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {uniqueEntities.map(e => <SelectItem key={e} value={e}>{entityLabels[e] || e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-slate-500 mb-3">{filtered.length} registros</p>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold">Fecha/Hora</TableHead>
                <TableHead className="text-xs font-semibold">Usuario</TableHead>
                <TableHead className="text-xs font-semibold">Rol</TableHead>
                <TableHead className="text-xs font-semibold">Accion</TableHead>
                <TableHead className="text-xs font-semibold">Entidad</TableHead>
                <TableHead className="text-xs font-semibold">Detalle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 200).map(l => (
                <TableRow key={l.id} data-testid={`audit-row-${l.id}`}>
                  <TableCell className="text-xs whitespace-nowrap text-slate-500">{formatTs(l.timestamp)}</TableCell>
                  <TableCell className="text-xs font-medium">{l.user_name}</TableCell>
                  <TableCell><span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">{roleLabels[l.user_role] || l.user_role}</span></TableCell>
                  <TableCell><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${actionColors[l.action] || "bg-slate-100 text-slate-700"}`}>{actionLabels[l.action] || l.action}</span></TableCell>
                  <TableCell className="text-xs capitalize">{entityLabels[l.entity_type] || l.entity_type}</TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[250px] truncate">{l.details}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-12 text-slate-400">Sin registros de actividad</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
