import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { uploadFile, fullUrl } from "@/lib/admin";
import { toast, Toaster } from "sonner";
import { 
  Play, ImageIcon, Download, CloudLightning, ArrowUp, ArrowDown, 
  ArrowLeft, ArrowRight, RotateCcw, User, Trash2, Calendar, UserCheck,
  Palette, Image as CustomImageIcon, Sliders, Type
} from "lucide-react";

export function AdminThumbnailGenerator() {
  const canvasRef = useRef(null);

  // Lists
  const [educators, setEducators] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Inputs
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [title1, setTitle1] = useState("MATHEMATICS");
  const [title2, setTitle2] = useState("SDPS Online Classes");
  
  // Background & Preset Style Options
  const [bgTemplate, setBgTemplate] = useState("pastel"); // pastel | navy | custom
  const [customBgUrl, setCustomBgUrl] = useState("");
  const [presetStyle, setPresetStyle] = useState("indigo"); // indigo | violet | forest | slate | electric | custom
  
  const [title1Color, setTitle1Color] = useState("#0a194f");
  const [title2Color, setTitle2Color] = useState("#ff5e62");
  const [fontFamily, setFontFamily] = useState("Outfit");
  const [cardStyle, setCardStyle] = useState("none"); // none | dark | light

  // Nudging coordinates
  const [teacherX, setTeacherX] = useState(0);
  const [teacherY, setTeacherY] = useState(0);
  const [teacherScale, setTeacherScale] = useState(1.0);
  const [textNudgeX, setTextNudgeX] = useState(0);
  const [textNudgeY, setTextNudgeY] = useState(0);
  const [title1Size, setTitle1Size] = useState(80);

  // Loaded images for canvas rendering
  const [logoImage, setLogoImage] = useState(null);
  const [teacherImage, setTeacherImage] = useState(null);
  const [customBgImage, setCustomBgImage] = useState(null);

  // Page UI State
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  // Find currently selected teacher
  const selectedTeacher = educators.find(e => e.id === selectedTeacherId);

  // Fetch initial data
  const loadData = async () => {
    setLoading(true);
    try {
      const [edRes, histRes] = await Promise.all([
        api.get("/admin/educators"),
        api.get("/admin/generated-thumbnails")
      ]);
      setEducators(edRes.data);
      setHistory(histRes.data);
      if (edRes.data.length > 0) {
        setSelectedTeacherId(edRes.data[0].id);
      }
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pre-load school logo watermark
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "https://sdpublic.org/assets/img/logo.png";
    img.onload = () => setLogoImage(img);
    img.onerror = () => console.error("Failed to load school logo");
  }, []);

  // Pre-load selected teacher transparent photo
  useEffect(() => {
    if (!selectedTeacher?.photo_url) {
      setTeacherImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = fullUrl(selectedTeacher.photo_url);
    img.onload = () => setTeacherImage(img);
    img.onerror = () => {
      setTeacherImage(null);
      toast.error("Failed to load teacher image");
    };
  }, [selectedTeacher]);

  // Load custom background image
  useEffect(() => {
    if (bgTemplate !== "custom" || !customBgUrl) {
      setCustomBgImage(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = fullUrl(customBgUrl);
    img.onload = () => setCustomBgImage(img);
    img.onerror = () => {
      setCustomBgImage(null);
      toast.error("Failed to load custom background image");
    };
  }, [bgTemplate, customBgUrl]);

  // Presets mapping configuration
  useEffect(() => {
    if (presetStyle === "custom") return;

    // Preset options based on background styles
    const presets = {
      indigo: { t1: "#0a194f", t2: "#ff5e62", font: "Outfit", card: "none" },
      violet: { t1: "#5e17eb", t2: "#ec4899", font: "Poppins", card: "none" },
      forest: { t1: "#0f5132", t2: "#d97706", font: "Montserrat", card: "none" },
      slate: { t1: "#1e293b", t2: "#ef4444", font: "Impact", card: "none" },
      electric: { t1: "#1e40af", t2: "#d946ef", font: "Inter", card: "none" }
    };

    // If navy background is active, force dark card backing for legibility
    if (bgTemplate === "navy") {
      presets.indigo = { t1: "#FFFFFF", t2: "#C7A15B", font: "Outfit", card: "dark" };
      presets.violet = { t1: "#E8D8FF", t2: "#F472B6", font: "Poppins", card: "dark" };
      presets.forest = { t1: "#FFFFFF", t2: "#FBBF24", font: "Montserrat", card: "dark" };
      presets.slate = { t1: "#F1F5F9", t2: "#F87171", font: "Impact", card: "dark" };
      presets.electric = { t1: "#FFFFFF", t2: "#F472B6", font: "Inter", card: "dark" };
    }

    const current = presets[presetStyle];
    if (current) {
      setTitle1Color(current.t1);
      setTitle2Color(current.t2);
      setFontFamily(current.font);
      setCardStyle(current.card);
    }
  }, [presetStyle, bgTemplate]);

  // Helper function to wrap text inside canvas
  const getLines = (ctx, text, maxWidth) => {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  const wrapText = (ctx, text, x, y, lineHeight, maxWidth) => {
    const lines = getLines(ctx, text, maxWidth);
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y + (i * lineHeight));
    }
  };

  // Draw the asterisk / flower shape seen in the grain background template
  const drawFlower = (ctx, x, y, size, color) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    const petals = 8;
    for (let i = 0; i < petals; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.25, size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.restore();
  };

  // Render the Modern Grain Pastel Template Background
  const drawModernPastelTemplate = (ctx) => {
    // 1. Solid White Base
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1920, 1080);
    
    // 2. Top-left warm peach gradient wash
    ctx.save();
    const tlGrad = ctx.createRadialGradient(0, 0, 100, 200, 200, 750);
    tlGrad.addColorStop(0, "rgba(255, 94, 98, 0.72)"); 
    tlGrad.addColorStop(0.5, "rgba(255, 153, 102, 0.4)");
    tlGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = tlGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 900, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // 3. Bottom-left purple/blue gradient wash
    ctx.save();
    const blGrad = ctx.createRadialGradient(0, 1080, 100, 100, 980, 600);
    blGrad.addColorStop(0, "rgba(108, 92, 231, 0.45)");
    blGrad.addColorStop(0.5, "rgba(75, 108, 183, 0.18)");
    blGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = blGrad;
    ctx.beginPath();
    ctx.arc(0, 1080, 800, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Right-side circular pink/yellow blob
    ctx.save();
    const rGrad = ctx.createRadialGradient(1600, 540, 50, 1500, 540, 600);
    rGrad.addColorStop(0, "rgba(236, 72, 153, 0.65)"); // Hot pink
    rGrad.addColorStop(0.4, "rgba(249, 115, 22, 0.45)"); // Orange
    rGrad.addColorStop(0.8, "rgba(234, 179, 8, 0.25)"); // Yellow
    rGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.arc(1600, 540, 750, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Drawing repeated curved "online classes" watermarks on the right
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.04)"; 
    ctx.font = "italic bold 64px sans-serif";
    ctx.textAlign = "right";
    for (let i = 0; i < 9; i++) {
      ctx.save();
      ctx.translate(1850, 150 + i * 95);
      ctx.rotate(-0.16 + Math.sin(i / 2) * 0.08); 
      ctx.fillText("online classes", 0, 0);
      ctx.restore();
    }
    ctx.restore();

    // 6. Draw Asterisks / Flower details
    drawFlower(ctx, 520, 120, 55, "#6C5CE7"); // Top left
    drawFlower(ctx, 230, 880, 35, "#4A00E0"); // Bottom left
    drawFlower(ctx, 800, 580, 22, "#86EFAC"); // Center
    drawFlower(ctx, 1680, 80, 42, "#7015D1");  // Top right
    drawFlower(ctx, 1800, 940, 22, "#86EFAC"); // Bottom right

    // 7. Render logo at top right corner
    if (logoImage) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = 10;
      ctx.drawImage(logoImage, 1720, 40, 140, 140);
      ctx.restore();
    }
  };

  // Draw the stitched canvas
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    
    // Clear canvas
    ctx.clearRect(0, 0, 1920, 1080);
    
    if (bgTemplate === "navy") {
      // Draw background Navy & Gold template
      const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
      grad.addColorStop(0, "#080e22"); 
      grad.addColorStop(0.5, "#0b1c44"); 
      grad.addColorStop(1, "#080e22");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1920, 1080);
      
      // Draw Grid
      ctx.save();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < 1920; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1080);
        ctx.stroke();
      }
      for (let y = 0; y < 1080; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1920, y);
        ctx.stroke();
      }
      ctx.restore();

      // Gold curves
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 60;
      ctx.fillStyle = "rgba(199, 161, 91, 0.18)";
      ctx.beginPath();
      ctx.moveTo(1275, 0);
      ctx.bezierCurveTo(1200, 300, 1650, 780, 1470, 1080);
      ctx.lineTo(1920, 1080);
      ctx.lineTo(1920, 0);
      ctx.closePath();
      ctx.fill();
      
      ctx.strokeStyle = "#C7A15B";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(1305, 0);
      ctx.bezierCurveTo(1215, 315, 1680, 750, 1500, 1080);
      ctx.stroke();
      ctx.restore();

      // logo / text top left
      if (logoImage) {
        ctx.save();
        ctx.globalAlpha = 0.05;
        ctx.drawImage(logoImage, 180, 240, 600, 600);
        ctx.restore();
        
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
        ctx.shadowBlur = 15;
        ctx.drawImage(logoImage, 75, 60, 120, 120);
        ctx.restore();
      }
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 48px Outfit, Inter, sans-serif";
      ctx.fillText("S.D. PUBLIC SCHOOL", 215, 110);
      ctx.fillStyle = "#C7A15B";
      ctx.font = "bold 24px Outfit, Inter, sans-serif";
      ctx.fillText("ESTD. 1994 • PATNA-7", 215, 155);

    } else if (bgTemplate === "pastel") {
      drawModernPastelTemplate(ctx);
    } else if (bgTemplate === "custom" && customBgImage) {
      // Draw uploaded custom template image spanning 1920x1080
      ctx.drawImage(customBgImage, 0, 0, 1920, 1080);
    } else {
      // Default backup
      ctx.fillStyle = "#F8FAFC";
      ctx.fillRect(0, 0, 1920, 1080);
    }
    
    // 5. Draw Glassmorphism Text Card Container if selected
    if (cardStyle !== "none") {
      ctx.save();
      if (cardStyle === "dark") {
        ctx.fillStyle = "rgba(10, 16, 36, 0.65)";
        ctx.strokeStyle = "rgba(199, 161, 91, 0.35)";
      } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
      }
      ctx.lineWidth = 4;
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)";
      ctx.shadowBlur = 35;
      
      const rx = 75, ry = 270, rw = 930, rh = 720, rad = 36;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(rx, ry, rw, rh, rad);
      } else {
        ctx.rect(rx, ry, rw, rh);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Educator image (overlayed on the right side)
    if (teacherImage) {
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      
      const imgWidth = teacherImage.width;
      const imgHeight = teacherImage.height;
      const aspectRatio = imgWidth / imgHeight;
      
      const targetHeight = 1020 * teacherScale;
      const targetWidth = targetHeight * aspectRatio;
      
      const defaultX = 1920 - targetWidth - 15;
      const defaultY = 1080 - targetHeight + 15;
      
      const drawX = defaultX + teacherX;
      const drawY = defaultY + teacherY;
      
      ctx.drawImage(teacherImage, drawX, drawY, targetWidth, targetHeight);
      ctx.restore();
    }
    
    // 7. Render Title 1 & Title 2 texts
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    
    const textX = (cardStyle !== "none" ? 135 : 90) + textNudgeX;
    const textY = (cardStyle !== "none" ? 345 : 300) + textNudgeY;
    const maxWidth = cardStyle !== "none" ? 810 : 980;
    
    // Apply styling colors
    ctx.fillStyle = title1Color;
    ctx.font = `bold ${title1Size}px ${fontFamily}, Inter, sans-serif`;
    ctx.textBaseline = "top";
    wrapText(ctx, title1.toUpperCase(), textX, textY, title1Size * 1.25, maxWidth);
    
    // Title 2: Sub-heading
    const lines = getLines(ctx, title1.toUpperCase(), maxWidth);
    const title1Height = lines.length * title1Size * 1.25;
    
    ctx.fillStyle = title2Color;
    ctx.font = `600 42px ${fontFamily}, Inter, sans-serif`;
    ctx.fillText(title2, textX, textY + title1Height + 50);
    
    ctx.restore();
  };

  // Re-draw canvas whenever variables modify or images load
  useEffect(() => {
    drawCanvas();
  }, [
    logoImage, teacherImage, customBgImage, title1, title2, 
    teacherX, teacherY, teacherScale, 
    textNudgeX, textNudgeY, title1Size,
    bgTemplate, title1Color, title2Color, fontFamily, cardStyle
  ]);

  // Reset coordinates
  const handleResetCoordinates = () => {
    setTeacherX(0);
    setTeacherY(0);
    setTeacherScale(1.0);
    setTextNudgeX(0);
    setTextNudgeY(0);
    setTitle1Size(80);
    toast.success("Nudging coordinates reset!");
  };

  // Local device download of the canvas
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${title1.replace(/\s+/g, "_").toLowerCase()}_thumbnail.png`;
    link.href = url;
    link.click();
    toast.success("Downloaded 1080p thumbnail locally!");
  };

  // Save the generated stitched image to Cloudinary and post history log
  const handleSaveToCloud = async () => {
    if (!selectedTeacher) {
      toast.error("Please select a teacher first!");
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    setPublishing(true);
    toast.loading("Publishing and uploading raw 1080p stitched thumbnail...", { id: "saving-thumb" });
    
    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Canvas to Blob conversion failed");

      const filename = `${selectedTeacher.name.replace(/\s+/g, "_").toLowerCase()}_${title1.replace(/\s+/g, "_").toLowerCase()}.png`;
      const file = new File([blob], filename, { type: "image/png" });
      
      const uploadRes = await uploadFile(file, "thumbnails", 20); // Upload raw to sub-folder "thumbnails" to keep quality/transparency
      
      const payload = {
        teacher_name: selectedTeacher.name,
        title1: title1,
        title2: title2,
        thumbnail_url: uploadRes.url,
      };

      await api.post("/admin/generated-thumbnails", payload);
      toast.success("Thumbnail stored on Cloudinary!", { id: "saving-thumb" });
      
      // Reload history list
      const histRes = await api.get("/admin/generated-thumbnails");
      setHistory(histRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload thumbnail.", { id: "saving-thumb" });
    } finally {
      setPublishing(false);
    }
  };

  // Handle uploading custom background template image
  const handleCustomBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBg(true);
    toast.loading("Uploading custom base canvas template...", { id: "uploading-bg" });
    try {
      const res = await uploadFile(file, "templates", 10);
      setCustomBgUrl(res.url);
      toast.success("Template uploaded successfully!", { id: "uploading-bg" });
    } catch (err) {
      toast.error("Failed to upload template image", { id: "uploading-bg" });
    } finally {
      setUploadingBg(false);
    }
  };

  // Delete generated item from history
  const handleDeleteItem = async (id) => {
    if (!window.confirm("Delete this thumbnail from history? This deletes the log, but files uploaded to Cloudinary are kept on the cloud.")) return;
    try {
      await api.delete(`/admin/generated-thumbnails/${id}`);
      setHistory(history.filter(h => h.id !== id));
      toast.success("Deleted from logs!");
    } catch {
      toast.error("Failed to delete log item.");
    }
  };

  // Helper date formatter
  const formatDate = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  return (
    <div className="space-y-8 p-1">
      <Toaster position="top-right" />

      {/* Header */}
      <div>
        <h1 className="font-headline text-2xl font-bold text-slate-800 flex items-center gap-2.5">
          <ImageIcon className="w-6 h-6 text-brand-blue" />
          SDPS Thumbnail Designer
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Combine transparent teacher pictures with the official school canvas template. Customize text, presets, positions, and publish.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-500 py-12 flex justify-center items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-blue"></div>
          Loading teachers list and history...
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: Live Stitching Preview (Canvas) */}
          <div className="xl:col-span-7 space-y-4">
            <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl overflow-hidden">
              <div className="flex justify-between items-center mb-3 px-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Stitching Preview (1920x1080 Full HD Resolution)</span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Preview
                </span>
              </div>
              
              {/* Canvas viewport */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-[#080e22]">
                <canvas 
                  ref={canvasRef} 
                  width={1920} 
                  height={1080}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 px-5 py-3 rounded-2xl font-semibold transition text-sm flex-1 justify-center border border-slate-700/50"
              >
                <Download className="w-4 h-4" /> Download 1080p PNG
              </button>
              <button
                onClick={handleSaveToCloud}
                disabled={publishing}
                className="flex items-center gap-2 bg-gradient-to-r from-brand-orange to-brand-gold hover:opacity-90 text-white px-5 py-3 rounded-2xl font-semibold transition text-sm flex-1 justify-center shadow-lg disabled:opacity-50"
              >
                <CloudLightning className="w-4 h-4" /> Publish & Save to Cloud
              </button>
            </div>
          </div>

          {/* Right panel: Controls & Settings */}
          <div className="xl:col-span-5 space-y-6">
            
            {/* Design Inputs */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                <Play className="w-4 h-4 text-brand-orange" />
                Thumbnail Content
              </h2>
              
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Teacher</label>
                {educators.length === 0 ? (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 p-3 rounded-xl">
                    No educators found. Please add teachers in the "Educators" module first.
                  </div>
                ) : (
                  <select 
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm font-medium"
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                  >
                    {educators.map(ed => (
                      <option key={ed.id} value={ed.id}>{ed.name} ({ed.role})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Title 1 (Subject / Topic)</label>
                <input 
                  type="text" 
                  value={title1}
                  onChange={e => setTitle1(e.target.value)}
                  placeholder="e.g. MATHEMATICS"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Title 2 (Sub-heading)</label>
                <input 
                  type="text" 
                  value={title2}
                  onChange={e => setTitle2(e.target.value)}
                  placeholder="e.g. SDPS Online Classes"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm"
                />
              </div>
            </div>

            {/* Background Canvas Selector */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                <CustomImageIcon className="w-4 h-4 text-emerald-500" />
                Base Canvas Template
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Canvas Background</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm font-medium"
                  value={bgTemplate}
                  onChange={e => setBgTemplate(e.target.value)}
                >
                  <option value="pastel">Modern Grain Pastel (As Uploaded)</option>
                  <option value="navy">Official Navy & Gold</option>
                  <option value="custom">Custom Image Upload</option>
                </select>
              </div>

              {bgTemplate === "custom" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                  <label className="block text-xs font-semibold text-slate-500">Upload Custom Base Canvas (1920x1080)</label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingBg}
                    onChange={handleCustomBgUpload}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {customBgUrl && (
                    <div className="text-[11px] text-slate-500 truncate mt-1">
                      Uploaded URL: <a href={fullUrl(customBgUrl)} target="_blank" rel="noreferrer" className="text-emerald-600 underline font-medium">{customBgUrl}</a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Presets & Typography Styling */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-800 border-b pb-3 flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-500" />
                Typography & Color Matching presets
              </h2>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Theme Preset</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm font-medium"
                  value={presetStyle}
                  onChange={e => setPresetStyle(e.target.value)}
                >
                  <option value="indigo">Royal Indigo & Orange (Classic)</option>
                  <option value="violet">Vivid Violet & Magenta (Modern)</option>
                  <option value="forest">Forest Green & Amber (Academic)</option>
                  <option value="slate">Matte Slate & Crimson (Strong)</option>
                  <option value="electric">Electric Blue & Purple (Tech)</option>
                  <option value="custom">Customize Colors Manually</option>
                </select>
              </div>

              {/* Card backing selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Text Card Backing</label>
                <select
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm font-medium"
                  value={cardStyle}
                  onChange={e => setCardStyle(e.target.value)}
                >
                  <option value="none">None (Directly on Background)</option>
                  <option value="dark">Dark Frosted Glass</option>
                  <option value="light">Light Frosted Glass</option>
                </select>
              </div>

              {presetStyle === "custom" && (
                <div className="p-4 bg-slate-50 rounded-2xl border space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Title 1 Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={title1Color}
                          onChange={e => setTitle1Color(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                        />
                        <span className="text-xs font-mono">{title1Color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">Title 2 Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={title2Color}
                          onChange={e => setTitle2Color(e.target.value)}
                          className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                        />
                        <span className="text-xs font-mono">{title2Color}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Font Family</label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                      value={fontFamily}
                      onChange={e => setFontFamily(e.target.value)}
                    >
                      <option value="Outfit">Outfit (Default)</option>
                      <option value="Poppins">Poppins (Rounded Modern)</option>
                      <option value="Montserrat">Montserrat (Geometric)</option>
                      <option value="Inter">Inter (Swiss Clean)</option>
                      <option value="Impact">Impact (Heavy Block)</option>
                      <option value="Georgia">Georgia (Serif Classic)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Position Nudging Panel */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div className="flex justify-between items-center border-b pb-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-brand-blue" />
                  Nudge & Scale Canvas Elements
                </h2>
                <button 
                  onClick={handleResetCoordinates} 
                  className="text-xs text-slate-400 hover:text-red-500 transition font-semibold"
                >
                  Reset Offsets
                </button>
              </div>

              {/* Teacher controls */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/50">Teacher Picture Positioning</h3>
                
                {/* Scale */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                    <span>Teacher Image Scale</span>
                    <span className="font-semibold text-slate-700">{teacherScale.toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setTeacherScale(Math.max(0.5, teacherScale - 0.05))} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-sm font-bold text-slate-600">-</button>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.0" 
                      step="0.05" 
                      value={teacherScale} 
                      onChange={e => setTeacherScale(parseFloat(e.target.value))}
                      className="w-full accent-brand-blue"
                    />
                    <button onClick={() => setTeacherScale(Math.min(2.0, teacherScale + 0.05))} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-sm font-bold text-slate-600">+</button>
                  </div>
                </div>

                {/* X & Y position arrows grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">Nudge X / Horizontal</label>
                    <div className="flex items-center justify-center gap-2 bg-slate-50 p-2.5 rounded-xl border">
                      <button onClick={() => setTeacherX(teacherX - 10)} className="p-2 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowLeft className="w-3.5 h-3.5" /></button>
                      <span className="text-xs font-semibold text-slate-600 w-10 text-center">{teacherX}px</span>
                      <button onClick={() => setTeacherX(teacherX + 10)} className="p-2 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowRight className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">Nudge Y / Vertical</label>
                    <div className="flex items-center justify-center gap-2 bg-slate-50 p-2.5 rounded-xl border">
                      <button onClick={() => setTeacherY(teacherY - 10)} className="p-2 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <span className="text-xs font-semibold text-slate-600 w-10 text-center">{teacherY}px</span>
                      <button onClick={() => setTeacherY(teacherY + 10)} className="p-2 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text controls */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/50">Title Text Positioning</h3>
                
                {/* Font Size */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                    <span>Title 1 Font Size</span>
                    <span className="font-semibold text-slate-700">{title1Size}px</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setTitle1Size(Math.max(40, title1Size - 2))} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-sm font-bold text-slate-600">-</button>
                    <input 
                      type="range" 
                      min="40" 
                      max="130" 
                      step="2" 
                      value={title1Size} 
                      onChange={e => setTitle1Size(parseInt(e.target.value))}
                      className="w-full accent-brand-blue"
                    />
                    <button onClick={() => setTitle1Size(Math.min(130, title1Size + 2))} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-sm font-bold text-slate-600">+</button>
                  </div>
                </div>

                {/* X & Y position arrows grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">Nudge X / Horizontal</label>
                    <div className="flex items-center justify-center gap-2 bg-slate-50 p-2.5 rounded-xl border">
                      <button onClick={() => setTextNudgeX(textNudgeX - 10)} className="p-2 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowLeft className="w-3.5 h-3.5" /></button>
                      <span className="text-xs font-semibold text-slate-600 w-10 text-center">{textNudgeX}px</span>
                      <button onClick={() => setTextNudgeX(textNudgeX + 10)} className="p-2 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowRight className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 text-center">Nudge Y / Vertical</label>
                    <div className="flex items-center justify-center gap-2 bg-slate-50 p-2.5 rounded-xl border">
                      <button onClick={() => setTextNudgeY(textNudgeY - 10)} className="p-2 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <span className="text-xs font-semibold text-slate-600 w-10 text-center">{textNudgeY}px</span>
                      <button onClick={() => setTextNudgeY(textNudgeY + 10)} className="p-2 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* History log panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            Generated Thumbnails History
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">List of thumbnails stitched, saved to Cloudinary, and logged with their creator.</p>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-10 text-slate-400 border border-dashed rounded-2xl text-sm">
            No generated thumbnails yet. Design one above and click "Publish & Save to Cloud" to log it.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map(item => (
              <div key={item.id} className="border border-slate-200 rounded-2xl overflow-hidden flex flex-col group hover:shadow-md transition">
                
                {/* Image Viewport */}
                <div className="aspect-video w-full relative bg-slate-900 border-b overflow-hidden">
                  <img 
                    src={fullUrl(item.thumbnail_url)} 
                    alt={item.title1} 
                    className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end p-3">
                    <a 
                      href={fullUrl(item.thumbnail_url)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs font-semibold text-white bg-brand-blue hover:bg-brand-blue-light px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> View Fullscreen
                    </a>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm truncate leading-snug">{item.title1.toUpperCase()}</h3>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.title2}</p>
                    <p className="text-[11px] text-slate-400 mt-2 font-medium flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Teacher: {item.teacher_name}
                    </p>
                  </div>
                  
                  {/* Meta info */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[10px] text-slate-400 space-y-0.5">
                      <div className="font-semibold text-slate-600 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> By: {item.created_by || "System"}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> {formatDate(item.created_at)}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                      title="Delete log record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default AdminThumbnailGenerator;
