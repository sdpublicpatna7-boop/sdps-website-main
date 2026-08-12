import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Sparkles, Trash2, Plus, Download, ExternalLink, Image as ImageIcon, CheckCircle2, Copy, AlertCircle, RefreshCw
} from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

export function AdminInvestitureGallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const [rawInput, setRawInput] = useState("");
  const [category, setCategory] = useState("Oath Taking Ceremony");
  const [customTitle, setCustomTitle] = useState("");

  const loadGallery = () => {
    setLoading(true);
    api.get("/admin/investiture-gallery")
      .then((r) => setItems(r.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!rawInput.trim()) {
      toast.error("Please paste Google Drive photo URLs or File IDs in the box below");
      return;
    }

    setImporting(true);
    try {
      const res = await api.post("/admin/investiture-gallery/bulk", {
        urls: rawInput,
        category: category,
        title: customTitle.trim() || undefined
      });

      if (res.data?.added > 0) {
        toast.success(`Successfully imported ${res.data.added} photos from Google Drive!`);
        setRawInput("");
        setCustomTitle("");
        loadGallery();
      } else {
        toast.warning("No new valid Google Drive file IDs were found in your input.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to import Google Drive photos");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this photo from Investiture Ceremony Gallery?")) return;
    try {
      await api.delete(`/admin/investiture-gallery/${id}`);
      toast.success("Photo removed");
      loadGallery();
    } catch (err) {
      toast.error("Failed to delete photo");
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("ARE YOU SURE? This will remove all photos from the Investiture Ceremony Gallery.")) return;
    try {
      await api.delete("/admin/investiture-gallery");
      toast.success("All ceremony photos cleared");
      loadGallery();
    } catch (err) {
      toast.error("Failed to clear photos");
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1E40] via-[#0E3B91] to-[#0B1E40] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-[#F4D571]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#F4D571]" />
            <h1 className="text-2xl md:text-3xl font-headline font-black tracking-wide">
              Investiture Ceremony Google Drive Photo Gallery Manager
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
            Publish high-resolution ceremony photos hosted on Google Drive under your own domain (<code className="text-[#F4D571] font-mono">sdpublic.org/gallery/investiture-ceremony</code>) with 0 Cloudinary storage consumption!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href="/gallery/investiture-ceremony"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 bg-[#F4D571] hover:bg-amber-400 text-[#0B1E40] font-headline font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> Open Public Gallery Page
          </a>
        </div>
      </div>

      {/* Bulk Google Drive Photo Link Importer */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-orange" /> Bulk Import Google Drive Photos
            </h2>
            <p className="text-xs text-slate-500">
              Paste Google Drive share links, image URLs, or file IDs (separated by new lines or commas).
            </p>
          </div>
        </div>

        <form onSubmit={handleBulkImport} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Photo Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 text-xs rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-800 focus:bg-white transition"
              >
                <option value="Oath Taking Ceremony">Oath Taking Ceremony</option>
                <option value="Executive Cabinet & Captains">Executive Cabinet & Captains</option>
                <option value="Cultural Performances">Cultural Performances & Music</option>
                <option value="Dignitaries & Teachers">Dignitaries, Management & Teachers</option>
                <option value="General Ceremony">General Ceremony Highlights</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Custom Photo Title Prefix (Optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Oath Taking Ceremony Highlight"
                className="w-full px-4 py-3 text-xs rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Paste Google Drive URLs or File IDs</span>
              <span className="text-[10px] text-slate-400 lowercase">e.g. https://drive.google.com/file/d/1ABC123xyz/view</span>
            </label>
            <textarea
              rows={5}
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste 1 or 50 Google Drive photo URLs here (one URL per line):&#10;https://drive.google.com/file/d/1a2b3c4d5e6f/view?usp=sharing&#10;https://drive.google.com/file/d/7g8h9i0j1k2l/view?usp=sharing"
              className="w-full p-4 text-xs font-mono rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 transition"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Make sure Google Drive files have sharing set to <b>"Anyone with the link can view"</b>.
            </div>

            <button
              type="submit"
              disabled={importing}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-900 font-headline font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Extracting & Importing Photos...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Extract & Publish Photos to Gallery
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Published Gallery Photos List */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-orange" /> Published Investiture Photos ({items.length})
            </h2>
            <p className="text-xs text-slate-500">
              Live on website under <code className="text-blue-600 font-bold">sdpublic.org/gallery/investiture-ceremony</code>
            </p>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All Photos
            </button>
          )}
        </div>

        {loading && (
          <div className="text-center py-12 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Loading published gallery photos...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
            <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-600">No Investiture Photos Published Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Paste your Google Drive share links in the box above to extract and publish photos instantly!
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs group hover:border-amber-400 transition flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                  <img
                    src={item.proxy_url ? `${API_BASE}${item.proxy_url}` : `https://lh3.googleusercontent.com/d/${item.file_id}=w800`}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-[#F4D571] text-[9px] font-black uppercase border border-amber-400/30">
                    GDrive ID: {item.file_id?.slice(0, 8)}...
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                    <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block truncate">
                      {item.category}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <a
                      href={`${API_BASE}/api/gdrive-download/${item.file_id}?filename=${encodeURIComponent(item.title + ".jpg")}`}
                      download
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminInvestitureGallery;
