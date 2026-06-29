import { useState, useEffect } from "react";
import { supabase } from "@/lib/api";
import { toast } from "sonner";
import { 
  Vote, Upload, Users, Plus, Trash2, Edit2, Play, Square, 
  Archive, FileText, CheckCircle2, ChevronRight, RefreshCw 
} from "lucide-react";
import * as XLSX from "xlsx";

export default function AdminElections() {
  const [votersCount, setVotersCount] = useState(0);
  const [posts, setPosts] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [electionOpen, setElectionOpen] = useState(false);
  const [sessionName, setSessionName] = useState("2026-27");
  const [loading, setLoading] = useState(true);

  // Form states
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostKey, setNewPostKey] = useState("");
  const [candForm, setCandForm] = useState({ name: "", post: "", symbol: "", photo: "", symbol_image: "" });
  const [uploadingVoters, setUploadingVoters] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // 1. Get voters count
      const { count: vCount } = await supabase
        .from("election_voters")
        .select("*", { count: "exact", head: true });
      setVotersCount(vCount || 0);

      // 2. Get posts
      const { data: postsData } = await supabase
        .from("election_posts")
        .select("*")
        .order("order_index", { ascending: true });
      setPosts(postsData || []);

      // 3. Get candidates
      const { data: candsData } = await supabase
        .from("election_candidates")
        .select("*");
      setCandidates(candsData || []);

      // 4. Get settings
      const { data: openSetting } = await supabase
        .from("election_settings")
        .select("value")
        .eq("key", "election_open")
        .single();
      setElectionOpen(openSetting?.value === "true");

    } catch (e) {
      console.error(e);
      toast.error("Failed to load statistics.");
    } finally {
      setLoading(false);
    }
  };

  const toggleElection = async (status) => {
    try {
      const { error } = await supabase
        .from("election_settings")
        .upsert({ key: "election_open", value: String(status) });

      if (error) throw error;
      setElectionOpen(status);
      toast.success(status ? "Election is now LIVE!" : "Election is now CLOSED.");
    } catch (e) {
      toast.error("Failed to toggle election.");
    }
  };

  const handleCreatePost = async () => {
    if (!newPostKey || !newPostTitle) {
      toast.error("Please fill key and title.");
      return;
    }
    try {
      const { error } = await supabase
        .from("election_posts")
        .insert({
          key: newPostKey.trim().toLowerCase(),
          title: newPostTitle.trim(),
          order_index: posts.length + 1
        });
      if (error) throw error;
      toast.success("Post created!");
      setNewPostKey("");
      setNewPostTitle("");
      fetchStats();
    } catch (e) {
      toast.error("Failed to create post.");
    }
  };

  const handleDeletePost = async (key) => {
    try {
      const { error } = await supabase
        .from("election_posts")
        .delete()
        .eq("key", key);
      if (error) throw error;
      toast.success("Post deleted!");
      fetchStats();
    } catch (e) {
      toast.error("Failed to delete post.");
    }
  };

  const handleCreateCandidate = async () => {
    if (!candForm.name || !candForm.post) {
      toast.error("Please specify name and category.");
      return;
    }
    try {
      const { error } = await supabase
        .from("election_candidates")
        .insert({
          name: candForm.name.trim(),
          post_key: candForm.post,
          symbol: candForm.symbol.trim(),
          photo: candForm.photo,
          symbol_image: candForm.symbol_image
        });
      if (error) throw error;
      toast.success("Candidate created successfully!");
      setCandForm({ name: "", post: "", symbol: "", photo: "", symbol_image: "" });
      fetchStats();
    } catch (e) {
      toast.error("Failed to create candidate.");
    }
  };

  const handleDeleteCandidate = async (id) => {
    try {
      const { error } = await supabase
        .from("election_candidates")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Candidate deleted!");
      fetchStats();
    } catch (e) {
      toast.error("Failed to delete candidate.");
    }
  };

  // Upload voters file from Client using xlsx library (100% serverless!)
  const handleVoterUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingVoters(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (!data || data.length === 0) {
          toast.error("Excel sheet is empty!");
          setUploadingVoters(false);
          return;
        }

        // Format to Postgres fields
        const voters = data.map(item => ({
          admission_no: String(item.admission_no || item.id || "").trim(),
          name: String(item.name || "").trim(),
          role: String(item.role || "student").trim().toLowerCase(),
          class_name: item.class || item.class_name ? String(item.class || item.class_name) : null,
          father_name: item.father_name ? String(item.father_name) : null
        })).filter(v => v.admission_no);

        // Delete existing voters
        await supabase.from("election_voters").delete().neq("admission_no", "");

        // Insert new voters in chunks of 100
        for (let i = 0; i < voters.length; i += 100) {
          const chunk = voters.slice(i, i + 100);
          const { error } = await supabase.from("election_voters").insert(chunk);
          if (error) throw error;
        }

        toast.success(`Successfully uploaded ${voters.length} voters!`);
        fetchStats();
        setUploadingVoters(false);
      };
      reader.readAsBinaryString(file);

    } catch (err) {
      console.error(err);
      toast.error("Failed to parse/upload voters file.");
      setUploadingVoters(false);
    }
  };

  const publishResults = async () => {
    if (!confirm("Are you sure you want to end this election and archive the results? This will clear all casted votes!")) return;

    try {
      // 1. Fetch all votes
      const { data: votes } = await supabase.from("election_votes").select("selections");
      
      // Calculate totals
      const count = {}; // post_key -> candidate_id -> count
      (votes || []).forEach(v => {
        const selections = v.selections || {};
        Object.entries(selections).forEach(([postKey, candId]) => {
          if (!count[postKey]) count[postKey] = {};
          count[postKey][candId] = (count[postKey][candId] || 0) + 1;
        });
      });

      // Insert into results archive
      const archiveRows = [];
      
      for (const post of posts) {
        const postCands = candidates.filter(c => c.post_key === post.key);
        const postCounts = count[post.key] || {};
        
        // Find winner
        let maxVotes = -1;
        let winnerId = null;
        postCands.forEach(c => {
          const votesForCand = postCounts[c.id] || 0;
          if (votesForCand > maxVotes) {
            maxVotes = votesForCand;
            winnerId = c.id;
          }
        });

        postCands.forEach(c => {
          archiveRows.push({
            session_name: sessionName,
            post_key: post.key,
            post_title: post.title,
            candidate_name: c.name,
            candidate_symbol: c.symbol,
            votes_count: postCounts[c.id] || 0,
            is_winner: c.id === winnerId && maxVotes > 0
          });
        });
      }

      if (archiveRows.length > 0) {
        const { error: insErr } = await supabase.from("election_results_archive").insert(archiveRows);
        if (insErr) throw insErr;
      }

      // Clear votes and reset voters voted flag
      await supabase.from("election_votes").delete().neq("id", 0);
      await supabase.from("election_voters").update({ already_voted: false }).neq("admission_no", "");
      
      // Close election
      await supabase.from("election_settings").upsert({ key: "election_open", value: "false" });
      setElectionOpen(false);

      toast.success("Results compiled and published to the archive successfully!");
      fetchStats();

    } catch (e) {
      console.error(e);
      toast.error("Failed to compile and publish results.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2 text-slate-800">
            <Vote className="w-8 h-8 text-blue-600" /> Student Council Elections
          </h1>
          <p className="text-slate-500 mt-1">Configure categories, candidates, import voter list, and compile final tallies.</p>
        </div>
        <div className="flex items-center gap-3">
          {electionOpen ? (
            <button 
              onClick={() => toggleElection(false)} 
              className="px-5 h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm tracking-wide flex items-center gap-2 shadow-sm transition"
            >
              <Square className="w-4 h-4" /> Close Election
            </button>
          ) : (
            <button 
              onClick={() => toggleElection(true)} 
              className="px-5 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm tracking-wide flex items-center gap-2 shadow-sm transition"
            >
              <Play className="w-4 h-4" /> Go Live
            </button>
          )}
          <button 
            onClick={fetchStats}
            className="p-3 h-12 w-12 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 flex items-center justify-center transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Registered Voters</div>
            <div className="text-3xl font-bold font-display text-slate-800 mt-1">{votersCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Election Posts</div>
            <div className="text-3xl font-bold font-display text-slate-800 mt-1">{posts.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm text-slate-400 font-semibold uppercase tracking-wider">Nominated Candidates</div>
            <div className="text-3xl font-bold font-display text-slate-800 mt-1">{candidates.length}</div>
          </div>
        </div>
      </div>

      {/* Management layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Voter List Upload & Posts */}
        <div className="space-y-6">
          {/* Voter Upload */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" /> Voter Registration Roster
            </h2>
            <p className="text-sm text-slate-500">Upload an Excel sheet containing student voter list (must have columns <code>admission_no</code>, <code>name</code>, <code>role</code>, <code>class_name</code>).</p>
            <div className="flex items-center gap-4">
              <label className="flex-1 h-32 border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition">
                <Upload className="w-8 h-8 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">{uploadingVoters ? "Uploading..." : "Click to select Excel file"}</span>
                <input type="file" accept=".xlsx,.xls" onChange={handleVoterUpload} disabled={uploadingVoters} className="hidden" />
              </label>
            </div>
          </div>

          {/* Posts Configuration */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" /> Election Positions (Posts)
            </h2>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Post Key (e.g. head_boy)" 
                value={newPostKey}
                onChange={e => setNewPostKey(e.target.value)}
                className="flex-1 h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <input 
                type="text" 
                placeholder="Display Title (e.g. Head Boy)" 
                value={newPostTitle}
                onChange={e => setNewPostTitle(e.target.value)}
                className="flex-1 h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button 
                onClick={handleCreatePost}
                className="px-5 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition"
              >
                Add
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-2">
              {posts.map(p => (
                <div key={p.key} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-700">{p.title}</div>
                    <div className="text-xs text-slate-400 font-mono">key: {p.key}</div>
                  </div>
                  <button onClick={() => handleDeletePost(p.key)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Nominate Candidates */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h2 className="text-xl font-bold font-display text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" /> Nominate Candidates
          </h2>

          <div className="space-y-3 p-4 rounded-2xl bg-slate-50">
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text" 
                placeholder="Candidate Name" 
                value={candForm.name}
                onChange={e => setCandForm({ ...candForm, name: e.target.value })}
                className="h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <select 
                value={candForm.post}
                onChange={e => setCandForm({ ...candForm, post: e.target.value })}
                className="h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select Category</option>
                {posts.map(p => <option key={p.key} value={p.key}>{p.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text" 
                placeholder="Symbol Text (e.g. Star)" 
                value={candForm.symbol}
                onChange={e => setCandForm({ ...candForm, symbol: e.target.value })}
                className="h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button 
                onClick={handleCreateCandidate}
                className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition"
              >
                Nominate Candidate
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-2">
            {posts.map(p => {
              const cands = candidates.filter(c => c.post_key === p.key);
              if (cands.length === 0) return null;
              return (
                <div key={p.key} className="py-4 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{p.title}</div>
                  {cands.map(c => (
                    <div key={c.id} className="flex items-center justify-between bg-slate-50/50 p-3 rounded-xl">
                      <div>
                        <div className="font-semibold text-slate-700">{c.name}</div>
                        <div className="text-xs text-slate-500">Symbol: {c.symbol}</div>
                      </div>
                      <button onClick={() => handleDeleteCandidate(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Compiler / Publisher */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h2 className="text-2xl font-bold font-display flex items-center gap-2">
            <FileText className="w-6 h-6" /> Compile & Publish Results
          </h2>
          <p className="text-blue-100 mt-1 max-w-xl">Compile casted ballots, calculate winners, and archive the election data for public lookup.</p>
        </div>
        <div className="flex items-center gap-4">
          <input 
            type="text" 
            placeholder="Session (e.g. 2026-27)" 
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            className="h-12 w-40 px-4 rounded-xl border-none focus:outline-none text-slate-800 font-bold text-center"
          />
          <button 
            onClick={publishResults}
            className="px-6 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm tracking-wide flex items-center gap-2 shadow-sm transition"
          >
            Publish Archive
          </button>
        </div>
      </div>
    </div>
  );
}
