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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
          <CalendarClock className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Results Publish Scheduler</h1>
          <p className="text-sm text-slate-500">Schedule when election results become publicly visible</p>
        </div>
      </div>

      {/* Current Status Card */}
      <div className={`rounded-2xl border-2 p-6 ${
        isPublished
          ? "bg-emerald-50 border-emerald-200"
          : isPending
          ? "bg-amber-50 border-amber-200"
          : "bg-slate-50 border-slate-200"
      }`}>
        <div className="flex items-center gap-3 mb-3">
          {isPublished ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          ) : isPending ? (
            <Clock className="w-6 h-6 text-amber-600 animate-pulse" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-slate-400" />
          )}
          <span className={`text-lg font-bold ${
            isPublished ? "text-emerald-700" : isPending ? "text-amber-700" : "text-slate-500"
          }`}>
            {isPublished
              ? "Results are LIVE"
              : isPending
              ? "Results Scheduled"
              : "Results Sealed"}
          </span>
        </div>

        {isPublished && (
          <p className="text-emerald-600 text-sm">
            Published since {scheduledDate.toLocaleString()}
          </p>
        )}

        {isPending && (
          <div>
            <p className="text-amber-600 text-sm mb-4">
              Scheduled for: <strong>{scheduledDate.toLocaleString()}</strong>
            </p>
            <div className="flex items-center gap-4">
              <div className="bg-white rounded-xl border border-amber-200 px-5 py-3 text-center shadow-sm">
                <div className="text-3xl font-black text-amber-700 tabular-nums">{String(hours).padStart(2, "0")}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mt-0.5">Hours</div>
              </div>
              <span className="text-2xl font-black text-amber-400">:</span>
              <div className="bg-white rounded-xl border border-amber-200 px-5 py-3 text-center shadow-sm">
                <div className="text-3xl font-black text-amber-700 tabular-nums">{String(minutes).padStart(2, "0")}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mt-0.5">Minutes</div>
              </div>
              <span className="text-2xl font-black text-amber-400">:</span>
              <div className="bg-white rounded-xl border border-amber-200 px-5 py-3 text-center shadow-sm">
                <div className="text-3xl font-black text-amber-700 tabular-nums">{String(seconds).padStart(2, "0")}</div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-amber-500 mt-0.5">Seconds</div>
              </div>
            </div>
          </div>
        )}

        {!currentSchedule && (
          <p className="text-slate-400 text-sm">No publication schedule has been set. Results are hidden from the public.</p>
        )}
      </div>

      {/* Schedule Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-violet-500" />
          Set Publication Time
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Date & Time</label>
          <input
            type="datetime-local"
            value={publishTime}
            onChange={(e) => setPublishTime(e.target.value)}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-slate-50 font-medium"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSchedule}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-violet-700 hover:to-purple-700 transition-all shadow-md disabled:opacity-50"
          >
            <CalendarClock className="w-4 h-4" />
            {saving ? "Saving..." : "Schedule Release"}
          </button>

          <button
            onClick={handlePublishNow}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50"
          >
            <Rocket className="w-4 h-4" />
            Publish Now
          </button>

          {currentSchedule && (
            <button
              onClick={handleClear}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold text-sm hover:bg-red-50 transition-all disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Clear Schedule
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
