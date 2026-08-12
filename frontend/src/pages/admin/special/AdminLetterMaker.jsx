import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  FileText, Printer, Copy, RefreshCw, Sparkles, Stamp, Award, ShieldCheck,
  Building, Calendar, CheckCircle2, User, FileSpreadsheet, Eye, Download
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

  const [recipient, setRecipient] = useState("Aarav Kumar");
  const [details, setDetails] = useState("Class X - Sec A (Adm No: 2024-892)");
  const [subject, setSubject] = useState(TEMPLATES.custom.subject);
  const [salutation, setSalutation] = useState(TEMPLATES.custom.salutation);
  const [body, setBody] = useState(TEMPLATES.custom.body);
  const [signatory, setSignatory] = useState("Principal");
  const [showStamp, setShowStamp] = useState(true);

  const letterRef = useRef(null);

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
      case "Principal":
        return "Principal / Head of Institution";
      case "Coordinator":
        return "Academic Coordinator";
      case "Administrator":
        return "Administrative Officer";
      case "Exam":
        return "Controller of Examinations";
      default:
        return "Authorized Signatory";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 font-sans text-slate-800 bg-slate-50 min-h-screen print:bg-white print:text-black print:p-0 print:m-0">
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
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Copy className="w-4 h-4 text-blue-600" /> Copy Text
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Official Letter
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Authorized Signatory</label>
                <select
                  value={signatory}
                  onChange={(e) => setSignatory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-blue-600 font-medium"
                >
                  <option value="Principal">Principal</option>
                  <option value="Coordinator">Academic Coordinator</option>
                  <option value="Administrator">Administrative Officer</option>
                  <option value="Exam">Controller of Examinations</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Official Stamp Overlay</label>
                <button
                  type="button"
                  onClick={() => setShowStamp(!showStamp)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    showStamp
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-slate-50 border-slate-300 text-slate-600"
                  }`}
                >
                  <Stamp className="w-3.5 h-3.5" />
                  {showStamp ? "Seal Stamp Active" : "Seal Stamp Hidden"}
                </button>
              </div>
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
            className="bg-white text-slate-900 rounded-2xl shadow-xl p-8 sm:p-12 min-h-[780px] flex flex-col justify-between relative overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-8"
            style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          >
            {/* Top Navy/Gold Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-[#0B1E40] via-[#0E3B91] to-amber-400"></div>

            {/* School Header */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b-2 border-[#0B1E40] pb-4">
                <div className="flex items-center gap-4">
                  <img
                    src="https://res.cloudinary.com/drx3kb809/image/upload/v1782313772/sdps/misc/hffxigjkpw7cbc7cmdm5.jpg"
                    alt="SDPS Official Seal Logo"
                    className="w-20 h-20 object-contain shrink-0 rounded-full shadow-sm"
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
                    <p className="text-[9.5px] text-slate-500 font-sans">
                      Maurya Colony Near R.O.B Kumhrar Biscoman Golambar, Gulzarbagh Road, Patna, Bihar 800007
                    </p>
                  </div>
                </div>

                <div className="text-right text-[10px] font-sans text-slate-600 space-y-0.5 hidden sm:block">
                  <div className="font-bold text-[#0B1E40]">Contact Desk:</div>
                  <div>Phone: +91 99551 90262</div>
                  <div>Email: helpdesk@sdpublic.org</div>
                  <div>Website: www.sdpublic.org</div>
                </div>
              </div>

              {/* Ref No & Date */}
              <div className="flex justify-between items-center text-xs font-sans font-bold text-slate-700 pt-1">
                <div>
                  <span className="text-slate-500 uppercase text-[10px] block font-mono">Reference No:</span>
                  <span className="font-mono text-[#0B1E40]">{refNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 uppercase text-[10px] block">Date of Issue:</span>
                  <span className="text-slate-900">{letterDate}</span>
                </div>
              </div>
            </div>

            {/* Background Watermark Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-0">
              <img src="https://res.cloudinary.com/drx3kb809/image/upload/v1782313772/sdps/misc/hffxigjkpw7cbc7cmdm5.jpg" alt="Watermark" className="w-96 h-96 object-contain rounded-full" />
            </div>

            {/* Letter Content Body */}
            <div className="my-6 space-y-5 relative z-10 text-slate-900 leading-relaxed text-sm">
              {/* To Recipient Address Block */}
              {(recipient || details) && (
                <div className="space-y-0.5 font-sans text-xs text-slate-800 font-medium border-l-2 border-[#0B1E40] pl-3 py-1">
                  <div className="font-bold text-[#0B1E40] uppercase text-[11px] tracking-wider">To,</div>
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
              <div className="space-y-4 text-justify whitespace-pre-line text-sm leading-relaxed text-slate-800">
                {formattedBody()}
              </div>
            </div>

            {/* Bottom Footer & Signatures */}
            <div className="space-y-6 relative z-10 pt-8 border-t border-slate-200">
              <div className="flex justify-between items-end">
                {/* Left Seal / Verification Note */}
                <div className="space-y-1 text-[10px] font-sans text-slate-500 max-w-xs">
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

                  <div className="h-12 flex items-center justify-center">
                    <span className="font-serif italic text-lg text-indigo-900 font-bold border-b border-slate-400 px-4">
                      S.D. Public School
                    </span>
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
