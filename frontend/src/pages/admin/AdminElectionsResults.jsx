import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Crown, Users, ShieldCheck, Sparkles, RefreshCw, BarChart3, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

export default function AdminElectionsResults() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchResults = async () => {
    try {
      const { data: d } = await api.get("/elections/results");
      setData(d);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
    if (!autoRefresh) return;
    const id = setInterval(fetchResults, 15000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Live Results Tally</h1>
              <p className="text-sm text-slate-500">Real-time vote counts and leading candidates</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-2 rounded-xl border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchResults}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to="/elections/declaration"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-semibold text-sm hover:bg-amber-600 transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Declaration
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={Users} label="Eligible Voters" value={data.total_users || 0} color="blue" />
          <KPICard icon={ShieldCheck} label="Votes Cast" value={data.total_voted || 0} color="green" />
          <KPICard icon={Sparkles} label="Turnout" value={`${data.turnout_pct || 0}%`} color="amber" />
          <KPICard icon={Crown} label="Categories" value={data.posts?.length || 0} color="purple" />
        </div>
      )}

      {/* Results by Post */}
      {data?.posts?.map(post => {
        const candidates = data.by_post?.[post.key] || [];
        const total = Math.max(1, candidates.reduce((s, c) => s + (c.votes || 0), 0));
        const sorted = [...candidates].sort((a, b) => b.votes - a.votes);

        return (
          <div key={post.key} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                {post.title}
              </h2>
              {sorted[0] && sorted[0].votes > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-sm font-bold border border-amber-200">
                  <Crown className="w-3.5 h-3.5" /> Leading: {sorted[0].name}
                </span>
              )}
            </div>
            <div className="p-6 space-y-4">
              {sorted.length === 0 ? (
                <p className="text-slate-400 text-sm">No candidates registered.</p>
              ) : (
                sorted.map((c, i) => {
                  const pct = Math.round((c.votes / total) * 100);
                  const isLeader = i === 0 && c.votes > 0;
                  return (
                    <div key={c.candidate_id || c.name} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0 ${
                        isLeader ? "bg-gradient-to-br from-amber-400 to-amber-600" : "bg-gradient-to-br from-slate-300 to-slate-400"
                      }`}>
                        {c.photo ? (
                          <img src={c.photo} alt={c.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          c.name?.[0]
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-semibold truncate ${isLeader ? "text-amber-700" : "text-slate-700"}`}>
                            {c.name}
                            {isLeader && <Crown className="w-4 h-4 text-amber-500 inline ml-1.5" />}
                          </span>
                          <span className="text-sm font-bold tabular-nums text-slate-700">
                            {c.votes} <span className="text-slate-400 font-medium">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: isLeader
                                ? "linear-gradient(90deg, #f59e0b, #d97706)"
                                : "linear-gradient(90deg, #94a3b8, #64748b)"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    amber: "from-amber-400 to-amber-600",
    purple: "from-purple-500 to-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-bold text-slate-400">{label}</span>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="text-3xl font-extrabold text-slate-900 mt-2">{value}</div>
    </div>
  );
}
