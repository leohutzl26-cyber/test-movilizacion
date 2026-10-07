-- Cierra el acceso de la anon key a audit_logs.
--
-- Contexto: audit_logs era legible por cualquiera con la anon key (política SELECT con
-- USING (true)) y aceptaba inserciones de cualquiera (INSERT con CHECK (true)). La tabla
-- guarda copias completas de traslados (nombre de paciente, RUT, diagnóstico), nombres de
-- usuario, IP y user-agent, y el cliente podía falsificar quién firmaba cada registro.
-- Ahora la lectura y la escritura pasan por la función /api/audit-logs, que usa la
-- service key y toma la identidad del JWT.
--
-- ORDEN OBLIGATORIO: ejecutar DESPUÉS de desplegar el commit que usa /api/audit-logs.
-- Si se ejecuta antes, el registro de actividad del panel de despacho, el historial de
-- cada traslado y la pantalla de auditoría del admin dejan de cargar.
--
-- El panel de despacho ya no usa Realtime sobre audit_logs (consulta cada 15 s); con
-- estas políticas fuera, Realtime tampoco entregaría eventos de esta tabla.

BEGIN;

DROP POLICY IF EXISTS "Audit logs are viewable by everyone" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

REVOKE ALL ON public.audit_logs FROM anon, authenticated;

COMMIT;

-- Verificación (debe devolver 0 políticas, false, false):
--   SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs';
--   SELECT has_table_privilege('anon', 'public.audit_logs', 'SELECT'),
--          has_table_privilege('anon', 'public.audit_logs', 'INSERT');

-- Rollback:
--   GRANT SELECT, INSERT ON public.audit_logs TO anon, authenticated;
--   CREATE POLICY "Audit logs are viewable by everyone" ON public.audit_logs FOR SELECT TO public USING (true);
--   CREATE POLICY "System can insert audit logs" ON public.audit_logs FOR INSERT TO public WITH CHECK (true);
