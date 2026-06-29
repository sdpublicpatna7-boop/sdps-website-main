import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  BarChart3, Users, Trophy, Plus, Trash2, Pencil,
  ShieldCheck, FileSpreadsheet, Crown, Award, Sparkles, X, Save, Settings, ListOrdered,
  RotateCcw, AlertTriangle, GraduationCap, BookOpen, Download,
  SlidersHorizontal, Minus, Wand2, Tv2
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend
} from "recharts";

const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "results", label: "Results", icon: Trophy },
  { key: "voters", label: "Voters", icon: Users },
  { key: "candidates", label: "Candidates", icon: Award },
  { key: "manipulation", label: "Manipulation", icon: SlidersHorizontal },
  { key: "categories", label: "Categories", icon: ListOrdered },
  { key: "students", label: "Students", icon: GraduationCap },
  { key: "teachers", label: "Teachers", icon: BookOpen },
  { key: "settings", label: "Settings", icon: Settings },
];

export default function AdminElections() {
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, u, c, p, st] = await Promise.all([
        api.get("/elections/admin/stats"),
        api.get("/elections/admin/users"),
        api.get("/elections/candidates"),
        api.get("/elections/bootstrap"),
        api.get("/elections/admin/settings"),
      ]);
      setStats(s.data);
      setUsers(u.data);
      setCandidates(c.data.candidates || []);
      setPosts(p.data.posts || []);
      setSettings(st.data || {});
    } catch (err) {
      toast.error("Failed to load election admin data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const postLabels = Object.fromEntries(posts.map(p => [p.key, p.title]));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg">
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Election Control Room</h1>
          <p className="text-sm text-slate-500">Manage school council election, edit roster, configure categories and live manipulations</p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              data-testid={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
                tab === t.key
                  ? "bg-blue-600 text-white shadow-md scale-102"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panel */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[350px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          {tab === "overview" && <Overview stats={stats} posts={posts} postLabels={postLabels} />}
          {tab === "results" && <Results stats={stats} posts={posts} />}
          {tab === "voters" && <Voters stats={stats} users={users} posts={posts} postLabels={postLabels} onChange={refresh} />}
          {tab === "candidates" && <CandidatesTab candidates={candidates} posts={posts} postLabels={postLabels} onChange={refresh} />}
          {tab === "manipulation" && <ManipulationTab stats={stats} posts={posts} candidates={candidates} onChange={refresh} />}
          {tab === "categories" && <CategoriesTab posts={posts} onChange={refresh} />}
          {tab === "students" && <UsersTab role="student" users={users.filter(u => u.role === "student")} onChange={refresh} />}
          {tab === "teachers" && <UsersTab role="teacher" users={users.filter(u => u.role === "teacher")} onChange={refresh} />}
          {tab === "settings" && <SettingsTab settings={settings} onChange={refresh} />}
        </div>
      )}
    </div>
  );
}

const Stat = ({ label, value, icon: Icon, accent }) => (
  <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm" data-testid="dashboard-stats-card">
    <div className="flex items-center justify-between">
      <div className="text-xs tracking-wider uppercase font-bold text-slate-400">{label}</div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}><Icon className="w-5 h-5 text-white" /></div>
    </div>
    <div className="text-3xl font-extrabold text-slate-900 mt-3">{value}</div>
  </div>
);

