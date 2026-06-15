-- Setup Script for Supabase Database
-- Run this in your Supabase SQL Editor to initialize the database

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS clinical_staff CASCADE;
DROP TABLE IF EXISTS origin_services CASCADE;
DROP TABLE IF EXISTS origins CASCADE;
DROP TABLE IF EXISTS destinations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    encrypted_password TEXT,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'solicitante', 'conductor', 'coordinador', 'gestion_camas')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    -- Additional fields for drivers
    license_expiry DATE,
    vehicle_plate TEXT,
    -- Additional fields
    phone TEXT,
    department TEXT,
    rut TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Create vehicles table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate TEXT UNIQUE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    type TEXT DEFAULT 'Auto/SUV' CHECK (type IN ('Auto/SUV', 'Van', 'Ambulancia', 'Camioneta')),
    year INTEGER DEFAULT 2024,
    mileage FLOAT DEFAULT 0,
    next_maintenance_km FLOAT DEFAULT 10000,
    status TEXT DEFAULT 'disponible' CHECK (status IN ('disponible', 'en_curso', 'en_mantenimiento', 'en_limpieza', 'no_disponible')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create origin_services table
CREATE TABLE origin_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create origins table
CREATE TABLE origins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create destinations table
CREATE TABLE destinations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create clinical_staff table
CREATE TABLE clinical_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create trips table
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_number TEXT UNIQUE,
    requester_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    requester_name TEXT,
    origin TEXT NOT NULL,
    origin_address TEXT,
    origin_maps_url TEXT,
    destination TEXT NOT NULL,
    destination_address TEXT,
    destination_maps_url TEXT,
    patient_name TEXT,
    patient_unit TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('baja', 'normal', 'alta', 'urgente')),
    notes TEXT,
    driver_notes TEXT,
    trip_type TEXT DEFAULT 'no_clinico' CHECK (trip_type IN ('clinico', 'no_clinico')),
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'asignado', 'en_curso', 'completado', 'cancelado', 'revision_gestor')),
    
    -- Clinical fields
    clinical_team TEXT,
    contact_person TEXT,
    scheduled_date DATE,
    rut TEXT,
    age TEXT,
    diagnosis TEXT,
    weight TEXT,
    bed TEXT,
    transfer_reason TEXT,
    attending_physician TEXT,
    appointment_time TEXT,
    departure_time TEXT,
    
    -- Personnel and requirements
    required_personnel TEXT[], -- JSON array of strings
    patient_requirements TEXT[], -- JSON array of strings
    accompaniment TEXT,
    task_details TEXT,
    staff_count TEXT,
    accompaniment_staff_id UUID,
    assigned_clinical_staff TEXT[], -- JSON array of objects
    
    -- Driver assignment
    driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    driver_name TEXT,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    vehicle_plate TEXT,
    
    -- Mileage tracking
    start_mileage FLOAT,
    end_mileage FLOAT,
    total_mileage FLOAT,
    
    -- Additional metadata
    cancel_reason TEXT,
    group_id TEXT,
    order_in_group INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    ip_address TEXT,
    user_agent TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_vehicles_plate ON vehicles(plate);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_requester ON trips(requester_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX idx_trips_created_at ON trips(created_at);
CREATE INDEX idx_trips_scheduled_date ON trips(scheduled_date);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Create RLS (Row Level Security) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE origin_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE origins ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'admin');
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR auth.role() = 'admin');
CREATE POLICY "Admins can delete profiles" ON profiles FOR DELETE USING (auth.role() = 'admin');

-- RLS Policies for vehicles
CREATE POLICY "Vehicles are viewable by everyone" ON vehicles FOR SELECT USING (true);
CREATE POLICY "Admins can insert vehicles" ON vehicles FOR INSERT WITH CHECK (auth.role() = 'admin');
CREATE POLICY "Admins can update vehicles" ON vehicles FOR UPDATE USING (auth.role() = 'admin');
CREATE POLICY "Admins can delete vehicles" ON vehicles FOR DELETE USING (auth.role() = 'admin');

-- RLS Policies for origin_services
CREATE POLICY "Origin services are viewable by everyone" ON origin_services FOR SELECT USING (true);

CREATE POLICY "Gestores and Admins can insert origin services" ON origin_services FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

CREATE POLICY "Gestores and Admins can update origin services" ON origin_services FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

CREATE POLICY "Gestores and Admins can delete origin services" ON origin_services FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

