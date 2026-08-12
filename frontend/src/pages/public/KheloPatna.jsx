import { useState, useEffect } from "react";
import { Link, useOutletContext } from "react-router-dom";
import api, { parseImageTransform } from "../../lib/api";
import { Trophy, Shield, Lightbulb, Dumbbell, Zap, Target, Activity, Users, UserCheck, Sparkles, Phone } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
function fullUrl(u) { return u?.startsWith("http") ? u : `${BACKEND}${u}`; }

// Dedicated Custom SVG Icons for Sports
function FootballIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="12 7 15 9.5 14 13 10 13 9 9.5 12 7" fill="currentColor" fillOpacity="0.2" />
      <line x1="12" y1="7" x2="12" y2="2" />
      <line x1="15" y1="9.5" x2="19.5" y2="8" />
      <line x1="14" y1="13" x2="17" y2="17.5" />
      <line x1="10" y1="13" x2="7" y2="17.5" />
      <line x1="9" y1="9.5" x2="4.5" y2="8" />
    </svg>
  );
}

function CricketIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 20l10-10" strokeWidth="2.5" />
      <path d="M12 8l4-4 2 2-4 4-2-2z" fill="currentColor" fillOpacity="0.2" />
      <line x1="16" y1="4" x2="20" y2="8" />
      <circle cx="7" cy="7" r="2.5" fill="currentColor" fillOpacity="0.3" />
      <line x1="17" y1="14" x2="17" y2="21" />
      <line x1="19" y1="14" x2="19" y2="21" />
      <line x1="21" y1="14" x2="21" y2="21" />
      <line x1="16" y1="14" x2="22" y2="14" />
    </svg>
  );
}

function AthleticsIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="15" cy="4" r="2" fill="currentColor" fillOpacity="0.3" />
      <path d="M11 11l4-3 3 2" />
      <path d="M8 8l4 3-2 5" />
      <path d="M10 16l-3 4" />
      <path d="M10 16l4 1 3 4" />
      <line x1="3" y1="7" x2="7" y2="7" strokeDasharray="1 2" />
      <line x1="2" y1="12" x2="6" y2="12" strokeDasharray="1 2" />
    </svg>
  );
}

function BasketballIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="12" y1="2" x2="12" y2="22" />
      <path d="M4.93 4.93a10 10 0 0 1 14.14 0" />
      <path d="M4.93 19.07a10 10 0 0 0 14.14 0" />
    </svg>
  );
}

function BadmintonIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="15" cy="9" rx="5" ry="6" transform="rotate(-30 15 9)" fill="currentColor" fillOpacity="0.1" />
      <line x1="11" y1="13.5" x2="4" y2="21" strokeWidth="2.5" />
      <path d="M13.5 6.5l3.5 3.5" opacity="0.6" />
      <path d="M15 4.5l3 3" opacity="0.6" />
      <circle cx="7" cy="5" r="1.5" fill="currentColor" />
      <path d="M6 7l-2.5-3m3.5 4.5l0-4m2.5 3.5l2-3" strokeWidth="1.5" />
    </svg>
  );
}

function KabaddiIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="6" cy="6" r="2" fill="currentColor" fillOpacity="0.3" />
      <path d="M4 12l2-4 4 1 4-2" />
      <path d="M6 12l-2 5" />
      <path d="M6 12l3 4 3-1" />
      <circle cx="18" cy="7" r="2" fill="currentColor" fillOpacity="0.3" />
      <path d="M15 13l3-4 3 2" />
      <path d="M18 13l-2 5" />
      <path d="M18 13l2 5" />
      <line x1="10" y1="9" x2="15" y2="11" strokeDasharray="2 2" strokeWidth="1.5" />
    </svg>
  );
}

export default function KheloPatna() {
  const { settings: outletSettings } = useOutletContext() || {};
  const [siteSettings, setSiteSettings] = useState(outletSettings);

  useEffect(() => {
    api.get("/site-settings")
      .then((r) => {
        if (r.data) {
          setSiteSettings(r.data);
          try {
            localStorage.setItem("sdps_site_settings", JSON.stringify(r.data));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const activeSettings = siteSettings || outletSettings;

  const heroImgRaw = activeSettings?.khelo_patna_hero_image_url || "/khelo-patna-hero.jpg";
  const { style: heroImgStyle, cleanUrl: cleanHeroImg } = parseImageTransform(heroImgRaw);
  const heroImgUrl = cleanHeroImg.startsWith("http") || (cleanHeroImg.startsWith("/") && !cleanHeroImg.startsWith("/static")) ? cleanHeroImg : `${BACKEND}${cleanHeroImg}`;

  const logoImgRaw = activeSettings?.khelo_patna_logo_url || "/khelo-patna-logo.png";
  const logoImgUrl = fullUrl(logoImgRaw);

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
            <Link to="/" title="S.D. Public School Home" className="block group">
              <img
                src={activeSettings?.logo_url ? fullUrl(activeSettings.logo_url) : "https://sdpublic.org/assets/img/logo.png"}
                alt="SDPS Logo"
                className="h-20 w-20 rounded-full ring-4 ring-brand-gold object-contain bg-white p-1 shadow-md group-hover:scale-105 transition-transform"
                onError={(e) => { e.target.src = "https://sdpublic.org/assets/img/logo.png"; }}
              />
            </Link>

            <div className="text-4xl font-black text-brand-ink/20">×</div>

            <div className="block group">
              <img
                src={logoImgUrl}
                alt="Khelo Patna Logo"
                className="h-20 w-20 rounded-full ring-4 ring-amber-400 object-contain bg-white p-1 shadow-md group-hover:scale-105 transition-transform"
                onError={(e) => { e.target.src = "/khelo-patna-logo.png"; }}
              />
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
            <a href="tel:+919955190262" className="btn-primary flex items-center gap-2"><Phone className="w-4 h-4" /> Contact School</a>
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
              { sport: "Football", icon: FootballIcon, color: "text-brand-blue bg-blue-50" },
              { sport: "Cricket", icon: CricketIcon, color: "text-brand-orange bg-orange-50" },
              { sport: "Athletics", icon: AthleticsIcon, color: "text-amber-500 bg-amber-50" },
              { sport: "Basketball", icon: BasketballIcon, color: "text-red-500 bg-red-50" },
              { sport: "Badminton", icon: BadmintonIcon, color: "text-purple-500 bg-purple-50" },
              { sport: "Kabaddi", icon: KabaddiIcon, color: "text-emerald-500 bg-emerald-50" },
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
            <a href="tel:+919955190262" className="border-2 border-white/40 text-white font-headline font-bold px-8 py-3 rounded-xl hover:bg-white/10 transition flex items-center gap-2 justify-center">
              <Phone className="w-4 h-4" /> Call Us
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
