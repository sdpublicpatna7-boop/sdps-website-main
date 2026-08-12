import React, { useState, useEffect } from "react";
import SEO from "@/components/layout/SEO";
import {
  Mic,
  Radio,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Play,
  StopCircle,
  Sliders,
  Settings,
  Shield,
  Zap,
  Globe
} from "lucide-react";

export function MacWidgetPage() {
  const [broadcasterIp, setBroadcasterIp] = useState(() => {
    return localStorage.getItem("sdps_mac_broadcaster_ip") || "192.168.29.252";
  });
  const [ipInput, setIpInput] = useState(broadcasterIp);
  const [isOnline, setIsOnline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pingMs, setPingMs] = useState(null);
  const [lastActionMsg, setLastActionMsg] = useState(null);

  const [source, setSource] = useState("sMic");
  const [zone, setZone] = useState("1-200");
  const [customRooms, setCustomRooms] = useState("1");
  const [schedule, setSchedule] = useState("0");

  const [isMicActive, setIsMicActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  const getActiveRooms = () => (zone === "custom" ? (customRooms.trim() || "1-200") : zone);

  const getCleanUrl = (ip) => {
    let raw = (ip || "").trim();
    if (!raw) raw = "192.168.29.252";
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return raw.replace(/\/+$/, "");
    }
    return `http://${raw}`.replace(/\/+$/, "");
  };

  const showToast = (msg, isErr = false) => {
    setLastActionMsg({ text: msg, error: isErr });
    setTimeout(() => {
      setLastActionMsg(null);
    }, 3500);
  };

  // Direct LAN Status Ping (No Tunneling)
  const pingLocalIp = async (targetIp) => {
    setChecking(true);
    const baseUrl = getCleanUrl(targetIp);
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      await fetch(`${baseUrl}/`, {
        method: "GET",
        mode: "no-cors",
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const elapsed = Date.now() - start;
      setIsOnline(true);
      setPingMs(elapsed);
    } catch (err) {
      setIsOnline(false);
      setPingMs(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    pingLocalIp(broadcasterIp);
    const interval = setInterval(() => {
      pingLocalIp(broadcasterIp);
    }, 3500);
    return () => clearInterval(interval);
  }, [broadcasterIp]);

  const handleSaveIp = () => {
    const clean = ipInput.trim();
    if (!clean) return;
    setBroadcasterIp(clean);
    localStorage.setItem("sdps_mac_broadcaster_ip", clean);
    showToast(`Broadcaster Local IP updated to ${clean}`);
    pingLocalIp(clean);
  };

  const sendHardwareCommand = async (endpoint, payload) => {
    const baseUrl = getCleanUrl(broadcasterIp);
    const formBody = new URLSearchParams();
    formBody.append("sUser", "admin");
    formBody.append("sPass", "admin");
    for (const [k, v] of Object.entries(payload)) {
      formBody.append(k, v);
    }

    try {
      await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: formBody,
        mode: "no-cors"
      });
      return true;
    } catch (err) {
      showToast(`Command failed: ${err.message}`, true);
      return false;
    }
  };

  // Push-to-Talk Mic Toggle
  const toggleMic = async () => {
    const activeRooms = getActiveRooms();
    if (isMicActive) {
      setIsMicActive(false);
      setMicVolume(0);
      await sendHardwareCommand("/BcastDo", {
        sSource: "sMic",
        sFilename: "1",
        sDest: activeRooms,
        sRooms: activeRooms,
        sAct: "Cancel"
      });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const src = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        src.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateVol = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const pct = Math.min(100, Math.round((sum / dataArray.length / 128) * 100));
          setMicVolume(pct);
        };

        const interval = setInterval(updateVol, 100);
        setIsMicActive(true);

        await sendHardwareCommand("/BcastDo", {
          sSource: "sMic",
          sFilename: "1",
          sDest: activeRooms,
          sRooms: activeRooms,
          sAct: "Connect"
        });

      } catch (err) {
        showToast(`Mic access denied: ${err.message}`, true);
      }
    }
  };

  const handleTriggerChime = async (track, name) => {
    const activeRooms = getActiveRooms();
    showToast(`Playing ${name} on Rooms [${activeRooms}]...`);
    await sendHardwareCommand("/BcastDo", {
      sSource: "sFile",
      sFilename: String(track),
      sDest: activeRooms,
      sRooms: activeRooms,
      sAct: "Connect"
    });
  };

  const handleCancelAll = async () => {
    const activeRooms = getActiveRooms();
    if (isMicActive) setIsMicActive(false);
    await sendHardwareCommand("/BcastDo", {
      sSource: source,
      sFilename: "1",
      sDest: activeRooms,
      sRooms: activeRooms,
      sAct: "Cancel"
    });
    showToast("🛑 ALL BROADCASTS CANCELLED!");
  };

  const handleScheduleChange = async (newSch) => {
    setSchedule(newSch);
    await sendHardwareCommand("/SchCurrMod", { sSchId: newSch });
  };

  const handleSyncTime = async () => {
    const now = new Date();
    await sendHardwareCommand("/RtcMod", {
      iH: String(now.getHours()).padStart(2, "0"),
      iMi: String(now.getMinutes()).padStart(2, "0"),
      iD: String(now.getDate()).padStart(2, "0"),
      iMo: String(now.getMonth() + 1).padStart(2, "0"),
      iY: String(now.getFullYear()),
      chSignTz: "+",
      iHTz: "05",
      iMiTz: "30"
    });
    showToast("⏱️ Hardware Real-Time Clock Synced!");
  };

  return (
    <>
      <SEO title="macOS Desktop Broadcaster Widget | SDPS Patna" />

      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-white">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-2xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden space-y-4 p-5">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <h1 className="font-headline font-bold text-xs uppercase tracking-widest text-slate-400 ml-2 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-500" /> SDPS macOS Widget
              </h1>
            </div>
            
            {/* Direct Status Badge */}
            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border ${
              isOnline
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-400 border-rose-500/30"
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`}></span>
              <span>{checking ? "CHECKING..." : isOnline ? `LAN ONLINE (${pingMs}ms)` : "OFFLINE"}</span>
            </div>
          </div>

          {/* Toast */}
          {lastActionMsg && (
            <div className={`p-2.5 rounded-xl text-xs font-bold text-center border animate-in fade-in slide-in-from-top-2 ${
              lastActionMsg.error
                ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
            }`}>
              {lastActionMsg.text}
            </div>
          )}

          {/* 1. BROADCASTER LOCAL IP SETTINGS */}
          <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/60 space-y-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Broadcaster Local IP (LAN Direct)</span>
              <span className="text-amber-400">No Tunneling</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                placeholder="e.g. 192.168.29.252"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
              />
              <button
                onClick={handleSaveIp}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Save IP
              </button>
            </div>
          </div>

          {/* 2. PUSH TO TALK LIVE MIC BROADCAST */}
          <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/60 text-center space-y-3">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>Push-To-Talk Live Mic</span>
              <span className={isMicActive ? "text-rose-400 font-bold animate-pulse" : "text-emerald-400"}>
                {isMicActive ? "🔴 LIVE BROADCAST" : "Ready"}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button
                onClick={toggleMic}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center gap-1 shadow-2xl transition-all duration-300 cursor-pointer ${
                  isMicActive
                    ? "bg-rose-600 text-white ring-4 ring-rose-500/50 scale-105 animate-pulse"
                    : "bg-gradient-to-br from-blue-600 to-indigo-700 text-white hover:scale-105"
                }`}
              >
                <Mic className="w-7 h-7" />
                <span className="text-[10px] font-black tracking-wider uppercase">
                  {isMicActive ? "STOP" : "SPEAK"}
                </span>
              </button>

              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-75"
                  style={{ width: `${micVolume}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 3. EMERGENCY CANCEL ALL */}
          <button
            onClick={handleCancelAll}
            className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg border border-rose-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel All Broadcasts</span>
          </button>

          {/* 4. INSTANT BELL CHIMES */}
          <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/60 space-y-2.5">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Instant Bell Chimes (1-Click)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "1", name: "Assembly Bell", icon: "🔔" },
                { id: "2", name: "Period Bell", icon: "⏰" },
                { id: "3", name: "Lunch Chime", icon: "🍽️" },
                { id: "4", name: "Dispersal Bell", icon: "🎓" },
                { id: "5", name: "Emergency Siren", icon: "🚨" },
                { id: "6", name: "National Anthem", icon: "🇮🇳" },
              ].map((chime) => (
                <button
                  key={chime.id}
                  onClick={() => handleTriggerChime(chime.id, chime.name)}
                  className="p-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-left flex items-center gap-2 text-xs font-bold text-slate-200 transition-all cursor-pointer"
                >
                  <span className="text-base">{chime.icon}</span>
                  <span className="truncate">{chime.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 5. ZONES & SOURCE SELECTOR */}
          <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/60 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Zone & Audio Source
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              >
                <option value="sMic">🎙️ Live Mic (sMic)</option>
                <option value="sFile">📻 Track File (sFile)</option>
                <option value="sAux">🔌 Line-In Aux (sAux)</option>
              </select>

              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              >
                <option value="1-200">🏫 All Rooms (1-200)</option>
                <option value="1-50">👶 Primary (1-50)</option>
                <option value="51-120">🎓 Senior (51-120)</option>
                <option value="121-150">⚽ Playground (121-150)</option>
                <option value="151-200">🏢 Admin (151-200)</option>
                <option value="custom">✏️ Custom Room...</option>
              </select>
            </div>

            {zone === "custom" && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customRooms}
                  onChange={(e) => setCustomRooms(e.target.value)}
                  placeholder="Enter room(s) e.g. 5, 12-25, 101"
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-xs font-bold text-amber-300 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono shadow-inner"
                />
              </div>
            )}
          </div>

          {/* 6. BELL SCHEDULE & TIME SYNC */}
          <div className="bg-slate-800/50 rounded-2xl p-3.5 border border-slate-700/60 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Schedule Profile & Hardware Clock
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={schedule}
                onChange={(e) => handleScheduleChange(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none"
              >
                <option value="0">☀️ Summer Bell Schedule</option>
                <option value="1">❄️ Winter Bell Schedule</option>
                <option value="2">📝 Exam Schedule</option>
                <option value="4">🔴 Bells Off</option>
              </select>

              <button
                onClick={handleSyncTime}
                className="py-2 px-3 bg-slate-950 hover:bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-amber-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Sync Time</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default MacWidgetPage;
