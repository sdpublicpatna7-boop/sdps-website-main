import { useEffect, useState } from "react";
import api from "../../lib/api";
import { BookOpen, Palette, MessageCircle, Download, ChevronDown, ChevronUp, Check, Phone, Mail, Calendar } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
function fullUrl(u) { return u?.startsWith("http") ? u : `${BACKEND}${u}`; }

function PdfEmbed({ url, title }) {
  const [mode, setMode] = useState("embed");
  const googleUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  return (
    <div className="rounded-2xl overflow-hidden border border-black/5 shadow-sm mt-4">
      <div className="flex items-center justify-between px-4 py-2 bg-brand-blue/5 border-b border-black/5">
        <span className="text-xs font-semibold text-brand-ink/60">{title}</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setMode(mode === "embed" ? "google" : "embed")} className="text-xs text-brand-blue hover:underline">
            {mode === "embed" ? "Try alternate viewer" : "Direct embed"}
          </button>
          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline">↗ Full screen</a>
          <a href={url} download className="text-xs text-brand-blue hover:underline flex items-center gap-1"><Download className="w-3 h-3" /> Download</a>
        </div>
      </div>
      <iframe key={mode} src={mode === "embed" ? url : googleUrl} title={title} style={{ width: "100%", height: "650px", border: "none" }} loading="lazy" />
    </div>
  );
}

