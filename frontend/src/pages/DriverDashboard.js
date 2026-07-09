import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { AlertTriangle } from "lucide-react";
import api from "@/lib/api";

// Componentes modulares del conductor
import TripPoolSection from "./driver/TripPoolSection";
import MyTripsSection from "./driver/MyTripsSection";
import DriverCalendarSection from "./driver/DriverCalendarSection";
import LogbookSection from "./driver/LogbookSection";
import DriverHistorySection from "./driver/DriverHistorySection";
import DriverStatsSection from "./driver/DriverStatsSection";

export default function DriverDashboard() {
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.conductor.section") || "dashboard";
  });
  const [licenseExpired, setLicenseExpired] = useState(false);

  useEffect(() => {
    localStorage.setItem("movilizacion.conductor.section", section);
  }, [section]);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const r = await api.get("/auth/me");
        if (r.data?.license_expired) setLicenseExpired(true);
      } catch {}
    };
    checkLicense();
  }, []);

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
