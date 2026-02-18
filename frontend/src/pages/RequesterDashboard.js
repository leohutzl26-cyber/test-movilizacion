import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, MapPin, Clock, ArrowRight, FileText } from "lucide-react";
import api from "@/lib/api";

export default function RequesterDashboard() {
  const [section, setSection] = useState("new");
  return (
    <div className="min-h-screen bg-slate-50" data-testid="requester-dashboard">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {section === "new" && <NewTripSection />}
          {section === "history" && <HistorySection />}
        </div>
      </main>
    </div>
  );
}

function NewTripSection() {
  const [destinations, setDestinations] = useState([]);
  const [form, setForm] = useState({ origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/destinations").then(r => setDestinations(r.data)).catch(() => {}); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.origin || !form.destination || !form.patient_name) { toast.error("Complete los campos obligatorios"); return; }
    setLoading(true);
    try {
      await api.post("/trips", form);
      toast.success("Solicitud de traslado creada exitosamente");
      setForm({ origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "" });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al crear solicitud");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6" data-testid="new-trip-title">Nueva Solicitud de Traslado</h1>
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="new-trip-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Origen *</Label>
                <Select value={form.origin} onValueChange={val => setForm({...form, origin: val})}>
                  <SelectTrigger data-testid="trip-origin-select"><SelectValue placeholder="Seleccione origen" /></SelectTrigger>
                  <SelectContent>
                    {destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    <SelectItem value="otro">Otro (especificar)</SelectItem>
                  </SelectContent>
                </Select>
                {form.origin === "otro" && <Input data-testid="trip-origin-custom" placeholder="Especifique origen" onChange={e => setForm({...form, origin: e.target.value})} />}
              </div>
              <div className="space-y-2">
                <Label>Destino *</Label>
                <Select value={form.destination} onValueChange={val => setForm({...form, destination: val})}>
                  <SelectTrigger data-testid="trip-destination-select"><SelectValue placeholder="Seleccione destino" /></SelectTrigger>
                  <SelectContent>
                    {destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                    <SelectItem value="otro">Otro (especificar)</SelectItem>
                  </SelectContent>
                </Select>
                {form.destination === "otro" && <Input data-testid="trip-destination-custom" placeholder="Especifique destino" onChange={e => setForm({...form, destination: e.target.value})} />}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Nombre del Paciente *</Label>
                <Input data-testid="trip-patient-input" placeholder="Nombre completo" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Unidad / Servicio</Label>
                <Input data-testid="trip-unit-input" placeholder="Ej: Urgencias, Piso 3" value={form.patient_unit} onChange={e => setForm({...form, patient_unit: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={form.priority} onValueChange={val => setForm({...form, priority: val})}>
                <SelectTrigger data-testid="trip-priority-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notas Adicionales</Label>
              <textarea
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y"
                placeholder="Indicaciones especiales, equipamiento necesario..."
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                data-testid="trip-notes-input"
              />
            </div>
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-12 text-base" disabled={loading} data-testid="submit-trip-btn">
              <Plus className="w-5 h-5 mr-2" />{loading ? "Creando..." : "Crear Solicitud de Traslado"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function HistorySection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/trips").then(r => { setTrips(r.data); setLoading(false); }).catch(() => setLoading(false)); }, []);

  const statusColors = {
    pendiente: "bg-amber-100 text-amber-800",
    asignado: "bg-teal-100 text-teal-800",
    en_curso: "bg-blue-100 text-blue-800",
    completado: "bg-emerald-100 text-emerald-800",
    cancelado: "bg-red-100 text-red-800"
  };
  const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando...</div>;
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6" data-testid="history-title">Mis Solicitudes</h1>
      <div className="space-y-4">
        {trips.map((t, i) => (
          <Card key={t.id} className="card-hover animate-slide-up" style={{ animationDelay: `${i * 50}ms` }} data-testid={`history-trip-${t.id}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                </div>
                <span className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="font-semibold text-slate-900 mb-1">{t.patient_name}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-teal-500" />{t.origin}<ArrowRight className="w-3 h-3" />{t.destination}
              </div>
              {t.driver_name && <p className="text-sm text-slate-500 mt-2">Conductor: {t.driver_name}</p>}
              {t.notes && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><FileText className="w-3 h-3" />{t.notes}</p>}
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && <p className="text-center py-12 text-slate-400">Aun no ha creado solicitudes de traslado</p>}
      </div>
    </div>
  );
}
