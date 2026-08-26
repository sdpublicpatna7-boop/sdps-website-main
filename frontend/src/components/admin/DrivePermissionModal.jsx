import { useState } from "react";
import {
  X, AlertTriangle, CheckCircle2, Lock, ExternalLink,
  RefreshCw, Copy, ShieldAlert, Sparkles, Check, HelpCircle, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { checkDrivePermission } from "@/lib/driveCheck";

export default function DrivePermissionModal({
  isOpen,
  onClose,
  url,
  onUpdateUrl,
  checkResult,
  onProceedAnyway,
}) {
  const [checking, setChecking] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url || "");
  const [result, setResult] = useState(checkResult || null);
  const [copiedStep, setCopiedStep] = useState(false);

  if (!isOpen) return null;

  const isRestricted = result && result.is_public === false;
  const isPublic = result && result.is_public === true;

  const handleRecheck = async (targetUrl = currentUrl) => {
    if (!targetUrl.trim()) return;
    setChecking(true);
    try {
      const res = await checkDrivePermission(targetUrl);
      setResult(res);
      if (res?.is_public) {
        toast.success("Great! Your Drive link is now public and accessible.");
        if (onUpdateUrl && targetUrl !== url) {
          onUpdateUrl(targetUrl);
        }
      } else {
        toast.error("Link is still restricted. Please check Google Drive permissions.");
      }
    } catch (e) {
      toast.error("Failed to check permission");
    } finally {
      setChecking(false);
    }
  };

  const handleApplyNewLink = () => {
    if (!currentUrl.trim()) return;
    if (onUpdateUrl) {
      onUpdateUrl(currentUrl.trim());
    }
    handleRecheck(currentUrl.trim());
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className={`px-6 py-4.5 text-white flex items-center justify-between shrink-0 border-b border-white/10 ${
          isPublic
            ? "bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900"
            : "bg-gradient-to-r from-amber-950 via-rose-950 to-slate-950"
        }`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner ${
              isPublic
                ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                : "bg-rose-500/20 border-rose-400/30 text-rose-300 animate-pulse"
            }`}>
              {isPublic ? <CheckCircle2 className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                {isPublic
                  ? "Google Drive Link Verified (Public)"
                  : "Google Drive Access is Restricted!"}
              </h2>
              <p className="text-xs font-semibold text-slate-300">
                {isPublic
                  ? "Anyone with the link can view and download this file"
                  : "Students & parents will be blocked unless permissions are updated"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 bg-slate-50/70 text-slate-800">
          
          {/* Warning / Status Card */}
          <div className={`p-4.5 rounded-2xl border ${
            isPublic
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
              : "bg-rose-50/90 border-rose-200 text-rose-900"
          }`}>
            <div className="flex items-start gap-3">
              {isPublic ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <div className="font-extrabold text-sm">
                  {isPublic
                    ? "✓ Link is 100% Accessible to Students & Public"
                    : "⚠️ Students & Parents cannot open this link!"}
                </div>
                <p className="leading-relaxed opacity-90">
                  {isPublic
                    ? "Our verification test confirms that unauthenticated users can successfully open and download this document without any login requirement."
                    : "When students or parents click this link, Google Drive will show a 'You need access' or 'Request access' screen, preventing them from doing their homework or viewing notices."}
                </p>
                {!isPublic && (
                  <p className="leading-relaxed font-semibold text-rose-800 pt-0.5">
                    (यह लिंक प्राइवेट है। स्टूडेंट्स या पेरेंट्स इसे नहीं खोल पाएंगे।)
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Current URL Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
              Checked Link
            </label>
            <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="font-mono text-xs font-semibold text-slate-700 truncate select-all flex-1">
                {currentUrl || url}
              </span>
              <a
                href={currentUrl || url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shrink-0"
              >
                Open in Drive <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* How to Fix Step-by-Step Interactive Guide */}
          {!isPublic && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                  How to make this Drive link Public (3 Simple Steps)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Step 1 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    1
                  </div>
                  <div className="text-xs font-bold text-slate-900">Click "Share"</div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Open your file in Drive and click the blue <strong>"Share" (शेयर)</strong> button at the top-right.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    2
                  </div>
                  <div className="text-xs font-bold text-slate-900">General Access</div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Change from <strong>"Restricted"</strong> to <strong>"Anyone with the link" (कोई भी व्यक्ति)</strong>.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    3
                  </div>
                  <div className="text-xs font-bold text-slate-900">Copy & Re-Check</div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Click <strong>"Copy link"</strong>, paste it below, and click <strong>Re-Verify</strong>.
                  </p>
                </div>
              </div>

              {/* Paste Updated Link Box */}
              <div className="pt-2 space-y-2">
                <label className="text-xs font-bold text-slate-600 block">
                  Paste Updated Public Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={currentUrl}
                    onChange={(e) => setCurrentUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:border-blue-600 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyNewLink}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-100/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {!isPublic && onProceedAnyway && (
              <button
                type="button"
                onClick={() => {
                  onProceedAnyway();
                  onClose();
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
              >
                I'll fix it later (Keep link anyway)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleRecheck(currentUrl)}
              disabled={checking}
              className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking Live..." : "Re-Verify Permission 🔄"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (isPublic && onUpdateUrl && currentUrl) {
                  onUpdateUrl(currentUrl);
                }
                onClose();
              }}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition cursor-pointer"
            >
              {isPublic ? "Done / Use Link" : "Close"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
