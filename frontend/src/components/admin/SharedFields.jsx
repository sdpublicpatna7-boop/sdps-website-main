import { useState } from "react";
import { toast } from "sonner";
import { Sliders, X, Upload, Link2, ImageIcon, Loader2 } from "lucide-react";
import { fullUrl, uploadImage, uploadFile } from "@/lib/admin";

const ASPECT_PRESETS = {
  video: {
    label: "Video Aspect Ratio (16:9)",
    containerClass: "w-full max-w-sm aspect-video rounded-2xl",
    imgClass: "w-full h-full object-cover"
  },
  round: {
    label: "Circular Avatar (1:1)",
    containerClass: "w-40 h-40 rounded-full ring-4 ring-brand-blue/20",
    imgClass: "w-full h-full object-cover"
  },
  portrait: {
    label: "Portrait Card (3:4)",
    containerClass: "w-48 h-64 rounded-2xl",
    imgClass: "w-full h-full object-cover"
  },
  square: {
    label: "Square (1:1)",
    containerClass: "w-48 h-48 rounded-2xl",
    imgClass: "w-full h-full object-cover"
  }
};

function MockupPreview({ aspect, imageUrl, scale, x, y }) {
  const [naturalAspect, setNaturalAspect] = useState(16 / 9);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      setNaturalAspect(naturalWidth / naturalHeight);
    }
  };

  const imgStyle = {
    transform: `scale(${scale}) translate(${x}px, ${y}px)`,
    transformOrigin: "center center",
    transition: "transform 0.05s ease-out",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: (scale === 1 && x === 0 && y === 0) ? "center top" : "center center",
    display: "block"
  };

  const ImageWrapper = ({ className = "" }) => (
    <div 
      className={`overflow-hidden relative bg-slate-100 border border-slate-200 shadow-inner ${className}`}
      style={{ aspectRatio: naturalAspect }}
    >
      <img
        src={imageUrl}
        alt="Previewing"
        onLoad={handleImageLoad}
        style={imgStyle}
      />
    </div>
  );

  switch (aspect) {
    case "logo":
      return (
        <div className="w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-[#0b2552] text-[8px] text-white/85 px-3 py-1 flex justify-between items-center select-none font-semibold">
            <span>📞 +91 99551 90262</span>
            <span>ERP Login</span>
          </div>
          <div className="bg-white/95 px-3 py-2 flex items-center gap-2 border-b border-slate-100 select-none">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-sm shrink-0 bg-white flex items-center justify-center p-0.5">
              <img src={imageUrl} alt="Logo" style={imgStyle} className="rounded-full" onLoad={handleImageLoad} />
            </div>
            <div className="leading-none flex-1">
              <div className="text-[10px] font-bold text-slate-800">S.D. Public School</div>
              <div className="text-[5px] uppercase tracking-wider text-slate-500 font-bold">Empowering Generations</div>
            </div>
            <div className="flex gap-1.5 text-[7px] text-slate-500 font-bold">
              <span>Home</span>
              <span>About</span>
              <span>Admissions</span>
            </div>
          </div>
          <div className="p-3 text-center text-[9px] text-slate-400 font-bold bg-white/60">Website Header Preview</div>
        </div>
      );

    case "director":
    case "principal":
      return (
        <div className="w-full max-w-[320px] bg-white border border-slate-150 rounded-2xl shadow-sm p-4 space-y-3">
          <div className="flex gap-3 items-center">
            <div className="w-16 h-16 rounded-full overflow-hidden ring-4 ring-amber-400 bg-slate-50 shrink-0 relative flex items-center justify-center shadow-inner">
              <img src={imageUrl} alt="Avatar" style={imgStyle} className="rounded-full" onLoad={handleImageLoad} />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-2/3 bg-slate-200 rounded" />
              <div className="h-2 w-1/2 bg-[#f97316]/20 rounded" />
              <div className="h-1.5 w-1/3 bg-slate-100 rounded" />
            </div>
          </div>
          <div className="border-t border-slate-50 pt-2 text-[9px] text-slate-400 italic font-semibold leading-relaxed">
            "ज्ञान का प्रायोगिक रूप ही शिक्षा है। शिक्षा के बदौलत ही समाज में जागरूकता..."
          </div>
        </div>
      );

    case "welcome_popup":
      return (
        <div className="w-full max-w-[240px] bg-white border border-slate-200 rounded-3xl shadow-lg p-3 space-y-3">
          <div className="flex justify-between items-center pb-1 border-b border-slate-50">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">SDPS Update</span>
            <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[9px] text-slate-500 font-bold cursor-pointer">×</div>
          </div>
          <ImageWrapper className="w-full rounded-2xl" />
          <div className="space-y-1">
            <div className="h-2.5 w-3/4 bg-slate-200 rounded" />
            <div className="h-1.5 w-full bg-slate-100 rounded" />
            <div className="h-1.5 w-5/6 bg-slate-100 rounded" />
          </div>
          <div className="h-6 w-20 bg-[#0E3B91] rounded-lg" />
        </div>
      );

    case "demystified":
      return (
        <div className="w-full max-w-[320px] bg-white border border-slate-200 rounded-2xl shadow-sm p-3 space-y-2">
          <div className="bg-slate-50 h-8 rounded-lg flex items-center px-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            📖 Demystified Page Infographic
          </div>
          <ImageWrapper className="w-full rounded-xl" />
        </div>
      );

    case "preschool":
      return (
        <div className="w-full max-w-[320px] bg-gradient-to-br from-pink-50 via-amber-50 to-orange-50/70 border border-slate-200 rounded-3xl p-4 flex gap-4 items-center shadow-sm">
          <div className="flex-1 space-y-1.5">
            <div className="text-[10px] font-bold text-[#0E3B91]">Pre-School Section</div>
            <div className="h-1.5 w-full bg-slate-200/60 rounded" />
            <div className="h-1.5 w-5/6 bg-slate-100/60 rounded" />
            <div className="h-4.5 w-16 bg-[#f97316] rounded-lg" />
          </div>
          <div className="w-20 shrink-0">
            <ImageWrapper className="w-full rounded-2xl shadow-md border border-white p-0.5 bg-white" />
          </div>
        </div>
      );

    case "khelo_patna":
      return (
        <div className="w-full max-w-[320px] bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex justify-center items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-slate-100" />
            <span className="text-[10px] text-slate-350 font-bold">×</span>
            <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center text-[8px] text-white">KP</div>
          </div>
          <div className="text-center text-[10px] font-bold text-slate-800">SDPS × Khelo Patna Partnership</div>
          <ImageWrapper className="w-full rounded-2xl" />
        </div>
      );

    case "hero_feature":
      return (
        <div className="w-full max-w-[320px] bg-slate-50 border border-slate-200 rounded-3xl p-4 grid grid-cols-12 gap-3 items-center shadow-sm">
          <div className="col-span-7 space-y-2">
            <div className="h-3 w-3/4 bg-slate-300 rounded" />
            <div className="h-1.5 w-full bg-slate-200 rounded" />
            <div className="h-1.5 w-5/6 bg-slate-200 rounded" />
            <div className="flex gap-1.5 mt-2">
              <div className="h-5 w-12 bg-slate-300 rounded-lg" />
              <div className="h-5 w-12 bg-slate-200 rounded-lg" />
            </div>
          </div>
          <div className="col-span-5">
            <ImageWrapper className="w-full rounded-2xl shadow-md" />
          </div>
        </div>
      );

    case "hero_banner":
      return (
        <div className="w-full max-w-[320px] bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden relative shadow-sm" style={{ aspectRatio: '16/9' }}>
          <img src={imageUrl} alt="Hero Banner" style={imgStyle} onLoad={handleImageLoad} />
          <div className="absolute inset-0 bg-[#0E3B91]/30 p-4 flex flex-col justify-end space-y-1 select-none">
            <div className="h-3 w-1/2 bg-white/90 rounded" />
            <div className="h-1.5 w-2/3 bg-white/70 rounded" />
            <div className="h-4.5 w-12 bg-brand-orange rounded-md mt-1" />
          </div>
        </div>
      );

    case "admission_open":
      return (
        <div className="w-full max-w-[320px] bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-sm">
          <div className="bg-[#0b2552] text-white py-1.5 rounded-lg text-center text-[8px] font-bold uppercase tracking-wider select-none">
            Admissions Open 2026-27
          </div>
          <ImageWrapper className="w-full rounded-xl" />
        </div>
      );

    case "ranked_badge":
      return (
        <div className="w-full max-w-[320px] bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center space-y-2 shadow-sm">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider select-none">Ranked Seal Badge</div>
          <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 shadow-inner bg-white flex items-center justify-center p-0.5">
            <img src={imageUrl} alt="Badge" style={imgStyle} className="rounded-full" onLoad={handleImageLoad} />
          </div>
          <div className="h-2 w-24 bg-slate-100 rounded" />
        </div>
      );

    case "about_trust":
      return (
        <div className="w-full max-w-[320px] bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-12 gap-3 shadow-sm">
          <div className="col-span-8 space-y-2">
            <div className="h-3 w-1/2 bg-slate-250 rounded" />
            <div className="h-1.5 w-full bg-slate-100 rounded" />
            <div className="h-1.5 w-5/6 bg-slate-100 rounded" />
          </div>
          <div className="col-span-4">
            <ImageWrapper className="w-full rounded-xl shadow-md" />
          </div>
        </div>
      );

    case "academics_learning":
    case "academics_facilities":
    case "career_hero":
      return (
        <div className="w-full max-w-[320px] bg-white border border-slate-200 rounded-2xl p-3 space-y-2 shadow-sm">
          <div className="h-2.5 w-1/2 bg-slate-300 rounded" />
          <ImageWrapper className="w-full rounded-xl" />
          <div className="h-1.5 w-full bg-slate-100 rounded" />
        </div>
      );

    default:
      // Fallback
      return (
        <div className="flex flex-col items-center justify-center w-full">
          <ImageWrapper className="w-full max-w-[240px] rounded-2xl" />
        </div>
      );
  }
}

