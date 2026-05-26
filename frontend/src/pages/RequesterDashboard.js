import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardList, Plus, MapPin, ArrowRight, User, Stethoscope, Clock, Truck, Activity, CheckCircle, XCircle, Trash2, Filter } from "lucide-react";
import api from "@/lib/api";
import TripEvolutionLog from "@/components/TripEvolutionLog";

// ========== RUT VALIDATION (MÓDULO 11) ==========
function validateRut(rut) {
  const clean = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase().trim();
  if (clean.length < 2) return { valid: false, formatted: rut };
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return { valid: false, formatted: rut };
  let total = 0, factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    total += parseInt(body[i]) * factor;
    factor = factor < 7 ? factor + 1 : 2;
  }
  const remainder = 11 - (total % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  const valid = dv === expected;
  // Format: XX.XXX.XXX-X
  let formatted = "";
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) formatted = "." + formatted;
    formatted = body[i] + formatted;
  }
  return { valid, formatted: `${formatted}-${expected}` };
}

const defaultForm = {
  origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
  scheduled_date: new Date().toISOString().split("T")[0],
  rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
  attending_physician: "", appointment_time: "", departure_time: "",
  patient_requirements: [], accompaniment: "", task_details: "", staff_count: ""
};

export default function RequesterDashboard() {
  const [section, setSection] = useState("new");
  const [editingTrip, setEditingTrip] = useState(null);

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setSection("new");
  };

  const handleSectionChange = (sec) => {
    if (sec !== "new") setEditingTrip(null);
    setSection(sec);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={handleSectionChange} />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8 min-h-screen">
        {section === "new" && <NewTripSection editingTrip={editingTrip} setEditingTrip={setEditingTrip} onSaved={() => setSection("list")} />}
        {section === "list" && <MyRequestsSection onEdit={handleEdit} />}
      </main>
    </div>
  );
}

