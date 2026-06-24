import { useEffect, useState, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Sparkles, Building2, ShieldCheck, Heart, Trophy,
  Calendar, Newspaper, ArrowRight, Play, Star, Smartphone
} from "lucide-react";
import api from "../../lib/api";
import SEO from "../../components/layout/SEO";

const FEATURES = [
  { icon: Sparkles, title: "Top-ranked Pre-School", desc: "A nurturing start for young minds with play-based learning" },
  { icon: GraduationCap, title: "Experienced Faculty", desc: "75+ qualified, passionate educators" },
  { icon: Building2, title: "Smart Classrooms", desc: "Modern facilities for active, engaging learning" },
  { icon: Trophy, title: "Co-Curricular Excellence", desc: "Sports, arts, music and competitions" },
  { icon: ShieldCheck, title: "Safe Environment", desc: "Secure, caring, well-monitored campus" },
  { icon: Heart, title: "Values-Driven", desc: "Discipline, compassion and integrity" },
];

function AnimatedStat({ raw, label, suffix = "+" }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  const target = parseInt((raw || "0").toString().replace(/[^0-9]/g, "")) || 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || target === 0) return;
    const duration = 1800;
    const steps = 60;
    const inc = target / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(Math.round(inc * step), target);
      setCount(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  const display = count >= 1000 ? count.toLocaleString("en-IN") : count;

  return (
    <motion.div 
      ref={ref} 
      initial={{ opacity: 0, y: 20 }} 
      whileInView={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, ease: "easeOut" }} 
      viewport={{ once: true }}
      className="bg-white/50 backdrop-blur-sm border border-slate-100 hover:border-slate-200/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-3xl p-6 transition-all duration-300"
    >
      <div className="font-headline text-5xl sm:text-6xl text-brand-blue font-bold tracking-tight bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-blue bg-clip-text text-transparent">
        {display}{suffix}
      </div>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400 mt-3">{label}</div>
    </motion.div>
  );
}

