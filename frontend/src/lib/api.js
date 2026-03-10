import axios from "axios";

const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

// Detección segura de la URL del Backend
let API_BASE = "";

try {
  // Primero intentamos usar la variable de entorno si existe
  if (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) {
    API_BASE = process.env.REACT_APP_API_URL;
  }
} catch (e) {
  // Silenciar errores de acceso a process
}

// Si no hay variable, usamos el fallback según el entorno
if (!API_BASE) {
  API_BASE = isLocal
    ? "http://localhost:8000"
    : "https://movilizacion-hcu-backend.onrender.com";
}

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login" && window.location.pathname !== "/") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
