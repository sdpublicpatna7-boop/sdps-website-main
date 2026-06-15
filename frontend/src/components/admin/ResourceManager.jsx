import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useAdminList, uploadImage, uploadFile, fullUrl } from "../../lib/admin";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, Edit2, X, Save, Loader2, ImageIcon, FileUp, Link2, Upload } from "lucide-react";

/**
 * Dual-mode image input: local upload OR paste a URL
 * Exported so other pages can import and reuse it.
 */
export function ImageOrUrlField({ value, onChange, subDir }) {
  const [mode, setMode] = useState(value && value.startsWith("http") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-2">
      {/* Preview */}
      {value && (
        <div className="relative w-fit">
          <img src={fullUrl(value)} alt="" className="h-28 rounded-xl object-cover border border-slate-200 shadow-sm" />
          <button type="button" onClick={() => onChange("")}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600">×</button>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button type="button" onClick={() => setMode("upload")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${mode === "upload" ? "bg-white shadow text-brand-blue" : "text-slate-500 hover:text-slate-700"}`}>
          <Upload className="w-3.5 h-3.5" /> Upload File
        </button>
        <button type="button" onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${mode === "url" ? "bg-white shadow text-brand-blue" : "text-slate-500 hover:text-slate-700"}`}>
          <Link2 className="w-3.5 h-3.5" /> Paste URL
        </button>
      </div>

      {mode === "upload" ? (
        <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium border-2 border-dashed transition
          ${uploading ? "border-brand-blue bg-brand-blue/5 text-brand-blue" : "border-slate-300 bg-slate-50 hover:border-brand-blue hover:bg-brand-blue/5 text-slate-600"}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          {uploading ? "Uploading..." : value ? "Change image" : "Choose image from device"}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={async (e) => {
            const file = e.target.files[0]; if (!file) return;
            setUploading(true);
            try {
              const r = await uploadImage(file, subDir || "gallery");
              onChange(r.url);
              toast.success(`Uploaded — ${r.size_kb} KB`);
            } catch { toast.error("Upload failed"); }
            finally { setUploading(false); e.target.value = ""; }
          }} />
        </label>
      ) : (
        <input
          type="url"
          placeholder="https://example.com/image.jpg or https://sdpublic.org/..."
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm"
          value={value && value.startsWith("http") ? value : ""}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/**
 * Dual-mode file input: local upload OR paste a URL
 * Exported so other pages can import and reuse it.
 */
export function FileOrUrlField({ value, onChange, subDir, maxMb }) {
  const [mode, setMode] = useState(value && value.startsWith("http") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);

  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-2">
          <a href={fullUrl(value)} target="_blank" rel="noreferrer"
            className="text-brand-blue text-sm underline truncate max-w-xs">📎 Current file</a>
          <button type="button" onClick={() => onChange("")} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button type="button" onClick={() => setMode("upload")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${mode === "upload" ? "bg-white shadow text-brand-blue" : "text-slate-500 hover:text-slate-700"}`}>
          <Upload className="w-3.5 h-3.5" /> Upload File
        </button>
        <button type="button" onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition ${mode === "url" ? "bg-white shadow text-brand-blue" : "text-slate-500 hover:text-slate-700"}`}>
          <Link2 className="w-3.5 h-3.5" /> Paste URL
        </button>
      </div>

      {mode === "upload" ? (
        <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-sm font-medium border-2 border-dashed transition
          ${uploading ? "border-brand-blue bg-brand-blue/5 text-brand-blue" : "border-slate-300 bg-slate-50 hover:border-brand-blue hover:bg-brand-blue/5 text-slate-600"}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
          {uploading ? "Uploading..." : value ? "Replace file" : `Choose file (max ${maxMb || 5} MB)`}
          <input type="file" className="hidden" disabled={uploading} onChange={async (e) => {
            const file = e.target.files[0]; if (!file) return;
            setUploading(true);
            try {
              const r = await uploadFile(file, subDir || "misc", maxMb || 5);
              onChange(r.url);
              toast.success("File uploaded");
            } catch (err) { toast.error(err?.response?.data?.detail || "Upload failed"); }
            finally { setUploading(false); e.target.value = ""; }
          }} />
        </label>
      ) : (
        <input
          type="url"
          placeholder="https://example.com/document.pdf"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm"
          value={value && value.startsWith("http") ? value : ""}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/**
 * Generic Resource Manager component
 * config: {
 *   title, endpoint, sub_dir,
 *   fields: [{ name, label, type, required, options, image, file_max_mb, default }]
 *   columns: [{ name, label, render? }]  // table columns
 * }
 */
export default function ResourceManager({ config }) {
  const { items, loading, reload } = useAdminList(config.endpoint);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const startCreate = () => {
    const defaults = Object.fromEntries(config.fields.filter(f => f.default !== undefined).map(f => [f.name, f.default]));
    setEditing(null);
    setForm({ ...defaults });
    setOpen(true);
  };

  const startEdit = (it) => {
    setEditing(it);
    setForm({ ...it });
    setOpen(true);
  };

  const remove = async (it) => {
    if (!window.confirm("Delete this item?")) return;
    await api.delete(`${config.endpoint}/${it.id}`);
    toast.success("Deleted");
    reload();
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      config.fields.forEach(f => {
        if (f.type === "number" && payload[f.name] !== undefined && payload[f.name] !== "") {
          payload[f.name] = Number(payload[f.name]);
        }
        if (f.type === "boolean") payload[f.name] = !!payload[f.name];
        if (f.type === "options-csv" && typeof payload[f.name] === "string") {
          payload[f.name] = payload[f.name].split(",").map(s => s.trim()).filter(Boolean);
        }
      });
      if (editing) {
        await api.put(`${config.endpoint}/${editing.id}`, payload);
      } else {
        await api.post(config.endpoint, payload);
      }
      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally { setSaving(false); }
  };

  const renderField = (f) => {
    const v = form[f.name];
    const set = (val) => setForm({ ...form, [f.name]: val });
    const cls = "w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-brand-blue outline-none text-sm";

    if (f.type === "textarea") return <textarea className={cls} rows={3} value={v || ""} onChange={e => set(e.target.value)} required={f.required} placeholder={f.placeholder} />;
    if (f.type === "select") return (
      <select className={cls} value={v || ""} onChange={e => set(e.target.value)} required={f.required}>
        <option value="">Select...</option>
        {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
    if (f.type === "boolean") return (
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" checked={!!v} onChange={e => set(e.target.checked)} /> {f.checkboxLabel || "Enable"}
      </label>
    );
    if (f.type === "image") return (
      <ImageOrUrlField value={v || ""} onChange={set} subDir={config.sub_dir} />
    );
    if (f.type === "file") return (
      <FileOrUrlField value={v || ""} onChange={set} subDir={config.sub_dir} maxMb={f.file_max_mb} />
    );
    if (f.type === "options-csv") return (
      <input className={cls} placeholder="Comma-separated values" value={Array.isArray(v) ? v.join(", ") : (v || "")} onChange={e => set(e.target.value)} />
    );
    return <input type={f.type || "text"} className={cls} value={v ?? ""} onChange={e => set(e.target.value)} required={f.required} placeholder={f.placeholder} />;
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline text-2xl font-semibold">{config.title}</h1>
          {config.subtitle && <p className="text-sm text-brand-ink/60 mt-1">{config.subtitle}</p>}
        </div>
        <button onClick={startCreate} className="inline-flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue-light text-sm" data-testid="resource-add-btn">
          <Plus className="w-4 h-4" /> Add New
        </button>
      </div>

      {loading ? <div className="text-brand-ink/60">Loading...</div> : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {items.length === 0 ? <div className="text-center py-12 text-brand-ink/60">No items yet. Click "Add New" to get started.</div> : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-brand-ink/60">
                <tr>
                  {config.columns.map(c => <th key={c.name} className="text-left py-3 px-4">{c.label}</th>)}
                  <th className="py-3 px-4 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    {config.columns.map(c => (
                      <td key={c.name} className="py-3 px-4">
                        {c.render ? c.render(it) : (typeof it[c.name] === "boolean" ? (it[c.name] ? "Yes" : "No") : String(it[c.name] ?? ""))}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => startEdit(it)} className="p-1.5 hover:bg-slate-200 rounded mr-1" data-testid={`edit-${it.id}`}><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => remove(it)} className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded" data-testid={`delete-${it.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <form onSubmit={submit} className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="font-headline text-lg font-semibold">{editing ? "Edit" : "Add"} — {config.title}</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-2 hover:bg-slate-100 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {config.fields.map(f => (
                <div key={f.name}>
                  <label className="text-xs font-bold uppercase tracking-wider text-brand-ink/60 mb-1.5 block">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  {renderField(f)}
                  {f.help && <p className="text-xs text-brand-ink/50 mt-1">{f.help}</p>}
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-slate-200 flex justify-end gap-2 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-blue text-white text-sm disabled:opacity-60" data-testid="resource-save-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
