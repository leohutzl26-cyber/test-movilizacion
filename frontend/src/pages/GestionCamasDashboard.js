import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity, UserPlus, AlertTriangle, RefreshCw, Trash2, Search, Download, Filter, FileText } from "lucide-react";
import api from "@/lib/api";

export default function GestionCamasDashboard() {
  const [section, setSection] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dashboard" && <OverviewSection onNavigate={setSection} />}
        {section === "review" && <ReviewInboxSection />}
        {section === "staff" && <ClinicalStaffMantainer />}
        {section === "new" && <NewTripSection onSuccess={() => setSection("history")} />}
        {section === "history" && <ClinicalHistorySection />}
      </main>
    </div>
  );
}

// =====================================
// 1. DASHBOARD RESUMEN
// =====================================
function OverviewSection({ onNavigate }) {
  const [stats, setStats] = useState({ pendingReview: 0, inProgress: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [review, active] = await Promise.all([
        api.get("/trips/pending-review"),
        api.get("/trips/active")
      ]);
      setStats({
        pendingReview: review.data.length,
        inProgress: active.data.filter(t => t.trip_type === "clinico").length
      });
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); const interval = setInterval(fetchStats, 10000); return () => clearInterval(interval); }, [fetchStats]);

  return (
    <div className="animate-slide-up max-w-5xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-8">Resumen de Operaciones</h1>
      {loading ? <div className="flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-teal-600"/></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={`shadow-sm border-l-4 cursor-pointer hover:shadow-md transition-all ${stats.pendingReview > 0 ? "border-l-red-500 bg-red-50/50" : "border-l-emerald-500"}`} onClick={() => onNavigate("review")}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                  {stats.pendingReview > 0 ? <AlertTriangle className="w-3 h-3 text-red-500"/> : <CheckCircle className="w-3 h-3 text-emerald-500"/>} Bandeja de Revisión
                </p>
                <p className={`text-5xl font-black ${stats.pendingReview > 0 ? "text-red-600" : "text-emerald-600"}`}>{stats.pendingReview}</p>
                <p className="text-xs font-medium text-slate-500 mt-2">Traslados esperando su visación →</p>
              </div>
              <ShieldAlert className={`w-14 h-14 ${stats.pendingReview > 0 ? "text-red-200" : "text-emerald-100"}`} />
            </CardContent>
          </Card>
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Traslados en Movimiento</p>
                <p className="text-5xl font-black text-blue-600">{stats.inProgress}</p>
                <p className="text-xs font-medium text-slate-500 mt-2">Pacientes en tránsito</p>
              </div>
              <Activity className="w-14 h-14 text-blue-200" />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// =====================================
// 2. BANDEJA DE ENTRADA (VISACIÓN)
// =====================================
function ReviewInboxSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState(null);
  
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("normal");

  const fetchData = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([api.get("/trips/pending-review"), api.get("/clinical-staff")]);
      setTrips(t.data); setStaffList(s.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  const handleApprove = async () => {
    if (!selectedStaff) { toast.error("Debe asignar personal de apoyo para visar el viaje."); return; }
    try {
      await api.put(`/trips/${reviewDialog.id}/approve-clinical`, { priority: selectedPriority, clinical_team: selectedStaff });
      toast.success("Traslado visado y enviado a despacho.");
      setReviewDialog(null); fetchData();
    } catch (e) { toast.error("Error al visar."); }
  };

  const handleCancel = async (id) => {
    if(!window.confirm("¿Cancelar definitivamente esta solicitud?")) return;
    try { await api.put(`/trips/${id}/status`, { status: "cancelado", cancel_reason: "Cancelado por Gestión de Camas" }); toast.success("Cancelado"); fetchData(); } catch(e){}
  };

  if (loading) return <div className="flex justify-center py-20"><RefreshCw className="w-10 h-10 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="mb-6"><h1 className="text-2xl font-black text-slate-900">Bandeja de Revisión</h1><p className="text-slate-500 font-medium">Revise los traslados, asigne personal de apoyo y defina la prioridad.</p></div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {trips.map(t => (
          <Card key={t.id} className="shadow-sm border-t-4 border-t-amber-500">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">{t.tracking_number}</span>
                <span className="text-xs font-bold text-slate-500 block text-right">{t.scheduled_date}<br/>{t.appointment_time || "--:--"}</span>
              </div>
              <p className="font-black text-xl text-slate-900 mb-1">{t.patient_name}</p>
              <p className="text-xs text-slate-500 mb-3 font-bold uppercase tracking-wider">Motivo: {t.transfer_reason}</p>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 text-sm font-bold text-slate-800 flex flex-col gap-2">
                <div className="flex gap-2"><MapPin className="w-4 h-4 text-teal-600"/> {t.origin}</div>
                <div className="flex gap-2"><ArrowRight className="w-4 h-4 text-blue-600"/> {t.destination}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleCancel(t.id)} className="flex-1 text-red-600 border-red-200 hover:bg-red-50 text-xs">Rechazar</Button>
                <Button onClick={() => { setReviewDialog(t); setSelectedStaff(""); setSelectedPriority("normal"); }} className="flex-[2] bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-sm text-sm">Revisar y Visar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200"><CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-200"/><p className="text-xl font-bold">Bandeja Vacía</p><p className="text-sm mt-1">No hay solicitudes pendientes de revisión.</p></div>}
      </div>

      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-black">Visar Traslado Clínico</DialogTitle></DialogHeader>
          {reviewDialog && (
            <div className="space-y-5 pt-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Paciente</p>
                <p className="text-xl font-black text-slate-900">{reviewDialog.patient_name}</p>
                <div className="mt-3 pt-3 border-t border-slate-200"><p className="text-xs font-bold text-slate-600">Requerimientos del Solicitante:</p><Badge className="bg-amber-100 text-amber-800 shadow-sm mt-1">{reviewDialog.required_personnel?.join(", ") || "No especificado"}</Badge></div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-sm">1. Personal Acompañante Asignado *</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="h-12 text-base border-slate-300"><SelectValue placeholder="Seleccione personal" /></SelectTrigger>
                  <SelectContent>{staffList.map(s => (<SelectItem key={s.id} value={`${s.name} (${s.role})`}>{s.name} - {s.role}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-sm">2. Prioridad del Traslado</Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger className="h-12 border-slate-300"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="urgente">Urgente (Rojo)</SelectItem><SelectItem value="alta">Alta (Naranja)</SelectItem><SelectItem value="normal">Normal (Verde)</SelectItem></SelectContent>
                </Select>
              </div>
              <DialogFooter className="mt-6"><Button variant="outline" className="h-12" onClick={() => setReviewDialog(null)}>Cancelar</Button><Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-md" onClick={handleApprove}>Visar y Enviar a Despacho</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================
// 3. MANTENEDOR DE PERSONAL CLÍNICO
// =====================================
function ClinicalStaffMantainer() {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const fetchStaff = useCallback(async () => {
    try { const res = await api.get("/clinical-staff"); setStaff(res.data); } catch(e){}
  }, []);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if(!name.trim() || !role.trim()) { toast.error("Complete ambos campos"); return; }
    try { await api.post("/clinical-staff", { name, role }); setName(""); setRole(""); fetchStaff(); toast.success("Personal agregado"); } catch(e){}
  };

  const handleDelete = async (id) => {
    if(!window.confirm("¿Borrar este registro?")) return;
    try { await api.delete(`/clinical-staff/${id}`); fetchStaff(); toast.success("Eliminado"); } catch(e){}
  };

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="mb-6"><h1 className="text-2xl font-black text-slate-900">Mantenedor de Personal Clínico</h1><p className="text-slate-500 font-medium">Gestione los nombres del equipo disponible para acompañar traslados.</p></div>
      <Card className="mb-6 shadow-sm border-slate-200">
        <CardContent className="p-5">
          <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full space-y-2"><Label className="font-bold">Nombre Completo</Label><Input placeholder="Ej: Ana Rojas" value={name} onChange={e=>setName(e.target.value)} className="h-11 bg-slate-50" /></div>
            <div className="w-full md:w-64 space-y-2"><Label className="font-bold">Cargo / Rol</Label><Input placeholder="Ej: Tens, Médico, Enfermero..." value={role} onChange={e=>setRole(e.target.value)} className="h-11 bg-slate-50" /></div>
            <Button type="submit" className="h-11 w-full md:w-auto bg-teal-600 hover:bg-teal-700 text-white font-bold"><UserPlus className="w-4 h-4 mr-2"/> Agregar</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group">
            <div><p className="font-bold text-slate-800">{s.name}</p><Badge variant="outline" className="mt-1 text-[10px] bg-slate-50">{s.role}</Badge></div>
            <Button variant="ghost" size="icon" className="text-slate-300 group-hover:text-red-500 transition-colors" onClick={()=>handleDelete(s.id)}><Trash2 className="w-4 h-4"/></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// =====================================
// 4. NUEVO TRASLADO (DIRECTO A DESPACHO)
// =====================================
function NewTripSection({ onSuccess }) {
  const [form, setForm] = useState({ trip_type: "clinico", origin: "", destination: "", patient_name: "", patient_unit: "", rut: "", age: "", diagnosis: "", bed: "", transfer_reason: "", priority: "normal", clinical_team: "" });
  const [loading, setLoading] = useState(false);
  const [dests, setDests] = useState([]);
  const [staffList, setStaffList] = useState([]);

  useEffect(() => {
    api.get("/destinations").then(r => setDests(r.data)).catch(()=>{});
    api.get("/clinical-staff").then(r => setStaffList(r.data)).catch(()=>{});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post("/trips", form);
      toast.success("Traslado creado y enviado directamente a Despacho");
      onSuccess();
    } catch(e) { toast.error("Error al crear"); } finally { setLoading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto animate-slide-up">
      <div className="mb-6"><h1 className="text-2xl font-black text-slate-900">Crear Traslado Urgente</h1><p className="text-slate-500 font-medium">Los viajes creados aquí no pasan por revisión, van directo a la consola de los conductores.</p></div>
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1 space-y-2"><Label>Origen</Label><Select onValueChange={v => setForm({...form, origin: v})}><SelectTrigger className="h-12 bg-slate-50"><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{dests.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2 md:col-span-1 space-y-2"><Label>Destino</Label><Select onValueChange={v => setForm({...form, destination: v})}><SelectTrigger className="h-12 bg-slate-50"><SelectValue placeholder="Seleccionar..."/></SelectTrigger><SelectContent>{dests.map(d=><SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="col-span-2 space-y-2"><Label>Nombre Paciente</Label><Input required value={form.patient_name} onChange={e=>setForm({...form, patient_name: e.target.value})} className="h-12 bg-slate-50" placeholder="Ej: Juan Pérez" /></div>
              <div className="col-span-2 space-y-2"><Label>Motivo del Traslado</Label><Input required value={form.transfer_reason} onChange={e=>setForm({...form, transfer_reason: e.target.value})} className="h-12 bg-slate-50" /></div>
              
              <div className="col-span-2 md:col-span-1 space-y-2">
                <Label>Prioridad</Label>
                <Select value={form.priority} onValueChange={v => setForm({...form, priority: v})}>
                  <SelectTrigger className="h-12 bg-slate-50"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="urgente">Urgente (Rojo)</SelectItem><SelectItem value="alta">Alta (Naranja)</SelectItem><SelectItem value="normal">Normal (Verde)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="col-span-2 md:col-span-1 space-y-2">
                <Label>Personal Asignado</Label>
                <Select onValueChange={v => setForm({...form, clinical_team: v})}>
                  <SelectTrigger className="h-12 bg-slate-50"><SelectValue placeholder="Seleccione..."/></SelectTrigger>
                  <SelectContent>{staffList.map(s => (<SelectItem key={s.id} value={`${s.name} (${s.role})`}>{s.name} - {s.role}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold text-lg shadow-md mt-4">{loading ? "Enviando..." : "Crear Traslado y Enviar a Despacho"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// =====================================
// 5. HISTORIAL (Exportar a Excel)
// =====================================
function ClinicalHistorySection() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const fetchHistory = useCallback(async () => { try { const res = await api.get("/trips/history"); setHistory(res.data.filter(t => t.trip_type === "clinico")); } catch (e) {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = history.filter(t => (t.patient_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || (t.tracking_number || "").toLowerCase().includes(searchTerm.toLowerCase()));

  const handleExport = () => {
    const headers = ["Folio", "Fecha", "Paciente", "Origen", "Destino", "Motivo", "Personal", "Estado"];
    const rows = filtered.map(t => [t.tracking_number, t.scheduled_date, `"${t.patient_name}"`, `"${t.origin}"`, `"${t.destination}"`, `"${t.transfer_reason}"`, `"${t.clinical_team||""}"`, t.status].join(";"));
    const blob = new Blob(["\uFEFF" + [headers.join(";"), ...rows].join("\n")], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "Reporte.csv"; link.click();
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex justify-between items-center mb-6"><h1 className="text-2xl font-black text-slate-900">Histórico Clínico</h1><Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white"><Download className="w-4 h-4 mr-2"/> Exportar Excel</Button></div>
      <Card className="mb-4"><CardContent className="p-4"><Input placeholder="Buscar por nombre o folio..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-slate-50"/></CardContent></Card>
      <Card><CardContent className="p-0 max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm text-left"><thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] sticky top-0"><tr><th className="p-4">Folio</th><th className="p-4">Paciente</th><th className="p-4">Personal</th><th className="p-4">Estado</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map(t => (<tr key={t.id} className="hover:bg-slate-50"><td className="p-4 font-mono font-bold text-xs">{t.tracking_number}</td><td className="p-4 font-bold">{t.patient_name}</td><td className="p-4 text-xs font-bold text-teal-700">{t.clinical_team || "-"}</td><td className="p-4"><Badge variant="outline" className="uppercase text-[10px]">{t.status.replace(/_/g, " ")}</Badge></td></tr>))}</tbody></table>
      </CardContent></Card>
    </div>
  );
}
