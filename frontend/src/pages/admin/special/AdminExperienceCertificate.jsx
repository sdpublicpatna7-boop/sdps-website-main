import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Printer, FileText, ArrowRight, ShieldCheck } from "lucide-react";

export function AdminExperienceCertificate() {
  const { settings } = useOutletContext() || {};
  const [educators, setEducators] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("manual");
  const [loading, setLoading] = useState(false);

  const logoUrl = settings?.logo_url || "https://sdpublic.org/assets/img/logo.png";
  const formattedLogo = logoUrl.startsWith("http")
    ? logoUrl
    : `${process.env.REACT_APP_BACKEND_URL || ""}${logoUrl}`;
  const [history, setHistory] = useState([]);
  const [showSignatures, setShowSignatures] = useState(true);

  // Form State
  const [employeeName, setEmployeeName] = useState("Educator");
  const [designation, setDesignation] = useState("TGT Teacher");
  const [joiningDate, setJoiningDate] = useState("2024-04-01");
  const [leavingDate, setLeavingDate] = useState("Present");
  const [currentlyWorking, setCurrentlyWorking] = useState(true);

  // Format today's date to YYYY-MM-DD for date picker
  const todayIso = new Date().toISOString().split("T")[0];
  const [certificateDate, setCertificateDate] = useState(todayIso);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/admin/experience-certificates");
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load experience certificate history", err);
    }
  };

  // Fetch educators and history on mount
  useEffect(() => {
    const fetchEducators = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/educators");
        const sorted = (res.data || []).sort((a, b) => 
          (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
        );
        setEducators(sorted);
      } catch (err) {
        console.error("Failed to load educators", err);
        toast.error("Failed to load educators list");
      } finally {
        setLoading(false);
      }
    };
    fetchEducators();
    fetchHistory();
  }, []);

  // Handle teacher selection change
  const handleTeacherSelect = (teacherId) => {
    setSelectedTeacherId(teacherId);
    if (teacherId === "manual") {
      setEmployeeName("Educator");
      setDesignation("TGT Teacher");
      setJoiningDate("2024-04-01");
      setLeavingDate("Present");
      setCurrentlyWorking(true);
    } else {
      const teacher = educators.find(e => e.id === teacherId);
      if (teacher) {
        setEmployeeName(teacher.name);
        setDesignation(teacher.role || "Educator");
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to format date (YYYY-MM-DD -> DD / MM / YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return "___ / ___ / 2026";
    if (dateStr.toLowerCase() === "present") return "Present";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    }
    return dateStr;
  };

  const handleSave = async () => {
    const payload = {
      employee_name: employeeName,
      designation: designation,
      joining_date: joiningDate,
      leaving_date: currentlyWorking ? "Present" : leavingDate,
      certificate_date: certificateDate
    };

    try {
      setLoading(true);
      await api.post("/admin/experience-certificates", payload);
      toast.success("Experience certificate saved to database successfully");
      fetchHistory();
    } catch (err) {
      console.error("Failed to save experience certificate", err);
      toast.error("Failed to save experience certificate to database");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    const email = window.prompt("Enter the employee's email address to send this Experience Certificate:");
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const payload = {
      email,
      data: {
        employee_name: employeeName,
        designation: designation,
        joining_date: formatDate(joiningDate),
        leaving_date: currentlyWorking ? "Present" : formatDate(leavingDate),
        certificate_date: formatDate(certificateDate)
      }
    };

    try {
      setLoading(true);
      await api.post("/admin/experience-certificates/send-email", payload);
      toast.success(`Experience certificate successfully sent to ${email} via MailerCloud!`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this experience certificate record?")) return;
    try {
      await api.delete(`/admin/experience-certificates/${id}`);
      toast.success("Experience certificate deleted successfully");
      fetchHistory();
    } catch (err) {
      console.error("Failed to delete experience certificate", err);
      toast.error("Failed to delete experience certificate");
    }
  };

  const handleLoad = (item) => {
    setEmployeeName(item.employee_name || "");
    setDesignation(item.designation || "");
    setJoiningDate(item.joining_date || "");
    setCertificateDate(item.certificate_date || "");
    
    if (item.leaving_date === "Present") {
      setCurrentlyWorking(true);
      setLeavingDate("Present");
    } else {
      setCurrentlyWorking(false);
      setLeavingDate(item.leaving_date || "");
    }
    
    setSelectedTeacherId("manual");
    toast.success(`Loaded details for ${item.employee_name}`);
  };

  return (
    <div className="space-y-6">
      {/* Print styles wrapper */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide the layout wrappers, sidebar, header, form */
          body * {
            visibility: hidden;
            background: none !important;
          }
          #experience-certificate-print-area, #experience-certificate-print-area * {
            visibility: visible;
          }
          #experience-certificate-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 1.5cm 1.5cm !important;
            box-shadow: none !important;
            border: none !important;
            box-sizing: border-box;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}} />

      {/* Page Title Header */}
      <div className="flex justify-between items-center bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-orange" />
            Experience Certificate Generator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Generate and print official Work Experience Certificates.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSendEmail}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition duration-200 hover:-translate-y-0.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            Send Email
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition duration-200"
          >
            Save to History
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-xl shadow-md transition duration-200 hover:-translate-y-0.5"
          >
            <Printer className="w-4 h-4" />
            Print Certificate
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Form Editor */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            
            {/* Educator Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Select Educator</label>
              <select
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange bg-slate-50"
                value={selectedTeacherId}
                onChange={(e) => handleTeacherSelect(e.target.value)}
              >
                <option value="manual">Manual Entry (Default Template)</option>
                {educators.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.role || "Teacher"})</option>
                ))}
              </select>
            </div>

            {/* Employee Details Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Employee & Tenure Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400">Employee Name</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Date of Joining</label>
                  <input
                    type="date"
                    value={joiningDate}
                    onChange={(e) => setJoiningDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Date of Leaving</label>
                  <input
                    type="date"
                    value={leavingDate === "Present" ? "" : leavingDate}
                    disabled={currentlyWorking}
                    onChange={(e) => setLeavingDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="currently-working-checkbox"
                    checked={currentlyWorking}
                    onChange={(e) => {
                      setCurrentlyWorking(e.target.checked);
                      if (e.target.checked) {
                        setLeavingDate("Present");
                      } else {
                        setLeavingDate(todayIso);
                      }
                    }}
                    className="rounded text-brand-orange focus:ring-brand-orange"
                  />
                  <label htmlFor="currently-working-checkbox" className="text-xs font-semibold text-slate-600 select-none">
                    Currently working at this school (Present)
                  </label>
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400">Certificate Issue Date</label>
                  <input
                    type="date"
                    value={certificateDate}
                    onChange={(e) => setCertificateDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="col-span-2 flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="show-signatures-checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="rounded text-brand-orange focus:ring-brand-orange"
                  />
                  <label htmlFor="show-signatures-checkbox" className="text-xs font-semibold text-slate-600 select-none">
                    Include Seal & Signature in Printout
                  </label>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Print Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center pl-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-orange" />
              Certificate Preview
            </div>
          </div>

          <div
            id="experience-certificate-print-area"
            className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 max-w-[800px] mx-auto text-slate-800 font-sans"
          >
            <div className="relative border-[10px] border-double border-amber-600 p-8 rounded-2xl bg-amber-50/5 min-h-[680px] flex flex-col justify-between overflow-hidden text-slate-900">
              {/* Background Watermark Logo */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <img 
                  src={formattedLogo} 
                  className="w-96 h-96 object-contain" 
                  alt="" 
                />
              </div>

              <div className="space-y-6">
                {/* Centered Certificate Header */}
                <div className="text-center space-y-2 border-b border-amber-200 pb-4">
                  <img 
                    src={formattedLogo} 
                    alt="SDPS Logo" 
                    className="w-20 h-20 mx-auto object-contain"
                  />
                  <h2 className="text-2xl font-black tracking-wide text-slate-900 leading-tight">
                    S.D. PUBLIC SCHOOL
                  </h2>
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                    Patna-7, Bihar
                  </p>
                  <p className="text-[10px] font-bold text-amber-600 italic tracking-wider">
                    Empowering Generations Since 1994
                  </p>
                </div>

                {/* Certificate Subtitles */}
                <div className="text-center py-2 space-y-2">
                  <span className="text-[11px] font-black text-amber-700 tracking-widest bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full uppercase">
                    EXPERIENCE CERTIFICATE
                  </span>
                  <h3 className="text-sm font-extrabold tracking-widest text-slate-800 uppercase block pt-4">
                    TO WHOMSOEVER IT MAY CONCERN
                  </h3>
                </div>

                {/* Certificate Body Paragraphs */}
                <div className="space-y-6 text-slate-900 leading-relaxed text-sm text-justify px-4">
                  <p className="indent-12 leading-loose">
                    This is to certify that Mr./Ms. <strong className="border-b-2 border-slate-900 px-1.5 text-slate-950 font-black">{employeeName}</strong> has been employed with <strong className="font-bold text-slate-950">S.D. Public School</strong>, Maurya Colony, Patna-7 as a <strong className="border-b border-slate-400 px-1.5 text-slate-950 font-bold">{designation}</strong>.
                  </p>
                  <p className="leading-loose">
                    Their tenure of service at this institution spans from <strong className="border-b-2 border-slate-900 px-1.5 text-slate-950 font-black">{formatDate(joiningDate)}</strong> {currentlyWorking ? "till date" : <>to <strong className="border-b-2 border-slate-900 px-1.5 text-slate-950 font-black">{formatDate(leavingDate)}</strong></>}.
                  </p>
                  <p className="leading-loose">
                    During their employment, we found them to be highly professional, industrious, and dedicated to their duties. They have made valuable contributions to our school's academic environment. Their conduct, character, and relationship with colleagues and students have been exemplary.
                  </p>
                  <p className="leading-loose">
                    We wish Mr./Ms. {employeeName.split(" ")[0]} all the very best and success in their future professional endeavors.
                  </p>
                </div>
              </div>

              {/* Certificate Footer Seal & Signatures */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-8 px-4">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-600">
                    Date: <span className="font-bold text-slate-900">{formatDate(certificateDate)}</span>
                  </div>
                  {showSignatures && (
                    <div className="w-20 h-20 border border-dashed border-amber-300 rounded-xl flex items-center justify-center text-[9px] text-amber-400 font-bold uppercase tracking-widest bg-amber-50/20 select-none">
                      School Seal
                    </div>
                  )}
                </div>
                {showSignatures ? (
                  <div className="text-right flex flex-col justify-end items-end h-28">
                    <span className="font-bold text-slate-900">For S.D. Public School, Patna-7</span>
                    <div className="w-48 border-t border-slate-900 text-center pt-1.5 mt-16">
                      <span className="font-bold text-[10px] text-slate-700 block uppercase">Authorized Signatory</span>
                      <span className="text-[9px] text-slate-500 block">(Seal & Signature)</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-right flex flex-col justify-end items-end h-28">
                    <span className="text-[9px] text-slate-400 block pb-2">
                      Computer-Generated Document
                    </span>
                    <span className="text-[9px] text-slate-400 block leading-normal">
                      This certificate is digitally generated and does not require a physical signature or seal.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Log Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-orange" />
            Generated Experience Certificates History
          </h2>
          <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-500 uppercase tracking-wider">
            {history.length} Saved Records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">
            No experience certificate records saved in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date Generated</th>
                  <th className="px-4 py-3">Employee Name</th>
                  <th className="px-4 py-3">Designation / Role</th>
                  <th className="px-4 py-3">Joining Date</th>
                  <th className="px-4 py-3">Leaving Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition duration-150">
                    <td className="px-4 py-3 font-semibold text-slate-500">
                      {new Date(item.created_at).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {item.employee_name}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {item.designation}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(item.joining_date)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-600">
                      {item.leaving_date === "Present" ? (
                        <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[9px] uppercase font-bold">Present</span>
                      ) : (
                        formatDate(item.leaving_date)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleLoad(item)}
                        className="inline-flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition duration-150"
                        title="Load into Editor"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center justify-center p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition duration-150"
                        title="Delete Record"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
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
  );
}

export default AdminExperienceCertificate;
