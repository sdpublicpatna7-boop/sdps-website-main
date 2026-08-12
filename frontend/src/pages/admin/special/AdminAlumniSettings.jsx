import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";

export function AdminAlumniSettings() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get("/admin/alumni-settings").then((r) => setData(r.data));
  }, []);
  if (!data) return <div>Loading...</div>;
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/alumni-settings", {
        ...data,
        membership_amount: Number(data.membership_amount),
      });
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
      <h1 className="font-headline text-2xl font-semibold mb-6">Alumni Settings</h1>
      <form
        onSubmit={save}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-xl"
      >
        <label
          className="flex items-center gap-3 cursor-pointer p-4 rounded-xl border-2 border-dashed transition"
          style={{
            borderColor: data.is_visible ? "#0E3B91" : "#e2e8f0",
            background: data.is_visible ? "#EEF3FF" : "#f8fafc",
          }}
        >
          <input
            type="checkbox"
            className="w-5 h-5 accent-brand-blue"
            checked={!!data.is_visible}
            onChange={(e) => setData({ ...data, is_visible: e.target.checked })}
            data-testid="alumni-visible"
          />
          <div>
            <div className="font-semibold text-sm">
              {data.is_visible
                ? "✅ Alumni section is VISIBLE on website"
                : "🚫 Alumni section is HIDDEN from website"}
            </div>
            <div className="text-xs text-brand-ink/50 mt-0.5">
              Toggle to show or hide the entire Alumni section from public view.
            </div>
          </div>
        </label>
        <div>
          <label className="text-xs font-bold uppercase text-brand-ink/60">
            Membership Amount (₹)
          </label>
          <input
            type="number"
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
            value={data.membership_amount || 0}
            onChange={(e) => setData({ ...data, membership_amount: e.target.value })}
            data-testid="alumni-amount"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase text-brand-ink/60">Intro Text</label>
          <textarea
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
            rows={3}
            value={data.intro_text || ""}
            onChange={(e) => setData({ ...data, intro_text: e.target.value })}
          />
        </div>
        <button
          disabled={saving}
          className="bg-brand-blue text-white px-4 py-2 rounded-lg text-sm"
          data-testid="alumni-settings-save"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}

export default AdminAlumniSettings;