const Overview = ({ stats, posts, postLabels }) => {
  if (!stats) return null;
  const turnoutData = [
    { name: "Voted", value: stats.total_voted },
    { name: "Pending", value: Math.max(0, (stats.total_users || 0) - stats.total_voted) },
  ];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Eligible Voters" value={stats.total_users || 0} icon={Users} accent="bg-gradient-to-br from-blue-600 to-blue-800" />
        <Stat label="Votes Cast" value={stats.total_voted} icon={ShieldCheck} accent="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <Stat label="Turnout" value={`${stats.turnout_pct}%`} icon={BarChart3} accent="bg-gradient-to-br from-amber-400 to-amber-600" />
        <Stat label="Pending" value={Math.max(0, (stats.total_users || 0) - stats.total_voted)} icon={Users} accent="bg-gradient-to-br from-slate-400 to-slate-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Class-wise Turnout</h2>
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          {(stats.class_breakdown || []).length === 0 ? (
            <p className="text-sm text-slate-400">No class data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, (stats.class_breakdown.length) * 40)}>
              <BarChart data={stats.class_breakdown} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="class_name" type="category" width={110} tick={{ fontWeight: 600, fill: "#334155", fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="voted" fill="#2563eb" name="Voted" radius={[0, 6, 6, 0]} />
                <Bar dataKey="total" fill="#f59e0b" name="Total" radius={[0, 6, 6, 0]} fillOpacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Turnout Overall</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={turnoutData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                <Cell fill="#2563eb" />
                <Cell fill="#e2e8f0" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm border-t border-slate-100 pt-4">
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">Students</div>
              <div className="text-lg font-bold text-slate-800">{stats.total_students || 0}</div>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-slate-400">Teachers</div>
              <div className="text-lg font-bold text-slate-800">{stats.total_teachers || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Leaders by Category</h2>
          <Crown className="w-5 h-5 text-amber-500" />
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-slate-400">No categories defined.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {posts.map(p => {
              const w = stats.winners?.[p.key];
              return (
                <div key={p.key} className="rounded-xl border border-slate-200 p-4 flex items-center gap-3 bg-slate-50/50">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    {w?.photo ? <img src={w.photo} alt="" className="w-full h-full object-cover" /> : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] tracking-widest uppercase font-bold text-slate-400">{p.title}</div>
                    <div className="font-bold text-slate-800 truncate">{w?.name || "—"}</div>
                    <div className="text-xs text-blue-600 font-bold">{w?.votes || 0} votes</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const Results = ({ stats, posts }) => {
  if (!stats) return null;
  return (
    <div className="space-y-6">
      {posts.length === 0 && <p className="text-slate-400">No categories defined.</p>}
      {posts.map(p => {
        const list = (stats.by_post[p.key] || []).slice().sort((a,b) => b.votes - a.votes);
        const max = Math.max(1, ...list.map(x => x.votes));
        return (
          <div key={p.key} className="rounded-2xl bg-white border border-slate-200 p-6" data-testid={`results-${p.key}`}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-slate-800">{p.title}</h2>
              {list[0] && (
                <div className="flex items-center gap-2 text-sm">
                  <Crown className="w-4 h-4 text-amber-500" />
                  <span className="font-bold text-slate-800">{list[0].name}</span>
                  <span className="text-slate-400">leads with {list[0].votes}</span>
                </div>
              )}
            </div>
            {list.length === 0 ? (
              <p className="text-sm text-slate-400">No candidates.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, list.length * 56)}>
                <BarChart data={list} layout="vertical" margin={{ left: 16, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontWeight: 600, fill: "#334155" }} />
                  <Tooltip />
                  <Bar dataKey="votes" radius={[0, 8, 8, 0]}>
                    {list.map((entry, i) => (
                      <Cell key={i} fill={entry.votes === max ? "#f59e0b" : "#2563eb"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Voters = ({ stats, users, posts, postLabels, onChange }) => {
  const [q, setQ] = useState("");
  const [editingBallot, setEditingBallot] = useState(null);
  if (!stats) return null;
  const map = new Map(stats.votes.map(v => [v.admission_no, v]));
  const rows = users.filter(s => !q || s.admission_no.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase()));

  const deleteBallot = async (v) => {
    if (!window.confirm(`Delete ballot of ${v.admission_no}? Voter can re-cast.`)) return;
    try {
      await api.delete(`/elections/admin/votes/${v.id}`);
      toast.success("Ballot deleted");
      onChange();
    } catch {
      toast.error("Failed to delete ballot");
    }
  };
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Individual Ballots</h2>
          <p className="text-sm text-slate-400">Audit-grade per-voter record of choices</p>
        </div>
        <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search ID or name..." className="max-w-xs" data-testid="voters-search" />
      </div>
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 uppercase text-xs tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Voter</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                {posts.map(p => <th key={p.key} className="p-4">{p.title}</th>)}
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => {
                const v = map.get(s.admission_no);
                return (
                  <tr key={s.admission_no} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-slate-700">{s.admission_no}</td>
                    <td className="p-4 font-bold text-slate-800">
                      {s.name}
                      <div className="text-xs font-normal text-slate-400">{s.father_name || s.subject || ""}</div>
                    </td>
                    <td className="p-4 capitalize text-slate-600">{s.role}</td>
                    <td className="p-4">
                      {v ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Voted</span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Pending</span>
                      )}
                    </td>
                    {posts.map(p => (
                      <td key={p.key} className="p-4 text-slate-600">{v?.selection_names?.[p.key] || <span className="text-slate-300">—</span>}</td>
                    ))}
                    <td className="p-4 text-right whitespace-nowrap">
                      {v ? (
                        <div className="inline-flex gap-1 justify-end">
                          <button onClick={() => setEditingBallot(v)} data-testid={`edit-ballot-${s.admission_no}`} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" title="Edit ballot"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => deleteBallot(v)} data-testid={`del-ballot-${s.admission_no}`} className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete ballot"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={5 + posts.length} className="p-10 text-center text-slate-400">No matches.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {editingBallot && (
        <BallotEditModal ballot={editingBallot} posts={posts} onClose={() => setEditingBallot(null)} onSaved={() => { setEditingBallot(null); onChange(); }} />
      )}
    </div>
  );
};

const BallotEditModal = ({ ballot, posts, onClose, onSaved }) => {
  const [sel, setSel] = useState({ ...(ballot.selections || {}) });
  const [cands, setCands] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all(posts.map(p => api.get("/elections/candidates", { params: { post: p.key } }).then(r => [p.key, r.data])))
      .then(arr => setCands(Object.fromEntries(arr)))
      .catch(() => toast.error("Failed to load candidates"));
  }, [posts]);

  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/elections/admin/votes/${ballot.id}`, { selections: sel });
      toast.success("Ballot updated");
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update ballot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Edit Ballot</h3>
            <p className="text-sm text-slate-500">Voter: <span className="font-mono font-bold text-slate-700">{ballot.admission_no}</span> · {ballot.voter_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          {posts.map(p => (
            <div key={p.key} className="border border-slate-200 rounded-xl p-4">
              <Label className="text-slate-700 font-bold mb-1.5 block">{p.title}</Label>
              <select
                value={sel[p.key] || ""}
                onChange={(e) => setSel({ ...sel, [p.key]: e.target.value })}
                className="h-10 w-full border border-slate-200 rounded-xl px-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50 font-medium"
                data-testid={`ballot-edit-${p.key}`}
              >
                <option value="">— none —</option>
                {(cands[p.key] || []).map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="h-11 px-5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 text-slate-600 text-sm">Cancel</button>
          <button
            onClick={save}
            disabled={busy}
            data-testid="ballot-save-btn"
            className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            <Save className="w-4 h-4" /> {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CandidatesTab = ({ candidates, posts, postLabels, onChange }) => {
  const [editing, setEditing] = useState(null);
  const [creatingPost, setCreatingPost] = useState(null);

  const remove = async (id) => {
    if (!window.confirm("Delete this candidate?")) return;
    try {
      await api.delete(`/elections/admin/candidates/${id}`);
      toast.success("Candidate deleted");
      onChange();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete candidate");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Manage Candidates</h2>
        <p className="text-sm text-slate-400">Add, edit or delete candidates per category</p>
      </div>

      {posts.length === 0 && <p className="text-slate-400">Add categories first in the Categories tab.</p>}

      {posts.map(p => {
        const items = candidates.filter(c => c.post === p.key);
        return (
          <div key={p.key} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">{p.title}</h2>
              <button
                onClick={() => setCreatingPost(p.key)}
                data-testid={`add-candidate-${p.key}`}
                className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Candidate
              </button>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">No candidates yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(c => (
                  <div key={c.id} className="rounded-xl border border-slate-200 p-4 flex gap-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                      {c.photo ? <img src={c.photo} alt={c.name} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 truncate">{c.name}</div>
                      <div className="text-xs text-slate-500 font-medium">Symbol: {c.symbol || "—"}</div>
                      {(c.adjustment ?? 0) !== 0 && (
                        <div className="text-[10px] tracking-wider uppercase font-bold text-amber-700 mt-1">Adj: {c.adjustment > 0 ? "+" : ""}{c.adjustment}</div>
                      )}
                      <div className="mt-2 flex gap-1 justify-end">
                        <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-slate-200/50 text-slate-500 hover:text-slate-700" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(c.id)} data-testid={`del-candidate-${c.id}`} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-650" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {(editing || creatingPost) && (
        <CandidateModal
          posts={posts}
          initial={editing || { post: creatingPost, name: "", photo: "", symbol: "", adjustment: 0 }}
          isNew={!editing}
          onClose={() => { setEditing(null); setCreatingPost(null); }}
          onSaved={() => { setEditing(null); setCreatingPost(null); onChange(); }}
        />
      )}
    </div>
  );
};

const CandidateModal = ({ posts, initial, isNew, onClose, onSaved }) => {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1.5 * 1024 * 1024) { toast.error("Image too large (max 1.5MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(s => ({ ...s, photo: reader.result }));
    reader.readAsDataURL(f);
  };

  const save = async () => {
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    try {
      if (isNew) {
        await api.post("/elections/admin/candidates", {
          name: form.name,
          post_key: form.post,
          symbol: form.symbol,
          photo: form.photo,
          symbol_image: form.symbol_image || ""
        });
        toast.success("Candidate added");
      } else {
        await api.put(`/elections/admin/candidates/${form.id}`, {
          name: form.name,
          symbol: form.symbol,
          photo: form.photo,
          symbol_image: form.symbol_image || "",
          adjustment: form.adjustment,
          post_key: form.post
        });
        toast.success("Candidate updated");
      }
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save candidate");
    } finally {
      setBusy(false);
    }
  };

  const postTitle = posts.find(p => p.key === form.post)?.title || form.post;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
        <h3 className="text-xl font-bold text-slate-800 mb-1">{isNew ? "Add Candidate" : "Edit Candidate"}</h3>
        <p className="text-sm text-slate-500 mb-5">Category: <span className="font-bold text-slate-700">{postTitle}</span></p>
        <div className="space-y-4">
          <div><Label className="text-slate-600 mb-1 block">Name</Label><Input data-testid="cand-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11" /></div>
          <div><Label className="text-slate-600 mb-1 block">Election Symbol (text)</Label><Input data-testid="cand-symbol-input" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="e.g. Star, Sun, Book" className="rounded-xl h-11" /></div>
          <div>
            <Label className="text-slate-600 mb-1 block">Vote Adjustment <span className="text-xs font-normal text-slate-400">(added to displayed votes, can be negative)</span></Label>
            <Input data-testid="cand-adjustment-input" type="number" value={form.adjustment ?? 0} onChange={(e) => setForm({ ...form, adjustment: parseInt(e.target.value || "0", 10) })} placeholder="0" className="rounded-xl h-11" />
          </div>
          <div><Label className="text-slate-650 mb-1 block">Photo URL</Label><Input data-testid="cand-photo-url-input" value={form.photo?.startsWith("data:") ? "" : (form.photo || "")} onChange={(e) => setForm({ ...form, photo: e.target.value })} placeholder="https://…" className="rounded-xl h-11" /></div>
          <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <Label className="text-slate-600 mb-2 block font-bold">Or upload photo</Label>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} data-testid="cand-photo-file-input" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            {form.photo && (
              <div className="mt-3 flex items-center gap-3">
                <img src={form.photo} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm" />
                <button onClick={() => setForm({ ...form, photo: "" })} className="text-xs text-red-600 font-bold hover:underline">Remove photo</button>
              </div>
            )}
          </div>
          {!isNew && (
            <div>
              <Label className="text-slate-650 mb-1 block">Category</Label>
              <select value={form.post} onChange={(e) => setForm({ ...form, post: e.target.value })} className="h-10 w-full border border-slate-200 rounded-xl px-3 bg-slate-50 font-medium">
                {posts.map(p => <option key={p.key} value={p.key}>{p.title}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button onClick={onClose} className="h-11 px-5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 text-slate-600 text-sm">Cancel</button>
          <button
            onClick={save}
            disabled={busy}
            data-testid="cand-save-btn"
            className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            <Save className="w-4 h-4" /> {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoriesTab = ({ posts, onChange }) => {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(null);

  const create = async () => {
    if (!title.trim()) return;
    try {
      const key = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_+|+$)/g, "");
      await api.post("/elections/admin/posts", {
        key,
        title: title.trim(),
        order_index: posts.length + 1
      });
      toast.success("Category added");
      setTitle(""); setAdding(false); onChange();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to add category");
    }
  };
  const save = async (p) => {
    try {
      await api.put(`/elections/admin/posts/${p.key}`, {
        key: p.key,
        title: editing.title,
        order_index: editing.order
      });
      toast.success("Updated"); setEditing(null); onChange();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update category");
    }
  };
  const del = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? All its candidates will be removed too.`)) return;
    try {
      await api.delete(`/elections/admin/posts/${p.key}`);
      toast.success("Deleted"); onChange();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Cannot delete category");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Voting Categories</h2>
          <p className="text-sm text-slate-400">Add, rename, reorder or delete posts that students vote for</p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          data-testid="add-category-btn"
          className="h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {adding && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 flex items-end gap-3 shadow-sm">
          <div className="flex-1">
            <Label className="text-slate-600 mb-1.5 block">Category Title</Label>
            <Input data-testid="new-category-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vice Captain" className="h-11 rounded-xl" />
          </div>
          <button onClick={create} data-testid="save-category-btn" className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm">Save</button>
          <button onClick={() => { setAdding(false); setTitle(""); }} className="h-11 px-5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 text-slate-600 text-sm">Cancel</button>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 uppercase text-xs tracking-wider border-b border-slate-100">
            <tr>
              <th className="p-4 w-20">Order</th>
              <th className="p-4">Title</th>
              <th className="p-4">Key</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(p => (
              <tr key={p.key} className="border-b border-slate-100 hover:bg-slate-50/50">
                {editing?.id === p.key ? (
                  <>
                    <td className="p-4"><Input type="number" value={editing.order} onChange={e => setEditing({ ...editing, order: Number(e.target.value) })} className="h-9 w-20 rounded-lg text-center" /></td>
                    <td className="p-4"><Input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="h-9 rounded-lg" /></td>
                    <td className="p-4 font-mono text-xs text-slate-500">{p.key}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button onClick={() => save(p)} className="text-emerald-600 hover:text-emerald-700 font-bold mr-3 text-sm">Save</button>
                      <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 font-medium text-sm">Cancel</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-4 font-mono font-bold text-slate-600">{p.order}</td>
                    <td className="p-4 font-bold text-slate-800">{p.title}</td>
                    <td className="p-4 font-mono text-xs text-slate-400">{p.key}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1 justify-end">
                        <button data-testid={`edit-category-${p.key}`} onClick={() => setEditing({ id: p.key, title: p.title, order: p.order })} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><Pencil className="w-4 h-4" /></button>
                        <button data-testid={`del-category-${p.key}`} onClick={() => del(p)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={4} className="p-10 text-center text-slate-400">No categories yet — add one to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-slate-400" /> Categories with existing votes cannot be deleted. Reset votes first in Settings.</p>
    </div>
  );
};

const UsersTab = ({ role, users, onChange }) => {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const isStudent = role === "student";

  const upload = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const { data } = await api.post(`/elections/admin/users/upload?role=${role}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Imported · ${data.inserted} new, ${data.updated} updated`);
      onChange();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem("sdps_admin_token");
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL || ""}/api/elections/admin/template/${role}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sdps_${role}_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download template");
    }
  };

  const remove = async (adm) => {
    if (!window.confirm(`Delete voter ${adm}?`)) return;
    try {
      await api.delete(`/elections/admin/users/${adm}`);
      toast.success("Deleted");
      onChange();
    } catch {
      toast.error("Failed to delete voter");
    }
  };

  const rows = users.filter(s => !q || s.admission_no.toLowerCase().includes(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">{isStudent ? "Eligible Students" : "Eligible Teachers"}</h2>
        <p className="text-sm text-slate-400">
          IDs must use prefix <span className="font-mono font-bold text-blue-600">{isStudent ? "SDPSS" : "SDPSE"}</span>.
          Excel headers: <span className="font-mono font-bold">{isStudent ? "admission_no, name, father_name, class_name" : "admission_no, name, subject, designation"}</span>.
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-600">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-800">Bulk Excel Upload</div>
            <div className="text-xs text-slate-500">.xlsx file with headers as specified above</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..." data-testid={`${role}-search`} className="max-w-xs h-11 rounded-xl" />
          <button onClick={downloadTemplate} data-testid={`download-${role}-template`} className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold flex items-center gap-2 whitespace-nowrap text-slate-650 text-sm">
            <Download className="w-4 h-4" /> Sample Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx" onChange={upload} data-testid={`upload-${role}-input`} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            data-testid={`upload-${role}-btn`}
            className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-60 whitespace-nowrap text-sm shadow-sm"
          >
            <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Excel"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500 uppercase text-xs tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Name</th>
                {isStudent ? (<><th className="p-4">Father's Name</th><th className="p-4">Class</th></>) : (<><th className="p-4">Subject</th><th className="p-4">Designation</th></>)}
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.admission_no} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="p-4 font-mono font-bold text-slate-700">{s.admission_no}</td>
                  <td className="p-4 font-bold text-slate-800">{s.name}</td>
                  {isStudent ? (<><td className="p-4 text-slate-500">{s.father_name || "—"}</td><td className="p-4 text-slate-500">{s.class_name || "—"}</td></>)
                             : (<><td className="p-4 text-slate-500">{s.subject || "—"}</td><td className="p-4 text-slate-500">{s.designation || "—"}</td></>)}
                  <td className="p-4">
                    {s.has_voted ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Voted</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Pending</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => remove(s.admission_no)} className="p-2 text-slate-400 hover:text-red-650 rounded-lg hover:bg-red-50" data-testid={`del-user-${s.admission_no}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (<tr><td colSpan={6} className="p-10 text-center text-slate-400">No {role}s.</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SettingsTab = ({ settings, onChange }) => {
  const [logo, setLogo] = useState(settings.school_logo || "");
  const [open, setOpen] = useState(String(settings.election_open ?? "true").toLowerCase() !== "false");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1 * 1024 * 1024) { toast.error("Logo too large (max 1MB)"); return; }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(f);
  };

  const saveLogo = async () => {
    setBusy(true);
    try {
      await api.post("/elections/settings/school_logo", { value: logo || "" });
      toast.success("Logo updated");
      onChange();
    } catch (e) {
      toast.error("Failed to save logo");
    } finally {
      setBusy(false);
    }
  };

  const resetVotes = async () => {
    if (!window.confirm("Delete ALL cast ballots? Roster and Candidates remain. This cannot be undone.")) return;
    try {
      const { data } = await api.post("/elections/admin/reset/votes");
      toast.success(`Reset · ${data.deleted_votes} votes cleared`);
      onChange();
    } catch {
      toast.error("Failed to reset votes");
    }
  };

  const resetAll = async () => {
    if (!window.confirm("FULL RESET: Delete all votes, candidates, and roster. Categories and admin remain. Continue?")) return;
    if (!window.confirm("Are you absolutely sure? This action is permanent.")) return;
    try {
      const { data } = await api.post("/elections/admin/reset/all");
      toast.success(`Reset · ${data.deleted_votes} votes, ${data.deleted_candidates} candidates, ${data.deleted_users} voters cleared`);
      onChange();
    } catch {
      toast.error("Failed to reset everything");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Election Settings</h2>
        <p className="text-sm text-slate-400">School branding and system diagnostics</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${open ? "bg-emerald-500" : "bg-red-500"}`}>
            {open ? <ShieldCheck className="w-5 h-5 text-white" /> : <AlertTriangle className="w-5 h-5 text-white" />}
          </div>
          <h2 className="text-lg font-bold text-slate-800">Election Window</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Lock the kiosk between voting hours or after polling closes. When closed, students see a "Voting closed" message.</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase ${open ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
            {open ? "Voting OPEN" : "Voting CLOSED"}
          </div>
          <button
            data-testid="toggle-election-btn"
            onClick={async () => {
              const next = !open;
              try {
                await api.post("/elections/settings/election_open", { value: next ? "true" : "false" });
                setOpen(next);
                toast.success(next ? "Voting unlocked" : "Voting locked");
                onChange();
              } catch {
                toast.error("Failed to update status");
              }
            }}
            className={`h-11 px-5 rounded-xl font-bold flex items-center gap-2 text-sm shadow-sm ${open ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
          >
            {open ? "Close Voting" : "Open Voting"}
          </button>
          <Link to="/elections/results" target="_blank" className="h-11 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold flex items-center gap-2 text-slate-650 text-sm">
            <BarChart3 className="w-4 h-4" /> Open Live Results
          </Link>
          <Link to="/elections/board" target="_blank" data-testid="board-link" className="h-11 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold flex items-center gap-2 text-slate-650 text-sm">
            <Tv2 className="w-4 h-4" /> Notice Board
          </Link>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 mb-2">School Logo</h3>
        <p className="text-sm text-slate-400 mb-4">Displayed on the kiosk header. PNG/JPG/SVG, under 1MB. Or paste a URL.</p>
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="w-32 h-32 rounded-2xl border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 overflow-hidden shrink-0">
            {logo ? <img src={logo} alt="Preview" className="w-full h-full object-contain p-2" /> : <span className="text-xs text-slate-400">No logo</span>}
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div>
              <Label className="text-slate-650 mb-1 block">Logo URL</Label>
              <Input data-testid="logo-url-input" value={logo?.startsWith("data:") ? "" : (logo || "")} onChange={(e) => setLogo(e.target.value)} placeholder="https://…/logo.png" className="rounded-xl h-11" />
            </div>
            <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <Label className="text-slate-650 mb-2 block font-bold">Or upload file</Label>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFile} data-testid="logo-file-input" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveLogo}
                disabled={busy}
                data-testid="save-logo-btn"
                className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-2 disabled:opacity-50 text-sm shadow-sm"
              >
                <Save className="w-4 h-4" /> Save Logo
              </button>
              {logo && <button onClick={() => setLogo("")} className="h-11 px-5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 text-slate-600 text-sm">Clear</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-red-200 bg-red-50/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-md shadow-red-250"><AlertTriangle className="w-5 h-5 text-white" /></div>
          <h2 className="text-lg font-bold text-red-700">Danger Zone</h2>
        </div>
        <p className="text-sm text-red-650/90 mb-4">These actions are immediate and permanent. Use only between elections or when resetting mock tests.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button onClick={resetVotes} data-testid="reset-votes-btn" className="h-12 px-5 rounded-xl border-2 border-red-200 bg-white text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-colors text-sm">
            <RotateCcw className="w-4 h-4" /> Reset Votes Only
          </button>
          <button onClick={resetAll} data-testid="reset-all-btn" className="h-12 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition-colors text-sm shadow-sm shadow-red-100">
            <AlertTriangle className="w-4 h-4" /> Reset Everything
          </button>
        </div>
      </div>
    </div>
  );
};

const ManipulationTab = ({ stats, posts, candidates, onChange }) => {
  const [busyId, setBusyId] = useState(null);
  if (!stats) return null;

  const postLists = posts.map(p => {
    const list = (stats.by_post[p.key] || []).slice().sort((a, b) => b.votes - a.votes);
    return { post: p, list };
  });

  const update = async (cand, fields) => {
    setBusyId(cand.candidate_id || cand.id);
    try {
      await api.put(`/elections/admin/candidates/${cand.candidate_id || cand.id}`, fields);
      onChange();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to update adjustment");
    } finally {
      setBusyId(null);
    }
  };

  const bumpAdjustment = (c, delta) => {
    const adj = c.adjustment ?? 0;
    update({ candidate_id: c.candidate_id }, { name: c.name, symbol: c.symbol, adjustment: adj + delta });
  };

  const setTotalTo = async (c) => {
    const desired = window.prompt(`Set displayed total votes for ${c.name} to:`, String(c.votes));
    if (desired === null) return;
    const n = parseInt(desired, 10);
    if (Number.isNaN(n) || n < 0) { toast.error("Enter a non-negative number"); return; }
    const real = c.real_votes ?? 0;
    update({ candidate_id: c.candidate_id }, { name: c.name, symbol: c.symbol, adjustment: n - real });
  };

  const resetAdjustment = (c) => update({ candidate_id: c.candidate_id }, { name: c.name, symbol: c.symbol, adjustment: 0 });

  const makeWinner = (post, c, list) => {
    if (list.length < 2) { toast.message("Only one candidate — already leading"); return; }
    const top = list[0];
    if (top.candidate_id === c.candidate_id && top.votes > (list[1]?.votes ?? 0)) {
      toast.message(`${c.name} is already the leader`);
      return;
    }
    const targetTotal = (top.votes ?? 0) + 1;
    const real = c.real_votes ?? 0;
    update({ candidate_id: c.candidate_id }, { name: c.name, symbol: c.symbol, adjustment: targetTotal - real });
    toast.success(`${c.name} promoted to leader`);
  };

  const resetAllPost = async (post, list) => {
    if (!window.confirm(`Clear ALL adjustments for ${post.title}? Real ballots stay; only displayed counts revert to actual.`)) return;
    for (const c of list) {
      if ((c.adjustment ?? 0) !== 0) {
        // eslint-disable-next-line no-await-in-loop
        await api.put(`/elections/admin/candidates/${c.candidate_id}`, { name: c.name, symbol: c.symbol, adjustment: 0 });
      }
    }
    toast.success(`Adjustments cleared for ${post.title}`);
    onChange();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Result Control</h2>
        <p className="text-sm text-slate-400">
          Direct override of displayed totals via the <span className="font-mono font-bold text-slate-700">adjustment</span> field. Real ballots are <span className="font-bold text-slate-700">never modified</span> — only displayed total is shifted.
        </p>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-900 text-sm flex items-start gap-2 shadow-sm">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
        <div>
          <span className="font-bold">Displayed Total = Real Votes + Adjustment.</span> Adjustments propagate immediately to live results, declaration printout, and notice screen.
        </div>
      </div>

      {postLists.map(({ post, list }) => {
        const top = list[0];
        return (
          <div key={post.key} className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm" data-testid={`manip-${post.key}`}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{post.title}</h2>
                {top && <div className="text-xs text-slate-500 mt-1">Currently leading: <span className="font-bold text-blue-600">{top.name}</span> ({top.votes} votes)</div>}
              </div>
              <button
                onClick={() => resetAllPost(post, list)}
                className="h-10 px-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-sm flex items-center gap-2 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Clear adjustments
              </button>
            </div>

            {list.length === 0 ? (
              <p className="text-sm text-slate-400">No candidates registered.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500 uppercase text-xs tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="p-3">Candidate</th>
                      <th className="p-3 text-right">Real</th>
                      <th className="p-3 text-right">Adj</th>
                      <th className="p-3 text-right">Displayed</th>
                      <th className="p-3 text-right">Quick Adjust</th>
                      <th className="p-3 text-right">Tools</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((c, i) => {
                      const isLeader = i === 0 && c.votes > 0;
                      const busy = busyId === c.candidate_id;
                      return (
                        <tr key={c.candidate_id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                                {c.photo ? <img src={c.photo} alt="" className="w-full h-full object-cover" /> : null}
                              </div>
                              <div>
                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                  {c.name}
                                  {isLeader && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                                </div>
                                <div className="text-xs text-slate-400">Symbol: {c.symbol || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-700">{c.real_votes ?? 0}</td>
                          <td className={`p-3 text-right font-mono font-bold ${(c.adjustment ?? 0) === 0 ? "text-slate-400" : (c.adjustment > 0 ? "text-emerald-600" : "text-red-650")}`}>
                            {(c.adjustment ?? 0) > 0 ? "+" : ""}{c.adjustment ?? 0}
                          </td>
                          <td className="p-3 text-right font-bold text-lg text-slate-900">{c.votes}</td>
                          <td className="p-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button disabled={busy} onClick={() => bumpAdjustment(c, -1)} data-testid={`manip-minus-${c.candidate_id}`} className="w-8 h-8 rounded-lg border border-red-200 bg-red-50 hover:bg-red-155 text-red-600 disabled:opacity-40 flex items-center justify-center font-bold">-1</button>
                              <button disabled={busy} onClick={() => bumpAdjustment(c, +1)} data-testid={`manip-plus-${c.candidate_id}`} className="w-8 h-8 rounded-lg border border-emerald-250 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 disabled:opacity-40 flex items-center justify-center font-bold">+1</button>
                              <button disabled={busy} onClick={() => bumpAdjustment(c, +5)} className="h-8 px-2 rounded-lg border border-emerald-250 bg-white text-emerald-750 hover:bg-emerald-50 text-xs font-bold disabled:opacity-40">+5</button>
                              <button disabled={busy} onClick={() => bumpAdjustment(c, -5)} className="h-8 px-2 rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs font-bold disabled:opacity-40">-5</button>
                            </div>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <div className="inline-flex gap-1 justify-end">
                              <button disabled={busy} onClick={() => setTotalTo(c)} data-testid={`manip-set-${c.candidate_id}`} className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-650">Set total…</button>
                              <button disabled={busy} onClick={() => makeWinner(post, c, list)} data-testid={`manip-winner-${c.candidate_id}`} className="h-8 px-3 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-white text-xs font-bold inline-flex items-center gap-1 shadow-sm hover:from-amber-500 hover:to-amber-700"><Wand2 className="w-3 h-3" /> Make Winner</button>
                              {(c.adjustment ?? 0) !== 0 && (
                                <button disabled={busy} onClick={() => resetAdjustment(c)} className="h-8 px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-850 hover:bg-amber-100 text-xs font-bold">Reset</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
