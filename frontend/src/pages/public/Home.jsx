import { useEffect, useState, useRef } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Sparkles, Building2, ShieldCheck, Heart, Trophy,
  Calendar, Newspaper, ArrowRight, Play, Star, Smartphone
} from "lucide-react";
import api, { parseImageTransform } from "../../lib/api";
import SEO from "../../components/layout/SEO";
import NoticeBoard from "../../components/home/NoticeBoard";

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  let d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    const parts = dateStr.includes("-") ? dateStr.split("-") : dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (day > 0 && day <= 31 && month >= 0 && month < 12 && year > 1000) {
        const temp = new Date(year, month, day);
        if (!isNaN(temp.getTime())) {
          d = temp;
        }
      }
    }
  }
  return d;
}

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
      className="bg-white/50 backdrop-blur-sm border border-slate-100 hover:border-slate-200/80 hover:shadow-[0_8px_30px_rgb(0,0,0,0.015)] rounded-2xl sm:rounded-3xl p-3 sm:p-6 transition-all duration-300"
    >
      <div className="font-headline text-3xl sm:text-5xl lg:text-6xl text-brand-blue font-bold tracking-tight bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-blue bg-clip-text text-transparent whitespace-nowrap">
        {display}{suffix}
      </div>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400 mt-2 sm:mt-3">{label}</div>
    </motion.div>
  );
}

