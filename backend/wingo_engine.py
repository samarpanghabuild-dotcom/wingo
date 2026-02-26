import asyncio
import random
from datetime import datetime, timedelta
from fastapi import HTTPException
from bson import ObjectId

GAME_DURATIONS = {
    "30s": 30,
    "60s": 60,
    "180s": 180,
    "300s": 300
}

VIP_MULTIPLIERS = {
    1: 9,
    2: 9.5,
    3: 10,
    4: 10.5
}

REFERRAL_COMMISSION = {
    1: 0.02,
    2: 0.03,
    3: 0.04,
    4: 0.05
}


class WingoEngine:

    def __init__(self, db):
        self.db = db

    # -----------------------------
    # RANDOM RESULT GENERATOR
    # -----------------------------
    def generate_random_result(self):
        number = random.randint(0, 9)

        color = (
            "green" if number in [1, 3, 7, 9]
            else "red" if number in [2, 4, 6, 8]
            else "violet"
        )

        return number, color

    # -----------------------------
    # PRE-GENERATE FUTURE PERIODS
    # -----------------------------
    async def generate_future_periods(self, game_type, count=500):

        duration = GAME_DURATIONS[game_type]
        now = datetime.utcnow()

        for i in range(count):
            start_time = now + timedelta(seconds=i * duration)
            period_id = start_time.strftime("%Y%m%d%H%M%S")

            number, color = self.generate_random_result()

            await self.db.wingo_periods.insert_one({
                "game_type": game_type,
                "period_id": period_id,
                "result_number": number,
                "result_color": color,
                "start_time": start_time,
                "end_time": start_time + timedelta(seconds=duration),
                "revealed": False
            })

    # -----------------------------
    # ADMIN PREVIEW (X and X+1)
    # -----------------------------
    async def preview_next_results(self, game_type, current_user):

        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Admin only")

        cursor = self.db.wingo_periods.find(
            {"game_type": game_type, "revealed": False}
        ).sort("start_time", 1)

        upcoming = []
        async for p in cursor:
            upcoming.append(p)
            if len(upcoming) == 2:
                break

        return {
            "current_period": upcoming[0] if len(upcoming) > 0 else None,
            "next_period": upcoming[1] if len(upcoming) > 1 else None
        }

    # -----------------------------
    # SETTLE BETS
    # -----------------------------
    async def settle_bets(self, period):

        bets_cursor = self.db.bets.find({
            "period_id": period["period_id"],
            "game_type": period["game_type"],
            "status": "pending"
        })

        async for bet in bets_cursor:

            user = await self.db.users.find_one({"_id": ObjectId(bet["user_id"])})
            vip = user.get("vip_tier", 1)

            win = bet["bet_value"] == period["result_number"]

            if win:
                multiplier = VIP_MULTIPLIERS.get(vip, 9)
                payout = bet["amount"] * multiplier

                await self.db.users.update_one(
                    {"_id": user["_id"]},
                    {"$inc": {"balance": payout}}
                )

            # Referral Commission (Level 1)
            if user.get("referrer_id"):
                referrer = await self.db.users.find_one(
                    {"_id": ObjectId(user["referrer_id"])}
                )

                if referrer:
                    ref_vip = referrer.get("vip_tier", 1)
                    commission_rate = REFERRAL_COMMISSION.get(ref_vip, 0.02)

                    commission = bet["amount"] * commission_rate

                    await self.db.users.update_one(
                        {"_id": referrer["_id"]},
                        {"$inc": {"balance": commission}}
                    )

            await self.db.bets.update_one(
                {"_id": bet["_id"]},
                {"$set": {"status": "settled", "win": win}}
            )

    # -----------------------------
    # CONTINUOUS GAME LOOP
    # -----------------------------
    async def run_engine(self, game_type):

        duration = GAME_DURATIONS[game_type]

        while True:

            next_period = await self.db.wingo_periods.find_one(
                {"game_type": game_type, "revealed": False},
                sort=[("start_time", 1)]
            )

            if not next_period:
                await self.generate_future_periods(game_type, 200)
                continue

            sleep_time = (next_period["end_time"] - datetime.utcnow()).total_seconds()

            if sleep_time > 0:
                await asyncio.sleep(sleep_time)

            await self.db.wingo_periods.update_one(
                {"_id": next_period["_id"]},
                {"$set": {"revealed": True}}
            )

            await self.settle_bets(next_period)
