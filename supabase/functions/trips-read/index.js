const { createClient } = require('@supabase/supabase-js');
const { alcanceDe, UUID } = require('../_shared/trip-scope');

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY
);

const ESTADOS = ['pendiente', 'asignado', 'en_curso', 'completado', 'cancelado', 'revision_gestor'];
const TIPOS = ['clinico', 'no_clinico'];
const ORDENES = ['created_at', 'scheduled_date', 'appointment_time'];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_FILAS = 5000;
const MAX_POR_PAGINA = 500;
const MAX_IDS = 200;

const responder = (statusCode, cuerpo) => ({ statusCode, body: JSON.stringify(cuerpo) });
const invalido = (mensaje) => { const e = new Error(mensaje); e.esValidacion = true; return e; };

// Texto de búsqueda: se quitan los caracteres que tienen significado en la sintaxis de filtros.
const limpiarTexto = (valor) => String(valor).slice(0, 100).replace(/[,()*"\\%_]/g, ' ').trim();

const listaDeEstados = (valor, nombre) => {
  if (valor === undefined || valor === null || valor === 'all') return null;
  const lista = Array.isArray(valor) ? valor : [valor];
  if (lista.length === 0) return null;
  if (!lista.every((e) => ESTADOS.includes(e))) throw invalido(`${nombre} contiene un estado no válido`);
  return lista;
};

const uuidOpcional = (valor, nombre) => {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || !UUID.test(valor)) throw invalido(`${nombre} no es un id válido`);
  return valor;
};

const fechaOpcional = (valor, nombre) => {
  if (valor === undefined || valor === null || valor === '') return null;
  const dia = String(valor).slice(0, 10);
  if (!FECHA.test(dia)) throw invalido(`${nombre} debe tener formato AAAA-MM-DD`);
  return dia;
};

// Valida los filtros que manda el navegador y los traduce a una estructura cerrada.
const normalizarFiltros = (p) => {
  const f = {};
  f.estados = listaDeEstados(p.status, 'status');
  f.excluirEstados = listaDeEstados(p.exclude_status, 'exclude_status');

  if (p.trip_type !== undefined && p.trip_type !== null && p.trip_type !== 'all') {
    if (!TIPOS.includes(p.trip_type)) throw invalido('trip_type no es válido');
    f.tipo = p.trip_type;
  }

  f.conductor = uuidOpcional(p.driver_id, 'driver_id');
  f.vehiculo = uuidOpcional(p.vehicle_id, 'vehicle_id');
  f.solicitante = uuidOpcional(p.requester_id, 'requester_id');

  if (p.requester_ids !== undefined && p.requester_ids !== null) {
    if (!Array.isArray(p.requester_ids) || p.requester_ids.length > MAX_IDS || !p.requester_ids.every((i) => typeof i === 'string' && UUID.test(i))) {
      throw invalido('requester_ids debe ser una lista de hasta 200 ids válidos');
    }
    f.solicitantes = p.requester_ids;
  }

  f.dia = fechaOpcional(p.date, 'date');
  f.desde = fechaOpcional(p.startDate, 'startDate');
  f.hasta = fechaOpcional(p.endDate, 'endDate');

  if (p.folio) f.folio = limpiarTexto(p.folio);
  if (p.patient_name) f.paciente = limpiarTexto(p.patient_name);
  if (p.search) f.busqueda = limpiarTexto(p.search);

  f.ordenar = ORDENES.includes(p.order_by) ? p.order_by : 'created_at';
  f.ascendente = p.ascending === true;

  if (p.page !== undefined && p.limit !== undefined) {
    const pagina = Number.parseInt(p.page, 10);
    const limite = Number.parseInt(p.limit, 10);
    if (!(pagina >= 1) || !(limite >= 1)) throw invalido('page y limit deben ser enteros positivos');
    f.pagina = pagina;
    f.limite = Math.min(limite, MAX_POR_PAGINA);
  }
  return f;
};

const aplicarFiltros = (consulta, f) => {
  if (f.estados) consulta = consulta.in('status', f.estados);
  if (f.excluirEstados) f.excluirEstados.forEach((e) => { consulta = consulta.neq('status', e); });
  if (f.tipo) consulta = consulta.eq('trip_type', f.tipo);
  if (f.conductor) consulta = consulta.eq('driver_id', f.conductor);
  if (f.vehiculo) consulta = consulta.eq('vehicle_id', f.vehiculo);
  if (f.solicitantes) consulta = consulta.in('requester_id', f.solicitantes);
  else if (f.solicitante) consulta = consulta.eq('requester_id', f.solicitante);
  if (f.dia) consulta = consulta.eq('scheduled_date', f.dia);
  if (f.desde) consulta = consulta.gte('scheduled_date', f.desde);
  if (f.hasta) consulta = consulta.lte('scheduled_date', f.hasta);
  if (f.folio) consulta = consulta.ilike('tracking_number', `%${f.folio}%`);
  if (f.paciente) consulta = consulta.ilike('patient_name', `%${f.paciente}%`);
  if (f.busqueda) {
    const t = `%${f.busqueda}%`;
    consulta = consulta.or(`patient_name.ilike.${t},tracking_number.ilike.${t},origin.ilike.${t},destination.ilike.${t}`);
  }
  return consulta.order(f.ordenar, { ascending: f.ascendente });
};

const listar = async (alcance, f) => {
  let consulta = supabase.from('trips');
  const paginarEnBase = f.pagina !== undefined && !alcance.enMemoria;
  consulta = consulta.select('*', paginarEnBase ? { count: 'exact' } : {});
  if (alcance.prefiltro) consulta = alcance.prefiltro(consulta);
  consulta = aplicarFiltros(consulta, f);

  if (paginarEnBase) {
    const desde = (f.pagina - 1) * f.limite;
    const { data, error, count } = await consulta.range(desde, desde + f.limite - 1);
    if (error) throw error;
    return { trips: (data || []).filter(alcance.permite), total: count || 0 };
  }

  const { data, error } = await consulta.limit(MAX_FILAS);
  if (error) throw error;
  const visibles = (data || []).filter(alcance.permite);

  if (f.pagina !== undefined) {
    const desde = (f.pagina - 1) * f.limite;
    return { trips: visibles.slice(desde, desde + f.limite), total: visibles.length };
  }
  return { trips: visibles };
};

exports.handler = async (event, context) => {
  try {
    const user = context.user;
    if (!user) return responder(401, { error: 'No autenticado' });

    const { action, ...p } = JSON.parse(event.body || '{}');
    const alcance = await alcanceDe(user, supabase);
    if (!alcance) return responder(403, { error: 'Acceso denegado' });
    if (alcance.soloActivos && action !== 'active') {
      return responder(403, { error: 'Acceso denegado' });
    }

    if (action === 'list') {
      const resultado = await listar(alcance, normalizarFiltros(p));
      return responder(200, resultado);
    }

    if (action === 'get') {
      const id = uuidOpcional(p.id, 'id');
      if (!id) throw invalido('id es obligatorio');
      const { data, error } = await supabase.from('trips').select('*').eq('id', id).maybeSingle();
      if (error) return responder(400, { error: error.message });
      // Un traslado fuera del alcance del rol responde igual que uno inexistente.
      if (!data || !alcance.permite(data)) return responder(404, { error: 'Traslado no encontrado' });
      return responder(200, { trip: data });
    }

    // Traslados en curso o por hacer, más los completados hoy (bandeja de entrada y panel).
    if (action === 'active') {
      const hoy = fechaOpcional(p.today, 'today') || new Date().toISOString().slice(0, 10);

      let abiertos = supabase.from('trips').select('*');
      if (alcance.prefiltro) abiertos = alcance.prefiltro(abiertos);
      abiertos = abiertos.in('status', ['pendiente', 'asignado', 'en_curso']).order('created_at', { ascending: false }).limit(MAX_FILAS);

      let completados = supabase.from('trips').select('*');
      if (alcance.prefiltro) completados = alcance.prefiltro(completados);
      completados = completados.eq('status', 'completado').eq('scheduled_date', hoy).order('created_at', { ascending: false }).limit(MAX_FILAS);

      const [a, c] = await Promise.all([abiertos, completados]);
      if (a.error) return responder(400, { error: a.error.message });
      if (c.error) return responder(400, { error: c.error.message });
      return responder(200, { trips: [...(a.data || []), ...(c.data || [])].filter(alcance.permite) });
    }

    return responder(400, { error: 'Acción no válida' });
  } catch (error) {
    if (error.esValidacion) return responder(400, { error: error.message });
    console.error('Trips read function error:', error);
    return responder(500, { error: 'Internal server error' });
  }
};
