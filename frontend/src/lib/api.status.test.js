// Regresión: PUT /trips/:id/status debe pasar siempre por el backend. Antes solo lo hacía
// para en_curso/completado/cancelado y el resto (p. ej. devolver al gestor de camas) se
// escribía directo con la anon key, donde RLS descarta la fila sin error y la pantalla
// mostraba éxito sin haber guardado nada.
import api from './api';
import supabaseApi from './supabase-api';
import { supabase } from './supabase';

jest.mock('./supabase', () => ({
  customFetch: jest.fn(),
  supabase: { from: jest.fn(), auth: { getSession: jest.fn() } }
}));

jest.mock('./supabase-api', () => {
  const updateStatus = jest.fn();
  return {
    __esModule: true,
    default: { trips: { updateStatus }, auditLogs: {} },
    callSupabaseFunction: jest.fn(),
    setLocalTripGroup: jest.fn(),
    getLocalTripGroups: jest.fn(() => ({}))
  };
});

const updateStatus = supabaseApi.trips.updateStatus;

beforeEach(() => {
  jest.clearAllMocks();
  updateStatus.mockResolvedValue({ id: 't1', status: 'revision_gestor' });
});

describe('PUT /trips/:id/status', () => {
  it('devolver al gestor de camas llama al backend y no escribe directo', async () => {
    const res = await api.put('/trips/t1/status', { status: 'revision_gestor' });

    expect(updateStatus).toHaveBeenCalledTimes(1);
    expect(updateStatus.mock.calls[0][0]).toBe('t1');
    expect(updateStatus.mock.calls[0][1]).toBe('revision_gestor');
    expect(supabase.from).not.toHaveBeenCalled();
    expect(res.data.status).toBe('revision_gestor');
  });

  it.each(['pendiente', 'asignado', 'en_curso', 'completado', 'cancelado'])(
    'el estado %s también pasa por el backend',
    async (status) => {
      await api.put('/trips/t1/status', { status });
      expect(updateStatus.mock.calls[0][1]).toBe(status);
      expect(supabase.from).not.toHaveBeenCalled();
    }
  );

  it('guardar solo notas (sin estado) pasa por el backend con los campos de nota', async () => {
    await api.put('/trips/t1/status', { clinical_notes: 'sin novedad', notes: 'x' });

    expect(updateStatus.mock.calls[0][1]).toBeUndefined();
    expect(updateStatus.mock.calls[0][2]).toMatchObject({ clinical_notes: 'sin novedad', notes: 'x' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('si el backend rechaza el cambio, el error llega a la pantalla (no hay éxito falso)', async () => {
    updateStatus.mockRejectedValue(new Error('Cannot change status from completado to revision_gestor'));

    await expect(api.put('/trips/t1/status', { status: 'revision_gestor' })).rejects.toThrow(/Cannot change status/);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('si el backend no devuelve el traslado, falla en vez de simular éxito', async () => {
    updateStatus.mockResolvedValue(null);

    await expect(api.put('/trips/t1/status', { status: 'revision_gestor' })).rejects.toThrow(/No se pudo actualizar/);
  });
});
