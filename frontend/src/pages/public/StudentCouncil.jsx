import { useEffect, useState } from "react";
import api, { parseImageTransform } from "../../lib/api";
import { parseCandidateTransform } from "../../lib/api_elections";
import { Crown, Vote, Trophy, X, Clock, Sparkles, Star, Award, Users } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
function fullUrl(u) { return u?.startsWith("http") || u?.startsWith("data:") ? u : `${BACKEND}${u}`; }

/* ───────────────────────────────────────────────────────
   COUNTDOWN CARD (small timer digit box)
   ─────────────────────────────────────────────────────── */
const CountdownCard = ({ value, label }) => (
  <div className="bg-brand-paper/85 rounded-xl border border-black/5 p-3 text-center shadow-sm">
    <div className="font-headline text-2xl font-black text-brand-blue tabular-nums">{String(value).padStart(2, '0')}</div>
    <div className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mt-1">{label}</div>
  </div>
);

/* ───────────────────────────────────────────────────────
   CONFETTI + POPPER BURST (premium particle system)
   ─────────────────────────────────────────────────────── */
const ConfettiShower = () => {
  const shapes = ["circle", "rect", "star"];
  const colors = ["#F4D571", "#D4AF37", "#3b82f6", "#0E3B91", "#ef4444", "#10b981", "#8b5cf6", "#ec4899", "#f97316", "#06b6d4"];
  const particles = Array.from({ length: 120 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 6}s`,
    duration: `${4 + Math.random() * 5}s`,
    size: `${5 + Math.random() * 10}px`,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotate: Math.random() * 720 - 360,
    drift: Math.random() * 120 - 60,
    shape: shapes[Math.floor(Math.random() * shapes.length)],
    opacity: 0.6 + Math.random() * 0.4,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute animate-confetti-fall"
          style={{
            left: p.left,
            width: p.size,
            height: p.shape === "rect" ? `${parseInt(p.size) * 0.6}px` : p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : p.shape === "star" ? "2px" : "1px",
            animationDelay: p.delay,
            animationDuration: p.duration,
            "--drift": `${p.drift}px`,
            "--rotate": `${p.rotate}deg`,
            opacity: p.opacity,
            clipPath: p.shape === "star" ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            top: -20px;
            transform: rotate(0deg) translateX(0);
            opacity: 1;
          }
          25% {
            transform: rotate(calc(var(--rotate) * 0.4)) translateX(calc(var(--drift) * 0.5));
          }
          50% {
            transform: rotate(calc(var(--rotate) * 0.7)) translateX(var(--drift));
          }
          75% {
            transform: rotate(calc(var(--rotate) * 0.9)) translateX(calc(var(--drift) * 0.7));
            opacity: 0.7;
          }
          100% {
            top: 105vh;
            transform: rotate(var(--rotate)) translateX(calc(var(--drift) * 0.3));
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation-name: confetti-fall;
          animation-iteration-count: infinite;
          animation-timing-function: cubic-bezier(0.37, 0, 0.63, 1);
        }

        /* Card entry animation */
        @keyframes card-reveal {
          0% {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          60% {
            transform: translateY(-5px) scale(1.01);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-card-reveal {
          animation: card-reveal 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }

        /* Winner crown bounce */
        @keyframes crown-float {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-6px) rotate(5deg); }
        }
        .animate-crown-float {
          animation: crown-float 3s ease-in-out infinite;
        }

        /* Gold shimmer effect */
        @keyframes gold-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .gold-shimmer-text {
          background: linear-gradient(90deg, #D4AF37 0%, #F4D571 25%, #FFE4A0 50%, #F4D571 75%, #D4AF37 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gold-shimmer 4s linear infinite;
        }

        /* Vote bar fill */
        @keyframes bar-fill {
          0% { width: 0; }
        }
        .animate-bar-fill {
          animation: bar-fill 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        /* Popper burst */
        @keyframes popper-burst {
          0% { transform: scale(0); opacity: 1; }
          50% { transform: scale(1.5); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
        .animate-popper {
          animation: popper-burst 1.2s ease-out forwards;
        }

        /* Sparkle rotate */
        @keyframes sparkle-spin {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.7; }
          50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
        }
        .animate-sparkle {
          animation: sparkle-spin 2.5s ease-in-out infinite;
        }

        /* Pulse ring */
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(244, 213, 113, 0.6); }
          70% { box-shadow: 0 0 0 15px rgba(244, 213, 113, 0); }
          100% { box-shadow: 0 0 0 0 rgba(244, 213, 113, 0); }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2s ease-out infinite;
        }

        /* Number count up effect */
        @keyframes count-pop {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-count-pop {
          animation: count-pop 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

/* ───────────────────────────────────────────────────────
   WINNER SPOTLIGHT CARD (hero section per post)
   ─────────────────────────────────────────────────────── */
const WinnerSpotlight = ({ winners = [], position, totalVotes, allCandidates, index, isAppointed }) => {
  return (
    <div
      className="animate-card-reveal relative"
      style={{ animationDelay: `${index * 0.2}s` }}
    >
      {/* Main card */}
      <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl border border-black/[0.06] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 group">
        
        {/* Gold/Blue accent header */}
        <div className="relative bg-gradient-to-r from-[#0E3B91] via-[#1a55b6] to-[#0E3B91] px-6 py-5 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_30%,rgba(255,255,255,0.08)_50%,transparent_70%)] bg-[length:200%_100%] group-hover:animate-[gold-shimmer_2s_linear]" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-blue-200/80 mb-1">Position</div>
              <h3 className="font-headline text-xl font-black text-white tracking-tight">{position}</h3>
            </div>
            {!isAppointed && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20">
                <Users className="w-3.5 h-3.5 text-white/80" />
                <span className="text-xs font-bold text-white/90 tabular-nums">{totalVotes} votes cast</span>
              </div>
            )}
            {isAppointed && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur border border-white/20">
                <Star className="w-3.5 h-3.5 text-white/80" />
                <span className="text-xs font-bold text-white/90">Appointed</span>
              </div>
            )}
          </div>
        </div>

        {/* Winner hero section */}
        <div className="relative px-6 pt-8 pb-6">
          {/* Popper burst decoration */}
          <div className="absolute top-4 left-6 w-16 h-16 rounded-full bg-amber-400/10 animate-popper" style={{ animationDelay: `${index * 0.2 + 0.5}s` }} />
          <div className="absolute top-8 right-10 w-12 h-12 rounded-full bg-blue-400/10 animate-popper" style={{ animationDelay: `${index * 0.2 + 0.8}s` }} />
          
          <div className={`grid ${winners.length > 1 ? "grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 gap-6" : "grid-cols-1"}`}>
            {winners.map((winner, wIdx) => {
              const winnerPhoto = winner?.photo ? (winner.photo.startsWith("data:") || winner.photo.startsWith("http") ? winner.photo : fullUrl(winner.photo)) : null;
              const winnerPct = totalVotes > 0 ? Math.round((winner.votes / totalVotes) * 100) : 0;
              const isWinnerVice = winner.is_vice;
              const isWinnerAppointed = isAppointed || isWinnerVice;

              return (
                <div key={winner.candidate_id || wIdx} className={`flex items-center gap-6 ${winners.length > 1 && wIdx > 0 ? "pt-6 md:pt-0 md:pl-6" : ""}`}>
                  {/* Winner photo with crown / star */}
                  <div className="relative shrink-0">
                    {/* Sparkles around photo */}
                    <Sparkles className="absolute -top-3 -left-2 w-5 h-5 text-amber-400 animate-sparkle" style={{ animationDelay: "0s" }} />
                    <Star className="absolute -top-1 -right-3 w-4 h-4 text-amber-300 animate-sparkle" style={{ animationDelay: "0.8s" }} />
                    <Sparkles className="absolute -bottom-2 -left-3 w-4 h-4 text-amber-400/70 animate-sparkle" style={{ animationDelay: "1.6s" }} />

                    {/* Crown / Star / Award */}
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 animate-crown-float">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                        isWinnerVice
                          ? "from-purple-400 to-purple-600"
                          : isAppointed
                            ? "from-blue-400 to-blue-600"
                            : "from-[#F4D571] to-[#B9892B]"
                      } flex items-center justify-center shadow-lg border-2 border-white`}>
                        {isWinnerVice ? <Award className="w-5 h-5 text-white" /> : isAppointed ? <Star className="w-5 h-5 text-white fill-white" /> : <Crown className="w-5 h-5 text-white" />}
                      </div>
                    </div>

                    {/* Photo */}
                    <div className={`w-24 h-24 rounded-2xl ring-[3px] ${
                      isWinnerVice
                        ? "ring-purple-400/50"
                        : isAppointed
                          ? "ring-blue-400/50"
                          : "ring-amber-400/50"
                    } overflow-hidden bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg animate-pulse-ring`}>
                      {winnerPhoto ? (() => {
                        const { style, cleanUrl } = parseCandidateTransform(winnerPhoto);
                        return <img src={cleanUrl} alt={winner.name} style={style} className="w-full h-full object-cover" />;
                      })() : (
                        <div className="w-full h-full flex items-center justify-center text-3xl font-headline font-black text-amber-600">
                          {winner.name?.[0]}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Winner info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isWinnerVice ? (
                        <>
                          <Award className="w-4 h-4 text-purple-500" />
                          <span className="text-[10px] tracking-[0.3em] uppercase font-extrabold text-purple-600">
                            Appointed Vice
                          </span>
                        </>
                      ) : isAppointed ? (
                        <>
                          <Star className="w-4 h-4 text-blue-500 fill-blue-500" />
                          <span className="text-[10px] tracking-[0.3em] uppercase font-extrabold text-blue-600">
                            Appointed by School Management
                          </span>
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span className="text-[10px] tracking-[0.3em] uppercase font-extrabold text-amber-600">
                            Winner
                          </span>
                        </>
                      )}
                    </div>
                    <h4 className="font-headline text-xl font-black text-slate-900 tracking-tight leading-tight break-words">
                      {winner.name}
                    </h4>
                    {winner.symbol && (
                      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Symbol: {winner.symbol}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <div className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border shadow-sm ${
                        isWinnerVice
                          ? "bg-purple-50 border-purple-200/60 text-purple-700 font-extrabold text-sm"
                          : isAppointed
                            ? "bg-blue-50 border-blue-200/60 text-blue-700 font-extrabold text-sm"
                            : "bg-gradient-to-r from-emerald-50 to-emerald-100/80 border border-emerald-200/60 text-emerald-700 text-sm font-extrabold"
                      }`}>
                        {isWinnerVice ? (
                          <>
                            <Award className="w-3.5 h-3.5 text-purple-500" />
                            Vice Captain
                          </>
                        ) : isAppointed ? (
                          <>
                            <Star className="w-3.5 h-3.5 fill-blue-500 text-blue-500" />
                            Appointed Winner
                          </>
                        ) : (
                          <>
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="tabular-nums animate-count-pop" style={{ animationDelay: `${index * 0.2 + 0.4}s` }}>
                              {winner.votes} votes
                            </span>
                            <span className="text-xs font-bold text-emerald-500">({winnerPct}%)</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        {/* All candidates breakdown */}
        <div className="px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${isAppointed ? "from-blue-400 to-blue-600" : "from-amber-400 to-amber-600"}`} />
            <span className="text-[10px] tracking-[0.25em] uppercase font-extrabold text-slate-500">All Candidates</span>
            <span className="text-[10px] font-bold text-slate-300 ml-auto">{allCandidates.length} total</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {allCandidates.map((c, i) => {
              const pct = totalVotes > 0 ? Math.round((c.votes / totalVotes) * 100) : 0;
              const isWinner = i === 0 && c.votes > 0;
              const candidatePhoto = c.photo ? (c.photo.startsWith("data:") || c.photo.startsWith("http") ? c.photo : fullUrl(c.photo)) : null;

              return (
                <div
                  key={c.candidate_id || c.name}
                  className={`flex items-center gap-2 p-2 rounded-xl transition-all duration-300 ${
                    isWinner
                      ? isAppointed
                        ? "bg-blue-50/50 border border-blue-200/50"
                        : "bg-amber-50/60 border border-amber-200/50"
                      : "bg-slate-50/60 border border-transparent"
                  }`}
                >
                  {/* Rank badge */}
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isWinner
                      ? isAppointed
                        ? "bg-blue-500 text-white"
                        : "bg-gradient-to-br from-amber-400 to-amber-500 text-white"
                      : i === 1
                        ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white"
                        : i === 2
                          ? "bg-gradient-to-br from-orange-300 to-orange-400 text-white"
                          : "bg-slate-200 text-slate-500"
                  }`}>
                    {i + 1}
                  </div>

                  {/* Photo */}
                  <div className={`w-8 h-8 rounded-lg overflow-hidden shrink-0 ${
                    isWinner ? isAppointed ? "ring-1 ring-blue-300/50" : "ring-1 ring-amber-300/50" : "ring-1 ring-slate-200"
                  }`}>
                    {candidatePhoto ? (() => {
                      const { style, cleanUrl } = parseCandidateTransform(candidatePhoto);
                      return <img src={cleanUrl} alt={c.name} style={style} className="w-full h-full object-cover" />;
                    })() : (
                      <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${
                        isWinner ? isAppointed ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {c.name?.[0]}
                      </div>
                    )}
                  </div>

                  {/* Name + votes */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-bold truncate flex items-center gap-1 ${isWinner ? isAppointed ? "text-blue-900" : "text-amber-900" : "text-slate-700"}`}>
                      {c.name}
                      {isWinner && (isAppointed ? <Star className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" /> : <Crown className="w-3 h-3 text-amber-500 shrink-0" />)}
                    </div>
                    {!isAppointed && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full animate-bar-fill"
                            style={{
                              width: `${pct}%`,
                              animationDelay: `${index * 0.2 + i * 0.1 + 0.3}s`,
                              background: isWinner
                                ? "linear-gradient(90deg, #f59e0b, #d97706)"
                                : i === 1
                                  ? "linear-gradient(90deg, #94a3b8, #64748b)"
                                  : "linear-gradient(90deg, #cbd5e1, #94a3b8)"
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-extrabold tabular-nums shrink-0 ${isWinner ? "text-amber-700" : "text-slate-500"}`}>
                          {c.votes} <span className="text-slate-400">({pct}%)</span>
                        </span>
                      </div>
                    )}
                    {isAppointed && isWinner && (
                      <span className="text-[8px] font-black text-blue-600 uppercase tracking-wide">Appointed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom accent */}
        <div className={`h-1 bg-gradient-to-r ${isAppointed ? "from-blue-600 via-blue-400 to-blue-600" : "from-[#0E3B91] via-[#F4D571] to-[#0E3B91]"}`} />
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────
   MAIN COMPONENT
   ─────────────────────────────────────────────────────── */
export default function StudentCouncil() {
  const [tab, setTab] = useState("results"); // Default to Results tab!
  const [profiles, setProfiles] = useState([]);
  const [posters, setPosters] = useState([]);
  const [results, setResults] = useState([]);
  const [electionStatus, setElectionStatus] = useState("loading");
  const [remaining, setRemaining] = useState(0);
  const [publishAt, setPublishAt] = useState(null);
  const [showPopup, setShowPopup] = useState(true);
  const [totalVoted, setTotalVoted] = useState(0);

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
        setTotalVoted(d.total_voted || 0);
        
        // Compile the live results — preserve ALL candidates per post
        const compiled = [];
        const dynamicProfiles = [];
        const viceCandidateIds = d.vice_candidate_ids || [];

        (d.posts || []).forEach(post => {
          const candidates = d.by_post?.[post.key] || [];
          const sorted = [...candidates].sort((a, b) => b.votes - a.votes);
          if (sorted.length > 0) {
            const total = sorted.reduce((sum, c) => sum + (c.votes || 0), 0);
            const isAppointed = (d.appointed_post_keys || []).includes(post.key);

            // Find Captain winner (highest votes who is NOT flagged as Vice)
            const nonViceCands = sorted.filter(c => !viceCandidateIds.includes(c.candidate_id));
            const captainWinner = nonViceCands[0] || sorted[0];

            // Find Vice Captain winner(s) (candidates flagged in vice_candidate_ids under this post)
            const viceWinners = sorted.filter(c => viceCandidateIds.includes(c.candidate_id));

            // Compile the list of spotlight winners
            const postWinners = [];
            postWinners.push({
              ...captainWinner,
              is_vice: false
            });
            viceWinners.forEach(vw => {
              postWinners.push({
                ...vw,
                is_vice: true
              });
            });

            compiled.push({
              id: post.key,
              year: "2026-27",
              position: post.title,
              is_appointed: isAppointed,
              all_candidates: sorted,
              total_votes: total,
              winners: postWinners // Store spotlight winners!
            });

            // If there's a winner, add them to dynamic profiles
            const maxVotes = sorted[0].votes || 0;
            const winners = maxVotes > 0 ? sorted.filter(c => c.votes === maxVotes) : [];
            const appointedWinners = isAppointed ? sorted.filter(c => c.votes === 100) : [];
            const finalWinners = isAppointed ? appointedWinners : winners;

            finalWinners.forEach((winner, wIdx) => {
              // Only add if not flagged as Vice (since Vice will be added separately below)
              if (!viceCandidateIds.includes(winner.candidate_id)) {
                dynamicProfiles.push({
                  id: `election-${post.key}-${winner.candidate_id || wIdx}`,
                  name: winner.name,
                  position: post.title,
                  photo_url: winner.photo,
                  year: "2026-27",
                  role_type: isAppointed ? "Appointed by School Management" : "Elected",
                  is_captain: !isAppointed,
                  order: post.order || 0
                });
              }
            });

            // Add Vice winners to dynamic profiles
            viceWinners.forEach((winner, wIdx) => {
              dynamicProfiles.push({
                id: `election-${post.key}-vice-${winner.candidate_id || wIdx}`,
                name: winner.name,
                position: "Vice " + post.title,
                photo_url: winner.photo,
                year: "2026-27",
                role_type: "Appointed by School Management",
                is_captain: false,
                is_vice: true,
                order: (post.order || 0) + 0.5
              });
            });
          }
        });
        if (compiled.length > 0) {
          setResults(compiled);
        }
        if (dynamicProfiles.length > 0) {
          setProfiles(prev => {
            const merged = [...prev];
            dynamicProfiles.forEach(dp => {
              const exists = prev.some(
                sp => (sp.name || "").toLowerCase() === (dp.name || "").toLowerCase() &&
                      (sp.position || "").toLowerCase() === (dp.position || "").toLowerCase()
              );
              if (!exists) {
                merged.push(dp);
              }
            });
            return merged.sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0));
          });
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
      <section className="bg-hero-grad py-16 relative overflow-hidden">
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
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
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-headline font-medium transition-all duration-300 ${
                tab === t.id
                  ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/25 scale-105"
                  : "bg-white border border-black/10 hover:border-brand-blue/30 hover:shadow-md"
              }`}
              data-testid={`council-tab-${t.id}`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── PROFILES TAB ── */}
        {tab === "profiles" && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {profiles.length === 0 && <div className="col-span-4 text-center text-brand-ink/60 py-10 italic">Profiles coming soon.</div>}
            {profiles.map(p => {
              const isVice = (p.position || "").toLowerCase().includes("vice");
              const isAppointed = p.role_type === "Appointed by School Management" || p.role_type === "Appointed by Admin";
              const isDiscipline = (p.position || "").toLowerCase().includes("discipline");

              return (
                <div key={p.id} className={`relative bg-white rounded-3xl p-5 border text-center beam-card transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
                  p.is_captain
                    ? "border-brand-gold ring-2 ring-brand-gold/30"
                    : isVice
                      ? "border-slate-300 ring-1 ring-slate-200/50"
                      : isDiscipline
                        ? "border-blue-300 ring-1 ring-blue-200/50"
                        : "border-black/5"
                }`}>
                  {/* Badge */}
                  {p.is_captain && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold-grad text-white text-[10px] uppercase tracking-wider rounded-full font-headline font-bold shadow-sm">
                      Captain
                    </div>
                  )}
                  {isVice && !p.is_captain && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-slate-400 to-slate-500 text-white text-[10px] uppercase tracking-wider rounded-full font-headline font-bold shadow-sm">
                      Vice
                    </div>
                  )}
                  {isDiscipline && !p.is_captain && !isVice && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[10px] uppercase tracking-wider rounded-full font-headline font-bold shadow-sm">
                      Discipline
                    </div>
                  )}

                  <div className={`w-24 h-24 rounded-full mx-auto overflow-hidden p-1 ${
                    p.is_captain
                      ? "bg-gradient-to-br from-brand-gold to-amber-600"
                      : isVice
                        ? "bg-gradient-to-br from-slate-300 to-slate-500"
                        : isDiscipline
                          ? "bg-gradient-to-br from-blue-400 to-blue-600"
                          : "bg-gradient-to-br from-brand-blue to-brand-orange"
                  }`}>
                    {p.photo_url ? (() => {
                      const { style, cleanUrl } = parseCandidateTransform(fullUrl(p.photo_url));
                      return <img src={cleanUrl} alt={p.name} style={style} className="w-full h-full rounded-full object-cover" />;
                    })() : <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl font-headline font-bold text-brand-blue">{p.name?.[0]}</div>}
                  </div>
                  <h3 className="font-headline font-semibold mt-3">{p.name}</h3>
                  <div className="text-xs text-brand-orange uppercase tracking-wider font-bold mt-1">{p.position}</div>
                  {isAppointed && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200/60 text-blue-600 text-[9px] uppercase tracking-wider font-extrabold mt-1.5">
                      <Star className="w-2.5 h-2.5" /> Appointed by School Management
                    </div>
                  )}
                  {p.house && <div className="text-xs text-brand-ink/60 mt-1">{p.house} House · {p.year}</div>}
                  {!p.house && p.year && <div className="text-xs text-brand-ink/60 mt-1">{p.year}</div>}
                  {p.bio && <p className="text-xs text-brand-ink/70 mt-3 line-clamp-3">{p.bio}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* ── POSTERS TAB ── */}
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

        {/* ── RESULTS TAB (the premium $1000 design) ── */}
        {tab === "results" && (
          <div>
            {results.length === 0 ? (
              <div className="bg-white/80 backdrop-blur rounded-3xl border border-black/5 p-16 text-center">
                <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <h3 className="font-headline text-xl font-bold text-slate-400 mb-2">Results Not Published Yet</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto">The election results will appear here once they are officially declared. Check back during the declaration ceremony!</p>
              </div>
            ) : (
              <>
                {/* Stats summary bar */}
                {totalVoted > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-black/[0.06] p-5 shadow-sm">
                      <div className="text-[10px] tracking-[0.25em] uppercase font-extrabold text-slate-400 mb-2">Total Votes Cast</div>
                      <div className="font-headline text-3xl font-black text-slate-900 tabular-nums">{totalVoted}</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-black/[0.06] p-5 shadow-sm">
                      <div className="text-[10px] tracking-[0.25em] uppercase font-extrabold text-slate-400 mb-2">Positions Contested</div>
                      <div className="font-headline text-3xl font-black text-slate-900">{results.length}</div>
                    </div>
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-black/[0.06] p-5 shadow-sm col-span-2 md:col-span-1">
                      <div className="text-[10px] tracking-[0.25em] uppercase font-extrabold text-slate-400 mb-2">Total Candidates</div>
                      <div className="font-headline text-3xl font-black text-slate-900">{results.reduce((sum, r) => sum + (r.all_candidates?.length || 2), 0)}</div>
                    </div>
                  </div>
                )}

                {/* Result cards — check if we have all_candidates (live data) or legacy format */}
                <div className="grid md:grid-cols-2 gap-8">
                  {results.map((r, i) => {
                    // If we have the new all_candidates array from live data
                    if (r.all_candidates && r.all_candidates.length > 0) {
                      const totalVotesInPost = r.all_candidates.reduce((s, c) => s + (c.votes || 0), 0);
                      const maxVotes = r.all_candidates[0].votes;
                      const postWinners = r.winners || (maxVotes > 0 ? r.all_candidates.filter(c => c.votes === maxVotes) : [r.all_candidates[0]]);
                      return (
                        <WinnerSpotlight
                          key={r.id || i}
                          winners={postWinners}
                          position={r.position}
                          totalVotes={totalVotesInPost}
                          allCandidates={r.all_candidates}
                          index={i}
                          isAppointed={r.is_appointed}
                        />
                      );
                    }

                    // Legacy format (only winner + runner_up from MongoDB)
                    const getCandidatePhoto = (photo) => {
                      if (!photo) return null;
                      if (photo.startsWith("data:") || photo.startsWith("http")) return photo;
                      return fullUrl(photo);
                    };
                    const winnerPhoto = getCandidatePhoto(r.winner_photo);
                    const runnerUpPhoto = getCandidatePhoto(r.runner_up_photo);
                    const totalVotesLeg = (r.votes || 0) + (r.runner_up_votes || 0);
                    const winnerPct = totalVotesLeg > 0 ? Math.round((r.votes / totalVotesLeg) * 100) : 0;
                    const runnerUpPct = totalVotesLeg > 0 ? Math.round((r.runner_up_votes / totalVotesLeg) * 100) : 0;

                    // Build a synthetic all_candidates array for legacy data
                    const legacyCandidates = [
                      { name: r.winner, photo: r.winner_photo, symbol: r.winner_symbol, votes: r.votes || 0, candidate_id: `winner-${i}` },
                    ];
                    if (r.runner_up && r.runner_up !== "-") {
                      legacyCandidates.push({ name: r.runner_up, photo: r.runner_up_photo, symbol: r.runner_up_symbol, votes: r.runner_up_votes || 0, candidate_id: `runner-${i}` });
                    }

                    return (
                      <WinnerSpotlight
                        key={r.id || i}
                        winners={legacyCandidates}
                        position={r.position}
                        totalVotes={totalVotesLeg}
                        allCandidates={legacyCandidates}
                        index={i}
                        isAppointed={r.is_appointed}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Confetti when live */}
      {electionStatus === "live" && <ConfettiShower />}

      {/* Countdown popup */}
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
