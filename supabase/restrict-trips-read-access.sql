-- Cierra la lectura de "trips" para la anon key.
--
-- Contexto: "Permitir lectura para todos" (USING (true)) dejaba leer todos los traslados con la
-- anon key: nombre de paciente, RUT, edad, diagnóstico, cama, médico tratante, observaciones
-- clínicas y direcciones. Ahora el navegador lee traslados solo a través de /api/trips-read, que
-- usa la clave de servicio y decide qué filas ve cada rol (ver supabase/functions/_shared/trip-scope.js).
--
-- ORDEN OBLIGATORIO: ejecutar DESPUÉS de desplegar el commit que usa /api/trips-read.
-- Si se ejecuta antes, la bandeja de entrada, el pool de conductores, "Mis solicitudes", los
-- calendarios, la pizarra por conductor, el panel de monitoreo y los reportes dejan de cargar.
--
-- Solo se elimina la política de lectura. Las demás políticas de trips (INSERT, UPDATE, DELETE) no
-- se tocan: el navegador ya no escribe en esta tabla y esas operaciones pasan por el backend.
-- Con RLS activo y sin política de SELECT, toda lectura anónima devuelve 0 filas.

BEGIN;

DROP POLICY IF EXISTS "Permitir lectura para todos" ON public.trips;

COMMIT;

-- Verificación (debe devolver 0):
--   SELECT count(*) FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'trips' AND cmd IN ('SELECT', 'ALL');
-- Y con la anon key, GET /rest/v1/trips?select=id debe responder [].

-- Rollback:
--   CREATE POLICY "Permitir lectura para todos" ON public.trips FOR SELECT TO public USING (true);
