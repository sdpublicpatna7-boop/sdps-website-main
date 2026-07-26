import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Mic, MicOff, PhoneOff, PhoneCall, Send, Sparkles, MessageSquare, ExternalLink } from "lucide-react";
import { toast, Toaster } from "sonner";
import api from "../../lib/api";

export default function PublicVideoCall() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("room") || "SDPS-VOICE-ROOM";

  const [callActive, setCallActive] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState("");
  const [agentThinking, setAgentThinking] = useState(false);

  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);

  const startVoiceMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      mediaStreamRef.current = stream;
    } catch (err) {
      console.warn("Microphone access restricted:", err);
      toast.error("Microphone permission required for Voice Call over IP.");
    }
  };

  const stopVoiceMedia = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
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

  const handleStartCall = async () => {
    setCallActive(true);
    await startVoiceMedia();

    const welcomeMsg = {
      sender: "agent",
      text: "Hey, I am Sal, SDPS AI agent. How can I help you today?",
      action: { type: "navigate", url: "/fee-payment", label: "💳 Direct Fee Payment Portal" },
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    setMessages([welcomeMsg]);
    speakText(welcomeMsg.text);
    toast.success("Connected to SDPS Voice Call over IP (VoIP)!");
  };

  // Auto-connect voice call on mount
  useEffect(() => {
    handleStartCall();
    return () => {
      stopVoiceMedia();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const handleEndCall = () => {
    stopVoiceMedia();
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setCallActive(false);
    setIsSpeaking(false);
    toast.info("Voice Support Call ended.");
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
      toast.error("Error connecting to Voice AI support agent.");
    } finally {
      setAgentThinking(false);
    }
  };

  // Web Speech Recognition for Voice Input
  const toggleListening = () => {
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      toast.error("Speech recognition is not supported in this browser.");
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
      toast.info("Listening... Speak your support query to Sal AI.");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-brand-blue-dark text-slate-800 p-4 flex items-center justify-center relative overflow-hidden">
      <Toaster position="top-right" />
      
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col md:flex-row h-[720px]">
        {/* Left Voice Call Visualizer Screen */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col justify-between relative text-white">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 z-10">
            <div className="flex items-center gap-3">
              <img src="/assets/img/logo.png" alt="SDPS Patna" className="w-10 h-10 object-contain" />
              <div>
                <h3 className="font-headline font-bold text-sm text-white">SDPS Voice AI Support Specialist</h3>
                <span className="text-[10px] text-brand-orange font-mono">ROOM: {roomId}</span>
              </div>
            </div>
            {callActive ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Voice Call over IP Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[11px] font-bold">
                Call Ended
              </span>
            )}
          </div>

          {/* Main Visualizer Screen */}
          <div className="flex-1 flex items-center justify-center relative my-4">
            {callActive ? (
              <div className="w-full h-full rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden p-6 text-center">
                {/* Audio Pulse Visualizer */}
                <div className={`relative w-32 h-32 rounded-full bg-gradient-to-tr from-brand-blue to-brand-orange p-1 shadow-2xl transition-transform ${isSpeaking ? "scale-110" : ""}`}>
                  <img src="/sal-dp.png" alt="Sal AI Agent" className="w-full h-full object-cover object-top rounded-full bg-slate-900" />
                  {isSpeaking && (
                    <span className="absolute -inset-3 rounded-full border-2 border-brand-orange animate-ping opacity-75" />
                  )}
                </div>

                <h4 className="mt-5 font-headline font-bold text-white text-xl">Sal AI Support Agent</h4>
                <p className="text-xs text-brand-orange font-semibold mt-1">SDPS Voice over IP (VoIP) Specialist</p>

                {/* Quick Voice Prompt Chips */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-md">
                  <button
                    onClick={() => handleSendQuery("Generate fee payment link")}
                    className="bg-brand-blue/20 hover:bg-brand-blue/40 border border-brand-blue/40 text-brand-blue-light text-[11px] font-bold px-3.5 py-2 rounded-full transition inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-orange" /> 💳 Pay Fees Online
                  </button>
                  <button
                    onClick={() => handleSendQuery("How to take admission for session 2026-27?")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold px-3.5 py-2 rounded-full transition"
                  >
                    📝 Admission Enquiry
                  </button>
                  <button
                    onClick={() => handleSendQuery("What are the school timings?")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold px-3.5 py-2 rounded-full transition"
                  >
                    ⏰ School Timings
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
                  <PhoneCall className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="font-headline font-bold text-lg text-slate-200">SDPS Voice Call over IP</h3>
                <button onClick={handleStartCall} className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs px-6 py-3.5 rounded-xl text-white shadow-lg inline-flex items-center gap-2">
                  <PhoneCall className="w-4 h-4" /> Start Voice Support Call
                </button>
              </div>
            )}
          </div>

          {/* Call Controls Toolbar */}
          {callActive && (
            <div className="flex items-center justify-center gap-4 bg-slate-900 p-3 rounded-2xl border border-slate-800">
              <button
                onClick={() => setMicEnabled(!micEnabled)}
                title={micEnabled ? "Mute Microphone" : "Unmute Microphone"}
                className={`p-3 rounded-xl transition ${micEnabled ? "bg-slate-800 text-white" : "bg-red-600 text-white"}`}
              >
                {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleListening}
                title="Voice Microphone Input"
                className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition ${isListening ? "bg-red-600 animate-pulse text-white" : "bg-brand-blue hover:bg-brand-blue-light text-white"}`}
              >
                <Mic className="w-4 h-4" /> {isListening ? "Listening..." : "Speak to Sal AI"}
              </button>

              <button onClick={handleEndCall} className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md">
                <PhoneOff className="w-4 h-4" /> End Call
              </button>
            </div>
          )}
        </div>

        {/* Right Conversation Panel */}
        <div className="w-full md:w-84 bg-white flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-200">
          <div className="p-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-headline font-bold text-xs text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-brand-orange" /> Voice AI Support Session
            </h4>
          </div>

          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">Connecting to Sal AI...</div>
            ) : (
              messages.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[92%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.sender === "user" ? "bg-brand-blue text-white" : "bg-white text-slate-800 border border-slate-200 shadow-xs"
                  }`}>
                    <p>{msg.text}</p>
                    {msg.action && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
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
                  <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                </div>
              ))
            )}
            {agentThinking && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-200 p-2.5 rounded-xl w-fit">
                <span className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
                Sal AI is processing...
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
              placeholder="Type query or speak..."
              className="flex-1 text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
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
    </div>
  );
}

