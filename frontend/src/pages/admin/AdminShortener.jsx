import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Link2, Plus, Search, Copy, Trash2, BarChart3, ExternalLink,
  Loader2, X, Calendar, Globe, Smartphone, Chrome, ShieldAlert,
  ArrowRight, Check
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
        custom_code: customCode.trim() || null
      });
      toast.success("Shortened link created successfully!");
      setTitle("");
      setUrl("");
      setCustomCode("");
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

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Premium Form Card */}
        <div className="bg-white rounded-3xl p-6.5 border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-5 h-fit lg:sticky lg:top-6 animate-in slide-in-from-left-4 duration-300">
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
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25 transform hover:scale-[1.01] active:scale-99 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-55"
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
            <Search className="absolute left-4 top-4.5 w-5 h-5 text-slate-400" />
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
                  className="bg-white border border-slate-150 rounded-3xl p-5.5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm md:text-base truncate">{link.title}</span>
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100/60 text-indigo-600 text-xs font-bold font-mono">
                        /s/{link.code}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 font-semibold">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      Original: <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:underline text-blue-600 hover:text-blue-700">{link.url}</a>
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
                    {/* Click Indicator (Popping Emerald color) */}
                    <div className="px-3.5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center min-w-[72px] shadow-[inset_0_1px_2px_rgba(16,185,129,0.05)]">
                      <div className="text-sm font-black text-emerald-600 tabular-nums">{link.clicks_count}</div>
                      <div className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 mt-0.5">Clicks</div>
                    </div>

                    {/* Quick actions */}
                    <button
                      onClick={() => copyToClipboard(link.code, link.id)}
                      className="p-2.5 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-350 rounded-xl text-slate-650 hover:text-slate-900 transition-colors shadow-sm bg-white active:scale-95"
                      title="Copy short link"
                    >
                      {copiedId === link.id ? <Check className="w-4.5 h-4.5 text-green-600" /> : <Copy className="w-4.5 h-4.5" />}
                    </button>

                    <button
                      onClick={() => fetchAnalytics(link)}
                      className="p-2.5 hover:bg-blue-50 border border-blue-200 rounded-xl text-blue-600 hover:text-blue-750 transition-colors shadow-sm bg-white active:scale-95"
                      title="View Detailed Analytics"
                    >
                      <BarChart3 className="w-4.5 h-4.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-2.5 hover:bg-red-50 border border-red-200 rounded-xl text-red-500 hover:text-red-750 transition-colors shadow-sm bg-white active:scale-95"
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

      {/* Analytics Modal Drawer */}
      {selectedLink && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-end animate-in fade-in duration-200">
          <div className="bg-slate-50 w-full max-w-4xl h-full shadow-2xl flex flex-col border-l border-slate-200/80 animate-in slide-in-from-right duration-300">
            
            {/* Modal Header */}/}
            <div className="flex items-center justify-between border-b border-slate-200 pb-5 shrink-0">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Analytics: {selectedLink.title}
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  {window.location.origin}/s/{selectedLink.code}
                </p>
              </div>
              <button
                onClick={() => setSelectedLink(null)}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            {analyticsLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <span className="text-sm font-semibold text-slate-400">Compiling click logs...</span>
              </div>
            ) : analytics ? (
              <div className="flex-1 space-y-6 pb-12">
                
                {/* 1. Daily Trend Area Chart */}
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
                            <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                            labelClassName="font-bold text-slate-800 text-xs"
                          />
                          <Area type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorClicks)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* 2. Grid for breakdown graphs */}
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
            ) : analyticsError ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 text-red-500 animate-in fade-in duration-200">
                <ShieldAlert className="w-10 h-10 text-red-400" />
                <span className="text-sm font-bold">Failed to load analytics:</span>
                <span className="text-xs bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 max-w-md text-center text-red-700 font-mono font-semibold">
                  {analyticsError}
                </span>
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
