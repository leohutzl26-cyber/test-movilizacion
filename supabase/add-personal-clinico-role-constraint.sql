-- Migration Script: Actualizar la restricción CHECK de roles en la tabla profiles
-- Ejecuta este script en el SQL Editor de tu panel de proyecto de Supabase (https://app.supabase.com)

-- 1. Eliminar la restricción de rol previa si existe
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Añadir la restricción actualizada incluyendo 'personal_clinico'
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'solicitante', 'conductor', 'coordinador', 'gestion_camas', 'personal_clinico', 'panel'));
