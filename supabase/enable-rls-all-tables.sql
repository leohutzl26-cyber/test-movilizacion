-- Script para habilitar Row Level Security (RLS) en todas las tablas del esquema public de Supabase.
-- Puedes copiar y ejecutar este código directamente en el SQL Editor de tu panel de Supabase.

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ENABLE ROW LEVEL SECURITY;';
        RAISE NOTICE 'RLS habilitado en la tabla: %', r.table_name;
    END LOOP;
END $$;
