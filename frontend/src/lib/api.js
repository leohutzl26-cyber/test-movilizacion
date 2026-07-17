import supabaseApi from './supabase-api';
import { supabase } from './supabase';

const getCurrentUserSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.user_metadata?.name || session.user.email
        }
      };
    }
  } catch (e) {
    console.warn("supabase.auth.getSession() failed, falling back to localStorage JWT:", e);
  }

  try {
    const token = localStorage.getItem('supabase.auth.token');
    if (token) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadText = atob(parts[1]);
        const payload = JSON.parse(payloadText);
        
        if (payload.exp && Date.now() >= payload.exp * 1000) {
          localStorage.removeItem('supabase.auth.token');
          throw new Error("Token expired");
        }

        return {
          user: {
            id: payload.userId,
            email: payload.email,
            name: payload.name || payload.email
          }
        };
      }
    }
  } catch (e) {
    console.error("Error decoding custom JWT token from localStorage:", e);
  }

  throw new Error("No session");
};

const generateFolio = () => `TR-${Math.floor(Math.random() * 1000000)}`;

const formatDateShort = (val) => {
  if (!val) return '';
  try {
    const cleanDateStr = typeof val === 'string' && val.includes("T") ? val.split("T")[0] : String(val);
    const parts = cleanDateStr.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      
      const shortMonths = [
        "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
        "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
      ];
      
      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day}-${shortMonths[monthIndex]}-${year}`;
      }
    }
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      const day = date.getDate();
      const year = date.getFullYear();
      const shortMonths = [
        "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
        "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"
      ];
      return `${day}-${shortMonths[date.getMonth()]}-${year}`;
    }
  } catch (e) {
    console.error("Error formatting short date:", e);
  }
  return String(val);
};

const formatValue = (key, val) => {
  if (key === 'assigned_clinical_staff') {
    if (!val) return '';
    let arr = val;
    if (typeof val === 'string') {
      try { arr = JSON.parse(val); } catch (e) { return val; }
    }
    if (!Array.isArray(arr)) return String(val);
    return arr.map(s => {
      let obj = s;
      if (typeof s === 'string') {
        try { obj = JSON.parse(s); } catch (e) {}
      }
      const type = obj?.type || obj?.cargo || '';
      const name = obj?.staff_name || obj?.name || obj?.nombre || 'Por identificar';
      return type ? `${type}: ${name}` : name;
    }).join(', ');
  }
  if (key === 'scheduled_date') {
    return formatDateShort(val);
  }
  return val === null || val === undefined ? '' : String(val).trim();
};

const api = {
  get: async (url, config = {}) => {
    try {
      // Manejar rutas con parámetros de query (ej. /trips/calendar?start_date=...)
      const baseUrl = url.split('?')[0];
      const queryString = url.includes('?') ? url.split('?')[1] : '';
      const queryParams = Object.fromEntries(new URLSearchParams(queryString));

      switch (baseUrl) {
        case "/auth/me": {
          const session = await getCurrentUserSession();
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          return { data: profile };
        }

        case "/stats/dashboard":
          return { data: await supabaseApi.stats.getDashboardStats() };

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
          const session = await getCurrentUserSession();
          const { data: profile } = await supabase.from('profiles').select('role, department').eq('id', session.user.id).single();
          
          let userTrips;
          if (profile && profile.role === 'solicitante' && profile.department) {
            const { data: deptUsers } = await supabase.from('profiles').select('id').eq('department', profile.department);
            const userIds = (deptUsers || []).map(u => u.id);
            if (userIds.length > 0) {
              userTrips = await supabaseApi.trips.getTrips({ requester_ids: userIds });
            } else {
              userTrips = await supabaseApi.trips.getTrips({ requester_id: session.user.id });
            }
          } else {
            userTrips = await supabaseApi.trips.getTrips({ requester_id: session.user.id });
          }
          return { data: userTrips };
        }

        case "/trips/driver": {
          const session = await getCurrentUserSession();
          const driverTrips = await supabaseApi.trips.getTrips({ driver_id: session.user.id });
          return { data: driverTrips };
        }

        case "/trips/v2/history": {
          const session = await getCurrentUserSession();
          const driverId = session.user.id;
          const params = {
            driver_id: driverId,
            status: ['completado', 'cancelado'],
            ...queryParams,
            ...config.params
          };
          const historyTrips = await supabaseApi.trips.getTrips(params);
          if (params.page && params.limit) {
            return { data: { trips: historyTrips.trips, total: historyTrips.total } };
          }
          return { data: { trips: historyTrips || [] } };
        }

        case "/trips/pool": {
          const poolTrips = await supabaseApi.trips.getTripPool();
          return { data: (poolTrips || []).filter(t => !t.driver_id) };
        }

        case "/drivers": {
          const drivers = await supabaseApi.users.getUsers();
          return { data: drivers?.filter(u => u.role === 'conductor') || [] };
        }

        case "/origins":
          return { data: await supabaseApi.origins.getOrigins() };

        case "/destinations":
          return { data: await supabaseApi.destinations.getDestinations() };

        case "/origin-services":
          return { data: await supabaseApi.originServicesApi.getOriginServices() };

        case "/clinical-staff":
          return { data: await supabaseApi.clinicalStaff.getClinicalStaff() };

        case "/vehicles":
          return { data: await supabaseApi.vehicles.getVehicles() };

        case "/trips/by-driver": {
          const targetDate = queryParams.date || new Date().toISOString().split('T')[0];
          
          // 1. Obtener todos los conductores
          const { data: drivers, error: driversError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'conductor');
          
          if (driversError) throw driversError;
          
          // 2. Obtener todos los vehículos para saber el tipo (vehicle_type) usando la patente
          const { data: vehicles, error: vehiclesError } = await supabase
            .from('vehicles')
            .select('*');
            
          if (vehiclesError) throw vehiclesError;
          const vMap = {};
          (vehicles || []).forEach(v => {
            if (v.plate) vMap[v.plate.toLowerCase()] = v;
          });
          
          // 3. Obtener todos los viajes para esa fecha (no cancelados)
          const { data: rawTrips, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('scheduled_date', targetDate)
            .neq('status', 'cancelado')
            .order('appointment_time', { ascending: true });
            
          if (tripsError) throw tripsError;
          
          // Parsear campos JSON en los traslados
          const trips = (rawTrips || []).map(t => {
            const parsed = { ...t };
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
          });
          
          // 4. Agrupar viajes por conductor
          const res = [];
          
          // Mapear cada conductor
          (drivers || []).forEach(d => {
            const dVeh = d.vehicle_plate ? vMap[d.vehicle_plate.toLowerCase()] : null;
            const driverInfo = {
              id: d.id,
              name: d.name,
              vehicle_plate: d.vehicle_plate || null,
              vehicle_type: dVeh ? dVeh.type : 'Auto/SUV'
            };
            
            const driverTrips = trips.filter(t => t.driver_id === d.id);
            driverTrips.forEach(t => {
              const tVeh = t.vehicle_plate ? vMap[t.vehicle_plate.toLowerCase()] : null;
              t.vehicle_type = tVeh ? tVeh.type : 'Auto/SUV';
            });
            
            res.push({
              driver: driverInfo,
              trips: driverTrips
            });
          });
          
          // Mapear los no asignados
          const unassignedTrips = trips.filter(t => !t.driver_id);
          unassignedTrips.forEach(t => {
            const tVeh = t.vehicle_plate ? vMap[t.vehicle_plate.toLowerCase()] : null;
            t.vehicle_type = tVeh ? tVeh.type : 'Auto/SUV';
          });
          
          // Agregar la columna "Sin Conductor" al principio del listado de forma permanente
          res.unshift({
            driver: { id: "unassigned", name: "Sin Conductor" },
            trips: unassignedTrips
          });
          
          return { data: res };
        }

        case "/trips/history": {
          const params = {
            ...queryParams,
            ...config.params
          };
          const historyTrips = await supabaseApi.trips.getTripHistory(params);
          if (params.page && params.limit) {
            return { data: { trips: historyTrips.trips, total: historyTrips.total } };
          }
          return { data: historyTrips };
        }

        case "/reports/logbook": {
          const { vehicle_id, start_date, end_date } = config.params || {};
          const logbookData = await supabaseApi.trips.getTripHistory({
            vehicle_id,
            status: "completado",
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
            const session = await getCurrentUserSession();
            currentUserId = session.user.id;
          } catch (e) {
            console.error("Error getting session in /trips GET", e);
          }
          
          let userTrips;
          if (currentUserId) {
            const { data: profile } = await supabase.from('profiles').select('role, department').eq('id', currentUserId).single();
            if (profile && profile.role === 'solicitante' && profile.department) {
              const { data: deptUsers } = await supabase.from('profiles').select('id').eq('department', profile.department);
              const userIds = (deptUsers || []).map(u => u.id);
              if (userIds.length > 0) {
                userTrips = await supabaseApi.trips.getTrips({ requester_ids: userIds });
              } else {
                userTrips = await supabaseApi.trips.getTrips({ requester_id: currentUserId });
              }
            } else {
              userTrips = await supabaseApi.trips.getTrips({ requester_id: currentUserId });
            }
          } else {
            userTrips = await supabaseApi.trips.getTrips({});
          }
          return { data: userTrips || [] };
        }

        default: {
          // Rutas dinámicas como /trips/:id/logs
          if (baseUrl.startsWith("/trips/") && (baseUrl.endsWith("/logs") || baseUrl.endsWith("/audit"))) {
            const tripId = baseUrl.split("/")[2];
            return { data: await supabaseApi.auditLogs.getTripAuditLogs(tripId) };
          }
          
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
      throw e;
    }
  },

  post: async (url, data) => {
    try {
      switch (url) {
        case "/trips": {
          let currentUserId = null;
          try {
            const session = await getCurrentUserSession();
            currentUserId = session.user.id;
          } catch (e) {
            console.error("Error getting session in /trips POST", e);
          }

          const tripData = {
            ...data,
            requester_id: currentUserId,
            tracking_number: generateFolio(),
            scheduled_date: data.scheduled_date || new Date().toISOString().split('T')[0]
          };
          return { data: await supabaseApi.trips.createTrip(tripData) };
        }

        case "/origins": {
          const originData = { name: data.name, address: data.address, maps_url: data.maps_url };
          return { data: await supabaseApi.origins.createOrigin(originData) };
        }

        case "/destinations": {
          const destData = { name: data.name, address: data.address, maps_url: data.maps_url };
          return { data: await supabaseApi.destinations.createDestination(destData) };
        }

        case "/origin-services": {
          const serviceData = { name: data.name, address: data.address };
          return { data: await supabaseApi.originServicesApi.createOriginService(serviceData) };
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

        if (tripId === "reorder") {
          const promises = (data.trip_ids || []).map((id, index) => 
            supabaseApi.trips.updateTrip(id, { order_in_group: index })
          );
          try {
            await Promise.all(promises);
          } catch (e) {
            console.warn("Reorder failed. Missing column order_in_group in trips table:", e);
          }
          return { data: { success: true } };
        }

        if (parts[3] === "manager-assign") {
          const oldTrip = await supabaseApi.trips.getTripById(tripId);
          if (oldTrip && oldTrip.status === "completado") {
            throw new Error("No se puede asignar un traslado completado");
          }
          return { data: await supabaseApi.trips.assignDriver(tripId, data.driver_id, data.vehicle_id) };
        } else if (parts[3] === "assign") {
          const oldTrip = await supabaseApi.trips.getTripById(tripId);
          if (oldTrip && oldTrip.status === "completado") {
            throw new Error("No se puede asignar un traslado completado");
          }
          const session = await getCurrentUserSession();
          const driverId = session.user.id;
          
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('vehicle_plate')
            .eq('id', driverId)
            .single();
          
          if (profileErr) {
            console.error("Error fetching driver profile:", profileErr);
          }
          
          let vehicleId = null;
          if (profile?.vehicle_plate) {
            const { data: vehicle, error: vehicleErr } = await supabase
              .from('vehicles')
              .select('id')
              .eq('plate', profile.vehicle_plate)
              .single();
            
            if (vehicleErr) {
              console.error("Error fetching vehicle by plate:", vehicleErr);
            } else if (vehicle) {
              vehicleId = vehicle.id;
            }
          }
          
          return { data: await supabaseApi.trips.assignDriver(tripId, driverId, vehicleId) };
        } else if (parts[3] === "unassign") {
          const oldTrip = await supabaseApi.trips.getTripById(tripId);
          if (oldTrip && oldTrip.status === "completado") {
            throw new Error("No se puede desasignar un traslado completado");
          }
          const updatedTrip = await supabaseApi.trips.updateTrip(tripId, {
            driver_id: null,
            driver_name: null,
            vehicle_plate: null,
            status: 'pendiente'
          });

          let userId = null;
          let userName = "Coordinador";
          let userRole = "coordinador";
          try {
            const token = localStorage.getItem('supabase.auth.token');
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userId = payload.userId || null;
              userName = payload.name || "Coordinador";
              userRole = payload.role || "coordinador";
            }
          } catch (e) {}

          try {
            await supabase.from('audit_logs').insert([{
              user_id: userId,
              user_name: userName,
              user_role: userRole,
              action: 'desasignar_conductor',
              entity_type: 'trips',
              entity_id: tripId,
              new_values: updatedTrip
            }]);
          } catch (e) {
            console.error("Error inserting unassign audit log", e);
          }

          return { data: updatedTrip };
        } else if (parts[3] === "status") {
          return {
            data: await supabaseApi.trips.updateStatus(tripId, data.status, {
              mileage: data.mileage,
              cancel_reason: data.cancel_reason || null,
              vehicle_id: data.vehicle_id || null,
              driver_notes: data.driver_notes
            })
          };
        } else if (parts[3] === "approve-gestor") {
          const oldTrip = await supabaseApi.trips.getTripById(tripId);
          // Visar traslado: pasa de revision_gestor a pendiente
          const updatedTrip = await supabaseApi.trips.updateTrip(tripId, {
            ...data,
            status: 'pendiente'
          });

          let userId = null;
          let userName = "Gestor de Camas";
          let userRole = "gestion_camas";
          try {
            const token = localStorage.getItem('supabase.auth.token');
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              userId = payload.userId || null;
              userName = payload.name || "Gestor de Camas";
              userRole = payload.role || "gestion_camas";
            }
          } catch (e) {
            console.error("Error decoding token for audit log", e);
          }

          // Registrar la visación
          try {
            await supabase.from('audit_logs').insert([{
              user_id: userId,
              user_name: userName,
              user_role: userRole,
              action: 'cambiar_estado_pendiente',
              entity_type: 'trips',
              entity_id: tripId,
              new_values: updatedTrip
            }]);
          } catch (e) {
            console.error("Error inserting audit log for approve-gestor", e);
          }

          // Comparar si el Gestor también realizó cambios en campos operacionales o clínicos al visar
          const fieldsToCompare = [
            { key: 'origin', label: 'Origen' },
            { key: 'destination', label: 'Destino' },
            { key: 'patient_name', label: 'Paciente' },
            { key: 'patient_unit', label: 'Unidad' },
            { key: 'priority', label: 'Prioridad' },
            { key: 'scheduled_date', label: 'Fecha' },
            { key: 'appointment_time', label: 'Hora Cita' },
            { key: 'notes', label: 'Notas' },
            { key: 'staff_count', label: 'Cantidad de Funcionarios' },
            { key: 'task_details', label: 'Detalle del Cometido' },
            { key: 'bed', label: 'Cama' },
            { key: 'rut', label: 'RUT' },
            { key: 'age', label: 'Edad' },
            { key: 'diagnosis', label: 'Diagnóstico' },
            { key: 'attending_physician', label: 'Médico Tratante' },
            { key: 'assigned_clinical_staff', label: 'Personal Clínico' }
          ];

          const changes = [];
          fieldsToCompare.forEach(f => {
            const oldVal = oldTrip[f.key];
            const newVal = updatedTrip[f.key];
            const strOld = formatValue(f.key, oldVal);
            const strNew = formatValue(f.key, newVal);

            if (strOld !== strNew) {
              changes.push(`${f.label} (${strOld || 'vacío'} ➔ ${strNew || 'vacío'})`);
            }
          });

          if (changes.length > 0) {
            try {
              await supabase.from('audit_logs').insert([{
                user_id: userId,
                user_name: userName,
                user_role: userRole,
                action: 'editar_traslado',
                entity_type: 'trips',
                entity_id: tripId,
                new_values: { detalle: `Modificó al visar: ${changes.join(', ')}` }
              }]);
            } catch (e) {
              console.error("Error inserting edit audit log during approve-gestor", e);
            }
          }

          return { data: updatedTrip };
        } else {
          const oldTrip = await supabaseApi.trips.getTripById(tripId);
          if (oldTrip && oldTrip.status === "completado") {
            throw new Error("No se puede modificar un traslado completado");
          }
          const updatedTrip = await supabaseApi.trips.updateTrip(tripId, data);

          const fieldsToCompare = [
            { key: 'origin', label: 'Origen' },
            { key: 'destination', label: 'Destino' },
            { key: 'patient_name', label: 'Paciente' },
            { key: 'patient_unit', label: 'Unidad' },
            { key: 'priority', label: 'Prioridad' },
            { key: 'scheduled_date', label: 'Fecha' },
            { key: 'appointment_time', label: 'Hora Cita' },
            { key: 'notes', label: 'Notas' },
            { key: 'staff_count', label: 'Cantidad de Funcionarios' },
            { key: 'task_details', label: 'Detalle del Cometido' },
            { key: 'bed', label: 'Cama' },
            { key: 'rut', label: 'RUT' },
            { key: 'age', label: 'Edad' },
            { key: 'diagnosis', label: 'Diagnóstico' },
            { key: 'attending_physician', label: 'Médico Tratante' },
            { key: 'assigned_clinical_staff', label: 'Personal Clínico' }
          ];

          const changes = [];
          fieldsToCompare.forEach(f => {
            const oldVal = oldTrip[f.key];
            const newVal = updatedTrip[f.key];
            const strOld = formatValue(f.key, oldVal);
            const strNew = formatValue(f.key, newVal);

            if (strOld !== strNew) {
              changes.push(`${f.label} (${strOld || 'vacío'} ➔ ${strNew || 'vacío'})`);
            }
          });

          if (changes.length > 0) {
            let userId = null;
            let userName = "Usuario / Coordinador";
            let userRole = "coordinador";
            try {
              const token = localStorage.getItem('supabase.auth.token');
              if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                userId = payload.userId || null;
                userName = payload.name || "Usuario / Coordinador";
                userRole = payload.role || "coordinador";
              }
            } catch (e) {}

            try {
              await supabase.from('audit_logs').insert([{
                user_id: userId,
                user_name: userName,
                user_role: userRole,
                action: 'editar_traslado',
                entity_type: 'trips',
                entity_id: tripId,
                new_values: { detalle: `Modificó: ${changes.join(', ')}` }
              }]);
            } catch (e) {
              console.error("Error inserting edit audit log", e);
            }
          }

          return { data: updatedTrip };
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

      if (url.startsWith("/destinations/")) {
        const destId = parts[2];
        const updateData = { name: data.name, address: data.address, maps_url: data.maps_url };
        return { data: await supabaseApi.destinations.updateDestination(destId, updateData) };
      }

      if (url.startsWith("/origins/")) {
        const originId = parts[2];
        const updateData = { name: data.name, address: data.address, maps_url: data.maps_url };
        return { data: await supabaseApi.origins.updateOrigin(originId, updateData) };
      }

      if (url.startsWith("/origin-services/")) {
        const serviceId = parts[2];
        const updateData = { name: data.name, address: data.address };
        return { data: await supabaseApi.originServicesApi.updateOriginService(serviceId, updateData) };
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

      if (url.startsWith("/origins/")) {
        const originId = parts[2];
        await supabaseApi.origins.deleteOrigin(originId);
        return { data: { success: true } };
      }

      if (url.startsWith("/origin-services/")) {
        const serviceId = parts[2];
        await supabaseApi.originServicesApi.deleteOriginService(serviceId);
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