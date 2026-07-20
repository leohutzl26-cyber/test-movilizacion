import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, Activity, ShieldAlert, Truck, FileText } from "lucide-react";
import api from "@/lib/api";

export default function LogbookSection() {
  const [activeTab, setActiveTab] = useState("incident");
  const [vehicles, setVehicles] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [incidentForm, setIncidentForm] = useState({ vehicle_id: "", incident_type: "mecanico", severity: "baja", description: "" });
  const [fuelForm, setFuelForm] = useState({ vehicle_id: "", mileage: "", liters: "", amount: "", receipt_number: "" });
  const [submitting, setSubmitting] = useState(false);

  const [shiftVehicle, setShiftVehicle] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, tRes, meRes] = await Promise.all([
          api.get("/vehicles"),
          api.get("/trips/driver"),
          api.get("/auth/me")
        ]);
        const vList = vRes.data || [];
        setVehicles(vList);

        const currentTrip = (tRes.data || []).find((t) => t.status === "en_curso");
        const shiftVehicleId = meRes.data?.current_vehicle_id;
        const defaultVehicleId = shiftVehicleId || currentTrip?.vehicle_id || (vList.length > 0 ? vList[0].id : "");

        const sVehicle = vList.find(v => v.id === defaultVehicleId);
        if (sVehicle) setShiftVehicle(sVehicle);

        if (defaultVehicleId) {
          setIncidentForm((prev) => ({ ...prev, vehicle_id: defaultVehicleId }));
          setFuelForm((prev) => ({ ...prev, vehicle_id: defaultVehicleId }));
        }

        if (currentTrip) {
          setActiveTrip(currentTrip);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleIncidentSubmit = async (e) => {
    e.preventDefault();
    if (!incidentForm.vehicle_id || !incidentForm.description) return toast.error("Complete los campos obligatorios");
    setSubmitting(true);
    try {
      await api.post("/logbook/incident", incidentForm);
      toast.success("Incidente reportado correctamente");
      setIncidentForm({ ...incidentForm, description: "" });
    } catch (e) {
      toast.error("Error al reportar incidente");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    if (!fuelForm.vehicle_id || !fuelForm.mileage || !fuelForm.liters) return toast.error("Complete los campos obligatorios");
    setSubmitting(true);
    try {
      await api.post("/logbook/fuel", {
        ...fuelForm,
        mileage: parseFloat(fuelForm.mileage),
        liters: parseFloat(fuelForm.liters),
        amount: parseFloat(fuelForm.amount || 0)
      });
      toast.success("Carga de combustible registrada");
      setFuelForm({ ...fuelForm, mileage: "", liters: "", amount: "", receipt_number: "" });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Error al registrar carga");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Activity className="w-10 h-10 animate-spin text-teal-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-slide-up pb-10">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bitácora del Móvil</h1>
          <p className="text-sm text-slate-500 font-medium italic">Control operativo y novedades técnicas</p>
        </div>
      </div>

      {shiftVehicle && (
        <div className="mb-6 bg-teal-50 border border-teal-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-teal-600 tracking-widest">
                {activeTrip ? "Viaje Activo Detectado" : "Móvil Asignado al Turno"}
              </p>
              <p className="text-sm font-bold text-teal-900">
                Móvil: {shiftVehicle.plate} ({shiftVehicle.brand})
              </p>
            </div>
          </div>
          <Badge className="bg-teal-600 text-white border-none font-black text-[10px] uppercase">
            {activeTrip ? "Vehículo Fijo" : "En Turno"}
          </Badge>
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("incident")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${
            activeTab === "incident"
              ? "border-amber-500 bg-amber-50 text-amber-800 shadow-sm"
              : "border-slate-200 bg-white text-slate-400 hover:border-amber-200"
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Incidentes
        </button>
        <button
          onClick={() => setActiveTab("fuel")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-black uppercase tracking-widest ${
            activeTab === "fuel"
              ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
              : "border-slate-200 bg-white text-slate-400 hover:border-emerald-200"
          }`}
        >
          <Activity className="w-4 h-4" /> Combustible
        </button>
      </div>

      {activeTab === "incident" && (
        <Card className="shadow-sm border-slate-200 overflow-hidden rounded-3xl">
          <CardHeader className="bg-amber-500 text-white p-6">
            <CardTitle className="flex items-center gap-2 text-xl italic font-black uppercase tracking-tighter">
              <ShieldAlert className="w-6 h-6" /> Reportar Novedad o Incidente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleIncidentSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Móvil</Label>
                  <Select
                    value={incidentForm.vehicle_id}
                    onValueChange={(v) => setIncidentForm({ ...incidentForm, vehicle_id: v })}
                    disabled={!!activeTrip}
                  >
                    <SelectTrigger className="h-12 border-2 focus:ring-teal-500 rounded-xl">
                      <SelectValue placeholder="Seleccione patente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate} - {v.brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Tipo de Incidente</Label>
                  <Select
                    value={incidentForm.incident_type}
                    onValueChange={(v) => setIncidentForm({ ...incidentForm, incident_type: v })}
                  >
                    <SelectTrigger className="h-12 border-2 focus:ring-teal-500 rounded-xl">
                      <SelectValue placeholder="Seleccione tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mecanico">Mecánico / Motor</SelectItem>
                      <SelectItem value="neumaticos">Neumáticos</SelectItem>
                      <SelectItem value="limpieza">Aseo / Higiene</SelectItem>
                      <SelectItem value="material_clinico">Material Clínico</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Gravedad</Label>
                  <Select value={incidentForm.severity} onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v })}>
                    <SelectTrigger className="h-12 border-2 focus:ring-teal-500 rounded-xl">
                      <SelectValue placeholder="Seleccione gravedad..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja" className="text-emerald-600 font-bold">
                        Baja (Informativo)
                      </SelectItem>
                      <SelectItem value="media" className="text-amber-600 font-bold">
                        Media (Revisión pronto)
                      </SelectItem>
                      <SelectItem value="alta" className="text-red-600 font-bold underline">
                        Alta (Crítico / Desperfecto)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-slate-700">Descripción de lo ocurrido</Label>
                <textarea
                  className="w-full min-h-[120px] p-4 rounded-xl border-2 border-slate-200 text-sm focus:border-amber-500 outline-none transition-all shadow-sm bg-slate-50/50 font-medium"
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Detalle el problema o novedad detectada con el móvil..."
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white h-14 text-lg font-black shadow-lg rounded-xl transition-transform active:scale-95"
              >
                {submitting ? "Enviando..." : "Registrar Incidente"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeTab === "fuel" && (
        <Card className="shadow-sm border-slate-200 overflow-hidden rounded-3xl">
          <CardHeader className="bg-emerald-600 text-white p-6">
            <CardTitle className="flex items-center gap-2 text-xl italic font-black uppercase tracking-tighter">
              <Activity className="w-6 h-6" /> Registro de Carga de Combustible
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleFuelSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Móvil</Label>
                  <Select value={fuelForm.vehicle_id} onValueChange={(v) => setFuelForm({ ...fuelForm, vehicle_id: v })} disabled={!!activeTrip}>
                    <SelectTrigger className="h-12 border-2 focus:ring-teal-500 rounded-xl">
                      <SelectValue placeholder="Seleccione patente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate} - {v.brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Kilometraje de la Carga</Label>
                  <Input
                    type="number"
                    className="h-12 font-bold border-2 rounded-xl"
                    value={fuelForm.mileage}
                    onChange={(e) => setFuelForm({ ...fuelForm, mileage: e.target.value })}
                    placeholder="Ej: 125400"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Litros</Label>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-12 font-bold border-2 rounded-xl"
                    value={fuelForm.liters}
                    onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })}
                    placeholder="Ej: 45.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Monto Total ($)</Label>
                  <Input
                    type="number"
                    className="h-12 font-bold border-2 rounded-xl"
                    value={fuelForm.amount}
                    onChange={(e) => setFuelForm({ ...fuelForm, amount: e.target.value })}
                    placeholder="Ej: 55000"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">N° de Boleta / Documento</Label>
                  <Input
                    className="h-12 font-bold border-2 rounded-xl"
                    value={fuelForm.receipt_number}
                    onChange={(e) => setFuelForm({ ...fuelForm, receipt_number: e.target.value })}
                    placeholder="Ej: 001234"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg font-black shadow-lg rounded-xl mt-4 transition-transform active:scale-95"
              >
                {submitting ? "Registrando..." : "Confirmar Carga"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
