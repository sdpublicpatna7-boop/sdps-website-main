import { useEffect, useRef, useState, useCallback } from "react";
import api from "../../lib/api";
import { Toaster, toast } from "sonner";
import {
  CreditCard, Smartphone, RefreshCw, FileSpreadsheet, X, Send,
  Eye, Megaphone, Loader2, CheckCircle2, AlertTriangle, StopCircle,
} from "lucide-react";

const DEFAULT_TEMPLATE =
  "Dear {father},\n\n" +
  "This is a gentle reminder from S.D. Public School regarding the pending fee for your ward *{name}* (Admission No: {admn}).\n\n" +
  "Outstanding balance up to {month}: *₹{balance}*\n\n" +
  "Kindly pay online at: {pay_url}\n" +
  "Just enter your child's admission number and pay.\n\n" +
  "If you have already paid, please ignore this message.\n\n" +
  "Regards,\nS.D. Public School";

export default function FeeReminders() {
  const [status, setStatus] = useState({ connected: false, qr: null, user: null });
  const [statusLoading, setStatusLoading] = useState(true);

  const [file, setFile] = useState(null);
  const [month, setMonth] = useState("");
  const [minBalance, setMinBalance] = useState("");
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
    fd.append("month", month.trim());
    fd.append("min_balance", minBalance === "" ? "0" : String(minBalance));
    fd.append("message_template", showTemplate ? template : "");
    fd.append("dry_run", dryRun ? "true" : "false");
    return fd;
  };

  const doPreview = async () => {
    if (!file) { toast.error("Upload the fee balance Excel file first"); return; }
    if (!month.trim()) { toast.error("Enter the month (e.g. June)"); return; }
    setPreviewing(true);
    setPreview(null);
    try {
      const r = await api.post("/whatsapp/fee-reminder", buildForm(true), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(r.data);
      toast.success(`${r.data.recipients} parent(s) match (${r.data.skipped} skipped)`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not read the file");
    } finally {
      setPreviewing(false);
    }
  };

  const launch = async () => {
    if (!status.connected) { toast.error("WhatsApp is not connected"); return; }
    if (!file) { toast.error("Upload the fee balance Excel file first"); return; }
    if (!month.trim()) { toast.error("Enter the month (e.g. June)"); return; }
    if (!preview) { toast.error("Preview the recipients first"); return; }
    if (!window.confirm(
      `Send fee reminders to ${preview.recipients} parent(s)? ` +
      "Messages are sent with a 2s delay between each."
    )) return;

    setLaunching(true);
    try {
      const r = await api.post("/whatsapp/fee-reminder", buildForm(false), {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Reminders started for ${r.data.recipients} parent(s)`);
      setProgress({ total: r.data.recipients, sent: 0, failed: 0, running: true, errors: [] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to send reminders");
    } finally {
      setLaunching(false);
    }
  };

  const stopCampaign = async () => {
    try {
      await api.post("/whatsapp/stop-bulk");
      toast.message("Stopping after the current message...");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Stop failed");
    }
  };

  return (
    <div className="max-w-5xl">
      <Toaster position="top-right" richColors />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h1 className="text-2xl font-headline font-semibold text-brand-blue">Fee Reminders</h1>
          <p className="text-sm text-slate-500">Upload the fee balance sheet and WhatsApp parents a payment reminder.</p>
        </div>
      </div>

      {/* Connection card */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-sm font-semibold text-slate-700">WhatsApp Connection</div>
              {statusLoading ? (
                <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking…</div>
              ) : status.connected ? (
                <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                </div>
              ) : (
                <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not connected
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStatus} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-black/10 hover:bg-slate-50">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <a href="/admin/integration-keys" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-black/10 hover:bg-slate-50">
              Manage connection
            </a>
          </div>
        </div>
        {!status.connected && !statusLoading && (
          <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            WhatsApp isn't linked. Go to <a href="/admin/integration-keys" className="font-semibold underline">Integration Keys</a> to scan the QR code, then come back to send.
          </div>
        )}
      </div>

      {/* Upload + filters */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm space-y-4">
        <div className="text-sm font-semibold text-slate-700">1. Fee balance sheet</div>
        {file ? (
          <div className="flex items-center gap-2 text-sm">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="font-medium text-slate-700 truncate max-w-xs">{file.name}</span>
            <button onClick={() => { setFile(null); setPreview(null); }} className="text-red-500 ml-1"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <label className="flex items-center gap-2 text-sm font-medium text-brand-blue cursor-pointer w-fit px-3 py-2 rounded-lg border border-dashed border-brand-blue/30 hover:bg-brand-blue/5">
            <FileSpreadsheet className="w-4 h-4" /> Upload Excel (.xlsx)
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onPickFile} />
          </label>
        )}
        <p className="text-[11px] text-slate-400">
          The sheet should have columns for Name, Admission No, Father Name, Contact No and Balance. Title and Total rows are skipped automatically.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Up to month <span className="text-red-500">*</span></label>
            <input
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              placeholder="e.g. June"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Balance greater than (₹)</label>
            <input
              type="number"
              min="0"
              value={minBalance}
              onChange={(e) => setMinBalance(e.target.value)}
              placeholder="e.g. 2000 (0 = everyone with a balance)"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>
        </div>

        <div>
          <button
            onClick={() => setShowTemplate((s) => !s)}
            className="text-xs font-semibold text-brand-blue underline"
          >
            {showTemplate ? "Hide" : "Customise"} message template
          </button>
          {showTemplate && (
            <div className="mt-2">
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={9}
                className="w-full rounded-xl border border-black/10 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Placeholders: {"{father} {name} {admn} {month} {balance} {pay_url}"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm font-semibold text-slate-700">2. Preview recipients</div>
          <button
            onClick={doPreview}
            disabled={previewing || !file}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5 disabled:opacity-50"
          >
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
          </button>
        </div>
        {preview && (
          <div className="mt-4">
            <div className="flex gap-4 text-sm mb-3">
              <span className="text-emerald-600 font-semibold">{preview.recipients} will receive</span>
              <span className="text-slate-400">{preview.skipped} skipped</span>
            </div>
            {preview.sample?.length > 0 && (
              <div className="border border-black/5 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Name</th>
                      <th className="text-left px-3 py-2 font-semibold">Phone</th>
                      <th className="text-right px-3 py-2 font-semibold">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.sample.map((s, i) => (
                      <tr key={i} className="border-t border-black/5">
                        <td className="px-3 py-2 text-slate-700">{s.name}</td>
                        <td className="px-3 py-2 text-slate-500">{s.phone}</td>
                        <td className="px-3 py-2 text-right text-slate-700">{Number(s.balance).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.recipients > preview.sample.length && (
                  <div className="text-[11px] text-slate-400 px-3 py-2 bg-slate-50">…and {preview.recipients - preview.sample.length} more</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Launch + progress */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Messages send with a 2s delay between each to reduce ban risk.
          </div>
          <div className="flex items-center gap-2">
            {progress?.running && (
              <button onClick={stopCampaign} className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                <StopCircle className="w-4 h-4" /> Stop
              </button>
            )}
            <button
              onClick={launch}
              disabled={launching || progress?.running || !status.connected || !preview}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-brand-blue text-white hover:opacity-90 disabled:opacity-50"
            >
              {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Reminders
            </button>
          </div>
        </div>

        {progress && (
          <div className="mt-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{progress.running ? "Sending…" : "Completed"}</span>
              <span>{progress.sent + progress.failed} / {progress.total}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${progress.total ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-emerald-600 font-medium">✓ Sent: {progress.sent}</span>
              <span className="text-red-500 font-medium">✗ Failed: {progress.failed}</span>
            </div>
            {progress.errors?.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-red-500 cursor-pointer">{progress.errors.length} error(s)</summary>
                <div className="text-[11px] text-slate-500 mt-1 max-h-32 overflow-y-auto">
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
