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
      toast.success("Game Started");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to start");
    }
  };

  const revealCell = async (index) => {
    if (!game) return;
    if (grid[index] !== "hidden") return;

    try {
      const res = await axios.post(
        `${API}/mines/reveal`,
        { game_id: game.game_id, cell_index: index },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.result === "mine") {
        const newGrid = [...grid];
        newGrid[index] = "mine";
        setGrid(newGrid);
        toast.error("You hit a mine 💣");
        setGame(null);
        return;
      }

      const newGrid = [...grid];
      newGrid[index] = "safe";
      setGrid(newGrid);
      setMultiplier(res.data.multiplier);

    } catch (err) {
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

      toast.success(`Cashed Out ₹${res.data.payout}`);
      setGame(null);
    } catch {
      toast.error("Cashout failed");
    }
  };

  return (
    <div className="min-h-screen p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Mines</h1>

      {!game && (
        <div className="space-y-4 mb-6">
          <input
            type="number"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            placeholder="Bet Amount"
            className="px-4 py-2 bg-black border"
          />

          <input
            type="number"
            value={mines}
            onChange={(e) => setMines(e.target.value)}
            placeholder="Mines"
            className="px-4 py-2 bg-black border"
          />

          <button
            onClick={startGame}
            className="px-6 py-2 bg-green-500 text-black font-bold"
          >
            Start Game
          </button>
        </div>
      )}

      {game && (
        <>
          <div className="mb-4">
            <div>Multiplier: x{multiplier}</div>
            <button
              onClick={cashout}
              className="mt-2 px-4 py-2 bg-yellow-500 text-black font-bold"
            >
              Cashout
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {grid.map((cell, index) => (
              <div
                key={index}
                onClick={() => revealCell(index)}
                className={`h-16 flex items-center justify-center cursor-pointer border
                  ${
                    cell === "hidden"
                      ? "bg-gray-800"
                      : cell === "safe"
                      ? "bg-green-600"
                      : "bg-red-600"
                  }`}
              >
                {cell === "mine" ? "💣" : ""}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
