-- Agrega columnas que la Ficha Clínica del Acompañante ya usaba en el
-- código (notas clínicas y confirmación de acompañamiento) pero que
-- nunca se crearon en la tabla trips, causando el error de PostgREST
-- "Could not find the 'clinical_escort_confirmed' column of 'trips'".
-- Ejecutar en el SQL Editor de tu panel de Supabase.

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS clinical_escort_confirmed BOOLEAN DEFAULT FALSE;
