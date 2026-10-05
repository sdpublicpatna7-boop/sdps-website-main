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
  QrCode as QrIcon,
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import NavrangNavbar from '@/components/layout/NavrangNavbar';

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
  { id: 2, name: 'Student Auth', icon: ShieldCheck },
  { id: 3, name: 'Parent Info', icon: UserCheck },
  { id: 4, name: 'UPI Payment', icon: Smartphone },
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
  
  // Custom UPI Gateway states
  const [upiConfig, setUpiConfig] = useState({
    upi_id: 'sdpublicpatna@sbi',
    merchant_name: 'S.D. Public School, Patna',
    instructions: '1. Scan the QR code or tap Pay via Any UPI App.\n2. Complete the payment of exact amount.\n3. Enter the 12-digit UPI UTR / Transaction Reference Number below.'
  });
  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);

  const [bookingResult, setBookingResult] = useState(null);
  const [isVerifyingIdx, setIsVerifyingIdx] = useState(null);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState(null);

  // Fetch event config (UPI ID, merchant, packages)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get('/navrang/config');
        if (data.upi_id) {
          setUpiConfig({
            upi_id: data.upi_id || 'sdpublicpatna@sbi',
            merchant_name: data.upi_merchant_name || 'S.D. Public School, Patna',
            instructions: data.upi_instructions || 'Scan and pay via UPI'
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
          student_name: '',
          verified: false,
          data: null,
          error: null
        })));
      }
    }
  }, [selectedPackage, packages]);

  const handleStudentFieldChange = (index, field, value) => {
    const newStudents = [...students];
    newStudents[index] = { 
      ...newStudents[index], 
      [field]: value, 
      verified: false, 
      data: null, 
      error: null 
    };
    setStudents(newStudents);
  };

  const verifyStudent = async (index) => {
    const student = students[index];
    const adm = (student.admission_no || '').trim();
    const name = (student.student_name || '').trim();

    if (!adm) {
      const newStudents = [...students];
      newStudents[index].error = 'Please enter an admission number.';
      setStudents(newStudents);
      return;
    }
    if (!name) {
      const newStudents = [...students];
      newStudents[index].error = 'Please enter the student\'s name as registered in school records.';
      setStudents(newStudents);
      return;
    }

    try {
      setIsVerifyingIdx(index);
      const newStudents = [...students];
      newStudents[index].error = null;
      setStudents(newStudents);

      const res = await api.post('/navrang/verify-student', { 
        admission_no: adm,
        student_name: name
      });
      
      const updated = [...students];
      updated[index] = { 
        ...updated[index], 
        verified: true, 
        data: res.data.student,
        error: null
      };
      setStudents(updated);
    } catch (err) {
      const updated = [...students];
      updated[index] = { 
        ...updated[index], 
        verified: false, 
        error: err.response?.data?.detail || 'Verification failed. Please check the admission number and student name.' 
      };
      setStudents(updated);
    } finally {
      setIsVerifyingIdx(null);
    }
  };

  const allVerified = students.length > 0 && students.every(s => s.verified);

  const selectedPkgObj = packages.find(p => p.id === selectedPackage) || packages[0];
  const totalPrice = selectedPkgObj?.price || 299;

  // Build UPI URI for QR code and native app deep linking
  // Format: upi://pay?pa=<VPA>&pn=<Name>&am=<Amount>&cu=INR&tn=Navrang
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(upiConfig.upi_id)}&pn=${encodeURIComponent(upiConfig.merchant_name)}&am=${totalPrice}&cu=INR&tn=${encodeURIComponent(`Navrang Pass ${selectedPkgObj?.name || ''}`)}`;

  const handleCopyUpi = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(upiConfig.upi_id);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleBookWithUpi = async (e) => {
    if (e) e.preventDefault();
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || cleanUtr.length < 6) {
      setError('Please enter a valid 12-digit UPI Transaction ID / UTR Number.');
      return;
    }
    if (!paymentConfirmed) {
      setError('Please check the confirmation box to verify your UPI payment transfer.');
      return;
    }

    try {
      setIsBooking(true);
      setError(null);
      
      const payload = {
        package: selectedPackage,
        package_id: selectedPackage,
        parent_name: parentDetails.name.trim(),
        parent_phone: parentDetails.phone.trim(),
        phone: parentDetails.phone.trim(),
        parent_email: parentDetails.email.trim(),
        email: parentDetails.email.trim(),
        payment_method: 'UPI',
        payment_ref: cleanUtr,
        utr_number: cleanUtr,
        upi_id_used: upiConfig.upi_id,
        students: students.map(s => ({
          admission_no: s.data?.admission_no || s.admission_no,
          student_name: s.data?.name || s.student_name
        }))
      };

      const res = await api.post('/navrang/book', payload);
      setBookingResult(res.data);
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit booking. Please verify the UTR and try again.');
    } finally {
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
        <title>Book Navrang 2026 Passes | S.D. Public School</title>
        <meta name="description" content="Exclusive online Dandiya night pass booking for verified current students of S.D. Public School, Patna." />
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
            Dandiya & Durga Puja Celebration Night • Direct UPI Payment Gateway
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 -mt-6">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-purple-100">
          
          {/* Stepper */}
          <div className="bg-gradient-to-r from-purple-50/70 via-white to-purple-50/70 border-b border-purple-100 p-4">
            <div className="flex justify-between items-center max-w-2xl mx-auto">
              {steps.map((s, idx) => (
                <div key={s.id} className="flex flex-col items-center relative z-10 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    step > s.id ? 'bg-green-600 border-green-600 text-white shadow-md' :
                    step === s.id ? 'bg-purple-700 border-purple-700 text-white shadow-lg ring-4 ring-purple-100' :
                    'bg-white border-slate-300 text-slate-400'
                  }`}>
                    {step > s.id ? <Check className="w-5 h-5 stroke-[2.5]" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-[11px] mt-1.5 font-semibold hidden sm:block ${
                    step === s.id ? 'text-purple-900 font-bold' :
                    step > s.id ? 'text-green-700' : 'text-slate-400'
                  }`}>
                    {s.name}
                  </span>
                  
                  {/* Connecting Line */}
                  {idx < steps.length - 1 && (
                    <div className={`absolute top-5 left-1/2 w-full h-[2px] -z-10 ${
                      step > s.id ? 'bg-green-500' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 md:p-8 min-h-[460px]">
            <AnimatePresence mode="wait">
              {/* STEP 1: SELECT PACKAGE */}
              {step === 1 && (
                <motion.div key="step1" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-outfit font-extrabold text-slate-900">Choose Your Pass Package</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      Passes are exclusively for verified current students of S.D. Public School and their mothers.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4 pt-2">
                    {packages.map(pkg => {
                      const isSelected = selectedPackage === pkg.id;
                      return (
                        <div 
                          key={pkg.id}
                          onClick={() => setSelectedPackage(pkg.id)}
                          className={`cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 relative flex flex-col justify-between ${
                            isSelected 
                              ? 'border-purple-600 bg-purple-50/60 shadow-lg ring-2 ring-purple-500/20 scale-[1.02]' 
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
                            <h3 className="text-xl font-bold text-slate-900">{pkg.name}</h3>
                            <div className="text-3xl font-black text-purple-700 my-3">
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
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Continue to Student Auth <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: STUDENT 2-FACTOR AUTHENTICATION */}
              {step === 2 && (
                <motion.div key="step2" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                      Two-Factor School Eligibility Verification
                    </div>
                    <h2 className="text-2xl md:text-3xl font-outfit font-extrabold text-slate-900">
                      Verify Student Details
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                      Enter both the <strong>Admission Number</strong> and the registered <strong>Student Name</strong>. Our system will check the school database to authenticate current enrolment.
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
                              <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
                            </span>
                          )}
                        </div>

                        {!student.verified ? (
                          <div className="space-y-3">
                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Admission Number <span className="text-red-500">*</span>
                                </label>
                                <input 
                                  type="text"
                                  value={student.admission_no}
                                  onChange={(e) => handleStudentFieldChange(idx, 'admission_no', e.target.value)}
                                  placeholder="e.g. 1001 or SDPS1001"
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                  Student Full Name <span className="text-red-500">*</span>
                                </label>
                                <input 
                                  type="text"
                                  value={student.student_name}
                                  onChange={(e) => handleStudentFieldChange(idx, 'student_name', e.target.value)}
                                  placeholder="As registered in school"
                                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                />
                              </div>
                            </div>

                            {student.error && (
                              <div className="p-3 bg-red-100/80 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{student.error}</span>
                              </div>
                            )}

                            <div className="flex justify-end pt-1">
                              <button 
                                type="button"
                                onClick={() => verifyStudent(idx)}
                                disabled={!student.admission_no?.trim() || !student.student_name?.trim() || isVerifyingIdx === idx}
                                className="bg-brand-navy hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                {isVerifyingIdx === idx ? (
                                  <>
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verifying in Roster...
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                    Verify Student Identity
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-white p-4 rounded-xl border border-green-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm shrink-0">
                                {student.data?.name?.charAt(0) || '✓'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-sm md:text-base">
                                  {student.data?.name}
                                </div>
                                <div className="text-xs text-slate-600 flex flex-wrap gap-2 mt-0.5">
                                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">Adm: {student.data?.admission_no}</span>
                                  {student.data?.class_name && (
                                    <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-medium">
                                      Class: {student.data?.class_name} {student.data?.section || ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button 
                              type="button"
                              onClick={() => {
                                const newSt = [...students];
                                newSt[idx] = { admission_no: '', student_name: '', verified: false, data: null, error: null };
                                setStudents(newSt);
                              }}
                              className="text-xs text-slate-500 hover:text-red-600 underline font-medium self-end sm:self-center"
                            >
                              Change / Re-verify
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between max-w-2xl mx-auto pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => setStep(1)}
                      className="text-slate-600 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-100 transition-colors text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Passes
                    </button>
                    <button 
                      disabled={!allVerified}
                      onClick={() => setStep(3)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-7 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                    >
                      Parent Contact Info <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: PARENT / GUARDIAN CONTACT */}
              {step === 3 && (
                <motion.div key="step3" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-outfit font-extrabold text-slate-900">Parent / Guardian Information</h2>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                      Pass notifications and gate entry QR codes will be linked to this contact number.
                    </p>
                  </div>
                  
                  <div className="max-w-md mx-auto space-y-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mother / Guardian Full Name <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text"
                        value={parentDetails.name}
                        onChange={(e) => setParentDetails({...parentDetails, name: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        placeholder="e.g. Smt. Sunita Sharma"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        10-Digit Mobile Number <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">+91</span>
                        <input 
                          type="tel"
                          maxLength="10"
                          value={parentDetails.phone}
                          onChange={(e) => setParentDetails({...parentDetails, phone: e.target.value.replace(/\D/g,'')})}
                          className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                          placeholder="9876543210"
                          required
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Used to retrieve your pass anytime under 'My Tickets'.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address (Optional)
                      </label>
                      <input 
                        type="email"
                        value={parentDetails.email}
                        onChange={(e) => setParentDetails({...parentDetails, email: e.target.value})}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                        placeholder="parent@example.com"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between max-w-xl mx-auto pt-6 border-t border-slate-100">
                    <button 
                      onClick={() => setStep(2)}
                      className="text-slate-600 px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-100 transition-colors text-sm"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Students
                    </button>
                    <button 
                      disabled={!parentDetails.name?.trim() || parentDetails.phone?.length !== 10}
                      onClick={() => setStep(4)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-7 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                    >
                      Proceed to UPI Payment <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: CUSTOM DIRECT UPI PAYMENT GATEWAY (NO RAZORPAY) */}
              {step === 4 && (
                <motion.div key="step4" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <div className="text-center max-w-xl mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 mb-2 border border-amber-300">
                      <Smartphone className="w-3.5 h-3.5 text-amber-700" />
                      Direct School UPI Payment Gateway
                    </div>
                    <h2 className="text-2xl md:text-3xl font-outfit font-extrabold text-slate-900">
                      Pay ₹{totalPrice} via UPI
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">
                      Scan the QR code with any UPI app or tap the mobile button, then submit your 12-digit UPI UTR number.
                    </p>
                  </div>

                  <div className="max-w-xl mx-auto bg-gradient-to-b from-purple-50/60 to-white rounded-2xl p-5 md:p-6 border border-purple-200 shadow-sm space-y-6">
                    {/* Booking Breakdown Pill */}
                    <div className="bg-white p-3.5 rounded-xl border border-purple-100 flex justify-between items-center text-sm">
                      <div>
                        <div className="font-bold text-slate-900">{selectedPkgObj?.name}</div>
                        <div className="text-xs text-slate-500">
                          {students.map(s => s.data?.name || s.student_name).join(', ')}
                        </div>
                      </div>
                      <div className="text-xl font-black text-purple-700">
                        ₹{totalPrice}
                      </div>
                    </div>

                    {/* QR Code & Direct UPI Deep Link */}
                    <div className="flex flex-col items-center justify-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                      <div className="p-3 bg-white rounded-xl shadow-md border border-slate-100 inline-block mb-3">
                        <QRCodeSVG 
                          value={upiIntentUrl} 
                          size={190} 
                          level="H" 
                          includeMargin={true}
                        />
                      </div>

                      <div className="text-xs text-slate-500 mb-3">
                        Scan using Google Pay, PhonePe, Paytm, BHIM, or any UPI App
                      </div>

                      {/* Deep link button for mobile devices */}
                      <a 
                        href={upiIntentUrl}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white px-6 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-md transition-all mb-3"
                      >
                        <Smartphone className="w-4 h-4" />
                        Pay ₹{totalPrice} via Any UPI App (Mobile)
                      </a>

                      {/* Copy UPI ID */}
                      <div className="flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200 max-w-full">
                        <span className="text-xs text-slate-500 font-medium">UPI ID:</span>
                        <code className="text-xs font-mono font-bold text-slate-800 truncate">
                          {upiConfig.upi_id}
                        </code>
                        <button 
                          type="button" 
                          onClick={handleCopyUpi}
                          className="ml-1 text-purple-700 hover:text-purple-900 p-1 rounded transition-colors"
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {copiedUpi && (
                        <span className="text-[11px] text-green-600 font-semibold mt-1">
                          UPI ID copied to clipboard!
                        </span>
                      )}
                    </div>

                    {/* 3 Step Instruction */}
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                        How to complete payment:
                      </div>
                      <ol className="list-decimal pl-4 space-y-1 text-slate-700 text-[11px]">
                        <li>Scan the QR code above or tap the <em>Pay via UPI App</em> button on mobile.</li>
                        <li>Complete the payment of <strong>₹{totalPrice}</strong> in your UPI app.</li>
                        <li>Copy the <strong>12-digit UPI UTR / Transaction Reference Number</strong> from your payment receipt and paste it below.</li>
                      </ol>
                    </div>

                    {/* UTR Input Form */}
                    <form onSubmit={handleBookWithUpi} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          12-Digit UPI Transaction ID / UTR Number <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="text"
                          maxLength="24"
                          value={utrNumber}
                          onChange={(e) => setUtrNumber(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                          className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base tracking-widest uppercase bg-white focus:ring-2 focus:ring-purple-600 focus:border-purple-600 outline-none"
                          placeholder="e.g. 427819203847"
                          required
                        />
                        <p className="text-[11px] text-slate-400 mt-1">
                          Found in your UPI app under transaction details (GPay, PhonePe, Paytm, SBI, etc.).
                        </p>
                      </div>

                      <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-purple-200 cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="mt-0.5 w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                          checked={paymentConfirmed}
                          onChange={(e) => setPaymentConfirmed(e.target.checked)}
                        />
                        <span className="text-xs text-slate-700 leading-relaxed">
                          I confirm that I have transferred <strong>₹{totalPrice}</strong> to <strong>{upiConfig.upi_id}</strong> and the 12-digit UTR number entered is authentic.
                        </span>
                      </label>

                      {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-center gap-2 text-xs border border-red-200">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                        <button 
                          type="button"
                          onClick={() => setStep(3)}
                          disabled={isBooking}
                          className="text-slate-600 px-4 py-2.5 rounded-xl font-medium flex items-center gap-1.5 hover:bg-slate-100 transition-colors text-xs"
                        >
                          <ArrowLeft className="w-4 h-4" /> Back
                        </button>
                        <button 
                          type="submit"
                          disabled={!utrNumber.trim() || !paymentConfirmed || isBooking}
                          className="bg-green-600 hover:bg-green-700 text-white px-7 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                        >
                          {isBooking ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Submitting Booking...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Submit Booking & UTR
                            </>
                          )}
                        </button>
                      </div>
                    </form>
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
                    Booking & Payment Submitted!
                  </h2>
                  <p className="text-slate-600 text-xs md:text-sm mb-6 max-w-md mx-auto">
                    Your Navrang 2026 pass has been registered. School administration will verify your UPI UTR reference.
                  </p>

                  {/* Printable Ticket Card */}
                  <div id="navrang-pass-ticket" className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200 mb-6 text-left">
                    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white p-5 text-center relative overflow-hidden">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
                        S.D. Public School • Navrang 2026
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
                        <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mb-1">Verified Students</div>
                        <div className="space-y-1">
                          {(bookingResult.students || students).map((st, i) => (
                            <div key={i} className="flex justify-between font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                              <span>{st.name || st.student_name}</span>
                              <span className="text-slate-500 font-mono">Adm: {st.admission_no}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-slate-700">
                        <div>
                          <div className="text-[10px] uppercase text-slate-400 font-semibold">Mother / Guardian</div>
                          <div className="font-medium truncate">{bookingResult.parent_name || parentDetails.name}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-slate-400 font-semibold">Mobile Number</div>
                          <div className="font-mono font-medium">{bookingResult.parent_phone || parentDetails.phone}</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-between items-center bg-purple-50/60 p-2.5 rounded-xl border border-purple-100">
                        <div>
                          <div className="text-[10px] uppercase text-purple-700 font-bold">UPI UTR Reference</div>
                          <div className="font-mono font-bold text-slate-900">{bookingResult.payment_ref || utrNumber}</div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3 h-3" /> Verification Pending
                        </span>
                      </div>
                    </div>
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
