// Migration script from MongoDB to Supabase
// Run this script after creating the schema in Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Anon Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock data for testing (in real scenario, this would come from MongoDB)
const mockData = {
    profiles: [
        {
            id: '550e8400-e29b-41d4-a716-446655440000',
            email: 'admin@hospital.cl',
            encrypted_password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK',
            name: 'Administrador del Sistema',
            role: 'admin',
            status: 'approved',
            avatar_url: null,
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z'),
            phone: '+56912345678',
            department: 'TI',
            rut: '12.345.678-9',
            is_active: true
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440001',
            email: 'solicitante@hospital.cl',
            encrypted_password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK',
            name: 'Solicitante de Transporte',
            role: 'solicitante',
            status: 'approved',
            avatar_url: null,
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z'),
            phone: '+56987654321',
            department: 'Urgencias',
            rut: '98.765.432-1',
            is_active: true
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440002',
            email: 'conductor@hospital.cl',
            encrypted_password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK',
            name: 'Conductor Juan Pérez',
            role: 'conductor',
            status: 'approved',
            avatar_url: null,
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z'),
            phone: '+56955554444',
            department: 'Transportes',
            rut: '11.222.333-4',
            is_active: true,
            license_expiry: '2025-12-31',
            vehicle_plate: 'ABC-123'
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440003',
            email: 'coordinador@hospital.cl',
            encrypted_password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewDrPNAXfL6mhcZK',
            name: 'Coordinador de Turnos',
            role: 'coordinador',
            status: 'approved',
            avatar_url: null,
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z'),
            phone: '+56933332222',
            department: 'Logística',
            rut: '33.444.555-6',
            is_active: true
        }
    ],
    vehicles: [
        {
            id: '550e8400-e29b-41d4-a716-446655440004',
            plate: 'ABC-123',
            brand: 'Toyota',
            model: 'Hiace',
            type: 'Van',
            year: 2024,
            mileage: 5000,
            next_maintenance_km: 15000,
            status: 'disponible',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z')
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440005',
            plate: 'DEF-456',
            brand: 'Ford',
            model: 'Transit',
            type: 'Van',
            year: 2023,
            mileage: 12000,
            next_maintenance_km: 18000,
            status: 'disponible',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z')
        }
    ],
    origin_services: [
        {
            id: '550e8400-e29b-41d4-a716-446655440006',
            name: 'Hospital Central',
            address: 'Av. Libertador Bernardo O\'Higgins 1234, Santiago',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z')
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440007',
            name: 'Clínica Las Condes',
            address: 'Av. Las Condes 763, Las Condes, Santiago',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z')
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440008',
            name: 'Bodega Central',
            address: 'Calle Ficticia 123, Santiago',
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z')
        }
    ],
    clinical_staff: [
        {
            id: '550e8400-e29b-41d4-a716-446655440009',
            name: 'Dr. García',
            role: 'Médico',
            is_active: true,
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z')
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440010',
            name: 'Enfermera María',
            role: 'Enfermera',
            is_active: true,
            created_at: new Date('2024-01-01T00:00:00Z'),
            updated_at: new Date('2024-01-01T00:00:00Z')
        }
    ],
    trips: [
        {
            id: '550e8400-e29b-41d4-a716-446655440011',
            tracking_number: 'TR-001234',
            requester_id: '550e8400-e29b-41d4-a716-446655440001',
            requester_name: 'Solicitante de Transporte',
            origin: 'Hospital Central',
            destination: 'Clínica Las Condes',
            patient_name: 'Juan Pérez',
            patient_unit: 'Urgencias',
            priority: 'normal',
            notes: 'Paciente estable',
            trip_type: 'clinico',
            status: 'pendiente',
            clinical_team: 'Enfermera especializada',
            contact_person: 'Dr. García - 956789123',
            scheduled_date: '2024-05-18',
            rut: '12.345.678-9',
            age: '45',
            diagnosis: 'Dolor abdominal',
            weight: '70kg',
            bed: 'U-101',
            transfer_reason: 'Estudios complementarios',
            attending_physician: 'Dr. García',
            appointment_time: '10:00',
            departure_time: '09:30',
            required_personnel: ['enfermera', 'ayudante'],
            patient_requirements: ['camilla', 'oxígeno'],
            accompaniment: 'Sí',
            task_details: 'Transporte programado',
            staff_count: '2',
            assigned_clinical_staff: [{ type: 'enfermera', staff_id: '550e8400-e29b-41d4-a716-446655440010', staff_name: 'Enfermera María' }],
            driver_id: null,
            driver_name: null,
            vehicle_id: null,
            vehicle_plate: null,
            start_mileage: null,
            end_mileage: null,
            total_mileage: null,
            cancel_reason: null,
            group_id: null,
            order_in_group: 0,
            created_at: new Date('2024-05-18T08:00:00Z'),
            updated_at: new Date('2024-05-18T08:00:00Z')
        },
        {
            id: '550e8400-e29b-41d4-a716-446655440012',
            tracking_number: 'TR-001235',
            requester_id: '550e8400-e29b-41d4-a716-446655440001',
            requester_name: 'Solicitante de Transporte',
            origin: 'Bodega Central',
            destination: 'Pabellón Norte',
            patient_name: 'Material quirúrgico - Lote 2024-A',
            patient_unit: 'Bodega',
            priority: 'normal',
            notes: 'Instrumental estéril para cirugía programada',
            trip_type: 'no_clinico',
            status: 'completado',
            clinical_team: null,
            contact_person: null,
            scheduled_date: '2024-05-17',
            rut: '',
            age: '',
            diagnosis: '',
            weight: '',
            bed: '',
            transfer_reason: '',
            attending_physician: '',
            appointment_time: '',
            departure_time: '',
            required_personnel: [],
            patient_requirements: [],
            accompaniment: '',
            task_details: '',
            staff_count: '',
            assigned_clinical_staff: [],
            driver_id: '550e8400-e29b-41d4-a716-446655440002',
            driver_name: 'Conductor Juan Pérez',
            vehicle_id: '550e8400-e29b-41d4-a716-446655440004',
            vehicle_plate: 'ABC-123',
            start_mileage: 5000,
            end_mileage: 5050,
            total_mileage: 50,
            cancel_reason: null,
            group_id: null,
            order_in_group: 0,
            created_at: new Date('2024-05-17T09:00:00Z'),
            updated_at: new Date('2024-05-17T11:00:00Z')
        }
    ]
};