-- RLS Policies for origins
CREATE POLICY "Origins are viewable by everyone" ON origins FOR SELECT USING (true);

CREATE POLICY "Gestores and Admins can insert origins" ON origins FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

CREATE POLICY "Gestores and Admins can update origins" ON origins FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

CREATE POLICY "Gestores and Admins can delete origins" ON origins FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

-- RLS Policies for destinations
CREATE POLICY "Destinations are viewable by everyone" ON destinations FOR SELECT USING (true);

CREATE POLICY "Gestores and Admins can insert destinations" ON destinations FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

CREATE POLICY "Gestores and Admins can update destinations" ON destinations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

CREATE POLICY "Gestores and Admins can delete destinations" ON destinations FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

-- RLS Policies for clinical_staff
CREATE POLICY "Clinical staff are viewable by everyone" ON clinical_staff FOR SELECT USING (true);

CREATE POLICY "Gestores and Admins can insert clinical staff" ON clinical_staff FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

CREATE POLICY "Gestores and Admins can update clinical staff" ON clinical_staff FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

CREATE POLICY "Gestores and Admins can delete clinical staff" ON clinical_staff FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'gestion_camas'))
);

-- RLS Policies for trips
CREATE POLICY "Trips are viewable by everyone" ON trips FOR SELECT USING (true);
CREATE POLICY "Users can insert trips" ON trips FOR INSERT WITH CHECK (auth.uid() = requester_id OR auth.role() = 'admin');
CREATE POLICY "Users can update trips they own" ON trips FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = driver_id OR auth.role() = 'admin');
CREATE POLICY "Admins can delete trips" ON trips FOR DELETE USING (auth.role() = 'admin');

-- RLS Policies for audit_logs
CREATE POLICY "Audit logs are viewable by everyone" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "System can insert audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- Create triggers for audit logging
CREATE OR REPLACE FUNCTION log_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, user_name, user_role, action, entity_type, entity_id, old_values, new_values
    ) VALUES (
        auth.uid(), 
        auth.jwt() ->> 'name', 
        auth.role(), 
        TG_OP, 
        TG_TABLE_NAME, 
        NEW.id, 
        CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) END, 
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER log_profile_changes
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER log_vehicle_changes
    AFTER INSERT OR UPDATE OR DELETE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER log_origin_services_changes
    AFTER INSERT OR UPDATE OR DELETE ON origin_services
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER log_origins_changes
    AFTER INSERT OR UPDATE OR DELETE ON origins
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER log_destinations_changes
    AFTER INSERT OR UPDATE OR DELETE ON destinations
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER log_clinical_staff_changes
    AFTER INSERT OR UPDATE OR DELETE ON clinical_staff
    FOR EACH ROW EXECUTE FUNCTION log_action();

CREATE TRIGGER log_trip_changes
    AFTER INSERT OR UPDATE OR DELETE ON trips
    FOR EACH ROW EXECUTE FUNCTION log_action();

