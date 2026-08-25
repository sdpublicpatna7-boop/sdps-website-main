import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Pin, ArrowRight, FileText } from "lucide-react";
import api from "../../lib/api";

function formatDate(dateStr) {
  if (!dateStr) return { day: "", month: "" };
  let d = new Date(dateStr);
  
  if (isNaN(d.getTime())) {
    // Try DD/MM/YYYY or DD-MM-YYYY format
    const parts = dateStr.includes("-") ? dateStr.split("-") : dateStr.split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed in JS
      const year = parseInt(parts[2], 10);
      if (day > 0 && day <= 31 && month >= 0 && month < 12 && year > 1000) {
        const temp = new Date(year, month, day);
        if (!isNaN(temp.getTime())) {
          d = temp;
        }
      }
    }
  }

  if (isNaN(d.getTime())) return { day: "", month: dateStr };
  
  return {
    day: d.toLocaleDateString("en-IN", { day: "2-digit" }),
    month: d.toLocaleDateString("en-IN", { month: "short" }),
  };
}

export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .get("/notices?limit=5")
      .then((r) => setNotices((r.data || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Don't render an empty section if there are no notices yet.
  if (loaded && notices.length === 0) return null;

  return (
    <section aria-labelledby="notice-board-title" className="py-12 sm:py-16 bg-section-grad">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <div className="overline mb-1">Stay Updated</div>
            <h2 id="notice-board-title" className="section-title text-balance">
              <Bell className="inline w-7 h-7 text-brand-orange mr-2 shrink-0" aria-hidden="true" />
              Latest Circulars
            </h2>
          </div>
          <Link
            to="/notices"
            className="hidden sm:inline-flex items-center gap-1.5 text-brand-blue font-headline font-bold hover:gap-2.5 transition-all shrink-0 text-sm"
          >
            All notices <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <ul className="flex flex-col gap-3.5 list-none p-0 m-0 min-h-[300px]">
          {!loaded ? (
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 flex items-center gap-4 animate-pulse">
                <div className="w-14 h-14 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/4" />
                </div>
              </li>
            ))
          ) : (
            notices.map((n, i) => {
              const { day, month } = formatDate(n.date);
              return (
                <motion.li
                  key={n.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                  viewport={{ once: true }}
                >
                  <a
                    href={`/notice-preview/${n.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="beam-card group bg-white rounded-2xl border border-slate-100 hover:border-brand-blue/30 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(14,59,145,0.06)] transition-all duration-300 flex items-center gap-4 p-4 sm:p-5"
                    data-testid={`home-notice-${n.id}`}
                  >
                    <div className="w-14 h-14 rounded-xl bg-brand-blue/5 border border-brand-blue/10 flex flex-col items-center justify-center shrink-0" aria-hidden="true">
                      <span className="font-headline font-bold text-lg text-brand-blue leading-none">{day}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-blue/70 mt-0.5">{month}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      {n.pinned && (
                        <span className="inline-flex items-center gap-1 mb-1 px-2.5 py-0.5 bg-brand-orange text-white text-xs font-bold uppercase tracking-wider rounded-full">
                          <Pin className="w-2.5 h-2.5" aria-hidden="true" /> Pinned
                        </span>
                      )}
                      <p className="font-headline font-semibold text-slate-800 group-hover:text-brand-blue transition-colors duration-200 truncate m-0 text-sm sm:text-base">
                        {n.title}
                      </p>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-brand-blue/10 group-hover:text-brand-blue text-slate-500 flex items-center justify-center transition-colors duration-200 shrink-0" aria-hidden="true">
                      <FileText className="w-4.5 h-4.5" />
                    </div>
                  </a>
                </motion.li>
              );
            })
          )}
        </ul>

        <Link
          to="/notices"
          className="sm:hidden inline-flex items-center gap-1.5 mt-5 text-brand-blue font-headline font-bold text-sm"
        >
          All notices <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