function NewTripSection({ editingTrip, setEditingTrip, onSaved }) {
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
      setForm(defaultForm);
      setStaffRows([]);
      setRutStatus(null);
      setUseCustomOrigin(false);
      setUseCustomDest(false);
      setUseCustomService(false);
    }
  }, [editingTrip]);

  useEffect(() => {
    if (editingTrip) {
      if (editingTrip.origin && (!destinations.length || !destinations.find(d => d.name.toLowerCase() === editingTrip.origin.toLowerCase()))) setUseCustomOrigin(true);
      if (editingTrip.destination && (!destinations.length || !destinations.find(d => d.name.toLowerCase() === editingTrip.destination.toLowerCase()))) setUseCustomDest(true);
    }
  }, [editingTrip, destinations]);

  useEffect(() => {
    if (editingTrip) {
      if (editingTrip.patient_unit && (!originServices.length || !originServices.find(s => s.name.toLowerCase() === editingTrip.patient_unit.toLowerCase()))) setUseCustomService(true);
    }
  }, [editingTrip, originServices]);

  useEffect(() => {
    api.get("/destinations").then(r => setDestinations(r.data || [])).catch(() => { });
    api.get("/clinical-staff").then(r => setClinicalStaffOptions((r.data || []).filter(s => s.is_active))).catch(() => { });
    api.get("/origin-services").then(r => setOriginServices((r.data || []).filter(s => s.is_active !== false))).catch(() => { });
  }, []);

  const personnelTypes = ["TENS", "Matrón(a)", "Enfermero(a)", "Kinesiólogo(a)", "Fonoaudiólogo(a)", "Médico", "Terapeuta Ocupacional"];
  const requirementOptions = ["Camilla", "Incubadora", "Silla de rueda", "Oxigeno", "Monitor", "Aislamiento Aéreo", "Aislamiento Contacto", "Aislamiento Protector", "Dependiente severo"];
  const reasonOptions = ["Examen", "Hospitalización", "Dialisis", "Rescate", "Alta", "Procedimiento"];
  const accompanimentOptions = ["Materno", "Tutor", "Otro"];

  const handleCheckbox = (field, val) => {
    setForm(prev => {
      const arr = prev[field];
      if (arr.includes(val)) return { ...prev, [field]: arr.filter(i => i !== val) };
      return { ...prev, [field]: [...arr, val] };
    });
  };

  // RUT validation on change
  const handleRutChange = (value) => {
    setForm({ ...form, rut: value });
    if (value.trim().length >= 2) {
      const result = validateRut(value);
      setRutStatus(result);
    } else {
      setRutStatus(null);
    }
  };

  // Staff table management
  const addStaffRow = () => {
    setStaffRows([...staffRows, { type: "", staff_id: "", staff_name: "" }]);
  };
  const removeStaffRow = (index) => {
    setStaffRows(staffRows.filter((_, i) => i !== index));
  };
  const updateStaffRow = (index, field, value) => {
    setStaffRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // If type changed, reset staff selection
      if (field === "type") {
        updated[index].staff_id = "";
        updated[index].staff_name = "";
      }
      // If staff_id changed, find the name
      if (field === "staff_id") {
        if (value && value !== "none") {
          const staff = clinicalStaffOptions.find(s => s.id === value);
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
    if (!type) return [];
    return clinicalStaffOptions.filter(s => s.role.toLowerCase() === type.toLowerCase());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalOrigin = useCustomOrigin ? form.origin : form.origin;
    const finalDest = useCustomDest ? form.destination : form.destination;

    if (tripType === "clinico") {
      if (!form.patient_name || !form.patient_unit || !form.transfer_reason || !finalOrigin || !finalDest) {
        toast.error("Complete todos los campos obligatorios del traslado clínico"); return;
      }
      if (staffRows.length === 0 && form.transfer_reason !== "Alta") { toast.error("Debe añadir al menos un personal clínico para traslados clínicos"); return; }
      if (staffRows.length > 0 && staffRows.some(r => !r.type)) { toast.error("Seleccione el tipo de personal para todas las filas añadidas"); return; }
      if (form.patient_requirements.length === 0) { toast.error("Seleccione requerimientos del paciente"); return; }
    } else {
      if (!finalOrigin || !finalDest || !form.task_details) {
        toast.error("Complete Origen, Destino y Cometido"); return;
      }
    }

    setLoading(true);
    try {
      const submitData = {
        ...form,
        origin: finalOrigin,
        destination: finalDest,
        trip_type: tripType,
        required_personnel: staffRows.map(r => `${r.type}: ${r.staff_name || "Por identificar"}`),
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
    } catch (e) { toast.error(editingTrip ? "Error al actualizar solicitud" : "Error al crear solicitud"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{editingTrip ? "Editar Solicitud" : "Nueva Solicitud de Traslado"}</h1>
        {editingTrip && (
          <Button variant="outline" onClick={() => { setEditingTrip(null); if (onSaved) onSaved(); }}>Cancelar Edición</Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button onClick={() => setTripType("clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${tripType === "clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white text-slate-500 hover:border-teal-200"}`}>
          <Stethoscope className="w-8 h-8" /><span className="font-bold">Traslado Clínico</span>
        </button>
        <button onClick={() => setTripType("no_clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${tripType === "no_clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white text-slate-500 hover:border-teal-200"}`}>
          <Truck className="w-8 h-8" /><span className="font-bold">Traslado No Clínico</span>
        </button>
      </div>

      <Card className="shadow-lg border-t-4 border-t-teal-500">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">

            {/* SECCIÓN CLÍNICA */}
            {tripType === "clinico" && (
              <>
                <div className="space-y-4">
                  <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><User className="w-5 h-5" /> Datos del Paciente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Nombre Paciente *</Label><Input value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} /></div>
                    <div className="space-y-1">
                      <Label>RUT</Label>
                      <div className="relative">
                        <Input
                          value={form.rut}
                          onChange={e => handleRutChange(e.target.value)}
                          placeholder="Ej: 12345678-9"
                          className={rutStatus ? (rutStatus.valid ? "border-emerald-500 pr-10" : "border-red-500 pr-10") : "pr-10"}
                        />
                        {rutStatus && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {rutStatus.valid
                              ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                              : <XCircle className="w-5 h-5 text-red-500" />}
                          </div>
                        )}
                      </div>
                      {rutStatus && !rutStatus.valid && <p className="text-xs text-red-500 font-medium mt-0.5">RUT inválido. Formato correcto: {rutStatus.formatted}</p>}
                      {rutStatus && rutStatus.valid && <p className="text-xs text-emerald-600 font-medium mt-0.5">✓ RUT válido: {rutStatus.formatted}</p>}
                    </div>
                    <div className="space-y-1"><Label>Edad</Label><Input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Peso</Label><Input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
                    <div className="space-y-1 md:col-span-2"><Label>Diagnóstico</Label><Input value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Activity className="w-5 h-5" /> Detalles Médicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Médico Tratante</Label><Input value={form.attending_physician} onChange={e => setForm({ ...form, attending_physician: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Motivo Traslado *</Label>
                      <Select value={form.transfer_reason} onValueChange={v => setForm({ ...form, transfer_reason: v })}>
                        <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                        <SelectContent>{reasonOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SECCIÓN NO CLÍNICA */}
            {tripType === "no_clinico" && (
              <div className="space-y-4">
                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Detalle del Cometido</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2"><Label>Cometido (Motivo) *</Label><Input value={form.task_details} onChange={e => setForm({ ...form, task_details: e.target.value })} placeholder="Ej: Búsqueda de insumos" /></div>
                  <div className="space-y-1"><Label>Cantidad de Funcionarios</Label><Input type="number" min="0" value={form.staff_count} onChange={e => setForm({ ...form, staff_count: e.target.value })} /></div>
                </div>
              </div>
            )}

            {/* UBICACIÓN COMPARTIDA */}
            <div className="space-y-4">
              <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><MapPin className="w-5 h-5" /> Ubicación y Tiempos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Origen *</Label>
                  {!useCustomOrigin ? (
                    <Select value={form.origin || undefined} onValueChange={v => v === "otro" ? setUseCustomOrigin(true) : setForm({ ...form, origin: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}{form.origin && !destinations.find(d => d.name === form.origin) && <SelectItem value={form.origin}>{form.origin} (Personalizado)</SelectItem>}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select>
                  ) : <Input placeholder="Escriba origen" value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} onDoubleClick={() => setUseCustomOrigin(false)} />}
                </div>
                <div className="space-y-1"><Label>Destino *</Label>
                  {!useCustomDest ? (
                    <Select value={form.destination || undefined} onValueChange={v => v === "otro" ? setUseCustomDest(true) : setForm({ ...form, destination: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}{form.destination && !destinations.find(d => d.name === form.destination) && <SelectItem value={form.destination}>{form.destination} (Personalizado)</SelectItem>}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select>
                  ) : <Input placeholder="Escriba destino" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} onDoubleClick={() => setUseCustomDest(false)} />}
                </div>
                {tripType === "clinico" && (
                  <>
                    <div className="space-y-1"><Label>Servicio de Origen *</Label>
                      {!useCustomService ? (
                        <Select value={form.patient_unit || undefined} onValueChange={v => {
                          if (v === "otro") { setUseCustomService(true); if (!form.patient_unit) setForm({ ...form, patient_unit: "" }); }
                          else { setForm({ ...form, patient_unit: v }); }
                        }}>
                          <SelectTrigger><SelectValue placeholder="Seleccione servicio" /></SelectTrigger>
                          <SelectContent>
                            {originServices.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                            {form.patient_unit && !originServices.find(s => s.name === form.patient_unit) && <SelectItem value={form.patient_unit}>{form.patient_unit} (Personalizado)</SelectItem>}
                            <SelectItem value="otro">Otro (escribir)</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="Escriba servicio" value={form.patient_unit || ""} onChange={e => setForm({ ...form, patient_unit: e.target.value })} onDoubleClick={() => setUseCustomService(false)} />
                      )}
                    </div>
                    <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Hora de Citación</Label><Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} /></div>
                  </>
                )}
                <div className="space-y-1"><Label>Fecha del Traslado</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                <div className="space-y-1"><Label>Hora de Salida</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} /></div>
              </div>
            </div>

            {/* PERSONAL CLÍNICO - TABLA DINÁMICA */}
            {tripType === "clinico" && (
              <div className="space-y-4">
                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Plus className="w-5 h-5" /> Personal Clínico Requerido *</h3>

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
                              <Select value={row.type} onValueChange={v => updateStaffRow(i, "type", v)}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Seleccione tipo" /></SelectTrigger>
                                <SelectContent>{personnelTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                              </Select>
                            </td>
                             <td className="p-2">
                              <Select value={row.staff_id} onValueChange={v => updateStaffRow(i, "staff_id", v)} disabled={!row.type}>
                                <SelectTrigger className="h-10"><SelectValue placeholder={row.type ? "Opcional: Identificar luego..." : "Primero seleccione tipo"} /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Por identificar (Gestor)...</SelectItem>
                                  {getStaffByType(row.type).length > 0
                                    ? getStaffByType(row.type).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                                    : <SelectItem value="__none" disabled>No hay personal de este tipo</SelectItem>}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2 text-center">
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeStaffRow(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <Button type="button" variant="outline" onClick={addStaffRow} className="border-teal-200 text-teal-700 hover:bg-teal-50 font-bold h-10 flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Añadir Personal Clínico
                </Button>
                {staffRows.length === 0 && form.transfer_reason !== "Alta" && <p className="text-xs text-amber-600 font-medium">⚠ Traslados clínicos requieren al menos un funcionario clínico</p>}
                {staffRows.length === 0 && form.transfer_reason === "Alta" && <p className="text-xs text-teal-600 font-medium italic">ℹ Los traslados de tipo ALTA pueden ir sin personal clínico</p>}
              </div>
            )}

            {/* REQUERIMIENTOS CLÍNICOS */}
            {tripType === "clinico" && (
              <div className="space-y-6">
                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Plus className="w-5 h-5" /> Requerimientos Especiales</h3>

                <div className="space-y-2">
                  <Label>Requerimientos Paciente *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {requirementOptions.map(o => (
                      <label key={o} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={form.patient_requirements.includes(o)} onChange={() => handleCheckbox("patient_requirements", o)} className="w-4 h-4 text-teal-600 rounded border-slate-300" /> {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Tipo de Acompañamiento Adicional</Label>
                    <Select value={form.accompaniment} onValueChange={v => setForm({ ...form, accompaniment: v })}>
                      <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                      <SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{accompanimentOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* SHARED NOTES */}
            <div className="space-y-2">
              <Label>Notas Adicionales</Label>
              <textarea className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Información extra..." />
            </div>

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg font-bold shadow-md" disabled={loading}>
              {loading ? (editingTrip ? "Actualizando..." : "Creando...") : (editingTrip ? "Guardar Cambios" : "Enviar Solicitud de Traslado")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MyRequestsSection({ onEdit }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const fetchReqs = useCallback(async () => {
    try { const r = await api.get("/trips"); setRequests(r.data || []); } catch { } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchReqs(); }, [fetchReqs]);

  const statusColors = { pendiente: "bg-amber-100 text-amber-800 border-amber-200", asignado: "bg-teal-100 text-teal-800 border-teal-200", en_curso: "bg-blue-100 text-blue-800 border-blue-200", completado: "bg-emerald-100 text-emerald-800 border-emerald-200", cancelado: "bg-red-100 text-red-800 border-red-200", revision_gestor: "bg-purple-100 text-purple-800 border-purple-200" };

  const handleCancel = async (reqId) => {
    if (!confirm("¿Está seguro de que desea cancelar esta solicitud?")) return;
    try {
      await api.put(`/trips/${reqId}/status`, { status: "cancelado", cancel_reason: "Cancelada por el solicitante" });
      toast.success("Solicitud cancelada exitosamente");
      setSelectedReq(null);
      fetchReqs();
    } catch (e) {
      toast.error("Error al cancelar la solicitud");
    }
  };

  const filteredRequests = requests.filter(req => {
    let statusMatch = statusFilter === "all" ? true : req.status === statusFilter;
    let dateMatch = true;
    
    if (dateFilter !== "all" && req.created_at) {
      const reqDate = new Date(req.created_at);
      const now = new Date();
      const diffTime = Math.abs(now - reqDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (dateFilter === "7days") dateMatch = diffDays <= 7;
      if (dateFilter === "30days") dateMatch = diffDays <= 30;
    }
    
    return statusMatch && dateMatch;
  });

  const formatDate = (isoString) => {
    if (!isoString) return "-";
    const datePart = isoString.split('T')[0];
    const [y, m, d] = datePart.split('-');
    return `${d}-${m}-${y}`;
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    const d = new Date(isoString);
    return d.toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Mis Solicitudes (Histórico)</h1>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="border-0 shadow-none h-8 w-full sm:w-[160px] focus:ring-0">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="revision_gestor">Revisión Gestor</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="asignado">Asignadas</SelectItem>
                <SelectItem value="en_curso">En Curso</SelectItem>
                <SelectItem value="completado">Completadas</SelectItem>
                <SelectItem value="cancelado">Canceladas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <Clock className="w-4 h-4 text-slate-400" />
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="border-0 shadow-none h-8 w-full sm:w-[160px] focus:ring-0">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fechas</SelectItem>
                <SelectItem value="7days">Últimos 7 días</SelectItem>
                <SelectItem value="30days">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Desktop View: Table */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Folio</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 min-w-[200px]">Detalle / Paciente</th>
                <th className="px-6 py-4 min-w-[200px]">Ruta</th>
                <th className="px-6 py-4">Fecha Solicitud</th>
                <th className="px-6 py-4">Fecha Programada</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelectedReq(req)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="bg-slate-800 text-white font-mono px-2 py-1 rounded text-[10px] font-bold shadow-sm">{req.tracking_number || req.id.substring(0, 6).toUpperCase()}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-fit border ${req.trip_type === "clinico" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {req.trip_type === "clinico" ? <Stethoscope className="w-3 h-3" /> : <ClipboardList className="w-3 h-3" />}
                      {req.trip_type === "clinico" ? "Clínico" : "No Clínico"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900 text-sm line-clamp-2" title={req.trip_type === "clinico" ? req.patient_name : req.task_details}>
                      {req.trip_type === "clinico" ? req.patient_name : req.task_details}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="font-medium truncate max-w-[120px]" title={req.origin}>{req.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-medium truncate max-w-[120px]" title={req.destination}>{req.destination}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-slate-600 font-medium text-xs">
                    {formatDateTime(req.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">{formatDate(req.scheduled_date)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[req.status] || "bg-slate-100 border-slate-200"}`}>{(req.status || "").replace(/_/g, " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile/Tablet View: Cards */}
      <div className="lg:hidden space-y-4 mb-8">
        {filteredRequests.map(req => (
          <Card key={req.id} className={`card-hover cursor-pointer border-l-4 ${req.trip_type === "clinico" ? "border-l-rose-500" : "border-l-slate-400"}`} onClick={() => setSelectedReq(req)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{req.tracking_number || req.id.substring(0, 6).toUpperCase()}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[req.status] || "bg-slate-100 border-slate-200"}`}>{(req.status || "").replace(/_/g, " ")}</span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${req.trip_type === "clinico" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                  {req.trip_type === "clinico" ? <Stethoscope className="w-3 h-3" /> : <ClipboardList className="w-3 h-3" />}
                  {req.trip_type === "clinico" ? "Clínico" : "No Clínico"}
                </div>
              </div>
              
              <p className="font-bold text-lg text-slate-900 mb-2">{req.trip_type === "clinico" ? req.patient_name : req.task_details}</p>
              
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0" /> 
                  <span className="font-medium truncate">{req.origin}</span> 
                  <ArrowRight className="w-3 h-3 mx-1 text-slate-400 shrink-0" /> 
                  <span className="font-medium truncate">{req.destination}</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">F. Solicitud</span>
                  <span className="font-medium text-slate-600">{formatDateTime(req.created_at)}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold text-teal-600 uppercase">F. Programada</span>
                  <span className="font-bold text-teal-700">{formatDate(req.scheduled_date)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {requests.length === 0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center mt-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <ClipboardList className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">Sin Solicitudes</h3>
          <p className="text-slate-500">Aún no has registrado ninguna solicitud de traslado.</p>
        </div>
      )}
      
      {requests.length > 0 && filteredRequests.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center mt-4">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <Filter className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">Sin Resultados</h3>
          <p className="text-slate-500">No se encontraron solicitudes con los filtros aplicados.</p>
          <Button variant="outline" className="mt-4" onClick={() => { setStatusFilter("all"); setDateFilter("all"); }}>Limpiar Filtros</Button>
        </div>
      )}

      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-xl border-b pb-3 flex justify-between items-center">Detalle de la Solicitud <Badge className="bg-slate-800 text-white font-mono">{selectedReq?.tracking_number}</Badge></DialogTitle></DialogHeader>
          {selectedReq && (
            <div className="space-y-5 text-sm pt-2">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusColors[selectedReq.status]}`}>{(selectedReq.status || "").replace(/_/g, " ")}</span>
                <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${selectedReq.trip_type === "clinico" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 text-slate-700 border-slate-200"}`}>{(selectedReq.trip_type || "").replace(/_/g, " ")}</span>
                <span className="text-xs font-bold text-slate-500 ml-auto">{formatDateTime(selectedReq.created_at)}</span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{selectedReq.trip_type === "clinico" ? "Paciente" : "Cometido"}</p>
                <p className="font-black text-xl text-slate-900 leading-tight">{selectedReq.trip_type === "clinico" ? selectedReq.patient_name : selectedReq.task_details}</p>

                {selectedReq.trip_type === "clinico" && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs"><span className="font-bold text-slate-500">RUT:</span> {selectedReq.rut || "-"}</p>
                    <p className="text-xs"><span className="font-bold text-slate-500">Servicio/Unidad:</span> {selectedReq.patient_unit}</p>
                    <p className="text-xs"><span className="font-bold text-slate-500">Fecha Traslado:</span> <span className="text-teal-700 font-bold">{formatDate(selectedReq.scheduled_date)}</span></p>
                    <p className="text-xs"><span className="font-bold text-slate-500">Horarios:</span> <span className="text-red-600 font-bold">{selectedReq.appointment_time || "-"}</span> (Cit) | <span className="text-amber-600 font-bold">{selectedReq.departure_time || "-"}</span> (Sal)</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3"><MapPin className="w-5 h-5 text-teal-500" /><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origen</p><p className="font-bold text-slate-800 text-base">{selectedReq.origin}</p></div></div>
                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3"><ArrowRight className="w-5 h-5 text-blue-500" /><div><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Destino</p><p className="font-bold text-slate-800 text-base">{selectedReq.destination}</p></div></div>
              </div>

              {selectedReq.trip_type === "clinico" && (
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100">
                  {selectedReq.assigned_clinical_staff?.length > 0 ? (
                    <div className="mb-2">
                      <p className="text-[10px] text-teal-800 font-bold uppercase tracking-widest mb-2">Personal Clínico Asignado</p>
                      {selectedReq.assigned_clinical_staff.map((s, i) => (
                        <p key={i} className="text-sm font-medium text-teal-900">{s.type}: <span className="font-bold">{s.staff_name}</span></p>
                      ))}
                    </div>
                  ) : selectedReq.required_personnel?.length > 0 && (
                    <div className="mb-2"><p className="text-[10px] text-teal-800 font-bold uppercase tracking-widest mb-1">Personal Requerido</p><p className="font-medium text-teal-900">{selectedReq.required_personnel.join(", ")}</p></div>
                  )}
                  {selectedReq.patient_requirements?.length > 0 && <div><p className="text-[10px] text-teal-800 font-bold uppercase tracking-widest mb-1 mt-3">Requerimientos</p><p className="font-medium text-teal-900 bg-white inline-block px-2 py-1 rounded shadow-sm border border-teal-100">{selectedReq.patient_requirements.join(", ")}</p></div>}
                </div>
              )}

              {selectedReq.trip_type === "no_clinico" && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center">
                  <p className="font-bold text-slate-500 text-xs uppercase">Cantidad de Funcionarios</p>
                  <p className="font-black text-lg text-slate-900 bg-white w-8 h-8 flex items-center justify-center rounded-md shadow-sm border border-slate-200">{selectedReq.staff_count || "0"}</p>
                </div>
              )}

              {selectedReq.notes && (
                <div className="border-t border-slate-200 pt-4"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Notas Adicionales</p><p className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-slate-800">{selectedReq.notes}</p></div>
              )}

              {(selectedReq.status === "revision_gestor" || selectedReq.status === "pendiente") && (
                <div className="border-t border-slate-200 pt-4 flex gap-3 mt-4">
                   <Button variant="outline" className="flex-1 border-teal-200 text-teal-700 hover:bg-teal-50" onClick={() => { onEdit(selectedReq); setSelectedReq(null); }}>Editar Solicitud</Button>
                   <Button variant="destructive" className="flex-1" onClick={() => handleCancel(selectedReq.id)}>Cancelar Solicitud</Button>
                </div>
              )}

              <TripEvolutionLog tripId={selectedReq.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
