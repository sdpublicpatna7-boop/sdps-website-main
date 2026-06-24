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
  const [history, setHistory] = useState([]);
  const [showSignatures, setShowSignatures] = useState(true);

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

  const fetchHistory = async () => {
    try {
      const res = await api.get("/admin/salary-slips");
      setHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load salary slip history", err);
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

  const handleSave = async () => {
    const payload = {
      employee_name: employeeName,
      designation: designation,
      employee_id: employeeId,
      department: department,
      pay_period: payPeriod,
      working_days: workingDays,
      present_days: presentDays,
      basic_salary: basicSalary,
      hra: hra,
      da: da,
      medical_allowance: medicalAllowance,
      conveyance_allowance: conveyanceAllowance,
      special_allowance: specialAllowance,
      pf: pf,
      professional_tax: professionalTax,
      tds: tds,
      other_deductions: otherDeductions,
      gross_salary: grossSalary,
      total_deductions: totalDeductions,
      net_salary: netSalary,
      payment_mode: paymentMode,
      bank_name: bankName,
      account_number: accountNumber,
      utr_id: utrId,
      payment_date: paymentDate,
      slip_format: "slip"
    };

    try {
      setLoading(true);
      await api.post("/admin/salary-slips", payload);
      toast.success("Salary slip saved to database successfully");
      fetchHistory();
    } catch (err) {
      console.error("Failed to save salary slip", err);
      toast.error("Failed to save salary slip to database");
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    const email = window.prompt("Enter the employee's email address to send this Salary Slip:");
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
        employee_id: employeeId,
        department: department,
        pay_period: payPeriod,
        working_days: workingDays,
        present_days: presentDays,
        basic_salary: basicSalary,
        hra: hra,
        da: da,
        medical_allowance: medicalAllowance,
        conveyance_allowance: conveyanceAllowance,
        special_allowance: specialAllowance,
        pf: pf,
        professional_tax: professionalTax,
        tds: tds,
        other_deductions: otherDeductions,
        gross_salary: grossSalary,
        total_deductions: totalDeductions,
        net_salary: netSalary,
        amount_in_words: amountInWords,
        payment_mode: paymentMode,
        bank_name: bankName,
        account_number: accountNumber,
        utr_id: utrId,
        payment_date: formatPaymentDate(paymentDate)
      }
    };

    try {
      setLoading(true);
      await api.post("/admin/salary-slips/send-email", payload);
      toast.success(`Salary slip successfully sent to ${email} via MailerCloud!`);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this salary slip record?")) return;
    try {
      await api.delete(`/admin/salary-slips/${id}`);
      toast.success("Salary slip deleted successfully");
      fetchHistory();
    } catch (err) {
      console.error("Failed to delete salary slip", err);
      toast.error("Failed to delete salary slip");
    }
  };

  const handleLoad = (item) => {
    setEmployeeName(item.employee_name || "");
    setDesignation(item.designation || "");
    setEmployeeId(item.employee_id || "");
    setDepartment(item.department || "");
    setPayPeriod(item.pay_period || "");
    setWorkingDays(item.working_days || 0);
    setPresentDays(item.present_days || 0);
    
    setBasicSalary(item.basic_salary || 0);
    setHra(item.hra || 0);
    setDa(item.da || 0);
    setMedicalAllowance(item.medical_allowance || 0);
    setConveyanceAllowance(item.conveyance_allowance || 0);
    setSpecialAllowance(item.special_allowance || 0);

    setPf(item.pf || 0);
    setProfessionalTax(item.professional_tax || 0);
    setTds(item.tds || 0);
    setOtherDeductions(item.other_deductions || 0);

    setPaymentMode(item.payment_mode || "");
    setBankName(item.bank_name || "");
    setAccountNumber(item.account_number || "");
    setUtrId(item.utr_id || "");
    setPaymentDate(item.payment_date || "");
    
    // Auto-select "manual" teacher mode since custom values have been loaded
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
          #salary-slip-print-area, #salary-slip-print-area * {
            visibility: visible;
          }
          #salary-slip-print-area {
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
          /* Compress spacing on print to guarantee 1-page fit */
          #salary-slip-print-area .my-5 {
            margin-top: 0.5rem !important;
            margin-bottom: 0.5rem !important;
          }
          #salary-slip-print-area .py-1 {
            padding-top: 0.15rem !important;
            padding-bottom: 0.15rem !important;
          }
          #salary-slip-print-area .py-1.5 {
            padding-top: 0.25rem !important;
            padding-bottom: 0.25rem !important;
          }
          #salary-slip-print-area h3 {
            padding-bottom: 0.15rem !important;
          }
          #salary-slip-print-area .p-8 {
            padding: 0.5rem !important;
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
            Print Salary Slip
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
          </div>

          <div
            id="salary-slip-print-area"
            className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 max-w-[800px] mx-auto text-slate-800 font-sans"
          >
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
            <div className="space-y-3 mt-4">
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
            <div className="grid grid-cols-2 gap-8 items-start">
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
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-row justify-between items-center gap-2">
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

            {/* Signature & Seal Block */}
            {showSignatures ? (
              <div className="grid grid-cols-2 gap-4 text-xs pt-2 pb-6">
                <div className="space-y-2">
                  <div className="w-20 h-20 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 select-none">
                    School Seal
                  </div>
                </div>
                <div className="text-right flex flex-col justify-end items-end h-20">
                  <span className="font-bold text-slate-950">For S.D. Public School, Patna-7</span>
                  <div className="w-48 border-t border-slate-900 text-center pt-1.5 mt-10">
                    <span className="font-bold text-[10px] text-slate-700 block uppercase">Authorized Signatory</span>
                    <span className="text-[9px] text-slate-500 block">(Seal & Signature)</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Footer Taglines */}
            <div className="text-center space-y-1">
              <h4 className="text-xs font-bold tracking-widest text-slate-900">
                S.D. PUBLIC SCHOOL, PATNA-7
              </h4>
              <p className="text-[10px] font-semibold text-slate-500 tracking-wider">
                Empowering Generations Since 1994
              </p>
              {!showSignatures && (
                <p className="text-[9px] text-slate-400 mt-4 leading-normal">
                  This is a computer-generated salary slip and does not require a physical signature.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Log Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-orange" />
            Generated Salary Slips History
          </h2>
          <span className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-full font-bold text-slate-500 uppercase tracking-wider">
            {history.length} Saved Records
          </span>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 font-medium">
            No salary slip records saved in database yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Date Generated</th>
                  <th className="px-4 py-3">Employee Name</th>
                  <th className="px-4 py-3">Designation / ID</th>
                  <th className="px-4 py-3">Pay Period</th>
                  <th className="px-4 py-3">Net Salary</th>
                  <th className="px-4 py-3">Format</th>
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
                    <td className="px-4 py-3">
                      <span className="font-semibold">{item.designation}</span>
                      <span className="text-[10px] text-slate-400 block">{item.employee_id}</span>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-600">
                      {item.pay_period}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {formatCurrency(item.net_salary)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        item.slip_format === "certificate" 
                          ? "bg-purple-50 text-purple-600 border border-purple-100" 
                          : "bg-blue-50 text-blue-600 border border-blue-100"
                      }`}>
                        {item.slip_format === "certificate" ? "Certificate" : "Detailed"}
                      </span>
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

export default AdminSalarySlip;
