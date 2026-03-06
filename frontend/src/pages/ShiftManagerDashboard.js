import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge"; // <--- ESTA ERA LA LÍNEA QUE FALTABA
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MapPin, ArrowRight, Clock, Activity, User, Truck, ShieldAlert, CheckCircle, Wrench } from "lucide-react";
import api from "@/lib/api";

export default function ShiftManagerDashboard() {
  const [section, setSection] = useState("dispatch");
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dispatch" && <DispatchConsole />}
        
        {/* Agregamos esto temporalmente para que no quede en blanco si tocas otro botón */}
        {section !== "dispatch" && (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400 animate-slide-up">
            <Wrench className="w-16 h-16 mb-4 text-slate-300" />
            <h2 className="text-2xl font-bold text-slate-500">Sección en Construcción</h2>
            <p className="text-slate-400 mt-2">Esta herramienta se conectará en el próximo paso.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function DispatchConsole() {
  const [pool, setPool] = useState([]);
  const [active, setActive] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [assignModal, setAssignModal] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [p, a, d] = await Promise.all([api.get("/trips/pool"), api.get("/trips/active"), api.get("/drivers")]);
      // NOTA: El pool ya viene solo con viajes listos (status: 'pendiente', NO incluye 'pendiente_revision')
      setPool(p.data); setActive(a.data); setDrivers(d.data.filter(x => x.status === "aprobado"));
    } catch(e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedDriver) { toast.error("Seleccione un conductor"); return; }
    try {
      // El vehículo se deja en null porque lo elige el conductor al iniciar
      await api.put(`/trips/${assignModal.id}/manager-assign`, { driver_id: selectedDriver, vehicle_id: null });
      toast.success("Viaje despachado correctamente");
      setAssignModal(null); setSelectedDriver(""); fetchData();
    } catch(e) { toast.error("Error al asignar"); }
  };

  const handleUnassign = async (id) => {
    if(!window.confirm("¿Devolver este viaje a la bolsa?")) return;
    try { await api.put(`/trips/${id}/unassign`); fetchData(); } catch(e) {}
  };

  if (loading) return <div className="flex justify-center py-20"><Activity className="w-10 h-10 animate-spin text-teal-600"/></div>;

  return (
    <div className="max-w-7xl mx-auto animate-slide-up grid grid-cols-1 xl:grid-cols-2 gap-8">
      
      {/* BOLSA DE PENDIENTES (LISTOS PARA DESPACHO) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Clock className="text-amber-500 w-6 h-6"/> Listos para Despacho</h2>
          <Badge className="bg-amber-100 text-amber-800 shadow-sm">{pool.length}</Badge>
        </div>
        <div className="space-y-4">
          {pool.map(t => (
            <Card key={t.id} className="shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded">{t.tracking_number}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${t.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                </div>
                <p className="font-black text-lg text-slate-900 leading-tight mb-1">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-3 bg-slate-50 p-2 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-teal-600"/> <span className="truncate">{t.origin}</span> <ArrowRight className="w-3 h-3 text-slate-400 mx-1"/> <span className="truncate">{t.destination}</span>
                </div>
                {t.trip_type === "clinico" && t.clinical_team && (
                  <p className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded mb-3 inline-block">Equipo: {t.clinical_team}</p>
                )}
                <Button onClick={() => setAssignModal(t)} className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-10 shadow-sm">Asignar Conductor</Button>
              </CardContent>
            </Card>
          ))}
          {pool.length === 0 && <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-slate-200"><CheckCircle className="w-10 h-10 mx-auto text-emerald-200 mb-2"/><p className="text-slate-500 font-bold">Sin viajes pendientes.</p></div>}
        </div>
      </div>

      {/* VIAJES ACTIVOS Y ASIGNADOS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Activity className="text-blue-500 w-6 h-6"/> Activos y Asignados</h2>
          <Badge className="bg-blue-100 text-blue-800 shadow-sm">{active.length}</Badge>
        </div>
        <div className="space-y-4">
          {active.map(t => (
            <Card key={t.id} className={`shadow-sm border-l-4 ${t.status === "en_curso" ? "border-l-blue-500 bg-blue-50/20" : "border-l-teal-500"}`}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">{t.tracking_number}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.status.replace("_", " ")}</span>
                </div>
                <p className="font-bold text-base text-slate-900 leading-tight mb-2">{t.trip_type === "clinico" ? t.patient_name : t.task_details}</p>
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-2 py-1.5 rounded"><User className="w-3.5 h-3.5"/> {t.driver_name}</div>
                  {t.status === "asignado" && <Button variant="ghost" size="sm" onClick={() => handleUnassign(t.id)} className="h-7 text-[10px] text-red-500 hover:bg-red-50">Desasignar</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
          {active.length === 0 && <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-500 font-bold">No hay operaciones activas.</p></div>}
        </div>
      </div>

      <Dialog open={!!assignModal} onOpenChange={() => setAssignModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Asignar Conductor</DialogTitle></DialogHeader>
          {assignModal && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                <p className="font-bold text-slate-800">{assignModal.patient_name || assignModal.task_details}</p>
                <p className="text-slate-500 mt-1">{assignModal.origin} → {assignModal.destination}</p>
              </div>
              <div className="space-y-2">
                <Label>Seleccione un Conductor</Label>
                <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Elige..." /></SelectTrigger>
                  <SelectContent>{drivers.map(d => (<SelectItem key={d.id} value={d.id}>{d.name} {d.extra_available ? "(Extra)" : ""}</SelectItem>))}</SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 mt-1">El conductor elegirá la ambulancia al iniciar el viaje.</p>
              </div>
              <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setAssignModal(null)}>Cancelar</Button><Button className="bg-teal-600 text-white" onClick={handleAssign}>Asignar y Despachar</Button></DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
