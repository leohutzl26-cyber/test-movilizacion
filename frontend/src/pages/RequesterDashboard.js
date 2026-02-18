import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, MapPin, Clock, ArrowRight, FileText, Edit, X as XIcon, Stethoscope, Truck, User, Phone, CalendarDays } from "lucide-react";
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
  const [tripType, setTripType] = useState("no_clinico");
  const [form, setForm] = useState({
    origin: "", destination: "", patient_name: "", patient_unit: "",
    priority: "normal", notes: "", clinical_team: "", contact_person: "",
    scheduled_date: new Date().toISOString().split("T")[0]
  });
  const [useCustomOrigin, setUseCustomOrigin] = useState(false);
  const [useCustomDest, setUseCustomDest] = useState(false);
  const [customOrigin, setCustomOrigin] = useState("");
  const [customDest, setCustomDest] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get("/destinations").then(r => setDestinations(r.data)).catch(() => {}); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalOrigin = useCustomOrigin ? customOrigin : form.origin;
    const finalDest = useCustomDest ? customDest : form.destination;
    if (!finalOrigin || !finalDest) { toast.error("Complete origen y destino"); return; }
    if (tripType === "clinico" && !form.patient_name) { toast.error("Ingrese nombre del paciente para traslado clinico"); return; }
    if (tripType === "clinico" && !form.contact_person) { toast.error("Ingrese persona de contacto para traslado clinico"); return; }
    setLoading(true);
    try {
      await api.post("/trips", {
        ...form, origin: finalOrigin, destination: finalDest, trip_type: tripType
      });
      toast.success("Solicitud de traslado creada exitosamente");
      setForm({ origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "", clinical_team: "", contact_person: "", scheduled_date: new Date().toISOString().split("T")[0] });
      setCustomOrigin(""); setCustomDest(""); setUseCustomOrigin(false); setUseCustomDest(false);
    } catch (e) { toast.error(e.response?.data?.detail || "Error al crear solicitud"); }
    finally { setLoading(false); }
  };

  const handleOriginSelect = (val) => {
    if (val === "otro") { setUseCustomOrigin(true); setForm({ ...form, origin: "" }); }
    else { setForm({ ...form, origin: val }); }
  };
  const handleDestSelect = (val) => {
    if (val === "otro") { setUseCustomDest(true); setForm({ ...form, destination: "" }); }
    else { setForm({ ...form, destination: val }); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6" data-testid="new-trip-title">Nueva Solicitud de Traslado</h1>
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5" data-testid="new-trip-form">
            {/* Tipo de traslado */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Tipo de Traslado *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setTripType("clinico")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${tripType === "clinico" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}
                  data-testid="trip-type-clinico">
                  <Stethoscope className={`w-5 h-5 mb-2 ${tripType === "clinico" ? "text-teal-600" : "text-slate-400"}`} />
                  <p className="font-semibold text-sm">Clinico</p>
                  <p className="text-xs text-slate-500 mt-0.5">Requiere paciente y equipo</p>
                </button>
                <button type="button" onClick={() => setTripType("no_clinico")}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${tripType === "no_clinico" ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:border-slate-300"}`}
                  data-testid="trip-type-no-clinico">
                  <Truck className={`w-5 h-5 mb-2 ${tripType === "no_clinico" ? "text-teal-600" : "text-slate-400"}`} />
                  <p className="font-semibold text-sm">No Clinico</p>
                  <p className="text-xs text-slate-500 mt-0.5">Traslado general</p>
                </button>
              </div>
            </div>

            {/* Campos clinicos */}
            {tripType === "clinico" && (
              <div className="space-y-4 p-4 bg-teal-50/50 rounded-lg border border-teal-100 animate-slide-up">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><User className="w-4 h-4 text-teal-600" />Nombre del Paciente *</Label>
                  <Input data-testid="trip-patient-input" placeholder="Nombre completo" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Stethoscope className="w-4 h-4 text-teal-600" />Equipo Clinico de Acompanamiento</Label>
                  <Input data-testid="trip-clinical-team-input" placeholder="Ej: Enfermera, Paramedico" value={form.clinical_team} onChange={e => setForm({...form, clinical_team: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Phone className="w-4 h-4 text-teal-600" />Persona de Contacto *</Label>
                  <Input data-testid="trip-contact-input" placeholder="Nombre y telefono" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} required />
                </div>
              </div>
            )}

            {/* Origen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Origen *</Label>
                {!useCustomOrigin ? (
                  <Select onValueChange={handleOriginSelect}>
                    <SelectTrigger data-testid="trip-origin-select"><SelectValue placeholder="Seleccione origen" /></SelectTrigger>
                    <SelectContent>
                      {destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                      <SelectItem value="otro">Otro (especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input data-testid="trip-origin-custom" placeholder="Escriba el origen" value={customOrigin} onChange={e => setCustomOrigin(e.target.value)} autoFocus />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => { setUseCustomOrigin(false); setCustomOrigin(""); }} data-testid="clear-custom-origin"><XIcon className="w-4 h-4" /></Button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Destino *</Label>
                {!useCustomDest ? (
                  <Select onValueChange={handleDestSelect}>
                    <SelectTrigger data-testid="trip-destination-select"><SelectValue placeholder="Seleccione destino" /></SelectTrigger>
                    <SelectContent>
                      {destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                      <SelectItem value="otro">Otro (especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input data-testid="trip-destination-custom" placeholder="Escriba el destino" value={customDest} onChange={e => setCustomDest(e.target.value)} autoFocus />
                    <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => { setUseCustomDest(false); setCustomDest(""); }} data-testid="clear-custom-dest"><XIcon className="w-4 h-4" /></Button>
                  </div>
                )}
              </div>
            </div>

            {/* Fecha y prioridad */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4 text-teal-600" />Fecha de Traslado</Label>
                <Input type="date" data-testid="trip-date-input" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} />
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
            </div>

            {/* Unidad */}
            {tripType === "no_clinico" && (
              <div className="space-y-2">
                <Label>Descripcion / Persona a trasladar</Label>
                <Input data-testid="trip-unit-input" placeholder="Ej: Material quirurgico, Funcionario Juan Perez" value={form.patient_name} onChange={e => setForm({...form, patient_name: e.target.value})} />
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label>Notas Adicionales</Label>
              <textarea className="w-full min-h-[80px] px-3 py-2 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-y bg-white" placeholder="Indicaciones especiales, equipamiento necesario..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} data-testid="trip-notes-input" />
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
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState([]);

  const fetchTrips = useCallback(async () => { try { const r = await api.get("/trips"); setTrips(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchTrips(); api.get("/destinations").then(r => setDestinations(r.data)).catch(() => {}); }, [fetchTrips]);

  const handleCancel = async (tripId) => {
    try { await api.put(`/trips/${tripId}/status`, { status: "cancelado" }); toast.success("Traslado cancelado"); fetchTrips(); setSelectedTrip(null); }
    catch (e) { toast.error("Error al cancelar"); }
  };

  const handleStartEdit = (trip) => {
    setEditForm({ origin: trip.origin, destination: trip.destination, patient_name: trip.patient_name, patient_unit: trip.patient_unit, priority: trip.priority, notes: trip.notes, trip_type: trip.trip_type, clinical_team: trip.clinical_team, contact_person: trip.contact_person, scheduled_date: trip.scheduled_date });
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updateData = {};
      Object.entries(editForm).forEach(([k, v]) => { if (v !== undefined && v !== null) updateData[k] = v; });
      await api.put(`/trips/${selectedTrip.id}`, updateData);
      toast.success("Traslado actualizado"); fetchTrips(); setEditMode(false); setSelectedTrip(null);
    } catch (e) { toast.error(e.response?.data?.detail || "Error al actualizar"); }
  };

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800", completado: "bg-emerald-100 text-emerald-800", cancelado: "bg-red-100 text-red-800" };
  const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };
  const tripTypeLabels = { clinico: "Clinico", no_clinico: "No Clinico" };

  if (loading) return <div className="text-center py-12 text-slate-500">Cargando...</div>;
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6" data-testid="history-title">Mis Solicitudes</h1>
      <div className="space-y-4">
        {trips.map((t, i) => (
          <Card key={t.id} className="card-hover cursor-pointer animate-slide-up" style={{ animationDelay: `${i * 50}ms` }} onClick={() => { setSelectedTrip(t); setEditMode(false); }} data-testid={`history-trip-${t.id}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{tripTypeLabels[t.trip_type] || "General"}</span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
              </div>
              <p className="font-semibold text-slate-900 mb-1">{t.patient_name || "Sin nombre"}</p>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4 text-teal-500" />{t.origin}<ArrowRight className="w-3 h-3" />{t.destination}
              </div>
              {t.driver_name && <p className="text-sm text-slate-500 mt-2">Conductor: {t.driver_name}</p>}
            </CardContent>
          </Card>
        ))}
        {trips.length === 0 && <p className="text-center py-12 text-slate-400">Aun no ha creado solicitudes de traslado</p>}
      </div>

      {/* Detail/Edit Dialog */}
      <Dialog open={!!selectedTrip} onOpenChange={() => { setSelectedTrip(null); setEditMode(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="trip-detail-dialog">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Traslado" : "Detalle del Traslado"}</DialogTitle>
          </DialogHeader>
          {selectedTrip && !editMode && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[selectedTrip.status]}`}>{selectedTrip.status.replace(/_/g, " ")}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${priorityColors[selectedTrip.priority] || priorityColors.normal}`}>{selectedTrip.priority}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{tripTypeLabels[selectedTrip.trip_type] || "General"}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500">Origen</p><p className="font-medium">{selectedTrip.origin}</p></div>
                <div><p className="text-xs text-slate-500">Destino</p><p className="font-medium">{selectedTrip.destination}</p></div>
                <div><p className="text-xs text-slate-500">Fecha Programada</p><p className="font-medium">{selectedTrip.scheduled_date || "No definida"}</p></div>
                <div><p className="text-xs text-slate-500">Prioridad</p><p className="font-medium capitalize">{selectedTrip.priority}</p></div>
              </div>
              {selectedTrip.patient_name && <div><p className="text-xs text-slate-500">Paciente / Descripcion</p><p className="font-medium">{selectedTrip.patient_name}</p></div>}
              {selectedTrip.trip_type === "clinico" && (
                <div className="p-3 bg-teal-50 rounded-lg space-y-2">
                  {selectedTrip.clinical_team && <div><p className="text-xs text-slate-500">Equipo Clinico</p><p className="font-medium">{selectedTrip.clinical_team}</p></div>}
                  {selectedTrip.contact_person && <div><p className="text-xs text-slate-500">Persona de Contacto</p><p className="font-medium">{selectedTrip.contact_person}</p></div>}
                </div>
              )}
              {selectedTrip.driver_name && <div><p className="text-xs text-slate-500">Conductor Asignado</p><p className="font-medium">{selectedTrip.driver_name}</p></div>}
              {selectedTrip.notes && <div><p className="text-xs text-slate-500">Notas</p><p className="text-sm text-slate-600">{selectedTrip.notes}</p></div>}
              <p className="text-xs text-slate-400">Creado: {new Date(selectedTrip.created_at).toLocaleString()}</p>
              {selectedTrip.status === "pendiente" && (
                <DialogFooter className="gap-2">
                  <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleCancel(selectedTrip.id)} data-testid="cancel-trip-btn"><XIcon className="w-4 h-4 mr-1" />Cancelar Traslado</Button>
                  <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => handleStartEdit(selectedTrip)} data-testid="edit-trip-btn"><Edit className="w-4 h-4 mr-1" />Editar</Button>
                </DialogFooter>
              )}
            </div>
          )}
          {selectedTrip && editMode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Origen</Label><Input value={editForm.origin || ""} onChange={e => setEditForm({...editForm, origin: e.target.value})} data-testid="edit-origin" /></div>
                <div className="space-y-2"><Label>Destino</Label><Input value={editForm.destination || ""} onChange={e => setEditForm({...editForm, destination: e.target.value})} data-testid="edit-destination" /></div>
              </div>
              <div className="space-y-2"><Label>Paciente / Descripcion</Label><Input value={editForm.patient_name || ""} onChange={e => setEditForm({...editForm, patient_name: e.target.value})} data-testid="edit-patient" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={editForm.scheduled_date || ""} onChange={e => setEditForm({...editForm, scheduled_date: e.target.value})} data-testid="edit-date" /></div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={editForm.priority} onValueChange={val => setEditForm({...editForm, priority: val})}>
                    <SelectTrigger data-testid="edit-priority"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              {editForm.trip_type === "clinico" && (
                <>
                  <div className="space-y-2"><Label>Equipo Clinico</Label><Input value={editForm.clinical_team || ""} onChange={e => setEditForm({...editForm, clinical_team: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Persona de Contacto</Label><Input value={editForm.contact_person || ""} onChange={e => setEditForm({...editForm, contact_person: e.target.value})} /></div>
                </>
              )}
              <div className="space-y-2"><Label>Notas</Label><textarea className="w-full min-h-[60px] px-3 py-2 rounded-md border border-slate-200 text-sm bg-white" value={editForm.notes || ""} onChange={e => setEditForm({...editForm, notes: e.target.value})} /></div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleSaveEdit} data-testid="save-edit-btn">Guardar Cambios</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
