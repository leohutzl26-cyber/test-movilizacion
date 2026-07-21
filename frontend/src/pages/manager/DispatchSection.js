import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, ArrowRight, ShieldAlert, Activity, Truck, User, AlertTriangle, RefreshCw, ClipboardList, Ambulance, Plus, Trash2, XCircle, Clock, RotateCcw, Edit, Search, ArrowUpDown, ExternalLink, MessageSquare, CheckCircle2, PlusCircle, UserPlus, FileText, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import TripDetailDialog from "./TripDetailDialog";
import {
  PERSONNEL_TYPES as personnelTypes,
  REQUIREMENT_OPTIONS as requirementOptions,
  REASON_OPTIONS as reasonOptions,
  ACCOMPANIMENT_OPTIONS as accompanimentOptions,
  statusColorsSolid,
  statusBorders as statusBorderColors,
  VEHICLE_ICONS,
  formatScheduledDate
} from "@/lib/tripUtils";

const ACTIVITY_MAPPINGS = {
  create_trip: {
    title: "Traslado Creado",
    bg: "bg-blue-50/70 border-blue-100",
    iconColor: "text-blue-600",
    Icon: PlusCircle
  },
  cambiar_estado_pendiente: {
    title: "Traslado Visado",
    bg: "bg-purple-50/70 border-purple-100",
    iconColor: "text-purple-600",
    Icon: CheckCircle2
  },
  cambiar_estado_en_curso: {
    title: "Viaje Iniciado",
    bg: "bg-amber-50/70 border-amber-100",
    iconColor: "text-amber-600",
    Icon: Ambulance
  },
  cambiar_estado_completado: {
    title: "Viaje Finalizado",
    bg: "bg-emerald-50/70 border-emerald-100",
    iconColor: "text-emerald-600",
    Icon: CheckCircle2
  },
  cambiar_estado_cancelado: {
    title: "Viaje Cancelado",
    bg: "bg-red-50/70 border-red-100",
    iconColor: "text-red-600",
    Icon: XCircle
  },
  desasignar_conductor: {
    title: "Conductor Quitado",
    bg: "bg-slate-50 border-slate-200",
    iconColor: "text-slate-500",
    Icon: UserPlus
  },
  asignar_conductor: {
    title: "Conductor Asignado",
    bg: "bg-indigo-50/70 border-indigo-100",
    iconColor: "text-indigo-600",
    Icon: UserPlus
  },
  auto_assign: {
    title: "Auto-Asignación",
    bg: "bg-indigo-50/70 border-indigo-100",
    iconColor: "text-indigo-600",
    Icon: UserPlus
  },
  auto_asignar: {
    title: "Auto-Asignación",
    bg: "bg-indigo-50/70 border-indigo-100",
    iconColor: "text-indigo-600",
    Icon: UserPlus
  },
  guardar_observaciones_conductor: {
    title: "Bitácora / Nota",
    bg: "bg-teal-50/70 border-teal-100",
    iconColor: "text-teal-600",
    Icon: MessageSquare
  },
  editar_traslado: {
    title: "Traslado Editado",
    bg: "bg-slate-50 border-slate-100",
    iconColor: "text-slate-600",
    Icon: Edit
  }
};

