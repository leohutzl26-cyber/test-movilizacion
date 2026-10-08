// El catálogo de personal clínico se lee a través del backend (/api/clinical-staff), no directo.
import { clinicalStaffApi } from './supabase-api';
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

beforeEach(() => {
  jest.clearAllMocks();
  supabase.from.mockImplementation((tabla) => {
    throw new Error(`acceso directo inesperado a ${tabla}`);
  });
});

describe('personal clínico', () => {
  it('getClinicalStaff pide la lista a /api/clinical-staff', async () => {
    customFetch.mockResolvedValue(responder({ staff: [{ id: 'k1', name: 'Ana' }] }));

    const res = await clinicalStaffApi.getClinicalStaff();

    const [url, opciones] = customFetch.mock.calls[0];
    expect(url).toMatch(/\/api\/clinical-staff$/);
    expect(JSON.parse(opciones.body)).toEqual({ action: 'list' });
    expect(res).toEqual([{ id: 'k1', name: 'Ana' }]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('si el backend no responde con lista, devuelve un arreglo vacío', async () => {
    customFetch.mockResolvedValue(responder({}));

    expect(await clinicalStaffApi.getClinicalStaff()).toEqual([]);
  });

  it('si el backend rechaza la lectura, el error llega a la pantalla', async () => {
    customFetch.mockResolvedValue(responder({ error: 'No autenticado' }, 401));
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(clinicalStaffApi.getClinicalStaff()).rejects.toThrow(/No autenticado/);
  });
});
