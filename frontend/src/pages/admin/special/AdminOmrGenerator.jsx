import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { 
  Printer, FileText, Settings, Sparkles, RefreshCw, 
  LayoutGrid, Sliders, CheckSquare, Info, ShieldCheck, Download
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

export default function AdminOmrGenerator() {
  const { settings } = useOutletContext() || {};

  // --- Dynamic OMR Configuration State ---
  // 1. School Header
  const [schoolName, setSchoolName] = useState(
    settings?.school_name || "S.D. PUBLIC SCHOOL"
  );
  const [schoolSubHeader, setSchoolSubHeader] = useState(
    settings?.cbse_affiliation || "AFFILIATED TO CBSE, NEW DELHI (AFFILIATION NO. 330752)"
  );
  const [schoolAddress, setSchoolAddress] = useState(
    settings?.address || "Maurya Colony, Near R.O.B Kumhrar, Gulzarbagh Road, Patna - 800007"
  );
  const [schoolLogo, setSchoolLogo] = useState(
    settings?.logo_url || "https://sdpublic.org/assets/img/logo.png"
  );
  const [showLogo, setShowLogo] = useState(true);

  // 2. Examination Header
  const [examTitle, setExamTitle] = useState("PERIODIC TEST - II");
  const [session, setSession] = useState("2024 - 2025");
  const [maxMarks, setMaxMarks] = useState("40");
  const [timeAllowed, setTimeAllowed] = useState("90 Mins");
  const [className, setClassName] = useState("X");
  const [subjectName, setSubjectName] = useState("SCIENCE");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);

  // 3. Questions Configuration
  const [numQuestions, setNumQuestions] = useState(40);
  const [numOptions, setNumOptions] = useState(4); // 4 = A,B,C,D; 5 = A,B,C,D,E
  const [optionLabels, setOptionLabels] = useState(["A", "B", "C", "D"]);
  const [numColumns, setNumColumns] = useState(2); // 1, 2, 3, or 4 columns
  const [showSections, setShowSections] = useState(false);
  const [sectionBreakEvery, setSectionBreakEvery] = useState(20);

  // 4. Student Identification Grid Configuration
  const [rollNoDigits, setRollNoDigits] = useState(6);
  const [showRollNoBubbleGrid, setShowRollNoBubbleGrid] = useState(true);
  const [showSetCode, setShowSetCode] = useState(true);
  const [showBookletNo, setShowBookletNo] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showTimingMarks, setShowTimingMarks] = useState(true);

  // Sync settings when loaded
  useEffect(() => {
    if (settings?.school_name) setSchoolName(settings.school_name);
    if (settings?.logo_url) setSchoolLogo(settings.logo_url);
    if (settings?.address) setSchoolAddress(settings.address);
    if (settings?.cbse_affiliation) setSchoolSubHeader(settings.cbse_affiliation);
  }, [settings]);

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

  const handlePrint = () => {
    window.print();
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
            onClick={handlePrint}
            className="flex items-center gap-2 bg-brand-blue text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-brand-blue/90 transition shadow-md shadow-brand-blue/20"
          >
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </button>
        </div>
      </div>

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

          {/* Display Options Toggles */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-150">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Features & Display Toggles
            </h3>
            
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

            <label className="flex items-center justify-between text-xs font-medium text-slate-700 cursor-pointer">
              <span>Instructions Box</span>
              <input
                type="checkbox"
                checked={showInstructions}
                onChange={(e) => setShowInstructions(e.target.checked)}
                className="rounded text-brand-blue focus:ring-brand-blue"
              />
            </label>

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

        {/* Right Preview Area (The Printable OMR Sheet) */}
        <div className="lg:col-span-8 flex justify-center">
          {/* Printable A4 Container */}
          <div className="omr-print-area bg-white border border-slate-300 shadow-xl rounded-sm text-black p-6 sm:p-8 w-full max-w-[800px] min-h-[1100px] relative font-sans">
            
            {/* Timing Marks (Corner Alignment Squares for OMR Scanners) */}
            {showTimingMarks && (
              <>
                <div className="absolute top-4 left-4 w-4 h-4 bg-black"></div>
                <div className="absolute top-4 right-4 w-4 h-4 bg-black"></div>
                <div className="absolute bottom-4 left-4 w-4 h-4 bg-black"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 bg-black"></div>
              </>
            )}

            {/* School Header */}
            <div className="border-b-2 border-black pb-3 mb-3 text-center relative">
              <div className="flex items-center justify-center gap-4">
                {showLogo && schoolLogo && (
                  <img
                    src={schoolLogo}
                    alt="School Logo"
                    className="w-14 h-14 object-contain shrink-0"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-black font-headline leading-tight">
                    {schoolName}
                  </h1>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-black/90">
                    {schoolSubHeader}
                  </p>
                  <p className="text-[10px] text-black/75">
                    {schoolAddress}
                  </p>
                </div>
              </div>

            {/* Examination Title Badge */}
              <div className="mt-2 inline-block border-2 border-black px-6 py-1 bg-black text-white font-black text-xs uppercase tracking-widest rounded-sm">
                {examTitle} {session && !examTitle.includes(session) && !examTitle.includes("202") ? `(${session})` : ""}
              </div>
            </div>

            {/* Sub Header Specs */}
            <div className="grid grid-cols-4 gap-2 text-[11px] font-bold border border-black p-2 mb-3 bg-gray-50 text-center">
              <div>
                <span className="text-black/60 uppercase block text-[9px]">Class:</span>
                <span className="text-black font-extrabold">{className || "_______"}</span>
              </div>
              <div>
                <span className="text-black/60 uppercase block text-[9px]">Subject:</span>
                <span className="text-black font-extrabold">{subjectName || "_______"}</span>
              </div>
              <div>
                <span className="text-black/60 uppercase block text-[9px]">Max Marks:</span>
                <span className="text-black font-extrabold">{maxMarks || "___"}</span>
              </div>
              <div>
                <span className="text-black/60 uppercase block text-[9px]">Time Allowed:</span>
                <span className="text-black font-extrabold">{timeAllowed || "___"}</span>
              </div>
            </div>

            {/* Candidate Info + Roll No Bubble Grid */}
            <div className="grid grid-cols-12 gap-3 mb-4">
              {/* Left Column: Candidate Written Inputs & SET Code */}
              <div className={`${showRollNoBubbleGrid ? 'col-span-7' : 'col-span-12'} space-y-2 text-[11px]`}>
                {/* Candidate Name Box */}
                <div className="border border-black p-2">
                  <span className="font-bold uppercase tracking-wide text-[10px] block mb-1">
                    CANDIDATE NAME (IN CAPITAL LETTERS ONLY):
                  </span>
                  <div className="h-7 border-b border-dashed border-black"></div>
                </div>

                {/* Roll No / Class / Sec / Date Row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="border border-black p-1.5">
                    <span className="font-bold uppercase text-[9px] block">ROLL NO:</span>
                    <div className="h-5"></div>
                  </div>
                  <div className="border border-black p-1.5">
                    <span className="font-bold uppercase text-[9px] block">SECTION:</span>
                    <div className="h-5"></div>
                  </div>
                  <div className="border border-black p-1.5">
                    <span className="font-bold uppercase text-[9px] block">DATE:</span>
                    <div className="h-5 text-right text-[10px] pr-1 font-mono">{examDate}</div>
                  </div>
                </div>

                {/* Booklet No & Set Selection */}
                <div className="grid grid-cols-2 gap-2">
                  {showBookletNo && (
                    <div className="border border-black p-1.5">
                      <span className="font-bold uppercase text-[9px] block">QUESTION BOOKLET NO:</span>
                      <div className="h-5"></div>
                    </div>
                  )}

                  {showSetCode && (
                    <div className="border border-black p-1.5 flex flex-col justify-between">
                      <span className="font-bold uppercase text-[9px] block">QUESTION SET:</span>
                      <div className="flex justify-around items-center py-1">
                        {["A", "B", "C", "D"].map((setCode) => (
                          <div key={setCode} className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center font-bold text-[9px]">
                              {setCode}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions Box */}
                {showInstructions && (
                  <div className="border border-black p-2 bg-gray-50 text-[10px] space-y-1">
                    <div className="font-bold uppercase text-[9px] border-b border-black/20 pb-0.5 mb-1 flex items-center gap-1">
                      <Info className="w-3 h-3 text-black shrink-0" /> IMPORTANT INSTRUCTIONS FOR CANDIDATE:
                    </div>
                    <ul className="list-disc pl-3 text-[9.5px] leading-tight space-y-0.5 text-black/90 font-medium">
                      <li>Use <strong>BLUE or BLACK Ball Point Pen</strong> only to darken the bubbles.</li>
                      <li>Darken only ONE circle for each question. Darkening multiple circles invalidates the response.</li>
                      <li>Do not make any stray marks or fold the OMR Sheet.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Roll Number Grid */}
              {showRollNoBubbleGrid && (
                <div className="col-span-5 border border-black p-2 bg-white flex flex-col justify-between">
                  <div className="text-[10px] font-extrabold uppercase text-center border-b border-black pb-1 mb-1">
                    ROLL NUMBER GRID
                  </div>
                  
                  {/* Boxes for digits */}
                  <div className="flex justify-center gap-1 mb-1">
                    {Array.from({ length: rollNoDigits }).map((_, dIdx) => (
                      <div key={dIdx} className="w-5 h-5 border-2 border-black bg-gray-50 text-center font-bold text-[10px]"></div>
                    ))}
                  </div>

                  {/* 0-9 OMR Grid */}
                  <div className="space-y-0.5 font-mono text-[9px]">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                      <div key={digit} className="flex justify-center gap-1 items-center">
                        {Array.from({ length: rollNoDigits }).map((_, dIdx) => (
                          <div
                            key={dIdx}
                            className="w-4 h-4 rounded-full border-2 border-black flex items-center justify-center font-bold text-[8px] bg-white"
                          >
                            {digit}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* OMR Questions Grid Section Header */}
            <div className="bg-black text-white font-extrabold text-[11px] uppercase tracking-widest text-center py-1 mb-3 rounded-sm">
              ANSWERS / OMR RESPONSE SHEET ({numQuestions} QUESTIONS)
            </div>

            {/* Questions Columns Grid */}
            <div className={`grid ${
              numColumns === 1 ? "grid-cols-1" : numColumns === 3 ? "grid-cols-3" : numColumns === 4 ? "grid-cols-4" : "grid-cols-2"
            } gap-3 border-t-2 border-b-2 border-black py-3 mb-6`}>
              {columnsData.map((colQuestions, cIdx) => (
                <div key={cIdx} className="space-y-1.5 border-r border-black/30 last:border-r-0 pr-2">
                  {/* Column Header */}
                  <div className="flex items-center text-[10px] font-black uppercase text-black border-b border-black pb-1 mb-1">
                    <span className="w-8">Q.No</span>
                    <span className="flex-1 text-center font-bold tracking-widest">
                      OPTIONS ({optionLabels.join(" ")})
                    </span>
                  </div>

                  {colQuestions.map((qNum) => (
                    <div key={qNum} className="flex items-center text-[11px] font-mono py-0.5 hover:bg-gray-100">
                      {/* Question Number */}
                      <span className="w-8 font-bold text-right pr-2 text-black font-sans">
                        {qNum.toString().padStart(2, "0")}.
                      </span>

                      {/* Bubble Options */}
                      <div className="flex-1 flex justify-around items-center">
                        {optionLabels.map((label) => (
                          <div
                            key={label}
                            className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center font-bold text-[9px] text-black bg-white hover:bg-black hover:text-white transition cursor-pointer shrink-0"
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
            <div className="grid grid-cols-2 gap-4 border border-black p-3 text-[10px] mt-auto">
              <div className="flex flex-col justify-between h-16 border-r border-black pr-3">
                <div className="font-bold uppercase">CANDIDATE SIGNATURE:</div>
                <div className="border-t border-dashed border-black pt-0.5 text-center text-black/60 text-[9px]">
                  (Signature of Candidate inside box)
                </div>
              </div>

              <div className="flex flex-col justify-between h-16">
                <div className="font-bold uppercase">INVIGILATOR SIGNATURE:</div>
                <div className="border-t border-dashed border-black pt-0.5 text-center text-black/60 text-[9px]">
                  (Verified Roll No & Signature of Invigilator)
                </div>
              </div>
            </div>

            {/* Print Footer Note */}
            <div className="text-[8px] text-black/50 text-center mt-2 font-mono uppercase tracking-widest">
              S.D. PUBLIC SCHOOL OMR ANSWER SHEET — SYSTEM GENERATED HIGH PRECISION TEMPLATE
            </div>
          </div>
        </div>
      </div>

      {/* Embedded CSS for High Precision A4 Printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .omr-print-area, .omr-print-area * {
            visibility: visible !important;
          }
          .omr-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15mm 15mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
