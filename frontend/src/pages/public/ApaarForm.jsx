import { useState } from "react";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Loader2, Fingerprint, ShieldCheck, CheckCircle2, ChevronRight, AlertTriangle, ArrowLeft } from "lucide-react";

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
    class_name: "I",
    section: "A",
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
        setRosterRecord(r.data.student);
        setForm(prev => ({
          ...prev,
          admission_no: r.data.student.admission_no,
          student_name: r.data.student.student_name,
          father_name: r.data.student.father_name
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

  const classes = ["Nursery", "LKG", "UKG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const sections = ["A", "B", "C", "D", "E"];

  return (
    <>
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <section className="bg-hero-grad py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-bold uppercase tracking-wider mb-3">
            <Fingerprint className="w-4 h-4" /> APAAR Registry Setup
          </div>
          <h1 className="legacy-title brand-gradient-text">APAAR ID Consent & Registration</h1>
          <p className="mt-4 text-brand-ink/70 max-w-xl mx-auto text-sm sm:text-base">
            Create your Automated Permanent Academic Account Registry (APAAR) ID. Fill out the form below according to your official Aadhaar Card details.
          </p>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        
        {/* Progress Bar indicator */}
        <div className="flex items-center justify-between mb-8 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <div className={`flex items-center gap-1.5 ${step >= 1 ? "text-brand-blue" : ""}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${step >= 1 ? "border-brand-blue bg-brand-blue text-white" : "border-slate-350"}`}>1</span>
            Verify Roster
          </div>
          <div className="h-px bg-slate-200 flex-1 mx-3" />
          <div className={`flex items-center gap-1.5 ${step >= 2 ? "text-brand-blue" : ""}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${step >= 2 ? "border-brand-blue bg-brand-blue text-white" : "border-slate-350"}`}>2</span>
            Aadhaar Info
          </div>
          <div className="h-px bg-slate-200 flex-1 mx-3" />
          <div className={`flex items-center gap-1.5 ${step >= 3 ? "text-brand-blue" : ""}`}>
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${step >= 3 ? "border-brand-blue bg-brand-blue text-white" : "border-slate-350"}`}>3</span>
            Success
          </div>
        </div>

        {/* STEP 1: VERIFICATION */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
            <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <ShieldCheck className="w-10 h-10 text-brand-blue shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Official Roster Check</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Only students registered in the school's enrollment database are eligible. Enter your Admission Number below to confirm your record.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                  School Admission Number *
                </label>
                <input
                  required
                  placeholder="e.g. 1945/22"
                  className="w-full px-4 py-3 rounded-xl border border-slate-250 focus:border-brand-blue outline-none text-sm transition"
                  value={admissionNo}
                  onChange={(e) => setAdmissionNo(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-brand-blue to-brand-blue-light text-white font-bold rounded-xl text-sm hover:scale-[1.01] transition shadow-sm disabled:opacity-50"
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
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
            
            {/* School details confirmed (Read-only block) */}
            <div className="p-4 bg-emerald-50/70 border border-emerald-150 rounded-2xl">
              <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-2">Verified School Records</div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium block">Student Name:</span>
                  <span className="font-bold text-slate-800 uppercase">{rosterRecord.student_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Father's Name (School):</span>
                  <span className="font-bold text-slate-800 uppercase">{rosterRecord.father_name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 font-medium block">Admission No:</span>
                  <span className="font-bold text-slate-800 uppercase tracking-wider">{rosterRecord.admission_no}</span>
                </div>
              </div>
            </div>

            {/* General Class Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wide border-b pb-1.5 border-slate-100">School Enrollment Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Class *</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-250 outline-none text-xs sm:text-sm bg-white"
                    value={form.class_name}
                    onChange={(e) => handleTextChange("class_name", e.target.value)}
                  >
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Section *</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-250 outline-none text-xs sm:text-sm bg-white"
                    value={form.section}
                    onChange={(e) => handleTextChange("section", e.target.value)}
                  >
                    {sections.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              
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
              <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wide border-b pb-1.5 border-slate-100">Student Aadhaar Information</h3>
              
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <span className="text-[9px] text-slate-400 mt-1 block">Aadhaar details will be encrypted and submitted securely.</span>
              </div>
            </div>

            {/* Parent Aadhaar Details */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-brand-blue uppercase tracking-wide border-b pb-1.5 border-slate-100">Parent Aadhaar Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold text-slate-450 tracking-wider">FATHER'S DETAILS</div>
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
                  <div className="text-[10px] font-bold text-slate-450 tracking-wider">MOTHER'S DETAILS</div>
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
                  className="rounded border-slate-350 text-brand-blue focus:ring-brand-blue mt-0.5"
                  checked={form.consent}
                  onChange={(e) => handleTextChange("consent", e.target.checked)}
                />
                <span className="text-[11px] text-slate-600 leading-relaxed font-medium">
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
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-6 bg-gradient-to-r from-brand-blue to-brand-blue-light text-white font-bold rounded-xl text-xs hover:scale-[1.01] transition shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting Form...
                  </>
                ) : (
                  <>
                    Submit APAAR Details
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS SCREEN */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-xl text-center space-y-6 animate-fade-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-headline font-black text-slate-800">Submission Successful!</h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Your Aadhaar details have been recorded. The school coordinator will review and compile the data for APAAR ID registration.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl max-w-md mx-auto text-xs text-emerald-800 leading-relaxed font-medium">
              Thank you for cooperating with the Ministry of Education's guidelines. No further action is required from your end.
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
                  class_name: "I",
                  section: "A",
                  mobile_no: "",
                  consent: true
                });
                setStep(1);
              }}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-755 font-bold rounded-xl text-xs transition"
            >
              Submit Another Student
            </button>
          </div>
        )}
      </div>
    </>
  );
}
