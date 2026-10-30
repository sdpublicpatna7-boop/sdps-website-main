import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { 
  Save, 
  ShieldAlert, 
  FileText, 
  Shield, 
  Inbox, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Search
} from "lucide-react";
import DOMPurify from "dompurify";

export function AdminLegalPages() {
  const [tab, setTab] = useState("terms");
  const [data, setData] = useState({ terms: null, privacy: null, dmca: null });
  const [saving, setSaving] = useState(false);

  // DMCA Notices Management State
  const [dmcaRequests, setDmcaRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const load = (id) =>
    api
      .get(`/admin/legal/${id}`)
      .then((r) => setData((prev) => ({ ...prev, [id]: r.data })))
      .catch(() => {});

  const loadRequests = () => {
    setLoadingRequests(true);
    api
      .get("/admin/dmca-requests")
      .then((r) => setDmcaRequests(r.data || []))
      .catch(() => setDmcaRequests([]))
      .finally(() => setLoadingRequests(false));
  };

  useEffect(() => {
    load("terms");
    load("privacy");
    load("dmca");
    loadRequests();
  }, []);

  const save = async () => {
    if (!data[tab]) return;
    setSaving(true);
    try {
      await api.put(`/admin/legal/${tab}`, data[tab]);
      toast.success(`${data[tab].title || tab.toUpperCase()} saved successfully`);
    } catch {
      toast.error("Failed to save legal page");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRequestStatus = async (reqId, newStatus, currentNotes) => {
    setUpdatingId(reqId);
    try {
      await api.put(`/admin/dmca-requests/${reqId}`, {
        status: newStatus,
        admin_notes: currentNotes
      });
      toast.success(`Request status updated to: ${newStatus}`);
      loadRequests();
    } catch {
      toast.error("Could not update DMCA request status");
    } finally {
      setUpdatingId(null);
    }
  };

  const current = data[tab];
  const update = (field, val) =>
    setData((prev) => ({ ...prev, [tab]: { ...prev[tab], [field]: val } }));

  const filteredRequests = dmcaRequests.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch =
      !searchQuery ||
      (r.reference_id && r.reference_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.claimant_name && r.claimant_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.claimant_email && r.claimant_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.infringing_urls_or_items && r.infringing_urls_or_items.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div>
        <h1 className="font-headline text-2xl font-bold text-slate-900 mb-1">
          Legal Policies &amp; DMCA Compliance
        </h1>
        <p className="text-sm text-slate-500">
          Manage Terms &amp; Conditions, Privacy Policy, DMCA Notice, and review incoming copyright takedown claims.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "terms", label: "Terms & Conditions", icon: FileText },
          { id: "privacy", label: "Privacy Policy", icon: Shield },
          { id: "dmca", label: "DMCA & Copyright Policy", icon: ShieldAlert },
          { 
            id: "notices", 
            label: `DMCA Notices (${dmcaRequests.filter(r => r.status === 'pending').length} pending)`, 
            icon: Inbox,
            highlight: dmcaRequests.filter(r => r.status === 'pending').length > 0
          },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border flex items-center gap-2 transition ${
                tab === t.id
                  ? "bg-brand-blue text-white border-brand-blue shadow-sm"
                  : t.highlight
                    ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                    : "bg-white text-slate-700 border-slate-200 hover:border-brand-blue"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB: INCOMING DMCA NOTICES */}
      {tab === "notices" ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="font-headline font-bold text-lg text-slate-900">
                  Incoming DMCA Takedown Notices
                </h2>
                <p className="text-xs text-slate-500">
                  Statutory 17 U.S.C. § 512(c)(3) notices submitted via the online compliance form.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadRequests}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
                  title="Refresh Notices"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingRequests ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search by Reference ID, Claimant, Email, or URL..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-brand-blue bg-white"
                >
                  <option value="all">All ({dmcaRequests.length})</option>
                  <option value="pending">Pending</option>
                  <option value="under_review">Under Review</option>
                  <option value="content_removed">Content Removed</option>
                  <option value="counter_notice">Counter Notice</option>
                  <option value="rejected">Rejected / Invalid</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            {/* Notices Table */}
            {loadingRequests ? (
              <div className="text-center py-12 text-xs text-slate-400 animate-pulse">
                Loading takedown requests...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-bold text-sm text-slate-700">No DMCA Notices Found</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {statusFilter !== "all" ? `No requests match status "${statusFilter}".` : "All clear! No copyright complaints pending."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map((req) => (
                  <div
                    key={req.id || req.reference_id}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                          {req.reference_id}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            req.status === "pending"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : req.status === "content_removed" || req.status === "resolved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {req.status?.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block font-medium">Claimant:</span>
                        <strong className="text-slate-800">{req.claimant_name}</strong>
                        {req.organization_or_owner && (
                          <span className="text-slate-500 block">({req.organization_or_owner})</span>
                        )}
                        <a href={`mailto:${req.claimant_email}`} className="text-brand-blue hover:underline block truncate mt-0.5">
                          {req.claimant_email}
                        </a>
                        {req.claimant_phone && (
                          <span className="text-slate-500 block">{req.claimant_phone}</span>
                        )}
                      </div>

                      <div>
                        <span className="text-slate-400 block font-medium">Reported Infringing URL / Material:</span>
                        <a
                          href={req.infringing_urls_or_items}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-blue hover:underline font-mono text-[11px] break-all flex items-center gap-1 mt-0.5"
                        >
                          <span className="truncate">{req.infringing_urls_or_items}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <div className="text-[11px] text-slate-500 mt-1">
                          <strong>Signature:</strong> <em>{req.electronic_signature}</em>
                        </div>
                      </div>

                      <div className="sm:col-span-2 lg:col-span-1">
                        <span className="text-slate-400 block font-medium">Copyrighted Work Claimed:</span>
                        <p className="text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px] max-h-20 overflow-y-auto mt-0.5">
                          {req.copyrighted_work_desc}
                        </p>
                      </div>
                    </div>

                    {/* Action & Notes Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Change Status:</span>
                        <select
                          value={req.status}
                          disabled={updatingId === req.id || updatingId === req.reference_id}
                          onChange={(e) => handleUpdateRequestStatus(req.reference_id || req.id, e.target.value, req.admin_notes)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 font-semibold"
                        >
                          <option value="pending">Pending</option>
                          <option value="under_review">Under Review</option>
                          <option value="content_removed">Content Removed</option>
                          <option value="counter_notice">Counter Notice Received</option>
                          <option value="rejected">Rejected / Invalid</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>

                      <div className="text-xs text-slate-400">
                        IP: {req.ip_address || "N/A"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB: POLICY HTML EDITORS */
        !current ? (
          <div className="text-center py-10 text-slate-400 animate-pulse">Loading policy document...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-4xl space-y-4 shadow-sm">
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Page Title</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold"
                value={current.title || ""}
                onChange={(e) => update("title", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Content (HTML)</label>
              <p className="text-xs text-slate-400 mb-1">
                You can use standard HTML tags: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;a&gt;, etc.
              </p>
              <textarea
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs leading-relaxed"
                rows={18}
                value={current.content || ""}
                onChange={(e) => update("content", e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="bg-brand-blue hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {current.updated_at && (
                <span className="text-xs text-slate-400">
                  Last saved: {new Date(current.updated_at).toLocaleString("en-IN")}
                </span>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase text-slate-500 mb-2">Live Formatted Preview</p>
              <div
                className="prose prose-sm max-w-none border border-slate-100 rounded-xl p-5 bg-slate-50 max-h-72 overflow-y-auto leading-relaxed"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.content || "") }}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default AdminLegalPages;
