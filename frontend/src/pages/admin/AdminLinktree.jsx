import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Award, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Upload,
  Loader2, Globe, Save, HelpCircle, Eye, EyeOff, LayoutGrid, Sparkles
} from "lucide-react";
import api from "../../lib/api";

export default function AdminLinktree() {
  const [settings, setSettings] = useState({
    profile_title: "",
    profile_bio: "",
    logo_url: "",
    instagram: "",
    facebook: "",
    youtube: "",
    whatsapp: "",
    playstore: "",
    email: ""
  });
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Branding save states
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Link Modal States
  const [editingLink, setEditingLink] = useState(null); // null if not editing/creating
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkGroup, setLinkGroup] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  const fetchData = async () => {
    try {
      const [settingsRes, linksRes] = await Promise.all([
        api.get("/admin/linktree/settings"),
        api.get("/admin/linktree/links")
      ]);
      setSettings(settingsRes.data);
      setLinks(linksRes.data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load Linktree profile data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle setting input changes
  const handleSettingsChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  // Upload logo file
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploadingLogo(true);
    try {
      const { data } = await api.post("/admin/upload-image", formData);
      handleSettingsChange("logo_url", data.url);
      toast.success("Logo uploaded! Remember to save settings.");
    } catch (err) {
      toast.error("Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save branding settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.post("/admin/linktree/settings", settings);
      toast.success("Branding settings saved successfully!");
    } catch (err) {
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  // Open modal for new link or editing existing
  const openLinkModal = (link = null) => {
    if (link) {
      setEditingLink(link);
      setLinkTitle(link.title);
      setLinkUrl(link.url);
      setLinkGroup(link.group_header || "");
    } else {
      setEditingLink({ id: "new", is_active: true });
      setLinkTitle("");
      setLinkUrl("");
      setLinkGroup("");
    }
  };

  // Save link (create or update)
  const handleSaveLink = async (e) => {
    e.preventDefault();
    if (!linkTitle.trim() || !linkUrl.trim()) {
      toast.error("Title and Target URL are required");
      return;
    }

    setSavingLink(true);
    try {
      const payload = {
        title: linkTitle.trim(),
        url: linkUrl.trim(),
        group_header: linkGroup.trim() || "Links",
        is_active: editingLink.is_active
      };

      if (editingLink.id === "new") {
        await api.post("/admin/linktree/links", payload);
        toast.success("Link added successfully!");
      } else {
        await api.put(`/admin/linktree/links/${editingLink.id}`, payload);
        toast.success("Link updated successfully!");
      }

      setEditingLink(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to save link");
    } finally {
      setSavingLink(false);
    }
  };

  // Toggle active / inactive status
  const handleToggleActive = async (link) => {
    try {
      const updated = { ...link, is_active: !link.is_active };
      await api.put(`/admin/linktree/links/${link.id}`, updated);
      setLinks(prev => prev.map(l => l.id === link.id ? updated : l));
      toast.success(`Link status updated`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Delete link
  const handleDeleteLink = async (id) => {
    if (!window.confirm("Are you sure you want to delete this link?")) return;
    try {
      await api.delete(`/admin/linktree/links/${id}`);
      toast.success("Link deleted");
      fetchData();
    } catch (e) {
      toast.error("Failed to delete link");
    }
  };

  // Reorder links (up/down)
  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const list = [...links];
    // Swap items
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Update state instantly for fluid UX
    setLinks(list);

    // Call reorder backend endpoint
    try {
      await api.post("/admin/linktree/links/reorder", list.map(l => l.id));
    } catch (err) {
      toast.error("Failed to save link order");
      fetchData(); // Rollback on error
    }
  };

  // Get distinct group headers for suggestions
  const categories = Array.from(new Set(links.map(l => l.group_header).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Linktree landing page Builder</h1>
              <p className="text-sm text-slate-500">Design your school links portal and manage active redirects</p>
            </div>
          </div>
        </div>
        <a
          href="/links"
          target="_blank"
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-sm shrink-0"
        >
          <Eye className="w-4 h-4" /> View Live Page
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Profile Branding */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm h-fit space-y-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-500" />
            Branding Customizer
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            
            {/* Avatar Upload */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profile Logo / Avatar</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center p-1 relative shrink-0">
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url.startsWith("http") ? settings.logo_url : `${process.env.REACT_APP_BACKEND_URL || ""}${settings.logo_url}`}
                      alt="Logo preview"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Award className="w-6 h-6 text-slate-300" />
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-xs text-slate-700 cursor-pointer transition shadow-sm">
                  <Upload className="w-3.5 h-3.5" /> Upload File
                  <input type="file" onChange={handleLogoUpload} className="hidden" accept="image/*" />
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profile Title</label>
              <input
                type="text"
                placeholder="School Title"
                value={settings.profile_title}
                onChange={(e) => handleSettingsChange("profile_title", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-medium text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profile Bio</label>
              <textarea
                rows={3}
                placeholder="Enter a brief bio..."
                value={settings.profile_bio}
                onChange={(e) => handleSettingsChange("profile_bio", e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-medium text-sm resize-none"
              />
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" /> Social Links (URLs)
              </h3>
              
              {["instagram", "facebook", "youtube", "whatsapp", "playstore"].map(net => (
                <div key={net} className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">{net}</label>
                  <input
                    type="text"
                    placeholder={`https://${net}.com/...`}
                    value={settings[net] || ""}
                    onChange={(e) => handleSettingsChange(net, e.target.value)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/10 bg-slate-50 font-mono text-xs"
                  />
                </div>
              ))}

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Email Address</label>
                <input
                  type="email"
                  placeholder="info@sdpublic.org"
                  value={settings.email || ""}
                  onChange={(e) => handleSettingsChange("email", e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-slate-850 focus:outline-none focus:ring-2 focus:ring-blue-500/10 bg-slate-50 font-mono text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Branding
            </button>
          </form>
        </div>

        {/* Right Card: Links management */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-violet-500" />
                Manage Profile Links
              </h2>
              <button
                onClick={() => openLinkModal()}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-xs hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Link
              </button>
            </div>

            {links.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-350 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No links created yet</p>
                <p className="text-xs">Add your first portal link using the button above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {links.map((link, idx) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between p-4.5 border border-slate-200 rounded-2xl hover:bg-slate-50/50 transition-all gap-4 group"
                  >
                    {/* Link Info */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{link.title}</span>
                        {link.group_header && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-55 border border-violet-100 text-violet-600 text-[10px] font-bold">
                            📂 {link.group_header}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 truncate font-mono">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600">{link.url}</a>
                      </p>
                    </div>

                    {/* Actions and Sorting */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Toggle status */}
                      <button
                        onClick={() => handleToggleActive(link)}
                        className={`p-1.5 rounded-xl border transition-colors shadow-sm ${
                          link.is_active
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                            : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                        }`}
                        title={link.is_active ? "Link is Active (Click to Hide)" : "Link is Hidden (Click to Show)"}
                      >
                        {link.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      {/* Sorting buttons */}
                      <button
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 disabled:opacity-40 shadow-sm"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === links.length - 1}
                        className="p-1.5 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 disabled:opacity-40 shadow-sm"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => openLinkModal(link)}
                        className="p-1.5 hover:bg-blue-50 border border-blue-200 rounded-xl text-blue-600 shadow-sm"
                        title="Edit link details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-1.5 hover:bg-red-50 border border-red-200 rounded-xl text-red-500 shadow-sm"
                        title="Delete link"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Edit/Create Link Modal */}
      {editingLink && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full mx-4 p-6 border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingLink.id === "new" ? "Add Linktree URL" : "Edit Linktree URL"}
              </h3>
              <button
                onClick={() => setEditingLink(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleSaveLink} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Link Title</label>
                <input
                  type="text"
                  placeholder="e.g. Rate Us On Google Maps"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-medium text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Target Long URL</label>
                <input
                  type="url"
                  placeholder="https://g.page/r/..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-medium text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Category Group Header (Optional)</span>
                  <span className="text-[10px] text-slate-400 font-normal normal-case">e.g. Feedback</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enquiry Links"
                  value={linkGroup}
                  onChange={(e) => setLinkGroup(e.target.value)}
                  list="category-suggestions"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-slate-50 font-medium text-sm"
                />
                <datalist id="category-suggestions">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingLink(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl font-bold text-sm text-slate-500 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLink}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
                >
                  {savingLink && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
