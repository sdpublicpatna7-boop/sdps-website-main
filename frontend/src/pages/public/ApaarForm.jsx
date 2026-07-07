import { useState } from "react";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Loader2, Fingerprint, ShieldCheck, CheckCircle2, ChevronRight, ArrowLeft } from "lucide-react";

export default function ApaarForm() {
  const [step, setStep] = useState(1); // 1: Verify, 2: Fill Form, 3: Success
  const [admissionNo, setAdmissionNo] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Student record confirmed from school roster
  const [rosterRecord, setRosterRecord] = useState(null);

  // Form payload
  const [form, setForm] = useState({
    admission_no: "",
    student_name: "",
    father_name: "",
    student_aadhaar_name: "",
    student_aadhaar_no: "",
    student_dob: "",
    student_gender: "Male",
    father_aadhaar_name: "",
    father_aadhaar_no: "",
    mother_aadhaar_name: "",
    mother_aadhaar_no: "",
    class_name: "",
    section: "",
    mobile_no: "",
    consent: true
  });

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!admissionNo.trim()) {
      toast.error("Please enter an admission number.");
      return;
    }
    setVerifying(true);
    try {
      const r = await api.get(`/apaar/verify?admission_no=${encodeURIComponent(admissionNo.trim())}`);
      if (r.data.status === "success") {
        const student = r.data.student;
        setRosterRecord(student);
        setForm(prev => ({
          ...prev,
          admission_no: student.admission_no,
          student_name: student.student_name,
          father_name: student.father_name,
          class_name: student.class_name || "",
          section: student.section || ""
        }));
        setStep(2);
        toast.success("Student record verified in school roster!");
      } else if (r.data.status === "already_submitted") {
        toast.warning(r.data.message || "APAAR details already submitted.");
      } else {
        toast.error(r.data.message || "Admission number not found. Please contact administration.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Verification failed. Please check connection.");
    } finally {
      setVerifying(false);
    }
  };

  const handleTextChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleNumberChange = (field, val, maxLen) => {
    const digitsOnly = val.replace(/\D/g, "");
    if (digitsOnly.length <= maxLen) {
      setForm(prev => ({ ...prev, [field]: digitsOnly }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (form.student_aadhaar_no.length !== 12) {
      toast.error("Student Aadhaar Card number must be exactly 12 digits.");
      return;
    }
    if (form.father_aadhaar_no.length !== 12) {
      toast.error("Father's Aadhaar Card number must be exactly 12 digits.");
      return;
    }
    if (form.mother_aadhaar_no.length !== 12) {
      toast.error("Mother's Aadhaar Card number must be exactly 12 digits.");
      return;
    }
    if (form.mobile_no.length !== 10) {
      toast.error("Mobile number must be exactly 10 digits.");
      return;
    }
    if (!form.consent) {
      toast.error("You must check the consent box to submit the form.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/apaar/submit", form);
      toast.success("APAAR registration details submitted successfully!");
      setStep(3);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Submission failed. Please check details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-50/50 to-transparent py-8 sm:py-12 px-4 text-center border-b border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E3B91]/10 text-[#0E3B91] text-[10px] font-bold uppercase tracking-wider mb-3">
            <Fingerprint className="w-3.5 h-3.5 animate-pulse" /> APAAR Consent Portal
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-headline font-black text-slate-800 leading-tight">
            APAAR ID Aadhaar Consent
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Automated Permanent Academic Account Registry setup. Submit consent and Aadhaar data as per official cards.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-xl mx-auto w-full px-4 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        
        {/* Progress Bar indicator */}
        <div className="flex items-center justify-between mb-8 px-2 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? "text-brand-blue" : ""}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] ${step >= 1 ? "border-[#0E3B91] bg-[#0E3B91] text-white" : "border-slate-300"}`}>1</span>
            Verify<span className="hidden sm:inline"> Roster</span>
          </div>
          <div className="h-px bg-slate-200 flex-1 mx-2" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? "text-brand-blue" : ""}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] ${step >= 2 ? "border-[#0E3B91] bg-[#0E3B91] text-white" : "border-slate-300"}`}>2</span>
            Aadhaar<span className="hidden sm:inline"> Info</span>
          </div>
          <div className="h-px bg-slate-200 flex-1 mx-2" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? "text-brand-blue" : ""}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] ${step >= 3 ? "border-[#0E3B91] bg-[#0E3B91] text-white" : "border-slate-300"}`}>3</span>
            Success
          </div>
        </div>

        {/* STEP 1: VERIFICATION */}
        {step === 1 && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-lg space-y-6">
            <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-[#0E3B91] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm">Roster Verification</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
                  Enter your Admission Number to confirm school eligibility and retrieve records.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  School Admission Number *
                </label>
                <input
                  required
                  placeholder="e.g. 1945/22"
                  className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:border-brand-blue outline-none text-sm transition bg-slate-50/20 focus:bg-white"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-[#0E3B91] hover:bg-[#0E3B91]/95 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm disabled:opacity-50"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Verify & Continue <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: FILL INFORMATION */}
        {step === 2 && rosterRecord && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-slate-200 shadow-lg space-y-6">
            
            {/* School details confirmed (Read-only block) */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-150 rounded-2xl">
              <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-2">Verified School Records</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Student Name:</span>
                  <span className="font-bold text-slate-800 uppercase">{rosterRecord.student_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Father's Name (School):</span>
                  <span className="font-bold text-slate-800 uppercase">{rosterRecord.father_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Admission No:</span>
                  <span className="font-bold text-slate-800 uppercase tracking-wider">{rosterRecord.admission_no}</span>
                </div>
                {(rosterRecord.class_name || rosterRecord.section) && (
                  <div>
                    <span className="text-slate-400 font-medium block">Class & Section:</span>
                    <span className="font-bold text-slate-800 uppercase">
                      {rosterRecord.class_name || "—"} {rosterRecord.section ? `(Sec-${rosterRecord.section})` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile number section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#0E3B91] uppercase tracking-wide border-b pb-1.5 border-slate-100">Contact Information</h3>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Aadhaar Linked Mobile Number *</label>
                <input
                  required
                  type="text"
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 outline-none text-sm transition"
                  value={form.mobile_no}
                  onChange={(e) => handleNumberChange("mobile_no", e.target.value, 10)}
                />
                <span className="text-[9px] text-slate-400 mt-1 block">Used for OTP verification during Aadhaar authentication.</span>
              </div>
            </div>

            {/* Student Aadhaar Details */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-[#0E3B91] uppercase tracking-wide border-b pb-1.5 border-slate-100">Student Aadhaar Information</h3>
              
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Student Name (Exactly as on Aadhaar Card) *</label>
                <input
                  required
                  type="text"
                  placeholder="STUDENT NAME"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 outline-none text-sm uppercase transition"
                  value={form.student_aadhaar_name}
                  onChange={(e) => handleTextChange("student_aadhaar_name", e.target.value.toUpperCase())}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Date of Birth (as on Aadhaar Card) *</label>
                  <input
                    required
                    type="date"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-250 outline-none text-sm transition"
                    value={form.student_dob}
                    onChange={(e) => handleTextChange("student_dob", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Gender *</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-250 outline-none text-sm bg-white"
                    value={form.student_gender}
                    onChange={(e) => handleTextChange("student_gender", e.target.value)}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Student Aadhaar Card Number *</label>
                <input
                  required
                  type="text"
                  placeholder="12-digit Aadhaar Number"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-250 outline-none text-sm tracking-widest transition"
                  value={form.student_aadhaar_no}
                  onChange={(e) => handleNumberChange("student_aadhaar_no", e.target.value, 12)}
                />
              </div>
            </div>

            {/* Parent Aadhaar Details */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-[#0E3B91] uppercase tracking-wide border-b pb-1.5 border-slate-100">Parent Aadhaar Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider">FATHER'S DETAILS</div>
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Father's Name (As on Aadhaar) *</label>
                    <input
                      required
                      type="text"
                      placeholder="FATHER NAME"
                      className="w-full px-3 py-2 rounded-xl border border-slate-250 outline-none text-xs sm:text-sm uppercase transition"
                      value={form.father_aadhaar_name}
                      onChange={(e) => handleTextChange("father_aadhaar_name", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Father's Aadhaar Number *</label>
                    <input
                      required
                      type="text"
                      placeholder="12-digit Aadhaar"
                      className="w-full px-3 py-2 rounded-xl border border-slate-250 outline-none text-xs sm:text-sm tracking-wider transition"
                      value={form.father_aadhaar_no}
                      onChange={(e) => handleNumberChange("father_aadhaar_no", e.target.value, 12)}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider">MOTHER'S DETAILS</div>
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Mother's Name (As on Aadhaar) *</label>
                    <input
                      required
                      type="text"
                      placeholder="MOTHER NAME"
                      className="w-full px-3 py-2 rounded-xl border border-slate-250 outline-none text-xs sm:text-sm uppercase transition"
                      value={form.mother_aadhaar_name}
                      onChange={(e) => handleTextChange("mother_aadhaar_name", e.target.value.toUpperCase())}
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Mother's Aadhaar Number *</label>
                    <input
                      required
                      type="text"
                      placeholder="12-digit Aadhaar"
                      className="w-full px-3 py-2 rounded-xl border border-slate-250 outline-none text-xs sm:text-sm tracking-wider transition"
                      value={form.mother_aadhaar_no}
                      onChange={(e) => handleNumberChange("mother_aadhaar_no", e.target.value, 12)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Declaration Consent box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-[#0E3B91] focus:ring-[#0E3B91] mt-0.5"
                  checked={form.consent}
                  onChange={(e) => handleTextChange("consent", e.target.checked)}
                />
                <span className="text-[11px] text-slate-650 leading-relaxed font-medium">
                  I hereby give consent to S.D. Public School, Patna to use the Aadhaar numbers and details of the student, father, and mother for official verification and Automated Permanent Academic Account Registry (APAAR) ID generation.
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                type="button"
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-250 hover:bg-slate-50 text-slate-600 font-bold text-xs transition"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-6 bg-[#0E3B91] hover:bg-[#0E3B91]/95 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Submit Consent Form
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS SCREEN */}
        {step === 3 && (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-lg text-center space-y-6 animate-fade-up">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-headline font-black text-slate-800">Submission Successful!</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your Aadhaar details and consent have been recorded. The school coordinator will review and compile the data for APAAR ID registration.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl max-w-md mx-auto text-[10px] sm:text-xs text-emerald-800 leading-relaxed font-medium">
              Thank you for cooperating with the Ministry of Education's guidelines. No further action is required.
            </div>

            <button
              onClick={() => {
                setAdmissionNo("");
                setForm({
                  admission_no: "",
                  student_name: "",
                  father_name: "",
                  student_aadhaar_name: "",
                  student_aadhaar_no: "",
                  student_dob: "",
                  student_gender: "Male",
                  father_aadhaar_name: "",
                  father_aadhaar_no: "",
                  mother_aadhaar_name: "",
                  mother_aadhaar_no: "",
                  class_name: "",
                  section: "",
                  mobile_no: "",
                  consent: true
                });
                setStep(1);
              }}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Submit Another Student
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-[10px] text-slate-400 border-t border-slate-100">
        © {new Date().getFullYear()} S.D. Public School, Patna. All rights reserved.
      </footer>
    </div>
  );
}
