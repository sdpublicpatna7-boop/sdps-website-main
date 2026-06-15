import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { ImageOrUrlField } from "@/components/admin/SharedFields";

export function AdminKheloPatna() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ image_url: "", caption: "", order: 0 });
  const [editing, setEditing] = useState(null);

  const load = () => {
    setLoading(true);
    api
      .get("/khelo-patna-gallery")
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.image_url) {
      toast.error("Please upload or paste an image URL");
      return;
    }
    setSaving(true);
    try {
      if (editing) await api.put(`/admin/khelo-patna-gallery/${editing.id}`, form);
      else await api.post("/admin/khelo-patna-gallery", form);
      toast.success(editing ? "Updated" : "Added");
      setOpen(false);
      setEditing(null);
      setForm({ image_url: "", caption: "", order: 0 });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this photo?")) return;
    await api.delete(`/admin/khelo-patna-gallery/${id}`);
    toast.success("Deleted");
    load();
  };

  const startEdit = (it) => {
    setEditing(it);
    setForm({ image_url: it.image_url || "", caption: it.caption || "", order: it.order || 0 });
    setOpen(true);
  };
  const startNew = () => {
    setEditing(null);
    setForm({ image_url: "", caption: "", order: 0 });
    setOpen(true);
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline text-2xl font-semibold">SDPS × Khelo Patna Gallery</h1>
          <p className="text-sm text-brand-ink/60 mt-1">
            Photos shown on the SDPS × Khelo Patna page. Upload from device or paste URL.
          </p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue/90 text-sm font-semibold"
        >
          + Add Photo
        </button>
      </div>

      {/* Logo note */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
        <img
          src="/khelo-patna-logo.png"
          alt="Khelo Patna"
          className="h-14 w-14 object-contain rounded-xl"
        />
        <div>
          <div className="font-semibold text-amber-800 text-sm">Khelo Patna Logo</div>
          <div className="text-xs text-amber-700 mt-0.5">
            The real Khelo Patna Elite Turf logo is now shown on the partnership page.
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-brand-ink/60">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-10 text-center text-brand-ink/50">
              No photos yet. Add the first one!
            </div>
          )}
          {items.map((it) => (
            <div
              key={it.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden group"
            >
              <div className="aspect-video bg-slate-50 overflow-hidden">
                <img
                  src={it.image_url}
                  alt={it.caption || ""}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                {it.caption && (
                  <div className="text-xs font-semibold text-brand-ink mb-2 truncate">
                    {it.caption}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(it)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg font-semibold flex-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded-lg font-semibold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <form onSubmit={submit} className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6">
            <h3 className="font-headline text-lg font-semibold mb-4">
              {editing ? "Edit" : "Add"} Photo
            </h3>
            <div className="mb-4">
              <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1.5">
                Photo *
              </label>
              <ImageOrUrlField
                value={form.image_url}
                onChange={(v) => setForm({ ...form, image_url: v })}
                subDir="khelo_patna"
              />
            </div>
            <div className="mb-4">
              <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1.5">
                Caption (optional)
              </label>
              <input
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="e.g. Students at Elite Turf"
              />
            </div>
            <div className="mb-5">
              <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1.5">
                Order
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand-blue text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-60"
              >
                {saving ? "Saving..." : editing ? "Update" : "Add Photo"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminKheloPatna;
