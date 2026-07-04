import { useState, useEffect } from "react";
import PageHero, { DocEmbed, fullUrl } from "@/components/layout/PageHero";
import api from "@/lib/api";
import { Bed, Utensils, BookOpen, Trophy, HeartPulse, ShieldAlert } from "lucide-react";

export function Hostel() {
  const [siteSettings, setSiteSettings] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [hostelFees, setHostelFees] = useState([]);

  useEffect(() => {
    api.get("/site-settings").then(r => setSiteSettings(r.data)).catch(() => {});
    api.get("/hostel-gallery").then(r => setGallery(r.data)).catch(() => {});
    api.get("/hostel-fee-rows").then(r => setHostelFees(r.data)).catch(() => {});
  }, []);

  const foodMenuUrl = siteSettings?.hostel_food_menu_pdf_url || "";
  const checklistUrl = siteSettings?.hostel_checklist_pdf_url || "";

  const schedule = [
    { time: "5:30 AM", activity: "Wake Up Call" },
    { time: "5:45 – 6:15 AM", activity: "Morning Exercise / Jogging" },
    { time: "6:15 – 6:45 AM", activity: "Bath & Getting Ready" },
    { time: "7:00 – 7:15 AM", activity: "Morning Prayer & Meditation" },
    { time: "7:15 – 1:30 PM", activity: "School Hours (Classes)" },
    { time: "2:00 – 2:30 PM", activity: "Lunch" },
    { time: "2:30 – 3:30 PM", activity: "Rest / Nap" },
    { time: "4:00 – 6:00 PM", activity: "Tutorial Tuition" },
    { time: "6:00 – 7:30 PM", activity: "Games (Outdoor)" },
    { time: "8:00 – 8:15 PM", activity: "Evening Snacks" },
    { time: "8:30 – 9:00 PM", activity: "Study / Homework" },
    { time: "9:00 – 9:30 PM", activity: "Dinner" },
    { time: "9:30 PM", activity: "Lights Out / Sleep" },
  ];

  return (
    <>
      <PageHero pill="Safe · Secure · Homely" title="Hostel Facilities"
        subtitle="SDPS provides well-supervised hostel facilities for boys, with comfortable dormitories, hygienic food, and 24×7 security." />

      {/* Hero image */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="rounded-3xl overflow-hidden shadow-xl">
          <img src="/hostel-hero.jpg" alt="Boys Hostel at SDPS"
            className="w-full object-cover h-[450px]"
            onError={e => { e.target.style.display = "none"; }} />
        </div>
      </div>

      {/* Intro + Instagram + Facilities */}
      <section className="py-8 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 items-start">
          <div>
            <div className="overline mb-3">Boys Hostel at SDPS</div>
            <h2 className="section-title mb-4">Comfortable Living with <span className="brand-gradient-text">Academic Focus</span></h2>
            <p className="text-brand-ink/70 mb-5">Well-supervised hostel for boys with comfortable dormitories, hygienic food, study schedules, recreational activities, and 24×7 security.</p>
            <div className="rounded-2xl overflow-hidden border border-black/10 shadow-sm">
              <iframe src="https://www.instagram.com/p/DITC1ktSLAY/embed/?autoplay=1&playsinline=1&controls=0&show_caption=0&show_comments=0"
                className="w-full h-80" frameBorder="0" scrolling="no" allowTransparency title="Hostel Life at SDPS" />
            </div>
            <a href="https://www.instagram.com/p/DITC1ktSLAY/" target="_blank" rel="noreferrer"
              className="text-xs text-brand-blue flex items-center gap-1 mt-2 hover:underline">📸 View on Instagram</a>
          </div>
          <div className="space-y-3">
            {[
              { icon: Bed, color: "text-brand-blue bg-blue-50", title: "Spacious Rooms", desc: "Well-ventilated dormitories with comfortable bedding and storage space" },
              { icon: Utensils, color: "text-brand-orange bg-orange-50", title: "Healthy Meals", desc: "Nutritious and hygienic meals prepared under expert supervision" },
              { icon: BookOpen, color: "text-emerald-500 bg-emerald-50", title: "Daily Study Hours", desc: "Supervised study sessions with tutor support" },
              { icon: Trophy, color: "text-amber-500 bg-amber-50", title: "Indoor & Outdoor Sports", desc: "Regular sports activities for physical development" },
              { icon: HeartPulse, color: "text-rose-500 bg-rose-50", title: "Regular Health Check-ups", desc: "Periodic medical examinations by qualified doctors" },
              { icon: ShieldAlert, color: "text-purple-500 bg-purple-50", title: "24×7 CCTV Security", desc: "Round-the-clock surveillance with trained security personnel" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-4 bg-brand-paper rounded-2xl px-5 py-3.5">
                <div className={`w-10 h-10 rounded-xl ${f.color} flex items-center justify-center shrink-0`}>
                  <f.icon className="w-5.5 h-5.5" />
                </div>
                <div>
                  <div className="font-headline font-semibold text-brand-ink text-sm">{f.title}</div>
                  <div className="text-xs text-brand-ink/60 mt-0.5">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Schedule */}
      <section className="py-14 bg-brand-paper">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Routine</div>
          <h2 className="section-title text-center mb-8">Daily Schedule</h2>
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
            {schedule.map((s, i) => (
              <div key={i} className={`flex items-center gap-5 px-6 py-3.5 border-b border-black/5 last:border-0 ${i % 2 === 0 ? "bg-white" : "bg-brand-paper/50"}`}>
                <div className="text-brand-blue font-headline font-semibold text-sm w-36 shrink-0">{s.time}</div>
                <div className="text-brand-ink/80 text-sm">{s.activity}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hostel Fee Structure */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Hostel Fees</div>
          <h2 className="section-title text-center mb-8">Hostel Fee Structure</h2>
          {hostelFees.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-black/5 shadow-sm">
              <table className="w-full bg-white min-w-[500px]">
                <thead>
                  <tr className="bg-brand-blue text-white text-sm">
                    <th className="px-5 py-4 text-left font-semibold">Category</th>
                    <th className="px-5 py-4 text-left font-semibold">Monthly Fee</th>
                    <th className="px-5 py-4 text-left font-semibold">Annual Fee</th>
                    <th className="px-5 py-4 text-left font-semibold">Admission Fee</th>
                    <th className="px-5 py-4 text-left font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {hostelFees.map((row, i) => (
                    <tr key={row.id} className={`border-t border-black/5 ${i % 2 === 0 ? "bg-white" : "bg-brand-paper"}`}>
                      <td className="px-5 py-3.5 font-semibold text-brand-blue text-sm">{row.category}</td>
                      <td className="px-5 py-3.5 text-sm text-brand-ink/70">{row.monthly_fee || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-brand-ink/70">{row.annual_fee || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-brand-ink/70">{row.admission_fee || "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-brand-ink/60 italic">{row.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-brand-paper rounded-2xl p-8 text-center border border-black/5">
              <p className="text-brand-ink/50 text-sm mb-2">Hostel fee details will be published soon.</p>
              <p className="text-xs text-brand-ink/40">Contact school office for current hostel fee rates.</p>
            </div>
          )}
          <p className="text-xs text-brand-ink/40 mt-3 text-center">* Fees subject to change. Contact school for latest rates.</p>
        </div>
      </section>

      {/* Food Menu Embed */}
      <section className="py-14 bg-brand-paper">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Nutrition</div>
          <h2 className="section-title text-center mb-8">Hostel Food Menu</h2>
          <DocEmbed url={foodMenuUrl} title="Hostel Food Menu" height="600px" />
        </div>
      </section>

      {/* Student Checklist Embed */}
      {checklistUrl && (
        <section className="py-14 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="overline mb-3 text-center">What to Bring</div>
            <h2 className="section-title text-center mb-8">Student Checklist</h2>
            <DocEmbed url={checklistUrl} title="Hostel Student Checklist" height="560px" />
          </div>
        </section>
      )}

      {/* Gallery */}
      <section className="py-14 bg-brand-paper">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Life at the Hostel</div>
          <h2 className="section-title text-center mb-8">Hostel Gallery</h2>
          {gallery.length > 0 ? (
            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {gallery.map((item, i) => (
                <div key={item.id || i} className="rounded-2xl overflow-hidden break-inside-avoid border border-black/5 shadow-sm group">
                  <img src={fullUrl(item.image_url)} alt={item.caption || `Hostel ${i + 1}`}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {item.caption && (
                    <div className="px-3 py-2 text-xs text-brand-ink/60 bg-white">{item.caption}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {["https://sdpublic.org/img/feature.jpg", "https://sdpublic.org/assets/img/banner.jpg", "https://sdpublic.org/assets/img/about_new.jpg"].map((src, i) => (
                <div key={i} className="rounded-2xl overflow-hidden aspect-video border border-black/5">
                  <img src={src} alt={`Hostel ${i + 1}`} className="w-full object-contain max-h-64 bg-white hover:scale-105 transition-transform duration-500"
                    onError={e => { e.target.style.display = "none"; }} />
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm text-brand-ink/50 mt-5">More photos coming soon.</p>
        </div>
      </section>

      {/* Safety + Contact */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-6">
          <div className="bg-brand-paper rounded-3xl p-7">
            <h3 className="font-headline text-xl font-semibold mb-3">🛡️ Safety & Security</h3>
            <p className="text-brand-ink/70 text-sm leading-relaxed">
              Hostel premises under <strong>24/7 CCTV surveillance</strong> with trained security personnel.
              Regular fire drills and safety workshops are conducted to ensure student safety.
            </p>
          </div>
          <div className="bg-gradient-to-br from-brand-blue to-brand-blue/80 rounded-3xl p-7 text-white">
            <h3 className="font-headline text-xl font-semibold mb-3">Contact Warden</h3>
            <p className="text-white/80 text-sm mb-4">For hostel admissions, fees, or any residential queries:</p>
            <div className="space-y-2">
              <a href="tel:+919955190262" className="flex items-center gap-2 text-sm font-semibold bg-white/10 rounded-xl px-4 py-2 hover:bg-white/20 transition">📞 +91 99551 90262</a>
              <a href="tel:+919955190162" className="flex items-center gap-2 text-sm font-semibold bg-white/10 rounded-xl px-4 py-2 hover:bg-white/20 transition">📞 +91 99551 90162</a>
              <a href="mailto:helpdesk@sdpublic.org" className="flex items-center gap-2 text-sm font-semibold bg-white/10 rounded-xl px-4 py-2 hover:bg-white/20 transition">✉️ helpdesk@sdpublic.org</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default Hostel;
