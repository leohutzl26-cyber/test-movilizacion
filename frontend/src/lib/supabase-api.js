import { supabase, customFetch } from './supabase';

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('supabase.auth.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Helper function to handle Supabase Function calls
const callSupabaseFunction = async (functionName, body = {}) => {
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

const parseTrip = (trip) => {
  if (!trip) return trip;
  const parsed = { ...trip };
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
        id: payload.userId,
        email: payload.email,
        username: payload.username,
        name: payload.name,
        role: payload.role,
        must_change_password: payload.must_change_password,
        status: 'approved'
      };
    } catch (error) {
      console.error("Error decodificando el token JWT local:", error);
      return null;
    }
  }
};

// Trips functions
export const tripsApi = {
  // Get trips based on user role
  getTrips: async (filters = {}) => {
    let query = supabase.from('trips').select('*').order('created_at', { ascending: false });
    
    if (filters.status) {
      query = query.in('status', filters.status);
    }
    
    if (filters.requester_id) {
      query = query.eq('requester_id', filters.requester_id);
    }
    
    if (filters.driver_id) {
      query = query.eq('driver_id', filters.driver_id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(parseTrip);
  },

  // Create new trip
  createTrip: async (tripData) => {
    return parseTrip(await callSupabaseFunction('trips-create', serializeTrip(tripData)));
  },

  // Get trip by ID
  getTripById: async (tripId) => {
    const { data, error } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
    
    if (error) throw error;
    return parseTrip(data);
  },

  // Update trip
  updateTrip: async (tripId, updateData) => {
    const { data, error } = await supabase
      .from('trips')
      .update(serializeTrip(updateData))
      .eq('id', tripId)
      .select()
      .single();
    
    if (error) throw error;
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
    return await tripsApi.getTrips({ status: ['pendiente', 'asignado'] });
  },

  // Get active trips
  getActiveTrips: async () => {
    return await tripsApi.getTrips({ status: ['pendiente', 'asignado', 'en_curso'] });
  },

  // Get trip history
  getTripHistory: async (filters = {}) => {
    let query = supabase.from('trips').select('*').order('created_at', { ascending: false });
    
    if (filters.folio) {
      query = query.ilike('tracking_number', `%${filters.folio}%`);
    }
    
    if (filters.startDate) {
      query = query.gte('scheduled_date', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('scheduled_date', filters.endDate);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(parseTrip);
  },

  // Delete trip
  deleteTrip: async (tripId) => {
    const { error } = await supabase
      .from('trips')
      .delete()
      .eq('id', tripId);
    
    if (error) throw error;
  }
};

// Users functions
export const usersApi = {
  // Get all users
  getUsers: async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) throw error;
    return data || [];
  },

  // Get user by ID
  getUserById: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update user status (approve/reject)
  updateUserStatus: async (userId, action) => {
    return await callSupabaseFunction('users-approve', {
      user_id: userId,
      action
    });
  },

  // Update user role
  updateUserRole: async (userId, role) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete user
  deleteUser: async (userId) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (error) throw error;
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
  },

  // Get simple stats for components
  getSimpleStats: async () => {
    try {
      const { data: trips } = await supabase.from('trips').select('status');
      const { data: vehicles } = await supabase.from('vehicles').select('status');
      
      return {
        by_status: {
          pendiente: trips?.filter(t => t.status === 'pendiente').length || 0,
          asignado: trips?.filter(t => t.status === 'asignado').length || 0,
          en_curso: trips?.filter(t => t.status === 'en_curso').length || 0,
          completado: trips?.filter(t => t.status === 'completado').length || 0,
        },
        total_vehicles: vehicles?.length || 0,
        vehicles_available: vehicles?.filter(v => v.status === 'disponible').length || 0
      };
    } catch (error) {
      console.error('Error getting simple stats:', error);
      return {
        by_status: { pendiente: 0, asignado: 0, en_curso: 0, completado: 0 },
        total_vehicles: 0,
        vehicles_available: 0
      };
    }
  }
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
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  },

  // Get specific trip audit logs
  getTripAuditLogs: async (tripId) => {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'trips')
      .eq('entity_id', tripId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
};

// Export all APIs
export default {
  auth: authApi,
  trips: tripsApi,
  users: usersApi,
  vehicles: vehiclesApi,
  stats: statsApi,
  destinations: destinationsApi,
  origins: originsApi,
  originServicesApi: originServicesApi,
  clinicalStaff: clinicalStaffApi,
  auditLogs: auditLogsApi
};