export default function Home() {
  const { settings } = useOutletContext() || {};
  const [news, setNews] = useState([]);
  const [calendar, setCalendar] = useState([]);

  useEffect(() => {
    api.get("/news?limit=4").then((r) => setNews(r.data)).catch(() => {});
    api.get("/calendar").then((r) => setCalendar(r.data.slice(0, 6))).catch(() => {});
  }, []);

  const stats = settings?.stats || { years: "30+", educators: "75+", students: "50000+", alumni: "5000+" };
  const erpUrl = settings?.erp_url || "https://sdpublic.gungunerp.in";
  const playStoreUrl = settings?.play_store_url || "https://play.google.com/store/apps/details?id=com.gungunerp.appsdpublicschool";
  const preschoolBanner = settings?.preschool_banner_image_url || "https://sdpublic.org/assets/img/banner.jpg";

  const heroFeatureImage = settings?.hero_feature_image_url || "https://sdpublic.org/img/feature.jpg";
  const formattedHeroFeature = heroFeatureImage.startsWith("http")
    ? heroFeatureImage
    : `${process.env.REACT_APP_BACKEND_URL || ""}${heroFeatureImage}`;

  const heroBannerImage = settings?.hero_banner_url || "https://sdpublic.org/assets/img/banner.jpg";
  const formattedHeroBanner = heroBannerImage.startsWith("http")
    ? heroBannerImage
    : `${process.env.REACT_APP_BACKEND_URL || ""}${heroBannerImage}`;

  const demystifiedImage = settings?.demystified_image_url || "https://sdpublic.org/assets/img/demystified.jpg";
  const formattedDemystified = demystifiedImage.startsWith("http")
    ? demystifiedImage
    : `${process.env.REACT_APP_BACKEND_URL || ""}${demystifiedImage}`;

  const schoolSchema = {
    "@context": "https://schema.org",
    "@type": "School",
    "name": "S.D. Public School, Patna",
    "alternateName": "Suryamuni Devi Public School",
    "description": "S.D. Public School (Suryamuni Devi Public School) is a top-ranked co-educational CBSE school in Patna, Bihar, offering premium education, experienced faculty, and smart classrooms.",
    "url": "https://sdpublic.org",
    "logo": settings?.logo_url ? (settings.logo_url.startsWith("http") ? settings.logo_url : `https://sdpublic.org${settings.logo_url}`) : "https://sdpublic.org/assets/img/logo.png",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Maurya Colony, Gulzarbagh Road",
      "addressLocality": "Patna",
      "addressRegion": "Bihar",
      "postalCode": "800007",
      "addressCountry": "IN"
    },
    "telephone": settings?.contact_phone || "+91-612-2630007",
    "email": settings?.contact_email || "info@sdpublic.org",
    "foundingDate": "1994",
    "sameAs": [
      "https://www.facebook.com/sdpublicschoolpatna",
      "https://www.youtube.com/channel/sdpublicschool"
    ]
  };

  return (
    <>
      <SEO 
        title="Home" 
        description="Welcome to S.D. Public School (Suryamuni Devi Public School), Patna. Empowering Generations Since 1994 with academic excellence, moral values, and modern CBSE curriculum."
        keywords="SDPS, SD Public School, Suryamuni Devi Public School, Patna, Bihar, CBSE school, admissions 2026, best school Patna"
        schema={schoolSchema}
      />
      {/* HERO */}
      <section className="relative overflow-hidden bg-hero-grad">
        {/* Antigravity floating background elements */}
        <div className="absolute top-20 left-[10%] w-72 h-72 rounded-full bg-brand-blue/5 blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 right-[5%] w-96 h-96 rounded-full bg-brand-orange/8 blur-3xl animate-float" />
        <div className="absolute top-32 right-[15%] w-32 h-32 rounded-full bg-brand-lotus/10 blur-2xl animate-float-slow" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-brand-gold/5 blur-3xl animate-pulse" />

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
              <div className="overline mb-4 text-brand-orange font-bold tracking-[0.25em]">Empowering Generations Since 1994</div>
              <h1 className="legacy-title text-brand-ink leading-tight">
                Welcome to <span className="brand-gradient-text italic font-bold">S.D. Public</span>
                <br /> School, <span className="gold-gradient-text">Patna</span>
              </h1>
              <p className="mt-6 text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl">
                At SDPS, we believe in nurturing young minds through a perfect blend of academic excellence,
                moral values, and creative learning. With a legacy of <strong className="text-brand-blue">30+ years</strong>,
                we continue to shape the leaders of tomorrow with a vision rooted in knowledge, discipline, and compassion.
              </p>
              
              <div className="mt-8 flex flex-wrap gap-4">
                <Link to="/admissions" className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-blue-light text-white font-bold hover:scale-[1.02] hover:shadow-[0_8px_25px_rgba(14,59,145,0.25)] transition duration-200" data-testid="hero-admissions-btn">
                  Begin Admission
                </Link>
                <Link to="/about" className="px-7 py-3.5 rounded-2xl bg-white/80 border border-slate-200/80 text-brand-blue font-bold backdrop-blur-sm hover:bg-white hover:scale-[1.02] transition duration-200" data-testid="hero-about-btn">
                  Discover SDPS
                </Link>
              </div>

              {/* ERP + App quick links */}
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={erpUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand-blue border border-brand-blue/20 bg-white/60 hover:bg-white px-4 py-2.5 rounded-xl transition hover:shadow-sm">
                  <GraduationCap className="w-4 h-4 text-brand-orange" /> Student ERP Login
                </a>
                <a href={playStoreUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-brand-ink/70 border border-black/10 bg-white/60 hover:bg-white px-4 py-2.5 rounded-xl transition hover:shadow-sm">
                  <Smartphone className="w-4 h-4 text-brand-gold" /> Download App
                </a>
              </div>

              <div className="mt-10 flex items-center gap-6 text-sm">
                <div className="flex -space-x-2.5">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full ring-2 ring-white bg-gradient-to-br from-brand-blue to-brand-orange flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {["P", "T", "A"][i - 1]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex text-brand-orange gap-0.5">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current text-amber-500" />)}
                  </div>
                  <p className="text-slate-500 text-xs mt-1">Trusted by 50,000+ students & families in Bihar</p>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }} 
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden bg-white/40 border border-white/60 backdrop-blur-sm p-3 shadow-2xl group hover:-translate-y-2 hover:shadow-[0_30px_60px_rgba(8,32,82,0.1)] transition-all duration-500">
              <img
                src={formattedHeroFeature}
                alt="SDPS School"
                className="w-full h-full object-cover rounded-[2rem] transition duration-500 group-hover:scale-[1.02]"
                onError={(e) => { e.target.src = formattedHeroBanner; }}
              />
              <div className="absolute bottom-6 left-6 right-6 bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-4 flex items-center gap-3 shadow-lg">
                <a href={settings?.hero_video_url || "https://www.youtube.com/watch?v=Lv7W4kSSM3w"} target="_blank" rel="noreferrer"
                  className="w-12 h-12 rounded-full bg-brand-orange flex items-center justify-center shrink-0 hover:scale-110 shadow-md transition" data-testid="hero-video-btn">
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </a>
                <div className="text-xs">
                  <div className="font-headline font-semibold text-brand-ink">Watch our story</div>
                  <div className="text-slate-500">Discover Excellence — SDPS Showcase</div>
                </div>
              </div>
            </div>
            {/* Floating accent badge */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br from-brand-gold to-brand-gold-light shadow-[0_10px_25px_rgba(199,161,91,0.3)] hover:scale-110 transition-transform duration-300 animate-float-slow flex items-center justify-center cursor-default z-20">
              <span className="text-white font-headline font-bold text-sm text-center leading-tight">30+<br /><span className="text-[10px] tracking-wider opacity-90 font-extrabold">YEARS</span></span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS — animated counter on scroll */}
      <section className="py-16 border-y border-brand-blue/5 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { raw: stats.years, label: "Years of Excellence", suffix: "+" },
            { raw: stats.educators, label: "Qualified Educators", suffix: "+" },
            { raw: stats.students, label: "Students Enrolled", suffix: "+" },
            { raw: stats.alumni, label: "Alumni Network", suffix: "+" },
          ].map((s, i) => (
            <AnimatedStat key={i} raw={s.raw} label={s.label} suffix={s.suffix} />
          ))}
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="py-24 bg-gradient-to-b from-white to-slate-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
            <div>
              <div className="overline mb-3 text-brand-orange font-bold tracking-wider">Why Choose SDPS</div>
              <h2 className="section-title">A blend of <em className="font-legacy text-brand-orange not-italic">tradition</em> and <span className="brand-gradient-text">innovation</span></h2>
            </div>
            <p className="md:max-w-md text-slate-500 leading-relaxed">
              Founded in 1994 by The Suryamuni Devi Foundation Trust, SDPS continues to shape the leaders of tomorrow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="beam-card relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-slate-100 hover:border-brand-orange/30 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_15px_40px_rgba(14,59,145,0.05)] hover:-translate-y-2 transition-all duration-300 group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue/5 to-brand-orange/5 group-hover:from-brand-blue/10 group-hover:to-brand-orange/10 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm shrink-0">
                    <f.icon className="w-6 h-6 text-brand-blue group-hover:text-brand-orange transition-colors duration-300" />
                  </div>
                  <h3 className="font-headline font-semibold text-lg text-slate-800 mb-1">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE IMAGE STRIP */}
      <section className="py-10 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/60 p-2 bg-white/30 backdrop-blur-sm">
            <img
              src="/sdps-annual-sports.jpg"
              alt="SDPS Annual Sports Meet"
              className="w-full h-96 object-cover rounded-[2rem] hover:scale-[1.005] transition-transform duration-500"
              loading="lazy"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
        </div>
      </section>

      {/* CALENDAR + NEWS */}
      <section className="py-24 bg-gradient-to-b from-brand-paper to-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Calendar */}
          <div className="lg:col-span-5">
            <div className="overline mb-3 text-brand-orange font-bold">Stay informed</div>
            <h2 className="section-title mb-2"><Calendar className="inline w-8 h-8 text-brand-orange mr-2 shrink-0" />Academic Calendar</h2>
            <p className="text-sm text-slate-500 mb-6">Important dates for session 2025-26:</p>
            <div className="space-y-3.5">
              {calendar.length === 0 && (
                <div className="p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100 text-center text-sm text-slate-400 italic">
                  No upcoming dates posted yet. Please check back soon.
                </div>
              )}
              {calendar.map((c, i) => (
                <div key={c.id || i} className="flex items-center gap-4.5 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100/80 hover:border-brand-orange/30 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-[0_10px_25px_rgba(248,125,14,0.04)] hover:-translate-y-0.5 transition-all duration-300 group">
                  {c.icon_url ? (
                    <img src={c.icon_url.startsWith("http") ? c.icon_url : `${process.env.REACT_APP_BACKEND_URL}${c.icon_url}`} alt="" className="w-11 h-11 rounded-xl object-cover border border-slate-50" loading="lazy" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue/10 to-brand-orange/10 flex flex-col items-center justify-center text-[10px] uppercase tracking-wider text-brand-blue font-extrabold shrink-0">
                      {new Date(c.date).toLocaleDateString("en-US", { month: "short" })}
                      <div className="text-base text-brand-ink leading-none mt-0.5">{new Date(c.date).getDate()}</div>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <div className="font-headline font-semibold text-slate-800 truncate">{c.name}</div>
                    {c.description && <div className="text-xs text-slate-500 truncate">{c.description}</div>}
                  </div>
                  <span className="text-xs uppercase tracking-wider text-brand-orange font-bold shrink-0">{c.type}</span>
                </div>
              ))}
            </div>
            <Link to="/calendar" className="inline-flex items-center gap-1.5 mt-6 text-brand-blue font-headline font-bold hover:gap-2.5 transition-all">
              View Full Calendar <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* News */}
          <div className="lg:col-span-7">
            <div className="overline mb-3 text-brand-orange font-bold">Latest from SDPS</div>
            <h2 className="section-title mb-6"><Newspaper className="inline w-8 h-8 text-brand-orange mr-2 shrink-0" />News & Events</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {news.length === 0 && (
                <div className="sm:col-span-2 p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-100 text-center text-sm text-slate-400 italic">
                  No news or events posted yet. Please check back soon.
                </div>
              )}
              {news.map((n) => (
                <Link key={n.id} to="/news" className="beam-card group bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-slate-100 hover:border-brand-blue/30 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_15px_35px_rgba(14,59,145,0.04)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    {n.image_url && (
                      <div className="overflow-hidden rounded-2xl bg-white mb-4 shadow-sm border border-slate-50">
                        <img src={n.image_url.startsWith("http") ? n.image_url : `${process.env.REACT_APP_BACKEND_URL}${n.image_url}`} alt="" className="w-full object-cover h-40 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    )}
                    <div className="text-xs text-brand-orange font-bold uppercase tracking-wider mb-1.5">{n.date}</div>
                    <div className="font-headline font-semibold text-slate-800 mb-1.5 group-hover:text-brand-blue transition-colors duration-200">{n.title}</div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.content}</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/news" className="inline-flex items-center gap-1.5 mt-6 text-brand-blue font-headline font-bold hover:gap-2.5 transition-all">
              View All News <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* DEMYSTIFIED SECTION */}
      <section className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="overline mb-3 text-center text-brand-orange font-bold">Know Us Better</div>
          <h2 className="section-title text-center mb-10">Demystified</h2>
          <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/60 p-3 bg-white/40 backdrop-blur-sm">
            <img
              src={formattedDemystified}
              alt="SDPS Demystified"
              className="w-full object-contain rounded-[2rem] hover:scale-[1.002] transition-transform duration-500"
              loading="lazy"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </div>
        </div>
      </section>

      {/* PRE-SCHOOL teaser */}
      <section className="py-24 bg-gradient-to-br from-pink-50 via-amber-50 to-orange-50/70 relative overflow-hidden">
        {/* Playful floating background bubbles */}
        <div className="preschool-blob bg-brand-lotus/20 -top-10 left-10 w-64 h-64 blur-2xl animate-float-slow" />
        <div className="preschool-blob bg-brand-orange/15 top-20 right-10 w-80 h-80 blur-3xl animate-float" />
        <div className="preschool-blob bg-brand-gold/10 bottom-10 left-1/3 w-64 h-64 blur-2xl animate-pulse" />

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
          <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <div className="overline text-brand-lotus font-bold mb-3">Tiny Tots Section</div>
            <h2 className="font-playful text-5xl sm:text-6xl text-brand-blue leading-tight">
              Where <span className="text-brand-orange font-bold">tiny dreams</span> take their first <span className="text-brand-lotus font-bold">flight</span> 🎈
            </h2>
            <p className="mt-5 text-slate-600 leading-relaxed max-w-lg">
              Our Pre-School is a vibrant world of stories, songs, art and play — where curious little ones
              learn through joy. A nurturing start for every young mind.
            </p>
            <Link to="/preschool" className="btn-secondary inline-block mt-6 hover:scale-[1.02] shadow-md hover:shadow-lg transition duration-200" data-testid="preschool-explore-btn">
              Step Into the Fun World
            </Link>
          </motion.div>
          <motion.div 
            animate={{ rotate: [0, 1.5, -1.5, 0], y: [0, -6, 6, 0] }} 
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} 
            className="relative p-3 bg-white/40 border border-white/60 backdrop-blur-sm rounded-[3rem] shadow-2xl"
          >
            <img src={preschoolBanner.startsWith("http") ? preschoolBanner : `${process.env.REACT_APP_BACKEND_URL || ''}${preschoolBanner}`} alt="Pre-School"
              className="rounded-[2.5rem] w-full object-contain max-h-[450px] bg-white shadow-sm p-2"
              loading="lazy"
              onError={(e) => { e.target.src = "https://sdpublic.org/img/feature.jpg"; }}
            />
            <div className="absolute -bottom-4 -right-4 bg-brand-orange text-white px-5 py-3 rounded-2xl shadow-xl font-playful text-lg animate-wiggle border border-brand-orange-light/20 z-10">
              Fun Learning! ✨
            </div>
          </motion.div>
        </div>
      </section>

      {/* STUDENT COUNCIL teaser */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="overline mb-3 text-brand-orange font-bold">Leadership & Governance</div>
          <h2 className="section-title mb-4">Student Council</h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-8 leading-relaxed">
            Our Student Council empowers students with leadership skills, responsibility, and pride.
            Elections, campaigns, and activities will soon be launched. Stay tuned!
          </p>
          <Link to="/student-council" className="px-7 py-3 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-blue-light text-white font-bold hover:scale-[1.02] hover:shadow-lg transition duration-200 inline-flex items-center gap-2">
            Program Details <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
