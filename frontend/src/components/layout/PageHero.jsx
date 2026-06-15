import { useState } from "react";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
function fullUrl(u) { return u?.startsWith("http") ? u : `${BACKEND}${u}`; }

/* Reusable inline PDF/document embed with open + download options */
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

function DocEmbed({ url, title, height = "580px" }) {
  const [mode, setMode] = useState("embed");
  url = toEmbedUrl(url);
  if (!url) return (
    <div className="bg-brand-paper rounded-2xl p-8 text-center border border-black/5">
      <p className="text-brand-ink/50 text-sm">Document will be available soon. Contact the school for details.</p>
    </div>
  );
  const googleUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  return (
    <div className="rounded-2xl overflow-hidden border border-black/5 shadow-sm bg-white">
      <div className="flex items-center justify-between px-4 py-2.5 bg-brand-blue/5 border-b border-black/5">
        <span className="text-xs font-semibold text-brand-ink/60">{title}</span>
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setMode(mode === "embed" ? "google" : "embed")}
            className="text-xs text-brand-blue hover:underline">
            {mode === "embed" ? "Try alternate viewer" : "Use direct embed"}
          </button>
          <span className="text-brand-ink/20">|</span>
          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline">↗ Open full screen</a>
          <span className="text-brand-ink/20">|</span>
          <a href={url} download className="text-xs text-brand-blue hover:underline">⬇ Download</a>
        </div>
      </div>
      <iframe key={mode} src={mode === "embed" ? url : googleUrl} title={title}
        style={{ width: "100%", height, border: "none" }} loading="lazy" />
    </div>
  );
}

function PageHero({ title, subtitle, overline, bgImage, pill }) {
  return (
    <section className="bg-hero-grad py-16 relative overflow-hidden">
      {bgImage && (
        <div className="absolute inset-0">
          <img src={bgImage} alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-white/90" />
        </div>
      )}
      <div className="relative max-w-6xl mx-auto px-6 text-center">
        {pill && <div className="inline-flex items-center gap-2 bg-brand-blue/10 text-brand-blue text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-4">{pill}</div>}
        {overline && !pill && <div className="overline mb-3">{overline}</div>}
        <h1 className="legacy-title brand-gradient-text">{title}</h1>
        {subtitle && <p className="mt-4 text-brand-ink/70 max-w-2xl mx-auto">{subtitle}</p>}
      </div>
    </section>
  );
}

export { PageHero, DocEmbed, fullUrl, toEmbedUrl, BACKEND };
export default PageHero;
