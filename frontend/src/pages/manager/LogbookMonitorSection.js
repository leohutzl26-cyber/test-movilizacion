import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ClipboardList, AlertTriangle, Droplets, RefreshCw, User } from "lucide-react";

export default function LogbookMonitorSection() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicles, setVehicles] = useState([]);

  const fetchLogs = useCallback(async () => {
    try {
      const [lRes, vRes] = await Promise.all([
        api.get(`/logbook-list/all${filter !== "all" ? `?type=${filter}` : ""}`),
        api.get("/vehicles")
      ]);
      setLogs(lRes.data || []);
      setVehicles(vRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 20000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const getVehiclePlate = (id) => vehicles.find(v => v.id === id)?.plate || "N/A";

  const filteredLogs = logs.filter(log => {
    const plate = getVehiclePlate(log.vehicle_id).toLowerCase();
    const driver = (log.driver_name || "").toLowerCase();
    const desc = (log.description || "").toLowerCase();
    const type = (log.incident_type || "").toLowerCase();
    const search = searchTerm.toLowerCase();
    
    return plate.includes(search) || driver.includes(search) || desc.includes(search) || type.includes(search);
  });

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Consolidado de Bitácora</h1>
          <p className="text-slate-500 font-medium italic">Seguimiento en tiempo real de incidentes y recargas</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Buscar patente, conductor..." 
              className="pl-10 h-11 bg-white border-2 border-slate-200 rounded-xl w-full md:w-64 focus:border-teal-500 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            {[
              { id: "all", label: "Todos", icon: ClipboardList },
              { id: "incident", label: "Incidentes", icon: AlertTriangle },
              { id: "fuel", label: "Combustible", icon: Droplets }
            ].map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === t.id ? "bg-teal-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="h-40 flex items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200"><RefreshCw className="w-8 h-8 text-slate-300 animate-spin" /></div>
        ) : filteredLogs.length === 0 ? (
          <Card className="rounded-[2rem] border-dashed border-2 p-12 text-center bg-white">
            <Search className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No se encontraron registros</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredLogs.map((log) => (
              <Card key={log.id} className={`overflow-hidden rounded-3xl border-none shadow-sm transition-all hover:shadow-md ${log.type === "incident" ? "bg-amber-50" : "bg-emerald-50"}`}>
                <div className="flex flex-col md:flex-row">
                  <div className={`w-full md:w-32 p-4 flex md:flex-col items-center justify-center gap-2 text-center border-b md:border-b-0 md:border-r border-white/50 ${log.type === "incident" ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"}`}>
                    {log.type === "incident" ? <AlertTriangle className="w-8 h-8" /> : <Droplets className="w-8 h-8" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">{log.type === "incident" ? "Incidente" : "Carga"}</span>
                  </div>
                  <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-white/80 text-slate-900 border-none font-black text-xs px-3">{getVehiclePlate(log.vehicle_id)}</Badge>
                        <span className="text-xs font-bold text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      {log.type === "incident" ? (
                        <div>
                          <p className="text-sm font-black text-slate-900 mb-1 flex items-center gap-2 italic uppercase">
                             <span className={`w-2 h-2 rounded-full ${log.severity === 'alta' ? 'bg-red-500 animate-pulse' : log.severity === 'media' ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                             {log.incident_type}: Gravedad {log.severity}
                          </p>
                          <p className="text-sm text-slate-700 font-medium leading-relaxed bg-white/50 p-3 rounded-xl border border-white">{log.description}</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                          <div className="bg-white/50 p-2 rounded-xl border border-white">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Kilometraje</p>
                            <p className="text-sm font-black text-slate-900">{log.mileage} km</p>
                          </div>
                          <div className="bg-white/50 p-2 rounded-xl border border-white">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Litros</p>
                            <p className="text-sm font-black text-slate-900">{log.liters} L</p>
                          </div>
                          <div className="bg-white/50 p-2 rounded-xl border border-white">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Inversión</p>
                            <p className="text-sm font-black text-slate-900">${log.amount?.toLocaleString()}</p>
                          </div>
                          <div className="bg-white/50 p-2 rounded-xl border border-white">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Folio Boleta</p>
                            <p className="text-sm font-black text-slate-900">{log.receipt_number || "-"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Informado por</p>
                      <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-white">
                        <User className="w-3.5 h-3.5 text-slate-600" />
                        <span className="text-xs font-black text-slate-800">{log.driver_name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
