import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { AlertTriangle, Truck } from "lucide-react";
import api from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

// Componentes modulares del conductor
import TripPoolSection from "./driver/TripPoolSection";
import MyTripsSection from "./driver/MyTripsSection";
import DriverCalendarSection from "./driver/DriverCalendarSection";
import LogbookSection from "./driver/LogbookSection";
import DriverHistorySection from "./driver/DriverHistorySection";
import DriverStatsSection from "./driver/DriverStatsSection";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.conductor.section") || "dashboard";
  });
  const [licenseExpired, setLicenseExpired] = useState(false);
  
  // Disponibilidad de turno y vehículo
  const [isWorking, setIsWorking] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [loadingTurn, setLoadingTurn] = useState(false);

  useEffect(() => {
    localStorage.setItem("movilizacion.conductor.section", section);
  }, [section]);

  const loadDriverStatus = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      if (r.data) {
        setIsWorking(r.data.is_working || false);
        setSelectedVehicle(r.data.current_vehicle_id || "");
        if (r.data.license_expired) setLicenseExpired(true);
      }
    } catch {}
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      const { data } = await supabase.from('vehicles').select('*').order('plate');
      if (data) {
        setVehicles(data.filter(v => v.status === 'disponible' || v.status === 'en_curso'));
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadDriverStatus();
    loadVehicles();
  }, [loadDriverStatus, loadVehicles]);

  const toggleTurn = async () => {
    setLoadingTurn(true);
    try {
      const nextState = !isWorking;
      const vehicleId = nextState ? selectedVehicle : null;
      
      const r = await api.post("/drivers/status", {
        driver_id: user?.id,
        is_working: nextState,
        current_vehicle_id: vehicleId || null
      });
      
      if (r.data) {
        setIsWorking(nextState);
        if (!nextState) setSelectedVehicle("");
        toast.success(nextState ? "¡Turno iniciado con éxito!" : "Turno finalizado.");
      }
    } catch (e) {
      toast.error("Error al cambiar estado de turno");
    } finally {
      setLoadingTurn(false);
    }
  };

  const handleVehicleChange = async (vehicleId) => {
    setSelectedVehicle(vehicleId);
    if (isWorking) {
      try {
        await api.post("/drivers/status", {
          driver_id: user?.id,
          is_working: true,
          current_vehicle_id: vehicleId || null
        });
        toast.success("Vehículo asignado a tu turno");
      } catch (e) {
        toast.error("Error al actualizar vehículo");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {licenseExpired && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl shadow-sm flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-red-800 text-sm">Licencia de conducir vencida</p>
              <p className="text-xs text-red-600">
                Su licencia ha expirado. Contacte al coordinador para actualizar sus datos. Puede seguir operando mientras se
                regulariza.
              </p>
            </div>
          </div>
        )}

        {/* PANEL DE CONTROL DE TURNO DIARIO */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
              isWorking 
                ? "bg-emerald-50 border-emerald-200 text-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse" 
                : "bg-slate-50 border-slate-200 text-slate-400"
            }`}>
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Control de Turno Diario</h2>
              <p className="text-xs text-slate-500">
                {isWorking 
                  ? "Te encuentras EN TURNO y visible para asignación rápida de traslados." 
                  : "Te encuentras FUERA DE TURNO. Activa el interruptor al iniciar tu jornada laboral."}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* Selector de Vehículo */}
            <div className="flex flex-col gap-1 w-full sm:w-[220px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Móvil Utilizado</span>
              <Select value={selectedVehicle || "none"} onValueChange={(v) => handleVehicleChange(v === "none" ? "" : v)}>
                <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-slate-200">
                  <SelectValue placeholder="Seleccione móvil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-slate-500">Sin vehículo asignado</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plate} — {v.brand} {v.model} ({v.zonal_number || "S/Z"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Switch de Turno */}
            <div className="flex items-center justify-between sm:justify-start gap-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 h-14">
              <span className={`text-[10px] font-black tracking-widest ${isWorking ? "text-emerald-600" : "text-slate-400"}`}>
                {isWorking ? "EN TURNO" : "FUERA DE TURNO"}
              </span>
              <button
                onClick={toggleTurn}
                disabled={loadingTurn}
                className={`w-12 h-6 rounded-full transition-colors duration-300 relative focus:outline-none shrink-0 ${
                  isWorking ? "bg-emerald-500" : "bg-slate-300"
                }`}
              >
                <span className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow transition-transform duration-300 ${
                  isWorking ? "transform translate-x-6" : "transform translate-x-1"
                }`} />
              </button>
            </div>
          </div>
        </div>

        {section === "dashboard" && <DriverStatsSection />}
        {section === "pool" && <TripPoolSection onNavigate={setSection} />}
        {section === "trips" && <MyTripsSection />}
        {section === "calendar" && <DriverCalendarSection />}
        {section === "logbook" && <LogbookSection />}
        {section === "history" && <DriverHistorySection />}
      </main>
    </div>
  );
}
