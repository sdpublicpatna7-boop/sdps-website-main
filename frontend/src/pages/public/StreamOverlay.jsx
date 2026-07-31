import { useEffect, useState, useRef } from "react";
import api from "@/lib/api";

const CHANNEL_NAME = "sdps_obs_stream_channel";

const DEFAULT_LEADER = {
  name: "Priyanshu Singh",
  role: "House Captain",
  subtitle: "Gautam House (Green Army) • 2026-27",
  photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778296001/005_l9apgk.png",
  badge: "GAUTAM CAPTAIN"
};

export default function StreamOverlay() {
  const [lowerThird, setLowerThird] = useState({
    visible: true,
    name: DEFAULT_LEADER.name,
    role: DEFAULT_LEADER.role,
    subtitle: DEFAULT_LEADER.subtitle,
    photo: DEFAULT_LEADER.photo,
    badge: DEFAULT_LEADER.badge,
    timestamp: Date.now()
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

  const [startingSoon, setStartingSoon] = useState({
    visible: false,
    title: "INVESTITURE CEREMONY 2026-27",
    subtitle: "S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE BROADCAST",
    message: "STREAM STARTING SOON",
    timerText: "Please stay tuned. The ceremony will begin shortly."
  });

  const lastConfettiTriggerRef = useRef(0);
  const canvasRef = useRef(null);
  const [confettiActive, setConfettiActive] = useState(false);

  // Trigger HTML5 Canvas Confetti Burst Animation
  const fireCanvasConfetti = () => {
    setConfettiActive(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const width = (canvas.width = window.innerWidth);
    const height = (canvas.height = window.innerHeight);

    const colors = ["#F4D571", "#FFD700", "#ef4444", "#2563eb", "#10b981", "#8b5cf6", "#ec4899", "#f97316"];
    const particles = [];

    // Create 180 dynamic confetti particles
    for (let i = 0; i < 180; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.4) - 50,
        vx: (Math.random() - 0.5) * 9,
        vy: Math.random() * 7 + 3,
        size: Math.random() * 11 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        shape: Math.random() > 0.4 ? "rect" : "circle",
        opacity: 1
      });
    }

    let startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        if (elapsed > 3000) {
          p.opacity -= 0.02;
        }

        if (p.opacity > 0 && p.y < height + 50) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;

          if (p.shape === "circle") {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size * 0.6);
          }
          ctx.restore();
        }
      });

      if (alive && elapsed < 5500) {
        requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, width, height);
        setConfettiActive(false);
      }
    };

    requestAnimationFrame(animate);
  };

  // Sync state from Backend API, BroadcastChannel & localStorage
  useEffect(() => {
    const processState = (state) => {
      if (!state) return;
      if (state.lowerThird) {
        setLowerThird(prev => {
          if (
            prev.name !== state.lowerThird.name ||
            prev.role !== state.lowerThird.role ||
            prev.visible !== state.lowerThird.visible ||
            prev.timestamp !== state.lowerThird.timestamp
          ) {
            return { ...prev, ...state.lowerThird };
          }
          return prev;
        });
      }
      if (state.banner) setBanner(prev => ({ ...prev, ...state.banner }));
      if (state.ticker) setTicker(prev => ({ ...prev, ...state.ticker }));
      if (state.logoBug) setLogoBug(prev => ({ ...prev, ...state.logoBug }));
      if (state.startingSoon) setStartingSoon(prev => ({ ...prev, ...state.startingSoon }));

      if (state.confetti_trigger_id && state.confetti_trigger_id > lastConfettiTriggerRef.current) {
        lastConfettiTriggerRef.current = state.confetti_trigger_id;
        fireCanvasConfetti();
      }
    };

    // 1. BroadcastChannel API
    let bc = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (e) => {
          if (e.data?.type === "CONFETTI") {
            fireCanvasConfetti();
          } else if (e.data?.type === "LOWER_THIRD") {
            setLowerThird(prev => ({ ...prev, ...e.data.payload, timestamp: Date.now() }));
          } else if (e.data?.type === "BANNER") {
            setBanner(prev => ({ ...prev, ...e.data.payload }));
          } else if (e.data?.type === "TICKER") {
            setTicker(prev => ({ ...prev, ...e.data.payload }));
          } else if (e.data?.type === "LOGO") {
            setLogoBug(prev => ({ ...prev, ...e.data.payload }));
          } else if (e.data?.type === "STARTING_SOON") {
            setStartingSoon(prev => ({ ...prev, ...e.data.payload }));
          }
        };
      }
    } catch (err) {}

    // 2. High-Speed Backend API Polling (200ms with cache-busting headers for OBS CEF)
    const fetchApiState = async () => {
      try {
        const res = await api.get(`/stream-overlay/state?t=${Date.now()}`, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
        if (res.data) {
          processState(res.data);
        }
      } catch (err) {}
    };

    // 3. LocalStorage fallback check (200ms)
    const checkLocalStorage = () => {
      try {
        const saved = localStorage.getItem("sdps_stream_overlay_state");
        if (saved) {
          const parsed = JSON.parse(saved);
          processState(parsed);
        }
      } catch (e) {}
    };

    fetchApiState();
    checkLocalStorage();
    const interval = setInterval(fetchApiState, 200);
    const localInterval = setInterval(checkLocalStorage, 200);

    return () => {
      if (bc) bc.close();
      clearInterval(interval);
      clearInterval(localInterval);
    };
  }, []);

  // Force transparent background for OBS Studio Browser Source
  useEffect(() => {
    document.documentElement.classList.add("obs-transparent-mode");
    document.body.classList.add("obs-transparent-mode");
    const rootEl = document.getElementById("root");
    if (rootEl) rootEl.classList.add("obs-transparent-mode");

    document.body.style.background = "transparent";
    document.body.style.backgroundColor = "transparent";
    document.documentElement.style.background = "transparent";
    document.documentElement.style.backgroundColor = "transparent";

    return () => {
      document.documentElement.classList.remove("obs-transparent-mode");
      document.body.classList.remove("obs-transparent-mode");
      if (rootEl) rootEl.classList.remove("obs-transparent-mode");
      document.body.style.background = "";
      document.body.style.backgroundColor = "";
      document.documentElement.style.background = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden relative select-none pointer-events-none font-sans">
      
      {/* HTML5 CONFETTI CANVAS */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-50"
      />

      {/* FULL-SCREEN PRE-SHOW SLATE WITH HIGH-ENERGY ANIMATIONS: "INVESTITURE CEREMONY STARTING SOON..." */}
      {startingSoon.visible && (
        <div className="absolute inset-0 z-40 bg-gradient-to-br from-[#040C1A] via-[#0B1E40] to-[#071329] flex flex-col items-center justify-center p-8 text-white transition-all duration-700 animate-in fade-in-0 zoom-in-95 overflow-hidden">
          
          {/* Animated Background Gold Bokeh Particles */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="absolute rounded-full bg-gradient-to-tr from-amber-400/20 to-yellow-200/40 blur-xl animate-pulse"
                style={{
                  width: `${60 + (i % 5) * 40}px`,
                  height: `${60 + (i % 5) * 40}px`,
                  top: `${(i * 19) % 90}%`,
                  left: `${(i * 27) % 90}%`,
                  animationDuration: `${3 + (i % 4) * 2}s`,
                  animationDelay: `${(i % 3) * 0.7}s`
                }}
              />
            ))}
          </div>

          {/* Glowing Radial Spotlight Aura */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-r from-[#0E3B91]/60 via-amber-500/25 to-[#0E3B91]/60 rounded-full blur-3xl pointer-events-none animate-pulse" />

          {/* School Crest Logo with Rotating Sparkle Rings */}
          <div className="relative mb-8">
            {/* Spinning Outer Ring */}
            <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#F4D571]/40 animate-spin" style={{ animationDuration: '20s' }} />
            <div className="absolute -inset-8 rounded-full border border-amber-300/20 animate-spin" style={{ animationDuration: '35s', animationDirection: 'reverse' }} />

            <div className="w-36 h-36 rounded-3xl bg-[#0B1E40]/90 border-2 border-[#F4D571] p-4 shadow-[0_0_60px_rgba(244,213,113,0.4)] flex items-center justify-center backdrop-blur-2xl relative z-10">
              <img
                src="https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/logo_aadarsh_clean.png"
                alt="SDPS Logo"
                className="w-full h-full object-contain filter drop-shadow-lg"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/logo192.png";
                }}
              />
            </div>
            <div className="absolute -bottom-3 -right-2 bg-rose-600 text-white font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-widest shadow-xl border border-rose-400 z-20 animate-pulse">
              LIVE BROADCAST
            </div>
          </div>

          {/* School Name & Subtitle */}
          <div className="text-center space-y-3 max-w-4xl relative z-10">
            <h3 className="text-xs md:text-sm font-black text-[#F4D571] tracking-[0.35em] uppercase drop-shadow">
              {startingSoon.subtitle || "S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE BROADCAST"}
            </h3>

            {/* Title with Continuous Gold Shimmer Gradient Wave */}
            <h1 className="font-headline font-black text-4xl md:text-6xl tracking-wide uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
              {startingSoon.title || "INVESTITURE CEREMONY 2026-27"}
            </h1>
          </div>

          {/* Pulsing "STARTING SOON" Live Status Box with Radar Glow */}
          <div className="mt-10 px-12 py-5 bg-gradient-to-r from-[#0E3B91]/95 via-[#0B1E40]/95 to-[#0E3B91]/95 backdrop-blur-2xl border-2 border-[#F4D571] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center gap-5 relative z-10 animate-bounce">
            <div className="w-5 h-5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="font-headline font-black text-3xl md:text-4xl text-white tracking-widest uppercase">
              {startingSoon.message || "STREAM STARTING SOON"}
            </span>
            <div className="w-5 h-5 rounded-full bg-rose-500 animate-ping shrink-0" />
          </div>

          {/* Timer Note */}
          {startingSoon.timerText && (
            <p className="mt-8 text-base md:text-lg font-bold text-amber-200 tracking-wider opacity-90 max-w-2xl text-center relative z-10">
              {startingSoon.timerText}
            </p>
          )}

          {/* Bottom Footer Info Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8 text-xs text-slate-300 font-bold tracking-widest uppercase border-t border-white/15 pt-5 px-16 z-10">
            <span>S.D. PUBLIC SCHOOL PATNA</span>
            <span className="text-[#F4D571]">★</span>
            <span>STUDENT COUNCIL 2026-27</span>
            <span className="text-[#F4D571]">★</span>
            <span>YOUTUBE LIVE</span>
          </div>

        </div>
      )}

      {/* 1. TOP LOGO BUG & LIVE INDICATOR (TOP RIGHT) */}
      {!startingSoon.visible && logoBug.visible && (
        <div className="absolute top-6 right-8 flex items-center gap-3 bg-[#0B1E40]/95 backdrop-blur-md border border-[#F4D571]/50 px-5 py-2.5 rounded-2xl shadow-2xl transition-all duration-500">
          <img
            src="https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/logo_aadarsh_clean.png"
            alt="SDPS Logo"
            className="w-9 h-9 object-contain filter drop-shadow"
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
            <div className="flex items-center gap-1.5 bg-rose-600 text-white px-3 py-1 rounded-full font-bold text-[10px] tracking-wider uppercase shadow-md ml-1 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span>LIVE</span>
            </div>
          )}
        </div>
      )}

      {/* 2. MAIN EVENT BANNER (TOP CENTER) */}
      {!startingSoon.visible && banner.visible && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gradient-to-r from-[#0B1E40]/95 via-[#0E3B91]/95 to-[#0B1E40]/95 backdrop-blur-xl border-2 border-[#F4D571]/70 px-10 py-4 rounded-full shadow-[0_12px_45px_rgba(0,0,0,0.85)] transition-all duration-500">
          <div className="w-3.5 h-3.5 rounded-full bg-[#F4D571] animate-ping" />
          <div className="text-center">
            <h1 className="font-headline font-black text-xl md:text-2xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 uppercase drop-shadow-md">
              {banner.title}
            </h1>
            {banner.subtitle && (
              <p className="text-xs font-extrabold text-slate-200 tracking-widest uppercase mt-0.5 opacity-90">
                {banner.subtitle}
              </p>
            )}
          </div>
          <div className="w-3.5 h-3.5 rounded-full bg-[#F4D571] animate-ping" />
        </div>
      )}

      {/* 3. BIGGER & BOLDER LOWER THIRD DESIGNATION CARD WITH CINEMATIC 3D FLIP & SLIDE TRANSITIONS */}
      {!startingSoon.visible && lowerThird.visible && (
        <div
          key={`${lowerThird.name}-${lowerThird.role}-${lowerThird.timestamp}`}
          className="absolute bottom-16 left-10 flex items-stretch bg-gradient-to-r from-[#050E1F]/95 via-[#0E3B91]/95 to-[#071329]/95 backdrop-blur-2xl border-2 border-[#F4D571] rounded-[2rem] p-5 max-w-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-in fade-in-0 slide-in-from-bottom-12 zoom-in-95 duration-500 ease-out overflow-hidden"
        >
          {/* Gold Shimmer Beam Wipe Effect across Card */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent -translate-x-full animate-in slide-in-from-left-full duration-1000 pointer-events-none z-30" />

          {/* Photo Avatar - BIGGER & BOLDER (112px x 112px) */}
          {lowerThird.photo ? (
            <div className="relative shrink-0 mr-5">
              <img
                key={lowerThird.photo}
                src={lowerThird.photo}
                alt={lowerThird.name}
                className="w-28 h-28 rounded-2xl object-cover border-3 border-[#F4D571] shadow-[0_0_25px_rgba(244,213,113,0.4)] bg-slate-900 animate-in fade-in-0 zoom-in-75 duration-400"
              />
              <div className="absolute -bottom-2 -right-2 bg-[#F4D571] text-[#0B1E40] text-[10px] font-black px-2 py-0.5 rounded-md uppercase shadow-lg border border-amber-300">
                SDPS
              </div>
            </div>
          ) : (
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 flex items-center justify-center text-white font-black text-4xl border-3 border-[#F4D571] mr-5 shadow-[0_0_25px_rgba(244,213,113,0.4)] shrink-0">
              {lowerThird.name ? lowerThird.name.charAt(0) : "S"}
            </div>
          )}

          {/* Name & Role Text Block - BIGGER & BOLDER */}
          <div className="flex flex-col justify-center min-w-0 pr-5">
            
            {/* Top Badge */}
            {lowerThird.badge && (
              <span 
                key={lowerThird.badge}
                className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-lg bg-amber-500/25 border border-amber-400/60 text-[#F4D571] font-black text-xs tracking-widest uppercase mb-1.5 animate-in fade-in-0 zoom-in-90 duration-300 shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {lowerThird.badge}
              </span>
            )}

            {/* Candidate / Leader Full Name - BIGGER (3XL) */}
            <h2 
              key={lowerThird.name}
              className="font-headline font-black text-2xl md:text-3xl text-white tracking-tight truncate drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-in fade-in-0 slide-in-from-left-6 duration-300"
            >
              {lowerThird.name}
            </h2>

            {/* Role & Designation - BIGGER (BASE) */}
            <div 
              key={lowerThird.role}
              className="flex items-center gap-2 mt-0.5 animate-in fade-in-0 slide-in-from-left-4 duration-400"
            >
              <span className="font-extrabold text-sm md:text-base text-amber-300 uppercase tracking-wide truncate">
                {lowerThird.role}
              </span>
            </div>

            {/* Subtitle / Organization - BIGGER */}
            {lowerThird.subtitle && (
              <p className="text-xs md:text-sm font-semibold text-slate-200 truncate mt-0.5 opacity-95">
                {lowerThird.subtitle.replace(/^Class\s+[IVXLCDM0-9]+\s*•\s*/i, "").trim()}
              </p>
            )}

          </div>

          {/* Right Gold Accent Stripe - BIGGER & GLOWING */}
          <div className="w-2 bg-gradient-to-b from-[#F4D571] via-amber-400 to-[#F4D571] rounded-r-2xl ml-auto self-stretch shrink-0 shadow-[0_0_15px_rgba(244,213,113,0.5)]" />
        </div>
      )}

      {/* 4. LIVE NEWS TICKER / CRAWLER (BOTTOM FULL WIDTH) */}
      {!startingSoon.visible && ticker.visible && (
        <div className="absolute bottom-0 inset-x-0 bg-[#050E1F]/95 backdrop-blur-xl border-t-2 border-[#F4D571]/70 flex items-center h-11 overflow-hidden shadow-[0_-5px_30px_rgba(0,0,0,0.85)]">
          
          {/* Static Left Badge */}
          <div className="bg-gradient-to-r from-rose-700 to-rose-600 text-white font-headline font-black text-xs md:text-sm px-5 h-full flex items-center gap-2 shrink-0 border-r border-rose-500/50 shadow-lg z-10">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
            <span>SDPS LIVE TICKER</span>
          </div>

          {/* Scrolling Ticker Text */}
          <div className="flex-1 overflow-hidden relative">
            <div className="whitespace-nowrap inline-block animate-marquee font-extrabold text-xs md:text-sm text-amber-200 tracking-wide pl-[100%]">
              <span className="mx-8">★ {ticker.text} ★</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
