import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  FileText, Printer, Copy, RefreshCw, Sparkles, Stamp, Award, ShieldCheck,
  Building, Calendar, CheckCircle2, User, FileSpreadsheet, Eye, Download,
  PenTool, Upload, Trash2, AlertCircle
} from "lucide-react";

const TEMPLATES = {
  custom: {
    id: "custom",
    name: "Custom Official Letter",
    subject: "Official Communication regarding School Academic Matters",
    salutation: "To Whom It May Concern,",
    body: `This is to officially inform that S.D. Public School, Patna continues to uphold the highest standards of academic excellence, discipline, and holistic student growth.\n\nWe request all concerned authorities and individuals to extend all necessary cooperation in this regard. Should you require further verification, please feel free to reach out to our office.`
  },
  bonafide: {
    id: "bonafide",
    name: "Student Bonafide Certificate",
    subject: "BONAFIDE STUDENT CERTIFICATE",
    salutation: "TO WHOM IT MAY CONCERN",
    body: `This is to certify that Master / Ms. {recipient} is a bonafide student of S.D. Public School, Patna, studying in Class {details} during the academic session 2026-2027.\n\nAccording to school records, his / her date of birth is {dob}. He / She bears a commendable moral character and diligent academic record. This certificate is issued upon request for official / bank / scholarship verification purposes.`
  },
  character: {
    id: "character",
    name: "Character & Conduct Certificate",
    subject: "CHARACTER & CONDUCT CERTIFICATE",
    salutation: "TO WHOM IT MAY CONCERN",
    body: `This is to certify that {recipient}, student of Class {details}, was enrolled at S.D. Public School, Patna. During his/her tenure at this institution, his/her conduct, discipline, and moral behavior have been found to be exemplary.\n\nHe/She actively participated in co-curricular and sports activities with enthusiasm. We wish him/her all success in future academic and career endeavors.`
  },
  fee_clearance: {
    id: "fee_clearance",
    name: "Fee Clearance Certificate",
    subject: "NO DUES & FEE CLEARANCE CERTIFICATE",
    salutation: "TO WHOM IT MAY CONCERN",
    body: `This is to certify that all tuition fees, examination fees, and miscellaneous dues for {recipient} (Adm No. / Class: {details}) have been fully cleared for the academic term 2026-2027 up to the current month.\n\nThere are no outstanding financial or library dues pending against the student as of date.`
  },
  notice: {
    id: "notice",
    name: "Official School Circular / Notice",
    subject: "CIRCULAR: Upcoming Parent-Teacher Meeting & Academic Evaluation",
    salutation: "Dear Parents / Guardians,",
    body: `We extend our warm greetings from S.D. Public School, Patna.\n\nThis is to notify all parents and guardians that an upcoming Parent-Teacher Meeting (PTM) has been scheduled to discuss the Mid-Term Academic Progress and holistic growth of students. Your presence is vital to help foster your ward's developmental progress.\n\nDate: {date}\nVenue: Main Auditorium, S.D. Public School Campus, Patna.\nTiming: 09:00 AM - 01:00 PM.`
  },
  experience: {
    id: "experience",
    name: "Staff Experience Certificate",
    subject: "WORK EXPERIENCE & RELIEVING CERTIFICATE",
    salutation: "TO WHOM IT MAY CONCERN",
    body: `This is to certify that {recipient} was employed with S.D. Public School, Patna as {details}. During his/her tenure, he/she performed all assigned teaching and administrative responsibilities with dedication, professionalism, and integrity.\n\nWe appreciate his/her valuable service to the institution and wish him/her every success in future endeavors.`
  }
};

