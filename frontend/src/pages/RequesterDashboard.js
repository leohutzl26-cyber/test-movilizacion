import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";

// Componentes modulares del solicitante
import NewTripSection from "./requester/NewTripSection";
import MyRequestsSection from "./requester/MyRequestsSection";

export default function RequesterDashboard() {
  const [section, setSection] = useState(() => {
    return localStorage.getItem("movilizacion.solicitante.section") || "new";
  });

  useEffect(() => {
    localStorage.setItem("movilizacion.solicitante.section", section);
  }, [section]);
  const [editingTrip, setEditingTrip] = useState(null);

  const handleEdit = (trip) => {
    setEditingTrip(trip);
    setSection("new");
  };

  const handleSectionChange = (sec) => {
    if (sec !== "new") setEditingTrip(null);
    setSection(sec);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar activeSection={section} onSectionChange={handleSectionChange} />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-16 lg:pt-8 min-h-screen">
        {section === "new" && (
          <NewTripSection editingTrip={editingTrip} setEditingTrip={setEditingTrip} onSaved={() => setSection("list")} />
        )}
        {section === "list" && <MyRequestsSection onEdit={handleEdit} />}
      </main>
    </div>
  );
}
