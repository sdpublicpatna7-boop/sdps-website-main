import { useState, useEffect } from "react";
import api from "../../../lib/api";
import { toast, Toaster } from "sonner";
import * as XLSX from "xlsx";
import { 
  Users, Search, Download, Trash2, Eye, Upload, 
  Database, FileText, Fingerprint, ShieldCheck, Loader2, RefreshCw 
} from "lucide-react";

export default function AdminApaarManager() {
  const [activeTab, setActiveTab] = useState("submissions"); // submissions, roster
  const [submissions, setSubmissions] = useState([]);
  const [roster, setRoster] = useState([]);
  
  // Loadings
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [clearingRoster, setClearingRoster] = useState(false);

  // Filters & Search
  const [subSearch, setSubSearch] = useState("");
  const [subClass, setSubClass] = useState("");
  const [rosterSearch, setRosterSearch] = useState("");

  // Bulk Upload Inputs
  const [pastedData, setPastedData] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  // Details Modal
  const [selectedSub, setSelectedSub] = useState(null);

  useEffect(() => {
    if (activeTab === "submissions") {
      fetchSubmissions();
    } else {
      fetchRoster();
    }
  }, [activeTab, subClass]); // reload on tab switch or class filter change

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const qParams = new URLSearchParams();
      if (subSearch.trim()) qParams.append("search", subSearch.trim());
      if (subClass) qParams.append("class_name", subClass);
      
      const r = await api.get(`/admin/apaar/submissions?${qParams.toString()}`);
      setSubmissions(r.data);
    } catch (err) {
      toast.error("Failed to load submissions.");
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchRoster = async () => {
    setLoadingRoster(true);
    try {
      const qParams = new URLSearchParams();
      if (rosterSearch.trim()) qParams.append("search", rosterSearch.trim());
      
      const r = await api.get(`/admin/apaar/roster?${qParams.toString()}`);
      setRoster(r.data);
    } catch (err) {
      toast.error("Failed to load school roster.");
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (!window.confirm("Are you sure you want to delete this submission? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/apaar/submissions/${id}`);
      toast.success("Submission deleted successfully");
      setSubmissions(prev => prev.filter(s => s.id !== id));
      if (selectedSub?.id === id) setSelectedSub(null);
    } catch (err) {
      toast.error("Failed to delete submission.");
    }
  };

  const handleClearRoster = async () => {
    if (!window.confirm("CRITICAL WARNING: This will delete the entire school student roster. Students will not be able to fill out forms until a new roster is uploaded. Continue?")) return;
    setClearingRoster(true);
    try {
      await api.delete("/admin/apaar/roster/clear");
      toast.success("School roster cleared successfully");
      setRoster([]);
    } catch (err) {
      toast.error("Failed to clear roster.");
    } finally {
      setClearingRoster(false);
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();

    if (selectedFile) {
      const fileExt = selectedFile.name.split(".").pop().toLowerCase();
      if (fileExt === "xlsx" || fileExt === "xls") {
        const reader = new FileReader();
        setBulkUploading(true);
        reader.onload = async (event) => {
          try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to array of arrays (raw values)
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            const parsed = [];
            rows.forEach((row) => {
              if (row && row.length >= 2) {
                const admission_no = (row[0] || "").toString().trim();
                const student_name = (row[1] || "").toString().trim();
                const father_name = row[2] ? row[2].toString().trim() : "";
                
                // Skip headers
                if (admission_no.toLowerCase().includes("adm") || student_name.toLowerCase().includes("student")) {
                  return;
                }
                
                if (admission_no && student_name) {
                  parsed.push({ admission_no, student_name, father_name });
                }
              }
            });
            
            submitRosterData(parsed);
          } catch (err) {
            console.error(err);
            toast.error("Failed to parse Excel file. Ensure it is a valid format.");
            setBulkUploading(false);
          }
        };
        reader.readAsArrayBuffer(selectedFile);
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target.result;
          const records = parseCSVOrText(text);
          submitRosterData(records);
        };
        reader.readAsText(selectedFile);
      }
    } 
    // Fallback to pasted raw text
    else if (pastedData.trim()) {
      const records = parseCSVOrText(pastedData);
      submitRosterData(records);
    } else {
      toast.error("Please paste data or select a CSV/Excel file to upload.");
    }
  };

  const parseCSVOrText = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const parsed = [];
    
    // Attempt parsing
    lines.forEach((line, idx) => {
      // Split by tab (Excel paste) or comma (CSV)
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");
      if (parts.length >= 2) {
        const admission_no = parts[0].trim();
        const student_name = parts[1].trim();
        const father_name = parts[2] ? parts[2].trim() : "";
        
        // Skip header lines if they match labels
        if (admission_no.toLowerCase().includes("adm") || student_name.toLowerCase().includes("student")) {
          return;
        }
        
        if (admission_no && student_name) {
          parsed.push({ admission_no, student_name, father_name });
        }
      }
    });
    return parsed;
  };

  const submitRosterData = async (records) => {
    if (records.length === 0) {
      toast.error("No valid student records found. Check format: AdmissionNo, StudentName, FatherName.");
      return;
    }
    setBulkUploading(true);
    try {
      const r = await api.post("/admin/apaar/roster/bulk", records);
      toast.success(r.data.message || `Successfully uploaded ${records.length} roster entries!`);
      setPastedData("");
      setSelectedFile(null);
      fetchRoster();
    } catch (err) {
      toast.error("Failed to upload roster data.");
    } finally {
      setBulkUploading(false);
    }
  };

  // CSV Export logic
  const exportToCSV = () => {
    if (submissions.length === 0) {
      toast.error("No submissions available to export.");
      return;
    }
    
    const headers = [
      "Admission Number", "School Student Name", "School Father Name", 
      "Class", "Section", "Mobile", "Aadhaar Student Name", "Aadhaar Student Number", 
      "Student DOB", "Student Gender", "Aadhaar Father Name", "Aadhaar Father Number", 
      "Aadhaar Mother Name", "Aadhaar Mother Number", "Date Submitted"
    ];
    
    const rows = submissions.map(s => [
      s.admission_no, s.student_name, s.father_name,
      s.class_name, s.section, s.mobile_no,
      s.student_aadhaar_name, `="${s.student_aadhaar_no}"`, // Excel prefix to preserve trailing zeroes
      s.student_dob, s.student_gender,
      s.father_aadhaar_name, `="${s.father_aadhaar_no}"`,
      s.mother_aadhaar_name, `="${s.mother_aadhaar_no}"`,
      new Date(s.created_at).toLocaleDateString()
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${(val || "").toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `APAAR_Submissions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const classes = ["Nursery", "LKG", "UKG", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-blue-light flex items-center justify-center shadow-lg">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">APAAR ID Manager</h1>
              <p className="text-sm text-slate-500">Collect student details and consent for APAAR Registry IDs</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={activeTab === "submissions" ? fetchSubmissions : fetchRoster}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 border border-slate-200 text-slate-650 rounded-xl font-bold text-xs hover:bg-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          {activeTab === "submissions" && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0E3B91] hover:bg-[#0E3B91]/90 text-white font-bold rounded-xl text-xs shadow-sm transition"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
            activeTab === "submissions"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Submissions ({submissions.length})
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`py-3 px-6 font-bold text-xs uppercase tracking-wider border-b-2 transition ${
            activeTab === "roster"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          School Roster ({roster.length})
        </button>
      </div>

      {/* TAB 1: SUBMISSIONS PANEL */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          
          {/* Filters Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                placeholder="Search by Admission No, Student Name..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:border-brand-blue outline-none transition"
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchSubmissions()}
              />
            </div>
            
            <div className="w-full md:w-48">
              <select
                className="w-full px-4 py-2.5 rounded-xl border border-slate-250 text-sm outline-none bg-white"
                value={subClass}
                onChange={(e) => setSubClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button
              onClick={fetchSubmissions}
              className="w-full md:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
            >
              Filter
            </button>
          </div>

          {/* Submissions Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {loadingSubmissions ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-450 gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
                <span className="text-xs font-bold uppercase tracking-wider">Loading submissions...</span>
              </div>
            ) : submissions.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No submissions found matching filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100 select-none">
                      <th className="py-4 px-6">Adm No</th>
                      <th className="py-4 px-6">Student (School)</th>
                      <th className="py-4 px-6">Class/Sec</th>
                      <th className="py-4 px-6">Student (Aadhaar)</th>
                      <th className="py-4 px-6">Aadhaar Linked Mobile</th>
                      <th className="py-4 px-6">Submitted Date</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {submissions.map(s => (
                      <tr key={s.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-6 font-bold text-slate-900">{s.admission_no}</td>
                        <td className="py-3.5 px-6 uppercase">{s.student_name}</td>
                        <td className="py-3.5 px-6">{s.class_name} - {s.section}</td>
                        <td className="py-3.5 px-6 uppercase text-brand-blue">{s.student_aadhaar_name}</td>
                        <td className="py-3.5 px-6">{s.mobile_no}</td>
                        <td className="py-3.5 px-6">{new Date(s.created_at).toLocaleDateString()}</td>
                        <td className="py-3.5 px-6 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedSub(s)}
                            className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-650 transition"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                          <button
                            onClick={() => handleDeleteSubmission(s.id)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ROSTER PANEL */}
      {activeTab === "roster" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List School Student Roster (Left column, col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  placeholder="Search roster by Adm No, Student/Father Name..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 text-sm focus:border-brand-blue outline-none transition"
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchRoster()}
                />
              </div>
              <button
                onClick={fetchRoster}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                Search
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              {loadingRoster ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-450 gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-blue" />
                  <span className="text-xs font-bold uppercase tracking-wider">Loading roster list...</span>
                </div>
              ) : roster.length === 0 ? (
                <div className="py-16 text-center text-slate-450">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-semibold">Roster is empty. Upload list below.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[550px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-100 select-none sticky top-0">
                        <th className="py-3 px-6">Admission No</th>
                        <th className="py-3 px-6">Student Name (School)</th>
                        <th className="py-3 px-6">Father's Name (School)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {roster.map(r => (
                        <tr key={r.admission_no} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-6 font-bold text-slate-900">{r.admission_no}</td>
                          <td className="py-3 px-6 uppercase">{r.student_name}</td>
                          <td className="py-3 px-6 uppercase">{r.father_name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Upload and Clear tools (Right column) */}
          <div className="space-y-6">
            
            {/* Roster Uploader card */}
            <form onSubmit={handleBulkUpload} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-brand-blue" /> Bulk Upload Roster
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                    Option A: Copy & Paste from Excel/CSV
                  </label>
                  <textarea
                    rows="6"
                    placeholder="AdmNo, StudentName, FatherName&#10;125/22, Amit Kumar, Rajesh Kumar&#10;194/23, Riya Kumari, Sanjay Singh"
                    className="w-full p-3 rounded-xl border border-slate-250 text-xs font-mono outline-none focus:border-brand-blue transition"
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Separate columns with tabs or commas. Row 1 headers will be skipped automatically.</span>
                </div>

                <div className="relative flex items-center justify-center p-4 border border-dashed border-slate-300 hover:border-brand-blue/50 rounded-2xl transition bg-slate-50/50 cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.txt,.xlsx,.xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                  />
                  <div className="text-center">
                    <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-[11px] font-bold text-slate-700 block">
                      {selectedFile ? selectedFile.name : "Option B: Choose CSV or Excel File"}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Accepts .csv, .xlsx, .xls formats</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={bulkUploading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-brand-blue to-brand-blue-light text-white font-bold rounded-xl text-xs hover:scale-[1.01] transition shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {bulkUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> Process & Save Roster
                  </>
                )}
              </button>
            </form>

            {/* Clear Roster card */}
            <div className="bg-red-50/40 rounded-3xl p-6 border border-red-200/50 space-y-3">
              <h3 className="text-xs font-bold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Reset Tools
              </h3>
              <p className="text-[11px] text-red-600/70 leading-relaxed font-medium">
                Clearing the school roster will delete all student validation tokens. Students already submitted will remain in the database, but new submissions will be locked out until a new roster is processed.
              </p>
              <button
                onClick={handleClearRoster}
                disabled={clearingRoster}
                className="w-full py-2.5 px-4 bg-red-650 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {clearingRoster ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Delete All Roster Students"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedSub && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-brand-blue">
                <Fingerprint className="w-5 h-5" />
                <h3 className="font-bold text-slate-800 text-sm">APAAR Submission Details</h3>
              </div>
              <button 
                onClick={() => setSelectedSub(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center border border-slate-200 hover:bg-slate-100 text-slate-500 font-bold transition text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              
              {/* Roster Match Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-slate-400 tracking-wider uppercase text-[9px] mb-1">Roster Enrollment Verification</div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 font-medium block">Admission Number:</span>
                    <span className="font-bold text-slate-900 tracking-wide">{selectedSub.admission_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Enrollment Class/Sec:</span>
                    <span className="font-bold text-slate-900">{selectedSub.class_name} - {selectedSub.section}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Name on School Record:</span>
                    <span className="font-bold text-slate-900 uppercase">{selectedSub.student_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Father's Name (School):</span>
                    <span className="font-bold text-slate-900 uppercase">{selectedSub.father_name}</span>
                  </div>
                </div>
              </div>

              {/* Student Aadhaar Info */}
              <div className="space-y-3">
                <div className="font-bold text-slate-400 tracking-wider uppercase text-[9px] border-b border-slate-100 pb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" /> Student Aadhaar Card Details
                </div>
                <div className="grid grid-cols-2 gap-4 pl-1.5">
                  <div>
                    <span className="text-slate-400 font-medium block">Name as per Aadhaar:</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedSub.student_aadhaar_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Aadhaar Card Number:</span>
                    <span className="font-bold text-slate-900 tracking-widest">{selectedSub.student_aadhaar_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Date of Birth:</span>
                    <span className="font-bold text-slate-900">{selectedSub.student_dob}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Gender:</span>
                    <span className="font-bold text-slate-900">{selectedSub.student_gender}</span>
                  </div>
                </div>
              </div>

              {/* Parent Aadhaar Info */}
              <div className="space-y-4">
                <div className="font-bold text-slate-400 tracking-wider uppercase text-[9px] border-b border-slate-100 pb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-blue" /> Parents Aadhaar Card Details
                </div>
                <div className="grid grid-cols-2 gap-6 pl-1.5">
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Father</div>
                    <div>
                      <span className="text-slate-400 font-medium block">Name as per Aadhaar:</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedSub.father_aadhaar_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Aadhaar Number:</span>
                      <span className="font-bold text-slate-900 tracking-wider">{selectedSub.father_aadhaar_no}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mother</div>
                    <div>
                      <span className="text-slate-400 font-medium block">Name as per Aadhaar:</span>
                      <span className="font-bold text-slate-800 uppercase">{selectedSub.mother_aadhaar_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Aadhaar Number:</span>
                      <span className="font-bold text-slate-900 tracking-wider">{selectedSub.mother_aadhaar_no}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info & Consent Verification */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <span className="text-slate-400 font-medium block">Linked Mobile Number:</span>
                  <span className="font-bold text-slate-900">{selectedSub.mobile_no}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Consent Given:</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    ✓ Yes
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-right space-x-2">
              <button
                onClick={() => handleDeleteSubmission(selectedSub.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Entry
              </button>
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
