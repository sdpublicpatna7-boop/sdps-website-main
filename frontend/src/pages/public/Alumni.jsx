import { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Loader2, Check, Calendar, MapPin } from "lucide-react";
import SEO from "../../components/layout/SEO";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
function fullUrl(u) { return u?.startsWith("http") ? u : `${BACKEND}${u}`; }

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Alumni() {
  const [settings, setSettings] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [meets, setMeets] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", year_passed: "", answers: {} });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api.get("/alumni/settings").then(r => setSettings(r.data)).catch(() => {});
    api.get("/alumni/questions").then(r => setQuestions(r.data)).catch(() => {});
    api.get("/alumni/meets").then(r => setMeets(r.data)).catch(() => {});
  }, []);

  if (settings && !settings.is_visible) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center px-6">
        <div>
          <h2 className="legacy-title brand-gradient-text">Alumni Section</h2>
          <p className="text-brand-ink/60 mt-3">Coming soon. Stay tuned!</p>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1) register
      const reg = await api.post("/alumni/register", { ...form, amount: settings?.membership_amount || 500 });
      const member_id = reg.data.id;
      const amount = settings?.membership_amount || 500;
      // 2) order
      const ok = await loadRazorpay();
      if (!ok) { toast.error("Failed to load payment SDK"); setSubmitting(false); return; }
      const order = await api.post("/alumni/create-order", { member_id, amount });
      const opts = {
        key: order.data.key_id,
        amount: order.data.amount,
        currency: "INR",
        name: "S.D. Public School",
        description: "Alumni Membership",
        order_id: order.data.order_id,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: "#0E3B91" },
        handler: async (resp) => {
          try {
            await api.post("/alumni/verify-payment", {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            });
            toast.success("Welcome to the SDPS Alumni Family!");
            setDone(true);
          } catch { toast.error("Payment verification failed"); }
          finally { setSubmitting(false); }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      };
      new window.Razorpay(opts).open();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO 
        title="Alumni Network"
        description="Re-connect with the S.D. Public School alumni network. Join our alumni association, register for upcoming meets, and share your success stories."
        keywords="SDPS alumni, S.D. Public School alumni, alumni network Patna, school alumni meets Bihar"
      />
      <Toaster position="top-right" />
      <section className="bg-hero-grad py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="overline mb-3">SDPS Alumni Network</div>
          <h1 className="legacy-title brand-gradient-text">Once SDPS, Always SDPS</h1>
          <p className="mt-4 text-brand-ink/70 max-w-2xl mx-auto">{settings?.intro_text || "Reconnect, reminisce and rebuild memories."}</p>
        </div>
      </section>

      {/* Meets */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="section-title mb-6">Upcoming Alumni Meets</h2>
        {meets.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-brand-ink/60 italic border border-black/5">No meets announced yet.</div>}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {meets.map(m => (
            <div key={m.id} className="bg-white rounded-2xl overflow-hidden border border-black/5 beam-card" data-testid={`meet-${m.id}`}>
              {m.image_url && <img src={fullUrl(m.image_url)} alt="" className="w-full object-contain max-h-44 bg-white" />}
              <div className="p-5">
                <h3 className="font-headline font-semibold text-lg">{m.title}</h3>
                <div className="flex items-center gap-2 text-xs text-brand-orange uppercase tracking-wider mt-2"><Calendar className="w-3 h-3" /> {m.date}</div>
                {m.location && <div className="flex items-center gap-2 text-xs text-brand-ink/60 mt-1"><MapPin className="w-3 h-3" /> {m.location}</div>}
                {m.description && <p className="text-sm text-brand-ink/70 mt-3">{m.description}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Membership Form */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl p-8 border-2 border-brand-gold/30">
          <div className="text-center mb-6">
            <div className="overline text-brand-gold mb-2">Become a Lifetime Member</div>
            <h2 className="section-title">Alumni Membership Form</h2>
            <div className="mt-3 inline-block px-4 py-2 bg-gold-grad text-white rounded-full font-headline font-bold text-lg">
              ₹{settings?.membership_amount || 500}
            </div>
          </div>
          {done ? (
            <div className="text-center py-6">
              <Check className="w-12 h-12 text-emerald-600 mx-auto" />
              <h3 className="font-headline text-xl font-semibold mt-3">You're now an SDPS Alumni member!</h3>
              <p className="text-brand-ink/60 text-sm mt-2">A confirmation email has been sent.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" data-testid="alumni-form">
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="text-xs uppercase font-bold tracking-wider text-brand-ink/60">Name *</label><input required className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="alumni-name" /></div>
                <div><label className="text-xs uppercase font-bold tracking-wider text-brand-ink/60">Email *</label><input required type="email" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="alumni-email" /></div>
                <div><label className="text-xs uppercase font-bold tracking-wider text-brand-ink/60">Phone *</label><input required type="tel" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} data-testid="alumni-phone" /></div>
                <div><label className="text-xs uppercase font-bold tracking-wider text-brand-ink/60">Year of Passing *</label><input required className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" placeholder="e.g. 2010" value={form.year_passed} onChange={e => setForm({ ...form, year_passed: e.target.value })} data-testid="alumni-year" /></div>
              </div>
              {questions.map(q => (
                <div key={q.id}>
                  <label className="text-xs uppercase font-bold tracking-wider text-brand-ink/60">{q.label} {q.required && "*"}</label>
                  {q.type === "textarea"
                    ? <textarea required={q.required} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" rows={3} value={form.answers[q.id] || ""} onChange={(e) => setForm({ ...form, answers: { ...form.answers, [q.id]: e.target.value } })} data-testid={`alumni-q-${q.id}`} />
                    : <input type={q.type === "select" ? "text" : q.type} required={q.required} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.answers[q.id] || ""} onChange={(e) => setForm({ ...form, answers: { ...form.answers, [q.id]: e.target.value } })} data-testid={`alumni-q-${q.id}`} />}
                </div>
              ))}
              <button type="submit" disabled={submitting} className="btn-gold w-full disabled:opacity-60" data-testid="alumni-pay-btn">
                {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing...</span> : `Pay ₹${settings?.membership_amount || 500} & Become Member`}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
