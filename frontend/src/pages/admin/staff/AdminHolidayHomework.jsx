import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, Edit2, Save, Loader2 } from "lucide-react";
import { FileOrUrlField } from "@/components/admin/ResourceManager";
import { CLASSES, SUBJECTS, VACATION_TYPES } from "./shared";

export function AdminHolidayHomework() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const blank = () => ({
    title: "",
    class_name: "",
    vacation_type: "Summer",
    year: new Date().getFullYear().toString(),
    start_date: "",
    end_date: "",
    message: "",
    is_published: true,
    pdf_url: "",
    doubt_contact: "",
    doubt_timing: "Monday to Friday, 10:00 AM – 12:00 PM",
    subjects: [],
    projects: [],
  });

  const load = () => {
    setLoading(true);
    api
      .get("/admin/holiday-homework")
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startCreate = () => {
    setEditing(blank());
    setOpen(true);
  };
  const startEdit = (hw) => {
    setEditing({ ...hw });
    setOpen(true);
  };
  const remove = async (hw) => {
    if (!window.confirm("Delete this homework?")) return;
    await api.delete(`/admin/holiday-homework/${hw.id}`);
    toast.success("Deleted");
    load();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing.id) await api.put(`/admin/holiday-homework/${editing.id}`, editing);
      else await api.post("/admin/holiday-homework", editing);
      toast.success(editing.id ? "Updated" : "Created");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  // Subject helpers
  const addSubject = () =>
    setEditing({
      ...editing,
      subjects: [...editing.subjects, { subject: "", tasks: [""], options: [] }],
    });
  const updateSubject = (si, key, val) =>
    setEditing({
      ...editing,
      subjects: editing.subjects.map((s, i) => (i === si ? { ...s, [key]: val } : s)),
    });
  const removeSubject = (si) =>
    setEditing({ ...editing, subjects: editing.subjects.filter((_, i) => i !== si) });
  const addTask = (si) => updateSubject(si, "tasks", [...editing.subjects[si].tasks, ""]);
  const updateTask = (si, ti, val) =>
    updateSubject(
      si,
      "tasks",
      editing.subjects[si].tasks.map((t, i) => (i === ti ? val : t))
    );
  const removeTask = (si, ti) =>
    updateSubject(
      si,
      "tasks",
      editing.subjects[si].tasks.filter((_, i) => i !== ti)
    );
  const addOption = (si) =>
    updateSubject(si, "options", [...(editing.subjects[si].options || []), ""]);
  const updateOption = (si, oi, val) =>
    updateSubject(
      si,
      "options",
      editing.subjects[si].options.map((o, i) => (i === oi ? val : o))
    );
  const removeOption = (si, oi) =>
    updateSubject(
      si,
      "options",
      editing.subjects[si].options.filter((_, i) => i !== oi)
    );

  // Project helpers
  const addProject = () =>
    setEditing({
      ...editing,
      projects: [
        ...editing.projects,
        { title: "", description: "", materials_needed: [], submission_date: "" },
      ],
    });
  const updateProject = (pi, key, val) =>
    setEditing({
      ...editing,
      projects: editing.projects.map((p, i) => (i === pi ? { ...p, [key]: val } : p)),
    });
  const removeProject = (pi) =>
    setEditing({ ...editing, projects: editing.projects.filter((_, i) => i !== pi) });

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Holiday Homework</h1>
          <p className="text-sm text-brand-ink/60 mt-1">
            Create class-wise holiday homework with subject checklists, projects, and doubt contact.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg text-sm"
        >
          <Plus className="w-4 h-4" /> New Homework
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-brand-ink/50">Loading...</div>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="text-center py-12 text-brand-ink/40">No holiday homework yet.</div>
          )}
          {items.map((hw) => (
            <div
              key={hw.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-headline font-semibold text-brand-blue">{hw.class_name}</span>
                  <span className="text-brand-ink/30">•</span>
                  <span className="bg-brand-orange/10 text-brand-orange text-xs font-bold px-2 py-0.5 rounded-full">
                    {hw.vacation_type} {hw.year}
                  </span>
                  {!hw.is_published && (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                      Draft
                    </span>
                  )}
                </div>
                <div className="text-sm text-brand-ink/60 mt-0.5">
                  {hw.title} · {hw.subjects?.length || 0} subjects · {hw.projects?.length || 0}{" "}
                  projects
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(hw)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => remove(hw)}
                  className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && editing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <form onSubmit={submit} className="bg-white rounded-2xl w-full max-w-4xl my-8 shadow-2xl">
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b rounded-t-2xl">
              <h2 className="font-headline text-xl font-semibold">
                {editing.id ? "Edit" : "New"} Holiday Homework
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
                  <label className="field-label">Title *</label>
                  <input
                    required
                    className="field-input"
                    placeholder="e.g. Summer Holiday Homework 2025"
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
                  <label className="field-label">Vacation Type</label>
                  <select
                    className="field-input"
                    value={editing.vacation_type}
                    onChange={(e) => setEditing({ ...editing, vacation_type: e.target.value })}
                  >
                    {VACATION_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Year</label>
                  <input
                    className="field-input"
                    placeholder="2025"
                    value={editing.year}
                    onChange={(e) => setEditing({ ...editing, year: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Vacation Start</label>
                  <input
                    type="date"
                    className="field-input"
                    value={editing.start_date}
                    onChange={(e) => setEditing({ ...editing, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label">Vacation End</label>
                  <input
                    type="date"
                    className="field-input"
                    value={editing.end_date}
                    onChange={(e) => setEditing({ ...editing, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="field-label">Message to Students / Parents</label>
                <textarea
                  className="field-input"
                  rows={3}
                  placeholder="e.g. Dear students, enjoy your summer vacation while completing these activities..."
                  value={editing.message}
                  onChange={(e) => setEditing({ ...editing, message: e.target.value })}
                />
              </div>

              {/* PDF */}
              <div>
                <label className="field-label">Full PDF Upload (optional)</label>
                <FileOrUrlField
                  value={editing.pdf_url || ""}
                  onChange={(v) => setEditing({ ...editing, pdf_url: v })}
                  subDir="holiday_homework"
                  maxMb={10}
                />
              </div>

              {/* Subject Checklist */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="field-label mb-0">📚 Subject-wise Checklist</label>
                  <button
                    type="button"
                    onClick={addSubject}
                    className="text-sm bg-brand-blue text-white px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Subject
                  </button>
                </div>
                {editing.subjects.map((subj, si) => (
                  <div key={si} className="border border-slate-200 rounded-2xl mb-4 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 flex items-center gap-3">
                      <select
                        className="font-bold text-brand-blue bg-transparent border-b border-brand-blue/30 focus:outline-none text-sm"
                        value={subj.subject}
                        onChange={(e) => updateSubject(si, "subject", e.target.value)}
                      >
                        <option value="">Select subject...</option>
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <span className="flex-1 text-xs text-brand-ink/40">
                        Tasks + optional choice questions
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSubject(si)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="text-xs font-bold uppercase text-brand-ink/40 mb-1">
                        Tasks / Instructions
                      </div>
                      {subj.tasks.map((task, ti) => (
                        <div key={ti} className="flex gap-2">
                          <span className="w-5 h-5 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center shrink-0 mt-2">
                            {ti + 1}
                          </span>
                          <input
                            className="flex-1 field-input"
                            placeholder="e.g. Write 5 pages of cursive writing"
                            value={task}
                            onChange={(e) => updateTask(si, ti, e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeTask(si, ti)}
                            className="text-red-400 hover:text-red-600 mt-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addTask(si)}
                        className="text-xs text-brand-blue hover:underline"
                      >
                        + Add task
                      </button>

                      {/* Options */}
                      <div className="mt-3 border-t pt-3">
                        <div className="text-xs font-bold uppercase text-brand-ink/40 mb-1">
                          Choice Options (student picks one — e.g. "Write about topic A OR topic B")
                        </div>
                        {(subj.options || []).map((opt, oi) => (
                          <div key={oi} className="flex gap-2 mb-1">
                            <span className="text-xs font-bold text-brand-orange mt-2 w-8 shrink-0">
                              Opt {oi + 1}
                            </span>
                            <input
                              className="flex-1 field-input"
                              placeholder={`Option ${oi + 1}`}
                              value={opt}
                              onChange={(e) => updateOption(si, oi, e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeOption(si, oi)}
                              className="text-red-400 hover:text-red-600 mt-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addOption(si)}
                          className="text-xs text-brand-orange hover:underline"
                        >
                          + Add option
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Project Work */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="field-label mb-0">🎨 Project Work</label>
                  <button
                    type="button"
                    onClick={addProject}
                    className="text-sm bg-brand-orange text-white px-3 py-1.5 rounded-lg flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project
                  </button>
                </div>
                {editing.projects.map((proj, pi) => (
                  <div
                    key={pi}
                    className="border border-orange-200 rounded-2xl p-4 mb-4 bg-orange-50/30"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase text-brand-orange">
                        Project {pi + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeProject(pi)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                      <div>
                        <label className="field-label">Project Title</label>
                        <input
                          className="field-input"
                          placeholder="e.g. Make a solar system model"
                          value={proj.title}
                          onChange={(e) => updateProject(pi, "title", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="field-label">Submission Date</label>
                        <input
                          type="date"
                          className="field-input"
                          value={proj.submission_date}
                          onChange={(e) => updateProject(pi, "submission_date", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="field-label">Description</label>
                      <textarea
                        className="field-input"
                        rows={2}
                        placeholder="Describe the project..."
                        value={proj.description}
                        onChange={(e) => updateProject(pi, "description", e.target.value)}
                      />
                    </div>
                    <div className="mt-3">
                      <label className="field-label">Materials Needed</label>
                      {(proj.materials_needed || []).map((m, mi) => (
                        <div key={mi} className="flex gap-2 mb-1">
                          <input
                            className="flex-1 field-input"
                            value={m}
                            onChange={(e) => {
                              const mn = proj.materials_needed.map((x, i) =>
                                i === mi ? e.target.value : x
                              );
                              updateProject(pi, "materials_needed", mn);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateProject(
                                pi,
                                "materials_needed",
                                proj.materials_needed.filter((_, i) => i !== mi)
                              )
                            }
                            className="text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          updateProject(pi, "materials_needed", [
                            ...(proj.materials_needed || []),
                            "",
                          ])
                        }
                        className="text-xs text-brand-blue hover:underline"
                      >
                        + Add material
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Doubt Contact */}
              <div className="border border-brand-blue/20 bg-brand-blue/5 rounded-2xl p-5">
                <div className="font-headline font-semibold text-brand-blue mb-3">
                  💬 Doubt / Query Contact
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Phone / WhatsApp / Email</label>
                    <input
                      className="field-input"
                      placeholder="e.g. +91 99551 90262 (WhatsApp)"
                      value={editing.doubt_contact}
                      onChange={(e) => setEditing({ ...editing, doubt_contact: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Available Timing</label>
                    <input
                      className="field-input"
                      placeholder="e.g. Mon–Fri, 10am–12pm"
                      value={editing.doubt_timing}
                      onChange={(e) => setEditing({ ...editing, doubt_timing: e.target.value })}
                    />
                  </div>
                </div>
              </div>

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

export default AdminHolidayHomework;
