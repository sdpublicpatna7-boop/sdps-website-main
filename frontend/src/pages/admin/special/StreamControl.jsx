import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { 
  Tv, Eye, EyeOff, Copy, ExternalLink, Sparkles, CheckCircle2, User, RefreshCw, Send, Radio, Award, Flag, Building, HelpCircle, Layers, ShieldCheck
} from "lucide-react";

const CHANNEL_NAME = "sdps_obs_stream_channel";

const PRESET_CARDS = [
  {
    category: "🏆 Executive Head Cabinet & Appointed Leaders",
    items: [
      {
        name: "Soumit Kumar",
        role: "School Captain",
        subtitle: "Executive Council 2026-27 • S.D. Public School",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
        badge: "SCHOOL CAPTAIN"
      },
      {
        name: "Aniket Raj",
        role: "Vice School Captain",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434282/ankush_anad_sjrqqt.png",
        badge: "VICE CAPTAIN"
      },
      {
        name: "Aadhya Jha",
        role: "Vice School Captain",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
        badge: "VICE CAPTAIN"
      },
      {
        name: "Vicky Singh",
        role: "Sports Skipper",
        subtitle: "Sports Head • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
        badge: "SPORTS SKIPPER"
      },
      {
        name: "Vijaya Laxmi",
        role: "Sports Skipper",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
        badge: "SPORTS SKIPPER"
      },
      {
        name: "Abhishek Kumar",
        role: "Cultural Head",
        subtitle: "Cultural Affairs • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434282/ankush_anad_sjrqqt.png",
        badge: "CULTURAL HEAD"
      },
      {
        name: "Anshika",
        role: "Cultural Head",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
        badge: "CULTURAL HEAD"
      },
      {
        name: "Harsh Raj Cesodia",
        role: "Discipline Head",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
        badge: "DISCIPLINE HEAD"
      },
      {
        name: "Simran Kumari",
        role: "Discipline Head",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
        badge: "DISCIPLINE HEAD"
      }
    ]
  },
  {
    category: "🚩 House Captains & Vice Captains",
    items: [
      {
        name: "Kumar Ashmit",
        role: "House Captain",
        subtitle: "Ashoka House (Yellow Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328179/asd_qophbe.png",
        badge: "ASHOKA CAPTAIN"
      },
      {
        name: "Sakshi Shree",
        role: "Vice Captain",
        subtitle: "Ashoka House (Yellow Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328179/sakd_yv4y3y.png",
        badge: "ASHOKA VICE CAPTAIN"
      },
      {
        name: "Manjari",
        role: "House Captain",
        subtitle: "Aryabhatta House (Red Army) • 2026-27",
        photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778295843/001_feweo3.jpg",
        badge: "ARYABHATTA CAPTAIN"
      },
      {
        name: "Bhavya Kumari",
        role: "Vice Captain",
        subtitle: "Aryabhatta House (Red Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328002/arya_VC_mz1rrs.png",
        badge: "ARYABHATTA VICE CAPTAIN"
      },
      {
        name: "Abhinav Kumar",
        role: "House Captain",
        subtitle: "Chanakya House (Blue Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328003/Chanakya_Captain_xui2ib.png",
        badge: "CHANAKYA CAPTAIN"
      },
      {
        name: "Prachi",
        role: "Vice Captain",
        subtitle: "Chanakya House (Blue Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328381/Prachi_zcygd3.png",
        badge: "CHANAKYA VICE CAPTAIN"
      },
      {
        name: "Priyanshu Singh",
        role: "House Captain",
        subtitle: "Gautam House (Green Army) • 2026-27",
        photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778296001/005_l9apgk.png",
        badge: "GAUTAM CAPTAIN"
      },
      {
        name: "Aradhya Gupta",
        role: "Vice Captain",
        subtitle: "Gautam House (Green Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328565/aradhya_ywacsd.png",
        badge: "GAUTAM VICE CAPTAIN"
      }
    ]
  },
  {
    category: "🎗️ School Prefects (2026-27 Cabinet)",
    items: [
      {
        name: "Adarsh Kumar",
        role: "School Prefect",
        subtitle: "Class XII • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Ankush Anand",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434282/ankush_anad_sjrqqt.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Daya Anand Singh",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Ishika Kumari",
        role: "School Prefect",
        subtitle: "Class XII • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Manjari",
        role: "School Prefect",
        subtitle: "Class XII • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778295843/001_feweo3.jpg",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Nitin Raj",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785503589/nitin_iadqvo.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Priyanshu Singh",
        role: "School Prefect",
        subtitle: "Class XII • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778296001/005_l9apgk.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Rudra Sinha",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434282/ankush_anad_sjrqqt.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Sakshi Pandit",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Sarthak Singh",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Shadan Ahmed Haidry",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434282/ankush_anad_sjrqqt.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Surya Singh",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Twinkle Sinha",
        role: "School Prefect",
        subtitle: "Class XI • S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
        badge: "SCHOOL PREFECT"
      }
    ]
  },
  {
    category: "🏢 School Management & Dignitaries",
    items: [
      {
        name: "Dr. BVatsal Sir",
        role: "Management",
        subtitle: "S.D. Public School, Patna",
        photo: "",
        badge: "MANAGEMENT"
      },
      {
        name: "Principal Ma'am",
        role: "Principal",
        subtitle: "S.D. Public School, Patna",
        photo: "",
        badge: "PRINCIPAL"
      }
    ]
  }
];

