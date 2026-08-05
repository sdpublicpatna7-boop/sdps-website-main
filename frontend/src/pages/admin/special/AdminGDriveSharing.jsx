import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  FolderPlus, Folder, Sparkles, Copy, ExternalLink, RefreshCw, Trash2, Download, AlertCircle, Link as LinkIcon, Image as ImageIcon, Layers, Eye, TrendingUp, Award, BarChart3, Share2
} from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

export function AdminGDriveSharing() {
  const [folders, setFolders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncingSlug, setSyncingSlug] = useState(null);

  const [driveUrl, setDriveUrl] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [manualUrls, setManualUrls] = useState("");

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get("/admin/gdrive-folders").catch(() => ({ data: [] })),
      api.get("/admin/gdrive-folders/analytics").catch(() => ({ data: null }))
    ])
      .then(([foldersRes, analyticsRes]) => {
        setFolders(foldersRes.data || []);
        setAnalytics(analyticsRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!driveUrl.trim() && !manualUrls.trim()) {
      toast.error("Please paste a Google Drive Folder URL or Photo Links");
      return;
    }
    if (!title.trim()) {
      toast.error("Please enter a Folder Title for your album");
      return;
    }

    setCreating(true);
    try {
      const res = await api.post("/admin/gdrive-folders", {
        drive_folder_url: driveUrl.trim(),
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        manual_urls: manualUrls.trim()
      });

      if (res.data?.slug) {
        toast.success(`Own Domain Photo Folder created! ${res.data.file_count || 0} photos extracted.`);
        setDriveUrl("");
        setTitle("");
        setSlug("");
        setDescription("");
        setManualUrls("");
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create Google Drive folder album");
    } finally {
      setCreating(false);
    }
  };

  const handleResync = async (folderSlug) => {
    setSyncingSlug(folderSlug);
    try {
      const res = await api.post(`/admin/gdrive-folders/${folderSlug}/sync`);
      toast.success(`Synced folder! ${res.data?.count || 0} total photos found.`);
      loadData();
    } catch (err) {
      toast.error("Failed to re-sync folder from Google Drive");
    } finally {
      setSyncingSlug(null);
    }
  };

  const handleDelete = async (folderSlug) => {
    if (!window.confirm("Are you sure you want to delete this custom domain photo album?")) return;
    try {
      await api.delete(`/admin/gdrive-folders/${folderSlug}`);
      toast.success("Folder album deleted");
      loadData();
    } catch (err) {
      toast.error("Failed to delete folder album");
    }
  };

  const copyShareLink = (folderSlug) => {
    const shareUrl = `${window.location.origin}/p/${folderSlug}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(`WhatsApp preview link copied: ${shareUrl}`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> High-Performance Media Drive
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-headline tracking-tight">
            Google Drive Photo Sharing & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Convert Google Drive photo folders into standalone, high-speed photo albums hosted on your domain with detailed view & download analytics.
          </p>
        </div>

        <button
          onClick={loadData}
          className="self-start md:self-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center gap-2 border border-slate-700 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Analytics
        </button>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Album Views</span>
            <div className="text-3xl font-black text-white font-headline">
              {analytics?.total_views || 0}
            </div>
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live Visitor Count
            </span>
          </div>
          <div className="p-3.5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Photo Downloads</span>
            <div className="text-3xl font-black text-amber-400 font-headline">
              {analytics?.total_downloads || 0}
            </div>
            <span className="text-[11px] text-amber-300/80 font-medium flex items-center gap-1">
              <Award className="w-3 h-3" /> Original Full-Res Exports
            </span>
          </div>
          <div className="p-3.5 bg-amber-400/10 text-amber-400 rounded-2xl border border-amber-400/20">
            <Download className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 p-6 rounded-3xl shadow-xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Active Albums</span>
            <div className="text-3xl font-black text-white font-headline">
              {folders.length}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Hosted on custom domain
            </span>
          </div>
          <div className="p-3.5 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
            <Folder className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Top Downloaded Photos Analytics Section */}
      {analytics?.top_photos && analytics.top_photos.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Most Downloaded Photos Ranking</h2>
            </div>
            <span className="text-xs font-bold text-slate-400">Top {analytics.top_photos.length} Photos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.top_photos.slice(0, 8).map((photo, idx) => (
              <div
                key={photo.file_id || idx}
                className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden p-3 flex gap-3 items-center"
              >
                <img
                  src={`https://lh3.googleusercontent.com/d/${photo.file_id}=w500`}
                  alt={photo.title}
                  className="w-14 h-14 object-cover rounded-xl shrink-0 bg-slate-900"
                />
                <div className="space-y-0.5 overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">{photo.title}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      #{idx + 1}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{photo.folder_title}</p>
                  <div className="text-xs font-black text-amber-400 flex items-center gap-1 pt-1">
                    <Download className="w-3 h-3" /> {photo.downloads} Downloads
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Convert New Folder Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-400" /> Create New Photo Album
          </h2>
          <p className="text-xs text-slate-400">
            Paste a public Google Drive folder link to instantly generate a branded photo album page on your domain.
          </p>
        </div>

        <form onSubmit={handleCreateFolder} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Folder Title *</label>
              <input
                type="text"
                placeholder="e.g. Annual Sports Day 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Custom URL Slug (Optional)</label>
              <input
                type="text"
                placeholder="e.g. sports-day-2026"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Google Drive Folder Link *</label>
            <input
              type="text"
              placeholder="https://drive.google.com/drive/folders/1abcxyz..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Album Description (Optional)</label>
            <textarea
              rows={2}
              placeholder="Brief description of the event or photographs..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {creating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Converting Google Drive Folder...
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4" /> Convert & Host Album
              </>
            )}
          </button>
        </form>
      </div>

      {/* Album Management Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" /> Hosted Photo Albums ({folders.length})
          </h2>
        </div>

        {folders.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No photo folders created yet. Use the form above to add your first folder.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Album Title & Slug</th>
                  <th className="p-3.5">Photos</th>
                  <th className="p-3.5">Views</th>
                  <th className="p-3.5">Downloads</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {folders.map((f) => (
                  <tr key={f.id || f.slug} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm">{f.title}</div>
                      <div className="text-[11px] text-amber-400/80 font-mono">/photos/{f.slug}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200">
                      {f.file_count || f.files?.length || 0} Photos
                    </td>
                    <td className="p-3.5 font-bold text-indigo-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {f.views || 0}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-amber-400">
                      <span className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" /> {f.downloads || 0}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => copyShareLink(f.slug)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        title="Copy WhatsApp share link"
                      >
                        <Share2 className="w-3 h-3 text-amber-400" /> Share Link
                      </button>

                      <button
                        onClick={() => handleResync(f.slug)}
                        disabled={syncingSlug === f.slug}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Re-sync folder with Google Drive"
                      >
                        <RefreshCw className={`w-3 h-3 ${syncingSlug === f.slug ? "animate-spin" : ""}`} /> Sync
                      </button>

                      <a
                        href={`/photos/${f.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 text-[11px] font-bold transition inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </a>

                      <button
                        onClick={() => handleDelete(f.slug)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
