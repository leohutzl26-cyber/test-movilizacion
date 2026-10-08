// Calendario del gestor de camas: por defecto muestra solo los traslados clínicos y un filtro
// permite ver todos. El filtro es del navegador, así que no vuelve a pedir datos al cambiar.
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import api from '@/lib/api';
import ClinicalCalendarSection from './ClinicalCalendarSection';

jest.mock('@/lib/api', () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn() } }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/components/TripEvolutionLog', () => () => null);

global.IS_REACT_ACT_ENVIRONMENT = true;

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const fixture = () => [
  { id: 'c1', tracking_number: 'TR-CLINICO-1', trip_type: 'clinico', status: 'pendiente', patient_name: 'Paciente Uno', scheduled_date: `${hoy()}T00:00:00+00:00` },
  { id: 'o1', tracking_number: 'TR-OPERATIVO-1', trip_type: 'no_clinico', status: 'asignado', task_details: 'Retiro de insumos', scheduled_date: `${hoy()}T00:00:00+00:00` }
];

let contenedor;
let raiz;

const montar = async () => {
  await act(async () => { raiz.render(<ClinicalCalendarSection />); });
};
const boton = (texto) => Array.from(contenedor.querySelectorAll('button')).find((b) => b.textContent.trim() === texto);
const clic = async (texto) => { await act(async () => { boton(texto).dispatchEvent(new MouseEvent('click', { bubbles: true })); }); };
const texto = () => contenedor.textContent;

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: fixture() });
  contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  raiz = createRoot(contenedor);
});

afterEach(() => {
  act(() => raiz.unmount());
  contenedor.remove();
});

describe('filtro del calendario del gestor de camas', () => {
  it('por defecto muestra solo los traslados clínicos', async () => {
    await montar();

    expect(texto()).toContain('TR-CLINICO-1');
    expect(texto()).not.toContain('TR-OPERATIVO-1');
    expect(boton('Solo clínicos').getAttribute('aria-pressed')).toBe('true');
    expect(boton('Todos').getAttribute('aria-pressed')).toBe('false');
  });

  it('"Todos" muestra también los no clínicos, y "Solo clínicos" los vuelve a ocultar', async () => {
    await montar();

    await clic('Todos');
    expect(texto()).toContain('TR-CLINICO-1');
    expect(texto()).toContain('TR-OPERATIVO-1');
    expect(boton('Todos').getAttribute('aria-pressed')).toBe('true');

    await clic('Solo clínicos');
    expect(texto()).toContain('TR-CLINICO-1');
    expect(texto()).not.toContain('TR-OPERATIVO-1');
  });

  it('el filtro también rige en la vista diaria', async () => {
    await montar();

    await clic('Día');
    expect(texto()).toContain('TR-CLINICO-1');
    expect(texto()).not.toContain('TR-OPERATIVO-1');

    await clic('Todos');
    expect(texto()).toContain('TR-OPERATIVO-1');
  });

  it('cambiar el filtro no vuelve a pedir datos al servidor', async () => {
    await montar();
    const pedidosAlInicio = api.get.mock.calls.length;

    await clic('Todos');
    await clic('Solo clínicos');

    expect(api.get.mock.calls.length).toBe(pedidosAlInicio);
  });
});
