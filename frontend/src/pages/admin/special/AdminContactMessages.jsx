import { useState } from "react";
import { toast } from "sonner";
import {
  Mail, Phone, Calendar, User, Eye, Trash2, MessageSquare,
  Search, ChevronDown, ChevronUp, Reply, Loader2, Sparkles, X, PhoneCall
} from "lucide-react";
import { useAdminList } from "@/lib/admin";
import api from "@/lib/api";

export function AdminContactMessages() {
  const { items, loading, refetch } = useAdminList("/admin/contact-messages");
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());

  const toggleExpand = (id, e) => {
    e?.stopPropagation();
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await api.delete(`/admin/contact-messages/${id}`);
      toast.success("Message deleted successfully!");
      refetch();
      if (selectedMsg?.id === id) setSelectedMsg(null);
    } catch (err) {
      toast.error("Failed to delete message.");
    }
  };

  const filteredItems = (items || []).filter((it) => {
    const q = search.toLowerCase();
    return (
      (it.name || "").toLowerCase().includes(q) ||
      (it.email || "").toLowerCase().includes(q) ||
      (it.phone || "").toLowerCase().includes(q) ||
      (it.subject || "").toLowerCase().includes(q) ||
      (it.message || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Contact Messages</h1>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">View and respond to inquiries submitted by parents & visitors</p>
          </div>
        </div>
        
        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3.5 py-2 rounded-xl">
          Total Messages: <span className="text-slate-900 font-extrabold">{items?.length || 0}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative shadow-sm rounded-2xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, phone, or message text..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 bg-white font-medium shadow-xs"
        />
      </div>

      {/* Messages Table */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-brand-blue animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Loading Messages...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">No contact messages found</p>
          <p className="text-xs text-slate-400">Messages sent via the website contact form will appear here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold">
                <tr>
                  <th className="py-4 px-5">Name & Contact</th>
                  <th className="py-4 px-5">Subject</th>
                  <th className="py-4 px-5 min-w-[320px]">Full Message</th>
                  <th className="py-4 px-5">Submitted</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredItems.map((it) => {
                  const isExpanded = expandedIds.has(it.id);
                  const isLong = (it.message || "").length > 140;

                  return (
                    <tr
                      key={it.id || it.created_at}
                      className="hover:bg-slate-50/80 transition-colors duration-150 cursor-pointer"
                      onClick={() => setSelectedMsg(it)}
                    >
                      {/* Name & Contact Info */}
                      <td className="py-4 px-5 align-top space-y-1 min-w-[180px]">
                        <div className="font-extrabold text-slate-900 text-sm">{it.name || "Anonymous"}</div>
                        {it.email && (
                          <a
                            href={`mailto:${it.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand-blue hover:underline flex items-center gap-1 text-[11px] truncate max-w-[200px]"
                          >
                            <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                            {it.email}
                          </a>
                        )}
                        {it.phone && (
                          <a
                            href={`tel:${it.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-600 hover:text-slate-900 flex items-center gap-1 text-[11px]"
                          >
                            <Phone className="w-3 h-3 shrink-0 text-slate-400" />
                            {it.phone}
                          </a>
                        )}
                      </td>

                      {/* Subject */}
                      <td className="py-4 px-5 align-top min-w-[140px]">
                        <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg inline-block border border-slate-200/60">
                          {it.subject || "General Inquiry"}
                        </span>
                      </td>

                      {/* Message Content (FULL VISIBILITY) */}
                      <td className="py-4 px-5 align-top max-w-lg">
                        <div className={`whitespace-pre-wrap text-slate-700 leading-relaxed ${isExpanded ? "" : "line-clamp-4"}`}>
                          {it.message}
                        </div>
                        {isLong && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(it.id, e)}
                            className="mt-1 text-[10.5px] font-extrabold text-brand-blue hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            {isExpanded ? (
                              <>Show Less <ChevronUp className="w-3 h-3" /></>
                            ) : (
                              <>Read Full Message <ChevronDown className="w-3 h-3" /></>
                            )}
                          </button>
                        )}
                      </td>

                      {/* Date / Time */}
                      <td className="py-4 px-5 align-top whitespace-nowrap text-[11px] text-slate-500 font-semibold">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {it.created_at?.slice(0, 16).replace("T", " ") || "N/A"}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 align-top text-right shrink-0">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedMsg(it)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {it.email && (
                            <a
                              href={`mailto:${it.email}?subject=Re: ${encodeURIComponent(it.subject || "Inquiry to S.D. Public School")}`}
                              className="p-2 rounded-xl bg-brand-blue/10 hover:bg-brand-blue text-brand-blue hover:text-white transition cursor-pointer"
                              title="Reply via Email"
                            >
                              <Reply className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            onClick={(e) => handleDelete(it.id, e)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer"
                            title="Delete Message"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Full Message Details Modal */}
      {selectedMsg && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMsg(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 animate-in zoom-in-95 duration-200 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-150 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-orange">Contact Message Details</span>
                <h3 className="text-xl font-black text-slate-900">{selectedMsg.subject || "General Inquiry"}</h3>
                <p className="text-xs font-semibold text-slate-500">Submitted on {selectedMsg.created_at?.slice(0, 16).replace("T", " ")}</p>
              </div>
              <button
                onClick={() => setSelectedMsg(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sender Info Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Sender Name</span>
                <span className="text-xs font-extrabold text-slate-900">{selectedMsg.name || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email Address</span>
                {selectedMsg.email ? (
                  <a href={`mailto:${selectedMsg.email}`} className="text-xs font-extrabold text-brand-blue hover:underline truncate block">
                    {selectedMsg.email}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">N/A</span>
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Phone Number</span>
                {selectedMsg.phone ? (
                  <a href={`tel:${selectedMsg.phone}`} className="text-xs font-extrabold text-slate-900 hover:text-brand-blue block">
                    {selectedMsg.phone}
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">N/A</span>
                )}
              </div>
            </div>

            {/* Complete Full Message Body */}
            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">Full Message Content</span>
              <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 text-slate-800 text-sm font-normal leading-relaxed whitespace-pre-wrap break-words max-h-80 overflow-y-auto">
                {selectedMsg.message}
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={(e) => handleDelete(selectedMsg.id, e)}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Message
              </button>

              <div className="flex items-center gap-2">
                {selectedMsg.phone && (
                  <a
                    href={`tel:${selectedMsg.phone}`}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-600" /> Call Phone
                  </a>
                )}
                {selectedMsg.email && (
                  <a
                    href={`mailto:${selectedMsg.email}?subject=Re: ${encodeURIComponent(selectedMsg.subject || "Inquiry to S.D. Public School")}`}
                    className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
                  >
                    <Reply className="w-4 h-4" /> Reply via Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminContactMessages;
