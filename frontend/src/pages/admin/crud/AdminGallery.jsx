import { useState } from "react";
import ResourceManager from "@/components/admin/ResourceManager";
import { fullUrl, uploadImage } from "@/lib/admin";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Upload, Loader2, Images, CheckCircle2, AlertCircle } from "lucide-react";

export function AdminGallery() {
  const [reloadKey, setReloadKey] = useState(0);
  
  // Bulk Upload States
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [category, setCategory] = useState("general");
  const [uploading, setUploading] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleBulkUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select some images first!");
      return;
    }

    setUploading(true);
    setCurrentFileIndex(0);
    setSuccessCount(0);
    setErrorCount(0);

    toast.loading(`Uploading batch of ${selectedFiles.length} images...`, { id: "bulk-upload-toast" });

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setCurrentFileIndex(i);
      try {
        // 1. Upload to Cloudinary (or uploads/ folder) with backend auto-compression
        const uploadRes = await uploadImage(file, "gallery");
        
        // 2. Save the database record in the gallery collection
        const cleanTitle = file.name.replace(/\.[^/.]+$/, "").split('_').join(' ').split('-').join(' ');
        await api.post("/admin/gallery", {
          title: cleanTitle,
          category: category.trim() || "general",
          url: uploadRes.url,
          order: 0
        });
        setSuccessCount(prev => prev + 1);
      } catch (err) {
        console.error(`Failed to upload ${file.name}`, err);
        setErrorCount(prev => prev + 1);
      }
    }

    toast.success(`Batch finished! Successfully uploaded: ${selectedFiles.length - errorCount} images.`, { id: "bulk-upload-toast" });
    setUploading(false);
    setSelectedFiles([]);
    setReloadKey(prev => prev + 1); // Trigger ResourceManager reload!
  };

  return (
    <div className="space-y-8">
      <Toaster position="top-right" />
      
      {/* Bulk Upload Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Images className="w-5 h-5 text-brand-blue" />
          Bulk Image Gallery Upload
        </h2>
        <p className="text-xs text-slate-500">
          Upload multiple images at once. Every image is compressed and optimized for the public gallery automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Category for this batch</label>
              <input 
                type="text" 
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="e.g. Annual Sports Meet 2026"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Images</label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-6 cursor-pointer hover:bg-slate-50 transition bg-slate-50/50">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-600">Click to choose multiple files</span>
                <span className="text-xs text-slate-400 mt-1">Accepts PNG, JPG, JPEG, WEBP</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Status / Preview */}
          <div className="bg-slate-50 rounded-2xl p-4 border flex flex-col justify-between">
            <div>
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Upload Status</span>
              
              {selectedFiles.length > 0 && !uploading && (
                <div className="text-sm text-slate-600">
                  <span className="font-semibold">{selectedFiles.length}</span> files selected, ready to upload to category <span className="font-semibold text-brand-orange">"{category}"</span>.
                </div>
              )}

              {uploading && (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Uploading file {currentFileIndex + 1} of {selectedFiles.length}...</span>
                    <span>{Math.round(((currentFileIndex) / selectedFiles.length) * 100)}%</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-blue transition-all duration-300"
                      style={{ width: `${((currentFileIndex) / selectedFiles.length) * 100}%` }}
                    />
                  </div>
                  
                  <div className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-blue" />
                    Processing: {selectedFiles[currentFileIndex]?.name}
                  </div>
                </div>
              )}

              {selectedFiles.length === 0 && !uploading && (
                <div className="text-center text-xs text-slate-400 py-10">
                  No files selected yet. Choose files to begin bulk upload.
                </div>
              )}
            </div>

            {selectedFiles.length > 0 && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setSelectedFiles([])}
                  disabled={uploading}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkUpload}
                  disabled={uploading}
                  className="flex-1 py-2 bg-brand-blue hover:bg-brand-blue-light text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Upload {selectedFiles.length} Images
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Existing Resource Manager List */}
      <ResourceManager 
        key={reloadKey}
        config={{
          title: "Gallery List",
          endpoint: "/admin/gallery",
          sub_dir: "gallery",
          subtitle: "Manage uploaded images in the school gallery.",
          fields: [
            { name: "title", label: "Title", type: "text", required: true },
            { name: "category", label: "Category", type: "text", default: "general" },
            { name: "url", label: "Image", type: "image", required: true },
            { name: "order", label: "Order", type: "number", default: 0 },
          ],
          columns: [
            { name: "thumb", label: "Image", render: (it) => <img src={fullUrl(it.url)} alt="" className="w-16 h-12 object-cover rounded" /> },
            { name: "title", label: "Title" },
            { name: "category", label: "Category" },
            { name: "order", label: "Order" },
          ]
        }} 
      />
    </div>
  );
}

export default AdminGallery;
