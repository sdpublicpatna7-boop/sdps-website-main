import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  FolderPlus, Folder, Sparkles, Copy, ExternalLink, RefreshCw, Trash2, Download,
  AlertCircle, Link as LinkIcon, Image as ImageIcon, Layers, Eye, TrendingUp,
  Award, BarChart3, Share2, CheckSquare, Square, Star, Check, Plus, X, Edit3, SlidersHorizontal,
  Flame, Smartphone, Monitor, Tablet, Calendar, Filter, Search, FileSpreadsheet, Crown,
  ArrowUpRight, Activity, Clock, PieChart, ChevronDown, CheckCircle2
} from "lucide-react";

export default function AdminGDriveSharing() {
  const [activeTab, setActiveTab] = useState("manager"); // "manager" | "analytics"
  const [folders, setFolders] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [syncingSlug, setSyncingSlug] = useState(null);

  // Analytics Filters State
  const [timeRange, setTimeRange] = useState("all"); // "all" | "30d" | "7d" | "today"
  const [selectedAlbumFilter, setSelectedAlbumFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [leaderboardViewMode, setLeaderboardViewMode] = useState("grid"); // "grid" | "table"

  // Per-Album Photo Inspector Modal
  const [inspectAlbumModal, setInspectAlbumModal] = useState(null);
  const [inspectPhotosLoading, setInspectPhotosLoading] = useState(false);
  const [inspectPhotosData, setInspectPhotosData] = useState(null);

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

  const loadData = (time = timeRange, album = selectedAlbumFilter, search = searchQuery) => {
    setLoading(true);
    let analyticsUrl = `/admin/gdrive-folders/analytics/deep?time_range=${time}`;
    if (album) analyticsUrl += `&slug=${encodeURIComponent(album)}`;
    if (search) analyticsUrl += `&search=${encodeURIComponent(search)}`;

    Promise.all([
      api.get("/admin/gdrive-folders").catch(() => ({ data: [] })),
      api.get(analyticsUrl).catch(() => ({ data: null }))
    ])
      .then(([foldersRes, analyticsRes]) => {
        setFolders(foldersRes.data || []);
        setAnalytics(analyticsRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData(timeRange, selectedAlbumFilter, searchQuery);
  }, [timeRange, selectedAlbumFilter]);

  const openInspectAlbum = async (album) => {
    setInspectAlbumModal(album);
    setInspectPhotosLoading(true);
    try {
      const res = await api.get(`/admin/gdrive-folders/${album.slug || album.id}/photos-analytics`);
      setInspectPhotosData(res.data);
    } catch (e) {
      toast.error("Failed to load album photo analytics");
    } finally {
      setInspectPhotosLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!analytics?.top_photos || analytics.top_photos.length === 0) {
      toast.error("No download data available to export");
      return;
    }
    const headers = ["Rank", "Photo Title", "Album Title", "Album Slug", "Downloads", "Last Downloaded", "Google Drive File ID"];
    const rows = analytics.top_photos.map((p) => [
      p.rank,
      `"${(p.title || "").replace(/"/g, '""')}"`,
      `"${(p.folder_title || "").replace(/"/g, '""')}"`,
      p.folder_slug,
      p.downloads,
      p.last_downloaded_at ? new Date(p.last_downloaded_at).toLocaleString() : "Never",
      p.file_id
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sdps-photo-downloads-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Photo download report CSV downloaded!");
  };

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
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans text-slate-800 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> High-Performance Media Drive
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline tracking-tight">
            Google Drive Photo Sharing & Deep Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-medium">
            Host high-res photo albums from Google Drive, track exactly which specific photos get downloaded, inspect per-photo popularity, and analyze student/parent engagement.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(timeRange, selectedAlbumFilter, searchQuery)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-2 border border-slate-300 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh Data
          </button>
        </div>
      </div>

      {/* Top View Switcher Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-200/80 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("manager")}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === "manager"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" /> Album Manager & Picker ({folders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
            activeTab === "analytics"
              ? "bg-white text-blue-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-500" /> Deep Photo Download Analytics
          {analytics?.total_downloads > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
              🔥 {analytics.total_downloads}
            </span>
          )}
        </button>
      </div>

      {/* ================= TAB 1: ALBUM MANAGER ================= */}
      {activeTab === "manager" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Quick KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Album Views</span>
                <div className="text-3xl font-black text-slate-900 font-headline">
                  {analytics?.total_views || 0}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Live Visitor Views
                </span>
              </div>
              <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
                <Eye className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Photo Downloads</span>
                <div className="text-3xl font-black text-amber-600 font-headline">
                  {analytics?.total_downloads || 0}
                </div>
                <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                  <Award className="w-3 h-3" /> Original Full-Res Exports
                </span>
              </div>
              <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                <Download className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Albums</span>
                <div className="text-3xl font-black text-slate-900 font-headline">
                  {folders.length}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  Hosted on custom domain
                </span>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Folder className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Main Creation & Photo Selection Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-blue-600" /> Create Photo Album with Custom Selection
              </h2>
              <p className="text-xs text-slate-500">
                Paste Google Drive links (one or multiple folders), extract photo previews, select which photos to show, choose a cover photo, and host instantly.
              </p>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Folder / Album Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Annual Sports Day 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Custom URL Slug (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. sports-day-2026"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Google Drive Folder Link(s) * (Supports multiple links separated by space/newline)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://drive.google.com/drive/folders/1abcxyz... https://drive.google.com/drive/folders/2def..."
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 transition"
                  />
                  <button
                    type="button"
                    onClick={handleExtractPhotos}
                    disabled={extracting}
                    className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {extracting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    Fetch Photos
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Additional Photo Links (Optional - one per line)</label>
                <textarea
                  rows={2}
                  placeholder="https://drive.google.com/file/d/1abc...&#10;https://drive.google.com/file/d/2xyz..."
                  value={manualUrls}
                  onChange={(e) => setManualUrls(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 transition resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Album Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of the event or photographs..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 transition resize-none"
                />
              </div>

              {/* Photo Selection Grid */}
              {extractedPhotos.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-900">
                        Select Photos to Include ({selectedPhotoIds.size} of {extractedPhotos.length} selected)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Click on photos to select or unselect. Click the Star icon to set the album cover photo.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllPhotos}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllPhotos}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-96 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    {extractedPhotos.map((photo, idx) => {
                      const isSelected = selectedPhotoIds.has(photo.file_id);
                      const isCover = coverFileId === photo.file_id;

                      return (
                        <div
                          key={photo.file_id}
                          onClick={() => toggleSelectPhoto(photo.file_id)}
                          className={`relative group rounded-xl overflow-hidden aspect-square border-2 cursor-pointer transition ${
                            isSelected
                              ? "border-emerald-500 ring-2 ring-emerald-500/20"
                              : "border-slate-200 opacity-40 hover:opacity-75"
                          }`}
                        >
                          <img
                            src={`https://lh3.googleusercontent.com/d/${photo.file_id}=w500`}
                            alt={`Photo #${idx + 1}`}
                            className="w-full h-full object-cover bg-slate-100"
                            loading="lazy"
                          />

                          <div className="absolute top-2 left-2 z-10">
                            {isSelected ? (
                              <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md">
                                <Check className="w-4 h-4 stroke-[3]" />
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-lg bg-white/90 text-slate-500 flex items-center justify-center border border-slate-300">
                                <Plus className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </div>

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
                            className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg backdrop-blur-md transition shadow-sm ${
                              isCover
                                ? "bg-amber-400 text-slate-950 font-bold"
                                : "bg-white/80 text-slate-600 hover:text-amber-600"
                            }`}
                            title={isCover ? "Album Cover Photo" : "Set as Album Cover"}
                          >
                            <Star className={`w-3.5 h-3.5 ${isCover ? "fill-slate-950" : ""}`} />
                          </button>

                          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent p-2 pt-4">
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
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs transition flex items-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" /> Hosted Photo Albums ({folders.length})
              </h2>
            </div>

            {folders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No photo folders created yet. Use the form above to add your first folder.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">Album Title & Slug</th>
                      <th className="p-3.5">Selected Photos</th>
                      <th className="p-3.5">Views</th>
                      <th className="p-3.5">Downloads</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {folders.map((f) => (
                      <tr key={f.id || f.slug} className="hover:bg-slate-50 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            {f.title}
                            {f.cover_file_id && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-amber-700" /> Cover
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-blue-600 font-mono">/photos/{f.slug}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-600" /> {f.file_count || f.files?.length || 0} Photos
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-indigo-600">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" /> {f.views || 0}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-amber-600">
                          <span className="flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" /> {f.downloads || 0}
                          </span>
                        </td>
                        <td className="p-3.5 text-right space-x-2">
                          <button
                            onClick={() => openInspectAlbum(f)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Inspect photo-by-photo downloads for this album"
                          >
                            <BarChart3 className="w-3 h-3 text-amber-600" /> Photo Analytics
                          </button>

                          <button
                            onClick={() => openEditModal(f)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Edit album & select photos to show"
                          >
                            <Edit3 className="w-3 h-3" /> Select Photos
                          </button>

                          <button
                            onClick={() => copyShareLink(f.slug)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-300 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Copy WhatsApp share link"
                          >
                            <Share2 className="w-3 h-3 text-blue-600" /> Share Link
                          </button>

                          <button
                            onClick={() => handleResync(f.slug)}
                            disabled={syncingSlug === f.slug}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold border border-slate-300 transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            title="Re-sync folder with Google Drive"
                          >
                            <RefreshCw className={`w-3 h-3 ${syncingSlug === f.slug ? "animate-spin" : ""}`} /> Sync
                          </button>

                          <a
                            href={`/photos/${f.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200 transition inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </a>

                          <button
                            onClick={() => handleDelete(f.slug)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200 transition inline-flex items-center gap-1 cursor-pointer"
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
      )}

      {/* ================= TAB 2: DEEP PHOTO DOWNLOAD ANALYTICS ================= */}
      {activeTab === "analytics" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Deep KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Downloads */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Downloads</span>
                <span className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                  <Flame className="w-5 h-5" />
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 font-headline">
                {analytics?.total_downloads || 0}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  +{analytics?.downloads_today || 0} Today
                </span>
                <span className="text-slate-500 font-medium">
                  {analytics?.downloads_7d || 0} this week
                </span>
              </div>
            </div>

            {/* Unique Photos Downloaded */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unique Photos Downloaded</span>
                <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                  <ImageIcon className="w-5 h-5" />
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 font-headline">
                {analytics?.unique_photos_downloaded || 0}
                <span className="text-sm font-bold text-slate-400 ml-1.5">/ {analytics?.total_hosted_photos || 0}</span>
              </div>
              <div className="text-xs font-semibold text-blue-700">
                {analytics?.unique_download_pct || 0}% of all album photos exported
              </div>
            </div>

            {/* Top Performing Photo */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Top Photo of All Time</span>
                <span className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl border border-yellow-200">
                  <Crown className="w-5 h-5" />
                </span>
              </div>
              {analytics?.top_overall_photo ? (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={analytics.top_overall_photo.thumb_url}
                    alt="Top Photo"
                    className="w-12 h-12 rounded-xl object-cover border border-amber-300 shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 truncate">
                      {analytics.top_overall_photo.title}
                    </div>
                    <div className="text-xs font-bold text-amber-700">
                      🔥 {analytics.top_overall_photo.downloads} downloads · {analytics.top_overall_photo.folder_title}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 font-medium pt-1">No downloads tracked yet</div>
              )}
            </div>

            {/* Mobile vs Desktop Split */}
            <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Device Breakdown</span>
                <span className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
                  <Smartphone className="w-5 h-5" />
                </span>
              </div>
              <div className="text-3xl font-black text-slate-900 font-headline">
                {analytics?.device_breakdown?.mobile_pct || 0}%
                <span className="text-sm font-bold text-slate-400 ml-1.5">Mobile</span>
              </div>
              <div className="text-xs font-medium text-slate-500 flex items-center gap-2">
                <span>💻 {analytics?.device_breakdown?.desktop_pct || 0}% Desktop</span>
                <span>📱 {analytics?.device_breakdown?.tablet_pct || 0}% Tablet</span>
              </div>
            </div>
          </div>

          {/* Filter, Search & Export Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Time Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl w-fit">
              {[
                { id: "all", label: "All Time" },
                { id: "30d", label: "Last 30 Days" },
                { id: "7d", label: "Last 7 Days" },
                { id: "today", label: "Today" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTimeRange(t.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    timeRange === t.id
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Album Selector & Search */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <select
                  value={selectedAlbumFilter}
                  onChange={(e) => setSelectedAlbumFilter(e.target.value)}
                  className="px-3.5 py-2 pr-8 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-600 cursor-pointer appearance-none"
                >
                  <option value="">📁 All Hosted Albums ({folders.length})</option>
                  {folders.map((f) => (
                    <option key={f.id || f.slug} value={f.slug}>
                      {f.title} ({f.downloads || 0} downloads)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search photo name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    loadData(timeRange, selectedAlbumFilter, e.target.value);
                  }}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-blue-600"
                />
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLeaderboardViewMode("grid")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    leaderboardViewMode === "grid" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                  title="Grid View"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardViewMode("table")}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    leaderboardViewMode === "table" ? "bg-white text-blue-600 shadow-xs" : "text-slate-500"
                  }`}
                  title="Table View"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={exportToCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Export CSV Report
              </button>
            </div>
          </div>

          {/* ================= LEADERBOARD: TOP DOWNLOADED SPECIFIC PHOTOS ================= */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" /> Photo Download Leaderboard
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing exact photos downloaded by students, parents, and visitors ranked from highest to lowest.
                </p>
              </div>

              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 self-start sm:self-auto">
                {analytics?.top_photos?.length || 0} Downloaded Photos Recorded
              </span>
            </div>

            {(!analytics?.top_photos || analytics.top_photos.length === 0) ? (
              <div className="text-center py-16 text-slate-500 space-y-2">
                <ImageIcon className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="font-bold text-sm text-slate-700">No Photo Downloads Tracked Yet</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When visitors view and download photos from your albums, each individual photo download will appear here with live statistics.
                </p>
              </div>
            ) : leaderboardViewMode === "grid" ? (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4.5">
                {analytics.top_photos.map((photo) => {
                  const isTop1 = photo.rank === 1;
                  const isTop2 = photo.rank === 2;
                  const isTop3 = photo.rank === 3;

                  return (
                    <div
                      key={photo.file_id}
                      className={`relative rounded-2xl overflow-hidden border bg-white shadow-sm hover:shadow-md transition group flex flex-col ${
                        isTop1
                          ? "border-amber-400 ring-2 ring-amber-400/20"
                          : isTop2
                          ? "border-slate-300"
                          : isTop3
                          ? "border-amber-200"
                          : "border-slate-200"
                      }`}
                    >
                      {/* Photo Image Preview */}
                      <div className="relative aspect-4/3 overflow-hidden bg-slate-100">
                        <img
                          src={photo.thumb_url}
                          alt={photo.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />

                        {/* Rank Badge */}
                        <div className="absolute top-2.5 left-2.5 z-10">
                          {isTop1 ? (
                            <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-md flex items-center gap-1 border border-yellow-200">
                              <Crown className="w-3.5 h-3.5 fill-slate-950" /> #1 Top Photo
                            </span>
                          ) : isTop2 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-white font-black text-xs shadow-md flex items-center gap-1">
                              🥈 #2
                            </span>
                          ) : isTop3 ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-700 text-white font-black text-xs shadow-md flex items-center gap-1">
                              🥉 #3
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-900/80 text-white font-bold text-xs backdrop-blur-sm shadow-sm">
                              #{photo.rank}
                            </span>
                          )}
                        </div>

                        {/* Download Count Pill */}
                        <div className="absolute top-2.5 right-2.5 z-10">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-amber-300 font-black text-xs backdrop-blur-md shadow-md flex items-center gap-1 border border-white/10">
                            <Download className="w-3 h-3 text-amber-400" /> {photo.downloads}
                          </span>
                        </div>

                        {/* Quick View Button */}
                        <a
                          href={photo.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute bottom-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition p-2 bg-white/95 text-slate-900 rounded-xl shadow-md hover:bg-white text-xs font-bold flex items-center gap-1"
                          title="Open Original High-Res File"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                        <div className="space-y-1">
                          <div className="font-bold text-slate-900 text-xs truncate" title={photo.title}>
                            {photo.title}
                          </div>
                          <a
                            href={`/photos/${photo.folder_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 font-semibold hover:underline block truncate"
                            title={photo.folder_title}
                          >
                            📁 {photo.folder_title}
                          </a>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="font-bold text-emerald-600">
                            {photo.downloads} download{photo.downloads === 1 ? "" : "s"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {photo.last_downloaded_at ? new Date(photo.last_downloaded_at).toLocaleDateString() : "Lifetime"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* TABLE VIEW */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Photo Preview</th>
                      <th className="p-3">Photo Title</th>
                      <th className="p-3">Album</th>
                      <th className="p-3 text-center">Downloads</th>
                      <th className="p-3">Last Downloaded</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.top_photos.map((photo) => (
                      <tr key={photo.file_id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-black text-slate-900 text-sm">
                          {photo.rank === 1 ? (
                            <span className="text-amber-500 font-black flex items-center gap-1">👑 #1</span>
                          ) : photo.rank === 2 ? (
                            <span className="text-slate-600 font-bold">🥈 #2</span>
                          ) : photo.rank === 3 ? (
                            <span className="text-amber-700 font-bold">🥉 #3</span>
                          ) : (
                            `#${photo.rank}`
                          )}
                        </td>
                        <td className="p-3">
                          <img
                            src={photo.thumb_url}
                            alt={photo.title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-slate-100"
                            loading="lazy"
                          />
                        </td>
                        <td className="p-3 font-bold text-slate-900 max-w-[200px] truncate">
                          {photo.title}
                        </td>
                        <td className="p-3">
                          <a
                            href={`/photos/${photo.folder_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline font-semibold"
                          >
                            {photo.folder_title}
                          </a>
                        </td>
                        <td className="p-3 text-center font-black text-amber-600 text-sm">
                          🔥 {photo.downloads}
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {photo.last_downloaded_at ? new Date(photo.last_downloaded_at).toLocaleString() : "—"}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <a
                            href={photo.download_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-200 hover:bg-blue-100 transition inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Original
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ================= LIVE RECENT DOWNLOADS ACTIVITY STREAM ================= */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500 animate-pulse" /> Live Recent Downloads Stream
                </h3>
                <p className="text-xs text-slate-500">Real-time log of the latest 50 photo download events across all albums.</p>
              </div>
            </div>

            {(!analytics?.recent_downloads || analytics.recent_downloads.length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No recent download activity recorded.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50 z-10">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Photo Preview</th>
                      <th className="p-3">Photo Title</th>
                      <th className="p-3">Album Title</th>
                      <th className="p-3">Device / Platform</th>
                      <th className="p-3">Browser</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.recent_downloads.map((log) => (
                      <tr key={log.id || Math.random()} className="hover:bg-slate-50 transition">
                        <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"}
                          <div className="text-[10px] text-slate-400">
                            {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : ""}
                          </div>
                        </td>
                        <td className="p-3">
                          {log.thumb_url ? (
                            <img
                              src={log.thumb_url}
                              alt="Log Thumb"
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 bg-slate-100"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}
                        </td>
                        <td className="p-3 font-bold text-slate-900 max-w-[180px] truncate">
                          {log.photo_title}
                        </td>
                        <td className="p-3">
                          <a
                            href={`/photos/${log.folder_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline font-semibold"
                          >
                            {log.folder_title}
                          </a>
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200">
                            {log.device_type === "Mobile" ? <Smartphone className="w-3 h-3 text-blue-500" /> : <Monitor className="w-3 h-3 text-slate-500" />}
                            {log.os || "Device"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 text-[11px]">
                          {log.browser}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= PER-ALBUM PHOTO ANALYTICS INSPECTOR MODAL ================= */}
      {inspectAlbumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-5xl w-full max-h-[92vh] overflow-y-auto space-y-6 shadow-2xl relative text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                  <BarChart3 className="w-3 h-3" /> Album Photo Analytics
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  {inspectAlbumModal.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect download counts for every individual photo in this album.
                </p>
              </div>

              <button
                onClick={() => setInspectAlbumModal(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Album Summary Stat Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Total Photos</span>
                <span className="text-base font-black text-slate-900">{inspectPhotosData?.total_files || inspectAlbumModal.file_count || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Album Views</span>
                <span className="text-base font-black text-indigo-600">{inspectPhotosData?.total_views || inspectAlbumModal.views || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Total Downloads</span>
                <span className="text-base font-black text-amber-600">🔥 {inspectPhotosData?.total_downloads || inspectAlbumModal.downloads || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Public Link</span>
                <a
                  href={`/photos/${inspectAlbumModal.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-0.5"
                >
                  View Album ↗
                </a>
              </div>
            </div>

            {inspectPhotosLoading ? (
              <div className="text-center py-16 text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                Loading photo breakdown...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    Photos Ranked by Downloads ({inspectPhotosData?.photos?.length || 0})
                  </h4>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {(inspectPhotosData?.photos || []).map((p) => {
                    const hasDownloads = p.downloads > 0;

                    return (
                      <div
                        key={p.file_id}
                        className={`rounded-xl overflow-hidden border bg-white shadow-2xs flex flex-col justify-between ${
                          hasDownloads ? "border-amber-300 ring-1 ring-amber-300/30" : "border-slate-200"
                        }`}
                      >
                        <div className="relative aspect-square bg-slate-100">
                          <img
                            src={p.thumb_url}
                            alt={p.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-black shadow-sm ${
                            hasDownloads ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-white"
                          }`}>
                            #{p.rank}
                          </span>

                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-black shadow-sm ${
                            hasDownloads ? "bg-emerald-600 text-white" : "bg-slate-900/80 text-slate-400"
                          }`}>
                            {hasDownloads ? `🔥 ${p.downloads}` : "0 dl"}
                          </span>
                        </div>

                        <div className="p-3 space-y-1">
                          <div className="font-bold text-slate-900 text-xs truncate">
                            {p.title}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>{p.downloads} download{p.downloads === 1 ? "" : "s"}</span>
                            <a
                              href={p.download_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline font-bold"
                            >
                              Download ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit & Photo Selection Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl relative text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-blue-600" />
                  Manage Photos & Album: {editingFolder?.title}
                </h3>
                <p className="text-xs text-slate-500">Toggle photos to show or hide, select cover photo, or add photos from extra Google Drive folders.</p>
              </div>

              <button
                onClick={() => setEditModalOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Album Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Google Drive Link(s)</label>
                  <input
                    type="text"
                    value={editDriveUrl}
                    onChange={(e) => setEditDriveUrl(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Album Description</label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              {/* Add Extra Folder Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <FolderPlus className="w-4 h-4" /> Add Photos from Another Google Drive Folder or Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://drive.google.com/drive/folders/1abcxyz... (Paste new folder link to merge photos)"
                    value={extraFolderUrl}
                    onChange={(e) => setExtraFolderUrl(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={handleAppendFolderInModal}
                    disabled={appendingFolder}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {appendingFolder ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
                    Fetch & Append Folder
                  </button>
                </div>
              </div>

              {/* Photo Selection Grid in Modal */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                    Selected Photos: {editSelectedIds.size} of {editPhotos.length}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditSelectedIds(new Set(editPhotos.map((f) => f.file_id)))}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition cursor-pointer"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditSelectedIds(new Set())}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold border border-rose-200 transition cursor-pointer"
                    >
                      Deselect All
                    </button>
                    <button
                      type="button"
                      onClick={handleResyncInModal}
                      disabled={syncingSlug === editingFolder?.slug}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 transition cursor-pointer flex items-center gap-1"
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
                        className={`relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition group shadow-xs ${
                          isSelected
                            ? "border-emerald-500 ring-2 ring-emerald-500/20"
                            : "border-slate-200 opacity-40 hover:opacity-75"
                        }`}
                      >
                        <img
                          src={`https://lh3.googleusercontent.com/d/${photo.file_id}=w500`}
                          alt={`Photo #${idx + 1}`}
                          className="w-full h-full object-cover bg-slate-100"
                          loading="lazy"
                        />

                        <div className="absolute top-2 left-2 z-10">
                          {isSelected ? (
                            <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="w-6 h-6 rounded-lg bg-white/90 text-slate-500 flex items-center justify-center border border-slate-300">
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
                          className={`absolute top-2 right-2 z-10 p-1.5 rounded-lg backdrop-blur-md transition shadow-sm ${
                            isCover
                              ? "bg-amber-400 text-slate-950 font-bold"
                              : "bg-white/80 text-slate-600 hover:text-amber-600"
                          }`}
                          title={isCover ? "Album Cover Photo" : "Set as Album Cover"}
                        >
                          <Star className={`w-3.5 h-3.5 ${isCover ? "fill-slate-950" : ""}`} />
                        </button>

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/90 via-slate-900/60 to-transparent p-2 pt-4">
                          <p className="text-[10px] font-bold text-white truncate">Photo #{idx + 1}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdateFolder}
                disabled={updating}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
