import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapPin, Map, ArrowRight, ShieldAlert, CheckCircle, Activity, CalendarDays, Truck, User, AlertTriangle, RefreshCw, Home, BedDouble, Clock, Search, Download, Filter, Users, Pencil, Trash2, Plus, Stethoscope, XCircle, ChevronLeft, ChevronRight, Eye, Siren, Upload, Car, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import api from "@/lib/api";
import BulkUploader from "@/components/BulkUploader";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import MapAddressSelector from "@/components/MapAddressSelector";

const PERSONNEL_TYPES = ["TENS", "Matrón(a)", "Enfermero(a)", "Kinesiólogo(a)", "Fonoaudiólogo(a)", "Médico", "Terapeuta Ocupacional"];
const REQUIREMENT_OPTIONS = ["Camilla", "Incubadora", "Silla de rueda", "Oxigeno", "Monitor", "Aislamiento Aéreo", "Aislamiento Contacto", "Aislamiento Protector", "Dependiente severo"];

const statusColorsSolid = {
  pendiente: "bg-amber-500 text-white shadow-amber-100",
  revision_gestor: "bg-purple-600 text-white shadow-purple-100",
  asignado: "bg-indigo-600 text-white shadow-indigo-100",
  en_curso: "bg-blue-600 text-white shadow-blue-100",
  completado: "bg-emerald-600 text-white shadow-emerald-100",
  cancelado: "bg-rose-600 text-white shadow-rose-100",
  devuelto: "bg-rose-600 text-white shadow-rose-100"
};

const statusHeaderStyles = {
  pendiente: { bg: "bg-amber-600", text: "text-white", iconBg: "bg-amber-700/40", iconText: "text-amber-100", badge: "bg-amber-800 text-white" },
  revision_gestor: { bg: "bg-purple-600", text: "text-white", iconBg: "bg-purple-700/40", iconText: "text-purple-100", badge: "bg-purple-800 text-white" },
  asignado: { bg: "bg-indigo-600", text: "text-white", iconBg: "bg-indigo-700/40", iconText: "text-indigo-100", badge: "bg-indigo-800 text-white" },
  en_curso: { bg: "bg-blue-600", text: "text-white", iconBg: "bg-blue-700/40", iconText: "text-blue-100", badge: "bg-blue-800 text-white" },
  completado: { bg: "bg-emerald-600", text: "text-white", iconBg: "bg-emerald-700/40", iconText: "text-emerald-100", badge: "bg-emerald-800 text-white" },
  cancelado: { bg: "bg-rose-600", text: "text-white", iconBg: "bg-rose-700/40", iconText: "text-rose-100", badge: "bg-rose-800 text-white" },
  devuelto: { bg: "bg-rose-600", text: "text-white", iconBg: "bg-rose-700/40", iconText: "text-rose-100", badge: "bg-rose-800 text-white" }
};

const formatScheduledDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const cleanDateStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = cleanDateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const year = date.getFullYear();
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      return `${day} ${months[date.getMonth()]} ${year}`;
    }
  } catch (e) {}
  return dateStr;
};

