import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Link2, Plus, Search, Copy, Trash2, BarChart3, ExternalLink,
  Loader2, X, Calendar, Globe, Smartphone, Chrome, ShieldAlert,
  ArrowRight, Check, TrendingUp, MousePointerClick, Zap, MapPin,
  Monitor, Clock, ArrowUpRight
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import api from "../../lib/api";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

export default function AdminShortener() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // New link form state
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let cleanUrl = url.trim();
    if (!cleanUrl) {
      setPreviewData(null);
      return;
    }
    
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl;
    }

    try {
      new URL(cleanUrl);
    } catch (_) {
      return;
    }

    setPreviewLoading(true);
    const handler = setTimeout(async () => {
      try {
        const { data } = await api.get(`/admin/shortener/preview?url=${encodeURIComponent(cleanUrl)}`);
        setPreviewData(data);
        if (data && data.title && !title.trim()) {
          setTitle(data.title);
        }
      } catch (err) {
        console.error("Preview fetch failed:", err);
      } finally {
        setPreviewLoading(false);
      }
    }, 600);

    return () => clearTimeout(handler);
  }, [url]);

  // Analytics modal state
  const [selectedLink, setSelectedLink] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchLinks = async () => {
    try {
      const { data } = await api.get("/admin/shortener");
      setLinks(data || []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load short links");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      toast.error("Title and original URL are required");
      return;
    }

    setCreating(true);
    try {
      await api.post("/admin/shortener", {
        title: title.trim(),
        url: url.trim(),
        custom_code: customCode.trim() || null,
        description: previewData?.description || "",
        image: previewData?.image || ""
      });
      toast.success("Shortened link created successfully!");
      setTitle("");
      setUrl("");
      setCustomCode("");
      setPreviewData(null);
      fetchLinks();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create short link");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this short link? All click logs for this link will be deleted permanently.")) return;
    try {
      await api.delete(`/admin/shortener/${id}`);
      toast.success("Short link deleted");
      fetchLinks();
      if (selectedLink && selectedLink.id === id) {
        setSelectedLink(null);
        setAnalytics(null);
      }
    } catch (e) {
      toast.error("Failed to delete short link");
    }
  };

  const fetchAnalytics = async (link) => {
    setSelectedLink(link);
    setAnalyticsLoading(true);
    setAnalytics(null);
    setAnalyticsError(null);
    try {
      const { data } = await api.get(`/admin/shortener/${link.id}/analytics`);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
      setAnalyticsError(err?.response?.data?.detail || err.message || "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const copyToClipboard = (code, id) => {
    const shortUrl = `${window.location.origin}/s/${code}`;
    navigator.clipboard.writeText(shortUrl);
    toast.success("Shortened link copied to clipboard!");
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredLinks = links.filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()) ||
    l.code.toLowerCase().includes(search.toLowerCase()) ||
    l.url.toLowerCase().includes(search.toLowerCase())
  );

  // Compute Bitly-style KPI metrics from analytics data
  const kpis = useMemo(() => {
    if (!analytics) return null;

    const totalClicks = analytics.daily.reduce((sum, d) => sum + d.clicks, 0);
    const daysWithData = analytics.daily.length || 1;
    const avgPerDay = (totalClicks / daysWithData).toFixed(1);

    // Peak day
    const peakDay = analytics.daily.reduce((best, d) => d.clicks > (best?.clicks || 0) ? d : best, analytics.daily[0]);

    // Top device
    const topDevice = analytics.devices.reduce((best, d) => d.value > (best?.value || 0) ? d : best, analytics.devices[0]);

    // Top browser
    const topBrowser = analytics.browsers.reduce((best, b) => b.value > (best?.value || 0) ? b : best, analytics.browsers[0]);

    // Top country
    const topCountry = analytics.countries.reduce((best, c) => c.value > (best?.value || 0) ? c : best, analytics.countries[0]);

    // Top referrer
    const topReferrer = analytics.referrers.reduce((best, r) => r.value > (best?.value || 0) ? r : best, analytics.referrers[0]);

    return {
      totalClicks,
      avgPerDay,
      peakDay,
      topDevice,
      topBrowser,
      topCountry,
      topReferrer,
      daysTracked: daysWithData
    };
  }, [analytics]);

  // Global stats from all links
  const globalStats = useMemo(() => {
    const totalClicks = links.reduce((sum, l) => sum + (l.clicks_count || 0), 0);
    const topLink = links.reduce((best, l) => (l.clicks_count || 0) > (best?.clicks_count || 0) ? l : best, links[0]);
    return { totalClicks, totalLinks: links.length, topLink };
  }, [links]);

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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/15 transform hover:rotate-6 transition-transform duration-300 shrink-0">
            <Link2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Link Shortener & Analytics</h1>
            <p className="text-sm font-semibold text-slate-500">Create, manage, and inspect engagement of shortened portal redirects</p>
          </div>
        </div>
      </div>

      {/* Global KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-400">
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Total Clicks</span>
          <div className="text-3xl font-black text-slate-900 tracking-tight mt-1">{globalStats.totalClicks.toLocaleString()}</div>
          <span className="text-[10px] font-bold text-slate-400">across all links</span>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Active Links</span>
          <div className="text-3xl font-black text-blue-600 tracking-tight mt-1">{globalStats.totalLinks}</div>
          <span className="text-[10px] font-bold text-slate-400">shortened URLs</span>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Avg. Clicks/Link</span>
          <div className="text-3xl font-black text-emerald-600 tracking-tight mt-1">
            {globalStats.totalLinks > 0 ? (globalStats.totalClicks / globalStats.totalLinks).toFixed(1) : "0"}
          </div>
          <span className="text-[10px] font-bold text-slate-400">average engagement</span>
        </div>
        <div className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
          <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">Top Performer</span>
          <div className="text-lg font-black text-violet-600 tracking-tight mt-1 truncate">
            {globalStats.topLink ? globalStats.topLink.title : "—"}
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            {globalStats.topLink ? `${globalStats.topLink.clicks_count || 0} clicks` : "no data"}
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Premium Form Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-5 h-fit lg:sticky lg:top-6 animate-in slide-in-from-left-4 duration-300">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Plus className="w-4.5 h-4.5 text-blue-600" />
            Shorten a New Link
          </h2>

          <form onSubmit={handleCreate} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Link Title / Label</label>
              <input
                type="text"
                placeholder="e.g. Admission Circular 2026-27"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3.5 border border-slate-200/80 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Original Long URL</label>
              <input
                type="url"
                placeholder="https://drive.google.com/file/d/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-4 py-3.5 border border-slate-200/80 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
                required
              />
            </div>

            {/* Link Preview Card */}
            {(previewLoading || previewData) && (
              <div className="rounded-2xl border border-slate-150 overflow-hidden bg-slate-50/40 p-3.5 space-y-2.5 animate-in fade-in duration-300">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Link Preview</div>
                {previewLoading ? (
                  <div className="flex items-center gap-3 py-2">
                    <Loader2 className="w-4.5 h-4.5 text-blue-600 animate-spin" />
                    <span className="text-xs font-semibold text-slate-500">Fetching original link metadata...</span>
                  </div>
                ) : (
                  previewData && (
                    <div className="flex gap-3 items-start">
                      {previewData.image && (
                        <div className="w-18 h-18 rounded-xl overflow-hidden bg-slate-150 shrink-0 border border-slate-200/50 shadow-sm">
                          <img src={previewData.image} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs font-extrabold text-slate-800 line-clamp-2 leading-snug">
                          {previewData.title || "No Title Available"}
                        </h4>
                        {previewData.description && (
                          <p className="text-[10.5px] font-semibold text-slate-500 line-clamp-2 leading-relaxed">
                            {previewData.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {previewData.is_youtube ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-red-50 text-red-600 font-bold text-[9px] border border-red-100">
                              YouTube Video
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-bold text-[9px] border border-blue-100">
                              Webpage
                            </span>
                          )}
                          <span className="text-[9.5px] font-bold text-slate-400 truncate max-w-[120px]">
                            {previewData.url ? new URL(previewData.url).hostname : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Custom Alias (Optional)</span>
                <span className="text-[10px] text-slate-400 normal-case font-semibold">alphanumeric only</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-slate-400 text-sm font-bold border-r border-slate-200 pr-3.5 select-none">
                  /s/
                </span>
                <input
                  type="text"
                  placeholder="admission2026"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  className="w-full pl-14 pr-4 py-3.5 border border-slate-200/80 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
                />
              </div>
              <p className="text-[10px] font-medium text-slate-400 leading-relaxed mt-1">
                Leave blank to automatically generate a random 6-character code (e.g. <code>/s/z9f4k2</code>).
              </p>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.01] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-55"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4.5 h-4.5 animate-spin" /> Shortening...
                </>
              ) : (
                <>
                  Shorten URL <ArrowRight className="w-4.5 h-4.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Links List */}
        <div className="lg:col-span-2 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
          
          {/* Search bar */}
          <div className="relative shadow-[0_2px_8px_rgba(0,0,0,0.01)] hover:shadow-md hover:shadow-slate-100 transition-all duration-300 rounded-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search shortened links by title, code, or original URL..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 border border-slate-200/80 rounded-2xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 bg-white font-semibold text-sm shadow-sm"
            />
          </div>

          {/* Links Grid */}
          {filteredLinks.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center text-slate-400 space-y-3 shadow-sm">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-350 shadow-inner">
                <Link2 className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">No short links found</p>
                <p className="text-xs text-slate-400 mt-1">Shorten a new link using the panel on the left.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLinks.map((link) => (
                <div
                  key={link.id}
                  className="bg-white border border-slate-150 rounded-3xl p-5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm md:text-base truncate">{link.title}</span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100/60 text-indigo-600 text-xs font-bold font-mono">
                        /s/{link.code}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 font-semibold">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 hover:text-blue-700 truncate">{link.url}</a>
                    </p>

                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(link.created_at).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>By: {link.created_by}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {/* Click Indicator */}
                    <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center min-w-[72px] shadow-[inset_0_1px_2px_rgba(16,185,129,0.05)]">
                      <div className="text-sm font-black text-emerald-600 tabular-nums">{link.clicks_count}</div>
                      <div className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 mt-0.5">Clicks</div>
                    </div>

                    {/* Quick actions */}
                    <button
                      onClick={() => copyToClipboard(link.code, link.id)}
                      className="p-2.5 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl text-slate-600 hover:text-slate-900 transition-colors shadow-sm bg-white active:scale-95"
                      title="Copy short link"
                    >
                      {copiedId === link.id ? <Check className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5" />}
                    </button>

                    <button
                      onClick={() => fetchAnalytics(link)}
                      className="p-2.5 hover:bg-blue-50 border border-blue-200 rounded-xl text-blue-600 hover:text-blue-700 transition-colors shadow-sm bg-white active:scale-95"
                      title="View Detailed Analytics"
                    >
                      <BarChart3 className="w-4.5 h-4.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-2.5 hover:bg-red-50 border border-red-200 rounded-xl text-red-500 hover:text-red-600 transition-colors shadow-sm bg-white active:scale-95"
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

      {/* Analytics Drawer (Bitly-Style) */}
      {selectedLink && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex justify-end animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedLink(null); }}
        >
          <div className="bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
            
            {/* Drawer Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 px-6 py-5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="space-y-1 min-w-0 flex-1 mr-4">
                  <h3 className="text-lg font-black text-white flex items-center gap-2 truncate">
                    <BarChart3 className="w-5 h-5 text-blue-400 shrink-0" />
                    <span className="truncate">{selectedLink.title}</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/10 text-white/80 text-xs font-mono font-bold">
                      /s/{selectedLink.code}
                    </span>
                    <a href={selectedLink.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-300 hover:text-blue-200 hover:underline truncate max-w-[250px] flex items-center gap-1 font-medium">
                      {selectedLink.url} <ArrowUpRight className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLink(null)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            {analyticsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-sm font-semibold text-slate-400">Compiling click logs...</span>
              </div>
            ) : analyticsError ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-red-500 animate-in fade-in duration-200 p-6">
                <ShieldAlert className="w-10 h-10 text-red-400" />
                <span className="text-sm font-bold">Failed to load analytics:</span>
                <span className="text-xs bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 max-w-md text-center text-red-700 font-mono font-semibold">
                  {analyticsError}
                </span>
              </div>
            ) : analytics ? (
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-6">

                  {/* Bitly-Style KPI Summary Cards */}
                  {kpis && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in duration-300">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100/60">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MousePointerClick className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-[9px] uppercase tracking-widest font-extrabold text-blue-500">Total Clicks</span>
                        </div>
                        <div className="text-2xl font-black text-blue-700 tabular-nums">{kpis.totalClicks.toLocaleString()}</div>
                        <span className="text-[10px] font-bold text-blue-400">{kpis.daysTracked} days tracked</span>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100/60">
                        <div className="flex items-center gap-1.5 mb-2">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-[9px] uppercase tracking-widest font-extrabold text-emerald-500">Avg / Day</span>
                        </div>
                        <div className="text-2xl font-black text-emerald-700 tabular-nums">{kpis.avgPerDay}</div>
                        <span className="text-[10px] font-bold text-emerald-400">clicks per day</span>
                      </div>
                      <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-4 border border-violet-100/60">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Zap className="w-3.5 h-3.5 text-violet-500" />
                          <span className="text-[9px] uppercase tracking-widest font-extrabold text-violet-500">Peak Day</span>
                        </div>
                        <div className="text-2xl font-black text-violet-700 tabular-nums">{kpis.peakDay?.clicks || 0}</div>
                        <span className="text-[10px] font-bold text-violet-400 truncate block">{kpis.peakDay?.date || "—"}</span>
                      </div>
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-100/60">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Monitor className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[9px] uppercase tracking-widest font-extrabold text-amber-500">Top Device</span>
                        </div>
                        <div className="text-lg font-black text-amber-700 truncate">{kpis.topDevice?.name || "—"}</div>
                        <span className="text-[10px] font-bold text-amber-400">{kpis.topDevice?.value || 0} clicks</span>
                      </div>
                    </div>
                  )}

                  {/* Quick Insights Row */}
                  {kpis && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                          <Chrome className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400">Top Browser</div>
                          <div className="text-sm font-black text-slate-800 truncate">{kpis.topBrowser?.name || "—"}</div>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400">Top Country</div>
                          <div className="text-sm font-black text-slate-800 truncate">{kpis.topCountry?.name || "—"}</div>
                        </div>
                      </div>
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400">Top Referrer</div>
                          <div className="text-sm font-black text-slate-800 truncate">{kpis.topReferrer?.name || "Direct"}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Daily Trend Area Chart */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-indigo-500" /> Clicks Over Time
                    </h4>
                    {analytics.daily.length === 0 ? (
                      <div className="h-52 flex items-center justify-center text-slate-400 text-sm">No click logs in last 30 days.</div>
                    ) : (
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.daily}>
                            <defs>
                              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", fontSize: "12px" }}
                              labelClassName="font-bold text-slate-800 text-xs"
                            />
                            <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorClicks)" dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Grid for breakdown graphs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    
                    {/* Devices Pie Chart */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
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
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {analytics.devices.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                              <Legend verticalAlign="bottom" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: "11px", fontWeight: 600 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Browser Bar Chart */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
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
                              <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={65} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                              <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* OS Bar Chart */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
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
                              <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                              <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={65} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ borderRadius: "10px", fontSize: "12px" }} />
                              <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} barSize={14} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Country List Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
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
                                <th className="py-2">Country</th>
                                <th className="py-2 text-right">Clicks</th>
                                <th className="py-2 text-right">Share</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {analytics.countries.map((c, idx) => {
                                const countryTotal = analytics.countries.reduce((s, x) => s + x.value, 0);
                                const pct = countryTotal > 0 ? ((c.value / countryTotal) * 100).toFixed(1) : 0;
                                return (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="py-2 text-slate-800 font-bold">{c.name === "Unknown" ? "🌐 Unknown" : `📍 ${c.name}`}</td>
                                    <td className="py-2 text-right font-mono text-slate-500">{c.value}</td>
                                    <td className="py-2 text-right font-mono text-slate-400">{pct}%</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Referrers table */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                      <Link2 className="w-4 h-4 text-indigo-500" /> Referrers (Top Traffic Sources)
                    </h4>
                    {analytics.referrers.length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-6">No referrer logs recorded yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs font-semibold text-slate-700">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="py-2.5">Source</th>
                              <th className="py-2.5 text-right">Count</th>
                              <th className="py-2.5 text-right">Share</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {analytics.referrers.map((r, idx) => {
                              const refTotal = analytics.referrers.reduce((s, x) => s + x.value, 0);
                              const pct = refTotal > 0 ? ((r.value / refTotal) * 100).toFixed(1) : 0;
                              return (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2.5 text-slate-800">{r.name || "Direct / None"}</td>
                                  <td className="py-2.5 text-right font-mono text-slate-500">{r.value}</td>
                                  <td className="py-2.5 text-right font-mono text-slate-400">{pct}%</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

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
