import requests
import sys

class ExistingUserTester:
    def __init__(self, base_url="https://quickwin-hub.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        
    def test_existing_player(self):
        """Test existing player credentials"""
        print("🔍 Testing existing player credentials...")
        
        login_data = {
            "email": "player@test.com",
            "password": "test123"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Player login successful")
                print(f"   Email: {data['user']['email']}")
                print(f"   Balance: ₹{data['user']['balance']}")
                print(f"   Role: {data['user']['role']}")
                
                # Test balance endpoint
                token = data['token']
                headers = {'Authorization': f'Bearer {token}'}
                balance_response = requests.get(f"{self.api_url}/user/balance", headers=headers)
                if balance_response.status_code == 200:
                    balance_data = balance_response.json()
                    print(f"   Current Balance: ₹{balance_data['balance']}")
                    print(f"   Wager Requirement: ₹{balance_data['wager_requirement']}")
                    print(f"   Total Wagered: ₹{balance_data['total_wagered']}")
                
                return True, token
            else:
                print(f"❌ Player login failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False, None
        except Exception as e:
            print(f"❌ Player login error: {str(e)}")
            return False, None
    
    def test_existing_admin(self):
        """Test existing admin credentials"""
        print("\n🔍 Testing existing admin credentials...")
        
        login_data = {
            "email": "admin@wingo.com", 
            "password": "admin123"
        }
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Admin login successful")
                print(f"   Email: {data['user']['email']}")
                print(f"   Role: {data['user']['role']}")
                return True, data['token']
            else:
                print(f"❌ Admin login failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False, None
        except Exception as e:
            print(f"❌ Admin login error: {str(e)}")
            return False, None

    def test_game_bet_with_balance(self, token):
        """Test placing a bet with sufficient balance"""
        print("\n🎮 Testing game bet with sufficient balance...")
        
        bet_data = {
            "game_mode": "30s",
            "bet_type": "color",
            "bet_value": "green",
            "bet_amount": 10
        }
        
        headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
        
        try:
            response = requests.post(f"{self.api_url}/game/bet", json=bet_data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Bet placed successfully")
                print(f"   Result Number: {result['result_number']}")
                print(f"   Result Color: {result['result_color']}")
                print(f"   Win Amount: ₹{result['win_amount']}")
                print(f"   New Balance: ₹{result['new_balance']}")
                return True
            else:
                print(f"❌ Bet failed: {response.status_code}")
                print(f"   Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Bet error: {str(e)}")
            return False

def main():
    tester = ExistingUserTester()
    
    # Test player
    player_success, player_token = tester.test_existing_player()
    
    # Test admin
    admin_success, admin_token = tester.test_existing_admin()
    
    # Test game bet if player login worked
    if player_success and player_token:
        tester.test_game_bet_with_balance(player_token)
    
    print(f"\n📊 Results:")
    print(f"   Player Login: {'✅' if player_success else '❌'}")
    print(f"   Admin Login: {'✅' if admin_success else '❌'}")

if __name__ == "__main__":
    main()