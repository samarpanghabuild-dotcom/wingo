from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import random
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    balance: float = 0.0
    total_credited: float = 0.0
    total_wagered: float = 0.0
    wager_requirement: float = 0.0
    role: str = "user"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepositRequest(BaseModel):
    utr: str
    sender_upi: str
    amount: float
    screenshot_url: Optional[str] = None

class Deposit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    utr: str
    sender_upi: str
    amount: float
    screenshot_url: Optional[str] = None
    status: str = "pending"
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WithdrawalRequest(BaseModel):
    amount: float
    method: str
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    mobile_number: str

class Withdrawal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    user_name: str
    amount: float
    method: str
    bank_name: Optional[str] = None
    account_holder: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    upi_id: Optional[str] = None
    mobile_number: str
    status: str = "pending"
    wager_progress: float
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "payment_settings"
    qr_code_url: str = ""
    upi_id: str = ""
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PlayerManagement(BaseModel):
    user_id: str
    action: str
    amount: Optional[float] = None
    reason: Optional[str] = None

class BetRequest(BaseModel):
    game_mode: str
    bet_type: str
    bet_value: str
    bet_amount: float

class GameHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    game_mode: str
    bet_type: str
    bet_value: str
    bet_amount: float
    result_number: int
    result_color: str
    win_amount: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GameRound(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    game_mode: str
    round_number: int
    result_number: int
    result_color: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0, 'password': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def calculate_game_result():
    rand = random.random()
    if rand < 0.2:
        numbers = [0, 5]
    else:
        numbers = [1, 2, 3, 4, 6, 7, 8, 9]
    
    result_number = random.choice(numbers)
    
    if result_number in [1, 3, 7, 9]:
        result_color = 'green'
    elif result_number in [2, 4, 6, 8]:
        result_color = 'red'
    elif result_number == 0:
        result_color = 'red-violet'
    else:
        result_color = 'green-violet'
    
    return result_number, result_color

def calculate_win(bet_type: str, bet_value: str, bet_amount: float, result_number: int, result_color: str) -> float:
    if bet_type == 'number':
        if int(bet_value) == result_number:
            return bet_amount * 9
    elif bet_type == 'color':
        if bet_value == 'green' and 'green' in result_color:
            return bet_amount * 2
        elif bet_value == 'red' and 'red' in result_color:
            return bet_amount * 2
        elif bet_value == 'violet' and 'violet' in result_color:
            return bet_amount * 4.5
    elif bet_type == 'bigsmall':
        is_big = result_number >= 5
        if (bet_value == 'big' and is_big) or (bet_value == 'small' and not is_big):
            return bet_amount * 2
    return 0

# Auth routes
@api_router.post("/auth/register")
async def register(user_data: UserRegister):
    existing = await db.users.find_one({'email': user_data.email}, {'_id': 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        name=user_data.name
    )
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id, user.email, user.role)
    return {'token': token, 'user': user.model_dump()}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['email'], user['role'])
    user.pop('password')
    return {'token': token, 'user': user}

# User routes
@api_router.get("/user/profile")
async def get_profile(user: dict = Depends(get_current_user)):
    return user

@api_router.get("/user/balance")
async def get_balance(user: dict = Depends(get_current_user)):
    return {
        'balance': user.get('balance', 0),
        'wager_requirement': user.get('wager_requirement', 0),
        'total_wagered': user.get('total_wagered', 0)
    }

# Deposit routes
@api_router.post("/deposit/request")
async def request_deposit(deposit_data: DepositRequest, user: dict = Depends(get_current_user)):
    if len(deposit_data.utr) != 12:
        raise HTTPException(status_code=400, detail="UTR must be 12 digits")
    
    deposit = Deposit(
        user_id=user['id'],
        user_email=user['email'],
        user_name=user['name'],
        utr=deposit_data.utr,
        sender_upi=deposit_data.sender_upi,
        amount=deposit_data.amount,
        screenshot_url=deposit_data.screenshot_url
    )
    deposit_dict = deposit.model_dump()
    deposit_dict['created_at'] = deposit_dict['created_at'].isoformat()
    
    await db.deposits.insert_one(deposit_dict)
    return {'message': 'Deposit request submitted', 'deposit': deposit.model_dump()}

@api_router.get("/deposit/history")
async def get_deposit_history(user: dict = Depends(get_current_user)):
    deposits = await db.deposits.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    for dep in deposits:
        if isinstance(dep['created_at'], str):
            dep['created_at'] = datetime.fromisoformat(dep['created_at'])
    return deposits

