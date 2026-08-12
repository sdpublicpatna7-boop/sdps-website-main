import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  FolderPlus, Folder, Sparkles, Copy, ExternalLink, RefreshCw, Trash2, Download,
  AlertCircle, Link as LinkIcon, Image as ImageIcon, Layers, Eye, TrendingUp,
  Award, BarChart3, Share2, CheckSquare, Square, Star, Check, Plus, X, Edit3, SlidersHorizontal
} from "lucide-react";

const API_BASE = process.env.REACT_APP_BACKEND_URL || "";

export default function AdminGDriveSharing() {
  const [folders, setFolders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [syncingSlug, setSyncingSlug] = useState(null);

  // New Album Form State
  const [driveUrl, setDriveUrl] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [manualUrls, setManualUrls] = useState("");

  // Extracted photos for selection during creation
  const [extractedPhotos, setExtractedPhotos] = useState([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState(new Set());
  const [coverFileId, setCoverFileId] = useState("");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDriveUrl, setEditDriveUrl] = useState("");
  const [editPhotos, setEditPhotos] = useState([]);
  const [editSelectedIds, setEditSelectedIds] = useState(new Set());
  const [editCoverId, setEditCoverId] = useState("");
  const [updating, setUpdating] = useState(false);

  // Additional folder state for Edit Modal
  const [extraFolderUrl, setExtraFolderUrl] = useState("");
  const [appendingFolder, setAppendingFolder] = useState(false);

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

  // Fetch / extract photos from Google Drive link before saving
  const handleExtractPhotos = async () => {
    if (!driveUrl.trim() && !manualUrls.trim()) {
      toast.error("Please enter a Google Drive folder link or photo links first.");
      return;
    }
    setExtracting(true);
    try {
      const res = await api.post("/admin/gdrive-folders/extract", {
        drive_folder_url: driveUrl.trim(),
        manual_urls: manualUrls.trim()
      });
      const files = res.data?.files || [];
      if (files.length === 0) {
        toast.error("No photos found in this link. Make sure the folder is set to 'Anyone with the link can view'.");
      } else {
        setExtractedPhotos(files);
        const allIds = new Set(files.map((f) => f.file_id));
        setSelectedPhotoIds(allIds);
        setCoverFileId(files[0]?.file_id || "");
        toast.success(`Successfully extracted ${files.length} photos! Select which ones to include below.`);
      }
    } catch (err) {
      toast.error("Failed to extract photos from Google Drive link.");
    } finally {
      setExtracting(false);
    }
  };

  const toggleSelectPhoto = (fileId) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const selectAllPhotos = () => {
    const allIds = new Set(extractedPhotos.map((f) => f.file_id));
    setSelectedPhotoIds(allIds);
  };

  const deselectAllPhotos = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter an Album Title.");
      return;
    }
    if (!driveUrl.trim() && !manualUrls.trim()) {
      toast.error("Please paste a Google Drive Folder URL or Photo Links.");
      return;
    }

    setCreating(true);
    try {
      // Build selected files payload
      let selectedFilesList = [];
      if (extractedPhotos.length > 0) {
        selectedFilesList = extractedPhotos.filter((f) => selectedPhotoIds.has(f.file_id));
        if (selectedFilesList.length === 0) {
          toast.error("Please select at least one photo to include in your album.");
          setCreating(false);
          return;
        }
      }

      const res = await api.post("/admin/gdrive-folders", {
        drive_folder_url: driveUrl.trim(),
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim(),
        manual_urls: manualUrls.trim(),
        selected_files: selectedFilesList,
        cover_file_id: coverFileId
      });

      if (res.data?.slug) {
        toast.success(`Album created with ${res.data.file_count || 0} selected photos!`);
        setDriveUrl("");
        setTitle("");
        setSlug("");
        setDescription("");
        setManualUrls("");
        setExtractedPhotos([]);
        setSelectedPhotoIds(new Set());
        setCoverFileId("");
        loadData();
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create Google Drive photo album");
    } finally {
      setCreating(false);
    }
  };

  // Open Edit Modal for existing album
  const openEditModal = (folder) => {
    setEditingFolder(folder);
    setEditTitle(folder.title || "");
    setEditSlug(folder.slug || "");
    setEditDescription(folder.description || "");
    setEditDriveUrl(folder.drive_folder_url || "");
    setEditCoverId(folder.cover_file_id || (folder.files?.[0]?.file_id || ""));
    const files = folder.files || [];
    setEditPhotos(files);
    setEditSelectedIds(new Set(files.map((f) => f.file_id)));
    setExtraFolderUrl("");
    setEditModalOpen(true);
  };

  const toggleEditSelectPhoto = (fileId) => {
    setEditSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const handleResyncInModal = async () => {
    if (!editingFolder?.slug) return;
    setSyncingSlug(editingFolder.slug);
    try {
      const res = await api.post(`/admin/gdrive-folders/${editingFolder.slug}/sync`);
      const updatedFiles = res.data?.files || [];
      setEditPhotos(updatedFiles);
      setEditSelectedIds(new Set(updatedFiles.map((f) => f.file_id)));
      toast.success(`Re-synced album! ${updatedFiles.length} photos available.`);
    } catch (err) {
      toast.error("Failed to re-sync folder from Google Drive.");
    } finally {
      setSyncingSlug(null);
    }
  };

  // Append photos from an additional Google Drive folder in Edit Modal
  const handleAppendFolderInModal = async () => {
    if (!extraFolderUrl.trim()) {
      toast.error("Please enter an additional Google Drive folder link or photo links.");
      return;
    }

    setAppendingFolder(true);
    try {
      const res = await api.post("/admin/gdrive-folders/extract", {
        drive_folder_url: extraFolderUrl.trim()
      });
      const newFiles = res.data?.files || [];
      if (newFiles.length === 0) {
        toast.error("No photos found in this additional folder link.");
      } else {
        const existingIds = new Set(editPhotos.map((f) => f.file_id));
        let addedCount = 0;
        const combined = [...editPhotos];
        const updatedSelected = new Set(editSelectedIds);

        for (const f of newFiles) {
          if (!existingIds.has(f.file_id)) {
            existingIds.add(f.file_id);
            combined.push(f);
            updatedSelected.add(f.file_id);
            addedCount++;
          }
        }

        setEditPhotos(combined);
        setEditSelectedIds(updatedSelected);
        setExtraFolderUrl("");
        toast.success(`Appended ${addedCount} new photos from additional folder!`);
      }
    } catch (err) {
      toast.error("Failed to extract photos from additional folder link.");
    } finally {
      setAppendingFolder(false);
    }
  };

  const handleUpdateFolder = async () => {
    if (!editingFolder?.slug) return;
    if (!editTitle.trim()) {
      toast.error("Please enter an album title.");
      return;
    }

    setUpdating(true);
    try {
      const selectedList = editPhotos.filter((f) => editSelectedIds.has(f.file_id));
      await api.put(`/admin/gdrive-folders/${editingFolder.slug}`, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        drive_folder_url: editDriveUrl.trim(),
        cover_file_id: editCoverId,
        selected_files: selectedList
      });

      toast.success(`Album updated! ${selectedList.length} photos selected.`);
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.error("Failed to update album.");
    } finally {
      setUpdating(false);
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
    if (!window.confirm("Are you sure you want to delete this photo album?")) return;
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
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> High-Performance Media Drive
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-headline tracking-tight">
            Google Drive Photo Sharing & Picker
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Paste Google Drive links, combine multiple folders, extract photos instantly, pick which photos to publish, set cover images, and generate custom domain albums.
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
          <div className="p-3.5 bg-indigo500/10 text-indigo-400 rounded-2xl border border-indigo-500/20">
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

      {/* Main Creation & Photo Selection Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-amber-400" /> Create Photo Album with Custom Selection
          </h2>
          <p className="text-xs text-slate-400">
            Paste Google Drive links (one or multiple folders), extract photo previews, select which photos to show, choose a cover photo, and host instantly.
          </p>
        </div>

        <form onSubmit={handleCreateFolder} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Folder / Album Title *</label>
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
            <label className="text-xs font-bold text-slate-300">Google Drive Folder Link(s) * (Supports multiple links separated by space/newline)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://drive.google.com/drive/folders/1abcxyz... https://drive.google.com/drive/folders/2def..."
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition"
              />
              <button
                type="button"
                onClick={handleExtractPhotos}
                disabled={extracting}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-400/30 transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                Fetch Photos
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300">Additional Photo Links (Optional - one per line)</label>
            <textarea
              rows={2}
              placeholder="https://drive.google.com/file/d/1abc...&#10;https://drive.google.com/file/d/2xyz..."
              value={manualUrls}
              onChange={(e) => setManualUrls(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition resize-none"
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

          {/* Extracted Photo Picker Grid */}
          {extractedPhotos.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    Select Photos to Show ({selectedPhotoIds.size} of {extractedPhotos.length} selected)
                  </h3>
                  <p className="text-[11px] text-slate-400">Click individual photos to select or unselect. Star a photo to set as cover.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllPhotos}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold border border-emerald-500/20 transition cursor-pointer"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllPhotos}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold border border-rose-500/20 transition cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-1 scrollbar-thin">
                {extractedPhotos.map((photo, idx) => {
                  const isSelected = selectedPhotoIds.has(photo.file_id);
                  const isCover = coverFileId === photo.file_id;

                  return (
                    <div
                      key={photo.file_id}
                      onClick={() => toggleSelectPhoto(photo.file_id)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition group shadow-md ${
                        isSelected
                          ? "border-emerald-400 ring-2 ring-emerald-400/30"
                          : "border-slate-800 opacity-40 hover:opacity-75"
                      }`}
                    >
                      <img
                        src={`https://lh3.googleusercontent.com/d/${photo.file_id}=w500`}
                        alt={`Photo #${idx + 1}`}
                        className="w-full h-full object-cover bg-slate-950"
                        loading="lazy"
                      />

                      {/* Top Checkbox Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        {isSelected ? (
                          <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-lg bg-slate-900/80 text-slate-400 flex items-center justify-center border border-slate-700">
                            <Plus className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      {/* Cover Photo Badge Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverFileId(photo.file_id);
                          if (!selectedPhotoIds.has(photo.file_id)) {
                            toggleSelectPhoto(photo.file_id);
                          }
                          toast.success("Cover photo set!");
                        }}
                        className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg backdrop-blur-md transition shadow-md ${
                          isCover
                            ? "bg-amber-400 text-slate-950 font-bold"
                            : "bg-slate-900/70 text-slate-400 hover:text-amber-300"
                        }`}
                        title={isCover ? "Album Cover Photo" : "Set as Album Cover"}
                      >
                        <Star className={`w-3.5 h-3.5 ${isCover ? "fill-slate-950" : ""}`} />
                      </button>

                      {/* Bottom Title bar */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-2 pt-4">
                        <p className="text-[10px] font-bold text-white truncate">Photo #{idx + 1}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {creating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving Album...
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4" /> Convert & Host Album {selectedPhotoIds.size > 0 ? `(${selectedPhotoIds.size} Photos)` : ""}
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
                  <th className="p-3.5">Selected Photos</th>
                  <th className="p-3.5">Views</th>
                  <th className="p-3.5">Downloads</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {folders.map((f) => (
                  <tr key={f.id || f.slug} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        {f.title}
                        {f.cover_file_id && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 fill-amber-300" /> Cover
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-amber-400/80 font-mono">/photos/{f.slug}</div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-bold text-amber-400">
                        <ImageIcon className="w-3.5 h-3.5" /> {f.file_count || f.files?.length || 0} Photos
                      </span>
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
                        onClick={() => openEditModal(f)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        title="Edit album & select photos to show"
                      >
                        <Edit3 className="w-3 h-3" /> Select Photos
                      </button>

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
                        className="px-2.5 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500 text-blue-300 hover:text-white text-[11px] font-bold transition inline-flex items-center gap-1"
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

      {/* Edit & Photo Selection Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                  Manage Photos & Album: {editingFolder?.title}
                </h3>
                <p className="text-xs text-slate-400">Toggle photos to show or hide, select cover photo, or add photos from extra Google Drive folders.</p>
              </div>

              <button
                onClick={() => setEditModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Album Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Google Drive Link(s)</label>
                  <input
                    type="text"
                    value={editDriveUrl}
                    onChange={(e) => setEditDriveUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Album Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Add Extra Folder Section */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4" /> Add Photos from Another Google Drive Folder or Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://drive.google.com/drive/folders/1abcxyz... (Paste new folder link to merge photos)"
                    value={extraFolderUrl}
                    onChange={(e) => setExtraFolderUrl(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAppendFolderInModal}
                    disabled={appendingFolder}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {appendingFolder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                    Fetch & Append Folder
                  </button>
                </div>
              </div>

              {/* Photo Selection Grid in Modal */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                    Selected Photos: {editSelectedIds.size} of {editPhotos.length}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSelectedIds(new Set(editPhotos.map((f) => f.file_id)))}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold border border-emerald-500/20 transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSelectedIds(new Set())}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold border border-rose-500/20 transition cursor-pointer"
                    >
                      Deselect All
                    </button>
                    <button
                      type="button"
                      onClick={handleResyncInModal}
                      disabled={syncingSlug === editingFolder?.slug}
                      className="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 text-xs font-bold border border-amber-400/20 transition cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${syncingSlug === editingFolder?.slug ? "animate-spin" : ""}`} /> Re-sync Drive
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1 scrollbar-thin">
                  {editPhotos.map((photo, idx) => {
                    const isSelected = editSelectedIds.has(photo.file_id);
                    const isCover = editCoverId === photo.file_id;

                    return (
                      <div
                        key={photo.file_id}
                        onClick={() => toggleEditSelectPhoto(photo.file_id)}
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition group shadow-md ${
                          isSelected
                            ? "border-emerald-400 ring-2 ring-emerald-400/30"
                            : "border-slate-800 opacity-40 hover:opacity-75"
                        }`}
                      >
                        <img
                          src={`https://lh3.googleusercontent.com/d/${photo.file_id}=w500`}
                          alt={`Photo #${idx + 1}`}
                          className="w-full h-full object-cover bg-slate-950"
                          loading="lazy"
                        />

                        <div className="absolute top-2 left-2 z-10">
                          {isSelected ? (
                            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-lg bg-slate-900/80 text-slate-400 flex items-center justify-center border border-slate-700">
                              <Plus className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditCoverId(photo.file_id);
                            if (!editSelectedIds.has(photo.file_id)) {
                              toggleEditSelectPhoto(photo.file_id);
                            }
                            toast.success("Cover photo set!");
                          }}
                          className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg backdrop-blur-md transition shadow-md ${
                            isCover
                              ? "bg-amber-400 text-slate-950 font-bold"
                              : "bg-slate-900/70 text-slate-400 hover:text-amber-300"
                          }`}
                          title={isCover ? "Album Cover Photo" : "Set as Album Cover"}
                        >
                          <Star className={`w-3.5 h-3.5 ${isCover ? "fill-slate-950" : ""}`} />
                        </button>

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-2 pt-4">
                          <p className="text-[10px] font-bold text-white truncate">Photo #{idx + 1}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateFolder}
                disabled={updating}
                className="px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save Changes ({editSelectedIds.size} Photos)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
