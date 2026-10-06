import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  Ticket, 
  CheckCircle2, 
  UserCheck, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  Copy,
  Check,
  PartyPopper,
  Printer,
  Smartphone,
  ShieldCheck,
  HelpCircle,
  Clock,
  Sparkles,
  MessageSquare,
  Search,
  Phone,
  User,
  HeartHandshake,
  Info,
  Pencil,
  CreditCard,
  Zap,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import NavrangNavbar from '@/components/layout/NavrangNavbar';
import WalletPassButton from '@/components/festive/WalletPassButton';

function loadRazorpay() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const DEFAULT_PACKAGES = [
  { 
    id: 'silver', 
    name: 'Silver Pass', 
    price: 299, 
    children: 1, 
    badge: '1 Student Pass',
    desc: 'Admits 1 SDPS Student + 1 Mother + 1 Pair Dandiya Sticks',
    color: 'from-slate-100 to-slate-200 border-slate-300' 
  },
  { 
    id: 'gold', 
    name: 'Gold Pass', 
    price: 399, 
    children: 2, 
    badge: 'Most Popular',
    desc: 'Admits 2 SDPS Students + 1 Mother + 1 Pair Dandiya Sticks',
    color: 'from-amber-100 to-yellow-100 border-amber-400' 
  },
  { 
    id: 'platinum', 
    name: 'Platinum Pass', 
    price: 499, 
    children: 3, 
    badge: 'Best Value',
    desc: 'Admits 3 SDPS Students + 1 Mother + 1 Pair Dandiya Sticks',
    color: 'from-purple-100 to-indigo-100 border-indigo-400' 
  },
];

const steps = [
  { id: 1, name: 'Pass', icon: Ticket },
  { id: 2, name: 'Student Lookup', icon: Search },
  { id: 3, name: 'Parent & WhatsApp', icon: MessageSquare },
  { id: 4, name: 'Payment', icon: CreditCard },
  { id: 5, name: 'Ticket Pass', icon: CheckCircle2 },
];

