import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TOTAL_CELLS = 25;

export default function Mines() {
  const [betAmount, setBetAmount] = useState(10);
  const [mines, setMines] = useState(3);
  const [game, setGame] = useState(null);
  const [grid, setGrid] = useState(Array(TOTAL_CELLS).fill("hidden"));
  const [multiplier, setMultiplier] = useState(1);

  const token = localStorage.getItem("token");

  const startGame = async () => {
    try {
      const res = await axios.post(
        `${API}/mines/start`,
        { bet_amount: Number(betAmount), mines: Number(mines) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGame(res.data);
      setGrid(Array(TOTAL_CELLS).fill("hidden"));
      setMultiplier(1);
      toast.success("Game Started 🚀");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to start");
    }
  };

  const revealCell = async (index) => {
    if (!game || grid[index] !== "hidden") return;

    try {
      const res = await axios.post(
        `${API}/mines/reveal`,
        { game_id: game.game_id, cell_index: index },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const newGrid = [...grid];

      if (res.data.result === "mine") {
        newGrid[index] = "mine";
        setGrid(newGrid);
        toast.error("💣 You hit a mine!");
        setGame(null);
        return;
      }

      newGrid[index] = "safe";
      setGrid(newGrid);
      setMultiplier(res.data.multiplier);

    } catch {
      toast.error("Reveal failed");
    }
  };

  const cashout = async () => {
    try {
      const res = await axios.post(
        `${API}/mines/cashout`,
        { game_id: game.game_id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`💰 Cashed Out ₹${res.data.payout}`);
      setGame(null);
    } catch {
      toast.error("Cashout failed");
    }
  };

  return (
    <div className="min-h-screen px-6 py-10" style={{ background: "#050505" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <h1 
          className="text-4xl font-bold mb-10 text-center"
          style={{ color: "#00FF94", fontFamily: "Unbounded" }}
        >
          💣 Mines
        </h1>

        {!game && (
          <div className="glass-panel p-8 rounded-2xl mb-8">
            <div className="grid md:grid-cols-3 gap-6">

              <div>
                <label className="block text-sm mb-2 text-gray-400">Bet Amount</label>
                <input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black border border-green-500 text-white"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-400">Mines</label>
                <input
                  type="number"
                  value={mines}
                  onChange={(e) => setMines(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-black border border-green-500 text-white"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={startGame}
                  className="w-full py-3 rounded-lg font-bold text-black transition-all"
                  style={{
                    background: "#00FF94",
                    boxShadow: "0 0 15px #00FF94"
                  }}
                >
                  Start Game
                </button>
              </div>

            </div>
          </div>
        )}

        {game && (
          <>
            {/* Multiplier Panel */}
            <div className="flex justify-between items-center mb-6 glass-panel p-4 rounded-xl">
              <div className="text-lg">
                Multiplier: 
                <span className="ml-2 font-bold text-green-400 text-xl">
                  x{multiplier}
                </span>
              </div>

              <button
                onClick={cashout}
                className="px-6 py-2 rounded-lg font-bold text-black transition-all"
                style={{
                  background: "#FFD600",
                  boxShadow: "0 0 10px #FFD600"
                }}
              >
                Cashout
              </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-5 gap-4">
              {grid.map((cell, index) => (
                <div
                  key={index}
                  onClick={() => revealCell(index)}
                  className="h-20 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 border"
                  style={{
                    background:
                      cell === "hidden"
                        ? "#0A0A0B"
                        : cell === "safe"
                        ? "#00FF94"
                        : "#FF0055",
                    borderColor: "#00FF94",
                    boxShadow:
                      cell === "safe"
                        ? "0 0 15px #00FF94"
                        : cell === "mine"
                        ? "0 0 15px #FF0055"
                        : "0 0 5px rgba(0,255,148,0.3)"
                  }}
                >
                  {cell === "mine" && "💣"}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
