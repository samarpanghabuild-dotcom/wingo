import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, Copy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WalletPage = () => {
  const navigate = useNavigate();
  const { user, refreshBalance } = useAuth();
  const [activeTab, setActiveTab] = useState('deposit');
  const [utr, setUtr] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const [depositsRes, withdrawalsRes] = await Promise.all([
        axios.get(`${API}/deposit/history`),
        axios.get(`${API}/withdrawal/history`)
      ]);
      setDeposits(depositsRes.data);
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (utr.length !== 12) {
      toast.error('UTR must be exactly 12 digits');
      return;
    }
    if (Number(depositAmount) < 100) {
      toast.error('Minimum deposit is ₹100');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/deposit/request`, {
        utr,
        amount: Number(depositAmount)
      });
      toast.success('Deposit request submitted! Admin will approve soon.');
      setUtr('');
      setDepositAmount('');
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Deposit request failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (Number(withdrawAmount) < 100) {
      toast.error('Minimum withdrawal is ₹100');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/withdrawal/request`, {
        amount: Number(withdrawAmount)
      });
      toast.success('Withdrawal request submitted!');
      setWithdrawAmount('');
      fetchTransactions();
      await refreshBalance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Withdrawal request failed');
    } finally {
      setLoading(false);
    }
  };

  const wagerProgress = user?.wager_requirement > 0 
    ? Math.min((user.total_wagered / user.wager_requirement) * 100, 100)
    : 100;

  const remainingWager = Math.max(user?.wager_requirement - user?.total_wagered, 0);

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
            <Wallet className="w-5 h-5 inline mr-2" />
            Wallet
          </h1>
          <div />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Balance Card */}
        <div className="glass-panel p-8 mb-8 text-center">
          <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>AVAILABLE BALANCE</div>
          <div 
            className="text-5xl font-bold mono mb-4 neon-green"
            data-testid="wallet-balance"
          >
            ₹{user?.balance?.toFixed(2) || '0.00'}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <div className="text-sm" style={{ color: '#A1A1AA' }}>Total Credited</div>
              <div className="text-xl mono" style={{ color: '#00E0FF' }}>
                ₹{user?.total_credited?.toFixed(2) || '0.00'}
              </div>
            </div>
            <div>
              <div className="text-sm" style={{ color: '#A1A1AA' }}>Total Wagered</div>
              <div className="text-xl mono" style={{ color: '#FFD600' }}>
                ₹{user?.total_wagered?.toFixed(2) || '0.00'}
              </div>
            </div>
          </div>
        </div>

        {/* Wager Requirement */}
        {user?.wager_requirement > 0 && (
          <div className="glass-panel p-6 mb-8">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
              Withdrawal Wager Requirement
            </h3>
            <Progress value={wagerProgress} className="h-3 mb-2" />
            <div className="flex justify-between text-sm" style={{ color: '#A1A1AA' }}>
              <span>{wagerProgress.toFixed(1)}% Complete</span>
              <span>₹{remainingWager.toFixed(2)} remaining</span>
            </div>
            <p className="text-sm mt-2" style={{ color: '#A1A1AA' }}>
              You must wager 2x your credited amount before withdrawal
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            data-testid="deposit-tab"
            onClick={() => setActiveTab('deposit')}
            className="flex-1 py-3 font-bold uppercase tracking-wider transition-all"
            style={{
              background: activeTab === 'deposit' ? '#00FF94' : 'rgba(0, 255, 148, 0.1)',
              color: activeTab === 'deposit' ? '#000' : '#00FF94',
              border: '1px solid rgba(0, 255, 148, 0.3)'
            }}
          >
            <TrendingUp className="w-5 h-5 inline mr-2" />
            Deposit
          </button>
          <button
            data-testid="withdrawal-tab"
            onClick={() => setActiveTab('withdrawal')}
            className="flex-1 py-3 font-bold uppercase tracking-wider transition-all"
            style={{
              background: activeTab === 'withdrawal' ? '#00FF94' : 'rgba(0, 255, 148, 0.1)',
              color: activeTab === 'withdrawal' ? '#000' : '#00FF94',
              border: '1px solid rgba(0, 255, 148, 0.3)'
            }}
          >
            <TrendingDown className="w-5 h-5 inline mr-2" />
            Withdrawal
          </button>
        </div>

        {/* Deposit Form */}
        {activeTab === 'deposit' && (
          <div className="glass-panel p-6 mb-8">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
              Request Deposit
            </h3>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#A1A1AA' }}>
                  12-Digit UTR Number
                </label>
                <input
                  data-testid="utr-input"
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  maxLength={12}
                  className="w-full px-4 py-3 rounded-lg outline-none mono text-lg"
                  style={{
                    background: '#0A0A0B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF'
                  }}
                  placeholder="Enter 12-digit UTR"
                  required
                />
                <p className="text-xs mt-1" style={{ color: '#A1A1AA' }}>
                  {utr.length}/12 digits
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#A1A1AA' }}>
                  Amount (Min: ₹100)
                </label>
                <input
                  data-testid="deposit-amount-input"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min={100}
                  step={100}
                  className="w-full px-4 py-3 rounded-lg outline-none mono text-lg"
                  style={{
                    background: '#0A0A0B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF'
                  }}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <button
                data-testid="submit-deposit-btn"
                type="submit"
                disabled={loading}
                className="w-full py-4 font-bold uppercase tracking-wider transition-all skew-btn"
                style={{
                  background: loading ? '#555' : '#00FF94',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(0, 255, 148, 0.3)',
                  opacity: loading ? 0.5 : 1
                }}
              >
                <span style={{ display: 'inline-block', transform: 'skewX(10deg)' }}>
                  {loading ? 'Submitting...' : 'Submit Deposit Request'}
                </span>
              </button>
            </form>

            {/* Deposit History */}
            {deposits.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
                  Deposit History
                </h4>
                <div className="space-y-3">
                  {deposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      data-testid={`deposit-item-${deposit.id}`}
                      className="flex items-center justify-between p-4 rounded-lg"
                      style={{ background: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <div>
                        <div className="font-bold mono">₹{deposit.amount.toFixed(2)}</div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>UTR: {deposit.utr}</div>
                      </div>
                      <div
                        className="px-3 py-1 rounded text-sm font-bold uppercase"
                        style={{
                          background: deposit.status === 'approved' ? '#00FF9420' : 
                                     deposit.status === 'rejected' ? '#FF005520' : '#FFD60020',
                          color: deposit.status === 'approved' ? '#00FF94' : 
                                deposit.status === 'rejected' ? '#FF0055' : '#FFD600'
                        }}
                      >
                        {deposit.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Withdrawal Form */}
        {activeTab === 'withdrawal' && (
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
              Request Withdrawal
            </h3>
            
            {remainingWager > 0 && (
              <div 
                className="p-4 rounded-lg mb-4"
                style={{ background: '#FFD60020', border: '1px solid #FFD600' }}
              >
                <p className="text-sm" style={{ color: '#FFD600' }}>
                  You need to wager ₹{remainingWager.toFixed(2)} more before you can withdraw.
                </p>
              </div>
            )}

            <form onSubmit={handleWithdrawal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#A1A1AA' }}>
                  Withdrawal Amount (Min: ₹100)
                </label>
                <input
                  data-testid="withdrawal-amount-input"
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min={100}
                  max={user?.balance || 0}
                  step={100}
                  className="w-full px-4 py-3 rounded-lg outline-none mono text-lg"
                  style={{
                    background: '#0A0A0B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF'
                  }}
                  placeholder="Enter amount"
                  required
                />
              </div>
              <button
                data-testid="submit-withdrawal-btn"
                type="submit"
                disabled={loading || remainingWager > 0}
                className="w-full py-4 font-bold uppercase tracking-wider transition-all skew-btn"
                style={{
                  background: loading || remainingWager > 0 ? '#555' : '#00FF94',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(0, 255, 148, 0.3)',
                  opacity: loading || remainingWager > 0 ? 0.5 : 1,
                  cursor: loading || remainingWager > 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <span style={{ display: 'inline-block', transform: 'skewX(10deg)' }}>
                  {loading ? 'Submitting...' : 'Submit Withdrawal Request'}
                </span>
              </button>
            </form>

            {/* Withdrawal History */}
            {withdrawals.length > 0 && (
              <div className="mt-8">
                <h4 className="text-lg font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>
                  Withdrawal History
                </h4>
                <div className="space-y-3">
                  {withdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal.id}
                      data-testid={`withdrawal-item-${withdrawal.id}`}
                      className="flex items-center justify-between p-4 rounded-lg"
                      style={{ background: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <div>
                        <div className="font-bold mono">₹{withdrawal.amount.toFixed(2)}</div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>
                          Wager: {withdrawal.wager_progress?.toFixed(1)}%
                        </div>
                      </div>
                      <div
                        className="px-3 py-1 rounded text-sm font-bold uppercase"
                        style={{
                          background: withdrawal.status === 'approved' ? '#00FF9420' : 
                                     withdrawal.status === 'rejected' ? '#FF005520' : '#FFD60020',
                          color: withdrawal.status === 'approved' ? '#00FF94' : 
                                withdrawal.status === 'rejected' ? '#FF0055' : '#FFD600'
                        }}
                      >
                        {withdrawal.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;