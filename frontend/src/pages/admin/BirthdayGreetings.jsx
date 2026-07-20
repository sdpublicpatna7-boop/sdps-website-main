import { useEffect, useRef, useState, useCallback } from "react";
import api from "../../lib/api";
import { Toaster, toast } from "sonner";
import {
  Cake, Smartphone, RefreshCw, FileSpreadsheet, Send,
  Eye, Megaphone, Loader2, CheckCircle2, AlertTriangle, StopCircle, Calendar,
  Upload, Database, AlertCircle, Sparkles
} from "lucide-react";

const DEFAULT_TEMPLATE =
  "Dear {name},\n\n" +
  "S.D. Public School, Patna wishes you a very Happy Birthday! 🎂🎉\n\n" +
  "May your year ahead be filled with joy, academic success, and endless learning. We are proud to have you as part of our school family!\n\n" +
  "Regards,\nS.D. Public School";

export default function BirthdayGreetings() {
  const [status, setStatus] = useState({ connected: false, qr: null, user: null });
  const [statusLoading, setStatusLoading] = useState(true);

  // DB stats
  const [dbInfo, setDbInfo] = useState({
    total_students: 0,
    latest_admission_no: "None",
    birthdays_today: [],
    last_scheduler_run: "Never",
    target_date: ""
  });
  const [infoLoading, setInfoLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [importMode, setImportMode] = useState("overwrite"); // "overwrite" or "append"
  const [importing, setImporting] = useState(false);

  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showTemplate, setShowTemplate] = useState(false);

  // File preview
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const [sendingSaved, setSendingSaved] = useState(false);
  const [progress, setProgress] = useState(null);

  const pollRef = useRef(null);

  // Student DB state hooks
  const [activeTab, setActiveTab] = useState("campaign"); // "campaign" or "database"
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // Edit / Add modal state hooks
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add"); // "add" or "edit"
  const [currentStudent, setCurrentStudent] = useState({
    id: "",
    name: "",
    father_name: "",
    mother_name: "",
    phone: "",
    admission_no: "",
    roll_no: "",
    class_name: "",
    section: "",
    dob: "",
    permanent_address: "",
    current_address: "",
    biometric: ""
  });
  const [savingStudent, setSavingStudent] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await api.get("/whatsapp/status");
      setStatus(r.data);
    } catch {
      setStatus({ connected: false, qr: null, user: null });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const fetchDbInfo = useCallback(async () => {
    setInfoLoading(true);
    try {
      const r = await api.get("/whatsapp/birthday-campaign/info");
      setDbInfo(r.data);
    } catch {
      toast.error("Failed to load student statistics from database");
    } finally {
      setInfoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchDbInfo();
    const id = setInterval(fetchStatus, status.connected ? 15000 : 5000);
    return () => clearInterval(id);
  }, [fetchStatus, fetchDbInfo, status.connected]);

  useEffect(() => {
    if (progress?.running) {
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.get("/whatsapp/bulk-progress");
          setProgress(r.data);
          if (!r.data.running) {
            clearInterval(pollRef.current);
            fetchDbInfo(); // Refresh stats on completion
          }
        } catch { /* ignore */ }
      }, 2000);
      return () => clearInterval(pollRef.current);
    }
  }, [progress?.running, fetchDbInfo]);

  const fetchStudents = useCallback(async (page = 1, query = "", cName = "", sec = "") => {
    setStudentsLoading(true);
    try {
      const params = { search: query, page, limit: 15 };
      if (cName) params.class_name = cName;
      if (sec) params.section = sec;
      const r = await api.get("/whatsapp/birthday-campaign/students", { params });
      setStudents(r.data.students);
      setTotalPages(r.data.pages);
      setCurrentPage(r.data.page);
      setTotalStudentsCount(r.data.total);
    } catch {
      toast.error("Failed to load students list");
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "database") {
      fetchStudents(currentPage, searchQuery, selectedClass, selectedSection);
    }
  }, [activeTab, currentPage, selectedClass, selectedSection, fetchStudents]);

  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setCurrentPage(1);
    fetchStudents(1, q, selectedClass, selectedSection);
  };

  const handleOpenAddModal = () => {
    setModalType("add");
    setCurrentStudent({
      id: "",
      name: "",
      father_name: "",
      mother_name: "",
      phone: "",
      admission_no: "",
      roll_no: "",
      class_name: "",
      section: "",
      dob: "",
      permanent_address: "",
      current_address: "",
      biometric: ""
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (student) => {
    setModalType("edit");
    setCurrentStudent({
      id: student.id,
      name: student.name || "",
      father_name: student.father_name || "",
      mother_name: student.mother_name || "",
      phone: student.phone || student.contact_no || "",
      admission_no: student.admission_no || student.admn_no || "",
      roll_no: student.roll_no || student.roll || "",
      class_name: student.class_name || student.class || "",
      section: student.section || student.sec || "",
      dob: student.dob || student.date_of_birth || "",
      permanent_address: student.permanent_address || "",
      current_address: student.current_address || "",
      biometric: student.biometric || ""
    });
    setShowModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!currentStudent.name || !currentStudent.phone || !currentStudent.dob) {
      toast.error("Name, Phone, and DOB are required fields.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(currentStudent.dob)) {
      toast.error("DOB must be in YYYY-MM-DD format (e.g. 2015-06-25)");
      return;
    }

    setSavingStudent(true);
    try {
      if (modalType === "add") {
        await api.post("/whatsapp/birthday-campaign/students", currentStudent);
        toast.success("Student added successfully!");
      } else {
        await api.put(`/whatsapp/birthday-campaign/students/${currentStudent.id}`, currentStudent);
        toast.success("Student updated successfully!");
      }
      setShowModal(false);
      fetchStudents(currentPage, searchQuery);
      fetchDbInfo();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save student details");
    } finally {
      setSavingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId, studentName) => {
    const ok = window.confirm(`Are you sure you want to delete ${studentName} from the database?`);
    if (!ok) return;

    try {
      await api.delete(`/whatsapp/birthday-campaign/students/${studentId}`);
      toast.success("Student deleted successfully!");
      const nextTotal = totalStudentsCount - 1;
      const nextPages = Math.ceil(nextTotal / 15) || 1;
      const targetPage = currentPage > nextPages ? nextPages : currentPage;
      fetchStudents(targetPage, searchQuery);
      fetchDbInfo();
    } catch {
      toast.error("Failed to delete student");
    }
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ok = /\.(csv|xlsx|xls)$/i.test(f.name);
    if (!ok) { toast.error("Please upload a CSV or Excel file (.csv, .xlsx, .xls)"); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("File must be ≤ 5MB"); return; }
    setFile(f);
    setPreview(null);
  };

  const doFilePreview = async () => {
    if (!file) { toast.error("Select a CSV or Excel file first"); return; }
    setPreviewing(true);
    setPreview(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await api.post("/whatsapp/birthday-campaign/preview", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(r.data);
      toast.success(`Roster matches: ${r.data.recipients_count} today (${r.data.skipped_count} rows skipped)`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not preview sheet layout");
    } finally {
      setPreviewing(false);
    }
  };

  const doImport = async () => {
    if (!file) { toast.error("Please select an Excel file to import"); return; }
    const confirmImport = window.confirm(
      importMode === "overwrite"
        ? "Warning: Overwriting will delete ALL currently stored students in the database and replace them with this list. Proceed?"
        : "This will add new students from the Excel file and merge them with your current list. Proceed?"
    );
    if (!confirmImport) return;

    setImporting(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mode", importMode);
    try {
      const r = await api.post("/whatsapp/birthday-campaign/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(
        importMode === "overwrite"
          ? `Successfully reset database with ${r.data.imported_count} students!`
          : `Successfully appended ${r.data.imported_count} new admissions!`
      );
      setFile(null);
      setPreview(null);
      fetchDbInfo();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const launchSavedCampaign = async () => {
    if (dbInfo.birthdays_today.length === 0) {
      toast.error("No students have birthdays today according to the database.");
      return;
    }
    const confirmSend = window.confirm(
      `Send birthday wishes (dynamic card + message) to ${dbInfo.birthdays_today.length} student(s) matching today's date?`
    );
    if (!confirmSend) return;

    setSendingSaved(true);
    const fd = new FormData();
    fd.append("message_template", template);
    try {
      const r = await api.post("/whatsapp/birthday-campaign/send-saved", fd);
      toast.success("Birthday greeting campaign launched successfully!");
      setProgress({
        total: dbInfo.birthdays_today.length,
        sent: 0,
        failed: 0,
        running: true,
        errors: [],
      });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not launch campaign");
    } finally {
      setSendingSaved(false);
    }
  };

  const stopCampaign = async () => {
    try {
      await api.post("/whatsapp/stop-bulk");
      toast.info("Stopping campaign...");
    } catch {
      toast.error("Could not stop campaign");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange shadow-sm">
            <Cake className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <h1 className="font-headline text-2xl font-bold text-slate-800">Birthday Greetings</h1>
            <p className="text-sm text-slate-500">Database-driven greetings. Auto-delivers at 6:00 AM daily.</p>
          </div>
        </div>
        <button
          onClick={fetchDbInfo}
          disabled={infoLoading}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-black/5 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${infoLoading ? "animate-spin" : ""}`} /> Refresh Stats
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Roster */}
        <div className="bg-white p-5 border border-black/5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-blue/5 rounded-full blur-xl" />
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Roster</div>
          <div className="text-2xl font-extrabold text-brand-blue mt-1.5">{dbInfo.total_students}</div>
          <div className="text-[10px] text-slate-400 mt-1">Total active students</div>
        </div>

        {/* Latest Admission No */}
        <div className="bg-white p-5 border border-black/5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-brand-orange/5 rounded-full blur-xl" />
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Latest Adm No</div>
          <div className="text-lg font-extrabold text-brand-orange mt-2.5 truncate" title={dbInfo.latest_admission_no}>
            {dbInfo.latest_admission_no}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Next uploads follow this</div>
        </div>

        {/* Today's Birthday Count */}
        <div className="bg-white p-5 border border-black/5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl" />
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Today's Birthdays</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1.5">{dbInfo.birthdays_today.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Birthdays on {dbInfo.target_date || "today"}</div>
        </div>

        {/* Scheduler Last Run */}
        <div className="bg-white p-5 border border-black/5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl" />
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Auto 6:00 AM Job</div>
          <div className="text-sm font-extrabold text-purple-700 mt-3.5">
            {dbInfo.last_scheduler_run === "Never" ? "Pending" : `Ran: ${dbInfo.last_scheduler_run}`}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Active daily at 6 AM IST</div>
        </div>
      </div>

      {/* WhatsApp Connection */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.connected ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">WhatsApp Service Status</div>
              <div className="text-xs text-slate-400">
                {statusLoading ? "Checking..." : status.connected ? `Connected (${status.user?.name || "Ready"})` : "Disconnected"}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setStatusLoading(true); fetchStatus(); }}
            disabled={statusLoading}
            className="p-2 text-slate-500 hover:text-brand-blue rounded-lg border border-black/5 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${statusLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {!status.connected && !statusLoading && status.qr && (
          <div className="mt-5 border-t border-black/5 pt-5 text-center flex flex-col items-center">
            <p className="text-xs text-slate-500 mb-3 max-w-sm">
              Scan this QR code from your school's WhatsApp account (Settings &gt; Linked Devices) to connect.
            </p>
            <div className="bg-white p-3 border border-black/5 rounded-xl shadow-inner">
              <img src={status.qr} alt="WhatsApp QR Code" className="w-48 h-48 block" />
            </div>
          </div>
        )}
      </div>

      {/* Tabs Sub-Navigation */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab("campaign")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "campaign"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Cake className="w-4 h-4" /> Send Campaign
        </button>
        <button
          onClick={() => setActiveTab("database")}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition ${
            activeTab === "database"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Database className="w-4 h-4" /> Student Database
        </button>
      </div>

      {activeTab === "campaign" && (
        <>
          {/* Step 1: Upload CSV/Excel & Save/Import */}
          <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/5 pb-3 mb-4">
              <div className="text-sm font-semibold text-slate-700">1. Roster Management (CSV/Excel Import)</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setImportMode("overwrite")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${importMode === "overwrite" ? "bg-slate-100 text-slate-800 border-black/10 shadow-inner" : "bg-white text-slate-400 border-transparent hover:text-slate-600"}`}
                >
                  Reset & Overwrite
                </button>
                <button
                  onClick={() => setImportMode("append")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${importMode === "append" ? "bg-slate-100 text-slate-800 border-black/10 shadow-inner" : "bg-white text-slate-400 border-transparent hover:text-slate-600"}`}
                >
                  Append New Admissions
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-12 gap-6">
              <div className="md:col-span-8">
                <div className="border border-dashed border-slate-200 hover:border-brand-blue/40 rounded-xl p-6 text-center cursor-pointer transition relative group bg-slate-50/50">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={onPickFile}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-brand-blue/70 transition mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-600 group-hover:text-brand-blue transition">
                    {file ? file.name : "Select student CSV or Excel file to upload (.csv, .xlsx, .xls)"}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Must contain 'Name', 'Contact_No' (Phone), and 'Date_of_Birth' columns. Other columns will be collected.</div>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col justify-center gap-2">
                <button
                  onClick={doFilePreview}
                  disabled={previewing || !file}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-3 rounded-xl border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
                >
                  {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  Preview Layout
                </button>
                
                <button
                  onClick={doImport}
                  disabled={importing || !file}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-3 rounded-xl bg-brand-blue text-white hover:opacity-95 disabled:opacity-50"
                >
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {importMode === "overwrite" ? "Overwrite Database" : "Append Admissions"}
                </button>
              </div>
            </div>

            {/* CSV layout preview details if fetched */}
            {preview && (
              <div className="mt-4 bg-slate-50/50 border border-black/5 p-4 rounded-xl">
                <div className="text-xs font-bold text-slate-600 mb-2"> Roster Preview Details:</div>
                <div className="flex gap-4 text-xs mb-3 text-slate-500">
                  <span>Recipients matching today: <strong className="text-brand-orange">{preview.recipients_count}</strong></span>
                  <span>Skipped rows: <strong>{preview.skipped_count}</strong></span>
                </div>
                
                {preview.recipients?.length > 0 && (
                  <div className="border border-black/5 rounded-lg overflow-hidden bg-white max-h-32 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                        <tr>
                          <th className="px-3 py-1.5">Name</th>
                          <th className="px-3 py-1.5">Roll No</th>
                          <th className="px-3 py-1.5">Phone</th>
                          <th className="px-3 py-1.5">DOB</th>
                          <th className="px-3 py-1.5 text-right">Adm No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.recipients.map((r, i) => (
                          <tr key={i} className="border-t border-black/5">
                            <td className="px-3 py-1.5 text-slate-700">{r.name}</td>
                            <td className="px-3 py-1.5 text-slate-500 font-mono">{r.roll_no || "—"}</td>
                            <td className="px-3 py-1.5 text-slate-500">{r.phone}</td>
                            <td className="px-3 py-1.5 text-slate-700">{r.dob}</td>
                            <td className="px-3 py-1.5 text-right text-slate-500 font-mono">{r.admission_no || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* dynamic card preview */}
                <div className="mt-4 flex flex-col items-center border-t border-black/5 pt-4">
                  <span className="text-xs font-bold text-slate-600 mb-2">Greeting Card Preview (Sample)</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow max-w-[200px]">
                    <img src={preview.card_preview_url} alt="Card preview" className="w-full h-auto block" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Message Caption */}
          <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/5 pb-2 mb-3">
              <div className="text-sm font-semibold text-slate-700">2. Message caption</div>
              <button
                onClick={() => setShowTemplate(!showTemplate)}
                className="text-xs font-bold text-brand-blue hover:underline"
              >
                {showTemplate ? "Hide Box" : "Customize Caption"}
              </button>
            </div>
            {showTemplate ? (
              <div>
                <textarea
                  rows={5}
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Enter message template..."
                  className="w-full text-sm border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-brand-blue font-sans text-slate-700 bg-slate-50/50"
                />
                <div className="text-[10px] text-slate-400 mt-1">
                  Use <strong>{"{name}"}</strong> inside template (will be substituted with student name).
                </div>
              </div>
            ) : (
              <div className="text-xs bg-slate-50 border border-black/5 p-3.5 rounded-xl text-slate-600 leading-relaxed font-medium">
                {template.split("\n").map((line, i) => <div key={i}>{line || <br />}</div>)}
              </div>
            )}
          </div>

          {/* Step 3: Database Birthday Matches (Today) */}
          <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-700 border-b border-black/5 pb-3 mb-3">
              3. Saved Database Matches (Today's Birthdays)
            </div>
            {dbInfo.birthdays_today.length > 0 ? (
              <div className="border border-black/5 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-black/5">
                    <tr>
                      <th className="text-left px-3 py-2.5 font-semibold">Name</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Roll No</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Phone</th>
                      <th className="text-left px-3 py-2.5 font-semibold">DOB</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Admission No</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbInfo.birthdays_today.map((s, i) => (
                      <tr key={i} className="border-t border-black/5 hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-700 font-medium">{s.name}</td>
                        <td className="px-3 py-2 text-slate-500 font-mono">{s.roll_no || s.roll || "—"}</td>
                        <td className="px-3 py-2 text-slate-500">{s.phone}</td>
                        <td className="px-3 py-2 text-slate-700 font-mono">{s.dob}</td>
                        <td className="px-3 py-2 text-right text-slate-500 font-mono">{s.admission_no || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-xl border border-black/5 p-8 text-center text-xs text-slate-400">
                No student in the database matches today's month & day.
              </div>
            )}
          </div>

          {/* Step 4: Campaign Launcher & Auto Info */}
          <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 max-w-md">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  <strong>Daily Automessenger:</strong> The backend automatically triggers today's birthday wishes every day at <strong>6:00 AM IST</strong>. 
                  The button below allows you to trigger it manually anytime.
                </div>
              </div>
              <div className="flex items-center gap-2">
                {progress?.running && (
                  <button onClick={stopCampaign} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                    <StopCircle className="w-4 h-4" /> Stop
                  </button>
                )}
                <button
                  onClick={launchSavedCampaign}
                  disabled={sendingSaved || progress?.running || !status.connected || dbInfo.birthdays_today.length === 0}
                  className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-brand-blue text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
                >
                  {sendingSaved ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Today's Greetings
                </button>
              </div>
            </div>

            {progress && (
              <div className="mt-5 border-t border-black/5 pt-5">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{progress.running ? "Campaign active…" : "Finished"}</span>
                  <span>{progress.sent + progress.failed} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progress.total ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-emerald-600 font-semibold">✓ Sent: {progress.sent}</span>
                  <span className="text-red-500 font-semibold">✗ Failed: {progress.failed}</span>
                </div>
                {progress.errors?.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-500 cursor-pointer font-medium">{progress.errors.length} error(s)</summary>
                    <div className="text-[11px] text-slate-500 mt-1 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded border border-black/5">
                      {progress.errors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* activeTab === "database" view */}
      {activeTab === "database" && (
        <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
          {/* Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search by Name, Roll No, Admission No, or Phone..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                />
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
              </div>

              {/* Class & Section Filters */}
              <div className="flex gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  placeholder="Filter Class (e.g. IX)"
                  value={selectedClass}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedClass(v);
                    setCurrentPage(1);
                    fetchStudents(1, searchQuery, v, selectedSection);
                  }}
                  className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50 font-medium"
                />
                <input
                  type="text"
                  placeholder="Filter Sec (e.g. A)"
                  value={selectedSection}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedSection(v);
                    setCurrentPage(1);
                    fetchStudents(1, searchQuery, selectedClass, v);
                  }}
                  className="w-28 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50 font-medium"
                />
              </div>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl bg-brand-blue text-white hover:opacity-90 shrink-0"
            >
              Add Student Manually
            </button>
          </div>

          {/* Table */}
          {studentsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-brand-blue animate-spin mb-2" />
              <span className="text-sm text-slate-400 font-medium">Loading student database...</span>
            </div>
          ) : students.length > 0 ? (
            <>
              <div className="border border-black/5 rounded-xl overflow-hidden overflow-x-auto bg-white">
                <table className="w-full text-xs text-left min-w-[1200px]">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-black/5">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Class</th>
                      <th className="px-4 py-3 font-semibold">Section</th>
                      <th className="px-4 py-3 font-semibold">Roll No</th>
                      <th className="px-4 py-3 font-semibold">Admission No</th>
                      <th className="px-4 py-3 font-semibold">Contact No</th>
                      <th className="px-4 py-3 font-semibold">Date of Birth</th>
                      <th className="px-4 py-3 font-semibold">Father's Name</th>
                      <th className="px-4 py-3 font-semibold">Mother's Name</th>
                      <th className="px-4 py-3 font-semibold">Permanent Address</th>
                      <th className="px-4 py-3 font-semibold">Current Address</th>
                      <th className="px-4 py-3 font-semibold">Biometric</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{student.name}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{student.class_name || student.class || "—"}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{student.section || student.sec || "—"}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{student.roll_no || student.roll || "—"}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{student.admission_no || student.admn_no || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{student.phone || student.contact_no || "—"}</td>
                        <td className="px-4 py-3 text-slate-800 font-mono">{student.dob || student.date_of_birth || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{student.father_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{student.mother_name || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={student.permanent_address}>{student.permanent_address || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-[150px] truncate" title={student.current_address}>{student.current_address || "—"}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{student.biometric || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(student)}
                              className="p-1.5 text-slate-500 hover:text-brand-blue rounded-lg border border-black/5 hover:bg-slate-50 bg-white"
                              title="Edit student"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id, student.name)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-red-100 bg-white"
                              title="Delete student"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                <span className="text-xs text-slate-500">
                  Showing <strong>{students.length}</strong> of <strong>{totalStudentsCount}</strong> students
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1.5 rounded-lg border border-black/5 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold bg-white"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-slate-600 px-3 py-1.5 self-center">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1.5 rounded-lg border border-black/5 hover:bg-slate-50 disabled:opacity-50 text-xs font-semibold bg-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-50/50 rounded-xl border border-black/5 p-12 text-center text-xs text-slate-400 font-medium">
              No students found in the database.
            </div>
          )}
        </div>
      )}

      {/* Manual Add / Edit Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-black/10 shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-headline text-base font-bold text-slate-800">
                {modalType === "add" ? "Add Student Manually" : "Edit Student Details"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={currentStudent.name}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                  />
                </div>

                {/* Class */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Class (e.g. IX / Class IX)</label>
                  <input
                    type="text"
                    placeholder="e.g. IX"
                    value={currentStudent.class_name}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, class_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                  />
                </div>

                {/* Section */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Section (e.g. A / B)</label>
                  <input
                    type="text"
                    placeholder="e.g. A"
                    value={currentStudent.section}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, section: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                  />
                </div>

                {/* DOB */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Date of Birth (YYYY-MM-DD) *</label>
                  <input
                    type="text"
                    required
                    placeholder="YYYY-MM-DD"
                    value={currentStudent.dob}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 font-mono bg-slate-50/50"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Contact No (Phone) *</label>
                  <input
                    type="text"
                    required
                    placeholder="10 digit mobile"
                    value={currentStudent.phone}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                  />
                </div>

                {/* Admission No */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Admission No</label>
                  <input
                    type="text"
                    value={currentStudent.admission_no}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, admission_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 font-mono bg-slate-50/50"
                  />
                </div>

                {/* Roll No */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Roll No</label>
                  <input
                    type="text"
                    value={currentStudent.roll_no}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, roll_no: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 font-mono bg-slate-50/50"
                  />
                </div>

                {/* Biometric */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Biometric ID</label>
                  <input
                    type="text"
                    value={currentStudent.biometric}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, biometric: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 font-mono bg-slate-50/50"
                  />
                </div>

                {/* Father Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={currentStudent.father_name}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, father_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                  />
                </div>

                {/* Mother Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mother's Name</label>
                  <input
                    type="text"
                    value={currentStudent.mother_name}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, mother_name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                  />
                </div>

                {/* Permanent Address */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Permanent Address</label>
                  <textarea
                    rows={2}
                    value={currentStudent.permanent_address}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, permanent_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                  />
                </div>

                {/* Current Address */}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Current Address</label>
                  <textarea
                    rows={2}
                    value={currentStudent.current_address}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, current_address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-brand-blue text-slate-700 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold border border-black/5 rounded-xl hover:bg-slate-50 text-slate-600 bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold bg-brand-blue text-white rounded-xl hover:opacity-90 disabled:opacity-50 shadow-sm"
                >
                  {savingStudent && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
