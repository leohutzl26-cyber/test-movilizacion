-- Elimina los hashes de contraseña (encrypted_password) que quedaron guardados dentro de
-- audit_logs.new_values / old_values.
--
-- Contexto: admin-users y users-approve registraban la fila completa de "profiles" en
-- audit_logs, y esa tabla es legible con la anon key. Aunque profiles.encrypted_password
-- ya no es legible desde el navegador, estas copias seguían expuestas.
--
-- ORDEN: ejecutar DESPUÉS de desplegar el backend con sinSecretos(); si no, las acciones
-- nuevas volverían a escribir hashes. Solo quita la clave "encrypted_password" del JSON;
-- el resto del registro de auditoría queda intacto.

-- 1) Antes (cuántas filas tienen hash):
--   select count(*) from public.audit_logs
--   where new_values ? 'encrypted_password' or old_values ? 'encrypted_password';

BEGIN;

UPDATE public.audit_logs
SET new_values = new_values - 'encrypted_password',
    old_values = old_values - 'encrypted_password'
WHERE new_values ? 'encrypted_password'
   OR old_values ? 'encrypted_password';

COMMIT;

-- 2) Después (debe devolver 0):
--   select count(*) from public.audit_logs
--   where new_values ? 'encrypted_password' or old_values ? 'encrypted_password';
