import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  Link2, Plus, Search, Copy, Trash2, BarChart3, ExternalLink,
  Loader2, X, Calendar, Globe, Smartphone, Chrome, ShieldAlert,
  ArrowRight, Check, TrendingUp, MousePointerClick, Zap, MapPin,
  Monitor, Clock, ArrowUpRight, ChevronLeft, ChevronRight
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
  const [bypassAds, setBypassAds] = useState(true);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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
        image: previewData?.image || "",
        bypass_ads: bypassAds
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

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredLinks = useMemo(() => {
    return links.filter(l =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.code.toLowerCase().includes(search.toLowerCase()) ||
      l.url.toLowerCase().includes(search.toLowerCase())
    );
  }, [links, search]);

  const totalPages = Math.max(1, Math.ceil(filteredLinks.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLinks = useMemo(() => {
    return filteredLinks.slice(startIndex, endIndex);
  }, [filteredLinks, startIndex, endIndex]);

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Sticky Premium Form Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-5 h-fit lg:sticky lg:top-6 self-start z-10 animate-in slide-in-from-left-4 duration-300">
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

            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2.5 text-xs font-bold text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bypassAds}
                  onChange={(e) => setBypassAds(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-350 accent-blue-600 focus:ring-blue-500/20 text-blue-600 cursor-pointer transition-all"
                />
                Bypass Youtube Ads
              </label>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.01] active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-55 cursor-pointer"
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

        {/* Right Side: Paginated Links List */}
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
              {paginatedLinks.map((link) => (
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
                      className="p-2.5 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 rounded-xl text-slate-600 hover:text-slate-900 transition-colors shadow-sm bg-white active:scale-95 cursor-pointer"
                      title="Copy short link"
                    >
                      {copiedId === link.id ? <Check className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5" />}
                    </button>

                    <button
                      onClick={() => fetchAnalytics(link)}
                      className="p-2.5 hover:bg-blue-50 border border-blue-200 rounded-xl text-blue-600 hover:text-blue-700 transition-colors shadow-sm bg-white active:scale-95 cursor-pointer"
                      title="View Detailed Analytics"
                    >
                      <BarChart3 className="w-4.5 h-4.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-2.5 hover:bg-red-50 border border-red-200 rounded-xl text-red-500 hover:text-red-600 transition-colors shadow-sm bg-white active:scale-95 cursor-pointer"
                      title="Delete link"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Bar */}
          {filteredLinks.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-500">
                Showing <span className="text-slate-900 font-extrabold">{startIndex + 1}</span>–<span className="text-slate-900 font-extrabold">{Math.min(endIndex, filteredLinks.length)}</span> of <span className="text-slate-900 font-extrabold">{filteredLinks.length}</span> links
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-xl text-xs font-black transition cursor-pointer ${
                      currentPage === page
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
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
                    {selectedLink.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-blue-300 font-bold">
                      /s/{selectedLink.code}
                    </span>
                    <span className="truncate max-w-md text-slate-400">{selectedLink.url}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyToClipboard(selectedLink.code, selectedLink.id)}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
                  >
                    {copiedId === selectedLink.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>

                  <button
                    onClick={() => setSelectedLink(null)}
                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {analyticsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Engagement Analytics...</p>
                </div>
              ) : analyticsError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center space-y-2">
                  <ShieldAlert className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="font-bold text-sm">Failed to Load Analytics</p>
                  <p className="text-xs text-red-600">{analyticsError}</p>
                </div>
              ) : analytics && kpis ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* Bitly-Style KPI Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Total Clicks</span>
                      <div className="text-2xl font-black text-slate-900 tracking-tight">{kpis.totalClicks}</div>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" /> {kpis.avgPerDay}/day avg
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Top Device</span>
                      <div className="text-base font-black text-slate-900 truncate">
                        {kpis.topDevice ? kpis.topDevice.name : "N/A"}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {kpis.topDevice ? `${kpis.topDevice.value} clicks (${Math.round((kpis.topDevice.value / (kpis.totalClicks || 1)) * 100)}%)` : "No data"}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Top Country</span>
                      <div className="text-base font-black text-slate-900 truncate">
                        {kpis.topCountry ? kpis.topCountry.name : "N/A"}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {kpis.topCountry ? `${kpis.topCountry.value} clicks` : "No data"}
                      </span>
                    </div>

                    <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block">Top Referrer</span>
                      <div className="text-base font-black text-slate-900 truncate">
                        {kpis.topReferrer ? kpis.topReferrer.name : "Direct / None"}
                      </div>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {kpis.topReferrer ? `${kpis.topReferrer.value} clicks` : "No data"}
                      </span>
                    </div>
                  </div>

                  {/* Clicks Over Time Area Chart */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Engagement Over Time (Last 30 Days)
                      </h4>
                      {kpis.peakDay && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Peak: {kpis.peakDay.clicks} clicks on {kpis.peakDay.date}
                        </span>
                      )}
                    </div>

                    {analytics.daily && analytics.daily.length > 0 ? (
                      <div className="h-64 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.daily} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="clicksGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "12px", color: "#fff", fontSize: "12px" }}
                            />
                            <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#clicksGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-slate-400">No click history logged yet</div>
                    )}
                  </div>

                  {/* Devices & Referrers Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Device Types Pie Chart */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        Devices Breakdown
                      </h4>

                      {analytics.devices && analytics.devices.length > 0 ? (
                        <div className="h-48 w-full flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={analytics.devices}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={65}
                                innerRadius={40}
                                paddingAngle={4}
                              >
                                {analytics.devices.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{ backgroundColor: "#0f172a", border: "none", borderRadius: "8px", color: "#fff", fontSize: "11px" }}
                              />
                              <Legend wrapperStyle={{ fontSize: "11px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">No device data available</div>
                      )}
                    </div>

                    {/* Referrers Breakdown List */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-violet-600" />
                        Top Traffic Sources (Referrers)
                      </h4>

                      {analytics.referrers && analytics.referrers.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {analytics.referrers.map((ref, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50/60 border border-slate-100">
                              <span className="font-semibold text-slate-700 truncate max-w-[180px]">{ref.name}</span>
                              <span className="font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                                {ref.value} clicks
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-slate-400">No referrer data available</div>
                      )}
                    </div>

                  </div>

                </div>
              ) : null}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
