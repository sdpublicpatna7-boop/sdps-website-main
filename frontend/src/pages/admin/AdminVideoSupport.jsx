import { useState, useEffect, useRef } from "react";
import { 
  Video, VideoOff, Mic, MicOff, Volume2, Send, PhoneOff, PhoneCall, 
  Settings, Users, Sparkles, Copy, Check, ExternalLink, RefreshCw, 
  Share2, Shield, Play, Pause, Bot, MessageSquare, Plus, Trash2, Award, Clock
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";

export default function AdminVideoSupport() {
  const [activeTab, setActiveTab] = useState("agent"); // "agent" | "rooms" | "settings"
  const [config, setConfig] = useState({
    videosdk_api_key: "",
    videosdk_secret: "",
    agent_name: "Sal AI",
    agent_title: "SDPS Live Video Support Specialist",
    welcome_speech: "Welcome to S.D. Public School Live Video Support! I am Sal, your AI support specialist. How can I assist you with admissions or fees today?",
    voice_pitch: 1.0,
    voice_rate: 1.0,
    voice_lang: "en-IN",
    auto_agent_enabled: true
  });
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Live Agent Call State
  const [callActive, setCallActive] = useState(false);
  const [callMode, setCallMode] = useState("voip"); // "voip" (Voice over IP - default) | "video"
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [agentThinking, setAgentThinking] = useState(false);

  // Video SDK Rooms State
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newPurpose, setNewPurpose] = useState("Admission Enquiry");
  const [copiedRoomId, setCopiedRoomId] = useState(null);

  // Local media stream for camera/mic preview
  const localVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);

  // Load config & rooms
  useEffect(() => {
    fetchConfig();
    fetchRooms();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await api.get("/admin/video-support/config");
      if (res.data) {
        setConfig((prev) => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await api.get("/admin/video-support/rooms");
      setRooms(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRooms(false);
    }
  };

  // Start / Stop Local Media Stream (Voice over IP or Video)
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
      console.warn("Media devices access warning:", err);
      toast.error("Microphone/Camera permission required for Voice over IP.");
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

  // Speak response using SpeechSynthesis API
  const speakText = (text) => {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = config.voice_pitch || 1.0;
    utterance.rate = config.voice_rate || 1.0;
    utterance.lang = config.voice_lang || "en-IN";

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // Start Live Support Call Session (Voice Call over IP First)
  const handleStartCall = async (modeToStart = callMode) => {
    setCallMode(modeToStart);
    setCallActive(true);
    await startLocalMedia(modeToStart);

    const welcomeMsg = {
      sender: "agent",
      text: config.welcome_speech || "Hey, I am Sal, SDPS AI agent. How can I help you today?",
      action: { type: "navigate", url: "/fee-payment", label: "💳 Direct Fee Payment Portal" },
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages([welcomeMsg]);
    speakText(welcomeMsg.text);
    toast.success(modeToStart === "voip" ? "Voice Call over IP (VoIP) Connected!" : "HD Video Support Call Connected!");
  };



  // End Video Call Session
  const handleEndCall = () => {
    stopLocalMedia();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setCallActive(false);
    setIsSpeaking(false);
    toast.info("Video Support Call Session Ended.");
  };

  // Send Query to Video Support Agent
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
      const res = await api.post("/admin/video-support/agent/chat", { prompt: textToSend });
      const reply = res.data?.reply || "I am available to assist you with any SDPS admissions or school inquiries.";
      
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
      toast.error("Error fetching AI response.");
    } finally {
      setAgentThinking(false);
    }
  };

  // Web Speech Recognition for voice input
  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Speech Recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Listening... Speak your support question.");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputQuery(transcript);
      handleSendQuery(transcript);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  // Create Video SDK Support Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/admin/video-support/rooms", {
        client_name: newClientName || "Parent / Student",
        client_phone: newClientPhone,
        purpose: newPurpose
      });
      toast.success(`Video Support Room Created! ID: ${res.data.room_id}`);
      setNewClientName("");
      setNewClientPhone("");
      fetchRooms();
    } catch (err) {
      toast.error("Failed to create room.");
    }
  };

  const handleEndRoom = async (roomId) => {
    try {
      await api.post(`/admin/video-support/rooms/${roomId}/end`);
      toast.info("Room marked as completed.");
      fetchRooms();
    } catch (err) {
      toast.error("Failed to end room.");
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      await api.delete(`/admin/video-support/rooms/${roomId}`);
      toast.success("Room record deleted.");
      fetchRooms();
    } catch (err) {
      toast.error("Failed to delete room.");
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await api.put("/admin/video-support/config", config);
      toast.success("Video SDK Support Agent configuration updated!");
    } catch (err) {
      toast.error("Failed to save settings.");
    }
  };

  const copyCallLink = (roomId) => {
    const link = `${window.location.origin}/video-call?room=${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedRoomId(roomId);
    toast.success("Video Call Link copied to clipboard!");
    setTimeout(() => setCopiedRoomId(null), 2000);
  };

  const sendWhatsAppLink = (phone, roomId) => {
    if (!phone) {
      toast.error("No phone number provided for WhatsApp!");
      return;
    }
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const link = `${window.location.origin}/video-call?room=${roomId}`;
    const text = encodeURIComponent(`Hello! Please join your S.D. Public School Live Video Support Session here: ${link}`);
    window.open(`https://wa.me/91${cleanPhone}?text=${text}`, "_blank");
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-blue-dark rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5" /> WebRTC Voice over IP (VoIP) AI Agent
          </div>
          <h1 className="font-headline font-bold text-2xl md:text-3xl text-white tracking-tight">
            Voice AI Customer Support Agent
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
            Real-time interactive Voice over IP (VoIP) AI specialist, voice call room generator, and instant payment link provider for S.D. Public School Patna.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => setActiveTab("agent")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === "agent"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <Bot className="w-4 h-4" /> Live AI Voice Agent
          </button>
          <button
            onClick={() => setActiveTab("rooms")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition ${
              activeTab === "rooms"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
          >
            <PhoneCall className="w-4 h-4" /> Voice Support Rooms ({rooms.filter((r) => r.status === "active").length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`p-2.5 rounded-xl transition ${
              activeTab === "settings"
                ? "bg-white text-slate-900 shadow-md"
                : "bg-white/10 text-slate-300 hover:bg-white/20"
            }`}
            title="Voice SDK Settings"
          >
            <Settings className="w-4 h-4" />

          </button>
        </div>
      </div>

      {/* TAB 1: LIVE AI VIDEO AGENT KIOSK */}
      {activeTab === "agent" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Video Feed Screen & Media Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 aspect-video flex flex-col items-center justify-center text-white">
              {/* Agent Avatar Feed */}
              {callActive ? (
                <div className="relative w-full h-full flex items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900">
                  {/* AI Avatar Animation */}
                  <div className="relative flex flex-col items-center justify-center z-10">
                    <div className={`relative w-36 h-36 rounded-full bg-gradient-to-tr from-brand-blue to-brand-orange p-1 shadow-2xl transition-all duration-300 ${
                      isSpeaking ? "scale-105 ring-4 ring-brand-orange/40" : ""
                    }`}>
                      <img 
                        src="/sal-dp.png" 
                        alt="Sal AI Video Agent" 
                        className="w-full h-full object-cover object-top rounded-full bg-slate-900"
                        onError={(e) => { e.target.src = "/sal-assistant.png"; }}
                      />

                      {/* Audio Wave animation when speaking */}
                      {isSpeaking && (
                        <div className="absolute -bottom-2 inset-x-0 flex justify-center items-center gap-1 bg-slate-900/90 py-1 px-3 rounded-full border border-brand-orange/50 shadow-md">
                          <span className="w-1 h-3 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1 h-5 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1 h-4 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          <span className="w-1 h-6 bg-brand-orange rounded-full animate-bounce" style={{ animationDelay: "450ms" }} />
                        </div>
                      )}
                    </div>

                    <h3 className="mt-4 font-headline font-bold text-lg text-white">{config.agent_name}</h3>
                    <p className="text-xs text-brand-orange font-semibold tracking-wide uppercase">{config.agent_title}</p>
                    
                    {/* Live Status Badge */}
                    <div className="mt-2 inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      Video SDK Live Stream Active
                    </div>
                  </div>

                  {/* Picture-in-Picture Local User Camera */}
                  {cameraEnabled && (
                    <div className="absolute bottom-4 right-4 w-32 sm:w-40 aspect-video rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-20">
                      <video 
                        ref={localVideoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover transform -scale-x-100" 
                      />
                      <span className="absolute bottom-1 left-2 text-[10px] font-bold text-white/80 bg-black/60 px-1.5 py-0.5 rounded">You</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 space-y-4">
                  <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-500/30">
                    <PhoneCall className="w-10 h-10 animate-pulse" />
                  </div>
                  <h3 className="font-headline font-bold text-xl text-slate-200">SDPS Support Kiosk Idle</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Connect an instant <strong>Voice Call over IP (VoIP)</strong> session with Sal AI Customer Support Agent, or switch to HD Video Call anytime.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => handleStartCall("voip")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl flex items-center gap-2 transition hover:-translate-y-0.5"
                    >
                      <PhoneCall className="w-4 h-4" /> Connect Voice Call over IP (VoIP)
                    </button>
                    <button
                      onClick={() => handleStartCall("video")}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-5 py-3 rounded-2xl text-xs font-bold shadow-md flex items-center gap-2 transition border border-slate-700"
                    >
                      <Video className="w-4 h-4 text-brand-orange" /> HD Video Call Mode
                    </button>
                  </div>
                </div>

              )}
            </div>

            {/* Video Call Controls Toolbar */}
            {callActive && (
              <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between gap-4 border border-slate-800 text-white shadow-lg flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMicEnabled(!micEnabled)}
                    className={`p-3 rounded-xl transition ${
                      micEnabled ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                    title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => {
                      setCameraEnabled(!cameraEnabled);
                      if (!cameraEnabled) startLocalMedia();
                      else stopLocalMedia();
                    }}
                    className={`p-3 rounded-xl transition ${
                      cameraEnabled ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                    title={cameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
                  >
                    {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={toggleListening}
                    className={`p-3 rounded-xl transition ${
                      isListening ? "bg-amber-500 text-white animate-pulse" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                    title="Voice Input (Speech-to-Text)"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 hidden sm:inline-block font-mono">Room: SDPS-SUPPORT-LIVE</span>
                  <button
                    onClick={handleEndCall}
                    className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition"
                  >
                    <PhoneOff className="w-4 h-4" /> End Video Call
                  </button>
                </div>
              </div>
            )}

            {/* Quick Prompt Presets */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-headline font-bold text-sm text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-orange" /> Quick Enquiry Presets
              </h4>
              <div className="flex flex-wrap gap-2">
                {[
                  "How do I apply for admission?",
                  "What are the school fees & payment options?",
                  "What are the school timings & transport?",
                  "Tell me about hostel boarding facilities",
                  "How can I contact admissions desk?"
                ].map((promptText, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (!callActive) handleStartCall();
                      handleSendQuery(promptText);
                    }}
                    className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-brand-blue hover:text-white px-3.5 py-2 rounded-xl transition shadow-xs text-left"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Live Transcript & Support Chat */}
          <div className="lg:col-span-5 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden h-[600px]">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-blue/20 rounded-xl text-brand-blue">
                  <MessageSquare className="w-4 h-4 text-brand-orange" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-sm text-white">Live Closed Captions & Chat</h3>
                  <span className="text-[10px] text-slate-400">Video SDK Real-time Transcript</span>
                </div>
              </div>
              {isSpeaking && (
                <span className="text-[10px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full border border-brand-orange/20 animate-pulse">
                  Agent Speaking...
                </span>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs">
                  <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Connect call to start live video conversation.
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      <span className="font-semibold">{msg.sender === "user" ? "You" : config.agent_name}</span>
                      <span>•</span>
                      <span>{msg.time}</span>
                    </div>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                        msg.sender === "user"
                          ? "bg-brand-blue text-white rounded-tr-none"
                          : "bg-white text-slate-800 border border-slate-200 rounded-tl-none"
                      }`}
                    >
                      {msg.text}

                      {/* Action CTA if provided by AI */}
                      {msg.action && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100">
                          <a
                            href={msg.action.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:underline bg-brand-blue/10 px-3 py-1.5 rounded-lg"
                          >
                            {msg.action.label} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {agentThinking && (
                <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 p-3 rounded-2xl w-fit">
                  <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
                  Sal AI is processing response...
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendQuery()}
                placeholder="Type query or speak into microphone..."
                className="flex-1 text-xs sm:text-sm p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue"
              />
              <button
                onClick={() => handleSendQuery()}
                disabled={!inputQuery.trim()}
                className="p-3 bg-brand-blue hover:bg-brand-blue-light disabled:opacity-50 text-white rounded-xl transition shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VIDEO SDK CALL ROOMS GENERATOR */}
      {activeTab === "rooms" && (
        <div className="space-y-8">
          {/* Room Generator Form */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <h3 className="font-headline font-bold text-lg text-slate-800">Generate Live Video Support Room Link</h3>
              <p className="text-xs text-slate-500 mt-1">
                Create a 1-on-1 Video SDK support room for parents or admission applicants. You can send the link via WhatsApp or SMS.
              </p>
            </div>

            <form onSubmit={handleCreateRoom} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Client / Parent Name</label>
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Phone Number</label>
                <input
                  type="text"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="e.g. 9955190262"
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Purpose / Topic</label>
                <select
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="Admission Enquiry">Admission Enquiry</option>
                  <option value="Fee Structure & Installments">Fee Structure & Installments</option>
                  <option value="Hostel & Transport Enquiry">Hostel & Transport Enquiry</option>
                  <option value="Principal Meeting">Principal / Management Meeting</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary text-xs font-bold flex items-center justify-center gap-2 h-[42px] shadow-md"
              >
                <Plus className="w-4 h-4" /> Create Video Room
              </button>
            </form>
          </div>

          {/* Rooms Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-slate-800">All Video Support Rooms</h3>
              <button onClick={fetchRooms} className="text-xs text-brand-blue hover:underline flex items-center gap-1 font-semibold">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh List
              </button>
            </div>

            {loadingRooms ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading rooms...</div>
            ) : rooms.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">No video call rooms generated yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase text-[11px] font-semibold tracking-wider">
                      <th className="p-4">Room ID</th>
                      <th className="p-4">Client Name</th>
                      <th className="p-4">Phone</th>
                      <th className="p-4">Purpose</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Created At</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rooms.map((room) => (
                      <tr key={room.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 font-mono font-bold text-brand-blue">{room.room_id}</td>
                        <td className="p-4 font-semibold text-slate-800">{room.client_name}</td>
                        <td className="p-4 text-slate-600">{room.client_phone || "—"}</td>
                        <td className="p-4 text-slate-600">{room.purpose}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            room.status === "active"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}>
                            {room.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {new Date(room.created_at).toLocaleString()}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => copyCallLink(room.room_id)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1"
                          >
                            {copiedRoomId === room.room_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            Copy Link
                          </button>

                          {room.client_phone && (
                            <button
                              onClick={() => sendWhatsAppLink(room.client_phone, room.room_id)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-xs"
                            >
                              <Share2 className="w-3 h-3" /> WhatsApp
                            </button>
                          )}

                          {room.status === "active" && (
                            <button
                              onClick={() => handleEndRoom(room.room_id)}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1"
                            >
                              End Call
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteRoom(room.room_id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VIDEO SDK SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm max-w-3xl space-y-6">
          <div>
            <h3 className="font-headline font-bold text-lg text-slate-800">Video SDK & Support Agent Configuration</h3>
            <p className="text-xs text-slate-500 mt-1">
              Configure your VideoSDK.live credentials, AI voice parameters, and automated welcome speech for video support calls.
            </p>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">VideoSDK API Key</label>
                <input
                  type="text"
                  value={config.videosdk_api_key}
                  onChange={(e) => setConfig({ ...config, videosdk_api_key: e.target.value })}
                  placeholder="Enter VideoSDK API Key"
                  className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">VideoSDK Secret Token</label>
                <input
                  type="password"
                  value={config.videosdk_secret}
                  onChange={(e) => setConfig({ ...config, videosdk_secret: e.target.value })}
                  placeholder="Enter VideoSDK Secret"
                  className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">AI Agent Name</label>
                <input
                  type="text"
                  value={config.agent_name}
                  onChange={(e) => setConfig({ ...config, agent_name: e.target.value })}
                  className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">AI Agent Title</label>
                <input
                  type="text"
                  value={config.agent_title}
                  onChange={(e) => setConfig({ ...config, agent_title: e.target.value })}
                  className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Welcome Speech Message</label>
              <textarea
                value={config.welcome_speech}
                onChange={(e) => setConfig({ ...config, welcome_speech: e.target.value })}
                rows={2}
                className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Agent System Prompt (Core Instructions)</label>
              <textarea
                value={config.system_prompt || "You are Sal, the official AI Customer Support Specialist for S.D. Public School Patna."}
                onChange={(e) => setConfig({ ...config, system_prompt: e.target.value })}
                rows={3}
                className="w-full p-3 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20 font-mono text-xs"
              />
            </div>

            {/* VideoSDK Pipeline Plugins */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">STT Plugin (Speech-to-Text)</label>
                <select
                  value={config.stt_plugin || "webspeech"}
                  onChange={(e) => setConfig({ ...config, stt_plugin: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="webspeech">WebSpeech (Native Browser)</option>
                  <option value="deepgram">Deepgram Nova-2</option>
                  <option value="whisper">OpenAI Whisper</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">LLM Engine (Intelligence)</label>
                <select
                  value={config.llm_engine || "sdps-knowledge"}
                  onChange={(e) => setConfig({ ...config, llm_engine: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="sdps-knowledge">SDPS Knowledge Base (Default)</option>
                  <option value="gpt-4o">OpenAI GPT-4o Realtime</option>
                  <option value="gemini-pro">Google Gemini 1.5 Pro</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">TTS Plugin (Voice Synthesizer)</label>
                <select
                  value={config.tts_plugin || "websynthesizer"}
                  onChange={(e) => setConfig({ ...config, tts_plugin: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="websynthesizer">WebSynthesizer (Web Speech API)</option>
                  <option value="elevenlabs">ElevenLabs Multilingual</option>
                  <option value="cambai">Camb AI Voice</option>
                </select>
              </div>
            </div>

            {/* Registered Function Tools */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Registered Agent Function Tools</label>
              <div className="flex flex-wrap gap-2 text-xs">
                {["fetch_fee_structure", "open_admission_form", "get_school_timings", "transfer_to_human_agent"].map((toolName) => (
                  <span key={toolName} className="inline-flex items-center gap-1.5 bg-brand-blue/10 text-brand-blue font-mono font-bold px-3 py-1 rounded-lg border border-brand-blue/20">
                    <Sparkles className="w-3 h-3 text-brand-orange" /> {toolName}()
                  </span>
                ))}
              </div>
            </div>

            {/* Indian SIP Telephony Configuration (+91) */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div>
                <h4 className="font-headline font-bold text-sm text-slate-800 flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 text-emerald-600" /> Indian SIP Phone Telephony Integration (+91)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect Sal AI to Indian phone numbers (+91 99551 90262) via DoT/TRAI licensed SIP providers (Exotel, Airtel IQ, TTBS, Twilio India).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">SIP Trunk Provider</label>
                  <select
                    value={config.sip_provider || "exotel"}
                    onChange={(e) => setConfig({ ...config, sip_provider: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="exotel">Exotel India (Recommended)</option>
                    <option value="airtel_iq">Airtel IQ SIP Trunk</option>
                    <option value="ttbs">Tata Tele Business (TTBS)</option>
                    <option value="twilio">Twilio India Elastic SIP</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Indian Phone Number (+91)</label>
                  <input
                    type="text"
                    value={config.sip_phone_number || "+919955190262"}
                    onChange={(e) => setConfig({ ...config, sip_phone_number: e.target.value })}
                    placeholder="+91 9955190262"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">SIP Domain / URI</label>
                  <input
                    type="text"
                    value={config.sip_domain_uri || "sip.sdpublic.org"}
                    onChange={(e) => setConfig({ ...config, sip_domain_uri: e.target.value })}
                    placeholder="sip.sdpublic.org"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Voice Speed Rate ({config.voice_rate}x)</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={config.voice_rate}
                  onChange={(e) => setConfig({ ...config, voice_rate: parseFloat(e.target.value) })}
                  className="w-full accent-brand-blue"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Voice Pitch ({config.voice_pitch})</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value={config.voice_pitch}
                  onChange={(e) => setConfig({ ...config, voice_pitch: parseFloat(e.target.value) })}
                  className="w-full accent-brand-blue"
                />
              </div>
            </div>


            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="btn-primary text-xs font-bold px-6 shadow-md"
              >
                Save Video SDK Settings
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
