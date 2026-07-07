import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ambulance, ClipboardList, User, CheckCircle, XCircle, Activity, MapPin, Map, Plus, Trash2, RefreshCw, ExternalLink } from "lucide-react";
import MapAddressSelector from "@/components/MapAddressSelector";
import { validateRut, PERSONNEL_TYPES, REQUIREMENT_OPTIONS, REASON_OPTIONS, ACCOMPANIMENT_OPTIONS } from "@/lib/tripUtils";

export default function NewTripSection({ onNavigate }) {
    const [origins, setOrigins] = useState([]);
    const [destinations, setDestinations] = useState([]);
    const [originServices, setOriginServices] = useState([]);
    const [clinicalStaffOptions, setClinicalStaffOptions] = useState([]);
    const [tripType, setTripType] = useState("clinico");

    const [form, setForm] = useState({
        origin: "", origin_address: "", origin_maps_url: "",
        destination: "", destination_address: "", destination_maps_url: "",
        patient_name: "", patient_unit: "", priority: "normal", notes: "",
        scheduled_date: new Date().toISOString().split("T")[0],
        rut: "", age: "", diagnosis: "", weight: "", bed: "", transfer_reason: "",
        attending_physician: "", appointment_time: "", departure_time: "",
        patient_requirements: [], accompaniment: "",
        task_details: "", staff_count: ""
    });

    const [staffRows, setStaffRows] = useState([]);
    const [rutStatus, setRutStatus] = useState(null);

    const [useCustomOrigin, setUseCustomOrigin] = useState(false);
    const [useCustomDest, setUseCustomDest] = useState(false);
    const [useCustomService, setUseCustomService] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showOriginMap, setShowOriginMap] = useState(false);
    const [showDestMap, setShowDestMap] = useState(false);

    useEffect(() => {
        api.get("/origins").then(r => setOrigins((r.data || []).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => { });
        api.get("/destinations").then(r => setDestinations((r.data || []).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => { });
        api.get("/clinical-staff").then(r => setClinicalStaffOptions((r.data || []).filter(s => s.is_active))).catch(() => { });
        api.get("/origin-services").then(r => setOriginServices((r.data || []).filter(s => s.is_active !== false).sort((a, b) => a.name.localeCompare(b.name)))).catch(() => { });
    }, []);

    const handleCheckbox = (field, val) => {
        setForm(prev => {
            const arr = prev[field];
            if (arr.includes(val)) return { ...prev, [field]: arr.filter(i => i !== val) };
            return { ...prev, [field]: [...arr, val] };
        });
    };

    const handleRutChange = (value) => {
        if (!value) {
            setForm(prev => ({ ...prev, rut: "" }));
            setRutStatus(null);
            return;
        }
        const result = validateRut(value);
        setForm(prev => ({ ...prev, rut: result.formatted }));
        if (value.trim().length >= 2) {
            setRutStatus(result);
        } else {
            setRutStatus(null);
        }
    };

    const addStaffRow = () => {
        setStaffRows([...staffRows, { type: "", staff_id: "", staff_name: "" }]);
    };
    const removeStaffRow = (index) => {
        setStaffRows(staffRows.filter((_, i) => i !== index));
    };
    const updateStaffRow = (index, field, value) => {
        setStaffRows(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            if (field === "type") {
                updated[index].staff_id = "";
                updated[index].staff_name = "";
            }
            if (field === "staff_id") {
                if (value && value !== "none") {
                    const staff = clinicalStaffOptions.find(s => s.id === value);
                    if (staff) updated[index].staff_name = staff.name;
                } else {
                    updated[index].staff_id = "";
                    updated[index].staff_name = "";
                }
            }
            return updated;
        });
    };

    const getStaffByType = (type) => {
        if (!type) return [];
        return clinicalStaffOptions.filter(s => s.role.toLowerCase() === type.toLowerCase());
    };

    const handleOriginChange = (val) => {
        if (val === "otro") {
            setUseCustomOrigin(true);
            setForm(prev => ({ ...prev, origin: "", origin_address: "", origin_maps_url: "" }));
        } else {
            const matched = origins.find(o => o.name === val);
            const address = matched ? (matched.address || "") : "";
            setForm(prev => ({ 
                ...prev, 
                origin: val, 
                origin_address: address
            }));
        }
    };

    const handleDestChange = (val) => {
        if (val === "otro") {
            setUseCustomDest(true);
            setForm(prev => ({ ...prev, destination: "", destination_address: "", destination_maps_url: "" }));
        } else {
            const matched = destinations.find(d => d.name === val);
            const address = matched ? (matched.address || "") : "";
            setForm(prev => ({ 
                ...prev, 
                destination: val, 
                destination_address: address
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalOrigin = useCustomOrigin ? form.origin : form.origin;
        const finalDest = useCustomDest ? form.destination : form.destination;

        let newErrors = {};

        if (tripType === "clinico") {
            if (!form.patient_name) newErrors.patient_name = true;
            if (!form.patient_unit) newErrors.patient_unit = true;
            if (!form.transfer_reason) newErrors.transfer_reason = true;
            if (!finalOrigin) newErrors.origin = true;
            if (!finalDest) newErrors.destination = true;
            
            setErrors(newErrors);

            if (staffRows.length === 0 && form.transfer_reason !== "Alta") { 
                toast.error("Debe añadir al menos un personal clínico para traslados clínicos"); return; 
            }
            if (staffRows.length > 0 && staffRows.some(r => !r.type)) { 
                toast.error("Seleccione el tipo de personal para todas las filas añadidas"); return; 
            }
            if (form.patient_requirements.length === 0) { toast.error("Seleccione requerimientos del paciente"); return; }
        } else {
            if (!finalOrigin) newErrors.origin = true;
            if (!finalDest) newErrors.destination = true;
            if (!form.task_details) newErrors.task_details = true;
            
            setErrors(newErrors);

            if (Object.keys(newErrors).length > 0) {
                toast.error("Complete Origen, Destino y Cometido"); return;
            }
        }

        setLoading(true);
        setErrors({});
        try {
            const submitData = {
                ...form,
                origin: finalOrigin,
                destination: finalDest,
                trip_type: tripType,
                required_personnel: staffRows.map(r => `${r.type}: ${r.staff_name || "Por identificar"}`),
                assigned_clinical_staff: staffRows,
            };

            await api.post("/trips", submitData);
            toast.success("Solicitud creada exitosamente");
            setForm({
                origin: "", destination: "", patient_name: "", patient_unit: "", priority: "normal", notes: "",
                scheduled_date: new Date().toISOString().split("T")[0], rut: "", age: "", diagnosis: "", weight: "", bed: "",
                transfer_reason: "", attending_physician: "", appointment_time: "", departure_time: "",
                patient_requirements: [], accompaniment: "", task_details: "", staff_count: ""
            });
            setStaffRows([]);
            setRutStatus(null);
            if (onNavigate) onNavigate("dispatch");
        } catch (e) { toast.error("Error al crear solicitud"); }
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-6xl mx-auto animate-slide-up space-y-4">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Nueva Solicitud de Traslado</h1>

            <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setTripType("clinico")} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${tripType === "clinico" ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-teal-200"}`}>
                    <Ambulance className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">Traslado Clínico</span>
                </button>
                <button type="button" onClick={() => setTripType("no_clinico")} className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1.5 ${tripType === "no_clinico" ? "border-teal-600 bg-teal-50 text-teal-800 shadow-sm" : "border-slate-200 bg-white text-slate-400 hover:border-teal-200"}`}>
                    <ClipboardList className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">Traslado No Clínico</span>
                </button>
            </div>

            <Card className="shadow-sm border-slate-200">
                <CardContent className="p-5">
                    <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
                        {tripType === "clinico" && (
                            <>
                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-teal-800 border-b border-teal-100 pb-1 flex items-center gap-1.5 uppercase tracking-widest leading-none"><User className="w-4 h-4" /> Paciente</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        <div className="space-y-1"><Label className={`text-[10px] font-bold ${errors.patient_name ? "text-red-500" : "text-slate-500"}`}>Nombre Paciente *</Label><Input className={`h-9 text-xs font-semibold ${errors.patient_name ? "border-red-500 bg-red-50" : ""}`} value={form.patient_name} onChange={e => { setForm({ ...form, patient_name: e.target.value }); if (errors.patient_name) setErrors(p => ({ ...p, patient_name: false })); }} /></div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-bold text-slate-500">RUT</Label>
                                            <div className="relative">
                                                <Input
                                                    value={form.rut}
                                                    onChange={e => handleRutChange(e.target.value)}
                                                    placeholder="12345678-9"
                                                    className={`h-9 text-xs font-semibold pr-8 ${rutStatus ? (rutStatus.valid ? "border-emerald-500" : "border-red-500") : ""}`}
                                                />
                                                {rutStatus && (
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                        {rutStatus.valid
                                                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                            : <XCircle className="w-4 h-4 text-red-500" />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Edad</Label><Input className="h-9 text-xs font-semibold" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></div>
                                        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Peso (Kg)</Label><Input className="h-9 text-xs font-semibold" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} /></div>
                                        <div className="space-y-1 lg:col-span-2 xl:col-span-3"><Label className="text-[10px] font-bold text-slate-500">Diagnóstico</Label><Input className="h-9 text-xs font-semibold" value={form.diagnosis} onChange={e => setForm({ ...form, diagnosis: e.target.value })} /></div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-xs font-black text-teal-800 border-b border-teal-100 pb-1 flex items-center gap-1.5 uppercase tracking-widest leading-none"><Activity className="w-4 h-4" /> Detalles Médicos</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                        <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Médico Tratante</Label><Input className="h-9 text-xs font-semibold" value={form.attending_physician} onChange={e => setForm({ ...form, attending_physician: e.target.value })} /></div>
                                        <div className="space-y-1"><Label className={`text-[10px] font-bold ${errors.transfer_reason ? "text-red-500" : "text-slate-500"}`}>Motivo Traslado *</Label>
                                            <Select value={form.transfer_reason} onValueChange={v => { setForm({ ...form, transfer_reason: v }); if (errors.transfer_reason) setErrors(p => ({ ...p, transfer_reason: false })); }}>
                                                <SelectTrigger className={`h-9 text-xs font-semibold ${errors.transfer_reason ? "border-red-500 bg-red-50" : ""}`}><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                                                <SelectContent>{REASON_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {tripType === "no_clinico" && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Detalle del Cometido</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1 md:col-span-2"><Label className={errors.task_details ? "text-red-500" : ""}>Cometido (Motivo) *</Label><Input className={errors.task_details ? "border-red-500 bg-red-50 shadow-inner" : ""} value={form.task_details} onChange={e => { setForm({ ...form, task_details: e.target.value }); if (errors.task_details) setErrors(p => ({ ...p, task_details: false })); }} placeholder="Ej: Búsqueda de insumos" /></div>
                                    <div className="space-y-1"><Label>Cantidad de Funcionarios</Label><Input type="number" min="0" value={form.staff_count} onChange={e => setForm({ ...form, staff_count: e.target.value })} /></div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h3 className="text-xs font-black text-teal-800 border-b border-teal-100 pb-1 flex items-center gap-1.5 uppercase tracking-widest leading-none"><MapPin className="w-4 h-4" /> Ubicación y Tiempos</h3>
                            <div className="space-y-4">
                                {/* FILA DE ORIGEN */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="space-y-1 md:col-span-4"><Label className={`text-[10px] font-bold ${errors.origin ? "text-red-500" : "text-slate-500"}`}>Origen *</Label>
                                        {!useCustomOrigin ? (
                                            <Select onValueChange={handleOriginChange}>
                                                <SelectTrigger className={`h-9 text-xs font-semibold ${errors.origin ? "border-red-500 bg-red-50" : ""}`}><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="otro" className="font-bold text-teal-600 border-b border-slate-100 bg-slate-50">Otro (Ingresar dirección manual)...</SelectItem>
                                                    {origins.map(o => <SelectItem key={o.id} value={o.name}>{o.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        ) : <Input className={`h-9 text-xs font-semibold ${errors.origin ? "border-red-500 bg-red-50" : ""}`} placeholder="Escriba origen" value={form.origin} onChange={e => { setForm({ ...form, origin: e.target.value }); if (errors.origin) setErrors(p => ({ ...p, origin: false })); }} onDoubleClick={() => setUseCustomOrigin(false)} />}
                                    </div>

                                    <div className="space-y-1 md:col-span-8">
                                        <Label className="text-slate-500 text-[10px] font-bold">Dirección de Origen</Label>
                                        <div className="flex gap-2">
                                            <Input className="h-9 text-xs font-semibold flex-1" placeholder="Dirección exacta o referencia" value={form.origin_address || ""} onChange={e => setForm({ ...form, origin_address: e.target.value })} />
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 shrink-0"
                                                onClick={() => setShowOriginMap(true)}
                                            >
                                                <Map className="w-4 h-4 text-teal-600" />
                                                <span className="hidden sm:inline text-[10px] font-bold uppercase">Mapa</span>
                                            </Button>
                                            {form.origin_address && form.origin_address.trim() && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-teal-600 rounded-lg flex items-center gap-1 shrink-0"
                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.origin_address)}`, "_blank")}
                                                    title="Ver dirección en Google Maps (sin claves)"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-teal-600" />
                                                    <span className="hidden md:inline text-[10px] font-bold uppercase">G-Maps</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* FILA DE DESTINO */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="space-y-1 md:col-span-4"><Label className={`text-[10px] font-bold ${errors.destination ? "text-red-500" : "text-slate-500"}`}>Destino *</Label>
                                        {!useCustomDest ? (
                                            <Select onValueChange={handleDestChange}>
                                                <SelectTrigger className={`h-9 text-xs font-semibold ${errors.destination ? "border-red-500 bg-red-50" : ""}`}><SelectValue placeholder="Seleccione" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="otro" className="font-bold text-teal-600 border-b border-slate-100 bg-slate-50">Otro (Ingresar dirección manual)...</SelectItem>
                                                    {destinations.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        ) : <Input className={`h-9 text-xs font-semibold ${errors.destination ? "border-red-500 bg-red-50" : ""}`} placeholder="Escriba destino" value={form.destination} onChange={e => { setForm({ ...form, destination: e.target.value }); if (errors.destination) setErrors(p => ({ ...p, destination: false })); }} onDoubleClick={() => setUseCustomDest(false)} />}
                                    </div>

                                    <div className="space-y-1 md:col-span-8">
                                        <Label className="text-slate-500 text-[10px] font-bold">Dirección de Destino</Label>
                                        <div className="flex gap-2">
                                            <Input className="h-9 text-xs font-semibold flex-1" placeholder="Dirección exacta o referencia" value={form.destination_address || ""} onChange={e => setForm({ ...form, destination_address: e.target.value })} />
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex items-center gap-1 shrink-0"
                                                onClick={() => setShowDestMap(true)}
                                            >
                                                <Map className="w-4 h-4 text-teal-600" />
                                                <span className="hidden sm:inline text-[10px] font-bold uppercase">Mapa</span>
                                            </Button>
                                            {form.destination_address && form.destination_address.trim() && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="h-9 px-3 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-teal-600 rounded-lg flex items-center gap-1 shrink-0"
                                                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(form.destination_address)}`, "_blank")}
                                                    title="Ver dirección en Google Maps (sin claves)"
                                                >
                                                    <ExternalLink className="w-4 h-4 text-teal-600" />
                                                    <span className="hidden md:inline text-[10px] font-bold uppercase">G-Maps</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* FILA DE DETALLES TEMPORALES Y SERVICIOS */}
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100">
                                    {tripType === "clinico" && (
                                        <>
                                            <div className="space-y-1"><Label className={`text-[10px] font-bold ${errors.patient_unit ? "text-red-500" : "text-slate-500"}`}>Servicio Solicitante *</Label>
                                                {!useCustomService ? (
                                                    <Select onValueChange={v => {
                                                        if (v === "otro") { setUseCustomService(true); }
                                                        else { setForm({ ...form, patient_unit: v }); if (errors.patient_unit) setErrors(p => ({ ...p, patient_unit: false })); }
                                                    }}>
                                                        <SelectTrigger className={`h-9 text-xs font-semibold ${errors.patient_unit ? "border-red-500 bg-red-50" : ""}`}><SelectValue placeholder="Seleccione servicio" /></SelectTrigger>
                                                        <SelectContent>
                                                            {originServices.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                                            <SelectItem value="otro">Otro (escribir)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Input className={`h-9 text-xs font-semibold ${errors.patient_unit ? "border-red-500 bg-red-50 shadow-inner" : ""}`} placeholder="Escriba servicio" value={form.patient_unit || ""} onChange={e => { setForm({ ...form, patient_unit: e.target.value }); if (errors.patient_unit) setErrors(p => ({ ...p, patient_unit: false })); }} onDoubleClick={() => setUseCustomService(false)} />
                                                )}
                                            </div>
                                            <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Cama</Label><Input className="h-9 text-xs font-semibold" value={form.bed} onChange={e => setForm({ ...form, bed: e.target.value })} /></div>
                                        </>
                                    )}
                                    <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Fecha del Traslado</Label><Input type="date" className="h-9 text-xs font-semibold" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })} /></div>
                                    <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Hora de Citación</Label><Input type="time" className="h-9 text-xs font-semibold" value={form.appointment_time} onChange={e => setForm({ ...form, appointment_time: e.target.value })} /></div>
                                    <div className="space-y-1"><Label className="text-[10px] font-bold text-slate-500">Hora de Salida</Label><Input type="time" className="h-9 text-xs font-semibold" value={form.departure_time} onChange={e => setForm({ ...form, departure_time: e.target.value })} /></div>
                                </div>
                            </div>
                        </div>

                        {tripType === "clinico" && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-teal-800 border-b border-teal-100 pb-2 flex items-center gap-2">
                                    <Plus className="w-5 h-5" /> Personal Clínico Requerido {form.transfer_reason !== "Alta" ? "*" : "(Opcional para Altas)"}
                                </h3>
                                
                                <Button type="button" variant="outline" onClick={addStaffRow} className="border-teal-200 text-teal-700 hover:bg-teal-50 font-bold h-10 flex items-center gap-2">
                                    <Plus className="w-4 h-4" /> Añadir Personal Clínico
                                </Button>

                                {staffRows.map((row, i) => (
                                    <div key={i} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-left-2">
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Tipo de Personal</Label>
                                            <Select value={row.type} onValueChange={v => updateStaffRow(i, "type", v)}>
                                                <SelectTrigger className="h-10"><SelectValue placeholder="Seleccione tipo" /></SelectTrigger>
                                                <SelectContent>{PERSONNEL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <Label className="text-[10px] font-bold uppercase text-slate-500">Nombre Funcionario (Opcional)</Label>
                                            <Select value={row.staff_id || "none"} onValueChange={v => updateStaffRow(i, "staff_id", v)} disabled={!row.type}>
                                                <SelectTrigger className="h-10"><SelectValue placeholder={row.type ? "Opcional: Identificar luego..." : "Primero seleccione tipo"} /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Por identificar luego...</SelectItem>
                                                    {getStaffByType(row.type).length > 0
                                                        ? getStaffByType(row.type).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                                                        : <SelectItem value="__none" disabled>No hay personal de este tipo</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-end">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeStaffRow(i)} className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-0.5">
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                <div className="space-y-2 mt-4">
                                    <Label className="text-xs font-bold text-slate-700">Requerimientos Paciente *</Label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                        {REQUIREMENT_OPTIONS.map(o => (
                                            <label key={o} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                                <input type="checkbox" checked={form.patient_requirements.includes(o)} onChange={() => handleCheckbox("patient_requirements", o)} className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500" /> {o}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-slate-500">Tipo de Acompañamiento Adicional</Label>
                                        <Select value={form.accompaniment || "ninguno"} onValueChange={v => setForm({ ...form, accompaniment: v === "ninguno" ? "" : v })}>
                                            <SelectTrigger className="h-9 text-xs font-semibold"><SelectValue placeholder="Ninguno" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ninguno">Ninguno</SelectItem>
                                                {ACCOMPANIMENT_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Notas Adicionales</Label>
                            <textarea className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500 outline-none transition-all shadow-sm bg-slate-50/50" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Información extra relevante..." />
                        </div>

                        <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white h-14 text-lg font-black shadow-lg rounded-2xl transition-all active:scale-[0.98]" disabled={loading}>
                            {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : "Enviar Solicitud de Traslado"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
            <MapAddressSelector 
                open={showOriginMap}
                onClose={() => setShowOriginMap(false)}
                onSelect={({ address, mapsUrl }) => {
                    setForm(prev => ({ ...prev, origin_address: address, origin_maps_url: mapsUrl }));
                }}
                title="Seleccionar Dirección de Origen"
                initialAddress={form.origin_address}
            />
            <MapAddressSelector 
                open={showDestMap}
                onClose={() => setShowDestMap(false)}
                onSelect={({ address, mapsUrl }) => {
                    setForm(prev => ({ ...prev, destination_address: address, destination_maps_url: mapsUrl }));
                }}
                title="Seleccionar Dirección de Destino"
                initialAddress={form.destination_address}
            />
        </div>
    );
}
