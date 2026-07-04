import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api, { parseImageTransform } from "../../lib/api";
import { Trophy, Shield, Lightbulb, Dumbbell, Zap, Target, Activity, Users, UserCheck, Sparkles } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
function fullUrl(u) { return u?.startsWith("http") ? u : `${BACKEND}${u}`; }

export default function KheloPatna() {
  const { settings } = useOutletContext() || {};
  const heroImgRaw = settings?.khelo_patna_hero_image_url || "/khelo-patna-hero.jpg";
  const { style: heroImgStyle, cleanUrl: cleanHeroImg } = parseImageTransform(heroImgRaw);
  const heroImgUrl = cleanHeroImg.startsWith("http") || (cleanHeroImg.startsWith("/") && !cleanHeroImg.startsWith("/static")) ? cleanHeroImg : `${BACKEND}${cleanHeroImg}`;

  const features = [
    { icon: Dumbbell, color: "text-brand-blue bg-blue-50", title: "Elite Turf Facility", desc: "Premium quality artificial turf suitable for football, cricket, and multi-sports activities." },
    { icon: Activity, color: "text-emerald-500 bg-emerald-50", title: "All-Weather Play", desc: "Play in any weather condition — rain or sunshine — on our all-weather sports surface." },
    { icon: Lightbulb, color: "text-amber-500 bg-amber-50", title: "Floodlit Ground", desc: "Evening sports sessions available under high-quality floodlights for extended practice hours." },
    { icon: Trophy, color: "text-brand-orange bg-orange-50", title: "Tournaments & Events", desc: "Regular inter-school tournaments, sports events and fitness competitions organized jointly." },
    { icon: UserCheck, color: "text-purple-500 bg-purple-50", title: "Professional Coaching", desc: "Expert coaches available for structured training sessions in football and other sports." },
    { icon: Shield, color: "text-rose-500 bg-rose-50", title: "Safe & Monitored", desc: "Fully supervised facility ensuring student safety and professional sports environment." },
  ];

  const [gallery, setGallery] = useState([]);
  useEffect(() => {
    api.get("/khelo-patna-gallery").then(r => setGallery(r.data || [])).catch(() => {});
  }, []);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-grad py-20">
        <div className="absolute inset-0 opacity-5">
          <div className="w-full h-full" style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #0e3b91 0%, transparent 60%), radial-gradient(circle at 70% 50%, #f97316 0%, transparent 60%)" }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          {/* Dual logos */}
          <div className="flex items-center justify-center gap-6 mb-8">
            {settings?.logo_url ? (
              <img src={fullUrl(settings.logo_url)} alt="SDPS"
                className="h-20 w-20 rounded-full ring-4 ring-brand-gold object-contain bg-white p-1" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-slate-100 animate-pulse border border-slate-200" />
            )}
            <div className="text-4xl font-black text-brand-ink/20">×</div>
            <div className="h-20 w-20 rounded-full ring-4 ring-amber-400 bg-brand-ink overflow-hidden flex items-center justify-center">
              <img src="/khelo-patna-logo.png" alt="Khelo Patna" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 bg-brand-orange/10 text-brand-orange text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-4">
            Official Partnership
          </div>
          <h1 className="font-headline text-5xl md:text-6xl font-black text-brand-ink leading-tight mb-2">
            SDPS <span className="text-brand-blue">×</span> Khelo Patna
          </h1>
          <h2 className="font-headline text-2xl md:text-3xl font-bold text-brand-orange mb-6">
            Elite Turf
          </h2>
          <p className="text-brand-ink/70 text-lg max-w-2xl mx-auto leading-relaxed">
            S.D. Public School proudly partners with <strong>Khelo Patna Elite Turf</strong> — bringing
            world-class sports infrastructure and professional coaching directly to our students.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <a href="tel:+919955190262" className="btn-primary">📞 Contact School</a>
            <a href="#features" className="btn-glass">Explore Partnership ↓</a>
          </div>
        </div>
      </section>

      {/* Partnership Banner */}
      <section className="bg-brand-blue py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <p className="text-lg font-headline font-semibold leading-relaxed">
            Empowering students with access to professional-grade sports facilities —
            because a healthy body builds a healthy mind.
          </p>
        </div>
      </section>

      {/* About */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="overline mb-3">About the Partnership</div>
            <h2 className="section-title mb-5">Where Education Meets <span className="brand-gradient-text">Excellence</span></h2>
            <p className="text-brand-ink/70 leading-relaxed mb-4">
              S.D. Public School has partnered with Khelo Patna Elite Turf to provide students with
              access to premium sports infrastructure. This collaboration ensures that our students
              get holistic development — combining academic excellence with physical fitness and
              sportsmanship.
            </p>
            <p className="text-brand-ink/70 leading-relaxed mb-6">
              Through this partnership, SDPS students enjoy <strong>priority access to elite turf sessions</strong>,
              professional coaching, inter-school tournaments, and regular fitness events — all just
              minutes away from our campus.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-brand-paper rounded-2xl px-5 py-4 text-center">
                <div className="text-3xl font-black text-brand-blue">1000+</div>
                <div className="text-xs text-brand-ink/60 font-semibold uppercase tracking-wide mt-1">Students Benefited</div>
              </div>
              <div className="bg-brand-paper rounded-2xl px-5 py-4 text-center">
                <div className="text-3xl font-black text-brand-orange">5+</div>
                <div className="text-xs text-brand-ink/60 font-semibold uppercase tracking-wide mt-1">Sports Covered</div>
              </div>
              <div className="bg-brand-paper rounded-2xl px-5 py-4 text-center flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-1">
                  <Trophy className="w-5 h-5" />
                </div>
                <div className="text-xs text-brand-ink/60 font-semibold uppercase tracking-wide mt-1">Tournaments Hosted</div>
              </div>
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl bg-slate-50 flex items-center justify-center">
            <img src={heroImgUrl} alt="SDPS Khelo Patna Partnership"
              style={heroImgStyle}
              className="w-full object-contain max-h-[400px]"
              onError={e => e.target.style.display = "none"} />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-brand-paper" id="features">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">What We Offer</div>
          <h2 className="section-title text-center mb-10">Facilities & Benefits</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-black/5 beam-card hover:-translate-y-1 hover:shadow-lg transition-all flex flex-col items-start">
                <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-4`}>
                  <f.icon className="w-6 h-6" />
                </div>
                <h3 className="font-headline font-semibold text-lg text-brand-blue mb-2">{f.title}</h3>
                <p className="text-sm text-brand-ink/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports offered */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Sports & Activities</div>
          <h2 className="section-title text-center mb-8">Available Sports</h2>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { sport: "Football", icon: Dumbbell, color: "text-brand-blue bg-blue-50" },
              { sport: "Cricket", icon: Target, color: "text-brand-orange bg-orange-50" },
              { sport: "Athletics", icon: Zap, color: "text-amber-500 bg-amber-50" },
              { sport: "Basketball", icon: Activity, color: "text-red-500 bg-red-50" },
              { sport: "Badminton", icon: Trophy, color: "text-purple-500 bg-purple-50" },
              { sport: "Kabaddi", icon: Users, color: "text-emerald-500 bg-emerald-50" },
            ].map((s, i) => (
              <div key={i} className="bg-gradient-to-br from-brand-blue/5 to-brand-orange/5 border border-brand-blue/10 rounded-2xl px-6 py-5 text-center hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center justify-center min-w-[120px]">
                <div className={`w-12 h-12 rounded-2xl ${s.color} flex items-center justify-center mb-3`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div className="font-headline font-semibold text-brand-ink">{s.sport}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-14 bg-brand-paper">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Glimpses</div>
          <h2 className="section-title text-center mb-8">Sports at SDPS</h2>
          {gallery.length > 0 ? (
            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {gallery.map((item, i) => (
                <div key={item.id || i} className="break-inside-avoid rounded-2xl overflow-hidden shadow-sm border border-black/5">
                  <img src={fullUrl(item.image_url)} alt={item.caption || `Sports ${i + 1}`}
                    className="w-full object-contain bg-white hover:scale-105 transition-transform duration-500" />
                  {item.caption && <div className="px-3 py-2 text-xs text-brand-ink/60 bg-white">{item.caption}</div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-black/5 p-10 text-center text-brand-ink/50">
              Photos coming soon.
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-brand-blue to-brand-blue/90">
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="font-headline text-3xl font-bold mb-4">Want Your Child to Join?</h2>
          <p className="text-white/80 text-base mb-8 leading-relaxed">
            SDPS students get priority access to Khelo Patna Elite Turf. Take admission at SDPS and
            unlock a world of sports, fitness, and co-curricular excellence.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/admissions" className="bg-white text-brand-blue font-headline font-bold px-8 py-3 rounded-xl hover:bg-brand-paper transition">
              Apply for Admission →
            </Link>
            <a href="tel:+919955190262" className="border-2 border-white/40 text-white font-headline font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition">
              📞 Call Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
