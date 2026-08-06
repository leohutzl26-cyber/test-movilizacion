-- Corrige la política de UPDATE de "trips": el personal clínico
-- (acompañantes) no podía autoasignarse desde la Bolsa de Viajes porque
-- su rol no estaba en la lista permitida. RLS no lanza error en ese caso:
-- el UPDATE simplemente no afecta ninguna fila, por eso el frontend
-- mostraba "asignación exitosa" pero el traslado no quedaba guardado.
-- Ejecutar en el SQL Editor de tu panel de Supabase.

DROP POLICY IF EXISTS "Allow update for owners, drivers, and administrative staff" ON public.trips;
DROP POLICY IF EXISTS "Users can update trips they own" ON public.trips;
DROP POLICY IF EXISTS "Users can update trips" ON public.trips;
CREATE POLICY "Allow update for owners, drivers, and administrative staff" ON public.trips
FOR UPDATE USING (
  public.get_auth_uid() = requester_id
  OR public.get_auth_uid() = driver_id
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = public.get_auth_uid()
    AND profiles.role IN ('admin', 'coordinador', 'gestion_camas', 'personal_clinico')
  )
);
