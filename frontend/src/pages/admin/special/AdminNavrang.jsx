import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, DollarSign, QrCode, Settings, Search, Download, 
  CheckCircle2, XCircle, AlertCircle, Clock, ChevronLeft, 
  ChevronRight, LogIn, Save, GraduationCap, UploadCloud, 
  Trash2, FileSpreadsheet, Copy, Check, RefreshCw, AlertTriangle,
  Smartphone, Filter
} from 'lucide-react';
import { toast, Toaster } from 'sonner';
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

// ==========================================
// TAB 1: DASHBOARD
// ==========================================
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
              <h3 className="text-3xl font-bold text-green-700 mt-2">₹{stats.total_revenue || 0}</h3>
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
              <h3 className="text-3xl font-bold text-amber-600 mt-2">{stats.pending_payments || 0}</h3>
            </div>
            <div className="p-3 bg-yellow-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
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
                  <th className="py-3 px-4 rounded-tr-lg">Date</th>
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
                    <td className="py-3 px-4 text-xs">{new Date(booking.created_at).toLocaleDateString()}</td>
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
const BookingsTab = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [copiedUtr, setCopiedUtr] = useState(null);
  
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
      await api.post(`/navrang/admin/bookings/${bookingId}/action`, { action });
      toast.success(`Booking ${bookingId} updated (${action})`);
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
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
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
                        <div className="text-xs text-slate-500 font-mono">{booking.parent_phone || booking.phone}</div>
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
                          {booking.payment_status === 'pending' && (
                            <>
                              <button 
                                disabled={isBusy}
                                onClick={() => updateBookingStatus(bId, 'verify_paid')}
                                className="text-xs bg-green-600 hover:bg-green-700 text-white font-semibold px-2.5 py-1 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                                title="Verify UTR and mark as Paid"
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
            <h3 className="font-headline text-xl font-bold text-brand-ink flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-brand-navy" />
              SDPS Student Eligibility Roster
            </h3>
            <p className="text-slate-500 text-xs md:text-sm mt-0.5">
              Only students present in this roster can authenticate their admission number to book passes on Navrang.
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
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Roster Overview</div>
              <div className="text-3xl font-black text-slate-900">{total}</div>
              <div className="text-xs text-slate-500 mt-1">Total Verified Students Eligible for Navrang 2026 Passes</div>
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
                        <button 
                          onClick={() => handleDeleteStudent(st.admission_no)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Remove student from roster"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
      </div>
    </div>
  );
};

// ==========================================
// TAB 4: GATE SCANNER
// ==========================================
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
        <h3 className="font-headline text-xl font-bold text-brand-ink mb-1">Gate Scanner</h3>
        <p className="text-slate-500 mb-6 text-xs md:text-sm">Scan physical/digital QR code or manually enter Booking ID</p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Booking ID / QR Token</label>
            <div className="flex gap-2">
              <input 
                type="text"
                autoFocus
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g. NVR-2026-ABCD"
                className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-brand-navy outline-none text-base uppercase font-mono"
              />
              <button 
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="bg-brand-navy text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 outline-none"
              >
                {loading ? 'Verifying...' : 'Verify Entry'}
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
              className={`mt-6 p-5 rounded-2xl border ${currentResult.success ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}
            >
              {currentResult.success ? (
                <div>
                  <div className="flex items-center gap-2 text-green-800 mb-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                    <h4 className="text-lg font-bold">Entry Granted ✓</h4>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-800">
                    <p><span className="text-slate-500 font-semibold">Booking ID:</span> <strong className="font-mono">{currentResult.data.booking.booking_id}</strong></p>
                    <p><span className="text-slate-500 font-semibold">Mother / Parent:</span> {currentResult.data.booking.parent_name} ({currentResult.data.booking.parent_phone})</p>
                    <p className="flex items-center gap-2"><span className="text-slate-500 font-semibold">Package:</span> <Badge status={currentResult.data.booking.package} /></p>
                    <div className="mt-2 pt-2 border-t border-green-200">
                      <p className="text-xs font-semibold text-slate-600 mb-1">Students Admitted:</p>
                      {(currentResult.data.booking.students || []).map((s, i) => (
                        <div key={i} className="font-medium text-slate-900 bg-white/70 px-2 py-1 rounded inline-block mr-1">
                          {s.name} <span className="font-mono text-slate-500">({s.admission_no})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-red-700">
                  <XCircle className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-base font-bold mb-1">Entry Denied</h4>
                    <p className="text-xs leading-relaxed">{currentResult.error}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-headline text-lg font-bold text-brand-ink mb-4">Live Check-in Logs</h3>
        <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-400 text-center py-8 text-xs">No scan events recorded yet in this session.</p>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${log.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                {log.success ? <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />}
                <div>
                  <div className="font-bold text-slate-900 font-mono">{log.token}</div>
                  <div className={`mt-0.5 ${log.success ? 'text-green-700' : 'text-red-700'}`}>{log.message}</div>
                </div>
              </div>
            ))
          )}
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
        is_booking_open: true,
        max_tickets: 1000,
        rules: '',
        upi_id: 'sdpublicpatna@sbi',
        upi_merchant_name: 'S.D. Public School, Patna',
        upi_instructions: ''
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
      toast.success('Event & UPI settings saved successfully');
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
        <h3 className="font-headline text-xl font-bold text-brand-ink">Event & UPI Gateway Settings</h3>
        <p className="text-slate-500 text-xs md:text-sm mt-0.5">Configure event schedule, ticketing rules, and custom school UPI payment details.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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
    { id: 'roster', label: 'Student Roster', icon: GraduationCap },
    { id: 'scanner', label: 'Gate Scanner', icon: QrCode },
    { id: 'settings', label: 'Settings & UPI', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-transparent pb-16">
      <Toaster position="top-right" richColors />
      
      <div className="mb-6">
        <h1 className="text-3xl font-headline font-bold text-slate-100">Navrang 2026 Admin</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Manage bookings, verify student roster & eligibility, process UPI UTR payments, and check gate entries.
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all relative outline-none whitespace-nowrap ${
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
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'bookings' && <BookingsTab />}
            {activeTab === 'roster' && <RosterTab />}
            {activeTab === 'scanner' && <ScannerTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
