import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Crown, Sparkles, Users, ShieldCheck, RefreshCw, Lock, Clock } from "lucide-react";

export default function LiveResults() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | sealed | countdown | live
  const [remaining, setRemaining] = useState(0);
  const [publishAt, setPublishAt] = useState(null);
  const [pulse, setPulse] = useState(false);

  const load = async () => {
    try {
      const { data: d } = await api.get("/elections/public-results");
      if (d.status === "sealed") {
        setStatus("sealed");
      } else if (d.status === "countdown") {
        setStatus("countdown");
        setRemaining(d.remaining_seconds);
        setPublishAt(d.publish_at);
      } else if (d.status === "live") {
        setStatus("live");
        setData(d);
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
      }
    } catch {
      setStatus("sealed");
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (status !== "countdown") return;
    const id = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          // Time's up — reload to get results
          load();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line
  }, [status]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  // Countdown View
  if (status === "countdown") {
    return (
      <div className="kiosk-bg min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
        <div className="orb b w-[640px] h-[640px] -top-48 -left-40" />
        <div className="orb g w-[520px] h-[520px] top-1/2 -right-32" style={{ animationDelay: "2s" }} />
        <div className="orb s w-[400px] h-[400px] -bottom-40 left-1/3" style={{ animationDelay: "5s" }} />

        <div className="relative z-10 text-center max-w-2xl mx-auto px-8">
          <div className="text-xs tracking-[0.36em] uppercase font-bold text-[color:var(--sdps-blue)] mb-4">
            SDPS · Student Council Election
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-black hero-3d leading-none mb-4">
            Results <span className="gold-text">Coming Soon</span>
          </h1>
          <p className="text-lg text-[color:var(--sdps-ink)] font-medium mb-12 max-w-lg mx-auto">
            The official results are being compiled and will be revealed when the countdown reaches zero.
          </p>

          {/* Countdown Clock */}
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-10">
            <CountdownUnit value={hours} label="Hours" />
            <span className="text-4xl font-black gold-text animate-pulse">:</span>
            <CountdownUnit value={minutes} label="Minutes" />
            <span className="text-4xl font-black gold-text animate-pulse">:</span>
            <CountdownUnit value={seconds} label="Seconds" />
          </div>

          {publishAt && (
            <div className="glass rounded-2xl px-6 py-3 inline-flex items-center gap-3">
              <Clock className="w-5 h-5 text-[color:var(--sdps-blue)]" />
              <span className="text-sm font-bold text-[color:var(--sdps-ink)]">
                Scheduled: {new Date(publishAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <footer className="relative z-10 text-center pb-8 mt-16 text-xs tracking-[0.32em] uppercase text-[color:var(--sdps-muted)]">
          SDPS Student Council Election · One Person · One Vote · One Future
        </footer>
      </div>
    );
  }

  // Sealed View
  if (status === "sealed" || status === "loading") {
    return (
      <div className="kiosk-bg min-h-screen relative overflow-hidden flex flex-col items-center justify-center">
        <div className="orb b w-[640px] h-[640px] -top-48 -left-40" />
        <div className="orb g w-[520px] h-[520px] top-1/2 -right-32" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 text-center max-w-xl mx-auto px-8">
          {status === "loading" ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[color:var(--sdps-blue)] mx-auto" />
          ) : (
            <>
              <Lock className="w-16 h-16 text-[color:var(--sdps-muted)] mx-auto mb-6" />
              <h1 className="font-display text-5xl md:text-6xl font-black hero-3d leading-none mb-4">
                Results <span className="gold-text">Sealed</span>
              </h1>
              <p className="text-lg text-[color:var(--sdps-muted)] font-medium">
                The election results have not been released yet. Please check back later.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Live Results View
  return (
    <div className="kiosk-bg min-h-screen relative overflow-hidden">
      <div className="orb b w-[640px] h-[640px] -top-48 -left-40" />
      <div className="orb g w-[520px] h-[520px] top-1/2 -right-32" style={{ animationDelay: "2s" }} />
      <div className="orb s w-[400px] h-[400px] -bottom-40 left-1/3" style={{ animationDelay: "5s" }} />

      <header className="relative z-10 max-w-7xl mx-auto px-8 pt-10 flex items-center justify-between">
        <div>
          <div className="text-xs tracking-[0.32em] uppercase font-bold text-[color:var(--sdps-blue)]">
            SDPS · Election Results
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-black hero-3d mt-2 leading-none">
            Official <span className="gold-text">Results</span>
          </h1>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-white/80 ${pulse ? "ring-2 ring-[color:var(--sdps-gold)]" : ""}`}>
            <RefreshCw className={`w-3.5 h-3.5 text-[color:var(--sdps-blue)] ${pulse ? "animate-spin" : ""}`} />
            <span className="text-xs font-bold tracking-widest">LIVE</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-8 py-10">
        {!data ? (
          <div className="text-center text-[color:var(--sdps-muted)] py-20">Loading…</div>
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <KPI icon={Users} label="Eligible" value={data.total_users || data.total_voted || "—"} />
              <KPI icon={ShieldCheck} label="Voted" value={data.total_voted} accent="gold" />
              <KPI icon={Sparkles} label="Turnout" value={data.turnout_pct ? `${data.turnout_pct}%` : "—"} />
              <KPI icon={Crown} label="Categories" value={data.posts?.length || 0} />
            </section>

            <section className="space-y-8">
              {data.posts?.map(p => (
                <PostBlock key={p.key} post={p} list={data.by_post?.[p.key] || []} appointedKeys={data.appointed_post_keys || []} />
              ))}
            </section>
          </>
        )}
      </main>

      <footer className="relative z-10 text-center pb-8 text-xs tracking-[0.32em] uppercase text-[color:var(--sdps-muted)]">
        SDPS Student Council Election · One Person · One Vote · One Future
      </footer>
    </div>
  );
}

const CountdownUnit = ({ value, label }) => (
  <div className="glass rounded-2xl px-5 py-4 min-w-[100px] text-center">
    <div className="font-display text-5xl md:text-6xl font-black hero-3d tabular-nums">
      {String(value).padStart(2, "0")}
    </div>
    <div className="text-[10px] tracking-[0.28em] uppercase font-bold text-[color:var(--sdps-muted)] mt-1">{label}</div>
  </div>
);

const KPI = ({ icon: Icon, label, value, accent }) => (
  <div className="glass rounded-2xl p-5">
    <div className="flex items-center justify-between">
      <div className="text-[10px] tracking-[0.28em] uppercase font-bold text-[color:var(--sdps-muted)]">{label}</div>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent === "gold"
        ? "bg-gradient-to-br from-[#F4D571] to-[#B9892B]"
        : "bg-gradient-to-br from-[#0F3C8A] to-[#1A55B6]"
        }`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    <div className="font-display text-4xl md:text-5xl font-black mt-3 hero-3d">{value}</div>
  </div>
);

const PostBlock = ({ post, list, appointedKeys = [] }) => {
  const total = Math.max(1, list.reduce((s, x) => s + (x.votes || 0), 0));
  const sorted = [...list].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const isPostAppointed = appointedKeys.includes(post.key);

  return (
    <div className="glass rounded-3xl p-7">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-3xl md:text-4xl font-black hero-3d">{post.title}</h2>
        {sorted[0] && sorted[0].votes > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#F4D571] to-[#D4AF37] text-[#1a1a1a] text-sm font-bold shadow">
            {isPostAppointed ? <Sparkles className="w-4 h-4 text-[#1a1a1a]" /> : <Crown className="w-4 h-4" />}
            {isPostAppointed ? "Selected by Admin" : "Winner"}: {sorted[0].name} {!isPostAppointed && `(${sorted[0].votes} ${sorted[0].votes === 1 ? 'vote' : 'votes'})`}
          </div>
        )}
      </div>
      {sorted.length === 0 ? (
        <div className="text-[color:var(--sdps-muted)]">No candidates</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c, i) => {
            const pct = Math.round(((c.votes || 0) / total) * 100);
            const isLeader = i === 0 && (c.votes || 0) > 0;
            return (
              <div key={c.candidate_id || c.name} className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-blue-100">
                  {c.photo ? (
                    <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center font-bold text-[color:var(--sdps-blue)]">
                      {c.name?.[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-bold truncate flex items-center gap-2">
                      {c.name}
                      {isLeader && (isPostAppointed ? <Sparkles className="w-4 h-4 text-[color:var(--sdps-gold)]" /> : <Crown className="w-4 h-4 text-[color:var(--sdps-gold)]" />)}
                    </div>
                    {!isPostAppointed && (
                      <div className="text-sm font-bold tabular-nums">
                        {c.votes || 0} {(c.votes || 0) === 1 ? 'vote' : 'votes'}
                        <span className="text-[color:var(--sdps-muted)] font-medium"> · {pct}%</span>
                      </div>
                    )}
                  </div>
                  {!isPostAppointed && (
                    <div className="h-3 rounded-full bg-blue-100 overflow-hidden">
                      <div
                        className="h-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: isLeader
                            ? "linear-gradient(90deg,#F4D571,#D4AF37)"
                            : "linear-gradient(90deg,#0F3C8A,#4A78D6)"
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
