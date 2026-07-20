import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import { MessageSquare, Phone, Mail, FileText } from "lucide-react";

function toEmbedUrl(url) {
  if (!url) return url;
  url = url.replace('/view?usp=sharing', '/preview')
           .replace('/view?usp=drivesdk', '/preview')
           .replace('/view', '/preview');
  const gdMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdMatch && !url.includes('/preview') && !url.includes('/embed')) {
    url = `https://drive.google.com/file/d/${gdMatch[1]}/preview`;
  }
  return url;
}

function PdfEmbed({ url, title, height = "680px" }) {
  const [mode, setMode] = useState("embed");
  const embedUrl = toEmbedUrl(url);
  if (!embedUrl) return (
    <div className="bg-brand-paper rounded-2xl p-10 text-center border border-black/5">
      <div className="text-brand-blue mb-3 flex justify-center">
        <FileText className="w-10 h-10" />
      </div>
      <p className="text-brand-ink/50 text-sm mb-2">Document not available yet.</p>
      <p className="text-xs text-brand-ink/40">Contact the school office for current fee details.</p>
    </div>
  );
  const googleUrl = `https://docs.google.com/gview?url=${encodeURIComponent(embedUrl)}&embedded=true`;
  return (
    <div className="rounded-2xl overflow-hidden border border-black/5 shadow-sm bg-white">
      <div className="flex items-center justify-between px-5 py-3 bg-brand-blue/5 border-b border-black/5 flex-wrap gap-2">
        <span className="text-xs font-semibold text-brand-ink/60">{title}</span>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setMode(mode === "embed" ? "google" : "embed")}
            className="text-xs text-brand-blue hover:underline">
            {mode === "embed" ? "Can't see? Try viewer" : "Use direct embed"}
          </button>
          <span className="text-brand-ink/20">|</span>
          <a href={embedUrl.replace('/preview','/view')} target="_blank" rel="noreferrer"
            className="text-xs text-brand-blue hover:underline">↗ Open full screen</a>
          <span className="text-brand-ink/20">|</span>
          <a href={embedUrl.replace('/preview','/view')} download
            className="text-xs text-brand-blue hover:underline">⬇ Download</a>
        </div>
      </div>
      <iframe
        key={mode}
        src={mode === "embed" ? embedUrl : googleUrl}
        title={title}
        style={{ width: "100%", height, border: "none" }}
        loading="lazy"
        allow="autoplay"
      />
    </div>
  );
}

export default function FeeStructure() {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.get("/site-settings").then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const feeUrl = settings?.fee_structure_pdf_url || "";
  const prospectusUrl = settings?.prospectus_pdf_url || "";

  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="overline mb-3">Our Commitment</div>
          <h1 className="legacy-title brand-gradient-text">Fee Structure</h1>
          <p className="mt-4 text-brand-ink/70 max-w-xl mx-auto">
            Transparent and affordable education. Download or view our fee structure below.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">

        {/* Fee Structure PDF */}
        <div>
          <div className="overline mb-3">Day Scholar Fee Structure</div>
          <h2 className="section-title mb-6">Fee Structure {new Date().getFullYear()}-{(new Date().getFullYear()+1).toString().slice(2)}</h2>
          <PdfEmbed url={feeUrl} title="Fee Structure" height="720px" />
        </div>

        {/* Help */}
        <div className="bg-brand-paper rounded-2xl border border-black/5 p-6 flex flex-col sm:flex-row items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="font-headline font-semibold text-brand-ink mb-1">Need Help?</div>
            <p className="text-sm text-brand-ink/60">For queries regarding fees or payment options, contact our accounts office.</p>
            <div className="mt-3 flex flex-wrap gap-4">
              <a href="tel:+919955190262" className="text-sm font-semibold text-brand-blue hover:underline flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> +91 99551 90262
              </a>
              <a href="mailto:helpdesk@sdpublic.org" className="text-sm font-semibold text-brand-blue hover:underline flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> helpdesk@sdpublic.org
              </a>
            </div>
          </div>
          <Link to="/fee-payment" className="btn-primary text-sm shrink-0">Pay Fees Online →</Link>
        </div>

        {/* Prospectus */}
        {prospectusUrl && (
          <div>
            <div className="overline mb-3">School Prospectus</div>
            <h2 className="section-title mb-6">Digital Prospectus 2026-27</h2>
            <PdfEmbed url={prospectusUrl} title="School Prospectus" height="720px" />
          </div>
        )}

        <p className="text-xs text-brand-ink/40 text-center">
          * Fees are subject to revision each session. Verify with the school office before making payment decisions.
        </p>
      </div>
    </>
  );
}
