-- Corrección crítica: la política de SELECT de "profiles" permitía lectura pública
-- (USING (true)), exponiendo email, teléfono, RUT y el hash de contraseña de
-- todos los usuarios a través de la anon key. Ejecutar en el SQL Editor de Supabase.

-- ====================================================
-- 0. FUNCIÓN AUXILIAR: ROL DEL USUARIO AUTENTICADO
-- ====================================================
-- SECURITY DEFINER evita la recursión de RLS al consultar el propio rol
-- del usuario dentro de una política sobre la tabla "profiles".
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = public.get_auth_uid();
  RETURN user_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ====================================================
-- 1. POLÍTICA DE SELECT RESTRINGIDA
-- ====================================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
CREATE POLICY "Users can view own profile or staff view all" ON public.profiles
FOR SELECT USING (
  public.get_auth_uid() = id
  OR public.get_auth_role() IN ('admin', 'coordinador', 'gestion_camas')
);
