import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import {
  Loader2, AlertCircle, ArrowLeft, Globe, MessageCircle,
  Instagram, Facebook, Youtube, Mail, Play, ArrowUpRight,
  GraduationCap, BookOpen, MapPin, BookMarked, ArrowRight,
  Share2, Sparkles, MoreHorizontal
} from "lucide-react";
import { Link } from "react-router-dom";
import api, { API } from "../../lib/api";

export default function LinksPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLinktree = async () => {
      try {
        const { data: resp } = await api.get("/linktree");
        setData(resp);
      } catch (err) {
        console.error(err);
        setError("Failed to load official links. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchLinktree();
  }, []);

  const handleShare = () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: data?.settings?.profile_title || "S.D. Public School Links",
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Profile link copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-sans">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800 font-sans p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white border border-slate-200 shadow-xl text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">Error Loading Profile</h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{error}</p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { settings, links } = data;
  const isLight = settings.theme === "light";

  // Group links by their group_header
  const groupedLinks = links.reduce((acc, link) => {
    const header = link.group_header?.trim() || "Links";
    if (!acc[header]) acc[header] = [];
    acc[header].push(link);
    return acc;
  }, {});

  // Socials configuration
  const socialIcons = [
    { key: "instagram", url: settings.instagram, icon: Instagram, color: "hover:text-pink-600" },
    { key: "facebook", url: settings.facebook, icon: Facebook, color: "hover:text-blue-600" },
    { key: "youtube", url: settings.youtube, icon: Youtube, color: "hover:text-red-600" },
    { key: "whatsapp", url: settings.whatsapp, icon: MessageCircle, color: "hover:text-emerald-600" },
    { key: "playstore", url: settings.playstore, icon: Play, color: "hover:text-green-600" },
    { key: "email", url: settings.email ? `mailto:${settings.email}` : "", icon: Mail, color: "hover:text-amber-600" },
  ].filter(s => s.url);

  // Helper to determine bubble icon & color wrapper based on title/url keywords
  const getLinkIconAndColor = (title, url) => {
    const t = title.toLowerCase();
    const u = url.toLowerCase();
    
    if (t.includes("enquiry")) {
      return {
        icon: GraduationCap,
        color: "bg-blue-50 border-blue-100 text-blue-600"
      };
    }
    if (t.includes("prospectus")) {
      return {
        icon: BookOpen,
        color: "bg-amber-50 border-amber-100 text-amber-600"
      };
    }
    if (t.includes("website") || t.includes("school")) {
      return {
        icon: Globe,
        color: "bg-sky-50 border-sky-100 text-sky-600"
      };
    }
    if (t.includes("contact") || t.includes("save")) {
      return {
        icon: BookMarked,
        color: "bg-indigo-50 border-indigo-100 text-indigo-600"
      };
    }
    if (t.includes("maps") || t.includes("location") || t.includes("rate")) {
      return {
        icon: MapPin,
        color: "bg-rose-50 border-rose-100 text-rose-600"
      };
    }
    if (u.includes("whatsapp") || u.includes("wa.me")) {
      return {
        icon: MessageCircle,
        color: "bg-emerald-50 border-emerald-100 text-emerald-600"
      };
    }
    return {
      icon: ArrowRight,
      color: "bg-slate-50 border-slate-100 text-slate-600"
    };
  };

  const getHref = (url) => {
    if (url.startsWith("/api/")) {
      const base = (API || "").replace(/\/api$/, "");
      return `${base}${url}`;
    }
    return url;
  };

  return (
    <div className={`min-h-screen font-sans relative overflow-hidden flex flex-col justify-between py-8 px-4 select-none transition-colors duration-500 ${
      isLight ? "bg-gradient-to-tr from-violet-100 via-slate-50 to-pink-100 text-slate-800" : "bg-slate-950 text-slate-100"
    }`}>
      
      {/* Sonner Toast alerts */}
      <Toaster position="bottom-center" />

      {/* Background blobs */}
      <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-3xl animate-pulse ${
        isLight ? "bg-violet-400/20" : "bg-blue-600/10"
      }`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-3xl animate-pulse duration-4000 ${
        isLight ? "bg-pink-400/20" : "bg-indigo-600/10"
      }`}></div>

      {/* Floating schoolish icons */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-500 ${
        isLight ? "opacity-25" : "opacity-15"
      }`}>
        <div className="absolute top-16 left-[8%] text-2xl animate-bounce duration-3000">🎓</div>
        <div className="absolute top-[25%] right-[10%] text-2xl animate-bounce duration-5000">⭐</div>
        <div className="absolute bottom-[20%] left-[12%] text-2xl animate-bounce duration-4000">📚</div>
        <div className="absolute bottom-[8%] right-[15%] text-2xl animate-bounce duration-6000">✏️</div>
      </div>

      {/* Main Container */}
      <div className="max-w-md w-full mx-auto space-y-6 z-10 relative">
        
        {/* Top bar header tools */}
        <div className="flex items-center justify-between px-1.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all ${
            isLight
              ? "bg-white/80 border-slate-200 text-slate-700 shadow-sm"
              : "bg-white/[0.03] border-white/5 text-slate-400"
          }`}>
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <button
            onClick={handleShare}
            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all hover:scale-105 active:scale-95 ${
              isLight
                ? "bg-white/80 border-slate-200 text-slate-700 hover:bg-white shadow-sm"
                : "bg-white/[0.03] border-white/5 text-slate-400 hover:bg-white/[0.08]"
            }`}
            title="Share Profile"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Card branding */}
        <div className="text-center space-y-3.5">
          <div className={`w-24 h-24 mx-auto rounded-full p-1 shadow-lg overflow-hidden flex items-center justify-center border-4 transition-all ${
            isLight ? "bg-white border-white shadow-indigo-100" : "bg-slate-900 border-slate-800 shadow-slate-950"
          }`}>
            {settings.logo_url ? (
              <img
                src={settings.logo_url.startsWith("http") ? settings.logo_url : `${process.env.REACT_APP_BACKEND_URL || ""}${settings.logo_url}`}
                alt="SDPS Logo"
                className="w-full h-full object-contain rounded-full bg-white p-0.5"
              />
            ) : (
              <span className="text-2xl font-black text-indigo-500">SD</span>
            )}
          </div>
          <div className="space-y-1.5 px-4">
            <h1 className={`text-xl md:text-2xl font-black tracking-tight transition-colors ${
              isLight ? "text-slate-800" : "text-white"
            }`}>
              {settings.profile_handle || "@Sdps_patna"}
            </h1>
            <p className={`text-xs md:text-sm font-semibold leading-relaxed max-w-xs mx-auto transition-colors ${
              isLight ? "text-slate-600" : "text-slate-400"
            }`}>
              {settings.profile_bio}
            </p>
          </div>

          {/* Social Icons clustered directly below the bio description */}
          {socialIcons.length > 0 && (
            <div className="flex items-center justify-center gap-3.5 pt-1 flex-wrap">
              {socialIcons.map((s, idx) => {
                const IconComp = s.icon;
                return (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 ${
                      isLight
                        ? "bg-white/80 border border-slate-200/80 text-slate-700 shadow-sm"
                        : "bg-white/[0.03] border border-white/5 text-slate-400 hover:bg-white/[0.08]"
                    } ${s.color}`}
                  >
                    <IconComp className="w-4.5 h-4.5" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Links lists section */}
        <div className="space-y-5 px-0.5 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {Object.entries(groupedLinks).map(([groupName, groupItems]) => (
            <div key={groupName} className="space-y-2.5">
              {/* Category Divider Header (Centered) */}
              {groupName !== "Links" && (
                <div className="text-center py-1">
                  <span className={`text-[11px] font-extrabold uppercase tracking-widest ${
                    isLight ? "text-slate-500" : "text-slate-400"
                  }`}>
                    {groupName}
                  </span>
                </div>
              )}

              {/* Group Links Cards */}
              <div className="space-y-3">
                {groupItems.map((item) => {
                  const { icon: CardIcon, color: bubbleColor } = getLinkIconAndColor(item.title, item.url);
                  return (
                    <a
                      key={item.id}
                      href={getHref(`/api/linktree/click/${item.id}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-300 transform hover:scale-[1.01] hover:shadow-md group relative overflow-hidden ${
                        isLight
                          ? "bg-white border-slate-100 hover:border-slate-250 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)]"
                          : "bg-white/[0.03] border-white/5 hover:border-white/10 hover:bg-white/[0.05] shadow-2xl"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Soft background color bubble circle wrapper */}
                        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-300 ${bubbleColor}`}>
                          <CardIcon className="w-5.5 h-5.5" />
                        </div>
                        <span className={`font-bold text-sm truncate transition-colors ${
                          isLight ? "text-slate-700 group-hover:text-slate-900" : "text-slate-200 group-hover:text-white"
                        }`}>
                          {item.title}
                        </span>
                      </div>
                      
                      {/* Three-dots menu icon on the right side */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isLight ? "text-slate-350 group-hover:text-slate-600" : "text-slate-550 group-hover:text-slate-300"
                      }`}>
                        <MoreHorizontal className="w-4.5 h-4.5" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Footer Branding */}
      <div className="text-center pt-8 text-[9px] font-extrabold uppercase tracking-widest z-10">
        <a href="https://sdpublic.org" className={`transition-colors ${
          isLight ? "text-slate-400 hover:text-slate-600" : "text-slate-600 hover:text-slate-400"
        }`}>
          © S.D. Public School, Patna
        </a>
      </div>

    </div>
  );
}