-- Create function to generate tracking number
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS TEXT AS $$
BEGIN
    RETURN 'TR-' || LPAD(FLOOR(EXTRACT(EPOCH FROM clock_timestamp())::TEXT), 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tracking number
CREATE TRIGGER set_tracking_number
    BEFORE INSERT ON trips
    FOR EACH ROW
    WHEN (NEW.tracking_number IS NULL)
    EXECUTE FUNCTION generate_tracking_number();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_origin_services_updated_at BEFORE UPDATE ON origin_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_origins_updated_at BEFORE UPDATE ON origins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_destinations_updated_at BEFORE UPDATE ON destinations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_staff_updated_at BEFORE UPDATE ON clinical_staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert test data
INSERT INTO profiles (email, encrypted_password, name, role, status) VALUES 
('admin@hospital.cl', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK', 'Administrador del Sistema', 'admin', 'approved'),
('solicitante@hospital.cl', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK', 'Solicitante de Transporte', 'solicitante', 'approved'),
('conductor@hospital.cl', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK', 'Conductor Juan Pérez', 'conductor', 'approved', '2025-12-31', 'ABC-123'),
('coordinador@hospital.cl', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK', 'Coordinador de Turnos', 'coordinador', 'approved');

INSERT INTO vehicles (plate, brand, model, type, year, mileage, status) VALUES 
('ABC-123', 'Toyota', 'Hiace', 'Van', 2024, 5000, 'disponible'),
('DEF-456', 'Ford', 'Transit', 'Van', 2023, 12000, 'disponible'),
('GHI-789', 'Mercedes', 'Sprinter', 'Van', 2024, 3000, 'en_mantenimiento');

INSERT INTO origins (name, address) VALUES 
('Hospital Central', 'Av. Libertador Bernardo O''Higgins 1234, Santiago'),
('Bodega Central', 'Calle Ficticia 123, Santiago');

INSERT INTO destinations (name, address) VALUES 
('Clínica Las Condes', 'Av. Las Condes 763, Las Condes, Santiago'),
('Laboratorio Central', 'Av. Providencia 1234, Providencia, Santiago');

INSERT INTO origin_services (name, address) VALUES 
('Urgencias', 'Piso 1, Sector A'),
('UCI Adulto', 'Piso 3, Sector B'),
('Pabellón', 'Piso 2, Sector Quirúrgico'),
('Maternidad', 'Piso 4, Sector C');

INSERT INTO clinical_staff (name, role, is_active) VALUES 
('Dr. García', 'Médico', true),
('Enfermera María', 'Enfermera', true),
('Dr. Rodríguez', 'Médico', true),
('Enfermera López', 'Enfermera', true);

INSERT INTO trips (
    tracking_number, requester_id, requester_name, origin, destination, 
    patient_name, priority, trip_type, status, scheduled_date, 
    clinical_team, contact_person, rut, age, diagnosis, 
    weight, bed, transfer_reason, attending_physician
) SELECT 
    'TR-001234', 
    id, 
    'Solicitante de Transporte',
    'Hospital Central', 
    'Clínica Las Condes',
    'Juan Pérez', 
    'normal', 
    'clinico', 
    'pendiente', 
    CURRENT_DATE,
    'Enfermera especializada',
    'Dr. García - 956789123',
    '12.345.678-9',
    '45',
    'Dolor abdominal',
    '70kg',
    'U-101',
    'Estudios complementarios',
    'Dr. García'
FROM profiles WHERE email = 'solicitante@hospital.cl';

INSERT INTO trips (
    tracking_number, requester_id, requester_name, origin, destination, 
    patient_name, priority, trip_type, status, scheduled_date, 
    clinical_team, contact_person, rut, age, diagnosis, 
    weight, bed, transfer_reason, attending_physician
) SELECT 
    'TR-001235', 
    id, 
    'Solicitante de Transporte',
    'Bodega Central', 
    'Pabellón Norte',
    'Material quirúrgico - Lote 2024-A', 
    'normal', 
    'no_clinico', 
    'completado', 
    CURRENT_DATE - 1,
    null,
    null,
    '',
    '',
    '',
    '',
    '',
    ''
FROM profiles WHERE email = 'solicitante@hospital.cl';

INSERT INTO trips (
    tracking_number, requester_id, requester_name, origin, destination, 
    patient_name, priority, trip_type, status, scheduled_date, 
    clinical_team, contact_person, rut, age, diagnosis, 
    weight, bed, transfer_reason, attending_physician
) SELECT 
    'TR-001236', 
    id, 
    'Solicitante de Transporte',
    'Hospital Central', 
    'Laboratorio Central',
    'Ana María Gómez', 
    'urgente', 
    'clinico', 
    'asignado', 
    CURRENT_DATE + 1,
    'Equipo médico completo',
    'Dr. Rodríguez - 987654321',
    '98.765.432-1',
    '32',
    'Análisis de sangre urgente',
    '65kg',
    'U-205',
    'Exámenes de laboratorio',
    'Dr. Rodríguez'
FROM profiles WHERE email = 'solicitante@hospital.cl';

INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, timestamp)
SELECT 
    id, 
    'Administrador del Sistema', 
    'admin', 
    'registro', 
    'profiles', 
    id,
    NOW() - INTERVAL '1 day'
FROM profiles WHERE email = 'admin@hospital.cl';

INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, timestamp)
SELECT 
    id, 
    'Administrador del Sistema', 
    'admin', 
    'aprobar_usuario', 
    'profiles', 
    id,
    NOW() - INTERVAL '1 hour'
FROM profiles WHERE email = 'solicitante@hospital.cl';

INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, timestamp)
SELECT 
    id, 
    'Solicitante de Transporte', 
    'solicitante', 
    'crear_traslado', 
    'trips', 
    (SELECT id FROM trips WHERE tracking_number = 'TR-001234'),
    NOW() - INTERVAL '30 minutes'
FROM profiles WHERE email = 'solicitante@hospital.cl';

-- Setup complete message
SELECT '✅ Database setup completed successfully!' as message;