import { useState } from "react";
import api from "@/lib/api";
import { useAdminList, fullUrl } from "@/lib/admin";
import { toast, Toaster } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { FileOrUrlField } from "@/components/admin/SharedFields";

export function AdminTC() {
  const { items, loading, reload } = useAdminList("/admin/tc-records");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    student_name: "",
    dob: "",
    admission_number: "",
    notes: "",
    tc_file_url: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.tc_file_url) {
      toast.error("Please upload or link the TC file");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/tc-records", form);
      toast.success("TC record saved");
      setOpen(false);
      setForm({ student_name: "", dob: "", admission_number: "", notes: "", tc_file_url: "" });
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this TC record?")) return;
    await api.delete(`/admin/tc-records/${id}`);
    toast.success("Deleted");
    reload();
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-headline text-2xl font-semibold">Transfer Certificate Records</h1>
        <button
          onClick={() => setOpen(true)}
          className="bg-brand-blue text-white px-4 py-2 rounded-lg text-sm"
          data-testid="tc-add-btn"
        >
          + Upload TC
        </button>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-brand-ink/60">
              <tr>
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">DOB</th>
                <th className="text-left py-3 px-4">Admission #</th>
                <th className="text-left py-3 px-4">File</th>
                <th className="text-left py-3 px-4">Uploaded</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="py-3 px-4 font-medium">{t.student_name}</td>
                  <td className="py-3 px-4">{t.dob}</td>
                  <td className="py-3 px-4">{t.admission_number}</td>
                  <td className="py-3 px-4">
                    <a
                      href={fullUrl(t.tc_file_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-blue underline inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      View
                    </a>
                  </td>
                  <td className="py-3 px-4 text-brand-ink/60">{t.uploaded_at?.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => remove(t.id)}
                      className="p-1.5 hover:bg-red-100 rounded text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-brand-ink/60">
                    No TC records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <h2 className="font-headline text-lg font-semibold">Upload TC Record</h2>
            <input
              required
              placeholder="Student Full Name"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              value={form.student_name}
              onChange={(e) => setForm({ ...form, student_name: e.target.value })}
            />
            <input
              required
              type="date"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              value={form.dob}
              onChange={(e) => setForm({ ...form, dob: e.target.value })}
            />
            <input
              required
              placeholder="Admission Number"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              value={form.admission_number}
              onChange={(e) => setForm({ ...form, admission_number: e.target.value })}
            />
            <textarea
              placeholder="Notes (optional)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <div>
              <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
                TC File (PDF) *
              </label>
              <FileOrUrlField
                value={form.tc_file_url || ""}
                onChange={(v) => setForm({ ...form, tc_file_url: v })}
                subDir="tc"
                maxMb={10}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm"
                data-testid="tc-save-btn"
              >
                {saving ? "Saving..." : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminTC;
