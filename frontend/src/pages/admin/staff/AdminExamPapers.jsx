import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, Edit2, Save, Loader2 } from "lucide-react";
import { FileOrUrlField } from "@/components/admin/ResourceManager";
import { CLASSES, SUBJECTS, EXAM_TYPES } from "./shared";

export function AdminExamPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterClass, setFilterClass] = useState("");

  const blank = () => ({
    title: "",
    subject: "",
    class_name: "",
    session: "",
    exam_type: "",
    date: "",
    duration: "3 Hours",
    total_marks: 100,
    is_published: true,
    general_instructions: [
      "Attempt all questions.",
      "Write clearly and neatly.",
      "Read each question carefully before answering.",
    ],
    sections: [],
    pdf_url: "",
  });

  const load = () => {
    setLoading(true);
    api
      .get("/admin/exam-papers")
      .then((r) => setPapers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startCreate = () => {
    setEditing(blank());
    setOpen(true);
  };
  const startEdit = (p) => {
    setEditing({ ...p });
    setOpen(true);
  };
  const remove = async (p) => {
    if (!window.confirm("Delete this exam paper?")) return;
    await api.delete(`/admin/exam-papers/${p.id}`);
    toast.success("Deleted");
    load();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing.id) await api.put(`/admin/exam-papers/${editing.id}`, editing);
      else await api.post("/admin/exam-papers", editing);
      toast.success(editing.id ? "Updated" : "Created");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const addSection = () =>
    setEditing({
      ...editing,
      sections: [
        ...editing.sections,
        {
          section_label: `Section ${String.fromCharCode(65 + editing.sections.length)}`,
          section_title: "",
          instructions: "",
          total_marks: 0,
          questions: [],
        },
      ],
    });

  const updateSection = (si, key, val) => {
    const s = editing.sections.map((sec, i) => (i === si ? { ...sec, [key]: val } : sec));
    setEditing({ ...editing, sections: s });
  };

  const removeSection = (si) =>
    setEditing({ ...editing, sections: editing.sections.filter((_, i) => i !== si) });

  const addQuestion = (si) => {
    const sections = editing.sections.map((sec, i) =>
      i === si
        ? {
            ...sec,
            questions: [
              ...sec.questions,
              { q_no: String(sec.questions.length + 1), question: "", marks: 1, sub_questions: [] },
            ],
          }
        : sec
    );
    setEditing({ ...editing, sections });
  };

  const updateQuestion = (si, qi, key, val) => {
    const sections = editing.sections.map((sec, i) =>
      i === si
        ? {
            ...sec,
            questions: sec.questions.map((q, j) => (j === qi ? { ...q, [key]: val } : q)),
          }
        : sec
    );
    setEditing({ ...editing, sections });
  };

  const removeQuestion = (si, qi) => {
    const sections = editing.sections.map((sec, i) =>
      i === si ? { ...sec, questions: sec.questions.filter((_, j) => j !== qi) } : sec
    );
    setEditing({ ...editing, sections });
  };

  const filtered = filterClass ? papers.filter((p) => p.class_name === filterClass) : papers;

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Exam Papers</h1>
          <p className="text-sm text-brand-ink/60 mt-1">
            Create and publish question papers for students.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/paper-builder.html"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
          >
            ✏️ Open Paper Builder
          </a>
          <button
            onClick={startCreate}
            className="inline-flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" /> New Paper
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setFilterClass("")}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
            !filterClass ? "bg-brand-blue text-white border-brand-blue" : "bg-white border-black/10"
          }`}
        >
          All
        </button>
        {CLASSES.map((c) => (
          <button
            key={c}
            onClick={() => setFilterClass(c)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${
              filterClass === c
                ? "bg-brand-blue text-white border-brand-blue"
                : "bg-white border-black/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-brand-ink/50">Loading...</div>
      ) : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-brand-ink/40">No exam papers yet.</div>
          )}
          {filtered.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline font-semibold text-brand-blue">{p.class_name}</span>
                  <span className="text-brand-ink/30">•</span>
                  <span className="font-semibold text-brand-ink">{p.subject}</span>
                  <span className="text-brand-ink/30">•</span>
                  <span className="text-brand-ink/60 text-sm">{p.exam_type}</span>
                  {p.session && (
                    <span className="bg-brand-blue/10 text-brand-blue text-xs px-2 py-0.5 rounded-full">
                      {p.session}
                    </span>
                  )}
                  {!p.is_published && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                      Draft
                    </span>
                  )}
                </div>
                <div className="text-sm text-brand-ink/60 mt-0.5">
                  {p.title} {p.date && `· ${p.date}`} {p.total_marks ? `· ${p.total_marks} marks` : ""}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(p)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(p)}
                  className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-screen editor modal */}
      {open && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b rounded-t-2xl">
              <h2 className="font-headline text-xl font-semibold">
                {editing.id ? "Edit" : "New"} Exam Paper
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editing.id ? "Update" : "Publish"}
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Meta */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Paper Title *</label>
                  <input
                    required
                    className="field-input"
                    placeholder="e.g. Half Yearly Examination 2025-26"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Class *</label>
                  <select
                    required
                    className="field-input"
                    value={editing.class_name}
                    onChange={(e) => setEditing({ ...editing, class_name: e.target.value })}
                  >
                    <option value="">Select class...</option>
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Subject *</label>
                  <select
                    required
                    className="field-input"
                    value={editing.subject}
                    onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
                  >
                    <option value="">Select subject...</option>
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Exam Type</label>
                  <select
                    className="field-input"
                    value={editing.exam_type}
                    onChange={(e) => setEditing({ ...editing, exam_type: e.target.value })}
                  >
                    <option value="">Select type...</option>
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Session</label>
                  <input
                    className="field-input"
                    placeholder="e.g. 2025-26"
                    value={editing.session}
                    onChange={(e) => setEditing({ ...editing, session: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Date</label>
                  <input
                    type="date"
                    className="field-input"
                    value={editing.date}
                    onChange={(e) => setEditing({ ...editing, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Duration</label>
                  <input
                    className="field-input"
                    placeholder="e.g. 3 Hours"
                    value={editing.duration}
                    onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Total Marks</label>
                  <input
                    type="number"
                    className="field-input"
                    value={editing.total_marks}
                    onChange={(e) => setEditing({ ...editing, total_marks: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* PDF upload */}
              <div>
                <label className="field-label">
                  PDF Upload (optional — if you prefer to show a PDF instead of entering questions)
                </label>
                <FileOrUrlField
                  value={editing.pdf_url || ""}
                  onChange={(v) => setEditing({ ...editing, pdf_url: v })}
                  subDir="exam_papers"
                  maxMb={10}
                />
              </div>

              {/* General Instructions */}
              <div>
                <label className="field-label">General Instructions</label>
                {editing.general_instructions.map((inst, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input
                      className="field-input flex-1"
                      value={inst}
                      onChange={(e) => {
                        const gi = editing.general_instructions.map((x, j) =>
                          j === i ? e.target.value : x
                        );
                        setEditing({ ...editing, general_instructions: gi });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          general_instructions: editing.general_instructions.filter(
                            (_, j) => j !== i
                          ),
                        })
                      }
                      className="p-2 hover:bg-red-50 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      ...editing,
                      general_instructions: [...editing.general_instructions, ""],
                    })
                  }
                  className="text-sm text-brand-blue hover:underline"
                >
                  + Add instruction
                </button>
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="field-label mb-0">Sections & Questions</label>
                  <button
                    type="button"
                    onClick={addSection}
                    className="text-sm bg-brand-blue text-white px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Section
                  </button>
                </div>
                {editing.sections.map((sec, si) => (
                  <div key={si} className="border border-slate-200 rounded-2xl mb-4 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 flex items-center gap-3">
                      <input
                        className="font-bold text-brand-blue bg-transparent border-b border-brand-blue/30 focus:outline-none w-24 text-sm"
                        value={sec.section_label}
                        onChange={(e) => updateSection(si, "section_label", e.target.value)}
                      />
                      <input
                        className="flex-1 bg-transparent border-b border-slate-200 focus:outline-none text-sm"
                        placeholder="Section title e.g. Multiple Choice Questions"
                        value={sec.section_title}
                        onChange={(e) => updateSection(si, "section_title", e.target.value)}
                      />
                      <input
                        type="number"
                        className="w-20 bg-transparent border border-slate-200 rounded px-2 py-1 text-sm text-center"
                        placeholder="Marks"
                        value={sec.total_marks}
                        onChange={(e) => updateSection(si, "total_marks", Number(e.target.value))}
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(si)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="px-4 py-2 border-b border-slate-100">
                      <input
                        className="w-full text-sm bg-transparent focus:outline-none text-brand-ink/60"
                        placeholder="Section instructions (optional)"
                        value={sec.instructions}
                        onChange={(e) => updateSection(si, "instructions", e.target.value)}
                      />
                    </div>
                    <div className="p-4 space-y-3">
                      {sec.questions.map((q, qi) => (
                        <div key={qi} className="flex gap-3 items-start bg-slate-50 rounded-xl p-3">
                          <input
                            className="w-10 text-xs font-bold text-brand-blue bg-white border border-slate-200 rounded px-2 py-1.5 text-center"
                            placeholder="No."
                            value={q.q_no}
                            onChange={(e) => updateQuestion(si, qi, "q_no", e.target.value)}
                          />
                          <textarea
                            className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-brand-blue"
                            rows={2}
                            placeholder="Enter question..."
                            value={q.question}
                            onChange={(e) => updateQuestion(si, qi, "question", e.target.value)}
                          />
                          <input
                            type="number"
                            className="w-16 text-sm border border-slate-200 rounded px-2 py-1.5 text-center"
                            placeholder="Marks"
                            value={q.marks}
                            onChange={(e) => updateQuestion(si, qi, "marks", Number(e.target.value))}
                          />
                          <button
                            type="button"
                            onClick={() => removeQuestion(si, qi)}
                            className="text-red-400 hover:text-red-600 mt-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addQuestion(si)}
                        className="text-sm text-brand-blue hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Question
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Published toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.is_published}
                  onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })}
                />
                <span className="text-sm font-semibold">Publish immediately (visible to students)</span>
              </label>
            </div>
          </form>
        </div>
      )}

      <style>{`.field-label{display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:rgba(15,23,42,.5);margin-bottom:.25rem}.field-input{width:100%;padding:.5rem .75rem;border:1px solid #e2e8f0;border-radius:.5rem;font-size:.875rem;outline:none}.field-input:focus{border-color:#0E3B91}`}</style>
    </div>
  );
}

export default AdminExamPapers;
