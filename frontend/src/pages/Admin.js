import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft, Shield, Users, TrendingUp, TrendingDown,
  Search, Plus, Minus, Lock, Unlock, CheckCircle, XCircle,
  Settings, BarChart3, Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Admin = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth(); // 👈 get token
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [loading, setLoading] = useState(true);

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

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
        const res = await axios.get(`${API}/admin/dashboard-stats`, authConfig);
        setDashboardStats(res.data);
      }
      if (activeTab === 'deposits') {
        const res = await axios.get(`${API}/admin/deposits`, authConfig);
        setDeposits(res.data);
      }
      if (activeTab === 'withdrawals') {
        const res = await axios.get(`${API}/admin/withdrawals`, authConfig);
        setWithdrawals(res.data);
      }
      if (activeTab === 'users') {
        const res = await axios.get(`${API}/admin/users`, authConfig);
        setUsers(res.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleDepositAction = async (id, action) => {
    try {
      await axios.put(`${API}/admin/deposit/${id}/${action}`, {}, authConfig);
      toast.success(`Deposit ${action}d`);
      fetchData();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleWithdrawalAction = async (id, action) => {
    try {
      await axios.put(`${API}/admin/withdrawal/${id}/${action}`, {}, authConfig);
      toast.success(`Withdrawal ${action}d`);
      fetchData();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(
        `${API}/admin/search-player?query=${searchQuery}`,
        authConfig
      );
      setSearchResults(res.data);
    } catch {
      toast.error("Search failed");
    }
  };

  return (
    <div className="min-h-screen noise-bg" style={{ background: '#050505' }}>
      <nav className="glass-panel border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/')}>
            <ArrowLeft />
          </button>
          <h1 className="text-xl font-bold">
            <Shield className="inline mr-2" />
            Admin Panel
          </h1>
          <div />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">

        <div className="flex gap-2 mb-6">
          {['dashboard','deposits','withdrawals','users'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div>
            <h2>Total Users: {dashboardStats.total_users || 0}</h2>
            <h2>Today Deposits: {dashboardStats.today_deposits || 0}</h2>
            <h2>Today Withdrawals: {dashboardStats.today_withdrawals || 0}</h2>
            <h2>Total Balance: ₹{dashboardStats.total_active_balance || 0}</h2>
          </div>
        )}

        {activeTab === 'deposits' && (
          <div>
            {deposits.map(d => (
              <div key={d.id}>
                {d.user_name} - ₹{d.amount}
                {d.status === 'pending' && (
                  <>
                    <button onClick={() => handleDepositAction(d.id, 'approve')}>Approve</button>
                    <button onClick={() => handleDepositAction(d.id, 'reject')}>Reject</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div>
            {withdrawals.map(w => (
              <div key={w.id}>
                {w.user_name} - ₹{w.amount}
                {w.status === 'pending' && (
                  <>
                    <button onClick={() => handleWithdrawalAction(w.id, 'approve')}>Approve</button>
                    <button onClick={() => handleWithdrawalAction(w.id, 'reject')}>Reject</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            {users.map(u => (
              <div key={u.id}>
                {u.name} - ₹{u.balance}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default Admin;
