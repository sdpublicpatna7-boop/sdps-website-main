import { useEffect, useState } from "react";

const CHANNEL_NAME = "sdps_obs_stream_channel";

const DEFAULT_PREFECTS = [
  {
    name: "Adarsh Kumar",
    role: "Head Boy | School Prefect",
    subtitle: "Class XII • S.D. Public School, Patna",
    photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
    badge: "INVESTITURE CEREMONY"
  },
  {
    name: "Ishika Kumari",
    role: "Head Girl | School Prefect",
    subtitle: "Class XII • S.D. Public School, Patna",
    photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
    badge: "INVESTITURE CEREMONY"
  },
  {
    name: "Ankush Anand",
    role: "School Prefect",
    subtitle: "Class XI • S.D. Public School, Patna",
    photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434282/ankush_anad_sjrqqt.png",
    badge: "INVESTITURE CEREMONY"
  },
  {
    name: "Nitin Raj",
    role: "School Prefect",
    subtitle: "Class XI • S.D. Public School, Patna",
    photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785503589/nitin_iadqvo.png",
    badge: "INVESTITURE CEREMONY"
  }
];

export default function StreamOverlay() {
  const [lowerThird, setLowerThird] = useState({
    visible: true,
    name: DEFAULT_PREFECTS[0].name,
    role: DEFAULT_PREFECTS[0].role,
    subtitle: DEFAULT_PREFECTS[0].subtitle,
    photo: DEFAULT_PREFECTS[0].photo,
    badge: DEFAULT_PREFECTS[0].badge
  });

  const [banner, setBanner] = useState({
    visible: true,
    title: "INVESTITURE CEREMONY 2026-27",
    subtitle: "S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE STREAM"
  });

  const [ticker, setTicker] = useState({
    visible: true,
    text: "Welcome Parents, Teachers and Students to the Investiture Ceremony 2026-27 | Oath Taking Ceremony in Progress | S.D. Public School, Patna"
  });

  const [logoBug, setLogoBug] = useState({
    visible: true,
    showLive: true
  });

  const [confettiActive, setConfettiActive] = useState(false);

  // Sync state from BroadcastChannel or localStorage
  useEffect(() => {
    const handleMessage = (data) => {
      if (!data) return;
      if (data.type === "LOWER_THIRD") {
        setLowerThird(prev => ({ ...prev, ...data.payload }));
      } else if (data.type === "BANNER") {
        setBanner(prev => ({ ...prev, ...data.payload }));
      } else if (data.type === "TICKER") {
        setTicker(prev => ({ ...prev, ...data.payload }));
      } else if (data.type === "LOGO") {
        setLogoBug(prev => ({ ...prev, ...data.payload }));
      } else if (data.type === "CONFETTI") {
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 5000);
      }
    };

    // 1. BroadcastChannel API
    let bc = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (e) => handleMessage(e.data);
      }
    } catch (err) {
      console.warn("BroadcastChannel error:", err);
    }

    // 2. LocalStorage sync fallback
    const handleStorage = (e) => {
      if (e.key === "sdps_stream_overlay_state" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.lowerThird) setLowerThird(parsed.lowerThird);
          if (parsed.banner) setBanner(parsed.banner);
          if (parsed.ticker) setTicker(parsed.ticker);
          if (parsed.logoBug) setLogoBug(parsed.logoBug);
        } catch (err) {}
      }
    };

    window.addEventListener("storage", handleStorage);

    // Initial load check from localStorage
    try {
      const saved = localStorage.getItem("sdps_stream_overlay_state");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lowerThird) setLowerThird(parsed.lowerThird);
        if (parsed.banner) setBanner(parsed.banner);
        if (parsed.ticker) setTicker(parsed.ticker);
        if (parsed.logoBug) setLogoBug(parsed.logoBug);
      }
    } catch (e) {}

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden relative select-none pointer-events-none font-sans">
      
      {/* 1. TOP LOGO BUG & LIVE INDICATOR (TOP RIGHT) */}
      {logoBug.visible && (
        <div className="absolute top-6 right-8 flex items-center gap-3 bg-[#0B1E40]/80 backdrop-blur-md border border-[#F4D571]/40 px-4 py-2 rounded-2xl shadow-2xl animate-fade-down">
          <img
            src="https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/logo_aadarsh_clean.png"
            alt="SDPS Logo"
            className="w-8 h-8 object-contain filter drop-shadow"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/logo192.png";
            }}
          />
          <div className="flex flex-col">
            <span className="font-headline font-black text-xs text-white tracking-wide">S.D. PUBLIC SCHOOL</span>
            <span className="text-[9px] font-bold text-[#F4D571] tracking-widest uppercase">Patna, Bihar</span>
          </div>
          {logoBug.showLive && (
            <div className="flex items-center gap-1.5 bg-rose-600/90 text-white px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wider uppercase shadow-md ml-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>LIVE</span>
            </div>
          )}
        </div>
      )}

      {/* 2. MAIN EVENT BANNER (TOP CENTER) */}
      {banner.visible && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gradient-to-r from-[#0B1E40]/95 via-[#0E3B91]/95 to-[#0B1E40]/95 backdrop-blur-xl border-2 border-[#F4D571]/60 px-8 py-3.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-bounce-short">
          <div className="w-3 h-3 rounded-full bg-[#F4D571] animate-ping" />
          <div className="text-center">
            <h1 className="font-headline font-black text-lg md:text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase drop-shadow-md">
              {banner.title}
            </h1>
            {banner.subtitle && (
              <p className="text-[10px] md:text-xs font-bold text-slate-200 tracking-widest uppercase mt-0.5 opacity-90">
                {banner.subtitle}
              </p>
            )}
          </div>
          <div className="w-3 h-3 rounded-full bg-[#F4D571] animate-ping" />
        </div>
      )}

      {/* 3. LOWER THIRD DESIGNATION / CANDIDATE CARD (BOTTOM LEFT) */}
      {lowerThird.visible && (
        <div className="absolute bottom-16 left-10 flex items-stretch bg-gradient-to-r from-[#071329]/95 via-[#0E3B91]/95 to-[#071329]/90 backdrop-blur-2xl border-2 border-[#F4D571]/70 rounded-3xl p-3.5 max-w-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in slide-in-from-left duration-500">
          
          {/* Photo Avatar (if provided) */}
          {lowerThird.photo ? (
            <div className="relative shrink-0 mr-4">
              <img
                src={lowerThird.photo}
                alt={lowerThird.name}
                className="w-20 h-20 rounded-2xl object-cover border-2 border-[#F4D571] shadow-xl bg-slate-900"
              />
              <div className="absolute -bottom-1.5 -right-1.5 bg-[#F4D571] text-[#0B1E40] text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase shadow-md">
                SDPS
              </div>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-2xl border-2 border-[#F4D571] mr-4 shadow-xl">
              {lowerThird.name ? lowerThird.name.charAt(0) : "S"}
            </div>
          )}

          {/* Name & Role Text Block */}
          <div className="flex flex-col justify-center min-w-0 pr-4">
            
            {/* Top Badge */}
            {lowerThird.badge && (
              <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 text-[#F4D571] font-bold text-[10px] tracking-widest uppercase mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                {lowerThird.badge}
              </span>
            )}

            {/* Candidate / Leader Full Name */}
            <h2 className="font-headline font-black text-xl md:text-2xl text-white tracking-tight truncate drop-shadow-md">
              {lowerThird.name}
            </h2>

            {/* Role & Designation */}
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-bold text-xs md:text-sm text-amber-300 uppercase tracking-wide truncate">
                {lowerThird.role}
              </span>
            </div>

            {/* Subtitle / Class */}
            {lowerThird.subtitle && (
              <p className="text-[11px] font-medium text-slate-300 truncate mt-0.5 opacity-90">
                {lowerThird.subtitle}
              </p>
            )}

          </div>

          {/* Right Gold Accent Stripe */}
          <div className="w-1.5 bg-gradient-to-b from-[#F4D571] via-amber-500 to-[#F4D571] rounded-r-2xl ml-auto self-stretch shrink-0" />
        </div>
      )}

      {/* 4. LIVE NEWS TICKER / CRAWLER (BOTTOM FULL WIDTH) */}
      {ticker.visible && (
        <div className="absolute bottom-0 inset-x-0 bg-[#071120]/95 backdrop-blur-xl border-t-2 border-[#F4D571]/60 flex items-center h-10 overflow-hidden shadow-[0_-5px_25px_rgba(0,0,0,0.8)]">
          
          {/* Static Left Badge */}
          <div className="bg-gradient-to-r from-rose-700 to-rose-600 text-white font-headline font-black text-xs px-4 h-full flex items-center gap-2 shrink-0 border-r border-rose-500/50 shadow-lg z-10">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>SDPS LIVE TICKER</span>
          </div>

          {/* Scrolling Ticker Text */}
          <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap inline-block animate-marquee font-semibold text-xs text-amber-200 tracking-wide">
              <span className="mx-6">★ {ticker.text} ★</span>
              <span className="mx-6">★ {ticker.text} ★</span>
              <span className="mx-6">★ {ticker.text} ★</span>
            </div>
          </div>

        </div>
      )}

      {/* 5. CONFETTI ANIMATION OVERLAY */}
      {confettiActive && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
          <div className="animate-confetti-rain w-full h-full flex justify-around">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full animate-bounce"
                style={{
                  backgroundColor: ["#F4D571", "#ef4444", "#2563eb", "#10b981", "#8b5cf6"][i % 5],
                  animationDelay: `${(i % 10) * 0.2}s`
                }}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
