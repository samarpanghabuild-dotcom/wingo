from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from wingo_engine import WingoEngine
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import asyncio

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


class BetRequest(BaseModel):
    game_mode: str   # 30s / 60s / 180s / 300s
    bet_type: str
    bet_value: str
    bet_amount: float


class AdminResetPasswordRequest(BaseModel):
    user_id: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# -------------------------------
# AUTH HELPERS
# -------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
        )
        user = await db.users.find_one({"id": payload["user_id"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        user.pop("password", None)
        return user

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
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email exists")

    user_id = str(uuid.uuid4())

    await db.users.insert_one(
        {
            "id": user_id,
            "email": data.email,
            "name": data.name,
            "password": hash_password(data.password.strip()),
            "balance": 0,
            "vip_tier": 1,
            "role": "user",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    token = create_token(user_id, data.email, "user")
    return {"token": token}


@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})

    if not user or not verify_password(
        data.password.strip(), user["password"]
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"], user["email"], user["role"])
    user.pop("password", None)

    return {"token": token, "user": user}


# -------------------------------
# PASSWORD MANAGEMENT
# -------------------------------

@api_router.post("/admin/reset-password")
async def admin_reset_password(
    data: AdminResetPasswordRequest,
    admin=Depends(get_admin_user),
):
    user = await db.users.find_one({"id": data.user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_hash = hash_password(data.new_password.strip())

    await db.users.update_one(
        {"id": data.user_id},
        {"$set": {"password": new_hash}},
    )

    return {"message": "Password reset successfully"}


@api_router.post("/user/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user=Depends(get_current_user),
):
    db_user = await db.users.find_one({"id": user["id"]})

    if not verify_password(
        data.current_password.strip(), db_user["password"]
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password incorrect",
        )

    new_hash = hash_password(data.new_password.strip())

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password": new_hash}},
    )

    return {"message": "Password updated successfully"}


# -------------------------------
# GAME STATE (PUBLIC)
# -------------------------------

@api_router.get("/game/current")
async def get_current(game_type: str):
    period = await db.wingo_periods.find_one(
        {"game_type": game_type, "revealed": False},
        sort=[("start_time", 1)],
    )
    if not period:
        return {"message": "No active period"}

    period.pop("_id", None)
    return period


@api_router.get("/game/history")
async def get_game_history(game_type: str):
    history = (
        await db.wingo_periods.find(
            {"game_type": game_type, "revealed": True}
        )
        .sort("start_time", -1)
        .limit(20)
        .to_list(20)
    )

    for h in history:
        h.pop("_id", None)

    return history


# -------------------------------
# PLACE BET
# -------------------------------

@api_router.post("/game/bet")
async def place_bet(bet: BetRequest, user=Depends(get_current_user)):

    if bet.bet_amount > user["balance"]:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance",
        )

    current_period = await db.wingo_periods.find_one(
        {"game_type": bet.game_mode, "revealed": False},
        sort=[("start_time", 1)],
    )

    if not current_period:
        raise HTTPException(
            status_code=400,
            detail="No active period",
        )

    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"balance": -bet.bet_amount}},
    )

    await db.bets.insert_one(
        {
            "user_id": user["id"],
            "period_id": current_period["period_id"],
            "game_type": bet.game_mode,
            "bet_type": bet.bet_type,
            "bet_value": bet.bet_value,
            "amount": bet.bet_amount,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        }
    )

    return {
        "message": "Bet placed",
        "period": current_period["period_id"],
    }


# -------------------------------
# ADMIN PREVIEW
# -------------------------------

@api_router.get("/admin/game-results-preview")
async def admin_preview(
    game_type: str,
    admin=Depends(get_admin_user),
):
    return await wingo_engine.preview_next_results(game_type, admin)


# -------------------------------
# ENGINE STARTUP
# -------------------------------

@app.on_event("startup")
async def startup():

    for game in ["30s", "60s", "180s", "300s"]:
        existing = await db.wingo_periods.find_one(
            {"game_type": game}
        )
        if not existing:
            await wingo_engine.generate_future_periods(
                game,
                300,
            )

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
    allow_origins=os.environ.get(
        "CORS_ORIGINS",
        "*",
    ).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown():
    client.close()
