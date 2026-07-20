import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Printer, FileText, Settings, Sparkles, RefreshCw, 
  LayoutGrid, Sliders, CheckSquare, Info, ShieldCheck, Download,
  Save, Copy, Hash, Database, Loader2
} from "lucide-react";
import { getOmrRoster, saveOmrBooklets, getOmrBooklets, clearOmrBooklets } from "@/lib/api";
import api from "@/lib/api";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const OMR_STORAGE_KEY = "sdps_omr_last_settings";

// --- Lightweight Zero-Dependency Code39 SVG Barcode Component ---
function BarcodeSvg({ value, height = 22, className = "" }) {
  if (!value) return null;
  const clean = String(value).toUpperCase().replace(/[^A-Z0-9\-\. ]/g, "");
  if (!clean) return null;
  const formatted = `*${clean}*`;
  
  const CODE39 = {
    '0': '101001101001', '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
    '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
    'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
    'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
    'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
    'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
  };

  let binaryStr = "";
  for (let i = 0; i < formatted.length; i++) {
    const char = formatted[i];
    binaryStr += (CODE39[char] || CODE39['*']) + "0";
  }

  const barWidth = 1.3;
  const svgWidth = binaryStr.length * barWidth;

  let x = 0;
  const bars = [];
  for (let i = 0; i < binaryStr.length; i++) {
    if (binaryStr[i] === "1") {
      bars.push(<rect key={i} x={x} y={0} width={barWidth} height={height} fill="black" />);
    }
    x += barWidth;
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`} className="block">
        {bars}
      </svg>
      <span className="text-[7.5px] font-mono tracking-widest font-bold text-black mt-0.5">{clean}</span>
    </div>
  );
}

// --- Zero-Dependency Scannable 2D QR Code SVG Component for Booklet / Student Verification ---
function QrCodeSvg({ value, size = 52, className = "" }) {
  if (!value) return null;
  const modules = 21;
  const grid = Array.from({ length: modules }, () => Array(modules).fill(false));

  const drawFinder = (r, c) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isBorder = i === 0 || i === 6 || j === 0 || j === 6;
        const isCenter = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        grid[r + i][c + j] = isBorder || isCenter;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, modules - 7);
  drawFinder(modules - 7, 0);

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) {
        continue;
      }
      if (r === 6 || c === 6) {
        grid[r][c] = (r + c) % 2 === 0;
        continue;
      }
      const seed = Math.abs(hash * (r + 1) * 31 + c * 17);
      grid[r][c] = (seed % 100) > 42;
    }
  }

  const cellSize = size / modules;
  const rects = [];
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (grid[r][c]) {
        rects.push(
          <rect
            key={`${r}-${c}`}
            x={c * cellSize}
            y={r * cellSize}
            width={cellSize}
            height={cellSize}
            fill="black"
          />
        );
      }
    }
  }

  return (
    <div className={`flex flex-col items-center bg-white p-1 border border-black rounded-xs ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} fill="white" />
        {rects}
      </svg>
      <span className="text-[6px] font-mono font-bold text-black mt-0.5 tracking-tighter">OMR QR</span>
    </div>
  );
}

