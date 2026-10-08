import { supabase, customFetch } from './supabase';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('supabase.auth.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to handle Supabase Function calls
export const callSupabaseFunction = async (functionName, body = {}) => {
  try {
    const baseUrl = process.env.REACT_APP_API_URL || '';
    const response = await customFetch(`${baseUrl}/api/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Non-JSON response:", responseText);
      throw new Error(`Error del servidor (Estado ${response.status})`);
    }

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  } catch (error) {
    console.error(`Supabase Function ${functionName} error:`, error);
    throw error;
  }
};

export const getLocalTripGroups = () => {
  try {
    const data = localStorage.getItem('movilizacion_trip_groups');
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const setLocalTripGroup = (tripIds, groupId) => {
  try {
    const current = getLocalTripGroups();
    (tripIds || []).forEach((id) => {
      if (groupId) {
        current[id] = groupId;
      } else {
        delete current[id];
      }
    });
    localStorage.setItem('movilizacion_trip_groups', JSON.stringify(current));
  } catch (e) {}
};

const parseTrip = (trip) => {
  if (!trip) return trip;
  const parsed = { ...trip };
  const localGroups = getLocalTripGroups();
  const groupVal = trip.dispatch_group_id || trip.group_id || localGroups[trip.id] || null;
  parsed.dispatch_group_id = groupVal;
  parsed.group_id = groupVal;
  ['assigned_clinical_staff', 'required_personnel', 'patient_requirements'].forEach(field => {
    if (Array.isArray(parsed[field])) {
      parsed[field] = parsed[field].map(item => {
        if (typeof item === 'string') {
          try { return JSON.parse(item); } catch(e) { return item; }
        }
        return item;
      });
    }
  });
  return parsed;
};

const serializeTrip = (tripData) => {
  if (!tripData) return tripData;
  const serialized = { ...tripData };
  ['assigned_clinical_staff', 'required_personnel', 'patient_requirements'].forEach(field => {
    if (Array.isArray(serialized[field])) {
      serialized[field] = serialized[field].map(item => {
        if (typeof item === 'object') return JSON.stringify(item);
        return item;
      });
    }
  });
  return serialized;
};

// Authentication functions
export const authApi = {
  register: async (userData) => {
    return await callSupabaseFunction('auth-register', userData);
  },

  login: async (credentials) => {
    return await callSupabaseFunction('auth-login', credentials);
  },

  logout: async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('supabase.auth.token');
  },

  changePassword: async (currentPassword, newPassword) => {
    return await callSupabaseFunction('auth-change-password', { currentPassword, newPassword });
  },

  adminUsers: async (payload) => {
    return await callSupabaseFunction('admin-users', payload);
  },

  getCurrentUser: async () => {
    try {
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) return null;

      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Decodificar el payload en base64 de forma local en el navegador
      const payloadText = atob(parts[1]);
      const payload = JSON.parse(payloadText);

      // Comprobar si el token ya expiró
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        localStorage.removeItem('supabase.auth.token');
        return null;
      }

      // Reconstruir el objeto de usuario esperado por la aplicación
      return {
        id: payload.userId || payload.id || payload.sub,
        email: payload.email,
        username: payload.username,
        name: payload.name,
        role: payload.role,
        department: payload.department,
        must_change_password: payload.must_change_password,
        status: 'approved'
      };
    } catch (error) {
      console.error("Error decodificando el token JWT local:", error);
      return null;
    }
  }
};

// Lectura de traslados a través del backend. Devuelve un arreglo, o { trips, total } si se pide paginación.
const leerTraslados = async (filters = {}) => {
  const usePagination = filters.page !== undefined && filters.limit !== undefined;
  const res = await callSupabaseFunction('trips-read', { action: 'list', ...filters });
  const trips = (res.trips || []).map(parseTrip);
  return usePagination ? { trips, total: res.total || 0 } : trips;
};

// Trips functions
export const tripsApi = {
  // Traslados visibles para el usuario según su rol. El filtrado por rol lo hace el backend (trips-read).
  getTrips: async (filters = {}) => leerTraslados(filters),

  // Create new trip
  createTrip: async (tripData) => {
    return parseTrip(await callSupabaseFunction('trips-create', serializeTrip(tripData)));
  },

  // Get trip by ID (404 si el traslado no existe o el rol no puede verlo)
  getTripById: async (tripId) => {
    const res = await callSupabaseFunction('trips-read', { action: 'get', id: tripId });
    return parseTrip(res.trip);
  },

  // Update trip
  updateTrip: async (tripId, updateData) => {
    const data = await callSupabaseFunction('manage-catalogs', {
      action: 'update',
      table: 'trips',
      id: tripId,
      data: serializeTrip(updateData)
    });
    return parseTrip(data);
  },

  // Assign driver to trip
  assignDriver: async (tripId, driverId, vehicleId = null) => {
    return await callSupabaseFunction('trips-assign', {
      trip_id: tripId,
      driver_id: driverId,
      vehicle_id: vehicleId
    });
  },

  // Update trip status
  updateStatus: async (tripId, status, options = {}) => {
    return await callSupabaseFunction('trips-update-status', {
      trip_id: tripId,
      status,
      ...options
    });
  },

  // Get trip pool (available trips)
  getTripPool: async () => {
    const poolTrips = await tripsApi.getTrips({ status: ['pendiente', 'asignado'] });
    return (poolTrips || []).sort((a, b) => {
      const dateA = a.scheduled_date ? a.scheduled_date.split("T")[0] : (a.created_at ? a.created_at.split("T")[0] : "");
      const dateB = b.scheduled_date ? b.scheduled_date.split("T")[0] : (b.created_at ? b.created_at.split("T")[0] : "");
      if (dateA !== dateB) {
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      }
      const timeA = a.departure_time || a.appointment_time || "";
      const timeB = b.departure_time || b.appointment_time || "";
      if (timeA !== timeB) {
        if (!timeA) return 1;
        if (!timeB) return -1;
        return timeA.localeCompare(timeB);
      }
      return (a.created_at || "").localeCompare(b.created_at || "");
    });
  },

  // Traslados activos (pendiente, asignado, en curso) más los completados hoy
  getActiveTrips: async () => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const today = new Date(Date.now() - tzOffset).toISOString().split('T')[0];
    const res = await callSupabaseFunction('trips-read', { action: 'active', today });
    return (res.trips || []).map(parseTrip);
  },

  // Get trip history (mismos filtros que getTrips más folio, fechas, vehículo y búsqueda)
  getTripHistory: async (filters = {}) => leerTraslados(filters),

  // Delete trip (solo admin, de uno en uno)
  deleteTrip: async (tripId) => {
    await callSupabaseFunction('trips-delete', { id: tripId });
  }
};

// Perfiles: el navegador no lee ni escribe la tabla "profiles"; todo pasa por el backend.
export const profilesApi = {
  // Perfil propio + ids de las personas de su mismo departamento
  me: async () => {
    return await callSupabaseFunction('profiles', { action: 'me' });
  },

  // Listado mínimo de conductores o personal clínico, por rol o por ids
  directory: async ({ role, ids } = {}) => {
    const res = await callSupabaseFunction('profiles', { action: 'directory', role, ids });
    return res.users || [];
  },

  // Listado completo para administración (solo admin)
  list: async ({ role, order_by, ascending } = {}) => {
    const res = await callSupabaseFunction('profiles', { action: 'list', role, order_by, ascending });
    return res.users || [];
  }
};

// Users functions
export const usersApi = {
  // Conductores visibles para el resto de las pantallas (sin datos personales)
  getDrivers: async () => profilesApi.directory({ role: 'conductor' }),

  // Update user status (approve/reject)
  updateUserStatus: async (userId, action) => {
    return await callSupabaseFunction('users-approve', {
      user_id: userId,
      action
    });
  },

  // Update user role (solo admin)
  updateUserRole: async (userId, role) => {
    const res = await callSupabaseFunction('admin-users', { action: 'set_role', id: userId, role });
    return res.user;
  },

  // Delete user (solo admin)
  deleteUser: async (userId) => {
    await callSupabaseFunction('admin-users', { action: 'delete', id: userId });
  }
};

// Vehicles functions
export const vehiclesApi = {
  // Get all vehicles
  getVehicles: async () => {
    const { data, error } = await supabase.from('vehicles').select('*').order('plate');
    if (error) throw error;
    return data || [];
  },

  // Create vehicle
  createVehicle: async (vehicleData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'create',
      table: 'vehicles',
      data: vehicleData
    });
  },

  // Update vehicle
  updateVehicle: async (vehicleId, updateData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'update',
      table: 'vehicles',
      id: vehicleId,
      data: updateData
    });
  },

  // Update vehicle mileage
  updateMileage: async (vehicleId, mileage) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'update',
      table: 'vehicles',
      id: vehicleId,
      data: { mileage }
    });
  },

  // Update vehicle status
  updateStatus: async (vehicleId, status) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'update',
      table: 'vehicles',
      id: vehicleId,
      data: { status }
    });
  },

  // Delete vehicle
  deleteVehicle: async (vehicleId) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'delete',
      table: 'vehicles',
      id: vehicleId
    });
  }
};

// Stats functions
export const statsApi = {
  // Get dashboard stats
  getDashboardStats: async () => {
    return await callSupabaseFunction('stats-dashboard');
  }

  // (getSimpleStats se eliminó: leía trips directo desde el navegador y nadie lo usaba)
};

// Destinations/Origins/Origin Services functions
export const destinationsApi = {
  getDestinations: async () => {
    const { data, error } = await supabase.from('destinations').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  createDestination: async (destinationData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'create',
      table: 'destinations',
      data: destinationData
    });
  },

  updateDestination: async (destinationId, updateData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'update',
      table: 'destinations',
      id: destinationId,
      data: updateData
    });
  },

  deleteDestination: async (destinationId) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'delete',
      table: 'destinations',
      id: destinationId
    });
  }
};

export const originsApi = {
  getOrigins: async () => {
    const { data, error } = await supabase.from('origins').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  createOrigin: async (originData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'create',
      table: 'origins',
      data: originData
    });
  },

  updateOrigin: async (originId, updateData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'update',
      table: 'origins',
      id: originId,
      data: updateData
    });
  },

  deleteOrigin: async (originId) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'delete',
      table: 'origins',
      id: originId
    });
  }
};

export const originServicesApi = {
  getOriginServices: async () => {
    const { data, error } = await supabase.from('origin_services').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  createOriginService: async (serviceData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'create',
      table: 'origin_services',
      data: serviceData
    });
  },

  updateOriginService: async (serviceId, updateData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'update',
      table: 'origin_services',
      id: serviceId,
      data: updateData
    });
  },

  deleteOriginService: async (serviceId) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'delete',
      table: 'origin_services',
      id: serviceId
    });
  }
};

// Clinical Staff functions
export const clinicalStaffApi = {
  // Get all clinical staff
  getClinicalStaff: async () => {
    const { data, error } = await supabase.from('clinical_staff').select('*').order('name');
    if (error) throw error;
    return data || [];
  },

  // Create clinical staff
  createClinicalStaff: async (staffData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'create',
      table: 'clinical_staff',
      data: staffData
    });
  },

  // Update clinical staff
  updateClinicalStaff: async (staffId, updateData) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'update',
      table: 'clinical_staff',
      id: staffId,
      data: updateData
    });
  },

  // Delete clinical staff
  deleteClinicalStaff: async (staffId) => {
    return await callSupabaseFunction('manage-catalogs', {
      action: 'delete',
      table: 'clinical_staff',
      id: staffId
    });
  }
};

// Audit Logs functions
export const auditLogsApi = {
  // Get audit logs (admin only)
  getAuditLogs: async (limit = 50) => {
    const res = await callSupabaseFunction('audit-logs', { action: 'list', limit });
    return res.logs || [];
  },

  // Últimos movimientos de traslados para el panel de despacho (coordinador y admin)
  getTripActivity: async (limit = 20) => {
    const res = await callSupabaseFunction('audit-logs', { action: 'list', entity_type: 'trips', limit });
    return res.logs || [];
  },

  // Get specific trip audit logs
  getTripAuditLogs: async (tripId) => {
    const res = await callSupabaseFunction('audit-logs', { action: 'list', entity_type: 'trips', entity_id: tripId });
    return res.logs || [];
  },

  // Registra una acción sobre un traslado. El backend firma el registro con el usuario del JWT.
  logTripAction: async (action, tripId, { old_values, new_values, details } = {}) => {
    return await callSupabaseFunction('audit-logs', {
      action: 'create',
      entry: { action, entity_type: 'trips', entity_id: tripId, old_values, new_values, details }
    });
  }
};

// Export all APIs
export const supabaseApi = {
  auth: authApi,
  trips: tripsApi,
  users: usersApi,
  profiles: profilesApi,
  vehicles: vehiclesApi,
  stats: statsApi,
  destinations: destinationsApi,
  origins: originsApi,
  originServicesApi: originServicesApi,
  clinicalStaff: clinicalStaffApi,
  auditLogs: auditLogsApi
};

export default supabaseApi;