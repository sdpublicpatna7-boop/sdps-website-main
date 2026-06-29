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

const ConfettiShower = () => {
  const colors = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#8b5cf6", "#ec4899"];
  const particles = Array.from({ length: 80 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 4}s`,
    duration: `${3 + Math.random() * 3}s`,
    size: `${6 + Math.random() * 8}px`,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotate: `${Math.random() * 360}deg`
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-sm animate-fall"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotate})`,
            opacity: 0.8
          }}
        />
      ))}
      <style>{`
        @keyframes fall {
          0% {
            top: -20px;
            transform: rotate(0deg) translateX(0);
            opacity: 1;
          }
          50% {
            transform: rotate(180deg) translateX(20px);
          }
          100% {
            top: 105vh;
            transform: rotate(360deg) translateX(-20px);
            opacity: 0;
          }
        }
        .animate-fall {
          animation-name: fall;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
};

export default function StudentCouncil() {
  const [tab, setTab] = useState("results"); // Default to Results tab!
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
        setTab("profiles"); // Keep profiles default if countdown is active
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
              winner_photo: sorted[0].photo,
              winner_symbol: sorted[0].symbol,
              runner_up: sorted[1] ? sorted[1].name : "-",
              runner_up_photo: sorted[1] ? sorted[1].photo : null,
              runner_up_symbol: sorted[1] ? sorted[1].symbol : "",
              votes: sorted[0].votes,
              runner_up_votes: sorted[1] ? sorted[1].votes : 0
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
          <div>
            {results.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 p-10 text-center text-brand-ink/50 italic">
                No results published yet. Check back during declaration!
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {results.map((r, i) => {
                  const getCandidatePhoto = (photo) => {
                    if (!photo) return null;
                    if (photo.startsWith("data:") || photo.startsWith("http")) return photo;
                    return fullUrl(photo);
                  };
                  const winnerPhoto = getCandidatePhoto(r.winner_photo);
                  const runnerUpPhoto = getCandidatePhoto(r.runner_up_photo);
                  const totalVotes = (r.votes || 0) + (r.runner_up_votes || 0);
                  const winnerPct = totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0;
                  const runnerUpPct = totalVotes > 0 ? Math.round((r.runner_up_votes / totalVotes) * 100) : 0;

                  return (
                    <div key={r.id || i} className="relative bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col beam-card" data-testid={`result-card-${r.id}`}>
                      <div className="bg-gradient-to-r from-brand-blue to-brand-blue-light text-white px-5 py-3.5 flex items-center justify-between">
                        <span className="font-headline font-bold text-sm tracking-wide">{r.position}</span>
                        <span className="text-[10px] uppercase tracking-widest font-black bg-white/20 px-2 py-0.5 rounded-full">{r.year}</span>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                        <div className="text-center relative">
                          <div className="relative w-24 h-24 mx-auto mb-3">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center border-2 border-white shadow-md animate-bounce" style={{ animationDuration: '2s' }}>
                              <Crown className="w-4 h-4 text-white" />
                            </div>
                            <div className="w-full h-full rounded-full ring-4 ring-amber-400 overflow-hidden bg-gradient-to-br from-amber-100 to-amber-50 shadow-inner">
                              {winnerPhoto ? (
                                <img src={winnerPhoto} alt={r.winner} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-headline font-bold text-amber-600 bg-amber-100">
                                  {r.winner?.[0]}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="font-headline font-black text-brand-ink text-lg leading-tight flex items-center justify-center gap-1.5">
                            {r.winner}
                          </div>
                          {r.winner_symbol && (
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Symbol: {r.winner_symbol}</div>
                          )}
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-extrabold mt-2.5">
                            🏆 {r.votes} Votes ({winnerPct}%)
                          </div>
                        </div>

                        <div className="border-t border-black/5" />

                        {r.runner_up && r.runner_up !== "-" ? (
                          <div className="flex items-center gap-3.5 bg-slate-50/50 rounded-2xl p-3 border border-black/[0.02]">
                            <div className="relative w-12 h-12 shrink-0">
                              <div className="w-full h-full rounded-full ring-2 ring-slate-300 overflow-hidden bg-slate-100">
                                {runnerUpPhoto ? (
                                  <img src={runnerUpPhoto} alt={r.runner_up} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-lg font-headline font-bold text-slate-500 bg-slate-200">
                                    {r.runner_up?.[0]}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs text-slate-400 uppercase tracking-widest font-extrabold">Runner-Up</div>
                              <div className="font-headline font-bold text-sm text-slate-700 truncate">{r.runner_up}</div>
                              {r.runner_up_symbol && (
                                <div className="text-[9px] text-slate-400">Symbol: {r.runner_up_symbol}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-black text-slate-600 tabular-nums">{r.runner_up_votes || 0}</div>
                              <div className="text-[9px] font-bold text-slate-400">Votes ({runnerUpPct}%)</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-slate-400 italic">No opposition candidate.</div>
                        )}

                        {r.runner_up && r.runner_up !== "-" && (
                          <div className="space-y-1">
                            <div className="h-2 rounded-full bg-slate-100 flex overflow-hidden">
                              <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full" style={{ width: `${winnerPct}%` }} />
                              <div className="bg-slate-300 h-full rounded-full" style={{ width: `${runnerUpPct}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              <span>Winner ({winnerPct}%)</span>
                              <span>Runner-Up ({runnerUpPct}%)</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {electionStatus === "live" && <ConfettiShower />}

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
