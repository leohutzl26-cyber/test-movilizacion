import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MapPin, ArrowRight, ShieldAlert, CheckCircle, Activity } from "lucide-react";
import api from "@/lib/api";

export default function GestionCamasDashboard() {
  const [section, setSection] = useState("assign");

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "assign" && <AssignPersonnelSection />}
      </main>
    </div>
  );
}

function AssignPersonnelSection() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState(null);
  const [clinicalTeam, setClinicalTeam] = useState("");

  const fetchTrips = useCallback(async () => {
    try {
      const [pool, active] = await Promise.all([api.get("/trips/pool"), api.get("/trips/active")]);
      const allTrips = [...pool.data, ...active.data];
      setTrips(allTrips.filter(t => t.trip_type === "clinico"));
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTrips(); const interval = setInterval(fetchTrips, 15000); return () => clearInterval(interval); }, [fetchTrips]);

  const handleAssign = async () => {
    if (!clinicalTeam.trim()) { toast.error("Debe ingresar el nombre del personal"); return; }
    try {
      await api.put(`/trips/${assignDialog.id}/clinical-team`, { clinical_team: clinicalTeam });
      toast.success("Personal clínico asignado correctamente");
      setAssignDialog(null); setClinicalTeam(""); fetchTrips();
    } catch (e) { toast.error("Error al asignar personal"); }
  };

  const pendingTrips = trips.filter(t => !t.clinical_team || t.clinical_team.trim() === "");
  const assignedTrips = trips.filter(t => t.clinical_team && t.clinical_team.trim() !== "");

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600"/></div>;

  const TripCard = ({ t, isPending }) => (
    <Card className={`shadow-sm border-l-4 ${isPending ? "border-l-amber-500" : "border-l-teal-500"}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-3">
          <span className="bg-slate-800 text-white font-mono px-2 py-0.5 rounded text-[11px] font-bold shadow-sm">{t.tracking_number}</span>
          <span className="text-xs font-bold text-slate-500">{t.scheduled_date || new Date(t.created_at).toLocaleDateString()}</span>
        </div>
        <p className="font-black text-xl text-slate-900 mb-1">{t.patient_name}</p>
        <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-wider">Motivo: {t.transfer_reason}</p>

        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-2">
          <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-teal-600"/> <span className="text-sm font-bold text-slate-800">{t.origin} <span className="font-medium text-slate-500 text-xs">({t.patient_unit})</span></span></div>
          <div className="flex items-center gap-2"><ArrowRight className="w-4 h-4 text-blue-600"/> <span className="text-sm font-bold text-slate-800">{t.destination}</span></div>
        </div>

        {t.required_personnel?.length > 0 && (
          <div className="mb-4 bg-amber-50 p-2.5 rounded-lg border border-amber-200 shadow-sm">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1 flex items-center"><ShieldAlert className="w-3 h-3 mr-1"/> Roles Requeridos:</p>
            <p className="text-sm font-bold text-amber-900">{t.required_personnel.join(", ")}</p>
          </div>
        )}

        {isPending ? (
          <Button onClick={() => { setAssignDialog(t); setClinicalTeam(""); }} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold h-12 text-sm shadow-sm rounded-xl">
            Asignar Nombres del Equipo
          </Button>
        ) : (
          <div className="bg-teal-50 p-3 rounded-xl border border-teal-200 shadow-sm">
            <p className="text-[10px] font-black text-teal-800 uppercase tracking-widest mb-1">Personal Asignado:</p>
            <p className="text-sm font-black text-teal-900">{t.clinical_team}</p>
            <Button variant="ghost" onClick={() => { setAssignDialog(t); setClinicalTeam(t.clinical_team); }} className="w-full mt-3 h-9 text-xs font-bold border border-teal-300 text-teal-700 hover:bg-teal-100">
              Editar Nombres
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">Gestión de Camas y Pacientes</h1>
        <p className="text-slate-500 font-medium mt-1">Asignación de personal clínico acompañante para traslados en ambulancia.</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-slate-200/60 p-1">
          <TabsTrigger value="pending" className="text-sm font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-white">Falta Asignar ({pendingTrips.length})</TabsTrigger>
          <TabsTrigger value="assigned" className="text-sm font-bold data-[state=active]:bg-teal-600 data-[state=active]:text-white">Ya Asignados ({assignedTrips.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pendingTrips.map(t => <TripCard key={t.id} t={t} isPending={true} />)}
            {pendingTrips.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200"><CheckCircle className="w-16 h-16 mx-auto mb-4 text-teal-200"/><p className="text-xl font-bold">Excelente, estás al día.</p><p className="text-sm mt-1">Todos los traslados clínicos tienen personal asignado.</p></div>}
          </div>
        </TabsContent>
        
        <TabsContent value="assigned" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {assignedTrips.map(t => <TripCard key={t.id} t={t} isPending={false} />)}
            {assignedTrips.length === 0 && <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200"><p className="text-lg font-bold">No hay traslados con personal asignado actualmente.</p></div>}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-2xl font-black">Asignar Personal Clínico</DialogTitle></DialogHeader>
          {assignDialog && (
            <div className="space-y-6 pt-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-inner">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Paciente a Trasladar</p>
                <p className="text-xl font-black text-slate-900">{assignDialog.patient_name}</p>
                <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                  <p className="text-xs font-bold text-slate-600">Roles Solicitados:</p>
                  <Badge className="bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">{assignDialog.required_personnel?.join(", ") || "No especificado"}</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="font-bold text-slate-700 text-sm">Nombres Completos del Personal Acompañante *</Label>
                <Input placeholder="Ej: Ana María Rojas (Tens), Dr. Juan Pérez..." value={clinicalTeam} onChange={e => setClinicalTeam(e.target.value)} className="h-14 text-base border-slate-300 font-medium shadow-inner"/>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Este dato será visible para el conductor de la ambulancia.</p>
              </div>
              
              <DialogFooter className="mt-8">
                <Button variant="outline" className="h-12 font-bold" onClick={() => setAssignDialog(null)}>Cancelar</Button>
                <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 shadow-md" onClick={handleAssign}>Guardar Nombres</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
