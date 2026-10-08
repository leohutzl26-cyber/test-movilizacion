// Rutas de traslados en api.js: usan el backend y no escriben ni leen la tabla directo.
import api from './api';
import supabaseApi from './supabase-api';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  customFetch: jest.fn(),
  supabase: { from: jest.fn(), auth: { getSession: jest.fn() } }
}));

jest.mock('./supabase-api', () => ({
  __esModule: true,
  default: {
    profiles: { me: jest.fn(), directory: jest.fn() },
    trips: { getTrips: jest.fn(), deleteTrip: jest.fn(), getActiveTrips: jest.fn() }
  },
  callSupabaseFunction: jest.fn(),
  setLocalTripGroup: jest.fn(),
  getLocalTripGroups: jest.fn(() => ({}))
}));

beforeEach(() => {
  jest.clearAllMocks();
  supabase.from.mockImplementation((tabla) => {
    throw new Error(`acceso directo inesperado a ${tabla}`);
  });
});

describe('/trips/clinical-pool', () => {
  it('pide al backend los clínicos abiertos y deja solo los sin acompañante confirmado', async () => {
    supabaseApi.trips.getTrips.mockResolvedValue([
      { id: 'sin-personal', assigned_clinical_staff: null },
      { id: 'por-identificar', assigned_clinical_staff: [{ staff_id: 'none', staff_name: 'Por identificar' }] },
      { id: 'confirmado', assigned_clinical_staff: [{ staff_id: 'c1', staff_name: 'Clínica' }] },
      { id: 'confirmado-json', assigned_clinical_staff: ['{"staff_id":"c2"}'] }
    ]);

    const res = await api.get('/trips/clinical-pool');

    expect(supabaseApi.trips.getTrips).toHaveBeenCalledWith({
      trip_type: 'clinico',
      exclude_status: ['cancelado', 'completado'],
      order_by: 'scheduled_date',
      ascending: true
    });
    expect(res.data.map((t) => t.id)).toEqual(['sin-personal', 'por-identificar']);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('si el backend falla, devuelve una lista vacía en vez de romper la pantalla', async () => {
    supabaseApi.trips.getTrips.mockRejectedValue(new Error('sin permiso'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const res = await api.get('/trips/clinical-pool');

    expect(res.data).toEqual([]);
  });
});

describe('/trips/escorts-overview', () => {
  it('cuenta por acompañante a partir de los traslados que entrega el backend', async () => {
    supabaseApi.profiles.directory.mockResolvedValue([{ id: 'c1', name: 'Clínica Uno', department: 'TENS', is_working: true }]);
    supabaseApi.trips.getTrips.mockResolvedValue([
      { id: 't1', status: 'en_curso', assigned_clinical_staff: [{ staff_id: 'c1' }] },
      { id: 't2', status: 'asignado', assigned_clinical_staff: [{ staff_id: 'c1' }] },
      { id: 't3', status: 'completado', assigned_clinical_staff: [{ staff_id: 'c1', status: 'completado' }] }
    ]);

    const res = await api.get('/trips/escorts-overview');

    expect(supabaseApi.trips.getTrips).toHaveBeenCalledWith({ trip_type: 'clinico', exclude_status: ['cancelado'] });
    expect(res.data[0]).toMatchObject({ id: 'c1', active_count: 1, scheduled_count: 1, completed_count: 1 });
  });
});

describe('DELETE /trips', () => {
  it('borra un traslado a través del backend', async () => {
    supabaseApi.trips.deleteTrip.mockResolvedValue(undefined);

    await api.delete('/trips/t1');

    expect(supabaseApi.trips.deleteTrip).toHaveBeenCalledWith('t1');
  });

  it('ya no existe el borrado masivo: /trips/clear-all no recorre ni borra todos los traslados', async () => {
    supabaseApi.trips.deleteTrip.mockRejectedValue(new Error('id de traslado no válido'));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(api.delete('/trips/clear-all')).rejects.toThrow(/no válido/);

    expect(supabaseApi.trips.getTrips).not.toHaveBeenCalled();
    expect(supabaseApi.trips.deleteTrip).toHaveBeenCalledTimes(1);
  });
});
