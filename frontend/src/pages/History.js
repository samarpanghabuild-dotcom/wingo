import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Clock, Trophy } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const History = () => {
  const navigate = useNavigate();
  const [gameHistory, setGameHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API}/game/history`);
      setGameHistory(response.data);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorForResult = (color) => {
    if (color.includes('green')) return '#00FF94';
    if (color.includes('violet')) return '#9333EA';
    return '#FF0055';
  };

  return (
    <div className="min-h-screen noise-bg" style={{ background: '#050505' }}>
      {/* Header */}
      <nav className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            data-testid="back-to-home-btn"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:text-[#00FF94] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Unbounded' }}>
            <Clock className="w-5 h-5 inline mr-2" />
            Game History
          </h1>
          <div />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-20" style={{ color: '#A1A1AA' }}>
            Loading history...
          </div>
        ) : gameHistory.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: '#A1A1AA' }} />
            <p style={{ color: '#A1A1AA' }}>No games played yet. Start playing to see your history!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gameHistory.map((game) => (
              <div
                key={game.id}
                data-testid={`game-history-item-${game.id}`}
                className="glass-panel p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm" style={{ color: '#A1A1AA' }}>Game Mode</div>
                    <div className="font-bold uppercase">{game.game_mode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm" style={{ color: '#A1A1AA' }}>Time</div>
                    <div className="text-sm">
                      {new Date(game.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm" style={{ color: '#A1A1AA' }}>Your Bet</div>
                    <div className="font-bold capitalize">
                      {game.bet_type === 'color' ? game.bet_value : `Number ${game.bet_value}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: '#A1A1AA' }}>Bet Amount</div>
                    <div className="font-bold mono">₹{game.bet_amount.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: '#A1A1AA' }}>Result</div>
                    <div 
                      className="font-bold mono text-2xl"
                      style={{ color: getColorForResult(game.result_color) }}
                    >
                      {game.result_number}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm" style={{ color: '#A1A1AA' }}>Win Amount</div>
                    <div 
                      className="font-bold mono text-xl"
                      style={{ color: game.win_amount > 0 ? '#00FF94' : '#FF0055' }}
                    >
                      {game.win_amount > 0 ? '+' : ''}₹{game.win_amount.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div
                  className="text-center py-2 rounded font-bold uppercase text-sm"
                  style={{
                    background: game.win_amount > 0 ? '#00FF9420' : '#FF005520',
                    color: game.win_amount > 0 ? '#00FF94' : '#FF0055'
                  }}
                >
                  {game.win_amount > 0 ? 'WIN' : 'LOSS'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;