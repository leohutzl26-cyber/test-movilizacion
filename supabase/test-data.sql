-- Test Data Script for Supabase
-- Run this in the Supabase SQL Editor after creating the schema

-- Insert test admin user
INSERT INTO profiles (email, encrypted_password, name, role, status) 
VALUES (
  'admin@hospital.cl', 
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK',
  'Administrador del Sistema', 
  'admin', 
  'approved'
);

-- Insert test solicitante
INSERT INTO profiles (email, encrypted_password, name, role, status) 
VALUES (
  'solicitante@hospital.cl', 
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK',
  'Solicitante de Transporte', 
  'solicitante', 
  'approved'
);

-- Insert test conductor
INSERT INTO profiles (email, encrypted_password, name, role, status, license_expiry, vehicle_plate) 
VALUES (
  'conductor@hospital.cl', 
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK',
  'Conductor Juan Pérez', 
  'conductor', 
  'approved',
  '2025-12-31',
  'ABC-123'
);

-- Insert test coordinador
INSERT INTO profiles (email, encrypted_password, name, role, status) 
VALUES (
  'coordinador@hospital.cl', 
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK',
  'Coordinador de Turnos', 
  'coordinador', 
  'approved'
);

-- Insert test vehicles
INSERT INTO vehicles (plate, brand, model, type, year, mileage, status) 
VALUES 
  ('ABC-123', 'Toyota', 'Hiace', 'Van', 2024, 5000, 'disponible'),
  ('DEF-456', 'Ford', 'Transit', 'Van', 2023, 12000, 'disponible'),
  ('GHI-789', 'Mercedes', 'Sprinter', 'Van', 2024, 3000, 'en_mantenimiento');

-- Insert test origins, destinations, and origin services
INSERT INTO origins (name, address) 
VALUES 
  ('Hospital Central', 'Av. Libertador Bernardo O'Higgins 1234, Santiago'),
  ('Bodega Central', 'Calle Ficticia 123, Santiago');

INSERT INTO destinations (name, address) 
VALUES 
  ('Clínica Las Condes', 'Av. Las Condes 763, Las Condes, Santiago'),
  ('Laboratorio Central', 'Av. Providencia 1234, Providencia, Santiago');

INSERT INTO origin_services (name, address) 
VALUES 
  ('Urgencias', 'Piso 1, Sector A'),
  ('UCI Adulto', 'Piso 3, Sector B'),
  ('Pabellón', 'Piso 2, Sector Quirúrgico'),
  ('Maternidad', 'Piso 4, Sector C');

-- Insert test clinical staff
INSERT INTO clinical_staff (name, role, is_active) 
VALUES 
  ('Dr. García', 'Médico', true),
  ('Enfermera María', 'Enfermera', true),
  ('Dr. Rodríguez', 'Médico', true),
  ('Enfermera López', 'Enfermera', true);

-- Insert test trips
INSERT INTO trips (
  tracking_number, requester_id, requester_name, origin, destination, 
  patient_name, priority, trip_type, status, scheduled_date, 
  clinical_team, contact_person, rut, age, diagnosis, 
  weight, bed, transfer_reason, attending_physician
) VALUES 
  ('TR-001234', 
   (SELECT id FROM profiles WHERE email = 'solicitante@hospital.cl'),
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
  ),
  ('TR-001235', 
   (SELECT id FROM profiles WHERE email = 'solicitante@hospital.cl'),
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
  ),
  ('TR-001236', 
   (SELECT id FROM profiles WHERE email = 'solicitante@hospital.cl'),
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
  );

-- Insert audit logs for demonstration
INSERT INTO audit_logs (user_id, user_name, user_role, action, entity_type, entity_id, timestamp)
VALUES 
  ((SELECT id FROM profiles WHERE email = 'admin@hospital.cl'), 
   'Administrador del Sistema', 
   'admin', 
   'registro', 
   'profiles', 
   (SELECT id FROM profiles WHERE email = 'solicitante@hospital.cl'),
   NOW() - INTERVAL '1 day'),
  ((SELECT id FROM profiles WHERE email = 'admin@hospital.cl'), 
   'Administrador del Sistema', 
   'admin', 
   'aprobar_usuario', 
   'profiles', 
   (SELECT id FROM profiles WHERE email = 'solicitante@hospital.cl'),
   NOW() - INTERVAL '1 hour'),
  ((SELECT id FROM profiles WHERE email = 'solicitante@hospital.cl'), 
   'Solicitante de Transporte', 
   'solicitante', 
   'crear_traslado', 
   'trips', 
   (SELECT id FROM trips WHERE tracking_number = 'TR-001234'),
   NOW() - INTERVAL '30 minutes');
