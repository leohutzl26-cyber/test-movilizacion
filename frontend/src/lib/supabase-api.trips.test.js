// Los traslados se leen y se borran a través del backend (/api/trips-read y /api/trips-delete).
// Aquí se prueba supabase-api.js real, simulando solo la red.
import { tripsApi } from './supabase-api';
import { customFetch, supabase } from './supabase';

jest.mock('./supabase', () => ({
  customFetch: jest.fn(),
  supabase: { from: jest.fn() }
}));

const responder = (cuerpo, estado = 200) => ({
  ok: estado >= 200 && estado < 300,
  status: estado,
  text: async () => JSON.stringify(cuerpo)
});

const ultimaPeticion = () => {
  const [url, opciones] = customFetch.mock.calls[customFetch.mock.calls.length - 1];
  return { url, cuerpo: JSON.parse(opciones.body) };
};

beforeEach(() => {
  jest.clearAllMocks();
  supabase.from.mockImplementation((tabla) => {
    throw new Error(`acceso directo inesperado a ${tabla}`);
  });
});

describe('lectura de traslados', () => {
  it('getTrips pide la lista a /api/trips-read con los filtros y no toca la base directo', async () => {
    customFetch.mockResolvedValue(responder({ trips: [{ id: 't1', assigned_clinical_staff: ['{"staff_id":"c1"}'] }] }));

    const res = await tripsApi.getTrips({ status: ['pendiente', 'asignado'], driver_id: 'd1' });

    const { url, cuerpo } = ultimaPeticion();
    expect(url).toMatch(/\/api\/trips-read$/);
    expect(cuerpo).toEqual({ action: 'list', status: ['pendiente', 'asignado'], driver_id: 'd1' });
    expect(res).toHaveLength(1);
    expect(res[0].assigned_clinical_staff).toEqual([{ staff_id: 'c1' }]); // parseTrip sigue aplicándose
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('con paginación devuelve { trips, total }', async () => {
    customFetch.mockResolvedValue(responder({ trips: [{ id: 't1' }, { id: 't2' }], total: 37 }));

    const res = await tripsApi.getTrips({ page: 2, limit: 2 });

    expect(res.total).toBe(37);
    expect(res.trips).toHaveLength(2);
  });

  it('getTripHistory usa el mismo endpoint con los filtros de historial', async () => {
    customFetch.mockResolvedValue(responder({ trips: [] }));

    await tripsApi.getTripHistory({ search: 'luis', startDate: '2026-10-01', endDate: '2026-10-31', status: 'completado' });

    expect(ultimaPeticion().cuerpo).toEqual({
      action: 'list', search: 'luis', startDate: '2026-10-01', endDate: '2026-10-31', status: 'completado'
    });
  });

  it('getTripById pide un traslado por id y propaga el 404 si no puede verlo', async () => {
    customFetch.mockResolvedValueOnce(responder({ trip: { id: 't1' } }));
    expect((await tripsApi.getTripById('t1')).id).toBe('t1');
    expect(ultimaPeticion().cuerpo).toEqual({ action: 'get', id: 't1' });

    customFetch.mockResolvedValueOnce(responder({ error: 'Traslado no encontrado' }, 404));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(tripsApi.getTripById('t2')).rejects.toThrow(/no encontrado/);
  });

  it('getActiveTrips envía la fecha local del navegador', async () => {
    customFetch.mockResolvedValue(responder({ trips: [{ id: 'a' }, { id: 'b' }] }));

    const res = await tripsApi.getActiveTrips();

    const { cuerpo } = ultimaPeticion();
    expect(cuerpo.action).toBe('active');
    expect(cuerpo.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res).toHaveLength(2);
  });
});

describe('borrado de traslados', () => {
  it('deleteTrip llama a /api/trips-delete', async () => {
    customFetch.mockResolvedValue(responder({ message: 'ok' }));

    await tripsApi.deleteTrip('t1');

    const { url, cuerpo } = ultimaPeticion();
    expect(url).toMatch(/\/api\/trips-delete$/);
    expect(cuerpo).toEqual({ id: 't1' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('si el backend rechaza el borrado, el error llega a la pantalla', async () => {
    customFetch.mockResolvedValue(responder({ error: 'Acceso denegado: Se requiere perfil de Administrador' }, 403));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(tripsApi.deleteTrip('t1')).rejects.toThrow(/Administrador/);
  });
});
