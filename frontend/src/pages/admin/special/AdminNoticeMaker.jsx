import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Printer, FileText, Save, Send, Trash, Plus, RotateCcw, AlertTriangle, Shield } from "lucide-react";

export function AdminNoticeMaker() {
  const { settings } = useOutletContext() || {};
  const [loading, setLoading] = useState(false);
  
  // School Logo formatting
  const logoUrl = settings?.logo_url || "https://sdpublic.org/assets/img/logo.png";
  const formattedLogo = logoUrl.startsWith("http")
    ? logoUrl
    : `${process.env.REACT_APP_BACKEND_URL || ""}${logoUrl}`;

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

  // Drafts Local History
  const [drafts, setDrafts] = useState(() => {
    try {
      const saved = localStorage.getItem("sdps_notice_drafts");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save drafts to localStorage whenever it changes
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

  const handlePrint = () => {
    window.print();
  };

  // Save draft locally
  const handleSaveDraft = () => {
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
      letterheadHeader
    };

    setDrafts(prev => [newDraft, ...prev.filter(d => d.noticeTitle !== noticeTitle || d.subject !== subject)]);
    toast.success("Draft saved successfully to browser cache!");
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
    toast.success("Draft loaded into notice editor!");
  };

  const handleDeleteDraft = (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this draft?")) return;
    setDrafts(prev => prev.filter(d => d.id !== id));
    toast.success("Draft removed from local cache");
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
    toast.success("Notice editor reset to defaults!");
  };

  // Publish to backend Notice Board
  const handlePublish = async () => {
    if (!window.confirm("Are you sure you want to publish this notice to the website notices board? It will be visible to the public immediately.")) return;
    
    // Map fields to backend Notice model
    // We compose the description with Subject, Ref No, and By Order information so that it displays complete on public notice board
    const publishedDescription = `${subject ? `**${subject}**\n\n` : ""}${refNo ? `${refNo}\n\n` : ""}${bodyText}\n\n${signatoryHeader}\n${signatoryAuthority}`;
    
    const payload = {
      title: `${noticeTitle}${subject ? `: ${subject.replace(/^Subject:\s*/i, "")}` : ""}`,
      description: publishedDescription,
      date: formatDate(noticeDate),
      pinned: false,
      file_url: null
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
            background: none !important;
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ref Number</label>
                <input
                  type="text"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50"
                  placeholder="Ref No: SDPS/2026/045"
                />
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
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Notice Body Description</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={11}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange bg-slate-50 font-sans leading-relaxed resize-y"
                placeholder="Enter details of the notice..."
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

          {/* Local Draft History */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2 uppercase tracking-wide">Saved Drafts (Local Storage)</h3>
            
            {drafts.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">No drafts saved on this computer yet.</p>
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
            {showWatermark && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
                <img src={formattedLogo} className="w-[30rem] h-[30rem] object-contain" alt="" />
              </div>
            )}

            <div className="space-y-6 z-10 relative">
              {/* Official School Header Letterhead */}
              {letterheadHeader ? (
                <div className="flex items-center justify-between border-b-4 border-double border-brand-blue pb-4 mb-6">
                  <div className="flex items-center gap-5">
                    <img 
                      src={formattedLogo} 
                      alt="SDPS Logo" 
                      className="w-20 h-20 object-contain rounded-full ring-2 ring-brand-gold p-0.5 bg-white shrink-0" 
                    />
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
                <div>{refNo || "Ref No: .........................."}</div>
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

              {/* Notice Body */}
              <div className={`px-4 py-4 text-justify font-sans whitespace-pre-wrap leading-relaxed ${fontSizes[fontSize]} ${lineHeights[lineHeight]} text-slate-800`}>
                {bodyText || "Please enter the content details for the notice..."}
              </div>
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
                <div className="w-48 border-t border-slate-300 text-center pt-1.5 mt-12">
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