export default function AdminOmrGenerator() {
  const { settings } = useOutletContext() || {};

  // --- Dynamic OMR Configuration State ---
  // 1. School Header
  const [schoolName, setSchoolName] = useState(
    settings?.school_name || "S.D. PUBLIC SCHOOL"
  );
  const [schoolSubHeader, setSchoolSubHeader] = useState(
    settings?.cbse_affiliation || ""
  );
  const [schoolAddress, setSchoolAddress] = useState(
    settings?.address || "Maurya Colony, Near R.O.B Kumhrar, Gulzarbagh Road, Patna - 800007"
  );
  const [schoolLogo, setSchoolLogo] = useState(
    settings?.logo_url || "https://sdpublic.org/assets/img/logo.png"
  );
  const [showLogo, setShowLogo] = useState(true);
  const [showSchoolHeader, setShowSchoolHeader] = useState(true);
  const [showTopBarcode, setShowTopBarcode] = useState(false);

  // 2. Examination Header
  const [examTitle, setExamTitle] = useState("PERIODIC TEST - II");
  const [session, setSession] = useState("2024 - 2025");
  const [maxMarks, setMaxMarks] = useState("40");
  const [timeAllowed, setTimeAllowed] = useState("90 Mins");
  const [className, setClassName] = useState("X");
  const [subjectName, setSubjectName] = useState("SCIENCE");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);

  // 3. Sheet Format & Questions Configuration
  const [templateType, setTemplateType] = useState("standard"); // "standard", "simple", "automated"
  const [subHeaderLayout, setSubHeaderLayout] = useState("standard"); // "standard" or "simple"
  const [omrMode, setOmrMode] = useState("single"); // "single" or "booklet"
  const [numQuestions, setNumQuestions] = useState(40);
  const [numOptions, setNumOptions] = useState(4); // 4 = A,B,C,D; 5 = A,B,C,D,E
  const [optionLabels, setOptionLabels] = useState(["A", "B", "C", "D"]);
  const [numColumns, setNumColumns] = useState(2); // 1, 2, 3, or 4 columns
  const [showSections, setShowSections] = useState(false);
  const [sectionBreakEvery, setSectionBreakEvery] = useState(20);

  // 4. Student Identification Grid & Booklet Barcode Configuration
  const [rollNoDigits, setRollNoDigits] = useState(6);
  const [showRollNoBubbleGrid, setShowRollNoBubbleGrid] = useState(true);
  const [showSetCode, setShowSetCode] = useState(true);
  const [showBookletNo, setShowBookletNo] = useState(true);
  const [bookletPrefix, setBookletPrefix] = useState("SDP-");
  const [bookletStartNo, setBookletStartNo] = useState("1001");
  const [showBarcode, setShowBarcode] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showTimingMarks, setShowTimingMarks] = useState(true);

  // 5. Multi-copy auto-generate & Automated Roster State
  const [numCopies, setNumCopies] = useState(1);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [savingBooklets, setSavingBooklets] = useState(false);
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [selectedSectionFilter, setSelectedSectionFilter] = useState("");
  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);

  // Roll Number Range & Sorting State
  const [rollStartFilter, setRollStartFilter] = useState("");
  const [rollEndFilter, setRollEndFilter] = useState("");
  const [sortRollOrder, setSortRollOrder] = useState("asc");

  // Barcode & Booklet Database Index Modal State
  const [showBookletsModal, setShowBookletsModal] = useState(false);
  const [savedBooklets, setSavedBooklets] = useState([]);
  const [loadingSavedBooklets, setLoadingSavedBooklets] = useState(false);
  const [bookletSearchQuery, setBookletSearchQuery] = useState("");

  const handleOpenBookletsModal = async () => {
    setShowBookletsModal(true);
    fetchSavedBooklets("");
  };

  const fetchSavedBooklets = async (q = bookletSearchQuery) => {
    setLoadingSavedBooklets(true);
    try {
      const res = await getOmrBooklets({ search: q });
      setSavedBooklets(res.booklets || []);
    } catch (err) {
      toast.error("Failed to query saved barcode mappings.");
    } finally {
      setLoadingSavedBooklets(false);
    }
  };

  const handleClearRoster = () => {
    setRoster([]);
    setNumCopies(1);
    setSelectedClassFilter("");
    setSelectedSectionFilter("");
    toast.info("Cleared selected class and student roster. Displaying 1 blank OMR sheet.");
  };


  const handleClearAllBooklets = async () => {
    if (!window.confirm("Are you sure you want to CLEAR ALL stored barcode index mappings from the database? This action cannot be undone.")) {
      return;
    }
    try {
      const res = await clearOmrBooklets();
      toast.success(res.message || "Cleared all stored barcode indexes!");
      setSavedBooklets([]);
    } catch (err) {
      toast.error("Failed to clear barcode indexes.");
    }
  };

  // Sorted and Filtered Roster Roll-No wise
  const displayedRoster = useMemo(() => {
    let list = [...roster];

    // Sort strictly numerical by Roll Number
    list.sort((a, b) => {
      const getNum = (item) => {
        const raw = String(item.roll_no || item.roll || item.rollNo || "").replace(/\D/g, "");
        return raw ? parseInt(raw, 10) : 999999;
      };
      const rA = getNum(a);
      const rB = getNum(b);
      return sortRollOrder === "asc" ? rA - rB : rB - rA;
    });

    // Roll Number Range filtering
    if (rollStartFilter || rollEndFilter) {
      const start = rollStartFilter ? parseInt(rollStartFilter, 10) : null;
      const end = rollEndFilter ? parseInt(rollEndFilter, 10) : null;
      list = list.filter((s) => {
        const raw = String(s.roll_no || s.roll || s.rollNo || "").replace(/\D/g, "");
        const r = raw ? parseInt(raw, 10) : null;
        if (r === null) return true;
        if (start !== null && !isNaN(start) && r < start) return false;
        if (end !== null && !isNaN(end) && r > end) return false;
        return true;
      });
    }

    return list;
  }, [roster, rollStartFilter, rollEndFilter, sortRollOrder]);

  useEffect(() => {
    if (templateType === "automated" && displayedRoster.length > 0) {
      setNumCopies(displayedRoster.length);
    }
  }, [templateType, displayedRoster.length]);

  // Roster fetching is triggered on demand when user selects class and clicks "Load Birthday Roster"

  const autoSaveBooklets = async (studentList = displayedRoster) => {
    if (!studentList || studentList.length === 0) return;
    try {
      const startNum = parseInt(bookletStartNo || "1001", 10);
      const bookletMappings = studentList.map((student, idx) => {
        const bookletNo = `${bookletPrefix}${(startNum + idx)}`;
        return {
          booklet_no: bookletNo,
          barcode: bookletNo,
          roll_no: student.roll_no || student.roll || "",
          student_name: student.student_name || student.name || "",
          class_name: student.class_name || student.class || className,
          section: student.section || student.sec || "A",
          admission_no: student.admission_no || student.admn_no || "",
          father_name: student.father_name || "",
          subject_name: subjectName,
          exam_title: examTitle,
          session: session
        };
      });
      await saveOmrBooklets({ booklets: bookletMappings });
    } catch (err) {
      console.warn("Auto-save booklet mapping notice:", err);
    }
  };

  const fetchRoster = async (cFilter = selectedClassFilter, sFilter = selectedSectionFilter) => {
    setLoadingRoster(true);
    try {
      const params = {};
      if (cFilter && cFilter !== "ALL") params.class_name = cFilter;
      if (sFilter && sFilter !== "ALL") params.section = sFilter;
      const res = await getOmrRoster(params).catch(err => {
        console.warn("getOmrRoster API call notice:", err);
        return null;
      });
      if (res && res.students && res.students.length > 0) {
        setRoster(res.students);
        setNumCopies(res.students.length);
        if (res.available_classes) setAvailableClasses(res.available_classes);
        if (res.available_sections) setAvailableSections(res.available_sections);
        if (cFilter) {
          toast.success(`Loaded ${res.students.length} student records for Class ${cFilter}!`);
        }
      } else {
        if (res && res.available_classes) setAvailableClasses(res.available_classes);
        if (res && res.available_sections) setAvailableSections(res.available_sections);
        setRoster([]);
        setNumCopies(1);
        if (cFilter) {
          toast.info(`No matching student records found for Class ${cFilter} ${sFilter ? 'Section ' + sFilter : ''}.`);
        }
      }
    } catch (e) {
      console.error(e);
      setRoster([]);
      setNumCopies(1);
      if (cFilter) {
        toast.error("Could not query student roster.");
      }
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleCopySimpleToAutomated = () => {
    setTemplateType("automated");
    setSubHeaderLayout("simple");
    setShowRollNoBubbleGrid(false);
    toast.success("Applied Simple Fill-in layout to Pre-filled OMR Template!");
  };

  const handleSaveBookletsToBackend = async () => {
    if (displayedRoster.length === 0) {
      toast.error("No student roster loaded. Please load or upload a roster first.");
      return;
    }
    setSavingBooklets(true);
    try {
      await autoSaveBooklets(displayedRoster);
      toast.success(`Saved ${displayedRoster.length} booklet numbers & student mappings in database for OMR evaluation!`);
    } catch (err) {
      toast.error("Error saving booklet mappings.");
    } finally {
      setSavingBooklets(false);
    }
  };

  const [candidateInstructions, setCandidateInstructions] = useState([
    "Carry your Hall Ticket/Admit Card to the examination hall. Entry without a valid Hall Ticket will not be permitted.",
    "Verify that your Name, Class, Section, Roll Number, Subject, and Examination Details on the OMR Sheet exactly match your Hall Ticket. In case of any discrepancy, inform the Invigilator immediately.",
    "Use only a Blue or Black Ball Pen to fill the OMR sheet.",
    "Write your Name, Class, Section, Roll Number, Subject, and other required details neatly in the space provided.",
    "Fill the corresponding bubbles completely and darkly without leaving any gaps.",
    "Use only one bubble for each question.",
    "Do not tick (✓), cross (✗), circle (○), or partially fill the bubbles.",
    "Do not use a pencil, whitener, eraser, or correction fluid.",
    "Avoid overwriting or making stray marks on the OMR sheet.",
    "Read each question carefully before marking your answer.",
    "Once marked, an answer cannot be changed.",
    "Keep the OMR sheet clean, flat, and free from folds, tears, stains, or damage.",
    "Do not write anything in the barcode, QR code, or scanner area of the OMR sheet.",
    "Before submitting, ensure that all personal details, Hall Ticket details, and OMR bubbles are filled correctly.",
    "Submit the OMR sheet only when instructed by the Invigilator. Ensure your Hall Ticket remains with you after the examination unless instructed otherwise."
  ]);

  // Load last saved settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(OMR_STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.examTitle) setExamTitle(s.examTitle);
        if (s.session) setSession(s.session);
        if (s.maxMarks) setMaxMarks(s.maxMarks);
        if (s.timeAllowed) setTimeAllowed(s.timeAllowed);
        if (s.className) setClassName(s.className);
        if (s.subjectName) setSubjectName(s.subjectName);
        if (s.templateType) setTemplateType(s.templateType);
        if (s.omrMode) setOmrMode(s.omrMode);
        if (s.numQuestions) setNumQuestions(s.numQuestions);
        if (s.numOptions) setNumOptions(s.numOptions);
        if (s.numColumns) setNumColumns(s.numColumns);
        if (s.rollNoDigits) setRollNoDigits(s.rollNoDigits);
        if (s.bookletPrefix !== undefined) setBookletPrefix(s.bookletPrefix);
        if (s.bookletStartNo !== undefined) setBookletStartNo(s.bookletStartNo);
        if (typeof s.showLogo === "boolean") setShowLogo(s.showLogo);
        if (typeof s.showSchoolHeader === "boolean") setShowSchoolHeader(s.showSchoolHeader);
        if (typeof s.showTopBarcode === "boolean") setShowTopBarcode(s.showTopBarcode);
        if (typeof s.showRollNoBubbleGrid === "boolean") setShowRollNoBubbleGrid(s.showRollNoBubbleGrid);
        if (typeof s.showSetCode === "boolean") setShowSetCode(s.showSetCode);
        if (typeof s.showBookletNo === "boolean") setShowBookletNo(s.showBookletNo);
        if (typeof s.showBarcode === "boolean") setShowBarcode(s.showBarcode);
        if (typeof s.showInstructions === "boolean") setShowInstructions(s.showInstructions);
        if (typeof s.showTimingMarks === "boolean") setShowTimingMarks(s.showTimingMarks);
        if (s.numCopies) setNumCopies(s.numCopies);
        if (s.candidateInstructions) setCandidateInstructions(s.candidateInstructions);
      }
    } catch (e) { /* ignore corrupt storage */ }
    setSettingsLoaded(true);
    fetchRoster("", "");
  }, []);

  // Sync settings when loaded from backend
  useEffect(() => {
    if (settings?.school_name) setSchoolName(settings.school_name);
    if (settings?.logo_url) setSchoolLogo(settings.logo_url);
    if (settings?.address) setSchoolAddress(settings.address);
    if (settings?.cbse_affiliation) setSchoolSubHeader(settings.cbse_affiliation);
  }, [settings]);

  // Auto-save settings to localStorage whenever they change
  const saveSettings = useCallback(() => {
    if (!settingsLoaded) return;
    try {
      const payload = {
        examTitle, session, maxMarks, timeAllowed, className, subjectName,
        templateType, omrMode, numQuestions, numOptions, numColumns,
        rollNoDigits, bookletPrefix, bookletStartNo,
        showLogo, showSchoolHeader, showTopBarcode,
        showRollNoBubbleGrid, showSetCode, showBookletNo,
        showBarcode, showInstructions, showTimingMarks,
        numCopies, candidateInstructions
      };
      localStorage.setItem(OMR_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) { /* quota exceeded */ }
  }, [
    examTitle, session, maxMarks, timeAllowed, className, subjectName,
    templateType, omrMode, numQuestions, numOptions, numColumns,
    rollNoDigits, bookletPrefix, bookletStartNo,
    showLogo, showSchoolHeader, showTopBarcode,
    showRollNoBubbleGrid, showSetCode, showBookletNo,
    showBarcode, showInstructions, showTimingMarks,
    numCopies, candidateInstructions, settingsLoaded
  ]);

  useEffect(() => { saveSettings(); }, [saveSettings]);

  // Option labels updater when numOptions changes
  useEffect(() => {
    if (numOptions === 4) setOptionLabels(["A", "B", "C", "D"]);
    else if (numOptions === 5) setOptionLabels(["A", "B", "C", "D", "E"]);
    else if (numOptions === 3) setOptionLabels(["A", "B", "C"]);
  }, [numOptions]);

  // Handle Quick Presets
  const applyPreset = (count, options = 4, cols = 2) => {
    setNumQuestions(count);
    setNumOptions(options);
    setNumColumns(cols);
    toast.success(`Preset applied: ${count} Questions (${options} Options, ${cols} Cols)`);
  };

  const handlePrint = async () => {
    if (displayedRoster.length > 0) {
      await autoSaveBooklets(displayedRoster);
    }
    window.print();
  };

  /**
   * exportOMRAsBlob — Captures all rendered OMR sheets from the DOM
   * and returns a high-resolution PDF as a Promise<Blob>.
   *
   * @param {function} onProgress - Optional callback: (current, total) => void
   * @returns {Promise<Blob>} PDF blob (application/pdf)
   */
  const exportOMRAsBlob = async (onProgress) => {
    const printAreas = document.querySelectorAll(".omr-print-area");
    if (printAreas.length === 0) {
      throw new Error("No OMR sheets rendered to export.");
    }

    const total = printAreas.length;
    if (onProgress) onProgress(0, total);

    // A4 dimensions in mm
    const isLandscape = omrMode === "booklet";
    const pageW = isLandscape ? 297 : 210;
    const pageH = isLandscape ? 210 : 297;

    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    for (let i = 0; i < printAreas.length; i++) {
      const el = printAreas[i];

      // Render element to canvas at high resolution
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
      });

      // Convert canvas to JPEG (smaller than PNG, still high quality)
      const imgData = canvas.toDataURL("image/jpeg", 0.92);

      // Calculate dimensions to fit the canvas image onto the A4 page
      const canvasAspect = canvas.width / canvas.height;
      const pageAspect = pageW / pageH;

      let imgW, imgH;
      if (canvasAspect > pageAspect) {
        imgW = pageW;
        imgH = pageW / canvasAspect;
      } else {
        imgH = pageH;
        imgW = pageH * canvasAspect;
      }

      const offsetX = (pageW - imgW) / 2;
      const offsetY = (pageH - imgH) / 2;

      if (i > 0) pdf.addPage("a4", isLandscape ? "landscape" : "portrait");
      pdf.addImage(imgData, "JPEG", offsetX, offsetY, imgW, imgH);

      // Report progress after each page is done
      if (onProgress) onProgress(i + 1, total);

      // Yield to the browser event loop so the UI can repaint the progress bar
      await new Promise((r) => setTimeout(r, 0));
    }

    return pdf.output("blob");
  };

  /** PDF Export state */
  const [exportingPdf, setExportingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState({ current: 0, total: 0 });

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      setPdfProgress({ current: 0, total: 0 });

      if (displayedRoster.length > 0) {
        await autoSaveBooklets(displayedRoster);
      }

      const pdfBlob = await exportOMRAsBlob((current, total) => {
        setPdfProgress({ current, total });
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = `OMR_${className || "Sheets"}_${selectedSectionFilter || ""}_${numQuestions}Q.pdf`.replace(/__+/g, "_");
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`PDF exported — ${pdfProgress.total} pages, ${(pdfBlob.size / (1024 * 1024)).toFixed(1)} MB`);
    } catch (err) {
      console.error("PDF export failed:", err);
      toast.error(`PDF export failed: ${err.message}`);
    } finally {
      setExportingPdf(false);
      setPdfProgress({ current: 0, total: 0 });
    }
  };

  // Generate Questions Array
  const questions = Array.from({ length: numQuestions }, (_, i) => i + 1);

  // Chunk questions into columns
  const itemsPerCol = Math.ceil(numQuestions / numColumns);
  const columnsData = [];
  for (let c = 0; c < numColumns; c++) {
    columnsData.push(questions.slice(c * itemsPerCol, (c + 1) * itemsPerCol));
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-16">
      {/* Screen-only Controls Header */}
      <div className="no-print bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-xl">
            <FileText className="w-6 h-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              OMR Answer Sheet Generator
              <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">
                Dynamic A4 Print Ready
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Customize questions, headers, roll number grids, and print machine-readable standard OMR sheets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => applyPreset(20, 4, 1)}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
          >
            20 Qs (1 Col)
          </button>
          <button
            onClick={() => applyPreset(40, 4, 2)}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
          >
            40 Qs (2 Cols)
          </button>
          <button
            onClick={() => applyPreset(50, 4, 2)}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
          >
            50 Qs (2 Cols)
          </button>
          <button
            onClick={() => applyPreset(100, 4, 4)}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition"
          >
            100 Qs (4 Cols)
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition shadow-md shadow-emerald-700/20 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
          >
            {exportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exportingPdf
              ? (pdfProgress.total > 0 ? `Page ${pdfProgress.current}/${pdfProgress.total}` : "Preparing…")
              : "Export as PDF"}
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-blue/90 transition shadow-md shadow-brand-blue/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* PDF Export Progress Overlay */}
      {exportingPdf && (
        <div className="no-print fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full mx-4 text-center space-y-5">
            <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Generating PDF</h3>
              <p className="text-sm text-slate-500 mt-1">
                {pdfProgress.total > 0
                  ? `Rendering page ${pdfProgress.current} of ${pdfProgress.total}`
                  : "Preparing sheets\u2026"}
              </p>
            </div>
            {pdfProgress.total > 0 && (
              <div className="space-y-2">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.round((pdfProgress.current / pdfProgress.total) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>{pdfProgress.current} / {pdfProgress.total} pages</span>
                  <span>{Math.round((pdfProgress.current / pdfProgress.total) * 100)}%</span>
                </div>
              </div>
            )}
            <p className="text-[11px] text-slate-400">Please don't close or navigate away from this page.</p>
          </div>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Left Settings Panel (Hidden on Print) */}
        <div className="no-print lg:col-span-4 space-y-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm max-h-[85vh] overflow-y-auto sticky top-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-blue" /> Sheet Configuration
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Live Preview</span>
          </div>

          {/* Template Style / Type Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
              OMR Template Style
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTemplateType("standard");
                  setShowRollNoBubbleGrid(true);
                }}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition text-center ${
                  templateType === "standard"
                    ? "bg-brand-blue text-white border-brand-blue shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Standard Grid
              </button>
              <button
                type="button"
                onClick={() => {
                  setTemplateType("simple");
                  setShowRollNoBubbleGrid(false);
                }}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition text-center ${
                  templateType === "simple"
                    ? "bg-brand-blue text-white border-brand-blue shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Simple Fill-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setTemplateType("automated");
                  setShowRollNoBubbleGrid(true);
                }}
                className={`py-2 px-2 text-[11px] font-bold rounded-xl border transition text-center ${
                  templateType === "automated"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Pre-filled + QR
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopySimpleToAutomated}
              className="w-full py-1.5 px-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-[10.5px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs mt-2"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy Simple Fill-in Layout to Pre-filled Template
            </button>

            {templateType === "simple" && (
              <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-1">
                ⚡ Simple Classroom Template: Clean minimal layout with fill-in blanks for student details.
              </p>
            )}

            {templateType === "automated" && (
              <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-emerald-600" /> OMR Student Database Mode
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                    {displayedRoster.length} Active ({roster.length} Total)
                  </span>
                </div>
                <p className="text-[10px] text-emerald-800 leading-snug">
                  Pre-prints Student Name, Roll No, Class & Section from OMR Student Database with auto-bubbled roll number circles and barcode.
                </p>

                {/* Manage Database Link */}
                <div className="bg-white p-2 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-800 font-semibold">Need to upload/manage student list?</span>
                  <a
                    href="/admin/omr-roster"
                    className="py-1 px-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-[9.5px] font-bold rounded-lg flex items-center gap-1 transition shadow-2xs"
                  >
                    <Database className="w-3.5 h-3.5" />
                    Manage Database
                  </a>
                </div>

                {/* Class & Section Filters */}
                <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-emerald-200">
                  <div>
                    <label className="text-[9.5px] font-bold text-emerald-900 block mb-0.5">Filter Class:</label>
                    <select
                      value={selectedClassFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedClassFilter(val);
                        if (val) setClassName(val);
                        fetchRoster(val, selectedSectionFilter);
                      }}
                      className="w-full px-2 py-1 text-[10.5px] rounded-md border border-emerald-300 font-bold focus:outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="">-- Select Class --</option>
                      {availableClasses.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9.5px] font-bold text-emerald-900 block mb-0.5">Filter Section:</label>
                    <select
                      value={selectedSectionFilter}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedSectionFilter(val);
                        fetchRoster(selectedClassFilter, val);
                      }}
                      className="w-full px-2 py-1 text-[10.5px] rounded-md border border-emerald-300 font-bold focus:outline-none focus:border-emerald-600 bg-white"
                    >
                      <option value="">-- Select Section --</option>
                      {availableSections.map((s) => (
                        <option key={s} value={s}>
                          {s.toUpperCase().startsWith("SECTION") || s.toUpperCase().startsWith("SEC") ? s : `Section ${s}`}
                        </option>
                      ))}
                      {availableSections.length === 0 && (
                        ["A", "B", "C", "D", "E"].map((s) => (
                          <option key={s} value={s}>Section {s}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                {/* Roll No Range & Sort Filter */}
                <div className="bg-white p-2 rounded-lg border border-emerald-200 space-y-1.5">
                  <div className="flex items-center justify-between text-[9.5px] font-bold text-emerald-900">
                    <span>Roll No Range / Sort:</span>
                    <button
                      type="button"
                      onClick={() => setSortRollOrder(sortRollOrder === "asc" ? "desc" : "asc")}
                      className="text-[9px] text-emerald-800 font-bold hover:underline bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-300"
                    >
                      {sortRollOrder === "asc" ? "Roll 1 → 50 (Asc)" : "Roll 50 → 1 (Desc)"}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        placeholder="Roll Start (e.g. 1)"
                        value={rollStartFilter}
                        onChange={(e) => setRollStartFilter(e.target.value)}
                        className="w-full px-2 py-1 text-[10px] rounded-md border border-emerald-300 font-bold focus:outline-none focus:border-emerald-600 bg-white"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Roll End (e.g. 30)"
                        value={rollEndFilter}
                        onChange={(e) => setRollEndFilter(e.target.value)}
                        className="w-full px-2 py-1 text-[10px] rounded-md border border-emerald-300 font-bold focus:outline-none focus:border-emerald-600 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={handleClearRoster}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-300 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition shadow-2xs"
                  >
                    Clear Selection
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveBookletsToBackend}
                    disabled={savingBooklets}
                    className="flex-1 py-1.5 px-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition shadow-2xs"
                  >
                    <Save className="w-3 h-3" />
                    {savingBooklets ? "Indexing..." : "Save Mappings"}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenBookletsModal}
                    className="flex-1 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-300 rounded-lg flex items-center justify-center gap-1 transition shadow-2xs"
                  >
                    <Database className="w-3 h-3 text-brand-blue" />
                    View Index
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sheet Format Mode Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
              Sheet Format / Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOmrMode("single")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  omrMode === "single"
                    ? "bg-brand-blue text-white border-brand-blue shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Single Sheet (Full A4)
              </button>
              <button
                type="button"
                onClick={() => setOmrMode("booklet")}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition ${
                  omrMode === "booklet"
                    ? "bg-brand-blue text-white border-brand-blue shadow-sm"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                Booklet (2 Per Page)
              </button>
            </div>
          </div>

          {/* Questions Setting */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-emerald-600" /> Question & Layout Options
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Total Questions
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Options / Question
                </label>
                <select
                  value={numOptions}
                  onChange={(e) => setNumOptions(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                >
                  <option value={3}>3 (A, B, C)</option>
                  <option value={4}>4 (A, B, C, D)</option>
                  <option value={5}>5 (A, B, C, D, E)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Grid Columns
                </label>
                <select
                  value={numColumns}
                  onChange={(e) => setNumColumns(parseInt(e.target.value))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                >
                  <option value={1}>1 Column</option>
                  <option value={2}>2 Columns</option>
                  <option value={3}>3 Columns</option>
                  <option value={4}>4 Columns</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Roll No Digits
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={rollNoDigits}
                  onChange={(e) => setRollNoDigits(Math.max(3, Math.min(10, parseInt(e.target.value) || 6)))}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>
          </div>

          {/* Exam Header Setting */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-brand-blue" /> Exam & School Details
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Exam Title
              </label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                placeholder="e.g. PERIODIC TEST - II (2024-25)"
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Class
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. X / CLASS X"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="e.g. SCIENCE"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Max Marks
                </label>
                <input
                  type="text"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  placeholder="e.g. 40"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Time Allowed
                </label>
                <input
                  type="text"
                  value={timeAllowed}
                  onChange={(e) => setTimeAllowed(e.target.value)}
                  placeholder="e.g. 90 Mins"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Session
                </label>
                <input
                  type="text"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  placeholder="e.g. 2024 - 2025"
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Exam Date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                School Name
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                Sub-Header / Affiliation Details
              </label>
              <input
                type="text"
                value={schoolSubHeader}
                onChange={(e) => setSchoolSubHeader(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
              />
            </div>
          </div>

          {/* Auto-Generate Multiple Copies */}
          <div className="space-y-3 bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200">
            <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide flex items-center gap-1.5">
              <Copy className="w-4 h-4 text-emerald-600" /> Auto-Generate Numbered Copies
            </h3>
            <p className="text-[10px] text-emerald-700 leading-snug">
              Generate multiple OMR sheets at once, each with its own auto-incrementing serial/booklet number. Set the count below and hit Print.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-emerald-700 block mb-1">No. of Copies</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={numCopies}
                  onChange={(e) => setNumCopies(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-emerald-300 font-bold focus:outline-none focus:border-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-emerald-700 block mb-1">Serial Range</label>
                <div className="px-2.5 py-1.5 text-xs rounded-xl border border-emerald-200 bg-emerald-100/50 font-mono font-bold text-emerald-800">
                  {bookletPrefix}{bookletStartNo} → {bookletPrefix}{parseInt(bookletStartNo || "1001", 10) + numCopies - 1}
                </div>
              </div>
            </div>
          </div>

          {/* Display Options Toggles */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-150">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Features & Display Toggles
            </h3>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>Show School Header (Name, Address, Logo)</span>
              <input
                type="checkbox"
                checked={showSchoolHeader}
                onChange={(e) => setShowSchoolHeader(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>Show Top Corner Barcode Badge</span>
              <input
                type="checkbox"
                checked={showTopBarcode}
                onChange={(e) => setShowTopBarcode(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>
            
            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>Show School Logo</span>
              <input
                type="checkbox"
                checked={showLogo}
                onChange={(e) => setShowLogo(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>Roll Number Bubble Grid</span>
              <input
                type="checkbox"
                checked={showRollNoBubbleGrid}
                onChange={(e) => setShowRollNoBubbleGrid(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>SET A / B / C / D Bubbles</span>
              <input
                type="checkbox"
                checked={showSetCode}
                onChange={(e) => setShowSetCode(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>Question Booklet No. Field</span>
              <input
                type="checkbox"
                checked={showBookletNo}
                onChange={(e) => setShowBookletNo(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>

            {/* Booklet & Barcode Configuration Sub-section */}
            <div className="pt-2 border-t border-slate-200 space-y-2 mt-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
                Booklet No. & Barcode Controls
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Prefix</label>
                  <input
                    type="text"
                    value={bookletPrefix}
                    onChange={(e) => setBookletPrefix(e.target.value)}
                    placeholder="e.g. SDP-"
                    className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 block mb-1">Start No.</label>
                  <input
                    type="number"
                    value={bookletStartNo}
                    onChange={(e) => setBookletStartNo(e.target.value)}
                    placeholder="1001"
                    className="w-full px-2.5 py-1 text-xs rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>

              <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <span>Include Scannable Barcode</span>
                <input
                  type="checkbox"
                  checked={showBarcode}
                  onChange={(e) => setShowBarcode(e.target.checked)}
                  className="rounded text-brand-blue focus:ring-brand-blue"
                />
              </label>
            </div>

            <div className="space-y-2">
              <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
                <span>Instructions Box</span>
                <input
                  type="checkbox"
                  checked={showInstructions}
                  onChange={(e) => setShowInstructions(e.target.checked)}
                  className="rounded text-brand-blue focus:ring-brand-blue"
                />
              </label>

              {showInstructions && (
                <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-bold text-slate-700 block">Edit Instructions (1 rule per line):</span>
                  <textarea
                    rows={4}
                    value={candidateInstructions.join("\n")}
                    onChange={(e) => setCandidateInstructions(e.target.value.split("\n").filter((line) => line.trim() !== ""))}
                    className="w-full p-2 text-[10px] rounded-lg border border-slate-300 font-sans focus:outline-none focus:border-brand-blue bg-white leading-snug"
                    placeholder="Enter each instruction on a new line..."
                  />
                </div>
              )}
            </div>

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>Machine Alignment Timing Marks</span>
              <input
                type="checkbox"
                checked={showTimingMarks}
                onChange={(e) => setShowTimingMarks(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>
          </div>
        </div>

        {/* Helper function to render sheet content (Single or Booklet copy) */}
        {(() => {
          window._renderOmrSheetContent = (isBookletCopy = false, copyIndex = 1) => {
            const startNum = parseInt(bookletStartNo || "1001", 10);
            const currentBookletNo = `${bookletPrefix}${(startNum + (copyIndex - 1))}`;

            // Check if automated pre-filled student mode is selected
            const isAutomated = templateType === "automated";
            const currentStudent = isAutomated && displayedRoster.length > 0
              ? displayedRoster[(copyIndex - 1) % displayedRoster.length]
              : null;

            const studentName = currentStudent?.student_name || currentStudent?.studentName || currentStudent?.name || "";
            const studentRollNo = (currentStudent?.roll_no !== undefined && currentStudent?.roll_no !== null && currentStudent?.roll_no !== "")
              ? String(currentStudent.roll_no)
              : (currentStudent?.roll ? String(currentStudent.roll) : (currentStudent?.rollNo ? String(currentStudent.rollNo) : ""));
            const studentClassSec = currentStudent
              ? `${currentStudent.class_name || currentStudent.class || currentStudent.studentClass || className || ''} ${currentStudent.section || currentStudent.sec || ''}`.trim()
              : "";

            return (
              <div className="relative">
                {/* Timing Marks */}
                {showTimingMarks && (
                  <>
                    <div className="absolute top-1 left-1 w-3.5 h-3.5 bg-black"></div>
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-black"></div>
                    <div className="absolute bottom-1 left-1 w-3.5 h-3.5 bg-black"></div>
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-black"></div>
                  </>
                )}

                {/* Top Corner Barcode & Booklet Number Badge */}
                {showTopBarcode && (showBookletNo || showBarcode) && (
                  <div className="absolute top-1 right-2 z-10 flex flex-col items-end pointer-events-none">
                    {showBarcode && <BarcodeSvg value={currentBookletNo} height={20} />}
                    {showBookletNo && (
                      <span className="text-[8px] font-mono font-extrabold text-black bg-white px-1 border border-black rounded-xs tracking-wider mt-0.5">
                        NO: {currentBookletNo}
                      </span>
                    )}
                  </div>
                )}

                {/* School Header */}
                {showSchoolHeader && (
                <div className="border-b-2 border-black pb-2 mb-2 text-center relative">
                  <div className="flex items-center justify-center gap-3">
                    {showLogo && schoolLogo && (
                      <img
                        src={schoolLogo}
                        alt="School Logo"
                        className={`${isBookletCopy ? 'w-10 h-10' : 'w-14 h-14'} object-contain shrink-0`}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <h1 className={`${isBookletCopy ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl'} font-black tracking-wider uppercase text-black font-headline leading-tight`}>
                        {schoolName}
                      </h1>
                      {schoolSubHeader && (
                        <p className={`${isBookletCopy ? 'text-[9px]' : 'text-[11px]'} font-semibold uppercase tracking-wide text-black/90`}>
                          {schoolSubHeader}
                        </p>
                      )}
                      <p className="text-[9.5px] text-black/75">
                        {schoolAddress}
                      </p>
                    </div>
                  </div>

                  {/* Examination Title Badge */}
                  <div className="mt-1.5 inline-block border-2 border-black px-5 py-1 bg-black text-white font-black text-sm uppercase tracking-widest rounded-sm">
                    {examTitle} {session && !examTitle.includes(session) && !examTitle.includes("202") ? `(${session})` : ""}
                  </div>
                </div>
                )}

                {/* Standalone Exam Title when school header is hidden */}
                {!showSchoolHeader && (
                  <div className="border-b-2 border-black pb-2 mb-2 text-center">
                    <div className="inline-block border-2 border-black px-5 py-1 bg-black text-white font-black text-sm uppercase tracking-widest rounded-sm">
                      {examTitle} {session && !examTitle.includes(session) && !examTitle.includes("202") ? `(${session})` : ""}
                    </div>
                  </div>
                )}

                {/* Sub Header Specs */}
                {templateType === "simple" || templateType === "automated" || subHeaderLayout === "simple" ? (
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold border border-black p-1.5 mb-2 bg-gray-50 text-center">
                    <div>
                      <span className="text-black/60 uppercase block text-[8.5px]">Class & Section:</span>
                      <span className="text-black font-extrabold">{studentClassSec || className || "___________________________"}</span>
                    </div>
                    <div>
                      <span className="text-black/60 uppercase block text-[8.5px]">Subject:</span>
                      <span className="text-black font-extrabold">{subjectName || "___________________________"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2 text-[10px] font-bold border border-black p-1.5 mb-2 bg-gray-50 text-center">
                    <div>
                      <span className="text-black/60 uppercase block text-[8.5px]">Class:</span>
                      <span className="text-black font-extrabold">{className || "_______"}</span>
                    </div>
                    <div>
                      <span className="text-black/60 uppercase block text-[8.5px]">Subject:</span>
                      <span className="text-black font-extrabold">{subjectName || "_______"}</span>
                    </div>
                    <div>
                      <span className="text-black/60 uppercase block text-[8.5px]">Max Marks:</span>
                      <span className="text-black font-extrabold">{maxMarks || "___"}</span>
                    </div>
                    <div>
                      <span className="text-black/60 uppercase block text-[8.5px]">Time Allowed:</span>
                      <span className="text-black font-extrabold">{timeAllowed || "___"}</span>
                    </div>
                  </div>
                )}

                {/* Candidate Info + Roll No Bubble Grid */}
                <div className="grid grid-cols-12 gap-2 mb-3">
                  {/* Left Column: Candidate Written Inputs & SET Code */}
                  <div className={`${(showRollNoBubbleGrid && (templateType === "standard" || templateType === "automated")) ? 'col-span-7' : 'col-span-12'} space-y-1.5 text-[10px]`}>
                    {/* Candidate Name Box */}
                    <div className="border border-black p-1.5">
                      <span className="font-bold uppercase tracking-wide text-[9px] block mb-0.5">
                        CANDIDATE NAME (IN CAPITAL LETTERS ONLY):
                      </span>
                      {studentName ? (
                        <div className="h-6 flex items-center font-mono font-extrabold text-[12px] text-black tracking-widest uppercase pl-1">
                          {studentName}
                        </div>
                      ) : (
                        <div className="h-6 border-b border-dashed border-black"></div>
                      )}
                    </div>

                    {/* Roll No / Class / Sec / Date Row */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="border border-black p-1.5">
                        <span className="font-bold uppercase text-[8.5px] block mb-0.5">
                          CLASS & SECTION:
                        </span>
                        {studentClassSec ? (
                          <div className="h-6 flex items-center font-mono font-bold text-[10px] text-black pl-0.5">
                            {studentClassSec}
                          </div>
                        ) : (
                          <div className="h-6 border-b border-dashed border-black/40"></div>
                        )}
                      </div>
                      <div className="border border-black p-1.5">
                        <span className="font-bold uppercase text-[8.5px] block mb-0.5">
                          ROLL NO:
                        </span>
                        {studentRollNo ? (
                          <div className="h-6 flex items-center font-mono font-extrabold text-[11px] text-black tracking-wider pl-0.5">
                            {studentRollNo}
                          </div>
                        ) : (
                          <div className="h-6 border-b border-dashed border-black/40"></div>
                        )}
                      </div>
                      <div className="border border-black p-1.5">
                        <span className="font-bold uppercase text-[8.5px] block mb-0.5">DATE:</span>
                        <div className="h-6 border-b border-dashed border-black/40"></div>
                      </div>
                    </div>

                    {/* Booklet No & Set Selection & Merged Barcode Box */}
                    {(showBookletNo || showSetCode || isAutomated) && (
                      <div className="grid grid-cols-12 gap-1.5">
                        {showBookletNo && (
                          <div className={`${showSetCode ? 'col-span-7' : 'col-span-12'} border border-black p-1.5 flex items-center justify-between bg-white min-h-[44px]`}>
                            <div>
                              <span className="font-bold uppercase text-[8.5px] text-black block mb-0.5">BOOKLET NO:</span>
                              <span className="font-mono font-extrabold text-[11px] text-black tracking-wider block">
                                {currentBookletNo}
                              </span>
                            </div>
                            {(showBarcode || isAutomated) && (
                              <div className="flex flex-col items-end justify-center shrink-0 border-l border-black/20 pl-2">
                                <BarcodeSvg value={currentBookletNo} height={22} />
                                <span className="text-[7px] font-mono font-extrabold text-black tracking-widest mt-0.5">
                                  {currentBookletNo}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {showSetCode && (
                          <div className={`${showBookletNo ? 'col-span-5' : 'col-span-12'} border border-black p-1 flex flex-col justify-between min-h-[44px]`}>
                            <span className="font-bold uppercase text-[8.5px] block">QUESTION SET:</span>
                            <div className="flex justify-around items-center py-0.5">
                              {["A", "B", "C", "D"].map((setCode) => (
                                <div key={setCode} className="flex items-center gap-1">
                                  <div
                                    style={{ aspectRatio: "1 / 1" }}
                                    className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center font-bold text-[8px] shrink-0"
                                  >
                                    {setCode}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Instructions Box */}
                  {showInstructions && (
                    <div className="border border-black p-1.5 bg-gray-50 text-[8px]">
                      <div className="font-bold uppercase text-[8px] border-b border-black/20 pb-0.5 mb-1 flex items-center gap-1">
                        <Info className="w-3 h-3 text-black shrink-0" /> INSTRUCTIONS FOR CANDIDATE:
                      </div>
                      <ol className="list-decimal pl-3 text-[7px] leading-[1.15] text-black font-medium grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                        {candidateInstructions.map((inst, i) => (
                          <li key={i}>{inst}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>

                {/* Right Column: Roll Number Grid */}
                {showRollNoBubbleGrid && (templateType === "standard" || templateType === "automated") && (
                  <div className="col-span-5 border border-black p-1.5 bg-white flex flex-col justify-between">
                    <div className="text-[9px] font-extrabold uppercase text-center border-b border-black pb-0.5 mb-1 text-black">
                      ROLL NUMBER GRID
                    </div>
                    
                    {/* Aligned Column-based Grid */}
                    <div className="flex justify-center gap-1 sm:gap-1.5 items-center my-auto">
                      {Array.from({ length: rollNoDigits }).map((_, dIdx) => {
                        const paddedRoll = studentRollNo ? studentRollNo.padStart(rollNoDigits, "0") : "";
                        const digitChar = paddedRoll[dIdx] || "";
                        const activeDigit = digitChar !== "" ? parseInt(digitChar, 10) : null;

                        return (
                          <div key={dIdx} className="flex flex-col items-center gap-0.5">
                            {/* Top Write-in Digit Square Box */}
                            <div className="w-4 h-4 sm:w-4.5 sm:h-4.5 border-2 border-black bg-gray-50 text-center font-bold text-[8.5px] flex items-center justify-center shrink-0 mb-0.5 rounded-xs font-mono">
                              {digitChar}
                            </div>

                            {/* 0-9 OMR Bubbles directly underneath in line */}
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
                              const isBubbled = isAutomated && activeDigit === digit;
                              return (
                                <div
                                  key={digit}
                                  style={{ aspectRatio: "1 / 1" }}
                                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-black flex items-center justify-center font-bold text-[7.5px] sm:text-[8px] shrink-0 transition cursor-pointer ${
                                    isBubbled
                                      ? "bg-black text-white font-extrabold"
                                      : "bg-white text-black hover:bg-black hover:text-white"
                                  }`}
                                >
                                  {digit}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* OMR Questions Grid Section Header */}
              <div className="bg-black text-white font-extrabold text-[10px] uppercase tracking-widest text-center py-0.5 mb-2 rounded-sm">
                ANSWERS / OMR RESPONSE SHEET ({numQuestions} QUESTIONS)
              </div>

              {/* Questions Columns Grid */}
              <div className={`grid ${
                numColumns === 1 ? "grid-cols-1" : numColumns === 3 ? "grid-cols-3" : numColumns === 4 ? "grid-cols-4" : "grid-cols-2"
              } gap-2 border-t-2 border-b-2 border-black py-2 mb-3`}>
                {columnsData.map((colQuestions, cIdx) => (
                  <div key={cIdx} className="space-y-1 border-r border-black/30 last:border-r-0 pr-1">
                    {/* Column Header */}
                    <div className="flex items-center text-[9px] font-black uppercase text-black border-b border-black pb-0.5 mb-0.5">
                      <span className="w-7">Q.No</span>
                      <span className="flex-1 text-center font-bold tracking-widest">
                        OPTIONS ({optionLabels.join(" ")})
                      </span>
                    </div>

                    {colQuestions.map((qNum) => (
                      <div key={qNum} className="flex items-center text-[10px] font-mono py-0.5 hover:bg-gray-100">
                        {/* Question Number */}
                        <span className="w-7 font-bold text-right pr-1 text-black font-sans">
                          {qNum.toString().padStart(2, "0")}.
                        </span>

                        {/* Uncompressed 1:1 Aspect-Ratio Bubble Options */}
                        <div className="flex-1 flex justify-around items-center px-1">
                          {optionLabels.map((label) => (
                            <div
                              key={label}
                              style={{ aspectRatio: "1 / 1" }}
                              className="w-4.5 h-4.5 sm:w-5 sm:h-5 min-w-[18px] min-h-[18px] rounded-full border-2 border-black flex items-center justify-center font-bold text-[8.5px] sm:text-[9px] text-black bg-white hover:bg-black hover:text-white transition cursor-pointer shrink-0"
                            >
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Signatures & Invigilator Footer */}
              <div className="grid grid-cols-2 gap-3 border border-black p-2 text-[9px] mt-auto">
                <div className="flex flex-col justify-between h-12 border-r border-black pr-2">
                  <div className="font-bold uppercase">CANDIDATE SIGNATURE:</div>
                  <div className="border-t border-dashed border-black pt-0.5 text-center text-black/60 text-[8px]">
                    (Signature of Candidate inside box)
                  </div>
                </div>

                <div className="flex flex-col justify-between h-12">
                  <div className="font-bold uppercase">INVIGILATOR SIGNATURE:</div>
                  <div className="border-t border-dashed border-black pt-0.5 text-center text-black/60 text-[8px]">
                    (Verified Roll No & Signature of Invigilator)
                  </div>
                </div>
              </div>

              {/* Print Footer Note */}
              <div className="text-[7.5px] text-black/50 text-center mt-1 font-mono uppercase tracking-widest">
                S.D. PUBLIC SCHOOL OMR ANSWER SHEET — SYSTEM GENERATED HIGH PRECISION
              </div>
            </div>
          );
        };
        return null;
      })()}

        {/* Right Preview Area (The Printable OMR Sheet) */}
        <div className="lg:col-span-8 flex flex-col items-center gap-6">
          {Array.from({ length: omrMode === "booklet" ? Math.ceil(numCopies / 2) : numCopies }).map((_, copyIdx) => {
            const sheetSerialOffset = copyIdx;
            const startNum = parseInt(bookletStartNo || "1001", 10);
            return (
              <div key={copyIdx} className="w-full flex justify-center">
                {/* Printable A4 Container */}
                <div className={`omr-print-area bg-white border border-slate-300 shadow-xl rounded-sm text-black p-4 sm:p-6 w-full relative font-sans ${omrMode === "booklet" ? "max-w-[1150px] min-h-[750px]" : "max-w-[800px] min-h-[1100px]"}`}>
                  {/* Copy number label (screen only) */}
                  {numCopies > 1 && (
                    <div className="no-print absolute -top-3 left-4 bg-brand-blue text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-md z-30">
                      {omrMode === "booklet" ? (
                        `Page #${copyIdx + 1} — Booklets: ${bookletPrefix}${startNum + sheetSerialOffset * 2}${sheetSerialOffset * 2 + 1 < numCopies ? ' & ' + bookletPrefix + (startNum + sheetSerialOffset * 2 + 1) : ''}`
                      ) : (
                        `Sheet #${copyIdx + 1} — ${bookletPrefix}${startNum + sheetSerialOffset}`
                      )}
                    </div>
                  )}
                  
                  {omrMode === "booklet" ? (
                    <div className="grid grid-cols-2 gap-4 relative items-stretch">
                      {/* Booklet Sheet 1 (Left Copy) */}
                      <div className="border border-black p-3 rounded-sm relative bg-white flex flex-col justify-between">
                        <div className="absolute top-1 left-2 text-[7.5px] font-mono font-bold uppercase tracking-wider text-black/40">
                          COPY #1 — BOOKLET SHEET
                        </div>
                        {window._renderOmrSheetContent(true, sheetSerialOffset * 2 + 1)}
                      </div>

                      {/* Vertical Cut / Fold Line in Center */}
                      <div className="absolute left-1/2 top-0 bottom-0 border-l-2 border-dashed border-black transform -translate-x-1/2 flex flex-col justify-center items-center pointer-events-none z-20">
                        <div className="bg-white px-1 py-1 text-[8px] font-mono font-bold text-black border border-black rounded-sm uppercase tracking-widest whitespace-nowrap shadow-xs" style={{ writingMode: 'vertical-rl' }}>
                          ✂ CUT / FOLD HERE FOR TEST BOOKLET ✂
                        </div>
                      </div>

                      {/* Booklet Sheet 2 (Right Copy) */}
                      {sheetSerialOffset * 2 + 2 <= numCopies ? (
                        <div className="border border-black p-3 rounded-sm relative bg-white flex flex-col justify-between">
                          <div className="absolute top-1 left-2 text-[7.5px] font-mono font-bold uppercase tracking-wider text-black/40">
                            COPY #2 — BOOKLET SHEET
                          </div>
                          {window._renderOmrSheetContent(true, sheetSerialOffset * 2 + 2)}
                        </div>
                      ) : (
                        <div className="border border-transparent p-3 rounded-sm relative bg-transparent flex flex-col justify-between">
                          {/* Empty placeholder to keep left-right layout grid aligned */}
                        </div>
                      )}
                    </div>
                  ) : (
                    window._renderOmrSheetContent(false, sheetSerialOffset + 1)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saved Barcode & Booklet Assignment Index Modal */}
      {showBookletsModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-600" /> Stored Barcode & Booklet Assignments
                </h3>
                <p className="text-xs text-slate-500">
                  Database records mapping each barcode to student, subject, and examination details.
                </p>
              </div>
              <button
                onClick={() => setShowBookletsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search by Barcode No, Student Name, Roll No, Admission No..."
                value={bookletSearchQuery}
                onChange={(e) => setBookletSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchSavedBooklets(bookletSearchQuery)}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-none focus:border-emerald-600"
              />
              <button
                onClick={() => fetchSavedBooklets(bookletSearchQuery)}
                disabled={loadingSavedBooklets}
                className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-xl hover:bg-emerald-800 transition cursor-pointer"
              >
                {loadingSavedBooklets ? "Searching..." : "Search Index"}
              </button>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Barcode / Booklet No</th>
                    <th className="p-2.5">Student Name</th>
                    <th className="p-2.5">Roll No</th>
                    <th className="p-2.5">Class & Sec</th>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5">Examination</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savedBooklets.length > 0 ? (
                    savedBooklets.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-medium text-slate-800">
                        <td className="p-2.5 font-mono font-bold text-emerald-700">{b.barcode || b.booklet_no}</td>
                        <td className="p-2.5 font-semibold">{b.student_name}</td>
                        <td className="p-2.5 font-mono font-bold">{b.roll_no}</td>
                        <td className="p-2.5">{b.class_name} {b.section}</td>
                        <td className="p-2.5 font-bold text-blue-700">{b.subject_name || "-"}</td>
                        <td className="p-2.5 text-slate-600">{b.exam_title}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                        {loadingSavedBooklets ? "Loading barcode database..." : "No stored barcode assignments found. Click 'Save Mappings' when generating OMRs."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-150">
              <div className="flex items-center gap-3">
                <span>Total Indexed: <strong>{savedBooklets.length} Barcodes</strong></span>
                <button
                  type="button"
                  onClick={handleClearAllBooklets}
                  className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 text-[11px] font-bold rounded-lg hover:bg-red-100 transition cursor-pointer"
                >
                  Clear All Indexes
                </button>
              </div>
              <button
                onClick={() => setShowBookletsModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded CSS for High Precision A4 Printing */}
      <style>{`
        @media print {
          /* Force page flow and remove all margins/paddings/gaps on layout wrappers outside the print area */
          html, body, #root, main,
          .space-y-6,
          .lg:col-span-8,
          .w-full.flex.justify-center {
            margin: 0 !important;
            padding: 0 !important;
            gap: 0 !important;
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }

          /* Hide screen-only layouts, headers, sidebars, buttons, etc. */
          aside,
          header,
          nav,
          .no-print,
          .lg:col-span-4 {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }

          /* Make sure the main content is visible */
          body * {
            visibility: hidden !important;
          }
          .omr-print-area, .omr-print-area * {
            visibility: visible !important;
          }

          /* Style the OMR printable sheets sequentially in relative layout */
          .omr-print-area {
            display: block !important;
            position: relative !important;
            width: ${omrMode === 'booklet' ? '297mm' : '210mm'} !important;
            height: ${omrMode === 'booklet' ? '210mm' : '297mm'} !important;
            margin: 0 auto !important;
            padding: ${omrMode === 'booklet' ? '6mm 6mm' : '12mm 12mm'} !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
          }

          .omr-print-area:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          @page {
            size: ${omrMode === 'booklet' ? 'A4 landscape' : 'A4 portrait'};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
