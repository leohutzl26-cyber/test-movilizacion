// Qué traslados puede ver cada rol. Se usa en trips-read y en audit-logs (historial de un traslado).
//
//   admin, coordinador, gestion_camas  -> todos
//   panel                              -> solo la lista de activos (acción "active"), nada más
//   conductor                          -> los suyos y el pool (pendiente/asignado sin conductor)
//   solicitante                        -> los de las personas de su departamento (o solo los suyos)
//   personal_clinico                   -> clinicos de su asignación y el pool de acompañamiento
//
// Devuelve null si el rol no tiene acceso. El alcance expone:
//   prefiltro(consulta)  restricción barata que se aplica en la base (opcional)
//   permite(traslado)    comprobación definitiva sobre cada fila
//   enMemoria            true si la paginación debe hacerse tras filtrar (permite() no se puede expresar en SQL)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ROLES_SIN_RESTRICCION = ['admin', 'coordinador', 'gestion_camas'];

// assigned_clinical_staff llega como arreglo de objetos o de strings JSON.
const entradasDePersonal = (traslado) => {
  let lista = traslado.assigned_clinical_staff;
  if (typeof lista === 'string') {
    try { lista = JSON.parse(lista); } catch (e) { return []; }
  }
  if (!Array.isArray(lista)) return [];
  return lista
    .map((item) => {
      if (typeof item !== 'string') return item;
      try { return JSON.parse(item); } catch (e) { return null; }
    })
    .filter((item) => item && typeof item === 'object');
};

const idDeAcompanante = (entrada) => {
  const id = entrada.staff_id || entrada.id;
  return id && id !== 'none' ? id : null;
};

// Filas sin id real (vacías o "por identificar") no cuentan como acompañante confirmado.
const tieneAcompananteConfirmado = (traslado) => entradasDePersonal(traslado).some((e) => !!idDeAcompanante(e));

const asignadoA = (traslado, user) => {
  const nombre = (user.name || '').trim().toLowerCase();
  return entradasDePersonal(traslado).some((entrada) => {
    const id = idDeAcompanante(entrada);
    if (id) return id === user.id;
    // Sin id (dato legado): solo coincidencia exacta de nombre, nunca por substring.
    const nombreEntrada = (entrada.staff_name || entrada.name || entrada.nombre || '').trim().toLowerCase();
    return !!nombreEntrada && !!nombre && nombreEntrada === nombre;
  });
};

async function alcanceDe(user, supabase) {
  if (!user || !user.role) return null;

  if (ROLES_SIN_RESTRICCION.includes(user.role)) {
    return { permite: () => true, enMemoria: false, sinRestriccion: true };
  }

  if (user.role === 'panel') {
    return { permite: () => true, enMemoria: false, soloActivos: true };
  }

  if (user.role === 'conductor') {
    return {
      permite: (t) => t.driver_id === user.id || (!t.driver_id && ['pendiente', 'asignado'].includes(t.status)),
      enMemoria: true
    };
  }

  if (user.role === 'solicitante') {
    // Misma regla que tenía el navegador: las personas de su departamento, o solo él si no tiene.
    let ids = [user.id];
    const { data: yo } = await supabase.from('profiles').select('department').eq('id', user.id).maybeSingle();
    if (yo && yo.department) {
      const { data: colegas } = await supabase.from('profiles').select('id').eq('department', yo.department);
      if (colegas && colegas.length > 0) ids = colegas.map((c) => c.id);
    }
    return {
      prefiltro: (consulta) => consulta.in('requester_id', ids),
      permite: (t) => ids.includes(t.requester_id),
      enMemoria: false
    };
  }

  if (user.role === 'personal_clinico') {
    return {
      prefiltro: (consulta) => consulta.eq('trip_type', 'clinico'),
      permite: (t) =>
        t.trip_type === 'clinico' &&
        (asignadoA(t, user) ||
          (t.status !== 'cancelado' && t.status !== 'completado' && !tieneAcompananteConfirmado(t))),
      enMemoria: true
    };
  }

  return null;
}

module.exports = { alcanceDe, asignadoA, tieneAcompananteConfirmado, UUID };
