import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Archive, Image as ImageIcon, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

function getThumbUrl(fileId) {
  // Fast 500px preview thumbnail directly from Google CDN (instant grid load)
  return `https://lh3.googleusercontent.com/d/${fileId}=w500`;
}

function getFullUrl(fileId) {
  // Fast 1000px preview for modal slideshow (instant modal load)
  return `https://lh3.googleusercontent.com/d/${fileId}=w1000`;
}

function getDownloadUrl(fileId) {
  // Direct Google Drive 100% original full-res download link (0 Render server bandwidth!)
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export default function GDriveFolderPage() {
  const { slug } = useParams();
  const [folder, setFolder] = useState(null);
  const [allFolders, setAllFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(null);

  useEffect(() => {
    setLoading(true);
    if (slug) {
      api.get(`/gdrive-folders/${slug}`)
        .then((r) => setFolder(r.data))
        .catch(() => setFolder(null))
        .finally(() => setLoading(false));
    } else {
      api.get("/gdrive-folders")
        .then((r) => setAllFolders(r.data || []))
        .catch(() => setAllFolders([]))
        .finally(() => setLoading(false));
    }
  }, [slug]);

  const files = folder?.files || [];
  const activeFile = activeIdx !== null && files[activeIdx] ? files[activeIdx] : null;

  const nextPhoto = (e) => {
    e?.stopPropagation();
    if (activeIdx !== null && activeIdx < files.length - 1) {
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
      setActiveIdx(files.length - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-400 selection:text-slate-900 pb-20 font-sans">
      {/* Clean Standalone Top Header */}
      <header className="sticky top-0 z-40 bg-[#0B1E40]/95 backdrop-blur-md border-b border-amber-400/20 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/logo512.png"
              alt="SDPS Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white p-0.5 shadow-md"
            />
            <div>
              <div className="font-headline font-extrabold text-sm sm:text-base text-white tracking-wide flex items-center gap-2">
                S.D. Public School, Patna
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-2.5 h-2.5" /> Media Drive
                </span>
              </div>
              <div className="text-[10px] text-slate-300 font-medium">Official Photo Album</div>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <a
            href={`${API_BASE}/api/gdrive-folders/${slug}/zip`}
            download
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-lg"
          >
            <Archive className="w-4 h-4" /> Download All ({files.length} Photos)
          </a>
        )}
      </header>

      {/* Main Banner Header */}
      <section className="relative py-10 text-center bg-gradient-to-br from-[#0B1E40] via-[#0E3B91] to-[#050E1F] border-b border-amber-400/10 shadow-2xl">
        <div className="max-w-4xl mx-auto px-6 space-y-2 relative z-10">
          <h1 className="text-3xl sm:text-5xl font-headline font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
            {folder?.title || "Investiture Ceremony 2026-27"}
          </h1>

          {folder?.description && (
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-medium">
              {folder.description}
            </p>
          )}
        </div>
      </section>

      {/* Photo Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="text-center py-20 space-y-3">
            <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Photos...</p>
          </div>
        )}

        {!loading && files.length === 0 && (
          <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl p-16 space-y-3 max-w-xl mx-auto">
            <ImageIcon className="w-12 h-12 text-amber-400/60 mx-auto" />
            <h3 className="text-base font-bold text-white">Album is Currently Empty</h3>
            <p className="text-xs text-slate-400">No photos found in this album.</p>
          </div>
        )}

        {!loading && files.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {files.map((g, idx) => (
              <div
                key={g.file_id || idx}
                onClick={() => setActiveIdx(idx)}
                className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-400/80 shadow-lg transition duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div className="relative overflow-hidden aspect-[4/3] bg-slate-950">
                  <img
                    src={getThumbUrl(g.file_id)}
                    alt={g.title || `Photo #${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.target.src = `${API_BASE}/api/gdrive-proxy/${g.file_id}?w=500`;
                    }}
                  />
                </div>

                <div className="p-3 bg-slate-900 flex justify-between items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 truncate">
                    {g.title || `Photo #${idx + 1}`}
                  </span>

                  <a
                    href={getDownloadUrl(g.file_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/30 transition shrink-0"
                    title="Download Original Full High-Res Photo"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Fast Preview Modal */}
      <AnimatePresence>
        {activeFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6"
            onClick={() => setActiveIdx(null)}
          >
            {/* Modal Top */}
            <div className="flex justify-between items-center gap-4 relative z-10">
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block">
                  {folder?.title || "SDPS PHOTO ALBUM"}
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white truncate">
                  {activeFile.title || `Photo #${activeIdx + 1}`}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getDownloadUrl(activeFile.file_id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 rounded-xl bg-[#F4D571] hover:bg-amber-300 text-[#0B1E40] font-headline font-bold text-xs transition flex items-center gap-1.5 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Download Original High-Res
                </a>

                <button
                  onClick={() => setActiveIdx(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition ml-2 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Stage */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={prevPhoto}
                className="absolute left-2 sm:left-6 z-20 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/10 transition shadow-xl cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <img
                src={getFullUrl(activeFile.file_id)}
                alt={activeFile.title}
                className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                onError={(e) => {
                  e.target.src = `${API_BASE}/api/gdrive-proxy/${activeFile.file_id}?w=1000`;
                }}
              />

              <button
                onClick={nextPhoto}
                className="absolute right-2 sm:right-6 z-20 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/10 transition shadow-xl cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Bottom Counter */}
            <div className="text-center text-xs font-bold text-slate-400">
              Photo {activeIdx + 1} of {files.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
