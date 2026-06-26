import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api, { parseImageTransform } from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Loader2, Check } from "lucide-react";
import { ImageOrUrlField, FileOrUrlField } from "../../components/admin/ResourceManager";
import SEO from "../../components/layout/SEO";

function DynamicField({ q, value, onChange }) {
  const cls = "w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 outline-none";
  if (q.type === "textarea") return <textarea data-testid={`field-${q.id}`} required={q.required} placeholder={q.placeholder} className={cls} rows={3} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  if (q.type === "select") return (
    <select data-testid={`field-${q.id}`} required={q.required} className={cls} value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select...</option>
      {(q.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  if (q.type === "date") return <input type="date" data-testid={`field-${q.id}`} required={q.required} className={cls} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  return <input type={q.type} data-testid={`field-${q.id}`} required={q.required} placeholder={q.placeholder} className={cls} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
}

export function AdmissionEnquiry() {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState({ parent_name: "", student_name: "", contact_phone: "", email: "", student_class: "", answers: {} });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get("/admission/enquiry-questions").then((r) => setQuestions(r.data)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admission/enquiry", form);
      toast.success("Enquiry submitted! We'll be in touch soon.");
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit. Please try again.");
    } finally { setSubmitting(false); }
  };

  if (done) return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-10 max-w-md text-center border border-brand-gold/30">
        <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center mb-4"><Check className="w-8 h-8 text-emerald-600" /></div>
        <h2 className="font-headline text-2xl font-semibold mb-2">Thank you!</h2>
        <p className="text-brand-ink/70 text-sm">We've received your enquiry. Our admissions team will contact you shortly via call, email and SMS.</p>
        <Link to="/" className="btn-primary inline-block mt-6">Back to Home</Link>
      </div>
    </div>
  );

  return (
    <>
      <SEO 
        title="Admission Enquiry"
        description="Submit an admission enquiry for your child at S.D. Public School, Patna. Fill out student details, and our admissions office will reach out to you."
        keywords="SDPS admission enquiry, school admissions Patna, CBSE school enquiry Patna"
      />
      <Toaster position="top-right" />
      <section className="bg-hero-grad py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="overline mb-3">Begin your SDPS Journey</div>
          <h1 className="legacy-title brand-gradient-text">Admission Enquiry</h1>
          <p className="mt-4 text-brand-ink/70">Fill in your details and our team will guide you through the next steps.</p>
        </div>
      </section>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <form onSubmit={submit} className="bg-white rounded-3xl p-8 border border-black/5 space-y-4 shadow-sm" data-testid="enquiry-form">
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">Parent Name *</label><input required className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20" value={form.parent_name} onChange={e => setForm({ ...form, parent_name: e.target.value })} data-testid="enquiry-parent-name" /></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">Student Name *</label><input required className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-blue" value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} data-testid="enquiry-student-name" /></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">Contact Phone *</label><input required type="tel" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-blue" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} data-testid="enquiry-phone" /></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">Email *</label><input required type="email" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-blue" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="enquiry-email" /></div>
            <div className="sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">Class Seeking Admission *</label><input required className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 outline-none focus:border-brand-blue" placeholder="e.g. Class V" value={form.student_class} onChange={e => setForm({ ...form, student_class: e.target.value })} data-testid="enquiry-class" /></div>
          </div>

          {questions.map(q => (
            <div key={q.id}>
              <label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60">{q.label} {q.required && "*"}</label>
              <div className="mt-1"><DynamicField q={q} value={form.answers[q.id]} onChange={(v) => setForm({ ...form, answers: { ...form.answers, [q.id]: v } })} /></div>
            </div>
          ))}

          <button type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60" data-testid="enquiry-submit-btn">
            {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span> : "Submit Enquiry"}
          </button>
          <p className="text-xs text-brand-ink/50 text-center">A confirmation will be sent to your email and SMS.</p>
        </form>
      </div>
    </>
  );
}

