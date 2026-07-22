import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ByDriverSection from "./ByDriverSection";
import ByClinicalSection from "./ByClinicalSection";
import LogbookReport from "@/components/LogbookReport";
import ActiveDriversPanel from "@/components/ActiveDriversPanel";

// Imports de subcomponentes extraídos en pages/manager/
import DispatchSection from "./manager/DispatchSection";
import NewTripSection from "./manager/NewTripSection";
import AssignSection from "./manager/AssignSection";
import CalendarSection from "./manager/CalendarSection";
import VehiclesSection from "./manager/VehiclesSection";
import DriversSection from "./manager/DriversSection";
import LogbookMonitorSection from "./manager/LogbookMonitorSection";
import HistorySection from "./manager/HistorySection";
import ClinicalStaffMantenedor from "./manager/ClinicalStaffMantenedor";
import OriginsMantenedor from "./manager/OriginsMantenedor";
import DestinationsMantenedor from "./manager/DestinationsMantenedor";
import OriginServicesMantenedor from "./manager/OriginServicesMantenedor";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export default function ShiftManagerDashboard() {
    const [section, setSection] = useState(() => {
        return localStorage.getItem("movilizacion.coordinador.section") || "dispatch";
    });

    useEffect(() => {
        localStorage.setItem("movilizacion.coordinador.section", section);
    }, [section]);
    const [stats, setStats] = useState({ total: 0, active: 0, pending: 0, completed: 0 });

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get("/stats/dashboard");
            setStats(res.data);
        } catch (e) { }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            <Sidebar activeSection={section} onSectionChange={setSection} />
            <main className="flex-1 lg:ml-64 p-4 md:p-8 pt-16 lg:pt-8 min-h-screen max-w-[100vw] overflow-x-hidden">
                <div className="max-w-[1650px] mx-auto w-full">
                    {section === "dispatch" && <DispatchSection />}
                    {section === "new" && <NewTripSection onNavigate={setSection} />}
                    {section === "assign" && (
                        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                            <div className="xl:col-span-3">
                                <AssignSection />
                            </div>
                            <div className="xl:col-span-1">
                                <ActiveDriversPanel />
                            </div>
                        </div>
                    )}
                    {section === "calendar" && <CalendarSection />}
                    {section === "by_driver" && <ByDriverSection />}
                    {section === "by_clinical" && <ByClinicalSection />}
                    {section === "vehicles" && <VehiclesSection />}
                    {section === "drivers" && <DriversSection />}
                    {section === "logbook_monitor" && <LogbookMonitorSection />}
                    {section === "history" && <HistorySection />}
                    {section === "reports" && <LogbookReport />}
                    {section === "staff" && <ClinicalStaffMantenedor />}
                    {section === "origins" && <OriginsMantenedor />}
                    {section === "destinations" && <DestinationsMantenedor />}
                    {section === "services" && <OriginServicesMantenedor />}
                    {section === "analytics" && <AnalyticsDashboard />}
                </div>
            </main>
        </div>
    );
}
