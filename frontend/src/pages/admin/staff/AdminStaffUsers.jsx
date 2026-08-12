import { useState } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Plus, Trash2, Edit2, X, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { useAdminList } from "@/lib/admin";

const PERMISSION_OPTIONS = [
  // Content & Media
  { value: "news", label: "News & Bulletins" },
  { value: "notices", label: "Notices & Circulars" },
  { value: "gallery", label: "Media & Video Gallery" },
  { value: "calendar", label: "School Calendar & Holidays" },
  { value: "hostel-gallery", label: "Hostel Gallery" },
  { value: "khelo-patna-gallery", label: "Khelo Patna Gallery" },

  // Student Council & Elections
  { value: "council", label: "Student Council & Elections" },

  // Admissions & Careers
  { value: "admissions", label: "Admissions, Enquiries & Form Builder" },
  { value: "career", label: "Careers & Vacant Posts" },
  { value: "alumni", label: "Alumni Directory, Meets & Forms" },

  // Academics
  { value: "academics", label: "Academics (Homework & Exam Papers)" },

  // Individual Media & Generator Tools
  { value: "educators", label: "Educators Management" },
  { value: "thumbnail-generator", label: "Thumbnail Generator" },
  { value: "notice-maker", label: "Notice Maker" },
  { value: "omr-tools", label: "OMR Generator, Roster & Auto-Checker" },
  { value: "salary-tools", label: "Salary Slips & Experience Certificates" },
  { value: "media-tools", label: "All Media Tools (Master Access)" },

  // Operations & Messaging
  { value: "audio-broadcast", label: "Smart Audio & Bell System" },
  { value: "tc-records", label: "TC (Transfer Certificate) Records" },
  { value: "popup", label: "Welcome Popup Banner" },
  { value: "contact-messages", label: "Contact Messages Log" },
  { value: "whatsapp", label: "WhatsApp Marketing & Fee Reminders" },
  { value: "message-logs", label: "Email & WhatsApp Delivery Audit Logs" },

  // Settings & Utilities
  { value: "apaar", label: "APAAR ID Student Manager" },
  { value: "link-tools", label: "Link Shortener & Linktree Builder" },
  { value: "site-settings", label: "Site & Legal Settings" },
  { value: "google-reviews", label: "Google Review QR Code" },
];