export default function Home() {
  const { settings } = useOutletContext() || {};
  const [news, setNews] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [playingVideoId, setPlayingVideoId] = useState(null);

  useEffect(() => {
    api.get("/news?limit=4").then((r) => setNews(r.data || [])).catch(() => {});
    api.get("/calendar").then((r) => setCalendar((r.data || []).slice(0, 6))).catch(() => {});
    api.get("/testimonials")
      .then((r) => setTestimonials(r.data || []))
      .catch((e) => console.error("Error loading testimonials:", e));
  }, []);

  const stats = settings?.stats || { years: "30+", educators: "75+", students: "50000+", alumni: "5000+" };
  const erpUrl = settings?.erp_url || "https://sdpublic.gungunerp.in";
  const playStoreUrl = settings?.play_store_url || "https://play.google.com/store/apps/details?id=com.gungunerp.appsdpublicschool";
  const preschoolBannerRaw = settings?.preschool_banner_image_url || "https://sdpublic.org/assets/img/banner.jpg";
  const { style: preschoolStyle, cleanUrl: cleanPreschool } = parseImageTransform(preschoolBannerRaw);
  const preschoolBanner = cleanPreschool;
  const youtubeUrl = settings?.youtube_channel || "https://youtube.com";
  const instagramUrl = settings?.instagram_url || "https://instagram.com";
  const facebookUrl = settings?.facebook_url || "https://facebook.com";


  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return match[2];
    }
    const shortMatch = url.match(/youtube\.com\/shorts\/([^#\&\?]+)/);
    if (shortMatch) {
      return shortMatch[1];
    }
    return null;
  };

  const getEmbedUrl = (url, type) => {
    if (!url) return "";
    if (type === "youtube") {
      const id = getYouTubeId(url);
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : url;
    }
    if (type === "instagram") {
      let cleanUrl = url.split("?")[0];
      if (!cleanUrl.endsWith("/")) cleanUrl += "/";
      if (!cleanUrl.endsWith("/embed/")) cleanUrl += "embed/";
      return cleanUrl;
    }
    if (type === "facebook") {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=true`;
    }
    return url;
  };

  const getTestimonialThumb = (item) => {
    let rawThumb = item.video_thumb_url;
    if (!rawThumb && item.type === "youtube") {
      const ytId = getYouTubeId(item.video_url);
      if (ytId) {
        rawThumb = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
      }
    }
    
    if (!rawThumb) {
      rawThumb = item.type === "youtube"
        ? "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=600"
        : "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=600";
    }

    const { style, cleanUrl } = parseImageTransform(rawThumb);
    const src = cleanUrl.startsWith("http")
      ? cleanUrl
      : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanUrl}`;
    
    return { src, style };
  };


  const heroFeatureRaw = settings?.hero_feature_image_url || "https://sdpublic.org/img/feature.jpg";
  const { style: heroFeatureStyle, cleanUrl: cleanHeroFeature } = parseImageTransform(heroFeatureRaw);
  const formattedHeroFeature = cleanHeroFeature.startsWith("http")
    ? cleanHeroFeature
    : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanHeroFeature}`;

  const heroBannerRaw = settings?.hero_banner_url || "https://sdpublic.org/assets/img/banner.jpg";
  const { cleanUrl: cleanHeroBanner } = parseImageTransform(heroBannerRaw);
  const formattedHeroBanner = cleanHeroBanner.startsWith("http")
    ? cleanHeroBanner
    : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanHeroBanner}`;

  const demystifiedRaw = settings?.demystified_image_url || "https://sdpublic.org/assets/img/demystified.jpg";
  const { style: demystifiedStyle, cleanUrl: cleanDemystified } = parseImageTransform(demystifiedRaw);
  const formattedDemystified = cleanDemystified.startsWith("http")
    ? cleanDemystified
    : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanDemystified}`;

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
                Welcome to <span className="brand-gradient-text italic font-bold pr-2">S.D. Public</span>
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
              <div className="w-full h-full rounded-[2rem] overflow-hidden">
                <img
                  src={formattedHeroFeature}
                  alt="SDPS School"
                  style={heroFeatureStyle}
                  className="w-full h-full object-cover transition duration-500 group-hover:scale-[1.02]"
                  fetchpriority="high"
                  onError={(e) => { e.target.src = formattedHeroBanner; }}
                />
              </div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
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

      {/* NOTICE BOARD — latest circulars */}
      <NoticeBoard />

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
                      {parseDate(c.date).toLocaleDateString("en-US", { month: "short" })}
                      <div className="text-base text-brand-ink leading-none mt-0.5">{parseDate(c.date).getDate()}</div>
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
            <div className="w-full rounded-[2rem] overflow-hidden">
              <img
                src={formattedDemystified}
                alt="SDPS Demystified"
                style={demystifiedStyle}
                className="w-full object-contain hover:scale-[1.002] transition-transform duration-500"
                loading="lazy"
                onError={(e) => { e.target.style.display = "none"; }}
              />
            </div>
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
            <h2 className="font-playful text-5xl sm:text-6xl text-brand-blue leading-tight flex flex-wrap items-center gap-x-2 gap-y-1">
              Where <span className="text-brand-orange font-bold">tiny dreams</span> take their first <span className="text-brand-lotus font-bold">flight</span> <Sparkles className="inline-block w-8 h-8 text-brand-lotus animate-pulse" />
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
            <div className="rounded-[2.5rem] overflow-hidden bg-white shadow-sm p-2">
              <img src={preschoolBanner.startsWith("http") ? preschoolBanner : `${process.env.REACT_APP_BACKEND_URL || ''}${preschoolBanner}`} alt="Pre-School"
                style={preschoolStyle}
                className="w-full object-contain max-h-[450px] rounded-[2rem]"
                loading="lazy"
                onError={(e) => { e.target.src = "https://sdpublic.org/img/feature.jpg"; }}
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-brand-orange text-white px-5 py-3 rounded-2xl shadow-xl font-playful text-lg animate-wiggle border border-brand-orange-light/20 z-10 flex items-center gap-1.5">
              Fun Learning! <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
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

      {/* PARENTS TESTIMONIALS SECTION */}
      <section className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden border-t border-black/5">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-brand-orange/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-blue/5 rounded-full blur-3xl" />
        
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="overline mb-3 text-brand-orange font-bold">Community Voices</div>
            <h2 className="section-title mb-4">What Parents Say</h2>
            <p className="text-slate-500 leading-relaxed">
              Hear directly from the families who form the core of the S.D. Public School community.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t) => {
              const isVideo = t.type !== "text";
              const isPlaying = playingVideoId === t.id;
              const { src: thumbSrc, style: thumbStyle } = getTestimonialThumb(t);
              const initials = t.parent_name ? t.parent_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : "P";

              return (
                <div key={t.id} className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 relative group min-h-[360px]">
                  
                  {isVideo ? (
                    <div className="relative aspect-video bg-slate-900 overflow-hidden w-full">
                      {isPlaying ? (
                        <iframe
                          src={getEmbedUrl(t.video_url, t.type)}
                          title={t.parent_name}
                          className="w-full h-full absolute inset-0 border-none"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          scrolling={t.type === "facebook" ? "no" : "yes"}
                        ></iframe>
                      ) : (
                        <>
                          <img 
                            src={thumbSrc} 
                            alt={`${t.parent_name}'s Video Thumbnail`} 
                            style={thumbStyle}
                            className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                          />
                          <button 
                            onClick={() => setPlayingVideoId(t.id)}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors focus:outline-none"
                          >
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 ${
                              t.type === "youtube" 
                                ? "bg-red-600" 
                                : "bg-gradient-to-tr from-blue-600 via-pink-500 to-yellow-500"
                            }`}>
                              <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </button>
                          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 pointer-events-none">
                            <span className={`w-2 h-2 rounded-full animate-pulse ${t.type === "youtube" ? "bg-red-500" : "bg-pink-500"}`} />
                            {t.type} Video
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 pb-0 relative">
                      <span className="text-6xl text-slate-100 font-serif absolute top-4 left-6 pointer-events-none">“</span>
                      <div className="flex items-center gap-1 text-brand-gold mb-4 relative z-10">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-4 h-4 fill-current text-brand-gold" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-6 flex-grow flex flex-col justify-between">
                    <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                      "{t.text}"
                    </p>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                      <div className="w-11 h-11 rounded-full bg-brand-blue/10 flex items-center justify-center font-bold text-brand-blue border border-brand-blue/20">
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{t.parent_name}</h4>
                        <p className="text-xs text-slate-400">{t.parent_info}</p>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Social Links Badge */}
          <div className="mt-16 text-center border-t border-slate-100 pt-8">
            <p className="text-slate-400 text-sm mb-4">Follow us for weekly campus highlights, testimonials, and student projects:</p>
            <div className="flex items-center justify-center gap-4">
              <a href={youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.517 3.545 12 3.545 12 3.545s-7.517 0-9.388.508a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.871.508 9.388.508 9.388.508s7.517 0 9.388-.508a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                YouTube
              </a>
              <a href={instagramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50 text-pink-600 text-xs font-bold hover:bg-pink-100 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </a>
              <a href={facebookUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
