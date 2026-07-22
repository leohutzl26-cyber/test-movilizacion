import { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Stethoscope, HeartPulse, ShieldCheck, CheckCircle2, AlertTriangle, Clock, ShoppingBag, Calendar as CalendarIcon, History, Car } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

import ClinicalAssignmentsSection from "./clinical/ClinicalAssignmentsSection";
import ClinicalTripPoolSection from "./clinical/ClinicalTripPoolSection";
import ClinicalCalendarSection from "./clinical/ClinicalCalendarSection";
import ClinicalHistorySection from "./clinical/ClinicalHistorySection";

export default function ClinicalStaffDashboard() {
  const { user } = useAuth();
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.clinical.section") || "mis_viajes";
  });
  const [isWorking, setIsWorking] = useState(false);
  const [loadingTurn, setLoadingTurn] = useState(false);

  useEffect(() => {
    localStorage.setItem("movilizacion.clinical.section", section);
  }, [section]);

  const loadStatus = useCallback(async () => {
    try {
      const r = await api.get("/auth/me");
      if (r.data) {
        setIsWorking(r.data.is_working || false);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const toggleTurn = async () => {
    setLoadingTurn(true);
    try {
      const nextState = !isWorking;
      const r = await api.post("/drivers/status", {
        driver_id: user?.id,
        is_working: nextState
      });
      if (r.data) {
        setIsWorking(nextState);
        toast.success(nextState ? "¡Turno clínico activado! Figura visible para asignación de acompañamientos." : "Turno de acompañamiento finalizado.");
      }
    } catch (e) {
      toast.error("Error al cambiar estado de turno clínico");
    } finally {
      setLoadingTurn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {/* Panel Superior Control de Turno Clínico */}
        <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white p-6 rounded-2xl shadow-lg mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300 ${
              isWorking 
                ? "bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse" 
                : "bg-white/10 border-white/20 text-slate-300"
            }`}>
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                Acompañamiento Clínico — {user?.name || "Profesional de Salud"}
              </h2>
              <p className="text-xs text-teal-100/80">
                {isWorking 
                  ? "Te encuentras EN TURNO. Visible para Gestor de Camas y Coordinación para acompañar traslados." 
                  : "Te encuentras FUERA DE TURNO. Activa el interruptor para ingresar a la dotación de acompañantes activos."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-4 bg-white/10 px-4 py-2.5 rounded-xl border border-white/20 h-14 shrink-0">
            <span className={`text-[10px] font-black tracking-widest ${isWorking ? "text-emerald-400" : "text-slate-300"}`}>
              {isWorking ? "EN TURNO CLÍNICO" : "FUERA DE TURNO"}
            </span>
            <button
              type="button"
              onClick={toggleTurn}
              disabled={loadingTurn}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 inline-flex items-center focus:outline-none shrink-0 cursor-pointer ${
                isWorking ? "bg-emerald-500" : "bg-slate-400"
              }`}
            >
              <span className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                isWorking ? "translate-x-6" : "translate-x-0"
              }`} />
            </button>
          </div>
        </div>

        {/* Navegación PWA Mobile-First de 4 Pestañas */}
        <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 mb-6 flex overflow-x-auto gap-1.5 custom-scrollbar">
          <button
            onClick={() => setSection("mis_viajes")}
            className={`flex-1 min-w-[110px] py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              section === "mis_viajes" || section === "dashboard" || section === "assignments"
                ? "bg-teal-600 text-white shadow-md"
                : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Car className="w-4 h-4 shrink-0" />
            <span>Mis Viajes</span>
          </button>

          <button
            onClick={() => setSection("bolsa")}
            className={`flex-1 min-w-[120px] py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              section === "bolsa"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span>Bolsa de Viajes</span>
          </button>

          <button
            onClick={() => setSection("calendario")}
            className={`flex-1 min-w-[110px] py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              section === "calendario" || section === "calendar"
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <CalendarIcon className="w-4 h-4 shrink-0" />
            <span>Calendario</span>
          </button>

          <button
            onClick={() => setSection("historial")}
            className={`flex-1 min-w-[110px] py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              section === "historial" || section === "history"
                ? "bg-slate-800 text-white shadow-md"
                : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>Historial</span>
          </button>
        </div>

        {/* Contenido de la sección seleccionada */}
        {(section === "mis_viajes" || section === "dashboard" || section === "assignments") && <ClinicalAssignmentsSection />}
        {section === "bolsa" && <ClinicalTripPoolSection onAssignSuccess={() => setSection("mis_viajes")} />}
        {(section === "calendario" || section === "calendar") && <ClinicalCalendarSection />}
        {(section === "historial" || section === "history") && <ClinicalHistorySection />}
      </main>
    </div>
  );
}
