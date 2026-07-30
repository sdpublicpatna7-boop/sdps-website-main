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

  const [signatureData, setSignatureData] = useState({
    inchargeSig: "",
    sealImg: "",
    principalSig: ""
  });
  const [sigModalOpen, setSigModalOpen] = useState(false);

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

      {/* ── STRICT PRINT ISOLATION STYLES ── */}
      <style>{`
        @media print {
          /* Hide all page chrome, sidebars, headers, and backgrounds */
          body * {
            visibility: hidden !important;
          }
          aside, nav, header, [class*="AdminLayout"], .print\\:hidden, #admin-sidebar {
            display: none !important;
          }
          
          /* Isolate ONLY the A4 Printable Sheet */
          #a4-printable-roster, #a4-printable-roster * {
            visibility: visible !important;
          }
          
          #a4-printable-roster {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15mm 10mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            border-radius: 0 !important;
          }

          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>

      <div className="space-y-6 print:space-y-0">
        {/* ── 1. ACTION & CONTROL BAR ── */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <img
              src="/sdps_logo.png"
              alt="SDPS Crest Logo"
              className="w-12 h-12 object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <h1 className="font-headline text-lg font-bold text-slate-900 tracking-wide uppercase">
                House Wise Mentors Roster (2025–2026)
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Official S.D. Public School A4 Printable Sheet Generator
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchMentors}
              disabled={loading}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setSigModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Signatures & Seal PNG</span>
            </button>
            <button
              onClick={() => setBulkModalOpen(true)}
              className="px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-purple-600" />
              <span>Bulk Paste Names</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Print A4 Sheet</span>
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

        {/* ── 2. A4 PRINTABLE DOCUMENT CONTAINER SHEET ── */}
        <div id="a4-printable-roster" className="max-w-[1040px] mx-auto bg-white border border-slate-300/90 shadow-2xl rounded-3xl p-6 md:p-9 space-y-6 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none">
          {/* Official SDPS Premium Letterhead Header for Print/A4 */}
          <div className="border-b-2 border-amber-500/80 pb-5 text-center relative space-y-2">
            <div className="flex items-center justify-between gap-4">
              {/* Left School Crest Logo */}
              <img
                src="/logo-real-original.png"
                alt="SDPS Official Crest Logo"
                className="w-18 h-18 md:w-22 md:h-22 object-contain drop-shadow-md shrink-0"
                onError={(e) => { e.target.src = '/logo-original.png'; }}
              />

              {/* Center Letterhead Text */}
              <div className="flex-1 text-center space-y-1">
                <h1 className="font-serif text-3xl md:text-4xl font-black text-slate-900 tracking-wider uppercase drop-shadow-2xs">
                  S.D. PUBLIC SCHOOL
                </h1>
                <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-widest">
                  Maurya Colony, Biscoman Golambar, Patna — 800007 | Helpline: +91 9955190162, 9955190262
                </p>
                <p className="text-[11px] font-bold text-amber-700 italic tracking-wider">
                  (Empowering Generation Since 1994...)
                </p>
              </div>

              {/* Right School Crest Logo for Symmetric Official Letterhead */}
              <img
                src="/logo-real-original.png"
                alt="SDPS Official Crest Logo"
                className="w-18 h-18 md:w-22 md:h-22 object-contain drop-shadow-md shrink-0 hidden md:block print:block"
                onError={(e) => { e.target.src = '/logo-original.png'; }}
              />
            </div>

            {/* Central Official Title Badge */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white text-xs font-black shadow-sm uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>HOUSE WISE MENTORS ROSTER — ACADEMIC YEAR 2025–2026</span>
              </div>
            </div>
          </div>

          {/* ── HOUSE WISE ALPHABETICAL COLUMNS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 print:grid-cols-4 print:gap-2">
            {DEFAULT_HOUSES.map((house) => {
              const houseMentors = mentors.filter(
                m => (m.house || "").toLowerCase().includes(house.id) ||
                     (m.house || "").toLowerCase().includes(house.name.toLowerCase())
              );

              // Sort all teachers strictly alphabetically (A to Z)
              const sortedMentors = [...houseMentors].sort((a, b) =>
                (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
              );

              return (
                <div
                  key={house.id}
                  className={`bg-white rounded-2xl border ${house.badgeBorder} shadow-2xs overflow-hidden flex flex-col justify-between print:rounded-lg print:border-slate-300`}
                >
                  <div>
                    {/* House Column Header */}
                    <div className={`p-3 bg-gradient-to-r ${house.headerBg} text-white space-y-0.5 relative`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={house.logoImg}
                            alt={house.name}
                            className="w-8 h-8 rounded-full object-cover border-2 border-white/90 shadow-md shrink-0 bg-white"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div>
                            <div className="text-[8.5px] font-black uppercase tracking-widest text-white/80">
                              {house.army}
                            </div>
                            <h3 className="font-headline font-bold text-xs tracking-wide uppercase leading-tight">
                              {house.name}
                            </h3>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[9.5px] font-black shrink-0">
                          {sortedMentors.length}
                        </span>
                      </div>
                    </div>

                    {/* Table Heading */}
                    <div className="px-3 py-1.5 bg-slate-100 text-[9.5px] font-black uppercase tracking-wider text-slate-700 flex justify-between items-center border-b border-slate-200">
                      <span># Teacher Name</span>
                      <span>Role</span>
                    </div>

                    {/* List of Teachers (Alphabetical A to Z with Zebra Striping) */}
                    <div className="divide-y divide-slate-100 min-h-[270px]">
                      {sortedMentors.length > 0 ? (
                        sortedMentors.map((mentor, index) => (
                          <div
                            key={mentor.id || index}
                            className="px-2.5 py-1.5 even:bg-slate-50/70 hover:bg-slate-100/80 transition-colors flex items-center justify-between group text-xs"
                          >
                            <div className="flex items-center gap-1.5 min-w-0 pr-1">
                              <span className="text-[10px] font-mono font-black text-slate-400 w-4 shrink-0 text-right">
                                {index + 1}.
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate text-[11px] tracking-tight">
                                  {mentor.name}
                                </div>
                                {mentor.subject && (
                                  <div className="text-[9px] text-slate-400 truncate">
                                    {mentor.subject}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[8.5px] bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-600 border border-slate-200/80">
                                Mentor
                              </span>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                <button
                                  onClick={() => handleOpenEdit(mentor)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-brand-blue"
                                  title="Edit"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(mentor.id, mentor.name)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-600 hover:text-rose-600"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-400 italic">
                          No mentors added yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add Button per Column */}
                  <div className="p-2 bg-slate-50 border-t border-slate-200 print:hidden">
                    <button
                      onClick={() => handleOpenAdd(house.name)}
                      className={`w-full py-1.5 px-2 rounded-xl border border-dashed ${house.badgeBorder} ${house.badgeBg} hover:brightness-95 ${house.accentColor} text-[10.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Teacher</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── OFFICIAL PRINT SIGNATURE FOOTER WITH OFFICIAL REAL SEAL ── */}
          <div className="pt-5 mt-5 border-t border-slate-300">
            <div className="grid grid-cols-3 gap-4 items-end text-center text-xs font-bold text-slate-800">
              <div className="space-y-1">
                <div className="h-16 flex items-center justify-center">
                  {signatureData.inchargeSig ? (
                    <img src={signatureData.inchargeSig} alt="Incharge Signature" className="max-h-14 max-w-full object-contain" />
                  ) : (
                    <div className="h-10 border-b border-dashed border-slate-300 w-36 mx-auto"></div>
                  )}
                </div>
                <p className="text-slate-900 font-extrabold">House In-Charge Signature</p>
                <p className="text-[10px] text-slate-500 font-normal">Date: {new Date().toLocaleDateString('en-IN')}</p>
              </div>

              <div className="space-y-1">
                <div className="h-16 flex items-center justify-center">
                  {signatureData.sealImg ? (
                    <img src={signatureData.sealImg} alt="School Seal" className="max-h-16 max-w-full object-contain mx-auto" />
                  ) : (
                    <img
                      src="/logo-real-original.png"
                      alt="SDPS Official Seal"
                      className="max-h-14 object-contain mx-auto drop-shadow-xs"
                      onError={(e) => { e.target.src = '/logo-original.png'; }}
                    />
                  )}
                </div>
                <p className="text-slate-900 font-extrabold">School Seal</p>
                <p className="text-[10px] text-slate-500 font-normal">S.D. Public School, Patna</p>
              </div>

              <div className="space-y-1">
                <div className="h-16 flex items-center justify-center">
                  {signatureData.principalSig ? (
                    <img src={signatureData.principalSig} alt="Principal Signature" className="max-h-14 max-w-full object-contain" />
                  ) : (
                    <div className="h-10 border-b border-dashed border-slate-300 w-36 mx-auto"></div>
                  )}
                </div>
                <p className="text-slate-900 font-extrabold">Principal's Signature</p>
                <p className="text-[10px] text-slate-500 font-normal">Approved & Authorized</p>
              </div>
            </div>

            <div className="text-center mt-4 print:hidden">
              <button
                onClick={() => setSigModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-brand-navy" />
                <span>Upload / Set Signatures & Seal PNG</span>
              </button>
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

        {/* ── 6. UPLOAD / EDIT SIGNATURES & SEAL MODAL ── */}
        {sigModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-base text-slate-900">
                      Signatures & School Seal (PNG)
                    </h3>
                    <p className="text-xs text-slate-500">Upload signature images or paste PNG image URLs</p>
                  </div>
                </div>
                <button
                  onClick={() => setSigModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    House In-Charge Signature PNG URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://... (or leave blank for dotted line)"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                    value={signatureData.inchargeSig}
                    onChange={(e) => setSignatureData({ ...signatureData, inchargeSig: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    School Seal PNG / Crest Logo URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://... (or leave blank for default SDPS logo)"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                    value={signatureData.sealImg}
                    onChange={(e) => setSignatureData({ ...signatureData, sealImg: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase block mb-1">
                    Principal's Signature PNG URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://... (or leave blank for dotted line)"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-600"
                    value={signatureData.principalSig}
                    onChange={(e) => setSignatureData({ ...signatureData, principalSig: e.target.value })}
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                  💡 <strong>Tip:</strong> Transparent PNG images work best for authentic signatures on white A4 notice board sheets!
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSigModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
                  >
                    Save & Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminHouseMentors;
