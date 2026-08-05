import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  FolderPlus, Folder, Sparkles, Copy, ExternalLink, RefreshCw, Trash2, Download, AlertCircle, Link as LinkIcon, Image as ImageIcon, Layers
} from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

export function AdminGDriveSharing() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncingSlug, setSyncingSlug] = useState(null);

  const [driveUrl, setDriveUrl] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [manualUrls, setManualUrls] = useState("");

  const loadFolders = () => {
    setLoading(true);
    api.get("/admin/gdrive-folders")
      .then((r) => setFolders(r.data || []))
      .catch(() => setFolders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFolders();
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
        loadFolders();
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
      loadFolders();
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
      loadFolders();
    } catch (err) {
      toast.error("Failed to delete folder album");
    }
  };

  const copyShareLink = (folderSlug) => {
    const shareUrl = `${window.location.origin}/photos/${folderSlug}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success(`Share link copied: ${shareUrl}`);
  };

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1E40] via-[#0E3B91] to-[#0B1E40] text-white p-6 md:p-8 rounded-3xl shadow-xl border border-[#F4D571]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-6 h-6 text-[#F4D571]" />
            <h1 className="text-2xl md:text-3xl font-headline font-black tracking-wide">
              Google Drive Photo Sharing & Folder Converter
            </h1>
          </div>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl">
            Paste any Google Drive Folder link to create branded shareable photo albums on your own domain (<code className="text-[#F4D571] font-mono">sdpublic.org/photos/album-name</code>) with high-res preview and 1-click downloads!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href="/photos"
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 bg-[#F4D571] hover:bg-amber-400 text-[#0B1E40] font-headline font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" /> View All Public Albums
          </a>
        </div>
      </div>

      {/* Paste Google Drive Folder Converter Form */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-orange" /> Convert Google Drive Folder Link to Own Domain Link
            </h2>
            <p className="text-xs text-slate-500">
              Paste a public Google Drive folder URL. Visitors will see high-res photos on your domain with 0 Cloudinary quota used!
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateFolder} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Album Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug) {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
                  }
                }}
                placeholder="e.g. Investiture Ceremony 2026-27 Photos"
                className="w-full px-4 py-3 text-xs rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900 focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Custom Domain Link Slug</span>
                <span className="text-[10px] text-blue-600 font-mono">sdpublic.org/photos/{slug || "slug"}</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}
                placeholder="e.g. investiture-ceremony-2026-27"
                className="w-full px-4 py-3 text-xs font-mono rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Google Drive Folder Share Link *
            </label>
            <input
              type="text"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="Paste link: https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j..."
              className="w-full px-4 py-3 text-xs font-mono rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Album Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Official photos from Oath Taking, Cultural Dance Medley, and House Captains Installation"
              className="w-full p-3 text-xs rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Specific File Links inside Folder (Optional Fallback / Additional Links)</span>
              <span className="text-[10px] text-slate-400 lowercase">Paste individual drive photo URLs if folder extraction is restricted</span>
            </label>
            <textarea
              rows={3}
              value={manualUrls}
              onChange={(e) => setManualUrls(e.target.value)}
              placeholder="Paste individual file links (one per line):&#10;https://drive.google.com/file/d/1ABC123/view&#10;https://drive.google.com/file/d/4DEF456/view"
              className="w-full p-3 text-xs font-mono rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Ensure the Google Drive Folder is set to <b>"Anyone with the link can view"</b>.
            </div>

            <button
              type="submit"
              disabled={creating}
              className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 text-slate-900 font-headline font-black text-xs rounded-2xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Extracting Folder & Creating Album...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Create Own Domain Photo Folder
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Custom Domain Photo Folders */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-4 gap-2">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Folder className="w-4 h-4 text-brand-orange" /> Created Own Domain Photo Albums ({folders.length})
            </h2>
            <p className="text-xs text-slate-500">
              Each folder gets an official shareable URL under <code className="text-blue-600 font-bold">sdpublic.org/photos/:slug</code>
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Loading photo folders...
          </div>
        )}

        {!loading && folders.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200 space-y-3">
            <Folder className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-600">No Own Domain Folders Created Yet</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Paste a Google Drive Folder link above to create your first branded shareable photo album!
            </p>
          </div>
        )}

        {!loading && folders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {folders.map((f) => (
              <div
                key={f.slug || f.id}
                className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-amber-400 transition space-y-4 flex flex-col justify-between shadow-2xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-800 text-[10px] font-black uppercase border border-amber-300/40">
                      📁 {f.file_count || f.files?.length || 0} PHOTOS
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      /photos/{f.slug}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{f.title}</h3>
                  {f.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">{f.description}</p>
                  )}

                  {/* Thumbnail Preview Strip */}
                  {f.files && f.files.length > 0 && (
                    <div className="flex items-center gap-1.5 overflow-hidden pt-2">
                      {f.files.slice(0, 5).map((img, i) => (
                        <img
                          key={i}
                          src={`${API_BASE}/api/gdrive-proxy/${img.file_id}`}
                          alt="preview"
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-200 shrink-0"
                          loading="lazy"
                          onError={(e) => {
                            e.target.src = `https://lh3.googleusercontent.com/d/${img.file_id}=w200`;
                          }}
                        />
                      ))}
                      {f.files.length > 5 && (
                        <div className="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center border border-slate-300 shrink-0">
                          +{f.files.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyShareLink(f.slug)}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-600" /> Copy Share Link
                    </button>

                    <a
                      href={`/photos/${f.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View Album
                    </a>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleResync(f.slug)}
                      disabled={syncingSlug === f.slug}
                      title="Re-sync folder from Google Drive"
                      className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingSlug === f.slug ? 'animate-spin text-amber-600' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleDelete(f.slug)}
                      title="Delete album"
                      className="p-2 rounded-xl bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-300 transition cursor-pointer"
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

export default AdminGDriveSharing;
