import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ambulance, ClipboardList, Map, Trash2, Plus, ExternalLink } from "lucide-react";
import MapAddressSelector from "@/components/MapAddressSelector";
import { validateRut, PERSONNEL_TYPES, REQUIREMENT_OPTIONS } from "@/lib/tripUtils";

export default function GestorNewTripSection() {
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
        <button onClick={() => setTripType("clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tripType === "clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white text-slate-500"}`}><Ambulance className="w-8 h-8" /><span className="font-bold">Clínico</span></button>
        <button onClick={() => setTripType("no_clinico")} className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${tripType === "no_clinico" ? "border-teal-500 bg-teal-50 text-teal-800 shadow-md" : "border-slate-200 bg-white text-slate-500"}`}><ClipboardList className="w-8 h-8" /><span className="font-bold">No Clínico</span></button>
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
          <div className="space-y-4">
            {/* FILA DE ORIGEN */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="space-y-1 md:col-span-4">
                <Label>Origen *</Label>
                {!useCustomOrigin ? (
                  <Select value={form.origin || undefined} onValueChange={handleOriginChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="otro" className="font-bold text-teal-600 border-b border-slate-100 bg-slate-50">Otro (Ingresar dirección manual)...</SelectItem>
                      {origins.map(o => (
                        <SelectItem key={o.id} value={o.name}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.origin}
                    onChange={e => setForm({ ...form, origin: e.target.value })}
                    onDoubleClick={() => setUseCustomOrigin(false)}
                  />
                )}
              </div>
              
              <div className="space-y-1 md:col-span-8">
                <Label className="text-slate-500 text-xs">Dirección de Origen</Label>
                <div className="flex gap-2">
                  <Input placeholder="Dirección exacta o referencia" value={form.origin_address || ""} onChange={e => setForm({ ...form, origin_address: e.target.value, origin_maps_url: "" })} className="flex-1" />

                  {form.origin_address && form.origin_address.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-teal-600 rounded-lg flex items-center gap-1 shrink-0 h-9"
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
                <Label>Destino *</Label>
                {!useCustomDest ? (
                  <Select value={form.destination || undefined} onValueChange={handleDestChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="otro" className="font-bold text-teal-600 border-b border-slate-100 bg-slate-50">Otro (Ingresar dirección manual)...</SelectItem>
                      {destinations.map(d => (
                        <SelectItem key={d.id} value={d.name}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={form.destination}
                    onChange={e => setForm({ ...form, destination: e.target.value })}
                    onDoubleClick={() => setUseCustomDest(false)}
                  />
                )}
              </div>

              <div className="space-y-1 md:col-span-8">
                <Label className="text-slate-500 text-xs">Dirección de Destino</Label>
                <div className="flex gap-2">
                  <Input placeholder="Dirección exacta o referencia" value={form.destination_address || ""} onChange={e => setForm({ ...form, destination_address: e.target.value, destination_maps_url: "" })} className="flex-1" />

                  {form.destination_address && form.destination_address.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      className="px-3 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-teal-600 rounded-lg flex items-center gap-1 shrink-0 h-9"
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
            {tripType === "clinico" && <>
              <div className="space-y-1"><Label>Servicio Solicitante</Label>{!useCustomService ? <Select value={form.patient_unit || undefined} onValueChange={v => v === "otro" ? setUseCustomService(true) : setForm({ ...form, patient_unit: v })}><SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger><SelectContent>{originServices.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select> : <Input value={form.patient_unit || ""} onChange={e => setForm({ ...form, patient_unit: e.target.value })} onDoubleClick={() => setUseCustomService(false)} />}</div>
              <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })} /></div>
            </>}
            <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
            <div className="space-y-1"><Label>Hora Citación</Label><Input type="time" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} /></div>
            <div className="space-y-1"><Label>Hora Salida</Label><Input type="time" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} /></div>
          </div>
          {/* Personal clínico tabla */}
          {tripType === "clinico" && (<div className="space-y-3">
            <Label className="font-bold">Personal Clínico {form.transfer_reason !== "Alta" ? "*" : "(Opcional para Altas)"}</Label>
            {staffRows.length > 0 && <div className="border rounded-xl overflow-hidden"><table className="w-full text-sm"><thead className="bg-slate-100"><tr><th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Tipo</th><th className="p-2 text-left text-[10px] font-bold text-slate-500 uppercase">Nombre / Identificación</th><th className="p-2 w-10"></th></tr></thead><tbody>{staffRows.map((row, i) => (<tr key={i}><td className="p-2"><Select value={row.type} onValueChange={v => updateStaffRow(i, "type", v)}><SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger><SelectContent>{PERSONNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Select value={row.staff_id || "none"} onValueChange={v => updateStaffRow(i, "staff_id", v)} disabled={!row.type}><SelectTrigger className="h-9"><SelectValue placeholder="Opcional: Por identificar" /></SelectTrigger><SelectContent><SelectItem value="none">Por identificar luego...</SelectItem>{getStaffByType(row.type).map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.department || s.role || 'Acompañante'}) {s.is_working ? "🟢 [En Turno]" : "⚪ [Fuera de Turno]"}</SelectItem>)}</SelectContent></Select></td><td className="p-2"><Button type="button" variant="ghost" size="icon" onClick={() => removeStaffRow(i)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button></td></tr>))}</tbody></table></div>}
            <Button type="button" variant="outline" onClick={addStaffRow} className="border-teal-200 text-teal-700 h-9"><Plus className="w-4 h-4 mr-1" /> Añadir Personal</Button>
          </div>)}
          {/* Requerimientos */}
          {tripType === "clinico" && (<div className="space-y-2"><Label>Requerimientos Paciente</Label><div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">{REQUIREMENT_OPTIONS.map(o => <label key={o} className="flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" checked={form.patient_requirements.includes(o)} onChange={() => handleCheckbox("patient_requirements", o)} className="w-4 h-4 accent-teal-600" />{o}</label>)}</div></div>)}
          <div className="space-y-1"><Label>Notas</Label><textarea className="w-full min-h-[60px] p-3 rounded-md border text-sm" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-lg font-bold" disabled={loading}>{loading ? "Creando..." : "Crear Traslado"}</Button>
        </form>
      </CardContent></Card>

    </div>
  );
}
