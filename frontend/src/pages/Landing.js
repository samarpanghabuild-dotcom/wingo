import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Clock, Wallet, History, LogOut, Shield, Bomb } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // ✅ Unified Game List (Wingo + Mines)
  const gameModes = [
    { type: 'wingo', label: '30s', route: '/game/30s', color: '#00FF94' },
    { type: 'wingo', label: '1min', route: '/game/1min', color: '#00E0FF' },
    { type: 'wingo', label: '3min', route: '/game/3min', color: '#FF0055' },
    { type: 'wingo', label: '5min', route: '/game/5min', color: '#FFD600' },
    { type: 'mines', label: 'MINES', route: '/mines', color: '#FFD600' }
  ];

  return (
    <div className="min-h-screen noise-bg" style={{ background: '#050505' }}>
      
      {/* Header */}
      <nav className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Unbounded' }}>
            <span className="neon-green">WINGO</span>X
          </h1>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                {user.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
                    style={{ background: '#FFD600', color: '#000' }}
                  >
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </button>
                )}

                <button
                  onClick={() => navigate('/wallet')}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg glass-panel"
                >
                  <Wallet className="w-4 h-4" />
                  <span className="hidden sm:inline mono">
                    ₹{user.balance?.toFixed(2) || '0.00'}
                  </span>
                </button>

                <button
                  onClick={() => navigate('/history')}
                  className="p-2 rounded-lg glass-panel"
                >
                  <History className="w-5 h-5" />
                </button>

                <button
                  onClick={logout}
                  className="p-2 rounded-lg glass-panel hover:border-[#FF0055]/50"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/auth')}
                className="px-6 py-2 font-bold uppercase tracking-wider skew-btn"
                style={{ background: '#00FF94', color: '#000' }}
              >
                <span style={{ display: 'inline-block', transform: 'skewX(10deg)' }}>
                  Login
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 py-20 text-center">
          <h2 className="text-5xl md:text-7xl font-black mb-6" style={{ fontFamily: 'Unbounded' }}>
            WIN BIG WITH <span className="neon-green">WINGO</span>
          </h2>
          <p className="text-xl md:text-2xl mb-12" style={{ color: '#A1A1AA' }}>
            Fast-paced casino games. Choose your mode and start winning!
          </p>
        </div>
      </div>

      {/* Games Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold mb-8 text-center" style={{ fontFamily: 'Unbounded' }}>
          Choose Your <span className="neon-green">Game</span>
        </h3>

        {/* ✅ Responsive Stable Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">

          {gameModes.map((game) => (
            <button
              key={game.label}
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                } else {
                  navigate(game.route);
                }
              }}
              className="group relative overflow-hidden glass-panel transition-all aspect-square flex flex-col items-center justify-center gap-4 p-6 hover:scale-105"
              style={{ borderColor: `${game.color}20` }}
            >
              {game.type === 'mines' ? (
                <Bomb className="w-12 h-12" style={{ color: game.color }} />
              ) : (
                <Clock className="w-12 h-12" style={{ color: game.color }} />
              )}

              <div className="text-center">
                <div className="text-3xl font-bold mono mb-2" style={{ color: game.color }}>
                  {game.label}
                </div>
                <div className="text-sm text-gray-400">
                  {game.type === 'mines' ? 'HIGH RISK' : 'WINGO'}
                </div>
              </div>

              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `linear-gradient(135deg, ${game.color}15 0%, transparent 100%)`
                }}
              />
            </button>
          ))}

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center" style={{ color: '#A1A1AA' }}>
          <p>&copy; 2024 WingoX. Play responsibly. 18+ only.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