# Withdrawal routes
@api_router.post("/withdrawal/request")
async def request_withdrawal(withdrawal_data: WithdrawalRequest, user: dict = Depends(get_current_user)):
    if withdrawal_data.amount > user.get('balance', 0):
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    if withdrawal_data.amount < 100:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is ₹100")
    
    wager_req = user.get('wager_requirement', 0)
    total_wagered = user.get('total_wagered', 0)
    
    if total_wagered < wager_req:
        raise HTTPException(status_code=400, detail=f"Must wager ₹{wager_req - total_wagered:.2f} more before withdrawal")
    
    wager_progress = (total_wagered / wager_req * 100) if wager_req > 0 else 100
    
    withdrawal = Withdrawal(
        user_id=user['id'],
        user_email=user['email'],
        user_name=user['name'],
        amount=withdrawal_data.amount,
        method=withdrawal_data.method,
        bank_name=withdrawal_data.bank_name,
        account_holder=withdrawal_data.account_holder,
        account_number=withdrawal_data.account_number,
        ifsc_code=withdrawal_data.ifsc_code,
        upi_id=withdrawal_data.upi_id,
        mobile_number=withdrawal_data.mobile_number,
        wager_progress=wager_progress
    )
    withdrawal_dict = withdrawal.model_dump()
    withdrawal_dict['created_at'] = withdrawal_dict['created_at'].isoformat()
    
    await db.withdrawals.insert_one(withdrawal_dict)
    return {'message': 'Withdrawal request submitted', 'withdrawal': withdrawal.model_dump()}

@api_router.get("/withdrawal/history")
async def get_withdrawal_history(user: dict = Depends(get_current_user)):
    withdrawals = await db.withdrawals.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    for wd in withdrawals:
        if isinstance(wd['created_at'], str):
            wd['created_at'] = datetime.fromisoformat(wd['created_at'])
    return withdrawals

# Game routes
@api_router.post("/game/bet")
async def place_bet(bet_data: BetRequest, user: dict = Depends(get_current_user)):
    if bet_data.bet_amount > user.get('balance', 0):
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    result_number, result_color = calculate_game_result()
    win_amount = calculate_win(bet_data.bet_type, bet_data.bet_value, bet_data.bet_amount, result_number, result_color)
    
    game_history = GameHistory(
        user_id=user['id'],
        game_mode=bet_data.game_mode,
        bet_type=bet_data.bet_type,
        bet_value=bet_data.bet_value,
        bet_amount=bet_data.bet_amount,
        result_number=result_number,
        result_color=result_color,
        win_amount=win_amount
    )
    game_dict = game_history.model_dump()
    game_dict['created_at'] = game_dict['created_at'].isoformat()
    
    await db.game_history.insert_one(game_dict)
    
    new_balance = user.get('balance', 0) - bet_data.bet_amount + win_amount
    new_wagered = user.get('total_wagered', 0) + bet_data.bet_amount
    
    await db.users.update_one(
        {'id': user['id']},
        {'$set': {'balance': new_balance, 'total_wagered': new_wagered}}
    )
    
    return {
        'result_number': result_number,
        'result_color': result_color,
        'win_amount': win_amount,
        'new_balance': new_balance
    }

