import React, { useState, useEffect } from "react";
import { 
  Radio, 
  Volume2, 
  VolumeX, 
  Clock, 
  Calendar, 
  ShieldAlert, 
  Wifi, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Mic, 
  FileAudio, 
  Sliders, 
  Save, 
  Play, 
  StopCircle, 
  Layers, 
  Settings,
  Bell,
  Lock,
  User,
  LogOut,
  ShieldCheck
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../../lib/auth";
import SEO from "../../components/layout/SEO";

export default function AdminAudioBroadcast() {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [authError, setAuthError] = useState(null);
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [deviceIp, setDeviceIp] = useState("192.168.29.71");
  const [deviceStatus, setDeviceStatus] = useState({ online: false, checking: true, error: null });
  const [activeTab, setActiveTab] = useState("broadcast");

  // Broadcast Form State
  const [source, setSource] = useState("sMic"); // sMic, sFile, sAux
  const [fileNumber, setFileNumber] = useState("1");
  const [destSelect, setDestSelect] = useState("1-200");
  const [roomsInput, setRoomsInput] = useState("1");
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [lastActionMsg, setLastActionMsg] = useState(null);

  // Schedule State
  const [currentSchId, setCurrentSchId] = useState("0"); // 0=Summer, 1=Winter, etc.
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Clock State
  const [clockLoading, setClockLoading] = useState(false);

  // Ping Audislave Device Status
  const pingDevice = (ipToPing = deviceIp) => {
    setDeviceStatus(prev => ({ ...prev, checking: true, error: null }));
    api.get(`/admin/audio/status?ip=${encodeURIComponent(ipToPing)}`)
      .then(res => {
        setDeviceStatus({
          online: res.data?.online || false,
          checking: false,
          error: res.data?.error || null
        });
      })
      .catch(err => {
        setDeviceStatus({
          online: false,
          checking: false,
          error: err.response?.data?.detail || err.message
        });
      });
  };

  useEffect(() => {
    pingDevice(deviceIp);
  }, []);

  // Handle Broadcast Actions (connect, cancel, listen, localspk)
  const handleBroadcastAction = (action) => {
    setBroadcastLoading(true);
    setLastActionMsg(null);
    api.post("/admin/audio/broadcast", {
      ip: deviceIp,
      sSource: source,
      sFilename: fileNumber,
      sDest: destSelect,
      sRooms: roomsInput,
      sAct: action
    })
      .then(res => {
        setLastActionMsg({ type: "success", text: `Command '${action.toUpperCase()}' sent successfully to ${roomsInput}!` });
      })
      .catch(err => {
        setLastActionMsg({ type: "error", text: err.response?.data?.detail || "Failed to connect to Audislave device." });
      })
      .finally(() => setBroadcastLoading(false));
  };

  // Switch Active Bell Schedule Profile
  const handleSetSchedule = (schId) => {
    setScheduleLoading(true);
    api.post("/admin/audio/schedule/set", { ip: deviceIp, sSchId: schId })
      .then(() => {
        setCurrentSchId(schId);
        setLastActionMsg({ type: "success", text: "Bell schedule profile updated successfully!" });
      })
      .catch(err => {
        setLastActionMsg({ type: "error", text: err.response?.data?.detail || "Failed to update bell schedule." });
      })
      .finally(() => setScheduleLoading(false));
  };

  // Sync Real-time clock with PC Time
  const handleSyncClock = () => {
    setClockLoading(true);
    const now = new Date();
    const payload = {
      ip: deviceIp,
      iH: String(now.getHours()),
      iMi: String(now.getMinutes()),
      iD: String(now.getDate()),
      iMo: String(now.getMonth() + 1),
      iY: String(now.getFullYear()).slice(-2),
      chSignTz: "+",
      iHTz: "05",
      iMiTz: "30"
    };

    api.post("/admin/audio/rtc", payload)
      .then(() => {
        setLastActionMsg({ type: "success", text: "Audislave system clock synced with computer time!" });
      })
      .catch(err => {
        setLastActionMsg({ type: "error", text: err.response?.data?.detail || "Failed to sync system clock." });
      })
      .finally(() => setClockLoading(false));
  };

  const appendRoomDigit = (digit) => {
    setRoomsInput(prev => {
      if (prev === "0") return String(digit);
      return prev + String(digit);
    });
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSubmitting(true);
    login(loginEmail, loginPass)
      .catch(err => {
        setAuthError(err.response?.data?.detail || "Invalid credentials. Please enter your SDPS admin username & password.");
      })
      .finally(() => setAuthSubmitting(false));
  };

  const SCHEDULE_OPTIONS = [
    { id: "0", label: "Summer Schedule" },
    { id: "1", label: "Winter Schedule" },
    { id: "2", label: "Test Schedule" },
    { id: "3", label: "Exam Schedule" },
    { id: "4", label: "Schedule 1" },
    { id: "5", label: "Schedule 2" },
    { id: "6", label: "Schedule 3" },
    { id: "7", label: "Schedule 4" },
    { id: "8", label: "Schedule 5" },
    { id: "9", label: "Schedule OFF" },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-headline">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-gold" />
          <span>Authenticating SDPS Audio Hub...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <SEO title="Authentication Required | SDPS AudioHive" />
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-brand-navy to-slate-900 flex items-center justify-center p-6 text-slate-900 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20 relative z-10 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-2xl bg-white p-2 flex items-center justify-center mx-auto shadow-lg border border-slate-100/80 mb-2">
                <img src="/logo192.png" alt="S.D. Public School Logo" className="w-full h-full object-contain" />
              </div>
              <div className="overline text-brand-orange text-xs font-bold tracking-widest">S.D. PUBLIC SCHOOL</div>
              <h1 className="font-headline text-3xl font-black text-slate-900 tracking-tight">
                AudioHive
              </h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Sign in with your SDPS Admin credentials to access school speakers & bell schedules.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Admin Username or Email
                </label>
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="admin@sdpublic.org"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold px-4 py-3 rounded-xl focus:outline-none focus:border-brand-navy text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" /> Password
                </label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={e => setLoginPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold px-4 py-3 rounded-xl focus:outline-none focus:border-brand-navy text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-navy to-brand-blue text-white font-headline font-bold text-sm shadow-lg shadow-brand-navy/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {authSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-brand-gold" /> Unlock AudioHive
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </>
    );
  }

  const hasAudioPermission = 
    user && (
      user.role === "superadmin" ||
      user.permissions?.includes("audio-broadcast") ||
      user.permissions?.includes("media-tools") ||
      user.permissions?.includes("site-settings")
    );

  if (user && !hasAudioPermission) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white font-headline">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Access Restricted</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your account ({user.name || user.username || user.email}) does not have permission to access SDPS AudioHive. Please contact a Superadmin to grant the <code className="text-brand-gold bg-black/40 px-1.5 py-0.5 rounded font-mono">audio-broadcast</code> module permission.
          </p>
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 mt-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Smart Audio & Bell Command Hub | SDPS Admin" />

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-brand-navy via-brand-blue to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-brand-gold text-xs font-bold uppercase tracking-wider">
                  <Radio className="w-4 h-4 animate-pulse text-amber-400" /> SDPS AudioHive Command
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-white text-xs font-bold transition-all border border-white/10"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out ({user?.name || user?.email || "Admin"})
                </button>
              </div>
              <h1 className="font-headline text-3xl md:text-4xl font-black tracking-tight text-white">
                AudioHive Command Center
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-xl">
                Manage live school broadcasts, automated period bells, room zones, and emergency announcements across S.D. Public School.
              </p>
            </div>

            {/* Hardware Status Pill */}
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 min-w-[260px] space-y-2 shadow-inner">
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-300">Audislave Device IP</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={deviceIp}
                  onChange={e => setDeviceIp(e.target.value)}
                  className="bg-black/30 text-white font-mono text-sm px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:border-brand-gold w-36"
                />
                <button
                  onClick={() => pingDevice(deviceIp)}
                  disabled={deviceStatus.checking}
                  className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                  title="Ping Connection"
                >
                  <RefreshCw className={`w-4 h-4 ${deviceStatus.checking ? "animate-spin" : ""}`} />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-white/10">
                {deviceStatus.checking ? (
                  <span className="text-xs text-amber-300 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking connection...
                  </span>
                ) : deviceStatus.online ? (
                  <span className="text-xs text-emerald-400 font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/20" /> Device Online (Connected)
                  </span>
                ) : (
                  <span className="text-xs text-rose-400 font-extrabold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-400" /> Unreachable on LAN
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Status Feedback */}
        {lastActionMsg && (
          <div className={`p-4 rounded-2xl border text-sm font-semibold flex items-center justify-between ${
            lastActionMsg.type === "success" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            <div className="flex items-center gap-2">
              {lastActionMsg.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-rose-600" />}
              {lastActionMsg.text}
            </div>
            <button onClick={() => setLastActionMsg(null)} className="text-xs opacity-60 hover:opacity-100">Dismiss</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {[
            { id: "broadcast", label: "Live Broadcast & PA", icon: Mic },
            { id: "groups", label: "Broadcast Groups", icon: Layers },
            { id: "schedule", label: "Bell Schedule Timings", icon: Calendar },
            { id: "clock", label: "Real-Time Clock", icon: Clock },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-headline font-semibold text-sm transition-all duration-200 ${
                activeTab === t.id
                  ? "bg-brand-navy text-white shadow-md shadow-brand-navy/20 scale-[1.02]"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: LIVE BROADCAST & PA ── */}
        {activeTab === "broadcast" && (
          <div className="grid md:grid-cols-12 gap-6">
            {/* Left Control Column */}
            <div className="md:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
              <h2 className="font-headline text-lg font-bold text-slate-800 flex items-center gap-2">
                <Mic className="w-5 h-5 text-brand-navy" /> Public Address Source & Rooms
              </h2>

              {/* Source Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audio Source</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "sMic", label: "Microphone", icon: Mic },
                    { id: "sFile", label: "Audio File", icon: FileAudio },
                    { id: "sAux", label: "AUX / External", icon: Volume2 },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSource(s.id)}
                      className={`p-3.5 rounded-2xl border text-center font-bold text-xs flex flex-col items-center gap-2 transition-all ${
                        source === s.id
                          ? "bg-blue-50 border-brand-navy text-brand-navy ring-2 ring-brand-navy/20 shadow-sm"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <s.icon className="w-5 h-5" />
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* File Select (if sFile) */}
              {source === "sFile" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Pre-recorded File (1-100)</label>
                  <select
                    value={fileNumber}
                    onChange={e => setFileNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl p-3 font-semibold text-sm focus:outline-none focus:border-brand-navy"
                  >
                    {Array.from({ length: 100 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>Chime / Announcement Track {n < 10 ? `0${n}` : n}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Rooms Input */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Rooms / Zones</label>
                  <span className="text-[11px] text-slate-400">e.g. 1-200, 1,2,5</span>
                </div>
                <input
                  type="text"
                  value={roomsInput}
                  onChange={e => setRoomsInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-mono text-lg font-bold px-4 py-3 rounded-xl focus:outline-none focus:border-brand-navy"
                  placeholder="1 or 1-200"
                />
              </div>

              {/* Keypad & Quick Buttons */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRoomsInput("1-200")}
                    className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors"
                  >
                    📢 All Rooms (1-200)
                  </button>
                  <button
                    onClick={() => setRoomsInput("")}
                    className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    Clear
                  </button>
                </div>

                {/* Keypad numbers */}
                <div className="grid grid-cols-5 gap-2 pt-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                    <button
                      key={n}
                      onClick={() => appendRoomDigit(n)}
                      className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-headline font-bold rounded-xl text-center text-sm shadow-sm transition-colors"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleBroadcastAction("connect")}
                  disabled={broadcastLoading}
                  className="p-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-headline font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
                >
                  <Play className="w-5 h-5 fill-white" /> Connect Broadcast
                </button>

                <button
                  onClick={() => handleBroadcastAction("cancel")}
                  disabled={broadcastLoading}
                  className="p-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-headline font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all hover:scale-[1.01]"
                >
                  <StopCircle className="w-5 h-5" /> Cancel / Stop
                </button>

                <button
                  onClick={() => handleBroadcastAction("listen")}
                  disabled={broadcastLoading}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Volume2 className="w-4 h-4" /> Listen Stream
                </button>

                <button
                  onClick={() => handleBroadcastAction("localspk")}
                  disabled={broadcastLoading}
                  className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Sliders className="w-4 h-4" /> Local Speaker
                </button>
              </div>
            </div>

            {/* Right Quick Presets Column */}
            <div className="md:col-span-5 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
                <h3 className="font-headline text-base font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" /> Instant Preset Announcements
                </h3>
                <p className="text-xs text-slate-500">One-tap action buttons for frequent school events.</p>

                <div className="space-y-3">
                  <button
                    onClick={() => { setRoomsInput("1-200"); setSource("sFile"); setFileNumber("1"); handleBroadcastAction("connect"); }}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-sm flex items-center justify-between shadow-md hover:brightness-105 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-amber-100 animate-bounce" />
                      <div className="text-left">
                        <div>Morning Assembly Call</div>
                        <div className="text-[10px] text-amber-100 font-normal">Plays Track 01 to All Rooms</div>
                      </div>
                    </div>
                    <Play className="w-4 h-4 fill-white" />
                  </button>

                  <button
                    onClick={() => { setRoomsInput("1-200"); setSource("sFile"); setFileNumber("2"); handleBroadcastAction("connect"); }}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold text-sm flex items-center justify-between shadow-md hover:brightness-105 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-blue-200" />
                      <div className="text-left">
                        <div>Recess / Lunch Chime</div>
                        <div className="text-[10px] text-blue-200 font-normal">Plays Recess Bell Track 02</div>
                      </div>
                    </div>
                    <Play className="w-4 h-4 fill-white" />
                  </button>

                  <button
                    onClick={() => { setRoomsInput("1-200"); setSource("sMic"); handleBroadcastAction("connect"); }}
                    className="w-full p-4 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 text-white font-bold text-sm flex items-center justify-between shadow-md hover:brightness-105 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Mic className="w-5 h-5 text-amber-400 animate-pulse" />
                      <div className="text-left">
                        <div>Live Principal Broadcast</div>
                        <div className="text-[10px] text-slate-300 font-normal">Opens Live Microphone Stream</div>
                      </div>
                    </div>
                    <Play className="w-4 h-4 fill-white" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: BROADCAST GROUPS ── */}
        {activeTab === "groups" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <h2 className="font-headline text-lg font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-navy" /> Room Zones & Wing Groups
            </h2>

            <div className="grid md:grid-cols-3 gap-4">
              {[
                { name: "Primary Wing", start: "1", end: "10", desc: "Rooms 1 to 10" },
                { name: "Middle Wing", start: "11", end: "25", desc: "Rooms 11 to 25" },
                { name: "Senior Secondary", start: "26", end: "45", desc: "Rooms 26 to 45" },
                { name: "Staff Rooms & Admin", start: "46", end: "55", desc: "Rooms 46 to 55" },
                { name: "Auditorium & Lawn", start: "56", end: "65", desc: "Rooms 56 to 65" },
                { name: "All School Rooms", start: "1", end: "200", desc: "Rooms 1 to 200" },
              ].map((g, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="font-headline font-bold text-base text-slate-900">{g.name}</div>
                  <div className="text-xs text-slate-500">{g.desc}</div>
                  <button
                    onClick={() => {
                      setRoomsInput(`${g.start}-${g.end}`);
                      setActiveTab("broadcast");
                    }}
                    className="w-full py-2 bg-brand-navy text-white text-xs font-bold rounded-xl hover:bg-brand-blue transition-colors flex items-center justify-center gap-1.5"
                  >
                    Select Group ({g.start}-{g.end})
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 3: BELL SCHEDULE ── */}
        {activeTab === "schedule" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-headline text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-navy" /> Active Bell Schedule Profile
                </h2>
                <p className="text-xs text-slate-500">Switch between Summer, Winter, Exam, and Test schedules.</p>
              </div>
            </div>

            {/* Schedule Selector Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {SCHEDULE_OPTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleSetSchedule(s.id)}
                  disabled={scheduleLoading}
                  className={`p-4 rounded-2xl border text-center font-bold text-xs transition-all ${
                    currentSchId === s.id
                      ? "bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-400/30 shadow-sm"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Clock className="w-4 h-4 mx-auto mb-2 text-amber-600" />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: REAL-TIME CLOCK ── */}
        {activeTab === "clock" && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm max-w-xl space-y-6">
            <h2 className="font-headline text-lg font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-navy" /> Audislave Real-Time Clock Sync
            </h2>
            <p className="text-xs text-slate-500">Ensure period bells ring accurately by syncing hardware time with your local PC.</p>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Current PC Time</div>
              <div className="font-mono text-4xl font-black text-slate-900">
                {new Date().toLocaleTimeString()}
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>

              <button
                onClick={handleSyncClock}
                disabled={clockLoading}
                className="w-full py-3.5 px-6 rounded-xl bg-brand-navy hover:bg-brand-blue text-white font-headline font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${clockLoading ? "animate-spin" : ""}`} />
                Sync Audislave Clock Now
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
