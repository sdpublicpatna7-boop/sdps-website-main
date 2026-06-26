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
              style={{
                transform: `scale(${scale}) translate(${x}px, ${y}px)`,
                transformOrigin: "center center",
              }}
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
            <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-3 tracking-wider">
                Live Site Demo ({preset.label})
              </span>
              <div className={`relative overflow-hidden bg-slate-200 border border-slate-300 shadow-inner flex items-center justify-center ${preset.containerClass}`}>
                <img
                  src={fullUrl(base)}
                  alt="Adjusting"
                  style={{
                    transform: `scale(${tempScale}) translate(${tempX}px, ${tempY}px)`,
                    transformOrigin: "center center",
                    transition: "transform 0.05s ease-out",
                  }}
                  className={preset.imgClass}
                />
              </div>
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
