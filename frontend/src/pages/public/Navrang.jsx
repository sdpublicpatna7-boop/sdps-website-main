import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket, 
  MapPin, 
  Calendar, 
  Star, 
  Info, 
  Music, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  Sparkles,
  Flame,
  Award,
  UtensilsCrossed,
  HeartHandshake,
  Camera,
  Image as ImageIcon,
  ExternalLink,
  Download,
  X,
  Share2,
  Trophy
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import NavrangNavbar from '@/components/layout/NavrangNavbar';
import FestivePetalCanvas from '@/components/festive/FestivePetalCanvas';
import FloatingDiya from '@/components/festive/FloatingDiya';
import DandiyaClash from '@/components/festive/DandiyaClash';
import RangoliMandala from '@/components/festive/RangoliMandala';
import ToranGarland from '@/components/festive/ToranGarland';

export default function Navrang() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Photo Gallery state
  const [gallery, setGallery] = useState(null);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const [activePhotoIdx, setActivePhotoIdx] = useState(null);
  const [galleryFilter, setGalleryFilter] = useState('all');

  const isSubdomain = typeof window !== "undefined" && (
    window.location.hostname.startsWith("navrang.") ||
    window.location.hostname.startsWith("navrang-") ||
    window.location.hostname === "navrang.localhost"
  );
  const bookPath = isSubdomain ? "/book" : "/navrang/book";
  const ticketPath = isSubdomain ? "/my-ticket" : "/navrang/my-ticket";
  const galleryUrl = "https://www.sdpublic.org/p/navrang-2026";

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/navrang/config');
        setConfig(response.data);
      } catch (error) {
        console.error('Failed to fetch config:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Fetch Photo Gallery album
  useEffect(() => {
    const fetchGallery = async () => {
      setLoadingGallery(true);
      try {
        const response = await api.get('/gdrive-folders/navrang-2026');
        if (response.data && response.data.files) {
          setGallery(response.data);
        }
      } catch (error) {
        console.warn('Could not load Navrang 2026 photo gallery via API:', error);
      } finally {
        setLoadingGallery(false);
      }
    };
    fetchGallery();
  }, []);

  // Keyboard navigation for photo lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (activePhotoIdx === null || !gallery?.files?.length) return;
      if (e.key === 'Escape') setActivePhotoIdx(null);
      if (e.key === 'ArrowRight') {
        setActivePhotoIdx((prev) => (prev + 1) % gallery.files.length);
      }
      if (e.key === 'ArrowLeft') {
        setActivePhotoIdx((prev) => (prev - 1 + gallery.files.length) % gallery.files.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoIdx, gallery]);

  const photos = gallery?.files || [];
  const activePhoto = activePhotoIdx !== null && photos[activePhotoIdx] ? photos[activePhotoIdx] : null;

  const copyGalleryShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(galleryUrl);
      toast.success("Gallery link copied to clipboard!");
    }
  };

  const recapHighlights = [
    {
      stat: "1,200+",
      label: "Students & Mothers",
      desc: "Came together in stunning traditional lehengas and kurtas to celebrate Dandiya Raas."
    },
    {
      stat: "600+",
      label: "Dandiya Pairs",
      desc: "Specially crafted and decorated sticks distributed for synchronized Garba rhythms."
    },
    {
      stat: "4 Hours",
      label: "Of Non-Stop Beats",
      desc: "Live Dhol-Tasha, folk Gujarati beats, and energetic Bollywood music in the main arena."
    },
    {
      stat: "100%",
      label: "Festive Joy",
      desc: "Durga Puja prayers, award-winning performances, and delicious festive chaat stalls."
    }
  ];

  const packagesRecap = [
    {
      id: 'silver',
      name: 'Silver Pass',
      badge: '1 Student + 1 Mother',
      price: 299,
      color: 'from-slate-200 via-amber-100 to-slate-200',
      icon: Star,
      includes: [
        '1 Student Entry (SDPS Student)',
        '1 Mother / Guardian Entry',
        '1 Pair of Decorated Dandiya Sticks Included',
        'Access to Live DJ & Garba Arena',
        'Food & Refreshment Stalls Access'
      ]
    },
    {
      id: 'gold',
      name: 'Gold Pass',
      badge: '2 Students + 1 Mother',
      price: 399,
      color: 'from-amber-300 via-yellow-200 to-amber-400',
      icon: Sparkles,
      includes: [
        '2 Students Entry (SDPS Students)',
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
      badge: '3 Students + 1 Mother',
      price: 499,
      color: 'from-fuchsia-300 via-pink-200 to-amber-200',
      icon: Flame,
      includes: [
        '3 Students Entry (SDPS Students)',
        '1 Mother / Guardian Entry',
        '1 Pair of Decorated Dandiya Sticks Included',
        'Access to Live DJ & Garba Arena',
        'Food & Refreshment Stalls Access',
        'Eligible for Best Dressed & Dance Awards'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 overflow-x-hidden selection:bg-brand-orange selection:text-white relative pb-20 lg:pb-0">
      <Helmet>
        <title>Navrang 2026 Photo Gallery & Celebration Highlights | S.D. Public School, Patna</title>
        <meta name="description" content="Relive the magic of Navrang 2026 Dandiya & Durga Puja Celebration Night at S.D. Public School, Patna. View the official photo gallery and see you next year at Navrang 2027!" />
        <link rel="canonical" href="https://navrang.sdpublic.org/" />

        {/* OpenGraph / WhatsApp / Facebook / Telegram */}
        <meta property="og:site_name" content="Navrang 2026 — S.D. Public School, Patna" />
        <meta property="og:title" content="Navrang 2026 Photo Gallery | See You at Navrang 2027!" />
        <meta property="og:description" content="Navrang 2026 has concluded with grand festivities! Explore high-resolution event photographs and relive the memorable moments." />
        <meta property="og:image" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta property="og:image:secure_url" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="576" />
        <meta property="og:image:alt" content="Navrang 2026 Celebration and Photo Gallery" />
        <meta property="og:url" content="https://navrang.sdpublic.org/" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Navrang 2026 Photo Gallery | S.D. Public School, Patna" />
        <meta name="twitter:description" content="Navrang 2026 has concluded! Explore high-resolution celebration photos and see you next year at Navrang 2027." />
        <meta name="twitter:image" content="https://navrang.sdpublic.org/navrang-banner.jpg" />
      </Helmet>

      {/* Floating Canvas Animation (Marigold Flower Petals & Golden Sparkles) */}
      <FestivePetalCanvas />

      {/* Shared School-Styled Navrang Header with Toran Garland */}
      <NavrangNavbar activePage="home" />

      {/* Hero Section: Concluded Celebration & Photo Showcase */}
      <section className="relative flex items-center justify-center py-12 sm:py-16 min-h-[85vh] overflow-hidden">
        {/* Festive Marigold Toran Garland */}
        <div className="absolute top-0 inset-x-0 z-20 pointer-events-none">
          <ToranGarland />
        </div>

        {/* Full-Bleed Festive Artwork Hero Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/navrang-hero-bg.jpg"
            alt="Navrang 2026 Dandiya Night Celebration"
            className="w-full h-full object-cover object-center scale-105 filter brightness-[0.38] contrast-[1.15] saturate-[1.25]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-purple-950/50 to-slate-950"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/40 to-black/90"></div>
        </div>

        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-[420px] h-[420px] bg-gradient-to-tr from-fuchsia-600/20 to-amber-500/15 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-gradient-to-br from-amber-600/20 to-rose-600/15 rounded-full blur-[140px] pointer-events-none"></div>

        {/* Sacred Spinning Rangoli Mandala */}
        <div className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none overflow-hidden">
          <div className="block sm:hidden">
            <RangoliMandala size={340} opacity={0.22} />
          </div>
          <div className="hidden sm:block">
            <RangoliMandala size={620} opacity={0.20} />
          </div>
        </div>

        <div className="relative z-20 w-full max-w-4xl mx-auto px-4 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full flex flex-col items-center"
          >
            {/* Celebration Status Chip */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-purple-500/20 rounded-full px-4 sm:px-6 py-1.5 sm:py-2 backdrop-blur-md border border-amber-400/40 mb-4 shadow-[0_0_25px_rgba(245,158,11,0.3)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              </span>
              <span className="text-xs sm:text-sm font-bold text-amber-200 uppercase tracking-[0.16em] font-headline">
                Navrang 2026 Concluded • Thank You All!
              </span>
            </div>

            {/* Interactive Crossed Dandiya Sticks with Impact Sparks */}
            <div className="flex justify-center mb-2">
              <DandiyaClash size={92} />
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

            {/* Subtitle & Gratitude Note */}
            <p className="text-base sm:text-2xl text-amber-100/90 font-medium mb-3 max-w-2xl mx-auto leading-relaxed px-2">
              A Grand Night of Dandiya, Garba Beats &amp; Durga Puja Joy
            </p>
            <p className="text-xs sm:text-base text-slate-300 max-w-xl mx-auto mb-8 px-4 font-light leading-relaxed">
              Heartfelt thanks to our esteemed parents, enthusiastic students, teachers, and staff for creating unforgettable festive memories at SDPS Homeground.
            </p>

            {/* Announcement Box: See You Next Year at Navrang 2027 */}
            <motion.div
              whileHover={{ scale: 1.01 }}
              className="w-full max-w-2xl mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900/50 via-slate-900/90 to-amber-950/50 border border-amber-400/40 backdrop-blur-xl shadow-[0_10px_35px_rgba(0,0,0,0.6),0_0_25px_rgba(245,158,11,0.2)] text-center relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent"></div>
              
              <div className="inline-flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-amber-300 font-headline">
                  The Tradition Continues
                </span>
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              </div>

              <h2 className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-100 font-headline mb-2">
                See You Next Year at Navrang 2027! 🎆
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
                Mark your calendars! S.D. Public School will return next autumn with an even larger Garba arena, live performers, prizes, and cultural splendour.
              </p>
            </motion.div>

            {/* Action Buttons: Photo Gallery & My Pass */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <a
                href="#gallery"
                className="px-8 py-3.5 font-black text-white text-base sm:text-lg transition-all duration-200 bg-gradient-to-r from-brand-orange via-amber-500 to-orange-600 rounded-full shadow-[0_0_30px_rgba(248,125,14,0.55)] font-headline flex items-center justify-center gap-2 border border-amber-300/40 hover:opacity-95 cursor-pointer"
              >
                <Camera className="w-5 h-5 text-yellow-200" />
                <span>View Photo Gallery</span>
                <ChevronRight className="w-5 h-5" />
              </a>

              <Link
                to={ticketPath}
                className="px-7 py-3.5 font-bold text-base sm:text-lg text-amber-200 hover:text-white transition-all bg-white/10 hover:bg-white/20 rounded-full border border-white/20 font-headline flex items-center justify-center gap-2 backdrop-blur-md"
              >
                <Ticket className="w-5 h-5 text-amber-400" />
                <span>Find My Past Pass / QR</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Navrang 2026 in Numbers / Celebration Highlights Bar */}
      <section className="relative z-20 py-8 bg-gradient-to-r from-purple-950 via-slate-900 to-amber-950 border-y border-amber-400/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {recapHighlights.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm text-center"
              >
                <div className="text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-200 font-headline mb-1">
                  {item.stat}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white mb-1">
                  {item.label}
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 leading-snug">
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Official Photo Gallery Section (#gallery) */}
      <section id="gallery" className="scroll-mt-24 py-20 relative z-20 bg-slate-950 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/30">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              Official Photo Album
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 font-headline">
              Navrang 2026 Photo Gallery
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto mt-2 text-sm sm:text-base">
              Relive the joyful dance steps, vibrant traditional attire, and divine Durga Puja celebrations captured by our official media team.
            </p>

            {/* Quick Actions Row */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs sm:text-sm font-headline shadow-md transition"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Full HD Album on sdpublic.org</span>
              </a>

              <button
                onClick={copyGalleryShare}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-200 border border-white/20 text-xs sm:text-sm font-medium transition"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Share Gallery Link</span>
              </button>
            </div>
          </div>

          {/* Photo Gallery Grid */}
          {loadingGallery ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 text-sm font-medium">Loading high-resolution photographs...</p>
            </div>
          ) : photos.length > 0 ? (
            <div>
              {/* Photo count indicator */}
              <div className="flex items-center justify-between mb-6 text-xs text-slate-400 px-1">
                <span>Displaying <strong className="text-amber-300">{photos.length}</strong> festive photographs</span>
                <span className="hidden sm:inline">Tap any photograph to zoom &amp; download</span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {photos.map((photo, idx) => {
                  const thumbUrl = `https://lh3.googleusercontent.com/d/${photo.file_id}=w600`;
                  return (
                    <motion.div
                      key={photo.file_id || idx}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: Math.min(idx * 0.04, 0.6) }}
                      whileHover={{ y: -4 }}
                      onClick={() => setActivePhotoIdx(idx)}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-white/10 hover:border-amber-400/50 cursor-pointer shadow-md transition-all"
                    >
                      <img
                        src={thumbUrl}
                        alt={photo.title || `Navrang 2026 Photo ${idx + 1}`}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs text-white font-medium truncate flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{photo.title || `Photo #${idx + 1}`}</span>
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Bottom direct link card */}
              <div className="mt-12 text-center p-6 rounded-3xl bg-gradient-to-b from-purple-950/40 to-slate-900/60 border border-amber-400/30">
                <FloatingDiya size={32} className="mx-auto mb-3" />
                <h3 className="text-lg sm:text-xl font-bold text-white font-headline mb-2">
                  Want to download original camera resolution photos?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-4">
                  Visit the dedicated Google Drive photo folder to download zip packages and uncompressed original camera files.
                </p>
                <a
                  href={galleryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm font-headline shadow-md transition"
                >
                  <span>Open sdpublic.org/p/navrang-2026</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ) : (
            /* Fallback showcase card if photos API is pending */
            <div className="text-center py-16 px-4 rounded-3xl bg-slate-900/80 border border-amber-400/30 max-w-2xl mx-auto">
              <Camera className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-80" />
              <h3 className="text-xl sm:text-2xl font-bold text-white font-headline mb-2">
                Navrang 2026 Photo Album Ready
              </h3>
              <p className="text-sm text-slate-300 mb-6">
                All official celebration photographs are available directly at the school photo gallery.
              </p>
              <a
                href={galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm font-headline shadow-md transition"
              >
                <span>View Navrang 2026 Photo Gallery</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox Modal for Photo Gallery */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActivePhotoIdx(null)}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between text-white z-10" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-xs sm:text-sm font-bold text-amber-300 font-headline">
                  Photo {activePhotoIdx + 1} of {photos.length}
                </span>
                <span className="hidden sm:inline text-xs text-slate-400 truncate max-w-md">
                  {activePhoto.title || 'Navrang 2026 Celebration'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://lh3.googleusercontent.com/d/${activePhoto.file_id}=w1600`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title="Download High-Res Photo"
                >
                  <Download className="w-5 h-5 text-amber-300" />
                </a>
                <button
                  onClick={() => setActivePhotoIdx(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Center Display with Next/Prev Arrows */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev - 1 + photos.length) % photos.length);
                }}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition active:scale-95"
                title="Previous Photo (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <img
                src={`https://lh3.googleusercontent.com/d/${activePhoto.file_id}=w1400`}
                alt={activePhoto.title || `Navrang 2026 Photo ${activePhotoIdx + 1}`}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl"
              />

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev + 1) % photos.length);
                }}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition active:scale-95"
                title="Next Photo (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-center gap-3 text-xs text-slate-400 z-10" onClick={(e) => e.stopPropagation()}>
              <span className="hidden sm:inline">Use Arrow Keys ◀ ▶ to browse</span>
              <span>•</span>
              <a
                href={galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-300 hover:underline flex items-center gap-1"
              >
                <span>View Full Album on sdpublic.org</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navrang 2027 Anticipation Section (#navrang-2027) */}
      <section id="navrang-2027" className="scroll-mt-24 py-24 relative z-20 bg-gradient-to-b from-slate-950 via-purple-950/60 to-slate-950 border-b border-amber-500/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-bold uppercase tracking-widest text-amber-300 font-headline">
              Looking Ahead
            </span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 font-headline mb-4">
            See You at Navrang 2027! 🎆
          </h2>

          <p className="text-base sm:text-xl text-slate-200 max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            The tradition of Garba, Dandiya Raas, and family togetherness continues next year. SDPS will be back with grander stages, energetic beats, and divine festive celebrations.
          </p>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto mb-10 text-left">
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-400/20">
              <Music className="w-8 h-8 text-amber-400 mb-3" />
              <h3 className="text-lg font-bold text-white font-headline mb-1">Grander Garba Arena</h3>
              <p className="text-xs text-slate-300">Enhanced dance arena with live percussionists, traditional Gujarati folk songs, and live DJ sets.</p>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-400/20">
              <Award className="w-8 h-8 text-fuchsia-400 mb-3" />
              <h3 className="text-lg font-bold text-white font-headline mb-1">Costume &amp; Dance Trophies</h3>
              <p className="text-xs text-slate-300">More award categories for best dressed mothers &amp; students, synchronized steps, and creative family duos.</p>
            </div>
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-amber-400/20">
              <HeartHandshake className="w-8 h-8 text-rose-400 mb-3" />
              <h3 className="text-lg font-bold text-white font-headline mb-1">Safe Family Atmosphere</h3>
              <p className="text-xs text-slate-300">Continued dedication to a safe, joyous, and exclusively family-oriented evening for school students.</p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-black/60 border border-white/10 max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left text-xs text-slate-300">
              <strong className="text-white block font-headline text-sm mb-0.5">Want announcements for Navrang 2027?</strong>
              Stay connected with school circulars and the official website.
            </div>
            <a
              href="https://www.sdpublic.org"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-amber-200 border border-white/20 text-xs font-bold font-headline shrink-0 transition"
            >
              sdpublic.org ↗
            </a>
          </div>
        </div>
      </section>

      {/* Celebration Memories Section (#memories) */}
      <section id="memories" className="scroll-mt-24 py-20 relative z-20 bg-slate-950 border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-full border border-amber-400/30">
              Memories &amp; Recap
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 font-headline">
              Navrang 2026 Event Highlights
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto mt-2 text-sm sm:text-base">
              Relive the elements that made October 15, 2026 at SDPS Homeground an unforgettable evening.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Calendar,
                title: "Grand Evening",
                desc: "October 15, 2026 • 6:00 PM to 10:00 PM at SDPS Homeground, Patna.",
                color: "text-amber-400",
                border: "border-amber-400/30"
              },
              {
                icon: MapPin,
                title: "SDPS Homeground",
                desc: "Lavishly illuminated open-air arena decorated with traditional torans and fairy lights.",
                color: "text-rose-400",
                border: "border-rose-400/30"
              },
              {
                icon: Music,
                title: "Garba & Bollywood Beats",
                desc: "Electrifying live music sets that kept families spinning and clapping throughout the night.",
                color: "text-fuchsia-400",
                border: "border-fuchsia-400/30"
              },
              {
                icon: UtensilsCrossed,
                title: "Festive Delicacies",
                desc: "Authentic chaat, hot jalebis, savoury snacks, and cool beverages for everyone.",
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
                className={`bg-slate-900/80 backdrop-blur-md border ${item.border} p-6 rounded-3xl shadow-lg`}
              >
                <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 font-headline">{item.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Passes Recap / Bookings Closed Notice */}
      <section id="packages" className="scroll-mt-24 py-20 relative z-20 bg-black border-b border-amber-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-white/10 px-4 py-1.5 rounded-full border border-white/20">
              Registrations Concluded
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 font-headline">
              Navrang 2026 Passes Recap
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto mt-2 text-sm sm:text-base">
              Online ticket bookings are now closed. If you attended, you can still view your booking record and passes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {packagesRecap.map((pkg, idx) => (
              <div
                key={pkg.id}
                className="relative rounded-3xl p-1 bg-gradient-to-b from-white/20 to-white/5 opacity-80"
              >
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
                      <span className="text-4xl font-black tracking-tight">{pkg.price}</span>
                      <span className="text-xs text-slate-400 ml-2 font-medium">/ concluded</span>
                    </div>

                    <div className="w-full h-px bg-white/10 mb-6" />

                    <ul className="space-y-3 mb-6">
                      {pkg.includes.map((item, i) => (
                        <li key={i} className="flex items-start text-xs sm:text-sm text-slate-400">
                          <CheckCircle className="w-4 h-4 mr-2.5 text-slate-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs font-bold text-slate-400 font-headline">
                    Event Concluded
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ticket Retrieval Banner */}
          <div className="mt-12 max-w-2xl mx-auto p-6 rounded-3xl bg-slate-900/90 border border-amber-400/30 text-center">
            <Ticket className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <h4 className="text-white font-bold font-headline text-lg mb-1">
              Need to look up your past Navrang 2026 pass?
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 mb-4">
              Search by registered mobile phone number to view payment receipts and digital passes.
            </p>
            <Link
              to={ticketPath}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 text-xs sm:text-sm font-bold font-headline transition"
            >
              <Ticket className="w-4 h-4" />
              <span>Find My Past Passes</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Festive Footer */}
      <footer className="py-12 relative z-20 bg-slate-950 border-t border-white/10 text-center">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center mb-4">
            <FloatingDiya size={36} />
          </div>
          <p className="text-slate-300 text-sm mb-3 font-headline">
            Navrang 2026 Concluded • S.D. Public School, Patna
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs mb-6">
            <a
              href={galleryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 font-medium transition flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Photo Gallery (sdpublic.org/p/navrang-2026)</span>
            </a>
            <span className="text-slate-600">•</span>
            <Link to={ticketPath} className="text-amber-400 hover:text-amber-300 font-medium transition">
              Find Past Pass
            </Link>
            <span className="text-slate-600">•</span>
            <a href="https://www.sdpublic.org" className="text-amber-400 hover:text-amber-300 font-medium transition">
              School Website
            </a>
          </div>
          <div className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} S.D. Public School, Patna. Navrang Dandiya Utsav. All rights reserved.
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
          <a
            href="#gallery"
            className="flex-[1.4] py-2.5 px-3 rounded-full bg-gradient-to-r from-brand-orange via-amber-500 to-orange-600 text-white text-xs font-black font-headline shadow-[0_0_20px_rgba(248,125,14,0.6)] flex items-center justify-center gap-1.5 active:scale-95 transition border border-amber-300/40 text-center cursor-pointer"
          >
            <Camera className="w-4 h-4 text-yellow-200 shrink-0" />
            <span className="truncate">Photo Gallery</span>
          </a>
        </div>
      </aside>
    </div>
  );
}
