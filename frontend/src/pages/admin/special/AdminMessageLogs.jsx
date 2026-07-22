import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import {
  Mail, MessageSquare, Send, CheckCircle2, XCircle, AlertCircle,
  RefreshCw, Search, Eye, RotateCw, Trash2, Filter, ChevronLeft, ChevronRight,
  FileText, ShieldAlert, Sparkles, Phone, Server, ScrollText
} from "lucide-react";
import SEO from "@/components/layout/SEO";

export default function AdminMessageLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total_all: 0,
    total_emails: 0,
    total_whatsapp: 0,
    total_sent: 0,
    total_failed: 0,
    total_mocked: 0,
    success_rate: 100
  });
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState(null);

  // Filters & Pagination
  const [channel, setChannel] = useState("all"); // "all" | "email" | "whatsapp"
  const [status, setStatus] = useState("all");   // "all" | "sent" | "failed" | "mocked"
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Active Detail Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [previewTab, setPreviewTab] = useState("rendered"); // "rendered" | "source"

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        channel,
        status,
        search,
        page: page.toString(),
        limit: "25"
      }).toString();
      
      const res = await api.get(`/admin/message-logs?${query}`);
      setLogs(res.data.logs || []);
      setStats(res.data.stats || {});
      setTotalPages(res.data.pages || 1);
      setTotalCount(res.data.total || 0);
    } catch (e) {
      toast.error("Failed to load message logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [channel, status, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResend = async (logId, e) => {
    if (e) e.stopPropagation();
    setResendingId(logId);
    try {
      const res = await api.post(`/admin/message-logs/${logId}/resend`);
      if (res.data.success) {
        toast.success("Message re-sent successfully!");
        fetchLogs();
      } else {
        toast.error(`Resend failed: ${res.data.message || "Unknown error"}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to resend message");
    } finally {
      setResendingId(null);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear message logs?")) return;
    try {
      const res = await api.delete(`/admin/message-logs/clear?channel=${channel}`);
      toast.success(res.data.message || "Logs cleared");
      fetchLogs();
    } catch {
      toast.error("Failed to clear logs");
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return "—";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <SEO title="Email & WhatsApp Message Logs | SDPS Admin" />
      <Toaster position="top-right" richColors />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-blue/10 rounded-xl text-brand-blue">
              <ScrollText className="w-5 h-5" />
            </span>
            <h1 className="font-headline font-bold text-2xl text-slate-900">
              Email & WhatsApp Message Logs
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time audit trail of all outgoing email and WhatsApp messages, delivery statuses, error tracebacks, and 1-click resend capabilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-bold text-xs inline-flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleClearLogs}
            className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80 font-bold text-xs inline-flex items-center gap-2 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Logs
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Messages */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Total Transmissions</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_all || 0}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Across all channels</div>
          </div>
        </div>

        {/* Card 2: Email Logs */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Emails Logged</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_emails || 0}</div>
            <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">MailerCloud & Hostinger SMTP</div>
          </div>
        </div>

        {/* Card 3: WhatsApp Logs */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">WhatsApp Logged</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_whatsapp || 0}</div>
            <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Baileys Microservice</div>
          </div>
        </div>

        {/* Card 4: Success Rate */}
        <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Delivery Success</div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">{stats.success_rate || 100}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {stats.total_failed || 0} failed · {stats.total_mocked || 0} mocked
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Channel Tabs */}
          <div className="flex items-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200/60 w-fit">
            {[
              { id: "all", label: "All Messages", icon: MessageSquare },
              { id: "email", label: "Emails (📧)", icon: Mail },
              { id: "whatsapp", label: "WhatsApp (💬)", icon: Send }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setChannel(tab.id); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  channel === tab.id
                    ? "bg-white text-brand-blue shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controls: Status & Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Select */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="sent">Sent Successfully</option>
                <option value="failed">Failed / Errored</option>
                <option value="mocked">Mocked (Unconfigured)</option>
              </select>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search recipient, subject, content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 w-full sm:w-64 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </form>
          </div>
        </div>
      </div>

      {/* MESSAGE LOGS TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Channel</th>
                <th className="py-3.5 px-4">Recipient</th>
                <th className="py-3.5 px-4">Subject / Notification</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-blue" />
                    Loading message logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No message logs found for the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/80 transition cursor-pointer"
                  >
                    {/* Channel Badge */}
                    <td className="py-3 px-4">
                      {log.channel === "email" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold text-[11px]">
                          <Mail className="w-3 h-3 text-indigo-600" /> Email
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-bold text-[11px]">
                          <Send className="w-3 h-3 text-emerald-600" /> WhatsApp
                        </span>
                      )}
                    </td>

                    {/* Recipient */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div>{log.recipient || "—"}</div>
                      {log.recipient_name && (
                        <div className="text-[10px] text-slate-400 font-normal">{log.recipient_name}</div>
                      )}
                    </td>

                    {/* Subject */}
                    <td className="py-3 px-4 max-w-xs truncate font-medium text-slate-700">
                      {log.subject || "No Subject"}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4">
                      {log.status === "sent" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sent
                        </span>
                      )}
                      {log.status === "failed" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px]">
                          <XCircle className="w-3 h-3 text-rose-600" /> Failed
                        </span>
                      )}
                      {log.status === "mocked" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[10px]">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> Mocked
                        </span>
                      )}
                    </td>

                    {/* Provider */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.provider || "default"}
                    </td>

                    {/* Timestamp */}
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                          title="View Full Message & Payload"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleResend(log.id, e)}
                          disabled={resendingId === log.id}
                          className="p-1.5 rounded-lg text-brand-blue hover:bg-brand-blue/10 transition cursor-pointer disabled:opacity-50"
                          title="Re-send Message"
                        >
                          <RotateCw className={`w-4 h-4 ${resendingId === log.id ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="p-4 bg-slate-50/80 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-800">{logs.length}</strong> of <strong className="text-slate-800">{totalCount}</strong> logs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FULL MESSAGE DETAILS & PREVIEW MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {selectedLog.channel === "email" ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] font-bold">
                      📧 EMAIL LOG
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-bold">
                      💬 WHATSAPP LOG
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-mono">{selectedLog.id}</span>
                </div>
                <h3 className="font-headline font-bold text-lg text-white mt-1">
                  {selectedLog.subject || "Message Details"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Metadata Grid */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Recipient</span>
                <span className="font-bold text-slate-900 break-all">{selectedLog.recipient}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Status</span>
                <span className="font-bold text-slate-900 capitalize">{selectedLog.status}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Provider</span>
                <span className="font-mono text-slate-700">{selectedLog.provider || "default"}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold text-slate-400 block">Sent At</span>
                <span className="text-slate-700">{formatDate(selectedLog.created_at)}</span>
              </div>
            </div>

            {/* Error Banner if failed */}
            {selectedLog.error_details && (
              <div className="p-4 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block">Error Details:</strong>
                  <code className="font-mono text-[11px] bg-rose-100/80 px-2 py-1 rounded block mt-1 break-all">
                    {selectedLog.error_details}
                  </code>
                </div>
              </div>
            )}

            {/* Message Body View */}
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Message Payload
                </span>
                {selectedLog.channel === "email" && (
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setPreviewTab("rendered")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        previewTab === "rendered" ? "bg-white shadow-xs text-brand-blue" : "text-slate-500"
                      }`}
                    >
                      Rendered HTML
                    </button>
                    <button
                      onClick={() => setPreviewTab("source")}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        previewTab === "source" ? "bg-white shadow-xs text-brand-blue" : "text-slate-500"
                      }`}
                    >
                      Raw HTML
                    </button>
                  </div>
                )}
              </div>

              {selectedLog.channel === "email" ? (
                previewTab === "rendered" ? (
                  <div className="border border-slate-200 rounded-2xl p-4 bg-white min-h-[240px]">
                    <iframe
                      title="Email Preview"
                      srcDoc={selectedLog.message_content}
                      className="w-full h-80 border-0 rounded-xl"
                    />
                  </div>
                ) : (
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-80 border border-slate-800">
                    {selectedLog.message_content}
                  </pre>
                )
              ) : (
                /* WhatsApp Chat Bubble View */
                <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200">
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 max-w-lg shadow-xs text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold border-b border-emerald-200/60 pb-2 mb-2">
                      <Send className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp Message to {selectedLog.recipient}</span>
                    </div>
                    {selectedLog.message_content}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Log ID: {selectedLog.id}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => handleResend(selectedLog.id)}
                  disabled={resendingId === selectedLog.id}
                  className="px-5 py-2 rounded-xl bg-brand-blue text-white hover:bg-brand-blue-light font-bold text-xs inline-flex items-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${resendingId === selectedLog.id ? "animate-spin" : ""}`} />
                  Re-send Message Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
