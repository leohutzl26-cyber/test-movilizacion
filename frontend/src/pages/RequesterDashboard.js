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
import { ClipboardList, Plus, MapPin, ArrowRight, User, Stethoscope, Clock, Truck, Activity } from "lucide-react";
import api from "@/lib/api";

export default function RequesterDashboard() {
  const [section, setSection] = useState("new");
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8 min-h-screen">
        {section === "new" && <NewTripSection />}
        {section === "list" && <MyRequestsSection />}
      </main>
    </div>
  );
}

function NewTripSection() {
  const [destinations, setDestinations] = useState([]);
  const [tripType, setTripType] = useState("clinico");
  
  const [form, setForm] = useState({
    origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
    scheduled_date: new Date().toISOString().split("T")[0],
    rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
    requester_person: "", attending_physician: "", appointment_time: "", departure_time: "",
    required_personnel: [], patient_requirements: [], accompaniment: "",
    task_details: "", staff_count: ""
  });

  const [useCustomOrigin, setUseCustomOrigin] = useState(false);
  const [useCustomDest, setUseCustomDest] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/destinations").then(r => setDestinations(r.data)).catch(() => {}); }, []);

  const personnelOptions = ["Tens", "Matron (a)", "Enfermero (a)", "Kinesiólogo (a)", "Fonoaudiólogo (a)", "Medico", "Terapeuta ocupacional"];
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalOrigin = useCustomOrigin ? form.origin : form.origin;
    const finalDest = useCustomDest ? form.destination : form.destination;

    if (tripType === "clinico") {
      if (!form.patient_name || !form.patient_unit || !form.transfer_reason || !form.requester_person || !form.appointment_time || !finalOrigin || !finalDest) {
        toast.error("Complete todos los campos obligatorios del traslado clínico"); return;
      }
      if (form.required_personnel.length === 0) { toast.error("Seleccione al menos un personal requerido"); return; }
      if (form.patient_requirements.length === 0) { toast.error("Seleccione requerimientos del paciente"); return; }
    } else {
      if (!finalOrigin || !finalDest || !form.task_details || !form.staff_count) {
        toast.error("Complete Origen, Destino, Cometido y Cantidad de funcionarios"); return;
      }
    }

    setLoading(true);
    try {
      await api.post("/trips", { ...form, origin: finalOrigin, destination: finalDest, trip_type: tripType });
      toast.success("Solicitud creada exitosamente");
      setForm({
        origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
        scheduled_date: new Date().toISOString().split("T")[0], rut: "", age: "", diagnosis: "", weight: "", bed: "",
        transfer_reason: "", requester_person: "", attending_physician: "", appointment_time: "", departure_time: "",
        required_personnel: [], patient_requirements: [], accompaniment: "", task_details: "", staff_count: ""
      });
    } catch (e) { toast.error("Error al crear solicitud"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">Nueva Solicitud de Traslado</h1>
      
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
                  <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><User className="w-5 h-5"/> Datos del Paciente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Nombre Paciente *</Label><Input value={form.patient_name} onChange={e=>setForm({...form, patient_name: e.target.value})} /></div>
                    <div className="space-y-1"><Label>RUT</Label><Input value={form.rut} onChange={e=>setForm({...form, rut: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Edad</Label><Input value={form.age} onChange={e=>setForm({...form, age: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Peso</Label><Input value={form.weight} onChange={e=>setForm({...form, weight: e.target.value})} /></div>
                    <div className="space-y-1 md:col-span-2"><Label>Diagnóstico</Label><Input value={form.diagnosis} onChange={e=>setForm({...form, diagnosis: e.target.value})} /></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Activity className="w-5 h-5"/> Detalles Médicos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1"><Label>Quien solicita traslado *</Label><Input value={form.requester_person} onChange={e=>setForm({...form, requester_person: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Médico Tratante</Label><Input value={form.attending_physician} onChange={e=>setForm({...form, attending_physician: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Motivo Traslado *</Label>
                      <Select value={form.transfer_reason} onValueChange={v=>setForm({...form, transfer_reason: v})}>
                        <SelectTrigger><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                        <SelectContent>{reasonOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* SECCIÓN NO CLÍNICA */}
            {tripType === "no_clinico" && (
              <div className="space-y-4">
                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><ClipboardList className="w-5 h-5"/> Detalle del Cometido</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2"><Label>Cometido (Motivo) *</Label><Input value={form.task_details} onChange={e=>setForm({...form, task_details: e.target.value})} placeholder="Ej: Búsqueda de insumos" /></div>
                  <div className="space-y-1"><Label>Cantidad de Funcionarios *</Label><Input type="number" min="1" value={form.staff_count} onChange={e=>setForm({...form, staff_count: e.target.value})} /></div>
                </div>
              </div>
            )}

            {/* UBICACIÓN COMPARTIDA */}
            <div className="space-y-4">
              <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><MapPin className="w-5 h-5"/> Ubicación y Tiempos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><Label>Origen *</Label>
                  {!useCustomOrigin ? (
                    <Select onValueChange={v => v==="otro" ? setUseCustomOrigin(true) : setForm({...form, origin: v})}><SelectTrigger><SelectValue placeholder="Seleccione"/></SelectTrigger><SelectContent>{destinations.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select>
                  ) : <Input placeholder="Escriba origen" value={form.origin} onChange={e=>setForm({...form, origin: e.target.value})} onDoubleClick={()=>setUseCustomOrigin(false)}/>}
                </div>
                <div className="space-y-1"><Label>Destino *</Label>
                  {!useCustomDest ? (
                    <Select onValueChange={v => v==="otro" ? setUseCustomDest(true) : setForm({...form, destination: v})}><SelectTrigger><SelectValue placeholder="Seleccione"/></SelectTrigger><SelectContent>{destinations.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}<SelectItem value="otro">Otro</SelectItem></SelectContent></Select>
                  ) : <Input placeholder="Escriba destino" value={form.destination} onChange={e=>setForm({...form, destination: e.target.value})} onDoubleClick={()=>setUseCustomDest(false)}/>}
                </div>
                {tripType === "clinico" && (
                  <>
                    <div className="space-y-1"><Label>Unidad o Servicio *</Label><Input value={form.patient_unit} onChange={e=>setForm({...form, patient_unit: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Cama</Label><Input value={form.bed} onChange={e=>setForm({...form, bed: e.target.value})} /></div>
                    <div className="space-y-1"><Label>Hora de Citación *</Label><Input type="time" value={form.appointment_time} onChange={e=>setForm({...form, appointment_time: e.target.value})} /></div>
                  </>
                )}
                <div className="space-y-1"><Label>Fecha del Traslado</Label><Input type="date" value={form.scheduled_date} onChange={e=>setForm({...form, scheduled_date: e.target.value})} /></div>
                <div className="space-y-1"><Label>Hora de Salida</Label><Input type="time" value={form.departure_time} onChange={e=>setForm({...form, departure_time: e.target.value})} /></div>
              </div>
            </div>

            {/* REQUERIMIENTOS CLÍNICOS */}
            {tripType === "clinico" && (
              <div className="space-y-6">
                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><Plus className="w-5 h-5"/> Requerimientos Especiales</h3>
                
                <div className="space-y-2">
                  <Label>Personal Requerido *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {personnelOptions.map(o => (
                      <label key={o} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={form.required_personnel.includes(o)} onChange={()=>handleCheckbox("required_personnel", o)} className="w-4 h-4 text-teal-600 rounded border-slate-300" /> {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Requerimientos Paciente *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    {requirementOptions.map(o => (
                      <label key={o} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                        <input type="checkbox" checked={form.patient_requirements.includes(o)} onChange={()=>handleCheckbox("patient_requirements", o)} className="w-4 h-4 text-teal-600 rounded border-slate-300" /> {o}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1"><Label>Requiere Acompañamiento</Label>
                    <Select value={form.accompaniment} onValueChange={v=>setForm({...form, accompaniment: v})}>
                      <SelectTrigger><SelectValue placeholder="Ninguno"/></SelectTrigger>
                      <SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{accompanimentOptions.map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Prioridad</Label>
                    <Select value={form.priority} onValueChange={v=>setForm({...form, priority: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* SHARED NOTES */}
            <div className="space-y-2">
              <Label>Notas Adicionales</Label>
              <textarea className="w-full min-h-[80px] p-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none" value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} placeholder="Información extra..." />
            </div>

            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg font-bold shadow-md" disabled={loading}>
              {loading ? "Creando..." : "Enviar Solicitud de Traslado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MyRequestsSection() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);

  const fetchReqs = useCallback(async () => {
    try { const r = await api.get("/trips"); setRequests(r.data); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchReqs(); }, [fetchReqs]);

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mis Solicitudes</h1>
      <div className="space-y-4">
        {requests.map(req => (
          <Card key={req.id} className="card-hover cursor-pointer border-l-4 border-l-teal-500" onClick={() => setSelectedReq(req)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[req.status] || "bg-slate-100"}`}>{req.status.replace(/_/g, " ")}</span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{req.trip_type === "clinico" ? "Clínico" : "No Clínico"}</span>
                </div>
                <span className="text-xs text-slate-400">{req.scheduled_date || new Date(req.created_at).toLocaleDateString()}</span>
              </div>
              <p className="font-semibold text-slate-900">{req.trip_type === "clinico" ? req.patient_name : req.task_details}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600 mt-2">
                <MapPin className="w-4 h-4 text-teal-500" /> {req.origin} <ArrowRight className="w-3 h-3" /> {req.destination}
              </div>
            </CardContent>
          </Card>
        ))}
        {requests.length === 0 && !loading && <p className="text-center py-12 text-slate-400">No tienes solicitudes registradas</p>}
      </div>

      <Dialog open={!!selectedReq} onOpenChange={() => setSelectedReq(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Detalle de la Solicitud</DialogTitle></DialogHeader>
          {selectedReq && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColors[selectedReq.status]}`}>{selectedReq.status.replace(/_/g, " ")}</span>
                <span className="px-2 py-1 bg-slate-100 rounded-full text-xs font-semibold uppercase">{selectedReq.trip_type.replace(/_/g, " ")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg">
                <div><p className="text-xs text-slate-500">Origen</p><p className="font-bold">{selectedReq.origin}</p></div>
                <div><p className="text-xs text-slate-500">Destino</p><p className="font-bold">{selectedReq.destination}</p></div>
              </div>
              
              {selectedReq.trip_type === "clinico" ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-xs text-slate-500">Paciente</p><p className="font-medium">{selectedReq.patient_name}</p></div>
                    {selectedReq.rut && <div><p className="text-xs text-slate-500">RUT</p><p className="font-medium">{selectedReq.rut}</p></div>}
                    <div><p className="text-xs text-slate-500">Servicio/Unidad</p><p className="font-medium">{selectedReq.patient_unit}</p></div>
                    {selectedReq.appointment_time && <div><p className="text-xs text-slate-500">Hora Citación</p><p className="font-medium text-red-600 font-bold">{selectedReq.appointment_time}</p></div>}
                  </div>
                  {selectedReq.required_personnel?.length > 0 && <div><p className="text-xs text-slate-500">Personal</p><p className="font-medium">{selectedReq.required_personnel.join(", ")}</p></div>}
                  {selectedReq.patient_requirements?.length > 0 && <div><p className="text-xs text-slate-500">Requerimientos</p><p className="font-medium">{selectedReq.patient_requirements.join(", ")}</p></div>}
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><p className="text-xs text-slate-500">Cometido</p><p className="font-medium">{selectedReq.task_details}</p></div>
                  <div><p className="text-xs text-slate-500">Funcionarios</p><p className="font-medium">{selectedReq.staff_count}</p></div>
                </div>
              )}
              
              {selectedReq.notes && <div><p className="text-xs text-slate-500">Notas</p><p className="bg-amber-50 p-2 rounded">{selectedReq.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
