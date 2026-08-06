import { useEffect, useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import api, { getBackendUrl } from "@/lib/api";
import { toast } from "sonner";
import { 
  Printer, FileText, Save, Send, Trash, Plus, RotateCcw, AlertTriangle, Shield, FileUp, PenTool, Table, Lightbulb,
  Type, Palette, Highlighter, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Sparkles
} from "lucide-react";

function formatNoticeTextToHtml(rawText) {
  if (!rawText) return "";

  let text = rawText
    .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
    .replace(/\[bg=(.*?)\](.*?)\[\/bg\]/gi, '<mark style="background-color:$1;padding:1px 4px;border-radius:3px">$2</mark>')
    .replace(/\[size=(.*?)\](.*?)\[\/size\]/gi, '<span style="font-size:$1">$2</span>')
    .replace(/\[font=(.*?)\](.*?)\[\/font\]/gi, '<span style="font-family:$1">$2</span>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  const lines = text.split("\n");
  const processed = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      return `<li style="margin-left: 1.25rem; list-style-type: disc;">${trimmed.substring(2)}</li>`;
    }
    if (/^\d+\.\s/.test(trimmed)) {
      return `<li style="margin-left: 1.25rem; list-style-type: decimal;">${trimmed.replace(/^\d+\.\s/, '')}</li>`;
    }
    if (!trimmed) {
      return `<div style="height: 0.4rem;"></div>`;
    }
    return `<div>${line}</div>`;
  });

  return processed.join("");
}

