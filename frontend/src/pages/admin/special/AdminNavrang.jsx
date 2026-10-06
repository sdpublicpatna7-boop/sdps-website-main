import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, DollarSign, QrCode, Settings, Search, Download, 
  CheckCircle2, XCircle, AlertCircle, Clock, ChevronLeft, 
  ChevronRight, LogIn, Save, GraduationCap, UploadCloud, 
  Trash2, FileSpreadsheet, Copy, Check, RefreshCw, AlertTriangle,
  Smartphone, Filter, Pencil, Plus, X, Sparkles,
  Camera, CameraOff, SwitchCamera, ScanLine, Volume2, VolumeX, Upload,
  Flashlight, FlashlightOff, Maximize, Minimize, Ticket, ShieldCheck, UserCheck, Play, Pause, PhoneCall,
  CreditCard, Lock, Eye, EyeOff, Banknote, Receipt, Printer, MessageSquare, MessageCircle, PartyPopper
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';

// --- Helper Functions ---
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
    paid: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    cash: 'bg-blue-100 text-blue-800 border-blue-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    entered: 'bg-green-100 text-green-800 border-green-200',
    not_entered: 'bg-slate-100 text-slate-800 border-slate-200',
    silver: 'bg-slate-100 text-slate-800 border-slate-300',
    gold: 'bg-amber-100 text-amber-800 border-amber-300',
    platinum: 'bg-purple-100 text-purple-800 border-purple-300',
  };
  const style = styles[status?.toLowerCase()] || 'bg-slate-100 text-slate-800 border-slate-200';
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize border ${style}`}>
      {status?.replace('_', ' ')}
    </span>
  );
};

const DEFAULT_PACKAGES = [
  { id: 'silver', name: 'Silver Pass', price: 299, children: 1, desc: '1 SDPS Student + 1 Mother + 1 Pair Dandiya' },
  { id: 'gold', name: 'Gold Pass', price: 399, children: 2, desc: '2 SDPS Students + 1 Mother + 1 Pair Dandiya' },
  { id: 'platinum', name: 'Platinum Pass', price: 499, children: 3, desc: '3 SDPS Students + 1 Mother + 1 Pair Dandiya' }
];

// ==========================================
// TAB 1: DASHBOARD
// ==========================================
const DashboardTab = ({ onBookCash }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resendingRecentId, setResendingRecentId] = useState(null);

  const handleResendRecentWa = async (bookingId, phone) => {
    try {
      setResendingRecentId(bookingId);
      const res = await api.post(`/navrang/admin/bookings/${bookingId}/resend-whatsapp`);
      toast.success(res.data?.message || `Pass sent to WhatsApp (${phone})!`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to dispatch WhatsApp pass.');
    } finally {
      setResendingRecentId(null);
    }
  };

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
      {/* Quick Cash Booking Action Bar */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-4 md:p-5 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm border border-purple-900/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shrink-0">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Desk Ticket Booking & Cash Collection</h4>
            <p className="text-xs text-purple-200">Issue official festival passes on spot for cash paid at the counter with instant WhatsApp delivery.</p>
          </div>
        </div>
        {onBookCash && (
          <button
            type="button"
            onClick={onBookCash}
            className="w-full sm:w-auto bg-amber-400 hover:bg-amber-300 text-purple-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Book Ticket (Cash)
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-medium">Confirmed Passes</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{stats.total_bookings || 0}</h3>
              <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">Paid & Valid</p>
            </div>
            <div className="p-2.5 bg-brand-navy/10 rounded-xl">
              <Users className="w-5 h-5 text-brand-navy" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
              <h3 className="text-2xl md:text-3xl font-bold text-green-700 mt-1">₹{stats.total_revenue || 0}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Collected</p>
            </div>
            <div className="p-2.5 bg-green-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-medium">Entries Recorded</p>
              <h3 className="text-2xl md:text-3xl font-bold text-blue-700 mt-1">{stats.entries_recorded || 0}</h3>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">Checked In</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-xl">
              <LogIn className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Payments</p>
              <h3 className="text-2xl md:text-3xl font-bold text-amber-600 mt-1">{stats.pending_payments || 0}</h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Awaiting Sync</p>
            </div>
            <div className="p-2.5 bg-yellow-500/10 rounded-xl">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500 font-medium">Failed / Declined</p>
              <h3 className="text-2xl md:text-3xl font-bold text-red-600 mt-1">{stats.failed_bookings || 0}</h3>
              <p className="text-[11px] text-red-500 font-medium mt-0.5">Not Counted</p>
            </div>
            <div className="p-2.5 bg-red-500/10 rounded-xl">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-1">
          <h4 className="font-headline text-lg font-bold text-brand-ink mb-4">Packages Breakdown</h4>
          <div className="space-y-4">
            {(stats.packages || []).map((pkg) => (
              <div key={pkg.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize font-medium text-slate-700">{pkg.name}</span>
                  <span className="text-slate-500">{pkg.count} passes</span>
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
          <h4 className="font-headline text-lg font-bold text-brand-ink mb-4">Recent Bookings</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="py-3 px-4 rounded-tl-lg">Booking ID / Parent</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 rounded-tr-lg">Date & Action</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_bookings || []).map((booking) => (
                  <tr key={booking.booking_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 font-mono">{booking.booking_id}</div>
                      <div className="text-xs text-slate-500">{booking.parent_name}</div>
                    </td>
                    <td className="py-3 px-4"><Badge status={booking.package} /></td>
                    <td className="py-3 px-4"><Badge status={booking.payment_status} /></td>
                    <td className="py-3 px-4 text-xs">
                      <div className="flex items-center justify-between gap-1">
                        <span>{new Date(booking.created_at).toLocaleDateString()}</span>
                        {booking.parent_phone && (
                          <button
                            disabled={resendingRecentId === booking.booking_id}
                            onClick={() => handleResendRecentWa(booking.booking_id, booking.parent_phone)}
                            className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title={`Resend pass to WhatsApp (${booking.parent_phone})`}
                          >
                            {resendingRecentId === booking.booking_id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                            ) : (
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!stats.recent_bookings || stats.recent_bookings.length === 0) && (
              <p className="text-center text-slate-500 py-6 text-sm">No recent bookings found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TAB 2: ALL BOOKINGS (WITH UPI UTR VERIFY)
// ==========================================
const BookingsTab = ({ onOpenCashBooking }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);
  const [resendingId, setResendingId] = useState(null);

  const resendWhatsApp = async (bookingId, phone) => {
    try {
      setResendingId(bookingId);
      const res = await api.post(`/navrang/admin/bookings/${bookingId}/resend-whatsapp`);
      toast.success(res.data?.message || `Pass dispatched to WhatsApp (${phone || ''})!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to dispatch WhatsApp pass.');
    } finally {
      setResendingId(null);
    }
  };
  
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

  const updateBookingStatus = async (bookingId, action) => {
    try {
      setActionLoadingId(bookingId);
      const res = await api.post(`/navrang/admin/bookings/${bookingId}/action`, { action });
      if (action === 'auto_sync_razorpay') {
        if (res.data?.is_paid) {
          toast.success(`🎉 Booking ${bookingId} verified & activated via Razorpay!`);
        } else {
          toast.info(res.data?.message || `Payment not captured on Razorpay for ${bookingId}.`);
        }
      } else {
        toast.success(`Booking ${bookingId} updated (${action})`);
      }
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteBooking = async (bookingId) => {
    if (!window.confirm(`Are you sure you want to permanently delete booking ${bookingId}?`)) return;
    try {
      await api.delete(`/navrang/admin/bookings/${bookingId}`);
      toast.success(`Booking ${bookingId} deleted`);
      fetchBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete booking');
    }
  };

  const copyUtr = (utr) => {
    if (!utr) return;
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
    toast.success('UTR copied to clipboard');
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search Booking ID, parent, phone, students..." 
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy outline-none"
            onChange={handleSearchChange}
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <select 
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-brand-navy outline-none"
            value={filters.payment_status}
            onChange={(e) => handleFilterChange('payment_status', e.target.value)}
          >
            <option value="">All Payments</option>
            <option value="pending">Pending UTR</option>
            <option value="paid">Paid (Verified)</option>
            <option value="cash">Cash</option>
            <option value="failed">Failed / Rejected</option>
          </select>
          <select 
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-brand-navy outline-none"
            value={filters.entry_status}
            onChange={(e) => handleFilterChange('entry_status', e.target.value)}
          >
            <option value="">All Entries</option>
            <option value="not_entered">Not Entered</option>
            <option value="entered">Checked In</option>
          </select>
          <select 
            className="border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-brand-navy outline-none"
            value={filters.package}
            onChange={(e) => handleFilterChange('package', e.target.value)}
          >
            <option value="">All Packages</option>
            <option value="silver">Silver (₹299)</option>
            <option value="gold">Gold (₹399)</option>
            <option value="platinum">Platinum (₹499)</option>
          </select>
          <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          {onOpenCashBooking && (
            <button 
              type="button"
              onClick={onOpenCashBooking}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Banknote className="w-3.5 h-3.5" /> Book Ticket (Cash)
            </button>
          )}
        </div>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 min-w-[950px]">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="py-3 px-4 rounded-tl-lg">Booking ID</th>
                  <th className="py-3 px-4">Parent Details</th>
                  <th className="py-3 px-4">Verified Students</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">UPI UTR Ref</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const bId = booking.booking_id;
                  const isBusy = actionLoadingId === bId;
                  const utr = booking.payment_ref || booking.utr_number;

                  return (
                    <tr key={bId} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="py-4 px-4 font-mono font-bold text-slate-900 text-xs">
                        {bId}
                        <div className="text-[10px] font-sans font-normal text-slate-400 mt-0.5">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-slate-900 text-xs">{booking.parent_name}</div>
                        <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{booking.parent_phone || booking.phone}</span>
                          {(booking.parent_phone || booking.phone) && (
                            <button
                              type="button"
                              disabled={resendingId === bId}
                              onClick={() => resendWhatsApp(bId, booking.parent_phone || booking.phone)}
                              className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded hover:bg-emerald-50 transition-colors cursor-pointer"
                              title={`Send pass directly to WhatsApp (${booking.parent_phone || booking.phone})`}
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {(booking.students || []).map((stu, idx) => (
                            <div key={idx} className="text-xs bg-slate-100 px-2 py-0.5 rounded font-medium inline-block mr-1">
                              {stu.name || stu.student_name} <span className="text-slate-400 font-mono">({stu.admission_no})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Badge status={booking.package} />
                        <div className="text-xs font-bold text-slate-900 mt-1">₹{booking.price || booking.amount}</div>
                      </td>
                      <td className="py-4 px-4">
                        {utr ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold bg-purple-50 text-purple-900 px-2 py-1 rounded border border-purple-200">
                              {utr}
                            </span>
                            <button
                              onClick={() => copyUtr(utr)}
                              className="text-slate-400 hover:text-slate-700 p-1"
                              title="Copy UTR"
                            >
                              {copiedUtr === utr ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No UTR</span>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Method: {booking.payment_method || 'UPI'}
                        </div>
                      </td>
                      <td className="py-4 px-4 space-y-1">
                        <div><Badge status={booking.payment_status} /></div>
                        <div><Badge status={booking.entry_status} /></div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {/* Resend Pass to WhatsApp */}
                          {(booking.parent_phone || booking.phone) && (
                            <button 
                              disabled={isBusy || resendingId === bId}
                              onClick={() => resendWhatsApp(bId, booking.parent_phone || booking.phone)}
                              className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold px-2 py-1 rounded-lg border border-emerald-300 transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                              title={`Resend digital entry pass to WhatsApp (${booking.parent_phone || booking.phone})`}
                            >
                              {resendingId === bId ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-700" />
                              ) : (
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              )}
                              <span>WhatsApp</span>
                            </button>
                          )}

                          {booking.payment_status === 'pending' && (
                            <>
                              <button 
                                disabled={isBusy}
                                onClick={() => updateBookingStatus(bId, 'auto_sync_razorpay')}
                                className="text-xs bg-purple-700 hover:bg-purple-800 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                                title="Query Razorpay API and auto-verify without manual checking"
                              >
                                <Zap className="w-3 h-3 text-amber-300 fill-amber-300" /> Auto-Sync Razorpay
                              </button>
                              <button 
                                disabled={isBusy}
                                onClick={() => updateBookingStatus(bId, 'verify_paid')}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-2.5 py-1 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                                title="Manually mark as Paid"
                              >
                                ✓ Verify Paid
                              </button>
                              <button 
                                disabled={isBusy}
                                onClick={() => updateBookingStatus(bId, 'mark_cash')}
                                className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-2 py-1 rounded-lg border border-blue-200 transition-colors disabled:opacity-50"
                              >
                                Cash
                              </button>
                              <button 
                                disabled={isBusy}
                                onClick={() => updateBookingStatus(bId, 'reject')}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-medium px-2 py-1 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {booking.payment_status === 'paid' && (
                            <span className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                            </span>
                          )}
                          <button 
                            disabled={isBusy}
                            onClick={() => deleteBooking(bId)}
                            className="text-xs text-slate-400 hover:text-red-600 p-1 transition-colors"
                            title="Delete Booking"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {bookings.length === 0 && (
              <p className="text-center text-slate-500 py-8 text-sm">No bookings match the filter criteria.</p>
            )}
          </div>
          
          {/* Pagination */}
          {total > limit && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} bookings
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 outline-none text-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= total}
                  className="p-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 outline-none text-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ==========================================
// TAB: CASH BOOKING (DESK & ON-SPOT TICKETING)
// ==========================================
const CashBookingTab = ({ onBookingComplete }) => {
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [selectedPkg, setSelectedPkg] = useState('silver');
  const [students, setStudents] = useState([
    { admission_no: '', student_name: '', class_name: '', section: '', roll_no: '', father_name: '', mother_name: '', phone: '', verified: false, error: null }
  ]);
  const [parentDetails, setParentDetails] = useState({ name: '', phone: '', email: '' });
  const [cashDetails, setCashDetails] = useState({
    amount_collected: 299,
    receipt_no: '',
    admit_immediately: false,
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [searchingIdx, setSearchingIdx] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get('/navrang/config');
        if (data.packages) {
          const list = Object.entries(data.packages).map(([key, pkg]) => ({
            id: key,
            name: pkg.name || `${key.toUpperCase()} Pass`,
            price: pkg.price,
            children: pkg.children,
            desc: pkg.desc || `Admits ${pkg.children} Student(s) + 1 Mother + 1 Pair Dandiya`
          }));
          if (list.length > 0) {
            setPackages(list);
            const initialPkg = list.find(p => p.id === selectedPkg) || list[0];
            setCashDetails(prev => ({ ...prev, amount_collected: initialPkg.price }));
          }
        }
      } catch (err) {
        // use default
      }
    };
    fetchConfig();
  }, []);

  const handleSelectPackage = (pkgId) => {
    setSelectedPkg(pkgId);
    const pkg = packages.find(p => p.id === pkgId) || packages[0];
    const childCount = pkg.children || 1;
    
    setCashDetails(prev => ({ ...prev, amount_collected: pkg.price }));

    setStudents(prev => {
      const arr = [];
      for (let i = 0; i < childCount; i++) {
        arr.push(prev[i] || {
          admission_no: '',
          student_name: '',
          class_name: '',
          section: '',
          roll_no: '',
          father_name: '',
          mother_name: '',
          phone: '',
          verified: false,
          error: null
        });
      }
      return arr;
    });
  };

  const handleLookupStudent = async (index) => {
    const st = students[index];
    const query = (st.admission_no || '').trim();
    if (!query) {
      toast.error('Enter an admission number to lookup.');
      return;
    }

    try {
      setSearchingIdx(index);
      const res = await api.get(`/navrang/admin/roster?search=${encodeURIComponent(query)}&limit=5`);
      const list = res.data?.students || [];

      if (list.length > 0) {
        const found = list.find(s => 
          (s.admission_no || '').toLowerCase() === query.toLowerCase()
        ) || list[0];

        const updated = [...students];
        updated[index] = {
          ...updated[index],
          admission_no: found.admission_no || query,
          student_name: found.student_name || found.name || '',
          class_name: found.class_name || found.Class || '',
          section: found.section || found.Section || '',
          roll_no: found.roll_no || found.Roll_no || '',
          father_name: found.father_name || found.Father_Name || '',
          mother_name: found.mother_name || found.Mother_Name || '',
          phone: found.phone || found.contact_no || '',
          verified: true,
          error: null
        };
        setStudents(updated);
        toast.success(`Found ${found.student_name} (${found.admission_no}) in Dandiya roster`);

        setParentDetails(prev => ({
          name: prev.name || found.mother_name || found.father_name || '',
          phone: prev.phone || (found.phone || found.contact_no || '').replace(/\D/g, '').slice(-10),
          email: prev.email || ''
        }));
      } else {
        try {
          const vRes = await api.post('/navrang/verify-student', { admission_no: query });
          const stData = vRes.data?.student;
          if (stData) {
            const updated = [...students];
            updated[index] = {
              ...updated[index],
              admission_no: stData.admission_no || query,
              student_name: stData.student_name || stData.name || '',
              class_name: stData.class_name || '',
              section: stData.section || '',
              roll_no: stData.roll_no || '',
              father_name: stData.father_name || '',
              mother_name: stData.mother_name || '',
              phone: stData.phone || '',
              verified: true,
              error: null
            };
            setStudents(updated);
            toast.success(`Verified: ${stData.student_name}`);
            setParentDetails(prev => ({
              name: prev.name || stData.mother_name || stData.father_name || '',
              phone: prev.phone || (stData.phone || '').replace(/\D/g, '').slice(-10),
              email: prev.email || ''
            }));
            return;
          }
        } catch (vErr) {
          // not found in either
        }

        const updated = [...students];
        updated[index] = {
          ...updated[index],
          verified: false,
          error: 'Not found in school roster. Admin can enter details manually below.'
        };
        setStudents(updated);
        toast.info(`Admission ${query} not found in roster. You can fill details manually.`);
      }
    } catch (err) {
      toast.error('Lookup failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSearchingIdx(null);
    }
  };

  const handleStudentFieldChange = (index, field, value) => {
    const updated = [...students];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    if (field === 'admission_no') {
      updated[index].verified = false;
    }
    setStudents(updated);
  };

  const handleSubmitCashBooking = async (e) => {
    e.preventDefault();

    if (!parentDetails.name?.trim()) {
      toast.error('Parent / Guardian name is required.');
      return;
    }

    const cleanPhone = (parentDetails.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number for WhatsApp pass delivery.');
      return;
    }

    const currentPkg = packages.find(p => p.id === selectedPkg) || packages[0];
    const requiredChildren = currentPkg.children || 1;

    for (let i = 0; i < requiredChildren; i++) {
      const st = students[i];
      if (!st.student_name?.trim() && !st.admission_no?.trim()) {
        toast.error(`Please provide student details for Slot ${i + 1}.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        package: selectedPkg,
        students: students.slice(0, requiredChildren).map((s, idx) => ({
          admission_no: (s.admission_no || `CASH-SPOT-${idx + 1}`).trim(),
          student_name: (s.student_name || `Student ${idx + 1}`).trim(),
          class_name: (s.class_name || '').trim(),
          section: (s.section || '').trim(),
          roll_no: (s.roll_no || '').trim(),
          father_name: (s.father_name || '').trim(),
          mother_name: (s.mother_name || '').trim()
        })),
        parent_name: parentDetails.name.trim(),
        parent_phone: cleanPhone,
        parent_email: (parentDetails.email || '').trim(),
        amount_collected: Number(cashDetails.amount_collected) || currentPkg.price,
        receipt_no: (cashDetails.receipt_no || '').trim(),
        admit_immediately: Boolean(cashDetails.admit_immediately),
        notes: (cashDetails.notes || '').trim()
      };

      const res = await api.post('/navrang/admin/book-cash', payload);
      toast.success(res.data.message || 'Cash booking confirmed & pass generated!');
      setBookingSuccess(res.data.booking);
      if (onBookingComplete) onBookingComplete();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit cash booking.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setBookingSuccess(null);
    const pkg = packages.find(p => p.id === selectedPkg) || packages[0];
    setCashDetails({
      amount_collected: pkg.price,
      receipt_no: '',
      admit_immediately: false,
      notes: ''
    });
    setParentDetails({ name: '', phone: '', email: '' });
    setStudents(Array.from({ length: pkg.children || 1 }, () => ({
      admission_no: '',
      student_name: '',
      class_name: '',
      section: '',
      roll_no: '',
      father_name: '',
      mother_name: '',
      phone: '',
      verified: false,
      error: null
    })));
  };

  if (bookingSuccess) {
    const pkgObj = packages.find(p => p.id === bookingSuccess.package) || { name: `${bookingSuccess.package} Pass` };
    return (
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-3xl mx-auto space-y-6">
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 mb-2">
            ✓ Cash Paid & Official Entry Pass Issued
          </span>
          <h2 className="text-2xl md:text-3xl font-headline font-black text-slate-900">
            Booking Confirmed: {bookingSuccess.booking_id}
          </h2>
          <p className="text-slate-500 text-xs md:text-sm mt-1">
            Cash payment of <strong>₹{bookingSuccess.price}</strong> collected at desk. Official QR pass has been generated.
          </p>
        </div>

        {/* Printable Ticket */}
        <div id="admin-printable-ticket" className="bg-slate-50 border-2 border-purple-200 rounded-3xl overflow-hidden shadow-md max-w-md mx-auto">
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-5 text-center relative">
            <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">
              S.D. Public School, Patna
            </div>
            <div className="text-xl font-headline font-black tracking-wide text-white">
              NAVRANG 2026 PASS
            </div>
            <div className="text-2xl font-mono font-black text-amber-300 mt-1 tracking-wider">
              {bookingSuccess.booking_id}
            </div>
            <div className="text-xs text-purple-200 mt-1 capitalize font-medium">
              {pkgObj.name} • ₹{bookingSuccess.price} (Cash Paid)
            </div>
          </div>

          <div className="p-6 bg-white flex flex-col items-center justify-center border-b border-purple-100 text-center">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 inline-block mb-2">
              <QRCodeSVG 
                value={bookingSuccess.qr_token || bookingSuccess.booking_id}
                size={170}
                level="H"
                includeMargin={true}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-700">Scan at Entrance Gate</span>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                PAID - CASH AT DESK ✓
              </span>
              {bookingSuccess.entry_status === 'entered' && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-300">
                  CHECKED IN AT GATE ✓
                </span>
              )}
            </div>
          </div>

          <div className="p-5 bg-white space-y-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Admitted Student(s)
              </span>
              <div className="space-y-1">
                {bookingSuccess.students?.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">{s.name || s.student_name}</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      Adm: {s.admission_no} {s.class_name ? `• ${s.class_name}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-700">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Mother / Guardian</span>
                <span className="font-semibold text-slate-900 truncate block">{bookingSuccess.parent_name}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">WhatsApp Contact</span>
                <span className="font-mono font-bold text-slate-900 block">{bookingSuccess.parent_phone}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-700">
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Receipt Ref</span>
                <span className="font-mono text-purple-800 font-bold block">{bookingSuccess.payment_ref}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-slate-400 font-semibold block">Issued By Admin</span>
                <span className="font-mono text-slate-700 block">{bookingSuccess.booked_by_admin || 'Admin'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto p-3.5 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-green-600 shrink-0" />
            <span>Digital pass link dispatched via WhatsApp to <strong>+91 {bookingSuccess.parent_phone}</strong></span>
          </div>
        </div>

        <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-md transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Pass / Receipt
          </button>
          <button
            type="button"
            onClick={handleResetForm}
            className="flex-1 bg-purple-700 hover:bg-purple-800 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-md transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Book Next Ticket
          </button>
        </div>
      </div>
    );
  }

  const selectedPkgObj = packages.find(p => p.id === selectedPkg) || packages[0];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-4 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 mb-1.5">
            <Banknote className="w-3.5 h-3.5 text-amber-700" /> Desk Ticket Booking • Cash Collection
          </div>
          <h3 className="font-headline text-xl font-bold text-slate-900">
            Issue Navrang 2026 Pass (Cash)
          </h3>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">
            Book passes for parents paying in cash at the school desk or spot entry at the gate. Instant QR pass activation and WhatsApp delivery.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmitCashBooking} className="space-y-6">
        {/* Step 1: Select Package */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            1. Select Pass Package
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {packages.map((pkg) => {
              const isSelected = selectedPkg === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => handleSelectPackage(pkg.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'border-purple-600 bg-purple-50/70 shadow-sm ring-1 ring-purple-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-sm text-slate-900">{pkg.name}</span>
                    <span className="text-lg font-black text-purple-700">₹{pkg.price}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">{pkg.desc}</p>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-purple-900 pt-2 border-t border-purple-100">
                    <span>{pkg.children} Student Slot{pkg.children > 1 ? 's' : ''}</span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Student Details & Dandiya Roster Lookup */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Student Details ({selectedPkgObj.children} Child{selectedPkgObj.children > 1 ? 'ren' : ''})
            </label>
            <span className="text-[11px] text-slate-400">
              Type Admission No & click Lookup to fetch from Dandiya roster
            </span>
          </div>

          <div className="space-y-4">
            {students.map((st, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-purple-700" />
                    Student Slot {idx + 1} of {selectedPkgObj.children}
                  </span>
                  {st.verified ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified in Roster
                    </span>
                  ) : (
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      Manual / Walk-in
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Admission Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={st.admission_no || ''}
                        onChange={(e) => handleStudentFieldChange(idx, 'admission_no', e.target.value)}
                        placeholder="e.g. SDPS15 or 15"
                        className="flex-1 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-600 outline-none bg-white uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => handleLookupStudent(idx)}
                        disabled={searchingIdx === idx || !st.admission_no?.trim()}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
                      >
                        {searchingIdx === idx ? (
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        Lookup
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Class & Section
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={st.class_name || ''}
                        onChange={(e) => handleStudentFieldChange(idx, 'class_name', e.target.value)}
                        placeholder="Class"
                        className="w-1/2 border border-slate-300 rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-purple-600 outline-none bg-white font-medium"
                      />
                      <input
                        type="text"
                        value={st.section || ''}
                        onChange={(e) => handleStudentFieldChange(idx, 'section', e.target.value)}
                        placeholder="Sec"
                        className="w-1/2 border border-slate-300 rounded-xl px-2.5 py-2 text-xs focus:ring-2 focus:ring-purple-600 outline-none bg-white font-medium uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Student Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={st.student_name || ''}
                      onChange={(e) => handleStudentFieldChange(idx, 'student_name', e.target.value)}
                      placeholder="e.g. Anurag Mehta"
                      required
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-600 outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Father / Mother Name
                    </label>
                    <input
                      type="text"
                      value={st.mother_name || st.father_name || ''}
                      onChange={(e) => {
                        handleStudentFieldChange(idx, 'mother_name', e.target.value);
                        handleStudentFieldChange(idx, 'father_name', e.target.value);
                      }}
                      placeholder="e.g. Poonam Kumari"
                      className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 outline-none bg-white font-medium"
                    />
                  </div>
                </div>

                {st.error && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                    ℹ️ {st.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 3: Parent & WhatsApp Details */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
            <MessageSquare className="w-4 h-4 text-green-600" />
            3. Parent Contact & WhatsApp Delivery
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Parent / Mother Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={parentDetails.name}
                onChange={(e) => setParentDetails({ ...parentDetails, name: e.target.value })}
                placeholder="Parent's Name"
                required
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-purple-600 outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                WhatsApp Phone (10 Digits) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 border border-slate-300 rounded-xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-purple-600">
                <span className="text-xs font-bold text-slate-400">+91</span>
                <input
                  type="tel"
                  maxLength="10"
                  value={parentDetails.phone}
                  onChange={(e) => setParentDetails({ ...parentDetails, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="9876543210"
                  required
                  className="w-full text-xs font-mono font-bold outline-none bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Email Address (Optional)
              </label>
              <input
                type="email"
                value={parentDetails.email}
                onChange={(e) => setParentDetails({ ...parentDetails, email: e.target.value })}
                placeholder="parent@example.com"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 outline-none bg-white"
              />
            </div>
          </div>
        </div>

        {/* Step 4: Cash Collection & Receipt Settings */}
        <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-900">
            <Receipt className="w-4 h-4 text-amber-700" />
            4. Cash Collection & Receipt Settings
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Cash Amount Collected (₹) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5 border border-slate-300 rounded-xl px-3 py-2 bg-white focus-within:ring-2 focus-within:ring-purple-600">
                <span className="text-xs font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  value={cashDetails.amount_collected}
                  onChange={(e) => setCashDetails({ ...cashDetails, amount_collected: e.target.value })}
                  placeholder="299"
                  required
                  className="w-full text-xs font-bold text-slate-900 outline-none bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Manual Cash Receipt / Bill No.
              </label>
              <input
                type="text"
                value={cashDetails.receipt_no}
                onChange={(e) => setCashDetails({ ...cashDetails, receipt_no: e.target.value })}
                placeholder="e.g. CR-402 (Optional)"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-purple-600 outline-none bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Admin Remark / Desk Notes
              </label>
              <input
                type="text"
                value={cashDetails.notes}
                onChange={(e) => setCashDetails({ ...cashDetails, notes: e.target.value })}
                placeholder="e.g. Spot booking Counter 1"
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 outline-none bg-white"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-amber-200 cursor-pointer">
            <input
              type="checkbox"
              checked={cashDetails.admit_immediately}
              onChange={(e) => setCashDetails({ ...cashDetails, admit_immediately: e.target.checked })}
              className="mt-0.5 w-4 h-4 text-purple-700 rounded focus:ring-purple-600"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 block">
                Admit Student & Mother Immediately at Gate (Fast-Track)
              </span>
              <span className="text-slate-500">
                Check this box if the student/parent is already at the entrance gate right now so they do not need to be scanned again.
              </span>
            </div>
          </label>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-800 hover:from-purple-900 hover:to-indigo-950 text-white py-4 px-6 rounded-2xl font-bold text-sm md:text-base shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Recording Cash Payment & Generating Pass...</span>
              </>
            ) : (
              <>
                <Banknote className="w-5 h-5 text-amber-300" />
                <span>Confirm Cash Booking & Issue Ticket (₹{cashDetails.amount_collected || selectedPkgObj.price})</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// TAB 3: STUDENT ROSTER (EXCEL/CSV UPLOAD & AUTH)
// ==========================================
const RosterTab = () => {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classNameFilter, setClassNameFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 50;

  // File Upload State
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState('');
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Edit & Add Student State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isNewStudent, setIsNewStudent] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({
    admission_no: '',
    original_admission_no: '',
    student_name: '',
    class_name: '',
    section: '',
    roll_no: '',
    father_name: '',
    mother_name: '',
    phone: ''
  });

  const handleOpenEdit = (st) => {
    setStudentForm({
      admission_no: st.admission_no || '',
      original_admission_no: st.admission_no || '',
      student_name: st.student_name || '',
      class_name: st.class_name || '',
      section: st.section || '',
      roll_no: st.roll_no || '',
      father_name: st.father_name || '',
      mother_name: st.mother_name || '',
      phone: st.phone || st.contact_no || ''
    });
    setIsNewStudent(false);
    setEditModalOpen(true);
  };

  const handleOpenAdd = () => {
    setStudentForm({
      admission_no: '',
      original_admission_no: '',
      student_name: '',
      class_name: '',
      section: '',
      roll_no: '',
      father_name: '',
      mother_name: '',
      phone: ''
    });
    setIsNewStudent(true);
    setEditModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    if (e) e.preventDefault();
    if (!studentForm.admission_no?.trim() || !studentForm.student_name?.trim()) {
      toast.error('Admission number and student name are required.');
      return;
    }
    try {
      setSavingStudent(true);
      if (isNewStudent) {
        await api.post('/navrang/admin/roster/student', studentForm);
        toast.success(`Student ${studentForm.admission_no} added to Dandiya roster.`);
      } else {
        await api.put(`/navrang/admin/roster/${studentForm.original_admission_no}`, studentForm);
        toast.success(`Student ${studentForm.admission_no} updated successfully.`);
      }
      setEditModalOpen(false);
      fetchRoster();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save student record.');
    } finally {
      setSavingStudent(false);
    }
  };

  const fetchRoster = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        ...(search && { search }),
        ...(classNameFilter && { class_name: classNameFilter })
      });
      const { data } = await api.get(`/navrang/admin/roster?${params}`);
      setStudents(data.students || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error('Failed to load student roster');
    } finally {
      setLoading(false);
    }
  }, [search, classNameFilter, page, limit]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearch(value);
      setPage(1);
    }, 300),
    []
  );

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const parsed = XLSX.utils.sheet_to_json(ws);
        
        if (!parsed || parsed.length === 0) {
          toast.error('The selected file appears to be empty.');
          setFileData(null);
          return;
        }

        setFileData(parsed);
        toast.success(`Loaded ${parsed.length} student rows from ${file.name}`);
      } catch (err) {
        toast.error('Could not parse Excel/CSV file: ' + err.message);
        setFileData(null);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleUploadSubmit = async () => {
    if (!fileData || fileData.length === 0) return;

    try {
      setIsUploading(true);
      const res = await api.post('/navrang/admin/roster/upload', {
        students: fileData,
        replace: replaceExisting
      });

      toast.success(res.data.message || 'Roster uploaded successfully!');
      setFileData(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchRoster();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload roster data.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/navrang/admin/roster/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sdps_student_roster_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Downloaded sample CSV template');
    } catch (err) {
      // Fallback client-side template download
      const csv = "Class,Section,Roll_no,Name,Father_Name,Mother_Name,Contact_No,Admn_No\nCLASS-I,A,08,Aksh Chaudhary,Santosh Chaudhary,Rupa Chaudahray,9334120156,SDPS2\nCLASS-I,A,5,Aarna Kashyap,Vicky Kumar,Rinku Kumari,8804145581,SDPS8\nCLASS-I,A,31,Sanshkrita,Kameshwer Shah,Sushma Devi,8709912503,SDPS13\nCLASS-I,A,14,Anurag Mehta,Amit Kumar,Poonam Kumari,9576224419,SDPS15\n";
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sdps_student_roster_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  const handleDeleteStudent = async (admNo) => {
    if (!window.confirm(`Remove student ${admNo} from the eligibility roster?`)) return;
    try {
      await api.delete(`/navrang/admin/roster/${admNo}`);
      toast.success(`Student ${admNo} removed`);
      fetchRoster();
    } catch (err) {
      toast.error('Failed to remove student');
    }
  };

  const handleClearRoster = async () => {
    const confirmation = window.prompt("Type 'CLEAR' to permanently delete ALL student roster data:");
    if (confirmation !== 'CLEAR') return;

    try {
      await api.delete('/navrang/admin/roster/clear');
      toast.success('Student roster cleared successfully');
      fetchRoster();
    } catch (err) {
      toast.error('Failed to clear roster');
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload & Instructions Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Dedicated Dandiya Roster (Independent Collection)
            </div>
            <h3 className="font-headline text-xl font-bold text-brand-ink flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-brand-navy" />
              Dandiya Student Eligibility Roster
            </h3>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
              Dedicated roster created exclusively for Dandiya (Navrang 2026). Only students in this roster can book passes. The main school APAAR / PEN database is completely separate and unaffected.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Sample Template (.CSV)
            </button>
            {total > 0 && (
              <button 
                onClick={handleClearRoster}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3.5 py-2 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Roster
              </button>
            )}
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-200 hover:border-purple-400 bg-purple-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-purple-50/70"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
              />
              <UploadCloud className="w-10 h-10 text-purple-600 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">
                Click to browse or drop Excel / CSV file
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Format: <strong>Class, Section, Roll_no, Name, Father_Name, Mother_Name, Contact_No, Admn_No</strong>
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Dandiya Roster Overview</div>
              <div className="text-3xl font-black text-slate-900">{total}</div>
              <div className="text-xs text-slate-500 mt-1">Students in Dandiya Eligibility List</div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/80">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded text-brand-navy focus:ring-brand-navy w-4 h-4"
                />
                <span>Replace entire existing roster</span>
              </label>
            </div>
          </div>
        </div>

        {/* Staged File Preview */}
        {fileData && (
          <div className="mt-4 p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <FileSpreadsheet className="w-4 h-4 text-amber-700" />
                Staged File: {fileName} ({fileData.length} records detected)
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setFileData(null); setFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUploadSubmit}
                  disabled={isUploading}
                  className="text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white px-4 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : `Confirm & Upload ${fileData.length} Students`}
                </button>
              </div>
            </div>

            {/* Quick 3-Row Preview */}
            <div className="overflow-x-auto text-[11px] bg-white rounded-xl border border-amber-200 p-2">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="p-1">Admn_No</th>
                    <th className="p-1">Name</th>
                    <th className="p-1">Class & Sec</th>
                    <th className="p-1">Father_Name</th>
                    <th className="p-1">Mother_Name</th>
                    <th className="p-1">Contact_No</th>
                  </tr>
                </thead>
                <tbody>
                  {fileData.slice(0, 3).map((r, i) => (
                    <tr key={i} className="border-b border-slate-50 font-mono">
                      <td className="p-1 font-bold text-slate-900">{r.Admn_No || r['Admn_No'] || r.admission_no || r['Admission No']}</td>
                      <td className="p-1 font-sans font-medium">{r.Name || r['Name'] || r.student_name || r['Student Name']}</td>
                      <td className="p-1 font-sans">{(r.Class || r['Class'] || '')} {(r.Section || r['Section'] || '')}</td>
                      <td className="p-1 font-sans">{r.Father_Name || r['Father_Name'] || r.father_name || '-'}</td>
                      <td className="p-1 font-sans">{r.Mother_Name || r['Mother_Name'] || r.mother_name || '-'}</td>
                      <td className="p-1 font-mono">{r.Contact_No || r['Contact_No'] || r.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fileData.length > 3 && (
                <div className="text-[10px] text-slate-400 text-center pt-1 italic">
                  + {fileData.length - 3} more records will be processed
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Roster Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search admission no, student, father..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-brand-navy outline-none"
              onChange={(e) => debouncedSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Filter Class (e.g. CLASS-I)"
              value={classNameFilter}
              onChange={(e) => { setClassNameFilter(e.target.value); setPage(1); }}
              className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-brand-navy w-40"
            />
            <button 
              onClick={fetchRoster}
              className="p-2 border border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleOpenAdd}
              className="bg-brand-navy hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0"
              title="Add Single Student"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Student</span>
            </button>
          </div>
        </div>

        {loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 min-w-[950px]">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4 rounded-tl-lg">Admn_No</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Class & Sec</th>
                    <th className="py-3 px-4">Father_Name</th>
                    <th className="py-3 px-4">Mother_Name</th>
                    <th className="py-3 px-4">Contact_No</th>
                    <th className="py-3 px-4">Pass Status</th>
                    <th className="py-3 px-4 rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st.admission_no} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 text-xs">
                        {st.admission_no}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 text-xs">
                        {st.student_name}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {st.class_name ? `${st.class_name} ${st.section || ''}` : '-'}
                        {st.roll_no ? <span className="text-slate-400 ml-1 font-mono text-[10px]">(Roll: {st.roll_no})</span> : ''}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {st.father_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {st.mother_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-800 font-medium">
                        {st.phone || st.contact_no || '-'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {st.booking ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200 font-mono text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            {st.booking.booking_id} ({st.booking.payment_status})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Eligible (Not Booked)</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleOpenEdit(st)}
                            className="p-1.5 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Edit student details"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(st.admission_no)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove student from roster"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-500 text-sm">No student records found in roster.</p>
                  <p className="text-xs text-slate-400 mt-1">Upload an Excel or CSV file above to populate the eligible student list.</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} students
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 outline-none text-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * limit >= total}
                    className="p-2 border border-slate-300 rounded-lg disabled:opacity-50 hover:bg-slate-50 outline-none text-xs"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* EDIT / ADD STUDENT MODAL */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white p-5 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
                    {isNewStudent ? <Plus className="w-5 h-5" /> : <Pencil className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {isNewStudent ? 'Add Student to Dandiya Roster' : 'Edit Student Details'}
                    </h3>
                    <p className="text-xs text-purple-200">
                      {isNewStudent ? 'New eligible student record' : `Admission No: ${studentForm.original_admission_no}`}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditModalOpen(false)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Admission Number <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      value={studentForm.admission_no}
                      onChange={(e) => setStudentForm({...studentForm, admission_no: e.target.value.toUpperCase()})}
                      placeholder="e.g. SDPS101"
                      className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-none uppercase"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Student Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      value={studentForm.student_name}
                      onChange={(e) => setStudentForm({...studentForm, student_name: e.target.value})}
                      placeholder="e.g. Surbhi"
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Class Name
                    </label>
                    <input 
                      type="text"
                      value={studentForm.class_name}
                      onChange={(e) => setStudentForm({...studentForm, class_name: e.target.value})}
                      placeholder="e.g. CLASS-III"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Section
                      </label>
                      <input 
                        type="text"
                        value={studentForm.section}
                        onChange={(e) => setStudentForm({...studentForm, section: e.target.value.toUpperCase()})}
                        placeholder="A"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-none uppercase text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Roll No
                      </label>
                      <input 
                        type="text"
                        value={studentForm.roll_no}
                        onChange={(e) => setStudentForm({...studentForm, roll_no: e.target.value})}
                        placeholder="24"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-none text-center font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Father's Name
                    </label>
                    <input 
                      type="text"
                      value={studentForm.father_name}
                      onChange={(e) => setStudentForm({...studentForm, father_name: e.target.value})}
                      placeholder="Father's full name"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mother's Name
                    </label>
                    <input 
                      type="text"
                      value={studentForm.mother_name}
                      onChange={(e) => setStudentForm({...studentForm, mother_name: e.target.value})}
                      placeholder="Mother's full name"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact / WhatsApp Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+91</span>
                    <input 
                      type="tel"
                      maxLength="10"
                      value={studentForm.phone}
                      onChange={(e) => setStudentForm({...studentForm, phone: e.target.value.replace(/\D/g, '')})}
                      placeholder="10-digit mobile"
                      className="w-full pl-11 pr-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-600 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used to pre-fill parent details and deliver QR tickets on WhatsApp.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStudent}
                    className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md shadow-purple-700/20 flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {savingStudent ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        {isNewStudent ? 'Add to Roster' : 'Save Changes'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// TAB 4: GATE SCANNER
// ==========================================
// ==========================================
// TAB 4: GATE SCANNER (LIVE CAMERA & MANUAL)
// ==========================================
// Human-readable scan message formatter (converts coder ISO timestamps & UUIDs into plain friendly English)
const formatFriendlyScanMessage = (msg, booking) => {
  if (!msg) return '';
  const cleanMsg = String(msg);
  
  if (cleanMsg.includes('ALREADY USED') || cleanMsg.includes('already checked in')) {
    let timeStr = '';
    const rawTime = booking?.entry_time;
    if (rawTime) {
      try {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) {
          const tPart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
          const isToday = new Date().toDateString() === d.toDateString();
          timeStr = isToday ? `Today at ${tPart}` : `${d.toLocaleDateString([], { day: '2-digit', month: 'short' })} at ${tPart}`;
        }
      } catch (e) {}
    }
    
    let officer = booking?.entry_marked_by || 'Gate Officer';
    // Clean raw UUID like 880a4260-59be-49f8-9c4b-ab86e63642cc
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(officer)) {
      officer = 'Gate Staff / Admin Desk';
    }
    
    if (timeStr) {
      return `ALREADY USED: This ticket was already checked in ${timeStr} by ${officer}.`;
    }
    return `ALREADY USED: This ticket has already been checked in.`;
  }
  
  if (cleanMsg.includes('PAYMENT UNPAID') || cleanMsg.includes('UNPAID PASS')) {
    const amt = booking?.price || 299;
    return `UNPAID PASS: Payment is not completed yet. Collect ₹${amt} cash or ask parent for payment receipt.`;
  }
  
  if (cleanMsg.includes('INVALID TICKET') || cleanMsg.includes('INVALID PASS')) {
    return 'INVALID PASS: No booking record found for this code or QR pass.';
  }
  
  return cleanMsg;
};

// ==========================================
// TAB 4: GATE SCANNER (MOVIE TICKET GUARD MODE)
// ==========================================
const ScannerTab = () => {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'manual' | 'upload'
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isGuardFullscreen, setIsGuardFullscreen] = useState(false);

  // Camera & Device State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Auto-scan timer & queue controls
  const [autoCountdown, setAutoCountdown] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [cashCollecting, setCashCollecting] = useState(false);
  const [resendingScanWa, setResendingScanWa] = useState(null);
  const [lastScannedTicket, setLastScannedTicket] = useState(null);

  // Live gate attendance stats
  const [gateStats, setGateStats] = useState({
    total_entered: 0,
    total_passes_entered: 0,
    total_persons_entered: 0,
    total_dandiya_pairs: 0,
    total_bookings: 0,
    total_revenue: 0
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isScanningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef(null);
  const countdownTimerRef = useRef(null);

  // Helper for package breakdown & prop hand-outs (Movie Ticket style)
  const getPackageInfo = (pkg, booking = null) => {
    const p = (pkg || '').toLowerCase().trim();
    const students = booking?.students || [];
    const stuCount = students.length || (p === 'platinum' ? 3 : p === 'gold' ? 2 : 1);
    const totalAdmits = booking?.total_persons || (1 + stuCount);
    const breakdown = booking?.headcount_breakdown || `1 Mother + ${stuCount} Student${stuCount > 1 ? 's' : ''}`;

    if (p === 'platinum') {
      return {
        name: 'Platinum Pass',
        totalAdmits,
        breakdown,
        dandiyaSticks: '1 Pair Dandiya Sticks',
        themeColor: 'purple',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300'
      };
    }
    if (p === 'gold') {
      return {
        name: 'Gold Pass',
        totalAdmits,
        breakdown,
        dandiyaSticks: '1 Pair Dandiya Sticks',
        themeColor: 'amber',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
      };
    }
    return {
      name: 'Silver Pass',
      totalAdmits,
      breakdown,
      dandiyaSticks: '1 Pair Dandiya Sticks',
      themeColor: 'slate',
      badgeClass: 'bg-slate-100 text-slate-900 border-slate-300'
    };
  };

  // Fetch gate stats on mount
  const fetchGateStats = async () => {
    try {
      const { data } = await api.get('/navrang/admin/stats');
      const passesEntered = data.total_passes_entered ?? data.total_entered ?? data.entries_recorded ?? 0;
      const personsEntered = data.total_persons_entered ?? (passesEntered * 2);
      const dandiyaPairs = data.total_dandiya_pairs ?? passesEntered;

      setGateStats({
        total_entered: passesEntered,
        total_passes_entered: passesEntered,
        total_persons_entered: personsEntered,
        total_dandiya_pairs: dandiyaPairs,
        total_bookings: data.total_bookings || 0,
        total_revenue: data.total_revenue || 0
      });

      if (data.recent_checkins && data.recent_checkins.length > 0) {
        setLogs(prev => {
          const existingIds = new Set(prev.map(l => l.token || l.booking?.booking_id));
          const newEntries = data.recent_checkins
            .filter(b => !existingIds.has(b.booking_id))
            .map(b => ({
              token: b.booking_id,
              success: true,
              status: 'admitted',
              message: `Entry Allowed: Admit ${b.total_persons || 2} Persons ✓`,
              booking: b,
              time: b.entry_time ? new Date(b.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Earlier'
            }));
          const combined = [...prev, ...newEntries].slice(0, 30);
          return combined;
        });
      }
    } catch (e) {
      console.log('Gate stats error', e);
    }
  };

  useEffect(() => {
    fetchGateStats();
  }, []);

  // Load jsQR dynamically as fallback for older browsers without BarcodeDetector
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.BarcodeDetector && !window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Cleanup camera stream & timer on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Cinema Turnstile Sound Synthesizer
  const playCinemaSound = (type) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'admitted') {
        // High-pitched Cinema Turnstile Double-Beep (987Hz -> 1318Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(987, ctx.currentTime);
        gain1.gain.setValueAtTime(0.25, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.08);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318, ctx.currentTime + 0.09);
        gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.09);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.24);
        osc2.start(ctx.currentTime + 0.09);
        osc2.stop(ctx.currentTime + 0.24);
      } else if (type === 'unpaid') {
        // Alert chime (440Hz -> 330Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.28);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
      } else {
        // Heavy Cinema Turnstile Denied Buzzer (180Hz sawtooth)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.38);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.38);
      }
    } catch (e) {
      console.log('Audio feedback error', e);
    }
  };

  const addLog = (log) => {
    setLogs(prev => [log, ...prev].slice(0, 30));
  };

  // Auto-scan countdown controls for rapid movie turnstile flow
  const startAutoCountdown = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setAutoCountdown(12);
    setIsPaused(false);

    countdownTimerRef.current = setInterval(() => {
      setAutoCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          dismissResultAndResume();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const dismissResultAndResume = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setAutoCountdown(null);
    setIsPaused(false);
    if (currentResult) {
      setLastScannedTicket(currentResult);
    }
    setCurrentResult(null);
    setInputValue('');
    isProcessingRef.current = false;
    setIsProcessing(false);
  };

  const togglePauseCountdown = () => {
    if (isPaused) {
      setIsPaused(false);
      startAutoCountdown();
    } else {
      setIsPaused(true);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setAutoCountdown(null);
    }
  };

  // Collect Cash & Admit Now handler
  const handleCollectCashAndAdmit = async (bookingId) => {
    if (!bookingId || cashCollecting) return;
    setCashCollecting(true);
    try {
      const { data } = await api.post(`/navrang/admin/bookings/${bookingId}/admit-cash`);
      playCinemaSound('admitted');
      if (navigator?.vibrate) {
        try { navigator.vibrate([120, 60, 120]); } catch (e) {}
      }
      toast.success(data.message || 'Cash collected & Entry Granted!');
      
      const updatedBooking = data.booking || currentResult?.booking;
      const headCount = updatedBooking?.total_persons || 2;
      const resultObj = {
        success: true,
        status: 'admitted',
        booking: updatedBooking,
        message: `Cash Paid & Entry Granted: Admit ${headCount} Persons ✓`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setCurrentResult(resultObj);
      setLastScannedTicket(resultObj);

      addLog({
        token: bookingId,
        success: true,
        status: 'admitted',
        message: `Cash Paid & Admitted ${headCount} Persons ✓`,
        booking: updatedBooking,
        time: resultObj.timestamp
      });

      fetchGateStats();
      startAutoCountdown();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to record cash payment');
    } finally {
      setCashCollecting(false);
    }
  };

  const handleResendScanWhatsApp = async (bookingId, phone) => {
    if (!bookingId) return;
    try {
      setResendingScanWa(bookingId);
      const res = await api.post(`/navrang/admin/bookings/${bookingId}/resend-whatsapp`);
      toast.success(res.data?.message || `Pass dispatched to WhatsApp (${phone || ''})!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to dispatch WhatsApp pass.');
    } finally {
      setResendingScanWa(null);
    }
  };

  // Main token verification caller
  const verifyToken = async (rawToken) => {
    if (!rawToken || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setLoading(true);
    setCurrentResult(null);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setAutoCountdown(null);

    let token = String(rawToken).trim();
    // Parse URL if user scanned QR containing full link
    try {
      if (token.includes('booking_id=')) {
        const url = new URL(token);
        token = url.searchParams.get('booking_id') || token;
      } else if (token.includes('/my-ticket/')) {
        token = token.split('/my-ticket/')[1].split('?')[0];
      }
    } catch (e) {}

    setInputValue(token);

    try {
      const { data } = await api.post('/navrang/admin/verify-entry', { 
        qr_token: token,
        booking_id: token
      });
      
      playCinemaSound('admitted');
      if (navigator?.vibrate) {
        try { navigator.vibrate([120, 60, 120]); } catch (e) {}
      }
      
      const headCount = data.booking?.total_persons || 2;
      const resultObj = { 
        success: true, 
        status: 'admitted', 
        booking: data.booking,
        message: data.message || `Entry Granted: Admit ${headCount} Persons ✓`,
        rawToken: token,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      
      setCurrentResult(resultObj);
      setLastScannedTicket(resultObj);

      addLog({ 
        token: data.booking?.booking_id || token, 
        success: true, 
        status: 'admitted', 
        message: `Entry Allowed: Admit ${headCount} Persons ✓`, 
        booking: data.booking,
        time: resultObj.timestamp
      });
      toast.success(`Entry Granted: Admit ${headCount} Persons (${data.booking?.booking_id || token})`);
      fetchGateStats();
      startAutoCountdown();
    } catch (error) {
      const errData = error.response?.data;
      const status = errData?.status || (error.response?.status === 404 ? 'not_found' : 'error');
      const rawMsg = errData?.detail || error.message || 'Ticket verification failed';
      const errBooking = errData?.booking || null;
      const msg = formatFriendlyScanMessage(rawMsg, errBooking);
      
      if (status === 'unpaid') {
        playCinemaSound('unpaid');
        if (navigator?.vibrate) {
          try { navigator.vibrate([200]); } catch (e) {}
        }
      } else {
        playCinemaSound('denied');
        if (navigator?.vibrate) {
          try { navigator.vibrate([300, 100, 300]); } catch (e) {}
        }
      }

      const resultObj = { 
        success: false, 
        status, 
        booking: errBooking, 
        error: msg, 
        rawToken: token,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setCurrentResult(resultObj);
      if (errBooking) {
        setLastScannedTicket(resultObj);
      }
      addLog({ 
        token: errBooking?.booking_id || token, 
        success: false, 
        status, 
        message: msg, 
        booking: errBooking, 
        time: resultObj.timestamp
      });
      toast.error(msg);
      // For errors, do not auto-dismiss so guard can inspect identity and reasons
    } finally {
      setLoading(false);
    }
  };

  // Start live camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Check for torch capability
      try {
        const track = stream.getVideoTracks()[0];
        const cap = track?.getCapabilities?.() || {};
        setTorchSupported(!!cap.torch);
      } catch (e) {
        setTorchSupported(false);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        isScanningRef.current = true;
        requestAnimationFrame(tickScanner);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let errMsg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Camera permission denied. Allow camera access in browser settings to scan QR tickets.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera found on this device. Use manual entry or upload an image.';
      }
      setCameraError(errMsg);
      setCameraActive(false);
      toast.error(errMsg);
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const flipCamera = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      const nextTorch = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: nextTorch }]
      });
      setTorchOn(nextTorch);
    } catch (err) {
      console.log('Torch error:', err);
      toast.error('Torch not supported on this lens');
    }
  };

  useEffect(() => {
    if (cameraActive) {
      startCamera();
    }
  }, [cameraFacing]);

  // Frame tick decoder
  const tickScanner = async () => {
    if (!isScanningRef.current || !videoRef.current) return;
    const video = videoRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingRef.current && !currentResult) {
      let detectedToken = null;

      // 1. Try Native BarcodeDetector (Chrome Mac/Win/Android & Safari 17+)
      if (window.BarcodeDetector) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
            detectedToken = barcodes[0].rawValue;
          }
        } catch (e) {}
      }

      // 2. jsQR Canvas fallback
      if (!detectedToken && window.jsQR && canvasRef.current) {
        try {
          const canvas = canvasRef.current;
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
              inversionAttempts: 'dontInvert'
            });
            if (code && code.data) {
              detectedToken = code.data;
            }
          }
        } catch (e) {}
      }

      if (detectedToken && !isProcessingRef.current) {
        verifyToken(detectedToken);
      }
    }

    if (isScanningRef.current) {
      setTimeout(() => {
        requestAnimationFrame(tickScanner);
      }, 100);
    }
  };

  // Image upload decoder
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = async () => {
      let detected = null;
      if (window.BarcodeDetector) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const barcodes = await detector.detect(img);
          if (barcodes && barcodes.length > 0) detected = barcodes[0].rawValue;
        } catch (e) {}
      }
      if (!detected && window.jsQR) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const code = window.jsQR(imgData.data, imgData.width, imgData.height);
        if (code) detected = code.data;
      }

      if (detected) {
        verifyToken(detected);
        toast.success('QR Code detected from image!');
      } else {
        toast.error('Could not detect a valid QR code in this image. Try another photo.');
      }
    };
    img.src = URL.createObjectURL(file);
  };

  const handleManualSubmit = (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;
    verifyToken(inputValue.trim());
  };

  return (
    <div className={`space-y-6 ${isGuardFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 sm:p-6 overflow-y-auto' : ''}`}>
      {/* 1. CINEMA GUARD TOP CONTROL BAR */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="font-headline text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Gate 1 • Cinema Ticket Scanner
            </h2>
            <span className="bg-purple-950/80 text-purple-300 border border-purple-700/60 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              Guard HUD
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5">
            Durga Puja & Dandiya Night 2026 • Official Turnstile & Headcount Verification
          </p>
        </div>

        {/* Live Attendance Stats Chips & Guard Quick Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* 1. TOTAL HEADCOUNT / PERSONS CHIP */}
          <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 px-3.5 py-1.5 rounded-xl shadow-xs" title="Total attendees admitted inside the event">
            <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="text-xs">
              <span className="text-emerald-300 font-semibold">Headcount: </span>
              <strong className="text-white font-mono font-black text-sm">{gateStats.total_persons_entered || 0} Persons</strong>
            </div>
          </div>

          {/* 2. PASSES SCANNED CHIP */}
          <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-500/50 px-3 py-1.5 rounded-xl shadow-xs" title="Total booking passes scanned at gate">
            <ScanLine className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-xs">
              <span className="text-purple-300 font-semibold">Passes: </span>
              <strong className="text-white font-mono font-bold">{gateStats.total_passes_entered || gateStats.total_entered || 0}</strong>
            </div>
          </div>

          {/* 3. DANDIYA PAIRS CHIP */}
          <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-500/50 px-3 py-1.5 rounded-xl shadow-xs" title="Total Dandiya pairs handed over to attendees">
            <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="text-xs">
              <span className="text-amber-300 font-semibold">Dandiya: </span>
              <strong className="text-amber-300 font-mono font-bold">{gateStats.total_dandiya_pairs || gateStats.total_entered || 0} Prs</strong>
            </div>
          </div>

          {/* Quick Hardware Toggles */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
            {/* Torch Toggle */}
            {torchSupported && cameraActive && (
              <button
                type="button"
                onClick={toggleTorch}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
                title={torchOn ? 'Torch On' : 'Turn Torch On'}
              >
                {torchOn ? <Flashlight className="w-4 h-4" /> : <FlashlightOff className="w-4 h-4" />}
              </button>
            )}

            {/* Sound Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                soundEnabled ? 'text-emerald-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'
              }`}
              title={soundEnabled ? 'Audio Alerts: Beep On' : 'Audio Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Guard Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsGuardFullscreen(!isGuardFullscreen)}
              className="p-2 rounded-lg text-xs font-semibold text-purple-300 hover:text-white hover:bg-slate-800 transition-all"
              title={isGuardFullscreen ? 'Exit Cinema View' : 'Cinema Guard View'}
            >
              {isGuardFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: VIEWPORT & TICKET VERIFICATION (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* PERSISTENT LAST ADMITTED GUEST SUMMARY (Always visible so guard never loses headcount context) */}
          {lastScannedTicket && (
            <div className="bg-slate-900 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center font-black text-xl shrink-0">
                  {lastScannedTicket.booking?.total_persons || 2}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      Last Admitted: {lastScannedTicket.booking?.booking_id || lastScannedTicket.token}
                    </span>
                    <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">
                      Admitted ✓
                    </span>
                  </div>
                  <div className="text-slate-300 font-medium text-xs mt-0.5">
                    👥 <strong className="text-emerald-300 font-bold">Admit {lastScannedTicket.booking?.total_persons || 2} Persons</strong> ({lastScannedTicket.booking?.headcount_breakdown || '1 Mother + Student'}) • 🪘 1 Pair Dandiya
                    {lastScannedTicket.booking?.parent_name && ` • ${lastScannedTicket.booking.parent_name}`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentResult(lastScannedTicket)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl shrink-0 transition-colors cursor-pointer font-bold"
              >
                View Full Pass
              </button>
            </div>
          )}

          {/* SCANNER CONTAINER */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
            {/* MODE SELECTOR */}
            <div className="flex p-1 bg-slate-950 rounded-xl mb-4 text-xs font-semibold border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('camera');
                  if (!cameraActive) startCamera();
                }}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'camera' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('manual')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'manual' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Manual Entry / Gun</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('upload')}
                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'upload' ? 'bg-purple-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Photo</span>
              </button>
            </div>

            {/* 1. CAMERA SCANNER VIEWPORT */}
            {activeMode === 'camera' && (
              <div className="space-y-4">
                <div className="relative aspect-video sm:aspect-square max-h-[420px] w-full bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-slate-800">
                  {/* VIDEO IN BACKGROUND */}
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 z-0 ${cameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* CAMERA NOT RUNNING STATE */}
                  {!cameraActive && (
                    <div className="relative z-10 text-center p-6 text-white space-y-3 max-w-sm">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-amber-400 border border-white/10">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">Movie Ticket Camera Scanner</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          Hold phone camera at guest ticket passes (on mobile screen or paper pass) for instant gate verification.
                        </p>
                      </div>
                      {cameraError && (
                        <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-700/60 text-red-200 text-xs">
                          {cameraError}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={startCamera}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 inline-flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        Start Guard Camera
                      </button>
                    </div>
                  )}

                  {/* ACTIVE CAMERA OVERLAY & SCANNING FRAME */}
                  {cameraActive && (
                    <>
                      {/* Top Bar with Camera Controls */}
                      <div className="absolute top-3 inset-x-3 flex justify-between items-center z-30 pointer-events-auto">
                        <div className="inline-flex items-center gap-1.5 bg-black/75 backdrop-blur-md text-emerald-400 text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/40">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Ready For Pass
                        </div>
                        <div className="flex items-center gap-1.5">
                          {torchSupported && (
                            <button
                              type="button"
                              onClick={toggleTorch}
                              className={`backdrop-blur-md text-xs font-semibold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 transition-all ${
                                torchOn ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-black/60 text-white border-white/20'
                              }`}
                            >
                              <Flashlight className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">{torchOn ? 'Torch On' : 'Torch'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={flipCamera}
                            className="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20 inline-flex items-center gap-1 transition-all"
                            title="Switch front/back camera"
                          >
                            <SwitchCamera className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{cameraFacing === 'environment' ? 'Back' : 'Front'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="bg-red-600/80 hover:bg-red-700 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all"
                          >
                            <CameraOff className="w-3.5 h-3.5" />
                            <span>Stop</span>
                          </button>
                        </div>
                      </div>

                      {/* Center QR Target Reticle (Cinema Usher HUD with Outer Shadow Vignette) */}
                      <div className="relative z-20 w-52 h-52 sm:w-60 sm:h-60 border-2 border-emerald-400 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] pointer-events-none flex flex-col justify-between p-2 overflow-hidden bg-emerald-500/5">
                        {/* 4 Glowing Corner Targeting Brackets */}
                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-t-3 border-l-3 border-emerald-300 rounded-tl-xl shadow-[0_0_10px_#34d399]" />
                          <div className="w-6 h-6 border-t-3 border-r-3 border-emerald-300 rounded-tr-xl shadow-[0_0_10px_#34d399]" />
                        </div>
                        
                        {/* Animated Neon Laser Scanning Line */}
                        <motion.div 
                          animate={{ top: ['6%', '90%', '6%'] }} 
                          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                          className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_18px_#34d399]" 
                        />

                        <div className="flex justify-between">
                          <div className="w-6 h-6 border-b-3 border-l-3 border-emerald-300 rounded-bl-xl shadow-[0_0_10px_#34d399]" />
                          <div className="w-6 h-6 border-b-3 border-r-3 border-emerald-300 rounded-br-xl shadow-[0_0_10px_#34d399]" />
                        </div>
                      </div>

                      {/* Processing Status Banner */}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-xs z-40 flex flex-col items-center justify-center text-white space-y-2">
                          <div className="w-8 h-8 border-3 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                          <span className="text-xs font-bold text-emerald-400">Verifying Ticket Pass...</span>
                        </div>
                      )}

                      <div className="absolute bottom-3 inset-x-3 text-center z-30 pointer-events-none">
                        <span className="text-xs font-bold text-emerald-300 bg-black/85 px-4 py-1.5 rounded-full backdrop-blur-md border border-emerald-500/30 shadow-lg inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Align Attendee QR Pass inside green reticle
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 2. MANUAL ENTRY MODE */}
            {activeMode === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Enter Booking ID or QR Token
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      autoFocus
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g. NVR-2026-ABCD"
                      className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-500 outline-none text-base uppercase font-mono"
                    />
                    <button 
                      type="submit"
                      disabled={loading || !inputValue.trim()}
                      className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 outline-none transition-all cursor-pointer shadow-md"
                    >
                      {loading ? 'Checking...' : 'Verify Entry'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Supports manual keyboard typing or handheld USB/Bluetooth barcode scanner guns.
                  </p>
                </div>
              </form>
            )}

            {/* 3. UPLOAD QR IMAGE MODE */}
            {activeMode === 'upload' && (
              <div className="space-y-3">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-all"
                >
                  <Upload className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-xs font-bold text-white">Click to Select QR Ticket Image</div>
                  <div className="text-[11px] text-slate-400 mt-1">PNG, JPG, or Screenshot of attendee pass</div>
                  <input 
                    ref={fileInputRef} 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* THE MOVIE TICKET VERIFICATION STUB (CINEMA GUARD PASS)   */}
          {/* ========================================================= */}
          <AnimatePresence>
            {currentResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative bg-white rounded-3xl shadow-2xl border-2 overflow-hidden"
                style={{
                  borderColor: currentResult.status === 'admitted' ? '#10B981' : currentResult.status === 'unpaid' ? '#F59E0B' : '#EF4444'
                }}
              >
                {/* Cinema Semicircle Cutouts on Left & Right */}
                <div className="absolute -left-3.5 top-[152px] w-7 h-7 rounded-full bg-slate-900 border-r-2 border-slate-700 z-30" />
                <div className="absolute -right-3.5 top-[152px] w-7 h-7 rounded-full bg-slate-900 border-l-2 border-slate-700 z-30" />

                {/* 1. CINEMA TICKET TOP HEADER */}
                <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 p-4 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                        <Sparkles className="w-3 h-3" />
                        <span>S.D. Public School, Patna</span>
                      </div>
                      <h3 className="font-headline text-lg sm:text-xl font-black tracking-tight text-white mt-0.5">
                        NAVRANG 2026: DANDIYA NIGHT
                      </h3>
                      <p className="text-[11px] text-slate-300 font-medium">
                        Auditorium Gate 1 • Oct 15, 2026 • Gates Open 5:00 PM
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-mono block">Pass Reference</span>
                      <strong className="font-mono text-sm sm:text-base text-amber-300 tracking-wider">
                        #{currentResult.booking?.booking_id || currentResult.rawToken}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* 2. THE BIG DECISION BANNER (Visible across the gate) */}
                <div className={`p-4 border-b text-center ${
                  currentResult.status === 'admitted'
                    ? 'bg-emerald-600 text-white'
                    : currentResult.status === 'unpaid'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-red-600 text-white'
                }`}>
                  {currentResult.status === 'admitted' && (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-6 h-6 animate-bounce" />
                      <div className="text-left">
                        <div className="text-lg font-black tracking-wide uppercase">ENTRY ALLOWED • PASS VALID ✓</div>
                        <div className="text-[11px] font-medium opacity-90">Guest identity verified for admission</div>
                      </div>
                    </div>
                  )}

                  {currentResult.status === 'unpaid' && (
                    <div className="flex items-center justify-center gap-2">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                      <div className="text-left">
                        <div className="text-lg font-black tracking-wide uppercase">ENTRY BLOCKED: UNPAID PASS ⚠️</div>
                        <div className="text-[11px] font-bold">Collect cash payment or verify UTR before allowing entry</div>
                      </div>
                    </div>
                  )}

                  {(currentResult.status === 'already_used' || currentResult.status === 'error' || currentResult.status === 'not_found') && (
                    <div className="flex items-center justify-center gap-2">
                      <XCircle className="w-6 h-6 shrink-0" />
                      <div className="text-left">
                        <div className="text-lg font-black tracking-wide uppercase">
                          {currentResult.status === 'already_used' ? 'ENTRY DENIED: ALREADY CHECKED IN ✕' : 'ENTRY DENIED: INVALID PASS ✕'}
                        </div>
                        <div className="text-[11px] font-medium opacity-90">{formatFriendlyScanMessage(currentResult.error, currentResult.booking)}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Perforated divider line */}
                <div className="border-b-2 border-dashed border-slate-200" />

                {/* 3. HEADCOUNT & FREEBIE COMBO (Like Movie Ticket seats & combos!) */}
                {currentResult.booking && (() => {
                  const pkgInfo = getPackageInfo(currentResult.booking.package, currentResult.booking);
                  return (
                    <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* HEADCOUNT BADGE */}
                        <div className="bg-purple-900 text-white p-4 rounded-2xl border-2 border-purple-500 shadow-sm flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-200 block">
                              Total Headcount
                            </span>
                            <strong className="text-xl sm:text-2xl text-amber-300 font-black block">
                              ADMIT {pkgInfo.totalAdmits} PERSONS
                            </strong>
                            <span className="text-xs text-purple-100 font-medium">
                              {pkgInfo.breakdown}
                            </span>
                          </div>
                          <div className="w-14 h-14 rounded-2xl bg-amber-400 text-purple-950 flex items-center justify-center shrink-0 font-black text-2xl shadow-md">
                            {pkgInfo.totalAdmits}
                          </div>
                        </div>

                        {/* PROP / COMBO HANDOVER BADGE */}
                        <div className="bg-amber-50/80 p-3.5 rounded-2xl border-2 border-amber-300 shadow-xs flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 text-xl font-bold">
                            🪘
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                              Hand Over to Guest
                            </span>
                            <strong className="text-sm sm:text-base text-amber-950 font-black block">
                              {pkgInfo.dandiyaSticks}
                            </strong>
                            <span className="text-[11px] text-amber-800 font-medium">
                              Included with {pkgInfo.name}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. STUDENT & PARENT IDENTITY DETAILS */}
                {currentResult.booking && (
                  <div className="p-4 sm:p-5 space-y-4">
                    {/* STUDENTS LIST (Guard matches face/uniform/ID) */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
                          Admitted Student(s) — Check ID / Uniform
                        </span>
                        <span className="text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {(currentResult.booking.students || []).length} Student(s)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(currentResult.booking.students || []).map((student, idx) => (
                          <div 
                            key={idx}
                            className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-3"
                          >
                            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white font-bold flex items-center justify-center text-xs shrink-0">
                              {(student.name || student.student_name || 'S')[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-extrabold text-sm text-slate-900 truncate">
                                {student.name || student.student_name}
                              </h5>
                              <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5">
                                <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded border border-purple-200">
                                  {student.admission_no}
                                </span>
                                {(student.class_name || student.section) && (
                                  <span className="text-slate-500 font-medium">
                                    Class {student.class_name} {student.section || ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PARENT / MOTHER CONTACT */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Mother / Guardian:</span>
                        <strong className="text-slate-900 text-sm">{currentResult.booking.parent_name || 'N/A'}</strong>
                        <span className="text-slate-500 ml-2 font-mono">{currentResult.booking.parent_phone}</span>
                      </div>

                      {currentResult.booking.parent_phone && (
                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            disabled={resendingScanWa === currentResult.booking.booking_id}
                            onClick={() => handleResendScanWhatsApp(currentResult.booking.booking_id, currentResult.booking.parent_phone)}
                            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                            title="Resend digital pass to parent's WhatsApp"
                          >
                            {resendingScanWa === currentResult.booking.booking_id ? (
                              <RefreshCw className="w-3 h-3 animate-spin text-emerald-700" />
                            ) : (
                              <MessageCircle className="w-3 h-3 text-emerald-600" />
                            )}
                            <span>Send Pass via WhatsApp</span>
                          </button>
                          <a 
                            href={`tel:${currentResult.booking.parent_phone}`}
                            className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs"
                          >
                            <PhoneCall className="w-3 h-3 text-emerald-600" />
                            <span>Call Mother</span>
                          </a>
                        </div>
                      )}
                    </div>

                    {/* CASH ADMIT BUTTON (If Unpaid) */}
                    {currentResult.status === 'unpaid' && (
                      <div className="p-3.5 bg-amber-50 rounded-2xl border-2 border-amber-300 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-amber-900">Total Ticket Price:</span>
                          <strong className="text-base font-extrabold text-amber-950 font-mono">
                            ₹{currentResult.booking.price || 300}
                          </strong>
                        </div>
                        <button
                          type="button"
                          disabled={cashCollecting}
                          onClick={() => handleCollectCashAndAdmit(currentResult.booking.booking_id)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <DollarSign className="w-4 h-4" />
                          <span>{cashCollecting ? 'Recording Cash...' : `Collect ₹${currentResult.booking.price || 300} Cash & Admit Now`}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. AUTO-SCAN COUNTDOWN / QUEUE CLEARING BAR */}
                <div className="p-4 bg-slate-950 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                  {autoCountdown !== null ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-emerald-400 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
                        {autoCountdown}
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-300 block font-medium">Auto-clearing for next guest...</span>
                        <span className="text-[10px] text-slate-500">Camera resumes in {autoCountdown}s</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">
                      Scan verified at <span className="font-mono text-slate-200">{currentResult.timestamp}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {autoCountdown !== null && (
                      <button
                        type="button"
                        onClick={togglePauseCountdown}
                        className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all"
                      >
                        {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{isPaused ? 'Resume Timer' : 'Pause & Hold'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={dismissResultAndResume}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <ScanLine className="w-3.5 h-3.5" />
                      <span>Scan Next Ticket Now</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: LIVE AUDIT SCAN LOGS (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-headline text-base sm:text-lg font-bold text-brand-ink flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-700" />
                  Live Gate Check-in Logs
                </h3>
                <p className="text-slate-400 text-xs">Real-time gate audit feed for this session</p>
              </div>
              {logs.length > 0 && (
                <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full font-mono">
                  {logs.length} Scans
                </span>
              )}
            </div>

            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-center py-20 text-slate-400 text-xs">
                  <ScanLine className="w-9 h-9 text-slate-300 mx-auto mb-2" />
                  <p className="font-medium text-slate-500">No scan events recorded yet in this session.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Start the live camera or enter a booking ID to verify.</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start justify-between p-3 rounded-xl border text-xs transition-all ${
                      log.success 
                        ? 'bg-emerald-50/70 border-emerald-200' 
                        : log.status === 'unpaid'
                        ? 'bg-amber-50/70 border-amber-200'
                        : 'bg-red-50/70 border-red-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {log.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      ) : log.status === 'unpaid' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                          <span>{log.token}</span>
                          {log.booking?.parent_name && (
                            <span className="text-slate-600 font-normal text-[11px] truncate max-w-[120px]">
                              • {log.booking.parent_name}
                            </span>
                          )}
                        </div>
                        <div className={`mt-0.5 font-medium ${
                          log.success 
                            ? 'text-emerald-700' 
                            : log.status === 'unpaid'
                            ? 'text-amber-800'
                            : 'text-red-700'
                        }`}>
                          {formatFriendlyScanMessage(log.message, log.booking)}
                        </div>
                        {log.booking && (
                          <div className="mt-1.5 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                              <span className="font-extrabold bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                👥 Admit {log.booking.total_persons || (1 + ((log.booking.students || []).length || 1))} Persons
                              </span>
                              <span className="font-bold bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md">
                                🪘 1 Pair Dandiya
                              </span>
                              {log.booking.package && (
                                <span className="font-bold uppercase text-slate-500 text-[10px]">
                                  • {log.booking.package} Pass
                                </span>
                              )}
                            </div>
                            {(log.booking.students || []).length > 0 && (
                              <div className="text-[10px] text-slate-500 font-medium">
                                Students: {log.booking.students.map(s => `${s.name || s.student_name || 'Student'} (${s.admission_no || ''})`).join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      {log.time && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.time}
                        </span>
                      )}
                      {log.booking?.booking_id && (log.booking?.parent_phone || log.booking?.phone) && (
                        <button
                          type="button"
                          disabled={resendingScanWa === log.booking.booking_id}
                          onClick={() => handleResendScanWhatsApp(log.booking.booking_id, log.booking.parent_phone || log.booking.phone)}
                          className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                          title="Resend WhatsApp Pass"
                        >
                          {resendingScanWa === log.booking.booking_id ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-700" />
                          ) : (
                            <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                          )}
                          <span>WhatsApp</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// TAB 5: EVENT & UPI PAYMENT CONFIGURATION
// ==========================================
const SettingsTab = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      let res;
      try {
        res = await api.get('/navrang/admin/config');
      } catch (e) {
        res = await api.get('/navrang/config');
      }
      const data = res.data;
      if (Array.isArray(data.rules)) {
        data.rules = data.rules.join('\n');
      }
      if (data.razorpay_key_secret_masked) {
        data.razorpay_key_secret = data.razorpay_key_secret_masked;
      }
      setConfig(data);
    } catch (error) {
      toast.error('Failed to load configuration');
      setConfig({
        event_name: 'Navrang 2026',
        event_date: '',
        event_time: '',
        venue: 'SDPS Homeground, Patna',
        contact_phone: '',
        is_booking_open: true,
        max_tickets: 1000,
        rules: '',
        upi_id: 'sdpublicpatna@sbi',
        upi_merchant_name: 'S.D. Public School, Patna',
        upi_instructions: '',
        razorpay_enabled: true,
        razorpay_key_id: '',
        razorpay_key_secret: ''
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
      toast.success('Navrang event & 2nd Razorpay settings saved successfully');
      fetchConfig();
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-4xl space-y-6">
      <div>
        <h3 className="font-headline text-xl font-bold text-brand-ink">Event & Payment Gateway Settings</h3>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">Configure event schedule, ticketing rules, dedicated 2nd Razorpay account, and UPI details.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dedicated 2nd Razorpay Account Section (Navrang Only) */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-50/90 via-indigo-50/60 to-purple-50/90 border-2 border-purple-300 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-xs">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <span>2nd Razorpay Account (Exclusive to Navrang)</span>
                  {config.has_razorpay_key_secret || config.razorpay_key_id ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      Configured
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      Keys Needed
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dedicated payment gateway account used ONLY for Navrang pass bookings (separate from school admission/fee account).
                </p>
              </div>
            </div>

            {/* Toggle Razorpay Enabled */}
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3.5 py-1.5 rounded-xl border border-purple-200 shadow-2xs self-start sm:self-auto">
              <input 
                type="checkbox" 
                name="razorpay_enabled"
                checked={config.razorpay_enabled ?? true}
                onChange={handleChange}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-xs font-bold text-purple-900">Enable Razorpay</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Navrang Razorpay Key ID <span className="text-purple-700 font-mono">(rzp_live_... / rzp_test_...)</span>
              </label>
              <input 
                type="text" 
                name="razorpay_key_id" 
                value={config.razorpay_key_id || ''} 
                onChange={handleChange} 
                placeholder="e.g. rzp_live_xxxxxxxxxxxxxx"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-purple-600 outline-none bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">Can also be set in server environment as NAVRANG_RAZORPAY_KEY_ID.</p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Navrang Razorpay Key Secret
                </label>
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[11px] text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
                >
                  {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showSecret ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showSecret ? "text" : "password"} 
                  name="razorpay_key_secret" 
                  value={config.razorpay_key_secret || ''} 
                  onChange={handleChange} 
                  placeholder={config.has_razorpay_key_secret ? "•••••••••••• (Configured — leave blank to keep)" : "Enter 2nd Razorpay Key Secret"}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-purple-600 outline-none bg-white pr-9"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Stored securely. Can also be set in server environment as NAVRANG_RAZORPAY_KEY_SECRET.</p>
            </div>
          </div>
        </div>
        {/* UPI Gateway Section */}
        <div className="p-5 rounded-2xl bg-purple-50/60 border border-purple-200 space-y-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-700" />
            <h4 className="font-bold text-slate-900 text-sm">Direct UPI Payment Gateway Settings</h4>
          </div>
          <p className="text-xs text-slate-600">
            Pass buyers will scan a dynamic QR code pre-filled with this UPI ID and submit their 12-digit UTR number for your approval.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                School UPI ID (VPA) <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="upi_id" 
                value={config.upi_id || ''} 
                onChange={handleChange} 
                placeholder="e.g. sdpublicpatna@sbi"
                required
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-brand-navy outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UPI Merchant / Payee Display Name <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                name="upi_merchant_name" 
                value={config.upi_merchant_name || ''} 
                onChange={handleChange} 
                placeholder="e.g. S.D. Public School, Patna"
                required
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-navy outline-none bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Instructions to Students</label>
            <textarea 
              name="upi_instructions" 
              value={config.upi_instructions || ''} 
              onChange={handleChange} 
              rows="2"
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-brand-navy outline-none bg-white"
              placeholder="Instructions displayed on the payment step..."
            ></textarea>
          </div>
        </div>

        {/* General Event Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Name</label>
            <input 
              type="text" name="event_name" value={config.event_name || ''} onChange={handleChange} required
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Max Passes Available</label>
            <input 
              type="number" name="max_tickets" value={config.max_tickets || 0} onChange={handleChange} required
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date</label>
            <input 
              type="date" name="event_date" value={config.event_date || ''} onChange={handleChange} required
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Time</label>
            <input 
              type="text" name="event_time" value={config.event_time || ''} onChange={handleChange} placeholder="e.g. 6:00 PM - 10:00 PM" required
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Venue</label>
            <input 
              type="text" name="venue" value={config.venue || ''} onChange={handleChange} required
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Helpdesk Contact Phone</label>
            <input 
              type="text" name="contact_phone" value={config.contact_phone || ''} onChange={handleChange}
              className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-brand-navy outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Event Rules & Guidelines (One per line)</label>
          <textarea 
            name="rules" value={config.rules || ''} onChange={handleChange} rows="4"
            className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-brand-navy outline-none"
            placeholder="Only current students of SDPS eligible&#10;Entry only with valid QR code"
          ></textarea>
        </div>

        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <input 
            type="checkbox" id="booking_open" name="booking_open" 
            checked={config.booking_open ?? config.is_booking_open ?? true} onChange={(e) => {
              setConfig(prev => ({ ...prev, booking_open: e.target.checked, is_booking_open: e.target.checked }));
            }}
            className="w-5 h-5 text-brand-navy rounded focus:ring-brand-navy outline-none"
          />
          <label htmlFor="booking_open" className="font-semibold text-slate-900 cursor-pointer flex-1 text-sm">
            Pass Booking Open to Students
          </label>
          <span className="text-xs text-slate-500">Enable or pause new ticket bookings on the website</span>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button 
            type="submit" disabled={saving}
            className="flex items-center gap-2 bg-brand-navy text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 outline-none shadow-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ==========================================
// MAIN ADMIN NAVRANG COMPONENT
// ==========================================
export default function AdminNavrang() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Users },
    { id: 'bookings', label: 'All Bookings', icon: Search },
    { id: 'cash-booking', label: 'Cash Booking (Desk)', icon: Banknote },
    { id: 'roster', label: 'Dandiya Roster', icon: GraduationCap },
    { id: 'scanner', label: 'Gate Scanner', icon: QrCode },
    { id: 'settings', label: 'Settings & UPI', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <Toaster position="top-right" richColors />
      
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold text-slate-900">Navrang 2026 Admin</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Manage bookings, separate Dandiya student roster, desk cash ticketing, UPI UTR payments, and gate scanner check-in.
        </p>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all relative outline-none whitespace-nowrap cursor-pointer ${
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
      <div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'dashboard' && <DashboardTab onBookCash={() => setActiveTab('cash-booking')} />}
            {activeTab === 'bookings' && <BookingsTab onOpenCashBooking={() => setActiveTab('cash-booking')} />}
            {activeTab === 'cash-booking' && <CashBookingTab onBookingComplete={() => {}} />}
            {activeTab === 'roster' && <RosterTab />}
            {activeTab === 'scanner' && <ScannerTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
