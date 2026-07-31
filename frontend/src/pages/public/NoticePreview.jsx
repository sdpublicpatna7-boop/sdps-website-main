import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api, { getBackendUrl } from "@/lib/api";
import { Printer, FileText } from "lucide-react";

export function NoticePreview() {
  const { id } = useParams();
  const [notice, setNotice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/notices/${id}`),
      api.get("/site-settings")
    ])
      .then(([noticeRes, settingsRes]) => {
        setNotice(noticeRes.data);
        setSettings(settingsRes.data);
      })
      .catch((err) => {
        console.error("Error loading notice preview:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-slate-500 font-semibold flex items-center gap-2">
          <span className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
          Loading Notice Document...
        </div>
      </div>
    );
  }

  if (!notice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center max-w-md">
          <h2 className="font-headline text-xl font-bold text-slate-800 mb-2">Notice Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">The notice you are looking for may have been removed or does not exist.</p>
          <button onClick={() => window.close()} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition">
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const logoUrl = settings?.logo_url || "";
  const BACKEND_URL = getBackendUrl();
  const formattedLogo = logoUrl
    ? (logoUrl.startsWith("http") ? logoUrl : `${BACKEND_URL.replace(/\/+$/, "")}${logoUrl.startsWith("/") ? logoUrl : "/" + logoUrl}`)
    : "";

  // Dynamic signature resolution based on notice signatory details
  const extractSignatory = (desc) => {
    if (!desc) return { authority: "Principal", header: "By Order:" };
    const lines = desc.trim().split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const authority = lines[lines.length - 1];
      const header = lines[lines.length - 2];
      if (header.toLowerCase().includes("order") || header.toLowerCase().includes("sign") || lines.length === 2) {
        return { authority, header };
      }
      return { authority, header: "" };
    }
    return { authority: lines[0] || "Principal", header: "By Order:" };
  };

  const signatory = extractSignatory(notice?.description);
  const authLower = (signatory.authority || "Principal").toLowerCase();

  let signatoryPresetKey = "";
  let signatoryLabel = signatory.authority || "Principal";

  if (authLower.includes("principal")) {
    signatoryPresetKey = "signature_principal";
    signatoryLabel = "Principal";
  } else if (authLower.includes("director")) {
    signatoryPresetKey = "signature_director";
    signatoryLabel = "Director";
  } else if (authLower.includes("management") || authLower.includes("trustee")) {
    signatoryPresetKey = "signature_management";
    signatoryLabel = "Management";
  }

  const rawSig = signatoryPresetKey ? settings?.[signatoryPresetKey] : "";
  const signatureUrl = rawSig
    ? (rawSig.startsWith("http") ? rawSig : `${BACKEND_URL.replace(/\/+$/, "")}${rawSig.startsWith("/") ? rawSig : "/" + rawSig}`)
    : "";

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 flex flex-col items-center print:bg-white print:py-0 print:px-0">
      <style>{`
        @media print {
          body {
            background-color: white !important;
          }
          .no-print {
            display: none !important;
          }
          #notice-a4-print-area {
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Control Top Bar */}
      <div className="w-full max-w-[800px] mb-4 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200 no-print">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-orange" />
          <span className="font-bold text-slate-800 text-sm">Notice Document Viewer</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#0E3B91] hover:bg-[#0E3B91]/90 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save PDF
          </button>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Notice Content Container */}
      {notice.file_url ? (
        // If there is an attached PDF file, render the PDF directly inline using our pdf-proxy
        (() => {
          const originalUrl = notice.file_url.startsWith("http")
            ? notice.file_url
            : `${BACKEND_URL.replace(/\/+$/, "")}${notice.file_url.startsWith("/") ? notice.file_url : "/" + notice.file_url}`;
          const proxyUrl = `${BACKEND_URL.replace(/\/+$/, "")}/api/pdf-proxy?url=${encodeURIComponent(originalUrl)}`;

          return (
            <div className="w-full max-w-[800px] bg-white rounded-3xl border border-slate-200 shadow-lg p-3 flex flex-col gap-3 no-print">
              <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-150">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-red-500" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Attached PDF Document</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">{notice.title}</p>
                  </div>
                </div>
                <a
                  href={originalUrl}
                  download
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-350 text-slate-800 font-bold rounded-xl text-xs transition"
                >
                  Direct Download
                </a>
              </div>
              <iframe
                src={proxyUrl}
                title={notice.title}
                className="w-full min-h-[750px] rounded-2xl border border-slate-200"
              />
            </div>
          );
        })()
      ) : (
        // Otherwise, render the notice maker letterhead layout
        <div
          id="notice-a4-print-area"
          className="bg-white border border-slate-200 rounded-3xl shadow-lg p-10 max-w-[800px] w-full min-h-[1000px] text-slate-850 font-sans relative flex flex-col justify-between overflow-hidden"
        >
          {/* Watermark Logo */}
          {formattedLogo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none z-0">
              <img src={formattedLogo} className="w-[30rem] h-[30rem] object-contain" alt="" />
            </div>
          )}

          <div className="space-y-6 z-10 relative">
            {/* Official School Header Letterhead */}
            <div className="flex items-center justify-between border-b-4 border-double border-[#0E3B91] pb-4 mb-6">
              <div className="flex items-center gap-5">
                {formattedLogo && (
                  <img
                    src={formattedLogo}
                    alt="SDPS Logo"
                    className="w-20 h-20 object-contain rounded-full ring-2 ring-brand-gold p-0.5 bg-white shrink-0"
                  />
                )}
                <div className="text-left">
                  <h2 className="font-headline text-2xl font-black tracking-wide text-[#0E3B91] leading-none">
                    S.D. PUBLIC SCHOOL
                  </h2>
                  <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-wider leading-relaxed">
                    Maurya Colony, Biscoman Colony, Patna
                  </p>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    Mobile no. 9955190162, 9955190262
                  </p>
                  <p className="text-[10px] font-bold text-[#F87D0E] italic tracking-wide mt-1.5">
                    (Empowering Generation Since 1994...)
                  </p>
                </div>
              </div>
            </div>

            {/* Document Date Row */}
            <div className="flex justify-between items-center text-xs text-slate-700 font-bold border-b border-slate-100 pb-2 px-2">
              <div>Date: {notice.date}</div>
            </div>

            {/* Notice Title */}
            <div className="text-center pt-2">
              <h3 className="text-xl font-headline font-black tracking-wider text-slate-900 border-b-2 border-slate-800 inline-block px-8 py-1 uppercase">
                Notice
              </h3>
            </div>

            {/* Render the notice description content (handles bold & table parsed dynamically) */}
            <div className="px-4 py-2 text-justify font-sans text-sm leading-relaxed text-slate-800 space-y-4">
              {renderMarkdown(notice.description)}
            </div>
          </div>

          {/* Bottom Signatory Area */}
          <div className="flex justify-between items-end pt-12 px-4 z-10 relative">
            <div className="w-24 h-24 border border-dashed border-slate-300 rounded-xl flex items-center justify-center text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50 select-none">
              School Seal
            </div>
            
            <div className="text-right flex flex-col justify-end items-end pb-3">
              {/* Dynamic Signature PNG */}
              {signatureUrl ? (
                <div className="flex items-center justify-end mt-1 mb-1 pr-4 relative select-none pointer-events-none" style={{ height: "48px" }}>
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    className="object-contain"
                    style={{ height: "48px", maxWidth: "160px" }}
                  />
                </div>
              ) : (
                <div className="h-12" />
              )}
              <div className="w-48 border-t border-slate-300 text-center pt-1.5">
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wide block">{signatoryLabel}</span>
                <span className="text-[9px] text-slate-500 block">(Seal & Signature)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Rich text parser for rendering MS Word-like inline word colors, sizes, background highlights, and tables
function renderMarkdown(text) {
  if (!text) return null;

  // Pre-process BBCode and Markdown to HTML
  let processed = text
    .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color:$1">$2</span>')
    .replace(/\[bg=(.*?)\](.*?)\[\/bg\]/gi, '<mark style="background-color:$1;padding:1px 4px;border-radius:3px">$2</mark>')
    .replace(/\[size=(.*?)\](.*?)\[\/size\]/gi, '<span style="font-size:$1">$2</span>')
    .replace(/\[font=(.*?)\](.*?)\[\/font\]/gi, '<span style="font-family:$1">$2</span>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  const lines = processed.split("\n");
  const rendered = [];
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Table parsing: lines starting and ending with |
    if (line.startsWith("|") && line.endsWith("|")) {
      if (line.includes("---")) {
        continue;
      }
      
      const cols = line
        .split("|")
        .map(c => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      if (!inTable) {
        inTable = true;
        tableHeaders = cols;
      } else {
        tableRows.push(cols);
      }
      continue;
    }

    // Render table if we just exited a table block
    if (inTable && (!line.startsWith("|") || !line.endsWith("|"))) {
      rendered.push(renderTableHTML(tableHeaders, tableRows, i));
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }

    if (line === "") {
      rendered.push(<div key={`space-${i}`} className="h-2" />);
      continue;
    }

    if (line.startsWith("* ") || line.startsWith("- ")) {
      rendered.push(
        <li key={i} className="ml-5 list-disc text-slate-800" dangerouslySetInnerHTML={{ __html: line.substring(2) }} />
      );
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      rendered.push(
        <li key={i} className="ml-5 list-decimal text-slate-800" dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s/, '') }} />
      );
      continue;
    }

    rendered.push(
      <div key={i} className="text-justify text-slate-800 leading-relaxed" dangerouslySetInnerHTML={{ __html: line }} />
    );
  }

  if (inTable) {
    rendered.push(renderTableHTML(tableHeaders, tableRows, "end"));
  }

  return rendered;
}

function renderTableHTML(headers, rows, key) {
  return (
    <div key={`table-${key}`} className="my-4 overflow-x-auto animate-fade-in">
      <table className="w-full border-collapse border border-slate-300 text-xs text-left">
        <thead>
          <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
            {headers.map((h, idx) => (
              <th key={idx} className="py-2.5 px-3 font-bold border border-slate-300">{h.replace(/\*\*/g, "")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="border-b border-slate-250 hover:bg-slate-50/50">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className={`py-2.5 px-3 border border-slate-300 ${cIdx === 0 ? "font-bold text-slate-900" : "text-slate-800"}`}>
                  {cell.replace(/\*\*/g, "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default NoticePreview;
