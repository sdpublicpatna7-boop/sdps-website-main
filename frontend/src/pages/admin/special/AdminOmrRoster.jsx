import { useEffect, useRef, useState, useCallback } from "react";
import { 
  Users, RefreshCw, Upload, Database, AlertCircle, Sparkles, Trash2, 
  Search, Plus, Edit, ChevronLeft, ChevronRight, X, Info
} from "lucide-react";
import { 
  getOmrRoster, uploadOmrRoster, clearOmrRoster, 
  addOmrStudent, updateOmrStudent, deleteOmrStudent 
} from "@/lib/api";
import { toast } from "sonner";

export default function AdminOmrRoster() {
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  const [availableClasses, setAvailableClasses] = useState([]);
  const [availableSections, setAvailableSections] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  const [uploadingRoster, setUploadingRoster] = useState(false);
  const fileInputRef = useRef(null);

  // Edit / Add modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("add"); // "add" or "edit"
  const [currentStudent, setCurrentStudent] = useState({
    id: "",
    admission_no: "",
    student_name: "",
    roll_no: "",
    class_name: "",
    section: "",
    father_name: ""
  });
  const [savingStudent, setSavingStudent] = useState(false);

  // Fetch roster with pagination & filtering
  const fetchStudents = useCallback(async (page = 1, search = searchQuery, cName = selectedClass, sec = selectedSection) => {
    setStudentsLoading(true);
    try {
      const params = {
        page,
        limit: 15,
        search: search.trim()
      };
      if (cName && cName !== "ALL") params.class_name = cName;
      if (sec && sec !== "ALL") params.section = sec;

      const res = await getOmrRoster(params);
      if (res && res.status === "success") {
        setStudents(res.students || []);
        setTotalStudentsCount(res.total || 0);
        setCurrentPage(res.page || 1);
        setTotalPages(res.pages || 1);
        if (res.available_classes) setAvailableClasses(res.available_classes);
        if (res.available_sections) setAvailableSections(res.available_sections);
      }
    } catch (err) {
      toast.error("Failed to load OMR students database.");
    } finally {
      setStudentsLoading(false);
    }
  }, [searchQuery, selectedClass, selectedSection]);

  // Initial load
  useEffect(() => {
    fetchStudents(1);
  }, []);

  // Filter change handlers
  const handleSearchChange = (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    setCurrentPage(1);
    fetchStudents(1, q, selectedClass, selectedSection);
  };

  const handleClassFilterChange = (e) => {
    const val = e.target.value;
    setSelectedClass(val);
    setCurrentPage(1);
    fetchStudents(1, searchQuery, val, selectedSection);
  };

  const handleSectionFilterChange = (e) => {
    const val = e.target.value;
    setSelectedSection(val);
    setCurrentPage(1);
    fetchStudents(1, searchQuery, selectedClass, val);
  };

  // Upload/import handler
  const handleUploadRoster = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingRoster(true);
    try {
      const res = await uploadOmrRoster(file);
      toast.success(res.message || "Successfully imported OMR student roster!");
      fetchStudents(1, "", "", "");
      setSearchQuery("");
      setSelectedClass("");
      setSelectedSection("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to upload OMR student roster.");
    } finally {
      setUploadingRoster(false);
      e.target.value = "";
    }
  };

  // Delete single student
  const handleDeleteStudent = async (studentId, studentName) => {
    const ok = window.confirm(`Are you sure you want to delete ${studentName} from the OMR database?`);
    if (!ok) return;
    try {
      await deleteOmrStudent(studentId);
      toast.success("Student deleted successfully!");
      fetchStudents(currentPage);
    } catch (err) {
      toast.error("Failed to delete student.");
    }
  };

  // Clear all OMR students
  const handleClearAllStudents = async () => {
    const ok = window.confirm(
      `WARNING: Are you sure you want to CLEAR ALL student records from the OMR Student Database? This will permanently delete all ${totalStudentsCount} student records.`
    );
    if (!ok) return;
    try {
      await clearOmrRoster();
      toast.success("OMR database student roster cleared!");
      setStudents([]);
      setTotalStudentsCount(0);
      setTotalPages(1);
      setCurrentPage(1);
      setAvailableClasses([]);
      setAvailableSections([]);
      setSelectedClass("");
      setSelectedSection("");
    } catch (err) {
      toast.error("Failed to clear OMR student database.");
    }
  };

  // Add / Edit Modal handlers
  const handleOpenAddModal = () => {
    setModalType("add");
    setCurrentStudent({
      id: "",
      admission_no: "",
      student_name: "",
      roll_no: "",
      class_name: "",
      section: "",
      father_name: ""
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (student) => {
    setModalType("edit");
    setCurrentStudent({
      id: student.id,
      admission_no: student.admission_no || "",
      student_name: student.student_name || "",
      roll_no: student.roll_no || "",
      class_name: student.class_name || "",
      section: student.section || "",
      father_name: student.father_name || ""
    });
    setShowModal(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!currentStudent.admission_no || !currentStudent.student_name || !currentStudent.class_name || !currentStudent.section || !currentStudent.roll_no) {
      toast.error("All fields except Father's Name are required.");
      return;
    }
    setSavingStudent(true);
    try {
      if (modalType === "add") {
        await addOmrStudent(currentStudent);
        toast.success("Student added successfully to OMR roster!");
      } else {
        await updateOmrStudent(currentStudent.id, currentStudent);
        toast.success("Student details updated successfully!");
      }
      setShowModal(false);
      fetchStudents(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save student details.");
    } finally {
      setSavingStudent(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">OMR Student Database</h1>
            <p className="text-xs text-slate-500 font-medium">Manage student rosters exclusively for the OMR Answer Sheet Generator</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv, .xls, .xlsx"
            onChange={handleUploadRoster}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingRoster}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            {uploadingRoster ? "Importing..." : "Import Student Excel"}
          </button>
          
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Student
          </button>

          <button
            type="button"
            onClick={handleClearAllStudents}
            disabled={totalStudentsCount === 0}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 disabled:bg-slate-50 text-red-700 disabled:text-slate-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition border border-red-200 disabled:border-slate-150"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Database
          </button>
        </div>
      </div>

      {/* Main Grid: Info Guide + Student Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left column: Excel format instruction guide */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-600" /> Excel / CSV Import Guide
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              To import student lists successfully, format your spreadsheet with these exact column headers in the first row:
            </p>
            
            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[10px] text-slate-700">
                <span className="font-bold text-brand-blue">Name</span>
                <span className="block text-[9px] text-slate-500 font-sans mt-0.5">Full name of the student</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[10px] text-slate-700">
                <span className="font-bold text-brand-blue">Class</span>
                <span className="block text-[9px] text-slate-500 font-sans mt-0.5">Roman numerals e.g., VI, IX, X</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[10px] text-slate-700">
                <span className="font-bold text-brand-blue">Section</span>
                <span className="block text-[9px] text-slate-500 font-sans mt-0.5">Single character e.g., A, B</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[10px] text-slate-700">
                <span className="font-bold text-brand-blue">Roll_no</span>
                <span className="block text-[9px] text-slate-500 font-sans mt-0.5">Numeric roll number e.g., 5, 23</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[10px] text-slate-700">
                <span className="font-bold text-brand-blue">Admn_No</span>
                <span className="block text-[9px] text-slate-500 font-sans mt-0.5">Unique school Admission Number</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[10px] text-slate-700">
                <span className="font-bold text-brand-blue">Father_Name</span>
                <span className="block text-[9px] text-slate-500 font-sans mt-0.5">Optional father's name</span>
              </div>
            </div>
            
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-[10px] text-amber-800 leading-normal flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Roll numbers are automatically formatted to bubble the OMR sheets correctly. Keep the formatting simple.
              </span>
            </div>
          </div>
        </div>

        {/* Right column: Filters & Student table list */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            
            {/* Filters panel */}
            <div className="p-4 bg-slate-50/55 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
              {/* Search */}
              <div className="relative w-full sm:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Name or Admission No..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-4 py-2 bg-white text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition"
                />
              </div>

              {/* Class Dropdown */}
              <div className="w-full sm:w-40">
                <select
                  value={selectedClass}
                  onChange={handleClassFilterChange}
                  className="w-full px-3 py-2 bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition"
                >
                  <option value="">-- All Classes --</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown */}
              <div className="w-full sm:w-40">
                <select
                  value={selectedSection}
                  onChange={handleSectionFilterChange}
                  className="w-full px-3 py-2 bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition"
                >
                  <option value="">-- All Sections --</option>
                  {availableSections.map((s) => (
                    <option key={s} value={s}>{s.toUpperCase().startsWith("SECTION") || s.toUpperCase().startsWith("SEC") ? s : `Section ${s}`}</option>
                  ))}
                </select>
              </div>

              {/* Reset button */}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedClass("");
                  setSelectedSection("");
                  fetchStudents(1, "", "", "");
                }}
                className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition text-slate-600 flex items-center justify-center"
                title="Reset Filters"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Admission No</th>
                    <th className="px-5 py-3.5">Student Name</th>
                    <th className="px-5 py-3.5">Class & Section</th>
                    <th className="px-5 py-3.5">Roll No</th>
                    <th className="px-5 py-3.5">Father's Name</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {studentsLoading ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                          <span className="text-slate-400 text-xs">Loading database records...</span>
                        </div>
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-24 text-center">
                        <div className="flex flex-col items-center gap-1.5 text-slate-400">
                          <Database className="w-9 h-9 text-slate-300 mb-1" />
                          <span className="font-bold text-slate-800 text-xs">No records found</span>
                          <span className="text-[11px] text-slate-500 max-w-xs">Upload an Excel/CSV roster sheet or manually add students to populate the OMR Student Database.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-5 py-3.5 text-slate-900 font-bold">{student.admission_no}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-800">{student.student_name}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold uppercase text-[10px]">
                            {student.class_name} {student.section ? `- ${student.section}` : ""}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold">{student.roll_no}</td>
                        <td className="px-5 py-3.5 text-slate-500">{student.father_name || "—"}</td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(student)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition"
                              title="Edit details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStudent(student.id, student.student_name)}
                              className="p-1.5 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-lg transition"
                              title="Delete record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {!studentsLoading && totalPages > 1 && (
              <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">
                  Showing {(currentPage - 1) * 15 + 1} to {Math.min(currentPage * 15, totalStudentsCount)} of {totalStudentsCount} records
                </span>
                
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => fetchStudents(currentPage - 1)}
                    className="p-1.5 bg-white hover:bg-slate-150 disabled:bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-700" />
                  </button>
                  
                  <span className="px-3 py-1 text-xs font-bold text-slate-800 bg-slate-100 border border-slate-250 rounded-lg">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => fetchStudents(currentPage + 1)}
                    className="p-1.5 bg-white hover:bg-slate-150 disabled:bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-50 transition"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-700" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                {modalType === "add" ? "Add Student Record" : "Edit Student Details"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSaveStudent}>
              <div className="p-5 space-y-4">
                
                {/* Admission No */}
                <div>
                  <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Admission No *</label>
                  <input
                    type="text"
                    required
                    disabled={modalType === "edit"} // Keep key identifier stable during edit
                    value={currentStudent.admission_no}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, admission_no: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition disabled:bg-slate-50 disabled:text-slate-400"
                    placeholder="e.g. SDPS1024"
                  />
                </div>

                {/* Student Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Student Name *</label>
                  <input
                    type="text"
                    required
                    value={currentStudent.student_name}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, student_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition"
                    placeholder="e.g. Harsh Kumar"
                  />
                </div>

                {/* Class & Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Class *</label>
                    <input
                      type="text"
                      required
                      value={currentStudent.class_name}
                      onChange={(e) => setCurrentStudent({ ...currentStudent, class_name: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition"
                      placeholder="e.g. VIII, X"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Section *</label>
                    <input
                      type="text"
                      required
                      value={currentStudent.section}
                      onChange={(e) => setCurrentStudent({ ...currentStudent, section: e.target.value })}
                      className="w-full px-3 py-2 bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition"
                      placeholder="e.g. A, B"
                    />
                  </div>
                </div>

                {/* Roll No */}
                <div>
                  <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Roll No *</label>
                  <input
                    type="text"
                    required
                    value={currentStudent.roll_no}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, roll_no: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition"
                    placeholder="e.g. 18"
                  />
                </div>

                {/* Father's Name */}
                <div>
                  <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1">Father's Name (Optional)</label>
                  <input
                    type="text"
                    value={currentStudent.father_name}
                    onChange={(e) => setCurrentStudent({ ...currentStudent, father_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 transition"
                    placeholder="e.g. Rajesh Kumar"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStudent}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-sm"
                >
                  {savingStudent ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
