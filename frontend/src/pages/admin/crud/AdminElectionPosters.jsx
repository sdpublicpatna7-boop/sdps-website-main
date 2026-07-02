import { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "sonner";
import {
  Upload, Plus, Trash2, Edit, X, Save, Loader2, Sparkles,
  Image as ImageIcon, Check, FileImage, Layers, Search, Filter, AlertTriangle
} from "lucide-react";
import api from "@/lib/api";
import { useAdminList, uploadImage, fullUrl } from "@/lib/admin";

export function AdminElectionPosters() {
  const { items: posters, loading, reload } = useAdminList("/admin/election-posters");
  
  // Search & Filter state
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  // Single Modal State
  const [singleOpen, setSingleOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null means creating
  const [form, setForm] = useState({
    candidate_name: "",
    position: "",
    year: new Date().getFullYear().toString(),
    poster_url: "",
    bio: ""
  });
  const [singleSaving, setSingleSaving] = useState(false);
  const singleFileRef = useRef(null);

  // Bulk Modal State
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPosition, setBulkPosition] = useState("");
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear().toString());
  const [bulkFiles, setBulkFiles] = useState([]); // [{ file, tempId, candidate_name, bio, status: 'idle'|'uploading'|'success'|'error', progress: 0 }]
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkFileRef = useRef(null);

  // Extract unique positions and years for filters
  const positions = Array.from(new Set(posters.map(p => p.position).filter(Boolean)));
  const years = Array.from(new Set(posters.map(p => p.year).filter(Boolean)));

  const handleOpenSingle = (poster = null) => {
    if (poster) {
      setEditing(poster);
      setForm({
        candidate_name: poster.candidate_name,
        position: poster.position,
        year: poster.year,
        poster_url: poster.poster_url,
        bio: poster.bio || ""
      });
    } else {
      setEditing(null);
      setForm({
        candidate_name: "",
        position: "",
        year: new Date().getFullYear().toString(),
        poster_url: "",
        bio: ""
      });
    }
    setSingleOpen(true);
  };

  const handleSingleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setSingleSaving(true);
    try {
      const res = await uploadImage(file, "posters");
      setForm(prev => ({ ...prev, poster_url: res.url }));
      toast.success("Poster image uploaded successfully!");
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setSingleSaving(false);
    }
  };

  const handleSaveSingle = async (e) => {
    e.preventDefault();
    if (!form.candidate_name.trim() || !form.position.trim() || !form.poster_url) {
      toast.error("Name, Position and Poster Image are required.");
      return;
    }

    setSingleSaving(true);
    try {
      const payload = {
        candidate_name: form.candidate_name.trim(),
        position: form.position.trim(),
        year: form.year.trim(),
        poster_url: form.poster_url,
        bio: form.bio.trim() || null
      };

      if (editing) {
        await api.put(`/admin/election-posters/${editing.id}`, payload);
        toast.success("Poster updated successfully!");
      } else {
        await api.post("/admin/election-posters", payload);
        toast.success("Poster created successfully!");
      }
      setSingleOpen(false);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save poster");
    } finally {
      setSingleSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this poster?")) return;
    try {
      await api.delete(`/admin/election-posters/${id}`);
      toast.success("Poster deleted successfully");
      reload();
    } catch (err) {
      toast.error("Failed to delete poster");
    }
  };

  // Bulk Upload Functions
  const handleBulkFilesSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.map((file, idx) => {
      // Guess candidate name from file name (remove extension, replace dashes/underscores)
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cleanName = nameWithoutExt
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());

      return {
        file,
        tempId: `${Date.now()}-${idx}-${Math.random()}`,
        candidate_name: cleanName,
        bio: "",
        status: "idle",
        progress: 0
      };
    });

    setBulkFiles(prev => [...prev, ...newFiles]);
  };

  const removeBulkFile = (tempId) => {
    setBulkFiles(prev => prev.filter(f => f.tempId !== tempId));
  };

  const updateBulkFileField = (tempId, field, value) => {
    setBulkFiles(prev => prev.map(f => f.tempId === tempId ? { ...f, [field]: value } : f));
  };

  const handleStartBulkUpload = async () => {
    if (bulkFiles.length === 0) {
      toast.error("Please add at least one poster image file.");
      return;
    }
    if (!bulkPosition.trim()) {
      toast.error("Please specify the shared Position for these candidates.");
      return;
    }

    setBulkUploading(true);
    toast.info(`Starting batch upload of ${bulkFiles.length} posters...`);

    // Process files sequentially to avoid server bottleneck and track status cleanly
    for (let i = 0; i < bulkFiles.length; i++) {
      const current = bulkFiles[i];
      if (current.status === "success") continue; // Skip already uploaded

      setBulkFiles(prev => prev.map(f => f.tempId === current.tempId ? { ...f, status: "uploading" } : f));

      try {
        // Step 1: Upload the file
        const uploadRes = await uploadImage(current.file, "posters");
        
        // Step 2: Create the database entry
        const payload = {
          candidate_name: current.candidate_name.trim() || "Candidate",
          position: bulkPosition.trim(),
          year: bulkYear.trim(),
          poster_url: uploadRes.url,
          bio: current.bio.trim() || null
        };

        await api.post("/admin/election-posters", payload);

        setBulkFiles(prev => prev.map(f => f.tempId === current.tempId ? { ...f, status: "success" } : f));
      } catch (err) {
        console.error(err);
        setBulkFiles(prev => prev.map(f => f.tempId === current.tempId ? { ...f, status: "error" } : f));
      }
    }

    setBulkUploading(false);
    toast.success("Batch upload process completed!");
    reload();
  };

  const handleClearBulk = () => {
    setBulkFiles([]);
    setBulkPosition("");
    setBulkYear(new Date().getFullYear().toString());
  };

  // Filter items
  const filtered = posters.filter(p => {
    const matchesSearch = p.candidate_name.toLowerCase().includes(search.toLowerCase()) || 
                          (p.bio && p.bio.toLowerCase().includes(search.toLowerCase()));
    const matchesPosition = positionFilter === "all" || p.position === positionFilter;
    const matchesYear = yearFilter === "all" || p.year === yearFilter;
    return matchesSearch && matchesPosition && matchesYear;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Premium Header Card */}
      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/15 shrink-0">
            <FileImage className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Pre-Election Posters</h1>
            <p className="text-sm font-semibold text-slate-500">Manage campaign posters and candidate slogans for student council elections</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { handleClearBulk(); setBulkOpen(true); }}
            className="flex items-center gap-2 px-4.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs active:scale-95 transition-all shadow-sm bg-white"
          >
            <Upload className="w-4.5 h-4.5 text-slate-500" /> Bulk Upload Posters
          </button>
          <button
            onClick={() => handleOpenSingle()}
            className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-xs hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" /> Add Single Poster
          </button>
        </div>
      </div>

      {/* Filter Roster Bar */}
      <div className="bg-white border border-slate-200/60 p-4 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.005)] flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="relative w-full md:max-w-xs shadow-inner rounded-xl bg-slate-50 border border-slate-200/50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate name or slogan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-transparent text-slate-800 focus:outline-none font-semibold text-xs h-10"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Filters:</span>
          </div>

          <select
            value={positionFilter}
            onChange={e => setPositionFilter(e.target.value)}
            className="h-10 border border-slate-200/80 rounded-xl px-3 bg-slate-50/50 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Positions</option>
            {positions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            className="h-10 border border-slate-200/80 rounded-xl px-3 bg-slate-50/50 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Grid of Posters */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center text-slate-400 space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-350 shadow-inner">
            <ImageIcon className="w-5.5 h-5.5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">No posters found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the search/filters or upload new candidate posters.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map(poster => (
            <div
              key={poster.id}
              className="bg-white border border-slate-200/60 rounded-3xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:shadow-md hover:scale-[1.01] transition-all duration-300 flex flex-col group relative"
            >
              {/* Image box */}
              <div className="aspect-[3/4] bg-slate-100 border-b border-slate-150 overflow-hidden relative">
                {poster.poster_url ? (
                  <img
                    src={fullUrl(poster.poster_url)}
                    alt={poster.candidate_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                    <ImageIcon className="w-8 h-8 opacity-40" />
                    <span className="text-[10px] font-bold">No Poster Image</span>
                  </div>
                )}
                {/* Year tag */}
                <div className="absolute top-3 left-3 px-2.5 py-1 bg-slate-900/85 backdrop-blur-xs text-white rounded-lg text-[9px] font-extrabold tracking-wider">
                  {poster.year}
                </div>
              </div>

              {/* Bio/Info content */}
              <div className="p-4.5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-100/50 text-blue-600 text-[10px] font-extrabold uppercase tracking-wider">
                    {poster.position}
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-sm truncate pt-1">{poster.candidate_name}</h3>
                  {poster.bio && (
                    <p className="text-[11px] font-semibold text-slate-400 line-clamp-2 leading-relaxed">
                      "{poster.bio}"
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => handleOpenSingle(poster)}
                    className="flex-1 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                  >
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(poster.id)}
                    className="p-1.5 border border-red-150 hover:bg-red-50 text-red-500 rounded-lg transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Single Modal */}
      {singleOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full mx-4 p-6 border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editing ? "Edit Campaign Poster" : "Create Campaign Poster"}
              </h3>
              <button onClick={() => setSingleOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition">
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveSingle} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Position / Post</label>
                  <input
                    type="text"
                    placeholder="e.g. School Captain"
                    value={form.position}
                    onChange={e => setForm(s => ({ ...s, position: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-semibold text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Election Year</label>
                  <input
                    type="text"
                    placeholder="2026"
                    value={form.year}
                    onChange={e => setForm(s => ({ ...s, year: e.target.value }))}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-semibold text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Candidate Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rohan Sharma"
                  value={form.candidate_name}
                  onChange={e => setForm(s => ({ ...s, candidate_name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-semibold text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Campaign Slogan / Slogans</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Vote for a better tomorrow!"
                  value={form.bio}
                  onChange={e => setForm(s => ({ ...s, bio: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-semibold text-xs resize-none"
                />
              </div>

              {/* Upload field */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Poster Image</label>
                <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
                  {form.poster_url ? (
                    <div className="relative w-28 aspect-[3/4] rounded-lg overflow-hidden border shadow-sm">
                      <img src={fullUrl(form.poster_url)} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setForm(s => ({ ...s, poster_url: "" }))}
                        className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <button
                        type="button"
                        onClick={() => singleFileRef.current?.click()}
                        className="px-3.5 py-1.5 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition active:scale-95"
                      >
                        Select Image
                      </button>
                    </div>
                  )}
                  <input
                    ref={singleFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleSingleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSingleOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={singleSaving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {singleSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editing ? "Save Changes" : "Create Poster"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full mx-4 p-6 border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-4.5 h-4.5 text-blue-500" /> Batch Upload Campaign Posters
              </h3>
              <button
                onClick={() => { if (!bulkUploading) setBulkOpen(false); }}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1.5">
              {/* Batch Configuration */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 border border-slate-200/50 rounded-2xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Position / Post (Shared)</label>
                  <input
                    type="text"
                    placeholder="e.g. School Captain"
                    value={bulkPosition}
                    onChange={e => setBulkPosition(e.target.value)}
                    disabled={bulkUploading}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none bg-white font-semibold text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Election Year</label>
                  <input
                    type="text"
                    value={bulkYear}
                    onChange={e => setBulkYear(e.target.value)}
                    disabled={bulkUploading}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none bg-white font-semibold text-xs"
                  />
                </div>
              </div>

              {/* Upload Drop Zone */}
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 bg-slate-50/30 text-center hover:bg-slate-50 transition duration-300">
                <input
                  ref={bulkFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleBulkFilesSelect}
                  disabled={bulkUploading}
                  className="hidden"
                />
                <ImageIcon className="w-9 h-9 text-slate-350 mx-auto mb-2" />
                <button
                  type="button"
                  onClick={() => bulkFileRef.current?.click()}
                  disabled={bulkUploading}
                  className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  Choose Multiple Poster Images
                </button>
                <p className="text-[10px] font-bold text-slate-400 mt-2">
                  Select posters at once. Candidate names will be guessed from image names.
                </p>
              </div>

              {/* Files Table List */}
              {bulkFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block px-1">Selected Posters ({bulkFiles.length})</span>
                  <div className="space-y-2 border border-slate-100 rounded-2xl p-2 bg-slate-50/20 max-h-72 overflow-y-auto">
                    {bulkFiles.map((item) => (
                      <div
                        key={item.tempId}
                        className="flex items-center gap-3 p-3 bg-white border border-slate-200/60 rounded-xl shadow-sm hover:shadow"
                      >
                        <div className="w-10 h-10 rounded bg-slate-100 border shrink-0 flex items-center justify-center overflow-hidden">
                          <img src={URL.createObjectURL(item.file)} alt="Temp" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-2.5 min-w-0">
                          <div>
                            <input
                              type="text"
                              value={item.candidate_name}
                              onChange={e => updateBulkFileField(item.tempId, "candidate_name", e.target.value)}
                              disabled={bulkUploading}
                              className="w-full px-2.5 py-1.5 border border-slate-200/80 rounded-lg text-slate-800 font-bold text-xs focus:outline-none focus:border-blue-500"
                              placeholder="Candidate Name"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={item.bio}
                              onChange={e => updateBulkFileField(item.tempId, "bio", e.target.value)}
                              disabled={bulkUploading}
                              className="w-full px-2.5 py-1.5 border border-slate-200/80 rounded-lg text-slate-800 font-semibold text-xs focus:outline-none focus:border-blue-500"
                              placeholder="Bio / Slogan (Optional)"
                            />
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          {item.status === "uploading" && <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin" />}
                          {item.status === "success" && <Check className="w-4.5 h-4.5 text-emerald-600" />}
                          {item.status === "error" && <AlertTriangle className="w-4.5 h-4.5 text-red-500" />}
                          <button
                            type="button"
                            onClick={() => removeBulkFile(item.tempId)}
                            disabled={bulkUploading}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition disabled:opacity-50"
                          >
                            <X className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                disabled={bulkUploading}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartBulkUpload}
                disabled={bulkUploading}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {bulkUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Batch Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" /> Start Upload Process ({bulkFiles.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminElectionPosters;
