import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Printer, FileText, ArrowRight, ShieldCheck } from "lucide-react";

// Helper to convert numbers to Indian Rupee word representation
function numberToWords(num) {
  if (num === 0) return "Rupees Zero Only";
  
  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function numToWords(n) {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
      if (n > 0) str += "and ";
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      str += a[n] + " ";
    }
    return str;
  }

  let amount = Math.floor(num);
  let words = "";

  if (amount >= 10000000) {
    words += numToWords(Math.floor(amount / 10000000)) + "Crore ";
    amount %= 10000000;
  }
  if (amount >= 100000) {
    words += numToWords(Math.floor(amount / 100000)) + "Lakh ";
    amount %= 100000;
  }
  if (amount >= 1000) {
    words += numToWords(Math.floor(amount / 1000)) + "Thousand ";
    amount %= 1000;
  }
  if (amount > 0) {
    words += numToWords(amount);
  }

  return "Rupees " + words.trim() + " Only.";
}

export function AdminSalaryCertificate() {
  const [educators, setEducators] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // Form State
  const [employeeName, setEmployeeName] = useState("Principal");
  const [designation, setDesignation] = useState("Principal");

  // Earnings (to calculate Gross Salary)
  const [basicSalary, setBasicSalary] = useState(15000);
  const [hra, setHra] = useState(5000);
  const [da, setDa] = useState(2500);
  const [medicalAllowance, setMedicalAllowance] = useState(1000);
  const [conveyanceAllowance, setConveyanceAllowance] = useState(1000);
  const [specialAllowance, setSpecialAllowance] = useState(500);

  // Format today's date to YYYY-MM-DD for date picker
  const todayIso = new Date().toISOString().split("T")[0];
  const [paymentDate, setPaymentDate] = useState(todayIso);

  // Calculations
  const grossSalary = basicSalary + hra + da + medicalAllowance + conveyanceAllowance + specialAllowance;
  const grossSalaryWords = numberToWords(grossSalary);

  const fetchHistory = async () => {
    try {
      const res = await api.get("/admin/salary-certificates");
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load salary certificate history", err);
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
      setEmployeeName("Principal");
      setDesignation("Principal");
      setBasicSalary(15000);
      setHra(5000);
      setDa(2500);
      setMedicalAllowance(1000);
      setConveyanceAllowance(1000);
      setSpecialAllowance(500);
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

  // Helper to format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val).replace("INR", "₹");
  };

  // Helper to format payment date (YYYY-MM-DD -> DD / MM / YYYY)
  const formatPaymentDate = (dateStr) => {
    if (!dateStr) return "___ / ___ / 2026";
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
      basic_salary: basicSalary,
      hra: hra,
      da: da,
      medical_allowance: medicalAllowance,
      conveyance_allowance: conveyanceAllowance,
      special_allowance: specialAllowance,
      gross_salary: grossSalary,
      payment_date: paymentDate
    };

    try {
      setLoading(true);
      await api.post("/admin/salary-certificates", payload);
      toast.success("Salary certificate saved to database successfully");
      fetchHistory();
    } catch (err) {
      console.error("Failed to save salary certificate", err);
      toast.error("Failed to save salary certificate to database");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this salary certificate record?")) return;
    try {
      await api.delete(`/admin/salary-certificates/${id}`);
      toast.success("Salary certificate deleted successfully");
      fetchHistory();
    } catch (err) {
      console.error("Failed to delete salary certificate", err);
      toast.error("Failed to delete salary certificate");
    }
  };

  const handleLoad = (item) => {
    setEmployeeName(item.employee_name || "");
    setDesignation(item.designation || "");
    setBasicSalary(item.basic_salary || 0);
    setHra(item.hra || 0);
    setDa(item.da || 0);
    setMedicalAllowance(item.medical_allowance || 0);
    setConveyanceAllowance(item.conveyance_allowance || 0);
    setSpecialAllowance(item.special_allowance || 0);
    setPaymentDate(item.payment_date || "");
    
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
          #salary-certificate-print-area, #salary-certificate-print-area * {
            visibility: visible;
          }
          #salary-certificate-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 800px;
            margin: 0 auto;
            padding: 10px 0;
            box-shadow: none !important;
            border: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
        }
      `}} />

      {/* Page Title Header */}
      <div className="flex justify-between items-center bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-orange" />
            Salary Certificate Generator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate and print official Salary Certificates (To Whomsoever It May Concern).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition duration-200 hover:-translate-y-0.5"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
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
                <option value="manual">Manual Entry (Default Template / Principal)</option>
                {educators.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.role || "Teacher"})</option>
                ))}
              </select>
            </div>

            {/* Employee Details Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Employee Details</h3>
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
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400">Certificate Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
              </div>
            </div>

            {/* Earnings Form (for gross calculations) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Salary Breakups (to calculate Gross Salary)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Basic Salary</label>
                  <input
                    type="number"
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">HRA</label>
                  <input
                    type="number"
                    value={hra}
                    onChange={(e) => setHra(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">DA</label>
                  <input
                    type="number"
                    value={da}
                    onChange={(e) => setDa(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Medical</label>
                  <input
                    type="number"
                    value={medicalAllowance}
                    onChange={(e) => setMedicalAllowance(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Conveyance</label>
                  <input
                    type="number"
                    value={conveyanceAllowance}
                    onChange={(e) => setConveyanceAllowance(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Special</label>
                  <input
                    type="number"
                    value={specialAllowance}
                    onChange={(e) => setSpecialAllowance(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-100 flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>Computed Gross Salary:</span>
                  <span className="text-sm font-black text-brand-orange">{formatCurrency(grossSalary)}</span>
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
            id="salary-certificate-print-area"
            className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 max-w-[800px] mx-auto text-slate-800 font-sans"
          >
            <div className="relative border-[10px] border-double border-amber-600 p-8 rounded-2xl bg-amber-50/5 min-h-[680px] flex flex-col justify-between overflow-hidden text-slate-900">
              {/* Background Watermark Logo */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
                <img 
                  src="https://sdpublic.org/assets/img/logo.png" 
                  className="w-96 h-96 object-contain" 
                  alt="" 
                />
              </div>

              <div className="space-y-6">
                {/* Centered Certificate Header */}
                <div className="text-center space-y-2 border-b border-amber-200 pb-4">
                  <img 
                    src="https://sdpublic.org/assets/img/logo.png" 
                    alt="SDPS Logo" 
                    className="w-20 h-20 mx-auto object-contain"
                  />
                  <h2 className="text-2xl font-black tracking-wide text-slate-900 leading-tight">
                    S.D. PUBLIC SCHOOL
                  </h2>
                  <p className="text-xs font-bold text-slate-655 uppercase tracking-widest">
                    Patna-7, Bihar
                  </p>
                  <p className="text-[10px] font-bold text-amber-600 italic tracking-wider">
                    Empowering Generations Since 1994
                  </p>
                </div>

                {/* Certificate Subtitles */}
                <div className="text-center py-2 space-y-2">
                  <span className="text-[11px] font-black text-amber-700 tracking-widest bg-amber-50 border border-amber-200 px-4 py-1.5 rounded-full uppercase">
                    SALARY CERTIFICATE
                  </span>
                  <h3 className="text-sm font-extrabold tracking-widest text-slate-800 uppercase block pt-4">
                    TO WHOMSOEVER IT MAY CONCERN
                  </h3>
                </div>

                {/* Certificate Body Paragraphs */}
                <div className="space-y-4 text-slate-900 leading-relaxed text-sm text-justify px-4">
                  <p className="indent-12 leading-loose">
                    This is to certify that Mr./Ms. <strong className="border-b-2 border-slate-900 px-1.5 text-slate-950 font-black">{employeeName}</strong> is working as <strong className="border-b border-slate-400 px-1.5 text-slate-950 font-bold">{designation}</strong> at S.D. Public School, Patna-7 on a full-time basis.
                  </p>
                  <p className="leading-loose">
                    The employee is drawing a monthly gross salary of <strong className="border-b-2 border-slate-900 px-1.5 text-slate-950 font-black">{formatCurrency(grossSalary)}/-</strong> ({grossSalaryWords}).
                  </p>
                  <p className="leading-loose">
                    This certificate is issued upon the employee’s request for official purposes.
                  </p>
                </div>
              </div>

              {/* Certificate Footer Seal & Signatures */}
              <div className="grid grid-cols-2 gap-4 text-xs pt-8 px-4">
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-600">
                    Date: <span className="font-bold text-slate-900">{formatPaymentDate(paymentDate)}</span>
                  </div>
                  <div className="w-20 h-20 border border-dashed border-amber-300 rounded-xl flex items-center justify-center text-[9px] text-amber-400 font-bold uppercase tracking-widest bg-amber-50/20 select-none">
                    School Seal
                  </div>
                </div>
                <div className="text-right flex flex-col justify-end items-end h-28">
                  <span className="font-bold text-slate-900">For S.D. Public School, Patna-7</span>
                  <div className="w-48 border-t border-slate-900 text-center pt-1.5 mt-16">
                    <span className="font-bold text-[10px] text-slate-700 block uppercase">Authorized Signatory</span>
                    <span className="text-[9px] text-slate-500 block">(Seal & Signature)</span>
                  </div>
                </div>
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
            Generated Salary Certificates History
          </h2>
          <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-500 uppercase tracking-wider">
            {history.length} Saved Records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">
            No salary certificate records saved in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date Generated</th>
                  <th className="px-4 py-3">Employee Name</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Gross Salary</th>
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
                    <td className="px-4 py-3 font-semibold">
                      {item.designation}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {formatCurrency(item.gross_salary)}
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

export default AdminSalaryCertificate;
