import { useState, useEffect, useCallback } from "react";
import { Users, Truck, Phone, AlertCircle, Circle, MapPin, Search } from "lucide-react";
import api from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function ActiveDriversPanel() {
  const [activeTab, setActiveTab] = useState("drivers"); // "drivers" | "vehicles"
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await api.get("/drivers/active");
      if (r.data) {
        setDrivers(r.data.drivers || []);
        setVehicles(r.data.vehicles || []);
      }
    } catch (e) {
      console.error("Error fetching active drivers/vehicles:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-actualizar cada 15 segundos para tiempo real
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.vehicle && d.vehicle.plate.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.zonal_number && v.zonal_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <Card className="shadow-lg border border-slate-200 rounded-2xl overflow-hidden h-full flex flex-col bg-white">
      <CardHeader className="p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between gap-2 mb-3">
          <CardTitle className="text-sm font-black text-slate-800 tracking-wider uppercase flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-600" /> Control Operativo
          </CardTitle>
          <button 
            onClick={fetchStatus} 
            className="text-[10px] text-teal-600 font-bold hover:underline"
          >
            Actualizar
          </button>
        </div>

        {/* Pestañas de Selección */}
        <div className="flex bg-slate-200/60 p-1 rounded-xl">
          <button
            onClick={() => { setActiveTab("drivers"); setSearchQuery(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "drivers" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Conductores ({drivers.filter(d => d.is_working).length})
          </button>
          <button
            onClick={() => { setActiveTab("vehicles"); setSearchQuery(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "vehicles" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Vehículos ({vehicles.length})
          </button>
        </div>

        {/* Buscador reactivo */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "drivers" ? "Buscar conductor o patente..." : "Buscar por patente, marca o zonal..."}
            className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-white"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-y-auto flex-1 max-h-[450px]">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-semibold flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            Cargando estado operativo...
          </div>
        ) : activeTab === "drivers" ? (
          filteredDrivers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No se encontraron conductores.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredDrivers.map(d => (
                <div key={d.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[150px]">{d.name}</span>
                      {d.status === 'disponible' && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                      {d.status === 'en_ruta' && (
                        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      )}
                      {d.status === 'fuera_de_turno' && (
                        <span className="h-2 w-2 rounded-full bg-slate-300"></span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      {d.is_working ? (
                        d.vehicle ? (
                          <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
                            <Truck className="w-3 h-3 text-slate-500" /> {d.vehicle.plate} ({d.vehicle.zonal_number || "S/Z"})
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold border border-amber-100">
                            <AlertCircle className="w-3 h-3" /> Sin móvil asignado
                          </span>
                        )
                      ) : (
                        <span>Fuera de turno</span>
                      )}
                    </div>

                    {d.status === 'en_ruta' && d.active_trip && (
                      <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> En traslado #{d.active_trip.tracking_number}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Badge de Estado */}
                    <Badge className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border shadow-none ${
                      d.status === 'disponible' 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                        : d.status === 'en_ruta' 
                        ? "bg-amber-50 border-amber-200 text-amber-700" 
                        : "bg-slate-50 border-slate-200 text-slate-400"
                    }`}>
                      {d.status === 'disponible' ? "DISPONIBLE" : d.status === 'en_ruta' ? "EN RUTA" : "INACTIVO"}
                    </Badge>

                    {/* Botón de Llamada */}
                    {d.phone && (
                      <a 
                        href={`tel:${d.phone}`} 
                        className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 hover:bg-teal-100 transition-colors"
                        title={`Llamar a ${d.name}`}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-medium">
              No se encontraron vehículos.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredVehicles.map(v => (
                <div key={v.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-xs">{v.plate}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{v.brand} {v.model}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px]">
                      {v.zonal_number && (
                        <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                          Zonal: {v.zonal_number}
                        </span>
                      )}
                      <span className="text-slate-400">Tipo: {v.type}</span>
                    </div>

                    {v.assigned_driver ? (
                      <div className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                        <Circle className="w-2 h-2 fill-teal-500 text-teal-500" /> A cargo: {v.assigned_driver.name}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Circle className="w-2 h-2 fill-slate-300 text-slate-300" /> Móvil libre
                      </div>
                    )}
                  </div>

                  <Badge className={`text-[9px] font-black tracking-widest px-2 py-0.5 rounded-full border shadow-none ${
                    v.assigned_driver
                      ? "bg-teal-50 border-teal-200 text-teal-700"
                      : v.status === 'en_mantenimiento' 
                      ? "bg-red-50 border-red-200 text-red-700"
                      : "bg-slate-50 border-slate-200 text-slate-500"
                  }`}>
                    {v.assigned_driver ? "EN USO" : v.status === 'en_mantenimiento' ? "TALLER" : "DISPONIBLE"}
                  </Badge>
                </div>
              ))}
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
