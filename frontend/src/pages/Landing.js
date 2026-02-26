import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Clock, Wallet, History, LogOut, Shield, Bomb, User } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const games = [
    { label: '30s', route: '/game/30s', color: '#00FF94', type: 'wingo' },
    { label: '1min', route: '/game/1min', color: '#00E0FF', type: 'wingo' },
    { label: '3min', route: '/game/3min', color: '#FF0055', type: 'wingo' },
    { label: '5min', route: '/game/5min', color: '#FFD600', type: 'wingo' },
    { label: 'MINES', route: '/mines', color: '#FFD600', type: 'mines' }
  ];

  return (
    <div className="min-h-screen noise-bg" style={{ background: '#050505' }}>

      {/* Header */}
      <nav className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Unbounded' }}>
            <span className="neon-green">WINGO</span>X
          </h1>

          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="px-6 py-2 font-bold uppercase skew-btn"
              style={{ background: '#00FF94', color: '#000' }}
            >
              Login
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12 grid lg:grid-cols-3 gap-10">

        {/* ===================== */}
        {/* 🎮 GAMES SECTION */}
        {/* ===================== */}
        <div className="lg:col-span-2">
          <h2 className="text-3xl font-bold mb-8" style={{ fontFamily: 'Unbounded' }}>
            🎮 <span className="neon-green">Games</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {games.map((game) => (
              <button
                key={game.label}
                onClick={() => {
                  if (!user) {
                    navigate('/auth');
                  } else {
                    navigate(game.route);
                  }
                }}
                className="group glass-panel aspect-square flex flex-col items-center justify-center gap-4 p-6 hover:scale-105 transition-all"
                style={{ borderColor: `${game.color}30` }}
              >
                {game.type === 'mines' ? (
                  <Bomb className="w-12 h-12" style={{ color: game.color }} />
                ) : (
                  <Clock className="w-12 h-12" style={{ color: game.color }} />
                )}

                <div className="text-2xl font-bold mono" style={{ color: game.color }}>
                  {game.label}
                </div>

                <div className="text-xs text-gray-400">
                  {game.type === 'mines' ? 'HIGH RISK' : 'WINGO'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ===================== */}
        {/* 👤 PROFILE SECTION */}
        {/* ===================== */}
        {user && (
          <div className="glass-panel p-6 h-fit">
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Unbounded' }}>
              👤 <span className="neon-green">Profile</span>
            </h2>

            <div className="space-y-4">

              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-gray-400" />
                <div className="text-sm text-gray-400">{user.email}</div>
              </div>

              <div className="flex items-center gap-3">
                <Wallet className="w-5 h-5 text-[#00FF94]" />
                <div className="text-lg font-bold mono neon-green">
                  ₹{user.balance?.toFixed(2) || '0.00'}
                </div>
              </div>

              <button
                onClick={() => navigate('/wallet')}
                className="w-full glass-panel py-2 hover:border-[#00FF94]/50 transition"
              >
                Wallet
              </button>

              <button
                onClick={() => navigate('/history')}
                className="w-full glass-panel py-2 hover:border-[#00FF94]/50 transition"
              >
                History
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full py-2 rounded"
                  style={{ background: '#FFD600', color: '#000' }}
                >
                  Admin Panel
                </button>
              )}

              <button
                onClick={logout}
                className="w-full py-2 rounded hover:border-[#FF0055]/50 glass-panel"
              >
                Logout
              </button>

            </div>
          </div>
        )}

      </div>

      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-500">
          &copy; 2024 WingoX. Play responsibly. 18+ only.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
