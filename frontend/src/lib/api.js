import supabaseApi from './supabase-api';
import { supabase } from './supabase';

const generateFolio = () => `TR-${Math.floor(Math.random() * 1000000)}`;

const api = {
  get: async (url, config = {}) => {
    try {
      // Manejar rutas con parámetros de query (ej. /trips/calendar?start_date=...)
      const baseUrl = url.split('?')[0];
      const queryString = url.includes('?') ? url.split('?')[1] : '';
      const queryParams = Object.fromEntries(new URLSearchParams(queryString));

      switch (baseUrl) {
        case "/auth/me": {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          return { data: profile };
        }

        case "/stats/dashboard":
          return await supabaseApi.stats.getDashboardStats();

        case "/trips/active":
          return { data: await supabaseApi.trips.getActiveTrips() };

        case "/trips/gestion_revision": {
          // Traslados clínicos en estado revision_gestor
          const revTrips = await supabaseApi.trips.getTrips({ status: ['revision_gestor'] });
          return { data: revTrips.filter(t => t.trip_type === 'clinico') };
        }

        case "/trips/calendar": {
          // Temporarily removing the date filter to ensure all trips are fetched
          // so we can see if the .gte / .lte was causing them to disappear
          const calTrips = await supabaseApi.trips.getTripHistory();
          return { data: calTrips };
        }

        case "/trips/user": {
          const { data: { session: userSession } } = await supabase.auth.getSession();
          const userTrips = await supabaseApi.trips.getTrips({ requester_id: userSession?.user?.id });
          return { data: userTrips };
        }

        case "/trips/driver": {
          const { data: { session: driverSession } } = await supabase.auth.getSession();
          const driverTrips = await supabaseApi.trips.getTrips({ driver_id: driverSession?.user?.id });
          return { data: driverTrips };
        }

        case "/trips/pool": {
          const poolTrips = await supabaseApi.trips.getTripPool();
          return { data: poolTrips };
        }

        case "/drivers": {
          const drivers = await supabaseApi.users.getUsers();
          return { data: drivers?.filter(u => u.role === 'conductor') || [] };
        }

        case "/destinations":
        case "/origin-services":
          return { data: await supabaseApi.destinations.getDestinations() };

        case "/clinical-staff":
          return { data: await supabaseApi.clinicalStaff.getClinicalStaff() };

        case "/vehicles":
          return { data: await supabaseApi.vehicles.getVehicles() };

        case "/trips/history": {
          const historyTrips = await supabaseApi.trips.getTripHistory(config.params || {});
          return { data: historyTrips };
        }

        case "/reports/logbook": {
          const { vehicle_id, start_date, end_date } = config.params || {};
          const logbookData = await supabaseApi.trips.getTripHistory({
            vehicle_id,
            startDate: start_date,
            endDate: end_date
          });
          return {
            data: {
              trips: logbookData || [],
              period: { start: start_date, end: end_date },
              fuel_logs: [],
              incident_logs: []
            }
          };
        }

        case "/trips": {
          let currentUserId = null;
          try {
            const token = localStorage.getItem('supabase.auth.token');
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              currentUserId = payload.userId;
            }
          } catch (e) {
            console.error("Error decoding token in api.js", e);
          }
          
          if (!currentUserId) {
            const { data: { session: tripsSession } } = await supabase.auth.getSession();
            currentUserId = tripsSession?.user?.id;
          }
          
          const userTrips = await supabaseApi.trips.getTrips(currentUserId ? { requester_id: currentUserId } : {});
          return { data: userTrips || [] };
        }

        default: {
          // Handle /logbook-list/* routes
          if (baseUrl.startsWith("/logbook-list")) {
            // Return empty array - logbook entries would need a dedicated table
            return { data: [] };
          }
          return { data: [] };
        }
      }
    } catch (e) {
      console.error("API GET Error:", url, e);
      return { data: [] };
    }
  },

  post: async (url, data) => {
    try {
      switch (url) {
        case "/trips": {
          let currentUserId = null;
          try {
            const token = localStorage.getItem('supabase.auth.token');
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              currentUserId = payload.userId;
            }
          } catch (e) {
            console.error("Error decoding token in api.js POST", e);
          }

          if (!currentUserId) {
             const { data: { session } } = await supabase.auth.getSession();
             currentUserId = session?.user?.id;
          }

          const tripData = {
            ...data,
            requester_id: currentUserId,
            tracking_number: generateFolio(),
            scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0]
          };
          return { data: await supabaseApi.trips.createTrip(tripData) };
        }

        case "/destinations":
        case "/origin-services": {
          const destData = { name: data.name, is_active: data.is_active !== false };
          return { data: await supabaseApi.destinations.createDestination(destData) };
        }

        case "/clinical-staff":
          return { data: await supabaseApi.clinicalStaff.createClinicalStaff(data) };

        case "/vehicles":
          return { data: await supabaseApi.vehicles.createVehicle(data) };

        case "/auth/register":
          return { data: await supabaseApi.auth.register(data) };

        case "/auth/login":
          return { data: await supabaseApi.auth.login(data) };

        default:
          return { data: { success: true } };
      }
    } catch (e) {
      console.error("API POST Error:", url, e);
      throw e;
    }
  },

  put: async (url, data) => {
    try {
      const parts = url.split("/");

      if (url.startsWith("/trips/")) {
        const tripId = parts[2];

        if (parts[3] === "manager-assign") {
          return { data: await supabaseApi.trips.assignDriver(tripId, data.driver_id, data.vehicle_id) };
        } else if (parts[3] === "unassign") {
          return {
            data: await supabaseApi.trips.updateTrip(tripId, {
              driver_id: null,
              driver_name: null,
              vehicle_plate: null,
              status: 'pendiente'
            })
          };
        } else if (parts[3] === "status") {
          return {
            data: await supabaseApi.trips.updateStatus(tripId, data.status, {
              mileage: data.mileage,
              cancel_reason: data.cancel_reason || null
            })
          };
        } else if (parts[3] === "approve-gestor") {
          // Visar traslado: pasa de revision_gestor a pendiente
          return {
            data: await supabaseApi.trips.updateTrip(tripId, {
              ...data,
              status: 'pendiente'
            })
          };
        } else {
          return { data: await supabaseApi.trips.updateTrip(tripId, data) };
        }
      }

      if (url.startsWith("/users/")) {
        const userId = parts[2];

        if (parts[3] === "approve") {
          return { data: await supabaseApi.users.updateUserStatus(userId, 'approve') };
        } else if (parts[3] === "reject") {
          return { data: await supabaseApi.users.updateUserStatus(userId, 'reject') };
        } else if (parts[3] === "role") {
          return { data: await supabaseApi.users.updateUserRole(userId, data.role) };
        }
      }

      if (url.startsWith("/vehicles/")) {
        const vehicleId = parts[2];

        if (parts[3] === "status") {
          return { data: await supabaseApi.vehicles.updateStatus(vehicleId, data.status) };
        } else if (parts[3] === "mileage") {
          return { data: await supabaseApi.vehicles.updateMileage(vehicleId, data.mileage) };
        } else {
          return { data: await supabaseApi.vehicles.updateVehicle(vehicleId, data) };
        }
      }

      if (url.startsWith("/clinical-staff/")) {
        const staffId = parts[2];
        return { data: await supabaseApi.clinicalStaff.updateClinicalStaff(staffId, data) };
      }

      if (url.startsWith("/origin-services/")) {
        const serviceId = parts[2];
        return { data: await supabaseApi.destinations.updateDestination(serviceId, data) };
      }

      return { data: { success: true } };
    } catch (e) {
      console.error("API PUT Error:", url, e);
      throw e;
    }
  },

  delete: async (url) => {
    try {
      const parts = url.split("/");

      if (url === "/trips/clear-all") {
        const allTrips = await supabaseApi.trips.getTrips();
        for (const trip of allTrips) {
          if (trip.id !== '00000000-0000-0000-0000-000000000000') {
            await supabaseApi.trips.deleteTrip(trip.id);
          }
        }
        return { data: { success: true } };
      }

      if (url.startsWith("/trips/")) {
        const tripId = parts[2];
        await supabaseApi.trips.deleteTrip(tripId);
        return { data: { success: true } };
      }

      if (url.startsWith("/users/")) {
        const userId = parts[2];
        await supabaseApi.users.deleteUser(userId);
        return { data: { success: true } };
      }

      if (url.startsWith("/vehicles/")) {
        const vehicleId = parts[2];
        await supabaseApi.vehicles.deleteVehicle(vehicleId);
        return { data: { success: true } };
      }

      if (url.startsWith("/destinations/")) {
        const destId = parts[2];
        await supabaseApi.destinations.deleteDestination(destId);
        return { data: { success: true } };
      }

      if (url.startsWith("/clinical-staff/")) {
        const staffId = parts[2];
        await supabaseApi.clinicalStaff.deleteClinicalStaff(staffId);
        return { data: { success: true } };
      }

      return { data: { success: true } };
    } catch (e) {
      console.error("API DELETE Error:", url, e);
      throw e;
    }
  }
};

export default api;