export default function AdminLetterMaker() {
  const [templateKey, setTemplateKey] = useState("custom");
  const [refNo, setRefNo] = useState("SDPS/ADM/2026-27/084");
  const [letterDate, setLetterDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  });

  const [recipient, setRecipient] = useState("The Management\nHindustan Ventures Pvt. Ltd.");
  const [details, setDetails] = useState("Patna, Bihar");
  const [subject, setSubject] = useState("REQUEST FOR INDUSTRIAL VISIT TO YOUR PRINTING FACILITY");
  const [salutation, setSalutation] = useState("Respected Sir/Madam,");
  const [body, setBody] = useState(`We would like to request your kind permission to organise an educational industrial visit for our students to your printing facility on 20 August 2026.\n\nThe purpose of this visit is to provide our students with practical exposure to the printing industry, modern printing machinery, production workflow, quality control, and related technologies. We believe that witnessing these processes will enhance their understanding beyond the classroom and help them gain valuable insight into real-world industrial operations.\n\nWe would be grateful if your organisation could kindly permit our students and accompanying teachers to visit the facility and, if possible, arrange a brief orientation and interaction with your team.\n\nWe assure you that all participating students will maintain proper discipline and strictly follow the safety instructions and guidelines provided by your organisation throughout the visit.\n\nWe sincerely hope you will consider our request and provide our students with this valuable learning opportunity.\n\nThank you for your time and consideration. We look forward to your positive response.`);
  const [signatory, setSignatory] = useState("principal"); // principal, director, management, custom
  const [customSignatoryTitle, setCustomSignatoryTitle] = useState("Authorized Signatory");
  const [showStamp, setShowStamp] = useState(true);

  // Digital Signature State
  const [signaturePresets, setSignaturePresets] = useState(() => {
    try {
      const saved = localStorage.getItem("sdps_signature_presets");
      return saved ? JSON.parse(saved) : { principal: "", director: "", management: "", custom: "" };
    } catch {
      return { principal: "", director: "", management: "", custom: "" };
    }
  });

  const [signatureUrl, setSignatureUrl] = useState("");
  const [signatureHeight, setSignatureHeight] = useState(48);
  const [uploadingSignature, setUploadingSignature] = useState(false);

  const letterRef = useRef(null);

  // Load signature presets from database site-settings on mount
  useEffect(() => {
    api.get("/site-settings")
      .then((r) => {
        const s = r.data || {};
        setSignaturePresets((prev) => {
          const updated = {
            ...prev,
            principal: s.signature_principal || prev.principal || "",
            director: s.signature_director || prev.director || "",
            management: s.signature_management || prev.management || ""
          };
          try {
            localStorage.setItem("sdps_signature_presets", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      })
      .catch(() => {});
  }, []);

  // Update signatureUrl when preset role changes
  useEffect(() => {
    if (signatory === "principal") {
      setSignatureUrl(signaturePresets.principal || "");
    } else if (signatory === "director") {
      setSignatureUrl(signaturePresets.director || "");
    } else if (signatory === "management") {
      setSignatureUrl(signaturePresets.management || "");
    } else {
      setSignatureUrl(signaturePresets.custom || "");
    }
  }, [signatory, signaturePresets]);

  const handleTemplateChange = (key) => {
    setTemplateKey(key);
    const t = TEMPLATES[key];
    if (t) {
      setSubject(t.subject);
      setSalutation(t.salutation);
      setBody(t.body);
    }
  };

  const generateRefNo = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newRef = `SDPS/ADM/2026-27/${rand}`;
    setRefNo(newRef);
    toast.success(`Generated Ref No: ${newRef}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const fullText = `S.D. PUBLIC SCHOOL, PATNA\nRef No: ${refNo}\nDate: ${letterDate}\n\nTo,\n${recipient}\n${details}\n\nSubject: ${subject}\n\n${salutation}\n\n${formattedBody()}\n\nSincerely,\n${getSignatoryTitle()}`;
    navigator.clipboard.writeText(fullText);
    toast.success("Letter content copied to clipboard!");
  };

  const formattedBody = () => {
    return body
      .replace(/\{recipient\}/g, recipient || "[Recipient Name]")
      .replace(/\{details\}/g, details || "[Class/Details]")
      .replace(/\{date\}/g, letterDate || "[Date]")
      .replace(/\{dob\}/g, "15/08/2010");
  };

  const getSignatoryTitle = () => {
    switch (signatory) {
      case "principal":
        return "Principal / Head of Institution";
      case "director":
        return "Director / School Management";
      case "management":
        return "SDPS Management";
      case "custom":
        return customSignatoryTitle || "Authorized Signatory";
      default:
        return "Authorized Signatory";
    }
  };

  const handleSignatureFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSignature(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/admin/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const uploadedUrl = res.data.url;
      setSignatureUrl(uploadedUrl);

      // Save to active preset
      const nextPresets = { ...signaturePresets, [signatory]: uploadedUrl };
      setSignaturePresets(nextPresets);
      try {
        localStorage.setItem("sdps_signature_presets", JSON.stringify(nextPresets));
      } catch (err) {}

      // Save to database site-settings if principal, director, or management
      if (["principal", "director", "management"].includes(signatory)) {
        await api.put("/admin/site-settings", {
          [`signature_${signatory}`]: uploadedUrl
        });
      }

      toast.success(`Digital signature saved for ${signatory === "management" ? "SDPS Management" : signatory}!`);
    } catch (err) {
      toast.error("Failed to upload signature image.");
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleClearSignature = async () => {
    if (window.confirm(`Clear saved signature image for ${signatory === "management" ? "SDPS Management" : signatory}?`)) {
      const nextPresets = { ...signaturePresets, [signatory]: "" };
      setSignaturePresets(nextPresets);
      setSignatureUrl("");
      try {
        localStorage.setItem("sdps_signature_presets", JSON.stringify(nextPresets));
      } catch (err) {}

      if (["principal", "director", "management"].includes(signatory)) {
        try {
          await api.put("/admin/site-settings", {
            [`signature_${signatory}`]: ""
          });
          toast.success("Signature preset cleared on server.");
        } catch (err) {}
      }
    }
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleDownloadPdfBrowserless = async () => {
    setGeneratingPdf(true);
    try {
      const payload = {
        ref_no: refNo,
        date_str: letterDate,
        recipient,
        details,
        subject,
        salutation,
        body,
        signatory_title: getSignatoryTitle(),
        signature_url: signatureUrl,
        signature_height: signatureHeight,
        show_stamp: showStamp
      };

      const response = await api.post("/admin/letterhead/pdf", payload, {
        responseType: "blob"
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);
      const safeRef = refNo.replace(/\//g, "_");
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `SDPS_Letter_${safeRef}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success("A4 PDF generated & downloaded via Browserless!");
    } catch (err) {
      console.error("Browserless PDF generation error:", err);
      toast.error("Failed to generate PDF via Browserless. Using browser print fallback.");
      window.print();
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans text-slate-800 bg-slate-50 min-h-screen print:bg-white print:text-black print:p-0 print:m-0">
      {/* Strict CSS for A4 printing */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          header, aside, nav, footer, .print\\:hidden {
            display: none !important;
          }
          .letterhead-print-area {
            width: 210mm !important;
            height: 297mm !important;
            min-height: 297mm !important;
            max-height: 297mm !important;
            padding: 12mm 15mm !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
        }
      `}</style>

      {/* Non-printable Controls & Header */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Official Document Generator
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-headline">
              Official School Letterhead & Certificate Maker
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-medium">
              Generate, customize, and print official S.D. Public School letters, bonafide certificates, conduct documents, and notices with custom branding and digital seals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Copy className="w-4 h-4 text-blue-600" /> Copy Text
            </button>

            <button
              onClick={handleDownloadPdfBrowserless}
              disabled={generatingPdf}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Rendering PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" /> Download A4 PDF
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Letter
            </button>
          </div>
        </div>

        {/* Template Selector Bar */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Choose Official Document Template
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {Object.values(TEMPLATES).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateChange(t.id)}
                className={`p-3 rounded-2xl border text-left text-xs font-bold transition cursor-pointer flex flex-col justify-between ${
                  templateKey === t.id
                    ? "bg-blue-50 border-blue-500 text-blue-900 shadow-sm ring-1 ring-blue-500/30"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <span>{t.name}</span>
                {templateKey === t.id && (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 self-end mt-2" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Form Inputs & Live Letterhead Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:block">
        {/* Left Form Inputs (Hidden in Print) */}
        <div className="lg:col-span-5 space-y-5 print:hidden">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-blue-600" /> Letter Metadata & Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Reference Number</label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={generateRefNo}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 border border-slate-300 transition"
                    title="Generate Random Ref No"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Date of Issue</label>
                <input
                  type="text"
                  value={letterDate}
                  onChange={(e) => setLetterDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Recipient Name / Student / Organization</label>
              <textarea
                rows={2}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. The Management&#10;Hindustan Ventures Pvt. Ltd."
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 resize-y"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Class / Roll No / Designation / Address</label>
              <textarea
                rows={2}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="e.g. Class X - Sec A (Adm No: 2024-892)&#10;Boring Road, Patna"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 resize-y"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Subject Heading</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Salutation Line</label>
              <input
                type="text"
                value={salutation}
                onChange={(e) => setSalutation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Letter Body Paragraphs</label>
              <textarea
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs leading-relaxed focus:outline-none focus:border-blue-600 resize-y"
              />
              <span className="text-[10px] text-slate-500">Use &#123;recipient&#125;, &#123;details&#125;, &#123;date&#125; variables to auto-insert recipient details.</span>
            </div>
          </div>

          {/* Digital Signature Presets Widget */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wider flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-blue-600" /> Digital Signature Presets
            </h3>

            {/* Signature Role Presets Bar */}
            <div className="grid grid-cols-4 gap-1.5 text-[10px]">
              {[
                { id: "principal", label: "PRINCIPAL" },
                { id: "director", label: "DIRECTOR" },
                { id: "management", label: "SDPS MANAGEMENT" },
                { id: "custom", label: "CUSTOM" }
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSignatory(role.id)}
                  className={`py-2 px-1.5 rounded-xl font-bold uppercase transition border text-center cursor-pointer ${
                    signatory === role.id
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>

            {/* Custom Signatory Title Input */}
            {signatory === "custom" && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Custom Signatory Title</label>
                <input
                  type="text"
                  value={customSignatoryTitle}
                  onChange={(e) => setCustomSignatoryTitle(e.target.value)}
                  placeholder="e.g. Academic Coordinator"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>
            )}

            {/* Signature Image & Uploader */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600 uppercase tracking-wider">
                  {signatory === "management" ? "SDPS MANAGEMENT" : signatory} PRESET
                </span>
                {signatureUrl && (
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                  >
                    Delete Saved
                  </button>
                )}
              </div>

              {signatureUrl ? (
                <div className="flex items-center gap-3">
                  <img
                    src={signatureUrl}
                    alt="Loaded signature"
                    className="h-12 w-fit object-contain border border-slate-200 bg-white p-1 rounded-lg shadow-xs"
                    style={{ height: `${signatureHeight}px` }}
                  />
                  <span className="text-[10px] text-slate-500 font-medium">Loaded automatically</span>
                </div>
              ) : (
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  No signature image saved for {signatory === "management" ? "SDPS Management" : signatory} yet.
                </div>
              )}

              <div className="pt-2 border-t border-slate-200">
                <label className={`flex items-center justify-center gap-2 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition ${
                  uploadingSignature
                    ? "opacity-50 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                    : "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-xs"
                }`}>
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>{uploadingSignature ? "Uploading Signature..." : "Change / Replace Signature"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureFileChange}
                    disabled={uploadingSignature}
                    className="hidden"
                  />
                </label>
                <span className="text-[9.5px] text-slate-400 text-center block mt-1">Recommended: Transparent background PNG</span>
              </div>
            </div>

            {/* Signature Height Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">SIGNATURE HEIGHT</label>
                <span className="font-mono text-xs font-bold text-blue-600">{signatureHeight}PX</span>
              </div>
              <input
                type="range"
                min="24"
                max="100"
                value={signatureHeight}
                onChange={(e) => setSignatureHeight(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Stamp Toggle */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStamp(!showStamp)}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                  showStamp
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-slate-50 border-slate-300 text-slate-600"
                }`}
              >
                <Stamp className="w-3.5 h-3.5" />
                {showStamp ? "Official Seal Stamp Active" : "Official Seal Stamp Hidden"}
              </button>
            </div>
          </div>
        </div>

        {/* Right A4 Official Letterhead Live Preview */}
        <div className="lg:col-span-7 print:w-full print:m-0">
          <div className="print:hidden flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-600" /> A4 Letterhead Live Preview
            </span>
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600 shadow-xs">
              210mm x 297mm (A4 Standard)
            </span>
          </div>

          <div
            ref={letterRef}
            className="letterhead-print-area bg-white text-slate-900 rounded-2xl shadow-xl p-8 sm:p-10 min-h-[1020px] aspect-[210/297] flex flex-col justify-between relative overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 mx-auto"
            style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          >
            {/* Top Navy/Gold Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-[#0B1E40] via-[#0E3B91] to-amber-400"></div>

            {/* School Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#0B1E40] pb-3">
                <div className="flex items-center gap-3.5">
                  <img
                    src="https://res.cloudinary.com/drx3kb809/image/upload/v1782313772/sdps/misc/hffxigjkpw7cbc7cmdm5.jpg"
                    alt="SDPS Official Seal Logo"
                    className="object-contain shrink-0 rounded-full shadow-sm"
                    style={{ width: "72px", height: "72px", minWidth: "72px", minHeight: "72px", maxWidth: "72px", maxHeight: "72px" }}
                  />
                  <div className="space-y-0.5">
                    <h1 className="text-xl sm:text-2xl font-black text-[#0B1E40] tracking-tight uppercase" style={{ fontFamily: "serif" }}>
                      S.D. PUBLIC SCHOOL
                    </h1>
                    <p className="text-[11px] font-bold text-amber-700 tracking-wide uppercase">
                      SURYAMUNI DEVI PUBLIC SCHOOL • PATNA, BIHAR
                    </p>
                    <p className="text-[9.5px] text-slate-600 font-sans font-medium">
                      Operated by The Suryamuni Devi Foundation Trust
                    </p>
                    <p className="text-[9px] text-slate-500 font-sans max-w-md leading-tight">
                      Maurya Colony Near R.O.B Kumhrar Biscoman Golambar, Gulzarbagh Road, Patna, Bihar 800007
                    </p>
                  </div>
                </div>

                <div className="text-right text-[9.5px] font-sans text-slate-600 space-y-0.5 block shrink-0">
                  <div className="font-bold text-[#0B1E40]">Contact Desk:</div>
                  <div>Phone: +91 99551 90262</div>
                  <div>Email: helpdesk@sdpublic.org</div>
                  <div>Website: www.sdpublic.org</div>
                </div>
              </div>

              {/* Ref No & Date */}
              <div className="flex justify-between items-center text-xs font-sans font-bold text-slate-700 pt-1">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block font-mono">REFERENCE NO:</span>
                  <span className="font-mono text-[#0B1E40]">{refNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 uppercase text-[10px] block">DATE OF ISSUE:</span>
                  <span className="text-slate-900">{letterDate}</span>
                </div>
              </div>
            </div>

            {/* Background Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0">
              <img src="https://res.cloudinary.com/drx3kb809/image/upload/v1782313772/sdps/misc/hffxigjkpw7cbc7cmdm5.jpg" alt="Watermark" className="w-96 h-96 object-contain rounded-full" />
            </div>

            {/* Letter Content Body */}
            <div className="my-4 space-y-4 relative z-10 text-slate-900 leading-relaxed text-sm">
              {/* To Recipient Address Block */}
              {(recipient || details) && (
                <div className="space-y-0.5 font-sans text-xs text-slate-800 font-medium border-l-2 border-[#0B1E40] pl-3 py-1">
                  <div className="font-bold text-[#0B1E40] uppercase text-[11px] tracking-wider">TO,</div>
                  {recipient && <div className="font-bold text-slate-900 text-sm whitespace-pre-line">{recipient}</div>}
                  {details && <div className="text-slate-600 whitespace-pre-line">{details}</div>}
                </div>
              )}

              {/* Subject Box */}
              {subject && (
                <div className="text-center py-2 px-4 bg-slate-50 border-y border-slate-200 font-sans">
                  <span className="font-black text-[#0B1E40] text-xs sm:text-sm tracking-wide uppercase">
                    SUBJECT: {subject}
                  </span>
                </div>
              )}

              {/* Salutation */}
              <div className="font-bold text-slate-900 text-sm">
                {salutation}
              </div>

              {/* Formatted Body Paragraphs */}
              <div className="space-y-3 text-justify whitespace-pre-line text-[13px] leading-relaxed text-slate-800">
                {formattedBody()}
              </div>
            </div>

            {/* Bottom Footer & Signatures */}
            <div className="space-y-4 relative z-10 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-end">
                {/* Left Seal / Verification Note */}
                <div className="space-y-1 text-[9.5px] font-sans text-slate-500 max-w-xs">
                  <div className="flex items-center gap-1 text-emerald-700 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" /> Official Verified Document
                  </div>
                  <p>Valid only with official institutional seal and signature. Verified at S.D. Public School Patna Administrative Records.</p>
                </div>

                {/* Right Signature Block with Stamp */}
                <div className="text-center relative min-w-[180px]">
                  {showStamp && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 border-2 border-dashed border-amber-600/40 rounded-full flex flex-col items-center justify-center p-1 rotate-[-12deg] pointer-events-none bg-amber-500/5">
                      <div className="text-[7.5px] font-black text-amber-800 uppercase tracking-tighter text-center leading-none">
                        S.D. PUBLIC SCHOOL
                      </div>
                      <Award className="w-5 h-5 text-amber-700 my-0.5" />
                      <div className="text-[7px] font-bold text-amber-900 uppercase">
                        PATNA • SEAL
                      </div>
                    </div>
                  )}

                  <div className="h-14 flex items-center justify-center mb-1">
                    {signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="Digital Signature"
                        style={{ height: `${signatureHeight}px` }}
                        className="object-contain max-w-[200px]"
                      />
                    ) : (
                      <span className="font-serif italic text-lg text-indigo-900 font-bold border-b border-slate-400 px-4">
                        S.D. Public School
                      </span>
                    )}
                  </div>

                  <div className="font-sans font-extrabold text-xs text-[#0B1E40] pt-1 uppercase">
                    {getSignatoryTitle()}
                  </div>
                  <div className="text-[10px] font-sans text-slate-600 font-medium">
                    S.D. Public School, Patna
                  </div>
                </div>
              </div>

              {/* Footer Strip */}
              <div className="text-center text-[9px] font-sans text-slate-400 pt-2 border-t border-slate-100 flex justify-between items-center">
                <span>Empowering Generations Since 1994</span>
                <span>Page 1 of 1</span>
                <span>www.sdpublic.org</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
