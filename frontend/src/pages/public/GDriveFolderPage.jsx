import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Share2, ChevronLeft, ChevronRight, Sparkles, Folder, Archive, ArrowLeft, Image as ImageIcon, ExternalLink, Globe } from "lucide-react";
import { toast } from "sonner";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

function getProxyUrl(fileId) {
  return `${API_BASE}/api/gdrive-proxy/${fileId}`;
}

function getDownloadUrl(fileId, title) {
  return `${API_BASE}/api/gdrive-download/${fileId}?filename=${encodeURIComponent((title || "photo") + ".jpg")}`;
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

  const copyFolderLink = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Shareable album link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-amber-400 selection:text-slate-900 pb-20 font-sans">
      {/* Standalone Clean Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0B1E40]/90 backdrop-blur-md border-b border-amber-400/20 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3 group">
            <img
              src="/logo512.png"
              alt="SDPS Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white p-0.5 shadow-md group-hover:scale-105 transition"
            />
            <div>
              <div className="font-headline font-extrabold text-sm sm:text-base text-white tracking-wide flex items-center gap-2">
                S.D. Public School, Patna
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Sparkles className="w-2.5 h-2.5" /> Media Drive
                </span>
              </div>
              <div className="text-[10px] text-slate-300 font-medium">Official School Photo Album</div>
            </div>
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {slug && (
            <button
              onClick={copyFolderLink}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10 flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" /> <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <a
            href="/"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md"
          >
            <Globe className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Main</span> Website
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      {!slug ? (
        /* All Photo Albums Directory */
        <div className="space-y-8">
          <section className="relative py-16 text-center bg-gradient-to-br from-[#0B1E40] via-[#0E3B91] to-[#050E1F] border-b border-amber-400/10 shadow-2xl">
            <div className="max-w-4xl mx-auto px-6 space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                <Folder className="w-3 h-3 text-amber-400" /> PHOTO ALBUMS & MEDIA DRIVE
              </span>
              <h1 className="text-3xl sm:text-5xl font-headline font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
                School Event Photo Albums
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
                Official high-resolution photo galleries hosted directly under S.D. Public School, Patna.
              </p>
            </div>
          </section>

          <div className="max-w-7xl mx-auto px-6 py-8">
            {loading && (
              <div className="text-center py-20 text-xs font-bold text-slate-400 uppercase tracking-wider">
                Loading photo albums...
              </div>
            )}

            {!loading && allFolders.length === 0 && (
              <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl p-16 space-y-3 max-w-xl mx-auto">
                <Folder className="w-12 h-12 text-amber-400/60 mx-auto" />
                <h3 className="text-base font-bold text-white">No Photo Albums Available Yet</h3>
                <p className="text-xs text-slate-400">
                  Albums created by the school administrator will appear here.
                </p>
              </div>
            )}

            {!loading && allFolders.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allFolders.map((f) => (
                  <Link
                    key={f.slug}
                    to={`/photos/${f.slug}`}
                    className="group bg-slate-900 border border-slate-800 hover:border-amber-400 rounded-3xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="p-6 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase border border-amber-400/30">
                          📁 {f.file_count || f.files?.length || 0} Photos
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          /photos/{f.slug}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition">
                        {f.title}
                      </h3>
                      {f.description && (
                        <p className="text-xs text-slate-400 line-clamp-2">{f.description}</p>
                      )}

                      {f.files && f.files.length > 0 && (
                        <div className="flex items-center gap-2 pt-2">
                          {f.files.slice(0, 4).map((img, i) => (
                            <img
                              key={i}
                              src={getProxyUrl(img.file_id)}
                              alt="preview"
                              className="w-12 h-12 rounded-xl object-cover border border-slate-800 bg-slate-950 shrink-0"
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = `https://lh3.googleusercontent.com/d/${img.file_id}=w200`;
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
                      <span>Open Album</span>
                      <span>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Single Album Standalone View */
        <div>
          {/* Album Title Header Banner */}
          <section className="relative py-12 text-center bg-gradient-to-br from-[#0B1E40] via-[#0E3B91] to-[#050E1F] border-b border-amber-400/10 shadow-2xl">
            <div className="max-w-5xl mx-auto px-6 space-y-3 relative z-10">
              <div className="flex items-center justify-center gap-2">
                <Link
                  to="/photos"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/10"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> All Albums
                </Link>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-amber-400" /> {files.length} PHOTOS ENCRYPTED & PROXIED
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-headline font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
                {folder?.title || "Photo Album"}
              </h1>

              {folder?.description && (
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">{folder.description}</p>
              )}

              <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
                <button
                  onClick={copyFolderLink}
                  className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 flex items-center gap-2"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" /> Share Album Link
                </button>

                {files.length > 0 && (
                  <a
                    href={`${API_BASE}/api/gdrive-folders/${slug}/zip`}
                    download
                    className="px-5 py-2 rounded-2xl bg-[#F4D571] hover:bg-amber-300 text-[#0B1E40] font-headline font-black text-xs transition flex items-center gap-2 shadow-lg"
                  >
                    <Archive className="w-4 h-4" /> Download All as ZIP ({files.length} Photos)
                  </a>
                )}
              </div>
            </div>
          </section>

          {/* Photo Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
            {loading && (
              <div className="text-center py-20 space-y-3">
                <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Photo Album...</p>
              </div>
            )}

            {!loading && files.length === 0 && (
              <div className="text-center bg-slate-900 border border-slate-800 rounded-3xl p-16 space-y-3 max-w-xl mx-auto">
                <ImageIcon className="w-12 h-12 text-amber-400/60 mx-auto" />
                <h3 className="text-base font-bold text-white">Album is Currently Empty</h3>
                <p className="text-xs text-slate-400">
                  No photos found in this album. Re-sync from the admin panel if Google Drive files were recently uploaded.
                </p>
              </div>
            )}

            {!loading && files.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {files.map((g, idx) => (
                  <motion.div
                    key={g.file_id || idx}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: (idx % 12) * 0.03 }}
                    onClick={() => setActiveIdx(idx)}
                    className="group relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-400 shadow-xl transition duration-300 cursor-pointer flex flex-col justify-between"
                  >
                    <div className="relative overflow-hidden aspect-[4/3] bg-slate-950">
                      <img
                        src={getProxyUrl(g.file_id)}
                        alt={g.title || "Photo"}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.target.src = `https://lh3.googleusercontent.com/d/${g.file_id}=w1000`;
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> High Res Preview
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-900 flex justify-between items-center gap-2">
                      <span className="text-xs font-bold text-white truncate">
                        {g.title || `Photo #${idx + 1}`}
                      </span>

                      <a
                        href={getDownloadUrl(g.file_id, g.title)}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 rounded-xl bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 border border-amber-400/40 transition shrink-0"
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
        </div>
      )}

      {/* Lightbox Slideshow Viewer */}
      <AnimatePresence>
        {activeFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col justify-between p-4 sm:p-6"
            onClick={() => setActiveIdx(null)}
          >
            {/* Top Bar */}
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
                  href={getDownloadUrl(activeFile.file_id, activeFile.title)}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="px-4 py-2 rounded-xl bg-[#F4D571] hover:bg-amber-300 text-[#0B1E40] font-headline font-bold text-xs transition flex items-center gap-1.5 shadow-lg"
                >
                  <Download className="w-4 h-4" /> Download Photo
                </a>

                <button
                  onClick={() => setActiveIdx(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition ml-2 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Main Stage */}
            <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={prevPhoto}
                className="absolute left-2 sm:left-6 z-20 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/10 transition shadow-xl cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <img
                src={getProxyUrl(activeFile.file_id)}
                alt={activeFile.title}
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/10"
                onError={(e) => {
                  e.target.src = `https://lh3.googleusercontent.com/d/${activeFile.file_id}=w1920`;
                }}
              />

              <button
                onClick={nextPhoto}
                className="absolute right-2 sm:right-6 z-20 p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white border border-white/10 transition shadow-xl cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Bottom Counter */}
            <div className="text-center text-xs font-bold text-slate-400">
              Photo {activeIdx + 1} of {files.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
