// Las lecturas de perfiles pasan por el backend (/api/profiles) y nunca por supabase.from('profiles').
import api from './api';
import supabaseApi, { callSupabaseFunction } from './supabase-api';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  customFetch: jest.fn(),
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() }
  }
}));

jest.mock('./supabase-api', () => ({
  __esModule: true,
  default: {
    profiles: { me: jest.fn(), directory: jest.fn() },
    users: { getDrivers: jest.fn() },
    trips: { getTrips: jest.fn() },
    clinicalStaff: { getClinicalStaff: jest.fn() }
  },
  callSupabaseFunction: jest.fn(),
  setLocalTripGroup: jest.fn(),
  getLocalTripGroups: jest.fn(() => ({}))
}));

const SESION = { data: { session: { user: { id: 'u1', email: 'u@x.cl', user_metadata: { name: 'Usuario' } } } } };

beforeEach(() => {
  jest.clearAllMocks();
  supabase.auth.getSession.mockResolvedValue(SESION);
  supabase.from.mockImplementation((tabla) => {
    throw new Error(`acceso directo inesperado a ${tabla}`);
  });
});

describe('lecturas de perfiles', () => {
  it('/auth/me devuelve el perfil que entrega el backend', async () => {
    supabaseApi.profiles.me.mockResolvedValue({ profile: { id: 'u1', role: 'conductor' }, department_user_ids: [] });

    const res = await api.get('/auth/me');

    expect(res.data).toEqual({ id: 'u1', role: 'conductor' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('/trips/user de un solicitante filtra por las personas de su departamento', async () => {
    supabaseApi.profiles.me.mockResolvedValue({
      profile: { id: 'u1', role: 'solicitante', department: 'Urgencia' },
      department_user_ids: ['u1', 'u2', 'u3']
    });
    supabaseApi.trips.getTrips.mockResolvedValue([]);

    await api.get('/trips/user');

    expect(supabaseApi.trips.getTrips).toHaveBeenCalledWith({ requester_ids: ['u1', 'u2', 'u3'] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('/trips/user de otro rol filtra solo por su propio id', async () => {
    supabaseApi.profiles.me.mockResolvedValue({ profile: { id: 'u1', role: 'coordinador' }, department_user_ids: [] });
    supabaseApi.trips.getTrips.mockResolvedValue([]);

    await api.get('/trips/user');

    expect(supabaseApi.trips.getTrips).toHaveBeenCalledWith({ requester_id: 'u1' });
  });

  it('/drivers usa el directorio mínimo del backend', async () => {
    supabaseApi.users.getDrivers.mockResolvedValue([{ id: 'c1', name: 'Conductor' }]);

    const res = await api.get('/drivers');

    expect(res.data).toEqual([{ id: 'c1', name: 'Conductor' }]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('/clinical-staff combina el catálogo con el personal registrado y tolera que el directorio falle', async () => {
    supabaseApi.clinicalStaff.getClinicalStaff.mockResolvedValue([{ id: 'k1', name: 'Catálogo' }]);
    supabaseApi.profiles.directory.mockRejectedValue(new Error('sin permiso'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await api.get('/clinical-staff');

    expect(res.data).toEqual([{ id: 'k1', name: 'Catálogo' }]);
  });
});

describe('POST /drivers/status', () => {
  it('si el backend rechaza el cambio de turno, el error llega a la pantalla (sin escritura directa de respaldo)', async () => {
    callSupabaseFunction.mockRejectedValue(new Error('Solo puedes cambiar tu propio turno'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(api.post('/drivers/status', { is_working: true })).rejects.toThrow(/propio turno/);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
