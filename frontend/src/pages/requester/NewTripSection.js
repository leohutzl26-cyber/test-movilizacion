import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Map, MapPin, User, Activity, Plus, Trash2, Ambulance, ClipboardList, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import MapAddressSelector from "@/components/MapAddressSelector";
import { validateRut } from "@/lib/tripUtils";

const defaultForm = {
  origin: "", origin_address: "", origin_maps_url: "",
  destination: "", destination_address: "", destination_maps_url: "",
  patient_name: "", patient_unit: "", priority: "normal", notes: "",
  scheduled_date: new Date().toISOString().split("T")[0],
  rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
  attending_physician: "", appointment_time: "", departure_time: "",
  patient_requirements: [], accompaniment: "", task_details: "", staff_count: ""
};

export default function NewTripSection({ editingTrip, setEditingTrip, onSaved }) {
  const { user } = useAuth();
  const [origins, setOrigins] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [originServices, setOriginServices] = useState([]);
  const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
  const [tripType, setTripType] = useState("clinico");

  const [form, setForm] = useState(defaultForm);

  // Dynamic clinical staff table rows: [{type, staff_id, staff_name}]
  const [staffRows, setStaffRows] = useState([]);
  const [rutStatus, setRutStatus] = useState(null); // null | {valid, formatted}

  const [useCustomOrigin, setUseCustomOrigin] = useState(false);
  const [useCustomDest, setUseCustomDest] = useState(false);
  const [useCustomService, setUseCustomService] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showOriginMap, setShowOriginMap] = useState(false);
  const [showDestMap, setShowDestMap] = useState(false);

  useEffect(() => {
    if (editingTrip) {
      setTripType(editingTrip.trip_type || "clinico");
      setForm({
        ...defaultForm,
        ...editingTrip,
        patient_requirements: editingTrip.patient_requirements || [],
        scheduled_date: editingTrip.scheduled_date ? editingTrip.scheduled_date.split('T')[0] : defaultForm.scheduled_date
      });
      setStaffRows(editingTrip.assigned_clinical_staff || []);
      if (editingTrip.rut) {
        setRutStatus(validateRut(editingTrip.rut));
      }
    } else {
      setForm({
        ...defaultForm,
        patient_unit: user?.department || ""
      });
      setStaffRows([]);
      setRutStatus(null);
      setUseCustomOrigin(false);
      setUseCustomDest(false);
      setUseCustomService(false);
    }
  }, [editingTrip, user]);

  useEffect(() => {
    if (editingTrip) {
      if (editingTrip.origin && (!origins.length || !origins.find((o) => o.name.toLowerCase() === editingTrip.origin.toLowerCase()))) setUseCustomOrigin(true);
      if (editingTrip.destination && (!destinations.length || !destinations.find((d) => d.name.toLowerCase() === editingTrip.destination.toLowerCase()))) setUseCustomDest(true);
    }
  }, [editingTrip, origins, destinations]);

  useEffect(() => {
    if (editingTrip) {
      if (editingTrip.patient_unit && (!originServices.length || !originServices.find((s) => s.name.toLowerCase() === editingTrip.patient_unit.toLowerCase()))) setUseCustomService(true);
    }
  }, [editingTrip, originServices]);

  useEffect(() => {
    if (!editingTrip && user?.department && originServices.length > 0) {
      const match = originServices.find(s => s.name.trim().toLowerCase() === user.department.trim().toLowerCase());
      if (match) {
        setForm(prev => ({ ...prev, patient_unit: match.name }));
        setUseCustomService(false);
      } else {
        setForm(prev => ({ ...prev, patient_unit: user.department }));
        setUseCustomService(true);
      }
    }
  }, [user, originServices, editingTrip]);

  useEffect(() => {
    api.get("/origins").then((r) => setOrigins((r.data || []).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
    api.get("/destinations").then((r) => setDestinations((r.data || []).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
    api.get("/clinical-staff").then((r) => setClinicalStaffOptions((r.data || []).filter((s) => s.is_active))).catch(() => {});
    api.get("/origin-services").then((r) => setOriginServices((r.data || []).filter((s) => s.is_active !== false))).catch(() => {});
  }, []);

  const personnelTypes = ["TENS", "Matrón(a)", "Enfermero(a)", "Kinesiólogo(a)", "Fonoaudiólogo(a)", "Médico", "Terapeuta Ocupacional"];
  const requirementOptions = ["Camilla", "Incubadora", "Silla de rueda", "Oxigeno", "Monitor", "Aislamiento Aéreo", "Aislamiento Contacto", "Aislamiento Protector", "Dependiente severo"];
  const reasonOptions = ["Examen", "Hospitalización", "Dialisis", "Rescate", "Alta", "Procedimiento"];
  const accompanimentOptions = ["Materno", "Tutor", "Otro"];

  const handleCheckbox = (field, val) => {
    setForm((prev) => {
      const arr = prev[field];
      if (arr.includes(val)) return { ...prev, [field]: arr.filter((i) => i !== val) };
      return { ...prev, [field]: [...arr, val] };
    });
  };

  const handleRutChange = (value) => {
    if (!value) {
      setForm((prev) => ({ ...prev, rut: "" }));
      setRutStatus(null);
      return;
    }
    const result = validateRut(value);
    setForm((prev) => ({ ...prev, rut: result.formatted }));
    if (value.trim().length >= 2) {
      setRutStatus(result);
    } else {
      setRutStatus(null);
    }
  };

  const addStaffRow = () => {
    setStaffRows([...staffRows, { type: "", staff_id: "", staff_name: "" }]);
  };
  
  const removeStaffRow = (index) => {
    setStaffRows(staffRows.filter((_, i) => i !== index));
  };
  
  const updateStaffRow = (index, field, value) => {
    setStaffRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === "type") {
        updated[index].staff_id = "";
        updated[index].staff_name = "";
      }
      if (field === "staff_id") {
        if (value && value !== "none") {
          const staff = clinicalStaffOptions.find((s) => s.id === value);
          if (staff) {
            updated[index].staff_name = staff.name;
          }
        } else {
          updated[index].staff_id = "";
          updated[index].staff_name = "";
        }
      }
      return updated;
    });
  };

  const getStaffByType = (type) => {
    if (!type) return clinicalStaffOptions;
    const target = type.toLowerCase();
    const matched = clinicalStaffOptions.filter(s => {
      const roleStr = (s.role || s.department || "").toLowerCase();
      return roleStr.includes(target) || target.includes(roleStr);
    });
    return matched.length > 0 ? matched : clinicalStaffOptions;
  };

  const handleOriginChange = (val) => {
    if (val === "otro") {
      setUseCustomOrigin(true);
      setForm((prev) => ({ ...prev, origin: "", origin_address: "", origin_maps_url: "" }));
    } else {
      const matched = origins.find((o) => o.name === val);
      const address = matched ? matched.address || "" : "";
      const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
      setForm((prev) => ({
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
      setForm((prev) => ({ ...prev, destination: "", destination_address: "", destination_maps_url: "" }));
    } else {
      const matched = destinations.find((d) => d.name === val);
      const address = matched ? matched.address || "" : "";
      const mapsUrl = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : "";
      setForm((prev) => ({
        ...prev,
        destination: val,
        destination_address: address,
        destination_maps_url: mapsUrl
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalOrigin = (form.origin || "").trim();
    const finalDest = (form.destination || "").trim();
    const finalPatientName = (form.patient_name || "").trim();
    const finalPatientUnit = (form.patient_unit || "").trim();
    const finalTransferReason = (form.transfer_reason || "").trim();

    const missingFields = [];
    if (!finalOrigin) missingFields.push("Origen");
    if (!finalDest) missingFields.push("Destino");
    if (!finalPatientUnit) missingFields.push("Servicio Solicitante");

    if (tripType === "clinico") {
      if (!finalPatientName) missingFields.push("Nombre Paciente");
      if (!finalTransferReason) missingFields.push("Motivo Traslado");

      if (missingFields.length > 0) {
        toast.error(`Complete todos los campos obligatorios del traslado clínico. Faltan: ${missingFields.join(", ")}`);
        return;
      }
      if (staffRows.length === 0 && form.transfer_reason !== "Alta") {
        toast.error("Debe añadir al menos un personal clínico para traslados clínicos");
        return;
      }
      if (staffRows.length > 0 && staffRows.some((r) => !r.type)) {
        toast.error("Seleccione el tipo de personal para todas las filas añadidas");
        return;
      }
      if (form.patient_requirements.length === 0) {
        toast.error("Seleccione requerimientos del paciente");
        return;
      }
    } else {
      if (!form.task_details) missingFields.push("Cometido");

      if (missingFields.length > 0) {
        toast.error(`Complete todos los campos obligatorios del traslado no clínico. Faltan: ${missingFields.join(", ")}`);
        return;
      }
    }

    setLoading(true);
    try {
      const submitData = {
        ...form,
        origin: finalOrigin,
        destination: finalDest,
        patient_name: finalPatientName,
        patient_unit: finalPatientUnit,
        transfer_reason: finalTransferReason,
        trip_type: tripType,
        required_personnel: staffRows.map((r) => `${r.type}: ${r.staff_name || "Por identificar"}`),
        assigned_clinical_staff: staffRows,
      };

      if (editingTrip) {
        await api.put(`/trips/${editingTrip.id}`, submitData);
        toast.success("Solicitud actualizada exitosamente");
        setEditingTrip(null);
        if (onSaved) onSaved();
      } else {
        await api.post("/trips", submitData);
        toast.success("Solicitud creada exitosamente");
        setForm(defaultForm);
        setStaffRows([]);
        setRutStatus(null);
      }
    } catch (e) {
      toast.error(editingTrip ? "Error al actualizar solicitud" : "Error al crear solicitud");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
          {editingTrip ? "Editar Solicitud" : "Nueva Solicitud de Traslado"}
        </h1>
        {editingTrip && (
          <Button
            variant="outline"
            onClick={() => {
              setEditingTrip(null);
              if (onSaved) onSaved();
            }}
          >
            Cancelar Edición
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setTripType("clinico")}
          className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
            tripType === "clinico"
              ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md"
              : "border-slate-200 bg-white text-slate-500 hover:border-teal-200"
          }`}
        >
          <Ambulance className="w-8 h-8" />
          <span className="font-bold">Traslado Clínico</span>
        </button>
        <button
          onClick={() => setTripType("no_clinico")}
          className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
            tripType === "no_clinico"
              ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md"
              : "border-slate-200 bg-white text-slate-500 hover:border-teal-200"
          }`}
        >
          <ClipboardList className="w-8 h-8" />
          <span className="font-bold">Traslado No Clínico</span>
        </button>
      </div>

      <Card className="shadow-lg border-t-4 border-t-teal-500">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
            {/* SECCIÓN CLÍNICA */}
            {tripType === "clinico" && (
              <>
                <div className="space-y-4">
                  <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2">
                    <User className="w-5 h-5" /> Datos del Paciente
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="patient_name">Nombre Paciente *</Label>
                      <Input id="patient_name" name="patient_name" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rut">RUT</Label>
                      <div className="relative">
                        <Input
                          id="rut"
                          name="rut"
                          value={form.rut}
                          onChange={(e) => handleRutChange(e.target.value)}
                          placeholder="Ej: 12345678-9"
                          className={rutStatus ? (rutStatus.valid ? "border-emerald-500 pr-10" : "border-red-500 pr-10") : "pr-10"}
                        />
                        {rutStatus && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {rutStatus.valid ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                          </div>
                        )}
                      </div>
                      {rutStatus && !rutStatus.valid && (
                        <p className="text-xs text-red-500 font-medium mt-0.5">RUT inválido. Formato correcto: {rutStatus.formatted}</p>
                      )}
                      {rutStatus && rutStatus.valid && <p className="text-xs text-emerald-600 font-medium mt-0.5">✓ RUT válido: {rutStatus.formatted}</p>}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="age">Edad</Label>
                      <Input id="age" name="age" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="weight">Peso</Label>
                      <Input id="weight" name="weight" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="diagnosis">Diagnóstico</Label>
                      <Input id="diagnosis" name="diagnosis" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5" /> Detalles Médicos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="attending_physician">Médico Tratante</Label>
                      <Input id="attending_physician" name="attending_physician" value={form.attending_physician} onChange={(e) => setForm({ ...form, attending_physician: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="transfer_reason">Motivo Traslado *</Label>
                      <Select value={form.transfer_reason} onValueChange={(v) => setForm({ ...form, transfer_reason: v })}>
                        <SelectTrigger id="transfer_reason">
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {reasonOptions.map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SECCIÓN NO CLÍNICA */}
            {tripType === "no_clinico" && (
              <div className="space-y-4">
                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" /> Detalle del Cometido
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="task_details">Cometido (Motivo) *</Label>
                    <Input
                      id="task_details"
                      name="task_details"
                      value={form.task_details}
                      onChange={(e) => setForm({ ...form, task_details: e.target.value })}
                      placeholder="Ej: Búsqueda de insumos"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="staff_count">Cantidad de Funcionarios</Label>
                    <Input id="staff_count" name="staff_count" type="number" min="0" value={form.staff_count} onChange={(e) => setForm({ ...form, staff_count: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* UBICACIÓN COMPARTIDA */}
            <div className="space-y-4">
              <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2">
                <MapPin className="w-5 h-5" /> Ubicación y Tiempos
              </h3>
              <div className="space-y-4">
                {/* FILA DE ORIGEN */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="space-y-1 md:col-span-4">
                    <Label htmlFor="origin">Origen *</Label>
                    {!useCustomOrigin ? (
                      <Select value={form.origin} onValueChange={handleOriginChange}>
                        <SelectTrigger id="origin">
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="otro" className="font-bold text-teal-600 border-b border-slate-100 bg-slate-50">Otro (Ingresar dirección manual)...</SelectItem>
                          {origins.map((o) => (
                            <SelectItem key={o.id} value={o.name}>
                              {o.name}
                            </SelectItem>
                          ))}
                          {form.origin && !origins.find((o) => o.name === form.origin) && (
                            <SelectItem value={form.origin}>{form.origin} (Personalizado)</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="origin"
                        name="origin"
                        placeholder="Escriba origen"
                        value={form.origin}
                        onChange={(e) => setForm({ ...form, origin: e.target.value })}
                        onDoubleClick={() => setUseCustomOrigin(false)}
                      />
                    )}
                  </div>

                  <div className="space-y-1 md:col-span-8">
                    <Label htmlFor="origin_address" className="text-slate-500 text-xs">Dirección de Origen</Label>
                    <div className="flex gap-2">
                      <Input
                        id="origin_address"
                        name="origin_address"
                        placeholder="Ej: Av. Principal 123 o Referencia"
                        value={form.origin_address || ""}
                        onChange={(e) => setForm({ ...form, origin_address: e.target.value, origin_maps_url: "" })}
                        className="flex-1"
                      />

                      {form.origin_address && form.origin_address.trim() && (
                        <Button
                          type="button"
                          variant="outline"
                          className="px-3 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-teal-600 rounded-lg flex items-center gap-1 shrink-0 h-10"
                          onClick={() => {
                            const url = form.origin_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.origin_address)}`;
                            window.open(url, "_blank");
                          }}
                          title="Ver dirección en Google Maps (sin claves)"
                        >
                          <ExternalLink className="w-4 h-4 text-teal-600" />
                          <span className="hidden md:inline text-xs font-bold">G-Maps</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* FILA DE DESTINO */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="space-y-1 md:col-span-4">
                    <Label htmlFor="destination">Destino *</Label>
                    {!useCustomDest ? (
                      <Select value={form.destination} onValueChange={handleDestChange}>
                        <SelectTrigger id="destination">
                          <SelectValue placeholder="Seleccione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="otro" className="font-bold text-teal-600 border-b border-slate-100 bg-slate-50">Otro (Ingresar dirección manual)...</SelectItem>
                          {destinations.map((d) => (
                            <SelectItem key={d.id} value={d.name}>
                              {d.name}
                            </SelectItem>
                          ))}
                          {form.destination && !destinations.find((d) => d.name === form.destination) && (
                            <SelectItem value={form.destination}>{form.destination} (Personalizado)</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="destination"
                        name="destination"
                        placeholder="Escriba destino"
                        value={form.destination}
                        onChange={(e) => setForm({ ...form, destination: e.target.value })}
                        onDoubleClick={() => setUseCustomDest(false)}
                      />
                    )}
                  </div>

                  <div className="space-y-1 md:col-span-8">
                    <Label htmlFor="destination_address" className="text-slate-500 text-xs">Dirección de Destino</Label>
                    <div className="flex gap-2">
                      <Input
                        id="destination_address"
                        name="destination_address"
                        placeholder="Ej: Lo Fontecilla 441 o Referencia"
                        value={form.destination_address || ""}
                        onChange={(e) => setForm({ ...form, destination_address: e.target.value, destination_maps_url: "" })}
                        className="flex-1"
                      />

                      {form.destination_address && form.destination_address.trim() && (
                        <Button
                          type="button"
                          variant="outline"
                          className="px-3 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-teal-600 rounded-lg flex items-center gap-1 shrink-0 h-10"
                          onClick={() => {
                            const url = form.destination_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.destination_address)}`;
                            window.open(url, "_blank");
                          }}
                          title="Ver dirección en Google Maps (sin claves)"
                        >
                          <ExternalLink className="w-4 h-4 text-teal-600" />
                          <span className="hidden md:inline text-xs font-bold">G-Maps</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="patient_unit">Servicio Solicitante *</Label>
                  {!useCustomService ? (
                    <Select
                      value={form.patient_unit}
                      onValueChange={(v) => {
                        if (v === "otro") {
                          setUseCustomService(true);
                          if (!form.patient_unit) setForm({ ...form, patient_unit: "" });
                        } else {
                          setForm({ ...form, patient_unit: v });
                        }
                      }}
                    >
                      <SelectTrigger id="patient_unit">
                        <SelectValue placeholder="Seleccione servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {originServices.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            {s.name}
                          </SelectItem>
                        ))}
                        {form.patient_unit && !originServices.find((s) => s.name === form.patient_unit) && (
                          <SelectItem value={form.patient_unit}>{form.patient_unit} (Personalizado)</SelectItem>
                        )}
                        <SelectItem value="otro">Otro (escribir)</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="patient_unit"
                      name="patient_unit"
                      placeholder="Escriba servicio"
                      value={form.patient_unit || ""}
                      onChange={(e) => setForm({ ...form, patient_unit: e.target.value })}
                      onDoubleClick={() => setUseCustomService(false)}
                    />
                  )}
                </div>

                {tripType === "clinico" && (
                  <div className="space-y-1">
                    <Label htmlFor="bed">Cama</Label>
                    <Input id="bed" name="bed" value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })} />
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="scheduled_date">Fecha del Traslado</Label>
                  <Input id="scheduled_date" name="scheduled_date" type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="appointment_time">Hora de Citación</Label>
                  <Input id="appointment_time" name="appointment_time" type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="departure_time">Hora de Salida</Label>
                  <Input id="departure_time" name="departure_time" type="time" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} />
                </div>
              </div>
            </div>

            {/* PERSONAL CLÍNICO - TABLA DINÁMICA */}
            {tripType === "clinico" && (
              <div className="space-y-4">
                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Personal Clínico Requerido *
                </h3>

                {staffRows.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="p-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Personal</th>
                          <th className="p-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre Funcionario</th>
                          <th className="p-3 w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {staffRows.map((row, i) => (
                          <tr key={i} className="bg-white hover:bg-slate-50">
                            <td className="p-2">
                              <Select value={row.type} onValueChange={(v) => updateStaffRow(i, "type", v)}>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder="Seleccione tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  {personnelTypes.map((t) => (
                                    <SelectItem key={t} value={t}>
                                      {t}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Select value={row.staff_id} onValueChange={(v) => updateStaffRow(i, "staff_id", v)} disabled={!row.type}>
                                <SelectTrigger className="h-10">
                                  <SelectValue placeholder={row.type ? "Opcional: Identificar luego..." : "Primero seleccione tipo"} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Por identificar (Gestor)...</SelectItem>
                                  {getStaffByType(row.type).map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                      {s.name} ({s.department || s.role || 'Acompañante'}) {s.is_working ? "🟢 [En Turno]" : "⚪ [Fuera de Turno]"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeStaffRow(i)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addStaffRow}
                  className="border-teal-200 text-teal-700 hover:bg-teal-50 font-bold h-10 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Añadir Personal Clínico
                </Button>
                {staffRows.length === 0 && form.transfer_reason !== "Alta" && (
                  <p className="text-xs text-amber-600 font-medium">⚠ Traslados clínicos requieren al menos un funcionario clínico</p>
                )}
                {staffRows.length === 0 && form.transfer_reason === "Alta" && (
                  <p className="text-xs text-teal-600 font-medium italic">ℹ Los traslados de tipo ALTA pueden ir sin personal clínico</p>
                )}
              </div>
            )}

            {/* REQUERIMIENTOS CLÍNICOS */}
            {tripType === "clinico" && (
              <div className="space-y-6">
                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Requerimientos Especiales
                </h3>

                <div className="space-y-2">
                  <Label>Requerimientos Paciente *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {requirementOptions.map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          name="patient_requirements"
                          value={o}
                          checked={form.patient_requirements.includes(o)}
                          onChange={() => handleCheckbox("patient_requirements", o)}
                          className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
                        />{" "}
                        {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Tipo de Acompañamiento Adicional</Label>
                    <Select value={form.accompaniment} onValueChange={(v) => setForm({ ...form, accompaniment: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ninguno" />
                      </SelectTrigger>
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

            {/* SHARED NOTES */}
            <div className="space-y-2">
              <Label>Notas Adicionales</Label>
              <textarea
                className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Información extra..."
              />
            </div>

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg font-bold shadow-md" disabled={loading}>
              {loading ? (editingTrip ? "Actualizando..." : "Creando...") : editingTrip ? "Guardar Cambios" : "Enviar Solicitud de Traslado"}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  );
}
