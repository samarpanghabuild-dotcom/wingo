from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from wingo_engine import WingoEngine
from bson import ObjectId
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import asyncio
import random

# -------------------------------
# ENV + DB
# -------------------------------

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me")
JWT_ALGORITHM = "HS256"

# -------------------------------
# SERIALIZER
# -------------------------------

def serialize_mongo(data):
    if isinstance(data, list):
        return [serialize_mongo(item) for item in data]
    if isinstance(data, dict):
        new_data = {}
        for key, value in data.items():
            if isinstance(value, ObjectId):
                new_data[key] = str(value)
            else:
                new_data[key] = serialize_mongo(value)
        return new_data
    return data

# -------------------------------
# INIT WINGO ENGINE
# -------------------------------

wingo_engine = WingoEngine(db)

# -------------------------------
# MODELS
# -------------------------------

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MinesStartRequest(BaseModel):
    bet_amount: float
    mines: int

class MinesRevealRequest(BaseModel):
    game_id: str
    cell_index: int

class MinesCashoutRequest(BaseModel):
    game_id: str

# -------------------------------
# AUTH HELPERS
# -------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except:
        return False

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": int((datetime.now(timezone.utc) + timedelta(days=7)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password", None)
        return serialize_mongo(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

# -------------------------------
# AUTH ROUTES
# -------------------------------

@api_router.post("/auth/register")
async def register(data: UserRegister):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email exists")

    user_id = str(uuid.uuid4())

    await db.users.insert_one({
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hash_password(data.password.strip()),
        "balance": 0,
        "vip_tier": 1,
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    })

    token = create_token(user_id, data.email, "user")
    return {"token": token}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})

    if not user or not verify_password(data.password.strip(), user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["email"], user["role"])
    user.pop("password", None)

    return {"token": token, "user": serialize_mongo(user)}

# -------------------------------
# ADMIN ROUTES
# -------------------------------

@api_router.get("/admin/dashboard-stats")
async def admin_dashboard(admin=Depends(get_admin_user)):
    total_users = await db.users.count_documents({"role": "user"})
    users = await db.users.find({"role": "user"}).to_list(None)
    total_balance = sum(u.get("balance", 0) for u in users)

    return {
        "total_users": total_users,
        "today_deposits": 0,
        "today_withdrawals": 0,
        "total_active_balance": total_balance,
    }

@api_router.get("/admin/users")
async def admin_users(admin=Depends(get_admin_user)):
    users = await db.users.find({"role": "user"}).to_list(None)
    for u in users:
        u.pop("password", None)
    return serialize_mongo(users)

# -------------------------------
# MINES GAME
# -------------------------------

TOTAL_CELLS = 25

@api_router.post("/mines/start")
async def start_mines(data: MinesStartRequest, user=Depends(get_current_user)):

    if data.bet_amount <= 0 or data.bet_amount > user["balance"]:
        raise HTTPException(status_code=400, detail="Invalid bet amount")

    if data.mines < 1 or data.mines > 24:
        raise HTTPException(status_code=400, detail="Invalid mines count")

    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": -data.bet_amount}})

    mine_positions = random.sample(range(TOTAL_CELLS), data.mines)

    game = {
        "game_id": str(uuid.uuid4()),
        "user_id": user["id"],
        "bet_amount": data.bet_amount,
        "mines": data.mines,
        "mine_positions": mine_positions,
        "revealed": [],
        "multiplier": 1.0,
        "status": "active",
        "created_at": datetime.now(timezone.utc)
    }

    await db.mines_games.insert_one(game)
    game.pop("mine_positions")

    return serialize_mongo(game)

@api_router.post("/mines/reveal")
async def reveal_cell(data: MinesRevealRequest, user=Depends(get_current_user)):

    game = await db.mines_games.find_one({
        "game_id": data.game_id,
        "user_id": user["id"],
        "status": "active"
    })

    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    if data.cell_index in game["mine_positions"]:
        await db.mines_games.update_one({"game_id": data.game_id}, {"$set": {"status": "lost"}})
        return {"result": "mine", "status": "lost"}

    revealed = game["revealed"] + [data.cell_index]
    safe_cells = TOTAL_CELLS - game["mines"]

    multiplier = round((safe_cells / (safe_cells - len(revealed))) * 0.98, 4)

    await db.mines_games.update_one(
        {"game_id": data.game_id},
        {"$set": {"revealed": revealed, "multiplier": multiplier}}
    )

    return {"result": "safe", "multiplier": multiplier}

@api_router.post("/mines/cashout")
async def cashout(data: MinesCashoutRequest, user=Depends(get_current_user)):

    game = await db.mines_games.find_one({
        "game_id": data.game_id,
        "user_id": user["id"],
        "status": "active"
    })

    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    payout = round(game["bet_amount"] * game["multiplier"], 2)

    await db.users.update_one({"id": user["id"]}, {"$inc": {"balance": payout}})
    await db.mines_games.update_one({"game_id": data.game_id}, {"$set": {"status": "cashed_out"}})

    return {"payout": payout}

# -------------------------------
# ENGINE STARTUP
# -------------------------------

@app.on_event("startup")
async def startup():
    for game in ["30s", "60s", "180s", "300s"]:
        existing = await db.wingo_periods.find_one({"game_type": game})
        if not existing:
            await wingo_engine.generate_future_periods(game, 300)

    asyncio.create_task(wingo_engine.run_engine("30s"))
    asyncio.create_task(wingo_engine.run_engine("60s"))
    asyncio.create_task(wingo_engine.run_engine("180s"))
    asyncio.create_task(wingo_engine.run_engine("300s"))

# -------------------------------
# APP CONFIG
# -------------------------------

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)

@app.on_event("shutdown")
async def shutdown():
    client.close()