export function AdminNoticeMaker() {
  const { settings } = useOutletContext() || {};
  const [loading, setLoading] = useState(false);
  
  // School Logo formatting
  const logoUrl = settings?.logo_url || "";
  const BACKEND_URL = getBackendUrl();
  const formattedLogo = logoUrl
    ? (logoUrl.startsWith("http") ? logoUrl : `${BACKEND_URL.replace(/\/+$/, "")}${logoUrl.startsWith("/") ? logoUrl : "/" + logoUrl}`)
    : "";

  // Form State
  const [noticeTitle, setNoticeTitle] = useState("NOTICE");
  const [subject, setSubject] = useState("Subject: Extension of Summer Vacation");
  const [refNo, setRefNo] = useState("Ref No: SDPS/2026-27/045");
  
  // Default to today's date in YYYY-MM-DD
  const todayIso = new Date().toISOString().split("T")[0];
  const [noticeDate, setNoticeDate] = useState(todayIso);

  // Default notice body template
  const defaultBody = `This is to inform all students, parents, and staff members that S.D. Public School will remain closed from June 26, 2026 to July 05, 2026 due to the prevailing extreme heatwave conditions in Patna.

Online classes will be conducted during this period as per the schedule provided by respective class teachers. 

The school office will remain open for administrative work and registration of new admissions between 08:30 AM and 12:30 PM. Parents and visitors are requested to contact the helpline numbers for any queries.

Normal offline classes will resume from July 06, 2026, subject to weather conditions.

All students are advised to stay indoors, drink plenty of water, and utilize this time for school homework and project completion.`;

  const [bodyText, setBodyText] = useState(defaultBody);
  const [signatoryHeader, setSignatoryHeader] = useState("By Order:");
  const [signatoryAuthority, setSignatoryAuthority] = useState("Principal");
  
  // Customization Options
  const [showWatermark, setShowWatermark] = useState(true);
  const [showSealBox, setShowSealBox] = useState(true);
  const [fontSize, setFontSize] = useState("sm"); // xs, sm, md, lg
  const [lineHeight, setLineHeight] = useState("relaxed"); // snug, normal, relaxed, loose
  const [letterheadHeader, setLetterheadHeader] = useState(true);

  // Table Configuration Options
  const [showTable, setShowTable] = useState(false);
  const [tableHeaders, setTableHeaders] = useState(["Time", "Roll Numbers"]);
  const [tableRows, setTableRows] = useState([
    ["08:00 AM – 09:00 AM", "Roll No. 01 – 10"],
    ["09:00 AM – 10:00 AM", "Roll No. 11 – 20"],
    ["10:00 AM – 11:00 AM", "Roll No. 21 onwards"]
  ]);
  const [tableStyle, setTableStyle] = useState("dividers"); // "dividers", "boxed"
  const [tableHeaderBg, setTableHeaderBg] = useState("none"); // "none", "light-grey", "brand-blue", "brand-orange"
  const [tableAlign, setTableAlign] = useState("left"); // "left", "center", "right"

  // Ref & MS Word Formatting Helpers for Notice Body Description
  const bodyTextareaRef = useRef(null);

  const applyFormat = (prefix, suffix = "", defaultPlaceholder = "") => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const sel = bodyText.substring(start, end);
    const textToWrap = sel || defaultPlaceholder || "word";

    const replacement = `${prefix}${textToWrap}${suffix}`;
    const updated = bodyText.substring(0, start) + replacement + bodyText.substring(end);
    setBodyText(updated);

    setTimeout(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = newStart + textToWrap.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 30);
  };

  // Signature Presets & Configuration
  const [selectedRolePreset, setSelectedRolePreset] = useState("principal"); // principal, director, management, custom
  const [signatureUrl, setSignatureUrl] = useState("");
  const [sigHeight, setSigHeight] = useState(48); // range from 32 to 80
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  
  const [signaturePresets, setSignaturePresets] = useState(() => {
    try {
      const saved = localStorage.getItem("sdps_signature_presets");
      return saved ? JSON.parse(saved) : { principal: "", director: "", management: "" };
    } catch {
      return { principal: "", director: "", management: "" };
    }
  });

  // Save presets whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("sdps_signature_presets", JSON.stringify(signaturePresets));
    } catch (err) {
      console.error("Failed to save signature presets", err);
    }
  }, [signaturePresets]);

  // Load signature presets from database site-settings on mount
  useEffect(() => {
    api.get("/admin/site-settings")
      .then(r => {
        const s = r.data || {};
        setSignaturePresets(prev => {
          const next = {
            ...prev,
            principal: s.signature_principal || prev.principal || "",
            director: s.signature_director || prev.director || "",
            management: s.signature_management || prev.management || "",
          };
          return next;
        });
      })
      .catch((err) => {
        console.error("Failed to fetch signature presets from database:", err);
      });
  }, []);

  // Sync active signature and signatory names on preset select
  useEffect(() => {
    if (selectedRolePreset === "principal") {
      setSignatoryHeader("By Order:");
      setSignatoryAuthority("Principal");
      setSignatureUrl(signaturePresets.principal || "");
    } else if (selectedRolePreset === "director") {
      setSignatoryHeader("By Order:");
      setSignatoryAuthority("Director");
      setSignatureUrl(signaturePresets.director || "");
    } else if (selectedRolePreset === "management") {
      setSignatoryHeader("By Order:");
      setSignatoryAuthority("Management");
      setSignatureUrl(signaturePresets.management || "");
    } else if (selectedRolePreset === "custom") {
      // Keep custom text, clear signature
      setSignatureUrl("");
    }
  }, [selectedRolePreset, signaturePresets]);

  // Auto-Counting Reference Number Configuration
  const [autoRefEnabled, setAutoRefEnabled] = useState(true);
  const [refPrefix, setRefPrefix] = useState("SDPS/2026-27/");
  const [refLocked, setRefLocked] = useState(false);
  const [refSerial, setRefSerial] = useState(() => {
    try {
      const saved = localStorage.getItem("sdps_notice_serial");
      return saved ? parseInt(saved) : 45;
    } catch {
      return 45;
    }
  });

  // Save serial to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("sdps_notice_serial", refSerial.toString());
    } catch (err) {
      console.error("Failed to save serial counter", err);
    }
  }, [refSerial]);

  const finalizeRefNo = () => {
    if (autoRefEnabled && !refLocked) {
      const generated = `Ref No: ${refPrefix}${refSerial.toString().padStart(3, "0")}`;
      setRefNo(generated);
      setRefLocked(true);
      setRefSerial(prev => prev + 1);
      return generated;
    }
    return refNo;
  };

  // Drafts Database & Cloud History
  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem("sdps_notice_drafts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load drafts from Database on mount & auto-migrate any existing local storage drafts to MongoDB
  useEffect(() => {
    api.get("/admin/notice-drafts")
      .then(async (r) => {
        let dbDrafts = Array.isArray(r.data) ? r.data : [];
        
        try {
          const localSaved = localStorage.getItem("sdps_notice_drafts");
          const localDrafts = localSaved ? JSON.parse(localSaved) : [];
          
          if (localDrafts.length > 0) {
            const dbIds = new Set(dbDrafts.map(d => d.id));
            const unmigrated = localDrafts.filter(d => !dbIds.has(d.id));
            
            for (const d of unmigrated) {
              await api.post("/admin/notice-drafts", d).catch(() => {});
            }

            if (unmigrated.length > 0) {
              const updatedR = await api.get("/admin/notice-drafts").catch(() => null);
              if (updatedR && Array.isArray(updatedR.data)) {
                dbDrafts = updatedR.data;
              }
            }
          }
        } catch (e) {
          console.error("Auto-migration error:", e);
        }

        setDrafts(dbDrafts);
      })
      .catch((err) => {
        console.error("Failed to fetch drafts from database:", err);
      });
  }, []);

  // Save drafts to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem("sdps_notice_drafts", JSON.stringify(drafts));
    } catch (err) {
      console.error("Failed to save drafts to local storage", err);
    }
  }, [drafts]);

  // Helper to format date (YYYY-MM-DD -> DD / MM / YYYY)
  const formatDate = (dateStr) => {
    if (!dateStr) return "___ / ___ / 2026";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const fullUrl = (u) => {
    if (!u) return "";
    if (u.startsWith("http") || u.startsWith("data:")) return u;
    const BACKEND_URL = getBackendUrl();
    return `${BACKEND_URL.replace(/\/+$/, "")}${u.startsWith("/") ? u : "/" + u}`;
  };

  const handlePrint = () => {
    finalizeRefNo();
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Save draft to Database & Local Cache
  const handleSaveDraft = async () => {
    const newDraft = {
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      noticeTitle,
      subject,
      refNo,
      noticeDate,
      bodyText,
      signatoryHeader,
      signatoryAuthority,
      showWatermark,
      showSealBox,
      fontSize,
      lineHeight,
      letterheadHeader,
      selectedRolePreset,
      signatureUrl,
      sigHeight,
      autoRefEnabled,
      refPrefix,
      refSerial,
      refLocked,
      pdfUrl,
      showTable,
      tableHeaders,
      tableRows,
      tableStyle,
      tableHeaderBg,
      tableAlign
    };

    setDrafts(prev => [newDraft, ...prev.filter(d => d.id !== newDraft.id && (d.noticeTitle !== noticeTitle || d.subject !== subject))]);
    
    try {
      await api.post("/admin/notice-drafts", newDraft);
      toast.success("Draft saved successfully to Database & Cloud!");
    } catch (err) {
      toast.success("Draft saved to browser storage!");
    }
  };

  const handleLoadDraft = (item) => {
    setNoticeTitle(item.noticeTitle || "NOTICE");
    setSubject(item.subject || "");
    setRefNo(item.refNo || "");
    setNoticeDate(item.noticeDate || todayIso);
    setBodyText(item.bodyText || "");
    setSignatoryHeader(item.signatoryHeader || "By Order:");
    setSignatoryAuthority(item.signatoryAuthority || "Principal");
    setShowWatermark(item.showWatermark !== undefined ? item.showWatermark : true);
    setShowSealBox(item.showSealBox !== undefined ? item.showSealBox : true);
    setFontSize(item.fontSize || "sm");
    setLineHeight(item.lineHeight || "relaxed");
    setLetterheadHeader(item.letterheadHeader !== undefined ? item.letterheadHeader : true);
    setSelectedRolePreset(item.selectedRolePreset || "custom");
    setSignatureUrl(item.signatureUrl || "");
    setSigHeight(item.sigHeight || 48);
    setAutoRefEnabled(item.autoRefEnabled !== undefined ? item.autoRefEnabled : true);
    setRefPrefix(item.refPrefix || "SDPS/2026-27/");
    setRefSerial(item.refSerial || 45);
    setRefLocked(item.refLocked || false);
    setPdfUrl(item.pdfUrl || "");
    setShowTable(item.showTable !== undefined ? item.showTable : false);
    setTableHeaders(item.tableHeaders || ["Time", "Roll Numbers"]);
    setTableRows(item.tableRows || [
      ["08:00 AM – 09:00 AM", "Roll No. 01 – 10"],
      ["09:00 AM – 10:00 AM", "Roll No. 11 – 20"],
      ["10:00 AM – 11:00 AM", "Roll No. 21 onwards"]
    ]);
    setTableStyle(item.tableStyle || "dividers");
    setTableHeaderBg(item.tableHeaderBg || "none");
    setTableAlign(item.tableAlign || "left");
    toast.success("Draft loaded into notice editor!");
  };

  const handleDeleteDraft = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    setDrafts(prev => prev.filter(d => d.id !== id));
    try {
      await api.delete(`/admin/notice-drafts/${id}`);
      toast.success("Draft removed from Database & Cloud");
    } catch (err) {
      toast.success("Draft removed from local storage");
    }
  };

  const handleReset = () => {
    if (!window.confirm("Reset all fields to default template?")) return;
    setNoticeTitle("NOTICE");
    setSubject("Subject: Extension of Summer Vacation");
    setRefNo("Ref No: SDPS/2026-27/045");
    setNoticeDate(todayIso);
    setBodyText(defaultBody);
    setSignatoryHeader("By Order:");
    setSignatoryAuthority("Principal");
    setShowWatermark(true);
    setShowSealBox(true);
    setFontSize("sm");
    setLineHeight("relaxed");
    setLetterheadHeader(true);
    setSelectedRolePreset("principal");
    setSignatureUrl(signaturePresets.principal || "");
    setSigHeight(48);
    setAutoRefEnabled(true);
    setRefPrefix("SDPS/2026-27/");
    setRefLocked(false);
    setPdfUrl("");
    setShowTable(false);
    setTableHeaders(["Time", "Roll Numbers"]);
    setTableRows([
      ["08:00 AM – 09:00 AM", "Roll No. 01 – 10"],
      ["09:00 AM – 10:00 AM", "Roll No. 11 – 20"],
      ["10:00 AM – 11:00 AM", "Roll No. 21 onwards"]
    ]);
    setTableStyle("dividers");
    setTableHeaderBg("none");
    setTableAlign("left");
    toast.success("Notice editor reset to defaults!");
  };

  const handleUploadSignature = async (file) => {
    const fd = new FormData();
    fd.append("sub_dir", "signatures");
    fd.append("file", file);
    setUploadingSignature(true);
    try {
      const r = await api.post("/admin/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = r.data.url;
      // Save it to presets
      setSignaturePresets(prev => {
        const next = { ...prev, [selectedRolePreset]: url };
        return next;
      });
      setSignatureUrl(url);
      
      // Save signature preset to backend database site-settings
      await api.put("/admin/site-settings", {
        [`signature_${selectedRolePreset}`]: url
      });
      
      toast.success(`${selectedRolePreset} signature uploaded and saved for future use!`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload signature. Ensure it is a valid PNG image.");
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleUploadPdf = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Please select a valid PDF file.");
      return;
    }
    const fd = new FormData();
    fd.append("sub_dir", "notices");
    fd.append("max_mb", "10");
    fd.append("file", file);
    setUploadingPdf(true);
    try {
      const r = await api.post("/admin/upload-file", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = r.data.url;
      setPdfUrl(url);
      toast.success("PDF attached successfully!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to upload PDF.");
    } finally {
      setUploadingPdf(false);
    }
  };

  // Publish to backend Notice Board
  const handlePublish = async () => {
    if (!window.confirm("Are you sure you want to publish this notice to the website notices board? It will be visible to the public immediately.")) return;
    
    const finalRef = finalizeRefNo();
    
    let tableMarkdown = "";
    if (showTable && tableRows.length > 0) {
      const headersPart = `| ${tableHeaders.join(" | ")} |`;
      const alignmentPart = `| ${tableHeaders.map(() => tableAlign === "center" ? ":---:" : tableAlign === "right" ? "---:" : ":---").join(" | ")} |`;
      const rowsPart = tableRows.map(row => `| ${row.map((cell, colIdx) => colIdx === 0 ? `**${cell}**` : cell).join(" | ")} |`).join("\n");
      tableMarkdown = `\n\n${headersPart}\n${alignmentPart}\n${rowsPart}\n`;
    }

    // Map fields to backend Notice model
    // We compose the description with Subject, Ref No, and By Order information so that it displays complete on public notice board
    const publishedDescription = bodyText.includes("{{table}}")
      ? `${subject ? `**${subject}**\n\n` : ""}${finalRef ? `${finalRef}\n\n` : ""}${bodyText.replace("{{table}}", tableMarkdown)}\n\n${signatoryHeader}\n${signatoryAuthority}`
      : `${subject ? `**${subject}**\n\n` : ""}${finalRef ? `${finalRef}\n\n` : ""}${bodyText}${tableMarkdown}\n\n${signatoryHeader}\n${signatoryAuthority}`;
    
    const payload = {
      title: `${noticeTitle}${subject ? `: ${subject.replace(/^Subject:\s*/i, "")}` : ""}`,
      description: publishedDescription,
      date: formatDate(noticeDate),
      pinned: false,
      file_url: pdfUrl || null
    };

    try {
      setLoading(true);
      await api.post("/admin/notices", payload);
      toast.success("Notice successfully published to website notice board!");
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || "Failed to publish notice. Ensure you have the permissions.");
    } finally {
      setLoading(false);
    }
  };

  // Typography Class Mappings
  const fontSizes = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const lineHeights = {
    snug: "leading-snug",
    normal: "leading-normal",
    relaxed: "leading-relaxed",
    loose: "leading-loose"
  };

  return (
    <div className="space-y-6">
      {/* CSS Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          /* Hide editor columns, sidebar, layouts, header, footer */
          body * {
            visibility: hidden;
          }
          #notice-a4-print-area, #notice-a4-print-area * {
            visibility: visible;
          }
          #notice-a4-print-area {
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
            background-color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}} />

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white rounded-3xl p-6 border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-orange" />
            Official Notice Maker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, print, and publish official school notices in high-quality A4 layout.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition duration-200"
            title="Reset to Template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={handleSaveDraft}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition duration-200"
            title="Save as Draft"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md transition duration-200 hover:-translate-y-0.5"
            title="Publish to Notices Board"
          >
            <Send className="w-3.5 h-3.5" />
            Publish to Site
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-orange hover:bg-brand-orange/95 text-white text-xs font-semibold rounded-xl shadow-md transition duration-200 hover:-translate-y-0.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Notice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Controls */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Editor Form */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Notice Fields</h3>
            
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Notice Header/Title</label>
              <input
                type="text"
                value={noticeTitle}
                onChange={(e) => setNoticeTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50 font-semibold"
                placeholder="e.g. NOTICE, URGENT NOTICE, CIRCULAR"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Subject / Sub-header</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50 font-semibold text-brand-orange"
                placeholder="e.g. Subject: School Re-opening timings"
              />
            </div>

            {/* Reference Number Section */}
            <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-150 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reference Number</span>
                <label className="flex items-center gap-1.5 text-[10px] text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoRefEnabled}
                    onChange={(e) => {
                      setAutoRefEnabled(e.target.checked);
                      if (!e.target.checked) setRefLocked(false);
                    }}
                    className="rounded text-brand-orange focus:ring-brand-orange w-3.5 h-3.5 border-slate-300"
                  />
                  <span className="font-semibold">Auto-Count</span>
                </label>
              </div>

              {autoRefEnabled ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase">Prefix</label>
                      <input
                        type="text"
                        value={refPrefix}
                        onChange={(e) => setRefPrefix(e.target.value)}
                        disabled={refLocked}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange bg-white disabled:opacity-50"
                        placeholder="e.g. SDPS/2026-27/"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[9px] font-semibold text-slate-400 uppercase">Next Serial</label>
                      <input
                        type="number"
                        value={refSerial}
                        onChange={(e) => setRefSerial(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={refLocked}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange bg-white disabled:opacity-50 font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <span className="font-medium text-slate-400">Status:</span>
                    {refLocked ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-red-500">Locked ({refNo.replace("Ref No: ", "")})</span>
                        <button
                          type="button"
                          onClick={() => setRefLocked(false)}
                          className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold uppercase transition"
                        >
                          Unlock
                        </button>
                      </div>
                    ) : (
                      <span className="font-bold text-emerald-600 animate-pulse">Unlocked (Locks on Print/Publish)</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <label className="text-[9px] font-semibold text-slate-400 uppercase">Manual Ref Number</label>
                  <input
                    type="text"
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange bg-white"
                    placeholder="e.g. Ref No: SDPS/2026/045"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Notice Date</label>
              <input
                type="date"
                value={noticeDate}
                onChange={(e) => setNoticeDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span className="flex items-center gap-1.5 font-bold text-slate-700">
                  <Type className="w-3.5 h-3.5 text-brand-orange" />
                  Notice Body Description (MS Word Formatting Bar)
                </span>
                {showTable && <span className="text-[9px] text-brand-orange font-bold normal-case">Type {"{{table}}"} to place table here</span>}
              </label>

              {/* MS Word Rich Text Formatting Toolbar */}
              <div className="bg-slate-100 border border-slate-250 rounded-xl p-2 space-y-2 text-xs shadow-sm">
                
                {/* Row 1: Font Size, Font Family, Color Swatches & Highlighting */}
                <div className="flex flex-wrap items-center gap-2 pb-1.5 border-b border-slate-200/80">
                  
                  {/* Font Size for Selected Words */}
                  <div className="flex items-center gap-1 bg-white border border-slate-250 px-2 py-1 rounded-lg">
                    <Type className="w-3 h-3 text-slate-400 shrink-0" />
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          applyFormat(`<span style="font-size:${e.target.value}">`, `</span>`, "custom size text");
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="" disabled>Word Size...</option>
                      <option value="11px">11px (Small)</option>
                      <option value="13px">13px (Body)</option>
                      <option value="16px">16px (Medium)</option>
                      <option value="18px">18px (Large)</option>
                      <option value="22px">22px (Heading)</option>
                      <option value="28px">28px (Title)</option>
                    </select>
                  </div>

                  {/* Font Family for Selected Words */}
                  <div className="flex items-center gap-1 bg-white border border-slate-250 px-2 py-1 rounded-lg">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          applyFormat(`<span style="font-family:${e.target.value}">`, `</span>`, "custom font text");
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className="bg-transparent text-[11px] font-bold text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="" disabled>Word Font...</option>
                      <option value="system-ui, sans-serif">Sans-Serif (Default)</option>
                      <option value="Georgia, serif">Georgia (Serif)</option>
                      <option value="'Courier New', monospace">Monospace</option>
                      <option value="'Outfit', sans-serif">Outfit Headline</option>
                      <option value="'DM Sans', sans-serif">DM Sans Body</option>
                    </select>
                  </div>

                  {/* Word Color Swatches */}
                  <div className="flex items-center gap-1 bg-white border border-slate-250 px-2 py-1 rounded-lg">
                    <Palette className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500 mr-0.5">Color:</span>
                    <button type="button" onClick={() => applyFormat('<span style="color:#ef4444">', '</span>')} className="w-4 h-4 rounded-full bg-red-500 border border-black/10 hover:scale-110 transition shadow-xs" title="Red Text" />
                    <button type="button" onClick={() => applyFormat('<span style="color:#2563eb">', '</span>')} className="w-4 h-4 rounded-full bg-blue-600 border border-black/10 hover:scale-110 transition shadow-xs" title="Blue Text" />
                    <button type="button" onClick={() => applyFormat('<span style="color:#d97706">', '</span>')} className="w-4 h-4 rounded-full bg-amber-500 border border-black/10 hover:scale-110 transition shadow-xs" title="Amber Gold Text" />
                    <button type="button" onClick={() => applyFormat('<span style="color:#10b981">', '</span>')} className="w-4 h-4 rounded-full bg-emerald-500 border border-black/10 hover:scale-110 transition shadow-xs" title="Green Text" />
                    <button type="button" onClick={() => applyFormat('<span style="color:#8b5cf6">', '</span>')} className="w-4 h-4 rounded-full bg-purple-500 border border-black/10 hover:scale-110 transition shadow-xs" title="Purple Text" />
                    <button type="button" onClick={() => applyFormat('<span style="color:#0f172a">', '</span>')} className="w-4 h-4 rounded-full bg-slate-900 border border-black/10 hover:scale-110 transition shadow-xs" title="Dark Slate Text" />
                    <input
                      type="color"
                      onChange={(e) => applyFormat(`<span style="color:${e.target.value}">`, `</span>`)}
                      className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                      title="Choose Custom Color"
                    />
                  </div>

                  {/* Highlight Swatches */}
                  <div className="flex items-center gap-1 bg-white border border-slate-250 px-2 py-1 rounded-lg">
                    <Highlighter className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500 mr-0.5">Highlight:</span>
                    <button type="button" onClick={() => applyFormat('<mark style="background-color:#fef08a;padding:1px 4px;border-radius:3px">', '</mark>')} className="w-4 h-4 rounded bg-yellow-200 border border-yellow-400 hover:scale-110 transition shadow-xs" title="Yellow Highlight" />
                    <button type="button" onClick={() => applyFormat('<mark style="background-color:#bfdbfe;padding:1px 4px;border-radius:3px">', '</mark>')} className="w-4 h-4 rounded bg-blue-200 border border-blue-400 hover:scale-110 transition shadow-xs" title="Blue Highlight" />
                    <button type="button" onClick={() => applyFormat('<mark style="background-color:#bbf7d0;padding:1px 4px;border-radius:3px">', '</mark>')} className="w-4 h-4 rounded bg-emerald-200 border border-emerald-400 hover:scale-110 transition shadow-xs" title="Green Highlight" />
                    <button type="button" onClick={() => applyFormat('<mark style="background-color:#fbcfe8;padding:1px 4px;border-radius:3px">', '</mark>')} className="w-4 h-4 rounded bg-pink-200 border border-pink-400 hover:scale-110 transition shadow-xs" title="Pink Highlight" />
                  </div>

                </div>

                {/* Row 2: Bold, Italic, Underline, Strikethrough, Alignment & List Items */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyFormat("<b>", "</b>", "bold word")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-800 font-bold transition shadow-2xs"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat("<i>", "</i>", "italic word")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-800 transition shadow-2xs"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat("<u>", "</u>", "underlined word")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-800 transition shadow-2xs"
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat("<s>", "</s>", "strikethrough word")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-800 transition shadow-2xs"
                    title="Strikethrough"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-0.5" />

                  {/* Paragraph Alignment */}
                  <button
                    type="button"
                    onClick={() => applyFormat('<div style="text-align:left">', '</div>', "Left aligned text")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-700 transition shadow-2xs"
                    title="Align Left"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('<div style="text-align:center">', '</div>', "Centered text")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-700 transition shadow-2xs"
                    title="Align Center"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('<div style="text-align:right">', '</div>', "Right aligned text")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-700 transition shadow-2xs"
                    title="Align Right"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('<div style="text-align:justify">', '</div>', "Justified paragraph")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-700 transition shadow-2xs"
                    title="Justify Paragraph"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </button>

                  <div className="h-4 w-px bg-slate-300 mx-0.5" />

                  {/* Lists & Badges */}
                  <button
                    type="button"
                    onClick={() => applyFormat("\n* ", "", "Bullet Item")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-700 transition shadow-2xs"
                    title="Insert Bullet List Item"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat("\n1. ", "", "Numbered Item")}
                    className="p-1.5 bg-white hover:bg-slate-200 border border-slate-250 rounded-lg text-slate-700 transition shadow-2xs"
                    title="Insert Numbered List Item"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => applyFormat('<span style="background-color:#0E3B91;color:#ffffff;padding:2px 8px;border-radius:6px;font-weight:bold;font-size:11px">', '</span>', "IMPORTANT NOTICE")}
                    className="px-2 py-1 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-[10px] font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    title="Insert Styled Badge Tag"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" /> Badge Tag
                  </button>
                </div>

              </div>

              <textarea
                ref={bodyTextareaRef}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={11}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50 font-sans leading-relaxed resize-y shadow-inner"
                placeholder="Highlight any word or type text to format with colors, sizes, highlights, and font styles..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Signatory Prefix</label>
                <input
                  type="text"
                  value={signatoryHeader}
                  onChange={(e) => setSignatoryHeader(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50"
                  placeholder="e.g. By Order:, Signature:"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Signatory Authority</label>
                <input
                  type="text"
                  value={signatoryAuthority}
                  onChange={(e) => setSignatoryAuthority(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50"
                  placeholder="e.g. Principal, Director"
                />
              </div>
            </div>
          </div>

          {/* Digital Signature Presets & Upload */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-brand-orange" /> Digital Signature Presets
            </h3>
            
            {/* Preset selectors */}
            <div className="grid grid-cols-4 gap-1.5 text-[10px]">
              {["principal", "director", "management", "custom"].map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRolePreset(role)}
                  className={`py-2 px-1 rounded-xl font-bold uppercase transition border ${
                    selectedRolePreset === role
                      ? "bg-brand-orange border-brand-orange text-white"
                      : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* Selected preset state & uploader */}
            {selectedRolePreset !== "custom" && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">
                    {selectedRolePreset} Preset
                  </span>
                  {signaturePresets[selectedRolePreset] && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`Clear saved signature image for ${selectedRolePreset}?`)) {
                          setSignaturePresets(prev => ({ ...prev, [selectedRolePreset]: "" }));
                          try {
                            await api.put("/admin/site-settings", {
                              [`signature_${selectedRolePreset}`]: ""
                            });
                            toast.success(`Cleared ${selectedRolePreset} signature preset`);
                          } catch (err) {
                            console.error("Failed to clear signature preset in database:", err);
                            toast.error("Failed to update signature preset on server.");
                          }
                        }
                      }}
                      className="text-[10px] text-red-500 font-bold hover:underline"
                    >
                      Delete Saved
                    </button>
                  )}
                </div>

                {signaturePresets[selectedRolePreset] ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={fullUrl(signaturePresets[selectedRolePreset])}
                      alt="Preset signature"
                      className="h-10 w-fit object-contain border border-slate-200 bg-white p-1 rounded-lg animate-fade-up"
                    />
                    <span className="text-[10px] text-slate-400 font-medium">Loaded automatically</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5 bg-amber-50/50 border border-amber-100/70 p-2.5 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> No signature image saved for {selectedRolePreset} yet.
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/60">
                  <label className={`flex items-center justify-center gap-2 py-2 rounded-xl cursor-pointer text-xs font-bold transition ${
                    uploadingSignature 
                      ? "opacity-50 bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed" 
                      : signaturePresets[selectedRolePreset]
                        ? "bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 hover:border-slate-400"
                        : "border-2 border-dashed border-slate-350 bg-white text-slate-600 hover:border-brand-orange"
                  }`}>
                    <FileUp className="w-3.5 h-3.5" />
                    {uploadingSignature 
                      ? "Uploading PNG..." 
                      : signaturePresets[selectedRolePreset] 
                        ? "Change / Replace Signature" 
                        : "Upload PNG Signature"}
                    <input
                      type="file"
                      accept="image/png"
                      className="hidden"
                      disabled={uploadingSignature}
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) handleUploadSignature(f);
                      }}
                    />
                  </label>
                  <p className="text-[9px] text-slate-400 text-center mt-1">Recommended: Transparent background PNG</p>
                </div>
              </div>
            )}

            {selectedRolePreset === "custom" && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Custom Signature URL</label>
                  <input
                    type="text"
                    value={signatureUrl}
                    onChange={(e) => setSignatureUrl(e.target.value)}
                    placeholder="https://example.com/signature.png"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Allows pasting external direct links to signatures.</p>
              </div>
            )}

            {/* Signature Width/Height Sizer Control */}
            {signatureUrl && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Signature Height</span>
                  <span className="text-brand-orange">{sigHeight}px</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  value={sigHeight}
                  onChange={(e) => setSigHeight(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-orange"
                />
              </div>
            )}
          </div>

          {/* PDF Attachment Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-slate-600" /> PDF Notice Attachment
            </h3>
            
            {pdfUrl ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">
                    Attached PDF File
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Remove this PDF attachment from the notice?")) {
                        setPdfUrl("");
                        toast.success("PDF attachment removed");
                      }
                    }}
                    className="text-[10px] text-red-500 font-bold hover:underline flex items-center gap-1"
                  >
                    <Trash className="w-3 h-3" /> Remove
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-red-500 bg-white p-1 rounded-lg border border-slate-200 animate-fade-up" />
                  <div className="min-w-0 flex-1">
                    <a
                      href={fullUrl(pdfUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-blue-650 hover:underline block truncate"
                    >
                      {pdfUrl.split("/").pop()}
                    </a>
                    <span className="text-[9px] text-slate-400">Successfully uploaded and linked</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className={`flex flex-col items-center justify-center border-2 border-dashed border-slate-350 bg-white rounded-2xl p-4 cursor-pointer text-xs font-bold transition hover:border-brand-orange ${
                  uploadingPdf ? "opacity-50 cursor-not-allowed" : ""
                }`}>
                  <FileUp className="w-6 h-6 text-slate-400 mb-1.5" />
                  <span className="text-slate-600">
                    {uploadingPdf ? "Uploading PDF..." : "Upload Official PDF"}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={uploadingPdf}
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f) handleUploadPdf(f);
                    }}
                  />
                </label>
                <p className="text-[9px] text-slate-400 text-center">Attach a PDF of the signed notice to let users download it</p>
              </div>
            )}
          </div>

          {/* Styling Options */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Layout & Style Controls</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Font Size</label>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs bg-slate-50">
                  {["xs", "sm", "md", "lg"].map(sz => (
                    <button
                      key={sz}
                      onClick={() => setFontSize(sz)}
                      className={`flex-1 py-1.5 font-bold uppercase transition duration-150 ${fontSize === sz ? "bg-brand-orange text-white" : "hover:bg-slate-150 text-slate-600"}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Line Spacing</label>
                <select
                  value={lineHeight}
                  onChange={(e) => setLineHeight(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none"
                >
                  <option value="snug">Snug</option>
                  <option value="normal">Normal</option>
                  <option value="relaxed">Relaxed</option>
                  <option value="loose">Loose</option>
                </select>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={letterheadHeader}
                  onChange={(e) => setLetterheadHeader(e.target.checked)}
                  className="rounded text-brand-orange focus:ring-brand-orange w-4 h-4 border-slate-300"
                />
                <span className="font-semibold">Show School Letterhead Header</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showWatermark}
                  onChange={(e) => setShowWatermark(e.target.checked)}
                  className="rounded text-brand-orange focus:ring-brand-orange w-4 h-4 border-slate-300"
                />
                <span className="font-semibold">Show Background Watermark Logo</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSealBox}
                  onChange={(e) => setShowSealBox(e.target.checked)}
                  className="rounded text-brand-orange focus:ring-brand-orange w-4 h-4 border-slate-300"
                />
                <span className="font-semibold">Show Seal & Signature Box</span>
              </label>
            </div>
          </div>

          {/* Table Configuration */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-brand-blue" /> Notice Table (Optional)
              </h3>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showTable}
                  onChange={(e) => setShowTable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-orange animate-all duration-200"></div>
              </label>
            </div>

            {showTable && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* User Instruction Banner */}
                <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3 flex gap-2.5 items-start text-amber-800 leading-normal">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[10.5px]">
                    <span className="font-bold text-amber-900 block">Table Positioning Tip:</span>
                    <p>To place the table inside a paragraph, type <code className="bg-white border border-amber-200 px-1 py-0.5 rounded font-mono font-bold text-amber-900">{"{{table}}"}</code> in the description text. Otherwise, it renders at the end.</p>
                  </div>
                </div>

                {/* Style Options */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-150">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Style</label>
                    <select
                      value={tableStyle}
                      onChange={(e) => setTableStyle(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none font-semibold text-slate-700"
                    >
                      <option value="dividers">Dividers</option>
                      <option value="boxed">Boxed</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Header Bg</label>
                    <select
                      value={tableHeaderBg}
                      onChange={(e) => setTableHeaderBg(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none font-semibold text-slate-700"
                    >
                      <option value="none">None</option>
                      <option value="light-grey">Slate Light</option>
                      <option value="brand-blue">SDPS Blue</option>
                      <option value="brand-orange">SDPS Orange</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Alignment</label>
                    <select
                      value={tableAlign}
                      onChange={(e) => setTableAlign(e.target.value)}
                      className="w-full px-2 py-1 text-[11px] rounded-lg border border-slate-200 bg-white focus:outline-none font-semibold text-slate-700"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                {/* Column Manager */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Table Columns</label>
                    <button
                      type="button"
                      onClick={() => {
                        if (tableHeaders.length >= 5) {
                          toast.error("Maximum 5 columns allowed for A4 width compatibility.");
                          return;
                        }
                        setTableHeaders(prev => [...prev, `Column ${prev.length + 1}`]);
                        setTableRows(prev => prev.map(row => [...row, ""]));
                      }}
                      className="px-2 py-1 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange rounded-lg text-[10px] font-bold transition"
                    >
                      + Add Column
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tableHeaders.map((header, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <span className="text-xs text-slate-400 font-bold w-4">{idx + 1}.</span>
                        <input
                          type="text"
                          value={header}
                          onChange={(e) => {
                            const updated = [...tableHeaders];
                            updated[idx] = e.target.value;
                            setTableHeaders(updated);
                          }}
                          className="flex-1 min-w-0 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50 font-bold text-slate-700"
                          placeholder={`Column ${idx + 1} header`}
                        />
                        {tableHeaders.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setTableHeaders(prev => prev.filter((_, i) => i !== idx));
                              setTableRows(prev => prev.map(row => row.filter((_, i) => i !== idx)));
                            }}
                            className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg text-red-500 transition duration-150"
                            title="Delete Column"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rows Manager */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Table Rows</label>
                    <button
                      type="button"
                      onClick={() => setTableRows(prev => [...prev, tableHeaders.map(() => "")])}
                      className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition"
                    >
                      <Plus className="w-3 h-3" /> Add Row
                    </button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {tableRows.map((row, rowIdx) => (
                      <div key={rowIdx} className="p-3 bg-slate-50/50 rounded-2xl border border-slate-150 relative group">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            type="button"
                            onClick={() => setTableRows(prev => prev.filter((_, i) => i !== rowIdx))}
                            className="p-1 bg-red-50 hover:bg-red-100 rounded text-red-500 transition duration-150"
                            title="Delete Row"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="space-y-1.5 pt-2">
                          {row.map((cell, colIdx) => (
                            <div key={colIdx} className="flex gap-2 items-center">
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider w-12 truncate">{tableHeaders[colIdx] || `Col ${colIdx+1}`}</span>
                              <input
                                type="text"
                                value={cell}
                                onChange={(e) => {
                                  const updated = [...tableRows];
                                  updated[rowIdx] = [...updated[rowIdx]];
                                  updated[rowIdx][colIdx] = e.target.value;
                                  setTableRows(updated);
                                }}
                                className={`flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-white ${
                                  colIdx === 0 ? "font-bold text-slate-800" : "text-slate-700"
                                }`}
                                placeholder={`Enter value...`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Database & Cloud Draft History */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Saved Drafts</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                ☁️ Cloud MongoDB Synced
              </span>
            </div>
            
            {drafts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">No drafts saved in cloud database yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {drafts.map(item => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadDraft(item)}
                    className="flex justify-between items-center p-2 rounded-xl border border-slate-150 hover:border-brand-orange/40 hover:bg-slate-50 cursor-pointer transition duration-150 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="truncate font-semibold text-slate-700 pr-2">
                        {item.noticeTitle}: {item.subject?.replace(/^Subject:\s*/i, "") || "Untitled Notice"}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDraft(item.id, e)}
                      className="p-1 bg-red-50 hover:bg-red-100 rounded text-red-500 transition duration-150 shrink-0"
                      title="Delete Draft"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: Live A4 Printable Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" /> Live Printable A4 Preview (Scaled)
          </div>
          
          <div
            id="notice-a4-print-area"
            className="bg-white border border-slate-200 rounded-3xl shadow-lg p-10 max-w-[800px] mx-auto text-slate-800 font-sans relative flex flex-col justify-between overflow-hidden"
            style={{ minHeight: "1000px" }}
          >
            {/* Watermark Logo */}
            {showWatermark && formattedLogo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                <img src={formattedLogo} className="w-[30rem] h-[30rem] object-contain" alt="" />
              </div>
            )}

            <div className="space-y-6 z-10 relative">
              {/* Official School Header Letterhead */}
              {letterheadHeader ? (
                <div className="flex items-center justify-between border-b-4 border-double border-brand-blue pb-4 mb-6">
                  <div className="flex items-center gap-5">
                    {formattedLogo ? (
                      <img 
                        src={formattedLogo} 
                        alt="SDPS Logo" 
                        className="w-20 h-20 object-contain rounded-full ring-2 ring-brand-gold p-0.5 bg-white shrink-0" 
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse border border-slate-200 shrink-0" />
                    )}
                    <div className="text-left">
                      <h2 className="font-headline text-2xl font-black tracking-wide text-brand-blue leading-none">
                        S.D. PUBLIC SCHOOL
                      </h2>
                      <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wider leading-relaxed">
                        Maurya Colony, Biscoman Colony, Patna
                      </p>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        Mobile no. 9955190162, 9955190262
                      </p>
                      <p className="text-[10px] font-bold text-brand-orange italic tracking-wide mt-1.5">
                        (Empowering Generation Since 1994...)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-4" />
              )}

              {/* Document Reference No & Date Row */}
              <div className="flex justify-between items-center text-xs text-slate-700 font-bold border-b border-slate-100 pb-2 px-2">
                <div>{autoRefEnabled && !refLocked ? `Ref No: ${refPrefix}${refSerial.toString().padStart(3, "0")}` : refNo || "Ref No: .........................."}</div>
                <div>Date: {formatDate(noticeDate)}</div>
              </div>

              {/* Notice Centered Title */}
              <div className="text-center pt-2">
                <h3 className="text-xl font-headline font-black tracking-wider text-slate-900 border-b-2 border-slate-800 inline-block px-8 py-1 uppercase">
                  {noticeTitle}
                </h3>
              </div>

              {/* Subject Title */}
              {subject && (
                <div className="text-center py-2">
                  <span className="text-sm font-extrabold text-slate-800 tracking-wide bg-slate-50 border border-slate-200 px-5 py-1.5 rounded-lg uppercase inline-block">
                    {subject}
                  </span>
                </div>
              )}

              {/* Notice Body and Table (In-place or trailing) */}
              {(() => {
                const textStyle = `px-4 py-2 text-justify font-sans whitespace-pre-wrap leading-relaxed ${fontSizes[fontSize]} ${lineHeights[lineHeight]} text-slate-800`;
                const hasPlaceholder = showTable && bodyText.includes("{{table}}");
                
                const renderTable = () => (
                  showTable && tableRows.length > 0 && (
                    <div className="px-4 py-2 my-2">
                      <table className={`w-full text-${tableAlign} border-collapse text-xs ${
                        tableStyle === "boxed" 
                          ? "border border-slate-300" 
                          : "border-y border-slate-300"
                      }`}>
                        <thead>
                          <tr className={`${
                            tableHeaderBg === "light-grey"
                              ? "bg-slate-100 text-slate-800"
                              : tableHeaderBg === "brand-blue"
                              ? "bg-[#0E3B91] text-white"
                              : tableHeaderBg === "brand-orange"
                              ? "bg-[#F87D0E] text-white"
                              : "text-slate-900"
                          } ${tableStyle === "boxed" ? "" : "border-b border-slate-300"}`}>
                            {tableHeaders.map((header, colIdx) => (
                              <th
                                key={colIdx}
                                className={`py-2.5 px-3 font-bold ${
                                  tableStyle === "boxed" ? "border border-slate-300" : ""
                                }`}
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((row, idx) => (
                            <tr
                              key={idx}
                              className={`${
                                tableStyle === "boxed"
                                  ? ""
                                  : "border-b border-slate-200 last:border-b-0"
                              } hover:bg-slate-50/50`}
                            >
                              {row.map((cell, colIdx) => (
                                <td
                                  key={colIdx}
                                  className={`py-2.5 px-3 ${
                                    colIdx === 0 && tableHeaderBg !== "brand-blue" && tableHeaderBg !== "brand-orange"
                                      ? "font-bold text-slate-900"
                                      : "text-slate-800"
                                  } ${
                                    tableStyle === "boxed" ? "border border-slate-300" : ""
                                  }`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                );

                if (hasPlaceholder) {
                  const parts = bodyText.split("{{table}}");
                  const beforeText = parts[0];
                  const afterText = parts.slice(1).join("{{table}}");
                  return (
                    <>
                      <div className={textStyle} dangerouslySetInnerHTML={{ __html: formatNoticeTextToHtml(beforeText || "Please enter the content details for the notice...") }} />
                      {renderTable()}
                      {afterText && <div className={textStyle} dangerouslySetInnerHTML={{ __html: formatNoticeTextToHtml(afterText) }} />}
                    </>
                  );
                }

                return (
                  <>
                    <div className={textStyle} dangerouslySetInnerHTML={{ __html: formatNoticeTextToHtml(bodyText || "Please enter the content details for the notice...") }} />
                    {renderTable()}
                  </>
                );
              })()}
            </div>

            {/* Bottom Signatory Area */}
            <div className="flex justify-between items-end pt-12 px-4 z-10 relative">
              
              {/* Optional Signature seal box */}
              {showSealBox ? (
                <div className="w-24 h-24 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50 select-none">
                  School Seal
                </div>
              ) : (
                <div />
              )}

              {/* Signatory Authority */}
              <div className="text-right flex flex-col justify-end items-end pb-3">
                {signatoryHeader && <span className="font-bold text-xs text-slate-700">{signatoryHeader}</span>}
                
                {/* Dynamic Signature PNG */}
                {signatureUrl ? (
                  <div className="flex items-center justify-end mt-1 mb-1 pr-4 relative select-none pointer-events-none" style={{ height: `${sigHeight}px` }}>
                    <img
                      src={fullUrl(signatureUrl)}
                      alt="Signature"
                      className="object-contain"
                      style={{ height: `${sigHeight}px`, maxWidth: "160px" }}
                    />
                  </div>
                ) : (
                  <div className="h-10" />
                )}

                <div className="w-48 border-t border-slate-300 text-center pt-1.5">
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wide block">{signatoryAuthority}</span>
                  <span className="text-[9px] text-slate-500 block">(Seal & Signature)</span>
                </div>
              </div>

            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default AdminNoticeMaker;