export default function NavrangBook() {
  const isSubdomain = typeof window !== "undefined" && (
    window.location.hostname.startsWith("navrang.") ||
    window.location.hostname.startsWith("navrang-") ||
    window.location.hostname === "navrang.localhost"
  );

  const [step, setStep] = useState(1);
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [students, setStudents] = useState([]);
  const [parentDetails, setParentDetails] = useState({ name: '', phone: '', email: '' });
  
  // Payment Gateway states (2nd Razorpay Account - 100% Automated Instant Verification)
  const [razorpayConfig, setRazorpayConfig] = useState({ enabled: true, key_id: '' });
  const [pendingBookingId, setPendingBookingId] = useState(() => {
    try {
      return sessionStorage.getItem('navrang_pending_booking') || '';
    } catch (e) {
      return '';
    }
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const [bookingResult, setBookingResult] = useState(null);
  const [isVerifyingIdx, setIsVerifyingIdx] = useState(null);
  const [editingPhoneIdx, setEditingPhoneIdx] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState(null);

  // Fetch event config (2nd Razorpay account, packages)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get('/navrang/config');
        if (data.razorpay_key_id) {
          setRazorpayConfig({
            enabled: data.razorpay_enabled !== false,
            key_id: data.razorpay_key_id
          });
        }
        if (data.packages) {
          const list = Object.entries(data.packages).map(([key, pkg]) => ({
            id: key,
            name: pkg.name || `${key.toUpperCase()} Pass`,
            price: pkg.price,
            children: pkg.children,
            badge: pkg.children === 1 ? '1 Student Pass' : pkg.children === 2 ? 'Most Popular' : 'Best Value',
            desc: pkg.desc || `Admits ${pkg.children} Student(s) + 1 Mother + 1 Pair Dandiya Sticks`,
            color: key === 'silver' ? 'from-slate-100 to-slate-200 border-slate-300' :
                   key === 'gold' ? 'from-amber-100 to-yellow-100 border-amber-400' :
                   'from-purple-100 to-indigo-100 border-indigo-400'
          }));
          if (list.length > 0) setPackages(list);
        }
      } catch (err) {
        console.warn('Could not load dynamic Navrang config; using defaults.', err);
      }
    };
    fetchConfig();
  }, []);

  // Initialize student slots whenever package changes
  useEffect(() => {
    if (selectedPackage) {
      const pkg = packages.find(p => p.id === selectedPackage);
      if (pkg) {
        setStudents(Array.from({ length: pkg.children }, () => ({
          admission_no: '',
          verified: false,
          data: null,
          error: null
        })));
      }
    }
  }, [selectedPackage, packages]);

  const handleAdmissionNoChange = (index, value) => {
    const newStudents = [...students];
    newStudents[index] = { 
      ...newStudents[index], 
      admission_no: value, 
      verified: false, 
      data: null, 
      error: null 
    };
    setStudents(newStudents);
  };

  const fetchStudentDataByAdmissionNo = async (index) => {
    const student = students[index];
    const adm = (student.admission_no || '').trim();

    if (!adm) {
      const newStudents = [...students];
      newStudents[index].error = 'Please enter an admission number.';
      setStudents(newStudents);
      return;
    }

    try {
      setIsVerifyingIdx(index);
      const newStudents = [...students];
      newStudents[index].error = null;
      setStudents(newStudents);

      const res = await api.post('/navrang/verify-student', { admission_no: adm });
      
      const stData = res.data.student;
      const updated = [...students];
      updated[index] = { 
        ...updated[index], 
        verified: true, 
        data: stData,
        error: null
      };
      setStudents(updated);

      // Pre-fill parent details from first student's record if empty
      setParentDetails(prev => {
        const cleanPhone = (stData.phone || stData.contact_no || '').replace(/\D/g, '').slice(-10);
        return {
          name: prev.name || stData.mother_name || stData.father_name || '',
          phone: prev.phone || cleanPhone || '',
          email: prev.email || ''
        };
      });
    } catch (err) {
      const updated = [...students];
      updated[index] = { 
        ...updated[index], 
        verified: false, 
        error: err.response?.data?.detail || 'Admission number not found in school records. Please check and try again.' 
      };
      setStudents(updated);
    } finally {
      setIsVerifyingIdx(null);
    }
  };

  const allVerified = students.length > 0 && students.every(s => s.verified);

  const selectedPkgObj = packages.find(p => p.id === selectedPackage) || packages[0];
  const totalPrice = selectedPkgObj?.price || 299;

  // Automated payment status verification check
  const handleAutoVerify = async (targetId) => {
    const bId = targetId || pendingBookingId || (typeof window !== 'undefined' ? sessionStorage.getItem('navrang_pending_booking') : '');
    if (!bId) {
      toast.error('No pending booking reference found. Please proceed with payment.');
      return;
    }
    try {
      setIsCheckingStatus(true);
      setError(null);
      const res = await api.post('/navrang/check-payment-status', { 
        booking_id: bId,
        phone: parentDetails.phone 
      });
      if (res.data?.is_paid && res.data?.booking) {
        toast.success('🎉 Payment verified via Razorpay! Pass activated.');
        if (typeof window !== 'undefined') sessionStorage.removeItem('navrang_pending_booking');
        setBookingResult(res.data.booking);
        setStep(5);
      } else {
        toast.info(res.data?.message || 'Payment not yet confirmed by Razorpay. If you completed payment in your UPI app, please wait a few seconds and try again.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not verify payment status with Razorpay.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handlePayWithRazorpay = async () => {
    try {
      setIsBooking(true);
      setError(null);

      // 1. Submit booking reservation first
      const payload = {
        package: selectedPackage,
        package_id: selectedPackage,
        parent_name: parentDetails.name.trim(),
        parent_phone: parentDetails.phone.trim(),
        phone: parentDetails.phone.trim(),
        parent_email: parentDetails.email.trim(),
        email: parentDetails.email.trim(),
        payment_method: 'Razorpay Online',
        payment_ref: 'pending',
        students: students.map(s => ({
          admission_no: s.data?.admission_no || s.admission_no,
          student_name: s.data?.name || s.data?.student_name || ''
        }))
      };

      const bookingRes = await api.post('/navrang/book', payload);
      const bookingData = bookingRes.data;
      const bookingId = bookingData.booking_id;
      setPendingBookingId(bookingId);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('navrang_pending_booking', bookingId);
      }

      // 2. Load Razorpay checkout script
      const sdkReady = await loadRazorpay();
      if (!sdkReady) {
        setError('Could not load Razorpay payment SDK. Please check your internet connection.');
        setIsBooking(false);
        return;
      }

      // 3. Obtain Razorpay Order details (from /book response or create-order)
      let order = bookingData.razorpay_order;
      if (!order || !order.order_id) {
        const orderRes = await api.post('/navrang/create-order', { booking_id: bookingId });
        order = orderRes.data;
      }

      // 4. Open Razorpay Checkout modal
      const rzpOptions = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'S.D. Public School, Patna',
        description: `Navrang 2026 Pass - ${selectedPkgObj?.name || ''}`,
        order_id: order.order_id,
        prefill: {
          name: parentDetails.name,
          contact: parentDetails.phone,
          email: parentDetails.email || ''
        },
        theme: {
          color: '#581C87'
        },
        handler: async (resp) => {
          try {
            setIsBooking(true);
            const verifyRes = await api.post('/navrang/verify-payment', {
              booking_id: bookingId,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature
            });

            toast.success('🎉 Payment Verified! Your entry QR pass is active.');
            if (typeof window !== 'undefined') {
              sessionStorage.removeItem('navrang_pending_booking');
            }
            setBookingResult(verifyRes.data.booking || {
              ...bookingData,
              payment_status: 'paid',
              payment_ref: resp.razorpay_payment_id
            });
            setStep(5);
          } catch (verErr) {
            setError(verErr.response?.data?.detail || 'Payment verification failed. If money was deducted, click "Auto-Verify with Razorpay" below.');
          } finally {
            setIsBooking(false);
          }
        },
        modal: {
          ondismiss: () => {
            setIsBooking(false);
            toast.info('Payment window closed. If you completed payment in your UPI app, click "Auto-Verify with Razorpay" below.');
          }
        }
      };

      const rzpInstance = new window.Razorpay(rzpOptions);
      rzpInstance.on('payment.failed', function (resp) {
        setError(`Payment Failed: ${resp.error?.description || 'Transaction was declined'}`);
        setIsBooking(false);
      });
      rzpInstance.open();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initiate online payment.');
      setIsBooking(false);
    }
  };

  const slideVariants = {
    initial: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-brand-navy selection:bg-brand-orange selection:text-white pb-16">
      <Helmet>
        <title>Book Navrang 2026 Passes | S.D. Public School, Patna</title>
        <meta name="description" content="Exclusive online Dandiya Raas & Durga Puja night pass booking for students and parents of S.D. Public School, Patna." />
        <link rel="canonical" href="https://navrang.sdpublic.org/book" />

        {/* OpenGraph / WhatsApp / Facebook / Telegram */}
        <meta property="og:site_name" content="Navrang 2026 — S.D. Public School, Patna" />
        <meta property="og:title" content="Book Navrang 2026 Passes | S.D. Public School" />
        <meta property="og:description" content="Exclusive online Dandiya Raas & Durga Puja night pass booking for students and parents of S.D. Public School, Patna." />
        <meta property="og:image" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta property="og:image:secure_url" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="576" />
        <meta property="og:image:alt" content="Navrang 2026 Dandiya Night Celebration" />
        <meta property="og:url" content="https://navrang.sdpublic.org/book" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Book Navrang 2026 Passes | S.D. Public School" />
        <meta name="twitter:description" content="Exclusive online Dandiya Raas & Durga Puja night pass booking for students and parents of S.D. Public School, Patna." />
        <meta name="twitter:image" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta name="twitter:image:alt" content="Navrang 2026 Dandiya Night Celebration" />
      </Helmet>

      {/* Shared School-Styled Navrang Header */}
      <NavrangNavbar activePage="book" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white py-10 px-4 text-center shadow-lg relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400 via-fuchsia-500 to-transparent pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Official SDPS Student Booking Portal
          </span>
          <h1 className="text-3xl md:text-5xl font-outfit font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 mb-2">
            Navrang 2026 Passes
          </h1>
          <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto">
            Dandiya & Durga Puja Celebration Night • SDPS Homeground • Instant WhatsApp Pass
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8 -mt-6">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
          
          {/* Stepper */}
          <div className="bg-gradient-to-r from-purple-50/70 via-white to-purple-50/70 border-b border-purple-100 p-3 sm:p-4">
            <div className="flex justify-between items-center max-w-2xl mx-auto">
              {steps.map((s, idx) => (
                <div key={s.id} className="flex flex-col items-center relative z-10 flex-1">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    step > s.id ? 'bg-green-600 border-green-600 text-white shadow-md' :
                    step === s.id ? 'bg-purple-700 border-purple-700 text-white shadow-lg ring-4 ring-purple-100' :
                    'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {step > s.id ? <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" /> : <s.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </div>
                  <span className={`text-[11px] mt-1.5 font-semibold hidden sm:block ${
                    step === s.id ? 'text-purple-900 font-bold' :
                    step > s.id ? 'text-green-700' : 'text-slate-400'
                  }`}>
                    {s.name}
                  </span>
                  
                  {/* Connecting Line */}
                  {idx < steps.length - 1 && (
                    <div className={`absolute top-4 sm:top-5 left-1/2 w-full h-[2px] -z-10 ${
                      step > s.id ? 'bg-green-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Current Step Banner */}
            <div className="text-center sm:hidden mt-2 pt-1 border-t border-purple-100/60">
              <span className="text-[11px] font-bold text-purple-900">
                Step {step} of 4: {steps.find(s => s.id === step)?.name}
              </span>
            </div>
          </div>

          {/* Form Area */}
          <div className="p-4 sm:p-6 md:p-8 min-h-[460px]">
            <AnimatePresence mode="wait">
              {/* STEP 1: SELECT PACKAGE */}
              {step === 1 && (
                <motion.div key="step1" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-outfit font-extrabold text-slate-900">Choose Your Pass Package</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Passes are exclusively for current students of S.D. Public School and their mothers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 pt-2">
                    {packages.map(pkg => {
                      const isSelected = selectedPackage === pkg.id;
                      return (
                        <div 
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg.id)}
                          className={`cursor-pointer rounded-2xl p-4 sm:p-5 border-2 transition-all duration-200 relative flex flex-col justify-between ${
                            isSelected 
                              ? 'border-purple-600 bg-purple-50/60 shadow-lg ring-2 ring-purple-500/20 scale-[1.01] sm:scale-[1.02]' 
                              : 'border-slate-200 hover:border-purple-300 bg-white hover:shadow-md'
                          }`}
                        >
                          {pkg.badge && (
                            <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                              {pkg.badge}
                            </div>
                          )}

                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wider text-purple-800 mb-1">
                              SDPS Celebration
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900">{pkg.name}</h3>
                            <div className="text-2xl sm:text-3xl font-black text-purple-700 my-2 sm:my-3">
                              ₹{pkg.price}
                            </div>
                            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                              {pkg.desc}
                            </p>
                          </div>

                          <div className="border-t border-slate-200/80 pt-3 space-y-1.5 text-xs text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                              <span>Admits {pkg.children} Student{pkg.children > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                              <span>1 Mother / Guardian</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                              <span>1 Pair Dandiya Sticks</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button 
                      disabled={!selectedPackage}
                      onClick={() => setStep(2)}
                      className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 active:scale-98 text-white px-8 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <span>Enter Admission No</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: ENTER ADMISSION NO -> FETCH & SHOW STUDENT DETAILS */}
              {step === 2 && (
                <motion.div key="step2" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                      Current SDPS Student Verification
                    </div>
                    <h2 className="text-2xl md:text-3xl font-outfit font-extrabold text-slate-900">
                      Enter Student Admission Number
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                      Enter the admission number (e.g. <strong>SDPS2</strong> or <strong>2</strong>) to automatically fetch student, parent, and contact details from school records.
                    </p>
                  </div>

                  <div className="space-y-5 max-w-2xl mx-auto">
                    {students.map((student, idx) => (
                      <div 
                        key={idx} 
                        className={`p-5 rounded-2xl border transition-all ${
                          student.verified 
                            ? 'bg-green-50/70 border-green-300 ring-1 ring-green-400/30' 
                            : student.error 
                              ? 'bg-red-50/40 border-red-300' 
                              : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                            Student Slot {idx + 1} of {students.length}
                          </span>
                          {student.verified && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Verified in School Roster
                            </span>
                          )}
                        </div>

                        {!student.verified ? (
                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Admission Number <span className="text-red-500">*</span>
                              </label>
                              <div className="flex gap-2">
                                <input 
                                  type="text"
                                  value={student.admission_no}
                                  onChange={(e) => handleAdmissionNoChange(idx, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      fetchStudentDataByAdmissionNo(idx);
                                    }
                                  }}
                                  placeholder="e.g. SDPS2 or 2"
                                  inputMode="text"
                                  autoCapitalize="characters"
                                  autoCorrect="off"
                                  spellCheck={false}
                                  className="flex-1 min-w-0 px-3.5 sm:px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none uppercase"
                                />
                                <button 
                                  type="button"
                                  onClick={() => fetchStudentDataByAdmissionNo(idx)}
                                  disabled={!student.admission_no?.trim() || isVerifyingIdx === idx}
                                  className="bg-brand-navy hover:bg-slate-800 active:scale-95 text-white text-xs font-semibold px-4 sm:px-5 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
                                >
                                  {isVerifyingIdx === idx ? (
                                    <>
                                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      <span>Fetching...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Search className="w-3.5 h-3.5" />
                                      <span>Fetch Details</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {student.error && (
                              <div className="p-3 bg-red-100/80 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{student.error}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Detailed Student & Family Card Loaded from Roster */
                          <div className="bg-white p-5 rounded-xl border border-green-200 shadow-sm space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-lg shrink-0">
                                  {student.data?.name?.charAt(0) || '✓'}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-900 text-base md:text-lg">
                                    {student.data?.name}
                                  </div>
                                  <div className="text-xs text-purple-700 font-semibold mt-0.5 flex flex-wrap gap-2">
                                    <span className="bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                      Class: {student.data?.class_name || 'N/A'} {student.data?.section ? `Sec ${student.data.section}` : ''}
                                    </span>
                                    {student.data?.roll_no && (
                                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                                        Roll No: {student.data.roll_no}
                                      </span>
                                    )}
                                    <span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-700">
                                      Adm: {student.data?.admission_no}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <button 
                                type="button"
                                onClick={() => {
                                  const newSt = [...students];
                                  newSt[idx] = { admission_no: '', verified: false, data: null, error: null };
                                  setStudents(newSt);
                                }}
                                className="text-xs text-slate-400 hover:text-red-600 underline font-medium"
                              >
                                Change
                              </button>
                            </div>

                            {/* Family Details fetched from Roster */}
                            <div className="grid sm:grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 text-xs">
                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                  Father's Name
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {student.data?.father_name || 'N/A'}
                                </span>
                              </div>

                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                  Mother's Name
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {student.data?.mother_name || 'N/A'}
                                </span>
                              </div>

                              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] uppercase font-bold text-slate-400">
                                    Contact / Phone No.
                                  </span>
                                  {editingPhoneIdx !== idx ? (
                                    <button
                                      type="button"
                                      onClick={() => setEditingPhoneIdx(idx)}
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded transition-all cursor-pointer"
                                      title="Click to change phone number"
                                    >
                                      <Pencil className="w-3 h-3 text-purple-600" />
                                      <span>Change</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditingPhoneIdx(null)}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 hover:text-green-900 bg-green-100 px-2 py-0.5 rounded transition-all cursor-pointer"
                                    >
                                      <Check className="w-3 h-3" /> Done
                                    </button>
                                  )}
                                </div>
                                {editingPhoneIdx === idx ? (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <span className="text-xs font-bold text-slate-400">+91</span>
                                    <input
                                      type="tel"
                                      inputMode="tel"
                                      autoComplete="tel"
                                      maxLength="10"
                                      value={student.data?.phone || student.data?.contact_no || ''}
                                      onChange={(e) => {
                                        const clean = e.target.value.replace(/\D/g, '');
                                        const newSt = [...students];
                                        newSt[idx] = {
                                          ...newSt[idx],
                                          data: {
                                            ...newSt[idx].data,
                                            phone: clean,
                                            contact_no: clean
                                          }
                                        };
                                        setStudents(newSt);
                                        setParentDetails(prev => ({ ...prev, phone: clean }));
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          setEditingPhoneIdx(null);
                                        }
                                      }}
                                      placeholder="10-digit mobile"
                                      className="w-full px-2 py-1 text-xs font-mono font-bold border-2 border-purple-500 rounded bg-white focus:outline-none"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setEditingPhoneIdx(null)}
                                      className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white text-[11px] font-bold px-2.5 py-1 rounded shrink-0 shadow-xs cursor-pointer"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <span className="font-mono font-bold text-slate-800 text-sm">
                                    {student.data?.phone || student.data?.contact_no || 'N/A'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Contact Number Note */}
                            <div className="mt-3 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 shadow-sm">
                              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="leading-relaxed">
                                <strong className="font-bold text-amber-950 block">
                                  Please check the contact number:
                                </strong>
                                <p className="mt-0.5 text-amber-900">
                                  If this phone number is incorrect or outdated, <strong>you can click Change above to edit it now, or in the next step</strong>. This number is used for sending your pass booking details, official QR entry tickets on WhatsApp, and gate verification.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 max-w-2xl mx-auto pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => setStep(1)}
                      className="w-full sm:w-auto text-slate-600 px-5 py-3 sm:py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-98 transition-colors text-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> <span>Back to Passes</span>
                    </button>
                    <button 
                      disabled={!allVerified}
                      onClick={() => setStep(3)}
                      className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 active:scale-98 text-white px-7 py-3 sm:py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm cursor-pointer"
                    >
                      <span>Proceed to Contact & WhatsApp</span> <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: PARENT & WHATSAPP CONFIRMATION DETAILS (PHONE IS USER-CHANGEABLE) */}
              {step === 3 && (
                <motion.div key="step3" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 mb-2 border border-green-200">
                      <MessageSquare className="w-3.5 h-3.5 text-green-700" />
                      WhatsApp Pass Confirmation Notification
                    </div>
                    <h2 className="text-2xl md:text-3xl font-outfit font-extrabold text-slate-900">
                      Parent & WhatsApp Contact
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                      Pre-filled with your school records. You can update the WhatsApp number if you prefer to receive your booking message on a different mobile number.
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mother / Guardian Full Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        autoComplete="name"
                        autoCapitalize="words"
                        value={parentDetails.name}
                        onChange={(e) => setParentDetails({...parentDetails, name: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        placeholder="e.g. Smt. Sunita Sharma"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          WhatsApp / Mobile Number for Pass Confirmation <span className="text-red-500">*</span>
                        </label>
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                          ✏️ Changeable if incorrect
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+91</span>
                        <input 
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          maxLength="10"
                          value={parentDetails.phone}
                          onChange={(e) => setParentDetails({...parentDetails, phone: e.target.value.replace(/\D/g,'')})}
                          className="w-full pl-12 pr-4 py-2.5 rounded-xl border-2 border-green-500 text-sm font-mono font-bold focus:ring-2 focus:ring-green-500 focus:border-green-600 outline-none bg-green-50/20"
                          placeholder="9876543210"
                          required
                        />
                      </div>
                      <div className="mt-2.5 p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5 shadow-sm">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <strong className="font-bold text-amber-950 block">
                            Verify your mobile number:
                          </strong>
                          <p className="mt-0.5 text-amber-900">
                            If the number fetched from school records is incorrect or you want to receive details on another mobile, <strong>feel free to change it above</strong>. This phone number will be used for all pass booking details, official WhatsApp confirmation, and QR gate passes.
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 p-2.5 rounded-xl bg-green-50 border border-green-200 text-green-900 text-xs flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                        <span>
                          <strong>WhatsApp Delivery:</strong> We will automatically send your booking confirmation and digital QR pass link to <strong>+91 {parentDetails.phone || '...'}</strong> upon booking.
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <input 
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={parentDetails.email}
                        onChange={(e) => setParentDetails({...parentDetails, email: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        placeholder="parent@example.com"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 max-w-xl mx-auto pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => setStep(2)}
                      className="w-full sm:w-auto text-slate-600 px-5 py-3 sm:py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-100 active:scale-98 transition-colors text-sm cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> <span>Back to Students</span>
                    </button>
                    <button 
                      disabled={!parentDetails.name?.trim() || parentDetails.phone?.length !== 10}
                      onClick={() => setStep(4)}
                      className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 active:scale-98 text-white px-7 py-3 sm:py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm cursor-pointer"
                    >
                      <span>Proceed to Payment</span> <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: 100% AUTOMATED RAZORPAY PAYMENT (INSTANT AUTO-VERIFICATION & ZERO MANUAL UTR WAITING) */}
              {step === 4 && (
                <motion.div key="step4" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 mb-2 border border-emerald-200">
                      <Zap className="w-3.5 h-3.5 text-emerald-700 fill-emerald-600" />
                      100% Automated Instant Verification
                    </div>
                    <h2 className="text-2xl md:text-3xl font-outfit font-extrabold text-slate-900">
                      Review & Pay • ₹{totalPrice}
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                      Pay securely via Google Pay, PhonePe, Paytm, Any UPI, Cards, or NetBanking. Pass is auto-verified in real-time.
                    </p>
                  </div>

                  <div className="max-w-xl mx-auto bg-gradient-to-b from-purple-50/60 to-white rounded-2xl p-5 md:p-6 border border-purple-200 shadow-sm space-y-6">
                    {/* Booking Breakdown Card */}
                    <div className="bg-white p-4 rounded-xl border border-purple-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-sm shadow-xs">
                      <div>
                        <div className="font-bold text-slate-900 text-base">{selectedPkgObj?.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Students: {students.map(s => s.data?.name || s.admission_no).join(', ')}
                        </div>
                        <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Venue: <strong className="text-slate-800">SDPS Homeground, Patna</strong> • Oct 15 (6:00 PM)</span>
                        </div>
                        <div className="text-xs text-purple-700 font-medium mt-1.5 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          <span>WhatsApp Pass to: <strong className="text-slate-900 font-mono font-bold">+91 {parentDetails.phone}</strong></span>
                          <button 
                            type="button" 
                            onClick={() => setStep(3)} 
                            className="text-[11px] text-purple-600 hover:text-purple-800 underline ml-1 font-semibold cursor-pointer"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                      <div className="text-2xl font-black text-purple-700 shrink-0">
                        ₹{totalPrice}
                      </div>
                    </div>

                    {/* Auto-activation Highlight Banner */}
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-950 flex items-start gap-3 shadow-xs">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                        <Zap className="w-5 h-5 fill-white" />
                      </div>
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-emerald-900 block text-sm">
                          ⚡ Instant QR Gate Pass Activation
                        </span>
                        <p className="text-emerald-800 leading-relaxed">
                          Your pass is <strong>automatically verified and activated immediately</strong> by Razorpay upon completion. No manual UTR entry or admin verification needed!
                        </p>
                      </div>
                    </div>

                    {/* Accepted Payment Methods */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-center space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Supported Payment Options
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <Smartphone className="w-3.5 h-3.5 text-purple-600" /> UPI (GPay, PhonePe, Paytm, BHIM)
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Credit / Debit Cards
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> NetBanking (50+ Banks)
                        </span>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-50 text-red-600 p-3.5 rounded-xl flex items-center gap-2.5 text-xs border border-red-200">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Main Instant Pay CTA */}
                    <div className="pt-1 space-y-3">
                      <button
                        type="button"
                        onClick={handlePayWithRazorpay}
                        disabled={isBooking || isCheckingStatus}
                        className="w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white py-4 px-6 rounded-2xl font-bold text-base shadow-xl shadow-purple-900/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-60"
                      >
                        {isBooking ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Opening Secure Payment Gateway...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                            <span>Pay ₹{totalPrice} & Activate Instant Pass</span>
                          </>
                        )}
                      </button>

                      {/* Fallback Auto-Verify button if user paid and closed window or pending booking exists */}
                      {pendingBookingId && (
                        <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/90 text-center space-y-2">
                          <div className="text-xs text-amber-950 font-medium">
                            Already completed payment in UPI / Razorpay but closed the window?
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAutoVerify(pendingBookingId)}
                            disabled={isCheckingStatus || isBooking}
                            className="inline-flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-60"
                          >
                            {isCheckingStatus ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Verifying with Razorpay...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5" />
                                <span>⚡ Auto-Verify with Razorpay ({pendingBookingId})</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Dedicated Navrang 2026 Razorpay Account • 256-bit SSL Bank Encrypted</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                      <button 
                        type="button"
                        onClick={() => setStep(3)}
                        disabled={isBooking || isCheckingStatus}
                        className="text-slate-600 px-4 py-2.5 rounded-xl font-medium flex items-center gap-1.5 hover:bg-slate-100 transition-colors text-xs cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back to Details
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: BOOKING CONFIRMATION & QR PASS */}
              {step === 5 && bookingResult && (
                <motion.div key="step5" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="text-center py-6">
                  <div className="relative inline-block mb-4">
                    <div className="absolute inset-0 bg-amber-400 blur-xl opacity-40 rounded-full animate-pulse"></div>
                    <PartyPopper className="w-16 h-16 text-brand-orange relative z-10 mx-auto" />
                  </div>
                  
                  <h2 className="text-2xl md:text-3xl font-outfit font-extrabold text-green-700 mb-1">
                    Booking Submitted & WhatsApp Message Sent!
                  </h2>
                  <p className="text-slate-600 text-xs md:text-sm mb-4 max-w-md mx-auto">
                    Your Navrang 2026 pass has been registered. A confirmation message with your ticket link has been sent to <strong>+91 {bookingResult.parent_phone || parentDetails.phone}</strong>.
                  </p>

                  <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-2 rounded-xl mb-6">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span>WhatsApp confirmation sent to <strong>+91 {bookingResult.parent_phone || parentDetails.phone}</strong></span>
                  </div>

                  {/* Printable Ticket Card */}
                  <div id="navrang-pass-ticket" className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 mb-6 text-left">
                    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-5 text-center relative overflow-hidden">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
                        S.D. Public School • Navrang 2026 • SDPS Homeground
                      </div>
                      <div className="text-2xl font-mono font-black tracking-wider text-white">
                        {bookingResult.booking_id}
                      </div>
                      <div className="text-xs text-purple-200 mt-1 capitalize">
                        {bookingResult.package || selectedPkgObj?.name} • ₹{bookingResult.price || totalPrice}
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 flex flex-col items-center border-b border-slate-200">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-3 inline-block">
                        <QRCodeSVG 
                          value={bookingResult.qr_token || bookingResult.booking_id} 
                          size={170}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-mono">Scan QR Token for Gate Check-in</span>
                    </div>

                    <div className="p-5 space-y-3 bg-white text-xs">
                      <div>
                        <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mb-1">Students Admitted</div>
                        <div className="space-y-1">
                          {(bookingResult.students || students).map((st, i) => (
                            <div key={i} className="flex justify-between font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                              <span>{st.name || st.student_name}</span>
                              <span className="text-slate-500 font-mono">Adm: {st.admission_no}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-medium">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Venue: <strong>SDPS Homeground, Patna</strong></span>
                        <span className="text-slate-400">•</span>
                        <span>Oct 15, 6:00 PM</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-700">
                        <div>
                          <div className="text-[10px] uppercase text-slate-400 font-semibold">Mother / Guardian</div>
                          <div className="font-medium truncate">{bookingResult.parent_name || parentDetails.name}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-slate-400 font-semibold">WhatsApp Number</div>
                          <div className="font-mono font-medium">{bookingResult.parent_phone || parentDetails.phone}</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
                        <div>
                          <div className="text-[10px] uppercase text-purple-700 font-bold">
                            Payment Reference
                          </div>
                          <div className="font-mono font-bold text-slate-900">{bookingResult.payment_ref || 'Razorpay Auto'}</div>
                        </div>
                        {bookingResult.payment_status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active & Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock className="w-3 h-3" /> Awaiting Auto-Sync
                          </span>
                        )}
                      </div>

                      {bookingResult.payment_status !== 'paid' && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleAutoVerify(bookingResult.booking_id)}
                            disabled={isCheckingStatus}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                            {isCheckingStatus ? 'Checking Razorpay...' : '⚡ Auto-Verify with Razorpay'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Digital Mobile Wallet Passes */}
                  <div className="max-w-md mx-auto mb-6">
                    <WalletPassButton 
                      bookingId={bookingResult.booking_id} 
                      booking={bookingResult} 
                    />
                  </div>

                  {/* Actions */}
                  <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => window.print()}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-xs transition-colors"
                    >
                      <Printer className="w-4 h-4" /> Print / Save Ticket
                    </button>
                    <Link 
                      to={isSubdomain ? "/my-ticket" : "/navrang/my-ticket"}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-xs shadow-md transition-colors"
                    >
                      <Ticket className="w-4 h-4" /> View My Tickets
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
