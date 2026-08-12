import { useEffect, useState } from "react";
import api from "../../lib/api";
import { ChevronDown, ChevronUp, FileText, Download } from "lucide-react";

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
      <iframe key={mode} src={mode === "embed" ? url : googleUrl} title={title} style={{ width: "100%", height: "700px", border: "none" }} loading="lazy" />
    </div>
  );
}

function QuestionPaperView({ paper }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="text-center border-b border-black/5 p-6 bg-brand-paper">
        <div className="text-brand-orange text-xs font-bold uppercase tracking-widest mb-1">S.D. Public School, Patna</div>
        <h2 className="font-headline text-2xl font-bold text-brand-ink">{paper.title}</h2>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-sm text-brand-ink/70">
          <span><strong>Class:</strong> {paper.class_name}</span>
          <span>·</span>
          <span><strong>Subject:</strong> {paper.subject}</span>
          {paper.date && <><span>·</span><span><strong>Date:</strong> {paper.date}</span></>}
          {paper.duration && <><span>·</span><span><strong>Time:</strong> {paper.duration}</span></>}
          {paper.total_marks > 0 && <><span>·</span><span><strong>Max Marks:</strong> {paper.total_marks}</span></>}
        </div>
      </div>

      {/* If PDF, show it */}
      {paper.pdf_url ? (
        <div className="p-4">
          <PdfEmbed url={fullUrl(paper.pdf_url)} title={paper.title} />
        </div>
      ) : (
        <>
          {/* General Instructions */}
          {paper.general_instructions?.length > 0 && (
            <div className="px-6 py-4 bg-amber-50 border-b border-amber-100">
              <div className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-2">General Instructions</div>
              <ol className="list-decimal list-inside space-y-1">
                {paper.general_instructions.map((inst, i) => (
                  <li key={i} className="text-sm text-amber-800">{inst}</li>
                ))}
              </ol>
            </div>
          )}

          {/* Sections */}
          <div className="divide-y divide-black/5">
            {paper.sections?.map((sec, si) => (
              <div key={si} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-headline font-bold text-brand-blue text-lg">{sec.section_label}{sec.section_title && `: ${sec.section_title}`}</div>
                    {sec.instructions && <p className="text-xs text-brand-ink/60 mt-1 italic">{sec.instructions}</p>}
                  </div>
                  {sec.total_marks > 0 && <span className="text-sm font-bold text-brand-orange bg-brand-orange/10 px-3 py-1 rounded-full">[{sec.total_marks} Marks]</span>}
                </div>
                <div className="space-y-4">
                  {sec.questions?.map((q, qi) => (
                    <div key={qi} className="flex gap-3">
                      <span className="text-brand-blue font-bold text-sm shrink-0 w-8">Q{q.q_no}.</span>
                      <div className="flex-1">
                        <p className="text-sm text-brand-ink leading-relaxed">{q.question}</p>
                        {q.sub_questions?.length > 0 && (
                          <ul className="mt-2 space-y-1 pl-4">
                            {q.sub_questions.map((sq, sqi) => (
                              <li key={sqi} className="text-sm text-brand-ink/80">({String.fromCharCode(97 + sqi)}) {sq}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {q.marks > 0 && <span className="text-xs text-brand-ink/50 font-semibold shrink-0">[{q.marks}]</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExamPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState("");
  const [filterSession, setFilterSession] = useState("");
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get("/exam-papers").then(r => { setPapers(r.data); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const classes = [...new Set(papers.map(p => p.class_name).filter(Boolean))];
  const sessions = [...new Set(papers.map(p => p.session).filter(Boolean))];

  const filtered = papers.filter(p => {
    if (filterClass && p.class_name !== filterClass) return false;
    if (filterSession && p.session !== filterSession) return false;
    return true;
  });

  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="overline mb-3">Academics</div>
          <h1 className="legacy-title brand-gradient-text">Exam Question Papers</h1>
          <p className="mt-4 text-brand-ink/70 max-w-xl mx-auto">Previous and practice question papers for all classes.</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 items-center">
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/50 block mb-1">Class</label>
            <select className="px-4 py-2 rounded-xl border border-black/10 text-sm bg-white focus:border-brand-blue outline-none"
              value={filterClass} onChange={e => { setFilterClass(e.target.value); setExpanded(null); }}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {sessions.length > 0 && (
            <div>
              <label className="text-xs font-bold uppercase text-brand-ink/50 block mb-1">Session</label>
              <select className="px-4 py-2 rounded-xl border border-black/10 text-sm bg-white focus:border-brand-blue outline-none"
                value={filterSession} onChange={e => setFilterSession(e.target.value)}>
                <option value="">All Sessions</option>
                {sessions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {loading && <div className="text-center py-16 text-brand-ink/50">Loading papers...</div>}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-brand-ink/20 mx-auto mb-3" />
            <p className="text-brand-ink/50">No question papers published yet.</p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map(paper => (
            <div key={paper.id}>
              <button onClick={() => setExpanded(expanded === paper.id ? null : paper.id)}
                className="w-full text-left bg-white rounded-2xl border border-black/5 p-5 flex items-center gap-4 hover:border-brand-blue/30 hover:shadow-sm transition group">
                <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-brand-blue" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-headline font-semibold text-brand-blue">{paper.class_name}</span>
                    <span className="text-brand-ink/30">·</span>
                    <span className="font-semibold">{paper.subject}</span>
                    {paper.exam_type && <span className="bg-brand-orange/10 text-brand-orange text-xs font-bold px-2 py-0.5 rounded-full">{paper.exam_type}</span>}
                    {paper.session && <span className="bg-brand-blue/10 text-brand-blue text-xs font-semibold px-2 py-0.5 rounded-full">{paper.session}</span>}
                  </div>
                  <div className="text-sm text-brand-ink/60 mt-0.5">{paper.title} {paper.date && `· ${paper.date}`} {paper.total_marks ? `· ${paper.total_marks} marks` : ""}</div>
                </div>
                {expanded === paper.id
                  ? <ChevronUp className="w-5 h-5 text-brand-ink/30 shrink-0" />
                  : <ChevronDown className="w-5 h-5 text-brand-ink/30 shrink-0" />
                }
              </button>
              {expanded === paper.id && (
                <div className="mt-2">
                  <QuestionPaperView paper={paper} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
