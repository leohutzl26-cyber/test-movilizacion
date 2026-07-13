import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MapPin, Map, ArrowRight, CalendarDays, Clock, BedDouble, Activity, Plus, Users, Trash2, AlertTriangle, XCircle, Pencil, Stethoscope, User, Truck } from "lucide-react";
import TripEvolutionLog from "@/components/TripEvolutionLog";
import MapAddressSelector from "@/components/MapAddressSelector";
import { formatScheduledDate, PERSONNEL_TYPES, REQUIREMENT_OPTIONS, statusHeaderStyles } from "@/lib/tripUtils";

const renderClinicalTeam = (t) => {
  if (t.assigned_clinical_staff && t.assigned_clinical_staff.length > 0) {
    const staffList = t.assigned_clinical_staff.map(s => s.staff_name || s.type).filter(Boolean);
    if (staffList.length > 0) {
      return (
        <div className="bg-teal-50 px-2.5 py-1.5 rounded text-xs font-semibold text-teal-900 border border-teal-100 flex flex-col gap-0.5">
          <span className="font-bold uppercase text-[10px] text-teal-700 block mb-0.5">Personal Asignado:</span>
          {t.assigned_clinical_staff.map((s, idx) => (
            <div key={idx} className="flex justify-between items-center gap-2">
              <span className="truncate max-w-[120px]">{s.staff_name || "Pendiente"}</span>
              <span className="text-[8px] uppercase bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold shrink-0">{s.type}</span>
            </div>
          ))}
        </div>
      );
    }
  }

  if (t.required_personnel && t.required_personnel.length > 0) {
    return (
      <div className="bg-amber-50 px-2.5 py-1.5 rounded text-xs font-semibold text-amber-900 border border-amber-100 flex flex-col gap-0.5">
        <span className="font-bold uppercase text-[10px] text-amber-700 block mb-0.5">Personal Requerido:</span>
        <div className="flex flex-wrap gap-1 mt-0.5">
          {t.required_personnel.map((p, idx) => (
            <span key={idx} className="text-[8px] uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">{p}</span>
          ))}
        </div>
      </div>
    );
  }

  if (t.clinical_team) {
    return (
      <div className="bg-teal-50 px-2.5 py-1.5 rounded text-xs font-semibold text-teal-900 border border-teal-100">
        <span className="font-bold uppercase text-[10px] text-teal-700 block mb-0.5">Equipo:</span>
        {t.clinical_team}
      </div>
    );
  }

  return <span className="text-xs text-slate-400 italic font-medium">Sin personal extra</span>;
};

export default function AssignPersonnelSection() {
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
      const clinicalTeamString = staffRows
        .map(s => s.staff_name ? `${s.staff_name} (${s.type})` : s.type)
        .filter(Boolean)
        .join(", ");

      const payload = {
        ...editData,
        priority: priority,
        assigned_clinical_staff: staffRows,
        clinical_team: clinicalTeamString || null
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
    const targetStatus = "cancelado";

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
              <Badge className={`font-black border-none text-xs uppercase px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm ${t.priority === "urgente" ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.45)] border border-red-400 animate-pulse" : t.priority === "alta" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_8px_rgba(249,115,22,0.45)] border border-orange-400" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                {t.priority === "urgente" && "🚨"}
                {t.priority === "alta" && "⚠️"}
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

          {t.driver_name && (
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/50 mb-3 text-xs flex items-center gap-2">
              <Truck className="w-4 h-4 text-teal-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">Conductor / Móvil</p>
                <p className="font-bold text-slate-800 uppercase truncate leading-tight">{t.driver_name}</p>
                {t.vehicle_plate && <p className="text-[8px] font-bold text-teal-600 font-mono leading-none mt-0.5">{t.vehicle_plate}</p>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
             <div className="flex-1">
                {renderClinicalTeam(t)}
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
                <th className="px-6 py-5">Conductor / Móvil</th>
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
                        <Badge className={`font-black border-none text-[10px] uppercase px-2.5 py-1 rounded-full w-fit flex items-center gap-1 shadow-sm ${t.priority === "urgente" ? "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.45)] border border-red-400 animate-pulse" : t.priority === "alta" ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-[0_0_8px_rgba(249,115,22,0.45)] border border-orange-400" : "bg-slate-100 text-slate-700 border border-slate-200"}`}>
                          {t.priority === "urgente" && "🚨"}
                          {t.priority === "alta" && "⚠️"}
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
                      {renderClinicalTeam(t)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {t.driver_name ? (
                        <div className="flex flex-col gap-0.5 text-xs text-slate-800 font-semibold">
                          <span className="font-black text-slate-900 uppercase truncate max-w-[150px]" title={t.driver_name}>{t.driver_name}</span>
                          {t.vehicle_plate && <span className="text-[10px] font-bold text-teal-600 font-mono">Patente: {t.vehicle_plate}</span>}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-medium">No asignado</span>
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
        initialAddress={editData?.origin_address}
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
        initialAddress={editData?.destination_address}
      />
    </div>
  );
}
