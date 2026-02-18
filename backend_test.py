import requests
import json
import sys
from datetime import datetime

class HospitalTransferTester:
    def __init__(self, base_url="https://healthcare-logistics-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.test_user_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []

    def log_result(self, test_name, success, error_msg=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name}: {error_msg}")
            self.errors.append(f"{test_name}: {error_msg}")

    def make_request(self, method, endpoint, data=None, token=None, files=None):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        if files:
            headers.pop('Content-Type', None)  # Remove for file uploads
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, headers=headers, files=files)
                else:
                    response = requests.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            return response
        except Exception as e:
            return None, str(e)

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Login...")
        response = self.make_request('POST', '/auth/login', {
            'email': 'admin@hospital.cl',
            'password': 'admin123'
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.admin_token = data.get('token')
            if self.admin_token and data.get('user', {}).get('role') == 'admin':
                self.log_result("Admin Login", True)
                return True
            else:
                self.log_result("Admin Login", False, "Invalid token or role")
                return False
        else:
            error_msg = response.json().get('detail', 'Login failed') if response else 'Request failed'
            self.log_result("Admin Login", False, error_msg)
            return False

    def test_register_user(self):
        """Test user registration"""
        print("\n👤 Testing User Registration...")
        timestamp = datetime.now().strftime("%H%M%S")
        test_user = {
            'email': f'test_user_{timestamp}@hospital.cl',
            'password': 'TestPass123!',
            'name': f'Test User {timestamp}',
            'role': 'solicitante'
        }
        
        response = self.make_request('POST', '/auth/register', test_user)
        
        if response and response.status_code == 200:
            data = response.json()
            if data.get('user_id'):
                self.test_user_id = data['user_id']
                self.log_result("User Registration", True)
                return test_user
            else:
                self.log_result("User Registration", False, "No user_id returned")
                return None
        else:
            error_msg = response.json().get('detail', 'Registration failed') if response else 'Request failed'
            self.log_result("User Registration", False, error_msg)
            return None

    def test_user_approval(self):
        """Test user approval by admin"""
        print("\n✅ Testing User Approval...")
        if not self.admin_token or not self.test_user_id:
            self.log_result("User Approval", False, "Missing admin token or test user")
            return False
            
        response = self.make_request('PUT', f'/users/{self.test_user_id}/approve', token=self.admin_token)
        
        if response and response.status_code == 200:
            self.log_result("User Approval", True)
            return True
        else:
            error_msg = response.json().get('detail', 'Approval failed') if response else 'Request failed'
            self.log_result("User Approval", False, error_msg)
            return False

    def test_user_login_after_approval(self, user_data):
        """Test login with approved user"""
        print("\n🔑 Testing User Login After Approval...")
        if not user_data:
            self.log_result("User Login After Approval", False, "No user data")
            return False
            
        response = self.make_request('POST', '/auth/login', {
            'email': user_data['email'],
            'password': user_data['password']
        })
        
        if response and response.status_code == 200:
            data = response.json()
            self.test_user_token = data.get('token')
            if self.test_user_token:
                self.log_result("User Login After Approval", True)
                return True
            else:
                self.log_result("User Login After Approval", False, "No token returned")
                return False
        else:
            error_msg = response.json().get('detail', 'Login failed') if response else 'Request failed'
            self.log_result("User Login After Approval", False, error_msg)
            return False

    def test_stats_endpoint(self):
        """Test stats endpoint"""
        print("\n📊 Testing Stats Endpoint...")
        response = self.make_request('GET', '/stats', token=self.admin_token)
        
        if response and response.status_code == 200:
            data = response.json()
            required_fields = ['total_trips', 'pending_trips', 'total_vehicles', 'total_drivers']
            if all(field in data for field in required_fields):
                self.log_result("Stats Endpoint", True)
                return True
            else:
                self.log_result("Stats Endpoint", False, "Missing required fields")
                return False
        else:
            error_msg = response.json().get('detail', 'Stats failed') if response else 'Request failed'
            self.log_result("Stats Endpoint", False, error_msg)
            return False

    def test_vehicle_crud(self):
        """Test vehicle CRUD operations"""
        print("\n🚗 Testing Vehicle CRUD...")
        
        # Create vehicle
        vehicle_data = {
            'plate': 'TEST-123',
            'brand': 'Toyota',
            'model': 'Hiace',
            'year': 2024,
            'mileage': 1000,
            'next_maintenance_km': 11000
        }
        
        response = self.make_request('POST', '/vehicles', vehicle_data, token=self.admin_token)
        
        if response and response.status_code == 200:
            vehicle = response.json()
            vehicle_id = vehicle.get('id')
            self.log_result("Vehicle Creation", True)
            
            # Test status update
            status_response = self.make_request('PUT', f'/vehicles/{vehicle_id}/status', 
                                              {'status': 'en_servicio'}, token=self.admin_token)
            
            if status_response and status_response.status_code == 200:
                self.log_result("Vehicle Status Update", True)
            else:
                self.log_result("Vehicle Status Update", False, "Status update failed")
            
            return vehicle_id
        else:
            error_msg = response.json().get('detail', 'Vehicle creation failed') if response else 'Request failed'
            self.log_result("Vehicle Creation", False, error_msg)
            return None

    def test_destination_crud(self):
        """Test destination CRUD operations"""
        print("\n📍 Testing Destination CRUD...")
        
        # Create destination
        dest_data = {
            'name': 'Test Urgencias',
            'address': 'Piso 1, Test Hospital',
            'category': 'urgencias'
        }
        
        response = self.make_request('POST', '/destinations', dest_data, token=self.admin_token)
        
        if response and response.status_code == 200:
            destination = response.json()
            dest_id = destination.get('id')
            self.log_result("Destination Creation", True)
            
            # Test deletion
            delete_response = self.make_request('DELETE', f'/destinations/{dest_id}', token=self.admin_token)
            
            if delete_response and delete_response.status_code == 200:
                self.log_result("Destination Deletion", True)
            else:
                self.log_result("Destination Deletion", False, "Deletion failed")
            
            return True
        else:
            error_msg = response.json().get('detail', 'Destination creation failed') if response else 'Request failed'
            self.log_result("Destination Creation", False, error_msg)
            return False

    def test_trip_workflow(self):
        """Test complete trip workflow"""
        print("\n🚌 Testing Trip Workflow...")
        
        # Create trip (as requester)
        trip_data = {
            'origin': 'Test Origen',
            'destination': 'Test Destino',
            'patient_name': 'Juan Test',
            'patient_unit': 'Test Unit',
            'priority': 'normal',
            'notes': 'Test trip'
        }
        
        response = self.make_request('POST', '/trips', trip_data, token=self.test_user_token)
        
        if response and response.status_code == 200:
            trip = response.json()
            trip_id = trip.get('id')
            self.log_result("Trip Creation", True)
            
            # Test trip pool (should appear in pool)
            pool_response = self.make_request('GET', '/trips/pool', token=self.admin_token)
            
            if pool_response and pool_response.status_code == 200:
                pool_trips = pool_response.json()
                if any(t['id'] == trip_id for t in pool_trips):
                    self.log_result("Trip Pool Visibility", True)
                else:
                    self.log_result("Trip Pool Visibility", False, "Trip not in pool")
            else:
                self.log_result("Trip Pool Visibility", False, "Pool access failed")
            
            return trip_id
        else:
            error_msg = response.json().get('detail', 'Trip creation failed') if response else 'Request failed'
            self.log_result("Trip Creation", False, error_msg)
            return None

    def test_forgot_password_flow(self):
        """Test forgot password functionality"""
        print("\n🔑 Testing Forgot Password...")
        
        response = self.make_request('POST', '/auth/forgot-password', {
            'email': 'admin@hospital.cl'
        })
        
        if response and response.status_code == 200:
            data = response.json()
            reset_token = data.get('reset_token')  # In dev mode, token is returned
            self.log_result("Forgot Password Request", True)
            
            if reset_token:
                # Test reset password
                reset_response = self.make_request('POST', '/auth/reset-password', {
                    'token': reset_token,
                    'new_password': 'admin123'  # Reset to same password
                })
                
                if reset_response and reset_response.status_code == 200:
                    self.log_result("Password Reset", True)
                else:
                    self.log_result("Password Reset", False, "Reset failed")
            
            return True
        else:
            error_msg = response.json().get('detail', 'Forgot password failed') if response else 'Request failed'
            self.log_result("Forgot Password Request", False, error_msg)
            return False

    def run_all_tests(self):
        """Run all backend tests"""
        print("🏥 Starting Hospital Transfer Management System Backend Tests")
        print("=" * 60)
        
        # Core authentication tests
        if not self.test_admin_login():
            print("\n❌ Admin login failed - stopping tests")
            return self.generate_report()
            
        # User management workflow
        test_user = self.test_register_user()
        if test_user:
            self.test_user_approval()
            self.test_user_login_after_approval(test_user)
        
        # Core functionality tests
        self.test_stats_endpoint()
        self.test_vehicle_crud()
        self.test_destination_crud()
        
        # Trip workflow (requires authenticated user)
        if self.test_user_token:
            self.test_trip_workflow()
        
        # Security tests
        self.test_forgot_password_flow()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 60)
        print(f"📊 Backend Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.errors:
            print("\n❌ Failed Tests:")
            for error in self.errors:
                print(f"   • {error}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return {
            'total_tests': self.tests_run,
            'passed_tests': self.tests_passed,
            'failed_tests': self.tests_run - self.tests_passed,
            'success_rate': success_rate,
            'errors': self.errors
        }

def main():
    tester = HospitalTransferTester()
    report = tester.run_all_tests()
    
    # Return appropriate exit code
    if report['success_rate'] >= 80:
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(main())