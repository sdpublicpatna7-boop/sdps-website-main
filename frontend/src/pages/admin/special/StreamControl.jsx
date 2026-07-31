import { useState, useEffect } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { 
  Tv, Eye, EyeOff, Copy, ExternalLink, Sparkles, CheckCircle2, User, RefreshCw, Send, Radio, Award, Flag, Building, HelpCircle, Layers, ShieldCheck, PlayCircle, Clock, Plus, Trash2, Save, Music, Users
} from "lucide-react";

const CHANNEL_NAME = "sdps_obs_stream_channel";

const BASE_PRESET_CARDS = [
  {
    category: "🏆 Executive Head Cabinet & Appointed Leaders",
    items: [
      {
        name: "Soumit Kumar",
        role: "School Captain",
        subtitle: "Executive Council 2026-27 • S.D. Public School",
        photo: "",
        badge: "SCHOOL CAPTAIN"
      },
      {
        name: "Aniket Raj",
        role: "Vice School Captain",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "",
        badge: "VICE CAPTAIN"
      },
      {
        name: "Aadhya Jha",
        role: "Vice School Captain",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "",
        badge: "VICE CAPTAIN"
      },
      {
        name: "Vicky Singh",
        role: "Sports Skipper",
        subtitle: "Sports Head • S.D. Public School, Patna",
        photo: "",
        badge: "SPORTS SKIPPER"
      },
      {
        name: "Vijaya Laxmi",
        role: "Sports Skipper",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "",
        badge: "SPORTS SKIPPER"
      },
      {
        name: "Abhishek Kumar",
        role: "Cultural Head",
        subtitle: "Cultural Affairs • S.D. Public School, Patna",
        photo: "",
        badge: "CULTURAL HEAD"
      },
      {
        name: "Anshika",
        role: "Cultural Head",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "",
        badge: "CULTURAL HEAD"
      },
      {
        name: "Harsh Raj Cesodia",
        role: "Discipline Head",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "",
        badge: "DISCIPLINE HEAD"
      },
      {
        name: "Simran Kumari",
        role: "Discipline Head",
        subtitle: "Appointed by School Management • 2026-27",
        photo: "",
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
        houseLogo: "/images/houses/ashoka.jpg",
        badge: "ASHOKA CAPTAIN"
      },
      {
        name: "Sakshi Shree",
        role: "Vice Captain",
        subtitle: "Ashoka House (Yellow Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328179/sakd_yv4y3y.png",
        houseLogo: "/images/houses/ashoka.jpg",
        badge: "ASHOKA VICE CAPTAIN"
      },
      {
        name: "Manjari",
        role: "House Captain",
        subtitle: "Aryabhatta House (Red Army) • 2026-27",
        photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778295843/001_feweo3.jpg",
        houseLogo: "/images/houses/aryabhatta.jpg",
        badge: "ARYABHATTA CAPTAIN"
      },
      {
        name: "Bhavya Kumari",
        role: "Vice Captain",
        subtitle: "Aryabhatta House (Red Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328002/arya_VC_mz1rrs.png",
        houseLogo: "/images/houses/aryabhatta.jpg",
        badge: "ARYABHATTA VICE CAPTAIN"
      },
      {
        name: "Abhinav Kumar",
        role: "House Captain",
        subtitle: "Chanakya House (Blue Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328003/Chanakya_Captain_xui2ib.png",
        houseLogo: "/images/houses/chanakya.jpg",
        badge: "CHANAKYA CAPTAIN"
      },
      {
        name: "Prachi",
        role: "Vice Captain",
        subtitle: "Chanakya House (Blue Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328381/Prachi_zcygd3.png",
        houseLogo: "/images/houses/chanakya.jpg",
        badge: "CHANAKYA VICE CAPTAIN"
      },
      {
        name: "Priyanshu Singh",
        role: "House Captain",
        subtitle: "Gautam House (Green Army) • 2026-27",
        photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778296001/005_l9apgk.png",
        houseLogo: "/images/houses/gautam.jpg",
        badge: "GAUTAM CAPTAIN"
      },
      {
        name: "Aradhya Gupta",
        role: "Vice Captain",
        subtitle: "Gautam House (Green Army) • 2026-27",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785328565/aradhya_ywacsd.png",
        houseLogo: "/images/houses/gautam.jpg",
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
        subtitle: "S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434108/aadarsh_nyhpfq.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Ankush Anand",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434282/ankush_anad_sjrqqt.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Daya Anand Singh",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Ishika Kumari",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785434417/ishika_spfj5r.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Manjari",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778295843/001_feweo3.jpg",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Nitin Raj",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drx3kb809/image/upload/v1785503589/nitin_iadqvo.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Priyanshu Singh",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "https://res.cloudinary.com/drzb164ge/image/upload/q_auto/f_auto/v1778296001/005_l9apgk.png",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Rudra Sinha",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Sakshi Pandit",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Sarthak Singh",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Shadan Ahmed Haidry",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Surya Singh",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "",
        badge: "SCHOOL PREFECT"
      },
      {
        name: "Twinkle Sinha",
        role: "School Prefect",
        subtitle: "S.D. Public School, Patna",
        photo: "",
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
  const [presetCards, setPresetCards] = useState(BASE_PRESET_CARDS);

  // Persistent Custom Saved Preset Library
  const [savedCustomCards, setSavedCustomCards] = useState(() => {
    try {
      const saved = localStorage.getItem("sdps_custom_stream_cards");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Manual Card Maker Inputs (Supports Persons, Music Groups & Multi-Performers)
  const [cardName, setCardName] = useState("Soumit Kumar");
  const [cardRole, setCardRole] = useState("School Captain");
  const [cardSubtitle, setCardSubtitle] = useState("Executive Council 2026-27 • S.D. Public School");
  const [cardPhoto, setCardPhoto] = useState("");
  const [cardBadge, setCardBadge] = useState("SCHOOL CAPTAIN");
  const [cardPerformers, setCardPerformers] = useState(""); // Comma separated performers list

  // Overlay Visibility State
  const [lowerThirdVisible, setLowerThirdVisible] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);
  const [tickerVisible, setTickerVisible] = useState(true);
  const [logoBugVisible, setLogoBugVisible] = useState(true);
  const [startingSoonVisible, setStartingSoonVisible] = useState(false);
  const [soonShowTimer, setSoonShowTimer] = useState(true);

  const [bannerTitle, setBannerTitle] = useState("INVESTITURE CEREMONY 2026-27");
  const [bannerSubtitle, setBannerSubtitle] = useState("S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE STREAM");
  const [tickerText, setTickerText] = useState("Welcome Parents, Teachers and Students to the Investiture Ceremony 2026-27 | Oath Taking Ceremony in Progress | S.D. Public School, Patna");

  // Full screen starting soon inputs
  const [soonTitle, setSoonTitle] = useState("INVESTITURE CEREMONY 2026-27");
  const [soonSubtitle, setSoonSubtitle] = useState("S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE BROADCAST");
  const [soonMessage, setSoonMessage] = useState("STREAM STARTING SOON");
  const [soonNote, setSoonNote] = useState("Please stay tuned. The ceremony will begin shortly.");
  const [soonCountdownTarget, setSoonCountdownTarget] = useState("08:00"); // 8:00 AM

  // Suppress auto-logout while actively operating stream control
  useEffect(() => {
    window.__sdps_suppress_logout = true;
    return () => {
      window.__sdps_suppress_logout = false;
    };
  }, []);

  // Sync state from localStorage & API on mount
  useEffect(() => {
    const syncCurrentState = async () => {
      try {
        const saved = localStorage.getItem("sdps_stream_overlay_state");
        let parsed = saved ? JSON.parse(saved) : null;

        if (!parsed) {
          const res = await api.get("/stream-overlay/state").catch(() => ({ data: {} }));
          parsed = res.data || {};
        }

        if (parsed?.startingSoon) {
          setStartingSoonVisible(!!parsed.startingSoon.visible);
          setSoonShowTimer(parsed.startingSoon.showCountdown !== false);
        }
        if (parsed?.lowerThird) setLowerThirdVisible(!!parsed.lowerThird.visible);
        if (parsed?.banner) setBannerVisible(!!parsed.banner.visible);
        if (parsed?.ticker) setTickerVisible(!!parsed.ticker.visible);
        if (parsed?.logoBug) setLogoBugVisible(!!parsed.logoBug.visible);
      } catch (err) {}
    };

    syncCurrentState();
  }, []);

  // Fetch live photos from database for candidates if available
  useEffect(() => {
    const photoMap = {};

    const loadDbPhotos = async () => {
      try {
        const [elecRes, profRes] = await Promise.all([
          api.get("/elections/public-results").catch(() => ({ data: {} })),
          api.get("/council/profiles").catch(() => ({ data: [] }))
        ]);

        const elecData = elecRes.data || {};
        const posts = elecData.posts || [];
        (posts || []).forEach(post => {
          const candidates = elecData.by_post?.[post.key] || [];
          candidates.forEach(c => {
            if (c?.name && c?.photo) {
              photoMap[c.name.toLowerCase().trim()] = c.photo;
            }
          });
        });

        const profiles = profRes.data || [];
        (profiles || []).forEach(p => {
          if (p?.name && p?.photo_url) {
            photoMap[p.name.toLowerCase().trim()] = p.photo_url;
          }
        });

        if (Object.keys(photoMap).length > 0) {
          setPresetCards(prev => prev.map(cat => ({
            ...cat,
            items: cat.items.map(item => {
              const dbPhoto = photoMap[item.name.toLowerCase().trim()];
              return dbPhoto ? { ...item, photo: dbPhoto } : item;
            })
          })));
        }
      } catch (err) {}
    };

    loadDbPhotos();
  }, []);

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
      if (type === "STARTING_SOON") currentState.startingSoon = { ...currentState.startingSoon, ...payload };

      localStorage.setItem("sdps_stream_overlay_state", JSON.stringify(currentState));
    } catch (e) {}

    try {
      await api.post(`/stream-overlay/state?t=${Date.now()}`, { type, payload });
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
    setCardPerformers(card.performers ? card.performers.join(", ") : "");

    // Automatically hide Pre-Show Starting Soon Slate when candidate card is clicked
    setStartingSoonVisible(false);
    sendBroadcast("STARTING_SOON", { visible: false });

    sendBroadcast("LOWER_THIRD", {
      visible: true,
      name: card.name,
      role: card.role,
      subtitle: card.subtitle,
      photo: card.photo,
      houseLogo: card.houseLogo || "",
      badge: card.badge,
      performers: card.performers || [],
      timestamp: Date.now()
    });
    setLowerThirdVisible(true);
  };

  const handleCustomPushCard = () => {
    const performersList = cardPerformers ? cardPerformers.split(",").map(s => s.trim()).filter(Boolean) : [];

    // Automatically hide Pre-Show Starting Soon Slate when custom card is pushed
    setStartingSoonVisible(false);
    sendBroadcast("STARTING_SOON", { visible: false });

    sendBroadcast("LOWER_THIRD", {
      visible: true,
      name: cardName,
      role: cardRole,
      subtitle: cardSubtitle,
      photo: cardPhoto,
      badge: cardBadge,
      performers: performersList,
      timestamp: Date.now()
    });
    setLowerThirdVisible(true);
  };

  const saveCurrentCardToPresetLibrary = () => {
    if (!cardName.trim()) {
      toast.error("Please enter a Person Name or Group/Music Title");
      return;
    }

    const performersList = cardPerformers ? cardPerformers.split(",").map(s => s.trim()).filter(Boolean) : [];
    const newCard = {
      id: "custom-" + Date.now(),
      name: cardName.trim(),
      role: cardRole.trim(),
      subtitle: cardSubtitle.trim() || "S.D. Public School, Patna",
      badge: cardBadge.trim() || "SDPS",
      photo: cardPhoto.trim(),
      performers: performersList
    };

    const updated = [newCard, ...savedCustomCards];
    setSavedCustomCards(updated);
    try {
      localStorage.setItem("sdps_custom_stream_cards", JSON.stringify(updated));
    } catch (e) {}

    toast.success("Saved to your Custom Presets Library!");
  };

  const deleteCustomCard = (id, e) => {
    e.stopPropagation();
    const updated = savedCustomCards.filter(c => c.id !== id);
    setSavedCustomCards(updated);
    try {
      localStorage.setItem("sdps_custom_stream_cards", JSON.stringify(updated));
    } catch (e) {}
    toast.success("Custom card deleted");
  };

  const createNewBlankCardForm = () => {
    setCardName("");
    setCardRole("");
    setCardSubtitle("S.D. Public School, Patna");
    setCardPhoto("");
    setCardBadge("SDPS");
    setCardPerformers("");
    toast.info("Cleared inputs! Enter your new card data below.");
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

  const pushStartingSoonWithTimer = () => {
    sendBroadcast("STARTING_SOON", {
      visible: true,
      showCountdown: true,
      title: soonTitle,
      subtitle: soonSubtitle,
      message: soonMessage,
      timerText: soonNote,
      targetTime: soonCountdownTarget
    });
    setStartingSoonVisible(true);
    setSoonShowTimer(true);
  };

  const pushStartingSoonWithoutTimer = () => {
    sendBroadcast("STARTING_SOON", {
      visible: true,
      showCountdown: false,
      title: soonTitle,
      subtitle: soonSubtitle,
      message: soonMessage,
      timerText: soonNote,
      targetTime: soonCountdownTarget
    });
    setStartingSoonVisible(true);
    setSoonShowTimer(false);
  };

  const hideStartingSoon = () => {
    sendBroadcast("STARTING_SOON", { visible: false });
    setStartingSoonVisible(false);
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

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <button
            onClick={pushStartingSoonWithTimer}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition cursor-pointer ${
              startingSoonVisible && soonShowTimer 
                ? "bg-[#F4D571] border-amber-400 text-[#0B1E40] shadow-md ring-2 ring-amber-300 animate-pulse font-black" 
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="truncate">Slate (With 8AM Timer)</span>
            <Clock className="w-4 h-4" />
          </button>

          <button
            onClick={pushStartingSoonWithoutTimer}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition cursor-pointer ${
              startingSoonVisible && !soonShowTimer 
                ? "bg-blue-600 border-blue-700 text-white shadow-md ring-2 ring-blue-400 animate-pulse font-black" 
                : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <span className="truncate">Slate (No Timer)</span>
            <PlayCircle className="w-4 h-4" />
          </button>

          <button
            onClick={toggleLowerThird}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition cursor-pointer ${
              lowerThirdVisible ? "bg-emerald-500 border-emerald-600 text-white shadow-md" : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <span>Lower Third</span>
            {lowerThirdVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleBanner}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition cursor-pointer ${
              bannerVisible ? "bg-emerald-500 border-emerald-600 text-white shadow-md" : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <span>Event Banner</span>
            {bannerVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleTicker}
            className={`p-3 rounded-2xl border font-bold text-xs flex items-center justify-between transition cursor-pointer ${
              tickerVisible ? "bg-emerald-500 border-emerald-600 text-white shadow-md" : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <span>News Ticker</span>
            {tickerVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          <button
            onClick={triggerConfetti}
            className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" /> Confetti Burst
          </button>
        </div>
      </div>

      {/* Full-Screen "Starting Soon" Pre-Show Slate & 8:00 AM Countdown Editor */}
      <div className="bg-gradient-to-br from-[#0B1E40] via-[#0E3B91] to-[#0B1E40] text-white p-6 rounded-3xl border-2 border-[#F4D571]/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#F4D571] animate-spin" style={{ animationDuration: '10s' }} />
            <h2 className="text-sm font-headline font-black uppercase tracking-wider text-[#F4D571]">
              Pre-Show "Starting Soon" Slate Controller (With / Without Countdown)
            </h2>
          </div>
          {startingSoonVisible && (
            <button
              onClick={hideStartingSoon}
              className="px-4 py-1.5 rounded-xl font-bold text-xs bg-rose-600 text-white hover:bg-rose-700 shadow transition flex items-center gap-2 cursor-pointer"
            >
              🛑 Hide Pre-Show Slate
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-800">
          <div>
            <label className="text-[10px] font-bold text-slate-300 uppercase">Pre-Show Main Header Title</label>
            <input
              type="text"
              value={soonTitle}
              onChange={(e) => setSoonTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-white/20 bg-white font-bold"
              placeholder="e.g. INVESTITURE CEREMONY 2026-27"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-300 uppercase">Pre-Show Subtitle / School Name</label>
            <input
              type="text"
              value={soonSubtitle}
              onChange={(e) => setSoonSubtitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-white/20 bg-white"
              placeholder="e.g. S.D. PUBLIC SCHOOL, PATNA • OFFICIAL LIVE BROADCAST"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-300 uppercase">8:00 AM Countdown Target Time</label>
            <input
              type="text"
              value={soonCountdownTarget}
              onChange={(e) => setSoonCountdownTarget(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-white/20 bg-white font-black text-blue-600"
              placeholder="e.g. 08:00 (for 8:00 AM)"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-300 uppercase">Center Pulsing Message</label>
            <input
              type="text"
              value={soonMessage}
              onChange={(e) => setSoonMessage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-white/20 bg-white font-black text-rose-600"
              placeholder="e.g. STREAM STARTING SOON"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-slate-300 uppercase">Bottom Announcement Note</label>
            <input
              type="text"
              value={soonNote}
              onChange={(e) => setSoonNote(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-white/20 bg-white"
              placeholder="e.g. Please stay tuned. The ceremony will begin shortly."
            />
          </div>
        </div>

        {/* Dual Mode Launch Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <button
            onClick={pushStartingSoonWithTimer}
            className="py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-[#0B1E40] font-headline font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Clock className="w-4 h-4" /> Push Slate WITH 8:00 AM Countdown Timer
          </button>

          <button
            onClick={pushStartingSoonWithoutTimer}
            className="py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:brightness-110 text-white font-headline font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" /> Push Slate WITHOUT Timer (Standard Starting Soon)
          </button>
        </div>
      </div>

      {/* Saved Custom Preset Library (If user saved any custom cards) */}
      {savedCustomCards.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-6 rounded-3xl border-2 border-amber-400/40 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-amber-400/20 pb-3">
            <h2 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-600" /> 📁 Your Saved Custom Preset Cards & Music Groups ({savedCustomCards.length})
            </h2>
            <span className="text-[10px] text-amber-700 font-bold uppercase">Saved in your local library for 1-click broadcast</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {savedCustomCards.map((card) => (
              <div
                key={card.id}
                onClick={() => pushCard(card)}
                className="p-3.5 bg-white hover:bg-amber-50/50 border border-amber-200 hover:border-amber-400 rounded-2xl transition cursor-pointer flex items-center gap-3 group shadow-2xs relative"
              >
                {card.photo ? (
                  <img src={card.photo} alt={card.name} className="w-12 h-12 rounded-xl object-cover border border-amber-300 shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B1E40] to-[#0E3B91] text-[#F4D571] font-black text-lg flex items-center justify-center border border-[#F4D571]/40 shrink-0 shadow-inner">
                    {card.performers && card.performers.length > 0 ? <Music className="w-5 h-5 text-amber-300" /> : card.name.charAt(0)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <span className="text-[9px] font-extrabold text-amber-600 uppercase tracking-wider block truncate">
                    {card.badge || "CUSTOM PRESET"}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 truncate group-hover:text-amber-700 transition">
                    {card.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">{card.role}</p>
                  {card.performers && card.performers.length > 0 && (
                    <p className="text-[9px] font-semibold text-blue-600 truncate mt-0.5">
                      👥 {card.performers.length} Performers: {card.performers.join(", ")}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => deleteCustomCard(card.id, e)}
                    title="Delete Saved Card"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <Send className="w-4 h-4 text-amber-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preset Designation Cards */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-orange" /> 1-Click Authentic Preset Designation Cards (2026-27)
          </h2>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Click any card to show seamlessly on stream</span>
        </div>

        {presetCards.map((cat, idx) => (
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
                  ) : card.houseLogo ? (
                    <img src={card.houseLogo} alt="" className="w-12 h-12 rounded-xl object-contain border border-amber-400 bg-white shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0B1E40] to-[#0E3B91] text-[#F4D571] font-black text-lg flex items-center justify-center border border-[#F4D571]/40 shrink-0 shadow-inner">
                      {card.name.charAt(0)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      {card.houseLogo && (
                        <img src={card.houseLogo} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                      )}
                      <span className="text-[9px] font-extrabold text-brand-orange uppercase tracking-wider block truncate">
                        {card.badge || "PREFECT"}
                      </span>
                    </div>
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

      {/* Manual Lower Third Builder & Event Editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Manual Card & Music Group Builder */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" /> Manual Lower-Third & Music Group Builder
            </h2>
            <button
              onClick={createNewBlankCardForm}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Create New Blank Card
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Person Name OR Music Group / Choir Title</label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold"
                placeholder="e.g. Classical Fusion Band OR Nitin Raj"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Role Title OR Song / Composition Name</label>
              <input
                type="text"
                value={cardRole}
                onChange={(e) => setCardRole(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600 font-bold"
                placeholder="e.g. Vande Mataram Instrumental OR School Prefect"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Group Performers / Participant Student Names (Comma-Separated)
              </label>
              <textarea
                value={cardPerformers}
                onChange={(e) => setCardPerformers(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold"
                placeholder="e.g. Soumit Kumar, Nitin Raj, Sakshi Pandit, Priyanshu Singh, Aadhya Jha"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Subtitle / School Organization</label>
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
                  placeholder="e.g. CULTURAL PERFORMANCE"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Photo / Group Logo Image URL</label>
                <input
                  type="text"
                  value={cardPhoto}
                  onChange={(e) => setCardPhoto(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  placeholder="https://example.com/photo.png"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleCustomPushCard}
                className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Push Card Live Now
              </button>

              <button
                onClick={saveCurrentCardToPresetLibrary}
                className="py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Card to Presets Library
              </button>
            </div>
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
