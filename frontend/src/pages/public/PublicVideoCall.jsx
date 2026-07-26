import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Video, VideoOff, Mic, MicOff, PhoneOff, PhoneCall, Bot, Send, Sparkles, MessageSquare } from "lucide-react";
import { toast, Toaster } from "sonner";
import api from "../../lib/api";

export default function PublicVideoCall() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room") || "SDPS-LIVE-ROOM";

  const [callActive, setCallActive] = useState(false);
  const [callMode, setCallMode] = useState("voip"); // "voip" (Voice Call over IP - default) | "video"
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [agentThinking, setAgentThinking] = useState(false);

  const localVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const startLocalMedia = async (mode = callMode) => {
    try {
      const needVideo = mode === "video";
      const stream = await navigator.mediaDevices.getUserMedia({ video: needVideo, audio: true });
      mediaStreamRef.current = stream;
      setCameraEnabled(needVideo);
      if (needVideo && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Camera/Mic access restricted:", err);
      toast.error("Microphone permission required for Voice over IP call.");
    }
  };

  const stopLocalMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
  };

  const speakText = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1.0;
    utterance.rate = 1.0;
    utterance.lang = "en-IN";

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleStartCall = async (modeToStart = callMode) => {
    setCallMode(modeToStart);
    setCallActive(true);
    await startLocalMedia(modeToStart);

    const welcomeMsg = {
      sender: "agent",
      text: "Hey, I am Sal, SDPS AI agent. How can I help you today?",
      action: { type: "navigate", url: "/fee-payment", label: "💳 Direct Fee Payment Portal" },
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages([welcomeMsg]);
    speakText(welcomeMsg.text);
    toast.success(modeToStart === "voip" ? "Connected via Voice Call over IP (VoIP)!" : "Connected via HD Video Call!");
  };

  const handleEndCall = () => {
    stopLocalMedia();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setCallActive(false);
    setIsSpeaking(false);
    toast.info("Support Call ended.");
  };

  const handleSendQuery = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg = {
      sender: "user",
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setAgentThinking(true);

    try {
      let res;
      try {
        res = await api.post("/public/video-support/agent/chat", { prompt: textToSend });
      } catch (e) {
        res = await api.post("/admin/video-support/agent/chat", { prompt: textToSend });
      }
      const reply = res.data?.reply || "Hey, I am Sal, SDPS AI agent. How can I help you today?";
      
      const agentMsg = {
        sender: "agent",
        text: reply,
        action: res.data?.action,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };

      setMessages((prev) => [...prev, agentMsg]);
      speakText(reply);
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to AI support agent.");
    } finally {
      setAgentThinking(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-brand-blue-dark text-slate-800 p-4 flex items-center justify-center relative overflow-hidden">
      <Toaster position="top-right" />
      
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col md:flex-row h-[700px]">
        {/* Left Video Room Screen */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col justify-between relative text-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 z-10">
            <div className="flex items-center gap-3">
              <img src="/assets/img/logo.png" alt="SDPS Patna" className="w-10 h-10 object-contain" />
              <div>
                <h3 className="font-headline font-bold text-sm text-white">SDPS Live Support</h3>
                <span className="text-[10px] text-brand-orange font-mono">ROOM: {roomId}</span>
              </div>
            </div>
            {callActive && (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> {callMode === "voip" ? "VoIP Voice Live" : "HD Video Live"}
              </span>
            )}
          </div>

          {/* Main Video Screen */}
          <div className="flex-1 flex items-center justify-center relative my-4">
            {callActive ? (
              <div className="w-full h-full rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden">
                <div className={`relative w-28 h-28 rounded-full bg-gradient-to-tr from-brand-blue to-brand-orange p-1 shadow-2xl transition-transform ${isSpeaking ? "scale-110" : ""}`}>
                  <img src="/sal-dp.png" alt="Sal AI" className="w-full h-full object-cover object-top rounded-full bg-slate-900" />
                </div>
                <h4 className="mt-3 font-headline font-bold text-white text-base">Sal AI Agent</h4>
                <p className="text-[11px] text-brand-orange font-semibold">SDPS Customer Support Specialist ({callMode.toUpperCase()})</p>

                {/* Local user video PIP */}
                {cameraEnabled && (
                  <div className="absolute bottom-3 right-3 w-28 aspect-video rounded-xl overflow-hidden border border-white/20 shadow-xl bg-black">
                    <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover transform -scale-x-100" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
                  <PhoneCall className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="font-headline font-bold text-lg text-slate-200">Connect SDPS Live Support</h3>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button onClick={() => handleStartCall("voip")} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs px-5 py-3 rounded-xl text-white shadow-lg inline-flex items-center gap-2">
                    <PhoneCall className="w-4 h-4" /> Voice Call over IP (VoIP)
                  </button>
                  <button onClick={() => handleStartCall("video")} className="bg-slate-800 hover:bg-slate-700 font-bold text-xs px-4 py-3 rounded-xl text-slate-300 shadow-md inline-flex items-center gap-2 border border-slate-700">
                    <Video className="w-4 h-4 text-brand-orange" /> HD Video Call
                  </button>
                </div>
              </div>
            )}
          </div>


          {/* Call Controls Toolbar */}
          {callActive && (
            <div className="flex items-center justify-center gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                className={`p-3 rounded-xl ${micEnabled ? "bg-slate-800 text-white" : "bg-red-600 text-white"}`}
              >
                {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setCameraEnabled(!cameraEnabled);
                  if (!cameraEnabled) startLocalMedia();
                  else stopLocalMedia();
                }}
                className={`p-3 rounded-xl ${cameraEnabled ? "bg-slate-800 text-white" : "bg-red-600 text-white"}`}
              >
                {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              </button>
              <button onClick={handleEndCall} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md">
                <PhoneOff className="w-4 h-4" /> Leave Call
              </button>
            </div>
          )}
        </div>

        {/* Right Chat Panel */}
        <div className="w-full md:w-80 bg-white flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200">
          <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-headline font-bold text-xs text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-orange" /> Support Conversation
            </h4>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">Join call to talk with Sal AI.</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[90%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.sender === "user" ? "bg-brand-blue text-white" : "bg-white text-slate-800 border border-slate-200 shadow-xs"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {agentThinking && <div className="text-[11px] text-slate-400">Sal AI is replying...</div>}
          </div>

          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendQuery()}
              placeholder="Ask a question..."
              className="flex-1 text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
            <button onClick={() => handleSendQuery()} className="p-2.5 bg-brand-blue text-white rounded-xl">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
