import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { ImageOrUrlField } from "@/components/admin/SharedFields";
import { Trophy, Check, Sparkles, RefreshCw } from "lucide-react";

export function AdminKheloPatna() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ image_url: "", caption: "", order: 0 });
  const [editing, setEditing] = useState(null);

  // Logo Settings state
  const [logoUrl, setLogoUrl] = useState("/khelo-patna-logo.png");
  const [savingLogo, setSavingLogo] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .get("/khelo-patna-gallery")
      .then((r) => setItems(r.data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));

    // Fetch site settings for logo
    api
      .get("/site-settings")
      .then((r) => {
        if (r.data?.khelo_patna_logo_url) {
          setLogoUrl(r.data.khelo_patna_logo_url);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveLogo = async () => {
    if (!logoUrl) {
      toast.error("Please provide a valid logo image");
      return;
    }
    setSavingLogo(true);
    try {
      const res = await api.put("/site-settings", { khelo_patna_logo_url: logoUrl });
      try {
        localStorage.removeItem("sdps_site_settings");
        if (res.data?.khelo_patna_logo_url) {
          setLogoUrl(res.data.khelo_patna_logo_url);
        }
      } catch (e) {}
      toast.success("Khelo Patna logo updated successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save logo");
    } finally {
      setSavingLogo(false);
    }
  };

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
    <div className="space-y-6">
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-brand-orange" /> SDPS × Khelo Patna Gallery
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage Khelo Patna partnership logo, hero banner, and sports gallery photos.
          </p>
        </div>
        <button
          onClick={startNew}
          className="inline-flex items-center gap-2 bg-brand-blue text-white px-4 py-2.5 rounded-xl hover:bg-brand-blue/90 text-xs font-bold shadow-sm transition cursor-pointer"
        >
          + Add Photo
        </button>
      </div>

      {/* Khelo Patna Logo Manager Card */}
      <div className="bg-white border border-amber-200/80 rounded-3xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-slate-950 rounded-2xl p-2 border border-slate-800 flex items-center justify-center shrink-0 shadow-inner">
              <img
                src={logoUrl || "/khelo-patna-logo.png"}
                alt="Khelo Patna Logo"
                className="w-full h-full object-contain rounded-xl"
                onError={(e) => { e.target.src = "/khelo-patna-logo.png"; }}
              />
            </div>
            <div>
              <div className="font-headline font-bold text-slate-900 text-sm flex items-center gap-2">
                Khelo Patna Logo <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload or change the official Khelo Patna partnership logo shown across the site.
              </p>
            </div>
          </div>

          <button
            onClick={handleSaveLogo}
            disabled={savingLogo}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0"
          >
            {savingLogo ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Logo...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" /> Save Khelo Patna Logo
              </>
            )}
          </button>
        </div>

        <div>
          <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
            Logo Image (Upload File or Paste Image URL)
          </label>
          <ImageOrUrlField
            value={logoUrl}
            onChange={(url) => setLogoUrl(url)}
            subDir="khelo_patna"
            aspect="khelo_patna_logo"
          />
        </div>
      </div>

      {/* Gallery Section Header */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="font-headline text-lg font-bold text-slate-900">
          Sports & Turf Gallery Photos ({items.length})
        </h2>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm font-semibold py-8 text-center">
          Loading gallery photos...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.length === 0 && (
            <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
              No photos yet. Add the first one!
            </div>
          )}
          {items.map((it) => (
            <div
              key={it.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden group shadow-xs hover:shadow-md transition"
            >
              <div className="aspect-video bg-slate-950 overflow-hidden relative">
                <img
                  src={it.image_url}
                  alt={it.caption || ""}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3 space-y-2">
                {it.caption && (
                  <div className="text-xs font-semibold text-slate-800 truncate">
                    {it.caption}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(it)}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-semibold flex-1 transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(it.id)}
                    className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
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
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <form onSubmit={submit} className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <h3 className="font-headline text-lg font-bold text-slate-900">
              {editing ? "Edit" : "Add"} Photo
            </h3>
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                Photo *
              </label>
              <ImageOrUrlField
                value={form.image_url}
                onChange={(v) => setForm({ ...form, image_url: v })}
                subDir="khelo_patna"
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                Caption (optional)
              </label>
              <input
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="e.g. Students practicing at Elite Turf"
              />
            </div>
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                Order
              </label>
              <input
                type="number"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand-blue text-white py-2.5 rounded-xl font-bold text-xs disabled:opacity-60 cursor-pointer shadow-xs"
              >
                {saving ? "Saving..." : editing ? "Update" : "Add Photo"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
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