function HomeworkDetail({ hw }) {
  const [openSubj, setOpenSubj] = useState(null);

  return (
    <div className="space-y-6 p-4">
      {/* Message */}
      {hw.message && (
        <div className="bg-brand-paper rounded-2xl px-5 py-4 border border-brand-blue/10">
          <div className="text-xs font-bold uppercase text-brand-orange tracking-wider mb-2">Message from the School</div>
          <p className="text-sm text-brand-ink/80 leading-relaxed whitespace-pre-line">{hw.message}</p>
        </div>
      )}

      {/* Vacation Dates */}
      {(hw.start_date || hw.end_date) && (
        <div className="flex flex-wrap gap-4">
          {hw.start_date && (
            <div className="bg-white rounded-xl border border-black/5 px-4 py-3">
              <div className="text-xs uppercase font-bold text-brand-ink/40">Vacation Starts</div>
              <div className="font-headline font-semibold text-brand-blue">{new Date(hw.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
          )}
          {hw.end_date && (
            <div className="bg-white rounded-xl border border-black/5 px-4 py-3">
              <div className="text-xs uppercase font-bold text-brand-ink/40">School Reopens</div>
              <div className="font-headline font-semibold text-brand-orange">{new Date(hw.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
          )}
        </div>
      )}

      {/* PDF if uploaded */}
      {hw.pdf_url && (
        <div>
          <div className="overline mb-2">Full Homework PDF</div>
          <PdfEmbed url={fullUrl(hw.pdf_url)} title={hw.title} />
        </div>
      )}

      {/* Subject Checklist */}
      {hw.subjects?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-brand-blue" />
            <h3 className="font-headline font-semibold text-lg text-brand-ink">Subject-wise Checklist</h3>
          </div>
          <div className="space-y-3">
            {hw.subjects.map((subj, si) => (
              <div key={si} className="bg-white rounded-2xl border border-black/5 overflow-hidden">
                <button onClick={() => setOpenSubj(openSubj === si ? null : si)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-brand-paper/50 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-brand-blue" />
                    </div>
                    <span className="font-headline font-semibold text-brand-ink">{subj.subject}</span>
                    <span className="text-xs text-brand-ink/40">{(subj.tasks?.length || 0)} task{subj.tasks?.length !== 1 ? "s" : ""}</span>
                  </div>
                  {openSubj === si ? <ChevronUp className="w-4 h-4 text-brand-ink/30" /> : <ChevronDown className="w-4 h-4 text-brand-ink/30" />}
                </button>
                {openSubj === si && (
                  <div className="px-5 pb-5 border-t border-black/5 pt-4 space-y-4">
                    {/* Tasks */}
                    {subj.tasks?.length > 0 && (
                      <div className="space-y-2">
                        {subj.tasks.map((task, ti) => (
                          <label key={ti} className="flex items-start gap-3 cursor-pointer group">
                            <div className="w-5 h-5 rounded border-2 border-brand-blue/30 group-hover:border-brand-blue mt-0.5 shrink-0 flex items-center justify-center transition-colors">
                              <Check className="w-3 h-3 text-brand-blue opacity-0 group-hover:opacity-30" />
                            </div>
                            <span className="text-sm text-brand-ink/80 leading-relaxed">{task}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {/* Choice options */}
                    {subj.options?.length > 0 && (
                      <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4">
                        <div className="text-xs font-bold uppercase text-brand-orange tracking-wider mb-2">Choose Any One Option</div>
                        <div className="space-y-2">
                          {subj.options.map((opt, oi) => (
                            <label key={oi} className="flex items-start gap-3 cursor-pointer">
                              <input type="radio" name={`opt-${si}`} className="mt-0.5 accent-brand-orange" />
                              <span className="text-sm text-brand-ink/80">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Work */}
      {hw.projects?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-brand-orange" />
            <h3 className="font-headline font-semibold text-lg text-brand-ink">Project Work</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {hw.projects.map((proj, pi) => (
              <div key={pi} className="bg-white rounded-2xl border border-orange-100 p-5">
                <div className="text-xs font-bold uppercase text-brand-orange tracking-wider mb-1">Project {pi + 1}</div>
                <h4 className="font-headline font-semibold text-brand-ink mb-2">{proj.title}</h4>
                {proj.description && <p className="text-sm text-brand-ink/70 mb-3 leading-relaxed">{proj.description}</p>}
                {proj.submission_date && (
                  <div className="text-xs bg-red-50 text-red-600 font-semibold px-3 py-1.5 rounded-lg w-fit mb-3 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Submit by: {new Date(proj.submission_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                )}
                {proj.materials_needed?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-brand-ink/50 mb-2">Materials Needed:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {proj.materials_needed.map((m, mi) => (
                        <span key={mi} className="bg-brand-blue/10 text-brand-blue text-xs px-2.5 py-1 rounded-full">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Doubt Contact */}
      {(hw.doubt_contact || hw.doubt_timing) && (
        <div className="bg-gradient-to-br from-brand-blue to-brand-blue/90 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-headline font-semibold">Have a Doubt? Ask Us!</h3>
          </div>
          <p className="text-white/70 text-sm mb-4">If you have any questions about the homework or projects, reach out to us.</p>
          <div className="space-y-2">
            {hw.doubt_contact && (
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 text-sm font-semibold">
                <Phone className="w-4 h-4" />
                <span>{hw.doubt_contact}</span>
              </div>
            )}
            {hw.doubt_timing && (
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5 text-sm">
                🕐 Available: {hw.doubt_timing}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HolidayHomework() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");
  const [filterType, setFilterType] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get("/holiday-homework").then(r => setItems(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const classes = [...new Set(items.map(i => i.class_name).filter(Boolean))];
  const types = [...new Set(items.map(i => i.vacation_type).filter(Boolean))];

  const filtered = items.filter(hw => {
    if (filterClass && hw.class_name !== filterClass) return false;
    if (filterType && hw.vacation_type !== filterType) return false;
    return true;
  });

  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="overline mb-3">Academics</div>
          <h1 className="legacy-title brand-gradient-text">Holiday Homework</h1>
          <p className="mt-4 text-brand-ink/70 max-w-xl mx-auto">
            Class-wise homework, subject checklists and project work for vacation time.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/50 block mb-1">Class</label>
            <select className="px-4 py-2 rounded-xl border border-black/10 text-sm bg-white focus:border-brand-blue outline-none"
              value={filterClass} onChange={e => { setFilterClass(e.target.value); setExpanded(null); }}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {types.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase text-brand-ink/50 block mb-1">Vacation</label>
              <select className="px-4 py-2 rounded-xl border border-black/10 text-sm bg-white focus:border-brand-blue outline-none"
                value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">All</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        {loading && <div className="text-center py-16 text-brand-ink/50">Loading...</div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <BookOpen className="w-12 h-12 text-brand-ink/20 mx-auto mb-3" />
            <p className="text-brand-ink/50">No holiday homework published yet.</p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map(hw => (
            <div key={hw.id} className="border border-black/5 rounded-2xl overflow-hidden shadow-sm">
              <button onClick={() => setExpanded(expanded === hw.id ? null : hw.id)}
                className="w-full text-left bg-white p-5 flex items-center gap-4 hover:bg-brand-paper/30 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline font-bold text-brand-blue text-lg">{hw.class_name}</span>
                    <span className="bg-brand-orange/10 text-brand-orange text-xs font-bold px-2.5 py-1 rounded-full">{hw.vacation_type} {hw.year}</span>
                    <span className="text-xs text-brand-ink/40">{hw.subjects?.length || 0} subjects · {hw.projects?.length || 0} projects</span>
                  </div>
                  <div className="text-sm text-brand-ink/60 mt-0.5">{hw.title}</div>
                </div>
                {expanded === hw.id
                  ? <ChevronUp className="w-5 h-5 text-brand-ink/30 shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-brand-ink/30 shrink-0" />
                }
              </button>
              {expanded === hw.id && (
                <div className="border-t border-black/5 bg-brand-paper/20">
                  <HomeworkDetail hw={hw} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
