import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, ArrowRight, Activity, Trash2, Clock, CheckCircle } from "lucide-react";
import api from "@/lib/api";

export default function RequesterDashboard() {
  const [section, setSection] = useState("new");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "new" && <NewTripForm onSuccess={() => setSection("list")} />}
        {section === "list" && <MyTripsList />}
      </main>
    </div>
  );
}

function NewTripForm({ onSuccess }) {
  const [form, setForm] = useState({
    trip_type: "clinico", origin: "", destination: "", patient_name: "", patient_unit: "",
    rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
    attending_physician: "", appointment_time: "", departure_time: "",
    required_personnel: [], patient_requirements: [], accompaniment: "ninguno", 
    task_details: "", staff_count: "1", clinical_team: "", notes: "", priority: "normal"
  });
  
  const [dests, setDests] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/destinations").then(r => setDests(r.data)).catch(()=>{});
    api.get("/clinical-staff").then(r => setStaffList(r.data)).catch(()=>{});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.origin || !form.destination) { toast.error("Debe indicar origen y destino"); return; }
    setLoading(true);
    try {
      await api.post("/trips", form);
      toast.success(form.trip_type === "clinico" ? "Solicitud enviada a Gestión de Camas" : "Solicitud enviada a Despacho");
      onSuccess();
    } catch (e) { toast.error("Error al crear la solicitud"); } 
    finally { setLoading(false); }
  };

  const roles = ["Medico", "Enfermero/a", "TENS", "Kinesiologo", "Matron/a", "Auxiliar"];

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-black text-slate-900 mb-6">Solicitar Nuevo Traslado</h1>
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6">
          <Tabs value={form.trip_type} onValueChange={v => setForm({...form, trip_type: v})}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="clinico" className="font-bold">Paciente (Clínico)</TabsTrigger>
              <TabsTrigger value="no_clinico" className="font-bold">Cometido (No Clínico)</TabsTrigger>
            </TabsList>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* RUTAS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="space-y-2"><Label>Origen *</Label><Select onValueChange={v=>setForm({...form, origin: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione origen"/></SelectTrigger><SelectContent>{dests.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Destino *</Label><Select onValueChange={v=>setForm({...form, destination: v})}><SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione destino"/></SelectTrigger><SelectContent>{dests.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              </div>

              {form.trip_type === "clinico" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nombre del Paciente *</Label><Input required value={form.patient_name} onChange={e=>setForm({...form, patient_name: e.target.value})} placeholder="Ej: Juan Pérez"/></div>
                    <div className="space-y-2"><Label>RUT</Label><Input value={form.rut} onChange={e=>setForm({...form, rut: e.target.value})} placeholder="Ej: 12.345.678-9"/></div>
                    <div className="space-y-2"><Label>Servicio / Unidad</Label><Input value={form.patient_unit} onChange={e=>setForm({...form, patient_unit: e.target.value})} placeholder="Ej: Urgencias"/></div>
                    <div className="space-y-2"><Label>Motivo Clínico del Traslado *</Label><Input required value={form.transfer_reason} onChange={e=>setForm({...form, transfer_reason: e.target.value})} placeholder="Ej: Alta a domicilio, Examen..."/></div>
                  </div>
                  
                  {/* WORKFLOW: Selección de personal (Opcional) */}
                  <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-teal-800">Tipo de Personal Requerido (Opcional)</Label>
                      <div className="flex flex-wrap gap-2">
                        {roles.map(r => (
                          <Button key={r} type="button" variant={form.required_personnel.includes(r) ? "default" : "outline"} onClick={() => {
                            const newRoles = form.required_personnel.includes(r) ? form.required_personnel.filter(x => x !== r) : [...form.required_personnel, r];
                            setForm({...form, required_personnel: newRoles});
                          }} className={form.required_personnel.includes(r) ? "bg-teal-600 text-white" : "bg-white"}>{r}</Button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-teal-800">Sugerir Nombre del Personal (Opcional)</Label>
                      <Select value={form.clinical_team} onValueChange={v => setForm({...form, clinical_team: v})}>
                        <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione personal si ya lo conoce" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" className="text-slate-400">Dejar en blanco (Gestión de camas asignará)</SelectItem>
                          {staffList.map(s => (<SelectItem key={s.id} value={`${s.name} (${s.role})`}>{s.name} - {s.role}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">Si se deja en blanco, la unidad de Gestión de Camas designará a alguien.</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Detalle del Cometido Funcionario *</Label><Textarea required value={form.task_details} onChange={e=>setForm({...form, task_details: e.target.value})} placeholder="Describa la tarea a realizar"/></div>
                  <div className="space-y-2"><Label>Cantidad de Funcionarios</Label><Input type="number" min="1" value={form.staff_count} onChange={e=>setForm({...form, staff_count: e.target.value})}/></div>
                </div>
              )}
              
              <div className="space-y-2"><Label>Notas Adicionales (Opcional)</Label><Textarea value={form.notes} onChange={e=>setForm({...form, notes: e.target.value})} placeholder="Cualquier información extra relevante..."/></div>
              
              <Button type="submit" disabled={loading} className="w-full h-14 bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg shadow-md mt-6">
                {loading ? "Procesando..." : "Enviar Solicitud"}
              </Button>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function MyTripsList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    try { const res = await api.get("/trips"); setTrips(res.data); } catch(e){} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const handleCancel = async (id) => {
    if(!window.confirm("¿Seguro que desea cancelar esta solicitud?")) return;
    try { await api.put(`/trips/${id}/status`, { status: "cancelado", cancel_reason: "Cancelado por el solicitante" }); toast.success("Cancelado"); fetchTrips(); } catch(e){}
  };

  const statusColors = { pendiente_revision: "bg-red-100 text-red-800 border-red-200", pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-slate-200 text-slate-600" };
  const sLabels = { pendiente_revision: "En Revisión (Camas)", pendiente: "Esperando Vehículo", asignado: "Asignado", en_curso: "En Camino", completado: "Completado", cancelado: "Cancelado" };

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <h1 className="text-2xl font-black text-slate-900 mb-6">Mis Solicitudes</h1>
      <div className="space-y-4">
        {trips.map(t => (
          <Card key={t.id} className="shadow-sm">
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{t.tracking_number}</span>
                  <Badge className={`${statusColors[t.status]} text-[10px] uppercase font-bold tracking-widest`}>{sLabels[t.status] || t.status}</Badge>
                </div>
                <p className="font-bold text-lg text-slate-900">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-slate-600 font-medium">
                  <MapPin className="w-4 h-4 text-teal-500" /> {t.origin} <ArrowRight className="w-3 h-3 text-slate-400" /> {t.destination}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs text-slate-400 mb-2 font-bold uppercase">{t.scheduled_date}</p>
                {(t.status === "pendiente_revision" || t.status === "pendiente") && (
                  <Button variant="outline" size="sm" onClick={() => handleCancel(t.id)} className="text-red-500 hover:bg-red-50 border-red-200">Cancelar Solicitud</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && <p className="text-center text-slate-400 py-10 font-bold">No has realizado ninguna solicitud.</p>}
      </div>
    </div>
  );
}
