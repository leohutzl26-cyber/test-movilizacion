import { Siren, Truck, Car, Bus } from "lucide-react";

// ========== DATE FORMATTING ==========
export const formatScheduledDate = (dateStr) => {
  if (!dateStr) return "";
  try {
    const cleanDateStr = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const parts = cleanDateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const year = date.getFullYear();
      const months = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
      ];
      return `${day} ${months[date.getMonth()]} ${year}`;
    }
  } catch (e) {}
  return dateStr;
};

// ========== ISO DATE REPLACEMENT (for audit logs) ==========
export const replaceIsoDates = (text) => {
  if (!text) return "";
  const isoDateRegex = /(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/g;
  return text.replace(isoDateRegex, (match, year, monthStr, dayStr) => {
    const day = parseInt(dayStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const shortMonths = [
      "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
      "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
    ];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${day}-${shortMonths[monthIndex]}-${year}`;
    }
    return match;
  });
};

// ========== RUT VALIDATION (MÓDULO 11) ==========
export function validateRut(rut) {
  const clean = rut.replace(/\./g, "").replace(/-/g, "").toUpperCase().trim();
  if (clean.length < 2) return { valid: false, formatted: rut };
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return { valid: false, formatted: rut };
  let total = 0, factor = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    total += parseInt(body[i]) * factor;
    factor = factor < 7 ? factor + 1 : 2;
  }
  const remainder = 11 - (total % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  const valid = dv === expected;
  let formatted = "";
  for (let i = body.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) formatted = "." + formatted;
    formatted = body[i] + formatted;
  }
  return { valid, formatted: `${formatted}-${dv}` };
}

// ========== ZONAL NUMBER FORMATTING ==========
export const formatZonalNumber = (zonal) => {
  if (!zonal) return "";
  let str = zonal.toString().trim();
  if (/^[Zz]-/.test(str)) {
    return "7-" + str.substring(2);
  }
  if (/^[Zz]/.test(str)) {
    return "7-" + str.substring(1);
  }
  if (/^7-/.test(str)) {
    return str;
  }
  return "7-" + str;
};

// ========== STATUS COLOR MAPS ==========
export const COLORS = { pendiente: '#f59e0b', asignado: '#6366f1', en_curso: '#3b82f6', completado: '#10b981', cancelado: '#f43f5e', revision_gestor: '#8b5cf6' };

export const statusColorsSolid = {
  pendiente: "bg-amber-500 text-white shadow-amber-100",
  revision_gestor: "bg-purple-600 text-white shadow-purple-100",
  asignado: "bg-indigo-600 text-white shadow-indigo-100",
  en_curso: "bg-blue-600 text-white shadow-blue-100",
  completado: "bg-emerald-600 text-white shadow-emerald-100",
  cancelado: "bg-rose-600 text-white shadow-rose-100",
  devuelto: "bg-rose-600 text-white shadow-rose-100"
};

export const statusBorders = {
  pendiente: "border-l-amber-500",
  revision_gestor: "border-l-purple-500",
  asignado: "border-l-indigo-500",
  en_curso: "border-l-blue-500",
  completado: "border-l-emerald-500",
  cancelado: "border-l-rose-500",
  devuelto: "border-l-rose-500"
};

export const statusHeaderStyles = {
  pendiente: { bg: "bg-amber-600", text: "text-white", iconBg: "bg-amber-700/40", iconText: "text-amber-100", badge: "bg-amber-800 text-white" },
  revision_gestor: { bg: "bg-purple-600", text: "text-white", iconBg: "bg-purple-700/40", iconText: "text-purple-100", badge: "bg-purple-800 text-white" },
  asignado: { bg: "bg-indigo-600", text: "text-white", iconBg: "bg-indigo-700/40", iconText: "text-indigo-100", badge: "bg-indigo-800 text-white" },
  en_curso: { bg: "bg-blue-600", text: "text-white", iconBg: "bg-blue-700/40", iconText: "text-blue-100", badge: "bg-blue-800 text-white" },
  completado: { bg: "bg-emerald-600", text: "text-white", iconBg: "bg-emerald-700/40", iconText: "text-emerald-100", badge: "bg-emerald-800 text-white" },
  cancelado: { bg: "bg-rose-600", text: "text-white", iconBg: "bg-rose-700/40", iconText: "text-rose-100", badge: "bg-rose-800 text-white" },
  devuelto: { bg: "bg-rose-600", text: "text-white", iconBg: "bg-rose-700/40", iconText: "text-rose-100", badge: "bg-rose-800 text-white" }
};

export const pColors = { 
  urgente: "bg-gradient-to-r from-red-500 to-rose-600 text-white font-black shadow-[0_0_8px_rgba(239,68,68,0.45)] border border-red-400 animate-pulse", 
  alta: "bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black shadow-[0_0_8px_rgba(249,115,22,0.45)] border border-orange-400", 
  normal: "bg-slate-100 text-slate-700 font-bold border border-slate-200" 
};

export const sColors = {
  pendiente: "bg-amber-100 text-amber-800 border border-amber-200",
  asignado: "bg-indigo-100 text-indigo-800 border border-indigo-200",
  en_curso: "bg-blue-100 text-blue-800 border border-blue-200",
  completado: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  cancelado: "bg-rose-100 text-rose-800 border border-rose-200",
  revision_gestor: "bg-purple-100 text-purple-800 border border-purple-200"
};

export const COLORS_STATUS = { "Pendiente": "#f59e0b", "Por Visar": "#a855f7", "Asignado": "#3b82f6", "En Curso": "#0d9488", "Completado": "#22c55e", "Cancelado": "#ef4444" };
export const COLORS_PIE = ["#0d9488", "#f59e0b", "#6366f1", "#ef4444", "#22c55e", "#8b5cf6"];

// ========== VEHICLE ICONS ==========
export const VEHICLE_ICONS = {
  Ambulancia: <Siren className="w-6 h-6 text-red-600 drop-shadow-sm" />,
  camion: <Truck className="w-6 h-6 text-blue-600 drop-shadow-sm" />,
  "Auto/SUV": <Car className="w-6 h-6 text-purple-600 drop-shadow-sm" />,
  Camioneta: (
    <svg className="w-6 h-6 text-emerald-600 drop-shadow-sm" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13h4l1-3h4l1 3h10v4H2z" />
      <path d="M12 13v4" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
    </svg>
  ),
  Van: <Bus className="w-6 h-6 text-indigo-600 drop-shadow-sm" />
};

// ========== CLINICAL CONSTANTS ==========
export const PERSONNEL_TYPES = ["TENS", "Matrón(a)", "Enfermero(a)", "Kinesiólogo(a)", "Fonoaudiólogo(a)", "Médico", "Terapeuta Ocupacional"];
export const REQUIREMENT_OPTIONS = ["Camilla", "Incubadora", "Silla de rueda", "Oxigeno", "Monitor", "Aislamiento Aéreo", "Aislamiento Contacto", "Aislamiento Protector", "Dependiente severo"];
export const REASON_OPTIONS = ["Examen", "Hospitalización", "Dialisis", "Rescate", "Alta", "Procedimiento"];
export const ACCOMPANIMENT_OPTIONS = ["Materno", "Tutor", "Otro"];
