import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  FileText, Printer, Copy, RefreshCw, Sparkles, Stamp, Award, ShieldCheck,
  Building, Calendar, CheckCircle2, User, FileSpreadsheet, Eye, Download,
  PenTool, Upload, Trash2, AlertCircle, SlidersHorizontal, Space, ArrowDown,
  Table, Plus, Grid, LayoutGrid, AlignLeft, AlignCenter, Rows, Columns, Check, ChevronDown, List,
  Save, FolderOpen, Search, X, Clock, Edit3, PlusCircle, ArrowRight
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

const TABLE_PRESETS = {
  fee: {
    name: "💰 Fee Details",
    title: "DETAILS OF APPLICABLE FEES & CHARGES",
    headers: ["S.No", "Fee Head / Description", "Amount (₹)", "Due Date"],
    rows: [
      ["1", "Quarterly Tuition Fee (Q3)", "₹ 7,500.00", "15 Oct 2026"],
      ["2", "Annual Activity & Exam Fee", "₹ 2,200.00", "20 Oct 2026"],
      ["3", "Computer Lab & Smart Class", "₹ 1,100.00", "25 Oct 2026"],
    ]
  },
  exam: {
    name: "📅 Exam Schedule",
    title: "HALF-YEARLY EXAMINATION TIMETABLE (2026-27)",
    headers: ["Date & Day", "Subject", "Class / Section", "Timings"],
    rows: [
      ["12/10/2026 (Mon)", "Mathematics", "Class VI - X", "08:30 AM - 11:30 AM"],
      ["14/10/2026 (Wed)", "Science & Tech", "Class VI - X", "08:30 AM - 11:30 AM"],
      ["16/10/2026 (Fri)", "English Language", "Class VI - X", "08:30 AM - 11:30 AM"],
      ["19/10/2026 (Mon)", "Social Studies", "Class VI - X", "08:30 AM - 11:30 AM"],
    ]
  },
  students: {
    name: "🏆 Student Roster",
    title: "LIST OF MERIT CANDIDATES / AWARDEES",
    headers: ["Roll No", "Student Name", "Class & Sec", "Award / Result"],
    rows: [
      ["101", "Aarav Sharma", "Class VIII-A", "1st Rank (98.4%)"],
      ["105", "Priyanshu Verma", "Class VIII-A", "2nd Rank (96.8%)"],
      ["112", "Ananya Mishra", "Class VIII-B", "3rd Rank (95.2%)"],
    ]
  },
  itinerary: {
    name: "⏱️ Event Itinerary",
    title: "SCHEDULE OF EVENTS & ACTIVITIES",
    headers: ["Time", "Activity / Program", "In-Charge", "Venue"],
    rows: [
      ["09:00 AM", "Inauguration & Prayer", "Principal / Vice Principal", "School Ground"],
      ["10:00 AM", "Inter-House Debate Finals", "Language Department", "Auditorium"],
      ["12:30 PM", "Prize Distribution & Address", "Chief Guest / Director", "Main Stage"],
    ]
  },
  blank: {
    name: "📋 Blank Grid",
    title: "",
    headers: ["Column 1", "Column 2", "Column 3"],
    rows: [
      ["Item 1", "Details 1", "Value 1"],
      ["Item 2", "Details 2", "Value 2"],
    ]
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

  // Table Generator States
  const [showTable, setShowTable] = useState(false);
  const [tableTitle, setTableTitle] = useState("SCHEDULE / PARTICULARS TABLE");
  const [tableHeaders, setTableHeaders] = useState(["S.No", "Particulars / Head", "Class / Section", "Due Date / Timings"]);
  const [tableRows, setTableRows] = useState([
    ["1", "Term-I Academic Fee", "Class VI - X", "15 Oct 2026"],
    ["2", "Annual Examination & Activity", "Class VI - X", "20 Oct 2026"],
    ["3", "Science Lab & Computer", "Class IX - X", "25 Oct 2026"],
  ]);
  const [tableStyle, setTableStyle] = useState("boxed"); // "boxed" | "striped" | "minimal"
  const [tableHeaderBg, setTableHeaderBg] = useState("navy"); // "navy" | "slate" | "amber" | "white"
  const [tableAlign, setTableAlign] = useState("left"); // "left" | "center"
  const [tableFontSize, setTableFontSize] = useState(11);

  // Font Size & Typography Control States
  const [bodyFontSize, setBodyFontSize] = useState(13);
  const [subjectFontSize, setSubjectFontSize] = useState(13);
  const [recipientFontSize, setRecipientFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(1.6);

  // Vertical Gap & Layout Spacing States
  const [sectionGap, setSectionGap] = useState(12);
  const [paragraphGap, setParagraphGap] = useState(10);
  const [pushFooterToBottom, setPushFooterToBottom] = useState(false);

  // Database Save / Load States
  const [savedLetters, setSavedLetters] = useState([]);
  const [activeSavedId, setActiveSavedId] = useState(null);
  const [loadingSavedList, setLoadingSavedList] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedSearchQuery, setSavedSearchQuery] = useState("");
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState(null);

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

  // Fetch saved letters from MongoDB
  const fetchSavedLetters = async () => {
    setLoadingSavedList(true);
    try {
      const res = await api.get("/admin/letterhead/saved");
      setSavedLetters(res.data || []);
    } catch (err) {
      console.error("Failed to load saved letters:", err);
    } finally {
      setLoadingSavedList(false);
    }
  };

  useEffect(() => {
    fetchSavedLetters();
  }, []);

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

  const handleSaveToDatabase = async (forceNewCopy = false) => {
    setSavingDoc(true);
    try {
      const targetId = forceNewCopy ? null : activeSavedId;
      const payload = {
        id: targetId,
        ref_no: refNo,
        letter_date: letterDate,
        template_key: templateKey,
        recipient,
        details,
        subject,
        salutation,
        body,
        signatory,
        custom_signatory_title: customSignatoryTitle,
        signature_url: signatureUrl,
        signature_height: signatureHeight,
        show_stamp: showStamp,
        body_font_size: bodyFontSize,
        subject_font_size: subjectFontSize,
        recipient_font_size: recipientFontSize,
        line_height: lineHeight,
        section_gap: sectionGap,
        paragraph_gap: paragraphGap,
        push_footer_bottom: pushFooterToBottom,
        // Table support
        show_table: showTable,
        table_title: tableTitle,
        table_headers: tableHeaders,
        table_rows: tableRows,
        table_style: tableStyle,
        table_header_bg: tableHeaderBg,
        table_align: tableAlign,
        table_font_size: tableFontSize
      };

      const res = await api.post("/admin/letterhead/save", payload);
      const savedDoc = res.data.document;
      setActiveSavedId(savedDoc.id);
      setLastSavedTimestamp(new Date());
      toast.success(forceNewCopy ? "Saved as a new document copy in database!" : "Letterhead document saved successfully!");
      fetchSavedLetters();
    } catch (err) {
      console.error("Failed to save letterhead to database:", err);
      toast.error(err?.response?.data?.detail || "Failed to save letterhead document to database.");
    } finally {
      setSavingDoc(false);
    }
  };

  const handleLoadSavedLetter = (doc) => {
    setActiveSavedId(doc.id);
    setRefNo(doc.ref_no || "");
    setLetterDate(doc.letter_date || "");
    setTemplateKey(doc.template_key || "custom");
    setRecipient(doc.recipient || "");
    setDetails(doc.details || "");
    setSubject(doc.subject || "");
    setSalutation(doc.salutation || "");
    setBody(doc.body || "");
    setSignatory(doc.signatory || "principal");
    setCustomSignatoryTitle(doc.custom_signatory_title || "");
    setSignatureUrl(doc.signature_url || "");
    setSignatureHeight(doc.signature_height || 48);
    setShowStamp(doc.show_stamp !== undefined ? doc.show_stamp : true);
    setBodyFontSize(doc.body_font_size || 13);
    setSubjectFontSize(doc.subject_font_size || 13);
    setRecipientFontSize(doc.recipient_font_size || 12);
    setLineHeight(doc.line_height || 1.6);
    setSectionGap(doc.section_gap || 12);
    setParagraphGap(doc.paragraph_gap || 10);
    setPushFooterToBottom(doc.push_footer_bottom || false);
    setShowTable(Boolean(doc.show_table));
    setTableTitle(doc.table_title || "");
    setTableHeaders(doc.table_headers || ["S.No", "Particulars", "Class", "Remarks"]);
    setTableRows(doc.table_rows || []);
    setTableStyle(doc.table_style || "boxed");
    setTableHeaderBg(doc.table_header_bg || "navy");
    setTableAlign(doc.table_align || "left");
    setTableFontSize(doc.table_font_size || 11);
    setLastSavedTimestamp(doc.updated_at ? new Date(doc.updated_at) : new Date());
    setShowSavedModal(false);
    toast.success(`Loaded saved letter: ${doc.ref_no}`);
  };

  const handleDeleteSavedLetter = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to permanently delete this saved letterhead document from database?")) return;
    try {
      await api.delete(`/admin/letterhead/saved/${id}`);
      if (activeSavedId === id) {
        setActiveSavedId(null);
      }
      toast.success("Saved document deleted.");
      fetchSavedLetters();
    } catch (err) {
      toast.error("Failed to delete saved document.");
    }
  };

  const handleDuplicateSavedLetter = (doc, e) => {
    e.stopPropagation();
    handleLoadSavedLetter(doc);
    setActiveSavedId(null);
    generateRefNo();
    toast.info("Duplicated as a new letterhead draft. Click 'Save to Database' when ready.");
  };

  const handleNewLetter = () => {
    if (activeSavedId && !window.confirm("Start a new document draft? Unsaved changes will be cleared from editor.")) {
      return;
    }
    setActiveSavedId(null);
    setTemplateKey("custom");
    const t = TEMPLATES.custom;
    setSubject(t.subject);
    setSalutation(t.salutation);
    setBody(t.body);
    setRecipient("The Management\nHindustan Ventures Pvt. Ltd.");
    setDetails("Patna, Bihar");
    generateRefNo();
    setShowTable(false);
    toast.info("Started new letterhead draft.");
  };

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

  const applyTablePreset = (key) => {
    const p = TABLE_PRESETS[key];
    if (p) {
      setShowTable(true);
      setTableTitle(p.title);
      setTableHeaders([...p.headers]);
      setTableRows(p.rows.map(r => [...r]));
      toast.success(`Applied ${p.name} preset!`);
    }
  };

  const handleAddColumn = () => {
    if (tableHeaders.length >= 6) {
      toast.error("Maximum 6 columns allowed on A4 portrait letterhead.");
      return;
    }
    const newColNum = tableHeaders.length + 1;
    setTableHeaders(prev => [...prev, `Column ${newColNum}`]);
    setTableRows(prev => prev.map(row => [...row, ""]));
    toast.success("Added new column");
  };

  const handleRemoveColumn = (colIdx) => {
    if (tableHeaders.length <= 1) {
      toast.error("At least 1 column is required.");
      return;
    }
    setTableHeaders(prev => prev.filter((_, idx) => idx !== colIdx));
    setTableRows(prev => prev.map(row => row.filter((_, idx) => idx !== colIdx)));
  };

  const handleHeaderChange = (colIdx, val) => {
    setTableHeaders(prev => {
      const next = [...prev];
      next[colIdx] = val;
      return next;
    });
  };

  const handleAddRow = () => {
    setTableRows(prev => [...prev, tableHeaders.map(() => "")]);
  };

  const handleRemoveRow = (rowIdx) => {
    setTableRows(prev => prev.filter((_, idx) => idx !== rowIdx));
  };

  const handleCellChange = (rowIdx, colIdx, val) => {
    setTableRows(prev => {
      const next = prev.map(r => [...r]);
      if (next[rowIdx]) {
        next[rowIdx][colIdx] = val;
      }
      return next;
    });
  };

  const handleClearRows = () => {
    if (window.confirm("Clear all data rows from the table?")) {
      setTableRows([]);
    }
  };

  const bodyTextareaRef = useRef(null);

  const insertTokenIntoBody = (token) => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setBody((prev) => prev + `\n\n${token}\n\n`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = body;
    const before = currentVal.substring(0, start);
    const after = currentVal.substring(end);
    const newVal = `${before}\n\n${token}\n\n${after}`;
    setBody(newVal);
    if (token.includes("table")) {
      setShowTable(true);
    }
    toast.success(`Inserted ${token} tag in letter body!`);
    setTimeout(() => {
      textarea.focus();
      const newPos = start + token.length + 4;
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const handleCopyText = () => {
    let tableText = "";
    if (showTable && tableHeaders.length > 0 && tableRows.length > 0) {
      const headerLine = tableHeaders.join(" | ");
      const separatorLine = tableHeaders.map(() => "---").join(" | ");
      const rowLines = tableRows.map(r => r.join(" | ")).join("\n");
      tableText = `\n\n${tableTitle ? `${tableTitle}\n` : ""}${headerLine}\n${separatorLine}\n${rowLines}\n\n`;
    }

    let finalBody = formattedBodyText();
    const tableRegex = /\{\{?table\}\}?|\[\[?table\]\]?/i;
    if (showTable) {
      if (tableRegex.test(finalBody)) {
        finalBody = finalBody.replace(tableRegex, tableText);
      } else {
        finalBody += tableText;
      }
    } else {
      finalBody = finalBody.replace(tableRegex, "");
    }

    const fullText = `S.D. PUBLIC SCHOOL, PATNA\nRef No: ${refNo}\nDate: ${letterDate}\n\nTo,\n${recipient}\n${details}\n\nSubject: ${subject}\n\n${salutation}\n\n${finalBody}\n\nSincerely,\n${getSignatoryTitle()}`;
    navigator.clipboard.writeText(fullText);
    toast.success("Letter content copied to clipboard!");
  };

  const formattedBodyText = () => {
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
        show_stamp: showStamp,
        body_font_size: bodyFontSize,
        subject_font_size: subjectFontSize,
        recipient_font_size: recipientFontSize,
        line_height: lineHeight,
        section_gap: sectionGap,
        paragraph_gap: paragraphGap,
        push_footer_bottom: pushFooterToBottom,
        // Table support
        show_table: showTable,
        table_title: tableTitle,
        table_headers: tableHeaders,
        table_rows: tableRows,
        table_style: tableStyle,
        table_header_bg: tableHeaderBg,
        table_align: tableAlign,
        table_font_size: tableFontSize
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

  const renderTablePreview = () => {
    if (!showTable || tableHeaders.length === 0) return null;

    const getHeaderBgClass = () => {
      switch (tableHeaderBg) {
        case "navy":
          return "bg-[#0B1E40] text-white";
        case "slate":
          return "bg-slate-800 text-white";
        case "amber":
          return "bg-amber-100 text-amber-900 border-b border-amber-300";
        case "white":
          return "bg-slate-100 text-slate-900 border-b-2 border-slate-300";
        default:
          return "bg-[#0B1E40] text-white";
      }
    };

    const isBoxed = tableStyle === "boxed";
    const isStriped = tableStyle === "striped";
    const isMinimal = tableStyle === "minimal";

    return (
      <div className="my-3 font-sans w-full overflow-hidden">
        {tableTitle && (
          <div
            className={`font-bold text-[#0B1E40] uppercase tracking-wide mb-1.5 ${
              tableAlign === "center" ? "text-center" : "text-left"
            }`}
            style={{ fontSize: `${tableFontSize + 1}px` }}
          >
            {tableTitle}
          </div>
        )}
        <div className={`overflow-x-auto rounded-lg ${isMinimal ? "border-y border-slate-300" : "border border-slate-300"}`}>
          <table
            className="w-full border-collapse"
            style={{ fontSize: `${tableFontSize}px` }}
          >
            <thead>
              <tr className={getHeaderBgClass()}>
                {tableHeaders.map((header, hIdx) => (
                  <th
                    key={hIdx}
                    className={`py-2 px-3 font-bold tracking-wider uppercase text-[10px] ${
                      tableAlign === "center" ? "text-center" : "text-left"
                    } ${isBoxed ? "border border-slate-300" : isStriped ? "border-b border-slate-300" : "border-b-2 border-slate-300"}`}
                  >
                    {header || `Col ${hIdx + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={tableHeaders.length}
                    className="py-3 text-center text-slate-400 italic text-xs bg-slate-50"
                  >
                    No data rows added yet.
                  </td>
                </tr>
              ) : (
                tableRows.map((row, rIdx) => {
                  const rowBg = isStriped
                    ? rIdx % 2 === 1
                      ? "bg-slate-50/90"
                      : "bg-white"
                    : "bg-white";

                  return (
                    <tr
                      key={rIdx}
                      className={`${rowBg} ${
                        isMinimal
                          ? "border-b border-slate-200 last:border-b-0"
                          : "border-b border-slate-200"
                      }`}
                    >
                      {tableHeaders.map((_, cIdx) => (
                        <td
                          key={cIdx}
                          className={`py-1.5 px-3 text-slate-800 leading-snug ${
                            tableAlign === "center" ? "text-center" : "text-left"
                          } ${
                            isBoxed ? "border border-slate-200" : ""
                          }`}
                        >
                          {row[cIdx] || "-"}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const bodyParagraphs = formattedBodyText().split("\n\n").filter((p) => p.trim());

  const filteredSavedLetters = savedLetters.filter((doc) => {
    if (!savedSearchQuery.trim()) return true;
    const q = savedSearchQuery.toLowerCase();
    return (
      (doc.subject && doc.subject.toLowerCase().includes(q)) ||
      (doc.ref_no && doc.ref_no.toLowerCase().includes(q)) ||
      (doc.recipient && doc.recipient.toLowerCase().includes(q)) ||
      (doc.letter_date && doc.letter_date.toLowerCase().includes(q)) ||
      (doc.created_by && doc.created_by.toLowerCase().includes(q))
    );
  });

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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleSaveToDatabase(false)}
              disabled={savingDoc}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {savingDoc ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save to Database
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                fetchSavedLetters();
                setShowSavedModal(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span>Saved Letters</span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">
                {savedLetters.length}
              </span>
            </button>

            <button
              type="button"
              onClick={handleNewLetter}
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Start Blank Draft"
            >
              <PlusCircle className="w-4 h-4 text-slate-600" /> New
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Copy className="w-4 h-4 text-blue-600" /> Copy Text
            </button>

            <button
              type="button"
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
              type="button"
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
          </div>
        </div>

        {/* Active Saved Document Indicator Banner */}
        {activeSavedId && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-emerald-950 font-bold text-xs">
              <div className="p-1.5 bg-emerald-200/60 rounded-xl text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span>
                  Editing Saved Database Record: <span className="font-mono text-emerald-800 bg-white px-2 py-0.5 rounded-lg border border-emerald-300 shadow-xs">{refNo}</span>
                </span>
                {lastSavedTimestamp && (
                  <span className="text-[11px] text-emerald-700 font-normal block sm:inline sm:ml-2">
                    (Last saved {lastSavedTimestamp.toLocaleTimeString()})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleSaveToDatabase(false)}
                disabled={savingDoc}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                {savingDoc ? "Updating..." : "Update Record"}
              </button>
              <button
                type="button"
                onClick={() => handleSaveToDatabase(true)}
                disabled={savingDoc}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Save as New Copy
              </button>
              <button
                type="button"
                onClick={handleNewLetter}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                title="Start Blank Draft"
              >
                <PlusCircle className="w-3.5 h-3.5" /> New Draft
              </button>
            </div>
          </div>
        )}

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

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-bold text-slate-700">Letter Body Paragraphs</label>
                <button
                  type="button"
                  onClick={() => insertTokenIntoBody("{table}")}
                  className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Insert {table} tag at cursor position to render data table at that exact position"
                >
                  <Table className="w-3.5 h-3.5 text-blue-600" />
                  <span>+ Insert Table in Middle</span>
                </button>
              </div>
              <textarea
                ref={bodyTextareaRef}
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs leading-relaxed focus:outline-none focus:border-blue-600 resize-y font-normal"
              />
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-500">
                  Insert <code className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold border border-blue-200">&#123;table&#125;</code> anywhere in body to position table in middle.
                </span>
                <div className="flex items-center gap-1">
                  {["{table}", "{recipient}", "{details}", "{date}"].map((token) => (
                    <button
                      key={token}
                      type="button"
                      onClick={() => insertTokenIntoBody(token)}
                      className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 border border-slate-200 transition cursor-pointer"
                    >
                      +{token}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Data Table & Schedule Builder Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-600" /> Data Table & Schedule
              </h2>
              <button
                type="button"
                onClick={() => setShowTable(!showTable)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  showTable
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                {showTable ? "Table Active" : "Add Table"}
              </button>
            </div>

            {showTable && (
              <div className="space-y-4 pt-1">
                {/* Table Presets */}
                <div className="space-y-1.5">
                  <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider block">
                    Quick Table Presets
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {Object.entries(TABLE_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyTablePreset(key)}
                        className="py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-900 font-bold text-[11px] transition text-left cursor-pointer flex items-center justify-between"
                      >
                        <span>{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Title */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Table Heading / Title (Optional)</label>
                  <input
                    type="text"
                    value={tableTitle}
                    onChange={(e) => setTableTitle(e.target.value)}
                    placeholder="e.g. DETAILS OF APPLICABLE FEES"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold uppercase focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Table Style & Format Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Border Style</label>
                    <select
                      value={tableStyle}
                      onChange={(e) => setTableStyle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="boxed">Boxed (Grid)</option>
                      <option value="striped">Striped Rows</option>
                      <option value="minimal">Minimal Lines</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Header Color</label>
                    <select
                      value={tableHeaderBg}
                      onChange={(e) => setTableHeaderBg(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-medium focus:outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="navy">Navy (#0B1E40)</option>
                      <option value="slate">Slate Gray</option>
                      <option value="amber">Amber Gold</option>
                      <option value="white">Clean Light</option>
                    </select>
                  </div>

                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Alignment</label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setTableAlign("left")}
                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          tableAlign === "left"
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <AlignLeft className="w-3 h-3" /> Left
                      </button>
                      <button
                        type="button"
                        onClick={() => setTableAlign("center")}
                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1 cursor-pointer ${
                          tableAlign === "center"
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <AlignCenter className="w-3 h-3" /> Center
                      </button>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-3 space-y-1 pt-1 border-t border-slate-200">
                    <div className="flex justify-between items-center text-xs">
                      <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Table Font Size</label>
                      <span className="font-mono text-xs font-bold text-blue-600">{tableFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="9"
                      max="14"
                      value={tableFontSize}
                      onChange={(e) => setTableFontSize(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Columns Manager */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Columns className="w-3.5 h-3.5 text-blue-600" /> Columns ({tableHeaders.length}/6)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      disabled={tableHeaders.length >= 6}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" /> Add Column
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {tableHeaders.map((header, colIdx) => (
                      <div key={colIdx} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1.5">
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                          placeholder={`Col ${colIdx + 1}`}
                          className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                        />
                        {tableHeaders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveColumn(colIdx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                            title="Delete Column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rows & Data Manager */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Rows className="w-3.5 h-3.5 text-blue-600" /> Data Rows ({tableRows.length})
                    </label>
                    <div className="flex items-center gap-1.5">
                      {tableRows.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearRows}
                          className="px-2 py-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 text-[10px] font-bold transition cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddRow}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Row
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {tableRows.length === 0 ? (
                      <div className="p-4 text-center border-2 border-dashed border-slate-200 rounded-2xl text-xs text-slate-500">
                        No data rows added yet. Click &quot;+ Add Row&quot; or pick a preset above.
                      </div>
                    ) : (
                      tableRows.map((row, rowIdx) => (
                        <div key={rowIdx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                            <span>ROW #{rowIdx + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rowIdx)}
                              className="text-slate-400 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Remove
                            </button>
                          </div>
                          <div className={`grid gap-1.5 ${tableHeaders.length > 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"}`}>
                            {tableHeaders.map((header, colIdx) => (
                              <input
                                key={colIdx}
                                type="text"
                                value={row[colIdx] || ""}
                                onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                                placeholder={header || `Col ${colIdx + 1}`}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-blue-600"
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Inline Placement Helper Tip */}
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Insert in Middle Tip:
                    </div>
                    <p className="text-slate-600 leading-relaxed">
                      Place <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-700 font-mono font-bold">&#123;table&#125;</code> anywhere in the Letter Body text to place the table between paragraphs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => insertTokenIntoBody("{table}")}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shrink-0 shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Insert &#123;table&#125; in Body
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Typography & Spacing Controls */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wider flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" /> Typography & Vertical Gap Controls
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">BODY FONT SIZE</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{bodyFontSize}PX</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="18"
                  value={bodyFontSize}
                  onChange={(e) => setBodyFontSize(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">SUBJECT FONT SIZE</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{subjectFontSize}PX</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="18"
                  value={subjectFontSize}
                  onChange={(e) => setSubjectFontSize(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">RECIPIENT FONT SIZE</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{recipientFontSize}PX</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="16"
                  value={recipientFontSize}
                  onChange={(e) => setRecipientFontSize(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">LINE SPACING</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{lineHeight}</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="2.2"
                  step="0.1"
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">SECTION GAP</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{sectionGap}PX</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="32"
                  value={sectionGap}
                  onChange={(e) => setSectionGap(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">PARAGRAPH GAP</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{paragraphGap}PX</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="24"
                  value={paragraphGap}
                  onChange={(e) => setParagraphGap(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Footer Bottom Alignment Toggle */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPushFooterToBottom(!pushFooterToBottom)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  pushFooterToBottom
                    ? "bg-indigo-50 border-indigo-300 text-indigo-900"
                    : "bg-slate-50 border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-indigo-600" />
                  <span>Push Signatory Footer to Bottom of Page</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200">
                  {pushFooterToBottom ? "ACTIVE (Bottom)" : "OFF (Compact)"}
                </span>
              </button>
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
            className="letterhead-print-area bg-white text-slate-900 rounded-2xl shadow-xl p-8 sm:p-10 min-h-[1020px] aspect-[210/297] flex flex-col relative overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none print:p-0 print:m-0 mx-auto"
            style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
          >
            {/* Top Navy/Gold Accent Bar */}
            <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-[#0B1E40] via-[#0E3B91] to-amber-400"></div>

            {/* School Header */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-[#0B1E40] pb-3" style={{ marginBottom: `${sectionGap}px` }}>
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
              <div className="flex justify-between items-center text-xs font-sans font-bold text-slate-700 pt-1" style={{ marginBottom: `${sectionGap}px` }}>
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
            <div className="relative z-10 text-slate-900" style={{ margin: `${sectionGap}px 0` }}>
              {/* To Recipient Address Block */}
              {(recipient || details) && (
                <div
                  className="space-y-0.5 font-sans font-medium border-l-2 border-[#0B1E40] pl-3 py-1"
                  style={{ fontSize: `${recipientFontSize}px`, marginBottom: `${sectionGap}px` }}
                >
                  <div className="font-bold text-[#0B1E40] uppercase tracking-wider" style={{ fontSize: `${Math.max(10, recipientFontSize - 1)}px` }}>TO,</div>
                  {recipient && <div className="font-bold text-slate-900 whitespace-pre-line" style={{ fontSize: `${recipientFontSize + 2}px` }}>{recipient}</div>}
                  {details && <div className="text-slate-600 whitespace-pre-line" style={{ fontSize: `${recipientFontSize}px` }}>{details}</div>}
                </div>
              )}

              {/* Subject Box */}
              {subject && (
                <div
                  className="text-center py-2 px-4 bg-slate-50 border-y border-slate-200 font-sans"
                  style={{ fontSize: `${subjectFontSize}px`, margin: `${sectionGap}px 0` }}
                >
                  <span className="font-black text-[#0B1E40] tracking-wide uppercase">
                    SUBJECT: {subject}
                  </span>
                </div>
              )}

              {/* Salutation */}
              <div className="font-bold text-slate-900" style={{ fontSize: `${bodyFontSize}px`, marginBottom: `${sectionGap}px` }}>
                {salutation}
              </div>

              {/* Formatted Body Paragraphs & Table Rendering */}
              <div
                className="text-justify text-slate-800"
                style={{ fontSize: `${bodyFontSize}px`, lineHeight: lineHeight }}
              >
                {(() => {
                  const rawText = formattedBodyText();
                  const tableRegex = /\{\{?table\}\}?|\[\[?table\]\]?/i;
                  const hasTableToken = tableRegex.test(rawText);

                  if (showTable && hasTableToken) {
                    const parts = rawText.split(tableRegex);
                    return (
                      <>
                        {parts.map((part, pIdx) => {
                          const paragraphs = part.split("\n\n").filter((p) => p.trim());
                          return (
                            <div key={pIdx}>
                              {paragraphs.map((p, idx) => (
                                <p key={idx} style={{ marginBottom: `${paragraphGap}px` }}>
                                  {p}
                                </p>
                              ))}
                              {/* Render the table between parts (not after the final trailing part) */}
                              {pIdx < parts.length - 1 && renderTablePreview()}
                            </div>
                          );
                        })}
                      </>
                    );
                  }

                  // Default mode: no table token in body
                  const cleanedText = showTable ? rawText : rawText.replace(tableRegex, "");
                  const paragraphs = cleanedText.split("\n\n").filter((p) => p.trim());
                  return (
                    <>
                      {paragraphs.map((p, idx) => (
                        <p key={idx} style={{ marginBottom: `${paragraphGap}px` }}>
                          {p}
                        </p>
                      ))}
                      {/* If table is enabled but no token placed in text, append at bottom */}
                      {showTable && (
                        <div style={{ marginTop: `${paragraphGap + 2}px`, marginBottom: `${paragraphGap}px` }}>
                          {renderTablePreview()}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Bottom Footer & Signatures */}
            <div
              className="space-y-4 relative z-10 pt-4 border-t border-slate-200"
              style={{ marginTop: pushFooterToBottom ? "auto" : `${sectionGap * 2}px` }}
            >
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

      {/* Saved Letterhead Documents Modal */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-2xl">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Saved Official Letters & Documents
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-mono font-bold">
                      {savedLetters.length}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Saved official letters and documents stored securely in school database.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Actions Bar */}
            <div className="p-4 border-b border-slate-100 bg-white flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={savedSearchQuery}
                  onChange={(e) => setSavedSearchQuery(e.target.value)}
                  placeholder="Search by Subject, Ref No, Recipient..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-medium"
                />
                {savedSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setSavedSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={fetchSavedLetters}
                  disabled={loadingSavedList}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                  title="Refresh List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingSavedList ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleNewLetter();
                    setShowSavedModal(false);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Start New Draft
                </button>
              </div>
            </div>

            {/* Saved List Content */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {loadingSavedList ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                  <p className="text-xs font-medium">Loading saved letters from database...</p>
                </div>
              ) : filteredSavedLetters.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FolderOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {savedSearchQuery ? "No matching letters found" : "No saved letterhead documents yet"}
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      {savedSearchQuery
                        ? "Try searching with a different keyword or clear the search bar."
                        : "Create letters and click 'Save to Database' to build your school records archive."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredSavedLetters.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        activeSavedId === doc.id
                          ? "bg-blue-50/70 border-blue-300 ring-1 ring-blue-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md border border-blue-200">
                            {doc.ref_no || "SDPS/ADM/---"}
                          </span>
                          <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-slate-400" /> {doc.letter_date || "No date"}
                          </span>
                          {doc.show_table && (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold flex items-center gap-1">
                              <Table className="w-3 h-3" /> Includes Table
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {doc.template_key || "custom"}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {doc.subject || "[No Subject Heading]"}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                          {doc.recipient && (
                            <span className="truncate max-w-xs text-slate-700 font-medium">
                              <span className="text-slate-400 font-normal">To: </span>
                              {doc.recipient.split("\n")[0]}
                            </span>
                          )}
                          {doc.created_by && (
                            <span className="text-[11px] text-slate-400">
                              By: {doc.created_by}
                            </span>
                          )}
                          {doc.updated_at && (
                            <span className="text-[10.5px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-300" />
                              {new Date(doc.updated_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                              })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Item Actions */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLoadSavedLetter(doc)}
                          className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Load
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDuplicateSavedLetter(doc, e)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
                          title="Clone as New Letter"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteSavedLetter(doc.id, e)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Delete from Database"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
              <span>Showing {filteredSavedLetters.length} of {savedLetters.length} saved records</span>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