const formatActivityLog = (log) => {
  let actionName = log.action;
  let entityType = log.entity_type || "";

  // 1. Detección y traducción de operaciones crudas de BD (INSERT, UPDATE, DELETE)
  if (["INSERT", "UPDATE", "DELETE"].includes(actionName)) {
    if (entityType === "trips") {
      if (actionName === "INSERT") {
        actionName = "create_trip";
      } else if (actionName === "DELETE") {
        actionName = "eliminar_traslado";
      } else if (actionName === "UPDATE") {
        const oldStatus = log.old_values?.status;
        const newStatus = log.new_values?.status;
        
        if (oldStatus !== newStatus && newStatus) {
          actionName = `cambiar_estado_${newStatus}`;
        } else if (log.old_values?.driver_id !== log.new_values?.driver_id) {
          actionName = log.new_values?.driver_id ? "asignar_conductor" : "desasignar_conductor";
        } else if (log.old_values?.driver_notes !== log.new_values?.driver_notes) {
          actionName = "guardar_observaciones_conductor";
        } else {
          actionName = "editar_traslado";
        }
      }
    } else if (entityType === "profiles") {
      actionName = actionName === "INSERT" ? "usuario_registrado" : actionName === "UPDATE" ? "usuario_modificado" : "usuario_eliminado";
    } else if (entityType === "vehicles") {
      actionName = actionName === "INSERT" ? "vehiculo_registrado" : actionName === "UPDATE" ? "vehiculo_modificado" : "vehiculo_eliminado";
    } else if (["origins", "destinations"].includes(entityType)) {
      actionName = actionName === "INSERT" ? "catalogo_agregado" : actionName === "UPDATE" ? "catalogo_modificado" : "catalogo_eliminado";
    }
  } else if (actionName.includes("catalog")) {
    actionName = "catalogo_modificado";
  }

  // Mapear el resultado final a su estilo visual
  const mapping = ACTIVITY_MAPPINGS[actionName] || {
    title: actionName.replace(/_/g, " "),
    bg: "bg-slate-50 border-slate-100",
    iconColor: "text-slate-500",
    Icon: FileText
  };

  // Mapeo extra para acciones no listadas en ACTIVITY_MAPPINGS originalmente
  const EXTRA_MAPPINGS = {
    eliminar_traslado: {
      title: "Traslado Eliminado",
      bg: "bg-red-50/70 border-red-100",
      iconColor: "text-red-600",
      Icon: Trash2
    },
    usuario_registrado: {
      title: "Nuevo Usuario",
      bg: "bg-blue-50/70 border-blue-100",
      iconColor: "text-blue-600",
      Icon: UserPlus
    },
    usuario_modificado: {
      title: "Usuario Modificado",
      bg: "bg-slate-50 border-slate-100",
      iconColor: "text-slate-600",
      Icon: Edit
    },
    usuario_eliminado: {
      title: "Usuario Eliminado",
      bg: "bg-red-50/70 border-red-100",
      iconColor: "text-red-600",
      Icon: Trash2
    },
    vehiculo_registrado: {
      title: "Móvil Registrado",
      bg: "bg-blue-50/70 border-blue-100",
      iconColor: "text-blue-600",
      Icon: Truck
    },
    vehiculo_modificado: {
      title: "Móvil Modificado",
      bg: "bg-slate-50 border-slate-100",
      iconColor: "text-slate-600",
      Icon: Edit
    },
    vehiculo_eliminado: {
      title: "Móvil Eliminado",
      bg: "bg-red-50/70 border-red-100",
      iconColor: "text-red-600",
      Icon: Trash2
    },
    catalogo_agregado: {
      title: "Punto Agregado",
      bg: "bg-blue-50/70 border-blue-100",
      iconColor: "text-blue-600",
      Icon: MapPin
    },
    catalogo_modificado: {
      title: "Catálogo Modificado",
      bg: "bg-slate-50 border-slate-100",
      iconColor: "text-slate-600",
      Icon: Edit
    },
    catalogo_eliminado: {
      title: "Punto Eliminado",
      bg: "bg-red-50/70 border-red-100",
      iconColor: "text-red-600",
      Icon: Trash2
    }
  };

  const finalMapping = { ...mapping, ...(EXTRA_MAPPINGS[actionName] || {}) };

  let description = "";
  if (actionName === "create_trip") {
    description = `Paciente/Detalle: ${log.new_values?.patient_name || log.new_values?.task_details || "-"}`;
  } else if (actionName === "guardar_observaciones_conductor") {
    description = log.new_values?.driver_notes || "Añadió notas al traslado";
  } else if (actionName === "asignar_conductor" || actionName === "auto_asignar") {
    description = `Conductor: ${log.new_values?.driver_name || "Asignado"}`;
  } else if (actionName === "desasignar_conductor") {
    description = "Se quitó la asignación del conductor";
  } else if (actionName === "editar_traslado") {
    description = `Campos modificados en el traslado`;
  } else if (actionName.startsWith("cambiar_estado_")) {
    const estado = actionName.replace("cambiar_estado_", "");
    description = `Traslado cambió a estado ${estado === "en_curso" ? "en curso" : estado}`;
  } else if (entityType === "profiles") {
    description = `Usuario: ${log.new_values?.name || log.old_values?.name || "-"} (${(log.new_values?.role || log.old_values?.role || "").replace(/_/g, " ")})`;
  } else if (entityType === "vehicles") {
    description = `Móvil: ${log.new_values?.brand || log.old_values?.brand || ""} - Patente: ${log.new_values?.plate || log.old_values?.plate || "-"}`;
  } else if (["origins", "destinations"].includes(entityType)) {
    description = `Punto: ${log.new_values?.name || log.old_values?.name || "-"}`;
  } else {
    description = `Folio #${log.new_values?.tracking_number || log.old_values?.tracking_number || "-"}`;
  }

  return { ...finalMapping, description };
};

