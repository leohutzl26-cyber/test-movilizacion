-- Script de Migración para Añadir Columna maps_url a Orígenes y Destinos
-- Ejecuta esto en el SQL Editor de tu consola de Supabase

ALTER TABLE public.origins 
ADD COLUMN IF NOT EXISTS maps_url TEXT;

ALTER TABLE public.destinations 
ADD COLUMN IF NOT EXISTS maps_url TEXT;
