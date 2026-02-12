import requests
import sys
import json
from datetime import datetime

class WingoAPITester:
    def __init__(self, base_url="https://quickwin-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.user_token = None
        self.admin_token = None
        self.test_user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def make_request(self, method, endpoint, data=None, token=None):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_root_endpoint(self):
        """Test root API endpoint"""
        response = self.make_request('GET', '')
        if response and response.status_code == 200:
            data = response.json()
            success = "WingoX API" in data.get('message', '')
            self.log_test("Root API Endpoint", success, 
                         f"Status: {response.status_code}, Message: {data}")
        else:
            self.log_test("Root API Endpoint", False, 
                         f"Status: {response.status_code if response else 'No response'}")

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_data = {
            "email": f"testuser{timestamp}@wingo.com",
            "password": "TestPass123!",
            "name": f"Test User {timestamp}"
        }
        
        response = self.make_request('POST', 'auth/register', test_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.user_token = data['token']
                self.test_user_id = data['user']['id']
                self.log_test("User Registration", True, f"User created: {data['user']['email']}")
            else:
                self.log_test("User Registration", False, "Missing token or user in response")
        else:
            self.log_test("User Registration", False, 
                         f"Status: {response.status_code if response else 'No response'}")

    def test_admin_login(self):
        """Test admin login"""
        admin_data = {
            "email": "admin@wingo.com",
            "password": "admin123"
        }
        
        response = self.make_request('POST', 'auth/login', admin_data)
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and data['user']['role'] == 'admin':
                self.admin_token = data['token']
                self.log_test("Admin Login", True, f"Admin logged in: {data['user']['email']}")
            else:
                self.log_test("Admin Login", False, "Invalid admin credentials or role")
        else:
            self.log_test("Admin Login", False, 
                         f"Status: {response.status_code if response else 'No response'}")

    def test_user_profile(self):
        """Test user profile endpoint"""
        if not self.user_token:
            self.log_test("User Profile", False, "No user token available")
            return
            
        response = self.make_request('GET', 'user/profile', token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            success = 'id' in data and 'email' in data and 'balance' in data
            self.log_test("User Profile", success, f"Profile data: {data}")
        else:
            self.log_test("User Profile", False, 
                         f"Status: {response.status_code if response else 'No response'}")

    def test_user_balance(self):
        """Test user balance endpoint"""
        if not self.user_token:
            self.log_test("User Balance", False, "No user token available")
            return
            
        response = self.make_request('GET', 'user/balance', token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            success = 'balance' in data and 'wager_requirement' in data
            self.log_test("User Balance", success, f"Balance data: {data}")
        else:
            self.log_test("User Balance", False, 
                         f"Status: {response.status_code if response else 'No response'}")

    def test_deposit_request(self):
        """Test deposit request"""
        if not self.user_token:
            self.log_test("Deposit Request", False, "No user token available")
            return
            
        deposit_data = {
            "utr": "123456789012",  # 12 digit UTR
            "amount": 1000
        }
        
        response = self.make_request('POST', 'deposit/request', deposit_data, self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            success = 'message' in data and 'deposit' in data
            self.log_test("Deposit Request", success, f"Deposit created: {data}")
            return data.get('deposit', {}).get('id')
        else:
            self.log_test("Deposit Request", False, 
                         f"Status: {response.status_code if response else 'No response'}")
            return None

    def test_deposit_history(self):
        """Test deposit history"""
        if not self.user_token:
            self.log_test("Deposit History", False, "No user token available")
            return
            
        response = self.make_request('GET', 'deposit/history', token=self.user_token)
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Deposit History", success, f"Found {len(data)} deposits")
        else:
            self.log_test("Deposit History", False, 
                         f"Status: {response.status_code if response else 'No response'}")

    def test_game_bet_insufficient_balance(self):
        """Test game bet with insufficient balance"""
        if not self.user_token:
            self.log_test("Game Bet (Insufficient Balance)", False, "No user token available")
            return
            
        bet_data = {
            "game_mode": "30s",
            "bet_type": "color",
            "bet_value": "green",
            "bet_amount": 10
        }
        
        response = self.make_request('POST', 'game/bet', bet_data, self.user_token)
        # Should fail with insufficient balance
        if response and response.status_code == 400:
            success = "Insufficient balance" in response.json().get('detail', '')
            self.log_test("Game Bet (Insufficient Balance)", success, 
                         "Correctly rejected bet with insufficient balance")
        else:
            self.log_test("Game Bet (Insufficient Balance)", False, 
                         f"Expected 400 status, got: {response.status_code if response else 'No response'}")

    def test_withdrawal_insufficient_wager(self):
        """Test withdrawal with insufficient wager"""
        if not self.user_token:
            self.log_test("Withdrawal (Insufficient Wager)", False, "No user token available")
            return
            
        withdrawal_data = {
            "amount": 100
        }
        
        response = self.make_request('POST', 'withdrawal/request', withdrawal_data, self.user_token)
        # Should fail due to insufficient balance or wager requirement
        if response and response.status_code == 400:
            success = True  # Any 400 error is expected for new user
            self.log_test("Withdrawal (Insufficient Wager)", success, 
                         f"Correctly rejected withdrawal: {response.json().get('detail', '')}")
        else:
            self.log_test("Withdrawal (Insufficient Wager)", False, 
                         f"Expected 400 status, got: {response.status_code if response else 'No response'}")

    def test_admin_deposits(self):
        """Test admin deposits endpoint"""
        if not self.admin_token:
            self.log_test("Admin Deposits", False, "No admin token available")
            return
            
        response = self.make_request('GET', 'admin/deposits', token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Admin Deposits", success, f"Found {len(data)} deposits")
            return data
        else:
            self.log_test("Admin Deposits", False, 
                         f"Status: {response.status_code if response else 'No response'}")
            return []

    def test_admin_users(self):
        """Test admin users endpoint"""
        if not self.admin_token:
            self.log_test("Admin Users", False, "No admin token available")
            return
            
        response = self.make_request('GET', 'admin/users', token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list) and len(data) > 0
            self.log_test("Admin Users", success, f"Found {len(data)} users")
        else:
            self.log_test("Admin Users", False, 
                         f"Status: {response.status_code if response else 'No response'}")

    def test_admin_withdrawals(self):
        """Test admin withdrawals endpoint"""
        if not self.admin_token:
            self.log_test("Admin Withdrawals", False, "No admin token available")
            return
            
        response = self.make_request('GET', 'admin/withdrawals', token=self.admin_token)
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Admin Withdrawals", success, f"Found {len(data)} withdrawals")
        else:
            self.log_test("Admin Withdrawals", False, 
                         f"Status: {response.status_code if response else 'No response'}")

    def test_deposit_approval_flow(self):
        """Test complete deposit approval flow"""
        if not self.admin_token or not self.user_token:
            self.log_test("Deposit Approval Flow", False, "Missing required tokens")
            return

        # First create a deposit
        deposit_id = self.test_deposit_request()
        if not deposit_id:
            self.log_test("Deposit Approval Flow", False, "Failed to create deposit")
            return

        # Get user balance before approval
        balance_response = self.make_request('GET', 'user/balance', token=self.user_token)
        if not balance_response or balance_response.status_code != 200:
            self.log_test("Deposit Approval Flow", False, "Failed to get initial balance")
            return
        
        initial_balance = balance_response.json()['balance']

        # Approve the deposit
        response = self.make_request('PUT', f'admin/deposit/{deposit_id}/approve', 
                                   token=self.admin_token)
        if response and response.status_code == 200:
            # Check if balance increased
            new_balance_response = self.make_request('GET', 'user/balance', token=self.user_token)
            if new_balance_response and new_balance_response.status_code == 200:
                new_balance = new_balance_response.json()['balance']
                success = new_balance > initial_balance
                self.log_test("Deposit Approval Flow", success, 
                             f"Balance changed from {initial_balance} to {new_balance}")
            else:
                self.log_test("Deposit Approval Flow", False, "Failed to get updated balance")
        else:
            self.log_test("Deposit Approval Flow", False, 
                         f"Approval failed: {response.status_code if response else 'No response'}")

    def test_game_logic_multiple_bets(self):
        """Test game logic with multiple bets to verify win/loss ratio"""
        if not self.user_token:
            self.log_test("Game Logic (Multiple Bets)", False, "No user token available")
            return

        # First ensure user has balance by checking current balance
        balance_response = self.make_request('GET', 'user/balance', token=self.user_token)
        if not balance_response or balance_response.status_code != 200:
            self.log_test("Game Logic (Multiple Bets)", False, "Failed to get balance")
            return
        
        current_balance = balance_response.json()['balance']
        if current_balance < 100:  # Need at least 100 for 10 bets of 10 each
            self.log_test("Game Logic (Multiple Bets)", False, 
                         f"Insufficient balance for testing: {current_balance}")
            return

        wins = 0
        losses = 0
        bet_count = min(10, int(current_balance / 10))  # Bet 10 each, max 10 bets
        
        for i in range(bet_count):
            bet_data = {
                "game_mode": "30s",
                "bet_type": "number",
                "bet_value": "0",  # Bet on 0 (should win ~20% of time)
                "bet_amount": 10
            }
            
            response = self.make_request('POST', 'game/bet', bet_data, self.user_token)
            if response and response.status_code == 200:
                result = response.json()
                if result['win_amount'] > 0:
                    wins += 1
                else:
                    losses += 1
            else:
                break

        if wins + losses > 0:
            win_rate = (wins / (wins + losses)) * 100
            # Allow some variance in win rate (10-30% is acceptable for small sample)
            success = 10 <= win_rate <= 30
            self.log_test("Game Logic (Multiple Bets)", success, 
                         f"Win rate: {win_rate:.1f}% ({wins}/{wins + losses})")
        else:
            self.log_test("Game Logic (Multiple Bets)", False, "No successful bets placed")

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting WingoX API Testing...")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)

        # Basic API tests
        self.test_root_endpoint()
        
        # Authentication tests
        self.test_user_registration()
        self.test_admin_login()
        
        # User functionality tests
        self.test_user_profile()
        self.test_user_balance()
        
        # Transaction tests
        self.test_deposit_request()
        self.test_deposit_history()
        
        # Game tests
        self.test_game_bet_insufficient_balance()
        self.test_withdrawal_insufficient_wager()
        
        # Admin tests
        self.test_admin_deposits()
        self.test_admin_users()
        self.test_admin_withdrawals()
        
        # Integration tests
        self.test_deposit_approval_flow()
        self.test_game_logic_multiple_bets()

        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            return 1

def main():
    tester = WingoAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())