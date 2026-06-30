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
      {/* Header Card */}
      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/15 transform hover:rotate-6 transition-transform duration-300 shrink-0">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Results Tally</h1>
            <p className="text-sm font-semibold text-slate-500">Real-time vote counts, voter turnout rates, and leading candidates</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500/20 border-slate-300"
            />
            Auto-refresh (15s)
          </label>
          <button
            onClick={fetchResults}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-650 text-white rounded-xl font-bold text-xs shadow hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <Link
            to="/elections/declaration"
            target="_blank"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold text-xs shadow hover:from-amber-655 hover:to-orange-700 hover:scale-[1.02] active:scale-95 transition-all shrink-0"
          >
            <Printer className="w-4 h-4" /> Print Declaration
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in slide-in-from-bottom-4 duration-300">
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
          <div key={post.key} className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden hover:border-slate-350 transition-colors duration-300 animate-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black text-slate-855 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-550" />
                {post.title}
              </h2>
              {sorted[0] && sorted[0].votes > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-amber-100 to-amber-50 text-amber-800 text-xs font-extrabold border border-amber-200/60 shadow-sm animate-pulse">
                  <Crown className="w-3.5 h-3.5" /> Leading: {sorted[0].name}
                </span>
              )}
            </div>
            <div className="p-6 space-y-5">
              {sorted.length === 0 ? (
                <p className="text-slate-400 text-sm font-semibold">No candidates registered.</p>
              ) : (
                sorted.map((c, i) => {
                  const pct = Math.round((c.votes / total) * 100);
                  const isLeader = i === 0 && c.votes > 0;
                  return (
                    <div key={c.candidate_id || c.name} className="flex items-center gap-4 group">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm border transition-transform duration-300 group-hover:scale-105 ${
                        isLeader 
                          ? "bg-gradient-to-br from-amber-400 via-amber-555 to-orange-550 border-amber-300" 
                          : "bg-gradient-to-br from-slate-200 to-slate-300 border-slate-100"
                      }`}>
                        {c.photo ? (
                          <img src={c.photo} alt={c.name} className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          c.name?.[0]
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`font-bold text-sm truncate flex items-center gap-1.5 ${isLeader ? "text-amber-850" : "text-slate-700"}`}>
                            {c.name}
                            {isLeader && <Crown className="w-4 h-4 text-amber-550 inline" />}
                          </span>
                          <span className="text-xs font-extrabold tabular-nums text-slate-800">
                            {c.votes} <span className="text-slate-455 font-bold">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-3 rounded-full bg-slate-50 border border-slate-100 overflow-hidden shadow-inner">
                          <div
                            className="h-full rounded-full transition-all duration-1000 ease-out"
                            style={{
                              width: `${pct}%`,
                              background: isLeader
                                ? "linear-gradient(90deg, #f59e0b, #ea580c)"
                                : "linear-gradient(90deg, #94a3b8, #475569)"
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
    blue: "from-blue-500 via-blue-600 to-indigo-600 shadow-blue-500/10 border-blue-200/50",
    green: "from-emerald-500 via-emerald-600 to-teal-600 shadow-emerald-500/10 border-emerald-200/50",
    amber: "from-amber-400 via-amber-500 to-orange-500 shadow-amber-500/10 border-amber-200/50",
    purple: "from-purple-500 via-purple-600 to-indigo-650 shadow-purple-500/10 border-purple-200/50",
  };
  return (
    <div className="bg-white rounded-3xl border border-slate-200/60 p-5.5 shadow-[0_4px_12px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-32">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400">{label}</span>
        <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900 tracking-tight">{value}</div>
    </div>
  );
}
