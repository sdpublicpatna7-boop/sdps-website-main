import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { MessageSquare, Phone, Mail, FileText, Download, ExternalLink, RefreshCw, Table, FileCheck, Layers } from "lucide-react";

function getCached(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setCache(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

function toEmbedUrl(url) {
  if (!url) return url;
  let cleanUrl = url.replace('/view?usp=sharing', '/preview')
                    .replace('/view?usp=drivesdk', '/preview')
                    .replace('/view', '/preview');
  const gdMatch = cleanUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdMatch && !cleanUrl.includes('/preview') && !cleanUrl.includes('/embed')) {
    cleanUrl = `https://drive.google.com/file/d/${gdMatch[1]}/preview`;
  }
  return cleanUrl;
}

function PdfEmbed({ url, title, height = "680px", isLoading = false }) {
  const [mode, setMode] = useState("embed");
  const embedUrl = toEmbedUrl(url);

  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-8 text-center animate-pulse">
        <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/3 mx-auto mb-2"></div>
        <div className="h-3 bg-slate-100 rounded w-1/2 mx-auto"></div>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-brand-paper rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
        <div className="w-14 h-14 bg-brand-blue/10 text-brand-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <FileText className="w-7 h-7" />
        </div>
        <h3 className="font-headline font-bold text-slate-800 text-base mb-1">Official Document File</h3>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-4">
          The PDF prospectus document is currently being updated for the new session. You can view our structured fee schedule below or contact the admissions team.
        </p>
        <a 
          href="tel:+919955190262" 
          className="inline-flex items-center gap-2 text-xs font-bold text-brand-blue bg-brand-blue/10 px-4 py-2 rounded-xl hover:bg-brand-blue/20 transition"
        >
          <Phone className="w-3.5 h-3.5" /> Call Admissions Desk: +91 99551 90262
        </a>
      </div>
    );
  }

  const googleUrl = `https://docs.google.com/gview?url=${encodeURIComponent(embedUrl)}&embedded=true`;
  const viewUrl = embedUrl.replace('/preview', '/view');

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-white">
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-gold" />
          <span className="text-xs font-semibold tracking-wide">{title}</span>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <button 
            onClick={() => setMode(mode === "embed" ? "google" : "embed")}
            className="text-slate-300 hover:text-white underline flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" />
            {mode === "embed" ? "Try Google Viewer" : "Use Direct Embed"}
          </button>
          <span className="text-slate-700">|</span>
          <a 
            href={viewUrl} 
            target="_blank" 
            rel="noreferrer"
            className="text-brand-gold hover:underline flex items-center gap-1 font-medium"
          >
            <ExternalLink className="w-3 h-3" /> Open Full Screen
          </a>
          <span className="text-slate-700">|</span>
          <a 
            href={viewUrl} 
            download
            className="bg-brand-blue hover:bg-brand-blue-dark text-white px-3 py-1 rounded-lg font-semibold flex items-center gap-1 transition shadow-sm"
          >
            <Download className="w-3 h-3" /> Download PDF
          </a>
        </div>
      </div>
      <iframe
        key={mode}
        src={mode === "embed" ? embedUrl : googleUrl}
        title={title}
        style={{ width: "100%", height, border: "none" }}
        loading="eager"
        allow="autoplay"
      />
    </div>
  );
}

const DEFAULT_FEE_ROWS = [
  { id: "1", class_name: "Play Group / Nursery", admission_fee: "₹5,000", tuition_fee: "₹1,200", annual_fee: "₹2,500" },
  { id: "2", class_name: "KG-I / KG-II", admission_fee: "₹5,500", tuition_fee: "₹1,350", annual_fee: "₹2,500" },
  { id: "3", class_name: "Class I - Class III", admission_fee: "₹6,000", tuition_fee: "₹1,500", annual_fee: "₹3,000" },
  { id: "4", class_name: "Class IV - Class V", admission_fee: "₹6,500", tuition_fee: "₹1,650", annual_fee: "₹3,000" },
  { id: "5", class_name: "Class VI - Class VIII", admission_fee: "₹7,500", tuition_fee: "₹1,850", annual_fee: "₹3,500" },
];

export default function FeeStructure() {
  const [settings, setSettings] = useState(() => getCached("sdps_site_settings"));
  const [loading, setLoading] = useState(!settings);

  useEffect(() => {
    api.get("/site-settings").then((r) => {
      setSettings(r.data);
      setCache("sdps_site_settings", r.data);
    }).catch(() => {}).finally(() => {
      setLoading(false);
    });
  }, []);

  const feeUrl = settings?.fee_structure_pdf_url || "";
  const prospectusUrl = settings?.prospectus_pdf_url || "";
  const currentYear = new Date().getFullYear();
  const nextYearShort = (currentYear + 1).toString().slice(2);

  return (
    <>
      {/* Page Header Banner */}
      <section className="bg-hero-grad py-16 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="overline mb-3 inline-flex items-center gap-1.5 bg-brand-blue/10 text-brand-blue px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <FileCheck className="w-3.5 h-3.5" /> Transparent & Affordable
          </div>
          <h1 className="legacy-title brand-gradient-text">Fee Structure</h1>
          <p className="mt-4 text-brand-ink/70 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            S.D. Public School provides accessible quality education. Download or view our official fee schedule below.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* OFFICIAL DOCUMENT PDF EMBED */}
        <div className="space-y-6">
          <div>
            <div className="overline mb-1">Day Scholar Fee Structure</div>
            <h2 className="section-title mb-4">Fee Structure {currentYear}-{nextYearShort}</h2>
            <PdfEmbed url={feeUrl} title={`SDPS Fee Structure ${currentYear}-${nextYearShort}`} height="750px" isLoading={loading} />
          </div>

          {/* Prospectus document embed */}
          {prospectusUrl && (
            <div className="pt-6">
              <div className="overline mb-1">School Information Booklet</div>
              <h2 className="section-title mb-4">Official School Prospectus</h2>
              <PdfEmbed url={prospectusUrl} title="S.D. Public School Prospectus" height="750px" isLoading={loading} />
            </div>
          )}
        </div>

        {/* Help & Contact Banner */}
        <div className="bg-gradient-to-r from-brand-paper via-white to-brand-paper rounded-3xl border border-black/5 p-6 md:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0 shadow-inner">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-headline font-bold text-slate-800 text-base mb-1">Need Assistance or Custom Payment Plans?</h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-lg">
              For fee installment plans, scholarship enquiries, or online payment receipts, our accounts desk is available 6 days a week.
            </p>
            <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-4">
              <a href="tel:+919955190262" className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> +91 99551 90262
              </a>
              <a href="mailto:helpdesk@sdpublic.org" className="text-xs font-bold text-brand-blue hover:underline flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> helpdesk@sdpublic.org
              </a>
            </div>
          </div>
          <Link to="/fee-payment" className="btn-primary text-xs sm:text-sm shrink-0 shadow-md">
            Pay Fees Online →
          </Link>
        </div>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          * Fee details and transport charges are subject to official revision by the school management board each academic session. Please verify all details with the accounts office before online transactions.
        </p>
      </div>
    </>
  );
}


