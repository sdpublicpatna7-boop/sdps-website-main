import { useEffect, useRef, useState, useCallback } from "react";
import api from "../../lib/api";
import { Toaster, toast } from "sonner";
import {
  Cake, Smartphone, RefreshCw, FileSpreadsheet, X, Send,
  Eye, Megaphone, Loader2, CheckCircle2, AlertTriangle, StopCircle, Calendar
} from "lucide-react";

const DEFAULT_TEMPLATE =
  "Dear {name},\n\n" +
  "S.D. Public School, Patna wishes you a very Happy Birthday! 🎂🎉\n\n" +
  "May your year ahead be filled with joy, academic success, and endless learning. We are proud to have you as part of our school family!\n\n" +
  "Regards,\nS.D. Public School";

export default function BirthdayGreetings() {
  const [status, setStatus] = useState({ connected: false, qr: null, user: null });
  const [statusLoading, setStatusLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [targetDate, setTargetDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD (local timezone)
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - offset * 60 * 1000);
    return localToday.toISOString().split("T")[0];
  });
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [showTemplate, setShowTemplate] = useState(false);

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);

  const [launching, setLaunching] = useState(false);
  const [progress, setProgress] = useState(null);

  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const r = await api.get("/whatsapp/status");
      setStatus(r.data);
    } catch {
      setStatus({ connected: false, qr: null, user: null });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, status.connected ? 15000 : 5000);
    return () => clearInterval(id);
  }, [fetchStatus, status.connected]);

  useEffect(() => {
    if (progress?.running) {
      pollRef.current = setInterval(async () => {
        try {
          const r = await api.get("/whatsapp/bulk-progress");
          setProgress(r.data);
          if (!r.data.running) clearInterval(pollRef.current);
        } catch { /* ignore transient */ }
      }, 2000);
      return () => clearInterval(pollRef.current);
    }
  }, [progress?.running]);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ok = /\.(xlsx|xls)$/i.test(f.name);
    if (!ok) { toast.error("Please upload an Excel file (.xlsx or .xls)"); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("File must be ≤ 5MB"); return; }
    setFile(f);
    setPreview(null);
  };

  const buildForm = (dryRun) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("message_template", template);
    fd.append("target_date", targetDate);
    fd.append("dry_run", dryRun ? "true" : "false");
    return fd;
  };

  const doPreview = async () => {
    if (!file) { toast.error("Upload the student list Excel file first"); return; }
    if (!targetDate) { toast.error("Select the target date"); return; }
    setPreviewing(true);
    setPreview(null);
    try {
      const r = await api.post("/whatsapp/birthday-campaign/preview", buildForm(true), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(r.data);
      toast.success(`${r.data.recipients_count} birthday(s) match (${r.data.skipped_count} skipped)`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not read the file");
    } finally {
      setPreviewing(false);
    }
  };

  const launch = async () => {
    if (!file || !preview) return;
    const confirmSend = window.confirm(
      `Are you sure you want to send birthday greetings to ${preview.recipients_count} student(s)?`
    );
    if (!confirmSend) return;

    setLaunching(true);
    try {
      const r = await api.post("/whatsapp/birthday-campaign/send", buildForm(false), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Birthday greeting campaign started!");
      setProgress({
        total: preview.recipients_count,
        sent: 0,
        failed: 0,
        running: true,
        errors: [],
      });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not launch campaign");
    } finally {
      setLaunching(false);
    }
  };

  const stopCampaign = async () => {
    try {
      await api.post("/whatsapp/stop-bulk");
      toast.info("Stopping campaign...");
    } catch {
      toast.error("Could not stop campaign");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange shadow-sm">
          <Cake className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-headline text-2xl font-bold text-slate-800">Birthday Greetings</h1>
          <p className="text-sm text-slate-500">Send custom school birthday cards & wishes to students automatically via Excel upload.</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status.connected ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500"}`}>
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-700">WhatsApp Service Status</div>
              <div className="text-xs text-slate-400">
                {statusLoading ? "Checking..." : status.connected ? `Connected (${status.user?.name || "Ready"})` : "Disconnected"}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setStatusLoading(true); fetchStatus(); }}
            disabled={statusLoading}
            className="p-2 text-slate-500 hover:text-brand-blue rounded-lg border border-black/5 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${statusLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {!status.connected && !statusLoading && status.qr && (
          <div className="mt-5 border-t border-black/5 pt-5 text-center flex flex-col items-center">
            <p className="text-xs text-slate-500 mb-3 max-w-sm">
              Scan this QR code from your school's WhatsApp account (Settings &gt; Linked Devices) to connect.
            </p>
            <div className="bg-white p-3 border border-black/5 rounded-xl shadow-inner">
              <img src={status.qr} alt="WhatsApp QR Code" className="w-48 h-48 block" />
            </div>
          </div>
        )}
      </div>

      {/* Step 1: Upload Excel & Select Date */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
        <div className="text-sm font-semibold text-slate-700 mb-4">1. Excel Sheet & Target Date</div>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Excel Uploader */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Upload Student List</label>
            <div className="border border-dashed border-slate-200 hover:border-brand-blue/40 rounded-xl p-6 text-center cursor-pointer transition relative group bg-slate-50/50">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={onPickFile}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-brand-blue/70 transition mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-600 group-hover:text-brand-blue transition">
                {file ? file.name : "Click or drag Excel file (.xlsx, .xls)"}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Must contain 'Name', 'Contact No', and 'DOB' columns.</div>
            </div>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Birthday Date</label>
            <div className="relative">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => { setTargetDate(e.target.value); setPreview(null); }}
                className="w-full text-sm font-semibold text-slate-700 border border-slate-200 rounded-xl px-4 py-3 bg-white focus:outline-none focus:border-brand-blue transition pr-10"
              />
              <Calendar className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Filter the sheet's DOB column by this day & month (e.g. today).</p>
          </div>
        </div>
      </div>

      {/* Step 2: Message Template */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">2. Message caption</div>
          <button
            onClick={() => setShowTemplate(!showTemplate)}
            className="text-xs font-bold text-brand-blue hover:underline"
          >
            {showTemplate ? "Hide Template" : "Customize Message"}
          </button>
        </div>
        {showTemplate ? (
          <div className="mt-4">
            <textarea
              rows={6}
              value={template}
              onChange={(e) => { setTemplate(e.target.value); setPreview(null); }}
              placeholder="Enter message template..."
              className="w-full text-sm border border-slate-200 rounded-xl p-4 focus:outline-none focus:border-brand-blue font-sans text-slate-700 bg-slate-50/50"
            />
            <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
              <span>Placeholder: <strong>{"{name}"}</strong> (replaced with student name)</span>
              <span>Keep message friendly & formal.</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 text-xs bg-slate-50 border border-black/5 p-3 rounded-xl text-slate-600 leading-relaxed font-medium">
            {template.split("\n").map((line, i) => <div key={i}>{line || <br />}</div>)}
          </div>
        )}
      </div>

      {/* Step 3: Preview */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm font-semibold text-slate-700">3. Preview Card & Recipients</div>
          <button
            onClick={doPreview}
            disabled={previewing || !file}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
          >
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
          </button>
        </div>

        {preview && (
          <div className="mt-5 grid md:grid-cols-12 gap-6 border-t border-black/5 pt-5">
            {/* Greeting Card Preview */}
            <div className="md:col-span-5 flex flex-col items-center">
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Generated Card</span>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-md max-w-[280px]">
                <img src={preview.card_preview_url} alt="SDPS Birthday Card Preview" className="w-full h-auto block" />
              </div>
              <span className="text-[10px] text-slate-400 mt-2 text-center">Dynamic card generated in SDPS colors.</span>
            </div>

            {/* Matching Recipients List */}
            <div className="md:col-span-7">
              <div className="flex gap-4 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                <span className="text-emerald-600 font-bold">{preview.recipients_count} Matches</span>
                <span>•</span>
                <span>{preview.skipped_count} Skipped</span>
              </div>
              
              {preview.recipients?.length > 0 ? (
                <div className="border border-black/5 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-black/5">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-semibold">Name</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Phone</th>
                        <th className="text-right px-3 py-2.5 font-semibold">DOB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.recipients.map((s, i) => (
                        <tr key={i} className="border-t border-black/5 hover:bg-slate-50/50">
                          <td className="px-3 py-2 text-slate-700 font-medium">{s.name}</td>
                          <td className="px-3 py-2 text-slate-500">{s.phone}</td>
                          <td className="px-3 py-2 text-right text-slate-700 font-mono">{s.dob}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-50/50 rounded-xl border border-black/5 p-8 text-center text-xs text-slate-400">
                  No birthdays match the selected date. Change the date or upload another sheet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Step 4: Launch Campaign */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Messages are paced with a 2s delay to comply with anti-spam limits.
          </div>
          <div className="flex items-center gap-2">
            {progress?.running && (
              <button onClick={stopCampaign} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                <StopCircle className="w-4 h-4" /> Stop
              </button>
            )}
            <button
              onClick={launch}
              disabled={launching || progress?.running || !status.connected || !preview || preview.recipients_count === 0}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-brand-blue text-white hover:opacity-90 disabled:opacity-50 shadow-sm"
            >
              {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Greetings
            </button>
          </div>
        </div>

        {progress && (
          <div className="mt-5 border-t border-black/5 pt-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{progress.running ? "Campaign active…" : "Finished"}</span>
              <span>{progress.sent + progress.failed} / {progress.total}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${progress.total ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-emerald-600 font-semibold">✓ Sent: {progress.sent}</span>
              <span className="text-red-500 font-semibold">✗ Failed: {progress.failed}</span>
            </div>
            {progress.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-red-500 cursor-pointer font-medium">{progress.errors.length} error(s)</summary>
                <div className="text-[11px] text-slate-500 mt-1 max-h-32 overflow-y-auto bg-slate-50 p-2 rounded border border-black/5">
                  {progress.errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
