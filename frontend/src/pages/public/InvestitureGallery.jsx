import { useEffect, useState } from "react";
import api from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, ChevronLeft, ChevronRight, Sparkles, Award, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

function getProxyUrl(item) {
  if (item.proxy_url) {
    return item.proxy_url.startsWith("http") ? item.proxy_url : `${API_BASE}${item.proxy_url}`;
  }
  if (item.file_id) {
    return `${API_BASE}/api/gdrive-proxy/${item.file_id}`;
  }
  return item.original_url || "";
}

function getDownloadUrl(item) {
  if (item.download_url) {
    return item.download_url.startsWith("http") ? item.download_url : `${API_BASE}${item.download_url}`;
  }
  if (item.file_id) {
    return `${API_BASE}/api/gdrive-download/${item.file_id}?filename=${encodeURIComponent((item.title || "investiture-photo") + ".jpg")}`;
  }
  return item.original_url || "#";
}

export default function InvestitureGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    api.get("/investiture-gallery")
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(items.map((i) => i.category || "General Ceremony")));
  const filtered = filter === "all" ? items : items.filter((i) => (i.category || "General Ceremony") === filter);

  const activeItem = activeIdx !== null && filtered[activeIdx] ? filtered[activeIdx] : null;

  const nextPhoto = (e) => {
    e?.stopPropagation();
    if (activeIdx !== null && activeIdx < filtered.length - 1) {
      setActiveIdx(activeIdx + 1);
    } else {
      setActiveIdx(0);
    }
  };

  const prevPhoto = (e) => {
    e?.stopPropagation();
    if (activeIdx !== null && activeIdx > 0) {
      setActiveIdx(activeIdx - 1);
    } else {
      setActiveIdx(filtered.length - 1);
    }
  };

  const copyPhotoLink = (e, item) => {
    e?.stopPropagation();
    const photoUrl = `${window.location.origin}/gallery/investiture-ceremony?photo=${item.file_id || item.id}`;
    navigator.clipboard.writeText(photoUrl);
    toast.success("Photo share link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-amber-400 selection:text-slate-900 pb-20">
      {/* Hero Header */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-[#0B1E40] via-[#0E3B91] to-[#050E1F] border-b border-amber-400/20 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400/10 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-6xl mx-auto px-6 text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black tracking-widest uppercase shadow-md">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            OFFICIAL PHOTO GALLERY • SESSION 2026-27
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-headline font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 drop-shadow-md">
            Investiture Ceremony 2026-27
          </h1>
          <p className="text-sm md:text-base text-slate-200 max-w-2xl mx-auto font-medium">
            Explore and download official high-resolution photographs from the SDPS Oath Taking & Executive Council Installation Ceremony.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 text-xs font-bold text-slate-300 pt-2">
            <span className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10">
              <Award className="w-4 h-4 text-amber-400" /> S.D. Public School, Patna
            </span>
            <span className="flex items-center gap-1.5 bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10">
              <ImageIcon className="w-4 h-4 text-amber-400" /> {items.length} Photos Archived
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Category Filters */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2.5 justify-center">
            <button
              onClick={() => setFilter("all")}
              className={`px-5 py-2 rounded-2xl text-xs font-headline font-bold transition cursor-pointer ${
                filter === "all"
                  ? "bg-[#F4D571] text-[#0B1E40] shadow-lg ring-2 ring-amber-300 scale-105"
                  : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
              }`}
            >
              All Photos ({items.length})
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`px-5 py-2 rounded-2xl text-xs font-headline font-bold transition cursor-pointer ${
                  filter === c
                    ? "bg-[#F4D571] text-[#0B1E40] shadow-lg ring-2 ring-amber-300 scale-105"
                    : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                }`}
              >
                {c} ({items.filter((i) => (i.category || "General Ceremony") === c).length})
              </button>
            ))}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Investiture Ceremony Gallery...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center bg-slate-800/60 border border-slate-700/60 rounded-3xl p-16 space-y-4 max-w-xl mx-auto">
            <ImageIcon className="w-12 h-12 text-amber-400/60 mx-auto" />
            <h3 className="text-base font-bold text-white">No Ceremony Photos Added Yet</h3>
            <p className="text-xs text-slate-400">
              The admin can paste Google Drive photo links directly from the SDPS Admin Control Panel to display them here instantly!
            </p>
          </div>
        )}

        {/* Masonry / Responsive Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filtered.map((g, idx) => (
              <motion.div
                key={g.id || idx}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (idx % 12) * 0.04 }}
                onClick={() => setActiveIdx(idx)}
                className="group relative rounded-3xl overflow-hidden bg-slate-800 border border-slate-700/80 hover:border-amber-400/80 shadow-lg transition duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative overflow-hidden aspect-[4/3] bg-slate-950">
                  <img
                    src={getProxyUrl(g)}
                    alt={g.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to direct Google Drive image link if proxy is blocked
                      if (g.file_id && !e.target.src.includes("lh3.googleusercontent.com")) {
                        e.target.src = `https://lh3.googleusercontent.com/d/${g.file_id}=w1000`;
                      }
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> View High Resolution
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-800/90 flex justify-between items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition">
                      {g.title || "Investiture Photo"}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                      {g.category || "General Ceremony"}
                    </span>
                  </div>

                  <a
                    href={getDownloadUrl(g)}
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-xl bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-900 border border-amber-400/40 transition shrink-0"
                    title="Download Photo"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Viewer */}
      <AnimatePresence>
        {activeItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6"
            onClick={() => setActiveIdx(null)}
          >
            {/* Top Bar */}
            <div className="flex justify-between items-center gap-4 relative z-10">
              <div className="min-w-0">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                  {activeItem.category || "INVESTITURE CEREMONY 2026-27"}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {activeItem.title || "Investiture Ceremony Photograph"}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => copyPhotoLink(e, activeItem)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition flex items-center gap-1.5"
                  title="Share Photo Link"
                >
                  <Share2 className="w-3.5 h-3.5" /> Share
                </button>

                <a
                  href={getDownloadUrl(activeItem)}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 rounded-xl bg-[#F4D571] hover:bg-amber-300 text-[#0B1E40] font-headline font-bold text-xs transition flex items-center gap-1.5 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Download Photo
                </a>

                <button
                  onClick={() => setActiveIdx(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition ml-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Main Image Stage */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={prevPhoto}
                className="absolute left-2 sm:left-6 z-20 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/10 transition shadow-xl"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <img
                src={getProxyUrl(activeItem)}
                alt={activeItem.title}
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                onError={(e) => {
                  if (activeItem.file_id && !e.target.src.includes("lh3.googleusercontent.com")) {
                    e.target.src = `https://lh3.googleusercontent.com/d/${activeItem.file_id}=w1920`;
                  }
                }}
              />

              <button
                onClick={nextPhoto}
                className="absolute right-2 sm:right-6 z-20 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/10 transition shadow-xl"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Counter */}
            <div className="text-center text-xs font-bold text-slate-400">
              Photo {activeIdx + 1} of {filtered.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
