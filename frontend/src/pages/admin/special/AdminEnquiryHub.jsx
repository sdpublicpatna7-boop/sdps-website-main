import { useState, useEffect, useMemo } from "react";
import {
  Users, Phone, Mail, Sparkles, Send, QrCode,
  CheckCircle2, Clock, Calendar, Plus, Search, Download,
  Trash2, Edit3, Eye, Copy, RefreshCw, X, FileText,
  Megaphone, UserPlus, EyeOff, HelpCircle, MessageSquare, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { ImageOrUrlField } from "@/components/admin/SharedFields";

const STATUS_CONFIG = {
  new: { label: "New / Uncontacted", color: "bg-blue-50 text-blue-700 border-blue-200", icon: Sparkles },
  contacted: { label: "Contacted / In Discussion", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  campus_visit_scheduled: { label: "Campus Visit Scheduled", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Calendar },
  visited_campus: { label: "Visited Campus", color: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: Users },
  form_purchased: { label: "Form Purchased", color: "bg-teal-50 text-teal-700 border-teal-200", icon: FileText },
  admitted: { label: "Admitted / Enrolled", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  cold: { label: "Cold / Not Interested", color: "bg-slate-100 text-slate-600 border-slate-200", icon: EyeOff },
};

const CATEGORIES = [
  { id: "general", label: "General Admissions" },
  { id: "preschool", label: "Curious Minds Pre-School" },
  { id: "fee_structure", label: "Fee Structure & Scholarships" },
  { id: "activities", label: "School Activities & Sports" },
  { id: "infrastructure", label: "Campus & Labs Infrastructure" },
];

export function AdminEnquiryHub() {
  const [activeTab, setActiveTab] = useState("pipeline"); // "pipeline" | "campaigns" | "broadcast"
  const [enquiries, setEnquiries] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters for enquiries
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [campaignFilter, setCampaignFilter] = useState("all");

  // Modals & Drawers
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("new");
  const [statusNote, setStatusNote] = useState("");
  const [visitDate, setVisitDate] = useState("");

  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareEnquiry, setShareEnquiry] = useState(null);
  const [selectedShareCampaign, setSelectedShareCampaign] = useState(null);
  const [shareChannel, setShareChannel] = useState("whatsapp");
  const [customShareMessage, setCustomShareMessage] = useState("");

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCampaign, setQrCampaign] = useState(null);

  const [detailsEnquiry, setDetailsEnquiry] = useState(null);
  const [questionsMap, setQuestionsMap] = useState({});

  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInForm, setWalkInForm] = useState({
    parent_name: "",
    student_name: "",
    contact_phone: "",
    email: "",
    student_class: "Nursery",
    note: "Visited school campus directly.",
    campaign_slug: "session-2026-27-admissions",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [enqRes, campRes, statsRes, qRes] = await Promise.all([
        api.get("/admin/admission-enquiries"),
        api.get("/admin/admission-campaigns"),
        api.get("/admin/admission-enquiries/stats"),
        api.get("/admission/enquiry-questions").catch(() => ({ data: [] })),
      ]);
      setEnquiries(enqRes.data || []);
      setCampaigns(campRes.data || []);
      setStats(statsRes.data || null);
      const qMap = {};
      (qRes?.data || []).forEach((q) => {
        if (q.id && q.label) qMap[q.id] = q.label;
      });
      setQuestionsMap(qMap);
    } catch (err) {
      console.error("Failed to load enquiries or campaigns:", err);
      toast.error("Failed to load admission enquiries data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered enquiries
  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((e) => {
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        e.parent_name?.toLowerCase().includes(query) ||
        e.student_name?.toLowerCase().includes(query) ||
        e.contact_phone?.includes(query) ||
        e.email?.toLowerCase().includes(query) ||
        e.student_class?.toLowerCase().includes(query);

      const matchStatus = statusFilter === "all" || (e.status || "new") === statusFilter;
      const matchClass = classFilter === "all" || (e.student_class || "").toLowerCase() === classFilter.toLowerCase();
      const matchCampaign =
        campaignFilter === "all" ||
        (campaignFilter === "direct" && !e.campaign_slug) ||
        e.campaign_slug === campaignFilter;

      return matchQuery && matchStatus && matchClass && matchCampaign;
    });
  }, [enquiries, searchQuery, statusFilter, classFilter, campaignFilter]);

  // Unique classes for filter
  const availableClasses = useMemo(() => {
    const set = new Set();
    enquiries.forEach((e) => {
      if (e.student_class) set.add(e.student_class.trim());
    });
    return Array.from(set).sort();
  }, [enquiries]);

  // Handle status update
  const handleUpdateStatus = async () => {
    if (!selectedEnquiry) return;
    try {
      await api.put(`/admin/admission-enquiries/${selectedEnquiry.id}/status`, {
        status: newStatus,
        note: statusNote,
        visit_date: visitDate,
      });
      toast.success("Enquiry status updated!");
      setStatusModalOpen(false);
      setSelectedEnquiry(null);
      setStatusNote("");
      loadData();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Open Status modal
  const openStatusModal = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setNewStatus(enquiry.status || "new");
    setVisitDate(enquiry.visit_date || "");
    setStatusNote("");
    setStatusModalOpen(true);
  };

  // Open Share modal
  const openShareModal = (enquiry) => {
    setShareEnquiry(enquiry);
    const defCamp = campaigns.find((c) => c.slug === enquiry.campaign_slug) || campaigns[0] || null;
    setSelectedShareCampaign(defCamp);
    setCustomShareMessage("");
    setShareModalOpen(true);
  };

  // Trigger campaign send
  const handleSendCampaign = async () => {
    if (!shareEnquiry || !selectedShareCampaign) return;
    try {
      const res = await api.post(`/admin/admission-enquiries/${shareEnquiry.id}/send-campaign`, {
        campaign_slug: selectedShareCampaign.slug,
        channel: shareChannel,
        custom_message: customShareMessage || undefined,
      });

      if (shareChannel === "whatsapp") {
        // Open WhatsApp Web/App click-to-chat
        const cleanPhone = (shareEnquiry.contact_phone || "").replace(/[^0-9]/g, "");
        const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
        const msg = encodeURIComponent(res.data.message_preview || "");
        window.open(`https://wa.me/${formattedPhone}?text=${msg}`, "_blank");
        toast.success("WhatsApp opened! Note logged.");
      } else {
        toast.success(`Campaign sent via ${shareChannel.toUpperCase()}!`);
      }

      setShareModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to dispatch campaign");
    }
  };

  // Log Walk-in parent
  const handleSaveWalkIn = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/admission-enquiries/walk-in", walkInForm);
      toast.success("Walk-in enquiry recorded successfully!");
      setWalkInModalOpen(false);
      setWalkInForm({
        parent_name: "",
        student_name: "",
        contact_phone: "",
        email: "",
        student_class: "Nursery",
        note: "Visited school campus directly.",
        campaign_slug: "session-2026-27-admissions",
      });
      loadData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save walk-in enquiry");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!filteredEnquiries.length) {
      toast.error("No enquiries to export");
      return;
    }
    const headers = ["ID", "Parent Name", "Student Name", "Class", "Phone", "Email", "Status", "Enquiry Query", "Form Responses", "Campaign", "Visit Date", "Date"];
    const rows = filteredEnquiries.map((e) => {
      const qText = e.message || e.query || e.enquiry_details || e.note || e.answers?.message || e.answers?.query || "";
      const otherAnswers = Object.entries(e.answers || {})
        .filter(([k, v]) => k !== 'message' && k !== 'query' && v)
        .map(([k, v]) => `${questionsMap[k] || k}: ${v}`)
        .join("; ");

      return [
        e.id,
        `"${(e.parent_name || "").replace(/"/g, '""')}"`,
        `"${(e.student_name || "").replace(/"/g, '""')}"`,
        `"${e.student_class || ""}"`,
        `"${e.contact_phone || ""}"`,
        `"${e.email || ""}"`,
        `"${e.status || "new"}"`,
        `"${(qText || "").replace(/"/g, '""')}"`,
        `"${(otherAnswers || "").replace(/"/g, '""')}"`,
        `"${e.campaign_slug || "direct"}"`,
        `"${e.visit_date || ""}"`,
        `"${e.created_at?.slice(0, 10) || ""}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SDPS_Admission_Enquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully!");
  };

  // Delete Enquiry
  const handleDeleteEnquiry = async (id) => {
    if (!window.confirm("Are you sure you want to delete this enquiry?")) return;
    try {
      await api.delete(`/admin/admission-enquiries/${id}`);
      toast.success("Enquiry deleted");
      loadData();
    } catch (err) {
      toast.error("Failed to delete enquiry");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-brand-navy via-brand-blue to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-orange/20 border border-brand-orange/40 text-brand-orange-light text-xs font-black uppercase tracking-widest">
              <Megaphone className="w-3.5 h-3.5" /> Admission Enquiry & Parent Promotion Hub
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-headline tracking-tight">
              Admissions CRM & Promotion Engine
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Manage parent enquiries, log follow-ups, and share interactive promotional campaign packs showcasing school activities, class-wise fee structures, and campus highlights.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setWalkInModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange-light text-white text-xs font-black transition flex items-center gap-2 shadow-lg shadow-brand-orange/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> Log Walk-In Parent
            </button>
            <button
              onClick={() => {
                setEditingCampaign(null);
                setCampaignModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition flex items-center gap-2 border border-white/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Campaign Pack
            </button>
          </div>
        </div>

        {/* Live Metrics Strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Total Enquiries</div>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{stats.total}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-400/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-200">New / Pending</div>
              <div className="text-xl sm:text-2xl font-black text-blue-300 mt-0.5">{stats.new}</div>
            </div>
            <div className="bg-purple-500/10 border border-purple-400/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-purple-200">Campus Visits</div>
              <div className="text-xl sm:text-2xl font-black text-purple-300 mt-0.5">
                {(stats.campus_visit_scheduled || 0) + (stats.visited_campus || 0)}
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-400/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">Admitted</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-300 mt-0.5">{stats.admitted}</div>
            </div>
            <div className="bg-amber-500/10 border border-amber-400/20 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-200">Conversion Rate</div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{stats.conversion_rate}%</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Last 7 Days</div>
              <div className="text-xl sm:text-2xl font-black text-white mt-0.5">+{stats.recent_7d}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "pipeline"
              ? "border-brand-blue text-brand-blue bg-blue-50/50 rounded-t-2xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="w-4 h-4" /> Enquiries Pipeline ({enquiries.length})
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "campaigns"
              ? "border-brand-blue text-brand-blue bg-blue-50/50 rounded-t-2xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Megaphone className="w-4 h-4" /> Promotional Campaigns ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveTab("broadcast")}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "broadcast"
              ? "border-brand-blue text-brand-blue bg-blue-50/50 rounded-t-2xl"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Send className="w-4 h-4" /> Broadcast & Outreach Engine
        </button>
      </div>

      {/* ================= TAB 1: ENQUIRIES PIPELINE ================= */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col lg:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, phone, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-brand-blue outline-none"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Statuses ({enquiries.length})</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>

              {/* Class Filter */}
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Classes</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Campaign Filter */}
              <select
                value={campaignFilter}
                onChange={(e) => setCampaignFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none"
              >
                <option value="all">All Sources / Campaigns</option>
                <option value="direct">Direct Website Enquiries</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.slug}>
                    Campaign: {c.title?.slice(0, 24)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : ""}`} />
              </button>
            </div>
          </div>

          {/* Enquiries List */}
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading enquiries...</div>
          ) : filteredEnquiries.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">No Admission Enquiries Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No parent enquiries match your search filters or no enquiries have been submitted yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEnquiries.map((enq) => {
                const stConf = STATUS_CONFIG[enq.status] || STATUS_CONFIG.new;
                const StIcon = stConf.icon;
                const associatedCamp = campaigns.find((c) => c.slug === enq.campaign_slug);

                return (
                  <div
                    key={enq.id}
                    className="bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 p-4 sm:p-5 shadow-xs transition hover:shadow-md space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Parent & Student details */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm sm:text-base font-black text-slate-900">{enq.student_name}</h3>
                          <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[11px] font-black">
                            {enq.student_class}
                          </span>
                          <button
                            onClick={() => openStatusModal(enq)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${stConf.color}`}
                          >
                            <StIcon className="w-3 h-3" /> {stConf.label} ✏️
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>Parent: <strong className="text-slate-700 font-semibold">{enq.parent_name}</strong></span>
                          <span>•</span>
                          <a href={`tel:${enq.contact_phone}`} className="text-blue-600 font-semibold hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {enq.contact_phone}
                          </a>
                          <span>•</span>
                          <a href={`mailto:${enq.email}`} className="text-slate-600 hover:underline flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {enq.email}
                          </a>
                        </div>
                      </div>

                      {/* Right Quick Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* View Full Details Button */}
                        <button
                          onClick={() => setDetailsEnquiry(enq)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-blue-200"
                          title="View Complete Enquiry Details & Questions"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> View Details
                        </button>

                        {/* 1-Click WhatsApp Promotional Pack */}
                        <button
                          onClick={() => openShareModal(enq)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-emerald-200"
                          title="Send Promotional Campaign / Activities Pack via WhatsApp"
                        >
                          <Send className="w-3.5 h-3.5 text-emerald-600" /> Share Pack
                        </button>

                        <button
                          onClick={() => openStatusModal(enq)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Log Note
                        </button>

                        <button
                          onClick={() => handleDeleteEnquiry(enq.id)}
                          className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg transition cursor-pointer"
                          title="Delete Enquiry"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* What They Enquired For & Details */}
                    {(() => {
                      const queryText = enq.message || enq.query || enq.enquiry_details || enq.note || enq.answers?.message || enq.answers?.query || null;
                      const otherAnswers = Object.entries(enq.answers || {}).filter(([k, v]) => 
                        k !== 'message' && k !== 'query' && v !== null && v !== undefined && String(v).trim() !== ""
                      );

                      return (
                        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/80 space-y-2 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-slate-700">
                              <HelpCircle className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                              <span>Enquired For: <strong className="text-brand-blue font-extrabold bg-blue-100/70 text-blue-900 px-2 py-0.5 rounded-md">{enq.student_class || "General Admission"}</strong></span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDetailsEnquiry(enq)}
                              className="text-[11px] text-brand-blue hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <span>View full submission</span> →
                            </button>
                          </div>

                          {queryText ? (
                            <div className="bg-white rounded-lg p-2.5 border border-slate-200 text-slate-800 shadow-2xs">
                              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1 tracking-wider flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-slate-500" /> Parent's Query / Message:
                              </span>
                              <p className="font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">{queryText}</p>
                            </div>
                          ) : (
                            <div className="text-slate-500 text-[11px] bg-white/70 p-2.5 rounded-lg border border-slate-200/60 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                              <span>Admission enquiry lead for <strong>{enq.student_class}</strong>. (No custom query message written by parent).</span>
                            </div>
                          )}

                          {otherAnswers.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60">
                              <span className="font-bold text-slate-400 uppercase text-[10px] block mb-1.5 tracking-wider">
                                Form Responses:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {otherAnswers.map(([k, val]) => (
                                  <div key={k} className="bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                                    <span className="text-slate-500 font-medium block truncate">{questionsMap[k] || k}:</span>
                                    <span className="text-slate-900 font-bold">{String(val)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Metadata & Attribution Bar */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <div className="flex items-center gap-3">
                        <span>Submitted: {enq.created_at?.slice(0, 16).replace("T", " ")}</span>
                        {enq.source === "walk_in" ? (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold border border-amber-200">
                            🏢 Office Walk-In
                          </span>
                        ) : associatedCamp ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            📣 Campaign: {associatedCamp.title?.slice(0, 30)}...
                          </span>
                        ) : (
                          <span>Website Form</span>
                        )}
                        {enq.visit_date && (
                          <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            📅 Visit: {enq.visit_date}
                          </span>
                        )}
                      </div>

                      {/* Notes count badge */}
                      {enq.notes && enq.notes.length > 0 && (
                        <div className="text-slate-600 font-semibold flex items-center gap-1">
                          <span>{enq.notes.length} note(s) logged</span>
                        </div>
                      )}
                    </div>

                    {/* Latest Follow-Up Note Preview */}
                    {enq.notes && enq.notes.length > 0 && (
                      <div className="bg-slate-50 p-2.5 rounded-xl text-xs text-slate-600 border border-slate-150">
                        <span className="font-bold text-slate-800">Latest Note: </span>
                        {enq.notes[enq.notes.length - 1].text}
                        <span className="text-[10px] text-slate-400 ml-2">
                          — {enq.notes[enq.notes.length - 1].author}, {enq.notes[enq.notes.length - 1].timestamp?.slice(0, 10)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: PROMOTIONAL CAMPAIGNS ================= */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Promotional Campaigns & Activity Packs</h2>
              <p className="text-xs text-slate-500">
                Create customized shareable packs featuring School Activities, Fee Structures, STEM Labs, and Campus Tours for parents.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCampaign(null);
                setCampaignModalOpen(true);
              }}
              className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add New Campaign
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {campaigns.map((camp) => {
              const publicUrl = `https://www.sdpublic.org/explore/${camp.slug}`;

              return (
                <div
                  key={camp.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition flex flex-col justify-between"
                >
                  <div>
                    {/* Cover Image & Badge */}
                    <div className="h-44 bg-slate-100 relative overflow-hidden">
                      <img
                        src={camp.cover_image || "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80"}
                        alt={camp.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full bg-brand-orange text-white text-[10px] font-black tracking-wider uppercase shadow-md">
                          {camp.badge || "ADMISSIONS"}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <div className="text-[10px] uppercase font-bold text-slate-300">{camp.category}</div>
                        <h3 className="text-sm font-black line-clamp-1">{camp.title}</h3>
                      </div>
                    </div>

                    {/* Content preview */}
                    <div className="p-5 space-y-3">
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {camp.description || "Discover school activities, transparent fee structure, and world-class faculty at SDPS."}
                      </p>

                      {/* Quick highlights tag list */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(camp.highlights || []).slice(0, 3).map((h, i) => (
                          <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md truncate max-w-[200px]">
                            ✓ {h}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-blue-600" /> {camp.views_count || 0} views
                        </span>
                        <span className="flex items-center gap-1 text-emerald-700">
                          <Users className="w-3.5 h-3.5 text-emerald-600" /> {camp.enquiries_count || 0} leads generated
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={`/explore/${camp.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-2xs"
                    >
                      View Live ↗
                    </a>

                    <div className="flex items-center gap-1.5">
                      {/* QR Modal */}
                      <button
                        onClick={() => {
                          setQrCampaign(camp);
                          setQrModalOpen(true);
                        }}
                        className="p-1.5 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg transition"
                        title="Generate Printable QR Code"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>

                      {/* Copy Link */}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(publicUrl);
                          toast.success("Campaign link copied to clipboard!");
                        }}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg transition"
                        title="Copy Public Link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => {
                          setEditingCampaign(camp);
                          setCampaignModalOpen(true);
                        }}
                        className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition"
                        title="Edit Campaign"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Delete campaign "${camp.title}"?`)) return;
                          try {
                            await api.delete(`/admin/admission-campaigns/${camp.id}`);
                            toast.success("Campaign deleted");
                            loadData();
                          } catch (err) {
                            toast.error("Failed to delete campaign");
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 3: BROADCAST & OUTREACH ================= */}
      {activeTab === "broadcast" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-black text-slate-900">WhatsApp & Outreach Dispatch Center</h2>
              <p className="text-xs text-slate-500">
                Select a class segment and campaign package to send customized WhatsApp links directly to prospective parents.
              </p>
            </div>

            {/* Step 1: Select Segment */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Select Target Parent Segment:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => setStatusFilter("new")}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                    statusFilter === "new" ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div>Uncontacted Enquiries</div>
                  <div className="text-[10px] font-normal text-slate-400">{enquiries.filter((e) => e.status === "new").length} parents</div>
                </button>

                <button
                  onClick={() => setStatusFilter("all")}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                    statusFilter === "all" ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div>All Enquiries</div>
                  <div className="text-[10px] font-normal text-slate-400">{enquiries.length} total parents</div>
                </button>

                <button
                  onClick={() => setClassFilter("Nursery")}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition ${
                    classFilter === "Nursery" ? "bg-blue-50 border-blue-500 text-blue-700 shadow-xs" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div>Pre-School / Nursery</div>
                  <div className="text-[10px] font-normal text-slate-400">Target early learners</div>
                </button>
              </div>
            </div>

            {/* Step 2: Select Campaign */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Choose Promotional Campaign Pack to Share:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {campaigns.map((camp) => (
                  <button
                    key={camp.id}
                    onClick={() => setSelectedShareCampaign(camp)}
                    className={`p-3 rounded-2xl border text-left transition flex items-start gap-3 ${
                      selectedShareCampaign?.id === camp.id
                        ? "bg-blue-50/80 border-brand-blue ring-2 ring-brand-blue/20"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                      <img src={camp.cover_image || ""} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">{camp.title}</div>
                      <div className="text-[10px] text-slate-500">{camp.badge}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient Parent list for 1-click dispatch */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  3. Send to Parents ({filteredEnquiries.length} recipients):
                </label>
                <span className="text-[11px] text-slate-400">Click <strong>"Send WhatsApp"</strong> to open direct chat</span>
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {filteredEnquiries.map((enq) => {
                  const cleanPhone = (enq.contact_phone || "").replace(/[^0-9]/g, "");
                  const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                  const campSlug = selectedShareCampaign?.slug || "session-2026-27-admissions";
                  const campLink = `https://www.sdpublic.org/explore/${campSlug}`;

                  const template =
                    selectedShareCampaign?.whatsapp_template ||
                    `🙏 *Namaste ${enq.parent_name}!*\\n\\nThank you for considering *S.D. Public School, Patna* for *${enq.student_name}* (${enq.student_class}).\\n\\n🌟 *Explore our School Showcase, Activities & Fee Details:*\\n👉 ${campLink}\\n\\n📞 *Helpline:* +91 99551 90262`;

                  const readyMsg = encodeURIComponent(
                    template
                      .replace(/{parent_name}/g, enq.parent_name || "Parent")
                      .replace(/{student_name}/g, enq.student_name || "your child")
                      .replace(/{student_class}/g, enq.student_class || "")
                      .replace(/{campaign_link}/g, campLink)
                  );

                  return (
                    <div key={enq.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-bold text-slate-900">{enq.student_name} ({enq.student_class})</div>
                        <div className="text-[11px] text-slate-500">Parent: {enq.parent_name} • {enq.contact_phone}</div>
                      </div>

                      <a
                        href={`https://wa.me/${formattedPhone}?text=${readyMsg}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <Send className="w-3 h-3" /> Send WhatsApp
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Phone Mockup */}
          <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-6 text-white flex flex-col justify-between space-y-6 shadow-xl border border-slate-800">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-orange-light">Live WhatsApp Message Preview</div>
              <p className="text-xs text-slate-400">This is how your promotional message appears on the parent's phone.</p>
            </div>

            {/* Phone Screen Mockup */}
            <div className="bg-[#0b141a] rounded-2xl p-4 border border-slate-700 space-y-3 font-sans shadow-inner">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs text-slate-300 font-bold">
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white">SD</div>
                <span>S.D. Public School Patna</span>
              </div>

              <div className="bg-[#1f2c34] p-3 rounded-2xl text-xs text-slate-200 space-y-2 border border-slate-700/50 leading-relaxed">
                <div>🙏 <strong>Namaste Mr. Sharma!</strong></div>
                <div>
                  Thank you for considering <strong>S.D. Public School, Patna</strong> for <strong>Aarav</strong> (Class V).
                </div>
                <div className="p-2 bg-black/30 rounded-xl border border-white/5 space-y-1">
                  <div className="text-emerald-400 font-bold text-[11px]">
                    🌟 {selectedShareCampaign?.title || "Session 2026-27 Admissions Open"}
                  </div>
                  <div className="text-[10px] text-slate-300">
                    Explore our modern smart classes, STEM robotics lab, sports grounds, and transparent fee structure:
                  </div>
                  <div className="text-blue-400 underline font-mono text-[10px]">
                    https://www.sdpublic.org/explore/{selectedShareCampaign?.slug || "session-2026-27-admissions"}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 pt-1">
                  📞 Admission Helpline: +91 99551 90262
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-400 text-center">
              Parents who click the link land directly on your interactive school showcase page.
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: STATUS & FOLLOW-UP NOTES ================= */}
      {statusModalOpen && selectedEnquiry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Update Enquiry: {selectedEnquiry.student_name}
                </h3>
                <p className="text-xs text-slate-500">
                  Parent: {selectedEnquiry.parent_name} • {selectedEnquiry.student_class}
                </p>
              </div>
              <button onClick={() => setStatusModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Status Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Admission Pipeline Stage:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setNewStatus(k)}
                      className={`p-2 rounded-xl text-xs font-bold text-left border transition flex items-center gap-2 cursor-pointer ${
                        newStatus === k ? `${v.color} ring-2 ring-blue-400/30` : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <v.icon className="w-3.5 h-3.5" />
                      <span className="truncate">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visit Date */}
              {(newStatus === "campus_visit_scheduled" || newStatus === "visited_campus") && (
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Campus Visit Date:
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                  />
                </div>
              )}

              {/* Note input */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Log Counsellor Note / Follow-up Discussion:
                </label>
                <textarea
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g., Parent called back. Interested in transport from Kankarbagh. Scheduled campus tour on Saturday 11 AM."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-blue"
                />
              </div>

              {/* Note History */}
              {selectedEnquiry.notes && selectedEnquiry.notes.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Note History:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                    {selectedEnquiry.notes.map((n, i) => (
                      <div key={i} className="p-2 bg-slate-50 rounded-lg text-xs border border-slate-150">
                        <div className="text-slate-800">{n.text}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {n.author} • {n.timestamp?.slice(0, 16).replace("T", " ")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                className="px-5 py-2 bg-brand-blue hover:bg-brand-blue-dark text-white text-xs font-bold rounded-xl transition"
              >
                Save Updates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: FULL ENQUIRY DETAILS & QUESTIONNAIRE ================= */}
      {detailsEnquiry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-6 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200 mb-1.5">
                  <Sparkles className="w-3 h-3" /> Admission Enquiry Lead
                </div>
                <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                  {detailsEnquiry.student_name}
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-black">
                    {detailsEnquiry.student_class}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Parent: <strong className="text-slate-700">{detailsEnquiry.parent_name}</strong> • Submitted {detailsEnquiry.created_at?.slice(0, 16).replace("T", " ")}
                </p>
              </div>
              <button 
                onClick={() => setDetailsEnquiry(null)} 
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Contact Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <a
                href={`tel:${detailsEnquiry.contact_phone}`}
                className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-2xl border border-blue-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Phone className="w-4 h-4 text-blue-600" /> Call {detailsEnquiry.contact_phone}
              </a>
              <a
                href={`https://wa.me/${(detailsEnquiry.contact_phone || "").replace(/\D/g, "").length === 10 ? '91' + (detailsEnquiry.contact_phone || "").replace(/\D/g, "") : (detailsEnquiry.contact_phone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4 text-emerald-600" /> Open WhatsApp
              </a>
              <a
                href={`mailto:${detailsEnquiry.email}`}
                className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl border border-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition truncate"
              >
                <Mail className="w-4 h-4 text-slate-600" /> Send Email
              </a>
            </div>

            {/* What They Enquired For */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-brand-blue" /> What They Enquired For:
              </h4>

              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Class Seeking Admission:</span>
                  <span className="font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200 text-sm">
                    {detailsEnquiry.student_class}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 font-semibold text-xs block mb-1">Enquiry Query / Parent Message:</span>
                  {(() => {
                    const qText = detailsEnquiry.message || detailsEnquiry.query || detailsEnquiry.enquiry_details || detailsEnquiry.note || detailsEnquiry.answers?.message || detailsEnquiry.answers?.query || null;
                    return qText ? (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed">
                        {qText}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded-lg border border-slate-200/60">
                        General admission enquiry for {detailsEnquiry.student_class}. The parent did not type any extra notes in the web form.
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Dynamic / Custom Form Answers */}
              {(() => {
                const otherAnswers = Object.entries(detailsEnquiry.answers || {}).filter(([k, v]) => 
                  k !== 'message' && k !== 'query' && v !== null && v !== undefined && String(v).trim() !== ""
                );
                if (!otherAnswers.length) return null;

                return (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Submitted Form Responses & Questionnaire:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {otherAnswers.map(([k, v]) => (
                        <div key={k} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                          <span className="text-slate-500 font-medium block truncate text-[11px]">{questionsMap[k] || k}</span>
                          <span className="font-bold text-slate-900 mt-0.5 block">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Pipeline Status & Counsellor History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Follow-up Notes & Timeline ({detailsEnquiry.notes?.length || 0}):
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    openStatusModal(detailsEnquiry);
                    setDetailsEnquiry(null);
                  }}
                  className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Log Note / Change Status
                </button>
              </div>

              {detailsEnquiry.notes && detailsEnquiry.notes.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {detailsEnquiry.notes.map((n, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span className="font-bold text-slate-600">{n.author || "Admissions Counsellor"}</span>
                        <span>{n.timestamp ? new Date(n.timestamp).toLocaleString() : ""}</span>
                      </div>
                      <p className="text-slate-800 font-medium">{n.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  No counsellor notes logged yet.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  openShareModal(detailsEnquiry);
                  setDetailsEnquiry(null);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Share Promotional Pack
              </button>
              <button
                type="button"
                onClick={() => setDetailsEnquiry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: SHARE PROMOTIONAL CAMPAIGN PACK ================= */}
      {shareModalOpen && shareEnquiry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Share Promotional Pack</h3>
                <p className="text-xs text-slate-500">
                  Recipient: {shareEnquiry.parent_name} ({shareEnquiry.student_name} - {shareEnquiry.student_class})
                </p>
              </div>
              <button onClick={() => setShareModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Select Campaign */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Choose Showcase Pack:
                </label>
                <select
                  value={selectedShareCampaign?.id || ""}
                  onChange={(e) => setSelectedShareCampaign(campaigns.find((c) => c.id === e.target.value) || null)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none"
                >
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.badge})
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Channel */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Delivery Channel:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShareChannel("whatsapp")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      shareChannel === "whatsapp" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Send className="w-4 h-4 text-emerald-600" /> WhatsApp Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareChannel("email")}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition ${
                      shareChannel === "email" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Mail className="w-4 h-4 text-blue-600" /> Official Email
                  </button>
                </div>
              </div>

              {/* Message preview */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-xs">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preview Link:</div>
                <div className="text-blue-600 font-mono text-[11px] truncate">
                  https://www.sdpublic.org/explore/{selectedShareCampaign?.slug || "session-2026-27-admissions"}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendCampaign}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Dispatch to Parent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: LOG WALK-IN ENQUIRY ================= */}
      {walkInModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveWalkIn} className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Log Walk-In Parent Enquiry</h3>
                <p className="text-xs text-slate-500">Record parents visiting the school reception directly.</p>
              </div>
              <button type="button" onClick={() => setWalkInModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Parent Name *</label>
                <input
                  required
                  type="text"
                  value={walkInForm.parent_name}
                  onChange={(e) => setWalkInForm({ ...walkInForm, parent_name: e.target.value })}
                  placeholder="e.g. Mr. Rajesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Student Name *</label>
                <input
                  required
                  type="text"
                  value={walkInForm.student_name}
                  onChange={(e) => setWalkInForm({ ...walkInForm, student_name: e.target.value })}
                  placeholder="e.g. Aryan Kumar"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone *</label>
                <input
                  required
                  type="tel"
                  value={walkInForm.contact_phone}
                  onChange={(e) => setWalkInForm({ ...walkInForm, contact_phone: e.target.value })}
                  placeholder="e.g. 9955190262"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Class Seeking Admission *</label>
                <input
                  required
                  type="text"
                  value={walkInForm.student_class}
                  onChange={(e) => setWalkInForm({ ...walkInForm, student_class: e.target.value })}
                  placeholder="e.g. Class V, Nursery"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={walkInForm.email}
                  onChange={(e) => setWalkInForm({ ...walkInForm, email: e.target.value })}
                  placeholder="e.g. rajesh@gmail.com (optional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Initial Discussion Note:</label>
                <textarea
                  rows={2}
                  value={walkInForm.note}
                  onChange={(e) => setWalkInForm({ ...walkInForm, note: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWalkInModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-light text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Save Walk-In Parent
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: PRINTABLE QR CODE ================= */}
      {qrModalOpen && qrCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Printable Campaign QR</span>
              <button onClick={() => setQrModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 line-clamp-1">{qrCampaign.title}</h3>
              <p className="text-[11px] text-slate-500">Scan with any phone camera to open the showcase pack</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                  `https://www.sdpublic.org/explore/${qrCampaign.slug}`
                )}`}
                alt="QR Code"
                className="w-48 h-48 rounded-xl shadow-sm"
              />
            </div>

            <div className="text-[11px] font-mono text-slate-500 truncate">
              https://www.sdpublic.org/explore/{qrCampaign.slug}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(
                  `https://www.sdpublic.org/explore/${qrCampaign.slug}`
                )}`}
                download={`SDPS_QR_${qrCampaign.slug}.png`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-brand-blue text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" /> Download High-Res QR
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL / DRAWER: CREATE / EDIT CAMPAIGN ================= */}
      {campaignModalOpen && (
        <CampaignEditorModal
          campaign={editingCampaign}
          onClose={() => setCampaignModalOpen(false)}
          onSaved={() => {
            setCampaignModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Campaign Editor Sub-Component
function CampaignEditorModal({ campaign, onClose, onSaved }) {
  const isEdit = !!campaign;
  const [form, setForm] = useState(
    campaign || {
      title: "",
      slug: "",
      badge: "Admissions Open 2026-27",
      category: "general",
      description: "",
      cover_image: "",
      video_url: "",
      prospectus_url: "https://sdpublic.org/prospectus.pdf",
      fee_pdf_url: "/fee-structure",
      highlights: [
        "CBSE Pattern Experiential Learning",
        "Smart Interactive Digital Classrooms",
        "STEM, Robotics & Practical Science Labs",
        "Safe GPS-Tracked School Bus Fleet",
      ],
      activities: [
        {
          title: "STEM & Robotics Innovation",
          category: "Technology",
          description: "Hands-on robotics kits, science models, and coding projects.",
          image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80",
        },
        {
          title: "Sports Arena & Athletics",
          category: "Fitness",
          description: "Cricket, badminton, football, athletics, and martial arts coaching.",
          image: "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=800&q=80",
        },
      ],
      fee_structure_summary: [
        {
          class_range: "Playgroup - UKG",
          monthly_fee: "₹1,850 / month",
          admission_fee: "₹5,000 (One-Time)",
          details: "Includes student activity kit & smart class access.",
        },
        {
          class_range: "Class I - V",
          monthly_fee: "₹2,200 / month",
          admission_fee: "₹6,500 (One-Time)",
          details: "Includes computer lab, library & sports coaching.",
        },
      ],
      whatsapp_template: "",
      is_active: true,
    }
  );

  const [saving, setSaving] = useState(false);
  const [newHighlight, setNewHighlight] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Please enter a campaign title");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/admin/admission-campaigns/${campaign.id}`, form);
        toast.success("Campaign updated successfully!");
      } else {
        await api.post("/admin/admission-campaigns", form);
        toast.success("New campaign created successfully!");
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const addHighlight = () => {
    if (!newHighlight.trim()) return;
    setForm({ ...form, highlights: [...(form.highlights || []), newHighlight.trim()] });
    setNewHighlight("");
  };

  const removeHighlight = (idx) => {
    setForm({ ...form, highlights: form.highlights.filter((_, i) => i !== idx) });
  };

  const addActivityRow = () => {
    setForm({
      ...form,
      activities: [
        ...(form.activities || []),
        { title: "New Activity", category: "General", description: "Activity description...", image: "" },
      ],
    });
  };

  const removeActivityRow = (idx) => {
    setForm({ ...form, activities: form.activities.filter((_, i) => i !== idx) });
  };

  const addFeeRow = () => {
    setForm({
      ...form,
      fee_structure_summary: [
        ...(form.fee_structure_summary || []),
        { class_range: "Class VI - VIII", monthly_fee: "₹2,600 / mo", admission_fee: "₹7,500", details: "All facilities included." },
      ],
    });
  };

  const removeFeeRow = (idx) => {
    setForm({ ...form, fee_structure_summary: form.fee_structure_summary.filter((_, i) => i !== idx) });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-base">{isEdit ? "Edit Promotional Campaign Pack" : "Create Promotional Campaign Pack"}</h3>
            <p className="text-xs text-slate-400">Customise school activities showcase and fee structures for parents.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 text-slate-800 text-xs">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Campaign Title *</label>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Session 2026-27 Admissions Open: Quality Education & Holistic Growth"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">URL Slug (e.g. /explore/slug)</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="e.g. session-2026-27-admissions"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Badge / Overline</label>
              <input
                type="text"
                value={form.badge}
                onChange={(e) => setForm({ ...form, badge: e.target.value })}
                placeholder="e.g. SESSION 2026-27 ADMISSIONS"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Status</label>
              <select
                value={form.is_active ? "true" : "false"}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === "true" })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none"
              >
                <option value="true">Active & Visible to Public</option>
                <option value="false">Draft / Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Overview Description for Parents</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief introduction about our school, academic vision, and student development..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          {/* Cover Media */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 block">Cover Photo / Banner</label>
            <ImageOrUrlField
              value={form.cover_image}
              onChange={(v) => setForm({ ...form, cover_image: v })}
              subDir="admissions"
              isPublic={true}
            />
          </div>

          {/* Key Highlights */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="font-bold text-slate-700 block">Key Highlights (Why Choose SDPS):</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHighlight}
                onChange={(e) => setNewHighlight(e.target.value)}
                placeholder="e.g. 100% CCTV & GPS-Enabled Transport across Patna"
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              />
              <button
                type="button"
                onClick={addHighlight}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold cursor-pointer"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(form.highlights || []).map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-xl font-semibold">
                  ✓ {h}
                  <button type="button" onClick={() => removeHighlight(i)} className="text-red-500 hover:text-red-700 ml-1">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* School Activities Showcase Manager */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase tracking-wider block">
                School Activities & Infrastructure Showcase:
              </label>
              <button
                type="button"
                onClick={addActivityRow}
                className="px-3 py-1.5 bg-blue-50 text-brand-blue font-bold rounded-lg hover:bg-blue-100 cursor-pointer"
              >
                + Add Activity
              </button>
            </div>

            <div className="space-y-3">
              {(form.activities || []).map((act, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700">Activity #{idx + 1}</span>
                    <button type="button" onClick={() => removeActivityRow(idx)} className="text-red-500 hover:underline">
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Title (e.g. STEM Robotics Lab)"
                      value={act.title || ""}
                      onChange={(e) => {
                        const updated = [...form.activities];
                        updated[idx].title = e.target.value;
                        setForm({ ...form, activities: updated });
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Category (e.g. Technology / Sports)"
                      value={act.category || ""}
                      onChange={(e) => {
                        const updated = [...form.activities];
                        updated[idx].category = e.target.value;
                        setForm({ ...form, activities: updated });
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="url"
                      placeholder="Photo Image URL"
                      value={act.image || ""}
                      onChange={(e) => {
                        const updated = [...form.activities];
                        updated[idx].image = e.target.value;
                        setForm({ ...form, activities: updated });
                      }}
                      className="sm:col-span-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                    <textarea
                      rows={2}
                      placeholder="Description of the activity / facility..."
                      value={act.description || ""}
                      onChange={(e) => {
                        const updated = [...form.activities];
                        updated[idx].description = e.target.value;
                        setForm({ ...form, activities: updated });
                      }}
                      className="sm:col-span-2 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Structure Summary Table Manager */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 uppercase tracking-wider block">
                Class-Wise Transparent Fee Structure Breakdown:
              </label>
              <button
                type="button"
                onClick={addFeeRow}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold rounded-lg hover:bg-emerald-100 cursor-pointer"
              >
                + Add Fee Row
              </button>
            </div>

            <div className="space-y-2.5">
              {(form.fee_structure_summary || []).map((fee, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Class Range (e.g. Class I - V)"
                    value={fee.class_range || ""}
                    onChange={(e) => {
                      const updated = [...form.fee_structure_summary];
                      updated[idx].class_range = e.target.value;
                      setForm({ ...form, fee_structure_summary: updated });
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                  <input
                    type="text"
                    placeholder="Monthly Fee (e.g. ₹2,200 / mo)"
                    value={fee.monthly_fee || ""}
                    onChange={(e) => {
                      const updated = [...form.fee_structure_summary];
                      updated[idx].monthly_fee = e.target.value;
                      setForm({ ...form, fee_structure_summary: updated });
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Admission Fee (e.g. ₹6,500)"
                    value={fee.admission_fee || ""}
                    onChange={(e) => {
                      const updated = [...form.fee_structure_summary];
                      updated[idx].admission_fee = e.target.value;
                      setForm({ ...form, fee_structure_summary: updated });
                    }}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Notes / Inclusions"
                      value={fee.details || ""}
                      onChange={(e) => {
                        const updated = [...form.fee_structure_summary];
                        updated[idx].details = e.target.value;
                        setForm({ ...form, fee_structure_summary: updated });
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <button type="button" onClick={() => removeFeeRow(idx)} className="text-red-500 hover:text-red-700 p-1">
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Prospectus / Brochure PDF Link</label>
              <input
                type="text"
                value={form.prospectus_url || ""}
                onChange={(e) => setForm({ ...form, prospectus_url: e.target.value })}
                placeholder="https://sdpublic.org/prospectus.pdf"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Detailed Fee Structure Link</label>
              <input
                type="text"
                value={form.fee_pdf_url || ""}
                onChange={(e) => setForm({ ...form, fee_pdf_url: e.target.value })}
                placeholder="/fee-structure"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
            >
              {saving ? "Saving..." : isEdit ? "Save Campaign Changes" : "Publish Campaign Pack"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminEnquiryHub;
