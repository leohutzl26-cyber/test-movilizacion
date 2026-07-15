-- Script para corregir políticas de Row Level Security (RLS) y Columnas Faltantes
-- Corrección: Personal Clínico, Servicios/Unidades, Modificación de Traslados y Columnas de Orden
-- Ejecuta este código en el SQL Editor de tu panel de Supabase.

-- ====================================================
-- 0. AGREGAR COLUMNAS FALTANTES EN LA TABLA TRIPS
-- ====================================================
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS group_id TEXT;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS order_in_group INTEGER DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());


-- ====================================================
-- 1. FUNCIÓN AUXILIAR DE AUTENTICACIÓN PERSONALIZADA
-- ====================================================

-- Crear función auxiliar para extraer el ID de usuario del JWT (soportando sub y userId)
CREATE OR REPLACE FUNCTION public.get_auth_uid()
RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub',
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'userId'
  )::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ====================================================
-- 2. CORRECCIÓN PARA PERSONAL CLÍNICO Y SERVICIOS
-- ====================================================

-- Asegurar que RLS esté activo en ambas tablas
ALTER TABLE public.clinical_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.origin_services ENABLE ROW LEVEL SECURITY;

-- Recrear las políticas de lectura (SELECT) públicas
DROP POLICY IF EXISTS "Clinical staff are viewable by everyone" ON public.clinical_staff;
CREATE POLICY "Clinical staff are viewable by everyone" ON public.clinical_staff 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Origin services are viewable by everyone" ON public.origin_services;
CREATE POLICY "Origin services are viewable by everyone" ON public.origin_services 
FOR SELECT USING (true);

-- Recrear las políticas de escritura basadas en el rol del usuario (utilizando public.get_auth_uid())
DROP POLICY IF EXISTS "Gestores and Admins can insert clinical staff" ON public.clinical_staff;
CREATE POLICY "Gestores and Admins can insert clinical staff" ON public.clinical_staff 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.get_auth_uid() AND role IN ('admin', 'gestion_camas'))
);

DROP POLICY IF EXISTS "Gestores and Admins can update clinical staff" ON public.clinical_staff;
CREATE POLICY "Gestores and Admins can update clinical staff" ON public.clinical_staff 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.get_auth_uid() AND role IN ('admin', 'gestion_camas'))
);

DROP POLICY IF EXISTS "Gestores and Admins can delete clinical staff" ON public.clinical_staff;
CREATE POLICY "Gestores and Admins can delete clinical staff" ON public.clinical_staff 
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.get_auth_uid() AND role IN ('admin', 'gestion_camas'))
);

DROP POLICY IF EXISTS "Gestores and Admins can insert origin services" ON public.origin_services;
CREATE POLICY "Gestores and Admins can insert origin services" ON public.origin_services 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.get_auth_uid() AND role IN ('admin', 'gestion_camas'))
);

DROP POLICY IF EXISTS "Gestores and Admins can update origin services" ON public.origin_services;
CREATE POLICY "Gestores and Admins can update origin services" ON public.origin_services 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.get_auth_uid() AND role IN ('admin', 'gestion_camas'))
);

DROP POLICY IF EXISTS "Gestores and Admins can delete origin services" ON public.origin_services;
CREATE POLICY "Gestores and Admins can delete origin services" ON public.origin_services 
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = public.get_auth_uid() AND role IN ('admin', 'gestion_camas'))
);


-- ====================================================
-- 3. CORRECCIÓN PARA LA TABLA TRIPS (TRASLADOS)
-- ====================================================

-- Asegurar que RLS esté activo en trips
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Recrear política de UPDATE para permitir a coordinadores, gestores y admins modificar viajes (utilizando public.get_auth_uid())
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
    AND profiles.role IN ('admin', 'coordinador', 'gestion_camas')
  )
);

-- Recrear política de INSERT para permitir a coordinadores/gestores crear viajes (utilizando public.get_auth_uid())
DROP POLICY IF EXISTS "Users can insert trips" ON public.trips;
CREATE POLICY "Users can insert trips" ON public.trips
FOR INSERT WITH CHECK (
  public.get_auth_uid() = requester_id 
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = public.get_auth_uid() 
    AND profiles.role IN ('admin', 'coordinador', 'gestion_camas')
  )
);

-- Recrear política de DELETE para permitir a administradores borrar viajes (utilizando public.get_auth_uid())
DROP POLICY IF EXISTS "Admins can delete trips" ON public.trips;
CREATE POLICY "Admins can delete trips" ON public.trips
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = public.get_auth_uid() 
    AND profiles.role = 'admin'
  )
);
