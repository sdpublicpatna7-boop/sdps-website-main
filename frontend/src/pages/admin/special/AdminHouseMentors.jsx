import React, { useState, useEffect } from "react";
import SEO from "@/components/layout/SEO";
import api from "@/lib/api";
import { fullUrl } from "@/lib/admin";
import {
  Shield,
  Plus,
  Trash2,
  Edit2,
  Printer,
  RefreshCw,
  Crown,
  Users,
  Award,
  BookOpen,
  Phone,
  Sparkles,
  X,
  Upload,
  ChevronDown
} from "lucide-react";

const DEFAULT_HOUSES = [
  {
    id: "aryabhatta",
    name: "Aryabhatta House",
    army: "Red Army",
    color: "red",
    badgeBg: "bg-red-50",
    badgeBorder: "border-red-200",
    headerBg: "from-red-600 to-rose-700",
    accentColor: "text-red-600",
    motto: "Knowledge · Wisdom · Discovery",
    icon: "🔴",
    logoImg: "/images/houses/aryabhatta.jpg"
  },
  {
    id: "ashoka",
    name: "Ashoka House",
    army: "Yellow Army",
    color: "amber",
    badgeBg: "bg-amber-50",
    badgeBorder: "border-amber-200",
    headerBg: "from-amber-500 to-yellow-600",
    accentColor: "text-amber-600",
    motto: "Strength · Courage · Compassion",
    icon: "🟡",
    logoImg: "/images/houses/ashoka.jpg"
  },
  {
    id: "chanakya",
    name: "Chanakya House",
    army: "Blue Army",
    color: "blue",
    badgeBg: "bg-blue-50",
    badgeBorder: "border-blue-200",
    headerBg: "from-blue-600 to-indigo-700",
    accentColor: "text-blue-600",
    motto: "Wisdom · Strategy · Integrity",
    icon: "🔵",
    logoImg: "/images/houses/chanakya.jpg"
  },
  {
    id: "gautam",
    name: "Gautam House",
    army: "Green Army",
    color: "emerald",
    badgeBg: "bg-emerald-50",
    badgeBorder: "border-emerald-200",
    headerBg: "from-emerald-600 to-teal-700",
    accentColor: "text-emerald-600",
    motto: "Kindness · Mindfulness · Compassion",
    icon: "🟢",
    logoImg: "/images/houses/gautam.jpg"
  }
];

const MENTOR_ROLES = [
  "House Master",
  "Assistant House Master",
  "Senior House Mentor",
  "House Mentor",
  "House Advisor",
  "Sports Mentor"
];

