-- Cierra la lectura de "profiles" para la anon key.
--
-- Contexto: "Permitir lectura para todos" (USING (true)) dejaba leer toda la tabla con la
-- anon key: email, RUT, teléfono, usuario y licencia de cada persona. La política
-- "Users can view own profile or staff view all" no protegía nada porque se combinaba con
-- la anterior por OR (y get_auth_uid() es NULL para el navegador, que no envía el JWT propio).
-- Ahora el navegador lee perfiles solo a través de /api/profiles (clave de servicio).
--
-- ORDEN OBLIGATORIO: ejecutar DESPUÉS de desplegar el commit que usa /api/profiles.
-- Si se ejecuta antes, el login (restaurar sesión), las listas de conductores y personal
-- clínico, la pizarra por conductor y las pantallas de administración dejan de cargar.
--
-- Por qué NO se hace REVOKE de la tabla: 15 políticas de otras tablas (trips, origins,
-- destinations, origin_services, clinical_staff) consultan profiles en sus subconsultas.
-- Sin permiso sobre la tabla esas políticas fallarían con "permission denied" en vez de
-- negar en silencio. Con RLS activo y sin política de SELECT, toda lectura devuelve 0 filas.
-- Los permisos por columna ya aplicados (restrict-profiles-column-select.sql, sin
-- encrypted_password) se mantienen como segunda barrera.

BEGIN;

DROP POLICY IF EXISTS "Permitir lectura para todos" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or staff view all" ON public.profiles;

COMMIT;

-- Verificación (debe devolver 0 políticas de SELECT):
--   SELECT count(*) FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'profiles' AND cmd IN ('SELECT', 'ALL');
-- Y con la anon key, GET /rest/v1/profiles?select=id debe responder [].

-- Rollback:
--   CREATE POLICY "Permitir lectura para todos" ON public.profiles FOR SELECT TO public USING (true);
--   CREATE POLICY "Users can view own profile or staff view all" ON public.profiles FOR SELECT TO public
--     USING ((get_auth_uid() = id) OR (get_auth_role() = ANY (ARRAY['admin'::text, 'coordinador'::text, 'gestion_camas'::text])));
