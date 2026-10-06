import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { 
  Ticket, 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  Info, 
  Music, 
  ChevronRight, 
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  QrCode,
  Sparkles,
  Flame,
  Award,
  UtensilsCrossed,
  HeartHandshake
} from 'lucide-react';
import api from '@/lib/api';
import NavrangNavbar from '@/components/layout/NavrangNavbar';
import FestivePetalCanvas from '@/components/festive/FestivePetalCanvas';
import FloatingDiya from '@/components/festive/FloatingDiya';
import DandiyaClash from '@/components/festive/DandiyaClash';
import RangoliMandala from '@/components/festive/RangoliMandala';

const defaultEventDate = "2026-10-15T18:00:00";

const calculateTimeLeft = (targetDate) => {
  const difference = +new Date(targetDate) - +new Date();
  let timeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    };
  }
  return timeLeft;
};

export default function Navrang() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(defaultEventDate));
  const [eventDate, setEventDate] = useState(defaultEventDate);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/navrang/config');
        setConfig(response.data);
        if (response.data?.event_date) {
          setEventDate(response.data.event_date);
          setTimeLeft(calculateTimeLeft(response.data.event_date));
        }
      } catch (error) {
        console.error('Failed to fetch config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(eventDate));
    }, 1000);
    return () => clearTimeout(timer);
  });

  const timeBlocks = [
    { label: 'Days', short: 'Days', value: timeLeft.days },
    { label: 'Hours', short: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', short: 'Mins', value: timeLeft.minutes },
    { label: 'Seconds', short: 'Secs', value: timeLeft.seconds },
  ];

  const packages = [
    {
      id: 'silver',
      name: 'Silver Pass',
      badge: '1 Child + 1 Mother',
      price: 299,
      color: 'from-slate-200 via-amber-100 to-slate-200',
      textColor: 'text-slate-900',
      icon: Star,
      includes: [
        '1 Student Entry (Current SDPS Student)',
        '1 Mother / Guardian Entry',
        '1 Pair of Decorated Dandiya Sticks Included',
        'Access to Live DJ & Garba Arena',
        'Food & Refreshment Stalls Access'
      ]
    },
    {
      id: 'gold',
      name: 'Gold Pass',
      badge: '2 Children + 1 Mother',
      price: 399,
      color: 'from-amber-300 via-yellow-200 to-amber-400',
      textColor: 'text-amber-950',
      icon: Sparkles,
      includes: [
        '2 Students Entry (Current SDPS Students)',
        '1 Mother / Guardian Entry',
        '1 Pair of Decorated Dandiya Sticks Included',
        'Access to Live DJ & Garba Arena',
        'Food & Refreshment Stalls Access',
        'Eligible for Best Dressed & Dance Awards'
      ],
      popular: true
    },
    {
      id: 'platinum',
      name: 'Platinum Pass',
      badge: '3 Children + 1 Mother',
      price: 499,
      color: 'from-fuchsia-300 via-pink-200 to-amber-200',
      textColor: 'text-purple-950',
      icon: Flame,
      includes: [
        '3 Students Entry (Current SDPS Students)',
        '1 Mother / Guardian Entry',
        '1 Pair of Decorated Dandiya Sticks Included',
        'Access to Live DJ & Garba Arena',
        'Food & Refreshment Stalls Access',
        'Eligible for Best Dressed & Dance Awards'
      ]
    }
  ];

  const isSubdomain = typeof window !== "undefined" && (
    window.location.hostname.startsWith("navrang.") ||
    window.location.hostname.startsWith("navrang-") ||
    window.location.hostname === "navrang.localhost"
  );
  const bookPath = isSubdomain ? "/book" : "/navrang/book";
  const ticketPath = isSubdomain ? "/my-ticket" : "/navrang/my-ticket";

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 overflow-x-hidden selection:bg-brand-orange selection:text-white relative pb-20 lg:pb-0">
      <Helmet>
        <title>Navrang 2026 | Grand Dandiya & Durga Puja Celebration | S.D. Public School, Patna</title>
        <meta name="description" content="Join S.D. Public School for Navrang 2026 - The grandest Dandiya Raas, Garba & Durga Puja celebration night in Patna on October 15, 2026. Book passes online." />
        <link rel="canonical" href="https://navrang.sdpublic.org/" />

        {/* OpenGraph / WhatsApp / Facebook / Telegram */}
        <meta property="og:site_name" content="Navrang 2026 — S.D. Public School, Patna" />
        <meta property="og:title" content="Navrang 2026 | Grand Dandiya & Durga Puja Celebration" />
        <meta property="og:description" content="Join S.D. Public School for Navrang 2026 - The grandest Dandiya Raas, Garba & Durga Puja celebration night in Patna on October 15, 2026. Book passes online." />
        <meta property="og:image" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta property="og:image:secure_url" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="576" />
        <meta property="og:image:alt" content="Navrang 2026 Dandiya Night Celebration" />
        <meta property="og:url" content="https://navrang.sdpublic.org/" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Navrang 2026 | Grand Dandiya & Durga Puja Celebration" />
        <meta name="twitter:description" content="Join S.D. Public School for Navrang 2026 - The grandest Dandiya Raas, Garba & Durga Puja celebration night in Patna on October 15, 2026. Book passes online." />
        <meta name="twitter:image" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta name="twitter:image:alt" content="Navrang 2026 Dandiya Night Celebration" />
      </Helmet>

      {/* Floating Canvas Animation (Marigold Flower Petals & Golden Sparkles) */}
      <FestivePetalCanvas />

      {/* Shared School-Styled Navrang Header with Toran Garland */}
      <NavrangNavbar activePage="home" />

      {/* Hero Section */}
      <section className="relative flex items-center justify-center py-10 sm:py-14 min-h-[calc(100vh-7.5rem)] overflow-hidden">
        {/* Full-Bleed Festive Artwork Hero Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/navrang-hero-bg.jpg"
            alt="Navrang 2026 Dandiya Night"
            className="w-full h-full object-cover object-center scale-105 filter brightness-[0.42] contrast-[1.12] saturate-[1.2]"
          />
          {/* Gradients ensuring smooth transition from header and toward bottom section */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-purple-950/45 to-slate-950"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/85"></div>
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-[420px] h-[420px] bg-gradient-to-tr from-fuchsia-600/20 to-amber-500/15 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-gradient-to-br from-amber-600/20 to-rose-600/15 rounded-full blur-[140px] pointer-events-none"></div>

        {/* Sacred Spinning Rangoli Mandala — centered behind the content */}
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
          <div className="block sm:hidden">
            <RangoliMandala size={340} opacity={0.25} />
          </div>
          <div className="hidden sm:block">
            <RangoliMandala size={600} opacity={0.22} />
          </div>
        </div>

        <div className="relative z-20 w-full max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full flex flex-col items-center"
          >
            {/* Top Festive Chip */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-purple-500/20 rounded-full px-3.5 sm:px-5 py-1.5 sm:py-2 backdrop-blur-md border border-amber-400/40 mb-4 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-amber-400"></span>
              </span>
              <span className="text-[10px] sm:text-sm font-bold text-amber-200 uppercase tracking-[0.16em] sm:tracking-[0.18em] font-headline">
                Shubh Navratri • Dandiya Utsav
              </span>
            </div>

            {/* Interactive Crossed Dandiya Sticks with Impact Sparks */}
            <div className="flex justify-center mb-2">
              <DandiyaClash size={96} />
            </div>

            {/* Main Festive Title */}
            <h1 className="font-black tracking-tight leading-none mb-3">
              <span className="block text-5xl sm:text-8xl md:text-9xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 drop-shadow-[0_4px_25px_rgba(251,191,36,0.6)]">
                NAVRANG
              </span>
              <span className="block mt-1 text-3xl sm:text-5xl md:text-6xl text-fuchsia-200 font-bold drop-shadow-[0_0_20px_rgba(217,70,239,0.7)]">
                2026
              </span>
            </h1>

            {/* Subtitle & School Credential */}
            <p className="text-sm sm:text-xl text-slate-200 font-light mb-6 max-w-2xl mx-auto leading-relaxed px-2">
              Grand Dandiya Raas, Garba Beats &amp; Durga Puja Celebration Night
              <span className="block mt-1 font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 font-headline">
                S.D. Public School, Patna
              </span>
            </p>

            {/* Event Countdown Section */}
            <div className="w-full max-w-xs xs:max-w-sm sm:max-w-xl mx-auto mb-8">
              {/* Header Badge */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-amber-400/60" />
                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.22em] text-amber-300 font-headline flex items-center gap-1.5 drop-shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  Celebration Starts In
                </span>
                <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-amber-400/60" />
              </div>

              {/* Countdown Cards Grid with Flanking Diyas on desktop */}
              <div className="flex items-center justify-center gap-3 sm:gap-6">
                <motion.div
                  className="hidden md:block shrink-0"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <FloatingDiya size={52} />
                </motion.div>

                <div className="grid grid-cols-4 gap-2 xs:gap-2.5 sm:gap-3.5 w-full">
                  {timeBlocks.map((block, idx) => (
                    <div
                      key={idx}
                      className="relative flex flex-col items-center justify-center py-2.5 px-1 xs:py-3 xs:px-2 sm:py-4 sm:px-3 rounded-2xl bg-gradient-to-b from-slate-900/95 via-purple-950/80 to-slate-950/95 border border-amber-400/40 shadow-[0_6px_25px_rgba(0,0,0,0.7),0_0_18px_rgba(245,158,11,0.2)] backdrop-blur-xl overflow-hidden group hover:border-amber-300 transition-all"
                    >
                      {/* Top Golden Light Sheen */}
                      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent opacity-80" />

                      {/* Ambient Inner Glow */}
                      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent pointer-events-none" />

                      {/* Number */}
                      <span className="relative text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-amber-300 to-amber-400 tabular-nums font-headline drop-shadow-[0_2px_12px_rgba(251,191,36,0.5)]">
                        {String(block.value).padStart(2, '0')}
                      </span>

                      {/* Unit Label */}
                      <span className="relative text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-200/90 mt-1 font-sans">
                        <span className="inline sm:hidden">{block.short}</span>
                        <span className="hidden sm:inline">{block.label}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <motion.div
                  className="hidden md:block shrink-0"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                >
                  <FloatingDiya size={52} />
                </motion.div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate(bookPath)}
                className="px-8 py-3.5 font-black text-white text-base sm:text-lg transition-all duration-200 bg-gradient-to-r from-brand-orange via-amber-500 to-orange-600 rounded-full shadow-[0_0_30px_rgba(248,125,14,0.55)] font-headline flex items-center justify-center gap-2 border border-amber-300/40"
              >
                <Sparkles className="w-5 h-5 text-yellow-200" />
                <span>Book Tickets Online</span>
                <ChevronRight className="w-5 h-5" />
              </motion.button>

              <Link
                to={ticketPath}
                className="px-7 py-3.5 font-bold text-base sm:text-lg text-amber-200 hover:text-white transition-all bg-white/10 hover:bg-white/20 rounded-full border border-white/20 font-headline flex items-center justify-center gap-2 backdrop-blur-md"
              >
                <Ticket className="w-5 h-5 text-amber-400" />
                <span>Find My Ticket / QR</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Celebration Highlights Section */}
      <section id="details" className="scroll-mt-28 py-20 relative z-20 bg-gradient-to-b from-slate-950 via-purple-950/40 to-slate-950 border-t border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/30">
              Utsav Highlights
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 font-headline">
              Grand Dandiya & Durga Puja Night
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto mt-2 text-sm sm:text-base">
              An unforgettable evening of devotion, dance, rhythmic dandiya beats, and festive family joy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Calendar,
                title: "Date & Timing",
                desc: "October 15, 2026 • 6:00 PM onwards till 10:00 PM. Gate opens at 5:30 PM.",
                color: "text-amber-400",
                border: "border-amber-400/30"
              },
              {
                icon: MapPin,
                title: "SDPS Homeground",
                desc: "SDPS Homeground, S.D. Public School Campus, Patna, Bihar.",
                color: "text-rose-400",
                border: "border-rose-400/30"
              },
              {
                icon: Music,
                title: "Live DJ & Garba Raas",
                desc: "Energetic Dhol-Tasha, live DJ mixing traditional Gujarati Garba & Bollywood Dandiya tracks.",
                color: "text-fuchsia-400",
                border: "border-fuchsia-400/30"
              },
              {
                icon: UtensilsCrossed,
                title: "Festive Food Stalls",
                desc: "Authentic chaat, delicious snacks, festive sweets, and refreshing beverages for families.",
                color: "text-emerald-400",
                border: "border-emerald-400/30"
              }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-slate-900/80 backdrop-blur-md border ${item.border} p-6 rounded-3xl hover:bg-slate-900 transition-all hover:-translate-y-1 shadow-lg`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 font-headline">{item.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Special Feature Badges */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gradient-to-r from-purple-900/30 via-slate-900/50 to-amber-900/30 border border-amber-400/20 p-6 rounded-3xl backdrop-blur-md">
            <div className="flex items-center gap-4">
              <Award className="w-10 h-10 text-amber-400 shrink-0" />
              <div>
                <h4 className="text-white font-bold text-base font-headline">Best Dressed Awards</h4>
                <p className="text-slate-300 text-xs">Prizes for best traditional mother & child outfits!</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Sparkles className="w-10 h-10 text-fuchsia-400 shrink-0" />
              <div>
                <h4 className="text-white font-bold text-base font-headline">Free Dandiya Sticks</h4>
                <p className="text-slate-300 text-xs">1 pair of decorated Dandiya sticks included in every pass.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <HeartHandshake className="w-10 h-10 text-rose-400 shrink-0" />
              <div>
                <h4 className="text-white font-bold text-base font-headline">Safe Family Environment</h4>
                <p className="text-slate-300 text-xs">Exclusive entry strictly for school students & mothers.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticket Packages Section */}
      <section id="packages" className="scroll-mt-28 py-24 relative z-20 bg-black border-t border-amber-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-purple-950/30 via-black to-black"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/30">
              Exclusive Passes
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 font-headline">
              Choose Your Festive Pass
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mt-2 text-sm sm:text-base">
              Verified school students and mothers only. Each pass includes 1 pair of decorated Dandiya sticks.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {packages.map((pkg, idx) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -8 }}
                className={`relative rounded-3xl p-1 transition-all ${
                  pkg.popular 
                    ? 'bg-gradient-to-b from-amber-300 via-amber-500 to-yellow-600 shadow-[0_0_30px_rgba(251,191,36,0.35)]' 
                    : 'bg-gradient-to-b from-white/20 to-white/5'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-1 border border-yellow-200">
                      <Sparkles className="w-3 h-3" /> Most Popular
                    </span>
                  </div>
                )}
                
                <div className="h-full rounded-[22px] bg-slate-950 p-6 sm:p-8 flex flex-col justify-between border border-white/5">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/10 text-amber-300 border border-white/10">
                        {pkg.badge}
                      </span>
                      <pkg.icon className="w-6 h-6 text-amber-400" />
                    </div>

                    <h3 className={`text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r ${pkg.color} font-headline`}>
                      {pkg.name}
                    </h3>

                    <div className="flex items-baseline text-white mb-6">
                      <span className="text-2xl font-bold text-amber-400 mr-1">₹</span>
                      <span className="text-5xl font-black tracking-tight">{pkg.price}</span>
                      <span className="text-xs text-slate-400 ml-2 font-medium">/ all inclusive</span>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent mb-6" />

                    <ul className="space-y-3 mb-8">
                      {pkg.includes.map((item, i) => (
                        <li key={i} className="flex items-start text-xs sm:text-sm text-slate-300">
                          <CheckCircle className="w-4 h-4 mr-2.5 text-amber-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => navigate(bookPath)}
                    className={`w-full py-4 rounded-xl font-bold transition-all duration-200 font-headline flex items-center justify-center gap-2 ${
                      pkg.popular 
                        ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-yellow-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]' 
                        : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                    }`}
                  >
                    <span>Book {pkg.name}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="scroll-mt-28 py-24 relative z-20 bg-slate-950 border-t border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/30">
              Booking Guide
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-3 font-headline">
              How to Get Your Pass
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">Simple 4-step verified process for SDPS parents</p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Ticket, title: 'Choose Package', desc: 'Select Silver (1 child), Gold (2 children), or Platinum (3 children).' },
              { icon: ShieldCheck, title: 'Verify Student', desc: 'Enter child admission number to verify against school roster.' },
              { icon: CreditCard, title: 'Confirm Booking', desc: 'Fill parent contact details and submit booking details securely.' },
              { icon: QrCode, title: 'Get QR Ticket', desc: 'Instant unique QR Code Pass ready to show at the event entrance.' }
            ].map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-slate-900/60 border border-amber-400/20 p-6 rounded-3xl text-center relative backdrop-blur-sm shadow-md"
              >
                <div className="w-14 h-14 mx-auto bg-amber-500/10 border border-amber-400/30 rounded-2xl flex items-center justify-center mb-4 text-amber-400">
                  <step.icon className="w-7 h-7" />
                </div>
                <div className="text-xs font-bold text-amber-400 mb-1 uppercase tracking-wider">Step {idx + 1}</div>
                <h3 className="text-base font-bold text-white mb-2 font-headline">{step.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Rules & Guidelines */}
      <section id="rules" className="scroll-mt-28 py-24 relative z-20 bg-black border-t border-amber-500/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/30">
              Important Rules
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-3 font-headline">
              Event Guidelines & Entry Protocols
            </h2>
            <p className="text-slate-400 text-sm">Please review before attending the Dandiya night</p>
          </div>

          <div className="bg-gradient-to-b from-slate-900 to-purple-950/40 border border-amber-400/30 rounded-3xl p-6 sm:p-10 shadow-xl">
            <ul className="space-y-5">
              {[
                "Only current students of S.D. Public School and their mothers/guardians are eligible.",
                "Every student must verify their valid Admission Number during booking.",
                "Entry is strictly permitted upon scanning the unique QR Code ticket at the gate.",
                "One mother/guardian is permitted per booking alongside the student(s).",
                "Traditional Indian festive / Dandiya attire is strongly encouraged.",
                "Tickets are non-transferable and strictly non-refundable."
              ].map((rule, idx) => (
                <li key={idx} className="flex items-start gap-3.5">
                  <FloatingDiya size={24} className="shrink-0 mt-0.5" glow={false} />
                  <span className="text-slate-200 text-sm sm:text-base leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                Need help or have queries regarding tickets? Contact our helpdesk:
                <a href="tel:+919955190262" className="text-amber-300 font-bold ml-1 hover:underline">+91 99551 90262</a>
              </div>
              <button
                onClick={() => navigate(bookPath)}
                className="px-6 py-2.5 rounded-full bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs font-headline shadow-md transition shrink-0"
              >
                Book Passes Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Festive Footer */}
      <footer className="py-12 relative z-20 bg-slate-950 border-t border-white/10 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center mb-4">
            <FloatingDiya size={36} />
          </div>
          <p className="text-slate-300 text-sm mb-4 font-headline">
            Already have a ticket? Retrieve your QR Code pass anytime:
          </p>
          <Link 
            to={ticketPath} 
            className="inline-flex items-center text-amber-400 font-bold hover:text-amber-300 transition-colors text-sm px-4 py-2 rounded-full bg-amber-400/10 border border-amber-400/30"
          >
            <Ticket className="w-4 h-4 mr-2" />
            <span>Search & Download My Passes</span>
          </Link>
          <div className="mt-8 text-xs text-slate-500">
            &copy; {new Date().getFullYear()} S.D. Public School, Patna. Navrang 2026 Celebration. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Quick-Action Bar */}
      <aside aria-label="Mobile quick actions" className="fixed bottom-0 inset-x-0 z-40 p-2.5 sm:p-3 bg-slate-950/95 backdrop-blur-xl border-t border-amber-400/30 lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <Link
            to={ticketPath}
            className="flex-1 py-2.5 px-3 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-amber-200 border border-white/20 text-xs font-bold font-headline flex items-center justify-center gap-1.5 transition text-center"
          >
            <Ticket className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">My Passes</span>
          </Link>
          <button
            onClick={() => navigate(bookPath)}
            className="flex-[1.4] py-2.5 px-3 rounded-full bg-gradient-to-r from-brand-orange via-amber-500 to-orange-600 text-white text-xs font-black font-headline shadow-[0_0_20px_rgba(248,125,14,0.6)] flex items-center justify-center gap-1.5 active:scale-95 transition border border-amber-300/40 text-center"
          >
            <Sparkles className="w-4 h-4 text-yellow-200 shrink-0" />
            <span className="truncate">Book Passes (₹299+)</span>
          </button>
        </div>
      </aside>
    </div>
  );
}