export function AdmissionForm() {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [paymentStep, setPaymentStep] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [birthCertUrl, setBirthCertUrl] = useState("");
  const [prevMarksheetUrl, setPrevMarksheetUrl] = useState("");
  const [applicationId, setApplicationId] = useState("");

  const [form, setForm] = useState({
    student_name:"",dob:"",gender:"",blood_group:"",
    applying_class:"",previous_school:"",previous_class:"",
    father_name:"",father_occupation:"",father_phone:"",father_email:"",
    mother_name:"",mother_occupation:"",mother_phone:"",
    residential_address:"",city:"",pincode:"",
    medical_condition:"",transport_required:"",hostel_required:"",
    siblings_in_school:"",how_did_you_hear:"",reference_name:"",
  });

  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const INP = "w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none font-[inherit] text-sm";

  const submit = async (e) => {
    e.preventDefault();
    if(!photoUrl){toast.error("Please upload a passport-size photo");return;}
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("answers", JSON.stringify({
        ...form,photo_url:photoUrl,
        birth_certificate_url:birthCertUrl,
        prev_marksheet_url:prevMarksheetUrl,
      }));
      const r = await api.post("/admission/apply", fd, {headers:{"Content-Type":"multipart/form-data"}});
      setApplicationId(r.data?.id || "ADM-"+Date.now());
      setPaymentStep(true);
    } catch(err){
      toast.error(err?.response?.data?.detail||"Submission failed. Please try again.");
    } finally{setSubmitting(false);}
  };

  const handlePayment = async () => {
    const settings = window.__sdps_settings || {};
    let order;
    try {
      const r = await api.post("/admission/create-order", { application_id: applicationId });
      order = r.data;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 503) {
        toast.error("Payment not configured. Contact school office.");
      } else {
        toast.error(err?.response?.data?.detail || "Could not start payment. Please try again.");
      }
      return;
    }
    const key = order.key_id || settings.razorpay_key_id || process.env.REACT_APP_RAZORPAY_KEY_ID || "";
    if (!key) {
      toast.error("Payment not configured. Contact school office.");
      return;
    }
    const options = {
      key,
      order_id: order.order_id,
      amount: order.amount, // paise, from server
      currency: order.currency || "INR",
      name:"S.D. Public School",
      description:"Admission Registration Fee",
      image:"https://sdpublic.org/assets/img/logo.png",
      handler: async (response) => {
        try {
          await api.post("/admission/payment-confirm", {
            application_id: applicationId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          // Send receipt email
          await api.post("/admission/send-receipt", {
            application_id: applicationId,
            payment_id: response.razorpay_payment_id,
            student_name: form.student_name,
            email: form.father_email || form.mother_phone,
            amount: Math.round((order.amount || 0) / 100),
          }).catch(()=>{});
          setDone(true);
        } catch(err){
          toast.error("Payment could not be verified. If money was deducted, contact school with payment ID: "+response.razorpay_payment_id);
        }
      },
      prefill:{name:form.father_name, email:form.father_email, contact:form.father_phone},
      theme:{color:"#0E3B91"},
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const SH = ({title}) => (
    <div className="font-headline font-semibold text-brand-blue border-b border-black/5 pb-2 mt-6 mb-3 flex items-center gap-2">
      <span className="w-1 h-5 bg-brand-orange rounded-full inline-block"></span>{title}
    </div>
  );

  if(done) return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-10 max-w-md text-center border border-brand-gold/30 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600"/>
        </div>
        <h2 className="font-headline text-2xl font-semibold">Application Received!</h2>
        <p className="text-brand-ink/70 text-sm mt-3 leading-relaxed">
          Your application and ₹500 registration fee have been received. A receipt has been sent to your email.
          Our admissions team will contact you within 2 working days.
        </p>
        <p className="text-xs text-brand-ink/40 mt-2">Application ID: {applicationId}</p>
        <Link to="/" className="btn-primary inline-block mt-6">Back to Home</Link>
      </div>
    </div>
  );

  if(paymentStep) return (
    <>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl p-10 max-w-md text-center border border-black/5 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💳</span>
          </div>
          <h2 className="font-headline text-2xl font-semibold text-brand-ink">One Last Step</h2>
          <p className="text-brand-ink/70 text-sm mt-3 mb-6 leading-relaxed">
            Your application form has been saved. Please pay the <strong>₹500 Registration Fee</strong> to confirm your admission application.
          </p>
          <div className="bg-brand-paper rounded-2xl p-5 mb-6 text-left">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-brand-ink/60">Student Name</span>
              <span className="font-semibold">{form.student_name}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-brand-ink/60">Class</span>
              <span className="font-semibold">{form.applying_class}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-black/5 pt-2 mt-2">
              <span className="font-bold">Registration Fee</span>
              <span className="font-bold text-brand-blue text-lg">₹500</span>
            </div>
          </div>
          <button onClick={handlePayment} className="btn-primary w-full text-base py-3 mb-3">
            Pay ₹500 Registration Fee →
          </button>
          <p className="text-xs text-brand-ink/40">Secure payment via Razorpay. UPI, Cards, Net Banking accepted.</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <SEO 
        title="Online Admission Form"
        description="Fill out the official online student admission form for S.D. Public School, Patna. Upload required certificates and pay the registration fee securely."
        keywords="online admission form SDPS, S.D. Public School registration, CBSE school application Patna"
      />
      <Toaster position="top-right"/>
      <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      <section className="bg-hero-grad py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="overline mb-3">Admission 2026-27</div>
          <h1 className="legacy-title brand-gradient-text">Admission Application Form</h1>
          <p className="mt-4 text-brand-ink/70">S.D. Public School, Patna — Playgroup to Class VIII</p>
        </div>
      </section>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 text-sm text-amber-800">
          <strong>Before filling this form:</strong> Keep ready — passport photo, Birth Certificate, and previous class marksheet (if applicable). A non-refundable registration fee of <strong>₹500</strong> will be collected after form submission.
        </div>
        <form onSubmit={submit} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-brand-blue to-brand-blue/80 px-8 py-5 text-white">
            <h2 className="font-headline text-xl font-semibold">Student Admission Form</h2>
            <p className="text-white/70 text-sm mt-1">S.D. Public School · Maurya Colony, Gulzarbagh Road, Patna-07</p>
          </div>
          <div className="p-8 space-y-4">
            <SH title="Student Details"/>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Student Full Name *</label>
                <input required className={INP} value={form.student_name} onChange={e=>set("student_name",e.target.value)} placeholder="As per birth certificate"/></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Date of Birth *</label>
                <input required type="date" className={INP} value={form.dob} onChange={e=>set("dob",e.target.value)}/></div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Gender *</label>
                <select required className={INP} value={form.gender} onChange={e=>set("gender",e.target.value)}>
                  <option value="">Select...</option><option>Male</option><option>Female</option>
                </select></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Blood Group</label>
                <select className={INP} value={form.blood_group} onChange={e=>set("blood_group",e.target.value)}>
                  <option value="">Select...</option>
                  {["A+","A−","B+","B−","AB+","AB−","O+","O−","Don't Know"].map(g=><option key={g}>{g}</option>)}
                </select></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Applying for Class *</label>
                <select required className={INP} value={form.applying_class} onChange={e=>set("applying_class",e.target.value)}>
                  <option value="">Select...</option>
                  {["Playgroup","Nursery","KG-I","KG-II","Class I","Class II","Class III","Class IV","Class V","Class VI","Class VII","Class VIII"].map(c=><option key={c}>{c}</option>)}
                </select></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Previous School</label>
                <input className={INP} value={form.previous_school} onChange={e=>set("previous_school",e.target.value)} placeholder="If applicable"/></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Last Class Passed</label>
                <input className={INP} value={form.previous_class} onChange={e=>set("previous_class",e.target.value)} placeholder="e.g. Class II"/></div>
            </div>

            <SH title="Father's Details"/>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Father's Name *</label>
                <input required className={INP} value={form.father_name} onChange={e=>set("father_name",e.target.value)}/></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Occupation</label>
                <input className={INP} value={form.father_occupation} onChange={e=>set("father_occupation",e.target.value)}/></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Mobile Number *</label>
                <input required type="tel" className={INP} value={form.father_phone} onChange={e=>set("father_phone",e.target.value)}/></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Email Address</label>
                <input type="email" className={INP} value={form.father_email} onChange={e=>set("father_email",e.target.value)}/></div>
            </div>

            <SH title="Mother's Details"/>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Mother's Name *</label>
                <input required className={INP} value={form.mother_name} onChange={e=>set("mother_name",e.target.value)}/></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Occupation</label>
                <input className={INP} value={form.mother_occupation} onChange={e=>set("mother_occupation",e.target.value)}/></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Mobile</label>
                <input type="tel" className={INP} value={form.mother_phone} onChange={e=>set("mother_phone",e.target.value)}/></div>
            </div>

            <SH title="Address"/>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Residential Address *</label>
              <textarea required className={INP} rows={2} value={form.residential_address} onChange={e=>set("residential_address",e.target.value)}/></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">City *</label>
                <input required className={INP} value={form.city} onChange={e=>set("city",e.target.value)}/></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">PIN Code</label>
                <input className={INP} value={form.pincode} onChange={e=>set("pincode",e.target.value)}/></div>
            </div>

            <SH title="Additional Information"/>
            <div className="grid md:grid-cols-3 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Transport Required?</label>
                <select className={INP} value={form.transport_required} onChange={e=>set("transport_required",e.target.value)}>
                  <option value="">Select...</option><option>Yes</option><option>No</option>
                </select></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Hostel Required?</label>
                <select className={INP} value={form.hostel_required} onChange={e=>set("hostel_required",e.target.value)}>
                  <option value="">Select...</option><option>Yes</option><option>No</option>
                </select></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Siblings in SDPS?</label>
                <select className={INP} value={form.siblings_in_school} onChange={e=>set("siblings_in_school",e.target.value)}>
                  <option value="">Select...</option><option>Yes</option><option>No</option>
                </select></div>
            </div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Medical Condition / Special Needs</label>
              <input className={INP} value={form.medical_condition} onChange={e=>set("medical_condition",e.target.value)} placeholder="If any (leave blank if none)"/></div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">How did you hear about SDPS?</label>
                <select className={INP} value={form.how_did_you_hear} onChange={e=>set("how_did_you_hear",e.target.value)}>
                  <option value="">Select...</option>
                  <option>School Website</option><option>Friend / Relative</option>
                  <option>Social Media</option><option>Newspaper</option>
                  <option>Walk-in</option><option>Other</option>
                </select></div>
              <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Reference Name</label>
                <input className={INP} value={form.reference_name} onChange={e=>set("reference_name",e.target.value)}/></div>
            </div>

            <SH title="Documents Upload"/>
            <p className="text-xs text-brand-ink/50 -mt-2 mb-3">Upload from device or paste a Google Drive / Dropbox link.</p>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Passport Size Photo *</label>
              <ImageOrUrlField value={photoUrl} onChange={setPhotoUrl} subDir="admissions"/></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Birth Certificate</label>
              <FileOrUrlField value={birthCertUrl} onChange={setBirthCertUrl} subDir="admissions" maxMb={5}/></div>
            <div><label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">Previous Marksheet / Report Card</label>
              <FileOrUrlField value={prevMarksheetUrl} onChange={setPrevMarksheetUrl} subDir="admissions" maxMb={5}/></div>

            <div className="border-t border-black/5 pt-5">
              <button type="submit" disabled={submitting} className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3 disabled:opacity-60">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin"/>Saving...</> : "Continue to Payment (₹500) →"}
              </button>
              <p className="text-xs text-center text-brand-ink/40 mt-3">Non-refundable registration fee of ₹500 will be collected on next step via Razorpay.</p>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

export function AdmissionsLanding() {
  const { settings } = useOutletContext() || {};
  const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
  const prospectusRaw = settings?.prospectus_pdf_url;
  const prospectusUrl = prospectusRaw
    ? (prospectusRaw.startsWith("http") ? prospectusRaw : `${BACKEND}${prospectusRaw}`)
    : "https://sdpublic.org/assets/docs/Prospectus.pdf";

  const openButtonRawVal = settings?.admission_open_button_url || "https://sdpublic.org/assets/img/admission_open_button.png";
  const { style: openButtonStyle, cleanUrl: cleanOpenButton } = parseImageTransform(openButtonRawVal);
  const openButtonUrl = cleanOpenButton.startsWith("http")
    ? cleanOpenButton
    : `${BACKEND}${cleanOpenButton}`;

  const rankedBadgeRawVal = settings?.ranked_badge_url || "https://sdpublic.org/assets/img/ranked.png";
  const { style: rankedBadgeStyle, cleanUrl: cleanRankedBadge } = parseImageTransform(rankedBadgeRawVal);
  const rankedBadgeUrl = cleanRankedBadge.startsWith("http")
    ? cleanRankedBadge
    : `${BACKEND}${cleanRankedBadge}`;

  return (
    <>
      <SEO 
        title="School Admissions 2026-27 | S.D. Public School, Patna"
        description="Secure your child's future at S.D. Public School, Patna. Admissions open for Playgroup to Class VIII for academic session 2026-27 near Kumhrar. Apply online today!"
        keywords="SDPS admissions open, school admissions Patna, CBSE curriculum Playgroup to Class 8 admissions"
      />
      {/* Hero */}
      <section className="bg-hero-grad py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <img src={openButtonUrl} alt="" className="w-full h-full object-contain" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-orange/10 text-brand-orange text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-4">
            Join Our Family
          </div>
          <h1 className="legacy-title brand-gradient-text">Admissions Open for Session 2026-27</h1>
          <p className="mt-4 text-brand-ink/70 max-w-2xl mx-auto text-lg">
            Give your child the gift of quality education. Admissions are now open for <strong>Playgroup to Class VIII</strong>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a href="tel:+919955190262" className="btn-primary flex items-center gap-2">
              📞 9955190262
            </a>
            <a href="tel:+919955190162" className="btn-glass flex items-center gap-2">
              📞 9955190162
            </a>
          </div>
        </div>
      </section>

      {/* Easy Admission Process */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="overline mb-3 text-center">Easy Admission Process</div>
          <h2 className="section-title text-center mb-10">3 Simple Steps to Join SDPS</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "1", icon: "📋", title: "Fill Registration Form", desc: "Available at school office or apply online through our admission form.", action: "/admission-form", label: "Apply Online" },
              { step: "2", icon: "✏️", title: "Entrance Test", desc: "If applicable for the class applied. Our team will guide you through the process.", action: "/admission-enquiry", label: "Enquire Now" },
              { step: "3", icon: "✅", title: "Admission Confirmation", desc: "Document submission and fee payment to secure your child's seat at SDPS.", action: "/fee-structure", label: "View Fee Structure" },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-3xl border border-black/5 p-7 text-center beam-card hover:-translate-y-1 hover:shadow-xl transition-all">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-blue to-brand-orange text-white text-xl font-bold font-headline mx-auto flex items-center justify-center mb-4 shadow-md">
                  {s.step}
                </div>
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="font-headline font-semibold text-lg text-brand-ink mb-2">{s.title}</h3>
                <p className="text-sm text-brand-ink/60 mb-4">{s.desc}</p>
                <Link to={s.action} className="inline-block text-sm font-semibold text-brand-blue hover:underline">{s.label} →</Link>
              </div>
            ))}
          </div>

          {/* Admission image */}
          <div className="mt-10 rounded-3xl overflow-hidden shadow-xl text-center">
            <img src={openButtonUrl} alt="Admission Open"
              style={openButtonStyle}
              className="max-h-48 mx-auto object-contain py-4"
              onError={e => { e.target.style.display = "none"; }} />
          </div>
        </div>
      </section>

      {/* Download Prospectus */}
      <section className="py-10 bg-brand-paper">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-white rounded-3xl border border-black/5 p-7 flex flex-col md:flex-row items-center gap-6 shadow-sm">
            <div className="text-5xl shrink-0">📄</div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-headline text-xl font-semibold text-brand-ink mb-1">Download Our School Prospectus</h3>
              <p className="text-sm text-brand-ink/60">Get complete information about our school, facilities, curriculum, and values in our detailed prospectus.</p>
            </div>
            <a href={prospectusUrl} target="_blank" rel="noreferrer"
              className="btn-primary shrink-0 flex items-center gap-2">
              📥 Download Prospectus
            </a>
          </div>
        </div>
      </section>

      {/* Pre-School Section */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Our Preschool</div>
          <h2 className="section-title text-center mb-2">SDPS Curious Minds Pre-School</h2>

          <div className="flex justify-center mb-8">
            <img src={rankedBadgeUrl} alt="Top Ranked Pre-School"
              style={rankedBadgeStyle}
              className="h-20 object-contain"
              onError={e => { e.target.style.display = "none"; }} />
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            {/* About + Table */}
            <div>
              <div className="bg-brand-paper rounded-2xl p-6 mb-5">
                <h3 className="font-headline font-semibold text-xl text-brand-blue mb-3">About Curious Minds</h3>
                <p className="text-sm text-brand-ink/70 leading-relaxed">
                  At SDPS Curious Minds Pre-School, we believe that the early years are the most important years.
                  We offer a safe, loving, and creative environment where children explore, learn, and grow with confidence.
                  Our learning is play-based, joyful, and focused on building strong foundations for future success.
                </p>
              </div>

              <div className="font-headline font-semibold text-brand-ink mb-3">Programs Offered</div>
              <div className="overflow-x-auto rounded-2xl border border-black/5 shadow-sm">
                <table className="w-full bg-white">
                  <thead>
                    <tr className="bg-brand-blue text-white text-sm">
                      <th className="px-5 py-3 text-left font-semibold">Class</th>
                      <th className="px-5 py-3 text-left font-semibold">Age Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cls: "Play Group", age: "2+ Years" },
                      { cls: "Nursery", age: "3+ Years" },
                      { cls: "KG-I", age: "4+ Years" },
                      { cls: "KG-II", age: "5+ Years" },
                    ].map((r, i) => (
                      <tr key={i} className={`border-t border-black/5 ${i % 2 === 0 ? "bg-white" : "bg-brand-paper"}`}>
                        <td className="px-5 py-3 font-semibold text-brand-blue text-sm">{r.cls}</td>
                        <td className="px-5 py-3 text-sm text-brand-ink/70">{r.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Highlights + Why */}
            <div className="space-y-4">
              <div className="font-headline font-semibold text-brand-ink mb-2">Key Highlights</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Play-based joyful learning", "Safe, vibrant classrooms",
                  "Experienced teachers", "Art, Dance, Music programs",
                  "Outdoor Play & Field Trips", "Focus on life skills",
                ].map((h, i) => (
                  <div key={i} className="bg-brand-paper rounded-xl px-3 py-2.5 text-xs font-semibold text-brand-ink flex items-center gap-2">
                    <span className="text-brand-orange">✓</span>{h}
                  </div>
                ))}
              </div>

              <div className="font-headline font-semibold text-brand-ink mt-4 mb-2">Why Choose Us?</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: "🏆", label: "Top Ranked Pre-School in Patna" },
                  { icon: "👶", label: "Personalised attention" },
                  { icon: "🎉", label: "Regular events & competitions" },
                  { icon: "🎓", label: "Perfect prep for formal schooling" },
                ].map((w, i) => (
                  <div key={i} className="bg-white border border-black/5 rounded-2xl p-4 text-center">
                    <div className="text-2xl mb-1">{w.icon}</div>
                    <div className="text-xs font-semibold text-brand-ink">{w.label}</div>
                  </div>
                ))}
              </div>

              <div className="bg-gradient-to-br from-brand-orange to-amber-500 rounded-2xl p-6 text-white text-center mt-4">
                <p className="font-legacy text-2xl italic mb-3">
                  "At Curious Minds, every little step leads to a big future!"
                </p>
                <div className="font-headline font-bold text-lg mb-3">🌈 Admissions Open 2026-27!</div>
                <a href="https://forms.gle/uFEcV1KvaedQDG1C9" target="_blank" rel="noreferrer"
                  className="inline-block bg-white text-brand-orange font-bold text-sm px-6 py-2.5 rounded-xl hover:scale-105 transition">
                  Apply Now for Pre-School →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-10 bg-brand-paper">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Admission Enquiry", to: "/admission-enquiry", icon: "💬" },
            { label: "Full Application", to: "/admission-form", icon: "📝" },
            { label: "Age Eligibility", to: "/admission-eligibility", icon: "📅" },
            { label: "Fee Structure", to: "/fee-structure", icon: "💰" },
          ].map((l, i) => (
            <Link key={i} to={l.to} className="bg-white rounded-2xl p-5 text-center border border-black/5 hover:border-brand-blue hover:-translate-y-1 hover:shadow-lg transition-all beam-card">
              <div className="text-3xl mb-2">{l.icon}</div>
              <div className="text-sm font-headline font-semibold text-brand-ink">{l.label}</div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
