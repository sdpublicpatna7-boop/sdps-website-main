import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Crown, Vote, Trophy, X, Clock } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
function fullUrl(u) { return u?.startsWith("http") ? u : `${BACKEND}${u}`; }

const CountdownCard = ({ value, label }) => (
  <div className="bg-brand-paper/85 rounded-xl border border-black/5 p-3 text-center shadow-sm">
    <div className="font-headline text-2xl font-black text-brand-blue tabular-nums">{String(value).padStart(2, '0')}</div>
    <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mt-1">{label}</div>
  </div>
);

export default function StudentCouncil() {
  const [tab, setTab] = useState("profiles");
  const [profiles, setProfiles] = useState([]);
  const [posters, setPosters] = useState([]);
  const [results, setResults] = useState([]);
  const [electionStatus, setElectionStatus] = useState("loading");
  const [remaining, setRemaining] = useState(0);
  const [publishAt, setPublishAt] = useState(null);
  const [showPopup, setShowPopup] = useState(true);

  useEffect(() => {
    api.get("/council/profiles").then(r => setProfiles(r.data || [])).catch(() => {});
    api.get("/council/posters").then(r => setPosters(r.data || [])).catch(() => {});
    api.get("/council/results").then(r => setResults(r.data || [])).catch(() => {});

    // Check live results countdown
    api.get("/elections/public-results").then(r => {
      const d = r.data;
      if (d.status === "countdown") {
        setElectionStatus("countdown");
        setRemaining(d.remaining_seconds);
        setPublishAt(d.publish_at);
      } else if (d.status === "live") {
        setElectionStatus("live");
        setTab("results"); // Switch directly to results tab since results are published!
        
        // Compile the live results
        const compiled = [];
        (d.posts || []).forEach(post => {
          const candidates = d.by_post?.[post.key] || [];
          const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
          if (sorted.length > 0) {
            compiled.push({
              id: post.key,
              year: "2026-27",
              position: post.title,
              winner: sorted[0].name,
              runner_up: sorted[1] ? sorted[1].name : "-",
              votes: sorted[0].votes
            });
          }
        });
        if (compiled.length > 0) {
          setResults(compiled);
        }
      } else {
        setElectionStatus("sealed");
      }
    }).catch(() => {
      setElectionStatus("sealed");
    });
  }, []);

  useEffect(() => {
    if (electionStatus !== "countdown" || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [electionStatus, remaining]);

  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="overline mb-3">Leadership in Action</div>
          <h1 className="legacy-title brand-gradient-text">Student Council</h1>
          <p className="mt-4 text-brand-ink/70 max-w-2xl mx-auto">Empowering students with leadership, responsibility and pride.</p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-wrap gap-2 justify-center mb-10" data-testid="council-tabs">
          {[
            { id: "profiles", label: "Council Members", icon: Crown },
            { id: "posters", label: "Pre-Election Posters", icon: Vote },
            { id: "results", label: "Election Results", icon: Trophy },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-headline font-medium transition ${tab === t.id ? "bg-brand-blue text-white shadow-lg" : "bg-white border border-black/10"}`}
              data-testid={`council-tab-${t.id}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === "profiles" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {profiles.length === 0 && <div className="col-span-4 text-center text-brand-ink/60 py-10 italic">Profiles coming soon.</div>}
            {profiles.map(p => (
              <div key={p.id} className={`relative bg-white rounded-3xl p-5 border ${p.is_captain ? "border-brand-gold ring-2 ring-brand-gold/30" : "border-black/5"} text-center beam-card`}>
                {p.is_captain && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold-grad text-white text-[10px] uppercase tracking-wider rounded-full font-headline font-bold">Captain</div>
                )}
                <div className="w-24 h-24 rounded-full mx-auto overflow-hidden bg-gradient-to-br from-brand-blue to-brand-orange p-1">
                  {p.photo_url ? <img src={fullUrl(p.photo_url)} alt={p.name} className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-headline font-bold text-brand-blue">{p.name?.[0]}</div>}
                </div>
                <h3 className="font-headline font-semibold mt-3">{p.name}</h3>
                <div className="text-xs text-brand-orange uppercase tracking-wider font-bold mt-1">{p.position}</div>
                {p.house && <div className="text-xs text-brand-ink/60 mt-1">{p.house} House · {p.year}</div>}
                {p.bio && <p className="text-xs text-brand-ink/70 mt-3 line-clamp-3">{p.bio}</p>}
              </div>
            ))}
          </div>
        )}

        {tab === "posters" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {posters.length === 0 && <div className="col-span-4 text-center text-brand-ink/60 py-10 italic">No posters available.</div>}
            {posters.map(p => (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-black/5 beam-card">
                <img src={fullUrl(p.poster_url)} alt={p.candidate_name} className="w-full object-contain max-h-72 bg-white" />
                <div className="p-4">
                  <h3 className="font-headline font-semibold">{p.candidate_name}</h3>
                  <div className="text-xs text-brand-orange uppercase tracking-wider font-bold">{p.position} · {p.year}</div>
                  {p.bio && <p className="text-xs text-brand-ink/60 mt-2">{p.bio}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "results" && (
          <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
            {results.length === 0 ? <div className="text-center text-brand-ink/60 py-10 italic">No results published yet.</div> : (
              <table className="w-full text-sm">
                <thead className="bg-brand-blue/5 text-brand-ink/70 uppercase text-xs tracking-wider">
                  <tr>
                    <th className="text-left py-3 px-4">Year</th>
                    <th className="text-left py-3 px-4">Position</th>
                    <th className="text-left py-3 px-4">Winner</th>
                    <th className="text-left py-3 px-4">Runner-Up</th>
                    <th className="text-left py-3 px-4">Votes</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(r => (
                    <tr key={r.id} className="border-t border-black/5">
                      <td className="py-3 px-4 font-headline font-semibold">{r.year}</td>
                      <td className="py-3 px-4">{r.position}</td>
                      <td className="py-3 px-4 text-brand-blue font-semibold">{r.winner}</td>
                      <td className="py-3 px-4">{r.runner_up || "-"}</td>
                      <td className="py-3 px-4">{r.votes ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {electionStatus === "countdown" && showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative bg-white/90 backdrop-blur border border-brand-gold/40 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl overflow-hidden">
            <div className="absolute -top-24 -left-20 w-48 h-48 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-20 w-48 h-48 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
            
            <button 
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F4D571] to-[#B9892B] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-brand-gold/25 animate-bounce">
              <Trophy className="w-8 h-8 text-white" />
            </div>

            <div className="overline mb-3 text-brand-orange">Student Council Elections</div>
            <h3 className="font-headline text-3xl font-black text-brand-ink mb-3 tracking-tight">
              Results Declaration
            </h3>
            <p className="text-sm text-brand-ink/70 mb-8 max-w-xs mx-auto">
              The official polling data is being compiled. The results will be revealed in:
            </p>

            <div className="grid grid-cols-4 gap-3 mb-8">
              <CountdownCard value={Math.floor(remaining / 86400)} label="Days" />
              <CountdownCard value={Math.floor((remaining % 86400) / 3600)} label="Hours" />
              <CountdownCard value={Math.floor((remaining % 3600) / 60)} label="Mins" />
              <CountdownCard value={remaining % 60} label="Secs" />
            </div>

            <div className="text-xs text-slate-400 tracking-wider">
              Scheduled Date: {publishAt ? new Date(publishAt).toLocaleString() : ""}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
