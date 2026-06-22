import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { uploadFile, fullUrl } from "@/lib/admin";
import { toast, Toaster } from "sonner";
import { 
  Play, ImageIcon, Download, CloudLightning, ArrowUp, ArrowDown, 
  ArrowLeft, ArrowRight, RotateCcw, User, Trash2, Calendar, UserCheck,
  Palette, Image as CustomImageIcon, Sliders, Type, Edit, FileText
} from "lucide-react";

export function AdminThumbnailGenerator() {
  const canvasRef = useRef(null);

  // Lists
  const [educators, setEducators] = useState([]);
  const [history, setHistory] = useState([]);
  
  // Tab State: "content" | "template" | "nudge"
  const [activeTab, setActiveTab] = useState("content");

  // Inputs
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [title1, setTitle1] = useState("MATHEMATICS");
  const [title2, setTitle2] = useState("");
  
  // Background & Preset Style Options
  const [bgTemplate, setBgTemplate] = useState("pastel"); // pastel | navy | custom
  const [customBgUrl, setCustomBgUrl] = useState("");
  const [presetStyle, setPresetStyle] = useState("indigo"); // indigo | violet | forest | slate | electric | custom
  
  const [title1Color, setTitle1Color] = useState("#6A11CB");
  const [title2Color, setTitle2Color] = useState("#FF8C42");
  const [fontFamily, setFontFamily] = useState("Outfit");
  const [cardStyle, setCardStyle] = useState("none"); // none | dark | light

  // Nudging coordinates
  const [teacherX, setTeacherX] = useState(0);
  const [teacherY, setTeacherY] = useState(0);
  const [teacherScale, setTeacherScale] = useState(1.0);
  const [textNudgeX, setTextNudgeX] = useState(0);
  const [textNudgeY, setTextNudgeY] = useState(80);
  const [title1Size, setTitle1Size] = useState(152);

  // Loaded images for canvas rendering
  const [logoImage, setLogoImage] = useState(null);
  const [teacherImage, setTeacherImage] = useState(null);
  const [customBgImage, setCustomBgImage] = useState(null);
  const [defaultBgImage, setDefaultBgImage] = useState(null);
  const [defaultBgLoaded, setDefaultBgLoaded] = useState(false);

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

  // Load the default base canvas template file from project templates directory
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/templates/default_base_canvas.jpg";
    img.onload = () => {
      setDefaultBgImage(img);
      setDefaultBgLoaded(true);
    };
    img.onerror = () => {
      setDefaultBgImage(null);
      setDefaultBgLoaded(false);
    };
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

    const presets = {
      indigo: { t1: "#6A11CB", t2: "#FF8C42", font: "Outfit", card: "none" },
      violet: { t1: "#5E17EB", t2: "#EC4899", font: "Poppins", card: "none" },
      forest: { t1: "#0F5132", t2: "#D97706", font: "Montserrat", card: "none" },
      slate: { t1: "#1E293B", t2: "#EF4444", font: "Impact", card: "none" },
      electric: { t1: "#1E40AF", t2: "#D946EF", font: "Inter", card: "none" }
    };

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
    if (!text) return [];
    const paragraphs = text.split("\n");
    const allLines = [];
    
    for (let p = 0; p < paragraphs.length; p++) {
      const paragraph = paragraphs[p];
      if (paragraph === "") {
        allLines.push("");
        continue;
      }
      const words = paragraph.split(" ");
      let currentLine = words[0] || "";
      
      for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
          currentLine += " " + word;
        } else {
          allLines.push(currentLine);
          currentLine = word;
        }
      }
      allLines.push(currentLine);
    }
    return allLines;
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
    rGrad.addColorStop(0, "rgba(236, 72, 153, 0.65)"); 
    rGrad.addColorStop(0.4, "rgba(249, 115, 22, 0.45)"); 
    rGrad.addColorStop(0.8, "rgba(234, 179, 8, 0.25)"); 
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
    drawFlower(ctx, 520, 120, 55, "#6C5CE7"); 
    drawFlower(ctx, 230, 880, 35, "#4A00E0"); 
    drawFlower(ctx, 800, 580, 22, "#86EFAC"); 
    drawFlower(ctx, 1680, 80, 42, "#7015D1");  
    drawFlower(ctx, 1800, 940, 22, "#86EFAC"); 

    // 7. Render logo at top right corner
    if (logoImage) {
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = 10;
      ctx.drawImage(logoImage, 1720, 40, 140, 140);
      ctx.restore();
    }
  };

  // Helper functions for Photoshop-style gradient, stroke, and glow effects
  const hexToRgb = (hex) => {
    let cleanHex = hex.replace("#", "");
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split("").map(c => c + c).join("");
    }
    const r = parseInt(cleanHex.slice(0, 2), 16) || 0;
    const g = parseInt(cleanHex.slice(2, 4), 16) || 0;
    const b = parseInt(cleanHex.slice(4, 6), 16) || 0;
    return { r, g, b };
  };

  const rgbToHex = (r, g, b) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const interpolateColor = (color1, color2, factor) => {
    try {
      const c1 = hexToRgb(color1);
      const c2 = hexToRgb(color2);
      const r = Math.round(c1.r + factor * (c2.r - c1.r));
      const g = Math.round(c1.g + factor * (c2.g - c1.g));
      const b = Math.round(c1.b + factor * (c2.b - c1.b));
      return rgbToHex(r, g, b);
    } catch (e) {
      return color1;
    }
  };

  const createStyledTextCanvas = (text, fontSize, fontFamily, isTitle1) => {
    // 1. Setup offscreen measurement context
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = `bold ${fontSize}px ${fontFamily}, Inter, sans-serif`;
    const textMetrics = ctx.measureText(text);
    const textWidth = Math.ceil(textMetrics.width);
    
    // Scale parameters based on font size (130px is baseline)
    const scale = fontSize / 130;
    const strokeSize = Math.max(1, Math.round(2 * scale));
    const glowSize = Math.max(2, Math.round(18 * scale));
    const shadowSize = Math.max(4, Math.round(20 * scale));
    const shadowDist = Math.max(2, Math.round(8 * scale));
    
    // Add generous padding so blur/glow doesn't clip
    const padding = Math.ceil(Math.max(glowSize, shadowSize) * 2 + 10);
    const offCanvas = document.createElement("canvas");
    offCanvas.width = textWidth + padding * 2;
    offCanvas.height = fontSize * 2 + padding * 2;
    
    const oCtx = offCanvas.getContext("2d");
    oCtx.font = ctx.font;
    oCtx.textBaseline = "top";
    
    const tx = padding;
    const ty = padding;
    
    // Determine gradient stops
    let stops = [];
    if (presetStyle === "custom" || bgTemplate === "navy") {
      const colorStart = title1Color;
      const colorEnd = title2Color;
      const colorMid = interpolateColor(colorStart, colorEnd, 0.45);
      stops = [
        { offset: 0, color: colorStart },
        { offset: 0.45, color: colorMid },
        { offset: 1, color: colorEnd }
      ];
    } else {
      const themeStops = {
        indigo: ["#6A11CB", "#D72638", "#FF8C42"],
        violet: ["#5E17EB", "#A22CE6", "#EC4899"],
        forest: ["#0F5132", "#72943B", "#D97706"],
        slate: ["#1E293B", "#7F363F", "#EF4444"],
        electric: ["#1E40AF", "#7743CE", "#D946EF"]
      };
      
      const activeStops = themeStops[presetStyle] || themeStops.indigo;
      stops = [
        { offset: 0, color: activeStops[0] },
        { offset: 0.45, color: activeStops[1] },
        { offset: 1, color: activeStops[2] }
      ];
    }
    
    // 2. Draw Gradient Overlay (Blend Mode: Normal, Opacity: 90%)
    oCtx.save();
    const cx = tx + textWidth / 2;
    const cy = ty + fontSize / 2;
    const angleRad = (64 * Math.PI) / 180;
    const dx = Math.cos(angleRad);
    const dy = -Math.sin(angleRad);
    
    // Project bounding box of text onto the 64° gradient line to fit colors corner-to-corner
    const projLength = textWidth * Math.abs(dx) + fontSize * Math.abs(dy);
    const L = projLength;
    
    const x0 = cx - (dx * L) / 2;
    const y0 = cy - (dy * L) / 2;
    const x1 = cx + (dx * L) / 2;
    const y1 = cy + (dy * L) / 2;
    
    const grad = oCtx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(s => grad.addColorStop(s.offset, s.color));
    
    oCtx.fillStyle = grad;
    oCtx.globalAlpha = 0.90; // Opacity 90%
    oCtx.fillText(text, tx, ty);
    oCtx.restore();
    
    // 3. Inside Stroke (Size: 2px, Position: Inside, Blend Mode: Soft Light, Opacity: 20%, Color: #FFFFFF)
    oCtx.save();
    const strokeCanvas = document.createElement("canvas");
    strokeCanvas.width = offCanvas.width;
    strokeCanvas.height = offCanvas.height;
    const sCtx = strokeCanvas.getContext("2d");
    sCtx.font = oCtx.font;
    sCtx.textBaseline = "top";
    sCtx.strokeStyle = "#FFFFFF";
    sCtx.lineWidth = strokeSize * 2; // 2px inside (centered 4px stroke)
    sCtx.strokeText(text, tx, ty);
    
    // Clip the stroke to only exist inside the text shape
    sCtx.globalCompositeOperation = "destination-in";
    sCtx.fillStyle = "#000000";
    sCtx.fillText(text, tx, ty);
    
    // Draw onto offscreen canvas with soft-light and 20% opacity
    oCtx.save();
    oCtx.globalCompositeOperation = "soft-light";
    oCtx.globalAlpha = 0.20;
    oCtx.drawImage(strokeCanvas, 0, 0);
    oCtx.restore();
    oCtx.restore();
    
    // 4. Inner Glow (Blend Mode: Screen, Opacity: 15%, Color: #FFFFFF, Size: 18px)
    oCtx.save();
    // Create inverse mask
    const inverseMaskCanvas = document.createElement("canvas");
    inverseMaskCanvas.width = offCanvas.width;
    inverseMaskCanvas.height = offCanvas.height;
    const imCtx = inverseMaskCanvas.getContext("2d");
    imCtx.fillStyle = "#FFFFFF";
    imCtx.fillRect(0, 0, inverseMaskCanvas.width, inverseMaskCanvas.height);
    imCtx.globalCompositeOperation = "destination-out";
    imCtx.font = oCtx.font;
    imCtx.textBaseline = "top";
    imCtx.fillText(text, tx, ty);
    
    // Create glow canvas
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = offCanvas.width;
    glowCanvas.height = offCanvas.height;
    const gCtx = glowCanvas.getContext("2d");
    gCtx.shadowColor = "#FFFFFF";
    gCtx.shadowBlur = glowSize;
    gCtx.shadowOffsetX = 0;
    gCtx.shadowOffsetY = 0;
    gCtx.drawImage(inverseMaskCanvas, 0, 0);
    
    // Clip the glow to only exist inside the text shape
    gCtx.globalCompositeOperation = "destination-in";
    gCtx.font = oCtx.font;
    gCtx.textBaseline = "top";
    gCtx.fillStyle = "#000000";
    gCtx.fillText(text, tx, ty);
    
    // Draw onto offscreen canvas with screen blend mode and 15% opacity
    oCtx.save();
    oCtx.globalCompositeOperation = "screen";
    oCtx.globalAlpha = 0.15;
    oCtx.drawImage(glowCanvas, 0, 0);
    oCtx.restore();
    oCtx.restore();
    
    return {
      canvas: offCanvas,
      padding: padding,
      width: textWidth,
      shadowSize: shadowSize,
      shadowDist: shadowDist
    };
  };

  const drawStyledTextWrapped = (ctx, text, x, y, fontSize, fontFamily, lineHeight, maxWidth, isTitle1) => {
    ctx.save();
    ctx.font = `bold ${fontSize}px ${fontFamily}, Inter, sans-serif`;
    const lines = getLines(ctx, text, maxWidth);
    
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (!lineText) continue;
      
      const lineY = y + (i * lineHeight);
      const styledInfo = createStyledTextCanvas(lineText, fontSize, fontFamily, isTitle1);
      
      // Draw drop shadow first (Blend Mode: Multiply, Opacity: 25%, OffsetY: 8px, Blur: 20px)
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = styledInfo.shadowSize;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = styledInfo.shadowDist + 10000;
      ctx.globalCompositeOperation = "multiply";
      
      // Draw far offscreen to project only the shadow
      ctx.drawImage(styledInfo.canvas, x - styledInfo.padding, lineY - styledInfo.padding - 10000);
      ctx.restore();
      
      // Draw the styled text block itself
      ctx.drawImage(styledInfo.canvas, x - styledInfo.padding, lineY - styledInfo.padding);
    }
    
    ctx.restore();
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
      if (defaultBgLoaded && defaultBgImage) {
        ctx.drawImage(defaultBgImage, 0, 0, 1920, 1080);
      } else {
        // Fallback to our vector pastel template
        drawModernPastelTemplate(ctx);
      }
    } else if (bgTemplate === "custom" && customBgImage) {
      ctx.drawImage(customBgImage, 0, 0, 1920, 1080);
    } else {
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
    const textX = (cardStyle !== "none" ? 135 : 90) + textNudgeX;
    const textY = (cardStyle !== "none" ? 345 : 300) + textNudgeY;
    const maxWidth = cardStyle !== "none" ? 810 : 980;
    
    // Apply professional Photoshop styling to Title 1
    drawStyledTextWrapped(ctx, title1.toUpperCase(), textX, textY, title1Size, fontFamily, title1Size * 1.25, maxWidth, true);
    
    // Title 2: Sub-heading (rendered only if present, styled using same Photoshop style at 42px)
    if (title2 && title2.trim()) {
      ctx.save();
      ctx.font = `bold ${title1Size}px ${fontFamily}, Inter, sans-serif`;
      const lines = getLines(ctx, title1.toUpperCase(), maxWidth);
      const title1Height = lines.length * title1Size * 1.25;
      ctx.restore();
      
      drawStyledTextWrapped(ctx, title2.trim(), textX, textY + title1Height + 50, 42, fontFamily, 42 * 1.25, maxWidth, false);
    }
  };

  // Re-draw canvas whenever variables modify or images load
  useEffect(() => {
    drawCanvas();
  }, [
    logoImage, teacherImage, customBgImage, defaultBgImage, defaultBgLoaded, title1, title2, 
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
    setTextNudgeY(80);
    setTitle1Size(152);
    setTitle1Color("#6A11CB");
    setTitle2Color("#FF8C42");
    setPresetStyle("indigo");
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
      
      const uploadRes = await uploadFile(file, "thumbnails", 20); // Upload raw to keep transparency/quality
      
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
          Stitch transparent teacher images onto the official school canvas. Adjust layout and text styling in real-time.
        </p>
      </div>

      {loading ? (
        <div className="text-slate-500 py-12 flex justify-center items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-blue"></div>
          Loading teachers list and history...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left column: Live Stitching Preview (Canvas) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-xl overflow-hidden">
              <div className="flex justify-between items-center mb-3 px-1 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Stitching Preview (1920x1080)</span>
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

          {/* Right column: Compact Controls Container (Tabbed Interface) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Tab Navigation Headers */}
              <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
                <button
                  onClick={() => setActiveTab("content")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                    activeTab === "content" 
                      ? "bg-white text-brand-blue shadow-sm border border-slate-100" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Text & Teacher
                </button>
                <button
                  onClick={() => setActiveTab("template")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                    activeTab === "template" 
                      ? "bg-white text-brand-blue shadow-sm border border-slate-100" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" /> Template Style
                </button>
                <button
                  onClick={() => setActiveTab("nudge")}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 ${
                    activeTab === "nudge" 
                      ? "bg-white text-brand-blue shadow-sm border border-slate-100" 
                      : "text-slate-500 hover:text-slate-700 hover:bg-white/40"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Position Nudge
                </button>
              </div>

              {/* Tab Body Viewports */}
              <div className="p-6 min-h-[360px] max-h-[580px] overflow-y-auto custom-scrollbar">
                
                {/* Tab 1: Text & Teacher Setup */}
                {activeTab === "content" && (
                  <div className="space-y-4">
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
                      <textarea 
                        value={title1}
                        onChange={e => setTitle1(e.target.value)}
                        placeholder="e.g. MATHEMATICS"
                        rows={2}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm resize-none"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Title 2 (Sub-heading)</label>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Optional</span>
                      </div>
                      <input 
                        type="text" 
                        value={title2}
                        onChange={e => setTitle2(e.target.value)}
                        placeholder="e.g. SDPS Online Classes (Leave blank to hide)"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm"
                      />
                    </div>
                  </div>
                )}

                {/* Tab 2: Canvas Background & Text Styling */}
                {activeTab === "template" && (
                  <div className="space-y-5">
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Canvas Background</label>
                      <select
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-brand-blue outline-none text-sm font-medium"
                        value={bgTemplate}
                        onChange={e => setBgTemplate(e.target.value)}
                      >
                        <option value="pastel">Modern Grain Pastel (Default)</option>
                        <option value="navy">Official Navy & Gold</option>
                        <option value="custom">Custom Image Upload</option>
                      </select>
                    </div>

                    {bgTemplate === "custom" && (
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
                        <label className="block text-[11px] font-semibold text-slate-500">Upload Custom Base Canvas (1920x1080)</label>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingBg}
                          onChange={handleCustomBgUpload}
                          className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                        />
                        {customBgUrl && (
                          <div className="text-[10px] text-slate-400 truncate mt-1">
                            Uploaded: <a href={fullUrl(customBgUrl)} target="_blank" rel="noreferrer" className="text-emerald-600 underline font-medium">{customBgUrl}</a>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Color & Font Theme Preset</label>
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
                        <option value="custom">Customize Colors manually</option>
                      </select>
                    </div>

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

                    {/* Font & Color Customization (Always visible to allow overrides) */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5"><Palette className="w-3.5 h-3.5 text-purple-500" /> Typography Colors</span>
                        {presetStyle !== "custom" && (
                          <button 
                            onClick={() => setPresetStyle("custom")}
                            className="text-[10px] text-brand-blue hover:underline font-semibold"
                          >
                            Custom Override
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Gradient Start</label>
                          <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border">
                            <input
                              type="color"
                              value={title1Color}
                              onChange={e => {
                                setPresetStyle("custom");
                                setTitle1Color(e.target.value);
                              }}
                              className="w-6 h-6 rounded cursor-pointer border border-slate-200"
                            />
                            <span className="text-[10px] font-mono font-medium text-slate-600">{title1Color}</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Gradient End</label>
                          <div className="flex items-center gap-2 bg-white px-2 py-1.5 rounded-lg border">
                            <input
                              type="color"
                              value={title2Color}
                              onChange={e => {
                                setPresetStyle("custom");
                                setTitle2Color(e.target.value);
                              }}
                              className="w-6 h-6 rounded cursor-pointer border border-slate-200"
                            />
                            <span className="text-[10px] font-mono font-medium text-slate-600">{title2Color}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Font Family</label>
                        <select
                          className="w-full px-2.5 py-2 rounded-lg border border-slate-300 text-xs font-medium bg-white"
                          value={fontFamily}
                          onChange={e => {
                            setPresetStyle("custom");
                            setFontFamily(e.target.value);
                          }}
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

                  </div>
                )}

                {/* Tab 3: Sliders and position nudging */}
                {activeTab === "nudge" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Teacher Offsets</span>
                      <button onClick={handleResetCoordinates} className="text-[10px] text-slate-400 hover:text-red-500 font-bold transition">Reset All</button>
                    </div>

                    {/* Teacher controls */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                          <span>Scale Image</span>
                          <span className="font-semibold text-slate-700">{teacherScale.toFixed(2)}x</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setTeacherScale(Math.max(0.5, teacherScale - 0.05))} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-xs font-bold text-slate-600">-</button>
                          <input 
                            type="range" 
                            min="0.5" 
                            max="2.0" 
                            step="0.05" 
                            value={teacherScale} 
                            onChange={e => setTeacherScale(parseFloat(e.target.value))}
                            className="w-full accent-brand-blue"
                          />
                          <button onClick={() => setTeacherScale(Math.min(2.0, teacherScale + 0.05))} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-xs font-bold text-slate-600">+</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Nudge Horizontal</label>
                          <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border">
                            <button onClick={() => setTeacherX(teacherX - 10)} className="p-1.5 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowLeft className="w-3 h-3" /></button>
                            <span className="text-[11px] font-semibold text-slate-600 w-8 text-center">{teacherX}px</span>
                            <button onClick={() => setTeacherX(teacherX + 10)} className="p-1.5 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowRight className="w-3 h-3" /></button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Nudge Vertical</label>
                          <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border">
                            <button onClick={() => setTeacherY(teacherY - 10)} className="p-1.5 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowUp className="w-3.5 h-3.5" /></button>
                            <span className="text-[11px] font-semibold text-slate-600 w-8 text-center">{teacherY}px</span>
                            <button onClick={() => setTeacherY(teacherY + 10)} className="p-1.5 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowDown className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Text Title positioning */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Title Typography Offsets</span>
                      
                      <div>
                        <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                          <span>Font Size</span>
                          <span className="font-semibold text-slate-700">{title1Size}px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setTitle1Size(Math.max(40, title1Size - 2))} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-xs font-bold text-slate-600">-</button>
                          <input 
                            type="range" 
                            min="40" 
                            max="180" 
                            step="2" 
                            value={title1Size} 
                            onChange={e => setTitle1Size(parseInt(e.target.value))}
                            className="w-full accent-brand-blue"
                          />
                          <button onClick={() => setTitle1Size(Math.min(180, title1Size + 2))} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 border rounded-lg text-xs font-bold text-slate-600">+</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Nudge Horizontal</label>
                          <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border">
                            <button onClick={() => setTextNudgeX(textNudgeX - 10)} className="p-1.5 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowLeft className="w-3 h-3" /></button>
                            <span className="text-[11px] font-semibold text-slate-600 w-8 text-center">{textNudgeX}px</span>
                            <button onClick={() => setTextNudgeX(textNudgeX + 10)} className="p-1.5 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowRight className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 text-center">Nudge Vertical</label>
                          <div className="flex items-center justify-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border">
                            <button onClick={() => setTextNudgeY(textNudgeY - 10)} className="p-1.5 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowUp className="w-3 h-3" /></button>
                            <span className="text-[11px] font-semibold text-slate-600 w-8 text-center">{textNudgeY}px</span>
                            <button onClick={() => setTextNudgeY(textNudgeY + 10)} className="p-1.5 bg-white hover:bg-slate-100 border rounded-lg shadow-sm"><ArrowDown className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

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
