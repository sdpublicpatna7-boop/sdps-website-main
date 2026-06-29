import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Play, Youtube, Instagram, Facebook, ExternalLink } from "lucide-react";

function getYouTubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getThumb(item) {
  if (item.thumbnail_url) return item.thumbnail_url;
  if (item.platform === "youtube") {
    const id = getYouTubeId(item.url);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}

export default function Videos() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    api.get("/videos").then((r) => setItems(r.data || [])).catch(() => {});
  }, []);

  const platformIcon = (p) => {
    if (p === "youtube") return <Youtube className="w-4 h-4" />;
    if (p === "instagram") return <Instagram className="w-4 h-4" />;
    if (p === "facebook") return <Facebook className="w-4 h-4" />;
    return <ExternalLink className="w-4 h-4" />;
  };

  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="overline mb-3">Watch & Explore</div>
          <h1 className="legacy-title brand-gradient-text">Video Gallery</h1>
          <p className="mt-4 text-brand-ink/70 max-w-2xl mx-auto">Highlights, performances, ceremonies and SDPS moments.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.length === 0 && (
          <div className="col-span-3 text-center text-brand-ink/60 py-20">No videos yet. Admin can add YouTube/Instagram/Facebook links from the panel.</div>
        )}
        {items.map((v) => {
          const thumb = getThumb(v);
          return (
            <a
              key={v.id}
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="group bg-white rounded-2xl overflow-hidden border border-black/5 beam-card hover:-translate-y-1 transition-all"
              data-testid={`video-item-${v.id}`}
            >
              <div className="relative aspect-video bg-brand-blue">
                {thumb ? (
                  <img src={thumb} alt={v.title} className="w-full h-full object-contain bg-slate-900" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">{platformIcon(v.platform)}</div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition">
                  <div className="w-14 h-14 rounded-full bg-brand-orange flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full uppercase tracking-wider">
                  {platformIcon(v.platform)} {v.platform}
                </div>
              </div>
              <div className="p-4">
                <div className="font-headline font-semibold">{v.title}</div>
                {v.description && <div className="text-xs text-brand-ink/60 mt-1 line-clamp-2">{v.description}</div>}
              </div>
            </a>
          );
        })}
      </div>
    </>
  );
}
