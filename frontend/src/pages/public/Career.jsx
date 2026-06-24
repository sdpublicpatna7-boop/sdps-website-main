import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Briefcase, Loader2, Check } from "lucide-react";
import { FileOrUrlField } from "../../components/admin/ResourceManager";
import SEO from "../../components/layout/SEO";

function Field({ label, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-brand-ink/60 block mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const INP = "w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none font-[inherit] text-sm";

export default function Career() {
  const { settings } = useOutletContext() || {};
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [resumeUrl, setResumeUrl] = useState("");

  const careerHeroRaw = settings?.career_hero_image_url || "/sdps-team.png";
  const careerHeroUrl = careerHeroRaw.startsWith("http")
    ? careerHeroRaw
    : `${process.env.REACT_APP_BACKEND_URL || ""}${careerHeroRaw}`;

  // Real form fields from SDPS career form
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    dob: "",
    gender: "",
    address: "",
    qualification: "",
    specialization: "",
    experience_years: "",
    current_employer: "",
    applying_for: "",
    subjects_can_teach: "",
    classes_can_teach: "",
    expected_salary: "",
    joining_availability: "",
    reference: "",
    about_yourself: "",
  });

  useEffect(() => {
    api.get("/career/posts").then(r => setPosts(r.data)).catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!resumeUrl) { toast.error("Please upload your resume or paste a link"); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: form.full_name,
        email: form.email,
        phone: form.phone,
        subject: form.applying_for || (selectedPost ? posts.find(p => p.id === selectedPost)?.title : ""),
        post_id: selectedPost || "",
        answers: JSON.stringify({ ...form, resume_url: resumeUrl }),
      };
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
      await api.post("/career/apply", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Application submitted successfully!");
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Submission failed. Please try again.");
    } finally { setSubmitting(false); }
  };

  if (done) return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-10 max-w-md text-center border border-brand-gold/30 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-headline text-2xl font-semibold mt-1">Application Received!</h2>
        <p className="text-brand-ink/70 text-sm mt-3 leading-relaxed">
          Thank you for applying to S.D. Public School. Our HR team will review your application and contact you shortly.
        </p>
        <button onClick={() => setDone(false)} className="btn-glass text-sm mt-6 inline-block">Submit Another</button>
      </div>
    </div>
  );

  return (
    <>
      <SEO 
        title="Careers & Faculty Openings"
        description="Join our team of dedicated educators and staff members at S.D. Public School, Patna. Explore current job openings, requirements, and apply online."
        keywords="SDPS careers, teacher jobs Patna, join school faculty Bihar, S.D. Public School employment"
      />
      <Toaster position="top-right" />

      {/* Hero */}
      <section className="bg-hero-grad py-14">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="overline mb-3">Join Our Team</div>
          <h1 className="legacy-title brand-gradient-text">Careers at SDPS</h1>
          <p className="mt-4 text-brand-ink/70 max-w-xl mx-auto">
            Be part of a passionate team that shapes the future. We're always looking for dedicated educators and staff.
          </p>
        </div>
      </section>

      {/* SDPS Team Photo */}
      <section className="py-10 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Meet the Team</div>
          <h2 className="section-title text-center mb-6">Our Dedicated Faculty</h2>
          <div className="rounded-3xl overflow-hidden bg-white">
            <img
              src={careerHeroUrl}
              alt="SDPS Teaching Team"
              className="w-full object-contain"
              style={{ maxHeight: "340px", objectPosition: "center" }}
            />
          </div>
          <p className="text-center text-sm text-brand-ink/50 mt-4">
            S.D. Public School's dedicated team of educators — empowering generations since 1994.
          </p>
        </div>
      </section>

      {/* Current Openings */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="section-title mb-6">
          <Briefcase className="inline w-7 h-7 text-brand-orange mr-2" />Current Openings
        </h2>
        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-brand-ink/60 italic border border-black/5">
            No active openings right now. You can still apply below for future opportunities.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {posts.map(p => (
              <div
                key={p.id}
                onClick={() => { setSelectedPost(p.id); set("applying_for", p.title); document.getElementById("applyForm").scrollIntoView({ behavior: "smooth" }); }}
                className={`bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg ${selectedPost === p.id ? "border-brand-blue shadow-md" : "border-black/5 hover:border-brand-blue/30"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-headline font-semibold text-brand-blue">{p.title}</div>
                    <div className="text-sm text-brand-ink/60 mt-1">{p.description}</div>
                    {p.requirements && <div className="text-xs text-brand-ink/50 mt-2 italic">Requirements: {p.requirements}</div>}
                  </div>
                  {selectedPost === p.id && (
                    <span className="bg-brand-blue text-white text-xs font-bold px-2.5 py-1 rounded-full shrink-0">Selected</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Application Form */}
      <section className="max-w-3xl mx-auto px-6 pb-16" id="applyForm">
        <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-brand-blue to-brand-blue/80 px-8 py-5 text-white">
            <h2 className="font-headline text-xl font-semibold">Employment Application Form</h2>
            <p className="text-white/70 text-sm mt-1">S.D. Public School, Patna — Empowering Generations Since 1994</p>
          </div>

          <form onSubmit={submit} className="p-8 space-y-5">

            {/* Section: Personal Info */}
            <div className="font-headline font-semibold text-brand-blue border-b border-black/5 pb-2 mb-1">
              Personal Information
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <input required className={INP} value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="As per documents" />
              </Field>
              <Field label="Date of Birth" required>
                <input required type="date" className={INP} value={form.dob} onChange={e => set("dob", e.target.value)} />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Gender" required>
                <select required className={INP} value={form.gender} onChange={e => set("gender", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </Field>
              <Field label="Mobile Number" required>
                <input required type="tel" className={INP} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+91 XXXXX XXXXX" />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Email Address" required>
                <input required type="email" className={INP} value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" />
              </Field>
              <Field label="WhatsApp Number">
                <input type="tel" className={INP} value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} placeholder="If different from mobile" />
              </Field>
            </div>

            <Field label="Current Address" required>
              <textarea required className={INP} rows={2} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Full residential address" />
            </Field>

            {/* Section: Qualification */}
            <div className="font-headline font-semibold text-brand-blue border-b border-black/5 pb-2 mt-4 mb-1">
              Qualification & Experience
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Highest Qualification" required>
                <select required className={INP} value={form.qualification} onChange={e => set("qualification", e.target.value)}>
                  <option value="">Select...</option>
                  <option>B.Ed.</option><option>M.Ed.</option><option>B.A.</option><option>M.A.</option>
                  <option>B.Sc.</option><option>M.Sc.</option><option>B.Com.</option><option>M.Com.</option>
                  <option>B.Tech / B.E.</option><option>M.Tech</option><option>Ph.D.</option>
                  <option>Diploma</option><option>12th Pass</option><option>Other</option>
                </select>
              </Field>
              <Field label="Specialization / Subject" required>
                <input required className={INP} value={form.specialization} onChange={e => set("specialization", e.target.value)} placeholder="e.g. Mathematics, English Literature" />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Total Teaching Experience">
                <select className={INP} value={form.experience_years} onChange={e => set("experience_years", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Fresher (0 years)</option><option>Less than 1 year</option>
                  <option>1–2 years</option><option>3–5 years</option>
                  <option>6–10 years</option><option>10+ years</option>
                </select>
              </Field>
              <Field label="Current / Previous Employer">
                <input className={INP} value={form.current_employer} onChange={e => set("current_employer", e.target.value)} placeholder="School / Institution name" />
              </Field>
            </div>

            {/* Section: Position */}
            <div className="font-headline font-semibold text-brand-blue border-b border-black/5 pb-2 mt-4 mb-1">
              Position Applied For
            </div>

            <Field label="Applying For" required>
              <select required className={INP} value={form.applying_for} onChange={e => set("applying_for", e.target.value)}>
                <option value="">Select position...</option>
                {posts.map(p => <option key={p.id} value={p.title}>{p.title}</option>)}
                <option>PRT (Primary Teacher)</option>
                <option>TGT (Trained Graduate Teacher)</option>
                <option>PGT (Post Graduate Teacher)</option>
                <option>Pre-School Teacher</option>
                <option>Computer Teacher</option>
                <option>Physical Education Teacher</option>
                <option>Art & Craft Teacher</option>
                <option>Music Teacher</option>
                <option>Administrative Staff</option>
                <option>Accountant</option>
                <option>Other</option>
              </select>
            </Field>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Subjects You Can Teach">
                <input className={INP} value={form.subjects_can_teach} onChange={e => set("subjects_can_teach", e.target.value)} placeholder="e.g. Maths, Science, English" />
              </Field>
              <Field label="Classes You Can Teach">
                <input className={INP} value={form.classes_can_teach} onChange={e => set("classes_can_teach", e.target.value)} placeholder="e.g. Class I–V, VI–VIII" />
              </Field>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Expected Salary (per month)">
                <input className={INP} value={form.expected_salary} onChange={e => set("expected_salary", e.target.value)} placeholder="e.g. ₹15,000 – ₹20,000" />
              </Field>
              <Field label="Availability to Join">
                <select className={INP} value={form.joining_availability} onChange={e => set("joining_availability", e.target.value)}>
                  <option value="">Select...</option>
                  <option>Immediately</option><option>Within 15 days</option>
                  <option>Within 1 month</option><option>Within 2 months</option><option>More than 2 months</option>
                </select>
              </Field>
            </div>

            <Field label="How did you hear about this opening?">
              <select className={INP} value={form.reference} onChange={e => set("reference", e.target.value)}>
                <option value="">Select...</option>
                <option>School Website</option><option>Friend / Colleague</option>
                <option>WhatsApp / Social Media</option><option>Walk-in</option><option>Other</option>
              </select>
            </Field>

            <Field label="About Yourself">
              <textarea className={INP} rows={3} value={form.about_yourself} onChange={e => set("about_yourself", e.target.value)} placeholder="Brief introduction — your teaching philosophy, achievements, etc." />
            </Field>

            {/* Resume */}
            <div className="border-t border-black/5 pt-5">
              <div className="font-headline font-semibold text-brand-blue mb-3">Upload Resume *</div>
              <p className="text-xs text-brand-ink/50 mb-3">Upload your resume from device (PDF/DOC) or paste a Google Drive / Dropbox link.</p>
              <FileOrUrlField value={resumeUrl} onChange={setResumeUrl} subDir="resumes" maxMb={5} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3 mt-2 disabled:opacity-60"
            >
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : "Submit Application"}
            </button>

            <p className="text-xs text-center text-brand-ink/40">
              By submitting, you agree that the information provided is accurate. SDPS will contact shortlisted candidates.
            </p>
          </form>
        </div>
      </section>
    </>
  );
}
