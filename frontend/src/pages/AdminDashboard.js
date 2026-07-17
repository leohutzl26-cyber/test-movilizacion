import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import LogbookReport from "@/components/LogbookReport";

// Componentes modulares importados
import AdminOverview from "./admin/AdminOverview";
import UsersManager from "./admin/UsersManager";
import OriginsManager from "./admin/OriginsManager";
import DestinationsManager from "./admin/DestinationsManager";
import AuditLogs from "./admin/AuditLogs";
import TripsManager from "./admin/TripsManager";
import VehiclesManager from "./admin/VehiclesManager";
import DriversManager from "./admin/DriversManager";
import OriginServicesMantenedor from "./manager/OriginServicesMantenedor";

export default function AdminDashboard() {
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.admin.section") || "dashboard";
  });

  useEffect(() => {
    localStorage.setItem("movilizacion.admin.section", section);
  }, [section]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={setSection} />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
        {section === "dashboard" && <AdminOverview onNavigate={setSection} />}
        {section === "users" && <UsersManager />}
        {section === "origins" && <OriginsManager />}
        {section === "destinations" && <DestinationsManager />}
        {section === "audit" && <AuditLogs />}
        {section === "trips" && <TripsManager />}
        {section === "vehicles" && <VehiclesManager />}
        {section === "drivers" && <DriversManager />}
        {section === "services" && <OriginServicesMantenedor />}
        {section === "reports" && <LogbookReport />}
      </main>
    </div>
  );
}
