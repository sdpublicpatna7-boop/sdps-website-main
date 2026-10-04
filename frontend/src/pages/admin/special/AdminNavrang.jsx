import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, DollarSign, QrCode, Settings, Search, Download, 
  CheckCircle2, XCircle, AlertCircle, Clock, ChevronLeft, 
  ChevronRight, LogIn, Save
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import api from '@/lib/api';

// --- Helper Components & Functions ---
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

const Spinner = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
  </div>
);

const Badge = ({ status }) => {
  const styles = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    cash: 'bg-blue-100 text-blue-800',
    failed: 'bg-red-100 text-red-800',
    entered: 'bg-green-100 text-green-800',
    not_entered: 'bg-slate-100 text-slate-800',
    silver: 'bg-slate-200 text-slate-800',
    gold: 'bg-amber-100 text-amber-800',
    platinum: 'bg-indigo-100 text-indigo-800',
  };
  const style = styles[status?.toLowerCase()] || 'bg-slate-100 text-slate-800';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${style}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

// --- Tab Components ---

const DashboardTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/navrang/admin/stats');
      setStats(data);
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Bookings</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{stats.total_bookings || 0}</h3>
            </div>
            <div className="p-3 bg-brand-navy/10 rounded-xl">
              <Users className="w-6 h-6 text-brand-navy" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Revenue</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">₹{stats.total_revenue || 0}</h3>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Entries Recorded</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{stats.entries_recorded || 0}</h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <LogIn className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-500 font-medium">Pending Payments</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-2">{stats.pending_payments || 0}</h3>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
          <h4 className="font-headline text-lg text-brand-ink mb-4">Packages</h4>
          <div className="space-y-4">
            {(stats.packages || []).map((pkg) => (
              <div key={pkg.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize font-medium text-slate-700">{pkg.name}</span>
                  <span className="text-slate-500">{pkg.count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div 
                    className="bg-brand-navy h-2 rounded-full" 
                    style={{ width: `${Math.min((pkg.count / Math.max(stats.total_bookings, 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <h4 className="font-headline text-lg text-brand-ink mb-4">Recent Bookings</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4 rounded-tl-lg">ID / Name</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 rounded-tr-lg">Date</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_bookings || []).map((booking) => (
                  <tr key={booking.booking_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{booking.booking_id}</div>
                      <div className="text-xs">{booking.parent_name}</div>
                    </td>
                    <td className="py-3 px-4"><Badge status={booking.package} /></td>
                    <td className="py-3 px-4"><Badge status={booking.payment_status} /></td>
                    <td className="py-3 px-4">{new Date(booking.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!stats.recent_bookings || stats.recent_bookings.length === 0) && (
              <p className="text-center text-slate-500 py-4">No recent bookings</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const BookingsTab = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    payment_status: '',
    entry_status: '',
    package: ''
  });
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        ...(filters.payment_status && { payment_status: filters.payment_status }),
        ...(filters.entry_status && { entry_status: filters.entry_status }),
        ...(filters.package && { package: filters.package }),
      });
      const { data } = await api.get(`/navrang/admin/bookings?${params}`);
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
    } catch (error) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [search, filters, page, limit]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const updateBookingStatus = async (id, action) => {
    try {
      await api.post(`/navrang/admin/bookings/${id}/action`, { action });
      toast.success(`Booking updated`);
      fetchBookings();
    } catch (error) {
      toast.error('Failed to update booking');
    }
  };

  const deleteBooking = async (id) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;
    try {
      await api.delete(`/navrang/admin/bookings/${id}`);
      toast.success('Booking deleted');
      fetchBookings();
    } catch (error) {
      toast.error('Failed to delete booking');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/navrang/admin/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'navrang_bookings_2026.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Bookings exported successfully');
    } catch (e) {
      toast.error('Failed to export bookings');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search ID, parent, phone, students..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-navy focus:border-brand-navy outline-none"
            onChange={handleSearchChange}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select 
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-brand-navy outline-none"
            value={filters.payment_status}
            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="cash">Cash</option>
            <option value="failed">Failed</option>
          </select>
          <select 
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-brand-navy outline-none"
            value={filters.entry_status}
            onChange={(e) => handleFilterChange('entry_status', e.target.value)}
          >
            <option value="">All Entries</option>
            <option value="not_entered">Not Entered</option>
            <option value="entered">Entered</option>
          </select>
          <select 
            className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-brand-navy outline-none"
            value={filters.package}
            onChange={(e) => handleFilterChange('package', e.target.value)}
          >
            <option value="">All Packages</option>
            <option value="silver">Silver</option>
            <option value="gold">Gold</option>
            <option value="platinum">Platinum</option>
          </select>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors outline-none"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
              <thead className="bg-slate-50 text-slate-500 uppercase">
                <tr>
                  <th className="py-3 px-4 rounded-tl-lg">ID</th>
                  <th className="py-3 px-4">Parent Details</th>
                  <th className="py-3 px-4">Students</th>
                  <th className="py-3 px-4">Package/Price</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-4 px-4 font-medium text-slate-900">{booking.booking_id}</td>
                    <td className="py-4 px-4">
                      <div>{booking.parent_name}</div>
                      <div className="text-xs text-slate-500">{booking.phone}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {(booking.students || []).map((stu, idx) => (
                          <div key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded inline-block mr-1 mb-1">
                            {stu.name} ({stu.class})
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <Badge status={booking.package} />
                      <div className="text-xs font-medium mt-1">₹{booking.amount}</div>
                    </td>
                    <td className="py-4 px-4 space-y-2 flex flex-col items-start">
                      <Badge status={booking.payment_status} />
                      <Badge status={booking.entry_status} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        {booking.payment_status !== 'paid' && booking.payment_status !== 'cash' && (
                          <>
                            <button 
                              onClick={() => updateBookingStatus(booking.id, 'mark_paid')}
                              className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100"
                            >
                              Paid
                            </button>
                            <button 
                              onClick={() => updateBookingStatus(booking.id, 'mark_cash')}
                              className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100"
                            >
                              Cash
                            </button>
                          </>
                        )}
                        <button 
                          onClick={() => deleteBooking(booking.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bookings.length === 0 && (
              <p className="text-center text-slate-500 py-8">No bookings found.</p>
            )}
          </div>
          
          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
              <div className="text-sm text-slate-500">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 outline-none"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= total}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 outline-none"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const ScannerTab = () => {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  
  const playSound = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.log('Audio disabled');
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    setLoading(true);
    setCurrentResult(null);
    const token = inputValue.trim();
    
    try {
      const { data } = await api.post('/navrang/admin/verify-entry', { 
        qr_token: token,
        booking_id: token
      });
      
      playSound('success');
      setCurrentResult({ success: true, data });
      addLog({ token, success: true, message: 'Entry Verified', data });
      setInputValue('');
    } catch (error) {
      playSound('error');
      const msg = error.response?.data?.detail || 'Verification failed';
      setCurrentResult({ success: false, error: msg });
      addLog({ token, success: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  const addLog = (log) => {
    setLogs(prev => [log, ...prev].slice(0, 20));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-headline text-xl text-brand-ink mb-2">Gate Scanner</h3>
        <p className="text-slate-500 mb-6 text-sm">Scan QR code or manually enter Booking ID</p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Booking ID / Token</label>
            <div className="flex gap-2">
              <input 
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. NAV-123456"
                className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-navy outline-none text-lg uppercase"
              />
              <button 
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="bg-brand-navy text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 outline-none"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </form>

        <AnimatePresence>
          {currentResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-6 p-6 rounded-xl border ${currentResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
            >
              {currentResult.success ? (
                <div>
                  <div className="flex items-center gap-3 text-green-700 mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                    <h4 className="text-xl font-bold">Entry Marked ✓</h4>
                  </div>
                  <div className="space-y-2 text-slate-800">
                    <p><span className="text-slate-500">ID:</span> {currentResult.data.booking.booking_id}</p>
                    <p><span className="text-slate-500">Parent:</span> {currentResult.data.booking.parent_name}</p>
                    <p><span className="text-slate-500 flex items-center gap-2">Package: <Badge status={currentResult.data.booking.package} /></span></p>
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-sm font-medium text-slate-500 mb-1">Students:</p>
                      {(currentResult.data.booking.students || []).map((s, i) => (
                        <div key={i} className="font-medium">{s.name} ({s.class})</div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-red-700">
                  <XCircle className="w-8 h-8 shrink-0" />
                  <div>
                    <h4 className="text-xl font-bold mb-1">Entry Denied</h4>
                    <p>{currentResult.error}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-headline text-lg text-brand-ink mb-4">Recent Scans</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No recent scans</p>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${log.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                {log.success ? <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
                <div>
                  <div className="font-medium text-slate-900">{log.token}</div>
                  <div className={`text-sm ${log.success ? 'text-green-700' : 'text-red-700'}`}>{log.message}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsTab = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/navrang/config');
      if (Array.isArray(data.rules)) {
        data.rules = data.rules.join('\n');
      }
      setConfig(data);
    } catch (error) {
      toast.error('Failed to load configuration');
      setConfig({
        event_name: 'Navrang 2026',
        event_date: '',
        event_time: '',
        venue: '',
        contact_phone: '',
        is_booking_open: false,
        max_tickets: 1000,
        rules: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...config };
      if (typeof payload.rules === 'string') {
        payload.rules = payload.rules.split('\n').filter(r => r.trim());
      }
      await api.put('/navrang/admin/config', payload);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (loading) return <Spinner />;
  if (!config) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-3xl">
      <h3 className="font-headline text-xl text-brand-ink mb-6">Event Configuration</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
            <input 
              type="text" name="event_name" value={config.event_name || ''} onChange={handleChange} required
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max Tickets</label>
            <input 
              type="number" name="max_tickets" value={config.max_tickets || 0} onChange={handleChange} required
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Date</label>
            <input 
              type="date" name="event_date" value={config.event_date || ''} onChange={handleChange} required
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Event Time</label>
            <input 
              type="text" name="event_time" value={config.event_time || ''} onChange={handleChange} placeholder="e.g. 5:00 PM - 10:00 PM" required
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Venue</label>
            <input 
              type="text" name="venue" value={config.venue || ''} onChange={handleChange} required
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
            <input 
              type="text" name="contact_phone" value={config.contact_phone || ''} onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rules (One per line)</label>
          <textarea 
            name="rules" value={config.rules || ''} onChange={handleChange} rows="4"
            className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-navy outline-none"
            placeholder="No outside food allowed&#10;Entry only with valid ID"
          ></textarea>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <input 
            type="checkbox" id="is_booking_open" name="is_booking_open" 
            checked={config.is_booking_open || false} onChange={handleChange}
            className="w-5 h-5 text-brand-navy rounded focus:ring-brand-navy outline-none"
          />
          <label htmlFor="is_booking_open" className="font-medium text-slate-900 cursor-pointer flex-1">
            Booking Open
          </label>
          <span className="text-sm text-slate-500">Allow new bookings on the website</span>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button 
            type="submit" disabled={saving}
            className="flex items-center gap-2 bg-brand-navy text-white px-6 py-2 rounded-xl font-medium hover:bg-slate-800 disabled:opacity-50 outline-none"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};


// --- Main Layout Component ---

export default function AdminNavrang() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Users },
    { id: 'bookings', label: 'All Bookings', icon: Search },
    { id: 'scanner', label: 'Gate Scanner', icon: QrCode },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-transparent">
      <Toaster position="top-right" richColors />
      
      <div className="mb-8">
        <h1 className="text-3xl font-headline font-bold text-slate-100">Navrang 2026</h1>
        <p className="text-slate-400 mt-2">Manage event bookings, entry scanning, and configurations.</p>
      </div>

      {/* Custom Tabs */}
      <div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-200 w-fit mb-6 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all relative outline-none ${
                isActive ? 'text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-brand-navy rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="w-4 h-4" />
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'bookings' && <BookingsTab />}
            {activeTab === 'scanner' && <ScannerTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
