import { useEffect, useState } from "react";
import api from "../../lib/api";
import { motion } from "framer-motion";
import { X } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

function fullUrl(u) {
  if (!u) return "";
  return u.startsWith("http") ? u : `${BACKEND}${u}`;
}

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api.get("/gallery").then((r) => setItems(r.data)).catch(() => {});
  }, []);

  const cats = Array.from(new Set(items.map((i) => i.category || "general")));
  const filtered = filter === "all" ? items : items.filter((i) => (i.category || "general") === filter);

  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="overline mb-3">Memories Captured</div>
          <h1 className="legacy-title brand-gradient-text">Our Gallery</h1>
          <p className="mt-4 text-brand-ink/70 max-w-2xl mx-auto">A glimpse into life at SDPS — events, celebrations, achievements and everyday joys.</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {cats.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-10" data-testid="gallery-filters">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-full text-sm font-headline ${filter === "all" ? "bg-brand-blue text-white" : "bg-white border border-black/10"}`}
            >All</button>
            {cats.map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={`px-4 py-2 rounded-full text-sm font-headline ${filter === c ? "bg-brand-blue text-white" : "bg-white border border-black/10"}`}>{c}</button>
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center text-brand-ink/60 py-20">No images yet. Admin can upload from the panel.</div>
        )}

        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {filtered.map((g, i) => (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 8) * 0.03 }}
              onClick={() => setActive(g)}
              className="break-inside-avoid cursor-pointer rounded-2xl overflow-hidden bg-white border border-black/5 hover:border-brand-orange/30 transition group"
              data-testid={`gallery-item-${g.id}`}
            >
              <img src={fullUrl(g.url)} alt={g.title} className="w-full h-auto block transition group-hover:scale-105 duration-500" loading="lazy" />
              <div className="p-3">
                <div className="text-sm font-headline font-medium">{g.title}</div>
                <div className="text-xs text-brand-orange uppercase tracking-wider">{g.category}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4" onClick={() => setActive(null)}>
          <button className="absolute top-6 right-6 text-white p-2 rounded-full bg-white/10 hover:bg-white/20" data-testid="lightbox-close">
            <X />
          </button>
          <img src={fullUrl(active.url)} alt={active.title} className="max-w-full max-h-[90vh] rounded-2xl object-contain" />
        </div>
      )}
    </>
  );
}
