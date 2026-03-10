import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity, CalendarDays, Truck, User, AlertTriangle, RefreshCw, Home, BedDouble, Clock, Search, Download, Filter, Users, Pencil, Trash2, Plus, Stethoscope, XCircle, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import api from "@/lib/api";

const PERSONNEL_TYPES = ["TENS", "Matrón(a)", "Enfermero(a)", "Kinesiólogo(a)", "Fonoaudiólogo(a)", "Médico", "Terapeuta Ocupacional"];

export default function GestionCamasDashboard() {
  const [section, setSection] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dashboard" && <ClinicalOverviewSection onNavigate={setSection} />}
        {section === "new" && <GestorNewTripSection />}
        {section === "assign" && <AssignPersonnelSection />}
        {section === "staff" && <ClinicalStaffMantenedor />}
        {section === "services" && <OriginServicesMantenedor />}
        {section === "calendar" && <ClinicalCalendarSection />}
        {section === "history" && <ClinicalHistorySection />}
      </main>
    </div>
  );
}

// ==========================================
// SECCIÓN 1: TORRE DE CONTROL (RESUMEN)
// ==========================================
function ClinicalOverviewSection({ onNavigate }) {
  const [stats, setStats] = useState({ pendingDriver: 0, pendingStaff: 0, activeTrips: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [pool, active] = await Promise.all([api.get("/trips/pool"), api.get("/trips/active")]);
      const uniqueMap = new Map();
      pool.data.forEach(t => uniqueMap.set(t.id, t));
      active.data.forEach(t => uniqueMap.set(t.id, t));
      const allClinicos = Array.from(uniqueMap.values()).filter(t => t.trip_type === "clinico");

      const pendingDriver = allClinicos.filter(t => t.status === "pendiente").length;
      const pendingStaff = allClinicos.filter(t => !t.clinical_team || String(t.clinical_team).trim() === "").length;
      const activeTrips = allClinicos.filter(t => t.status === "en_curso" || t.status === "asignado").length;

      setStats({ pendingDriver, pendingStaff, activeTrips });
    } catch (e) { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); const interval = setInterval(fetchStats, 10000); return () => clearInterval(interval); }, [fetchStats]);

  return (
    <div className="animate-slide-up max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Resumen de Gestión de Camas</h1>
        <p className="text-slate-500 font-medium mt-1">Monitoreo en tiempo real de traslados de pacientes.</p>
      </div>

      {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-teal-600" /></div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={`shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all ${stats.pendingStaff > 0 ? "border-l-red-500 bg-red-50/30" : "border-l-emerald-500"}`} onClick={() => onNavigate("assign")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  {stats.pendingStaff > 0 ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <CheckCircle className="w-3 h-3 text-emerald-500" />} Pendiente Personal Apoyo
                </p>
                <p className={`text-5xl font-black ${stats.pendingStaff > 0 ? "text-red-600" : "text-emerald-600"}`}>{stats.pendingStaff}</p>
                <p className="text-xs font-medium text-slate-400 mt-2 hover:text-red-700">Ir a asignar →</p>
              </div>
              <BedDouble className={`w-14 h-14 ${stats.pendingStaff > 0 ? "text-red-200" : "text-emerald-100"}`} />
            </CardContent>
          </Card>

          <Card className={`shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all ${stats.pendingDriver > 0 ? "border-l-amber-500 bg-amber-50/30" : "border-l-emerald-500"}`} onClick={() => onNavigate("calendar")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  {stats.pendingDriver > 0 ? <Clock className="w-3 h-3 text-amber-500" /> : <CheckCircle className="w-3 h-3 text-emerald-500" />} Listos para Asignar
                </p>
                <p className={`text-5xl font-black ${stats.pendingDriver > 0 ? "text-amber-600" : "text-emerald-600"}`}>{stats.pendingDriver}</p>
                <p className="text-xs font-medium text-slate-400 mt-2 hover:text-amber-700">Ir a agenda →</p>
              </div>
              <CalendarDays className={`w-14 h-14 ${stats.pendingDriver > 0 ? "text-amber-200" : "text-emerald-100"}`} />
            </CardContent>
          </Card>

          <Card className="shadow-sm border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate("calendar")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Traslados Activos</p>
                <p className="text-5xl font-black text-blue-600">{stats.activeTrips}</p>
                <p className="text-xs font-medium text-slate-400 mt-2 hover:text-blue-700">Ver en agenda →</p>
              </div>
              <Activity className="w-14 h-14 text-blue-200" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SECCIÓN 2: REVISIÓN Y VISADO DE TRASLADOS PENDIENTES
// ==========================================
function AssignPersonnelSection() {
  const [trips, setTrips] = useState([]);
  const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(null);

  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [priority, setPriority] = useState("normal");

  const fetchTripsAndStaff = useCallback(async () => {
    try {
      const [revTrips, staffInfo] = await Promise.all([
        api.get("/trips/gestion_revision"),
        api.get("/clinical-staff")
      ]);
      setTrips(revTrips.data);
      setClinicalStaffOptions(staffInfo.data.filter(s => s.is_active));
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTripsAndStaff(); const interval = setInterval(fetchTripsAndStaff, 15000); return () => clearInterval(interval); }, [fetchTripsAndStaff]);

  const handleApprove = async () => {
    try {
      let clinical_team_name = "";
      if (selectedStaffId && selectedStaffId !== "none") {
        const staff = clinicalStaffOptions.find(s => s.id === selectedStaffId);
        if (staff) clinical_team_name = staff.name;
      }

      await api.put(`/trips/${assignDialog.id}/approve-gestor`, {
        priority: priority,
        accompaniment_staff_id: selectedStaffId === "none" ? null : selectedStaffId,
        clinical_team: clinical_team_name
      });
      toast.success("Traslado visado y aprobado correctamente");
      setAssignDialog(null); setSelectedStaffId(""); setPriority("normal"); fetchTripsAndStaff();
    } catch (e) { toast.error("Error al aprobar traslado"); }
  };

  const pendingTrips = trips;

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600" /></div>;

  const TripCard = ({ t, isPending }) => (
    <Card className={`shadow-sm border-l-4 ${isPending ? "border-l-red-500" : "border-l-teal-500"}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[11px] font-bold shadow-sm">{t.tracking_number || t.id?.substring(0, 6)?.toUpperCase()}</span>
          <span className="text-xs font-bold text-slate-500">{t.scheduled_date || new Date(t.created_at || Date.now()).toLocaleDateString()}</span>
        </div>
        <p className="font-black text-xl text-slate-900 mb-1">{t.patient_name || "Paciente no especificado"}</p>
        <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-wider">Motivo: {t.transfer_reason || "Sin especificar"}</p>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-2">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-600" /> <span className="text-sm font-bold text-slate-800">{t.origin || "-"} <span className="font-medium text-slate-500 text-xs">({t.patient_unit || ""})</span></span></div>
          <div className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-blue-600" /> <span className="text-sm font-bold text-slate-800">{t.destination || "-"}</span></div>
        </div>

        {t.accompaniment_staff_id && t.clinical_team && (
          <div className="mb-4 bg-teal-50 p-2.5 rounded-lg border border-teal-200 shadow-sm">
            <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1 flex items-center">Personal Solicitado:</p>
            <p className="text-sm font-bold text-teal-900">{t.clinical_team}</p>
          </div>
        )}

        <Button onClick={() => {
          setAssignDialog(t);
          setSelectedStaffId(t.accompaniment_staff_id || "none");
          setPriority(t.priority || "normal");
        }}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 text-sm shadow-sm rounded-xl">
          Revisar y Visar
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Visación de Traslados Clínicos</h1>
        <p className="text-slate-500 font-medium mt-1">Revise, asigne prioridad y apruebe las solicitudes para enviarlas a coordinación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {pendingTrips.map(t => <TripCard key={t.id} t={t} isPending={true} />)}
        {pendingTrips.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200"><p className="text-xl font-bold">Excelente, no hay traslados pendientes de visación.</p></div>}
      </div>

      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl font-black">Visar Traslado Clínico</DialogTitle></DialogHeader>
          {assignDialog && (
            <div className="space-y-5 pt-3">
              {/* SOLICITANTE E INGRESO */}
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 flex justify-between items-center">
                <div><p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Solicitado por</p><p className="font-bold text-purple-900">{assignDialog.requester_name || assignDialog.requester_person || "-"}</p></div>
                <div className="text-right"><p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Ingresado</p><p className="font-bold text-purple-900 text-sm">{assignDialog.created_at ? new Date(assignDialog.created_at).toLocaleString() : "-"}</p></div>
              </div>
              {/* DATOS PACIENTE */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Paciente</p>
                <p className="text-xl font-black text-slate-900">{assignDialog.patient_name || "No especificado"}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 pt-2 border-t border-slate-200 text-xs">
                  <div><span className="font-bold text-slate-500">RUT:</span> {assignDialog.rut || "-"}</div>
                  <div><span className="font-bold text-slate-500">Edad:</span> {assignDialog.age || "-"}</div>
                  <div><span className="font-bold text-slate-500">Peso:</span> {assignDialog.weight || "-"}</div>
                  <div><span className="font-bold text-slate-500">Cama:</span> {assignDialog.bed || "-"}</div>
                  <div className="col-span-2"><span className="font-bold text-slate-500">Diagnóstico:</span> {assignDialog.diagnosis || "-"}</div>
                  <div><span className="font-bold text-slate-500">Motivo:</span> {assignDialog.transfer_reason || "-"}</div>
                  <div><span className="font-bold text-slate-500">Médico:</span> {assignDialog.attending_physician || "-"}</div>
                </div>
              </div>
              {/* RUTA */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase">Origen</p><p className="font-bold text-slate-800">{assignDialog.origin}</p><p className="text-xs text-slate-500">{assignDialog.patient_unit || ""}</p></div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm"><p className="text-[10px] font-bold text-slate-400 uppercase">Destino</p><p className="font-bold text-slate-800">{assignDialog.destination}</p></div>
              </div>
              {/* HORARIOS */}
              <div className="bg-red-50 p-3 rounded-xl border border-red-200 flex gap-6">
                <div><p className="text-[10px] font-bold text-red-600 uppercase">Citación</p><p className="font-black text-red-900 text-lg">{assignDialog.appointment_time || "-"}</p></div>
                <div><p className="text-[10px] font-bold text-red-600 uppercase">Salida</p><p className="font-black text-red-900 text-lg">{assignDialog.departure_time || "-"}</p></div>
                <div><p className="text-[10px] font-bold text-red-600 uppercase">Fecha</p><p className="font-black text-red-900 text-lg">{assignDialog.scheduled_date || "-"}</p></div>
              </div>
              {/* REQUERIMIENTOS */}
              {(assignDialog.required_personnel?.length > 0 || assignDialog.patient_requirements?.length > 0 || assignDialog.assigned_clinical_staff?.length > 0) && (
                <div className="bg-teal-50 p-3 rounded-xl border border-teal-200">
                  {assignDialog.assigned_clinical_staff?.length > 0 && <div className="mb-2"><p className="text-[10px] text-teal-800 font-bold uppercase mb-1">Personal Clínico</p>{assignDialog.assigned_clinical_staff.map((s, i) => <p key={i} className="text-sm text-teal-900 font-medium">{s.type}: <strong>{s.staff_name}</strong></p>)}</div>}
                  {assignDialog.required_personnel?.length > 0 && !assignDialog.assigned_clinical_staff?.length && <div className="mb-2"><p className="text-[10px] text-teal-800 font-bold uppercase mb-1">Personal Requerido</p><p className="text-sm text-teal-900 font-medium">{assignDialog.required_personnel.join(", ")}</p></div>}
                  {assignDialog.patient_requirements?.length > 0 && <div><p className="text-[10px] text-teal-800 font-bold uppercase mb-1">Requerimientos Paciente</p><p className="text-sm text-teal-900 font-medium">{assignDialog.patient_requirements.join(", ")}</p></div>}
                </div>
              )}
              {assignDialog.notes && <div className="bg-amber-50 p-3 rounded-xl border border-amber-200"><p className="text-[10px] font-bold text-amber-700 uppercase mb-1">Notas</p><p className="text-sm text-slate-800">{assignDialog.notes}</p></div>}
              {/* ACCIONES DE VISADO */}
              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-sm">Prioridad del Traslado *</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-12 font-bold border-slate-300"><SelectValue placeholder="Seleccione prioridad" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta"><span className="text-red-600 font-bold">Alta Prioridad</span></SelectItem>
                      <SelectItem value="media"><span className="text-amber-600 font-bold">Media Prioridad</span></SelectItem>
                      <SelectItem value="normal"><span className="text-slate-700 font-bold">Normal / Baja</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-sm">Personal Clínico Acompañante Específico (Opcional)</Label>
                  <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                    <SelectTrigger className="h-12 border-slate-300"><SelectValue placeholder="Seleccione personal" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin asignación específica</SelectItem>
                      {clinicalStaffOptions.map(staff => (<SelectItem key={staff.id} value={staff.id}>{staff.name} ({staff.role})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter className="mt-4">
                  <Button variant="outline" className="h-12 font-bold" onClick={() => setAssignDialog(null)}>Cancelar</Button>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-md w-full" onClick={handleApprove}>Aprobar y Enviar a Conductores</Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// SECCIÓN 3: MANTENEDOR PERSONAL CLÍNICO
// ==========================================
function ClinicalStaffMantenedor() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [formData, setFormData] = useState({ name: "", role: "", is_active: true });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/clinical-staff");
      setStaff(res.data);
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleSave = async () => {
    if (!formData.name || !formData.role) { toast.error("Nombre y rol son obligatorios"); return; }
    try {
      if (editingStaff) {
        await api.put(`/clinical-staff/${editingStaff.id}`, formData);
        toast.success("Personal actualizado");
      } else {
        await api.post("/clinical-staff", formData);
        toast.success("Personal creado");
      }
      setIsDialogOpen(false); fetchStaff();
    } catch (e) { toast.error("Error al guardar data"); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que quiere eliminar este registro?")) {
      try {
        await api.delete(`/clinical-staff/${id}`);
        toast.success("Eliminado");
        fetchStaff();
      } catch (e) { toast.error("Error al eliminar"); }
    }
  };

  const openNew = () => { setEditingStaff(null); setFormData({ name: "", role: "", is_active: true }); setIsDialogOpen(true); };
  const openEdit = (s) => { setEditingStaff(s); setFormData({ name: s.name, role: s.role, is_active: s.is_active }); setIsDialogOpen(true); };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Mantenedor de Personal Clínico</h1>
          <p className="text-slate-500 font-medium mt-1">Gestione el personal de apoyo (Tens, Enfermeros, etc) para traslados.</p>
        </div>
        <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 flex gap-2">
          <Plus className="w-4 h-4" /> Agregar Personal
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-hidden">
          {loading ? <div className="py-20 flex justify-center text-teal-600"><RefreshCw className="w-8 h-8 animate-spin" /></div> : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Nombre Completo</th>
                  <th className="p-4">Rol / Cargo</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-800"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-teal-500" /> {s.name}</div></td>
                    <td className="p-4 text-slate-600">{s.role}</td>
                    <td className="p-4 text-center">
                      <Badge className={s.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>
                        {s.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="text-blue-600"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="text-red-600"><Trash2 className="w-4 h-4" /></Button>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-slate-400">No hay personal registrado.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingStaff ? "Editar Personal" : "Nuevo Personal Clínico"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nombre Completo</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Ana María Rojas" />
            </div>
            <div className="space-y-2">
              <Label>Cargo / Rol *</Label>
              <Select value={formData.role} onValueChange={v => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccione rol" /></SelectTrigger>
                <SelectContent>{PERSONNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex items-center justify-between border p-3 rounded-lg mt-4">
              <Label>Estado Activo</Label>
              <input type="checkbox" className="w-5 h-5 accent-teal-600" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} />
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// SECCIÓN 4: CALENDARIO CLÍNICO (MULTI-VISTA)
// ==========================================
function ClinicalCalendarSection() {
  const [viewMode, setViewMode] = useState("daily"); // daily, weekly, monthly
  const [currentDate, setCurrentDate] = useState(new Date());
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const getDateRange = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === "daily") {
      const ds = d.toISOString().split("T")[0];
      return { start: ds, end: ds };
    }
    if (viewMode === "weekly") {
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d); mon.setDate(diff);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: mon.toISOString().split("T")[0], end: sun.toISOString().split("T")[0] };
    }
    // monthly
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: first.toISOString().split("T")[0], end: last.toISOString().split("T")[0] };
  }, [currentDate, viewMode]);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const res = await api.get(`/trips/calendar?start_date=${start}&end_date=${end}`);
      setTrips(res.data);
    } catch (e) { } finally { setLoading(false); }
  }, [getDateRange]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (viewMode === "daily") d.setDate(d.getDate() + dir);
    else if (viewMode === "weekly") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", revision_gestor: "bg-purple-100 text-purple-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const getTitle = () => {
    if (viewMode === "daily") return currentDate.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (viewMode === "weekly") { const { start, end } = getDateRange(); return `${start} — ${end}`; }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const tripsByDate = (dateStr) => trips.filter(t => t.scheduled_date === dateStr);

  // Weekly helper: get array of 7 date strings
  const getWeekDates = () => {
    const { start } = getDateRange();
    const d = new Date(start + "T12:00:00");
    return Array.from({ length: 7 }, (_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd.toISOString().split("T")[0]; });
  };

  // Monthly helper: get grid of dates
  const getMonthGrid = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(y, m, d).toISOString().split("T")[0]);
    return grid;
  };

  const TripCard = ({ t }) => (
    <div className={`p-2 rounded-lg border-l-2 mb-1 text-xs ${t.trip_type === "clinico" ? "border-l-teal-500 bg-teal-50/50" : "border-l-slate-400 bg-slate-50"}`}>
      <div className="flex justify-between items-center">
        <span className="font-mono font-bold text-[9px] text-slate-600">{t.tracking_number}</span>
        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${statusColors[t.status] || "bg-slate-100"}`}>{(t.status || "").replace(/_/g, " ")}</span>
      </div>
      <p className="font-bold text-slate-800 truncate">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
      {t.appointment_time && <p className="text-[10px] text-red-600 font-bold">🕐 {t.appointment_time}</p>}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Calendario de Traslados</h1>
          <p className="text-slate-500 font-medium mt-1 capitalize">{getTitle()}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-white border rounded-xl p-1 flex gap-1">
            {[{ k: "daily", l: "Día" }, { k: "weekly", l: "Semana" }, { k: "monthly", l: "Mes" }].map(v => (
              <button key={v.k} onClick={() => setViewMode(v.k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === v.k ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}>{v.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white border rounded-xl p-1">
            <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-2 py-1 text-xs font-bold text-teal-700 hover:bg-teal-50 rounded-lg">Hoy</button>
            <button onClick={() => navigate(1)} className="p-1.5 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {loading ? <div className="flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-teal-600" /></div> : (
        <>
          {/* DAILY VIEW */}
          {viewMode === "daily" && (
            <div className="space-y-3">
              {trips.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200"><CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-lg font-bold text-slate-500">Sin traslados para este día</p></div>
              ) : trips.map(t => (
                <Card key={t.id} className="shadow-sm border-l-4 border-l-teal-500">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="bg-slate-100 p-2 rounded-xl text-center min-w-[70px]"><p className="text-[9px] font-bold text-slate-500 uppercase">Cita</p><p className="text-base font-black text-slate-900">{t.appointment_time || "--:--"}</p></div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold">{t.tracking_number}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${statusColors[t.status] || "bg-slate-100"}`}>{(t.status || "").replace(/_/g, " ")}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{t.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
                        </div>
                        <p className="font-bold text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                        <p className="text-xs text-slate-500 mt-0.5"><MapPin className="w-3 h-3 inline text-teal-500" /> {t.origin} → {t.destination}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border text-right"><p className="text-[9px] font-bold text-slate-400 uppercase">Personal</p><p className="text-xs font-black text-teal-800">{t.clinical_team || "Sin asignar"}</p></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* WEEKLY VIEW */}
          {viewMode === "weekly" && (
            <div className="grid grid-cols-7 gap-2">
              {getWeekDates().map((dateStr, i) => {
                const dayTrips = tripsByDate(dateStr);
                const isToday = dateStr === new Date().toISOString().split("T")[0];
                return (
                  <div key={dateStr} className={`bg-white rounded-xl border p-2 min-h-[200px] ${isToday ? "border-teal-400 ring-2 ring-teal-100" : "border-slate-200"}`}>
                    <div className={`text-center mb-2 pb-1 border-b ${isToday ? "border-teal-200" : "border-slate-100"}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{dayNames[i]}</p>
                      <p className={`text-sm font-black ${isToday ? "text-teal-700" : "text-slate-700"}`}>{dateStr.split("-")[2]}</p>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[250px] custom-scrollbar">
                      {dayTrips.map(t => <TripCard key={t.id} t={t} />)}
                      {dayTrips.length === 0 && <p className="text-[10px] text-slate-300 text-center mt-4">—</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MONTHLY VIEW */}
          {viewMode === "monthly" && (
            <div>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map(d => <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {getMonthGrid().map((dateStr, i) => {
                  if (!dateStr) return <div key={`empty-${i}`} className="min-h-[80px]" />;
                  const dayTrips = tripsByDate(dateStr);
                  const isToday = dateStr === new Date().toISOString().split("T")[0];
                  const counts = { pending: dayTrips.filter(t => ["pendiente", "revision_gestor"].includes(t.status)).length, active: dayTrips.filter(t => ["asignado", "en_curso"].includes(t.status)).length, done: dayTrips.filter(t => t.status === "completado").length };
                  return (
                    <div key={dateStr} onClick={() => { setCurrentDate(new Date(dateStr + "T12:00:00")); setViewMode("daily"); }} className={`min-h-[80px] bg-white rounded-lg border p-1.5 cursor-pointer hover:shadow-md transition-all ${isToday ? "border-teal-400 ring-1 ring-teal-100" : "border-slate-100"}`}>
                      <p className={`text-xs font-bold mb-1 ${isToday ? "text-teal-700" : "text-slate-600"}`}>{parseInt(dateStr.split("-")[2])}</p>
                      {dayTrips.length > 0 && (
                        <div className="space-y-0.5">
                          {counts.pending > 0 && <div className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1 py-0.5 rounded">{counts.pending} pend.</div>}
                          {counts.active > 0 && <div className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1 py-0.5 rounded">{counts.active} activo</div>}
                          {counts.done > 0 && <div className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1 py-0.5 rounded">{counts.done} hecho</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ==========================================
// SECCIÓN 5: HISTÓRICO Y REPORTES EXCEL (NUEVO)
// ==========================================
function ClinicalHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/trips/history");
      setHistory(res.data.filter(t => t.trip_type === "clinico"));
    } catch (e) {
      toast.error("Error al cargar el historial");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filteredHistory = history.filter(t => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (t.patient_name || "").toLowerCase().includes(term) ||
      (t.tracking_number || "").toLowerCase().includes(term) ||
      (t.origin || "").toLowerCase().includes(term) ||
      (t.destination || "").toLowerCase().includes(term);

    const matchesStatus = statusFilter === "all" || t.status === statusFilter;

    const tripDate = new Date(t.scheduled_date || t.created_at);
    const matchesDateFrom = dateFrom ? tripDate >= new Date(dateFrom) : true;
    const matchesDateTo = dateTo ? tripDate <= new Date(dateTo + "T23:59:59") : true;

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const handleExportExcel = () => {
    if (filteredHistory.length === 0) {
      toast.error("No hay datos para exportar con estos filtros.");
      return;
    }

    const headers = ["Folio", "Fecha Programada", "Paciente", "RUT", "Origen", "Destino", "Motivo", "Personal Acompañante", "Conductor", "Patente Vehiculo", "Estado"];

    const csvRows = filteredHistory.map(t => [
      t.tracking_number || "",
      t.scheduled_date || "",
      `"${(t.patient_name || "").replace(/"/g, '""')}"`,
      t.rut || "",
      `"${(t.origin || "").replace(/"/g, '""')}"`,
      `"${(t.destination || "").replace(/"/g, '""')}"`,
      `"${(t.transfer_reason || "").replace(/"/g, '""')}"`,
      `"${(t.clinical_team || "No asignado").replace(/"/g, '""')}"`,
      `"${(t.driver_name || "Sin conductor").replace(/"/g, '""')}"`,
      t.vehicle_plate || "Sin vehículo",
      t.status || ""
    ].join(";")); // Usamos punto y coma para que Excel en español lo separe bien por columnas

    const csvContent = [headers.join(";"), ...csvRows].join("\n");
    // Añadimos BOM (\uFEFF) para que Excel lea perfectamente los tildes y acentos (UTF-8)
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Traslados_Clinicos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Histórico de Traslados Clínicos</h1>
          <p className="text-slate-500 font-medium mt-1">Busque pacientes pasados y exporte reportes a Excel.</p>
        </div>
        <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-md flex items-center gap-2">
          <Download className="w-4 h-4" /> Exportar a Excel
        </Button>
      </div>

      <Card className="mb-6 shadow-sm border-slate-200">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Search className="w-3 h-3" /> Buscar Paciente</Label>
            <Input placeholder="Nombre, RUT o Folio..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Filter className="w-3 h-3" /> Estado del Traslado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-slate-50"><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="asignado">Asignados</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="completado">Completados</SelectItem>
                <SelectItem value="cancelado">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Desde</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Hasta</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-10 bg-slate-50" />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400"><RefreshCw className="w-8 h-8 animate-spin mb-4 text-teal-600" />Cargando registros...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0 shadow-sm z-10">
                <tr>
                  <th className="p-4 whitespace-nowrap">Folio / Fecha</th>
                  <th className="p-4">Paciente</th>
                  <th className="p-4">Ruta</th>
                  <th className="p-4">Equipo Acompañante</th>
                  <th className="p-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-mono text-slate-700 font-bold text-xs bg-slate-200 px-1.5 py-0.5 rounded">{t.tracking_number}</span>
                      <p className="text-xs text-slate-500 mt-1">{t.scheduled_date}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{t.patient_name || "Sin nombre"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">RUT: {t.rut || "-"}</p>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1 mb-1"><MapPin className="w-3 h-3 text-teal-500" /> {t.origin}</div>
                      <div className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-slate-400" /> {t.destination}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
                        {t.clinical_team || "No asignado"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={`${statusColors[t.status]} text-[10px] uppercase font-bold tracking-wider`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No se encontraron registros con los filtros actuales.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 text-right">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
          Mostrando {filteredHistory.length} registros
        </span>
      </div>
    </div>
  );
}

// ==========================================
// SECCIÓN 6: MANTENEDOR DE SERVICIOS DE ORIGEN
// ==========================================
function OriginServicesMantenedor() {
  const [services, setServices] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({ name: "", is_active: true });
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    try { const r = await api.get("/origin-services"); setServices(r.data); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchServices(); }, [fetchServices]);

  const openCreate = () => { setEditingService(null); setFormData({ name: "", is_active: true }); setIsDialogOpen(true); };
  const openEdit = (s) => { setEditingService(s); setFormData({ name: s.name, is_active: s.is_active !== false }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Ingrese un nombre"); return; }
    try {
      if (editingService) { await api.put(`/origin-services/${editingService.id}`, formData); toast.success("Servicio actualizado"); }
      else { await api.post("/origin-services", formData); toast.success("Servicio creado"); }
      setIsDialogOpen(false); fetchServices();
    } catch { toast.error("Error al guardar"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este servicio?")) return;
    try { await api.delete(`/origin-services/${id}`); toast.success("Servicio eliminado"); fetchServices(); } catch { toast.error("Error"); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-black text-slate-900">Mantenedor de Servicios de Origen</h1><p className="text-sm text-slate-500 mt-1">Administre los servicios que aparecen como opciones de origen al crear traslados.</p></div>
        <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-md"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr><th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Servicio</th><th className="p-4 text-center w-24">Estado</th><th className="p-4 text-center w-32">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {services.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{s.name}</td>
                  <td className="p-4 text-center">{s.is_active !== false ? <Badge className="bg-emerald-100 text-emerald-800">Activo</Badge> : <Badge variant="outline" className="text-slate-400">Inactivo</Badge>}</td>
                  <td className="p-4 text-center"><Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8 text-slate-500 hover:text-teal-600"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {services.length === 0 && !loading && <tr><td colSpan={3} className="text-center py-12 text-slate-400">No hay servicios registrados. Haga clic en "Agregar" para crear el primero.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nombre del Servicio *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Urgencias, UCI Adulto, Pabellón" /></div>
            <div className="flex items-center justify-between border p-3 rounded-lg"><Label>Estado Activo</Label><input type="checkbox" className="w-5 h-5 accent-teal-600" checked={formData.is_active} onChange={e => setFormData({ ...formData, is_active: e.target.checked })} /></div>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">{editingService ? "Guardar Cambios" : "Crear Servicio"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// SECCIÓN 7: NUEVA SOLICITUD (GESTOR DE CAMAS)
// ==========================================
function GestorNewTripSection() {
  const [destinations, setDestinations] = useState([]);
  const [originServices, setOriginServices] = useState([]);
  const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
  const [tripType, setTripType] = useState("clinico");
  const [form, setForm] = useState({
    origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
    scheduled_date: new Date().toISOString().split("T")[0],
    rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
    attending_physician: "", appointment_time: "", departure_time: "",
    patient_requirements: [], accompaniment: "", accompaniment_staff_id: "none",
    task_details: "", staff_count: ""
  });
  const [staffRows, setStaffRows] = useState([]);
  const [useCustomOrigin, setUseCustomOrigin] = useState(false);
  const [useCustomDest, setUseCustomDest] = useState(false);
  const [useCustomService, setUseCustomService] = useState(false);
  const [loading, setLoading] = useState(false);

  const [rutValid, setRutValid] = useState(true);

  const validateRut = (value) => {
    let clean = value.replace(/\./g, "").replace(/-/g, "").toUpperCase();
    if (clean.length < 2) return { valid: false, formatted: value };
    let body = clean.slice(0, -1);
    let dv = clean.slice(-1);
    if (!/^\d+$/.test(body)) return { valid: false, formatted: value };
    let sum = 0; let mul = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    let res = 11 - (sum % 11);
    let expected = res === 11 ? "0" : res === 10 ? "K" : res.toString();
    const formatted = body.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.") + "-" + dv;
    return { valid: dv === expected, formatted };
  };

  const handleRutChange = (e) => {
    const val = e.target.value;
    if (!val) {
      setForm({ ...form, rut: "" });
      setRutValid(true);
      return;
    }
    const { valid, formatted } = validateRut(val);
    setForm({ ...form, rut: formatted });
    setRutValid(valid);
  };

  useEffect(() => {
    api.get("/destinations").then(r => setDestinations(r.data)).catch(() => { });
    api.get("/clinical-staff").then(r => setClinicalStaffOptions(r.data.filter(s => s.is_active))).catch(() => { });
    api.get("/origin-services").then(r => setOriginServices(r.data.filter(s => s.is_active !== false))).catch(() => { });
  }, []);

  const reasonOptions = ["Examen", "Hospitalización", "Dialisis", "Rescate", "Alta", "Procedimiento"];
  const requirementOptions = ["Camilla", "Incubadora", "Silla de rueda", "Oxigeno", "Monitor", "Aislamiento Aéreo", "Aislamiento Contacto", "Aislamiento Protector", "Dependiente severo"];

  const handleCheckbox = (field, val) => setForm(p => { const a = p[field]; return a.includes(val) ? { ...p, [field]: a.filter(i => i !== val) } : { ...p, [field]: [...a, val] }; });
  const addStaffRow = () => setStaffRows([...staffRows, { type: "", staff_id: "", staff_name: "" }]);
  const removeStaffRow = (i) => setStaffRows(staffRows.filter((_, idx) => idx !== i));
  const updateStaffRow = (i, field, value) => {
    setStaffRows(prev => {
      const u = [...prev]; u[i] = { ...u[i], [field]: value };
      if (field === "type") { u[i].staff_id = ""; u[i].staff_name = ""; }
      if (field === "staff_id" && value) { const s = clinicalStaffOptions.find(s => s.id === value); if (s) u[i].staff_name = s.name; }
      return u;
    });
  };
  const getStaffByType = (type) => type ? clinicalStaffOptions.filter(s => s.role.toLowerCase() === type.toLowerCase()) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tripType === "clinico") {
      if (!form.patient_name || !form.origin || !form.destination) { toast.error("Complete campos obligatorios"); return; }
      if (!rutValid) { toast.error("El RUT ingresado no es válido"); return; }
      if (staffRows.length === 0) { toast.error("Añada al menos un personal clínico"); return; }
      if (staffRows.some(r => !r.type || !r.staff_id)) { toast.error("Complete todo el personal añadido"); return; }
    } else {
      if (!form.origin || !form.destination || !form.task_details) { toast.error("Complete Origen, Destino y Cometido"); return; }
    }
    setLoading(true);
    try {
      await api.post("/trips", { ...form, trip_type: tripType, accompaniment_staff_id: form.accompaniment_staff_id === "none" ? null : form.accompaniment_staff_id, required_personnel: staffRows.map(r => `${r.type}: ${r.staff_name}`), assigned_clinical_staff: staffRows });
      toast.success("Traslado creado exitosamente");
      setForm({ origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "", scheduled_date: new Date().toISOString().split("T")[0], rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "", attending_physician: "", appointment_time: "", departure_time: "", patient_requirements: [], accompaniment: "", accompaniment_staff_id: "none", task_details: "", staff_count: "" });
      setStaffRows([]);
    } catch { toast.error("Error al crear"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-black text-slate-900 mb-6">Nueva Solicitud de Traslado (Gestión Camas)</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => setTripType("clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tripType === "clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white text-slate-500"}`}><Stethoscope className="w-8 h-8" /><span className="font-bold">Clínico</span></button>
        <button onClick={() => setTripType("no_clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tripType === "no_clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white text-slate-500"}`}><Truck className="w-8 h-8" /><span className="font-bold">No Clínico</span></button>
      </div>
      <Card className="shadow-lg border-t-4 border-t-teal-500"><CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {tripType === "clinico" && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Nombre Paciente *</Label><Input value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} /></div>
            <div className="space-y-1">
              <Label className={!rutValid ? "text-red-600" : ""}>RUT {!rutValid && "(Inválido)"}</Label>
              <Input
                value={form.rut}
                onChange={handleRutChange}
                placeholder="12.345.678-9"
                className={!rutValid ? "border-red-500 bg-red-50" : ""}
              />
            </div>
            <div className="space-y-1"><Label>Edad</Label><Input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
            <div className="space-y-1"><Label>Peso</Label><Input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
            <div className="space-y-1 md:col-span-2"><Label>Diagnóstico</Label><Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
            <div className="space-y-1"><Label>Médico Tratante</Label><Input value={form.attending_physician} onChange={e => setForm({ ...form, attending_physician: e.target.value })} /></div>
            <div className="space-y-1"><Label>Motivo Traslado</Label><Select value={form.transfer_reason} onValueChange={v => setForm({ ...form, transfer_reason: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{reasonOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select></div>
          </div>)}
          {tripType === "no_clinico" && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1"><Label>Cometido *</Label><Input value={form.task_details} onChange={e => setForm({ ...form, task_details: e.target.value })} /></div>
            <div className="space-y-1"><Label>Cant. Funcionarios</Label><Input type="number" min="0" value={form.staff_count} onChange={e => setForm({ ...form, staff_count: e.target.value })} /></div>
          </div>)}
          {/* Ubicación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Origen *</Label>{!useCustomOrigin ? <Select onValueChange={v => v === "otro" ? setUseCustomOrigin(true) : setForm({ ...form, origin: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} onDoubleClick={() => setUseCustomOrigin(false)} />}</div>
            <div className="space-y-1"><Label>Destino *</Label>{!useCustomDest ? <Select onValueChange={v => v === "otro" ? setUseCustomDest(true) : setForm({ ...form, destination: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} onDoubleClick={() => setUseCustomDest(false)} />}</div>
            {tripType === "clinico" && <>
              <div className="space-y-1"><Label>Servicio de Origen</Label>{!useCustomService ? <Select onValueChange={v => v === "otro" ? setUseCustomService(true) : setForm({ ...form, patient_unit: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{originServices.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input value={form.patient_unit} onChange={e => setForm({ ...form, patient_unit: e.target.value })} onDoubleClick={() => setUseCustomService(false)} />}</div>
              <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })} /></div>
              <div className="space-y-1"><Label>Hora Citación</Label><Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} /></div>
            </>}
            <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
          </div>
          {/* Personal clínico tabla */}
          {tripType === "clinico" && (<div className="space-y-3">
            <Label className="font-bold">Personal Clínico *</Label>
            {staffRows.length > 0 && <div className="border rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Tipo</th><th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Nombre</th><th className="p-2 w-10"></th></tr></thead><tbody>{staffRows.map((row, i) => (<tr key={i}><td className="p-2"><Select value={row.type} onValueChange={v => updateStaffRow(i, "type", v)}><SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent>{PERSONNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Select value={row.staff_id} onValueChange={v => updateStaffRow(i, "staff_id", v)} disabled={!row.type}><SelectTrigger className="h-9"><SelectValue placeholder="Funcionario" /></SelectTrigger><SelectContent>{getStaffByType(row.type).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Button type="button" variant="ghost" size="icon" onClick={() => removeStaffRow(i)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button></td></tr>))}</tbody></table></div>}
            <Button type="button" variant="outline" onClick={addStaffRow} className="border-teal-200 text-teal-700 h-9"><Plus className="w-4 h-4 mr-1" /> Añadir Personal</Button>
          </div>)}
          {/* Requerimientos */}
          {tripType === "clinico" && (<div className="space-y-2"><Label>Requerimientos Paciente</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">{requirementOptions.map(o => <label key={o} className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={form.patient_requirements.includes(o)} onChange={() => handleCheckbox("patient_requirements", o)} className="w-4 h-4 accent-teal-600" />{o}</label>)}</div></div>)}
          <div className="space-y-1"><Label>Notas</Label><textarea className="w-full min-h-[60px] p-3 rounded-md border text-sm" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-lg font-bold" disabled={loading}>{loading ? "Creando..." : "Crear Traslado"}</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}
