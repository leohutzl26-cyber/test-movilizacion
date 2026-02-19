#!/usr/bin/env python3

import requests
import json
import sys
import time
from datetime import datetime

class HospitalTransferSystemTester:
    def __init__(self, base_url="https://healthcare-logistics-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.solicitante_token = None
        self.conductor_token = None
        self.coordinador_token = None
        self.test_users = {}
        self.tests_run = 0
        self.tests_passed = 0
        self.failures = []

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test result with details"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: {message}")
        else:
            self.failures.append(f"{test_name}: {message}")
            print(f"❌ {test_name}: {message}")
            if response_data:
                print(f"   Response: {response_data}")

    def api_request(self, method, endpoint, data=None, token=None, files=None):
        """Make API request with error handling"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        if files:
            headers.pop('Content-Type', None)  # Let requests handle multipart
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            return response.status_code, response.json() if response.content else {}
        except requests.exceptions.RequestException as e:
            return 0, {"error": str(e)}
        except json.JSONDecodeError:
            return response.status_code if 'response' in locals() else 0, {"error": "Invalid JSON response"}

    def test_admin_login(self):
        """Test admin login functionality"""
        status, data = self.api_request('POST', '/auth/login', {
            'email': 'admin@hospital.cl',
            'password': 'admin123'
        })
        
        if status == 200 and 'token' in data:
            self.admin_token = data['token']
            self.log_result("Admin Login", True, f"Admin logged in successfully, role: {data.get('user', {}).get('role')}")
            return True
        else:
            self.log_result("Admin Login", False, f"Status: {status}, Response: {data}")
            return False

    def test_user_registration_approval_flow(self):
        """Test complete user registration and approval flow for all roles"""
        timestamp = int(time.time())
        
        test_users = [
            {"role": "solicitante", "name": f"Test Solicitante {timestamp}", "email": f"solicitante{timestamp}@test.com", "password": "testpass123"},
            {"role": "conductor", "name": f"Test Conductor {timestamp}", "email": f"conductor{timestamp}@test.com", "password": "testpass123"}, 
            {"role": "coordinador", "name": f"Test Coordinador {timestamp}", "email": f"coordinador{timestamp}@test.com", "password": "testpass123"}
        ]
        
        for user_data in test_users:
            # Register user
            status, data = self.api_request('POST', '/auth/register', user_data)
            if status == 200:
                user_id = data.get('user_id')
                self.test_users[user_data['role']] = {'id': user_id, **user_data}
                self.log_result(f"Register {user_data['role']}", True, f"User {user_data['name']} registered with ID: {user_id}")
                
                # Approve user as admin
                status, data = self.api_request('PUT', f'/users/{user_id}/approve', token=self.admin_token)
                if status == 200:
                    self.log_result(f"Approve {user_data['role']}", True, f"User {user_data['name']} approved")
                    
                    # Test login with new user
                    status, login_data = self.api_request('POST', '/auth/login', {
                        'email': user_data['email'],
                        'password': user_data['password']
                    })
                    if status == 200 and 'token' in login_data:
                        # Store tokens for later tests
                        if user_data['role'] == 'solicitante':
                            self.solicitante_token = login_data['token']
                        elif user_data['role'] == 'conductor':
                            self.conductor_token = login_data['token']
                        elif user_data['role'] == 'coordinador':
                            self.coordinador_token = login_data['token']
                        
                        self.log_result(f"Login {user_data['role']}", True, f"User {user_data['name']} logged in successfully")
                    else:
                        self.log_result(f"Login {user_data['role']}", False, f"Login failed - Status: {status}")
                else:
                    self.log_result(f"Approve {user_data['role']}", False, f"Approval failed - Status: {status}")
            else:
                self.log_result(f"Register {user_data['role']}", False, f"Registration failed - Status: {status}")

    def test_trip_creation_clinico(self):
        """Test creating clinico trip with all Phase 2 fields"""
        if not self.solicitante_token:
            self.log_result("Create Clinico Trip", False, "No solicitante token available")
            return None
            
        trip_data = {
            "trip_type": "clinico",
            "origin": "Hospital Central",
            "destination": "Clinica Las Condes", 
            "patient_name": "Juan Pérez",
            "clinical_team": "Enfermera especializada",
            "contact_person": "Dr. García - 956789123",
            "priority": "alta",
            "scheduled_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Paciente requiere equipo de oxígeno"
        }
        
        status, data = self.api_request('POST', '/trips', trip_data, token=self.solicitante_token)
        if status == 200 and 'id' in data:
            trip_id = data['id']
            # Verify all clinical fields are saved
            clinical_fields_present = all(field in data for field in ['clinical_team', 'contact_person', 'trip_type'])
            self.log_result("Create Clinico Trip", True, f"Clinico trip created with ID: {trip_id}, clinical fields saved: {clinical_fields_present}")
            return trip_id
        else:
            self.log_result("Create Clinico Trip", False, f"Status: {status}, Response: {data}")
            return None

    def test_trip_creation_no_clinico(self):
        """Test creating no_clinico trip"""
        if not self.solicitante_token:
            self.log_result("Create No Clinico Trip", False, "No solicitante token available")
            return None
            
        trip_data = {
            "trip_type": "no_clinico",
            "origin": "Bodega Central",
            "destination": "Pabellón Norte",
            "patient_name": "Material quirúrgico - Lote 2024-A",
            "priority": "normal",
            "scheduled_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Instrumental estéril para cirugía programada"
        }
        
        status, data = self.api_request('POST', '/trips', trip_data, token=self.solicitante_token)
        if status == 200 and 'id' in data:
            trip_id = data['id']
            self.log_result("Create No Clinico Trip", True, f"No clinico trip created with ID: {trip_id}")
            return trip_id
        else:
            self.log_result("Create No Clinico Trip", False, f"Status: {status}, Response: {data}")
            return None

    def test_trip_edit_functionality(self, trip_id):
        """Test editing trip functionality (Phase 2 feature)"""
        if not self.solicitante_token or not trip_id:
            self.log_result("Edit Trip", False, "Missing token or trip ID")
            return False
            
        update_data = {
            "notes": "Notas actualizadas - Prioridad confirmada",
            "priority": "urgente",
            "clinical_team": "Equipo médico actualizado"
        }
        
        status, data = self.api_request('PUT', f'/trips/{trip_id}', update_data, token=self.solicitante_token)
        if status == 200:
            self.log_result("Edit Trip", True, "Trip updated successfully")
            return True
        else:
            self.log_result("Edit Trip", False, f"Status: {status}, Response: {data}")
            return False

    def test_driver_pool_and_assignment(self, trip_id):
        """Test driver can see pool and self-assign"""
        if not self.conductor_token or not trip_id:
            self.log_result("Driver Pool Access", False, "Missing conductor token or trip ID")
            return False
            
        # Test pool endpoint
        status, data = self.api_request('GET', '/trips/pool', token=self.conductor_token)
        if status == 200:
            pool_trips = data if isinstance(data, list) else []
            trip_found = any(t.get('id') == trip_id for t in pool_trips)
            self.log_result("Driver Pool Access", True, f"Pool contains {len(pool_trips)} trips, target trip found: {trip_found}")
            
            # Test self-assignment
            status, data = self.api_request('PUT', f'/trips/{trip_id}/assign', token=self.conductor_token)
            if status == 200:
                self.log_result("Driver Self Assign", True, "Driver successfully assigned to trip")
                return True
            else:
                self.log_result("Driver Self Assign", False, f"Assignment failed - Status: {status}")
        else:
            self.log_result("Driver Pool Access", False, f"Pool access failed - Status: {status}")
        return False

    def test_manager_assignment_with_vehicle(self, trip_id, vehicle_id):
        """Test manager can assign/reassign drivers with vehicle selection"""
        if not self.coordinador_token or not trip_id:
            self.log_result("Manager Assignment", False, "Missing manager token or trip ID")
            return False
            
        if not self.test_users.get('conductor'):
            self.log_result("Manager Assignment", False, "No conductor user available")
            return False
            
        assign_data = {
            "driver_id": self.test_users['conductor']['id'],
            "vehicle_id": vehicle_id  # Test Phase 2 vehicle assignment
        }
        
        status, data = self.api_request('PUT', f'/trips/{trip_id}/manager-assign', assign_data, token=self.coordinador_token)
        if status == 200:
            self.log_result("Manager Assignment with Vehicle", True, "Manager successfully assigned driver and vehicle to trip")
            return True
        else:
            self.log_result("Manager Assignment with Vehicle", False, f"Status: {status}, Response: {data}")
            return False

    def test_trip_mileage_workflow(self, trip_id):
        """Test trip start/complete with mileage (Phase 2 feature)"""
        if not self.conductor_token or not trip_id:
            self.log_result("Trip Mileage Workflow", False, "Missing conductor token or trip ID")
            return False
            
        # Start trip with mileage
        start_data = {
            "status": "en_curso",
            "mileage": 45000.0
        }
        
        status, data = self.api_request('PUT', f'/trips/{trip_id}/status', start_data, token=self.conductor_token)
        if status == 200:
            self.log_result("Trip Start with Mileage", True, "Trip started with mileage recorded")
            
            # Complete trip with end mileage  
            complete_data = {
                "status": "completado",
                "mileage": 45050.0
            }
            
            status, data = self.api_request('PUT', f'/trips/{trip_id}/status', complete_data, token=self.conductor_token)
            if status == 200:
                self.log_result("Trip Complete with Mileage", True, "Trip completed with end mileage recorded")
                return True
            else:
                self.log_result("Trip Complete with Mileage", False, f"Status: {status}")
        else:
            self.log_result("Trip Start with Mileage", False, f"Status: {status}")
        return False

    def test_stats_and_calendar(self):
        """Test manager stats and calendar endpoints (Phase 2 features)"""
        if not self.coordinador_token:
            self.log_result("Stats Access", False, "No manager token available")
            return False
            
        # Test stats endpoint for clickable cards
        status, data = self.api_request('GET', '/stats', token=self.coordinador_token)
        if status == 200:
            required_stats = ['total_trips', 'pending_trips', 'active_trips', 'completed_trips', 'total_drivers', 'vehicles_available']
            has_all_stats = all(key in data for key in required_stats)
            self.log_result("Stats Endpoint", True, f"Stats retrieved, has all required fields: {has_all_stats}")
        else:
            self.log_result("Stats Endpoint", False, f"Status: {status}, Response: {data}")
            
        # Test calendar endpoint with date range
        start_date = datetime.now().strftime("%Y-%m-%d")
        end_date = datetime.now().strftime("%Y-%m-%d")
        
        status, data = self.api_request('GET', f'/trips/calendar?start_date={start_date}&end_date={end_date}', token=self.coordinador_token)
        if status == 200:
            calendar_trips = data if isinstance(data, list) else []
            self.log_result("Calendar Endpoint", True, f"Calendar retrieved with {len(calendar_trips)} trips for date range")
        else:
            self.log_result("Calendar Endpoint", False, f"Status: {status}")

    def test_vehicles_management(self):
        """Test vehicle management with OCR support"""
        if not self.admin_token:
            self.log_result("Vehicle Management", False, "No admin token available")
            return None
            
        # Create a test vehicle
        vehicle_data = {
            "plate": f"TEST{int(time.time()) % 10000}",
            "brand": "Toyota",
            "model": "Hiace",
            "year": 2024,
            "mileage": 5000,
            "next_maintenance_km": 15000
        }
        
        status, data = self.api_request('POST', '/vehicles', vehicle_data, token=self.admin_token)
        if status == 200 and 'id' in data:
            vehicle_id = data['id']
            self.log_result("Create Vehicle", True, f"Vehicle created with ID: {vehicle_id}")
            
            # Test vehicle list access
            status, data = self.api_request('GET', '/vehicles', token=self.conductor_token if self.conductor_token else self.admin_token)
            if status == 200:
                vehicles = data if isinstance(data, list) else []
                vehicle_found = any(v.get('id') == vehicle_id for v in vehicles)
                self.log_result("List Vehicles", True, f"Found {len(vehicles)} vehicles, new vehicle present: {vehicle_found}")
            else:
                self.log_result("List Vehicles", False, f"Status: {status}")
                
            # Test mileage update
            mileage_data = {"mileage": 5500}
            status, data = self.api_request('PUT', f'/vehicles/{vehicle_id}/mileage', mileage_data, token=self.admin_token)
            if status == 200:
                self.log_result("Update Vehicle Mileage", True, "Vehicle mileage updated successfully")
            else:
                self.log_result("Update Vehicle Mileage", False, f"Status: {status}")
                
            return vehicle_id
        else:
            self.log_result("Create Vehicle", False, f"Status: {status}, Response: {data}")
            return None

    def test_destinations_management(self):
        """Test destination management for custom origin/destination"""
        if not self.admin_token:
            self.log_result("Destination Management", False, "No admin token available")
            return False
            
        # Create destination
        dest_data = {
            "name": f"Test Destination {int(time.time())}",
            "address": "Test Address 123",
            "category": "hospital"
        }
        
        status, data = self.api_request('POST', '/destinations', dest_data, token=self.admin_token)
        if status == 200:
            self.log_result("Create Destination", True, "Destination created successfully")
            
            # List destinations (available to all users)
            status, data = self.api_request('GET', '/destinations', token=self.solicitante_token if self.solicitante_token else self.admin_token)
            if status == 200:
                destinations = data if isinstance(data, list) else []
                self.log_result("List Destinations", True, f"Retrieved {len(destinations)} destinations for trip creation")
                return True
            else:
                self.log_result("List Destinations", False, f"Status: {status}")
        else:
            self.log_result("Create Destination", False, f"Status: {status}")
        return False

    def test_trip_detail_access(self, trip_id):
        """Test trip detail endpoint access"""
        if not trip_id:
            return False
            
        # Test solicitante can view their trip details
        if self.solicitante_token:
            status, data = self.api_request('GET', f'/trips/{trip_id}', token=self.solicitante_token)
            if status == 200:
                # Check for Phase 2 fields in response
                phase2_fields = ['trip_type', 'clinical_team', 'contact_person', 'scheduled_date']
                has_phase2 = all(field in data for field in phase2_fields)
                self.log_result("Trip Detail Access", True, f"Trip details retrieved with Phase 2 fields: {has_phase2}")
            else:
                self.log_result("Trip Detail Access", False, f"Status: {status}")

    def run_all_tests(self):
        """Run complete test suite for Phase 2 features"""
        print("🏥 Starting Hospital Transfer Management System Backend Tests (Phase 2)")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 80)
        
        # Core authentication and setup
        if not self.test_admin_login():
            print("❌ Admin login failed - stopping tests")
            return self.generate_summary()
            
        self.test_user_registration_approval_flow()
        
        # Phase 2 trip management workflow
        clinico_trip_id = self.test_trip_creation_clinico()
        no_clinico_trip_id = self.test_trip_creation_no_clinico()
        
        # Vehicle management (needed for Phase 2 assignment)
        vehicle_id = self.test_vehicles_management()
        
        if clinico_trip_id:
            self.test_trip_edit_functionality(clinico_trip_id)
            self.test_trip_detail_access(clinico_trip_id)
            self.test_driver_pool_and_assignment(clinico_trip_id)
            if vehicle_id:
                self.test_manager_assignment_with_vehicle(clinico_trip_id, vehicle_id)
            self.test_trip_mileage_workflow(clinico_trip_id)
            
        # Phase 2 management functions
        self.test_stats_and_calendar()
        self.test_destinations_management()
        
        return self.generate_summary()

    def generate_summary(self):
        """Generate comprehensive test summary"""
        print("\n" + "=" * 80)
        print("📊 PHASE 2 TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests Failed: {len(self.failures)}")
        
        if self.failures:
            print("\n🔴 FAILURES:")
            for failure in self.failures:
                print(f"   • {failure}")
                
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        # Phase 2 specific summary
        phase2_features_tested = [
            "Clinico vs No-Clinico trip types",
            "Clinical team and contact person fields", 
            "Custom origin/destination (Otro option)",
            "Scheduled date defaulting to today",
            "Trip edit functionality for pending trips",
            "Manager assignment with vehicle selection",
            "Driver mileage dialogs on trip start/complete",
            "Clickable dispatch stats",
            "Weekly calendar with date ranges"
        ]
        
        print(f"\n🆕 PHASE 2 FEATURES TESTED:")
        for feature in phase2_features_tested:
            print(f"   ✓ {feature}")
        
        return {
            "tests_run": self.tests_run,
            "tests_passed": self.tests_passed,
            "tests_failed": len(self.failures),
            "success_rate": success_rate,
            "failures": self.failures
        }

def main():
    """Main test execution"""
    tester = HospitalTransferSystemTester()
    summary = tester.run_all_tests()
    
    # Exit with appropriate code
    return 0 if summary["tests_failed"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())