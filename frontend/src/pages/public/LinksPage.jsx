import { useEffect, useState } from "react";
import {
  Loader2, AlertCircle, ArrowLeft, Globe, MessageCircle,
  Instagram, Facebook, Youtube, Mail, Play, ArrowUpRight
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans p-6">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl text-center space-y-5">
          <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-red-400">Error Loading Profile</h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{error}</p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-850 transition-all shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Go to Website
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { settings, links } = data;

  // Group links by their group_header
  const groupedLinks = links.reduce((acc, link) => {
    const header = link.group_header?.trim() || "Links";
    if (!acc[header]) acc[header] = [];
    acc[header].push(link);
    return acc;
  }, {});

  // Socials configuration
  const socialIcons = [
    { key: "instagram", url: settings.instagram, icon: Instagram, color: "hover:text-pink-500" },
    { key: "facebook", url: settings.facebook, icon: Facebook, color: "hover:text-blue-500" },
    { key: "youtube", url: settings.youtube, icon: Youtube, color: "hover:text-red-500" },
    { key: "whatsapp", url: settings.whatsapp, icon: MessageCircle, color: "hover:text-emerald-500" },
    { key: "playstore", url: settings.playstore, icon: Play, color: "hover:text-green-500" },
    { key: "email", url: settings.email ? `mailto:${settings.email}` : "", icon: Mail, color: "hover:text-amber-500" },
  ].filter(s => s.url);

  // Helper to determine link icon based on URL keywords
  const getLinkIcon = (url) => {
    const u = url.toLowerCase();
    if (u.includes("whatsapp") || u.includes("wa.me")) return MessageCircle;
    if (u.includes("drive.google")) return Globe;
    if (u.includes("gungunerp") || u.includes("erp")) return Globe;
    return ArrowUpRight;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden flex flex-col justify-between py-12 px-4 select-none">
      
      {/* CSS Floating Particles & Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-3xl animate-pulse duration-4000"></div>

      {/* Floating schoolish icons in CSS */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        {/* Floating elements */}
        <div className="absolute top-10 left-[10%] text-2xl animate-bounce duration-3000">🎓</div>
        <div className="absolute top-[30%] right-[15%] text-2xl animate-bounce duration-5000">⭐</div>
        <div className="absolute bottom-[25%] left-[8%] text-2xl animate-bounce duration-4000">📚</div>
        <div className="absolute bottom-[10%] right-[20%] text-2xl animate-bounce duration-6000">✏️</div>
      </div>

      <div className="max-w-xl w-full mx-auto space-y-8 z-10">
        
        {/* Profile Card */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-white/[0.04] p-1 shadow-2xl shadow-indigo-500/5 border border-white/10 overflow-hidden flex items-center justify-center">
            {settings.logo_url ? (
              <img
                src={settings.logo_url.startsWith("http") ? settings.logo_url : `${process.env.REACT_APP_BACKEND_URL || ""}${settings.logo_url}`}
                alt="SDPS logo"
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              <span className="text-2xl font-black text-indigo-500">SD</span>
            )}
          </div>
          <div className="space-y-1.5 px-4">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">{settings.profile_title}</h1>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
              {settings.profile_bio}
            </p>
          </div>
        </div>

        {/* Links Group Section */}
        <div className="space-y-6 px-1">
          {Object.entries(groupedLinks).map(([groupName, groupItems]) => (
            <div key={groupName} className="space-y-3">
              {/* Category Divider Header */}
              {groupName !== "Links" && (
                <div className="flex items-center gap-3 px-2">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-white/10"></div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 select-none">
                    {groupName}
                  </span>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-white/10"></div>
                </div>
              )}

              {/* Group Links Cards */}
              <div className="space-y-3">
                {groupItems.map((item) => {
                  const IconComponent = getLinkIcon(item.url);
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all duration-300 transform hover:scale-[1.01] hover:shadow-xl hover:shadow-indigo-500/[0.03] group relative overflow-hidden"
                    >
                      {/* Left border glow on hover */}
                      <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-gradient-to-b from-blue-500 to-indigo-600 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>

                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-indigo-400 transition-colors shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-sm md:text-base text-slate-200 group-hover:text-white truncate">
                          {item.title}
                        </span>
                      </div>
                      
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 group-hover:text-slate-200 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Social Icons row */}
        {socialIcons.length > 0 && (
          <div className="flex items-center justify-center gap-4.5 pt-4">
            {socialIcons.map((s, idx) => {
              const IconComp = s.icon;
              return (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 flex items-center justify-center text-slate-400 transition-all duration-300 transform hover:scale-115 hover:shadow-lg ${s.color}`}
                >
                  <IconComp className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        )}

      </div>

      {/* Footer Branding */}
      <div className="text-center pt-10 text-[10px] text-slate-600 font-bold uppercase tracking-widest z-10">
        <a href="https://sdpublic.org" className="hover:text-slate-400 transition-colors">
          © S.D. Public School, Patna
        </a>
      </div>

    </div>
  );
}
