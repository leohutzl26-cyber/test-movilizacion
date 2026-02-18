import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList, Users, Truck, Clock, AlertTriangle, RefreshCw, User } from "lucide-react";
import api from "@/lib/api";

export default function ShiftManagerDashboard() {
  const [section, setSection] = useState("dispatch");
  return (
    <div className="min-h-screen bg-slate-50" data-testid="manager-dashboard">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-8">
          {section === "dispatch" && <DispatchSection />}
          {section === "drivers" && <DriversSection />}
        </div>
      </main>
    </div>
  );
}

function DispatchSection() {
  const [stats, setStats] = useState(null);
  const [trips, setTrips] = useState([]);
  const [poolTrips, setPoolTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    try {
      const [s, t, p] = await Promise.all([api.get("/stats"), api.get("/trips/active"), api.get("/trips/pool")]);
      setStats(s.data);
      setTrips(t.data);
      setPoolTrips(p.data);
    } catch {} finally { setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAll(); const interval = setInterval(fetchAll, 15000); return () => clearInterval(interval); }, [fetchAll]);

  const statusColors = { pendiente: "bg-amber-100 text-amber-800", asignado: "bg-teal-100 text-teal-800", en_curso: "bg-blue-100 text-blue-800" };
  const priorityColors = { urgente: "bg-red-500 text-white", alta: "bg-orange-400 text-white", normal: "bg-slate-200 text-slate-700" };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900" data-testid="dispatch-title">Consola de Despacho</h1>
        <Button variant="outline" onClick={fetchAll} disabled={refreshing} data-testid="refresh-btn">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />Actualizar
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Pendientes", value: stats.pending_trips, icon: Clock, color: "text-amber-600 bg-amber-50" },
            { label: "Activos", value: stats.active_trips, icon: Truck, color: "text-blue-600 bg-blue-50" },
            { label: "Conductores", value: stats.total_drivers, icon: Users, color: "text-teal-600 bg-teal-50" },
            { label: "Vehiculos Disp.", value: stats.vehicles_available, icon: Truck, color: "text-emerald-600 bg-emerald-50" },
          ].map(c => (
            <div key={c.label} className="stat-card animate-slide-up" data-testid={`dispatch-stat-${c.label.toLowerCase().replace(/ /g,'-')}`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${c.color}`}><c.icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold text-slate-900">{c.value}</p>
              <p className="text-xs text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-amber-500" />Bolsa de Trabajo ({poolTrips.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {poolTrips.map(t => (
              <div key={t.id} className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm animate-slide-up" data-testid={`pool-trip-${t.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${priorityColors[t.priority] || priorityColors.normal}`}>{t.priority}</span>
                  <span className="text-xs text-slate-400">{new Date(t.created_at).toLocaleTimeString()}</span>
                </div>
                <p className="font-medium text-slate-900">{t.patient_name}</p>
                <p className="text-sm text-slate-500 mt-1">{t.origin} → {t.destination}</p>
                {t.notes && <p className="text-xs text-slate-400 mt-1">{t.notes}</p>}
              </div>
            ))}
            {poolTrips.length === 0 && <p className="text-center py-8 text-slate-400">Sin viajes pendientes</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" />Viajes Activos ({trips.filter(t => t.status !== "pendiente").length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
            {trips.filter(t => t.driver_id).map(t => (
              <div key={t.id} className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm" data-testid={`active-trip-${t.id}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusColors[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1"><User className="w-3 h-3" />{t.driver_name}</span>
                </div>
                <p className="font-medium text-slate-900">{t.patient_name}</p>
                <p className="text-sm text-slate-500">{t.origin} → {t.destination}</p>
              </div>
            ))}
            {trips.filter(t => t.driver_id).length === 0 && <p className="text-center py-8 text-slate-400">Sin viajes activos</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DriversSection() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchDrivers = useCallback(async () => { try { const r = await api.get("/drivers"); setDrivers(r.data); } catch {} finally { setLoading(false); } }, []);
  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const handleShiftChange = async (id, shift_type) => {
    try { await api.put(`/drivers/${id}/shift`, { shift_type }); toast.success("Turno actualizado"); fetchDrivers(); }
    catch (e) { toast.error("Error"); }
  };

  const handleLicenseUpdate = async (id, date) => {
    try { await api.put(`/drivers/${id}/license`, { license_expiry: date }); toast.success("Licencia actualizada"); fetchDrivers(); }
    catch (e) { toast.error("Error"); }
  };

  const isLicenseExpired = (expiry) => {
    if (!expiry) return false;
    try { return new Date(expiry) < new Date(); } catch { return false; }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6" data-testid="drivers-title">Gestion de Conductores</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drivers.map(d => (
          <Card key={d.id} className={`card-hover ${isLicenseExpired(d.license_expiry) ? "border-red-300 border-2" : ""}`} data-testid={`driver-${d.id}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500">{d.email}</p>
                </div>
                {d.extra_available && <Badge className="bg-teal-100 text-teal-700 border-0">Extra</Badge>}
              </div>
              {isLicenseExpired(d.license_expiry) && (
                <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-700 font-medium">Licencia vencida</span>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Turno</p>
                  <Select value={d.shift_type || "diurno"} onValueChange={(val) => handleShiftChange(d.id, val)}>
                    <SelectTrigger className="h-9 text-sm" data-testid={`shift-select-${d.id}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diurno">Diurno</SelectItem>
                      <SelectItem value="4to_turno">4to Turno (L-N-L-L)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Venc. Licencia</p>
                  <input
                    type="date"
                    className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    value={d.license_expiry ? d.license_expiry.split("T")[0] : ""}
                    onChange={(e) => handleLicenseUpdate(d.id, e.target.value)}
                    data-testid={`license-date-${d.id}`}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {drivers.length === 0 && !loading && <p className="text-slate-400 col-span-full text-center py-12">Sin conductores registrados</p>}
      </div>
    </div>
  );
}
