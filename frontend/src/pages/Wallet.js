import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import { ArrowLeft, Wallet, TrendingUp, Copy, Upload, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WalletPage = () => {
  const navigate = useNavigate();
  const { user, refreshBalance } = useAuth();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [utr, setUtr] = useState('');
  const [senderUpi, setSenderUpi] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState({ qr_code_url: '', upi_id: '' });
  const [loading, setLoading] = useState(false);
  const [screenshotPreview, setScreenshotPreview] = useState('');

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  useEffect(() => {
    fetchTransactions();
    fetchPaymentSettings();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/deposit/history`);
      setDeposits(response.data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const response = await axios.get(`${API}/payment-settings`);
      setPaymentSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch payment settings:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setScreenshot(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStepOne = () => {
    if (!amount || Number(amount) < 100) {
      toast.error('Minimum deposit is ₹100');
      return;
    }
    setStep(2);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleDeposit = async () => {
    if (utr.length !== 12) {
      toast.error('UTR must be exactly 12 digits');
      return;
    }
    if (!senderUpi) {
      toast.error('Please enter your UPI ID');
      return;
    }

    setLoading(true);
    try {
      // In a real app, you'd upload the screenshot to a file storage service
      // For now, we'll just send the base64 data
      await axios.post(`${API}/deposit/request`, {
        utr,
        sender_upi: senderUpi,
        amount: Number(amount),
        screenshot_url: screenshotPreview || null
      });
      
      toast.success('Deposit request submitted! Awaiting admin approval.');
      setStep(1);
      setAmount('');
      setUtr('');
      setSenderUpi('');
      setScreenshot(null);
      setScreenshotPreview('');
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Deposit request failed');
    } finally {
      setLoading(false);
    }
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
            <Wallet className="w-5 h-5 inline mr-2" />
            {step === 1 ? 'Deposit' : step === 2 ? 'Payment' : 'Submit UTR'}
          </h1>
          <button
            onClick={() => navigate('/wallet')}
            className="text-sm" style={{ color: '#00FF94' }}
          >
            Deposit history
          </button>
        </div>
      </nav>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Balance Card */}
        <div className="glass-panel p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#FFD600' }}>
              <Wallet className="w-6 h-6" style={{ color: '#000' }} />
            </div>
            <div>
              <div className="text-xs" style={{ color: '#A1A1AA' }}>Balance</div>
              <div className="text-2xl font-bold mono neon-green">₹{user?.balance?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        </div>

        {/* Step 1: Select Amount */}
        {step === 1 && (
          <div className="glass-panel p-4 mb-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'Unbounded' }}>
              <span style={{ color: '#FFD600' }}>₹</span>
              Deposit Amount
            </h3>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className="py-3 rounded-lg font-bold transition-all"
                  style={{
                    background: amount === amt.toString() ? '#FFD600' : 'rgba(255, 214, 0, 0.1)',
                    color: amount === amt.toString() ? '#000' : '#FFD600',
                    border: '1px solid rgba(255, 214, 0, 0.3)'
                  }}
                >
                  ₹{amt >= 1000 ? `${amt / 1000}K` : amt}
                </button>
              ))}
            </div>

            {/* Manual Amount Input */}
            <div className="relative mb-4">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹100.00 - ₹50,000.00"
                className="w-full px-4 py-3 rounded-lg outline-none mono text-lg"
                style={{
                  background: '#0A0A0B',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#FFFFFF'
                }}
              />
            </div>

            <button
              onClick={handleStepOne}
              disabled={!amount || Number(amount) < 100}
              className="w-full py-4 font-bold uppercase tracking-wider transition-all"
              style={{
                background: !amount || Number(amount) < 100 ? '#555' : '#00FF94',
                color: '#000',
                opacity: !amount || Number(amount) < 100 ? 0.5 : 1,
                cursor: !amount || Number(amount) < 100 ? 'not-allowed' : 'pointer'
              }}
            >
              Deposit
            </button>
          </div>
        )}

        {/* Step 2: Payment Page */}
        {step === 2 && (
          <div>
            <div className="glass-panel p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ fontFamily: 'Unbounded' }}>Deposit Amount</h3>
                <div className="text-2xl font-bold mono neon-green">₹{amount}</div>
              </div>

              {/* QR Code */}
              {paymentSettings.qr_code_url && (
                <div className="bg-white p-4 rounded-lg mb-4">
                  <img 
                    src={paymentSettings.qr_code_url} 
                    alt="Payment QR Code" 
                    className="w-full max-w-[250px] mx-auto"
                  />
                </div>
              )}

              {/* UPI ID */}
              {paymentSettings.upi_id && (
                <div className="p-3 rounded-lg mb-4" style={{ background: '#0A0A0B' }}>
                  <div className="text-xs mb-1" style={{ color: '#A1A1AA' }}>UPI ID</div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold mono">{paymentSettings.upi_id}</span>
                    <button
                      onClick={() => copyToClipboard(paymentSettings.upi_id)}
                      className="p-2 rounded hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-4 h-4" style={{ color: '#00FF94' }} />
                    </button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="p-3 rounded-lg mb-4" style={{ background: '#FFD60020', border: '1px solid #FFD600' }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: '#FFD600' }}>
                  <AlertCircle className="w-4 h-4" />
                  <span>Pay exactly ₹{amount} to avoid delays</span>
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full py-4 font-bold uppercase tracking-wider transition-all"
                style={{ background: '#00FF94', color: '#000' }}
              >
                I Have Paid
              </button>
            </div>

            {/* Recharge Instructions */}
            <div className="glass-panel p-4">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'Unbounded', color: '#FFD600' }}>
                <AlertCircle className="w-4 h-4" />
                Recharge Instructions
              </h3>
              <ul className="space-y-2 text-xs" style={{ color: '#A1A1AA' }}>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#00FF94' }} />
                  <span>If the transfer time is up, please fill out the deposit form again.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#00FF94' }} />
                  <span>The transfer amount must match the order you created, otherwise the money cannot be credited successfully.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#00FF94' }} />
                  <span>If you transfer the wrong amount, our company will not be responsible for the lost amount!</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#00FF94' }} />
                  <span>Note: do not cancel the deposit order after the money has been transferred.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 3: Submit UTR */}
        {step === 3 && (
          <div className="glass-panel p-4 mb-4">
            <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'Unbounded' }}>Submit Transaction Details</h3>
            
            <div className="space-y-4">
              {/* UTR Input */}
              <div>
                <label className="block text-xs mb-2" style={{ color: '#A1A1AA' }}>UTR / Transaction ID *</label>
                <input
                  type="text"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  maxLength={12}
                  placeholder="Enter 12-digit UTR"
                  className="w-full px-4 py-3 rounded-lg outline-none mono"
                  style={{
                    background: '#0A0A0B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: '#A1A1AA' }}>{utr.length}/12 digits</p>
              </div>

              {/* Sender UPI */}
              <div>
                <label className="block text-xs mb-2" style={{ color: '#A1A1AA' }}>Your UPI ID *</label>
                <input
                  type="text"
                  value={senderUpi}
                  onChange={(e) => setSenderUpi(e.target.value)}
                  placeholder="yourname@upi"
                  className="w-full px-4 py-3 rounded-lg outline-none"
                  style={{
                    background: '#0A0A0B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#FFFFFF'
                  }}
                />
              </div>

              {/* Screenshot Upload */}
              <div>
                <label className="block text-xs mb-2" style={{ color: '#A1A1AA' }}>Payment Screenshot (Optional)</label>
                <div 
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#00FF94] transition-colors"
                  style={{ borderColor: 'rgba(255,255,255,0.2)' }}
                  onClick={() => document.getElementById('screenshot-upload').click()}
                >
                  {screenshotPreview ? (
                    <img src={screenshotPreview} alt="Preview" className="max-h-40 mx-auto rounded" />
                  ) : (
                    <div>
                      <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#A1A1AA' }} />
                      <p className="text-sm" style={{ color: '#A1A1AA' }}>Click to upload screenshot</p>
                      <p className="text-xs mt-1" style={{ color: '#A1A1AA' }}>Max 5MB</p>
                    </div>
                  )}
                </div>
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Status */}
              <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: '#FFD60020' }}>
                <Clock className="w-4 h-4" style={{ color: '#FFD600' }} />
                <span className="text-sm" style={{ color: '#FFD600' }}>Status: Pending verification</span>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep(2);
                    setUtr('');
                    setSenderUpi('');
                    setScreenshot(null);
                    setScreenshotPreview('');
                  }}
                  className="flex-1 py-3 font-bold rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.1)', color: '#FFF' }}
                >
                  Back
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={loading || utr.length !== 12 || !senderUpi}
                  className="flex-1 py-3 font-bold rounded-lg"
                  style={{
                    background: loading || utr.length !== 12 || !senderUpi ? '#555' : '#00FF94',
                    color: '#000',
                    opacity: loading || utr.length !== 12 || !senderUpi ? 0.5 : 1
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deposit History */}
        {step === 1 && deposits.length > 0 && (
          <div className="glass-panel p-4">
            <h3 className="text-sm font-bold mb-3" style={{ fontFamily: 'Unbounded' }}>Deposit History</h3>
            <div className="space-y-3">
              {deposits.slice(0, 5).map((deposit) => (
                <div
                  key={deposit.id}
                  className="p-3 rounded-lg"
                  style={{ background: '#0A0A0B', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold mono">₹{deposit.amount.toFixed(2)}</div>
                      <div className="text-xs" style={{ color: '#A1A1AA' }}>UTR: {deposit.utr}</div>
                    </div>
                    <div
                      className="px-3 py-1 rounded text-xs font-bold uppercase"
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
                  {deposit.rejection_reason && (
                    <div className="text-xs p-2 rounded mt-2" style={{ background: '#FF005510', color: '#FF0055' }}>
                      Reason: {deposit.rejection_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;