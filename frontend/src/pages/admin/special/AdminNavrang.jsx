import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, DollarSign, QrCode, Settings, Search, Download, 
  CheckCircle2, XCircle, AlertCircle, Clock, ChevronLeft, 
  ChevronRight, LogIn, Save, GraduationCap, UploadCloud, 
  Trash2, FileSpreadsheet, Copy, Check, RefreshCw, AlertTriangle,
  Smartphone, Filter, Pencil, Plus, X, Sparkles,
  Camera, CameraOff, SwitchCamera, ScanLine, Volume2, VolumeX, Upload
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
const ScannerTab = () => {
  const [activeMode, setActiveMode] = useState('camera'); // 'camera' | 'manual' | 'upload'
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [currentResult, setCurrentResult] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' | 'user'
  const [cameraError, setCameraError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const isScanningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef(null);

  // Load jsQR dynamically as fallback for older browsers without BarcodeDetector
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.BarcodeDetector && !window.jsQR) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const playSound = (type) => {
    if (!soundEnabled) return;
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
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (e) {
      console.log('Audio feedback not available');
    }
  };

  const addLog = (log) => {
    setLogs(prev => [log, ...prev].slice(0, 30));
  };

  // Main token verification caller
  const verifyToken = async (rawToken) => {
    if (!rawToken || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setLoading(true);
    setCurrentResult(null);

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

    if (navigator?.vibrate) {
      try { navigator.vibrate([100, 50, 100]); } catch (e) {}
    }

    try {
      const { data } = await api.post('/navrang/admin/verify-entry', { 
        qr_token: token,
        booking_id: token
      });
      
      playSound('success');
      setCurrentResult({ success: true, data });
      addLog({ 
        token, 
        success: true, 
        message: 'Entry Verified ✓', 
        data, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
      });
      toast.success(`Entry Granted: ${data.booking?.booking_id || token}`);
    } catch (error) {
      playSound('error');
      const msg = error.response?.data?.detail || 'Verification failed';
      setCurrentResult({ success: false, error: msg });
      addLog({ 
        token, 
        success: false, 
        message: msg, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
      });
      toast.error(msg);
    } finally {
      setLoading(false);
      // Pause 2.5s before allowing next scan to prevent double reading
      setTimeout(() => {
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 2500);
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
        errMsg = 'Camera permission was denied. Please allow camera access in your browser settings to scan QR tickets.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errMsg = 'No camera found on this device. You can use manual entry or upload an image.';
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
  };

  const flipCamera = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
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

    if (video.readyState === video.HAVE_ENOUGH_DATA && !isProcessingRef.current) {
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: SCANNER CONTROLS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
          <div>
            <h3 className="font-headline text-xl font-bold text-brand-ink">Gate QR Scanner</h3>
            <p className="text-slate-500 text-xs">Scan attendee QR pass or enter Booking ID for gate verification</p>
          </div>
          
          {/* Audio toggle button */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`self-start sm:self-auto p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
              soundEnabled ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-50 text-slate-400 border-slate-200'
            }`}
            title={soundEnabled ? 'Sound alerts enabled' : 'Sound muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Beep On' : 'Muted'}</span>
          </button>
        </div>

        {/* MODE TABS */}
        <div className="flex p-1 bg-slate-100 rounded-xl mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveMode('camera');
              if (!cameraActive) startCamera();
            }}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'camera' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Camera</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('manual')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'manual' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'upload' ? 'bg-white text-purple-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* 1. CAMERA SCANNER VIEWPORT */}
        {activeMode === 'camera' && (
          <div className="space-y-4">
            <div className="relative aspect-video sm:aspect-square max-h-[380px] w-full bg-slate-950 rounded-2xl overflow-hidden shadow-md flex items-center justify-center border border-slate-900">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${cameraActive ? 'opacity-100' : 'opacity-0 absolute'}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* CAMERA NOT RUNNING STATE */}
              {!cameraActive && (
                <div className="text-center p-6 text-white space-y-3 max-w-sm">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-amber-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Live Camera QR Scanner</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Point device camera at guest ticket passes (on mobile or printed) for instant check-in.
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
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 inline-flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    Start Camera Scanner
                  </button>
                </div>
              )}

              {/* ACTIVE CAMERA OVERLAY & SCANNING FRAME */}
              {cameraActive && (
                <>
                  {/* Top Bar with Camera Controls */}
                  <div className="absolute top-3 inset-x-3 flex justify-between items-center z-20">
                    <div className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-xs text-green-400 text-[11px] font-bold px-2.5 py-1 rounded-full border border-green-500/30">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                      Scanning Active
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={flipCamera}
                        className="bg-black/60 hover:bg-black/80 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20 inline-flex items-center gap-1 transition-all"
                        title="Switch between front and back camera"
                      >
                        <SwitchCamera className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{cameraFacing === 'environment' ? 'Back' : 'Front'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="bg-red-600/80 hover:bg-red-700 backdrop-blur-xs text-white text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 transition-all"
                      >
                        <CameraOff className="w-3.5 h-3.5" />
                        <span>Stop</span>
                      </button>
                    </div>
                  </div>

                  {/* Center QR Target Reticle */}
                  <div className="relative z-10 w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_25px_rgba(52,211,153,0.3)] pointer-events-none flex flex-col justify-between p-1.5 overflow-hidden">
                    {/* 4 Corner Targeting Marks */}
                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
                      <div className="w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
                    </div>
                    
                    {/* Animated Laser Scanning Line */}
                    <motion.div 
                      animate={{ top: ['5%', '90%', '5%'] }} 
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399]" 
                    />

                    <div className="flex justify-between">
                      <div className="w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
                      <div className="w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />
                    </div>
                  </div>

                  {/* Processing Status Banner */}
                  {isProcessing && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs z-30 flex flex-col items-center justify-center text-white space-y-2">
                      <div className="w-8 h-8 border-3 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                      <span className="text-xs font-bold text-emerald-400">Verifying Ticket Pass...</span>
                    </div>
                  )}

                  <div className="absolute bottom-3 inset-x-3 text-center z-20">
                    <span className="text-[11px] font-medium text-white/80 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
                      Align Ticket QR inside green frame
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enter Booking ID or QR Token
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="e.g. NVR-2026-ABCD"
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-600 outline-none text-base uppercase font-mono"
                />
                <button 
                  type="submit"
                  disabled={loading || !inputValue.trim()}
                  className="bg-purple-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-purple-800 disabled:opacity-50 outline-none transition-all cursor-pointer shadow-md"
                >
                  {loading ? 'Verifying...' : 'Verify Entry'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Also supports handheld USB/Bluetooth barcode gun scanners.
              </p>
            </div>
          </form>
        )}

        {/* 3. UPLOAD QR IMAGE MODE */}
        {activeMode === 'upload' && (
          <div className="space-y-3">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-8 text-center cursor-pointer bg-purple-50/40 hover:bg-purple-50/70 transition-all"
            >
              <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">Click to Select QR Ticket Image</div>
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

        {/* CURRENT VERIFICATION RESULT CARD */}
        <AnimatePresence>
          {currentResult && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-5 p-5 rounded-2xl border transition-all ${
                currentResult.success 
                  ? 'bg-green-50/90 border-green-300 shadow-sm' 
                  : 'bg-red-50/90 border-red-300 shadow-sm'
              }`}
            >
              {currentResult.success ? (
                <div>
                  <div className="flex items-center gap-2 text-green-900 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                    <div>
                      <h4 className="text-base font-extrabold text-green-900">Entry Granted ✓</h4>
                      <span className="text-[11px] font-semibold text-green-700">Valid Navrang 2026 Pass</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-800 mt-3 pt-3 border-t border-green-200">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Booking ID:</span>
                      <strong className="font-mono text-sm text-purple-900">{currentResult.data.booking?.booking_id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Mother / Parent:</span>
                      <span className="font-bold text-slate-800">{currentResult.data.booking?.parent_name} ({currentResult.data.booking?.parent_phone})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-semibold">Pass Package:</span>
                      <Badge status={currentResult.data.booking?.package} />
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-green-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Students Admitted:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(currentResult.data.booking?.students || []).map((s, i) => (
                          <div key={i} className="font-medium text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-green-200 shadow-2xs text-xs">
                            <strong>{s.name || s.student_name}</strong>
                            <span className="font-mono text-slate-500 ml-1 text-[11px]">({s.admission_no})</span>
                            {s.class_name && <span className="text-purple-700 ml-1 text-[10px]">[{s.class_name} {s.section || ''}]</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 text-red-800">
                  <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-base font-extrabold text-red-900">Entry Denied ✕</h4>
                    <p className="text-xs leading-relaxed mt-0.5 font-medium">{currentResult.error}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* RIGHT: LIVE CHECK-IN LOGS */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-headline text-lg font-bold text-brand-ink">Live Check-in Logs</h3>
              <p className="text-slate-400 text-xs">Real-time gate scans recorded during this session</p>
            </div>
            {logs.length > 0 && (
              <span className="text-[11px] font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                {logs.length} Scans
              </span>
            )}
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-xs">
                <ScanLine className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-medium">No scan events recorded yet in this session.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Start the live camera or enter a booking ID to verify.</p>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start justify-between p-3 rounded-xl border text-xs transition-all ${
                    log.success ? 'bg-green-50/70 border-green-200' : 'bg-red-50/70 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {log.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-slate-900 font-mono flex items-center gap-1.5">
                        <span>{log.token}</span>
                        {log.data?.booking?.parent_name && (
                          <span className="text-slate-600 font-normal text-[11px] truncate max-w-[120px]">
                            • {log.data.booking.parent_name}
                          </span>
                        )}
                      </div>
                      <div className={`mt-0.5 ${log.success ? 'text-green-700 font-medium' : 'text-red-700'}`}>
                        {log.message}
                      </div>
                    </div>
                  </div>
                  {log.time && (
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                      {log.time}
                    </span>
                  )}
                </div>
              ))
            )}
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
          Manage bookings, separate Dandiya student roster, UPI UTR payments, and gate scanner check-in.
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
