-- Script de Migración para Añadir Columnas de Kilometraje a la Tabla trips
-- Ejecuta este script en el SQL Editor de tu Supabase para solucionar el error al finalizar viajes.

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS start_mileage FLOAT,
ADD COLUMN IF NOT EXISTS end_mileage FLOAT,
ADD COLUMN IF NOT EXISTS total_mileage FLOAT;

-- Forzar a PostgREST a recargar el caché del esquema inmediatamente
NOTIFY pgrst, 'reload schema';
