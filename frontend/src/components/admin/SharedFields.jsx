import { useState } from "react";
import { toast } from "sonner";
import { fullUrl, uploadImage, uploadFile } from "@/lib/admin";

// Reusable dual-mode image field (upload from device OR paste URL)
export function ImageOrUrlField({ value, onChange, subDir = "misc" }) {
  const [mode, setMode] = useState(value && value.startsWith("http") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);

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

  const updateParam = (newScale, newX, newY) => {
    if (!base) return;
    const params = new URLSearchParams();
    if (newScale !== 1) params.set("scale", newScale.toFixed(2));
    if (newX !== 0) params.set("x", Math.round(newX).toString());
    if (newY !== 0) params.set("y", Math.round(newY).toString());
    const queryStr = params.toString();
    onChange(queryStr ? `${base}?${queryStr}` : base);
  };

  return (
    <div className="space-y-4 mt-1 border border-slate-100 p-4 rounded-2xl bg-slate-50/50">
      {value && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Live Preview Container */}
          <div className="relative w-40 h-40 rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-slate-100 flex items-center justify-center">
            <img
              src={fullUrl(base)}
              alt="Preview"
              style={{
                transform: `scale(${scale}) translate(${x}px, ${y}px)`,
                transformOrigin: "center center",
                transition: "transform 0.1s ease-out",
              }}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-600 shadow-md font-bold z-10"
            >
              ×
            </button>
          </div>

          {/* Adjustments Controls */}
          <div className="flex-grow w-full space-y-3">
            <h4 className="text-xs font-bold uppercase text-brand-blue tracking-wide flex items-center gap-1.5">
              <span>🎛️</span> Image Position Adjustment
            </h4>
            
            {/* Zoom Control */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Zoom Level: {scale.toFixed(2)}x</span>
                <button 
                  type="button" 
                  onClick={() => updateParam(1, x, y)} 
                  className="text-brand-orange hover:underline font-semibold"
                >
                  Reset Zoom
                </button>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={scale}
                onChange={(e) => updateParam(parseFloat(e.target.value), x, y)}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
            </div>

            {/* Horizontal Nudge (X) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Horizontal Nudge (X): {x}px</span>
                <button 
                  type="button" 
                  onClick={() => updateParam(scale, 0, y)} 
                  className="text-brand-orange hover:underline font-semibold"
                >
                  Center X
                </button>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={x}
                onChange={(e) => updateParam(scale, parseInt(e.target.value), y)}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
            </div>

            {/* Vertical Nudge (Y) */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Vertical Nudge (Y): {y}px</span>
                <button 
                  type="button" 
                  onClick={() => updateParam(scale, x, 0)} 
                  className="text-brand-orange hover:underline font-semibold"
                >
                  Center Y
                </button>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                step="1"
                value={y}
                onChange={(e) => updateParam(scale, x, parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
            </div>

            {/* Reset All Adjustments */}
            {(scale !== 1 || x !== 0 || y !== 0) && (
              <button
                type="button"
                onClick={() => updateParam(1, 0, 0)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-md transition"
              >
                Reset All Adjustments
              </button>
            )}
          </div>
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
