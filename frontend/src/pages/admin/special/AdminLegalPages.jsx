import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Save } from "lucide-react";
import DOMPurify from "dompurify";

export function AdminLegalPages() {
  const [tab, setTab] = useState("terms");
  const [data, setData] = useState({ terms: null, privacy: null });
  const [saving, setSaving] = useState(false);

  const load = (id) =>
    api
      .get(`/admin/legal/${id}`)
      .then((r) => setData((prev) => ({ ...prev, [id]: r.data })))
      .catch(() => {});

  useEffect(() => {
    load("terms");
    load("privacy");
  }, []);

  const save = async () => {
    if (!data[tab]) return;
    setSaving(true);
    try {
      await api.put(`/admin/legal/${tab}`, data[tab]);
      toast.success("Saved successfully");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const current = data[tab];
  const update = (field, val) =>
    setData((prev) => ({ ...prev, [tab]: { ...prev[tab], [field]: val } }));

  return (
    <div>
      <Toaster position="top-right" />
      <h1 className="font-headline text-2xl font-semibold mb-2">Terms & Privacy</h1>
      <p className="text-sm text-brand-ink/60 mb-6">
        Edit the Terms & Conditions and Privacy Policy displayed on the public website.
      </p>

      <div className="flex gap-2 mb-6">
        {[
          { id: "terms", label: "Terms & Conditions" },
          { id: "privacy", label: "Privacy Policy" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold border transition ${
              tab === t.id
                ? "bg-brand-blue text-white border-brand-blue"
                : "bg-white text-brand-ink border-slate-300 hover:border-brand-blue"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!current ? (
        <div className="text-center py-10 text-brand-ink/40">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-4xl space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60">Page Title</label>
            <input
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
              value={current.title || ""}
              onChange={(e) => update("title", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60">Content (HTML)</label>
            <p className="text-xs text-brand-ink/40 mb-1">
              You can use HTML tags: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;,
              &lt;strong&gt;, &lt;a&gt;, etc.
            </p>
            <textarea
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
              rows={20}
              value={current.content || ""}
              onChange={(e) => update("content", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="bg-brand-blue text-white px-5 py-2 rounded-lg text-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {current.updated_at && (
              <span className="text-xs text-brand-ink/40">
                Last saved: {new Date(current.updated_at).toLocaleString("en-IN")}
              </span>
            )}
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold uppercase text-brand-ink/60 mb-2">Preview</p>
            <div
              className="prose prose-sm max-w-none border border-slate-100 rounded-xl p-4 bg-brand-paper max-h-64 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.content || "") }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminLegalPages;