export function AdminStaffUsers() {
  const { items, loading, reload } = useAdminList("/admin/staff-users");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ 
    name: "", 
    username: "", 
    email: "", 
    phone: "", 
    password: "", 
    role: "staff", 
    permissions: [],
    send_welcome: true,
    notification_channel: "both",
    portal_target: "broadcasting"
  });
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const startCreate = () => {
    setEditing(null);
    setForm({ 
      name: "", 
      username: "", 
      email: "", 
      phone: "", 
      password: "", 
      role: "staff", 
      permissions: [],
      send_welcome: true,
      notification_channel: "both",
      portal_target: "broadcasting"
    });
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

  const toggleUserStatus = async (u) => {
    if (u.role === "superadmin") return;
    const newStatus = !(u.is_active !== false);
    try {
      await api.put(`/admin/staff-users/${u.id}`, { is_active: newStatus });
      toast.success(`${u.name} is now ${newStatus ? "Active" : "Inactive"}`);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update status");
    }
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
                <th className="px-5 py-3 text-left">Status</th>
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
                  <td className="px-5 py-3">
                    {u.role === "superadmin" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
                      </span>
                    ) : (
                      <button
                        onClick={() => toggleUserStatus(u)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border shadow-sm ${
                          u.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                        title={u.is_active !== false ? "Click to set Inactive" : "Click to set Active"}
                      >
                        <span className={`w-2 h-2 rounded-full ${u.is_active !== false ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                        {u.is_active !== false ? "Active" : "Inactive"}
                      </button>
                    )}
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
              {!editing && (
                <div>
                  <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1.5">
                    Password Setting Method *
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, password_mode: "admin" })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                        (form.password_mode || "admin") === "admin"
                          ? "bg-blue-50 border-brand-blue text-brand-blue ring-2 ring-brand-blue/20"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">🔑 Set by Admin</span>
                      <span className="text-[10px] font-normal text-slate-500 mt-0.5">Admin enters password in form</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, password_mode: "user", password: "" })}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                        form.password_mode === "user"
                          ? "bg-amber-100/80 border-amber-500 text-amber-950 ring-2 ring-amber-400/30"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">📩 Set by User</span>
                      <span className="text-[10px] font-normal text-amber-800 mt-0.5">User sets password via link</span>
                    </button>
                  </div>
                </div>
              )}

              {form.password_mode === "user" && !editing ? (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <span>📩 User Password Setup Selected</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Password box is disabled. An onboarding message will instruct the user: <strong>"Kindly set your password using the link below."</strong>
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
                    {editing ? "New Password (leave blank to keep)" : "Password *"}
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      required={!editing && (form.password_mode || "admin") === "admin"}
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
                  {form.password ? (
                    <div className="mt-2 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px]">
                      <div className="font-bold text-slate-700 mb-1">Strong Password Policy:</div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <span className={form.password.length >= 8 ? "text-emerald-600 font-bold flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                          {form.password.length >= 8 ? "✓" : "○"} 8+ characters
                        </span>
                        <span className={/[A-Z]/.test(form.password) ? "text-emerald-600 font-bold flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                          {/[A-Z]/.test(form.password) ? "✓" : "○"} Uppercase (A-Z)
                        </span>
                        <span className={/[a-z]/.test(form.password) ? "text-emerald-600 font-bold flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                          {/[a-z]/.test(form.password) ? "✓" : "○"} Lowercase (a-z)
                        </span>
                        <span className={/[0-9]/.test(form.password) ? "text-emerald-600 font-bold flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                          {/[0-9]/.test(form.password) ? "✓" : "○"} Number (0-9)
                        </span>
                        <span className={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/]/.test(form.password) ? "text-emerald-600 font-bold col-span-2 flex items-center gap-1" : "text-slate-400 col-span-2 flex items-center gap-1"}>
                          {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/]/.test(form.password) ? "✓" : "○"} Special Symbol (!@#$%^&*)
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      Must be 8+ chars with uppercase, lowercase, number & special symbol.
                    </p>
                  )}
                </div>
              )}
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

              {/* Welcome Onboarding & Portal Access Link Setup */}
              {!editing && (
                <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs font-bold text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.send_welcome}
                        onChange={e => setForm({ ...form, send_welcome: e.target.checked })}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span>📩 Send Welcome Onboard Notification & Password Link</span>
                    </label>
                  </div>

                  {form.send_welcome && (
                    <div className="space-y-3 pt-2 border-t border-amber-200/60 text-xs">
                      {/* Notification Channel */}
                      <div>
                        <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                          Notification Channel:
                        </label>
                        <div className="flex gap-2">
                          {[
                            { id: "both", label: "✉️💬 Email & WhatsApp" },
                            { id: "whatsapp", label: "💬 WhatsApp" },
                            { id: "email", label: "✉️ Email" },
                          ].map(ch => (
                            <button
                              key={ch.id}
                              type="button"
                              onClick={() => setForm({ ...form, notification_channel: ch.id })}
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                                form.notification_channel === ch.id
                                  ? "bg-amber-600 text-white border-amber-600 shadow-xs font-bold"
                                  : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100/50"
                              }`}
                            >
                              {ch.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Portal Target Option */}
                      <div>
                        <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                          Select Portal Login Link to Send User:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div
                            onClick={() => setForm({ ...form, portal_target: "broadcasting" })}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                              form.portal_target === "broadcasting"
                                ? "bg-amber-100/90 border-amber-500 ring-2 ring-amber-400/30 text-amber-950 font-bold"
                                : "bg-white border-amber-200 text-slate-700 hover:bg-amber-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              <input
                                type="radio"
                                name="portal_target"
                                checked={form.portal_target === "broadcasting"}
                                onChange={() => setForm({ ...form, portal_target: "broadcasting" })}
                                className="text-amber-600"
                              />
                              📻 Audio Broadcast Hub
                            </div>
                            <span className="text-[10px] font-mono text-amber-800 mt-1 truncate">
                              boardcasting.sdpublic.org
                            </span>
                          </div>

                          <div
                            onClick={() => setForm({ ...form, portal_target: "admin" })}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                              form.portal_target === "admin"
                                ? "bg-amber-100/90 border-amber-500 ring-2 ring-amber-400/30 text-amber-950 font-bold"
                                : "bg-white border-amber-200 text-slate-700 hover:bg-amber-50/50"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              <input
                                type="radio"
                                name="portal_target"
                                checked={form.portal_target === "admin"}
                                onChange={() => setForm({ ...form, portal_target: "admin" })}
                                className="text-amber-600"
                              />
                              🏫 Main Admin Portal
                            </div>
                            <span className="text-[10px] font-mono text-amber-800 mt-1 truncate">
                              sdpublic.org/admin
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Custom Personal Note */}
                      <div>
                        <label className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block mb-1">
                          Optional Personal Welcome Note:
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Welcome to the SDPS team! Please set your password upon receiving this message."
                          className="w-full px-3 py-2 border rounded-lg text-xs bg-white border-amber-200 focus:ring-amber-400"
                          value={form.custom_note || ""}
                          onChange={(e) => setForm({ ...form, custom_note: e.target.value })}
                        />
                      </div>

                      {/* Live Onboarding Message Preview */}
                      <div className="p-3 rounded-lg bg-amber-100/60 border border-amber-200 text-[11px] space-y-1.5">
                        <div className="font-bold text-amber-900 flex items-center justify-between">
                          <span>👁️ Live Onboarding Message Preview:</span>
                          <span className="text-[10px] bg-amber-200/80 px-2 py-0.5 rounded font-mono">
                            {form.portal_target === "broadcasting" ? "https://boardcasting.sdpublic.org" : "https://sdpublic.org/admin"}
                          </span>
                        </div>
                        <div className="font-mono bg-white p-2.5 rounded border border-amber-200 text-[10px] text-slate-800 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {`🎉 Welcome Onboard to S.D. Public School, ${form.name || "[User Name]"}!\n\n` +
                           (form.custom_note ? `📝 Message from Administrator:\n${form.custom_note}\n\n` : "") +
                           `Your administrator account is ready for ${form.portal_target === "broadcasting" ? "SDPS Audio Broadcast & Smart Bell System" : "SDPS Main Admin Portal"}.\n\n` +
                           `👤 Username/Email: ${form.username || form.email || "[username]"}\n` +
                           `🔐 Password: ${form.password_mode === "user" ? "Kindly set your password using the link below." : (form.password || "[password]")}\n\n` +
                           `🌐 Direct Login Portal:\n${form.portal_target === "broadcasting" ? "https://boardcasting.sdpublic.org" : "https://sdpublic.org/admin"}\n\n` +
                           `🔑 Set / Change Password Link:\n${form.portal_target === "broadcasting" ? "https://boardcasting.sdpublic.org/admin/forgot-password" : "https://sdpublic.org/admin/forgot-password"}`}
                        </div>
                      </div>
                    </div>
                  )}
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
