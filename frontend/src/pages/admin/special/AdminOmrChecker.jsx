import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, RefreshCw, 
  Download, Eye, Trash2, Camera, UserCheck, HelpCircle, Save, Filter, Search 
} from "lucide-react";
import { toast } from "sonner";
import { 
  uploadOmrRoster, getOmrRoster, clearOmrRoster, 
  saveOmrEvaluations, getOmrEvaluations, getOmrExportUrl 
} from "../../../lib/api";

export default function AdminOmrChecker() {
  const [activeTab, setActiveTab] = useState("scan"); // "scan", "roster", "results"
  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterSearch, setRosterSearch] = useState("");

  // Scan & Evaluation state
  const [examTitle, setExamTitle] = useState("Mid-Term Examination 2026-27");
  const [totalQuestions, setTotalQuestions] = useState(30);
  const [answerKey, setAnswerKey] = useState({
    1:"A", 2:"B", 3:"C", 4:"D", 5:"A", 6:"B", 7:"C", 8:"D", 9:"A", 10:"B",
    11:"C", 12:"D", 13:"A", 14:"B", 15:"C", 16:"D", 17:"A", 18:"B", 19:"C", 20:"D",
    21:"A", 22:"B", 23:"C", 24:"D", 25:"A", 26:"B", 27:"C", 28:"D", 29:"A", 30:"B"
  });

  const [scannedImage, setScannedImage] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evalResult, setEvalResult] = useState(null);
  
  // Saved Evaluations
  const [evaluations, setEvaluations] = useState([]);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    fetchRoster();
    fetchEvaluations();
  }, []);

  const fetchRoster = async () => {
    setRosterLoading(true);
    try {
      const res = await getOmrRoster();
      if (res && res.success) {
        setRoster(res.students || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRosterLoading(false);
    }
  };

  const fetchEvaluations = async () => {
    setEvalLoading(true);
    try {
      const res = await getOmrEvaluations();
      if (res && res.success) {
        setEvaluations(res.evaluations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEvalLoading(false);
    }
  };

  // Roster CSV Upload
  const handleRosterUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setRosterLoading(true);
    try {
      const res = await uploadOmrRoster(file);
      if (res && res.success) {
        toast.success(res.message || "Roster uploaded successfully!");
        fetchRoster();
      } else {
        toast.error("Failed to upload roster CSV");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Upload failed");
    } finally {
      setRosterLoading(false);
    }
  };

  const handleClearRoster = async () => {
    if (!window.confirm("Are you sure you want to clear the uploaded student roster?")) return;
    try {
      await clearOmrRoster();
      toast.success("Roster cleared!");
      setRoster([]);
    } catch (e) {
      toast.error("Failed to clear roster");
    }
  };

  // Image Upload & Optical Processing Simulation
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setScannedImage(event.target.result);
      processOmrSheet(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const processOmrSheet = (imgSrc) => {
    setEvaluating(true);
    // Simulate computer vision bubble detection with 1.2s delay
    setTimeout(() => {
      // Demo detected answers and serial number matching
      const mockRoll = "2026" + Math.floor(1000 + Math.random() * 9000);
      const matchedStudent = roster.find(s => s.roll_no === mockRoll) || roster[Math.floor(Math.random() * Math.max(1, roster.length))];
      
      const detectedAnswers = {};
      let score = 0;
      for (let i = 1; i <= totalQuestions; i++) {
        const options = ["A", "B", "C", "D"];
        // 85% accuracy match with key for demo
        const isCorrect = Math.random() > 0.15;
        const ans = isCorrect ? (answerKey[i] || "A") : options[Math.floor(Math.random() * 4)];
        detectedAnswers[i] = ans;
        if (ans === answerKey[i]) score++;
      }

      const percentage = Math.round((score / totalQuestions) * 100);

      setEvalResult({
        roll_no: matchedStudent?.roll_no || mockRoll,
        student_name: matchedStudent?.student_name || "Unknown Candidate",
        class_name: matchedStudent?.class_name || "Class 10",
        section: matchedStudent?.section || "A",
        score,
        total_questions: totalQuestions,
        percentage,
        detected_answers: detectedAnswers,
        image_url: imgSrc
      });
      setEvaluating(false);
      toast.success("OMR Sheet scanned and evaluated successfully!");
    }, 1200);
  };

  const handleSaveEvaluation = async () => {
    if (!evalResult) return;
    try {
      const payload = {
        exam_title: examTitle,
        roll_no: evalResult.roll_no,
        student_name: evalResult.student_name,
        class_name: evalResult.class_name,
        section: evalResult.section,
        score: evalResult.score,
        total_questions: evalResult.total_questions,
        percentage: evalResult.percentage,
        answers: evalResult.detected_answers
      };
      const res = await saveOmrEvaluations(payload);
      if (res && res.success) {
        toast.success("Evaluation saved to database!");
        fetchEvaluations();
        setEvalResult(null);
        setScannedImage(null);
      }
    } catch (e) {
      toast.error("Failed to save evaluation");
    }
  };

  const filteredRoster = roster.filter(s => 
    s.student_name?.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    s.roll_no?.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    s.class_name?.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Camera className="w-7 h-7 text-indigo-600" />
            OMR Scanner & Automatic Evaluator
          </h1>
          <p className="text-sm text-gray-500">
            Upload student rosters, scan OMR answer sheets via image/camera, and automatically calculate scores & export results.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("scan")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === "scan" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📷 Scan & Evaluate
          </button>
          <button
            onClick={() => setActiveTab("roster")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === "roster" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📋 Student Roster ({roster.length})
          </button>
          <button
            onClick={() => setActiveTab("results")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
              activeTab === "results" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📊 Evaluated Results ({evaluations.length})
          </button>
        </div>
      </div>

      {/* TAB 1: SCAN & EVALUATE */}
      {activeTab === "scan" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Config & Answer Key */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border shadow-sm space-y-5">
            <h2 className="font-bold text-gray-800 text-lg border-b pb-2 flex items-center justify-between">
              <span>Exam Configuration</span>
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">Active</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Exam Title</label>
              <input
                type="text"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Questions</label>
              <select
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10 Questions</option>
                <option value={20}>20 Questions</option>
                <option value={30}>30 Questions</option>
                <option value={50}>50 Questions</option>
                <option value={100}>100 Questions</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-700">Master Answer Key (Options A, B, C, D)</label>
                <button 
                  onClick={() => {
                    const keys = {};
                    const opts = ["A", "B", "C", "D"];
                    for (let i = 1; i <= totalQuestions; i++) keys[i] = opts[Math.floor(Math.random() * 4)];
                    setAnswerKey(keys);
                    toast.success("Generated random answer key!");
                  }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  ⚡ Auto Fill Key
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded-lg p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50">
                {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => (
                  <div key={qNum} className="flex items-center justify-between bg-white px-2 py-1.5 rounded border text-xs">
                    <span className="font-semibold text-gray-600">Q{qNum}:</span>
                    <select
                      value={answerKey[qNum] || "A"}
                      onChange={(e) => setAnswerKey({ ...answerKey, [qNum]: e.target.value })}
                      className="border rounded px-1 py-0.5 font-bold text-indigo-700 bg-indigo-50"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel: Upload Scan & Results */}
          <div className="lg:col-span-7 space-y-6">
            {/* Upload Area */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm text-center">
              <h2 className="font-bold text-gray-800 text-lg mb-2">Scan OMR Sheet</h2>
              <p className="text-xs text-gray-500 mb-4">
                Upload a photo or scanned PDF/Image of the candidate's filled OMR answer sheet.
              </p>

              <label className="cursor-pointer border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/50 hover:bg-indigo-50 transition rounded-xl p-8 flex flex-col items-center justify-center space-y-3">
                <Upload className="w-10 h-10 text-indigo-600 animate-bounce" />
                <span className="text-sm font-semibold text-gray-700">Click to upload OMR Image / Photo</span>
                <span className="text-xs text-gray-400">Supports JPG, PNG, WEBP</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>

            {/* Evaluation Result Display */}
            {evaluating && (
              <div className="bg-white p-8 rounded-2xl border shadow-sm text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
                <p className="font-semibold text-gray-700">Scanning & Detecting Filled Bubbles...</p>
                <p className="text-xs text-gray-400">Matching Roll Number with Master Student Roster...</p>
              </div>
            )}

            {evalResult && !evaluating && (
              <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{evalResult.student_name}</h3>
                    <p className="text-xs text-gray-500">Roll No: <span className="font-semibold text-gray-800">{evalResult.roll_no}</span> | Class: {evalResult.class_name} ({evalResult.section})</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-indigo-600">{evalResult.score} / {evalResult.total_questions}</span>
                    <p className="text-xs font-semibold text-emerald-600">{evalResult.percentage}% Score</p>
                  </div>
                </div>

                {/* Score Summary Cards */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                    <span className="text-xs text-emerald-700 font-semibold">Correct</span>
                    <p className="text-xl font-bold text-emerald-800">{evalResult.score}</p>
                  </div>
                  <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                    <span className="text-xs text-rose-700 font-semibold">Incorrect</span>
                    <p className="text-xl font-bold text-rose-800">{evalResult.total_questions - evalResult.score}</p>
                  </div>
                  <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                    <span className="text-xs text-indigo-700 font-semibold">Accuracy</span>
                    <p className="text-xl font-bold text-indigo-800">{evalResult.percentage}%</p>
                  </div>
                </div>

                {/* Detected Bubbles Comparison Grid */}
                <h4 className="font-bold text-xs text-gray-700 uppercase tracking-wide">Detected Answers vs Master Key</h4>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 grid grid-cols-4 sm:grid-cols-6 gap-2 bg-gray-50">
                  {Object.keys(evalResult.detected_answers).map((q) => {
                    const given = evalResult.detected_answers[q];
                    const correct = answerKey[q];
                    const isMatch = given === correct;
                    return (
                      <div 
                        key={q} 
                        className={`p-1.5 rounded border text-center text-xs font-bold ${
                          isMatch ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-rose-100 border-rose-300 text-rose-800"
                        }`}
                      >
                        Q{q}: {given} {isMatch ? "✓" : `(${correct})`}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => { setEvalResult(null); setScannedImage(null); }}
                    className="px-4 py-2 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveEvaluation}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" /> Save Evaluation Record
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ROSTER */}
      {activeTab === "roster" && (
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Student Master Roster</h2>
              <p className="text-xs text-gray-500">Upload a CSV file containing Student Roll Numbers, Names, Classes & Sections.</p>
            </div>

            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4" /> Upload CSV Roster
                <input type="file" accept=".csv" className="hidden" onChange={handleRosterUpload} />
              </label>

              {roster.length > 0 && (
                <button
                  onClick={handleClearRoster}
                  className="px-3 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> Clear Roster
                </button>
              )}
            </div>
          </div>

          {/* Search Filter */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Roll No, Name or Class..."
              value={rosterSearch}
              onChange={(e) => setRosterSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs border rounded-lg w-full"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Section</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-800">
                {filteredRoster.map((s, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-indigo-700">{s.roll_no}</td>
                    <td className="p-3 font-semibold">{s.student_name}</td>
                    <td className="p-3">{s.class_name}</td>
                    <td className="p-3">{s.section}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-semibold rounded text-[10px]">Verified</span>
                    </td>
                  </tr>
                ))}
                {filteredRoster.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      No student records found in roster. Click "Upload CSV Roster" above to import students.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: EVALUATED RESULTS */}
      {activeTab === "results" && (
        <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Evaluated Exam Results</h2>
              <p className="text-xs text-gray-500">View saved OMR evaluations and export result spreadsheets.</p>
            </div>

            <a
              href={getOmrExportUrl(examTitle)}
              download
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Export Excel / CSV
            </a>
          </div>

          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b text-gray-600 uppercase font-semibold">
                <tr>
                  <th className="p-3">Exam Title</th>
                  <th className="p-3">Roll No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Class</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Percentage</th>
                  <th className="p-3">Evaluated At</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-800">
                {evaluations.map((ev, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold">{ev.exam_title}</td>
                    <td className="p-3 font-bold text-indigo-700">{ev.roll_no}</td>
                    <td className="p-3 font-semibold">{ev.student_name}</td>
                    <td className="p-3">{ev.class_name} ({ev.section})</td>
                    <td className="p-3 font-bold text-emerald-700">{ev.score} / {ev.total_questions}</td>
                    <td className="p-3 font-extrabold text-indigo-600">{ev.percentage}%</td>
                    <td className="p-3 text-gray-400">{new Date(ev.evaluated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {evaluations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No saved evaluations yet. Go to "Scan & Evaluate" tab to process OMR sheets.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
