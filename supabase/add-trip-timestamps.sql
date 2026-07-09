-- Migration: Agregar timestamps de inicio y fin a la tabla trips
-- Correr este archivo en el Editor SQL de Supabase para habilitar el registro de horas del Libro de Control de Recorrido

ALTER TABLE trips ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