export default function DispatchSection() {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pendiente");
  const [stats, setStats] = useState({ pendiente: 0, asignado: 0, en_curso: 0, completado: 0 });
  const [drivers, setDrivers] = useState([]);
  const [assignDialog, setAssignDialog] = useState(null);
  const [driverSearch, setDriverSearch] = useState("");
  const [detailTrip, setDetailTrip] = useState(null);
  const [cancelDialog, setCancelDialog] = useState(null);
  const [returnDialog, setReturnDialog] = useState(null);
  const [editDialog, setEditDialog] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Estados de filtro por categoría y búsqueda
  const [activeCategory, setActiveCategory] = useState("todos"); // "todos" | "clinicos" | "no_clinicos" | "actividad"
  const [searchQuery, setSearchQuery] = useState("");

  // Estados de ordenamiento multi-criterio
  const [sortPrimary, setSortPrimary] = useState("scheduled_date");
  const [sortPrimaryDir, setSortPrimaryDir] = useState("desc");
  const [sortSecondary, setSortSecondary] = useState("appointment_time");
  const [sortSecondaryDir, setSortSecondaryDir] = useState("asc");

  // Opciones para la edición
  const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [originServices, setOriginServices] = useState([]);

  // Estados para controlar el modal de edición
  const [editForm, setEditForm] = useState(null);
  const [editStaffRows, setEditStaffRows] = useState([]);
  const [editRequirements, setEditRequirements] = useState([]);
  const [showEditOriginMap, setShowEditOriginMap] = useState(false);
  const [showEditDestMap, setShowEditDestMap] = useState(false);

  // Carga de opciones al montar
  useEffect(() => {
    api.get("/clinical-staff").then((r) => setClinicalStaffOptions((r.data || []).filter((s) => s.is_active))).catch(() => {});
    api.get("/origins").then((r) => setOrigins((r.data || []).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
    api.get("/destinations").then((r) => setDestinations((r.data || []).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
    api.get("/origin-services").then((r) => setOriginServices((r.data || []).filter((s) => s.is_active !== false))).catch(() => {});
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'trips')
        .order('timestamp', { ascending: false })
        .limit(20);
      if (!error && data) {
        setActivityLogs(data);
      }
    } catch (e) {
      console.error("Error cargando logs de actividad:", e);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    fetchActivityLogs();

    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          if (payload.new && payload.new.entity_type === 'trips') {
            setActivityLogs((prev) => [payload.new, ...prev.slice(0, 19)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActivityLogs]);

  // Sincronizar estados locales de edición cuando se abre el modal
  useEffect(() => {
    if (editDialog) {
      setEditForm({
        origin: editDialog.origin || "",
        origin_address: editDialog.origin_address || "",
        origin_maps_url: editDialog.origin_maps_url || "",
        destination: editDialog.destination || "",
        destination_address: editDialog.destination_address || "",
        destination_maps_url: editDialog.destination_maps_url || "",
        patient_name: editDialog.patient_name || "",
        task_details: editDialog.task_details || "",
        scheduled_date: editDialog.scheduled_date ? editDialog.scheduled_date.split('T')[0] : "",
        appointment_time: editDialog.appointment_time || "",
        departure_time: editDialog.departure_time || "",
        priority: editDialog.priority || "normal",
        notes: editDialog.notes || "",
        accompaniment: editDialog.accompaniment || "",
        bed: editDialog.bed || "",
        patient_unit: editDialog.patient_unit || "",
        rut: editDialog.rut || "",
        age: editDialog.age || "",
        diagnosis: editDialog.diagnosis || "",
        weight: editDialog.weight || "",
        transfer_reason: editDialog.transfer_reason || "",
        staff_count: editDialog.staff_count || ""
      });
      setEditStaffRows(editDialog.assigned_clinical_staff || []);
      setEditRequirements(editDialog.patient_requirements || []);
    } else {
      setEditForm(null);
      setEditStaffRows([]);
      setEditRequirements([]);
    }
  }, [editDialog]);

  // Manejadores para edición
  const handleEditFormChange = (field, val) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: val } : null));
  };

  const addEditStaffRow = () => {
    setEditStaffRows((prev) => [...prev, { type: "", staff_id: "", staff_name: "" }]);
  };

  const removeEditStaffRow = (index) => {
    setEditStaffRows((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEditStaffRow = (index, field, value) => {
    setEditStaffRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "type") {
        updated[index].staff_id = "";
        updated[index].staff_name = "";
      }
      if (field === "staff_id") {
        if (value && value !== "none") {
          const staff = clinicalStaffOptions.find((s) => s.id === value);
          if (staff) updated[index].staff_name = staff.name;
        } else {
          updated[index].staff_id = "";
          updated[index].staff_name = "";
        }
      }
      return updated;
    });
  };

  const handleEditCheckboxChange = (val) => {
    setEditRequirements((prev) => {
      if (prev.includes(val)) return prev.filter((i) => i !== val);
      return [...prev, val];
    });
  };

  const getEditStaffByType = (type) => {
    if (!type) return clinicalStaffOptions;
    const target = type.toLowerCase();
    const matched = clinicalStaffOptions.filter(s => {
      const roleStr = (s.role || s.department || "").toLowerCase();
      return roleStr.includes(target) || target.includes(roleStr);
    });
    return matched.length > 0 ? matched : clinicalStaffOptions;
  };

  const fetchTrips = useCallback(async () => {
    try {
      const [activeRes, statsRes, driversRes] = await Promise.all([
        api.get("/trips/active"),
        api.get("/stats/dashboard"),
        api.get("/drivers")
      ]);
      const activeTrips = activeRes.data || [];
      setTrips(activeTrips);
      setDrivers(driversRes.data || []);

      setStats({
        pendiente: activeTrips.filter((t) => t.status === "pendiente").length,
        asignado: activeTrips.filter((t) => t.status === "asignado").length,
        en_curso: activeTrips.filter((t) => t.status === "en_curso").length,
        completado: statsRes.data?.by_status?.completado || 0
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
    const interval = setInterval(fetchTrips, 15000);
    return () => clearInterval(interval);
  }, [fetchTrips]);

  const handleAssign = async (tripId, driverId) => {
    try {
      await api.put(`/trips/${tripId}/manager-assign`, { driver_id: driverId });
      toast.success("Viaje asignado exitosamente");
      setAssignDialog(null);
      fetchTrips();
    } catch (e) {
      toast.error("Error al asignar");
    }
  };

  const handleCancel = async (e) => {
    e.preventDefault();
    const reason = e.target.reason.value;
    if (!reason) {
      toast.error("Debe indicar una justificación");
      return;
    }
    try {
      await api.put(`/trips/${cancelDialog.id}/status`, { status: "cancelado", cancel_reason: reason });
      toast.success("Traslado cancelado");
      setCancelDialog(null);
      fetchTrips();
    } catch (e) {
      toast.error("Error al cancelar");
    }
  };

  const handleReturnToManager = async () => {
    try {
      await api.put(`/trips/${returnDialog.id}/status`, { status: "revision_gestor" });
      toast.success("Traslado devuelto al gestor de camas");
      setReturnDialog(null);
      fetchTrips();
    } catch (e) {
      toast.error("Error al devolver traslado");
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm("¿Seguro que deseas ELIMINAR PERMANENTEMENTE este viaje de la base de datos?")) return;
    try {
      await api.delete(`/trips/${tripId}`);
      toast.success("Viaje eliminado permanentemente");
      fetchTrips();
    } catch (e) {
      toast.error("Error al eliminar el viaje");
    }
  };

  const handleUnassign = async (tripId) => {
    if (!window.confirm("¿Deseas desasignar el conductor de este traslado? Volverá a estado pendiente.")) return;
    try {
      await api.put(`/trips/${tripId}/unassign`);
      toast.success("Traslado desasignado correctamente");
      fetchTrips();
    } catch (e) {
      toast.error("Error al desasignar traslado");
    }
  };

  const handleEditSubmission = async (e) => {
    e.preventDefault();
    if (!editForm) return;

    if (editDialog.trip_type === "clinico") {
      if (!editForm.patient_name) {
        toast.error("Nombre del paciente requerido");
        return;
      }
      if (!editForm.patient_unit) {
        toast.error("Servicio solicitante requerido");
        return;
      }
      if (!editForm.transfer_reason) {
        toast.error("Motivo de traslado requerido");
        return;
      }
      if (!editForm.origin) {
        toast.error("Origen requerido");
        return;
      }
      if (!editForm.destination) {
        toast.error("Destino requerido");
        return;
      }

      if (editStaffRows.length === 0 && editForm.transfer_reason !== "Alta") {
        toast.error("Debe añadir al menos un personal clínico para traslados clínicos");
        return;
      }
      if (editStaffRows.length > 0 && editStaffRows.some((r) => !r.type)) {
        toast.error("Seleccione el tipo de personal para todas las filas");
        return;
      }
      if (editRequirements.length === 0) {
        toast.error("Seleccione al menos un requerimiento de paciente");
        return;
      }
    } else {
      if (!editForm.origin) {
        toast.error("Origen requerido");
        return;
      }
      if (!editForm.destination) {
        toast.error("Destino requerido");
        return;
      }
      if (!editForm.task_details) {
        toast.error("Cometido requerido");
        return;
      }
    }

    try {
      const submitData = {
        ...editForm,
        assigned_clinical_staff: editStaffRows,
        required_personnel: editStaffRows.map((r) => `${r.type}: ${r.staff_name || "Por identificar"}`),
        patient_requirements: editRequirements
      };

      await api.put(`/trips/${editDialog.id}`, submitData);
      toast.success("Traslado actualizado correctamente");
      setEditDialog(null);
      fetchTrips();
    } catch (e) {
      toast.error("Error al actualizar el traslado");
    }
  };

  const filteredTrips = trips.filter((t) => t.status === filterStatus);

  const getPriorityWeight = (p) => {
    if (!p) return 0;
    const clean = p.toLowerCase();
    if (clean === "urgente") return 3;
    if (clean === "alta") return 2;
    return 1;
  };

  const compareTripsBy = (a, b, field, direction) => {
    let valA, valB;
    if (field === "priority") {
      valA = getPriorityWeight(a.priority);
      valB = getPriorityWeight(b.priority);
    } else if (field === "appointment_time") {
      const timeA = a.appointment_time || "";
      const timeB = b.appointment_time || "";
      if (timeA === "" && timeB !== "") return 1;
      if (timeA !== "" && timeB === "") return -1;
      if (timeA === "" && timeB === "") return 0;
      valA = timeA;
      valB = timeB;
    } else if (field === "scheduled_date") {
      valA = a.scheduled_date || "";
      valB = b.scheduled_date || "";
    } else if (field === "origin") {
      valA = (a.origin || "").toLowerCase();
      valB = (b.origin || "").toLowerCase();
    } else if (field === "destination") {
      valA = (a.destination || "").toLowerCase();
      valB = (b.destination || "").toLowerCase();
    } else if (field === "tracking_number") {
      valA = a.tracking_number || "";
      valB = b.tracking_number || "";
    } else {
      return 0;
    }

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  };

  const sortedTrips = [...filteredTrips].sort((a, b) => {
    const primaryRes = compareTripsBy(a, b, sortPrimary, sortPrimaryDir);
    if (primaryRes !== 0) return primaryRes;
    if (sortSecondary && sortSecondary !== "none" && sortSecondary !== sortPrimary) {
      return compareTripsBy(a, b, sortSecondary, sortSecondaryDir);
    }
    return 0;
  });

  const clinicalTrips = sortedTrips.filter((t) => t.trip_type === "clinico");
  const nonClinicalTrips = sortedTrips.filter((t) => t.trip_type !== "clinico");

  const displayedTrips = sortedTrips.filter((t) => {
    if (activeCategory === "clinicos") return t.trip_type === "clinico";
    if (activeCategory === "no_clinicos") return t.trip_type !== "clinico";
    return true;
  }).filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.patient_name || "").toLowerCase().includes(q) ||
      (t.task_details || "").toLowerCase().includes(q) ||
      (t.origin || "").toLowerCase().includes(q) ||
      (t.destination || "").toLowerCase().includes(q) ||
      (t.tracking_number || "").toString().includes(q) ||
      (t.driver_name || "").toLowerCase().includes(q)
    );
  });

  if (loading) return <div className="flex justify-center py-20 text-teal-600"><RefreshCw className="w-10 h-10 animate-spin" /></div>;

  const StatusCard = ({ id, label, count, color, activeColor }) => (
    <button
      onClick={() => setFilterStatus(id)}
      className={`flex-1 text-left p-4 rounded-2xl border-l-4 transition-all hover:scale-[1.01] shadow-xs 
        ${filterStatus === id ? `${activeColor} ring-1 ring-slate-900/5` : "bg-white border-l-slate-200"}`}
      style={{ borderLeftColor: filterStatus === id ? color : undefined }}
    >
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className={`text-2xl font-black ${filterStatus === id ? "text-slate-900" : "text-slate-500"}`}>{count}</p>
    </button>
  );

  const renderTripCard = (t) => (
    <Card key={t.id} className={`group border border-slate-200/90 shadow-xs hover:shadow-md hover:border-teal-400 transition-all duration-200 bg-white rounded-2xl border-l-4 ${statusBorderColors[t.status] || "border-l-slate-400"}`}>
      <CardContent className="p-3.5 space-y-2.5">
        {/* Cabecera: Folio, Prioridad, Estado, Fecha y Hora */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="bg-teal-50 text-teal-700 border border-teal-200 font-mono px-2 py-0.5 rounded-md text-xs font-black cursor-pointer hover:bg-teal-100 transition-colors"
              onClick={() => setDetailTrip(t)}
            >
              #{t.tracking_number}
            </span>
            <Badge className={`text-[10px] font-black px-2 py-0.5 uppercase rounded-md border-none ${t.priority === "urgente" ? "bg-red-500 text-white animate-pulse" : t.priority === "alta" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"}`}>
              {t.priority === "urgente" && "🚨 "}
              {t.priority === "alta" && "⚠️ "}
              {t.priority}
            </Badge>
            <Badge className={`text-[10px] font-black px-2 py-0.5 uppercase rounded-md border-none ${statusColorsSolid[t.status] || "bg-slate-500 text-white"}`}>
              {(t.status || "").replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <span>{formatScheduledDate(t.scheduled_date) || "Hoy"}</span>
            {t.appointment_time && (
              <span className="bg-amber-50 text-amber-900 border border-amber-200 font-mono text-xs font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                {t.appointment_time}
              </span>
            )}
          </div>
        </div>

        {/* Título y Categoría */}
        <div className="cursor-pointer space-y-0.5" onClick={() => setDetailTrip(t)}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-black text-slate-900 group-hover:text-teal-600 transition-colors leading-tight">
              {t.trip_type === "clinico" ? t.patient_name : t.task_details}
            </h3>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${t.trip_type === "clinico" ? "text-teal-700 bg-teal-50 border border-teal-200" : "text-indigo-700 bg-indigo-50 border border-indigo-200"}`}>
              {t.trip_type === "clinico" ? "Clínico" : "No Clínico"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{t.transfer_reason || "General"}</span>
            {t.trip_type === "no_clinico" && t.staff_count && (
              <span className="text-[11px] font-bold text-indigo-700">
                • 👤 {t.staff_count} {parseInt(t.staff_count) === 1 ? "Funcionario" : "Funcionarios"}
              </span>
            )}
          </div>
        </div>

        {/* Ruta Compacta (Origen -> Destino) */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs font-semibold text-slate-800 space-y-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-black shrink-0">A</span>
            <span className="font-extrabold uppercase truncate">{t.origin}</span>
            {t.origin_address && <span className="text-[11px] text-slate-400 font-normal truncate hidden sm:inline">({t.origin_address})</span>}
          </div>
          <div className="flex items-center gap-2 min-w-0 border-t border-slate-200/60 pt-1">
            <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-[10px] font-black shrink-0">B</span>
            <span className="font-extrabold uppercase truncate">{t.destination}</span>
            {t.destination_address && <span className="text-[11px] text-slate-400 font-normal truncate hidden sm:inline">({t.destination_address})</span>}
          </div>
        </div>

        {/* Móvil & Conductor */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100 text-xs font-bold">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${t.driver_name ? "bg-teal-100 text-teal-700" : "bg-amber-100 text-amber-700"}`}>
              {t.vehicle_type ? VEHICLE_ICONS[t.vehicle_type] : <User className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase block leading-none">Móvil & Conductor</span>
              <span className="text-xs font-black text-slate-900 truncate uppercase block mt-0.5">
                {t.driver_name ? t.driver_name : "Pendiente de Asignación"}
              </span>
            </div>
          </div>
          {t.vehicle_plate && (
            <Badge className="bg-teal-50 text-teal-800 border border-teal-200 font-mono font-black text-xs px-2 py-0.5 shrink-0">
              {t.vehicle_plate}
            </Badge>
          )}
        </div>

        {/* Acciones */}
        <div className="pt-0.5 flex items-center gap-1.5">
          {["pendiente", "asignado"].includes(t.status) && (
            <>
              <Button onClick={() => setAssignDialog(t)} className="flex-1 h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold uppercase rounded-lg flex items-center justify-center gap-1.5 shadow-xs">
                <Truck className="w-3.5 h-3.5" />
                {t.driver_id ? "Reasignar" : "Asignar Conductor"}
              </Button>

              {t.driver_id && t.status === "asignado" && (
                <Button onClick={() => handleUnassign(t.id)} variant="outline" className="h-8 px-2.5 text-xs font-bold uppercase text-amber-600 border-amber-200 hover:bg-amber-50 rounded-lg" title="Desasignar Conductor">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}

              <Button onClick={() => setEditDialog(t)} variant="outline" className="h-8 px-2.5 text-xs font-bold uppercase text-slate-700 border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1" title="Editar Traslado">
                <Edit className="w-3.5 h-3.5" />
                <span>Editar</span>
              </Button>

              <Button onClick={() => setReturnDialog(t)} variant="outline" className="h-8 px-2.5 text-xs font-bold uppercase text-slate-600 border-slate-200 hover:bg-slate-100 rounded-lg flex items-center gap-1" title="Devolver al Gestor de Camas">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Devolver</span>
              </Button>

              <Button onClick={() => setCancelDialog(t)} variant="outline" className="h-8 w-8 p-0 text-rose-600 border-rose-200 hover:bg-rose-50 rounded-lg flex items-center justify-center" title="Cancelar Traslado">
                <XCircle className="w-3.5 h-3.5" />
              </Button>

              {user?.role === 'admin' && (
                <Button onClick={() => handleDeleteTrip(t.id)} variant="outline" className="h-8 w-8 p-0 text-red-700 border-red-300 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center" title="Eliminar Permanentemente">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </>
          )}
          {t.status === "en_curso" && <Badge className="w-full justify-center bg-blue-100 text-blue-700 border-none font-black text-xs uppercase py-1.5 rounded-lg">En Ruta</Badge>}
          {t.status === "completado" && <Badge className="w-full justify-center bg-emerald-100 text-emerald-700 border-none font-black text-xs uppercase py-1.5 rounded-lg">Finalizado</Badge>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="animate-slide-up space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bandeja de Entrada</h1>
          <p className="text-slate-500 font-bold text-xs">Gestión de Despacho en Tiempo Real.</p>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* KPI Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatusCard id="pendiente" label="Por Despachar" count={stats.pendiente} color="#f59e0b" activeColor="bg-amber-50" />
        <StatusCard id="asignado" label="Con Conductor" count={stats.asignado} color="#0d9488" activeColor="bg-teal-50" />
        <StatusCard id="en_curso" label="En Tránsito" count={stats.en_curso} color="#3b82f6" activeColor="bg-blue-50" />
        <StatusCard id="completado" label="Finalizados" count={stats.completado} color="#10b981" activeColor="bg-emerald-50" />
      </div>

      {/* Barra de Pestañas de Categoría y Controles */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => setActiveCategory("todos")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 shrink-0 ${
              activeCategory === "todos"
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Todos
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeCategory === "todos" ? "bg-slate-800 text-slate-200" : "bg-slate-200 text-slate-700"
            }`}>
              {sortedTrips.length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory("clinicos")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 shrink-0 ${
              activeCategory === "clinicos"
                ? "bg-teal-600 text-white shadow-md"
                : "bg-teal-50 text-teal-700 hover:bg-teal-100/70"
            }`}
          >
            <Ambulance className="w-4 h-4" />
            Clínicos
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeCategory === "clinicos" ? "bg-teal-700 text-white" : "bg-teal-100 text-teal-800"
            }`}>
              {clinicalTrips.length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory("no_clinicos")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 shrink-0 ${
              activeCategory === "no_clinicos"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70"
            }`}
          >
            <Truck className="w-4 h-4" />
            No Clínicos
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeCategory === "no_clinicos" ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-800"
            }`}>
              {nonClinicalTrips.length}
            </span>
          </button>

          <button
            onClick={() => setActiveCategory("no_clinicos")}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 shrink-0 ${
              activeCategory === "no_clinicos"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100/70"
            }`}
          >
            <Truck className="w-4 h-4" />
            No Clínicos
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeCategory === "no_clinicos" ? "bg-indigo-700 text-white" : "bg-indigo-100 text-indigo-800"
            }`}>
              {nonClinicalTrips.length}
            </span>
          </button>
        </div>

        {/* Buscador y Ordenamiento */}
        <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap">
          <div className="relative min-w-[200px] flex-1 lg:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar folio, paciente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-slate-50 border-slate-200 rounded-xl text-xs font-bold focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <Select value={sortPrimary} onValueChange={setSortPrimary}>
              <SelectTrigger className="h-7 border-none bg-transparent shadow-none text-xs font-bold text-slate-800 rounded-lg w-[110px] focus:ring-0">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-slate-100 shadow-lg">
                <SelectItem value="appointment_time" className="text-xs font-bold">Hora Cita</SelectItem>
                <SelectItem value="priority" className="text-xs font-bold">Prioridad</SelectItem>
                <SelectItem value="scheduled_date" className="text-xs font-bold">Fecha</SelectItem>
                <SelectItem value="origin" className="text-xs font-bold">Origen</SelectItem>
                <SelectItem value="destination" className="text-xs font-bold">Destino</SelectItem>
                <SelectItem value="tracking_number" className="text-xs font-bold">N° Seguimiento</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSortPrimaryDir(p => p === "asc" ? "desc" : "asc")}
              className="h-7 w-7 hover:bg-slate-200/50 rounded-lg text-slate-600"
              title={sortPrimaryDir === "asc" ? "Ascendente" : "Descendente"}
            >
              <ArrowUpDown className={`w-3.5 h-3.5 transition-transform duration-300 ${sortPrimaryDir === "desc" ? "rotate-180 text-teal-600" : "text-indigo-600"}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Grilla Principal de Traslados */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedTrips.map(renderTripCard)}
        </div>

        {displayedTrips.length === 0 && (
          <div className="text-center py-16 bg-white border border-dashed border-slate-200 rounded-3xl p-8 space-y-3">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm font-black text-slate-700 uppercase tracking-wide">
              No hay traslados activos en esta categoría
            </p>
            <p className="text-xs text-slate-400 font-medium">
              Prueba cambiando los filtros de estado o seleccionando la pestaña "Todos".
            </p>
          </div>
        )}
      </div>

      {/* Sección de Novedades y Cambios en Tiempo Real (Visibles directamente en la pantalla principal) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3 mt-6">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500 animate-pulse" /> Novedades y Cambios Recientes (Tiempo Real)
          </h2>
          <Badge className="bg-emerald-50 text-emerald-700 border-none font-black px-2 py-0.5 rounded-full text-[10px]">
            Live Stream
          </Badge>
        </div>
        
        <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loadingActivity ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Cargando novedades...</span>
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 italic text-xs">
              Sin novedades registradas hoy.
            </div>
          ) : (
            activityLogs.map((log) => {
              const logDetail = formatActivityLog(log);
              const Icon = logDetail.Icon;
              return (
                <div key={log.id} className={`p-3 rounded-xl border transition-all hover:shadow-xs flex items-center justify-between gap-3 ${logDetail.bg}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg bg-white border border-slate-100 shrink-0 shadow-2xs ${logDetail.iconColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900">{logDetail.title}</span>
                        <span className="text-[11px] font-semibold text-slate-600 truncate">{logDetail.description}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                        por {log.user_name || "Sistema"} • {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {log.new_values?.tracking_number && (
                    <button
                      type="button"
                      onClick={() => {
                        const foundTrip = trips.find(t => t.tracking_number === log.new_values.tracking_number);
                        if (foundTrip) {
                          setDetailTrip(foundTrip);
                        } else {
                          setDetailTrip(log.new_values);
                        }
                      }}
                      className="text-xs font-mono font-black text-teal-600 hover:text-teal-700 bg-white px-2 py-1 rounded-md border border-teal-200 shadow-2xs transition-colors cursor-pointer shrink-0"
                    >
                      #{log.new_values.tracking_number}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <TripDetailDialog trip={detailTrip} open={!!detailTrip} onOpenChange={() => setDetailTrip(null)} onRefresh={fetchTrips} />

      {/* DIALOGO ASIGNACIÓN REDISEÑADO PARA PC */}
      <Dialog open={!!assignDialog} onOpenChange={(open) => { if (!open) { setAssignDialog(null); setDriverSearch(""); } }}>
        <DialogContent className="max-w-3xl bg-slate-50 border-none shadow-2xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">Asignación de Conductor y Móvil</DialogTitle>
          <DialogDescription className="sr-only">Seleccione un conductor operativo para el traslado.</DialogDescription>
          <div className="flex h-[500px]">
            {/* Lateral Izquierdo: Resumen del viaje */}
            <div className="w-1/3 bg-teal-50/70 border-r border-teal-100/50 p-6 text-slate-800 flex flex-col justify-between">
              <div>
                <Badge className="bg-teal-100 text-teal-800 border-none mb-4 uppercase text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-md">Detalle del Traslado</Badge>
                <h3 className="text-xl font-bold leading-tight mb-6 text-slate-900">{assignDialog?.trip_type === "clinico" ? assignDialog?.patient_name : assignDialog?.task_details}</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-teal-600 shrink-0"></div>
                    <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">Origen</p><p className="text-sm font-bold leading-tight text-slate-800">{assignDialog?.origin}</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                    <div><p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-1">Destino</p><p className="text-sm font-bold leading-tight text-slate-800">{assignDialog?.destination}</p></div>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-teal-100/60">
                <p className="text-[10px] text-slate-500 font-bold uppercase leading-none mb-2 tracking-wider">Hora de Cita</p>
                <p className="text-3xl font-black text-teal-600 font-mono">{assignDialog?.appointment_time || "--:--"}</p>
              </div>
            </div>

            {/* Panel Derecho: Selector de Conductores */}
            <div className="flex-1 bg-white flex flex-col">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 flex items-center gap-2">
                  {assignDialog?.driver_id ? "Reasignar Móvil" : "Asignar Móvil Operativo"}
                </h2>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Search className="w-4 h-4 text-slate-400" /></div>
                  <Input
                    placeholder="Buscar por nombre o patente..."
                    className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-teal-500"
                    value={driverSearch}
                    onChange={(e) => setDriverSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50/30">
                <div className="grid grid-cols-2 gap-3">
                  {drivers.filter((d) =>
                    (d.name || "").toLowerCase().includes(driverSearch.toLowerCase()) ||
                    (d.vehicle_plate && d.vehicle_plate.toLowerCase().includes(driverSearch.toLowerCase()))
                  ).map((d) => (
                    <button
                      key={d.id}
                      onClick={() => handleAssign(assignDialog.id, d.id)}
                      className="group flex flex-col p-3 bg-white border border-slate-200 rounded-2xl hover:border-teal-500 hover:shadow-xl transition-all duration-300 text-left relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-teal-50 flex items-center justify-center text-slate-400 group-hover:text-teal-600 font-black text-sm transition-colors border border-slate-100 group-hover:border-teal-200">
                          {(d.name || "U").split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-900 text-[11px] leading-tight uppercase group-hover:text-teal-700 truncate">{d.name}</p>
                          <Badge className="bg-slate-100 group-hover:bg-teal-100 text-slate-500 group-hover:text-teal-700 border-none font-mono text-[9px] px-1.5 py-0 mt-0.5">
                            {d.vehicle_plate || "S/M"}
                          </Badge>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Disponible Ahora</span>
                        <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                      </div>
                      <div className="absolute top-0 right-0 w-16 h-16 bg-teal-500/5 rounded-full -mr-8 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </button>
                  ))}
                  {drivers.length === 0 && (
                    <div className="col-span-2 py-20 text-center">
                      <User className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs font-black text-slate-400 uppercase">Sin conductores registrados</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                <Button variant="ghost" onClick={() => setAssignDialog(null)} className="text-xs font-black uppercase text-slate-500">Cerrar</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOGO CANCELACIÓN */}
      <Dialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-red-600 uppercase">Confirmar Cancelación</DialogTitle>
            <DialogDescription className="sr-only">Esta acción cancelará definitivamente el traslado.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCancel} className="space-y-4 pt-4">
            <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-red-800 text-xs font-bold">
              Esta acción cancelará definitivamente el traslado #{cancelDialog?.tracking_number}.
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-black uppercase text-slate-500">Justificación de la cancelación *</Label>
              <textarea name="reason" className="w-full h-24 p-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-red-500 outline-none" placeholder="Indique el motivo de la cancelación..." required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCancelDialog(null)} className="text-xs font-black uppercase h-9">Volver</Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase h-9 px-6">Confirmar Cancelación</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOGO DEVOLVER AL GESTOR */}
      <Dialog open={!!returnDialog} onOpenChange={() => setReturnDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-slate-900 uppercase">Devolver Traslado</DialogTitle>
            <DialogDescription className="sr-only">Devolver el traslado al gestor de camas para su revisión.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-500 font-medium">¿Está seguro de devolver este traslado al Gestor de Camas para su revisión? El traslado saldrá de su bandeja activa hasta que sea aprobado nuevamente.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReturnDialog(null)} className="text-xs font-black uppercase">Volver</Button>
              <Button onClick={handleReturnToManager} className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase">Sí, Devolver</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* DIALOGO EDICIÓN */}
      <Dialog open={!!editDialog} onOpenChange={() => setEditDialog(null)}>
        <DialogContent className="max-w-3xl bg-slate-50 rounded-[2rem] sm:rounded-[2rem] border-none shadow-2xl p-0 max-h-[90vh] overflow-y-auto">
          <div className="bg-slate-900 p-8 pb-10 relative">
            <div className="absolute top-6 right-14">
              <Badge className="bg-teal-500 border-none uppercase tracking-widest text-[10px] font-black shadow-lg">
                Editar traslado
              </Badge>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                {editDialog?.trip_type === "clinico" ? <Ambulance className="w-6 h-6 text-teal-400" /> : <ClipboardList className="w-6 h-6 text-blue-400" />}
              </div>
              <div>
                <p className="text-teal-400 text-[10px] uppercase tracking-[0.2em] font-black mb-1">
                  Folio #{editDialog?.tracking_number}
                </p>
                <DialogTitle className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
                  {editDialog?.trip_type === "clinico" ? "Editar Traslado Clínico" : "Editar Cometido General"}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Formulario para editar la información de un traslado.
                </DialogDescription>
              </div>
            </div>
          </div>

          {editDialog && editForm && (
            <form onSubmit={handleEditSubmission} className="p-8 -mt-6 bg-slate-50 rounded-t-[2rem] relative space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Origen *</Label>
                  <Input value={editForm.origin} onChange={(e) => handleEditFormChange("origin", e.target.value)} className="h-9 text-xs font-semibold" required />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Dirección de Origen</Label>
                  <div className="flex gap-2">
                    <Input value={editForm.origin_address} onChange={(e) => handleEditFormChange("origin_address", e.target.value)} className="h-9 text-xs font-semibold flex-1" />
                    {editForm.origin_address && editForm.origin_address.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-teal-600 rounded-lg flex items-center gap-1 shrink-0"
                        onClick={() => {
                          const url = editForm.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editForm.origin_address)}`;
                          window.open(url, "_blank");
                        }}
                        title="Ver dirección en Google Maps"
                      >
                        <ExternalLink className="w-4 h-4 text-teal-600" />
                        <span className="hidden sm:inline text-[10px] font-bold uppercase">G-Maps</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Destino *</Label>
                  <Input value={editForm.destination} onChange={(e) => handleEditFormChange("destination", e.target.value)} className="h-9 text-xs font-semibold" required />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Dirección de Destino</Label>
                  <div className="flex gap-2">
                    <Input value={editForm.destination_address} onChange={(e) => handleEditFormChange("destination_address", e.target.value)} className="h-9 text-xs font-semibold flex-1" />
                    {editForm.destination_address && editForm.destination_address.trim() && (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-teal-600 rounded-lg flex items-center gap-1 shrink-0"
                        onClick={() => {
                          const url = editForm.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(editForm.destination_address)}`;
                          window.open(url, "_blank");
                        }}
                        title="Ver dirección en Google Maps"
                      >
                        <ExternalLink className="w-4 h-4 text-teal-600" />
                        <span className="hidden sm:inline text-[10px] font-bold uppercase">G-Maps</span>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">
                    {editDialog?.trip_type === "clinico" ? "Paciente *" : "Cometido *"}
                  </Label>
                  <Input
                    value={editDialog?.trip_type === "clinico" ? editForm.patient_name : editForm.task_details}
                    onChange={(e) => handleEditFormChange(editDialog?.trip_type === "clinico" ? "patient_name" : "task_details", e.target.value)}
                    className="h-9 text-xs font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Fecha Programada</Label>
                  <Input type="date" value={editForm.scheduled_date} onChange={(e) => handleEditFormChange("scheduled_date", e.target.value)} className="h-9 text-xs font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Hora Cita</Label>
                  <Input type="time" value={editForm.appointment_time} onChange={(e) => handleEditFormChange("appointment_time", e.target.value)} className="h-9 text-xs font-semibold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Hora Salida</Label>
                  <Input type="time" value={editForm.departure_time} onChange={(e) => handleEditFormChange("departure_time", e.target.value)} className="h-9 text-xs font-semibold" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-slate-500 uppercase">Prioridad</Label>
                  <Select value={editForm.priority} onValueChange={(v) => handleEditFormChange("priority", v)}>
                    <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editDialog?.trip_type === "no_clinico" && (
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase">Cantidad de Funcionarios</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      value={editForm.staff_count || ""} 
                      onChange={(e) => handleEditFormChange("staff_count", e.target.value)} 
                      className="h-9 text-xs font-semibold" 
                    />
                  </div>
                )}

                {editDialog?.trip_type === "clinico" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">RUT</Label>
                      <Input value={editForm.rut} onChange={(e) => handleEditFormChange("rut", e.target.value)} className="h-9 text-xs font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Edad</Label>
                      <Input value={editForm.age} onChange={(e) => handleEditFormChange("age", e.target.value)} className="h-9 text-xs font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Peso</Label>
                      <Input value={editForm.weight} onChange={(e) => handleEditFormChange("weight", e.target.value)} className="h-9 text-xs font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Cama</Label>
                      <Input value={editForm.bed} onChange={(e) => handleEditFormChange("bed", e.target.value)} className="h-9 text-xs font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Servicio Solicitante</Label>
                      <Select value={editForm.patient_unit} onValueChange={(v) => handleEditFormChange("patient_unit", v)}>
                        <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {originServices.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Motivo Traslado</Label>
                      <Select value={editForm.transfer_reason} onValueChange={(v) => handleEditFormChange("transfer_reason", v)}>
                        <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {reasonOptions.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Diagnóstico</Label>
                      <Input value={editForm.diagnosis} onChange={(e) => handleEditFormChange("diagnosis", e.target.value)} className="h-9 text-xs font-semibold" />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Médico Tratante</Label>
                      <Input value={editForm.attending_physician} onChange={(e) => handleEditFormChange("attending_physician", e.target.value)} className="h-9 text-xs font-semibold" />
                    </div>
                  </>
                )}
              </div>

              {editDialog?.trip_type === "clinico" && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-teal-800 uppercase tracking-wider">Personal Clínico Requerido *</Label>
                    <div className="space-y-2">
                      {editStaffRows.map((row, i) => (
                        <div key={i} className="flex gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-3xs">
                          <div className="flex-1 space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-slate-500">Tipo de Personal</Label>
                            <Select value={row.type} onValueChange={(v) => updateEditStaffRow(i, "type", v)}>
                              <SelectTrigger className="h-8 text-xs font-semibold"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                              <SelectContent>
                                {personnelTypes.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {t}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1 space-y-1">
                            <Label className="text-[9px] font-bold uppercase text-slate-500">Nombre Funcionario (Opcional)</Label>
                            <Select value={row.staff_id || "none"} onValueChange={(v) => updateEditStaffRow(i, "staff_id", v)} disabled={!row.type}>
                              <SelectTrigger className="h-8 text-xs font-semibold"><SelectValue placeholder={row.type ? "Opcional: Identificar..." : "Seleccione tipo"} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Por identificar luego...</SelectItem>
                                {getEditStaffByType(row.type).map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name} ({s.department || s.role || 'Acompañante'}) {s.is_working ? "🟢 [En Turno]" : "⚪ [Fuera de Turno]"}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeEditStaffRow(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {editStaffRows.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No se ha asignado personal clínico para el traslado.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-bold text-teal-800 uppercase tracking-wider">Requerimientos Paciente *</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-white p-4 rounded-xl border border-slate-200">
                      {requirementOptions.map((o) => (
                        <label key={o} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editRequirements.includes(o)}
                            onChange={() => handleEditCheckboxChange(o)}
                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                          />{" "}
                          {o}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase">Tipo de Acompañamiento Adicional</Label>
                      <Select value={editForm.accompaniment || "ninguno"} onValueChange={(v) => handleEditFormChange("accompaniment", v === "ninguno" ? "" : v)}>
                        <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ninguno">Ninguno</SelectItem>
                          {accompanimentOptions.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase">Notas Adicionales</Label>
                <textarea
                  className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-teal-500 outline-none transition-all bg-white"
                  value={editForm.notes || ""}
                  onChange={(e) => handleEditFormChange("notes", e.target.value)}
                  placeholder="Notas adicionales..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 mt-6">
                <Button type="button" variant="outline" onClick={() => setEditDialog(null)} className="text-xs font-black uppercase h-10 px-6 rounded-xl">Cerrar</Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-black uppercase h-10 px-8 shadow-md rounded-xl transition-all active:scale-95">Guardar Cambios</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