export default function GestionCamasDashboard() {
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.gestor_camas.section") || "dashboard";
  });

  useEffect(() => {
    localStorage.setItem("movilizacion.gestor_camas.section", section);
  }, [section]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "assign" && <AssignPersonnelSection />}
        {section === "new" && <GestorNewTripSection />}
        {section === "staff" && <ClinicalStaffMantenedor />}
        {section === "origins" && <OriginsMantenedor />}
        {section === "destinations" && <DestinationsMantenedor />}
        {section === "services" && <OriginServicesMantenedor />}
        {section === "calendar" && <ClinicalCalendarSection />}
        {section === "history" && <ClinicalHistorySection />}
        {section === "vehicles" && <VehiclesSection />}
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
  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [originServices, setOriginServices] = useState([]);
  const [filterStatus, setFilterStatus] = useState("revision_gestor");
  const [allActiveTrips, setAllActiveTrips] = useState([]);
  const [rejectDialog, setRejectDialog] = useState(null); // Contiene el viaje a rechazar
  const [rejectReason, setRejectReason] = useState("");
  const [showEditOriginMap, setShowEditOriginMap] = useState(false);
  const [showEditDestMap, setShowEditDestMap] = useState(false);

  const fetchTripsAndStaff = useCallback(async () => {
    try {
      const [revTrips, staffInfo, allActive, originsData, dests, services] = await Promise.all([
        api.get("/trips/gestion_revision"),
        api.get("/clinical-staff"),
        api.get("/trips/active"),
        api.get("/origins"),
        api.get("/destinations"),
        api.get("/origin-services")
      ]);
      
      setTrips(revTrips.data || []);
      setClinicalStaffOptions((staffInfo.data || []).filter(s => s.is_active));
      setOrigins((originsData.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      setDestinations((dests.data || []).sort((a, b) => a.name.localeCompare(b.name)));
      setOriginServices((services.data || []).filter(s => s.is_active !== false));
      
      // Filtrar solo clínicos para las estadísticas y el listado extendido
      const clinicos = (allActive.data || []).filter(t => t.trip_type === "clinico");
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
    if (!rejectReason.trim()) { 
      toast.error(`Debe ingresar una justificación para la ${rejectDialog?.status === "revision_gestor" ? "solicitud rechazada" : "cancelación"}`); 
      return; 
    }

    const isRevision = rejectDialog?.status === "revision_gestor";
    const targetStatus = isRevision ? "rechazado" : "cancelado";

    try {
      await api.put(`/trips/${rejectDialog.id}/status`, {
        status: targetStatus,
        cancel_reason: rejectReason
      });
      toast.success(isRevision ? "Solicitud rechazada correctamente" : "Traslado cancelado correctamente");
      setRejectDialog(null);
      setAssignDialog(null);
      setRejectReason("");
      fetchTripsAndStaff();
    } catch (e) { 
      toast.error(`Error al ${isRevision ? "rechazar" : "cancelar"} el traslado`); 
    }
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

  const handleEditOriginChange = (v) => {
    const matched = origins.find(o => o.name === v);
    const address = matched ? (matched.address || "") : "";
    const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
    setEditData({
      ...editData,
      origin: v,
      origin_address: address,
      origin_maps_url: mapsUrl
    });
  };

  const handleEditDestChange = (v) => {
    const matched = destinations.find(d => d.name === v);
    const address = matched ? (matched.address || "") : "";
    const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
    setEditData({
      ...editData,
      destination: v,
      destination_address: address,
      destination_maps_url: mapsUrl
    });
  };

  const displayedTrips = filterStatus === "revision_gestor" 
    ? trips 
    : allActiveTrips.filter(t => t.status === filterStatus);

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600" /></div>;

  const TripCard = ({ t, isPending }) => {
    const statusMap = {
      revision_gestor: { label: "Por Visar", color: "bg-purple-100 text-purple-800 border border-purple-200", border: "border-l-purple-500" },
      pendiente: { label: "Pendiente Despacho", color: "bg-amber-100 text-amber-800 border border-amber-200", border: "border-l-amber-500" },
      asignado: { label: "Asignado", color: "bg-indigo-100 text-indigo-800 border border-indigo-200", border: "border-l-indigo-500" },
      en_curso: { label: "En Curso", color: "bg-blue-100 text-blue-800 border border-blue-200", border: "border-l-blue-500" }
    };
    const config = statusMap[t.status] || { label: t.status, color: "bg-slate-100 text-slate-700", border: "border-l-slate-500" };

    return (
      <Card 
        onClick={() => {
          if (t.status === "revision_gestor" || t.status === "pendiente" || t.status === "asignado") {
            setAssignDialog(t);
            setStaffRows(t.assigned_clinical_staff || []);
            setPriority(t.priority || "normal");
            setEditData({ ...t });
          }
        }}
        className={`shadow-sm border-l-4 transition-all hover:shadow-md cursor-pointer hover:border-l-teal-500 hover:ring-1 hover:ring-teal-100 ${config.border}`}
      >
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-3">
            <div className="flex flex-col gap-1">
              <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm w-fit">#{t.tracking_number || t.id?.substring(0, 6)?.toUpperCase()}</span>
              <div className="flex items-center gap-1.5 text-slate-600 mt-1">
                <CalendarDays className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-xs font-semibold">{formatScheduledDate(t.scheduled_date) || "Hoy"}</span>
                <Clock className="w-3.5 h-3.5 ml-2 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">{t.appointment_time || "--:--"}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge className={`font-bold uppercase text-xs px-2.5 py-1 rounded-full border-none shadow-sm ${config.color}`}>{config.label}</Badge>
              <Badge className={`font-bold border-none text-xs uppercase px-2.5 py-1 rounded-full ${t.priority === "urgente" ? "bg-red-500 text-white font-bold" : t.priority === "alta" ? "bg-orange-500 text-white font-bold" : "bg-slate-100 text-slate-700 font-bold border border-slate-200"}`}>
                {t.priority.toUpperCase()}
              </Badge>
            </div>
          </div>
          <p className="font-black text-xl text-slate-900 mb-1 leading-tight">{t.patient_name || "Paciente no especificado"}</p>
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
                <Button onClick={(e) => {
                  e.stopPropagation();
                  setAssignDialog(t);
                  setStaffRows(t.assigned_clinical_staff || []);
                  setPriority(t.priority || "normal");
                  setEditData({ ...t });
                }}
                  className={`${t.status === "revision_gestor" ? "bg-teal-600 hover:bg-teal-700" : "bg-blue-600 hover:bg-blue-700"} text-white font-bold h-10 px-4 text-xs shadow-sm rounded-xl shrink-0`}>
                  {t.status === "revision_gestor" ? "Visar" : "Editar"}
                </Button>
             )}

          </div>
        </CardContent>
      </Card>
    );
  };

  const StatusCard = ({ id, label, count, color, activeColor }) => (
    <button 
      onClick={() => setFilterStatus(id)}
      className={`text-left p-4 rounded-2xl border-l-4 transition-all hover:scale-[1.01] shadow-sm flex-1
        ${filterStatus === id ? `${activeColor} ring-1 ring-slate-900/5` : "bg-white border-l-slate-200"}`}
      style={{ borderLeftColor: filterStatus === id ? color : undefined }}
    >
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
      <p className={`text-2xl font-black ${filterStatus === id ? "text-slate-900" : "text-slate-500"}`}>{count}</p>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Bandeja de Entrada</h1>
        <p className="text-slate-500 font-medium mt-1">Gestión centralizada de traslados clínicos.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        <StatusCard id="revision_gestor" label="En Revisión" count={stats.revision} color="#ef4444" activeColor="bg-red-50" />
        <StatusCard id="pendiente" label="Pendientes" count={stats.pendiente} color="#f59e0b" activeColor="bg-amber-50" />
        <StatusCard id="asignado" label="Asignados" count={stats.asignado} color="#0d9488" activeColor="bg-teal-50" />
        <StatusCard id="en_curso" label="En Curso" count={stats.en_curso} color="#3b82f6" activeColor="bg-blue-50" />
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

      {/* Desktop View: Table */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100/70 border-b border-slate-200/60 text-slate-600 font-bold uppercase text-[10px] tracking-[0.1em]">
              <tr>
                <th className="px-6 py-5">Folio / Prioridad</th>
                <th className="px-6 py-5">Paciente y Motivo</th>
                <th className="px-6 py-5 min-w-[200px]">Ruta / Servicio</th>
                <th className="px-6 py-5">Programación</th>
                <th className="px-6 py-5">Equipo / Detalles</th>
                <th className="px-6 py-5 text-center">Estado</th>
                <th className="px-6 py-5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedTrips.map(t => {
                const statusMap = {
                  revision_gestor: { label: "Por Visar", color: "bg-purple-100 text-purple-800 border border-purple-200", border: "border-l-purple-500" },
                  pendiente: { label: "Pendiente Despacho", color: "bg-amber-100 text-amber-700 border border-amber-200", border: "border-l-amber-500" },
                  asignado: { label: "Asignado", color: "bg-indigo-100 text-indigo-800 border border-indigo-200", border: "border-l-indigo-500" },
                  en_curso: { label: "En Curso", color: "bg-blue-100 text-blue-700 border border-blue-200", border: "border-l-blue-500" }
                };
                const config = statusMap[t.status] || { label: t.status, color: "bg-slate-100 text-slate-700", border: "border-l-slate-500" };

                return (
                  <tr 
                    key={t.id} 
                    onClick={() => {
                      if (t.status === "revision_gestor" || t.status === "pendiente" || t.status === "asignado") {
                        setAssignDialog(t);
                        setStaffRows(t.assigned_clinical_staff || []);
                        setPriority(t.priority || "normal");
                        setEditData({ ...t });
                      }
                    }}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm w-fit">
                          #{t.tracking_number || t.id?.substring(0, 6)?.toUpperCase()}
                        </span>
                        <Badge className={`font-bold border-none text-xs uppercase px-2.5 py-1 rounded-full w-fit ${t.priority === "urgente" ? "bg-red-500 text-white font-bold" : t.priority === "alta" ? "bg-orange-500 text-white font-bold" : "bg-slate-100 text-slate-700 font-bold border border-slate-200"}`}>
                          {t.priority.toUpperCase()}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm mb-1">{t.patient_name || "Paciente no especificado"}</p>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Motivo: {t.transfer_reason || "Sin especificar"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 text-xs text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-teal-600 shrink-0" /> <span className="truncate max-w-[180px]" title={t.origin}>{t.origin}</span> <span className="text-slate-400">({t.patient_unit || "-"})</span></div>
                        <div className="flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-blue-600 shrink-0" /> <span className="truncate max-w-[180px]" title={t.destination}>{t.destination}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs"><CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {formatScheduledDate(t.scheduled_date) || "Hoy"}</div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs"><Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {t.appointment_time || "--:--"}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {t.clinical_team ? (
                        <div className="bg-teal-50 px-2.5 py-1.5 rounded text-xs font-semibold text-teal-900 border border-teal-100">
                           <span className="font-bold uppercase text-[10px] text-teal-700 block mb-0.5">Equipo:</span>
                           {t.clinical_team}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">Sin personal extra</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge className={`font-bold uppercase text-xs px-2.5 py-1 rounded-full border-none shadow-sm ${config.color}`}>{config.label}</Badge>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {(t.status === "revision_gestor" || t.status === "pendiente" || t.status === "asignado") && (
                         <Button onClick={(e) => {
                           e.stopPropagation();
                           setAssignDialog(t);
                           setStaffRows(t.assigned_clinical_staff || []);
                           setPriority(t.priority || "normal");
                           setEditData({ ...t });
                         }}
                           className={`${t.status === "revision_gestor" ? "bg-teal-600 hover:bg-teal-700" : "bg-blue-600 hover:bg-blue-700"} text-white font-bold h-8 px-4 text-[11px] shadow-sm rounded-lg whitespace-nowrap`}>
                           {t.status === "revision_gestor" ? "Visar Traslado" : "Editar / Ver"}
                         </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet View: Cards */}
      <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        {displayedTrips.map(t => <TripCard key={t.id} t={t} isPending={t.status === "revision_gestor"} />)}
      </div>

      {/* Empty State */}
      {displayedTrips.length === 0 && (
        <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
          <p className="text-xl font-bold">Sin traslados en este estado.</p>
        </div>
      )}

      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0">
          {assignDialog && (
            <>
              <div className={`${statusHeaderStyles[assignDialog.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
                <div className="absolute top-6 right-14">
                  <Badge className={`${statusHeaderStyles[assignDialog.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                    {(assignDialog.status || "").replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 ${statusHeaderStyles[assignDialog.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                    <Pencil className={`w-8 h-8 ${statusHeaderStyles[assignDialog.status]?.iconText || "text-teal-400"}`} />
                  </div>
                  <div>
                    <p className={`${statusHeaderStyles[assignDialog.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                      Folio #{assignDialog.tracking_number || assignDialog.id?.substring(0, 6)?.toUpperCase()} — Panel de Gestión
                    </p>
                    <h2 className={`text-3xl font-black ${statusHeaderStyles[assignDialog.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                      {assignDialog.status === "revision_gestor" ? "Visar Traslado Clínico" : "Editar Traslado Clínico"}
                    </h2>
                  </div>
                </div>
              </div>
              <div className="p-8 pt-4 space-y-5">
              {/* SOLICITANTE E INGRESO */}
              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200 flex justify-between items-center">
                <div><p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Solicitado por</p><p className="font-bold text-purple-900">{assignDialog.requester_name || assignDialog.requester_person || "-"}</p></div>
                <div className="text-right"><p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Ingresado</p><p className="font-bold text-purple-900 text-sm">{assignDialog.created_at ? new Date(assignDialog.created_at).toLocaleString() : "-"}</p></div>
              </div>

              {/* DATOS PACIENTE EDITABLES */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-4 flex items-center gap-2"><User className="w-4 h-4" /> Datos del Paciente</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nombre Paciente</Label>
                    <Input className="h-10 text-base font-bold bg-white" value={editData.patient_name || ""} onChange={e => setEditData({ ...editData, patient_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">RUT</Label>
                    <Input className="h-10 text-base font-bold bg-white" value={editData.rut || ""} onChange={e => setEditData({ ...editData, rut: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Edad</Label>
                    <Input className="h-10 text-base font-bold bg-white" value={editData.age || ""} onChange={e => setEditData({ ...editData, age: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cama</Label>
                    <Input className="h-10 text-base font-bold bg-white" value={editData.bed || ""} onChange={e => setEditData({ ...editData, bed: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Diagnóstico</Label>
                    <Input className="h-10 text-base font-bold bg-white" value={editData.diagnosis || ""} onChange={e => setEditData({ ...editData, diagnosis: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Motivo Traslado</Label>
                    <Select value={editData.transfer_reason || "none"} onValueChange={v => setEditData({...editData, transfer_reason: v})}>
                      <SelectTrigger className="h-10 text-base font-bold bg-white">
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
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Médico Tratante</Label>
                    <Input className="h-10 text-base font-bold bg-white" value={editData.attending_physician || ""} onChange={e => setEditData({ ...editData, attending_physician: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-3 mt-3">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Requerimientos del Paciente</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      {REQUIREMENT_OPTIONS.map(opt => (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-5 h-5 accent-teal-600 rounded" 
                            checked={(editData.patient_requirements || []).includes(opt)}
                            onChange={() => handleRequirementChange(opt)}
                          />
                          <span className="text-sm font-bold text-slate-600 group-hover:text-teal-700 transition-colors">{opt}</span>
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
                    <Select value={editData.origin || "none"} onValueChange={handleEditOriginChange}>
                      <SelectTrigger className="h-9 text-sm font-bold bg-white">
                        <SelectValue placeholder="Seleccione origen" />
                      </SelectTrigger>
                      <SelectContent>
                        {origins.map(o => (
                          <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>
                        ))}
                        {editData.origin && editData.origin !== "none" && !origins.find(o => o.name === editData.origin) && <SelectItem value={editData.origin}>{editData.origin} (Personalizado)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Destino</Label>
                    <Select value={editData.destination || "none"} onValueChange={handleEditDestChange}>
                      <SelectTrigger className="h-9 text-sm font-bold bg-white">
                        <SelectValue placeholder="Seleccione destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {destinations.map(d => (
                          <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                        ))}
                        {editData.destination && editData.destination !== "none" && !destinations.find(d => d.name === editData.destination) && <SelectItem value={editData.destination}>{editData.destination} (Personalizado)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                   {/* Campos de Dirección y Maps Origen */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Dirección de Origen</Label>
                    <div className="flex gap-2">
                      <Input className="h-9 text-sm font-bold bg-white flex-1" placeholder="Dirección exacta o referencia" value={editData.origin_address || ""} onChange={e => setEditData({ ...editData, origin_address: e.target.value })} />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 shrink-0"
                        onClick={() => setShowEditOriginMap(true)}
                      >
                        <Map className="w-4 h-4 text-teal-600" />
                        <span className="hidden sm:inline text-[10px] font-bold uppercase">Mapa</span>
                      </Button>
                    </div>
                  </div>


                   {/* Campos de Dirección y Maps Destino */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Dirección de Destino</Label>
                    <div className="flex gap-2">
                      <Input className="h-9 text-sm font-bold bg-white flex-1" placeholder="Dirección exacta o referencia" value={editData.destination_address || ""} onChange={e => setEditData({ ...editData, destination_address: e.target.value })} />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 shrink-0"
                        onClick={() => setShowEditDestMap(true)}
                      >
                        <Map className="w-4 h-4 text-teal-600" />
                        <span className="hidden sm:inline text-[10px] font-bold uppercase">Mapa</span>
                      </Button>
                    </div>
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
                        {editData.patient_unit && editData.patient_unit !== "none" && !originServices.find(s => s.name === editData.patient_unit) && <SelectItem value={editData.patient_unit}>{editData.patient_unit} (Personalizado)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Hora Citación</Label>
                    <Input type="time" className="h-9 text-sm font-bold bg-white" value={editData.appointment_time || ""} onChange={e => setEditData({ ...editData, appointment_time: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Hora Salida</Label>
                    <Input type="time" className="h-9 text-sm font-bold bg-white" value={editData.departure_time || ""} onChange={e => setEditData({ ...editData, departure_time: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Fecha Programada</Label>
                    <Input type="date" className="h-9 text-sm font-bold bg-white" value={editData.scheduled_date ? editData.scheduled_date.split('T')[0] : ""} onChange={e => setEditData({ ...editData, scheduled_date: e.target.value })} />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase">Notas / Observaciones</Label>
                    <textarea className="w-full min-h-[60px] p-2 text-sm font-bold bg-white border rounded-md focus:ring-teal-500 outline-none" value={editData.notes || ""} onChange={e => setEditData({ ...editData, notes: e.target.value })} />
                  </div>
                  {editData.driver_notes && (
                    <div className="md:col-span-2 space-y-1 bg-amber-50/60 p-3 rounded-xl border border-amber-200 mt-2">
                      <Label className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Observaciones del Conductor</Label>
                      <p className="text-xs font-bold text-amber-900 whitespace-pre-line">{editData.driver_notes}</p>
                    </div>
                  )}
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
                  <Button variant="outline" className="h-12 font-bold min-w-[120px]" onClick={() => setAssignDialog(null)}>Cerrar</Button>
                  <Button variant="destructive" className="h-12 font-bold flex-1 gap-2 animate-pulse-once" onClick={() => setRejectDialog(assignDialog)}>
                    <XCircle className="w-5 h-5" /> 
                    {assignDialog.status === "revision_gestor" ? "Rechazar Solicitud" : "Cancelar Traslado"}
                  </Button>
                  <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-lg flex-[2]" onClick={handleApprove}>
                    {assignDialog.status === "revision_gestor" ? "Aprobar y Enviar a Coordinación" : "Guardar Cambios Actualizados"}
                  </Button>
                </DialogFooter>
              </div>

              <TripEvolutionLog tripId={assignDialog.id} />
            </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE JUSTIFICACIÓN DE RECHAZO O CANCELACIÓN */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-md bg-white rounded-3xl sm:rounded-3xl border-none shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className={`text-xl font-black flex items-center gap-2 uppercase tracking-tight ${
              rejectDialog?.status === "revision_gestor" ? "text-red-600" : "text-orange-600"
            }`}>
              <AlertTriangle className="w-6 h-6 shrink-0 animate-bounce" /> 
              {rejectDialog?.status === "revision_gestor" ? "Confirmar Rechazo" : "Confirmar Cancelación"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-600 font-bold leading-relaxed">
              {rejectDialog?.status === "revision_gestor" ? (
                <>¿Está seguro que desea rechazar la solicitud de traslado de <strong>{rejectDialog?.patient_name}</strong>? Esta acción anulará el folio permanentemente antes de ser visado.</>
              ) : (
                <>¿Está seguro que desea cancelar el traslado aprobado de <strong>{rejectDialog?.patient_name}</strong>? Se liberarán el conductor y vehículo si ya estaban asignados.</>
              )}
            </p>
            <div className="space-y-2">
              <Label className="font-bold text-slate-700 text-xs uppercase tracking-wider">
                {rejectDialog?.status === "revision_gestor" ? "Justificación del Rechazo *" : "Justificación de la Cancelación *"}
              </Label>
              <textarea 
                className="w-full min-h-[100px] p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-inner bg-slate-50/50" 
                placeholder={rejectDialog?.status === "revision_gestor" ? "Escriba el motivo del rechazo aquí..." : "Escriba el motivo de la cancelación aquí..."}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" className="rounded-xl h-11" onClick={() => setRejectDialog(null)}>Volver</Button>
            <Button 
              className={`text-white font-bold rounded-xl h-11 px-5 ${
                rejectDialog?.status === "revision_gestor" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"
              }`} 
              onClick={handleReject}
            >
              {rejectDialog?.status === "revision_gestor" ? "Confirmar Rechazo Definitivo" : "Confirmar Cancelación de Traslado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MapAddressSelector 
        open={showEditOriginMap}
        onClose={() => setShowEditOriginMap(false)}
        onSelect={({ address, mapsUrl }) => {
          setEditData(prev => ({
            ...prev,
            origin_address: address,
            origin_maps_url: mapsUrl
          }));
        }}
        title="Seleccionar Dirección de Origen (Edición)"
      />
      <MapAddressSelector 
        open={showEditDestMap}
        onClose={() => setShowEditDestMap(false)}
        onSelect={({ address, mapsUrl }) => {
          setEditData(prev => ({
            ...prev,
            destination_address: address,
            destination_maps_url: mapsUrl
          }));
        }}
        title="Seleccionar Dirección de Destino (Edición)"
      />
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
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ name: "", role: "", is_active: true });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/clinical-staff");
      setStaff(res.data || []);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-11 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-2" />Carga Masiva</Button>
          <Button onClick={openNew} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 flex gap-2">
            <Plus className="w-4 h-4" /> Agregar Personal
          </Button>
        </div>
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

      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Personal Clínico"
        columns={[
          { key: "nombre", label: "Nombre Completo", required: true },
          { key: "rol", label: "Cargo / Rol", required: true }
        ]}
        onImport={async (rows) => {
          const promises = rows.map(r => 
            api.post("/clinical-staff", { name: r.nombre, role: r.rol, is_active: true })
          );
          await Promise.all(promises);
          fetchStaff();
        }}
        exampleRows={[
          ["Ana María Rojas", "TENS"],
          ["Carlos Pérez", "Enfermero/a"],
          ["Dr. Juan Silva", "Médico"]
        ]}
      />
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
  const [draggedTripId, setDraggedTripId] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [detailTrip, setDetailTrip] = useState(null);

  const handleMoveTrip = async (tripId, targetDate) => {
    try {
      const tripToMove = trips.find(t => t.id === tripId);
      if (!tripToMove) return;

      await api.put(`/trips/${tripId}`, {
        ...tripToMove,
        scheduled_date: targetDate
      });

      toast.success(`Traslado re-programado para el ${targetDate}`);
      fetchCalendar();
    } catch (e) {
      toast.error("Error al re-programar el traslado");
    }
  };

  const formatLocalDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getDateRange = useCallback(() => {
    const d = new Date(currentDate);
    if (viewMode === "daily") {
      const ds = formatLocalDate(d);
      return { start: ds, end: ds };
    }
    if (viewMode === "weekly") {
      const day = d.getDay(); const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(d); mon.setDate(diff);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { start: formatLocalDate(mon), end: formatLocalDate(sun) };
    }
    // monthly
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { start: formatLocalDate(first), end: formatLocalDate(last) };
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

  const statusColors = { pendiente: "bg-amber-100 text-amber-800 border border-amber-200", revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200", asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200", en_curso: "bg-blue-100 text-blue-800 border border-blue-200", completado: "bg-emerald-100 text-emerald-800 border border-emerald-200", cancelado: "bg-rose-100 text-rose-800 border border-rose-200" };
  const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const getTitle = () => {
    if (viewMode === "daily") return currentDate.toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (viewMode === "weekly") { const { start, end } = getDateRange(); return `${start} — ${end}`; }
    return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const tripsByDate = (dateStr) => trips.filter(t => {
    const d = t.scheduled_date || t.created_at;
    return d && d.split("T")[0] === dateStr;
  });

  // Weekly helper: get array of 7 date strings
  const getWeekDates = () => {
    const { start } = getDateRange();
    const [y, m, d] = start.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return Array.from({ length: 7 }, (_, i) => { 
      const nd = new Date(dateObj); 
      nd.setDate(dateObj.getDate() + i); 
      return formatLocalDate(nd); 
    });
  };

  // Monthly helper: get grid of dates
  const getMonthGrid = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const startDay = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const grid = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(formatLocalDate(new Date(y, m, d)));
    return grid;
  };

  const TripCard = ({ t }) => (
    <div 
      draggable={true}
      onDragStart={() => setDraggedTripId(t.id)}
      onDragEnd={() => setDraggedTripId(null)}
      onClick={() => setDetailTrip(t)}
      className={`p-2 rounded-lg border-l-4 mb-1 text-xs transition-all duration-200 cursor-pointer ${
        statusColors[t.status] || "bg-slate-100 text-slate-800 border border-slate-200"
      } ${
        draggedTripId === t.id 
          ? "opacity-40 scale-95 cursor-grabbing" 
          : "cursor-grab active:cursor-grabbing hover:shadow-md hover:bg-slate-100/50"
      }`}
    >
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
          {viewMode === "daily" && (() => {
            const dailyTrips = tripsByDate(formatLocalDate(currentDate));
            return (
              <div className="space-y-3">
                {dailyTrips.length === 0 ? (
                  <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-200"><CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-lg font-bold text-slate-500">Sin traslados para este día</p></div>
                ) : dailyTrips.map(t => (
                  <Card key={t.id} onClick={() => setDetailTrip(t)} className="shadow-sm border-l-4 border-l-teal-500 cursor-pointer hover:shadow-md transition-shadow bg-white">
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
            );
          })()}

          {/* WEEKLY VIEW */}
          {viewMode === "weekly" && (
            <div className="grid grid-cols-7 gap-2">
              {getWeekDates().map((dateStr, i) => {
                const dayTrips = tripsByDate(dateStr);
                const isToday = dateStr === formatLocalDate(new Date());
                const isOver = dragOverDate === dateStr;
                return (
                  <div 
                    key={dateStr} 
                    onDragOver={(e) => { e.preventDefault(); if (dragOverDate !== dateStr) setDragOverDate(dateStr); }}
                    onDragLeave={() => { if (dragOverDate === dateStr) setDragOverDate(null); }}
                    onDrop={async (e) => { e.preventDefault(); setDragOverDate(null); if (draggedTripId) { await handleMoveTrip(draggedTripId, dateStr); } }}
                    className={`bg-white rounded-xl border p-2 min-h-[200px] transition-all duration-200 flex flex-col ${
                      isToday 
                        ? "border-teal-400 ring-2 ring-teal-100" 
                        : "border-slate-200"
                    } ${
                      isOver 
                        ? "bg-teal-50 border-teal-500 shadow-md ring-2 ring-teal-100 scale-[1.02]" 
                        : "shadow-sm"
                    }`}
                  >
                    <div className={`text-center mb-2 pb-1 border-b ${isToday ? "border-teal-200" : "border-slate-100"}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{dayNames[i]}</p>
                      <p className={`text-sm font-black ${isToday ? "text-teal-700" : "text-slate-700"}`}>{dateStr.split("-")[2]}</p>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[250px] custom-scrollbar flex-1">
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
                  const isToday = dateStr === formatLocalDate(new Date());
                  const counts = { pending: dayTrips.filter(t => ["pendiente", "revision_gestor"].includes(t.status)).length, active: dayTrips.filter(t => ["assigned", "en_curso"].includes(t.status)).length, done: dayTrips.filter(t => t.status === "completado").length };
                  return (
                    <div key={dateStr} onClick={() => { setCurrentDate(new Date(dateStr + "T12:00:00")); setViewMode("weekly"); }} className={`min-h-[80px] bg-white rounded-lg border p-1.5 cursor-pointer hover:shadow-md transition-all ${isToday ? "border-teal-400 ring-1 ring-teal-100" : "border-slate-100"}`}>
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

      {/* DIÁLOGO DE DETALLE DEL TRASLADO */}
      <Dialog open={!!detailTrip} onOpenChange={() => setDetailTrip(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
          {detailTrip && (
            <>
              <div className={`${statusHeaderStyles[detailTrip.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
                <div className="absolute top-6 right-14">
                  <Badge className={`${statusHeaderStyles[detailTrip.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                    {(detailTrip.status || "").replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 ${statusHeaderStyles[detailTrip.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                    <Activity className={`w-8 h-8 ${statusHeaderStyles[detailTrip.status]?.iconText || "text-teal-400"}`} />
                  </div>
                  <div>
                    <p className={`${statusHeaderStyles[detailTrip.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                      Folio #{detailTrip.tracking_number} — Consulta Informativa
                    </p>
                    <h2 className={`text-3xl font-black ${statusHeaderStyles[detailTrip.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                      Detalle del Traslado
                    </h2>
                  </div>
                </div>
              </div>
              <div className="p-8 pt-4 space-y-5">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-6 rounded-[2rem] shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Folio de Seguimiento</p>
                    <p className="text-2xl font-mono font-black text-slate-950">#{detailTrip.tracking_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Estado</p>
                    <Badge className={`font-black uppercase text-[10px] border-none tracking-widest px-3 py-1 rounded-full shadow-sm ${statusColorsSolid[detailTrip.status] || "bg-slate-100 text-slate-600"}`}>
                      {(detailTrip.status || "").replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <User className="w-4 h-4 text-teal-600" /> Información General
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Paciente:</span>
                      <p className="font-black text-slate-900 text-sm">{detailTrip.patient_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Motivo:</span>
                      <p className="font-black text-slate-800">{detailTrip.transfer_reason || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">RUT:</span>
                      <p className="font-black text-slate-800">{detailTrip.rut || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Cama / Unidad:</span>
                      <p className="font-black text-slate-800">{detailTrip.bed || "-"} ({detailTrip.patient_unit || "-"})</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Diagnóstico:</span>
                      <p className="font-black text-slate-800 leading-relaxed">{detailTrip.diagnosis || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <MapPin className="w-4 h-4 text-teal-600" /> Ruta y Tiempos
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Origen:</span>
                      <p className="font-black text-slate-800">{detailTrip.origin}</p>
                      {detailTrip.origin_address && (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{detailTrip.origin_address}</p>
                      )}
                      {(detailTrip.origin_maps_url || detailTrip.origin) && (
                        <a 
                          href={detailTrip.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailTrip.origin_address || detailTrip.origin)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Destino:</span>
                      <p className="font-black text-slate-800">{detailTrip.destination}</p>
                      {detailTrip.destination_address && (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{detailTrip.destination_address}</p>
                      )}
                      {(detailTrip.destination_maps_url || detailTrip.destination) && (
                        <a 
                          href={detailTrip.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailTrip.destination_address || detailTrip.destination)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Fecha Programada:</span>
                      <p className="font-black text-slate-800">{formatScheduledDate(detailTrip.scheduled_date)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Citación:</span>
                      <p className="font-black text-slate-800">{detailTrip.appointment_time || "--:--"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Salida:</span>
                      <p className="font-black text-slate-800">{detailTrip.departure_time || "--:--"}</p>
                    </div>
                  </div>
                </div>

                {(detailTrip.driver_name || detailTrip.vehicle_plate) && (
                  <div className="bg-gradient-to-r from-teal-50/50 to-emerald-50/50 p-5 rounded-2xl border border-teal-100/60 space-y-3 shadow-sm">
                    <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-teal-100/50 pb-1.5">
                      <Truck className="w-4 h-4 text-teal-600" /> Asignación de Transporte
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                      {detailTrip.driver_name && (
                        <div>
                          <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Conductor:</span>
                          <p className="font-black text-slate-900 text-sm">{detailTrip.driver_name}</p>
                        </div>
                      )}
                      {detailTrip.vehicle_plate && (
                        <div>
                          <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Vehículo / Patente:</span>
                          <p className="font-black text-teal-900 text-sm flex items-center gap-1">
                            <span className="bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-800 font-mono text-xs">{detailTrip.vehicle_plate}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}


                {detailTrip.clinical_team && (
                  <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-2">
                    <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest leading-none">Equipo Clínico Asignado</p>
                    <p className="text-xs font-black text-teal-900">{detailTrip.clinical_team}</p>
                  </div>
                )}

                {detailTrip.notes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Notas del Traslado</p>
                    <p className="text-xs font-bold text-slate-800 whitespace-pre-line">{detailTrip.notes}</p>
                  </div>
                )}

                {detailTrip.driver_notes && (
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none">Observaciones del Conductor</p>
                    <p className="text-xs font-bold text-amber-900 whitespace-pre-line">{detailTrip.driver_notes}</p>
                  </div>
                )}

                {/* EVOLUCIÓN CRONOLÓGICA DEL TRASLADO */}
                <TripEvolutionLog tripId={detailTrip.id} />

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setDetailTrip(null)} className="bg-teal-600 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all">Volver</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// SECCIÓN 5: HISTÓRICO Y REPORTES EXCEL (NUEVO)
// ==========================================
function ClinicalHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTrip, setDetailTrip] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortField, setSortField] = useState("scheduled_date");
  const [sortDirection, setSortDirection] = useState("desc");

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

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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

  const sortedHistory = [...filteredHistory].sort((a, b) => {
    let valA, valB;

    if (sortField === "scheduled_date") {
      valA = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
      valB = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
      return sortDirection === "asc" ? valA - valB : valB - valA;
    }

    if (sortField === "patient_name") {
      valA = a.patient_name || "";
      valB = b.patient_name || "";
    } else if (sortField === "origin") {
      valA = a.origin || "";
      valB = b.origin || "";
    } else if (sortField === "clinical_team") {
      valA = a.clinical_team || "";
      valB = b.clinical_team || "";
    } else if (sortField === "status") {
      valA = a.status || "";
      valB = b.status || "";
    } else {
      return 0;
    }

    const comp = valA.localeCompare(valB, "es", { sensitivity: "base" });
    return sortDirection === "asc" ? comp : -comp;
  });

  const handleExportExcel = () => {
    if (sortedHistory.length === 0) {
      toast.error("No hay datos para exportar con estos filtros.");
      return;
    }

    const headers = ["Folio", "Fecha Programada", "Paciente", "RUT", "Origen", "Destino", "Motivo", "Personal Acompañante", "Conductor", "Patente Vehiculo", "Estado"];

    const csvRows = sortedHistory.map(t => [
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

  const statusColors = { pendiente: "bg-amber-100 text-amber-800 border border-amber-200", revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200", asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200", en_curso: "bg-blue-100 text-blue-800 border border-blue-200", completado: "bg-emerald-100 text-emerald-800 border border-emerald-200", cancelado: "bg-rose-100 text-rose-800 border border-rose-200" };

  const renderSortHeader = (field, label, className = "", centered = false) => {
    const isActive = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)} 
        className={`px-6 py-5 text-[10px] font-bold uppercase tracking-[0.1em] cursor-pointer select-none hover:bg-slate-200/50 hover:text-slate-900 transition-all duration-200 group ${className} ${centered ? "text-center" : ""}`}
      >
        <div className={`flex items-center gap-1.5 ${centered ? "justify-center" : ""}`}>
          <span className="text-slate-500 group-hover:text-slate-800 transition-colors">{label}</span>
          {isActive ? (
            sortDirection === "asc" ? (
              <ArrowUp className="w-3.5 h-3.5 text-teal-600 transition-transform duration-200 shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-teal-600 transition-transform duration-200 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-40 group-hover:opacity-100 group-hover:text-slate-600 transition-all shrink-0" />
          )}
        </div>
      </th>
    );
  };

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
                <SelectItem value="revision_gestor">Por Visar</SelectItem>
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
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-[0.1em] sticky top-0 shadow-sm z-10">
                <tr>
                  {renderSortHeader("scheduled_date", "Folio / Fecha")}
                  {renderSortHeader("patient_name", "Paciente")}
                  {renderSortHeader("origin", "Ruta")}
                  {renderSortHeader("clinical_team", "Equipo Acompañante")}
                  {renderSortHeader("status", "Estado", "", true)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedHistory.map(t => (
                  <tr 
                    key={t.id} 
                    onClick={() => setDetailTrip(t)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="p-4 whitespace-nowrap">
                      <span className="bg-teal-50 text-teal-700 border border-teal-100/50 font-mono px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">#{t.tracking_number}</span>
                      <p className="text-xs text-slate-500 mt-1.5">{formatScheduledDate(t.scheduled_date)}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 text-sm">{t.patient_name || "Sin nombre"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">RUT: {t.rut || "-"}</p>
                    </td>
                    <td className="p-4 text-xs font-medium text-slate-600">
                      <div className="flex items-center gap-1 mb-1.5"><MapPin className="w-3 h-3 text-teal-500" /> {t.origin}</div>
                      <div className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-slate-400" /> {t.destination}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-100">
                        {t.clinical_team || "No asignado"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge className={`font-bold uppercase text-xs px-2.5 py-1 rounded-full border-none shadow-sm ${statusColors[t.status] || "bg-slate-100 text-slate-600"}`}>{(t.status || "").replace(/_/g, " ")}</Badge>
                    </td>
                  </tr>
                ))}
                {sortedHistory.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No se encontraron registros con los filtros actuales.</td></tr>}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 text-right">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-full">
          Mostrando {sortedHistory.length} registros
        </span>
      </div>

      {/* DIÁLOGO DE DETALLE DEL TRASLADO */}
      <Dialog open={!!detailTrip} onOpenChange={() => setDetailTrip(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
          {detailTrip && (
            <>
              <DialogHeader className="p-8 pb-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-100/50 rounded-2xl flex items-center justify-center shadow-sm">
                    <Activity className="w-6 h-6 text-teal-600 animate-pulse" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tight">Detalle del Traslado</DialogTitle>
                    <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                      Folio: <span className="text-teal-600 font-mono font-black">#{detailTrip.tracking_number}</span> — Consulta Informativa
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-8 pt-4 space-y-5">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-6 rounded-[2rem] shadow-sm">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Folio de Seguimiento</p>
                    <p className="text-2xl font-mono font-black text-slate-950">#{detailTrip.tracking_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Estado</p>
                    <Badge className={`font-black uppercase text-[10px] border-none tracking-widest px-3 py-1 rounded-full shadow-sm ${statusColors[detailTrip.status] || "bg-slate-100 text-slate-600"}`}>
                      {(detailTrip.status || "").replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <User className="w-4 h-4 text-teal-600" /> Información General
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Paciente:</span>
                      <p className="font-black text-slate-900 text-sm">{detailTrip.patient_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Motivo:</span>
                      <p className="font-black text-slate-800">{detailTrip.transfer_reason || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">RUT:</span>
                      <p className="font-black text-slate-800">{detailTrip.rut || "-"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Cama / Unidad:</span>
                      <p className="font-black text-slate-800">{detailTrip.bed || "-"} ({detailTrip.patient_unit || "-"})</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Diagnóstico:</span>
                      <p className="font-black text-slate-800 leading-relaxed">{detailTrip.diagnosis || "-"}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <MapPin className="w-4 h-4 text-teal-600" /> Ruta y Tiempos
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Origen:</span>
                      <p className="font-black text-slate-800">{detailTrip.origin}</p>
                      {detailTrip.origin_address && (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{detailTrip.origin_address}</p>
                      )}
                      {(detailTrip.origin_maps_url || detailTrip.origin) && (
                        <a 
                          href={detailTrip.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailTrip.origin_address || detailTrip.origin)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Destino:</span>
                      <p className="font-black text-slate-800">{detailTrip.destination}</p>
                      {detailTrip.destination_address && (
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">{detailTrip.destination_address}</p>
                      )}
                      {(detailTrip.destination_maps_url || detailTrip.destination) && (
                        <a 
                          href={detailTrip.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailTrip.destination_address || detailTrip.destination)}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                        >
                          <Map className="w-3 h-3" /> Ver en Google Maps
                        </a>
                      )}
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Fecha Programada:</span>
                      <p className="font-black text-slate-800">{formatScheduledDate(detailTrip.scheduled_date)}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Citación:</span>
                      <p className="font-black text-slate-800">{detailTrip.appointment_time || "--:--"}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Salida:</span>
                      <p className="font-black text-slate-800">{detailTrip.departure_time || "--:--"}</p>
                    </div>
                  </div>
                </div>

                {detailTrip.clinical_team && (
                  <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-2">
                    <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest leading-none">Equipo Clínico Asignado</p>
                    <p className="text-xs font-black text-teal-900">{detailTrip.clinical_team}</p>
                  </div>
                )}

                {detailTrip.notes && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Notas del Traslado</p>
                    <p className="text-xs font-bold text-slate-800 whitespace-pre-line">{detailTrip.notes}</p>
                  </div>
                )}

                {detailTrip.driver_notes && (
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none">Observaciones del Conductor</p>
                    <p className="text-xs font-bold text-amber-900 whitespace-pre-line">{detailTrip.driver_notes}</p>
                  </div>
                )}

                {/* EVOLUCIÓN CRONOLÓGICA DEL TRASLADO */}
                <TripEvolutionLog tripId={detailTrip.id} />

                <div className="flex justify-end pt-2">
                  <Button onClick={() => setDetailTrip(null)} className="bg-teal-600 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all">Volver</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==========================================
// SECCIÓN 6: MANTENEDOR DE SERVICIOS DE ORIGEN
// ==========================================
function OriginServicesMantenedor() {
  const [services, setServices] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({ name: "", is_active: true });
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    try { const r = await api.get("/origin-services"); setServices(r.data || []); } catch { } finally { setLoading(false); }
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-10 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-1" /> Carga Masiva</Button>
          <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-md"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr><th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Servicio</th><th className="p-4 text-center w-32">Acciones</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {services.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{s.name}</td>
                  <td className="p-4 text-center"><Button variant="ghost" size="icon" onClick={() => openEdit(s)} className="h-8 w-8 text-slate-500 hover:text-teal-600"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)} className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {services.length === 0 && !loading && <tr><td colSpan={2} className="text-center py-12 text-slate-400">No hay servicios registrados. Haga clic en "Agregar" para crear el primero.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingService ? "Editar Servicio" : "Nuevo Servicio"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nombre del Servicio *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Urgencias, UCI Adulto, Pabellón" /></div>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">{editingService ? "Guardar Cambios" : "Crear Servicio"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Servicios de Origen"
        columns={[{ key: "nombre", label: "Nombre del Servicio", required: true }]}
        onImport={async (rows) => {
          const promises = rows.map(r => 
            api.post("/origin-services", { name: r.nombre })
          );
          await Promise.all(promises);
          fetchServices();
        }}
        exampleRows={[["Urgencias"], ["UCI Adulto"], ["Pabellón"], ["Medicina Quirúrgica"]]}
      />
    </div>
  );
}

// ==========================================
// SECCIÓN 7: NUEVA SOLICITUD (GESTOR DE CAMAS)
// ==========================================
function GestorNewTripSection() {
  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [originServices, setOriginServices] = useState([]);
  const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
  const [tripType, setTripType] = useState("clinico");
  const [form, setForm] = useState({
    origin: "", origin_address: "", origin_maps_url: "",
    destination: "", destination_address: "", destination_maps_url: "",
    patient_name: "", patient_unit: "", priority: "normal", notes: "",
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
  const [showOriginMap, setShowOriginMap] = useState(false);
  const [showDestMap, setShowDestMap] = useState(false);

  const validateRut = (value) => {
    let clean = value.replace(/\./g, "").replace(/-/g, "").toUpperCase();
    if (clean.length < 2) return { valid: false, formatted: clean };
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
      setForm(prev => ({ ...prev, rut: "" }));
      setRutValid(true);
      return;
    }
    const { valid, formatted } = validateRut(val);
    setForm(prev => ({ ...prev, rut: formatted }));
    setRutValid(valid);
  };

  useEffect(() => {
    api.get("/origins").then(r => setOrigins((r.data || []).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => { });
    api.get("/destinations").then(r => setDestinations((r.data || []).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => { });
    api.get("/clinical-staff").then(r => setClinicalStaffOptions((r.data || []).filter(s => s.is_active))).catch(() => { });
    api.get("/origin-services").then(r => setOriginServices((r.data || []).filter(s => s.is_active !== false))).catch(() => { });
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

  const handleOriginChange = (val) => {
    if (val === "otro") {
      setUseCustomOrigin(true);
      setForm(prev => ({ ...prev, origin: "", origin_address: "", origin_maps_url: "" }));
    } else {
      const matched = origins.find(o => o.name === val);
      const address = matched ? (matched.address || "") : "";
      const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
      setForm(prev => ({ 
        ...prev, 
        origin: val, 
        origin_address: address,
        origin_maps_url: mapsUrl
      }));
    }
  };

  const handleDestChange = (val) => {
    if (val === "otro") {
      setUseCustomDest(true);
      setForm(prev => ({ ...prev, destination: "", destination_address: "", destination_maps_url: "" }));
    } else {
      const matched = destinations.find(d => d.name === val);
      const address = matched ? (matched.address || "") : "";
      const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
      setForm(prev => ({ 
        ...prev, 
        destination: val, 
        destination_address: address,
        destination_maps_url: mapsUrl
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (tripType === "clinico") {
      if (!form.patient_name || !form.origin || !form.destination) { toast.error("Complete campos obligatorios"); return; }
      if (!rutValid) { toast.error("El RUT ingresado no es válido"); return; }
      if (staffRows.length === 0 && form.transfer_reason !== "Alta") { toast.error("Añada al menos un personal clínico"); return; }
      if (staffRows.length > 0 && staffRows.some(r => !r.type)) { toast.error("Seleccione el tipo de personal para todo el personal añadido"); return; }
    } else {
      if (!form.origin || !form.destination || !form.task_details) { toast.error("Complete Origen, Destino y Cometido"); return; }
    }
    setLoading(true);
    try {
      await api.post("/trips", { ...form, trip_type: tripType, required_personnel: staffRows.map(r => `${r.type}: ${r.staff_name || "Por identificar"}`), assigned_clinical_staff: staffRows });
      toast.success("Traslado creado exitosamente");
      setForm({
        origin: "", origin_address: "", origin_maps_url: "",
        destination: "", destination_address: "", destination_maps_url: "",
        patient_name: "", patient_unit: "", priority: "normal", notes: "",
        scheduled_date: new Date().toISOString().split("T")[0],
        rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
        attending_physician: "", appointment_time: "", departure_time: "",
        patient_requirements: [], accompaniment: "",
        task_details: "", staff_count: ""
      });
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
            <div className="space-y-1"><Label>Origen *</Label>{!useCustomOrigin ? <Select value={form.origin || undefined} onValueChange={handleOriginChange}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{origins.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} onDoubleClick={() => setUseCustomOrigin(false)} />}</div>
            <div className="space-y-1"><Label>Destino *</Label>{!useCustomDest ? <Select value={form.destination || undefined} onValueChange={handleDestChange}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} onDoubleClick={() => setUseCustomDest(false)} />}</div>
            
            <div className="space-y-1">
              <Label className="text-slate-500 text-xs">Dirección de Origen</Label>
              <div className="flex gap-2">
                <Input placeholder="Dirección exacta o referencia" value={form.origin_address || ""} onChange={e => setForm({ ...form, origin_address: e.target.value })} className="flex-1" />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-3 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 shrink-0 h-9"
                  onClick={() => setShowOriginMap(true)}
                >
                  <Map className="w-4 h-4 text-teal-600" />
                  <span className="hidden sm:inline text-xs font-bold">Mapa</span>
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-500 text-xs">Dirección de Destino</Label>
              <div className="flex gap-2">
                <Input placeholder="Dirección exacta o referencia" value={form.destination_address || ""} onChange={e => setForm({ ...form, destination_address: e.target.value })} className="flex-1" />
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-3 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 shrink-0 h-9"
                  onClick={() => setShowDestMap(true)}
                >
                  <Map className="w-4 h-4 text-teal-600" />
                  <span className="hidden sm:inline text-xs font-bold">Mapa</span>
                </Button>
              </div>
            </div>


            {tripType === "clinico" && <>
              <div className="space-y-1"><Label>Servicio de Origen</Label>{!useCustomService ? <Select value={form.patient_unit || undefined} onValueChange={v => v === "otro" ? setUseCustomService(true) : setForm({ ...form, patient_unit: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{originServices.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input value={form.patient_unit || ""} onChange={e => setForm({ ...form, patient_unit: e.target.value })} onDoubleClick={() => setUseCustomService(false)} />}</div>
              <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })} /></div>
            </>}
            <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Hora Citación</Label><Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>Hora Salida</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} /></div>
          </div>
          {/* Personal clínico tabla */}
          {tripType === "clinico" && (<div className="space-y-3">
            <Label className="font-bold">Personal Clínico {form.transfer_reason !== "Alta" ? "*" : "(Opcional para Altas)"}</Label>
            {staffRows.length > 0 && <div className="border rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Tipo</th><th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Nombre / Identificación</th><th className="p-2 w-10"></th></tr></thead><tbody>{staffRows.map((row, i) => (<tr key={i}><td className="p-2"><Select value={row.type} onValueChange={v => updateStaffRow(i, "type", v)}><SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent>{PERSONNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Select value={row.staff_id || "none"} onValueChange={v => updateStaffRow(i, "staff_id", v)} disabled={!row.type}><SelectTrigger className="h-9"><SelectValue placeholder="Opcional: Por identificar" /></SelectTrigger><SelectContent><SelectItem value="none">Por identificar luego...</SelectItem>{getStaffByType(row.type).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Button type="button" variant="ghost" size="icon" onClick={() => removeStaffRow(i)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button></td></tr>))}</tbody></table></div>}
            <Button type="button" variant="outline" onClick={addStaffRow} className="border-teal-200 text-teal-700 h-9"><Plus className="w-4 h-4 mr-1" /> Añadir Personal</Button>
          </div>)}
          {/* Requerimientos */}
          {tripType === "clinico" && (<div className="space-y-2"><Label>Requerimientos Paciente</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">{requirementOptions.map(o => <label key={o} className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={form.patient_requirements.includes(o)} onChange={() => handleCheckbox("patient_requirements", o)} className="w-4 h-4 accent-teal-600" />{o}</label>)}</div></div>)}
          <div className="space-y-1"><Label>Notas</Label><textarea className="w-full min-h-[60px] p-3 rounded-md border text-sm" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-lg font-bold" disabled={loading}>{loading ? "Creando..." : "Crear Traslado"}</Button>
        </form>
      </CardContent></Card>
      <MapAddressSelector 
        open={showOriginMap}
        onClose={() => setShowOriginMap(false)}
        onSelect={({ address, mapsUrl }) => {
          setForm(prev => ({
            ...prev,
            origin_address: address,
            origin_maps_url: mapsUrl
          }));
        }}
        title="Seleccionar Dirección de Origen"
      />
      <MapAddressSelector 
        open={showDestMap}
        onClose={() => setShowDestMap(false)}
        onSelect={({ address, mapsUrl }) => {
          setForm(prev => ({
            ...prev,
            destination_address: address,
            destination_maps_url: mapsUrl
          }));
        }}
        title="Seleccionar Dirección de Destino"
      />
    </div>
  );
}

function VehiclesSection() {
    const { user } = useAuth();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const fetchVehicles = useCallback(async () => { 
        try { 
            const [vRes, tRes] = await Promise.all([
                api.get("/vehicles"),
                api.get("/trips/active")
            ]);
            const vehList = vRes.data || [];
            const activeTrips = tRes.data || [];
            
            // Map active trip details directly onto vehicle objects
            const mapped = vehList.map(veh => {
                const matchingTrip = activeTrips.find(t => t.vehicle_plate === veh.plate && t.status === "en_curso");
                if (matchingTrip) {
                    return {
                        ...veh,
                        current_driver: matchingTrip.driver_name,
                        current_destination: matchingTrip.destination,
                        current_clinical_team: matchingTrip.clinical_team,
                        current_trip: matchingTrip
                    };
                }
                return veh;
            });
            setVehicles(mapped); 
        } catch { } 
        finally { setLoading(false); } 
    }, []);
    
    useEffect(() => { 
        fetchVehicles(); 
        const interval = setInterval(fetchVehicles, 20000);
        return () => clearInterval(interval);
    }, [fetchVehicles]);

    const handleStatusToggle = async (v) => {
        const isInactive = v.status === "fuera_de_servicio" || v.status === "no_disponible";
        const newStatus = isInactive ? "disponible" : "fuera_de_servicio";
        try { 
            await api.put(`/vehicles/${v.id}/status`, { status: newStatus }); 
            toast.success(`Móvil ${v.plate} ${newStatus === "disponible" ? "habilitado" : "fuera de servicio"}`); 
            fetchVehicles(); 
        } catch (e) { toast.error("Error al actualizar estado"); }
    };

    const statusConfig = {
        disponible: { 
            bg: "bg-emerald-50", 
            border: "border-emerald-200", 
            text: "text-emerald-700", 
            badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
            label: "Disponible",
            icon: <CheckCircle className="w-4 h-4" />
        },
        fuera_de_servicio: { 
            bg: "bg-rose-50", 
            border: "border-rose-200", 
            text: "text-rose-700", 
            badge: "bg-rose-100 text-rose-800 border-rose-200",
            label: "Fuera de Servicio",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        no_disponible: { 
            bg: "bg-rose-50", 
            border: "border-rose-200", 
            text: "text-rose-700", 
            badge: "bg-rose-100 text-rose-800 border-rose-200",
            label: "Fuera de Servicio",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        en_mantenimiento: { 
            bg: "bg-amber-50", 
            border: "border-amber-200", 
            text: "text-amber-700", 
            badge: "bg-amber-100 text-amber-800 border-amber-200",
            label: "Mantenimiento",
            icon: <AlertTriangle className="w-4 h-4" />
        },
        en_curso: { 
            bg: "bg-blue-50/70", 
            border: "border-blue-300", 
            text: "text-blue-700", 
            badge: "bg-blue-100 text-blue-800 border-blue-200",
            label: "En Ruta",
            icon: <Activity className="w-4 h-4" />
        }
    };

    if (loading && vehicles.length === 0) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

    const ambulances = vehicles.filter(v => (v.type || "").toLowerCase() === "ambulancia");
    const supportVehicles = vehicles.filter(v => (v.type || "").toLowerCase() !== "ambulancia");

    const renderVehicleCard = (v) => {
        const cfg = statusConfig[v.status] || statusConfig.disponible;
        const isAmbulance = (v.type || "").toLowerCase() === "ambulancia";
        const isEnCurso = v.status === "en_curso";
        
        return (
            <Card 
                key={v.id} 
                onClick={() => {
                    if (isEnCurso && v.current_trip) {
                        setSelectedTrip(v.current_trip);
                    }
                }}
                className={`group overflow-hidden transition-all duration-300 border shadow-sm ${cfg.bg} ${cfg.border} hover:shadow-md ${isEnCurso ? "opacity-90 ring-1 ring-blue-300 shadow-blue-100/50 cursor-pointer hover:scale-[1.02]" : ""}`}
                style={isEnCurso ? {
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(239, 246, 255, 0.9), rgba(239, 246, 255, 0.9) 10px, rgba(219, 234, 254, 0.4) 10px, rgba(219, 234, 254, 0.4) 20px)'
                } : undefined}
            >
                <CardContent className="p-0">
                    <div className="p-2.5 flex items-center justify-between border-b border-inherit bg-white/40">
                        <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-sm border border-inherit`}>
                                {isAmbulance ? (
                                    <Siren className={`w-3.5 h-3.5 text-red-500 animate-pulse`} />
                                ) : (
                                    <Car className={`w-3.5 h-3.5 text-slate-500`} />
                                )}
                            </div>
                            <span className={`font-black text-sm tracking-tighter ${cfg.text}`}>{v.plate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {isAmbulance ? (
                                <Badge className="bg-red-500 text-white border-none font-black text-[7px] px-1 py-0.5 select-none tracking-tighter uppercase leading-none shadow-3xs">Ambulancia</Badge>
                            ) : (
                                <Badge className="bg-slate-500 text-white border-none font-black text-[7px] px-1 py-0.5 select-none tracking-tighter uppercase leading-none shadow-3xs">Apoyo</Badge>
                            )}
                            <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded ${cfg.badge} select-none leading-none border shadow-2xs`}>
                                {cfg.label}
                            </span>
                            <div className="relative flex h-1.5 w-1.5">
                                {isEnCurso && (
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                )}
                                <div className={`w-1.5 h-1.5 rounded-full ${v.status === 'disponible' ? 'bg-emerald-500' : isEnCurso ? 'bg-blue-500' : 'bg-rose-500'} shadow-sm`}></div>
                            </div>
                        </div>
                    </div>

                    <div className="p-2.5 space-y-2 min-h-[110px] flex flex-col justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[11px] font-black text-slate-700 uppercase truncate leading-tight">{v.brand} {v.model}</p>
                            <p className="text-[9px] font-bold text-slate-400 leading-none">{v.type}</p>
                        </div>

                        {isEnCurso ? (
                            <div className="bg-white/85 rounded-lg p-2 border border-blue-200/80 shadow-3xs">
                                <div className="flex items-center gap-1.5 mb-1 text-blue-700">
                                    <User className="w-2.5 h-2.5 shrink-0" />
                                    <p className="text-[9px] font-black uppercase truncate">{v.current_driver || "En traslado"}</p>
                                </div>
                                <div className="flex items-center gap-1.5 text-blue-600">
                                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                                    <p className="text-[9px] font-bold truncate">{v.current_destination || "Ruta"}</p>
                                </div>
                                {v.current_clinical_team && (
                                    <div className="flex items-center gap-1.5 text-purple-600 border-t border-blue-100/30 mt-1 pt-1">
                                        <Users className="w-2.5 h-2.5 shrink-0" />
                                        <p className="text-[8px] font-bold truncate italic leading-tight">{v.current_clinical_team}</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col justify-center h-[42px] text-center border border-dashed border-inherit rounded-lg opacity-40 bg-white/20">
                                <p className="text-[8px] font-black uppercase text-inherit tracking-tighter">En reserva</p>
                            </div>
                        )}

                        {user?.role !== "gestion_camas" && (
                            <div className="pt-1">
                                <Button 
                                    onClick={() => handleStatusToggle(v)}
                                    disabled={isEnCurso}
                                    variant="outline" 
                                    className={`w-full h-7 text-[8px] font-black uppercase tracking-tighter transition-all bg-white hover:bg-white/80 ${v.status === "fuera_de_servicio" || v.status === "no_disponible" ? "text-emerald-700 border-emerald-200" : "text-rose-700 border-rose-200"}`}
                                >
                                    {v.status === "fuera_de_servicio" || v.status === "no_disponible" ? "Habilitar" : "Fuera Serv."}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="animate-slide-up space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Control de Flota Operativa</h1>
                    <p className="text-slate-500 text-xs font-bold uppercase">Estado actual de todos los móviles del hospital.</p>
                </div>
                <div className="flex gap-2 self-start sm:self-center">
                    <Badge variant="outline" className="h-8 px-3 font-black border-red-200 bg-red-50 text-red-700 flex items-center gap-1.5 select-none">
                        <Siren className="w-3.5 h-3.5 text-red-500 animate-pulse" /> {ambulances.length} AMBULANCIAS
                    </Badge>
                    <Badge variant="outline" className="h-8 px-3 font-black border-slate-200 bg-white text-slate-700 flex items-center gap-1.5 select-none">
                        <Car className="w-3.5 h-3.5 text-slate-500" /> {supportVehicles.length} DE APOYO
                    </Badge>
                </div>
            </div>

            {/* SECCIÓN 1: AMBULANCIAS CLÍNICAS */}
            {ambulances.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-red-100 pb-2">
                        <Siren className="w-4 h-4 text-red-500 animate-pulse" />
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Ambulancias Clínicas ({ambulances.length})</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {ambulances.sort((a,b) => a.plate.localeCompare(b.plate)).map(renderVehicleCard)}
                    </div>
                </div>
            )}

            {/* SECCIÓN 2: VEHÍCULOS DE APOYO */}
            {supportVehicles.length > 0 && (
                <div className="space-y-3 pt-3">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                        <Car className="w-4 h-4 text-slate-500" />
                        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Vehículos de Apoyo y Administrativos ({supportVehicles.length})</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                        {supportVehicles.sort((a,b) => a.plate.localeCompare(b.plate)).map(renderVehicleCard)}
                    </div>
                </div>
            )}
            
            {vehicles.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Truck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest">No se encontraron vehículos registrados</p>
                </div>
            )}

            {/* DIÁLOGO DE DETALLE DEL TRASLADO ACTIVO */}
            <Dialog open={!!selectedTrip} onOpenChange={() => setSelectedTrip(null)}>
                <DialogContent className="max-w-2xl bg-white rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
                    {selectedTrip && (
                        <>
                            <div className={`${statusHeaderStyles[selectedTrip.status]?.bg || "bg-slate-900"} p-8 pb-10 relative transition-colors duration-300 rounded-t-[2rem]`}>
                                <div className="absolute top-6 right-14">
                                    <Badge className={`${statusHeaderStyles[selectedTrip.status]?.badge || "bg-slate-800 text-white"} border-none uppercase tracking-widest text-[10px] font-black shadow-lg`}>
                                        {(selectedTrip.status || "").replace(/_/g, " ")}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-5">
                                    <div className={`w-16 h-16 ${statusHeaderStyles[selectedTrip.status]?.iconBg || "bg-white/10"} rounded-2xl flex items-center justify-center border border-white/10`}>
                                        <Activity className={`w-8 h-8 ${statusHeaderStyles[selectedTrip.status]?.iconText || "text-teal-400"}`} />
                                    </div>
                                    <div>
                                        <p className={`${statusHeaderStyles[selectedTrip.status]?.iconText || "text-teal-400"} text-[10px] uppercase tracking-[0.2em] font-black mb-1`}>
                                            Folio #{selectedTrip.tracking_number} — Consulta Informativa
                                        </p>
                                        <h2 className={`text-3xl font-black ${statusHeaderStyles[selectedTrip.status]?.text || "text-white"} leading-tight uppercase tracking-tight`}>
                                            Detalle del Traslado Activo
                                        </h2>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 pt-4 space-y-5 text-sm">
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-6 rounded-[2rem] shadow-sm">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Folio de Seguimiento</p>
                                        <p className="text-2xl font-mono font-black text-slate-950">#{selectedTrip.tracking_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.15em] mb-1">Estado</p>
                                        <Badge className={`font-black uppercase text-[10px] border-none tracking-widest px-3 py-1 rounded-full shadow-sm ${statusColorsSolid[selectedTrip.status] || "bg-slate-100 text-slate-600"}`}>
                                            {(selectedTrip.status || "").replace(/_/g, " ")}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                        <User className="w-4 h-4 text-teal-600" /> Información General
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                        <div className="col-span-2 md:col-span-1">
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Paciente:</span>
                                            <p className="font-black text-slate-900 text-sm">{selectedTrip.patient_name || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Motivo:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.transfer_reason || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">RUT:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.rut || "-"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Cama / Unidad:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.bed || "-"} ({selectedTrip.patient_unit || "-"})</p>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Diagnóstico:</span>
                                            <p className="font-black text-slate-800 leading-relaxed">{selectedTrip.diagnosis || "-"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                                        <MapPin className="w-4 h-4 text-teal-600" /> Ruta y Tiempos
                                    </p>
                                    <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Origen:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.origin}</p>
                                            {selectedTrip.origin_address && (
                                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{selectedTrip.origin_address}</p>
                                            )}
                                            {(selectedTrip.origin_maps_url || selectedTrip.origin) && (
                                                <a 
                                                    href={selectedTrip.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.origin_address || selectedTrip.origin)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 hover:underline mt-1 bg-teal-50 px-2 py-0.5 rounded border border-teal-200"
                                                >
                                                    <Map className="w-3 h-3" /> Ver en Google Maps
                                                </a>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Destino:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.destination}</p>
                                            {selectedTrip.destination_address && (
                                                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{selectedTrip.destination_address}</p>
                                            )}
                                            {(selectedTrip.destination_maps_url || selectedTrip.destination) && (
                                                <a 
                                                    href={selectedTrip.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTrip.destination_address || selectedTrip.destination)}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded border border-blue-200"
                                                >
                                                    <Map className="w-3 h-3" /> Ver en Google Maps
                                                </a>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Fecha Programada:</span>
                                            <p className="font-black text-slate-800">{formatScheduledDate(selectedTrip.scheduled_date)}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Citación:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.appointment_time || "--:--"}</p>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Hora Salida:</span>
                                            <p className="font-black text-slate-800">{selectedTrip.departure_time || "--:--"}</p>
                                        </div>
                                    </div>
                                </div>

                                {(selectedTrip.driver_name || selectedTrip.vehicle_plate) && (
                                    <div className="bg-gradient-to-r from-teal-50/50 to-emerald-50/50 p-5 rounded-2xl border border-teal-100/60 space-y-3 shadow-sm">
                                        <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-teal-100/50 pb-1.5">
                                            <Truck className="w-4 h-4 text-teal-600" /> Asignación de Transporte
                                        </p>
                                        <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                                            {selectedTrip.driver_name && (
                                                <div>
                                                    <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Conductor:</span>
                                                    <p className="font-black text-slate-900 text-sm">{selectedTrip.driver_name}</p>
                                                </div>
                                            )}
                                            {selectedTrip.vehicle_plate && (
                                                <div>
                                                    <span className="text-teal-600/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Vehículo / Patente:</span>
                                                    <p className="font-black text-teal-900 text-sm flex items-center gap-1">
                                                        <span className="bg-white px-2 py-0.5 rounded border border-teal-200 text-teal-800 font-mono text-xs">{selectedTrip.vehicle_plate}</span>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}


                                {selectedTrip.clinical_team && (
                                    <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100 space-y-2">
                                        <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest leading-none">Equipo Clínico Asignado</p>
                                        <p className="text-xs font-black text-teal-900">{selectedTrip.clinical_team}</p>
                                    </div>
                                )}

                                {selectedTrip.notes && (
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Notas del Traslado</p>
                                        <p className="text-xs font-bold text-slate-800 whitespace-pre-line">{selectedTrip.notes}</p>
                                    </div>
                                )}

                                {selectedTrip.driver_notes && (
                                    <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-1">
                                        <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest leading-none">Observaciones del Conductor</p>
                                        <p className="text-xs font-bold text-amber-900 whitespace-pre-line">{selectedTrip.driver_notes}</p>
                                    </div>
                                )}

                                {/* EVOLUCIÓN CRONOLÓGICA DEL TRASLADO */}
                                <TripEvolutionLog tripId={selectedTrip.id} />

                                <div className="flex justify-end pt-2">
                                    <Button onClick={() => setSelectedTrip(null)} className="bg-teal-600 text-white rounded-2xl px-8 h-12 font-black uppercase tracking-widest shadow-md hover:bg-teal-700 transition-all">Volver</Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ==========================================
// SECCIÓN 8: MANTENEDOR DE ORÍGENES (GESTOR DE CAMAS)
// ==========================================
function OriginsMantenedor() {
  const [origins, setOrigins] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingOrigin, setEditingOrigin] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", is_active: true });
  const [loading, setLoading] = useState(true);

  const fetchOrigins = useCallback(async () => {
    try { const r = await api.get("/origins"); setOrigins(r.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchOrigins(); }, [fetchOrigins]);

  const openCreate = () => { setEditingOrigin(null); setFormData({ name: "", address: "", is_active: true }); setIsDialogOpen(true); };
  const openEdit = (o) => { setEditingOrigin(o); setFormData({ name: o.name, address: o.address || "", is_active: o.is_active !== false }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Ingrese un nombre"); return; }
    try {
      if (editingOrigin) { await api.put(`/origins/${editingOrigin.id}`, formData); toast.success("Origen actualizado"); }
      else { await api.post("/origins", formData); toast.success("Origen creado"); }
      setIsDialogOpen(false); fetchOrigins();
    } catch { toast.error("Error al guardar"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este origen?")) return;
    try { await api.delete(`/origins/${id}`); toast.success("Origen eliminado"); fetchOrigins(); } catch { toast.error("Error"); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-black text-slate-900">Mantenedor de Orígenes</h1><p className="text-sm text-slate-500 mt-1">Administre las ubicaciones físicas de origen predefinidas para los traslados.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-10 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-1" /> Carga Masiva</Button>
          <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-md"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Origen</th>
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
                <th className="p-4 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {origins.map(o => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{o.name}</td>
                  <td className="p-4 text-slate-600 font-medium">{o.address || "-"}</td>
                  <td className="p-4 text-center"><Button variant="ghost" size="icon" onClick={() => openEdit(o)} className="h-8 w-8 text-slate-500 hover:text-teal-600"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(o.id)} className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {origins.length === 0 && !loading && <tr><td colSpan={3} className="text-center py-12 text-slate-400">No hay orígenes registrados. Haga clic en "Agregar" para crear el primero.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingOrigin ? "Editar Origen" : "Nuevo Origen"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nombre del Origen *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Hospital Central, Bodega Central" /></div>
            <div className="space-y-2"><Label>Dirección del Origen</Label><Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ej. Av. Principal 123" /></div>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">{editingOrigin ? "Guardar Cambios" : "Crear Origen"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Orígenes"
        columns={[
          { key: "nombre", label: "Nombre del Origen", required: true },
          { key: "direccion", label: "Dirección del Origen" }
        ]}
        onImport={async (rows) => {
          const promises = rows.map(r => 
            api.post("/origins", { name: r.nombre, address: r.direccion || "" })
          );
          await Promise.all(promises);
          fetchOrigins();
        }}
        exampleRows={[["Hospital Central", "Av. Principal 123"], ["Bodega Central", "Sector Industrial 45"]]}
      />
    </div>
  );
}

// ==========================================
// SECCIÓN 9: MANTENEDOR DE DESTINOS (GESTOR DE CAMAS)
// ==========================================
function DestinationsMantenedor() {
  const [destinations, setDestinations] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editingDest, setEditingDest] = useState(null);
  const [formData, setFormData] = useState({ name: "", address: "", is_active: true });
  const [loading, setLoading] = useState(true);

  const fetchDestinations = useCallback(async () => {
    try { const r = await api.get("/destinations"); setDestinations(r.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchDestinations(); }, [fetchDestinations]);

  const openCreate = () => { setEditingDest(null); setFormData({ name: "", address: "", is_active: true }); setIsDialogOpen(true); };
  const openEdit = (d) => { setEditingDest(d); setFormData({ name: d.name, address: d.address || "", is_active: d.is_active !== false }); setIsDialogOpen(true); };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Ingrese un nombre"); return; }
    try {
      if (editingDest) { await api.put(`/destinations/${editingDest.id}`, formData); toast.success("Destino actualizado"); }
      else { await api.post("/destinations", formData); toast.success("Destino creado"); }
      setIsDialogOpen(false); fetchDestinations();
    } catch { toast.error("Error al guardar"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este destino?")) return;
    try { await api.delete(`/destinations/${id}`); toast.success("Destino eliminado"); fetchDestinations(); } catch { toast.error("Error"); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-black text-slate-900">Mantenedor de Destinos</h1><p className="text-sm text-slate-500 mt-1">Administre las ubicaciones físicas de destino predefinidas para los traslados.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="font-bold h-10 border-teal-200 text-teal-700 hover:bg-teal-50"><Upload className="w-4 h-4 mr-1" /> Carga Masiva</Button>
          <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-md"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
        </div>
      </div>
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Destino</th>
                <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección</th>
                <th className="p-4 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {destinations.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-4 font-bold text-slate-900">{d.name}</td>
                  <td className="p-4 text-slate-600 font-medium">{d.address || "-"}</td>
                  <td className="p-4 text-center"><Button variant="ghost" size="icon" onClick={() => openEdit(d)} className="h-8 w-8 text-slate-500 hover:text-teal-600"><Pencil className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} className="h-8 w-8 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button></td>
                </tr>
              ))}
              {destinations.length === 0 && !loading && <tr><td colSpan={3} className="text-center py-12 text-slate-400">No hay destinos registrados. Haga clic en "Agregar" para crear el primero.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingDest ? "Editar Destino" : "Nuevo Destino"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2"><Label>Nombre del Destino *</Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Clínica Las Condes, Laboratorio Central" /></div>
            <div className="space-y-2"><Label>Dirección del Destino</Label><Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Ej. Av. Las Condes 763" /></div>
          </div>
          <DialogFooter className="mt-6"><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 text-white font-bold">{editingDest ? "Guardar Cambios" : "Crear Destino"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkUploader
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        title="Carga Masiva de Destinos"
        columns={[
          { key: "nombre", label: "Nombre del Destino", required: true },
          { key: "direccion", label: "Dirección del Destino" }
        ]}
        onImport={async (rows) => {
          const promises = rows.map(r => 
            api.post("/destinations", { name: r.nombre, address: r.direccion || "" })
          );
          await Promise.all(promises);
          fetchDestinations();
        }}
        exampleRows={[["Clínica Las Condes", "Av. Las Condes 763"], ["Laboratorio Central", "Av. Providencia 1234"]]}
      />
    </div>
  );
}

