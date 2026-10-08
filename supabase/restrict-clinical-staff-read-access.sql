-- Cierra la lectura de "clinical_staff" para la anon key.
--
-- Contexto: "Clinical staff are viewable by everyone" (USING (true)) dejaba leer el catálogo de
-- personal clínico con la anon key, incluida la columna rut. La tabla está vacía hoy, pero se
-- cierra antes de cargar datos. Ahora el navegador lee el catálogo por /api/clinical-staff, que
-- usa la clave de servicio y no devuelve el RUT. Las altas, ediciones y bajas ya iban por
-- /api/manage-catalogs.
--
-- ORDEN OBLIGATORIO: ejecutar DESPUÉS de desplegar el commit que usa /api/clinical-staff.
-- Si se ejecuta antes, las listas de personal clínico (nuevo traslado, asignación de acompañantes,
-- mantenedor de personal) dejan de cargar.
--
-- Solo se elimina la política de lectura. Las políticas de escritura "Gestores and Admins ..." no
-- se tocan. Con RLS activo y sin política de SELECT, toda lectura anónima devuelve 0 filas.

BEGIN;

DROP POLICY IF EXISTS "Clinical staff are viewable by everyone" ON public.clinical_staff;

COMMIT;

-- Verificación (debe devolver 0):
--   SELECT count(*) FROM pg_policies
--   WHERE schemaname = 'public' AND tablename = 'clinical_staff' AND cmd IN ('SELECT', 'ALL');

-- Rollback:
--   CREATE POLICY "Clinical staff are viewable by everyone" ON public.clinical_staff FOR SELECT TO public USING (true);
