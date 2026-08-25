import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  X, Download, Copy, Printer, ExternalLink, Sparkles,
  Check, RefreshCw, Layers, Palette, Eye, ShieldCheck,
  Smartphone, Maximize2
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
  const cardRef = useRef(null);
  
  // Customization state
  const [selectedColor, setSelectedColor] = useState("#0E3B91");
  const [dotStyle, setDotStyle] = useState("rounded"); // 'square' | 'rounded' | 'dots'
  const [includeLogo, setIncludeLogo] = useState(true);
  const [logoShape, setLogoShape] = useState("circle"); // 'circle' | 'rounded'
  const [logoSize, setLogoSize] = useState(0.22); // 0.18, 0.22, 0.25
  const [viewMode, setViewMode] = useState("card"); // 'qr' | 'card'
  const [copied, setCopied] = useState(false);
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
        margin: 3,
        color: selectedColor,
        bgColor: "#FFFFFF",
        dotStyle,
        includeLogo,
        logoUrl: schoolLogoUrl,
        logoShape,
        logoSizeRatio: logoSize,
        logoPaddingRatio: 0.035,
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
            toast.success("QR Code image copied to clipboard! You can paste it into WhatsApp, Canva, or Docs.");
            setTimeout(() => setCopied(false), 2500);
          } else {
            // Fallback: copy link
            await navigator.clipboard.writeText(shortUrl);
            toast.info("Image copy not supported by browser. Short URL copied instead.");
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

  // Print Flyer / Card
  const handlePrint = () => {
    const qrDataUrl = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups to print.");
      return;
    }

    const titleText = link?.title || "SDPS Portal Access";
    const codeText = link?.code ? `/s/${link.code}` : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print QR Flyer - ${titleText} | SDPS Patna</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm;
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
              max-width: 480px;
              width: 100%;
              border: 3px solid #0E3B91;
              border-radius: 28px;
              padding: 36px 28px;
              text-align: center;
              background: #ffffff;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            }
            .header-badge {
              display: inline-flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 20px;
            }
            .school-logo {
              width: 56px;
              height: 56px;
              object-fit: contain;
            }
            .school-name {
              font-size: 20px;
              font-weight: 900;
              color: #0E3B91;
              letter-spacing: -0.5px;
              text-transform: uppercase;
            }
            .school-tag {
              font-size: 11px;
              font-weight: 700;
              color: #F87D0E;
              letter-spacing: 1px;
              text-transform: uppercase;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 8px;
              line-height: 1.25;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              font-weight: 600;
              margin-bottom: 24px;
            }
            .qr-wrapper {
              background: #f8fafc;
              border: 2px dashed #cbd5e1;
              border-radius: 24px;
              padding: 20px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-img {
              width: 240px;
              height: 240px;
              display: block;
              margin: 0 auto;
            }
            .link-pill {
              display: inline-block;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              color: #1d4ed8;
              font-size: 14px;
              font-weight: 800;
              font-family: monospace;
              padding: 6px 16px;
              border-radius: 12px;
              margin-bottom: 18px;
            }
            .scan-callout {
              font-size: 12px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 1px;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
            }
            .footer-info {
              margin-top: 24px;
              padding-top: 18px;
              border-top: 1px solid #e2e8f0;
              font-size: 10.5px;
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
            <div class="subtitle">Point your mobile camera to quickly open this resource</div>

            <div class="qr-wrapper">
              <img src="${qrDataUrl}" class="qr-img" alt="QR Code" />
            </div>

            <div>
              <div class="link-pill">${shortUrl}</div>
            </div>

            <div class="scan-callout">
              📷 Instant Scan with Any Camera / Scanner
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
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                QR Code Studio with Centered School Logo
              </h2>
              <p className="text-xs font-semibold text-slate-300">
                Generate high-definition, scannable QR codes with SDPS emblem
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
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50">
          
          {/* Left Column: QR Code Preview Canvas */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-4">
            
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 bg-slate-200/70 rounded-2xl w-full max-w-sm">
              <button
                type="button"
                onClick={() => setViewMode("card")}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  viewMode === "card"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Branded Card
              </button>
              <button
                type="button"
                onClick={() => setViewMode("qr")}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  viewMode === "qr"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Clean QR Only
              </button>
            </div>

            {/* Preview Container */}
            {viewMode === "card" ? (
              /* Branded Card View */
              <div
                ref={cardRef}
                className="w-full max-w-sm bg-white rounded-3xl border-2 border-slate-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-5 text-center space-y-3.5 relative overflow-hidden"
              >
                {/* Top School Branding Header */}
                <div className="flex items-center justify-center gap-2.5 pb-1 border-b border-slate-100">
                  <img
                    src="/logo512.png"
                    alt="SDPS Logo"
                    className="w-7 h-7 object-contain rounded-full bg-slate-50"
                  />
                  <div className="text-left">
                    <div className="text-xs font-black text-slate-900 tracking-tight leading-none">
                      S.D. PUBLIC SCHOOL
                    </div>
                    <div className="text-[9px] font-extrabold text-orange-600 uppercase tracking-wider mt-0.5">
                      Patna • Official Portal
                    </div>
                  </div>
                </div>

                {/* Link Title */}
                <div>
                  <h3 className="text-sm font-black text-slate-900 line-clamp-1 leading-snug">
                    {link?.title || "Shortened Link"}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 truncate mt-0.5">
                    {link?.url || shortUrl}
                  </p>
                </div>

                {/* QR Canvas Render */}
                <div className="relative inline-block mx-auto bg-slate-50 p-2.5 rounded-2xl border border-slate-150 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    className="w-52 h-52 sm:w-56 sm:h-56 mx-auto rounded-xl object-contain block shadow-xs"
                  />
                  {rendering && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                      <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Short Code Badge */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-mono text-xs font-black tracking-wide">
                    {shortUrl.replace(/^https?:\/\//, "")}
                  </span>
                </div>

                {/* Scan Helper Footer */}
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1 pt-1">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  Scan with Camera to Visit
                </div>
              </div>
            ) : (
              /* Minimal QR Preview */
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md text-center space-y-3">
                <div className="relative inline-block">
                  <canvas
                    ref={canvasRef}
                    className="w-56 h-56 sm:w-64 sm:h-64 mx-auto rounded-2xl object-contain block shadow-sm"
                  />
                  {rendering && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                      <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-xs font-mono font-bold text-slate-600 bg-slate-100 py-1.5 px-3 rounded-xl truncate max-w-xs mx-auto">
                  {shortUrl}
                </div>
              </div>
            )}

            {/* Test Link Button */}
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Test Short Link in New Tab
            </a>
          </div>

          {/* Right Column: Customization Studio Controls */}
          <div className="lg:col-span-6 space-y-5">
            
            {/* 1. School Logo Center Settings */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Center School Logo
                  </label>
                </div>
                
                {/* Toggle Logo */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeLogo}
                    onChange={(e) => setIncludeLogo(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {includeLogo && (
                <div className="pt-2 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                  {/* Badge Shape */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">Badge Shield Shape</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setLogoShape("circle")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          logoShape === "circle"
                            ? "border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Circular Shield
                      </button>
                      <button
                        type="button"
                        onClick={() => setLogoShape("rounded")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          logoShape === "rounded"
                            ? "border-blue-600 bg-blue-50/70 text-blue-700 shadow-2xs"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Squircle Badge
                      </button>
                    </div>
                  </div>

                  {/* Logo Size */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-bold text-slate-400">
                      <span>Logo Scale Size</span>
                      <span className="text-slate-700 font-extrabold">{Math.round(logoSize * 100)}%</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Compact (18%)", val: 0.18 },
                        { label: "Standard (22%)", val: 0.22 },
                        { label: "Bold (25%)", val: 0.25 },
                      ].map((item) => (
                        <button
                          key={item.val}
                          type="button"
                          onClick={() => setLogoSize(item.val)}
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                            logoSize === item.val
                              ? "border-blue-600 bg-blue-50 text-blue-700 font-black"
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] font-medium text-slate-400 leading-relaxed">
                    Rendered with Error Correction Level H (30% redundancy) to guarantee rapid mobile scanning with the center emblem intact.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Color Themes */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-indigo-600" />
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700">
                    QR Foreground Color
                  </label>
                </div>
                
                {/* Custom Color Input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-7 h-7 rounded-lg border border-slate-200 p-0.5 cursor-pointer bg-white shadow-xs"
                    title="Custom Color"
                  />
                  <span className="text-[11px] font-mono font-bold text-slate-500 uppercase">
                    {selectedColor}
                  </span>
                </div>
              </div>

              {/* Preset Color Chips */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedColor(preset.value)}
                    className={`py-2 px-1 rounded-xl text-[10px] font-bold border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                      selectedColor.toLowerCase() === preset.value.toLowerCase()
                        ? "border-blue-600 bg-blue-50/50 shadow-2xs"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full ${preset.bg} shadow-xs`} />
                    <span className="truncate max-w-full text-slate-700">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Module Dot Styling */}
            <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-xs space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                Pattern Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "rounded", label: "Smooth Rounded" },
                  { id: "square", label: "Classic Square" },
                  { id: "dots", label: "Dot Matrix" },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setDotStyle(s.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                      dotStyle === s.id
                        ? "border-blue-600 bg-blue-50/70 text-blue-700 font-extrabold shadow-2xs"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Export & Download Actions */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleDownloadPNG}
                  className="py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Download PNG (1024px)
                </button>

                <button
                  type="button"
                  onClick={handleCopyImage}
                  className="py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied Image!" : "Copy QR Image"}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-2xl font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-500" /> Print Flyer / Card
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSVG}
                  className="py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-700 rounded-2xl font-bold text-xs shadow-2xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-500" /> Download Vector SVG
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