export function AdminHouseMentors() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);

  const [form, setForm] = useState({
    name: "",
    house: "Aryabhatta House",
    designation: "House Mentor",
    subject: "",
    photo_url: "",
    contact_phone: "",
    is_house_master: false,
    order: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkHouse, setBulkHouse] = useState("Aryabhatta House");
  const [bulkNamesText, setBulkNamesText] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const handleBulkSave = async (e) => {
    e.preventDefault();
    const names = bulkNamesText
      .split("\n")
      .map(n => n.trim())
      .filter(n => n.length > 0);

    if (names.length === 0) {
      alert("Please enter at least one teacher name.");
      return;
    }

    setBulkSaving(true);
    try {
      for (let i = 0; i < names.length; i++) {
        const existingCount = mentors.filter(m => (m.house || "").includes(bulkHouse)).length;
        await api.post("/admin/house-mentors", {
          name: names[i],
          house: bulkHouse,
          designation: i === 0 && existingCount === 0 ? "House Master" : "House Mentor",
          is_house_master: i === 0 && existingCount === 0,
          subject: "",
          order: mentors.length + i + 1
        });
      }
      setBulkNamesText("");
      setBulkModalOpen(false);
      fetchMentors();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to bulk add teacher names.");
    } finally {
      setBulkSaving(false);
    }
  };

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/house-mentors");
      setMentors(res.data || []);
    } catch (err) {
      console.error("Failed to fetch house mentors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, []);

  const handleOpenAdd = (houseName = "Aryabhatta House") => {
    setEditingMentor(null);
    setForm({
      name: "",
      house: houseName,
      designation: "House Mentor",
      subject: "",
      photo_url: "",
      contact_phone: "",
      is_house_master: false,
      order: mentors.length + 1
    });
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (mentor) => {
    setEditingMentor(mentor);
    setForm({
      name: mentor.name || "",
      house: mentor.house || "Aryabhatta House",
      designation: mentor.designation || "House Mentor",
      subject: mentor.subject || "",
      photo_url: mentor.photo_url || "",
      contact_phone: mentor.contact_phone || "",
      is_house_master: Boolean(mentor.is_house_master),
      order: mentor.order || 0
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Teacher Name is required.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      if (editingMentor) {
        await api.put(`/admin/house-mentors/${editingMentor.id}`, form);
      } else {
        await api.post("/admin/house-mentors", form);
      }
      setModalOpen(false);
      fetchMentors();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save house mentor.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from House Mentors?`)) return;
    try {
      await api.delete(`/admin/house-mentors/${id}`);
      fetchMentors();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to delete mentor.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <SEO title="House Wise Mentors Roster | S.D. Public School Admin" />

      <div className="space-y-6 print:space-y-4">
        {/* ── 1. OFFICIAL SCHOOL HEADER (PRINTS BEAUTIFULLY) ── */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm print:shadow-none print:border-none print:p-0">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-6 print:pb-4">
            <div className="flex items-center gap-4 text-center md:text-left">
              <img
                src="/sdps_logo.png"
                alt="SDPS Crest Logo"
                className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-sm"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div>
                <h1 className="font-serif text-2xl md:text-3xl font-extrabold text-slate-900 tracking-wide uppercase">
                  S.D. PUBLIC SCHOOL
                </h1>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-0.5">
                  Maurya Colony, Biscoman Golambar, Patna — 800007 | Helpline: +91 9955190162, 9955190262
                </p>
                <p className="text-[11px] font-bold text-brand-orange italic tracking-wide mt-0.5">
                  (Empowering Generation Since 1994...)
                </p>
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-0.5 rounded-full bg-amber-100/80 text-amber-900 text-[11px] font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>HOUSE WISE MENTORS & TEACHERS ROSTER (2025–2026)</span>
                </div>
              </div>
            </div>

            {/* Print & Action Controls */}
            <div className="flex items-center gap-2.5 print:hidden">
              <button
                onClick={fetchMentors}
                disabled={loading}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setBulkModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-purple-600" />
                <span>Bulk Paste Names</span>
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print A4 Roster</span>
              </button>
              <button
                onClick={() => handleOpenAdd("Aryabhatta House")}
                className="px-4 py-2.5 rounded-xl bg-brand-navy hover:bg-brand-blue text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Teacher</span>
              </button>
            </div>
          </div>

          {/* Roster Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 print:hidden">
            {DEFAULT_HOUSES.map((h) => {
              const count = mentors.filter(m => (m.house || "").toLowerCase().includes(h.id) || (m.house || "").toLowerCase().includes(h.name.toLowerCase())).length;
              return (
                <div key={h.id} className={`p-3 rounded-2xl ${h.badgeBg} border ${h.badgeBorder} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{h.icon}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{h.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{h.motto}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-black bg-white ${h.accentColor} shadow-2xs border ${h.badgeBorder}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 2. HOUSE WISE COLUMNS TABLE LAYOUT ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-3">
          {DEFAULT_HOUSES.map((house) => {
            const houseMentors = mentors.filter(
              m => (m.house || "").toLowerCase().includes(house.id) ||
                   (m.house || "").toLowerCase().includes(house.name.toLowerCase())
            );

            // Separate House Master from other mentors
            const houseMaster = houseMentors.find(m => m.is_house_master || (m.designation || "").toLowerCase().includes("house master"));
            const otherMentors = houseMentors.filter(m => m !== houseMaster);

            return (
              <div
                key={house.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between print:rounded-xl print:shadow-none"
              >
                <div>
                  {/* House Column Header */}
                  <div className={`p-4 bg-gradient-to-r ${house.headerBg} text-white space-y-1 relative`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={house.logoImg}
                          alt={house.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-white/80 shadow-md shrink-0 bg-white"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div>
                          <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/80">
                            {house.army}
                          </div>
                          <h3 className="font-headline font-bold text-base tracking-wide uppercase drop-shadow-xs leading-tight">
                            {house.name}
                          </h3>
                          <span className="text-[10px] uppercase font-semibold text-white/90 tracking-wider block">
                            {house.motto}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold shrink-0">
                        {houseMentors.length} Mentors
                      </span>
                    </div>
                  </div>

                  {/* House Master Highlight Card */}
                  <div className="p-3.5 bg-slate-50 border-b border-slate-200">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-500" />
                      <span>House Master In-Charge</span>
                    </div>
                    {houseMaster ? (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {houseMaster.photo_url ? (
                            <img
                              src={fullUrl(houseMaster.photo_url)}
                              alt={houseMaster.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-full ${house.badgeBg} ${house.accentColor} font-bold text-xs flex items-center justify-center border ${house.badgeBorder} shrink-0`}>
                              {houseMaster.name.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 truncate">{houseMaster.name}</div>
                            <div className="text-[10px] text-slate-500 font-medium truncate">
                              {houseMaster.subject || houseMaster.designation}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 print:hidden">
                          <button
                            onClick={() => handleOpenEdit(houseMaster)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-brand-blue"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(houseMaster.id, houseMaster.name)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-rose-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic bg-white p-2.5 rounded-xl border border-dashed border-slate-200 text-center">
                        No House Master assigned
                      </div>
                    )}
                  </div>

                  {/* Mentors Table Column Header */}
                  <div className="px-4 py-2 bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 flex justify-between items-center border-b border-slate-200">
                    <span>Teacher Name</span>
                    <span>Role / Subject</span>
                  </div>

                  {/* List of Teachers in Column */}
                  <div className="divide-y divide-slate-100 min-h-[220px]">
                    {otherMentors.length > 0 ? (
                      otherMentors.map((mentor, index) => (
                        <div
                          key={mentor.id || index}
                          className="p-3 hover:bg-slate-50/80 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-2">
                            {mentor.photo_url ? (
                              <img
                                src={fullUrl(mentor.photo_url)}
                                alt={mentor.name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                                {mentor.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-900 truncate">
                                {mentor.name}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                                <span>{mentor.subject || "Teacher"}</span>
                                {mentor.designation && (
                                  <span className="text-[9px] bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-600">
                                    {mentor.designation}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 print:hidden">
                            <button
                              onClick={() => handleOpenEdit(mentor)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-brand-blue"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(mentor.id, mentor.name)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-rose-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        No additional mentors added
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Button per Column */}
                <div className="p-3 bg-slate-50 border-t border-slate-200 print:hidden">
                  <button
                    onClick={() => handleOpenAdd(house.name)}
                    className={`w-full py-2 px-3 rounded-xl border border-dashed ${house.badgeBorder} ${house.badgeBg} hover:brightness-95 ${house.accentColor} text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to {house.name}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. OFFICIAL PRINT SIGNATURE FOOTER ── */}
        <div className="hidden print:block pt-8 mt-6 border-t border-slate-300">
          <div className="flex justify-between items-end text-xs font-bold text-slate-800">
            <div>
              <p>House In-Charge Signature</p>
              <div className="h-10"></div>
              <p className="text-[10px] text-slate-500 font-normal">Date: ____/____/2026</p>
            </div>
            <div className="text-center">
              <p>School Seal</p>
              <div className="h-10"></div>
              <p className="text-[10px] text-slate-500 font-normal">S.D. Public School, Patna</p>
            </div>
            <div className="text-right">
              <p>Principal's Signature</p>
              <div className="h-10"></div>
              <p className="text-[10px] text-slate-500 font-normal">Approved & Authorized</p>
            </div>
          </div>
        </div>

        {/* ── 4. ADD / EDIT MENTOR MODAL ── */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-brand-navy/10 text-brand-navy">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-base text-slate-900">
                      {editingMentor ? "Edit House Mentor" : "Add Teacher to House"}
                    </h3>
                    <p className="text-xs text-slate-500">Assign teacher to house mentorship roster</p>
                  </div>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Teacher Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mrs. Sunita Sharma"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-navy"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                      Assigned House *
                    </label>
                    <select
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-navy"
                      value={form.house}
                      onChange={(e) => setForm({ ...form, house: e.target.value })}
                    >
                      {DEFAULT_HOUSES.map((h) => (
                        <option key={h.id} value={h.name}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                      Role / Designation
                    </label>
                    <select
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-navy"
                      value={form.designation}
                      onChange={(e) => {
                        const isMaster = e.target.value === "House Master";
                        setForm({
                          ...form,
                          designation: e.target.value,
                          is_house_master: isMaster
                        });
                      }}
                    >
                      {MENTOR_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                      Subject / Dept
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PGT Physics"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-navy"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                      Contact Phone (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 9876543210"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-navy"
                      value={form.contact_phone}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Photo URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="https://... (or leave blank for initial avatar)"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-brand-navy"
                    value={form.photo_url}
                    onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  />
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="text-xs font-bold text-amber-950">Is House Master In-Charge?</div>
                      <div className="text-[10px] text-amber-800">Highlights teacher at top of house column</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.is_house_master}
                    onChange={(e) => setForm({ ...form, is_house_master: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-brand-navy hover:bg-brand-blue text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {saving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingMentor ? "Update Mentor" : "Add to Roster"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── 5. BULK PASTE TEACHER NAMES MODAL ── */}
        {bulkModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-base text-slate-900">
                      Bulk Add Teacher Names
                    </h3>
                    <p className="text-xs text-slate-500">Paste multiple teacher names for a house (one per line)</p>
                  </div>
                </div>
                <button
                  onClick={() => setBulkModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBulkSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Select Target House *
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-600"
                    value={bulkHouse}
                    onChange={(e) => setBulkHouse(e.target.value)}
                  >
                    {DEFAULT_HOUSES.map((h) => (
                      <option key={h.id} value={h.name}>
                        {h.name} ({h.army})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Teacher Names (One per line) *
                  </label>
                  <textarea
                    rows={8}
                    required
                    placeholder={`e.g.\nMr. R. K. Singh\nMrs. Sunita Sharma\nMr. Anil Kumar\nMs. Priya Roy`}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-purple-600 leading-relaxed"
                    value={bulkNamesText}
                    onChange={(e) => setBulkNamesText(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    * The first name in an empty house will be set as House Master in-charge automatically.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBulkModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bulkSaving}
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {bulkSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Add All Names to {bulkHouse}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminHouseMentors;
