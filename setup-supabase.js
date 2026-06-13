// Complete Supabase Setup Script
// This script helps you set up and test the Supabase database

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Supabase Setup...\n');

// 1. Check if schema file exists
const schemaPath = path.join(__dirname, 'supabase', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
    console.error('❌ Schema file not found:', schemaPath);
    process.exit(1);
}

console.log('✅ Schema file found:', schemaPath);

// 2. Read and display schema content
const schemaContent = fs.readFileSync(schemaPath, 'utf8');
console.log('\n📋 Schema Summary:');
console.log('   Tables:', schemaContent.match(/CREATE TABLE (\w+)/g).map(t => t.replace('CREATE TABLE ', '')));
console.log('   Extensions:', 'uuid-ossp, pgcrypto');
console.log('   RLS: Enabled');
console.log('   Audit: Enabled');

// 3. Create environment file template
const envTemplate = `# Supabase Configuration
# Copy this to .env and fill in your values

# Supabase Project Settings
REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-here

# Email Configuration (if using email)
RESEND_API_KEY=your-resend-api-key
SENDER_EMAIL=your-sender-email@example.com

# WebAuthn Configuration
RP_ID=your-domain.com
RP_NAME=Movilización HCU
ORIGIN=https://your-frontend-url.com
`;

const envPath = path.join(__dirname, '.env.template');
fs.writeFileSync(envPath, envTemplate);
console.log('\n✅ Created environment template:', envPath);

// 4. Create test data script
const testDataScript = `-- Test Data Script for Supabase
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
  ('Hospital Central', 'Av. Libertador Bernardo O\'Higgins 1234, Santiago'),
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
`;

const testDataPath = path.join(__dirname, 'supabase', 'test-data.sql');
fs.writeFileSync(testDataPath, testDataScript);
console.log('✅ Created test data script:', testDataPath);

// 5. Create test runner
const testRunner = `// Frontend Test Script
// Run this in your browser console after setting up Supabase

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...');
  
  try {
    // Test 1: Check if we can access profiles
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ Error accessing profiles:', error);
      return false;
    }
    
    console.log('✅ Profiles loaded:', profiles.length);
    
    // Test 2: Check trips
    const { data: trips, error: tripsError } = await supabase
      .from('trips')
      .select('*')
      .limit(5);
    
    if (triesError) {
      console.error('❌ Error accessing trips:', tripsError);
      return false;
    }
    
    console.log('✅ Trips loaded:', trips.length);
    
    // Test 3: Check vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('*')
      .limit(5);
    
    if (vehiclesError) {
      console.error('❌ Error accessing vehicles:', vehiclesError);
      return false;
    }
    
    console.log('✅ Vehicles loaded:', vehicles.length);
    
    // Test 4: Try to create a new trip
    const newTrip = {
      origin: 'Test Origin',
      destination: 'Test Destination',
      patient_name: 'Test Patient',
      priority: 'normal',
      trip_type: 'no_clinico',
      status: 'pendiente',
      scheduled_date: new Date().toISOString().split('T')[0]
    };
    
    const { data: createdTrip, error: createError } = await supabase
      .from('trips')
      .insert([newTrip])
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating trip:', createError);
      return false;
    }
    
    console.log('✅ Trip created:', createdTrip.tracking_number);
    
    // Clean up
    await supabase
      .from('trips')
      .delete()
      .eq('id', createdTrip.id);
    
    console.log('✅ Test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testSupabaseConnection();
`;

const testRunnerPath = path.join(__dirname, 'supabase', 'frontend-test.js');
fs.writeFileSync(testRunnerPath, testRunner);
console.log('✅ Created frontend test script:', testRunnerPath);

// 6. Create deployment checklist
const checklist = `# Supabase Deployment Checklist

## Phase 1: Setup
- [ ] Create Supabase project at [supabase.com](https://supabase.com)
- [ ] Get project URL and anon key
- [ ] Create service role key
- [ ] Update environment variables in .env

## Phase 2: Database Setup
- [ ] Run schema.sql in Supabase SQL Editor
- [ ] Verify all tables are created
- [ ] Enable RLS on all tables
- [ ] Run test-data.sql to populate with sample data
- [ ] Verify RLS policies are working

## Phase 3: Functions Deployment
- [ ] Deploy auth-register function
- [ ] Deploy auth-login function
- [ ] Deploy trips-create function
- [ ] Deploy trips-assign function
- [ ] Deploy trips-update-status function
- [ ] Deploy users-approve function
- [ ] Deploy stats-dashboard function

## Phase 4: Frontend Setup
- [ ] Update REACT_APP_SUPABASE_URL in .env
- [ ] Update REACT_APP_SUPABASE_ANON_KEY in .env
- [ ] Run npm install to install dependencies
- [ ] Run npm start to start the app
- [ ] Test login with admin@hospital.cl / admin123

## Phase 5: Testing
- [ ] Run frontend-test.js in browser console
- [ ] Test user registration and approval
- [ ] Test trip creation and assignment
- [ ] Test dashboard statistics
- [ ] Test audit logs

## Phase 6: Production
- [ ] Set up proper environment variables
- [ ] Configure CORS settings
- [ ] Set up monitoring and logging
- [ ] Set up backup strategy
- [ ] Configure domain and SSL

## Test Accounts
- Admin: admin@hospital.cl / admin123
- Solicitante: solicitante@hospital.cl / admin123
- Conductor: conductor@hospital.cl / admin123
- Coordinador: coordinador@hospital.cl / admin123
`;

const checklistPath = path.join(__dirname, 'supabase', 'DEPLOYMENT-CHECKLIST.md');
fs.writeFileSync(checklistPath, checklist);
console.log('✅ Created deployment checklist:', checklistPath);

console.log('\n🎉 Supabase Setup Complete!');
console.log('\n📁 Files Created:');
console.log('   ├── .env.template - Environment variables template');
console.log('   ├── test-data.sql - Sample data for testing');
console.log('   ├── frontend-test.js - Frontend connection test');
console.log('   ├── DEPLOYMENT-CHECKLIST.md - Deployment guide');
console.log('\n🚀 Next Steps:');
console.log('   1. Create Supabase project');
console.log('   2. Copy .env.template to .env and fill in your values');
console.log('   3. Run schema.sql in Supabase SQL Editor');
console.log('   4. Run test-data.sql for sample data');
console.log('   5. Deploy Supabase Functions');
console.log('   6. Update frontend with your Supabase URL');
console.log('   7. Test with the provided test accounts');

console.log('\n🧪 Ready to test the application!');