-- Script de Migración para Añadir Columnas Faltantes a la Tabla vehicles (zonal_number y next_maintenance_km)
-- Ejecuta este script en el SQL Editor de tu consola de Supabase para solucionar el error al editar vehículos.

ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS zonal_number TEXT,
ADD COLUMN IF NOT EXISTS next_maintenance_km FLOAT8 DEFAULT 10000;

-- Forzar a PostgREST a recargar el caché del esquema inmediatamente
NOTIFY pgrst, 'reload schema';
