import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Shield, Users, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('deposits');
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [depositsRes, withdrawalsRes, usersRes] = await Promise.all([
        axios.get(`${API}/admin/deposits`),
        axios.get(`${API}/admin/withdrawals`),
        axios.get(`${API}/admin/users`)
      ]);
      setDeposits(depositsRes.data);
      setWithdrawals(withdrawalsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleDepositAction = async (depositId, action) => {
    try {
      await axios.put(`${API}/admin/deposit/${depositId}/${action}`);
      toast.success(`Deposit ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} deposit`);
    }
  };

  const handleWithdrawalAction = async (withdrawalId, action) => {
    try {
      await axios.put(`${API}/admin/withdrawal/${withdrawalId}/${action}`);
      toast.success(`Withdrawal ${action}d successfully`);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} withdrawal`);
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
            <span>Back</span>
          </button>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Unbounded' }}>
            <Shield className="w-5 h-5 inline mr-2" />
            Admin Panel
          </h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-6">
            <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Total Users</div>
            <div className="text-3xl font-bold mono neon-green">{users.length}</div>
          </div>
          <div className="glass-panel p-6">
            <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Pending Deposits</div>
            <div className="text-3xl font-bold mono" style={{ color: '#FFD600' }}>
              {pendingDeposits.length}
            </div>
          </div>
          <div className="glass-panel p-6">
            <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Pending Withdrawals</div>
            <div className="text-3xl font-bold mono" style={{ color: '#FF0055' }}>
              {pendingWithdrawals.length}
            </div>
          </div>
          <div className="glass-panel p-6">
            <div className="text-sm mb-2" style={{ color: '#A1A1AA' }}>Total Deposits</div>
            <div className="text-3xl font-bold mono" style={{ color: '#00E0FF' }}>
              {deposits.length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            data-testid="deposits-tab"
            onClick={() => setActiveTab('deposits')}
            className="flex-1 py-3 font-bold uppercase tracking-wider transition-all"
            style={{
              background: activeTab === 'deposits' ? '#00FF94' : 'rgba(0, 255, 148, 0.1)',
              color: activeTab === 'deposits' ? '#000' : '#00FF94',
              border: '1px solid rgba(0, 255, 148, 0.3)'
            }}
          >
            <TrendingUp className="w-5 h-5 inline mr-2" />
            Deposits
          </button>
          <button
            data-testid="withdrawals-tab"
            onClick={() => setActiveTab('withdrawals')}
            className="flex-1 py-3 font-bold uppercase tracking-wider transition-all"
            style={{
              background: activeTab === 'withdrawals' ? '#00FF94' : 'rgba(0, 255, 148, 0.1)',
              color: activeTab === 'withdrawals' ? '#000' : '#00FF94',
              border: '1px solid rgba(0, 255, 148, 0.3)'
            }}
          >
            <TrendingDown className="w-5 h-5 inline mr-2" />
            Withdrawals
          </button>
          <button
            data-testid="users-tab"
            onClick={() => setActiveTab('users')}
            className="flex-1 py-3 font-bold uppercase tracking-wider transition-all"
            style={{
              background: activeTab === 'users' ? '#00FF94' : 'rgba(0, 255, 148, 0.1)',
              color: activeTab === 'users' ? '#000' : '#00FF94',
              border: '1px solid rgba(0, 255, 148, 0.3)'
            }}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Users
          </button>
        </div>

        {/* Deposits Table */}
        {activeTab === 'deposits' && (
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Unbounded' }}>
              Deposit Requests
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
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>User</div>
                        <div className="font-bold">{deposit.user_email}</div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>UTR</div>
                        <div className="font-bold mono">{deposit.utr}</div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Amount</div>
                        <div className="font-bold mono text-xl" style={{ color: '#00FF94' }}>
                          ₹{deposit.amount.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Status</div>
                        <div
                          className="px-3 py-1 rounded text-sm font-bold uppercase inline-block"
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
                        {deposit.status === 'pending' && (
                          <>
                            <button
                              data-testid={`approve-deposit-${deposit.id}`}
                              onClick={() => handleDepositAction(deposit.id, 'approve')}
                              className="flex-1 px-4 py-2 rounded font-bold transition-all"
                              style={{ background: '#00FF94', color: '#000' }}
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              Approve
                            </button>
                            <button
                              data-testid={`reject-deposit-${deposit.id}`}
                              onClick={() => handleDepositAction(deposit.id, 'reject')}
                              className="flex-1 px-4 py-2 rounded font-bold transition-all"
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

        {/* Withdrawals Table */}
        {activeTab === 'withdrawals' && (
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Unbounded' }}>
              Withdrawal Requests
            </h3>
            {withdrawals.length === 0 ? (
              <p className="text-center py-10" style={{ color: '#A1A1AA' }}>No withdrawals yet</p>
            ) : (
              <div className="space-y-4">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    data-testid={`admin-withdrawal-${withdrawal.id}`}
                    className="p-4 rounded-lg"
                    style={{ background: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>User</div>
                        <div className="font-bold">{withdrawal.user_email}</div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Amount</div>
                        <div className="font-bold mono text-xl" style={{ color: '#FF0055' }}>
                          ₹{withdrawal.amount.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Wager Progress</div>
                        <div className="font-bold mono">{withdrawal.wager_progress?.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Status</div>
                        <div
                          className="px-3 py-1 rounded text-sm font-bold uppercase inline-block"
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
                      <div className="flex gap-2">
                        {withdrawal.status === 'pending' && (
                          <>
                            <button
                              data-testid={`approve-withdrawal-${withdrawal.id}`}
                              onClick={() => handleWithdrawalAction(withdrawal.id, 'approve')}
                              className="flex-1 px-4 py-2 rounded font-bold transition-all"
                              style={{ background: '#00FF94', color: '#000' }}
                            >
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              Approve
                            </button>
                            <button
                              data-testid={`reject-withdrawal-${withdrawal.id}`}
                              onClick={() => handleWithdrawalAction(withdrawal.id, 'reject')}
                              className="flex-1 px-4 py-2 rounded font-bold transition-all"
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

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="glass-panel p-6">
            <h3 className="text-xl font-bold mb-6" style={{ fontFamily: 'Unbounded' }}>
              All Users
            </h3>
            {users.length === 0 ? (
              <p className="text-center py-10" style={{ color: '#A1A1AA' }}>No users yet</p>
            ) : (
              <div className="space-y-4">
                {users.map((u) => (
                  <div
                    key={u.id}
                    data-testid={`admin-user-${u.id}`}
                    className="p-4 rounded-lg"
                    style={{ background: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Name</div>
                        <div className="font-bold">{u.name}</div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Email</div>
                        <div>{u.email}</div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Balance</div>
                        <div className="font-bold mono" style={{ color: '#00FF94' }}>
                          ₹{u.balance?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Total Credited</div>
                        <div className="font-bold mono" style={{ color: '#00E0FF' }}>
                          ₹{u.total_credited?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm" style={{ color: '#A1A1AA' }}>Total Wagered</div>
                        <div className="font-bold mono" style={{ color: '#FFD600' }}>
                          ₹{u.total_wagered?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;