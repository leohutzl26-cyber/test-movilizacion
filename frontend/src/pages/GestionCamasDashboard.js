import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ActiveDriversPanel from "@/components/ActiveDriversPanel";

// Sub-componentes modulares
import AssignPersonnelSection from "./gestion-camas/AssignPersonnelSection";
import GestorNewTripSection from "./gestion-camas/GestorNewTripSection";
import ClinicalStaffMantenedor from "./gestion-camas/ClinicalStaffMantenedor";
import OriginsMantenedor from "./gestion-camas/OriginsMantenedor";
import DestinationsMantenedor from "./gestion-camas/DestinationsMantenedor";
import OriginServicesMantenedor from "./gestion-camas/OriginServicesMantenedor";
import ByClinicalSection from "./ByClinicalSection";
import ClinicalCalendarSection from "./gestion-camas/ClinicalCalendarSection";
import ClinicalHistorySection from "./gestion-camas/ClinicalHistorySection";
import VehiclesSection from "./gestion-camas/VehiclesSection";

export default function GestionCamasDashboard() {
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.gestor_camas.section") || "dashboard";
  });

  useEffect(() => {
    localStorage.setItem("movilizacion.gestor_camas.section", section);
  }, [section]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {(section === "assign" || section === "dashboard") && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-4">
              <AssignPersonnelSection />
            </div>
            <div className="xl:col-span-1">
              <ActiveDriversPanel />
            </div>
          </div>
        )}
        {section === "new" && (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-4">
              <GestorNewTripSection />
            </div>
            <div className="xl:col-span-1">
              <ActiveDriversPanel />
            </div>
          </div>
        )}
        {section === "staff" && <ClinicalStaffMantenedor />}
        {section === "origins" && <OriginsMantenedor />}
        {section === "destinations" && <DestinationsMantenedor />}
        {section === "services" && <OriginServicesMantenedor />}
        {section === "by_clinical" && <ByClinicalSection />}
        {section === "calendar" && <ClinicalCalendarSection />}
        {section === "history" && <ClinicalHistorySection />}
        {section === "vehicles" && <VehiclesSection />}
      </main>
    </div>
  );
}