// Reusable dual-mode image field (upload from device OR paste URL)
export function ImageOrUrlField({ value, onChange, subDir = "misc", aspect = "video" }) {
  const [mode, setMode] = useState(value && value.startsWith("http") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal edit states
  const [tempScale, setTempScale] = useState(1);
  const [tempX, setTempX] = useState(0);
  const [tempY, setTempY] = useState(0);

  // Parse existing parameters from the value
  const parseParams = (urlStr) => {
    if (!urlStr || typeof urlStr !== "string") return { base: "", scale: 1, x: 0, y: 0 };
    const parts = urlStr.split("?");
    const base = parts[0];
    const query = parts[1];
    if (!query) return { base, scale: 1, x: 0, y: 0 };
    const searchParams = new URLSearchParams(query);
    const scale = parseFloat(searchParams.get("scale")) || 1;
    const x = parseFloat(searchParams.get("x")) || 0;
    const y = parseFloat(searchParams.get("y")) || 0;
    return { base, scale, x, y };
  };

  const { base, scale, x, y } = parseParams(value);
  const preset = ASPECT_PRESETS[aspect] || ASPECT_PRESETS.video;
  const aspectWidths = {
    square: 192,
    round: 160,
    portrait: 192,
    video: 384,
  };
  const refWidth = aspectWidths[aspect] || 192;
  const pctX = (x / refWidth) * 100;
  const pctY = (y / refWidth) * 100;

  const openAdjustmentModal = () => {
    setTempScale(scale);
    setTempX(x);
    setTempY(y);
    setIsModalOpen(true);
  };

  const applyChanges = () => {
    if (!base) return;
    const params = new URLSearchParams();
    if (tempScale !== 1) params.set("scale", tempScale.toFixed(2));
    if (tempX !== 0) params.set("x", Math.round(tempX).toString());
    if (tempY !== 0) params.set("y", Math.round(tempY).toString());
    const queryStr = params.toString();
    onChange(queryStr ? `${base}?${queryStr}` : base);
    setIsModalOpen(false);
    toast.success("Image position updated");
  };

  return (
    <div className="space-y-3 mt-1">
      {value && (
        <div className="flex items-center gap-4 border border-slate-100 p-3 rounded-2xl bg-slate-50/50 w-fit">
          <div className="relative w-16 h-16 rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-slate-100 flex items-center justify-center">
            <img
              src={fullUrl(base)}
              alt="Preview"
              style={
                (scale === 1 && x === 0 && y === 0)
                  ? { objectPosition: "center top" }
                  : {
                      transform: `scale(${scale}) translate(${pctX.toFixed(2)}%, ${pctY.toFixed(2)}%)`,
                      transformOrigin: "center center",
                    }
              }
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={openAdjustmentModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" /> Adjust Position
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-left text-xs text-red-500 hover:text-red-700 font-semibold pl-1"
            >
              Remove Image
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit text-xs">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === "upload" ? "bg-white shadow text-brand-blue" : "text-slate-500"
          }`}
        >
          <Upload className="w-3 h-3" /> Upload
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md font-semibold transition ${
            mode === "url" ? "bg-white shadow text-brand-blue" : "text-slate-500"
          }`}
        >
          <Link2 className="w-3 h-3" /> URL
        </button>
      </div>

      {mode === "upload" ? (
        <label
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm border-2 border-dashed transition ${
            uploading
              ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
              : "border-slate-300 bg-slate-50 hover:border-brand-blue text-slate-600"
          }`}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          {uploading ? "Uploading..." : value ? "Change image" : "Choose image from device"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const f = e.target.files[0];
              if (!f) return;
              setUploading(true);
              try {
                const r = await uploadImage(f, subDir);
                onChange(r.url);
                toast.success(`Uploaded — ${r.size_kb} KB`);
              } catch {
                toast.error("Upload failed");
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      ) : (
        <input
          type="url"
          placeholder="https://example.com/image.jpg"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-brand-blue outline-none"
          value={value && value.startsWith("http") ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}

      {/* Adjustments Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6 border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-headline font-bold text-lg text-slate-800 flex items-center gap-2">
                <span>🎛️</span> Adjust Image Position
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview Demo container */}
            <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100 overflow-y-auto max-h-[300px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-wider select-none">
                Live Site Demo
              </span>
              <MockupPreview
                aspect={aspect}
                imageUrl={fullUrl(base)}
                scale={tempScale}
                x={tempX}
                y={tempY}
              />
            </div>

            {/* Controls */}
            <div className="space-y-4">
              {/* Zoom */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Zoom Level: {tempScale.toFixed(2)}x</span>
                  <button
                    type="button"
                    onClick={() => setTempScale(1)}
                    className="text-brand-orange hover:underline"
                  >
                    Reset
                  </button>
                </div>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={tempScale}
                  onChange={(e) => setTempScale(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>

              {/* Horizontal */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Horizontal Nudge (X): {tempX}px</span>
                  <button
                    type="button"
                    onClick={() => setTempX(0)}
                    className="text-brand-orange hover:underline"
                  >
                    Center
                  </button>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={tempX}
                  onChange={(e) => setTempX(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>

              {/* Vertical */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-500 font-semibold">
                  <span>Vertical Nudge (Y): {tempY}px</span>
                  <button
                    type="button"
                    onClick={() => setTempY(0)}
                    className="text-brand-orange hover:underline"
                  >
                    Center
                  </button>
                </div>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={tempY}
                  onChange={(e) => setTempY(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setTempScale(1);
                  setTempX(0);
                  setTempY(0);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition"
              >
                Reset All
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyChanges}
                  className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-light text-white text-xs font-semibold rounded-xl shadow-md transition"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reusable dual-mode file field (upload from device OR paste URL)
export function FileOrUrlField({ value, onChange, subDir = "misc", maxMb = 5 }) {
  const [mode, setMode] = useState(value && value.startsWith("http") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-2 mt-1">
      {value && (
        <div className="flex items-center gap-2">
          <a
            href={fullUrl(value)}
            target="_blank"
            rel="noreferrer"
            className="text-brand-blue text-sm underline"
          >
            📎 Current file
          </a>
          <button type="button" onClick={() => onChange("")} className="text-xs text-red-500">
            Remove
          </button>
        </div>
      )}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit text-xs">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-3 py-1.5 rounded-md font-semibold transition ${
            mode === "upload" ? "bg-white shadow text-brand-blue" : "text-slate-500"
          }`}
        >
          📁 Upload
        </button>
        <button
          type="button"
          onClick={() => setMode("url")}
          className={`px-3 py-1.5 rounded-md font-semibold transition ${
            mode === "url" ? "bg-white shadow text-brand-blue" : "text-slate-500"
          }`}
        >
          🔗 URL
        </button>
      </div>
      {mode === "upload" ? (
        <label
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer text-sm border-2 border-dashed transition ${
            uploading
              ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
              : "border-slate-300 bg-slate-50 hover:border-brand-blue text-slate-600"
          }`}
        >
          {uploading ? "Uploading..." : value ? "Replace file" : `Choose file (max ${maxMb}MB)`}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const f = e.target.files[0];
              if (!f) return;
              setUploading(true);
              try {
                const r = await uploadFile(f, subDir, maxMb);
                onChange(r.url);
                toast.success("Uploaded");
              } catch (err) {
                toast.error(err?.response?.data?.detail || "Upload failed");
              } finally {
                setUploading(false);
                e.target.value = "";
              }
            }}
          />
        </label>
      ) : (
        <input
          type="url"
          placeholder="https://example.com/document.pdf"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-brand-blue outline-none"
          value={value && value.startsWith("http") ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
