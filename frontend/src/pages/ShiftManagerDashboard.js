import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, ArrowRight, Clock, Activity, User, Truck, ShieldAlert, CheckCircle, Search, Download, Filter, RefreshCw, CalendarDays } from "lucide-react";
import api from "@/lib/api";

export default function ShiftManagerDashboard() {
  const [section, setSection] = useState("dispatch");
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dispatch" && <DispatchConsole />}
        {section === "new" && <NewDirectTripSection onSuccess={() => setSection("dispatch")} />}
        {section === "calendar" && <GeneralCalendarSection />}
        {section === "vehicles" && <VehiclesStatusSection />}
        {section === "drivers" && <DriversListSection />}
        {section === "history" && <GeneralHistorySection />}
      </main>
    </div>
  );
}

// =====================================
// 1. CONSOLA DE DESPACHO
// =====================================
function DispatchConsole() {
  const [pool, setPool] = useState([]);
  const [active, setActive] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [assignModal, setAssignModal] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [p, a, d] = await Promise.all([api.get("/trips/pool"), api.get("/trips/active"), api.get("/drivers")]);
      setPool(p.data); setActive(a.data); setDrivers(d.data.filter(x => x.status === "aprobado"));
    } catch(e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedDriver) { toast.error("Seleccione un conductor"); return; }
    try {
      await api.put(`/trips/${assignModal.id}/manager-assign`, { driver_id: selectedDriver, vehicle_id: null });
      toast.success("Viaje despachado correctamente");
      setAssignModal(null); setSelectedDriver(""); fetchData();
    } catch(e) { toast.error("Error al asignar"); }
  };

  const handleUnassign = async (id) => {
    if(!window.confirm("¿Devolver este viaje a la bolsa?")) return;
    try { await api.put(`/trips/${id}/unassign`); fetchData(); } catch(e) {}
  };

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-7xl mx-auto animate-slide-up grid grid-cols-1 xl:grid-cols-2 gap-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Clock className="text-amber-500 w-6 h-6"/> Listos para Despacho</h2>
          <Badge className="bg-amber-100 text-amber-800 shadow-sm">{pool.length}</Badge>
        </div>
        <div className="space-y-4">
          {pool.map(t => (
            <Card key={t.id} className="shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded">{t.tracking_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${t.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                </div>
                <p className="font-black text-lg text-slate-900 leading-tight mb-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-3 bg-slate-50 p-2 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-teal-600"/> <span className="truncate">{t.origin}</span> <ArrowRight className="w-3 h-3 text-slate-400 mx-1"/> <span className="truncate">{t.destination}</span>
                </div>
                {t.trip_type === "clinico" && t.clinical_team && (
                  <p className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded mb-3 inline-block">Equipo: {t.clinical_team}</p>
                )}
                <Button onClick={() => setAssignModal(t)} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-sm">Asignar Conductor</Button>
              </CardContent>
            </Card>
          ))}
          {pool.length === 0 && <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-slate-200"><CheckCircle className="w-10 h-10 mx-auto text-emerald-200 mb-2"/><p className="text-slate-500 font-bold">Sin viajes pendientes.</p></div>}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Activity className="text-blue-500 w-6 h-6"/> Activos y Asignados</h2>
          <Badge className="bg-blue-100 text-blue-800 shadow-sm">{active.length}</Badge>
        </div>
        <div className="space-y-4">
          {active.map(t => (
            <Card key={t.id} className={`shadow-sm border-l-4 ${t.status === "en_curso" ? "border-l-blue-500 bg-blue-50/20" : "border-l-teal-500"}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{t.tracking_number}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.status.replace("_", " ")}</span>
                </div>
                <p className="font-bold text-base text-slate-900 leading-tight mb-2">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-2 py-1.5 rounded"><User className="w-3.5 h-3.5"/> {t.driver_name}</div>
                  {t.status === "asignado" && <Button variant="ghost" size="sm" onClick={() => handleUnassign(t.id)} className="h-7 text-[10px] text-red-500 hover:bg-red-50">Desasignar</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {active.length === 0 && <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-500 font-bold">No hay operaciones activas.</p></div>}
        </div>
      </div>

      <Dialog open={!!assignModal} onOpenChange={() => setAssignModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Asignar Conductor</DialogTitle></DialogHeader>
          {assignModal && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm"><p className="font-bold text-slate-800">{assignModal.patient_name || assignModal.task_details}</p><p className="text-slate-500 mt-1">{assignModal.origin} → {assignModal.destination}</p></div>
              <div className="space-y-2"><Label>Seleccione un Conductor</Label><Select value={selectedDriver} onValueChange={setSelectedDriver}><SelectTrigger className="h-12"><SelectValue placeholder="Elige..." /></SelectTrigger><SelectContent>{drivers.map(d => (<SelectItem key={d.id} value={d.id}>{d.name} {d.extra_available ? "(Extra)" : ""}</SelectItem>))}</SelectContent></Select><p className="text-[10px] text-slate-400 mt-1">El conductor elegirá la ambulancia al iniciar el viaje.</p></div>
              <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setAssignModal(null)}>Cancelar</Button><Button className="bg-teal-600 text-white" onClick={handleAssign}>Asignar y Despachar</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================
// 2. NUEVO TRASLADO DIRECTO
// =====================================
function NewDirectTripSection({ onSuccess }) {
  const [form, setForm] = useState({ trip_type: "clinico", origin: "", destination: "", patient_name: "", patient_unit: "", rut: "", transfer_reason: "", priority: "normal", clinical_team: "", task_details: "", staff_count: "1", notes: "" });
  const [loading, setLoading] = useState(false);
  const [dests, setDests] = useState([]);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    api.get("/destinations").then(r => setDests(r.data)).catch(()=>{});
    api.get("/clinical-staff").then(r => setStaffList(r.data)).catch(()=>{});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    if (form.trip_type === "clinico" && !form.clinical_team) { toast.error("Para traslados clínicos creados desde coordinación, el personal es obligatorio."); return; }
    setLoading(true);
    try { await api.post("/trips", form); toast.success("Traslado creado directo en Despacho"); onSuccess(); } 
    catch(e) { toast.error("Error al crear"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="mb-6"><h1 className="text-2xl font-black text-slate-900">Ingreso Rápido de Traslado</h1><p className="text-slate-500 font-medium">Los viajes ingresados aquí se saltan la revisión de Gestión de Camas.</p></div>
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6">
          <Tabs value={form.trip_type} onValueChange={v => setForm({...form, trip_type: v})}>
            <TabsList className="grid w-full grid-cols-2 mb-6"><TabsTrigger value="clinico" className="font-bold">Paciente (Clínico)</TabsTrigger><TabsTrigger value="no_clinico" className="font-bold">Cometido (No Clínico)</TabsTrigger></TabsList>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-2"><Label>Origen *</Label><Select onValueChange={v=>setForm({...form, origin: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent>{dests.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Destino *</Label><Select onValueChange={v=>setForm({...form, destination: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione..."/></SelectTrigger><SelectContent>{dests.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              </div>
              {form.trip_type === "clinico" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre del Paciente *</Label><Input required value={form.patient_name} onChange={e=>setForm({...form, patient_name: e.target.value})} placeholder="Ej: Juan Pérez"/></div>
                    <div className="space-y-2"><Label>Motivo *</Label><Input required value={form.transfer_reason} onChange={e=>setForm({...form, transfer_reason: e.target.value})} placeholder="Ej: Alta a domicilio"/></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-teal-50 p-4 rounded-xl border border-teal-100">
                    <div className="space-y-2">
                      <Label className="text-teal-800">Prioridad *</Label>
                      <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}><SelectTrigger className="bg-white"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="urgente">Urgente (Rojo)</SelectItem><SelectItem value="alta">Alta (Naranja)</SelectItem><SelectItem value="normal">Normal (Verde)</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-teal-800 flex items-center gap-1">Personal Obligatorio <ShieldAlert className="w-3 h-3 text-red-500"/></Label>
                      <Select value={form.clinical_team} onValueChange={v => setForm({...form, clinical_team: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione personal" /></SelectTrigger><SelectContent>{staffList.map(s => (<SelectItem key={s.id} value={`${s.name} (${s.role})`}>{s.name} - {s.role}</SelectItem>))}</SelectContent></Select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2"><Label>Detalle del Cometido *</Label><Textarea required value={form.task_details} onChange={e=>setForm({...form, task_details: e.target.value})} placeholder="Ej: Traslado de documentos a notaría..."/></div>
                  <div className="space-y-2"><Label>Cantidad Personas</Label><Input type="number" min="1" value={form.staff_count} onChange={e=>setForm({...form, staff_count: e.target.value})}/></div>
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg shadow-md mt-6">{loading ? "Procesando..." : "Crear y Enviar a Despacho"}</Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================
// 3. CALENDARIO GENERAL (COORDINADOR)
// =====================================
function GeneralCalendarSection() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/trips/calendar?start_date=${selectedDate}&end_date=${selectedDate}`);
      setTrips(res.data); 
    } catch(e) {} finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const statusColors = { pendiente_revision: "bg-red-100 text-red-800", pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-slate-200 text-slate-600" };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Calendario General de Operaciones</h1>
          <p className="text-slate-500 font-medium mt-1">Revise la agenda diaria de todos los traslados (Clínicos y No Clínicos).</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border shadow-sm">
          <CalendarDays className="w-5 h-5 text-teal-600 ml-1" />
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-auto h-9 border-0 bg-transparent focus-visible:ring-0 p-0 font-bold text-slate-700" />
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])} className="h-8">Ver Hoy</Button>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-teal-600"/></div> : (
        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-lg font-bold text-slate-500">Agenda Libre</p>
              <p className="text-sm text-slate-400 mt-1">No hay operaciones registradas para este día.</p>
            </div>
          ) : (
            trips.map(t => (
              <Card key={t.id} className={`shadow-sm border-l-4 ${t.trip_type === "clinico" ? "border-l-teal-500" : "border-l-indigo-500"}`}>
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-3 rounded-xl text-center min-w-[80px]">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Hora Cita</p>
                      <p className="text-lg font-black text-slate-900">{t.appointment_time || "--:--"}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{t.tracking_number}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">{t.trip_type === "clinico" ? "Clínico" : "Cometido"}</Badge>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${statusColors[t.status] || "bg-slate-100"}`}>{(t.status || "").replace(/_/g, " ")}</span>
                      </div>
                      <p className="font-bold text-lg text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                      <div className="flex items-center gap-2 mt-1 text-sm text-slate-600 font-medium">
                        <MapPin className="w-4 h-4 text-teal-500" /> {t.origin || "-"} <ArrowRight className="w-3 h-3 text-slate-400" /> {t.destination || "-"}
                      </div>
                    </div>
                  </div>
                  <div className="text-left md:text-right bg-slate-50 p-3 rounded-lg border border-slate-100 min-w-[200px]">
                    {t.trip_type === "clinico" && (
                      <div className="mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Personal Acompañante</p>
                        <p className="text-sm font-black text-teal-800">{t.clinical_team || "Falta asignar personal"}</p>
                      </div>
                    )}
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conductor / Vehículo</p>
                    <p className="text-sm font-bold text-slate-700">{t.driver_name || "Sin conductor"} / {t.vehicle_id ? "Ambulancia Asignada" : "Sin vehículo"}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// =====================================
// 4. ESTADO DE FLOTA
// =====================================
function VehiclesStatusSection() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = useCallback(async () => {
    try { const r = await api.get("/vehicles"); setVehicles(r.data); } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleStatusChange = async (id, status) => {
    try { await api.put(`/vehicles/${id}/status`, { status }); toast.success("Estado actualizado"); fetchVehicles(); } 
    catch(e) { toast.error("Error al actualizar"); }
  };

  const statusColors = { disponible: "bg-emerald-100 text-emerald-800", en_servicio: "bg-blue-100 text-blue-800", en_limpieza: "bg-violet-100 text-violet-800", en_taller: "bg-red-100 text-red-800" };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="mb-6"><h1 className="text-2xl font-black text-slate-900">Estado de la Flota</h1><p className="text-slate-500 font-medium">Controle qué ambulancias están operativas o en mantenimiento.</p></div>
      {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-teal-600"/></div> : (
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr><th className="p-4">Patente</th><th className="p-4">Modelo</th><th className="p-4">Kilometraje</th><th className="p-4">Estado Actual</th><th className="p-4">Cambiar Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-black text-slate-900 text-lg">{v.plate}</td>
                    <td className="p-4 text-slate-600 font-medium">{v.brand} {v.model} ({v.year})</td>
                    <td className="p-4 font-mono font-bold text-slate-700">{v.mileage?.toLocaleString()} km</td>
                    <td className="p-4"><Badge className={`${statusColors[v.status] || "bg-slate-100"} shadow-sm`}>{v.status.replace(/_/g, " ")}</Badge></td>
                    <td className="p-4">
                      <Select value={v.status} onValueChange={(val) => handleStatusChange(v.id, val)}>
                        <SelectTrigger className="w-40 h-9 bg-white"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="disponible">Disponible</SelectItem><SelectItem value="en_servicio">En Servicio</SelectItem><SelectItem value="en_limpieza">En Limpieza</SelectItem><SelectItem value="en_taller">En Taller</SelectItem></SelectContent>
                      </Select>
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

// =====================================
// 5. LISTA DE CONDUCTORES
// =====================================
function DriversListSection() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/drivers").then(r => setDrivers(r.data)).finally(() => setLoading(false)); }, []);

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="mb-6"><h1 className="text-2xl font-black text-slate-900">Conductores Activos</h1></div>
      {loading ? <div className="flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-teal-600"/></div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {drivers.map(d => (
            <div key={d.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center shrink-0"><User className="w-6 h-6 text-teal-600"/></div>
              <div><p className="font-bold text-slate-900">{d.name}</p><p className="text-xs text-slate-500">{d.email}</p>
              {d.extra_available && <Badge className="mt-1 bg-indigo-100 text-indigo-800 text-[9px] uppercase">Disp. Horas Extra</Badge>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// =====================================
// 6. HISTORIAL MAESTRO (Todos los viajes)
// =====================================
function GeneralHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { api.get("/trips/history").then(r => setHistory(r.data)).finally(() => setLoading(false)); }, []);

  const filtered = history.filter(t => (t.patient_name || t.task_details || "").toLowerCase().includes(searchTerm.toLowerCase()) || (t.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase()));

  const handleExport = () => {
    const headers = ["Folio", "Fecha", "Tipo", "Detalle", "Origen", "Destino", "Conductor", "Ambulancia", "Estado"];
    const rows = filtered.map(t => [t.tracking_number, t.scheduled_date, t.trip_type, `"${t.patient_name || t.task_details}"`, `"${t.origin}"`, `"${t.destination}"`, `"${t.driver_name||"N/A"}"`, t.vehicle_plate||"N/A", t.status].join(";"));
    const blob = new Blob(["\uFEFF" + [headers.join(";"), ...rows].join("\n")], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "Historial_Total.csv"; link.click();
  };

  return (
    <div className="max-w-7xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-black text-slate-900">Historial Maestro de Traslados</h1><Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Download className="w-4 h-4 mr-2"/> Exportar Todos</Button></div>
      <Card className="mb-4"><CardContent className="p-4"><Input placeholder="Buscar por nombre, tarea o folio..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-slate-50 max-w-md"/></CardContent></Card>
      <Card><CardContent className="p-0 max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm text-left"><thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] sticky top-0 shadow-sm z-10"><tr><th className="p-4">Folio</th><th className="p-4">Tipo</th><th className="p-4">Detalle</th><th className="p-4">Ruta</th><th className="p-4">Conductor</th><th className="p-4">Estado</th></tr></thead>
        <tbody className="divide-y divide-slate-100">
          {filtered.map(t => (<tr key={t.id} className="hover:bg-slate-50"><td className="p-4 font-mono font-bold text-xs">{t.tracking_number}</td><td className="p-4"><Badge variant="outline" className="text-[10px]">{t.trip_type}</Badge></td><td className="p-4 font-bold text-slate-900">{t.patient_name || t.task_details}</td><td className="p-4 text-xs font-medium text-slate-600"><div className="flex gap-1 items-center"><MapPin className="w-3 h-3 text-teal-500"/>{t.origin}</div><div className="flex gap-1 items-center mt-1"><ArrowRight className="w-3 h-3 text-slate-400"/>{t.destination}</div></td><td className="p-4 text-xs font-bold text-teal-800">{t.driver_name || "-"}</td><td className="p-4"><Badge className="uppercase text-[10px] bg-slate-200 text-slate-700">{t.status.replace(/_/g, " ")}</Badge></td></tr>))}
          {filtered.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-slate-400 font-medium">No se encontraron registros.</td></tr>}
        </tbody></table>
      </CardContent></Card>
    </div>
  );
}
