import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  ArrowLeft, Shield, Users, TrendingUp, TrendingDown, 
  Search, Plus, Minus, Lock, Unlock, CheckCircle, XCircle,
  Upload, Settings, BarChart3, Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Payment settings
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [upiId, setUpiId] = useState('');
  
  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectType, setRejectType] = useState('');
  const [rejectId, setRejectId] = useState('');
  
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerAction, setPlayerAction] = useState('');
  const [playerAmount, setPlayerAmount] = useState('');
  const [playerReason, setPlayerReason] = useState('');
  
  const [showDepositDetail, setShowDepositDetail] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'dashboard') {
        const statsRes = await axios.get(`${API}/admin/dashboard-stats`);
        setDashboardStats(statsRes.data);
      } else if (activeTab === 'deposits') {
        const depositsRes = await axios.get(`${API}/admin/deposits`);
        setDeposits(depositsRes.data);
      } else if (activeTab === 'withdrawals') {
        const withdrawalsRes = await axios.get(`${API}/admin/withdrawals`);
        setWithdrawals(withdrawalsRes.data);
      } else if (activeTab === 'users') {
        const usersRes = await axios.get(`${API}/admin/users`);
        setUsers(usersRes.data);
      } else if (activeTab === 'settings') {
        const settingsRes = await axios.get(`${API}/admin/payment-settings`);
        setQrCodeUrl(settingsRes.data.qr_code_url || '');
        setUpiId(settingsRes.data.upi_id || '');
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const response = await axios.get(`${API}/admin/search-player?query=${searchQuery}`);
      setSearchResults(response.data);
      if (response.data.length === 0) {
        toast.info('No players found');
      }
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const handleDepositAction = async (depositId, action) => {
    if (action === 'reject') {
      setRejectType('deposit');
      setRejectId(depositId);
      setShowRejectModal(true);
      return;
    }

    try {
      await axios.put(`${API}/admin/deposit/${depositId}/${action}`);
      toast.success(`Deposit ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} deposit`);
    }
  };

  const handleReject = async () => {
    try {
      if (rejectType === 'deposit') {
        await axios.put(`${API}/admin/deposit/${rejectId}/reject?reason=${encodeURIComponent(rejectReason)}`);
      } else {
        await axios.put(`${API}/admin/withdrawal/${rejectId}/reject?reason=${encodeURIComponent(rejectReason)}`);
      }
      toast.success(`${rejectType} rejected successfully`);
      setShowRejectModal(false);
      setRejectReason('');
      fetchData();
    } catch (error) {
      toast.error(`Failed to reject ${rejectType}`);
    }
  };

  const handleWithdrawalAction = async (withdrawalId, action) => {
    if (action === 'reject') {
      setRejectType('withdrawal');
      setRejectId(withdrawalId);
      setShowRejectModal(true);
      return;
    }

    try {
      await axios.put(`${API}/admin/withdrawal/${withdrawalId}/${action}`);
      toast.success(`Withdrawal ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} withdrawal`);
    }
  };

  const handlePlayerAction = async () => {
    try {
      await axios.post(`${API}/admin/player-management`, {
        user_id: selectedPlayer.id,
        action: playerAction,
        amount: playerAmount ? Number(playerAmount) : null,
        reason: playerReason || null
      });
      toast.success('Player action completed');
      setShowPlayerModal(false);
      setPlayerAmount('');
      setPlayerReason('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    }
  };

  const handleUpdatePaymentSettings = async () => {
    try {
      await axios.put(`${API}/admin/payment-settings?qr_code_url=${encodeURIComponent(qrCodeUrl)}&upi_id=${encodeURIComponent(upiId)}`);
      toast.success('Payment settings updated!');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  const pendingDeposits = deposits.filter(d => d.status === 'pending');
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');

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
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Unbounded' }}>
            <Shield className="w-5 h-5 inline mr-2" />
            Admin Panel
          </h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
            { id: 'deposits', icon: TrendingUp, label: 'Deposits' },
            { id: 'withdrawals', icon: TrendingDown, label: 'Withdrawals' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'player-search', icon: Search, label: 'Search' },
            { id: 'settings', icon: Settings, label: 'Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              data-testid={`${tab.id}-tab`}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 font-bold uppercase tracking-wider transition-all whitespace-nowrap"
              style={{
                background: activeTab === tab.id ? '#00FF94' : 'rgba(0, 255, 148, 0.1)',
                color: activeTab === tab.id ? '#000' : '#00FF94',
                border: '1px solid rgba(0, 255, 148, 0.3)'
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-panel p-6">
                <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Total Users</div>
                <div className="text-3xl font-bold mono neon-green">{dashboardStats.total_users || 0}</div>
              </div>
              <div className="glass-panel p-6">
                <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Today Deposits</div>
                <div className="text-3xl font-bold mono" style={{ color: '#00E0FF' }}>
                  {dashboardStats.today_deposits || 0}
                </div>
              </div>
              <div className="glass-panel p-6">
                <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Today Withdrawals</div>
                <div className="text-3xl font-bold mono" style={{ color: '#FF0055' }}>
                  {dashboardStats.today_withdrawals || 0}
                </div>
              </div>
              <div className="glass-panel p-6">
                <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Total Balance</div>
                <div className="text-3xl font-bold mono" style={{ color: '#FFD600' }}>
                  ₹{dashboardStats.total_active_balance?.toFixed(0) || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Player Search */}
        {activeTab === 'player-search' && (
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>Search Player</h3>
            
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by ID, Email, or Mobile"
                className="flex-1 px-4 py-3 rounded-lg outline-none"
                style={{
                  background: '#0A0A0B',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF'
                }}
              />
              <button
                onClick={handleSearch}
                className="px-6 py-3 rounded-lg font-bold"
                style={{ background: '#00FF94', color: '#000' }}
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-4">
                {searchResults.map((player) => (
                  <div
                    key={player.id}
                    className="p-4 rounded-lg"
                    style={{ background: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-bold">{player.name}</div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>{player.email}</div>
                        <div className="text-xs mono" style={{ color: '#A1A1AA' }}>ID: {player.id}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Balance</div>
                        <div className="text-2xl font-bold mono neon-green">₹{player.balance?.toFixed(2) || '0.00'}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setPlayerAction('add_balance');
                          setShowPlayerModal(true);
                        }}
                        className="px-4 py-2 rounded font-bold text-sm"
                        style={{ background: '#00FF94', color: '#000' }}
                      >
                        <Plus className="w-4 h-4 inline mr-1" />
                        Add Balance
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setPlayerAction('deduct_balance');
                          setShowPlayerModal(true);
                        }}
                        className="px-4 py-2 rounded font-bold text-sm"
                        style={{ background: '#FF0055', color: '#FFF' }}
                      >
                        <Minus className="w-4 h-4 inline mr-1" />
                        Deduct
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setPlayerAction(player.frozen ? 'unfreeze' : 'freeze');
                          setShowPlayerModal(true);
                        }}
                        className="px-4 py-2 rounded font-bold text-sm"
                        style={{ background: '#FFD600', color: '#000' }}
                      >
                        {player.frozen ? <Unlock className="w-4 h-4 inline mr-1" /> : <Lock className="w-4 h-4 inline mr-1" />}
                        {player.frozen ? 'Unfreeze' : 'Freeze'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPlayer(player);
                          setActiveTab('deposits');
                        }}
                        className="px-4 py-2 rounded font-bold text-sm"
                        style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF' }}
                      >
                        <Eye className="w-4 h-4 inline mr-1" />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Deposits Table */}
        {activeTab === 'deposits' && (
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Unbounded' }}>
              Deposit Requests ({pendingDeposits.length} pending)
            </h3>
            {deposits.length === 0 ? (
              <p className="text-center py-10" style={{ color: '#A1A1AA' }}>No deposits yet</p>
            ) : (
              <div className="space-y-4">
                {deposits.map((deposit) => (
                  <div
                    key={deposit.id}
                    data-testid={`admin-deposit-${deposit.id}`}
                    className="p-4 rounded-lg"
                    style={{ background: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                      <div>
                        <div className="text-xs" style={{ color: '#A1A1AA' }}>Player</div>
                        <div className="font-bold">{deposit.user_name}</div>
                        <div className="text-xs" style={{ color: '#A1A1AA' }}>{deposit.user_email}</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: '#A1A1AA' }}>UTR</div>
                        <div className="font-bold mono">{deposit.utr}</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: '#A1A1AA' }}>Sender UPI</div>
                        <div className="text-sm">{deposit.sender_upi}</div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: '#A1A1AA' }}>Amount</div>
                        <div className="font-bold mono text-xl neon-green">
                          ₹{deposit.amount.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs" style={{ color: '#A1A1AA' }}>Status</div>
                        <div
                          className="px-3 py-1 rounded text-xs font-bold uppercase inline-block"
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
                      <div className="flex gap-2">
                        {deposit.screenshot_url && (
                          <button
                            onClick={() => setShowDepositDetail(deposit)}
                            className="px-3 py-2 rounded text-sm"
                            style={{ background: 'rgba(255,255,255,0.1)' }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {deposit.status === 'pending' && (
                          <>
                            <button
                              data-testid={`approve-deposit-${deposit.id}`}
                              onClick={() => handleDepositAction(deposit.id, 'approve')}
                              className="px-4 py-2 rounded font-bold text-sm"
                              style={{ background: '#00FF94', color: '#000' }}
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              Approve
                            </button>
                            <button
                              data-testid={`reject-deposit-${deposit.id}`}
                              onClick={() => handleDepositAction(deposit.id, 'reject')}
                              className="px-4 py-2 rounded font-bold text-sm"
                              style={{ background: '#FF0055', color: '#FFF' }}
                            >
                              <XCircle className="w-4 h-4 inline mr-1" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}