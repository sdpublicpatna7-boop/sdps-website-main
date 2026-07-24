import { useState } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, Edit2, X, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { useAdminList } from "@/lib/admin";

const PERMISSION_OPTIONS = [
  { value: "news", label: "News & Bulletins" },
  { value: "notices", label: "Notices & Circulars" },
  { value: "gallery", label: "Media & Video Gallery" },
  { value: "calendar", label: "School Calendar & Holidays" },
  { value: "hostel-gallery", label: "Hostel Gallery" },
  { value: "khelo-patna-gallery", label: "Khelo Patna Gallery" },
  { value: "council", label: "Student Council" },
  { value: "admissions", label: "Admissions & Forms" },
  { value: "career", label: "Careers & Applications" },
  { value: "alumni", label: "Alumni Directory & Meets" },
  { value: "academics", label: "Academics (Homework & Exams)" },
  { value: "media-tools", label: "Media Tools & Educators" },
  { value: "tc-records", label: "TC Records" },
  { value: "popup", label: "Welcome Popup Banner" },
  { value: "contact-messages", label: "Contact Messages" },
  { value: "whatsapp", label: "WhatsApp Marketing & SMS" },
  { value: "site-settings", label: "Site & Legal Settings" },
  { value: "google-reviews", label: "Google Review QR" },
];

export function AdminStaffUsers() {
  const { items, loading, reload } = useAdminList("/admin/staff-users");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", username: "", email: "", phone: "", password: "", role: "staff", permissions: [] });
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const startCreate = () => {
    setEditing(null);
    setForm({ name: "", username: "", email: "", phone: "", password: "", role: "staff", permissions: [] });
    setOpen(true);
  };
  const startEdit = (u) => {
    setEditing(u);
    setForm({
      name: u.name || "",
      username: u.username || u.email || "",
      email: u.email || "",
      phone: u.phone || "",
      password: "",
      role: u.role || "staff",
      permissions: u.permissions || []
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password;
      if (editing) await api.put(`/admin/staff-users/${editing.id}`, payload);
      else await api.post("/admin/staff-users", payload);
      toast.success(editing ? "Updated" : "Staff user created");
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.name}?`)) return;
    await api.delete(`/admin/staff-users/${u.id}`);
    toast.success("Deleted");
    reload();
  };

  const ROLE_COLORS = {
    superadmin: "bg-red-100 text-red-700",
    staff: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-headline text-2xl font-semibold">Staff & Admin Users</h1>
          <p className="text-sm text-brand-ink/60 mt-1">
            Manage who can access the admin panel and what they can do.
          </p>
        </div>
        <button
          onClick={startCreate}
          className="inline-flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg hover:bg-brand-blue/90 text-sm"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Role explanation */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="font-headline font-semibold text-red-700 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" /> Superadmin
          </div>
          <p className="text-xs text-red-600">
            Full access to all features — content, admissions, settings, fee structures, staff
            management, and all modules.
          </p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <div className="font-headline font-semibold text-emerald-700 mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Staff
          </div>
          <p className="text-xs text-emerald-600">
            Granular access — access is restricted only to the specific modules checked and authorized by a superadmin.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-brand-ink/50">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-brand-ink/60">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Username</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Phone</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Created</th>
                <th className="px-5 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {items.filter(u => u.email !== "admin@sdpublic.org").map((u) => (
                <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-semibold">{u.name}</td>
                  <td className="px-5 py-3 font-mono text-xs text-brand-blue font-bold">{u.username || u.email || "—"}</td>
                  <td className="px-5 py-3 text-brand-ink/70">{u.email || "—"}</td>
                  <td className="px-5 py-3 text-brand-ink/70 font-mono text-xs">{u.phone || "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-full w-fit ${
                          ROLE_COLORS[u.role] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role}
                      </span>
                      {u.role === "staff" && (
                        <span className="text-[11px] text-brand-ink/50">
                          {u.permissions?.length ? `${u.permissions.length} module(s) permitted` : "No modules permitted"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-brand-ink/50 text-xs">
                    {u.created_at ? u.created_at.split("T")[0] : "—"}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => startEdit(u)}
                      className="p-1.5 hover:bg-slate-200 rounded mr-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => remove(u)}
                      className="p-1.5 hover:bg-red-100 hover:text-red-600 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <form onSubmit={submit} className="bg-white rounded-2xl max-w-lg w-full shadow-2xl my-8">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-headline text-lg font-semibold">
                {editing ? "Edit User" : "Add Staff User"}
              </h2>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
                  Full Name *
                </label>
                <input
                  required
                  placeholder="e.g. Chanda Kumari"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
                    Username *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. chanda_staff"
                    className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9876543210"
                    className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. chanda@sdpublic.org"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
                  {editing ? "New Password (leave blank to keep)" : "Password *"}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required={!editing}
                    placeholder="Enter login password"
                    className="w-full px-3 py-2 border rounded-lg pr-10"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-ink/40"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
                  Role *
                </label>
                <select
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="staff">Staff Member</option>
                  <option value="superadmin">Superadmin (Full Access)</option>
                </select>
              </div>

              {form.role === "staff" && (
                <div>
                  <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-2">
                    Granted Modules / Permissions
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-3.5 border rounded-lg bg-slate-50/50">
                    {PERMISSION_OPTIONS.map((opt) => {
                      const checked = form.permissions?.includes(opt.value);
                      return (
                        <label key={opt.value} className="flex items-start gap-2 text-xs text-brand-ink/80 select-none cursor-pointer hover:text-brand-ink">
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                            checked={checked}
                            onChange={(e) => {
                              const copy = [...(form.permissions || [])];
                              if (e.target.checked) {
                                if (!copy.includes(opt.value)) copy.push(opt.value);
                              } else {
                                const idx = copy.indexOf(opt.value);
                                if (idx > -1) copy.splice(idx, 1);
                              }
                              setForm({ ...form, permissions: copy });
                            }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
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
                {editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminStaffUsers;
