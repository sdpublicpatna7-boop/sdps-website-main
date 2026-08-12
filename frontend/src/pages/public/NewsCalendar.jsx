import { useEffect, useState } from "react";
import api, { optimizeCloudinary } from "../../lib/api";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
function fullUrl(u) { return u?.startsWith("http") ? u : `${BACKEND}${u}`; }

export function NewsList() {
  const [news, setNews] = useState([]);
  useEffect(() => { api.get("/news").then(r => setNews(r.data || [])).catch(() => {}); }, []);
  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="overline mb-3">Latest from SDPS</div>
          <h1 className="legacy-title brand-gradient-text">News & Events</h1>
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-6">
        {news.length === 0 && <div className="col-span-2 text-center text-brand-ink/60 py-20">No news yet.</div>}
        {news.map(n => (
          <article key={n.id} className="bg-white rounded-2xl p-6 border border-black/5 beam-card" data-testid={`news-${n.id}`}>
            {n.image_url && <img src={optimizeCloudinary(fullUrl(n.image_url), 500)} alt="" className="w-full object-contain max-h-48 bg-white rounded-xl mb-4" />}
            <div className="text-xs text-brand-orange uppercase tracking-wider font-semibold">{n.date} · {n.category}</div>
            <h3 className="font-headline font-semibold text-xl mt-2 mb-2">{n.title}</h3>
            <p className="text-sm text-brand-ink/70">{n.content}</p>
          </article>
        ))}
      </div>
    </>
  );
}

export function NoticesList() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/notices").then(r => setItems(r.data || [])).catch(() => {}); }, []);
  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="overline mb-3">Important Updates</div>
          <h1 className="legacy-title brand-gradient-text">Notices</h1>
        </div>
      </section>
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-4">
        {items.length === 0 && <div className="text-center text-brand-ink/60 py-20">No notices yet.</div>}
        {items.map(n => (
          <div key={n.id} className="bg-white rounded-2xl p-5 border border-black/5 flex items-start justify-between gap-4 beam-card" data-testid={`notice-${n.id}`}>
            <div className="flex-1">
              {n.pinned && <span className="inline-block mb-2 px-2 py-0.5 bg-brand-orange text-white text-[10px] uppercase tracking-wider rounded-full">Pinned</span>}
              <div className="text-xs text-brand-ink/50 mb-1">{n.date}</div>
              <h3 className="font-headline font-semibold text-brand-ink hover:text-[#0E3B91] transition">
                <a href={`/notice-preview/${n.id}`} target="_blank" rel="noreferrer">
                  {n.title}
                </a>
              </h3>
            </div>
            <a
              href={`/notice-preview/${n.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-glass shrink-0 text-sm font-semibold"
            >
              View Notice
            </a>
          </div>
        ))}
      </div>
    </>
  );
}

export function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  useEffect(() => {
    api.get("/calendar").then(r => setEvents(r.data || [])).catch(() => {});
    api.get("/holidays").then(r => setHolidays(r.data || [])).catch(() => {});
  }, []);
  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="overline mb-3">Plan Ahead</div>
          <h1 className="legacy-title brand-gradient-text">Academic Calendar</h1>
        </div>
      </section>
      <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10">
        <div>
          <h2 className="section-title mb-5">Events & Exams</h2>
          {events.length === 0 && <div className="text-brand-ink/60 italic">No events scheduled.</div>}
          <div className="space-y-3">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-black/5">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-brand-blue/10 to-brand-orange/10 flex flex-col items-center justify-center font-headline text-xs uppercase text-brand-blue font-bold">
                  {new Date(e.date).toLocaleDateString("en-US", { month: "short" })}
                  <div className="text-lg text-brand-ink leading-none">{new Date(e.date).getDate()}</div>
                </div>
                <div className="flex-1">
                  <div className="font-headline font-semibold">{e.name}</div>
                  {e.description && <div className="text-xs text-brand-ink/60">{e.description}</div>}
                </div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 bg-brand-orange/10 text-brand-orange rounded-full">{e.type}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="section-title mb-5">Holidays</h2>
          {holidays.length === 0 && <div className="text-brand-ink/60 italic">No holidays added.</div>}
          <div className="space-y-3">
            {holidays.map((h) => (
              <div key={h.id} className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-black/5">
                {h.icon_url ? <img src={optimizeCloudinary(fullUrl(h.icon_url), 100)} alt="" className="w-10 h-10" /> : <div className="w-10 h-10 rounded-full bg-brand-lotus/30" />}
                <div className="flex-1">
                  <div className="font-headline font-semibold">{h.name}</div>
                  <div className="text-xs text-brand-ink/60">{h.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
