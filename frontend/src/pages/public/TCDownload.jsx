import { useState } from "react";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { FileDown, Loader2 } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function TCDownload() {
  const [form, setForm] = useState({ student_name: "", dob: "", admission_number: "" });
  const [loading, setLoading] = useState(false);
  const [tc, setTc] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setTc(null);
    try {
      const r = await api.post("/tc/download", form);
      setTc(r.data);
      toast.success("TC found!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Not found");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Toaster position="top-right" />
      <section className="bg-hero-grad py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="overline mb-3">For ex-students</div>
          <h1 className="legacy-title brand-gradient-text">Download Transfer Certificate</h1>
          <p className="mt-4 text-brand-ink/70">Enter your details to retrieve your TC.</p>
        </div>
      </section>
      <div className="max-w-md mx-auto px-6 py-12">
        <form onSubmit={submit} className="bg-white rounded-3xl p-8 border border-black/5 space-y-4" data-testid="tc-form">
          <div>
            <label className="text-xs uppercase font-bold tracking-wider text-brand-ink/60">Student Full Name *</label>
            <input required className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.student_name} onChange={e => setForm({ ...form, student_name: e.target.value })} data-testid="tc-name" />
          </div>
          <div>
            <label className="text-xs uppercase font-bold tracking-wider text-brand-ink/60">Date of Birth *</label>
            <input required type="date" className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} data-testid="tc-dob" />
          </div>
          <div>
            <label className="text-xs uppercase font-bold tracking-wider text-brand-ink/60">Admission Number *</label>
            <input required className="w-full mt-1 px-4 py-2.5 rounded-xl border border-black/10 focus:border-brand-blue outline-none" value={form.admission_number} onChange={e => setForm({ ...form, admission_number: e.target.value })} data-testid="tc-admission" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60" data-testid="tc-submit-btn">
            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching...</span> : "Find My TC"}
          </button>
        </form>

        {tc && (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center" data-testid="tc-result">
            <FileDown className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="font-headline font-semibold mt-3">TC for {tc.student_name}</h3>
            <a href={tc.tc_file_url.startsWith("http") ? tc.tc_file_url : `${BACKEND}${tc.tc_file_url}`} target="_blank" rel="noreferrer" className="btn-primary inline-block mt-4" data-testid="tc-download-link">Download TC</a>
          </div>
        )}
      </div>
    </>
  );
}
