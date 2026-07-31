import { useEffect, useState, useRef } from "react";

const CHANNEL_NAME = "sdps_obs_stream_channel";
const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/+$/, "");

const DEFAULT_LEADER = {
  name: "Priyanshu Singh",
  role: "House Captain",
  subtitle: "Gautam House (Green Army) • 2026-27",
  photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778296001/005_l9apgk.png",
  houseLogo: "/images/houses/gautam.jpg",
  badge: "GAUTAM CAPTAIN"
};

const HOUSE_LOGOS = {
  ashoka: "/images/houses/ashoka.jpg",
  aryabhatta: "/images/houses/aryabhatta.jpg",
  chanakya: "/images/houses/chanakya.jpg",
  gautam: "/images/houses/gautam.jpg"
};

const ALL_PRELOAD_IMAGES = [
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/logo_aadarsh_clean.png",
  "/images/houses/ashoka.jpg",
  "/images/houses/aryabhatta.jpg",
  "/images/houses/chanakya.jpg",
  "/images/houses/gautam.jpg",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785328179/asd_qophbe.png",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785328179/sakd_yv4y3y.png",
  "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778295843/001_feweo3.jpg",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785328002/arya_VC_mz1rrs.png",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785328003/Chanakya_Captain_xui2ib.png",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785328381/Prachi_zcygd3.png",
  "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778296001/005_l9apgk.png",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785328565/aradhya_ywacsd.png",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785434282/ankush_anad_sjrqqt.png",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
  "https://res.cloudinary.com/drx3kb809/image/upload/v1785503589/nitin_iadqvo.png"
];

function getHouseLogo(lowerThird) {
  if (lowerThird?.houseLogo) return lowerThird.houseLogo;
  const combined = ((lowerThird?.badge || "") + " " + (lowerThird?.subtitle || "") + " " + (lowerThird?.role || "")).toLowerCase();
  if (combined.includes("ashoka")) return HOUSE_LOGOS.ashoka;
  if (combined.includes("aryabhatta")) return HOUSE_LOGOS.aryabhatta;
  if (combined.includes("chanakya")) return HOUSE_LOGOS.chanakya;
  if (combined.includes("gautam")) return HOUSE_LOGOS.gautam;
  return null;
}

// 8:00 AM Countdown Hook
function use8AMCountdown(targetTimeString = "08:00") {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const target = new Date();
      
      const [h, m] = (targetTimeString || "08:00").split(":").map(Number);
      target.setHours(h || 8, m || 0, 0, 0);

      if (now > target) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, expired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetTimeString]);

  return timeLeft;
}

