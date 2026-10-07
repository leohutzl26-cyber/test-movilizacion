-- Oculta profiles.encrypted_password a los roles que usan la anon key desde el navegador.
--
-- Contexto: la política RLS "Permitir lectura para todos" (USING (true)) sigue activa en
-- la BD desplegada y deja leer toda la tabla profiles con la anon key, incluidos los
-- hashes bcrypt. Esta migración quita el hash del alcance de anon/authenticated sin
-- depender de RLS. El backend (service_role) conserva acceso completo.
--
-- ORDEN OBLIGATORIO: ejecutar DESPUÉS de desplegar el frontend que usa PROFILE_COLUMNS
-- (frontend/src/lib/supabase.js). Si se ejecuta antes, cada select('*') o select() sobre
-- profiles falla con "permission denied for table profiles".
--
-- Si se agrega una columna a profiles, hay que otorgar su SELECT aquí y en PROFILE_COLUMNS.

BEGIN;

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, email, name, role, status, shift_type, license_expiry, created_at,
  username, must_change_password, is_active, rut, vehicle_plate, phone,
  department, is_working, current_vehicle_id
) ON public.profiles TO anon, authenticated;

COMMIT;

-- Verificación (debe devolver false, true):
--   SELECT has_column_privilege('anon', 'public.profiles', 'encrypted_password', 'SELECT'),
--          has_column_privilege('anon', 'public.profiles', 'email', 'SELECT');

-- Rollback:
--   GRANT SELECT ON public.profiles TO anon, authenticated;
