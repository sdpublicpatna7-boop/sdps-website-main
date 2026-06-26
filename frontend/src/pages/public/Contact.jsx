import { useState } from "react";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { useOutletContext } from "react-router-dom";
import { Phone, Mail, MapPin, Loader2 } from "lucide-react";
import SEO from "../../components/layout/SEO";

export default function Contact() {
  const { settings } = useOutletContext() || {};
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/contact", form);
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch { toast.error("Failed to send"); } finally { setLoading(false); }
  };

  const s = settings || {};
  return (
    <>
      <SEO 
        title="Contact Us & Location Map | S.D. Public School Patna"
        description="Contact S.D. Public School in Kumhrar, Patna. Get directions, phone numbers, and admission helpline details. Visit our Maurya Colony campus today."
        keywords="contact SDPS, S.D. Public School Patna phone number, school email Patna, campus address Suryamuni Devi Public School"
      />
      <Toaster position="top-right" />
      <section className="bg-hero-grad py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="overline mb-3">Get in Touch</div>
          <h1 className="legacy-title brand-gradient-text">Contact SDPS</h1>
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-10">
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-black/5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center"><MapPin className="w-5 h-5 text-brand-blue" /></div>
            <div>
              <div className="text-xs uppercase font-bold text-brand-orange tracking-wider">Address</div>
              <p className="text-sm text-brand-ink/70 mt-1">{s.address}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center"><Phone className="w-5 h-5 text-brand-orange" /></div>
            <div>
              <div className="text-xs uppercase font-bold text-brand-orange tracking-wider">Phone</div>
              <p className="text-sm text-brand-ink/70 mt-1">{s.phone_primary}</p>
              <p className="text-sm text-brand-ink/70">{s.phone_secondary}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-black/5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center"><Mail className="w-5 h-5 text-brand-gold" /></div>
            <div>
              <div className="text-xs uppercase font-bold text-brand-orange tracking-wider">Email</div>
              <p className="text-sm text-brand-ink/70 mt-1">{s.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-3xl p-7 border border-black/5 space-y-4" data-testid="contact-form">
          <div className="grid sm:grid-cols-2 gap-4">
            <input required placeholder="Full Name" className="px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} data-testid="contact-name" />
            <input required type="email" placeholder="Email" className="px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} data-testid="contact-email" />
            <input type="tel" placeholder="Phone" className="px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input placeholder="Subject" className="px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
          </div>
          <textarea required rows={5} placeholder="Your Message" className="w-full px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} data-testid="contact-message" />
          <button type="submit" disabled={loading} className="btn-primary w-full" data-testid="contact-submit-btn">{loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Send Message"}</button>
        </form>
      </div>
    </>
  );
}
