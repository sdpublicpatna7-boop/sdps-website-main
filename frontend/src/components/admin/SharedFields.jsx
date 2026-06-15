import { useState } from "react";
import { toast } from "sonner";
import { fullUrl, uploadImage, uploadFile } from "@/lib/admin";

// Reusable dual-mode image field (upload from device OR paste URL)
export function ImageOrUrlField({ value, onChange, subDir = "misc" }) {
  const [mode, setMode] = useState(value && value.startsWith("http") ? "url" : "upload");
  const [uploading, setUploading] = useState(false);
  return (
    <div className="space-y-2 mt-1">
      {value && (
        <div className="relative w-fit">
          <img
            src={fullUrl(value)}
            alt=""
            className="h-24 rounded-xl object-cover border border-slate-200 shadow-sm"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
          >
            ×
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
