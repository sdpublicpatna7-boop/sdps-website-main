import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Award, Plus, Edit2, Trash2, ArrowUp, ArrowDown, Upload,
  Loader2, Globe, Save, HelpCircle, Eye, EyeOff, LayoutGrid, Sparkles,
  BarChart3, Calendar, Smartphone, Chrome, ShieldAlert, X, Link2,
  Mail, MessageCircle, Play, Instagram, Facebook, Youtube, Copy, Check
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, BarChart, Bar
} from "recharts";
import api from "../../lib/api";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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

  // Styling and tab states
  const [activeTab, setActiveTab] = useState("branding"); // branding | socials
  const [copiedLink, setCopiedLink] = useState(false);

  // Branding save states
  const [savingSettings, setSavingSettings] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Link Modal States
  const [editingLink, setEditingLink] = useState(null); // null if not editing/creating
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkGroup, setLinkGroup] = useState("");
  const [savingLink, setSavingLink] = useState(false);

  // Link Analytics States
  const [selectedLink, setSelectedLink] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);

  const fetchLinkAnalytics = async (link) => {
    setSelectedLink(link);
    setAnalyticsLoading(true);
    setAnalytics(null);
    setAnalyticsError(null);
    try {
      const { data } = await api.get(`/admin/linktree/links/${link.id}/analytics`);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setAnalyticsError(err?.response?.data?.detail || err.message || "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

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

  const handleSettingsChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

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

  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= links.length) return;

    const list = [...links];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    setLinks(list);

    try {
      await api.post("/admin/linktree/links/reorder", list.map(l => l.id));
    } catch (err) {
      toast.error("Failed to save link order");
      fetchData();
    }
  };

  const copyPublicUrl = () => {
    const fullUrl = `${window.location.origin}/links`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Public link copied to clipboard!");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const categories = Array.from(new Set(links.map(l => l.group_header).filter(Boolean)));
  const totalClicks = links.reduce((sum, l) => sum + (l.clicks_count || 0), 0);
  const activeLinks = links.filter(l => l.is_active);

  // Group links for simulator preview
  const groupedLinks = links.filter(l => l.is_active).reduce((acc, link) => {
    const header = link.group_header?.trim() || "Links";
    if (!acc[header]) acc[header] = [];
    acc[header].push(link);
    return acc;
  }, {});

  // Socials list for simulator preview
  const activeSocials = [
    { icon: Instagram, val: settings.instagram },
    { icon: Facebook, val: settings.facebook },
    { icon: Youtube, val: settings.youtube },
    { icon: MessageCircle, val: settings.whatsapp },
    { icon: Play, val: settings.playstore },
    { icon: Mail, val: settings.email ? `mailto:${settings.email}` : "" }
  ].filter(s => s.val);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Card */}
      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/15 transform hover:rotate-6 transition-transform duration-300 shrink-0">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Linktree Landing Page Builder</h1>
            <p className="text-sm font-semibold text-slate-500">Design your school links portal and manage active custom redirects</p>
          </div>
        </div>
        <a
          href="/links"
          target="_blank"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
        >
          <Globe className="w-4.5 h-4.5" /> View Live Page
        </a>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-400">
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Total Clicks</span>
          <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">{totalClicks}</div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Total Links</span>
          <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">{links.length}</div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Active Links</span>
          <div className="text-3xl font-black text-emerald-600 tracking-tight mt-1">{activeLinks.length}</div>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Portal Link</span>
          <button
            onClick={copyPublicUrl}
            className="flex items-center justify-between text-left text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl px-3 py-1.5 transition mt-1.5"
          >
            <span className="truncate">/links</span>
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" /> : <Copy className="w-3.5 h-3.5 shrink-0 ml-2" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Builders & Managers (spans 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Settings Form */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6.5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-violet-500" />
                Customize Portal branding
              </h2>
              {/* Tab Selector */}
              <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveTab("branding")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === "branding" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Profile Details
                </button>
                <button
                  onClick={() => setActiveTab("socials")}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    activeTab === "socials" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Social Handles
                </button>
              </div>
            </div>

            {/* TAB CONTENT: Branding Info */}
            {activeTab === "branding" && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Logo Image Upload layout */}
                <div className="flex items-center gap-4 bg-slate-50/50 p-4 border border-slate-200/60 rounded-2xl shadow-inner">
                  <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                    {settings.logo_url ? (
                      <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">No Image</span>
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">School Emblem Logo</span>
                    <label className="block">
                      <span className="sr-only">Choose logo file</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="block w-full text-xs text-slate-555 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile Title</label>
                    <input
                      type="text"
                      placeholder="School Title"
                      value={settings.profile_title}
                      onChange={(e) => handleSettingsChange("profile_title", e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile Handle</label>
                    <input
                      type="text"
                      placeholder="e.g. @Sdps_patna"
                      value={settings.profile_handle || ""}
                      onChange={(e) => handleSettingsChange("profile_handle", e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Profile Bio</label>
                  <textarea
                    rows={3}
                    placeholder="Enter a brief bio..."
                    value={settings.profile_bio}
                    onChange={(e) => handleSettingsChange("profile_bio", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm resize-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Theme Style</label>
                  <select
                    value={settings.theme || "light"}
                    onChange={(e) => handleSettingsChange("theme", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
                  >
                    <option value="light">🌅 Glassmorphic Light Theme</option>
                    <option value="dark">🌌 Midnight Dark Theme</option>
                  </select>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Social Outlets */}
            {activeTab === "socials" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Instagram URL</span>
                  <input
                    type="url"
                    placeholder="https://instagram.com/..."
                    value={settings.instagram}
                    onChange={(e) => handleSettingsChange("instagram", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Facebook URL</span>
                  <input
                    type="url"
                    placeholder="https://facebook.com/..."
                    value={settings.facebook}
                    onChange={(e) => handleSettingsChange("facebook", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">YouTube Channel URL</span>
                  <input
                    type="url"
                    placeholder="https://youtube.com/..."
                    value={settings.youtube}
                    onChange={(e) => handleSettingsChange("youtube", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">WhatsApp Link</span>
                  <input
                    type="url"
                    placeholder="https://wa.me/..."
                    value={settings.whatsapp}
                    onChange={(e) => handleSettingsChange("whatsapp", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Google Play Store App URL</span>
                  <input
                    type="url"
                    placeholder="https://play.google.com/store/..."
                    value={settings.playstore}
                    onChange={(e) => handleSettingsChange("playstore", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-inner"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">School Email Support</span>
                  <input
                    type="email"
                    placeholder="helpdesk@sdpublic.org"
                    value={settings.email}
                    onChange={(e) => handleSettingsChange("email", e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200/85 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-inner"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-650 text-white rounded-2xl font-bold text-sm shadow-md shadow-violet-500/15 hover:shadow-lg transform hover:scale-[1.01] active:scale-99 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {savingSettings ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" /> Saving Settings...
                </>
              ) : (
                <>
                  <Save className="w-4.5 h-4.5" /> Save Branding Settings
                </>
              )}
            </button>
          </div>

          {/* Card 2: Links List Container */}
          <div className="bg-white rounded-3xl p-6.5 border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100/80 pb-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <LayoutGrid className="w-4.5 h-4.5 text-violet-500" />
                Manage Profile Links
              </h2>
              <button
                onClick={() => openLinkModal()}
                className="flex items-center gap-1.5 px-4.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-xl font-bold text-xs hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] active:scale-95 transition-all shadow shadow-blue-500/10"
              >
                <Plus className="w-4 h-4" /> Add Link Outlet
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-slate-150 rounded-3xl hover:bg-slate-50/30 transition-all duration-300 gap-4 group bg-white shadow-sm hover:shadow-[0_8px_20px_rgba(0,0,0,0.02)]"
                  >
                    {/* Link Info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm md:text-base">{link.title}</span>
                        {link.group_header && (
                          <span className="px-2.5 py-0.5 rounded-xl bg-violet-50 border border-violet-100/60 text-violet-600 text-[10px] font-bold uppercase tracking-wider">
                            📂 {link.group_header}
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-xl bg-blue-50 border border-blue-100/60 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                          📈 {link.clicks_count || 0} clicks
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate font-mono">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 font-semibold">{link.url}</a>
                      </p>
                    </div>

                    {/* Actions and Sorting */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleToggleActive(link)}
                        className={`p-2.5 rounded-xl border transition-all duration-300 shadow-sm active:scale-95 ${
                          link.is_active
                            ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100"
                            : "bg-slate-50 border-slate-200/80 text-slate-450 hover:bg-slate-100"
                        }`}
                        title={link.is_active ? "Link is Active (Click to Hide)" : "Link is Hidden (Click to Show)"}
                      >
                        {link.is_active ? <Eye className="w-4.5 h-4.5" /> : <EyeOff className="w-4.5 h-4.5" />}
                      </button>

                      <button
                        onClick={() => fetchLinkAnalytics(link)}
                        className="p-2.5 hover:bg-violet-50 border border-slate-200 rounded-xl text-violet-600 hover:text-violet-755 transition-all shadow-sm bg-white active:scale-95"
                        title="View Detailed Analytics"
                      >
                        <BarChart3 className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={() => handleMove(idx, -1)}
                        disabled={idx === 0}
                        className="p-2.5 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 transition-all shadow-sm disabled:opacity-40 bg-white active:scale-95"
                        title="Move Up"
                      >
                        <ArrowUp className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => handleMove(idx, 1)}
                        disabled={idx === links.length - 1}
                        className="p-2.5 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-500 transition-all shadow-sm disabled:opacity-40 bg-white active:scale-95"
                        title="Move Down"
                      >
                        <ArrowDown className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={() => openLinkModal(link)}
                        className="p-2.5 hover:bg-blue-50 border border-slate-200 rounded-xl text-blue-600 hover:text-blue-755 transition-all shadow-sm bg-white active:scale-95"
                        title="Edit link details"
                      >
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteLink(link.id)}
                        className="p-2.5 hover:bg-red-50 border border-slate-200 rounded-xl text-red-500 hover:text-red-755 transition-all shadow-sm bg-white active:scale-95"
                        title="Delete link"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Mockup Smartphone Simulator (spans 1 column) */}
        <div className="lg:col-span-1 h-fit lg:sticky lg:top-6 flex flex-col items-center">
          <div className="w-full text-center mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center justify-center gap-1">
              <Smartphone className="w-4 h-4 text-violet-500" /> Interactive Simulator
            </span>
          </div>

          {/* iPhone Mockup Frame */}
          <div className="relative w-full max-w-[310px] aspect-[9/19.2] bg-slate-950 border-[10px] border-slate-900 rounded-[44px] shadow-2xl overflow-hidden ring-4 ring-slate-800/10">
            {/* Notch / Dynamic Island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-full z-30 flex items-center justify-between px-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800"></div>
              <div className="w-8 h-1 rounded-full bg-slate-800/80"></div>
            </div>

            {/* Screen Content */}
            <div className={`w-full h-full overflow-y-auto no-scrollbar px-4 pt-10 pb-6 transition-all duration-500 ${
              settings.theme === "dark" 
                ? "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white" 
                : "bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50 text-slate-900"
            }`}>
              
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center space-y-2 mt-4">
                <div className="w-16 h-16 rounded-full bg-white border border-slate-200/50 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                  {settings.logo_url ? (
                    <img src={settings.logo_url} alt="Logo" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center text-violet-500 font-bold text-xs">SDPS</div>
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight truncate max-w-[200px]">
                    {settings.profile_title || "S.D. Public School"}
                  </h3>
                  {settings.profile_handle && (
                    <p className="text-[10px] font-bold text-violet-500 mt-0.5 tracking-tight">
                      {settings.profile_handle}
                    </p>
                  )}
                </div>
                {settings.profile_bio && (
                  <p className="text-[9.5px] font-medium text-slate-450 leading-relaxed max-w-[220px] line-clamp-2 px-1">
                    {settings.profile_bio}
                  </p>
                )}
              </div>

              {/* Social Channels Row */}
              {activeSocials.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4.5 px-2">
                  {activeSocials.map((soc, i) => (
                    <div
                      key={i}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                        settings.theme === "dark"
                          ? "bg-white/10 hover:bg-white/20 text-white"
                          : "bg-white border border-slate-200/60 text-slate-600 hover:text-slate-800 shadow-sm"
                      }`}
                    >
                      <soc.icon className="w-3.5 h-3.5" />
                    </div>
                  ))}
                </div>
              )}

              {/* Links Outlets */}
              <div className="mt-6 space-y-4 px-1">
                {Object.keys(groupedLinks).length === 0 ? (
                  <div className="text-center py-8 text-[10px] text-slate-400 font-medium">
                    No active links to preview.
                  </div>
                ) : (
                  Object.keys(groupedLinks).map((groupName) => (
                    <div key={groupName} className="space-y-2">
                      <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400 block px-1">
                        {groupName}
                      </span>
                      <div className="space-y-1.5">
                        {groupedLinks[groupName].map((link) => (
                          <div
                            key={link.id}
                            className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold text-center border transition-all duration-300 ${
                              settings.theme === "dark"
                                ? "bg-white/5 hover:bg-white/10 border-white/[0.08] text-slate-100"
                                : "bg-white border-slate-200/80 text-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.01)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)]"
                            }`}
                          >
                            {link.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
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
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-xl font-bold text-sm hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5"
                >
                  {savingLink && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {selectedLink && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-end z-50 animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-300">
            
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-5 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500" /> Click Analytics: {selectedLink.title}
                </h3>
                <p className="text-xs text-slate-400 font-medium truncate mt-1 max-w-md">
                  Target: <a href={selectedLink.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedLink.url}</a>
                </p>
              </div>
              <button
                onClick={() => setSelectedLink(null)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            {analyticsLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : analyticsError ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-red-500 animate-in fade-in duration-200">
                <ShieldAlert className="w-10 h-10 text-red-400" />
                <span className="text-sm font-bold">Failed to load analytics:</span>
                <span className="text-xs bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 max-w-md text-center text-red-700 font-mono font-semibold">
                  {analyticsError}
                </span>
              </div>
            ) : analytics ? (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Daily trend chart */}
                <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-500" /> Clicks History (Daily Trend)
                  </h4>
                  {analytics.daily.length === 0 ? (
                    <div className="h-60 flex items-center justify-center text-slate-400 text-sm">No click logs logged in last 30 days.</div>
                  ) : (
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={analytics.daily}>
                          <defs>
                            <linearGradient id="colorClicksLinktree" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                            labelClassName="font-bold text-slate-800 text-xs"
                          />
                          <Area type="monotone" dataKey="clicks" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicksLinktree)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 2. Grid for breakdowns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Devices Pie Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-500" /> Device Distribution
                    </h4>
                    {analytics.devices.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-slate-400 text-xs">No data</div>
                    ) : (
                      <div className="h-48 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie
                              data={analytics.devices}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {analytics.devices.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Browser Bar Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                      <Chrome className="w-4 h-4 text-indigo-500" /> Top Browsers
                    </h4>
                    {analytics.browsers.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-slate-400 text-xs">No data</div>
                    ) : (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={analytics.browsers} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={70} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* OS Bar Chart */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-indigo-500" /> Operating Systems
                    </h4>
                    {analytics.oss.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-slate-400 text-xs">No data</div>
                    ) : (
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={analytics.oss} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                            <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={70} tickLine={false} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Country List Table */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col">
                    <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-indigo-500" /> Geographic Breakdown
                    </h4>
                    <div className="flex-1 overflow-y-auto max-h-[175px]">
                      {analytics.countries.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No country metadata collected</p>
                      ) : (
                        <table className="w-full text-left text-xs font-semibold text-slate-700">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="py-2">Country Code</th>
                              <th className="py-2 text-right">Clicks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {analytics.countries.map((c, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2 text-slate-800 font-bold">{c.name === "Unknown" ? "🌐 Unknown" : `📍 ${c.name}`}</td>
                                <td className="py-2 text-right font-mono text-slate-500">{c.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                </div>

                {/* 3. Referrers table */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4 text-indigo-500" /> Referrers (Top traffic sources)
                  </h4>
                  {analytics.referrers.length === 0 ? (
                    <p className="text-slate-400 text-xs text-center py-6">No referrer logs recorded yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-semibold text-slate-700">
                        <thead>
                          <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-2.5">Referrer Domain</th>
                            <th className="py-2.5 text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {analytics.referrers.map((r, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 text-slate-800">{r.name}</td>
                              <td className="py-2.5 text-right font-mono text-slate-500">{r.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <ShieldAlert className="w-8 h-8 text-slate-300" />
                <span className="text-sm font-semibold">No analytics data could be retrieved.</span>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
