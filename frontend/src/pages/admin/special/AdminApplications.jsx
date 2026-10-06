import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Search,
  Trash2,
  Phone,
  Mail,
  Send,
  CreditCard,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ExternalLink,
  Calendar,
  User,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";

export function AdminApplications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, paid, unpaid, approved, rejected
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchApplications = () => {
    setLoading(true);
    api
      .get("/admin/admissions")
      .then((r) => setItems(r.data || []))
      .catch(() => toast.error("Failed to load admission applications"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const parseAnswers = (raw) => {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  };

  const FIELD_LABELS = {
    student_name: "Student Name",
    dob: "Date of Birth",
    gender: "Gender",
    blood_group: "Blood Group",
    applying_class: "Applying For Class",
    previous_school: "Previous School",
    previous_class: "Last Class Passed",
    father_name: "Father's Name",
    father_occupation: "Father's Occupation",
    father_phone: "Father's Phone",
    father_email: "Father's Email",
    mother_name: "Mother's Name",
    mother_occupation: "Mother's Occupation",
    mother_phone: "Mother's Phone",
    residential_address: "Address",
    city: "City",
    pincode: "PIN Code",
    medical_condition: "Medical Condition",
    transport_required: "Transport",
    hostel_required: "Hostel",
    siblings_in_school: "Siblings in SDPS",
    how_did_you_hear: "How Heard",
    reference_name: "Reference",
    photo_url: "Photo",
    birth_certificate_url: "Birth Certificate",
    prev_marksheet_url: "Marksheet",
  };

  const SKIP_KEYS = new Set(["raw"]);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/admin/admissions/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      toast.success("Application permanently deleted");
      setDeleteConfirmItem(null);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to delete application");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      const res = await api.patch(`/admin/admissions/${id}`, { status: newStatus });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: res.data?.status || newStatus } : item
        )
      );
      toast.success(`Status updated to "${newStatus}"`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const answers = parseAnswers(it.answers);
      const isPaid = !!it.payment_id || it.status === "payment_received" || (it.payment_amount && it.payment_amount > 0);

      if (filter === "paid" && !isPaid) return false;
      if (filter === "unpaid" && isPaid) return false;
      if (filter === "approved" && it.status !== "approved") return false;
      if (filter === "rejected" && it.status !== "rejected") return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = (answers.student_name || it.name || "").toLowerCase();
      const parentName = (answers.father_name || answers.mother_name || "").toLowerCase();
      const phone = (answers.father_phone || answers.mother_phone || "").toLowerCase();
      const email = (answers.father_email || "").toLowerCase();
      const cls = (answers.applying_class || "").toLowerCase();
      const payId = (it.payment_id || "").toLowerCase();
      const appId = (it.id || "").toLowerCase();

      return (
        name.includes(q) ||
        parentName.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        cls.includes(q) ||
        payId.includes(q) ||
        appId.includes(q)
      );
    });
  }, [items, search, filter]);

  const stats = useMemo(() => {
    const total = items.length;
    let paidCount = 0;
    let unpaidCount = 0;
    items.forEach((it) => {
      if (it.payment_id || it.status === "payment_received" || (it.payment_amount && it.payment_amount > 0)) {
        paidCount++;
      } else {
        unpaidCount++;
      }
    });
    return { total, paidCount, unpaidCount };
  }, [items]);

  if (loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-brand-blue" />
        <p className="text-sm font-medium">Loading admission applications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-slate-900">Admission Applications</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review submitted online admission forms, fee payment verifications, and student profiles.
          </p>
        </div>
        <button
          onClick={fetchApplications}
          disabled={loading}
          className="self-start sm:self-auto px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Received</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">₹500 Paid (Verified)</div>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.paidCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-amber-600">Unpaid / Drop-offs (Step 1)</div>
            <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats.unpaidCount}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, parent, phone, email, class, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "paid", label: "₹500 Paid" },
            { id: "unpaid", label: "Unpaid / Drop-offs" },
            { id: "approved", label: "Approved" },
            { id: "rejected", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                filter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No applications found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {search || filter !== "all"
              ? "Try adjusting your search query or filter."
              : "No admission applications have been submitted yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((it) => {
            const answers = parseAnswers(it.answers);
            const isOpen = expanded === it.id;
            const name = answers.student_name || it.name || "—";
            const cls = answers.applying_class || "—";
            const phone = answers.father_phone || answers.mother_phone || "—";
            const email = answers.father_email || "—";
            const isPaid =
              !!it.payment_id ||
              it.status === "payment_received" ||
              (it.payment_amount && it.payment_amount > 0);

            return (
              <div
                key={it.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Header Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div
                    onClick={() => setExpanded(isOpen ? null : it.id)}
                    className="flex items-center gap-4 cursor-pointer flex-1"
                  >
                    {answers.photo_url ? (
                      <img
                        src={answers.photo_url}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-500 border border-slate-200 flex items-center justify-center font-bold text-base flex-shrink-0">
                        {name.charAt(0) || "A"}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-headline font-bold text-slate-900 text-base">{name}</span>
                        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {cls}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span>Phone: <strong className="text-slate-700">{phone}</strong></span>
                        <span>•</span>
                        <span>Email: <strong className="text-slate-700">{email}</strong></span>
                        <span>•</span>
                        <span>Date: <span className="text-slate-500">{it.created_at?.slice(0, 10)}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Actions */}
                  <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
                    {/* Payment Status Pill */}
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> ₹500 Paid (Verified)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Unpaid / Drop-off
                      </span>
                    )}

                    {/* Pipeline Status Pill */}
                    <span
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider ${
                        it.status === "approved"
                          ? "bg-emerald-100 text-emerald-800"
                          : it.status === "rejected"
                          ? "bg-rose-100 text-rose-800"
                          : it.status === "under_review"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {it.status || "submitted"}
                    </span>

                    {/* Delete Action Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmItem(it)}
                      className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-200 transition cursor-pointer"
                      title="Delete application"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Expand/Collapse Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : it.id)}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                      title={isOpen ? "Collapse" : "Expand"}
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isOpen && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50 space-y-5">
                    {/* Payment Details Banner */}
                    <div
                      className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isPaid
                          ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                          : "bg-amber-50/70 border-amber-200 text-amber-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">
                            {isPaid ? "Registration Fee Paid (₹500)" : "Registration Fee Not Paid"}
                          </div>
                          <div className="mt-0.5 opacity-90">
                            {isPaid ? (
                              <span>
                                Razorpay Payment ID: <strong>{it.payment_id}</strong>
                                {it.payment_confirmed_at && (
                                  <> • Paid On: {new Date(it.payment_confirmed_at).toLocaleString()}</>
                                )}
                              </span>
                            ) : (
                              <span>
                                The applicant submitted Step 1 of the form, but did not complete the ₹500 Razorpay payment (or closed the payment popup during a developer test).
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Contact Links */}
                      {phone && phone !== "—" && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`tel:${phone}`}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 transition shadow-sm"
                          >
                            <Phone className="w-3.5 h-3.5 text-blue-600" /> Call
                          </a>
                          <a
                            href={`https://wa.me/${phone.replace(/\D/g, "").length === 10 ? '91' + phone.replace(/\D/g, "") : phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1.5 transition shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Status & Review Controls */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                          Application Review Status:
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5 block">
                          Current status: <strong className="text-slate-800 capitalize">{it.status || "submitted"}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {["submitted", "under_review", "approved", "rejected"].map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={updatingId === it.id || it.status === st}
                            onClick={() => handleStatusChange(it.id, st)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer capitalize ${
                              it.status === st
                                ? "bg-slate-900 text-white shadow-sm opacity-100"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {st.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Full Submitted Form Fields */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                        Submitted Application Data:
                      </h4>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(answers)
                          .filter(([k]) => !SKIP_KEYS.has(k))
                          .map(([k, v]) => {
                            if (!v && v !== 0) return null;
                            const label =
                              FIELD_LABELS[k] ||
                              k
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase());
                            const isUrl = typeof v === "string" && v.startsWith("http");
                            return (
                              <div key={k} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                                  {label}
                                </div>
                                {isUrl ? (
                                  <a
                                    href={v}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-brand-blue text-xs font-bold hover:underline flex items-center gap-1"
                                  >
                                    View File <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <div className="text-xs font-bold text-slate-800 break-words">
                                    {String(v)}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">ID: {it.id}</span>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(it)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer border border-rose-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Application
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-headline text-lg font-bold text-slate-900">
                Delete Admission Application?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to delete the application for{" "}
                <strong className="text-slate-800">
                  {parseAnswers(deleteConfirmItem.answers).student_name || deleteConfirmItem.name || "this student"}
                </strong>
                ? This will permanently remove these temp/test details from the database.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1 text-slate-600">
              <div>Class: <strong>{parseAnswers(deleteConfirmItem.answers).applying_class || "—"}</strong></div>
              <div>Submitted: <strong>{deleteConfirmItem.created_at?.slice(0, 10)}</strong></div>
              <div>Status: <strong className="capitalize">{deleteConfirmItem.status || "submitted"}</strong></div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDelete(deleteConfirmItem.id)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminApplications;
