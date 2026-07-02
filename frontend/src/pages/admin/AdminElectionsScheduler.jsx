import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Clock, CalendarClock, Rocket, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "../../lib/api";

export default function AdminElectionsScheduler() {
  const [publishTime, setPublishTime] = useState("");
  const [currentSchedule, setCurrentSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/elections/settings");
      const val = data?.results_publish_time || "";
      setCurrentSchedule(val || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!publishTime) {
      toast.error("Please select a date and time.");
      return;
    }
    setSaving(true);
    try {
      const isoTime = new Date(publishTime).toISOString();
      await api.post("/elections/settings/results_publish_time", { value: isoTime });
      setCurrentSchedule(isoTime);
      toast.success("Results publication scheduled!");
    } catch (e) {
      toast.error("Failed to schedule publication.");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = async () => {
    if (!confirm("Publish results immediately? This will make results visible to the public right now.")) return;
    setSaving(true);
    try {
      const isoTime = new Date().toISOString();
      await api.post("/elections/settings/results_publish_time", { value: isoTime });
      setCurrentSchedule(isoTime);
      toast.success("Results are now LIVE!");
    } catch (e) {
      toast.error("Failed to publish results.");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear the schedule? Results will become hidden from the public.")) return;
    setSaving(true);
    try {
      await api.post("/elections/settings/results_publish_time", { value: "" });
      setCurrentSchedule(null);
      setPublishTime("");
      toast.success("Schedule cleared. Results are now sealed.");
    } catch (e) {
      toast.error("Failed to clear schedule.");
    } finally {
      setSaving(false);
    }
  };

  const scheduledDate = currentSchedule ? new Date(currentSchedule) : null;
  const isPublished = scheduledDate && scheduledDate <= now;
  const isPending = scheduledDate && scheduledDate > now;
  const remaining = isPending ? Math.max(0, Math.floor((scheduledDate - now) / 1000)) : 0;
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-650 flex items-center justify-center shadow-lg shadow-violet-500/15 transform hover:rotate-6 transition-transform duration-300 shrink-0">
            <CalendarClock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Results Publish Scheduler</h1>
            <p className="text-sm font-semibold text-slate-500">Configure exact dates and times for election results release</p>
          </div>
        </div>
      </div>

      {/* Current Status Card */}
      <div className={`rounded-3xl border-2 p-6.5 shadow-sm transition-all duration-300 animate-in slide-in-from-bottom-4 duration-300 ${
        isPublished
          ? "bg-emerald-50/50 border-emerald-200/60"
          : isPending
          ? "bg-amber-50/50 border-amber-200/60"
          : "bg-slate-50 border-slate-200/60"
      }`}>
        <div className="flex items-center gap-3 mb-3.5">
          {isPublished ? (
            <CheckCircle2 className="w-6.5 h-6.5 text-emerald-600" />
          ) : isPending ? (
            <Clock className="w-6.5 h-6.5 text-amber-600 animate-pulse" />
          ) : (
            <AlertTriangle className="w-6.5 h-6.5 text-slate-400" />
          )}
          <span className={`text-lg font-black tracking-tight ${
            isPublished ? "text-emerald-800" : isPending ? "text-amber-800" : "text-slate-500"
          }`}>
            {isPublished
              ? "Results are LIVE"
              : isPending
              ? "Results Scheduled"
              : "Results Sealed"}
          </span>
        </div>

        {isPublished && (
          <p className="text-emerald-700 font-semibold text-sm">
            Published since {scheduledDate.toLocaleString()}
          </p>
        )}

        {isPending && (
          <div className="space-y-4">
            <p className="text-amber-700 font-semibold text-sm">
              Scheduled for: <strong className="font-bold text-slate-800">{scheduledDate.toLocaleString()}</strong>
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-2xl border border-amber-200 px-5 py-3.5 text-center shadow-sm min-w-[80px]">
                <div className="text-3xl font-black text-amber-700 tabular-nums leading-none">{String(hours).padStart(2, "0")}</div>
                <div className="text-[9px] uppercase tracking-widest font-extrabold text-amber-500 mt-1.5">Hours</div>
              </div>
              <span className="text-2xl font-black text-amber-400">:</span>
              <div className="bg-white rounded-2xl border border-amber-200 px-5 py-3.5 text-center shadow-sm min-w-[80px]">
                <div className="text-3xl font-black text-amber-700 tabular-nums leading-none">{String(minutes).padStart(2, "0")}</div>
                <div className="text-[9px] uppercase tracking-widest font-extrabold text-amber-500 mt-1.5">Minutes</div>
              </div>
              <span className="text-2xl font-black text-amber-400">:</span>
              <div className="bg-white rounded-2xl border border-amber-200 px-5 py-3.5 text-center shadow-sm min-w-[80px]">
                <div className="text-3xl font-black text-amber-700 tabular-nums leading-none">{String(seconds).padStart(2, "0")}</div>
                <div className="text-[9px] uppercase tracking-widest font-extrabold text-amber-500 mt-1.5">Seconds</div>
              </div>
            </div>
          </div>
        )}

        {!currentSchedule && (
          <p className="text-slate-500 font-semibold text-sm">No publication schedule has been set. Results are hidden from the public.</p>
        )}
      </div>

      {/* Schedule Form */}
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6.5 space-y-5 animate-in slide-in-from-bottom-4 duration-300">
        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-violet-600" />
          Set Publication Time
        </h2>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Date & Time</label>
          <input
            type="datetime-local"
            value={publishTime}
            onChange={(e) => setPublishTime(e.target.value)}
            className="w-full px-4 py-3.5 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/15 focus:border-violet-500 bg-slate-50/50 hover:bg-slate-50 focus:bg-white transition-all font-semibold text-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]"
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleSchedule}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-md shadow-violet-500/10 hover:from-violet-700 hover:to-purple-700 transform hover:scale-[1.01] active:scale-99 transition-all disabled:opacity-50 shrink-0"
          >
            <CalendarClock className="w-4.5 h-4.5" />
            {saving ? "Saving..." : "Schedule Release"}
          </button>

          <button
            onClick={handlePublishNow}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-500/10 hover:from-emerald-600 hover:to-teal-700 transform hover:scale-[1.01] active:scale-99 transition-all disabled:opacity-50 shrink-0"
          >
            <Rocket className="w-4.5 h-4.5" />
            Publish Now
          </button>

          {currentSchedule && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3.5 bg-white border border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50/80 active:scale-95 transition-all disabled:opacity-50 shrink-0"
            >
              <Trash2 className="w-4.5 h-4.5" />
              Clear Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
