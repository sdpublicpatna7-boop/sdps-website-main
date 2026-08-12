import { useEffect, useRef, useState, useCallback } from "react";
import api from "../../lib/api";
import { Toaster, toast } from "sonner";
import {
  MessageSquare, Smartphone, RefreshCw, LogOut, Paperclip, X,
  Send, FlaskConical, Megaphone, Loader2, CheckCircle2, AlertTriangle, StopCircle,
} from "lucide-react";

const MAX_MEDIA_MB = 16;

export default function WhatsAppMarketing() {
  const [status, setStatus] = useState({ connected: false, qr: null, user: null });
  const [statusLoading, setStatusLoading] = useState(true);

  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);

  const [numbers, setNumbers] = useState("");
  const [csvFile, setCsvFile] = useState(null);

  const [testNumber, setTestNumber] = useState("");
  const [testTried, setTestTried] = useState(false);
  const [testing, setTesting] = useState(false);

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

  // Poll connection status while not connected (to refresh the QR), and slowly when connected.
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, status.connected ? 15000 : 5000);
    return () => clearInterval(id);
  }, [fetchStatus, status.connected]);

  // Poll campaign progress while a campaign is running.
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

  const onPickAttachment = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isMedia = f.type.startsWith("image/") || f.type.startsWith("video/");
    if (!isMedia) { toast.error("Attachment must be an image or video"); return; }
    if (f.size > MAX_MEDIA_MB * 1024 * 1024) { toast.error(`Attachment must be ≤ ${MAX_MEDIA_MB}MB`); return; }
    setAttachment(f);
    setAttachmentPreview({ url: URL.createObjectURL(f), type: f.type, name: f.name });
  };

  const clearAttachment = () => {
    if (attachmentPreview?.url) URL.revokeObjectURL(attachmentPreview.url);
    setAttachment(null);
    setAttachmentPreview(null);
  };

  const countRecipients = () => {
    const fromText = numbers.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
    return fromText.length + (csvFile ? 1 : 0); // CSV count unknown until parsed server-side
  };

  const sendTest = async () => {
    if (!status.connected) { toast.error("WhatsApp is not connected"); return; }
    if (!testNumber.trim()) { toast.error("Enter a test number"); return; }
    if (!message.trim() && !attachment) { toast.error("Enter a message or attach media"); return; }
    setTesting(true);
    try {
      const fd = new FormData();
      fd.append("phone", testNumber.trim());
      fd.append("message", message);
      if (attachment) fd.append("attachment", attachment);
      await api.post("/whatsapp/send-test", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setTestTried(true);
      toast.success(`Test message sent to ${testNumber.trim()}. Verify it on WhatsApp before launching.`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Test send failed");
    } finally {
      setTesting(false);
    }
  };

  const launch = async () => {
    if (!status.connected) { toast.error("WhatsApp is not connected"); return; }
    if (!message.trim() && !attachment) { toast.error("Enter a message or attach media"); return; }
    if (!numbers.trim() && !csvFile) { toast.error("Add recipient numbers or upload a CSV"); return; }
    if (!testTried && !window.confirm("You haven't sent a test message. Launch the campaign anyway?")) return;
    if (!window.confirm("Launch the WhatsApp campaign now? Messages are sent with a 2s delay between each.")) return;

    setLaunching(true);
    try {
      const fd = new FormData();
      fd.append("message", message);
      fd.append("numbers", numbers);
      if (csvFile) fd.append("contacts_csv", csvFile);
      if (attachment) fd.append("attachment", attachment);
      const r = await api.post("/whatsapp/send-bulk", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success(`Campaign started for ${r.data.contacts_count} recipients`);
      setProgress({ total: r.data.contacts_count, sent: 0, failed: 0, running: true, errors: [] });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to launch campaign");
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
      <Toaster position="top-right" richColors closeButton />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-headline font-semibold text-brand-blue">WhatsApp Marketing</h1>
          <p className="text-sm text-slate-500">Send announcements, posters and reels to your contacts.</p>
        </div>
      </div>

      {/* Connection card */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-sm font-semibold text-slate-700">Connection</div>
              {statusLoading ? (
                <div className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Checking…</div>
              ) : status.connected ? (
                <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Connected{status.user?.id ? ` · ${status.user.id.split(":")[0].replace("@s.whatsapp.net", "")}` : ""}
                </div>
              ) : (
                <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Not connected — scan the QR to link a device
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStatus} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-black/10 hover:bg-slate-50">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <a href="/admin/integration-keys" className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-black/10 hover:bg-slate-50">
              <LogOut className="w-3.5 h-3.5" /> Manage connection
            </a>
          </div>
        </div>

        {!status.connected && !statusLoading && (
          <div className="mt-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            WhatsApp isn't linked. Go to <a href="/admin/integration-keys" className="font-semibold underline">Integration Keys</a> to scan the QR code, then come back to send.
          </div>
        )}
      </div>

      {/* Compose */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm space-y-4">
        <div className="text-sm font-semibold text-slate-700">Message</div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder={"Type your announcement…\nTip: use {name} to personalise (filled from the CSV 'name' column)."}
          className="w-full rounded-xl border border-black/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />

        <div>
          <div className="text-sm font-semibold text-slate-700 mb-2">Attachment (optional — poster / image / video / reel)</div>
          {attachmentPreview ? (
            <div className="relative inline-block">
              {attachmentPreview.type.startsWith("image/") ? (
                <img src={attachmentPreview.url} alt="preview" className="max-h-44 rounded-xl border border-black/10" />
              ) : (
                <video src={attachmentPreview.url} controls className="max-h-44 rounded-xl border border-black/10" />
              )}
              <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow">
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="text-[11px] text-slate-400 mt-1 truncate max-w-xs">{attachmentPreview.name}</div>
            </div>
          ) : (
            <label className="flex items-center gap-2 text-sm font-medium text-brand-blue cursor-pointer w-fit px-3 py-2 rounded-lg border border-dashed border-brand-blue/30 hover:bg-brand-blue/5">
              <Paperclip className="w-4 h-4" /> Add image or video
              <input type="file" accept="image/*,video/*" className="hidden" onChange={onPickAttachment} />
            </label>
          )}
        </div>
      </div>

      {/* Test before launch */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical className="w-5 h-5 text-amber-600" />
          <div className="text-sm font-semibold text-amber-800">Test first</div>
        </div>
        <p className="text-xs text-amber-700 mb-3">Send the exact message + attachment to one number and confirm it looks right before the bulk launch.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
            placeholder="Test number e.g. 9955190262"
            className="rounded-lg border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
          />
          <button
            onClick={sendTest}
            disabled={testing || !status.connected}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Test
          </button>
          {testTried && <span className="text-xs text-emerald-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Test sent</span>}
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6 shadow-sm space-y-4">
        <div className="text-sm font-semibold text-slate-700">Recipients</div>
        <textarea
          value={numbers}
          onChange={(e) => setNumbers(e.target.value)}
          rows={4}
          placeholder={"Paste numbers separated by comma, space or new line\n9955190262, 9955190162\n..."}
          className="w-full rounded-xl border border-black/10 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer px-3 py-2 rounded-lg border border-black/10 hover:bg-slate-50">
            <Paperclip className="w-4 h-4" /> {csvFile ? csvFile.name : "Upload CSV (phone, name)"}
            <input type="file" accept=".csv" className="hidden" onChange={(e) => setCsvFile(e.target.files?.[0] || null)} />
          </label>
          {csvFile && (
            <button onClick={() => setCsvFile(null)} className="text-xs text-red-500 font-medium">Remove CSV</button>
          )}
          <span className="text-xs text-slate-400">~{countRecipients()} entered{csvFile ? " + CSV rows" : ""}</span>
        </div>
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
              disabled={launching || progress?.running || !status.connected}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl bg-brand-blue text-white hover:opacity-90 disabled:opacity-50"
            >
              {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              Launch Campaign
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
