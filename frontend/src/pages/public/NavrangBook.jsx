import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  Ticket, 
  CheckCircle2, 
  UserCircle, 
  CreditCard, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle,
  Search,
  Check,
  PartyPopper,
  Download,
  Share2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '@/lib/api';
import { Link } from 'react-router-dom';
import NavrangNavbar from '@/components/layout/NavrangNavbar';

const packages = [
  { id: 'silver', name: 'Silver Pass', price: 299, children: 1, color: 'bg-slate-100', borderColor: 'border-slate-300' },
  { id: 'gold', name: 'Gold Pass', price: 399, children: 2, color: 'bg-yellow-50', borderColor: 'border-yellow-400' },
  { id: 'platinum', name: 'Platinum Pass', price: 499, children: 3, color: 'bg-indigo-50', borderColor: 'border-indigo-400' },
];

const steps = [
  { id: 1, name: 'Package', icon: Ticket },
  { id: 2, name: 'Students', icon: UserCircle },
  { id: 3, name: 'Details', icon: Search },
  { id: 4, name: 'Review', icon: CreditCard },
  { id: 5, name: 'Ticket', icon: CheckCircle2 },
];

export default function NavrangBook() {
  const [step, setStep] = useState(1);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [students, setStudents] = useState([]);
  const [parentDetails, setParentDetails] = useState({ name: '', phone: '', email: '' });
  const [agreed, setAgreed] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedPackage) {
      const pkg = packages.find(p => p.id === selectedPackage);
      setStudents(Array(pkg.children).fill({ admission_no: '', verified: false, data: null }));
    }
  }, [selectedPackage]);

  const handlePackageSelect = (pkgId) => {
    setSelectedPackage(pkgId);
  };

  const handleStudentChange = (index, value) => {
    const newStudents = [...students];
    newStudents[index] = { ...newStudents[index], admission_no: value, verified: false, data: null, error: null };
    setStudents(newStudents);
  };

  const verifyStudent = async (index) => {
    const student = students[index];
    if (!student.admission_no) return;

    try {
      setIsVerifying(true);
      const newStudents = [...students];
      newStudents[index] = { ...newStudents[index], error: null };
      setStudents(newStudents);

      const res = await api.post('/navrang/verify-student', { admission_no: student.admission_no });
      
      const updatedStudents = [...students];
      updatedStudents[index] = { 
        ...updatedStudents[index], 
        verified: true, 
        data: res.data 
      };
      setStudents(updatedStudents);
    } catch (err) {
      const updatedStudents = [...students];
      updatedStudents[index] = { 
        ...updatedStudents[index], 
        verified: false, 
        error: err.response?.data?.detail || 'Verification failed. Check admission number.' 
      };
      setStudents(updatedStudents);
    } finally {
      setIsVerifying(false);
    }
  };

  const allVerified = students.every(s => s.verified);

  const handleBook = async () => {
    try {
      setIsBooking(true);
      setError(null);
      
      const payload = {
        package_id: selectedPackage,
        parent_name: parentDetails.name,
        phone: parentDetails.phone,
        email: parentDetails.email,
        students: students.map(s => s.data.id || s.data.admission_no || s.admission_no)
      };

      const res = await api.post('/navrang/book', payload);
      setBookingResult(res.data);
      setStep(5);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to complete booking. Please try again.');
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
    <div className="min-h-screen bg-slate-900 font-sans text-brand-navy selection:bg-brand-orange selection:text-white">
      <Helmet>
        <title>Book Navrang 2026 Tickets | S.D. Public School</title>
      </Helmet>

      {/* Shared School-Styled Navrang Header */}
      <NavrangNavbar activePage="book" />

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white py-10 px-4 text-center shadow-lg relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400 via-fuchsia-500 to-transparent pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30 mb-3">
            🎆 Online Ticket Booking
          </span>
          <h1 className="text-4xl md:text-5xl font-outfit font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-200 mb-2">
            Navrang 2026 Passes
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-xl mx-auto">
            Book your Dandiya celebration tickets with student verification
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 -mt-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-purple-100">
          
          {/* Stepper */}
          <div className="bg-purple-50/50 border-b border-purple-100 p-4">
            <div className="flex justify-between items-center max-w-xl mx-auto">
              {steps.map((s, idx) => (
                <div key={s.id} className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors duration-300 ${
                    step > s.id ? 'bg-green-500 border-green-500 text-white' :
                    step === s.id ? 'bg-purple-600 border-purple-600 text-white' :
                    'bg-white border-purple-200 text-purple-300'
                  }`}>
                    {step > s.id ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 font-medium hidden sm:block ${
                    step >= s.id ? 'text-purple-900' : 'text-purple-300'
                  }`}>
                    {s.name}
                  </span>
                  
                  {/* Connecting Line */}
                  {idx < steps.length - 1 && (
                    <div className={`absolute top-5 left-10 w-full h-[2px] -z-10 ${
                      step > s.id ? 'bg-green-500' : 'bg-purple-200'
                    }`} style={{ width: 'calc(100% + 2rem)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Area */}
          <div className="p-6 md:p-8 min-h-[400px]">
            <AnimatePresence mode="wait">
              {/* STEP 1: PACKAGE */}
              {step === 1 && (
                <motion.div key="step1" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <h2 className="text-2xl font-outfit font-bold text-center mb-6">Select Your Package</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {packages.map(pkg => (
                      <div 
                        key={pkg.id}
                        onClick={() => handlePackageSelect(pkg.id)}
                        className={`cursor-pointer rounded-xl p-6 border-2 transition-all duration-200 ${
                          selectedPackage === pkg.id 
                            ? `border-purple-600 ${pkg.color} shadow-md scale-[1.02]` 
                            : 'border-slate-200 hover:border-purple-300 bg-white'
                        }`}
                      >
                        <h3 className="text-xl font-bold mb-2">{pkg.name}</h3>
                        <div className="text-3xl font-black text-purple-700 mb-4">₹{pkg.price}</div>
                        <ul className="space-y-2 text-sm text-slate-600">
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Admits {pkg.children} Student{pkg.children > 1 ? 's' : ''}</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> 2 Parents/Guardians</li>
                          <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500" /> Food Coupons</li>
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end mt-8">
                    <button 
                      disabled={!selectedPackage}
                      onClick={() => setStep(2)}
                      className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next Step <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: STUDENTS */}
              {step === 2 && (
                <motion.div key="step2" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <h2 className="text-2xl font-outfit font-bold text-center mb-2">Verify Student Details</h2>
                  <p className="text-center text-slate-500 mb-6">Enter admission numbers for the {students.length} student slot(s) in your package.</p>
                  
                  <div className="space-y-4 max-w-xl mx-auto">
                    {students.map((student, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-2">Student {idx + 1} Admission Number</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={student.admission_no}
                            onChange={(e) => handleStudentChange(idx, e.target.value)}
                            disabled={student.verified}
                            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:bg-slate-100"
                            placeholder="e.g. 2023001"
                          />
                          {!student.verified ? (
                            <button 
                              onClick={() => verifyStudent(idx)}
                              disabled={!student.admission_no || isVerifying}
                              className="bg-brand-orange text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
                            >
                              Verify
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                const newSt = [...students];
                                newSt[idx] = { admission_no: '', verified: false, data: null };
                                setStudents(newSt);
                              }}
                              className="text-slate-500 px-3 hover:text-slate-700 underline text-sm"
                            >
                              Change
                            </button>
                          )}
                        </div>
                        
                        {student.error && (
                          <div className="mt-2 text-red-500 flex items-center gap-1 text-sm">
                            <AlertCircle className="w-4 h-4" /> {student.error}
                          </div>
                        )}
                        
                        {student.verified && student.data && (
                          <div className="mt-3 bg-green-50 text-green-800 p-3 rounded-lg flex items-start gap-3 border border-green-200">
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <div className="font-semibold">{student.data.name}</div>
                              <div className="text-sm opacity-80">Class: {student.data.class_section}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between max-w-xl mx-auto mt-8">
                    <button 
                      onClick={() => setStep(1)}
                      className="text-slate-600 px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-100 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <button 
                      disabled={!allVerified}
                      onClick={() => setStep(3)}
                      className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next Step <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: PARENT DETAILS */}
              {step === 3 && (
                <motion.div key="step3" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <h2 className="text-2xl font-outfit font-bold text-center mb-6">Parent / Guardian Details</h2>
                  
                  <div className="max-w-md mx-auto space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                      <input 
                        type="text"
                        value={parentDetails.name}
                        onChange={(e) => setParentDetails({...parentDetails, name: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number *</label>
                      <input 
                        type="tel"
                        maxLength="10"
                        value={parentDetails.phone}
                        onChange={(e) => setParentDetails({...parentDetails, phone: e.target.value.replace(/\D/g,'')})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="9876543210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email Address (Optional)</label>
                      <input 
                        type="email"
                        value={parentDetails.email}
                        onChange={(e) => setParentDetails({...parentDetails, email: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between max-w-xl mx-auto mt-8">
                    <button 
                      onClick={() => setStep(2)}
                      className="text-slate-600 px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-100 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <button 
                      disabled={!parentDetails.name || parentDetails.phone.length !== 10}
                      onClick={() => setStep(4)}
                      className="bg-purple-600 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next Step <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: REVIEW */}
              {step === 4 && (
                <motion.div key="step4" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="space-y-6">
                  <h2 className="text-2xl font-outfit font-bold text-center mb-6">Review & Confirm</h2>
                  
                  <div className="max-w-xl mx-auto bg-purple-50 rounded-xl p-6 border border-purple-200 space-y-6">
                    <div className="flex justify-between items-center border-b border-purple-200 pb-4">
                      <div>
                        <h3 className="font-bold text-lg text-purple-900">{packages.find(p=>p.id===selectedPackage)?.name}</h3>
                        <p className="text-sm text-purple-700">Admit {packages.find(p=>p.id===selectedPackage)?.children} Student(s) + 2 Parents</p>
                      </div>
                      <div className="text-2xl font-black text-purple-700">
                        ₹{packages.find(p=>p.id===selectedPackage)?.price}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-purple-900 uppercase mb-2">Verified Students</h4>
                      <ul className="space-y-2">
                        {students.map((s, idx) => (
                          <li key={idx} className="flex justify-between text-sm bg-white p-2 rounded border border-purple-100">
                            <span className="font-medium">{s.data?.name}</span>
                            <span className="text-slate-500">Class {s.data?.class_section}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-purple-900 uppercase mb-2">Contact Details</h4>
                      <div className="bg-white p-3 rounded border border-purple-100 text-sm">
                        <div><strong>Name:</strong> {parentDetails.name}</div>
                        <div><strong>Phone:</strong> {parentDetails.phone}</div>
                        {parentDetails.email && <div><strong>Email:</strong> {parentDetails.email}</div>}
                      </div>
                    </div>

                    <label className="flex items-start gap-3 p-3 bg-white rounded border border-purple-200 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="mt-1 w-5 h-5 rounded text-purple-600 focus:ring-purple-500"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                      />
                      <span className="text-sm text-slate-700">
                        I agree to the event rules, cancellation policy, and confirm that all details provided are accurate.
                      </span>
                    </label>

                    {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-200">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between max-w-xl mx-auto mt-8">
                    <button 
                      onClick={() => setStep(3)}
                      disabled={isBooking}
                      className="text-slate-600 px-6 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-100 transition-colors"
                    >
                      <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    <button 
                      disabled={!agreed || isBooking}
                      onClick={handleBook}
                      className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isBooking ? 'Processing...' : 'Confirm & Pay'} <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 5: SUCCESS */}
              {step === 5 && bookingResult && (
                <motion.div key="step5" variants={slideVariants} initial="initial" animate="enter" exit="exit" className="text-center py-8">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-50 rounded-full animate-pulse"></div>
                    <PartyPopper className="w-20 h-20 text-brand-orange relative z-10" />
                  </div>
                  
                  <h2 className="text-3xl font-outfit font-bold text-green-600 mb-2">Booking Successful!</h2>
                  <p className="text-slate-600 mb-8">Your Navrang 2026 pass has been generated.</p>

                  <div className="max-w-sm mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 mb-8">
                    <div className="bg-purple-900 text-white p-4 text-center">
                      <div className="text-sm opacity-80 uppercase tracking-widest mb-1">Booking ID</div>
                      <div className="text-2xl font-mono font-bold">{bookingResult.booking_id || 'NVR-2026-XXXX'}</div>
                    </div>
                    <div className="p-6 flex flex-col items-center bg-slate-50">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 inline-block">
                        <QRCodeSVG 
                          value={bookingResult.qr_token || bookingResult.booking_id || 'placeholder'} 
                          size={180}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                      <p className="text-sm text-slate-500 mb-4">Show this QR code at the entrance</p>
                      <div className="w-full flex gap-3">
                        <Link 
                          to="/navrang/my-ticket"
                          className="flex-1 bg-purple-100 text-purple-700 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-200 transition-colors"
                        >
                          My Tickets
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="max-w-md mx-auto bg-blue-50 p-4 rounded-xl border border-blue-200 text-left">
                    <h4 className="font-semibold text-blue-900 mb-2">Payment Instructions</h4>
                    <p className="text-sm text-blue-800 mb-2">
                      Your booking status is currently pending. Please pay the total amount of ₹{bookingResult.total_amount || packages.find(p=>p.id===selectedPackage)?.price} at the school reception within 48 hours to confirm your tickets, or pay via UPI.
                    </p>
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
