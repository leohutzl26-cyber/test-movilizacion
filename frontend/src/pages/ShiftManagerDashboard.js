import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, ArrowRight, Clock, Activity, User, Truck, ShieldAlert, CheckCircle, Search, Download, Filter, RefreshCw, CalendarDays, Calendar } from "lucide-react";
import api from "@/lib/api";

export default function ShiftManagerDashboard() {
  const [section, setSection] = useState("dispatch");
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dispatch" && <DispatchConsole />}
        {section === "new" && <NewDirectTripSection onSuccess={() => setSection("dispatch")} />}
        {section === "calendar" && <GeneralCalendarSection />}
        {section === "vehicles" && <VehiclesStatusSection />}
        {section === "drivers" && <DriversListSection />}
        {section === "history" && <GeneralHistorySection />}
      </main>
    </div>
  );
}

// =====================================
// 1. CONSOLA DE DESPACHO
// =====================================
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
      setPool(Array.isArray(p.data) ? p.data : []); 
      setActive(Array.isArray(a.data) ? a.data : []); 
      setDrivers(Array.isArray(d.data) ? d.data.filter(x => x.status === "aprobado") : []);
    } catch(e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, [fetchData]);

  const handleAssign = async () => {
    if (!selectedDriver) { toast.error("Seleccione un conductor"); return; }
    try {
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
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2"><Clock className="text-amber-500 w-6 h-6"/> Listos para Despacho</h2>
          <Badge className="bg-amber-100 text-amber-800 shadow-sm">{pool.length}</Badge>
        </div>
        <div className="space-y-4">
          {pool.map(t => (
            <Card key={t?.id} className="shadow-sm border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded">{t?.tracking_number || "S/N"}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${t?.priority === "urgente" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{t?.priority || "NORMAL"}</span>
                </div>
                <p className="font-black text-lg text-slate-900 leading-tight mb-1">{t?.trip_type === "clinico" ? (t?.patient_name || "Sin nombre") : (t?.task_details || "Sin detalles")}</p>
                <div className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-3 bg-slate-50 p-2 rounded-lg">
                  <MapPin className="w-3.5 h-3.5 text-teal-600"/> <span className="truncate">{t?.origin || "-"}</span> <ArrowRight className="w-3 h-3 text-slate-400 mx-1"/> <span className="truncate">{t?.destination || "-"}</span>
                </div>
                {t?.trip_type === "clinico" && t?.clinical_team && (
                  <p className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded mb-3
