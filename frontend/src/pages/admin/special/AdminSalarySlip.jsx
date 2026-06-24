import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Printer, User, CreditCard, FileText, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

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

export function AdminSalarySlip() {
  const [educators, setEducators] = useState([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [slipFormat, setSlipFormat] = useState("slip"); // "slip" | "certificate"

  // Form State
  const [employeeName, setEmployeeName] = useState("Principal");
  const [designation, setDesignation] = useState("Principal");
  const [employeeId, setEmployeeId] = useState("SDPS/PRN/001");
  const [department, setDepartment] = useState("Administration");
  
  // Pay Period & Attendance
  const currentMonthYear = new Date().toLocaleString("en-US", { month: "long", year: "numeric" }); // e.g. "June 2026"
  const [payPeriod, setPayPeriod] = useState(currentMonthYear);
  const [workingDays, setWorkingDays] = useState(30);
  const [presentDays, setPresentDays] = useState(30);

  // Earnings
  const [basicSalary, setBasicSalary] = useState(15000);
  const [hra, setHra] = useState(5000);
  const [da, setDa] = useState(2500);
  const [medicalAllowance, setMedicalAllowance] = useState(1000);
  const [conveyanceAllowance, setConveyanceAllowance] = useState(1000);
  const [specialAllowance, setSpecialAllowance] = useState(500);

  // Deductions
  const [pf, setPf] = useState(0);
  const [professionalTax, setProfessionalTax] = useState(0);
  const [tds, setTds] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);

  // Payment Details
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("XXXX XXXX XXXX");
  const [utrId, setUtrId] = useState("");
  
  // Format today's date to YYYY-MM-DD for date picker
  const todayIso = new Date().toISOString().split("T")[0];
  const [paymentDate, setPaymentDate] = useState(todayIso);

  // Calculations
  const grossSalary = basicSalary + hra + da + medicalAllowance + conveyanceAllowance + specialAllowance;
  const totalDeductions = pf + professionalTax + tds + otherDeductions;
  const netSalary = Math.max(0, grossSalary - totalDeductions);
  const amountInWords = numberToWords(netSalary);
  const grossSalaryWords = numberToWords(grossSalary);

  // Fetch educators for selection
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
  }, []);

  // Handle teacher selection change
  const handleTeacherSelect = (teacherId) => {
    setSelectedTeacherId(teacherId);
    if (teacherId === "manual") {
      // Keep or reset to default empty/Principal values
      setEmployeeName("Principal");
      setDesignation("Principal");
      setEmployeeId("SDPS/PRN/001");
      setDepartment("Administration");
      // Reset salary to principal template defaults
      setBasicSalary(15000);
      setHra(5000);
      setDa(2500);
      setMedicalAllowance(1000);
      setConveyanceAllowance(1000);
      setSpecialAllowance(500);
      setPf(0);
      setProfessionalTax(0);
      setTds(0);
      setOtherDeductions(0);
    } else {
      const teacher = educators.find(e => e.id === teacherId);
      if (teacher) {
        setEmployeeName(teacher.name);
        setDesignation(teacher.role || "Educator");
        setEmployeeId(`SDPS/EMP/${teacher.id.slice(-4).toUpperCase()}`);
        setDepartment("Academic");
        // Clear bank details for new selection
        setBankName("");
        setAccountNumber("XXXX XXXX XXXX");
        setUtrId("");
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

  // Helper to format payment date (YYYY-MM-DD -> DD / MM / YYYY or custom)
  const formatPaymentDate = (dateStr) => {
    if (!dateStr) return "___ / ___ / 2026";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]} / ${parts[1]} / ${parts[0]}`;
    }
    return dateStr;
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
          #salary-slip-print-area, #salary-slip-print-area * {
            visibility: visible;
          }
          #salary-slip-print-area {
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
            Salary Slip Generator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a staff member or fill manual values to generate a print-ready Salary Slip.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-xl shadow-md transition duration-200 hover:-translate-y-0.5"
        >
          <Printer className="w-4 h-4" />
          Print Salary Slip
        </button>
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
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Employee Name</label>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Employee ID</label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Pay Period / Month</label>
                  <input
                    type="text"
                    value={payPeriod}
                    onChange={(e) => setPayPeriod(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">Work Days</label>
                    <input
                      type="number"
                      value={workingDays}
                      onChange={(e) => setWorkingDays(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-slate-400">Present Days</label>
                    <input
                      type="number"
                      value={presentDays}
                      onChange={(e) => setPresentDays(parseInt(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Earnings Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Earnings (₹)</h3>
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
                  <label className="text-[10px] font-semibold text-slate-400">Dearness Allowance (DA)</label>
                  <input
                    type="number"
                    value={da}
                    onChange={(e) => setDa(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Medical Allowance</label>
                  <input
                    type="number"
                    value={medicalAllowance}
                    onChange={(e) => setMedicalAllowance(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Conveyance Allowance</label>
                  <input
                    type="number"
                    value={conveyanceAllowance}
                    onChange={(e) => setConveyanceAllowance(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Special Allowance</label>
                  <input
                    type="number"
                    value={specialAllowance}
                    onChange={(e) => setSpecialAllowance(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
              </div>
            </div>

            {/* Deductions Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Deductions (₹)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Provident Fund (PF)</label>
                  <input
                    type="number"
                    value={pf}
                    onChange={(e) => setPf(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Professional Tax</label>
                  <input
                    type="number"
                    value={professionalTax}
                    onChange={(e) => setProfessionalTax(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Income Tax (TDS)</label>
                  <input
                    type="number"
                    value={tds}
                    onChange={(e) => setTds(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Other Deductions</label>
                  <input
                    type="number"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(parseInt(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
              </div>
            </div>

            {/* Payment Details Form */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Payment Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-semibold text-slate-400">Payment Mode</label>
                  <input
                    type="text"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. State Bank of India"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">UTR / Transaction ID</label>
                  <input
                    type="text"
                    value={utrId}
                    onChange={(e) => setUtrId(e.target.value)}
                    placeholder="Transaction ID"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
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
              Live Preview
            </div>

            {/* Format Selector Toggle */}
            <div className="flex gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setSlipFormat("slip")}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  slipFormat === "slip"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Detailed Slip
              </button>
              <button
                type="button"
                onClick={() => setSlipFormat("certificate")}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-200 ${
                  slipFormat === "certificate"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Short Certificate
              </button>
            </div>
          </div>

          <div
            id="salary-slip-print-area"
            className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 max-w-[800px] mx-auto text-slate-800 font-sans"
          >
            {slipFormat === "slip" ? (
              <>
                {/* ── FORMAT 1: DETAILED SALARY SLIP ── */}
                {/* Header */}
                <div className="flex items-center justify-between gap-4 border-b-2 border-slate-900 pb-4">
                  <div className="flex items-center gap-4 text-left">
                    <img 
                      src="https://sdpublic.org/assets/img/logo.png" 
                      alt="SDPS Logo" 
                      className="w-16 h-16 object-contain"
                    />
                    <div>
                      <h2 className="text-xl font-extrabold tracking-wide text-slate-900 leading-tight">
                        S.D. PUBLIC SCHOOL
                      </h2>
                      <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                        Patna-7, Bihar
                      </p>
                      <p className="text-[9px] font-semibold text-slate-500 italic mt-0.5">
                        Empowering Generations Since 1994
                      </p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="inline-block px-3 py-1.5 border border-slate-950 font-black text-[10px] tracking-widest bg-slate-50 uppercase rounded">
                      SALARY SLIP
                    </div>
                    <p className="text-xs font-bold text-slate-800 block">
                      Month: {payPeriod}
                    </p>
                  </div>
                </div>

                {/* Employee Details Grid */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-1 tracking-wider uppercase">
                    Employee Details
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Employee Name</span>
                      <span className="font-bold text-slate-900">{employeeName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Designation</span>
                      <span className="font-bold text-slate-900">{designation}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Employee ID</span>
                      <span className="font-bold text-slate-900">{employeeId}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Department</span>
                      <span className="font-bold text-slate-900">{department}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Pay Period</span>
                      <span className="font-bold text-slate-900">{payPeriod}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Working / Present Days</span>
                      <span className="font-bold text-slate-900">{workingDays} / {presentDays}</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-dashed border-slate-400"></div>

                {/* Financial Grid (Earnings vs Deductions) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Earnings Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-1 tracking-wider uppercase">
                      Earnings
                    </h3>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-left font-bold text-slate-500">
                          <th className="pb-1 font-semibold">Particulars</th>
                          <th className="pb-1 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1">Basic Salary</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(basicSalary)}</td>
                        </tr>
                        <tr>
                          <td className="py-1">House Rent Allowance (HRA)</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(hra)}</td>
                        </tr>
                        <tr>
                          <td className="py-1">Dearness Allowance (DA)</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(da)}</td>
                        </tr>
                        <tr>
                          <td className="py-1">Medical Allowance</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(medicalAllowance)}</td>
                        </tr>
                        <tr>
                          <td className="py-1">Conveyance Allowance</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(conveyanceAllowance)}</td>
                        </tr>
                        <tr>
                          <td className="py-1">Special Allowance</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(specialAllowance)}</td>
                        </tr>
                        <tr className="border-t border-slate-900 font-bold bg-slate-50">
                          <td className="py-1.5 pl-1 text-slate-900 font-bold">Gross Salary</td>
                          <td className="py-1.5 pr-1 text-right text-slate-900 font-bold">{formatCurrency(grossSalary)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Deductions Table */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-1 tracking-wider uppercase">
                      Deductions
                    </h3>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-left font-bold text-slate-500">
                          <th className="pb-1 font-semibold">Particulars</th>
                          <th className="pb-1 text-right font-semibold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-1">Provident Fund (PF)</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(pf)}</td>
                        </tr>
                        <tr>
                          <td className="py-1">Professional Tax</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(professionalTax)}</td>
                        </tr>
                        <tr>
                          <td className="py-1">Income Tax (TDS)</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(tds)}</td>
                        </tr>
                        <tr>
                          <td className="py-1">Other Deductions</td>
                          <td className="py-1 text-right font-semibold">{formatCurrency(otherDeductions)}</td>
                        </tr>
                        {/* Empty spacer rows to align with earnings height */}
                        <tr>
                          <td className="py-1 text-transparent">Sp</td>
                          <td className="py-1 text-right text-transparent">0</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-transparent">Sp</td>
                          <td className="py-1 text-right text-transparent">0</td>
                        </tr>
                        <tr className="border-t border-slate-900 font-bold bg-slate-50">
                          <td className="py-1.5 pl-1 text-slate-900 font-bold">Total Deductions</td>
                          <td className="py-1.5 pr-1 text-right text-slate-900 font-bold">{formatCurrency(totalDeductions)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-dashed border-slate-400"></div>

                {/* Net Salary Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Net Payable Salary</span>
                    <span className="text-xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(netSalary)}/-</span>
                  </div>
                  <div className="text-right md:max-w-md">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Amount in Words</span>
                    <span className="text-xs font-bold text-slate-800 italic leading-relaxed block">{amountInWords}</span>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-dashed border-slate-400"></div>

                {/* Payment Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 border-b border-slate-900 pb-1 tracking-wider uppercase">
                    Payment Details
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Payment Mode</span>
                      <span className="font-bold text-slate-900">{paymentMode}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Bank Name</span>
                      <span className="font-bold text-slate-900">{bankName || "__________________"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">Account Number</span>
                      <span className="font-bold text-slate-900">{accountNumber}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="font-semibold text-slate-500">UTR / Transaction ID</span>
                      <span className="font-bold text-slate-900">{utrId || "__________________"}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1 col-span-2">
                      <span className="font-semibold text-slate-500">Payment Date</span>
                      <span className="font-bold text-slate-900">{formatPaymentDate(paymentDate)}</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-dashed border-slate-400"></div>

                {/* Seal & Signatory Footer Block */}
                <div className="grid grid-cols-2 gap-4 text-xs pt-4">
                  <div className="space-y-4">
                    <span className="font-bold text-slate-900 block uppercase tracking-wider">School Seal</span>
                    <div className="w-24 h-24 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 select-none">
                      School Seal
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-between items-end h-28">
                    <span className="font-bold text-slate-900">For S.D. Public School, Patna-7</span>
                    <div className="w-48 border-t border-slate-900 text-center pt-1.5 mt-4">
                      <span className="font-bold text-[10px] text-slate-700 block uppercase">Authorized Signatory</span>
                      <span className="text-[9px] text-slate-500 block">(Managing Director / Principal Office)</span>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="my-5 border-t border-dashed border-slate-400"></div>

                {/* Footer Taglines */}
                <div className="text-center space-y-1">
                  <h4 className="text-xs font-bold tracking-widest text-slate-900">
                    S.D. PUBLIC SCHOOL, PATNA-7
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-500 tracking-wider">
                    Empowering Generations Since 1994
                  </p>
                  <p className="text-[9px] text-slate-400 mt-4 leading-normal">
                    This is a computer-generated salary slip and does not require a physical signature.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* ── FORMAT 2: SHORT SALARY CERTIFICATE ── */}
                {/* Header/Letterhead */}
                <div className="flex items-center gap-4 border-b-2 border-slate-900 pb-4">
                  <img 
                    src="https://sdpublic.org/assets/img/logo.png" 
                    alt="SDPS Logo" 
                    className="w-16 h-16 object-contain"
                  />
                  <div className="text-left">
                    <h2 className="text-xl font-extrabold tracking-wide text-slate-900 leading-tight">
                      S.D. PUBLIC SCHOOL
                    </h2>
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                      Patna-7, Bihar
                    </p>
                    <p className="text-[9px] font-semibold text-slate-500 italic mt-0.5">
                      Empowering Generations Since 1994
                    </p>
                  </div>
                </div>

                {/* Certificate Content */}
                <div className="space-y-6 pt-4 text-slate-950 leading-relaxed text-sm">
                  <div className="text-right text-xs font-semibold text-slate-600">
                    Date: {formatPaymentDate(paymentDate)}
                  </div>

                  <div className="text-center py-4">
                    <h3 className="text-base font-extrabold tracking-widest border-b-2 border-slate-900 pb-1.5 inline-block uppercase">
                      TO WHOMSOEVER IT MAY CONCERN
                    </h3>
                  </div>

                  <p className="indent-12 text-justify leading-loose">
                    This is to certify that Mr./Ms. <strong className="border-b border-slate-900 px-1.5">{employeeName}</strong> is working as <strong className="border-b border-slate-900 px-1.5">{designation}</strong> at S.D. Public School, Patna-7 on a full-time basis. The employee is drawing a monthly gross salary of <strong className="border-b border-slate-900 px-1.5">{formatCurrency(grossSalary)}/-</strong> ({grossSalaryWords}).
                  </p>

                  <p className="leading-loose">
                    This certificate is issued upon the employee’s request for official purposes.
                  </p>

                  {/* Certificate Signature */}
                  <div className="pt-16 text-right">
                    <p className="font-bold text-sm">For S.D. Public School, Patna-7</p>
                    <div className="w-56 ml-auto border-t border-slate-900 text-center pt-2 mt-20">
                      <span className="font-bold text-[10px] text-slate-700 block uppercase">Authorized Signatory</span>
                      <span className="text-[9px] text-slate-500 block">(Seal & Signature)</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminSalarySlip;
