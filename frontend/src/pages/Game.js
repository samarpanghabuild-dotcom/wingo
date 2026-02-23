import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Clock } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Game = () => {
  const { mode } = useParams();
  const navigate = useNavigate();
  const { user, refreshBalance } = useAuth();
  
  const [countdown, setCountdown] = useState(null);
  const [currentPeriod, setCurrentPeriod] = useState('');
  const [betAmount, setBetAmount] = useState(10);
  const [selectedBet, setSelectedBet] = useState(null);
  const [betType, setBetType] = useState('color');
  const [multiplier, setMultiplier] = useState(1);
  const [recentResults, setRecentResults] = useState([]);
  const [gameHistory, setGameHistory] = useState([]);
  const [betting, setBetting] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const gameDuration = {
    '30s': 30,
    '1min': 60,
    '3min': 180,
    '5min': 300
  }[mode];

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeInCycle = Math.floor(now / 1000) % gameDuration;
      setCountdown(gameDuration - timeInCycle);
      
      // Generate period number based on timestamp
      const periodBase = Math.floor(now / 1000 / gameDuration);
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const day = String(new Date().getDate()).padStart(2, '0');
      setCurrentPeriod(`${year}${month}${day}${String(periodBase).padStart(7, '0')}`);
    }, 100);

    fetchGameHistory();
    return () => clearInterval(interval);
  }, [gameDuration]);

  const fetchGameHistory = async () => {
    try {
      const response = await axios.get(`${API}/game/history`);
      setGameHistory(response.data.slice(0, 50));
      // Create recent results from history
      const recent = response.data.slice(0, 10).map(g => ({
        number: g.result_number,
        color: g.result_color
      }));
      setRecentResults(recent);
    } catch (error) {
      console.error('Failed to fetch game history:', error);
    }
  };

  const placeBet = async () => {
    if (!selectedBet) {
      toast.error('Please select a bet');
      return;
    }

    const finalAmount = betAmount * multiplier;
    
    if (finalAmount > user.balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (finalAmount < 10) {
      toast.error('Minimum bet is ₹10');
      return;
    }

    setBetting(true);
    try {
      const response = await axios.post(`${API}/game/bet`, {
        game_mode: mode,
        bet_type: betType,
        bet_value: selectedBet,
        bet_amount: finalAmount
      });

      setGameResult(response.data);
      await refreshBalance();
      await fetchGameHistory();

      if (response.data.win_amount > 0) {
        toast.success(`You won ₹${response.data.win_amount.toFixed(2)}!`);
      } else {
        toast.error('Better luck next time!');
      }

      setTimeout(() => setGameResult(null), 5000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Bet failed');
    } finally {
      setBetting(false);
    }
  };

  const getColorForNumber = (num) => {
    if (num === 0) return 'red-violet';
    if (num === 5) return 'green-violet';
    if ([1, 3, 7, 9].includes(num)) return 'green';
    return 'red';
  };

  const getBigSmall = (num) => {
    return num >= 5 ? 'Big' : 'Small';
  };

  const getColorDot = (color) => {
    if (color.includes('green') && color.includes('violet')) {
      return (
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-full" style={{ background: '#00FF94' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#9333EA' }} />
        </div>
      );
    }
    if (color.includes('red') && color.includes('violet')) {
      return (
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-full" style={{ background: '#FF0055' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#9333EA' }} />
        </div>
      );
    }
    if (color.includes('green')) {
      return <div className="w-3 h-3 rounded-full" style={{ background: '#00FF94' }} />;
    }
    if (color.includes('violet')) {
      return <div className="w-3 h-3 rounded-full" style={{ background: '#9333EA' }} />;
    }
    return <div className="w-3 h-3 rounded-full" style={{ background: '#FF0055' }} />;
  };

  return (
    <div className="min-h-screen noise-bg" style={{ background: '#050505' }}>
      {/* Header */}
      <nav className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            data-testid="back-to-home-btn"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:text-[#00FF94] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold" style={{ fontFamily: 'Unbounded' }}>
            <span className="neon-green">WIN</span>GO {mode}
          </h1>
          <div className="flex items-center gap-3">
            <button
              data-testid="wallet-btn"
              onClick={() => navigate('/wallet')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{ background: '#00FF94', color: '#000' }}
            >
              <Wallet className="w-4 h-4" />
              <span className="mono text-sm font-bold">₹{user?.balance?.toFixed(2) || '0.00'}</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-3 py-4 pb-20">
        {/* Wallet Balance Card */}
        <div className="glass-panel p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6" style={{ color: '#FFD600' }} />
            <div>
              <div className="text-xs" style={{ color: '#A1A1AA' }}>Wallet balance</div>
              <div className="text-2xl font-bold mono neon-green">₹{user?.balance?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              data-testid="deposit-btn"
              onClick={() => navigate('/wallet')}
              className="px-4 py-2 rounded-lg font-bold text-sm"
              style={{ background: '#00FF94', color: '#000' }}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Deposit
            </button>
            <button
              data-testid="withdraw-btn"
              onClick={() => navigate('/withdrawal')}
              className="px-4 py-2 rounded-lg font-bold text-sm"
              style={{ background: '#FF0055', color: '#FFF' }}
            >
              <TrendingDown className="w-4 h-4 inline mr-1" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Countdown & Period Info */}
        <div className="glass-panel p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs mb-1" style={{ color: '#A1A1AA' }}>Time remaining</div>
              <div 
                className="text-4xl font-bold mono"
                data-testid="countdown-timer"
                style={{ color: countdown <= 10 ? '#FF0055' : '#00FF94' }}
              >
                {countdown !== null ? `00:${String(countdown).padStart(2, '0')}` : '...'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs mb-1" style={{ color: '#A1A1AA' }}>Period</div>
              <div className="text-sm font-bold mono" style={{ color: '#FFD600' }}>
                {currentPeriod}
              </div>
            </div>
          </div>
        </div>

        {/* Previous Results Preview Strip */}
        {recentResults.length > 0 && (
          <div className="glass-panel p-3 mb-4">
            <div className="text-xs mb-2" style={{ color: '#A1A1AA' }}>Recent Results</div>
            <div className="flex gap-2 overflow-x-auto">
              {recentResults.map((result, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl mono"
                  style={{
                    background: result.color.includes('green') ? '#00FF94' : 
                               result.color.includes('violet') ? '#9333EA' : '#FF0055',
                    color: result.color.includes('violet') ? '#FFF' : '#000',
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}
                >
                  {result.number}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Result Modal */}
        {gameResult && (
          <div 
            data-testid="game-result-modal"
            className="glass-panel p-6 mb-4 text-center border-2"
            style={{ borderColor: gameResult.win_amount > 0 ? '#00FF94' : '#FF0055' }}
          >
            <div className="text-2xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
              {gameResult.win_amount > 0 ? (
                <span className="neon-green">YOU WON!</span>
              ) : (
                <span className="neon-pink">TRY AGAIN!</span>
              )}
            </div>
            <div className="flex items-center justify-center gap-6 mb-4">
              <div>
                <div className="text-xs" style={{ color: '#A1A1AA' }}>Result</div>
                <div 
                  className="text-5xl font-bold mono"
                  style={{ color: gameResult.win_amount > 0 ? '#00FF94' : '#FF0055' }}
                >
                  {gameResult.result_number}
                </div>
                <div className="text-sm mt-1 capitalize">
                  {gameResult.result_color.replace('-', ' + ')}
                </div>
              </div>
            </div>
            {gameResult.win_amount > 0 && (
              <div className="text-2xl mono neon-green">
                Won: ₹{gameResult.win_amount.toFixed(2)}
              </div>
            )}
          </div>
        )}

        {/* Betting Section */}
        <div className="glass-panel p-4 mb-4">
          {/* Multiplier Buttons */}
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {[1, 5, 10, 20, 50, 100].map((mult) => (
              <button
                key={mult}
                data-testid={`multiplier-${mult}`}
                onClick={() => setMultiplier(mult)}
                className="flex-shrink-0 px-4 py-2 rounded font-bold text-sm transition-all"
                style={{
                  background: multiplier === mult ? '#00FF94' : 'rgba(0, 255, 148, 0.1)',
                  color: multiplier === mult ? '#000' : '#00FF94',
                  border: '1px solid rgba(0, 255, 148, 0.3)'
                }}
              >
                x{mult}
              </button>
            ))}
          </div>

          {/* Big/Small Toggle */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              data-testid="bet-big"
              onClick={() => {
                setBetType('bigsmall');
                setSelectedBet('big');
              }}
              className="py-4 rounded-lg font-bold text-lg uppercase transition-all"
              style={{
                background: selectedBet === 'big' && betType === 'bigsmall' ? 
                  'linear-gradient(135deg, #FF8C00 0%, #FF6B00 100%)' : 
                  'rgba(255, 140, 0, 0.1)',
                color: '#FFF',
                border: '2px solid #FF8C00'
              }}
            >
              Big
            </button>
            <button
              data-testid="bet-small"
              onClick={() => {
                setBetType('bigsmall');
                setSelectedBet('small');
              }}
              className="py-4 rounded-lg font-bold text-lg uppercase transition-all"
              style={{
                background: selectedBet === 'small' && betType === 'bigsmall' ? 
                  'linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)' : 
                  'rgba(0, 180, 216, 0.1)',
                color: '#FFF',
                border: '2px solid #00B4D8'
              }}
            >
              Small
            </button>
          </div>

          {/* Color Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['green', 'violet', 'red'].map((color) => (
              <button
                key={color}
                data-testid={`bet-color-${color}`}
                onClick={() => {
                  setBetType('color');
                  setSelectedBet(color);
                }}
                className="py-4 rounded-lg font-bold uppercase tracking-wider transition-all"
                style={{
                  background: selectedBet === color && betType === 'color' ? 
                    (color === 'green' ? '#00FF94' : color === 'violet' ? '#9333EA' : '#FF0055') :
                    (color === 'green' ? 'rgba(0, 255, 148, 0.1)' : color === 'violet' ? 'rgba(147, 51, 234, 0.1)' : 'rgba(255, 0, 85, 0.1)'),
                  color: selectedBet === color && betType === 'color' ? (color === 'violet' ? '#FFF' : '#000') : 
                    (color === 'green' ? '#00FF94' : color === 'violet' ? '#9333EA' : '#FF0055'),
                  border: `2px solid ${color === 'green' ? '#00FF94' : color === 'violet' ? '#9333EA' : '#FF0055'}`
                }}
              >
                <div>{color}</div>
                <div className="text-xs mt-1">{color === 'violet' ? '4.5x' : '2x'}</div>
              </button>
            ))}
          </div>

          {/* Number Grid */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
              const numColor = getColorForNumber(num);
              const bgColor = numColor.includes('green') ? '#00FF94' : numColor.includes('violet') ? '#9333EA' : '#FF0055';
              const isSelected = selectedBet === num.toString() && betType === 'number';
              return (
                <button
                  key={num}
                  data-testid={`bet-number-${num}`}
                  onClick={() => {
                    setBetType('number');
                    setSelectedBet(num.toString());
                  }}
                  className="relative aspect-square rounded-full font-bold text-2xl mono transition-all flex items-center justify-center"
                  style={{
                    background: isSelected ? bgColor : `${bgColor}20`,
                    color: isSelected ? '#000' : '#FFF',
                    border: `3px solid ${bgColor}`,
                    boxShadow: isSelected ? `0 0 15px ${bgColor}` : 'none'
                  }}
                >
                  {num}
                  <div className="absolute -bottom-1 text-[8px]" style={{ color: '#A1A1AA' }}>9x</div>
                </button>
              );
            })}
          </div>

          {/* Bet Amount */}
          <div className="mb-4">
            <label className="block text-xs font-medium mb-2" style={{ color: '#A1A1AA' }}>
              Bet Amount × {multiplier} = ₹{(betAmount * multiplier).toFixed(2)}
            </label>
            <input
              data-testid="bet-amount-input"
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              min={10}
              step={10}
              className="w-full px-4 py-3 rounded-lg outline-none mono text-lg"
              style={{
                background: '#0A0A0B',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#FFFFFF'
              }}
            />
          </div>

          {/* Place Bet Button */}
          <button
            data-testid="place-bet-btn"
            onClick={placeBet}
            disabled={betting || !selectedBet}
            className="w-full py-4 font-bold uppercase tracking-wider transition-all skew-btn"
            style={{
              background: betting || !selectedBet ? '#555' : '#00FF94',
              color: '#000',
              boxShadow: '0 0 20px rgba(0, 255, 148, 0.3)',
              opacity: betting || !selectedBet ? 0.5 : 1,
              cursor: betting || !selectedBet ? 'not-allowed' : 'pointer'
            }}
          >
            <span style={{ display: 'inline-block', transform: 'skewX(10deg)' }}>
              {betting ? 'Placing Bet...' : `Place Bet ₹${(betAmount * multiplier).toFixed(2)}`}
            </span>
          </button>
        </div>
        {/* Game History Section */}
        <div className="glass-panel p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              data-testid="how-to-play-btn"
              className="text-sm px-4 py-2 rounded font-bold"
              style={{ background: '#FFD600', color: '#000' }}
            >
              How to play
            </button>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Unbounded' }}>
              Game History
            </h3>
            <button
              data-testid="toggle-history-btn"
              onClick={() => setShowHistory(!showHistory)}
              className="text-sm px-3 py-1 rounded"
              style={{ background: '#00FF94', color: '#000' }}
            >
              {showHistory ? 'Hide' : 'Show'}
            </button>
          </div>

          {showHistory && gameHistory.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th className="text-left py-2 px-2" style={{ color: '#A1A1AA' }}>Period</th>
                    <th className="text-center py-2 px-2" style={{ color: '#A1A1AA' }}>Number</th>
                    <th className="text-center py-2 px-2" style={{ color: '#A1A1AA' }}>Big/Small</th>
                    <th className="text-center py-2 px-2" style={{ color: '#A1A1AA' }}>Color</th>
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.slice(0, 20).map((game, idx) => (
                    <tr 
                      key={game.id}
                      data-testid={`history-row-${idx}`}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <td className="py-3 px-2 mono text-xs">
                        {new Date(game.created_at).toLocaleString('en-US', { 
                          year: 'numeric', 
                          month: '2-digit', 
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        }).replace(/[/:,\s]/g, '')}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <span 
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold mono"
                          style={{
                            background: game.result_color.includes('green') ? '#00FF94' : 
                                       game.result_color.includes('violet') ? '#9333EA' : '#FF0055',
                            color: game.result_color.includes('violet') ? '#FFF' : '#000'
                          }}
                        >
                          {game.result_number}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-bold">
                        {getBigSmall(game.result_number)}
                      </td>
                      <td className="py-3 px-2 flex justify-center">
                        {getColorDot(game.result_color)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;