async function migrateData() {
    try {
        console.log('Starting migration from MongoDB to Supabase...');

        // Migrate profiles
        console.log('Migrating profiles...');
        const { error: profilesError } = await supabase
            .from('profiles')
            .insert(mockData.profiles);
        if (profilesError) {
            console.error('Error migrating profiles:', profilesError);
        } else {
            console.log('Successfully migrated', mockData.profiles.length, 'profiles');
        }

        // Migrate vehicles
        console.log('Migrating vehicles...');
        const { error: vehiclesError } = await supabase
            .from('vehicles')
            .insert(mockData.vehicles);
        if (vehiclesError) {
            console.error('Error migrating vehicles:', vehiclesError);
        } else {
            console.log('Successfully migrated', mockData.vehicles.length, 'vehicles');
        }

        // Migrate origin_services
        console.log('Migrating origin_services...');
        const { error: originServicesError } = await supabase
            .from('origin_services')
            .insert(mockData.origin_services);
        if (originServicesError) {
            console.error('Error migrating origin_services:', originServicesError);
        } else {
            console.log('Successfully migrated', mockData.origin_services.length, 'origin_services');
        }

        // Migrate clinical_staff
        console.log('Migrating clinical_staff...');
        const { error: clinicalStaffError } = await supabase
            .from('clinical_staff')
            .insert(mockData.clinical_staff);
        if (clinicalStaffError) {
            console.error('Error migrating clinical_staff:', clinicalStaffError);
        } else {
            console.log('Successfully migrated', mockData.clinical_staff.length, 'clinical_staff');
        }

        // Migrate trips
        console.log('Migrating trips...');
        const { error: tripsError } = await supabase
            .from('trips')
            .insert(mockData.trips);
        if (tripsError) {
            console.error('Error migrating trips:', tripsError);
        } else {
            console.log('Successfully migrated', mockData.trips.length, 'trips');
        }

        console.log('Migration completed successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

// Run migration
migrateData();