@api_router.get("/game/history")
async def get_game_history(user: dict = Depends(get_current_user)):
    history = await db.game_history.find({'user_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(100)
    for game in history:
        if isinstance(game['created_at'], str):
            game['created_at'] = datetime.fromisoformat(game['created_at'])
    return history

@api_router.get("/game/recent-results")
async def get_recent_results(game_mode: str):
    results = await db.game_rounds.find({'game_mode': game_mode}, {'_id': 0}).sort('created_at', -1).limit(10).to_list(10)
    for result in results:
        if isinstance(result['created_at'], str):
            result['created_at'] = datetime.fromisoformat(result['created_at'])
    return results

# Admin routes
@api_router.get("/admin/deposits")
async def get_all_deposits(admin: dict = Depends(get_admin_user)):
    deposits = await db.deposits.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    for dep in deposits:
        if isinstance(dep['created_at'], str):
            dep['created_at'] = datetime.fromisoformat(dep['created_at'])
    return deposits

@api_router.put("/admin/deposit/{deposit_id}/approve")
async def approve_deposit(deposit_id: str, admin: dict = Depends(get_admin_user)):
    deposit = await db.deposits.find_one({'id': deposit_id}, {'_id': 0})
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if deposit['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Deposit already processed")
    
    user = await db.users.find_one({'id': deposit['user_id']}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_balance = user.get('balance', 0) + deposit['amount']
    new_credited = user.get('total_credited', 0) + deposit['amount']
    new_wager_req = user.get('wager_requirement', 0) + (deposit['amount'] * 2)
    
    await db.users.update_one(
        {'id': deposit['user_id']},
        {'$set': {
            'balance': new_balance,
            'total_credited': new_credited,
            'wager_requirement': new_wager_req
        }}
    )
    
    await db.deposits.update_one(
        {'id': deposit_id},
        {'$set': {'status': 'approved'}}
    )
    
    return {'message': 'Deposit approved', 'new_balance': new_balance}

@api_router.put("/admin/deposit/{deposit_id}/reject")
async def reject_deposit(deposit_id: str, reason: str = "", admin: dict = Depends(get_admin_user)):
    deposit = await db.deposits.find_one({'id': deposit_id}, {'_id': 0})
    if not deposit:
        raise HTTPException(status_code=404, detail="Deposit not found")
    
    if deposit['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Deposit already processed")
    
    await db.deposits.update_one(
        {'id': deposit_id},
        {'$set': {'status': 'rejected', 'rejection_reason': reason}}
    )
    
    return {'message': 'Deposit rejected'}

@api_router.get("/admin/withdrawals")
async def get_all_withdrawals(admin: dict = Depends(get_admin_user)):
    withdrawals = await db.withdrawals.find({}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    for wd in withdrawals:
        if isinstance(wd['created_at'], str):
            wd['created_at'] = datetime.fromisoformat(wd['created_at'])
    return withdrawals

@api_router.put("/admin/withdrawal/{withdrawal_id}/approve")
async def approve_withdrawal(withdrawal_id: str, admin: dict = Depends(get_admin_user)):
    withdrawal = await db.withdrawals.find_one({'id': withdrawal_id}, {'_id': 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Withdrawal already processed")
    
    user = await db.users.find_one({'id': withdrawal['user_id']}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_balance = user.get('balance', 0) - withdrawal['amount']
    
    await db.users.update_one(
        {'id': withdrawal['user_id']},
        {'$set': {'balance': new_balance}}
    )
    
    await db.withdrawals.update_one(
        {'id': withdrawal_id},
        {'$set': {'status': 'approved'}}
    )
    
    return {'message': 'Withdrawal approved', 'new_balance': new_balance}

@api_router.put("/admin/withdrawal/{withdrawal_id}/reject")
async def reject_withdrawal(withdrawal_id: str, reason: str = "", admin: dict = Depends(get_admin_user)):
    withdrawal = await db.withdrawals.find_one({'id': withdrawal_id}, {'_id': 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Withdrawal not found")
    
    if withdrawal['status'] != 'pending':
        raise HTTPException(status_code=400, detail="Withdrawal already processed")
    
    await db.withdrawals.update_one(
        {'id': withdrawal_id},
        {'$set': {'status': 'rejected', 'rejection_reason': reason}}
    )
    
    return {'message': 'Withdrawal rejected'}

@api_router.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {'_id': 0, 'password': 0}).sort('created_at', -1).to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.get("/admin/search-player")
async def search_player(query: str, admin: dict = Depends(get_admin_user)):
    users = await db.users.find({
        '$or': [
            {'id': {'$regex': query, '$options': 'i'}},
            {'email': {'$regex': query, '$options': 'i'}},
            {'name': {'$regex': query, '$options': 'i'}}
        ]
    }, {'_id': 0, 'password': 0}).to_list(10)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return users

@api_router.post("/admin/player-management")
async def manage_player(data: PlayerManagement, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({'id': data.user_id}, {'_id': 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if data.action == 'add_balance':
        new_balance = user.get('balance', 0) + data.amount
        await db.users.update_one(
            {'id': data.user_id},
            {'$set': {'balance': new_balance}}
        )
        return {'message': f'Added ₹{data.amount} to balance', 'new_balance': new_balance}
    
    elif data.action == 'deduct_balance':
        if data.amount > user.get('balance', 0):
            raise HTTPException(status_code=400, detail="Insufficient balance")
        new_balance = user.get('balance', 0) - data.amount
        await db.users.update_one(
            {'id': data.user_id},
            {'$set': {'balance': new_balance}}
        )
        return {'message': f'Deducted ₹{data.amount} from balance', 'new_balance': new_balance}
    
    elif data.action == 'freeze':
        await db.users.update_one(
            {'id': data.user_id},
            {'$set': {'frozen': True, 'freeze_reason': data.reason}}
        )
        return {'message': 'Account frozen'}
    
    elif data.action == 'unfreeze':
        await db.users.update_one(
            {'id': data.user_id},
            {'$set': {'frozen': False, 'freeze_reason': None}}
        )
        return {'message': 'Account unfrozen'}
    
    raise HTTPException(status_code=400, detail="Invalid action")

@api_router.get("/admin/payment-settings")
async def get_payment_settings(admin: dict = Depends(get_admin_user)):
    settings = await db.payment_settings.find_one({'id': 'payment_settings'}, {'_id': 0})
    if not settings:
        settings = {'id': 'payment_settings', 'qr_code_url': '', 'upi_id': ''}
    return settings

@api_router.put("/admin/payment-settings")
async def update_payment_settings(qr_code_url: str = "", upi_id: str = "", admin: dict = Depends(get_admin_user)):
    await db.payment_settings.update_one(
        {'id': 'payment_settings'},
        {
            '$set': {
                'qr_code_url': qr_code_url,
                'upi_id': upi_id,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    return {'message': 'Payment settings updated'}

@api_router.get("/admin/dashboard-stats")
async def get_dashboard_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_deposits = await db.deposits.count_documents({
        'created_at': {'$gte': today_start.isoformat()},
        'status': 'approved'
    })
    
    today_withdrawals = await db.withdrawals.count_documents({
        'created_at': {'$gte': today_start.isoformat()},
        'status': 'approved'
    })
    
    users = await db.users.find({}, {'balance': 1, '_id': 0}).to_list(10000)
    total_balance = sum(u.get('balance', 0) for u in users)
    
    return {
        'total_users': total_users,
        'today_deposits': today_deposits,
        'today_withdrawals': today_withdrawals,
        'total_active_balance': total_balance
    }

@api_router.get("/")
async def root():
    return {"message": "WingoX API"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()