export default function StreamOverlay() {
  const [lowerThird, setLowerThird] = useState({
    visible: true,
    name: DEFAULT_LEADER.name,
    role: DEFAULT_LEADER.role,
    subtitle: DEFAULT_LEADER.subtitle,
    photo: DEFAULT_LEADER.photo,
    houseLogo: DEFAULT_LEADER.houseLogo,
    badge: DEFAULT_LEADER.badge,
    performers: [],
    timestamp: Date.now()
  });

  const [banner, setBanner] = useState({
    visible: true,
    title: "INVESTITURE CEREMONY 2026-27",
    subtitle: "S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE STREAM"
  });

  const [ticker, setTicker] = useState({
    visible: false,
    text: "Welcome Parents, Teachers and Students to the Investiture Ceremony 2026-27 | Oath Taking Ceremony in Progress | S.D. Public School, Patna"
  });

  const [logoBug, setLogoBug] = useState({
    visible: true,
    showLive: true
  });

  const [startingSoon, setStartingSoon] = useState({
    visible: false,
    showCountdown: true,
    title: "INVESTITURE CEREMONY 2026-27",
    subtitle: "S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE BROADCAST",
    message: "STREAM STARTING SOON",
    timerText: "Please stay tuned. The ceremony will begin shortly.",
    targetTime: "08:00"
  });

  const countdown = use8AMCountdown(startingSoon.targetTime || "08:00");
  const lastConfettiTriggerRef = useRef(0);
  const canvasRef = useRef(null);

  // Background Image Standby Preloader: Preload all candidate & house images into RAM cache
  useEffect(() => {
    ALL_PRELOAD_IMAGES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Trigger HTML5 Canvas Confetti Burst Animation
  const fireCanvasConfetti = () => {
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
      }
    };

    requestAnimationFrame(animate);
  };

  // Process incoming state updates smoothly without redundant re-renders
  const processState = (state) => {
    if (!state) return;

    if (state.lowerThird) {
      setLowerThird(prev => {
        const lt = state.lowerThird;
        const incomingPerfStr = Array.isArray(lt.performers) ? lt.performers.join(",") : "";
        const prevPerfStr = Array.isArray(prev.performers) ? prev.performers.join(",") : "";

        // Automatically dismiss Pre-Show Starting Soon slate whenever a candidate card is pushed live!
        if (lt.visible) {
          setStartingSoon(ss => ({ ...ss, visible: false }));
        }

        if (
          prev.name !== lt.name ||
          prev.role !== lt.role ||
          prev.subtitle !== lt.subtitle ||
          prev.photo !== lt.photo ||
          prev.houseLogo !== lt.houseLogo ||
          prev.badge !== lt.badge ||
          prev.visible !== lt.visible ||
          prevPerfStr !== incomingPerfStr
        ) {
          return {
            name: lt.name,
            role: lt.role,
            subtitle: lt.subtitle,
            photo: lt.photo,
            houseLogo: lt.houseLogo,
            badge: lt.badge,
            performers: lt.performers || [],
            visible: lt.visible,
            timestamp: lt.timestamp || Date.now()
          };
        }
        return prev;
      });
    }

    if (state.banner) {
      setBanner(prev => {
        const b = state.banner;
        if (prev.visible !== b.visible || prev.title !== b.title || prev.subtitle !== b.subtitle) {
          return { visible: b.visible, title: b.title, subtitle: b.subtitle };
        }
        return prev;
      });
    }

    if (state.ticker) {
      setTicker(prev => {
        const t = state.ticker;
        if (prev.visible !== t.visible || prev.text !== t.text) {
          return { visible: t.visible, text: t.text };
        }
        return prev;
      });
    }

    if (state.logoBug) {
      setLogoBug(prev => {
        const l = state.logoBug;
        if (prev.visible !== l.visible || prev.showLive !== l.showLive) {
          return { visible: l.visible, showLive: l.showLive };
        }
        return prev;
      });
    }

    if (state.startingSoon) {
      setStartingSoon(prev => {
        const ss = state.startingSoon;
        if (
          prev.visible !== ss.visible ||
          prev.showCountdown !== ss.showCountdown ||
          prev.title !== ss.title ||
          prev.subtitle !== ss.subtitle ||
          prev.message !== ss.message ||
          prev.timerText !== ss.timerText ||
          prev.targetTime !== ss.targetTime
        ) {
          return {
            visible: ss.visible,
            showCountdown: ss.showCountdown !== false,
            title: ss.title,
            subtitle: ss.subtitle,
            message: ss.message,
            timerText: ss.timerText,
            targetTime: ss.targetTime || "08:00"
          };
        }
        return prev;
      });
    }

    if (state.confetti_trigger_id && state.confetti_trigger_id > lastConfettiTriggerRef.current) {
      lastConfettiTriggerRef.current = state.confetti_trigger_id;
      fireCanvasConfetti();
    }
  };

  // Connect Real-Time SSE Push Stream & BroadcastChannel Listener
  useEffect(() => {
    // 1. BroadcastChannel Listener (For same-browser tab changes)
    let bc = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (e) => {
          if (e.data?.type === "CONFETTI") {
            fireCanvasConfetti();
          } else if (e.data?.type === "LOWER_THIRD") {
            processState({ lowerThird: e.data.payload });
          } else if (e.data?.type === "BANNER") {
            processState({ banner: e.data.payload });
          } else if (e.data?.type === "TICKER") {
            processState({ ticker: e.data.payload });
          } else if (e.data?.type === "LOGO") {
            processState({ logoBug: e.data.payload });
          } else if (e.data?.type === "STARTING_SOON") {
            processState({ startingSoon: e.data.payload });
          }
        };
      }
    } catch (err) {}

    // 2. Server-Sent Events (SSE) Push Connection (INSTANT < 5ms PUSH FROM BACKEND)
    let sseSource = null;
    let sseReconnectTimer = null;

    const connectSSE = () => {
      try {
        const sseUrl = `${BACKEND_URL || ""}/api/stream-overlay/sse`;
        sseSource = new EventSource(sseUrl);

        sseSource.onmessage = (event) => {
          try {
            if (event.data && event.data !== "heartbeat") {
              const parsed = JSON.parse(event.data);
              processState(parsed);
            }
          } catch (e) {}
        };

        sseSource.onerror = () => {
          if (sseSource) sseSource.close();
          sseReconnectTimer = setTimeout(connectSSE, 3000);
        };
      } catch (e) {
        sseReconnectTimer = setTimeout(connectSSE, 3000);
      }
    };

    connectSSE();

    // 3. LocalStorage fallback & storage event listener
    const handleStorageChange = (e) => {
      if (e.key === "sdps_stream_overlay_state" && e.newValue) {
        try {
          processState(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const checkLocalStorage = () => {
      try {
        const saved = localStorage.getItem("sdps_stream_overlay_state");
        if (saved) processState(JSON.parse(saved));
      } catch (e) {}
    };
    checkLocalStorage();

    return () => {
      if (bc) bc.close();
      if (sseSource) sseSource.close();
      if (sseReconnectTimer) clearTimeout(sseReconnectTimer);
      window.removeEventListener("storage", handleStorageChange);
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

  const currentHouseLogo = getHouseLogo(lowerThird);

  // Check if card is a Group / Music / Dance Performance Card OR Card without Photo
  const isGroupOrNoPhoto = (lowerThird.performers && lowerThird.performers.length > 0) || (!lowerThird.photo && !currentHouseLogo);

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden relative select-none pointer-events-none font-sans">
      
      {/* HTML5 CONFETTI CANVAS */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-50"
      />

      {/* FULL-SCREEN PRE-SHOW SLATE WITH DUAL MUTUALLY EXCLUSIVE MODES */}
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
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full border-2 border-dashed border-[#F4D571]/40 animate-spin" style={{ animationDuration: '20s' }} />
            <div className="absolute -inset-8 rounded-full border border-amber-300/20 animate-spin" style={{ animationDuration: '35s', animationDirection: 'reverse' }} />

            <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-[#0B1E40]/90 border-2 border-[#F4D571] p-4 shadow-[0_0_60px_rgba(244,213,113,0.4)] flex items-center justify-center backdrop-blur-2xl relative z-10">
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
          <div className="text-center space-y-2 max-w-4xl relative z-10">
            <h3 className="text-xs md:text-sm font-black text-[#F4D571] tracking-[0.35em] uppercase drop-shadow">
              {startingSoon.subtitle || "S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE BROADCAST"}
            </h3>

            <h1 className="font-headline font-black text-3xl md:text-5xl lg:text-6xl tracking-wide uppercase drop-shadow-[0_10px_30px_rgba(0,0,0,0.9)] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
              {startingSoon.title || "INVESTITURE CEREMONY 2026-27"}
            </h1>
          </div>

          {/* MUTUALLY EXCLUSIVE PRE-SHOW CONTENT */}
          {startingSoon.showCountdown !== false ? (
            /* MODE 1: WITH TIMER - Renders ONLY the 8:00 AM Live Countdown Clock */
            <div className="mt-8 flex flex-col items-center gap-3 relative z-10 animate-in fade-in-0 zoom-in-95 duration-500">
              <div className="flex items-center gap-2 text-xs font-black text-amber-300 tracking-[0.3em] uppercase bg-amber-500/20 px-5 py-1.5 rounded-full border border-amber-400/50 shadow-md">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>INVESTITURE CEREMONY 8:00 AM COUNTDOWN</span>
              </div>

              <div className="flex items-center gap-4 sm:gap-6 mt-1">
                {/* HOURS CARD */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 bg-gradient-to-b from-[#0E3B91] via-[#0B1E40] to-[#050E1F] border-2 border-[#F4D571] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="font-headline font-black text-4xl sm:text-5xl text-white tracking-tight drop-shadow-lg">
                      {String(countdown.hours).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest mt-2">HOURS</span>
                </div>

                <span className="font-headline font-black text-3xl sm:text-4xl text-[#F4D571] animate-pulse -mt-6">:</span>

                {/* MINUTES CARD */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 bg-gradient-to-b from-[#0E3B91] via-[#0B1E40] to-[#050E1F] border-2 border-[#F4D571] rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="font-headline font-black text-4xl sm:text-5xl text-[#F4D571] tracking-tight drop-shadow-lg">
                      {String(countdown.minutes).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-slate-300 uppercase tracking-widest mt-2">MINUTES</span>
                </div>

                <span className="font-headline font-black text-3xl sm:text-4xl text-[#F4D571] animate-pulse -mt-6">:</span>

                {/* SECONDS CARD */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-24 sm:w-24 sm:h-28 bg-gradient-to-b from-[#0E3B91] via-[#0B1E40] to-[#050E1F] border-2 border-rose-500 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] flex items-center justify-center relative overflow-hidden group animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-300/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <span className="font-headline font-black text-4xl sm:text-5xl text-rose-400 tracking-tight drop-shadow-lg">
                      {String(countdown.seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-rose-300 uppercase tracking-widest mt-2">SECONDS</span>
                </div>
              </div>
            </div>
          ) : (
            /* MODE 2: WITHOUT TIMER - Renders ONLY the Pulsing "STREAM STARTING SOON" Live Status Box */
            <div className="mt-10 px-12 py-4 bg-gradient-to-r from-[#0E3B91]/95 via-[#0B1E40]/95 to-[#0E3B91]/95 backdrop-blur-2xl border-2 border-[#F4D571] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex items-center gap-4 relative z-10 animate-in fade-in-0 zoom-in-95 duration-500">
              <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="font-headline font-black text-2xl sm:text-3xl text-white tracking-widest uppercase">
                {startingSoon.message || "STREAM STARTING SOON"}
              </span>
              <div className="w-4 h-4 rounded-full bg-rose-500 animate-ping shrink-0" />
            </div>
          )}

          {/* Timer Note */}
          {startingSoon.timerText && (
            <p className="mt-6 text-sm sm:text-base font-bold text-amber-200 tracking-wider opacity-90 max-w-2xl text-center relative z-10">
              {startingSoon.timerText}
            </p>
          )}

          {/* Bottom Footer Info Bar */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-8 text-xs text-slate-300 font-bold tracking-widest uppercase border-t border-white/15 pt-4 px-16 z-10">
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

      {/* 3. DYNAMIC HYBRID LOWER THIRD DESIGN */}
      {!startingSoon.visible && lowerThird.visible && (
        isGroupOrNoPhoto ? (
          /* OPTION A: STUNNING CENTER-ALIGNED GRADIENT CARD FOR DANCE/MUSIC GROUPS & PERFORMER LISTS (NO EMPTY PHOTO BOX) */
          <div
            key={`${lowerThird.name}-${lowerThird.role}-${lowerThird.timestamp}`}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center text-center bg-gradient-to-r from-[#040C1A]/95 via-[#0E3B91]/98 to-[#040C1A]/95 backdrop-blur-2xl border-2 border-[#F4D571] rounded-[2.5rem] py-5 px-10 min-w-[500px] max-w-4xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-in fade-in-0 slide-in-from-bottom-12 zoom-in-95 duration-500 ease-out overflow-hidden"
          >
            {/* Gold Shimmer Beam Wipe Effect across Card */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent -translate-x-full animate-in slide-in-from-left-full duration-1000 pointer-events-none z-30" />

            {/* Top Centered Badge */}
            {lowerThird.badge && (
              <span 
                key={lowerThird.badge}
                className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-amber-500/25 border border-amber-400/60 text-[#F4D571] font-black text-xs tracking-widest uppercase mb-2 animate-in fade-in-0 zoom-in-90 duration-300 shadow-md"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {lowerThird.badge}
              </span>
            )}

            {/* Group / Song / Performance Full Title */}
            <h2 
              key={lowerThird.name}
              className="font-headline font-black text-3xl md:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 tracking-tight truncate drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
            >
              {lowerThird.name}
            </h2>

            {/* Role & Designation OR Song Name */}
            {lowerThird.role && (
              <div 
                key={lowerThird.role}
                className="mt-1 animate-in fade-in-0 slide-in-from-bottom-3 duration-400"
              >
                <span className="font-extrabold text-base md:text-lg text-amber-300 uppercase tracking-wide">
                  {lowerThird.role}
                </span>
              </div>
            )}

            {/* Subtitle / Organization */}
            {lowerThird.subtitle && (
              <p className="text-xs md:text-sm font-semibold text-slate-200 truncate mt-1 opacity-95">
                {lowerThird.subtitle.replace(/^Class\s+[IVXLCDM0-9]+\s*•\s*/i, "").trim()}
              </p>
            )}

            {/* Centered Multi-Participant / Performer List Badges */}
            {lowerThird.performers && lowerThird.performers.length > 0 && (
              <div className="flex flex-col items-center gap-1.5 mt-3.5 animate-in fade-in-0 zoom-in-95 duration-500">
                <span className="text-[11px] font-black text-[#F4D571] uppercase tracking-widest">
                  PERFORMERS & PARTICIPANTS:
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl">
                  {lowerThird.performers.map((performer, pIdx) => (
                    <span
                      key={pIdx}
                      className="px-3.5 py-1 rounded-xl bg-gradient-to-r from-white/15 to-white/10 border border-[#F4D571]/60 text-[#F4D571] font-extrabold text-xs shadow-md backdrop-blur-md"
                    >
                      {performer}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* OPTION B: STANDARD INDIVIDUAL CANDIDATE CARD WITH PHOTO & HOUSE CREST (LEFT-ALIGNED) */
          <div
            key={`${lowerThird.name}-${lowerThird.role}-${lowerThird.timestamp}`}
            className="absolute bottom-16 left-10 flex items-stretch bg-gradient-to-r from-[#050E1F]/95 via-[#0E3B91]/95 to-[#071329]/95 backdrop-blur-2xl border-2 border-[#F4D571] rounded-[2rem] p-5 max-w-2xl shadow-[0_25px_60px_rgba(0,0,0,0.95)] animate-in fade-in-0 slide-in-from-bottom-12 zoom-in-95 duration-500 ease-out overflow-hidden"
          >
            {/* Gold Shimmer Beam Wipe Effect across Card */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/35 to-transparent -translate-x-full animate-in slide-in-from-left-full duration-1000 pointer-events-none z-30" />

            {/* Candidate Photo Avatar (112px x 112px) */}
            {lowerThird.photo && (
              <div className="relative shrink-0 mr-4">
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
            )}

            {/* Name & Role Text Block */}
            <div className="flex flex-col justify-center min-w-0 pr-4 flex-1">
              
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

              {/* Candidate / Group Full Title */}
              <h2 
                key={lowerThird.name}
                className="font-headline font-black text-2xl md:text-3xl text-white tracking-tight truncate drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] animate-in fade-in-0 slide-in-from-left-6 duration-300"
              >
                {lowerThird.name}
              </h2>

              {/* Role & Designation OR Song Name */}
              <div 
                key={lowerThird.role}
                className="flex items-center gap-2 mt-0.5 animate-in fade-in-0 slide-in-from-left-4 duration-400"
              >
                <span className="font-extrabold text-sm md:text-base text-amber-300 uppercase tracking-wide truncate">
                  {lowerThird.role}
                </span>
              </div>

              {/* Subtitle / Organization */}
              {lowerThird.subtitle && (
                <p className="text-xs md:text-sm font-semibold text-slate-200 truncate mt-0.5 opacity-95">
                  {lowerThird.subtitle.replace(/^Class\s+[IVXLCDM0-9]+\s*•\s*/i, "").trim()}
                </p>
              )}

            </div>

            {/* Official House Emblem Crest Badge (LAST OF CARD) */}
            {currentHouseLogo && (
              <div className="relative shrink-0 ml-auto mr-4 self-center">
                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-[#F4D571] p-1.5 shadow-[0_0_20px_rgba(244,213,113,0.4)] flex items-center justify-center animate-in zoom-in-75 duration-300">
                  <img
                    src={currentHouseLogo}
                    alt="House Crest"
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Right Gold Accent Stripe */}
            <div className="w-2 bg-gradient-to-b from-[#F4D571] via-amber-400 to-[#F4D571] rounded-r-2xl ml-auto self-stretch shrink-0 shadow-[0_0_15px_rgba(244,213,113,0.5)]" />
          </div>
        )
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
