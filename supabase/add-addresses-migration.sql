-- Script de Migración para Añadir Direcciones y Google Maps a los Traslados
-- Ejecuta esto en el SQL Editor de tu consola de Supabase

ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS origin_address TEXT,
ADD COLUMN IF NOT EXISTS origin_maps_url TEXT,
ADD COLUMN IF NOT EXISTS destination_address TEXT,
ADD COLUMN IF NOT EXISTS destination_maps_url TEXT;