export default function StreamControl() {
  const [bc, setBc] = useState(null);

  // Overlay state
  const [lowerThirdVisible, setLowerThirdVisible] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [logoBugVisible, setLogoBugVisible] = useState(true);

  // Active inputs
  const [cardName, setCardName] = useState("Soumit Kumar");
  const [cardRole, setCardRole] = useState("School Captain");
  const [cardSubtitle, setCardSubtitle] = useState("Executive Council 2026-27 • S.D. Public School");
  const [cardPhoto, setCardPhoto] = useState("https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png");
  const [cardBadge, setCardBadge] = useState("SCHOOL CAPTAIN");

  const [bannerTitle, setBannerTitle] = useState("INVESTITURE CEREMONY 2026-27");
  const [bannerSubtitle, setBannerSubtitle] = useState("S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE STREAM");

  const [tickerText, setTickerText] = useState("Welcome Parents, Teachers and Students to the Investiture Ceremony 2026-27 | Oath Taking Ceremony in Progress | S.D. Public School, Patna");

  // Init BroadcastChannel
  useEffect(() => {
    let channel = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(CHANNEL_NAME);
        setBc(channel);
      }
    } catch (e) {
      console.warn("BroadcastChannel not supported", e);
    }
    return () => {
      if (channel) channel.close();
    };
  }, []);

  // Save to localStorage, BroadcastChannel & Backend API for OBS CEF
  const sendBroadcast = async (type, payload) => {
    if (bc) {
      bc.postMessage({ type, payload });
    }

    try {
      const saved = localStorage.getItem("sdps_stream_overlay_state");
      const currentState = saved ? JSON.parse(saved) : {};
      
      if (type === "LOWER_THIRD") currentState.lowerThird = { ...currentState.lowerThird, ...payload };
      if (type === "BANNER") currentState.banner = { ...currentState.banner, ...payload };
      if (type === "TICKER") currentState.ticker = { ...currentState.ticker, ...payload };
      if (type === "LOGO") currentState.logoBug = { ...currentState.logoBug, ...payload };

      localStorage.setItem("sdps_stream_overlay_state", JSON.stringify(currentState));
    } catch (e) {}

    try {
      await api.post("/stream-overlay/state", { type, payload });
    } catch (err) {
      console.warn("Stream state sync API error:", err);
    }

    toast.success(`Pushed live: ${payload?.name || type}`);
  };

  const overlayUrl = typeof window !== "undefined" ? `${window.location.origin}/stream-overlay` : "https://sdpublic.org/stream-overlay";

  const copyOverlayUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    toast.success("OBS Overlay URL copied to clipboard!");
  };

  const pushCard = (card) => {
    setCardName(card.name);
    setCardRole(card.role);
    setCardSubtitle(card.subtitle || "");
    setCardPhoto(card.photo || "");
    setCardBadge(card.badge || "SDPS");

    sendBroadcast("LOWER_THIRD", {
      visible: true,
      name: card.name,
      role: card.role,
      subtitle: card.subtitle,
      photo: card.photo,
      badge: card.badge,
      timestamp: Date.now()
    });
    setLowerThirdVisible(true);
  };

  const handleCustomPushCard = () => {
    sendBroadcast("LOWER_THIRD", {
      visible: true,
      name: cardName,
      role: cardRole,
      subtitle: cardSubtitle,
      photo: cardPhoto,
      badge: cardBadge,
      timestamp: Date.now()
    });
    setLowerThirdVisible(true);
  };

  const toggleLowerThird = () => {
    const next = !lowerThirdVisible;
    setLowerThirdVisible(next);
    sendBroadcast("LOWER_THIRD", { visible: next });
  };

  const toggleBanner = () => {
    const next = !bannerVisible;
    setBannerVisible(next);
    sendBroadcast("BANNER", { visible: next });
  };

  const toggleTicker = () => {
    const next = !tickerVisible;
    setTickerVisible(next);
    sendBroadcast("TICKER", { visible: next });
  };

  const toggleLogoBug = () => {
    const next = !logoBugVisible;
    setLogoBugVisible(next);
    sendBroadcast("LOGO", { visible: next });
  };

  const pushBanner = () => {
    sendBroadcast("BANNER", {
      visible: true,
      title: bannerTitle,
      subtitle: bannerSubtitle
    });
    setBannerVisible(true);
  };

  const pushTicker = () => {
    sendBroadcast("TICKER", {
      visible: true,
      text: tickerText
    });
    setTickerVisible(true);
  };

  const triggerConfetti = () => {
    sendBroadcast("CONFETTI", {});
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1E40] via-[#0E3B91] to-[#0B1E40] text-white p-6 rounded-3xl shadow-xl border border-[#F4D571]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-rose-500 animate-pulse" />
            <h1 className="text-xl md:text-2xl font-headline font-black tracking-wide">
              YouTube Live OBS Stream Controller
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Real-time seamless lower-third & overlay manager for OBS Studio, vMix, and Streamlabs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={copyOverlayUrl}
            className="px-4 py-2.5 bg-[#F4D571] hover:bg-amber-400 text-[#0B1E40] font-headline font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Copy className="w-4 h-4" /> Copy OBS Overlay URL
          </button>
          
          <a
            href="/stream-overlay"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Preview Overlay Window
          </a>
        </div>
      </div>

      {/* Master Toggle Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
          <Layers className="w-4 h-4 text-brand-orange" /> Scene Element Visibility Switches
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={toggleLowerThird}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition ${
              lowerThirdVisible ? "bg-emerald-500 border-emerald-600 text-white shadow-md" : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <span>Lower Third Card</span>
            {lowerThirdVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleBanner}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition ${
              bannerVisible ? "bg-emerald-500 border-emerald-600 text-white shadow-md" : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <span>Event Banner</span>
            {bannerVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleTicker}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition ${
              tickerVisible ? "bg-emerald-500 border-emerald-600 text-white shadow-md" : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <span>News Ticker</span>
            {tickerVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleLogoBug}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition ${
              logoBugVisible ? "bg-emerald-500 border-emerald-600 text-white shadow-md" : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <span>SDPS Logo Bug</span>
            {logoBugVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={triggerConfetti}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" /> Trigger Confetti
          </button>
        </div>
      </div>

      {/* Preset Designation Cards */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-orange" /> 1-Click Authentic Preset Designation Cards (2026-27)
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Click any card to show seamlessly on stream</span>
        </div>

        {PRESET_CARDS.map((cat, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-l-4 border-brand-orange pl-2">
              {cat.category}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {cat.items.map((card, cIdx) => (
                <div
                  key={cIdx}
                  onClick={() => pushCard(card)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-brand-orange rounded-2xl transition cursor-pointer flex items-center gap-3 group shadow-2xs"
                >
                  {card.photo ? (
                    <img src={card.photo} alt={card.name} className="w-12 h-12 rounded-xl object-cover border border-slate-300 bg-white shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 text-white font-black text-lg flex items-center justify-center shrink-0">
                      {card.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-extrabold text-brand-orange uppercase tracking-wider block truncate">
                      {card.badge || "PREFECT"}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 truncate group-hover:text-brand-orange transition">
                      {card.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate">{card.role}</p>
                  </div>

                  <Send className="w-4 h-4 text-slate-300 group-hover:text-brand-orange group-hover:translate-x-0.5 transition shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Custom Designation Card & Banner Editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Custom Lower Third Editor */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-blue-600" /> Custom Designation Card Editor
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Person Name</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold"
                placeholder="e.g. Nitin Raj"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Role / Designation Title</label>
              <input
                type="text"
                value={cardRole}
                onChange={(e) => setCardRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold"
                placeholder="e.g. School Prefect | Class XI"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Subtitle / Organization</label>
              <input
                type="text"
                value={cardSubtitle}
                onChange={(e) => setCardSubtitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
                placeholder="e.g. S.D. Public School, Patna"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Badge Label</label>
                <input
                  type="text"
                  value={cardBadge}
                  onChange={(e) => setCardBadge(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="e.g. INVESTITURE CEREMONY"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Photo Image URL</label>
                <input
                  type="text"
                  value={cardPhoto}
                  onChange={(e) => setCardPhoto(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="https://example.com/photo.png"
                />
              </div>
            </div>

            <button
              onClick={handleCustomPushCard}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Send className="w-4 h-4" /> Push Custom Card Live
            </button>
          </div>
        </div>

        {/* Event Banner & Ticker Editor */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <Tv className="w-4 h-4 text-emerald-600" /> Live Event Banner & Ticker Editor
          </h2>

          <div className="space-y-4">
            
            {/* Banner controls */}
            <div className="space-y-2 border-b border-slate-100 pb-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Top Event Banner Title</label>
              <input
                type="text"
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none font-bold"
                placeholder="e.g. INVESTITURE CEREMONY 2026-27"
              />
              <button
                onClick={pushBanner}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Push Event Banner Live
              </button>
            </div>

            {/* Ticker controls */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Bottom Scrolling Ticker Text</label>
              <textarea
                value={tickerText}
                onChange={(e) => setTickerText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none leading-relaxed"
                placeholder="Enter ticker announcements..."
              />
              <button
                onClick={pushTicker}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Push Ticker Text Live
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
