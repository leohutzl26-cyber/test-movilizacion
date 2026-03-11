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
const REQUIREMENT_OPTIONS = ["Camilla", "Incubadora", "Silla de rueda", "Oxigeno", "Monitor", "Aislamiento Aéreo", "Aislamiento Contacto", "Aislamiento Protector", "Dependiente severo"];

export default function GestionCamasDashboard() {
  const [section, setSection] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "assign" && <AssignPersonnelSection />}
        {section === "new" && <GestorNewTripSection />}
        {section === "staff" && <ClinicalStaffMantenedor />}
        {section === "services" && <OriginServicesMantenedor />}
        {section === "calendar" && <ClinicalCalendarSection />}
        {section === "history" && <ClinicalHistorySection />}
        {/* Unificado: "dashboard" ahora redirige a "assign" */}
        {section === "dashboard" && <AssignPersonnelSection />}
      </main>
    </div>
  );
}

// La sección de resumen ha sido unificada en la Bandeja de Entrada.

// ==========================================
// SECCIÓN 2: REVISIÓN Y VISADO DE TRASLADOS PENDIENTES
// ==========================================
function AssignPersonnelSection() {
  const [trips, setTrips] = useState([]);
  const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(null);

  const [staffRows, setStaffRows] = useState([]);
  const [priority, setPriority] = useState("normal");
  const [editData, setEditData] = useState({});
  const [stats, setStats] = useState({ revision: 0, pendiente: 0, asignado: 0, en_curso: 0 });
  const [destinations, setDestinations] = useState([]);
  const [originServices, setOriginServices] = useState([]);
  const [filterStatus, setFilterStatus] = useState("revision_gestor");
  const [allActiveTrips, setAllActiveTrips] = useState([]);
  const [rejectDialog, setRejectDialog] = useState(null); // Contiene el viaje a rechazar
  const [rejectReason, setRejectReason] = useState("");

  const fetchTripsAndStaff = useCallback(async () => {
    try {
      const [revTrips, staffInfo, allActive, dests, services] = await Promise.all([
        api.get("/trips/gestion_revision"),
        api.get("/clinical-staff"),
        api.get("/trips/active"),
        api.get("/destinations"),
        api.get("/origin-services")
      ]);
      
      setTrips(revTrips.data);
      setClinicalStaffOptions(staffInfo.data.filter(s => s.is_active));
      setDestinations(dests.data);
      setOriginServices(services.data.filter(s => s.is_active !== false));
      
      // Filtrar solo clínicos para las estadísticas y el listado extendido
      const clinicos = allActive.data.filter(t => t.trip_type === "clinico");
      setAllActiveTrips(clinicos);

      setStats({
        revision: revTrips.data.length,
        pendiente: clinicos.filter(t => t.status === "pendiente").length,
        asignado: clinicos.filter(t => t.status === "asignado").length,
        en_curso: clinicos.filter(t => t.status === "en_curso").length
      });
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTripsAndStaff(); const interval = setInterval(fetchTripsAndStaff, 15000); return () => clearInterval(interval); }, [fetchTripsAndStaff]);

  const handleApprove = async () => {
    try {
      const payload = {
        ...editData,
        priority: priority,
        assigned_clinical_staff: staffRows
      };

      if (assignDialog.status === "revision_gestor") {
        await api.put(`/trips/${assignDialog.id}/approve-gestor`, payload);
        toast.success("Traslado visado y aprobado correctamente");
      } else {
        await api.put(`/trips/${assignDialog.id}`, payload);
        toast.success("Traslado actualizado correctamente");
      }
      setAssignDialog(null); fetchTripsAndStaff();
    } catch (e) { toast.error("Error al guardar cambios"); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Debe ingresar una justificación"); return; }
    try {
      await api.put(`/trips/${rejectDialog.id}/status`, {
        status: "cancelado",
        cancel_reason: rejectReason
      });
      toast.success("Traslado rechazado y cancelado");
      setRejectDialog(null);
      setAssignDialog(null);
      setRejectReason("");
      fetchTripsAndStaff();
    } catch (e) { toast.error("Error al rechazar traslado"); }
  };

  const updateStaffRow = (index, field, value) => {
    const updated = [...staffRows];
    updated[index][field] = value;
    if (field === "type") {
      updated[index].staff_id = "";
      updated[index].staff_name = "";
    }
    if (field === "staff_id") {
      const staff = clinicalStaffOptions.find(s => s.id === value);
      updated[index].staff_name = staff ? staff.name : "";
    }
    setStaffRows(updated);
  };

  const addStaffRow = () => {
    setStaffRows([...staffRows, { type: "", staff_id: "", staff_name: "" }]);
  };

  const removeStaffRow = (index) => {
    setStaffRows(staffRows.filter((_, i) => i !== index));
  };

  const handleRequirementChange = (val) => {
    const current = editData.patient_requirements || [];
    const updated = current.includes(val) 
      ? current.filter(i => i !== val) 
      : [...current, val];
    setEditData({ ...editData, patient_requirements: updated });
  };

  const displayedTrips = filterStatus === "revision_gestor" 
    ? trips 
    : allActiveTrips.filter(t => t.status === filterStatus);

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600" /></div>;

  const TripCard = ({ t, isPending }) => {
    const statusMap = {
      revision_gestor: { label: "Por Visar", color: "bg-red-100 text-red-700", border: "border-l-red-500" },
      pendiente: { label: "Pendiente Despacho", color: "bg-amber-100 text-amber-700", border: "border-l-amber-500" },
      asignado: { label: "Asignado", color: "bg-blue-100 text-blue-700", border: "border-l-blue-500" },
      en_curso: { label: "En Curso", color: "bg-emerald-100 text-emerald-700", border: "border-l-emerald-500" }
    };
    const config = statusMap[t.status] || { label: t.status, color: "bg-slate-100 text-slate-700", border: "border-l-slate-500" };

    return (
      <Card className={`shadow-sm border-l-4 transition-all hover:shadow-md ${config.border}`}>
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[11px] font-bold shadow-sm">{t.tracking_number || t.id?.substring(0, 6)?.toUpperCase()}</span>
            <Badge className={`font-bold uppercase text-[9px] ${config.color}`}>{config.label}</Badge>
          </div>
          <div className="flex justify-between items-start">
            <p className="font-black text-xl text-slate-900 mb-1">{t.patient_name || "Paciente no especificado"}</p>
            <Badge className={t.priority === "alta" ? "bg-red-100 text-red-700" : t.priority === "media" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}>
              {t.priority}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-wider">Motivo: {t.transfer_reason || "Sin especificar"}</p>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-2">
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-600" /> <span className="text-sm font-bold text-slate-800">{t.origin || "-"} <span className="font-medium text-slate-500 text-xs">({t.patient_unit || ""})</span></span></div>
            <div className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-blue-600" /> <span className="text-sm font-bold text-slate-800">{t.destination || "-"}</span></div>
          </div>

          <div className="flex items-center justify-between gap-2">
             <div className="flex-1">
                {t.clinical_team && (
                  <div className="bg-teal-50 p-2 rounded-lg border border-teal-200">
                    <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest leading-none mb-1">Equipo:</p>
                    <p className="text-xs font-bold text-teal-900 truncate">{t.clinical_team}</p>
                  </div>
                )}
             </div>
             {(t.status === "revision_gestor" || t.status === "pendiente" || t.status === "asignado") && (
                <Button onClick={() => {
                  setAssignDialog(t);
                  setStaffRows(t.assigned_clinical_staff || []);
                  setPriority(t.priority || "normal");
                  setEditData({ ...t });
                }}
                  className={`${t.status === "revision_gestor" ? "bg-teal-600 hover:bg-teal-700" : "bg-blue-600 hover:bg-blue-700"} text-white font-bold h-10 px-4 text-xs shadow-sm rounded-xl shrink-0`}>
                  {t.status === "revision_gestor" ? "Visar" : "Editar"}
                </Button>
             )}
             {t.status !== "revision_gestor" && (
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</p>
                  <p className="text-xs font-bold text-slate-700">{t.scheduled_date || "Hoy"}</p>
                </div>
             )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Bandeja de Entrada</h1>
        <p className="text-slate-500 font-medium mt-1">Gestión centralizada de traslados clínicos.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <button onClick={() => setFilterStatus("revision_gestor")} 
          className={`text-left p-4 rounded-2xl border-l-4 border-l-red-500 shadow-sm transition-all hover:scale-[1.02] ${filterStatus === "revision_gestor" ? "bg-red-50 ring-2 ring-red-200" : "bg-white"}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En Revisión</p>
          <p className="text-3xl font-black text-red-600">{stats.revision}</p>
        </button>
        <button onClick={() => setFilterStatus("pendiente")}
          className={`text-left p-4 rounded-2xl border-l-4 border-l-amber-500 shadow-sm transition-all hover:scale-[1.02] ${filterStatus === "pendiente" ? "bg-amber-50 ring-2 ring-amber-200" : "bg-white"}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pendientes</p>
          <p className="text-3xl font-black text-amber-600">{stats.pendiente}</p>
        </button>
        <button onClick={() => setFilterStatus("asignado")}
          className={`text-left p-4 rounded-2xl border-l-4 border-l-blue-500 shadow-sm transition-all hover:scale-[1.02] ${filterStatus === "asignado" ? "bg-blue-50 ring-2 ring-blue-200" : "bg-white"}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asignados</p>
          <p className="text-3xl font-black text-blue-600">{stats.asignado}</p>
        </button>
        <button onClick={() => setFilterStatus("en_curso")}
          className={`text-left p-4 rounded-2xl border-l-4 border-l-emerald-500 shadow-sm transition-all hover:scale-[1.02] ${filterStatus === "en_curso" ? "bg-emerald-50 ring-2 ring-emerald-200" : "bg-white"}`}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En Curso</p>
          <p className="text-3xl font-black text-emerald-600">{stats.en_curso}</p>
        </button>
      </div>

      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
           {filterStatus === "revision_gestor" ? <BedDouble className="w-5 h-5 text-teal-600" /> : <Activity className="w-5 h-5 text-teal-600" />} 
           {filterStatus === "revision_gestor" ? "Solicitudes por Visar" : 
            filterStatus === "pendiente" ? "Traslados Pendientes de Conductor" :
            filterStatus === "asignado" ? "Traslados con Conductor Asignado" : "Traslados en Ejecución"}
           <Badge className={`ml-2 ${filterStatus === "revision_gestor" ? "bg-red-100 text-red-700" : "bg-teal-100 text-teal-700"}`}>{displayedTrips.length}</Badge>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedTrips.map(t => <TripCard key={t.id} t={t} isPending={t.status === "revision_gestor"} />)}
        {displayedTrips.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-xl font-bold">Sin traslados en este estado.</p>
          </div>
        )}
      </div>

      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl font-black">{assignDialog?.status === "revision_gestor" ? "Visar Traslado Clínico" : "Editar Traslado Clínico"}</DialogTitle></DialogHeader>
          {assignDialog && (
            <div className="space-y-5 pt-3">
              {/* SOLICITANTE E INGRESO */}
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 flex justify-between items-center">
                <div><p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Solicitado por</p><p className="font-bold text-purple-900">{assignDialog.requester_name || assignDialog.requester_person || "-"}</p></div>
                <div className="text-right"><p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Ingresado</p><p className="font-bold text-purple-900 text-sm">{assignDialog.created_at ? new Date(assignDialog.created_at).toLocaleString() : "-"}</p></div>
              </div>

              {/* DATOS PACIENTE EDITABLES */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-3 flex items-center gap-2"><User className="w-3 h-3" /> Datos del Paciente</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Nombre Paciente</Label>
                    <Input className="h-9 text-sm font-bold bg-white" value={editData.patient_name || ""} onChange={e => setEditData({ ...editData, patient_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">RUT</Label>
                    <Input className="h-9 text-sm font-bold bg-white" value={editData.rut || ""} onChange={e => setEditData({ ...editData, rut: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Edad</Label>
                    <Input className="h-9 text-sm font-bold bg-white" value={editData.age || ""} onChange={e => setEditData({ ...editData, age: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Cama</Label>
                    <Input className="h-9 text-sm font-bold bg-white" value={editData.bed || ""} onChange={e => setEditData({ ...editData, bed: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Diagnóstico</Label>
                    <Input className="h-9 text-sm font-bold bg-white" value={editData.diagnosis || ""} onChange={e => setEditData({ ...editData, diagnosis: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Motivo Traslado</Label>
                    <Select value={editData.transfer_reason || "none"} onValueChange={v => setEditData({...editData, transfer_reason: v})}>
                      <SelectTrigger className="h-9 text-sm font-bold bg-white">
                        <SelectValue placeholder="Seleccione motivo" />
                      </SelectTrigger>
                      <SelectContent>
                        {["Examen", "Hospitalización", "Dialisis", "Rescate", "Alta", "Procedimiento"].map(r => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Médico Tratante</Label>
                    <Input className="h-9 text-sm font-bold bg-white" value={editData.attending_physician || ""} onChange={e => setEditData({ ...editData, attending_physician: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-2 mt-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2"><Stethoscope className="w-3 h-3" /> Requerimientos del Paciente</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-100 shadow-inner">
                      {REQUIREMENT_OPTIONS.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 accent-teal-600 rounded" 
                            checked={(editData.patient_requirements || []).includes(opt)}
                            onChange={() => handleRequirementChange(opt)}
                          />
                          <span className="text-[11px] font-bold text-slate-600 group-hover:text-teal-700 transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* RUTA EDITABLE */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-3 flex items-center gap-2"><MapPin className="w-3 h-3" /> Ruta y Ubicación</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Origen</Label>
                    <Select value={editData.origin || "none"} onValueChange={v => setEditData({...editData, origin: v})}>
                      <SelectTrigger className="h-9 text-sm font-bold bg-white">
                        <SelectValue placeholder="Seleccione origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Destino</Label>
                    <Select value={editData.destination || "none"} onValueChange={v => setEditData({...editData, destination: v})}>
                      <SelectTrigger className="h-9 text-sm font-bold bg-white">
                        <SelectValue placeholder="Seleccione destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Servicio / Unidad</Label>
                    <Select value={editData.patient_unit || "none"} onValueChange={v => setEditData({...editData, patient_unit: v})}>
                      <SelectTrigger className="h-9 text-sm font-bold bg-white">
                        <SelectValue placeholder="Seleccione unidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {originServices.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Hora Citación</Label>
                    <Input type="time" className="h-9 text-sm font-bold bg-white" value={editData.appointment_time || ""} onChange={e => setEditData({ ...editData, appointment_time: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Fecha Programada</Label>
                    <Input type="date" className="h-9 text-sm font-bold bg-white" value={editData.scheduled_date || ""} onChange={e => setEditData({ ...editData, scheduled_date: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Notas / Observaciones</Label>
                    <textarea className="w-full min-h-[60px] p-2 text-sm font-bold bg-white border rounded-md focus:ring-teal-500 outline-none" value={editData.notes || ""} onChange={e => setEditData({ ...editData, notes: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* ASIGNACIÓN DE PERSONAL (TABLA EDITABLE) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-teal-800 text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Personal Clínico Asignado</h4>
                  <Button type="button" size="sm" onClick={addStaffRow} className="bg-teal-600 hover:bg-teal-700 h-8 gap-1 text-[10px] px-2">
                    <Plus className="w-3 h-3" /> Añadir Personal
                  </Button>
                </div>
                {staffRows.length === 0 ? (
                  <p className="text-xs text-amber-600 italic font-bold">No hay personal solicitado. Puede añadir personal arriba.</p>
                ) : (
                  <div className="border rounded-xl overflow-hidden overflow-x-auto shadow-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 font-bold text-slate-500 uppercase tracking-tighter">
                        <tr>
                          <th className="p-2 text-left">Función</th>
                          <th className="p-2 text-left">Funcionario Identificado</th>
                          <th className="p-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {staffRows.map((row, i) => (
                          <tr key={i} className="bg-white">
                            <td className="p-2">
                              <Select value={row.type || "none"} onValueChange={v => updateStaffRow(i, "type", v)}>
                                <SelectTrigger className="h-8 border-slate-200 text-[11px] font-bold">
                                  <SelectValue placeholder="Tipo..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {PERSONNEL_TYPES.map(p => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Select value={row.staff_id || "none"} onValueChange={v => updateStaffRow(i, "staff_id", v === "none" ? "" : v)}>
                                <SelectTrigger className={`h-8 ${!row.staff_id ? "border-amber-400 bg-amber-50" : "border-slate-200"} text-[11px]`}>
                                  <SelectValue placeholder="Identificar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sin identificar...</SelectItem>
                                  {clinicalStaffOptions.filter(s => s.role === row.type).map(s => (
                                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2 text-center">
                              <Button variant="ghost" size="icon" onClick={() => removeStaffRow(i)} className="h-7 w-7 text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {staffRows.some(r => !r.staff_id) && (
                  <div className="bg-amber-100 border-l-4 border-amber-500 p-2 rounded flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <p className="text-[10px] font-bold text-amber-800">Hay personal sin identificar. Puede identificarlo ahora o dejarlo pendiente.</p>
                  </div>
                )}
              </div>

              {/* ACCIONES DE VISADO */}
              <div className="border-t pt-4 space-y-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-sm">Prioridad Final del Traslado *</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="h-11 font-bold border-slate-300"><SelectValue placeholder="Seleccione prioridad" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta"><span className="text-red-600 font-bold">Alta Prioridad</span></SelectItem>
                      <SelectItem value="media"><span className="text-amber-600 font-bold">Media Prioridad</span></SelectItem>
                      <SelectItem value="normal"><span className="text-slate-700 font-bold">Normal / Baja</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <DialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
                  <Button variant="outline" className="h-12 font-bold min-w-[120px]" onClick={() => setAssignDialog(null)}>Cancelar</Button>
                  <Button variant="destructive" className="h-12 font-bold flex-1 gap-2" onClick={() => setRejectDialog(assignDialog)}>
                    <XCircle className="w-5 h-5" /> Rechazar Traslado
                  </Button>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-lg flex-[2]" onClick={handleApprove}>
                    {assignDialog.status === "revision_gestor" ? "Aprobar y Enviar a Coordinación" : "Guardar Cambios Actualizados"}
                  </Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE JUSTIFICACIÓN DE RECHAZO */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" /> Confirmar Rechazo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-600 font-medium">¿Está seguro que desea rechazar la solicitud de traslado de <strong>{rejectDialog?.patient_name}</strong>? Esta acción cancelará el folio permanentemente.</p>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Justificación del Rechazo *</Label>
              <textarea 
                className="w-full min-h-[100px] p-3 text-sm border rounded-xl focus:ring-red-500 outline-none" 
                placeholder="Escriba el motivo del rechazo aquí..." 
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={handleReject}>Confirmar Rechazo Definitivo</Button>
          </DialogFooter>
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
  const [searchTerm, setSearchTerm] = useState("");
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

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input 
          placeholder="Buscar personal por nombre o tipo (ej. TENS)..." 
          className="pl-10 h-11 bg-white border-slate-200 shadow-sm rounded-xl focus:ring-teal-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
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
                {staff.filter(s => 
                  s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  s.role.toLowerCase().includes(searchTerm.toLowerCase())
                ).map(s => (
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
                {staff.length > 0 && staff.filter(s => 
                  s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  s.role.toLowerCase().includes(searchTerm.toLowerCase())
                ).length === 0 && (
                  <tr><td colSpan={4} className="text-center py-10 text-slate-400 font-medium">No se encontraron resultados para "{searchTerm}"</td></tr>
                )}
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
    patient_requirements: [], accompaniment: "",
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
      if (field === "staff_id") {
        if (value && value !== "none") {
          const s = clinicalStaffOptions.find(s => s.id === value);
          if (s) u[i].staff_name = s.name;
        } else {
          u[i].staff_id = "";
          u[i].staff_name = "";
        }
      }
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
      if (staffRows.some(r => !r.type)) { toast.error("Seleccione el tipo de personal para todo el personal añadido"); return; }
    } else {
      if (!form.origin || !form.destination || !form.task_details) { toast.error("Complete Origen, Destino y Cometido"); return; }
    }
    setLoading(true);
    try {
      await api.post("/trips", { ...form, trip_type: tripType, required_personnel: staffRows.map(r => `${r.type}: ${r.staff_name || "Por identificar"}`), assigned_clinical_staff: staffRows });
      toast.success("Traslado creado exitosamente");
      setForm({ origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "", scheduled_date: new Date().toISOString().split("T")[0], rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "", attending_physician: "", appointment_time: "", departure_time: "", patient_requirements: [], accompaniment: "", task_details: "", staff_count: "" });
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
            {staffRows.length > 0 && <div className="border rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Tipo</th><th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Nombre / Identificación</th><th className="p-2 w-10"></th></tr></thead><tbody>{staffRows.map((row, i) => (<tr key={i}><td className="p-2"><Select value={row.type} onValueChange={v => updateStaffRow(i, "type", v)}><SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent>{PERSONNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Select value={row.staff_id || "none"} onValueChange={v => updateStaffRow(i, "staff_id", v)} disabled={!row.type}><SelectTrigger className="h-9"><SelectValue placeholder="Opcional: Por identificar" /></SelectTrigger><SelectContent><SelectItem value="none">Por identificar luego...</SelectItem>{getStaffByType(row.type).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Button type="button" variant="ghost" size="icon" onClick={() => removeStaffRow(i)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button></td></tr>))}</tbody></table></div>}
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
