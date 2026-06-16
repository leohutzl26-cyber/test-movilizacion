-- Script de Migración para Añadir N° Zonal a la Tabla vehicles
-- Ejecuta este script en el SQL Editor de tu consola de Supabase para solucionar el error 400 (Bad Request) al editar vehículos.

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS zonal_number TEXT;

-- Forzar a PostgREST a recargar el caché del esquema inmediatamente
NOTIFY pgrst, 'reload schema';
