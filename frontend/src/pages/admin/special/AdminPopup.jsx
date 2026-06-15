import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { ImageOrUrlField } from "@/components/admin/SharedFields";

export function AdminPopup() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/admin/popup-settings").then((r) => setData(r.data));
  }, []);

  if (!data) return <div>Loading...</div>;

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/popup-settings", data);
      toast.success("Saved");
    } catch {
      toast.error("Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <h1 className="font-headline text-2xl font-semibold mb-6">Welcome Popup</h1>
      <form
        onSubmit={save}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-2xl"
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!data.enabled}
            onChange={(e) => setData({ ...data, enabled: e.target.checked })}
            data-testid="popup-enabled"
          />{" "}
          Show popup on homepage
        </label>
        <div>
          <label className="text-xs font-bold uppercase text-brand-ink/60">Title</label>
          <input
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
            value={data.title || ""}
            onChange={(e) => setData({ ...data, title: e.target.value })}
            data-testid="popup-title"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-brand-ink/60">Content</label>
          <textarea
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
            rows={3}
            value={data.content || ""}
            onChange={(e) => setData({ ...data, content: e.target.value })}
            data-testid="popup-content"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-brand-ink/60">Image</label>
          <ImageOrUrlField
            value={data.image_url || ""}
            onChange={(v) => setData({ ...data, image_url: v })}
            subDir="popup"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60">Button Text</label>
            <input
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
              value={data.button_text || ""}
              onChange={(e) => setData({ ...data, button_text: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60">Button Link</label>
            <input
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="/admissions"
              value={data.button_link || ""}
              onChange={(e) => setData({ ...data, button_link: e.target.value })}
            />
          </div>
        </div>
        <button
          disabled={saving}
          className="bg-brand-blue text-white px-4 py-2 rounded-lg text-sm"
          data-testid="popup-save-btn"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default AdminPopup;
