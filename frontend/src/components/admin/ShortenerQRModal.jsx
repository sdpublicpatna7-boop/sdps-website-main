import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  X, Download, Copy, Printer, ExternalLink, Sparkles,
  Check, RefreshCw, Layers, Palette, Eye, ShieldCheck,
  Smartphone, CheckCircle2, QrCode
} from "lucide-react";
import { renderQRToCanvas, generateQRSVG } from "../../lib/qrcode";

const COLOR_PRESETS = [
  { name: "SDPS Navy", value: "#0E3B91", bg: "bg-[#0E3B91]" },
  { name: "Sunset Orange", value: "#F87D0E", bg: "bg-[#F87D0E]" },
  { name: "Sapphire", value: "#1d4ed8", bg: "bg-blue-700" },
  { name: "Emerald", value: "#047857", bg: "bg-emerald-700" },
  { name: "Crimson", value: "#be123c", bg: "bg-rose-700" },
  { name: "Midnight", value: "#0f172a", bg: "bg-slate-900" },
];

export default function ShortenerQRModal({ link, onClose, siteSettings }) {
  const canvasRef = useRef(null);
  
  // Customization state
  const [selectedColor, setSelectedColor] = useState("#0E3B91");
  const [dotStyle, setDotStyle] = useState("rounded"); // 'rounded' | 'square' | 'dots'
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoShape, setLogoShape] = useState("circle"); // 'circle' | 'rounded'
  const [logoSize, setLogoSize] = useState(0.20); // 0.18, 0.20, 0.24
  const [viewMode, setViewMode] = useState("card"); // 'card' | 'qr'
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [rendering, setRendering] = useState(false);

  // Determine short URL
  const shortUrl = link?.code
    ? `${window.location.origin}/s/${link.code}`
    : link?.url || window.location.origin;

  // Determine School Logo URL
  const rawLogo = siteSettings?.logo_url;
  const schoolLogoUrl = rawLogo
    ? (rawLogo.startsWith("http") ? rawLogo : `${process.env.REACT_APP_BACKEND_URL || ""}${rawLogo}`)
    : "/logo512.png";

  const redrawQR = async () => {
    if (!canvasRef.current || !shortUrl) return;
    setRendering(true);
    try {
      await renderQRToCanvas(canvasRef.current, shortUrl, {
        size: 1024,
        margin: 4,
        color: selectedColor,
        bgColor: "#FFFFFF",
        dotStyle,
        includeLogo,
        logoUrl: schoolLogoUrl,
        logoShape,
        logoSizeRatio: logoSize,
        logoPaddingRatio: 0.03,
      });
    } catch (err) {
      console.error("QR render error:", err);
    } finally {
      setRendering(false);
    }
  };

  useEffect(() => {
    redrawQR();
  }, [shortUrl, selectedColor, dotStyle, includeLogo, logoShape, logoSize, schoolLogoUrl]);

  // Download High-Res PNG
  const handleDownloadPNG = () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const cleanCode = link?.code || "sdps_qr";
      a.download = `sdps_qr_${cleanCode}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("High-Resolution QR Code downloaded (1024x1024)!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download QR code");
    }
  };

  // Download SVG
  const handleDownloadSVG = () => {
    try {
      const svgString = generateQRSVG(shortUrl, {
        size: 512,
        margin: 4,
        color: selectedColor,
        bgColor: "#FFFFFF",
        includeLogo,
        logoUrl: schoolLogoUrl,
      });
      const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cleanCode = link?.code || "sdps_qr";
      a.download = `sdps_qr_${cleanCode}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Vector SVG QR code downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export SVG");
    }
  };

  // Copy Canvas Image to Clipboard
  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to prepare image for clipboard");
          return;
        }
        try {
          if (navigator.clipboard && navigator.clipboard.write) {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            setCopied(true);
            toast.success("QR Code image copied to clipboard! Ready to paste into WhatsApp, Canva, or Word.");
            setTimeout(() => setCopied(false), 2500);
          } else {
            await navigator.clipboard.writeText(shortUrl);
            toast.info("Image copy not supported by your browser. Shortened link copied instead.");
          }
        } catch (clipErr) {
          console.warn("ClipboardItem write failed:", clipErr);
          await navigator.clipboard.writeText(shortUrl);
          toast.info("Shortened link URL copied to clipboard.");
        }
      }, "image/png");
    } catch (e) {
      toast.error("Unable to copy image");
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setUrlCopied(true);
      toast.success("Short URL copied!");
      setTimeout(() => setUrlCopied(false), 2000);
    } catch (e) {
      toast.error("Failed to copy URL");
    }
  };

  // Print Flyer / Card
  const handlePrint = () => {
    const qrDataUrl = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print.");
      return;
    }

    const titleText = link?.title || "SDPS Portal Access";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Flyer - ${titleText} | SDPS Patna</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            body {
              background: #fff;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              color: #0f172a;
            }
            .card {
              max-width: 520px;
              width: 100%;
              border: 3.5px solid #0E3B91;
              border-radius: 32px;
              padding: 42px 36px;
              text-align: center;
              background: #ffffff;
              box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }
            .header-badge {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              margin-bottom: 24px;
            }
            .school-logo {
              width: 64px;
              height: 64px;
              object-fit: contain;
            }
            .school-name {
              font-size: 23px;
              font-weight: 900;
              color: #0E3B91;
              letter-spacing: -0.5px;
              text-transform: uppercase;
              line-height: 1.2;
            }
            .school-tag {
              font-size: 11.5px;
              font-weight: 800;
              color: #F87D0E;
              letter-spacing: 1.2px;
              text-transform: uppercase;
              margin-top: 4px;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 8px;
              line-height: 1.3;
            }
            .subtitle {
              font-size: 14px;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              background: #f8fafc;
              border: 2px dashed #cbd5e1;
              border-radius: 26px;
              padding: 22px;
              display: inline-block;
              margin-bottom: 22px;
            }
            .qr-img {
              width: 250px;
              height: 250px;
              display: block;
              margin: 0 auto;
            }
            .link-pill {
              display: inline-block;
              background: #eff6ff;
              border: 1.5px solid #bfdbfe;
              color: #1d4ed8;
              font-size: 14px;
              font-weight: 800;
              font-family: monospace;
              padding: 8px 18px;
              border-radius: 14px;
              margin-bottom: 20px;
              word-break: break-all;
              max-width: 90%;
            }
            .scan-callout {
              font-size: 12px;
              font-weight: 800;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .footer-info {
              margin-top: 26px;
              padding-top: 18px;
              border-top: 1px solid #e2e8f0;
              font-size: 11px;
              color: #94a3b8;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header-badge">
              <img src="/logo512.png" class="school-logo" alt="SDPS Logo" />
              <div style="text-align: left;">
                <div class="school-name">S.D. Public School</div>
                <div class="school-tag">Patna • Empowering Generations</div>
              </div>
            </div>

            <div class="title">${titleText}</div>
            <div class="subtitle">Scan the QR code below with any smartphone camera to visit</div>

            <div class="qr-wrapper">
              <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
            </div>

            <div>
              <div class="link-pill">${shortUrl}</div>
            </div>

            <div class="scan-callout">
              📷 Instant Scan with Any Phone Camera
            </div>

            <div class="footer-info">
              Official QR Portal • S.D. Public School, Maurya Colony, Patna 800007
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[94vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 px-7 py-5 text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 shadow-inner shrink-0">
              <Sparkles className="w-5.5 h-5.5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                QR Code Studio with Centered School Logo
              </h2>
              <p className="text-xs font-semibold text-slate-300">
                High-definition, scannable QR codes with SDPS emblem & customizable themes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 bg-slate-50/70">
          
          {/* Left Column: Live Preview with Persistent Canvas */}
          <div className="lg:col-span-6 flex flex-col items-center justify-start space-y-6">
            
            {/* View Mode Toggle Pill */}
            <div className="flex items-center p-1.5 bg-slate-200/80 rounded-2xl w-full max-w-md shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                  viewMode === "card"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-4 h-4 text-blue-600" /> Branded School Card
              </button>
              <button
                type="button"
                onClick={() => setViewMode("qr")}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-2 ${
                  viewMode === "qr"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-4 h-4 text-indigo-600" /> Clean QR Only
              </button>
            </div>

            {/* Single Persistent Preview Box */}
            <div
              className={`w-full max-w-md bg-white rounded-3xl transition-all duration-200 ${
                viewMode === "card"
                  ? "border-2 border-slate-200/90 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-7 text-center space-y-5"
                  : "border border-slate-200/90 shadow-md p-8 text-center space-y-6"
              }`}
            >
              {viewMode === "card" ? (
                <>
                  {/* School Header - Clean & Spacious */}
                  <div className="flex items-center justify-center gap-3.5 pb-4 pt-1 border-b border-slate-100">
                    <img
                      src="/logo512.png"
                      alt="SDPS Logo"
                      className="w-10 h-10 object-contain rounded-full bg-slate-50 p-1 border border-slate-200 shrink-0"
                    />
                    <div className="text-left flex flex-col justify-center">
                      <div className="text-base font-black text-slate-900 tracking-tight leading-snug">
                        S.D. PUBLIC SCHOOL
                      </div>
                      <div className="text-[11px] font-extrabold text-orange-600 uppercase tracking-widest leading-normal mt-0.5">
                        PATNA • OFFICIAL PORTAL
                      </div>
                    </div>
                  </div>

                  {/* Link Title & Destination */}
                  <div className="space-y-1.5 pt-1">
                    <h3 className="text-base font-black text-slate-900 leading-snug px-3">
                      {link?.title || "Shortened Link Portal"}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 truncate max-w-xs mx-auto">
                      {link?.url || shortUrl}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider pt-1">
                  Clean QR Code Preview
                </div>
              )}

              {/* SINGLE PERSISTENT CANVAS */}
              <div className="relative inline-block mx-auto bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/80 shadow-inner">
                <canvas
                  ref={canvasRef}
                  className={`${
                    viewMode === "card" ? "w-60 h-60 sm:w-64 sm:h-64" : "w-64 h-64 sm:w-72 sm:h-72"
                  } mx-auto rounded-xl object-contain block shadow-xs bg-white`}
                />
                {rendering && (
                  <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                    <RefreshCw className="w-7 h-7 text-blue-600 animate-spin" />
                  </div>
                )}
              </div>

              {/* URL Chip */}
              <div className="pt-1">
                <div className="inline-flex items-center justify-between gap-2.5 px-4 py-2.5 bg-indigo-50/80 border border-indigo-150 rounded-2xl max-w-full">
                  <span className="font-mono text-xs font-black text-indigo-700 truncate select-all">
                    {shortUrl}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="p-1 hover:bg-indigo-100 rounded-lg text-indigo-600 transition cursor-pointer shrink-0"
                    title="Copy URL"
                  >
                    {urlCopied ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {viewMode === "card" && (
                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5 pt-1">
                  <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                  Scan with Camera to Visit
                </div>
              )}
            </div>

            {/* Test Link Button */}
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition py-1"
            >
              <ExternalLink className="w-4 h-4" /> Open Short Link in New Tab
            </a>
          </div>

          {/* Right Column: Customization Studio Controls */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* 1. Center School Logo Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ShieldCheck className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                      Center School Logo
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Official emblem embedded in QR center
                    </span>
                  </div>
                </div>
                
                {/* Toggle Logo */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLogo}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {includeLogo && (
                <div className="space-y-4 animate-in fade-in duration-200 pt-1">
                  {/* Badge Shape */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-500">Badge Shield Shape</span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setLogoShape("circle")}
                        className={`py-2.5 px-3.5 rounded-2xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                          logoShape === "circle"
                            ? "border-blue-600 bg-blue-50/80 text-blue-700 shadow-2xs font-extrabold"
                            : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Circular Shield
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoShape("rounded")}
                        className={`py-2.5 px-3.5 rounded-2xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-2 ${
                          logoShape === "rounded"
                            ? "border-blue-600 bg-blue-50/80 text-blue-700 shadow-2xs font-extrabold"
                            : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Squircle Badge
                      </button>
                    </div>
                  </div>

                  {/* Logo Size */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                      <span>Logo Scale Size</span>
                      <span className="text-slate-800 font-black">{Math.round(logoSize * 100)}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Compact (18%)", val: 0.18 },
                        { label: "Standard (20%)", val: 0.20 },
                        { label: "Bold (24%)", val: 0.24 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setLogoSize(item.val)}
                          className={`py-2 px-2.5 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                            logoSize === item.val
                              ? "border-blue-600 bg-blue-50/80 text-blue-700 font-extrabold shadow-2xs"
                              : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Color Themes Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Palette className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                      QR Foreground Color
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Choose brand presets or custom hex
                    </span>
                  </div>
                </div>
                
                {/* Custom Color Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-8 h-8 rounded-xl border border-slate-250 p-0.5 cursor-pointer bg-white shadow-xs"
                    title="Custom Color Picker"
                  />
                  <span className="text-xs font-mono font-bold text-slate-600 uppercase">
                    {selectedColor}
                  </span>
                </div>
              </div>

              {/* Spacious 3-column Preset Color Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedColor(preset.value)}
                    className={`py-3 px-3.5 rounded-2xl text-xs font-bold border flex items-center gap-2.5 transition cursor-pointer ${
                      selectedColor.toLowerCase() === preset.value.toLowerCase()
                        ? "border-blue-600 bg-blue-50/80 shadow-2xs font-extrabold text-blue-900 ring-1 ring-blue-500/20"
                        : "border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    <span className={`w-4.5 h-4.5 rounded-full shrink-0 ${preset.bg} shadow-xs border border-white/40`} />
                    <span className="truncate">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Pattern Style Section */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <QrCode className="w-4.5 h-4.5" />
                </div>
                <div>
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800 block">
                    Pattern Module Style
                  </label>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Geometric corner curvature
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "rounded", label: "Smooth Rounded" },
                  { id: "square", label: "Classic Square" },
                  { id: "dots", label: "Dot Matrix" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDotStyle(s.id)}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition cursor-pointer text-center ${
                      dotStyle === s.id
                        ? "border-blue-600 bg-blue-50/80 text-blue-700 font-extrabold shadow-2xs ring-1 ring-blue-500/20"
                        : "border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Action Export Buttons */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  className="py-3.5 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-xs shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download PNG (1024px)
                </button>

                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="py-3.5 px-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied Image!" : "Copy QR Image"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-3 px-5 bg-white hover:bg-slate-50 border border-slate-250 text-slate-800 rounded-2xl font-extrabold text-xs shadow-2xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" /> Print Flyer / Card
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSVG}
                  className="py-3 px-5 bg-white hover:bg-slate-50 border border-slate-250 text-slate-800 rounded-2xl font-extrabold text-xs shadow-2xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" /> Download Vector SVG
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
