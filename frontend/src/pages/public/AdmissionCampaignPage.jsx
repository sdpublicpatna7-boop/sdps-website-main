import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Phone, MessageSquare, Download, CheckCircle2,
  Sparkles, Award, Shield, BookOpen, Clock, Users,
  Heart, ChevronRight, Check, MapPin, ArrowRight,
  School, Send, Loader2, Play
} from "lucide-react";
import { toast, Toaster } from "sonner";
import SEO from "@/components/layout/SEO";
import api from "@/lib/api";

export function AdmissionCampaignPage() {
  const { slug } = useParams();
  const targetSlug = slug || "session-2026-27-admissions";

  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);

  // Enquiry form state
  const [form, setForm] = useState({
    parent_name: "",
    student_name: "",
    contact_phone: "",
    email: "",
    student_class: "Nursery",
    message: "",
    answers: {},
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/admission-campaigns/${targetSlug}`)
      .then((res) => {
        setCampaign(res.data);
      })
      .catch((err) => {
        console.error("Failed to load campaign:", err);
        // Fallback to general list
        api.get("/admission-campaigns").then((r) => {
          if (r.data && r.data.length > 0) {
            setCampaign(r.data[0]);
          }
        });
      })
      .finally(() => setLoading(false));
  }, [targetSlug]);

  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admission/enquiry", {
        ...form,
        campaign_slug: campaign?.slug || targetSlug,
        source: "campaign",
      });
      toast.success("Enquiry submitted! Our admissions office will contact you shortly.");
      setSubmitted(true);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to submit enquiry. Please try again or call us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 text-brand-blue animate-spin" />
        <div className="text-sm font-bold text-slate-500">Loading School Showcase & Admissions Pack...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <School className="w-16 h-16 text-slate-300" />
        <h2 className="text-2xl font-bold text-slate-800">Showcase Not Found</h2>
        <p className="text-sm text-slate-500">The requested campaign link is no longer active.</p>
        <Link to="/admission-enquiry" className="btn-primary">
          Submit General Admission Enquiry
        </Link>
      </div>
    );
  }

  return (
    <>
      <SEO
        title={`${campaign.title} | S.D. Public School Patna`}
        description={campaign.description || "Discover school activities, transparent fee structure, STEM robotics, and admissions at S.D. Public School Patna."}
        keywords="SDPS Patna admissions, school fees Patna, CBSE school activities Patna, top school Kumhrar"
      />
      <Toaster position="top-right" />

      {/* Top Admissions Announcement Bar */}
      <div className="bg-brand-navy text-white text-xs font-bold py-2.5 px-4 text-center border-b border-brand-orange/30 flex items-center justify-center gap-2 flex-wrap">
        <span className="px-2 py-0.5 rounded-full bg-brand-orange text-[10px] font-black uppercase tracking-wider">
          {campaign.badge || "SESSION 2026-27 ADMISSIONS"}
        </span>
        <span>Admissions Open from Playgroup to Class VIII</span>
        <span className="hidden sm:inline">•</span>
        <a href="tel:+919955190262" className="text-brand-orange-light hover:underline flex items-center gap-1 font-bold">
          <Phone className="w-3 h-3" /> Helpline: +91 99551 90262
        </a>
      </div>

      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={campaign.cover_image || "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80"}
            alt={campaign.title}
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-brand-orange-light text-xs font-bold tracking-wide">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                <span>{campaign.badge || "Admissions 2026-27"}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-headline tracking-tight leading-tight">
                {campaign.title}
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl">
                {campaign.description}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <a
                  href="#enquiry-form"
                  className="px-6 py-3.5 rounded-2xl bg-brand-orange hover:bg-brand-orange-light text-white text-sm font-black transition shadow-lg shadow-brand-orange/30 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Enquire for Admission
                </a>

                <a
                  href="#fee-structure"
                  className="px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-black transition border border-white/20 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> View Fee Structure
                </a>

                <a
                  href="https://wa.me/919955190262?text=Hello%20SDPS%20Admissions%20Desk,%20I%20would%20like%20to%20enquire%20about%20admission%20for%20my%20child."
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" /> Chat on WhatsApp
                </a>
              </div>
            </div>

            {/* Right Quick Highlights Pill */}
            <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/15 shadow-2xl space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-orange-light flex items-center gap-2">
                <Award className="w-4 h-4" /> Why Parents Choose SDPS:
              </h3>

              <div className="space-y-3">
                {(campaign.highlights || []).map((h, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-200">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <MapPin className="w-3.5 h-3.5 text-brand-orange" /> Kumhrar Campus, Patna
                </span>
                <span className="font-bold text-white">CBSE Affiliated Pattern</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 1: SCHOOL ACTIVITIES SHOWCASE ================= */}
      {campaign.activities && campaign.activities.length > 0 && (
        <section className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 space-y-12">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-block px-3 py-1 rounded-full bg-blue-100 text-brand-blue text-xs font-black uppercase tracking-widest">
                Experiential Learning & Activities
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline">
                Vibrant Campus Life & Activities
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                At S.D. Public School, learning extends beyond textbooks. Discover how we nurture creativity, curiosity, and sportsmanship.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {campaign.activities.map((act, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                      <img
                        src={act.image || "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=600&q=80"}
                        alt={act.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      {act.category && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold">
                            {act.category}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-5 space-y-2">
                      <h3 className="text-base font-black text-slate-900 group-hover:text-brand-blue transition">
                        {act.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                        {act.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="text-[11px] font-bold text-brand-orange flex items-center gap-1 group-hover:translate-x-1 transition">
                      Explore Activity <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= SECTION 2: TRANSPARENT FEE STRUCTURE ================= */}
      {campaign.fee_structure_summary && campaign.fee_structure_summary.length > 0 && (
        <section id="fee-structure" className="py-16 sm:py-20 bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-6 space-y-10">
            <div className="text-center space-y-3 max-w-2xl mx-auto">
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest">
                100% Fee Transparency
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline">
                Class-Wise Fee Structure (Session 2026-27)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Transparent and affordable fee structure with zero hidden development fees. We offer 25% sibling concessions and academic scholarships.
              </p>
            </div>

            {/* Fee Table */}
            <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-brand-navy text-white text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-5 font-bold">Class / Grade Slab</th>
                      <th className="py-3.5 px-5 font-bold">Monthly Tuition Fee</th>
                      <th className="py-3.5 px-5 font-bold">One-Time Admission Fee</th>
                      <th className="py-3.5 px-5 font-bold">Inclusions & Activities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-700">
                    {campaign.fee_structure_summary.map((row, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition">
                        <td className="py-4 px-5 font-black text-slate-900">{row.class_range}</td>
                        <td className="py-4 px-5 font-bold text-brand-blue">{row.monthly_fee}</td>
                        <td className="py-4 px-5 font-semibold text-slate-600">{row.admission_fee}</td>
                        <td className="py-4 px-5 text-xs text-slate-500">{row.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sibling discount banner inside fee card */}
              <div className="p-4 bg-amber-50/80 border-t border-amber-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-amber-900 font-medium">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Sibling Concession:</strong> 25% discount on tuition fees for the younger sibling.
                  </span>
                </div>
                <Link to="/fee-structure" className="font-bold text-brand-blue hover:underline whitespace-nowrap">
                  View Full Fee Policy →
                </Link>
              </div>
            </div>

            {/* Download brochure buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              {campaign.prospectus_url && (
                <a
                  href={campaign.prospectus_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4 text-brand-orange" /> Download School Prospectus PDF
                </a>
              )}
              <Link
                to="/admissions"
                className="px-5 py-3 rounded-xl bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                Apply Online Form (₹500) <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ================= SECTION 3: EMBEDDED INSTANT ENQUIRY FORM ================= */}
      <section id="enquiry-form" className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-black uppercase tracking-wider">
                <MessageSquare className="w-3.5 h-3.5" /> Direct Admission Desk
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline">
                Submit Your Admission Enquiry
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Fill in the details below. Our admissions counsellor will get back to you with class-specific details and campus tour availability.
              </p>
            </div>

            {submitted ? (
              <div className="p-8 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-emerald-900">Enquiry Submitted Successfully!</h3>
                <p className="text-xs text-emerald-700 max-w-md mx-auto">
                  Thank you for your interest in S.D. Public School. A confirmation has been sent to your phone/email. Our admissions team will contact you shortly.
                </p>
                <div className="pt-2">
                  <a
                    href="tel:+919955190262"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-emerald-700"
                  >
                    <Phone className="w-3.5 h-3.5" /> Call Admissions Desk Directly: +91 99551 90262
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitEnquiry} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Parent / Guardian Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={form.parent_name}
                      onChange={(e) => setForm({ ...form, parent_name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Student's Full Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. Aryan Kumar"
                      value={form.student_name}
                      onChange={(e) => setForm({ ...form, student_name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone Number *</label>
                    <input
                      required
                      type="tel"
                      placeholder="e.g. 9955190262"
                      value={form.contact_phone}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-blue"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                    <input
                      required
                      type="email"
                      placeholder="e.g. parent@gmail.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-blue"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Class Seeking Admission *</label>
                    <select
                      value={form.student_class}
                      onChange={(e) => setForm({ ...form, student_class: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-brand-blue"
                    >
                      <option value="Playgroup">Playgroup (Age 2-3)</option>
                      <option value="Nursery">Nursery (Age 3-4)</option>
                      <option value="LKG">LKG (Age 4-5)</option>
                      <option value="UKG">UKG / Prep (Age 5-6)</option>
                      <option value="Class I">Class I</option>
                      <option value="Class II">Class II</option>
                      <option value="Class III">Class III</option>
                      <option value="Class IV">Class IV</option>
                      <option value="Class V">Class V</option>
                      <option value="Class VI">Class VI</option>
                      <option value="Class VII">Class VII</option>
                      <option value="Class VIII">Class VIII</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Enquiry Details / Query (What are you enquiring about?)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Enquiring about admission availability, syllabus, fee structure, hostel, or transport facility..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-blue"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 rounded-2xl bg-brand-orange hover:bg-brand-orange-light text-white text-sm font-black transition shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Submit Admission Enquiry
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Sticky Mobile Call Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center gap-2 z-40 shadow-xl">
        <a
          href="tel:+919955190262"
          className="flex-1 py-3 bg-brand-navy text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Phone className="w-3.5 h-3.5" /> Call Helpline
        </a>
        <a
          href="https://wa.me/919955190262?text=Hello%20SDPS%20Admissions%20Desk,%20I%20would%20like%20to%20enquire%20about%20admission."
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-3 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
        >
          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
        </a>
      </div>
    </>
  );
}

export default AdmissionCampaignPage;
