import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";
import api from "../../lib/api";

const AVATAR_SRC = "/sal-assistant.png"; // full-body robot
const AVATAR_DP  = "/sal-dp.png";         // face/dp for chat header & bubbles
const GREETING = "Hello, I'm **Sal**! 👋 Your SDPS AI Assistant. How may I help you today?";

const SUGGESTIONS = [
  "How do I apply for admission?",
  "What are the school timings?",
  "Show me the fee structure",
  "I want to pay fees online",
];

// ── Markdown renderer ────────────────────────────────────────────────────────
function renderLine(line, navigate, keyBase) {
  const nodes = [];
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0, m, i = 0;
  const pushText = (txt) => {
    if (!txt) return;
    txt.split(/(\*\*[^*]+\*\*)/g).forEach((p, j) => {
      if (/^\*\*[^*]+\*\*$/.test(p))
        nodes.push(<strong key={`${keyBase}-b-${i}-${j}`}>{p.slice(2, -2)}</strong>);
      else if (p)
        nodes.push(<span key={`${keyBase}-t-${i}-${j}`}>{p}</span>);
    });
  };
  while ((m = linkRe.exec(line)) !== null) {
    pushText(line.slice(last, m.index));
    const [, label, url] = m;
    nodes.push(url.startsWith("/")
      ? <button key={`${keyBase}-l-${i}`} onClick={() => navigate(url)}
          className="text-brand-blue font-semibold underline underline-offset-2 hover:opacity-80">{label}</button>
      : <a key={`${keyBase}-l-${i}`} href={url} target="_blank" rel="noopener noreferrer"
          className="text-emerald-600 font-semibold underline underline-offset-2 hover:opacity-80">{label}</a>
    );
    last = m.index + m[0].length; i++;
  }
  pushText(line.slice(last));
  return nodes;
}

function MessageText({ text, navigate }) {
  return (
    <>{String(text || "").split("\n").map((ln, idx) =>
      <span key={idx} className="block">{renderLine(ln, navigate, `ln-${idx}`)}</span>
    )}</>
  );
}

// ── Small circle avatar (chat header + message bubbles) ──────────────────────
function AvatarCircle({ className }) {
  const [ok, setOk] = useState(true);
  return ok
    ? <img src={AVATAR_DP} alt="Sal" onError={() => setOk(false)}
        className={`object-cover object-top bg-brand-blue/5 ${className}`} />
    : <div className={`flex items-center justify-center bg-brand-blue text-white ${className}`}>
        <Bot className="w-1/2 h-1/2" />
      </div>;
}

// ── Blinking eyes overlay ────────────────────────────────────────────────────
function BlinkingEyes() {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const schedule = () => {
      const delay = 2000 + Math.random() * 3000;
      return setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          timerRef.current = schedule();
        }, 130);
      }, delay);
    };
    const timerRef = { current: schedule() };
    return () => clearTimeout(timerRef.current);
  }, []);

  const eyeBase = {
    position: "absolute",
    width: "4%",
    height: blink ? "0.3%" : "3.5%",
    top: "18%",
    borderRadius: "50%",
    backgroundColor: "#a2e3fc",
    boxShadow: [
      "0 0 2px 1px rgba(162,227,252,1)",
      "0 0 7px 2px rgba(162,227,252,0.7)",
      "0 0 6px 2px rgba(162,227,252,0.35)",
    ].join(", "),
    transition: "height 0.07s ease",
    pointerEvents: "none",
  };

  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      <div style={{ ...eyeBase, left: "49%" }} />
      <div style={{ ...eyeBase, left: "61.5%" }} />
    </div>
  );
}

// ── Full-body robot launcher ─────────────────────────────────────────────────
function AvatarBody({ className, showEyes }) {
  const [ok, setOk] = useState(true);
  const [loaded, setLoaded] = useState(false);

  if (!ok) {
    return (
      <div className={`flex items-center justify-center bg-brand-blue rounded-full text-white ${className}`}>
        <Bot className="w-1/2 h-1/2" />
      </div>
    );
  }
  return (
    <div className={`relative ${className}`}>
      <div className="absolute bottom-0 left-0 w-full pointer-events-none" style={{ aspectRatio: "575/663" }}>
        <img
          src={AVATAR_SRC}
          alt="Sal AI Assistant"
          onLoad={() => setLoaded(true)}
          onError={() => setOk(false)}
          className="w-full h-full object-cover"
        />
        {showEyes && loaded && <BlinkingEyes />}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function SalAssistant() {
  const navigate = useNavigate();
  const [open, setOpen]           = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [messages, setMessages]   = useState([{ role: "assistant", text: GREETING }]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = sessionStorage.getItem("sal_teaser_v2") === "1"; } catch {}
    if (dismissed) return;
    const t = setTimeout(() => setShowTeaser(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open) return;
    const id = setInterval(() => {
      let dismissed = false;
      try { dismissed = sessionStorage.getItem("sal_teaser_v2") === "1"; } catch {}
      if (!dismissed) setShowTeaser(true);
    }, 60000);
    return () => clearInterval(id);
  }, [open]);

  const dismissTeaser = useCallback(() => {
    setShowTeaser(false);
    try { sessionStorage.setItem("sal_teaser_v2", "1"); } catch {}
  }, []);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, sending]);

  const openChat = () => {
    setOpen(true);
    dismissTeaser();
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const send = async (textArg) => {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    const history = messages.slice(-8);
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setSending(true);
    try {
      const r = await api.post("/assistant/chat", { message: text, history });
      setMessages((m) => [...m, { role: "assistant", text: r.data.text }]);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        text: "I'm having trouble right now. Please message us on WhatsApp at +91 99551 90262 ([Chat on WhatsApp](https://wa.me/919955190262)).",
      }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="fixed bottom-0 right-4 z-[60] flex flex-col items-end sm:right-6">

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="mb-3 w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-[560px] bg-white rounded-3xl shadow-2xl border border-black/10 flex flex-col overflow-hidden"
          >
            <div className="bg-brand-blue text-white px-4 py-3 flex items-center gap-3">
              <AvatarCircle className="w-10 h-10 rounded-full border-2 border-white/30 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-headline font-semibold leading-tight">Sal</div>
                <div className="text-[11px] text-white/80 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  SDPS AI Assistant
                </div>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close chat"
                className="p-1.5 rounded-full hover:bg-white/15">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-slate-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
                  {msg.role === "assistant" && (
                    <AvatarCircle className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
                  )}
                  <div className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed rounded-2xl ${
                    msg.role === "user"
                      ? "bg-brand-blue text-white rounded-br-md"
                      : "bg-white text-slate-700 border border-black/5 rounded-bl-md shadow-sm"
                  }`}>
                    <MessageText text={msg.text} navigate={navigate} />
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start gap-2">
                  <AvatarCircle className="w-7 h-7 rounded-full shrink-0 mt-0.5" />
                  <div className="bg-white border border-black/5 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.length === 1 && !sending && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-white border border-brand-blue/20 text-brand-blue hover:bg-brand-blue/5">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-black/5 p-2.5 bg-white">
              <div className="flex items-end gap-2">
                <textarea ref={inputRef} value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown} rows={1}
                  placeholder="Ask me anything about SDPS…"
                  className="flex-1 resize-none max-h-24 rounded-2xl border border-black/10 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
                <button onClick={() => send()} disabled={sending || !input.trim()}
                  aria-label="Send"
                  className="w-10 h-10 shrink-0 rounded-full bg-brand-blue text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-[10px] text-slate-400 text-center mt-1.5 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" /> Sal can make mistakes. For urgent help, WhatsApp +91 99551 90262.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-end">
        <AnimatePresence>
          {showTeaser && !open && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.88 }}
              animate={{ opacity: 1, x: 0,  scale: 1 }}
              exit={{   opacity: 0, x: 20,  scale: 0.88 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="absolute bottom-20 right-full mr-3 z-10 cursor-pointer hidden sm:block"
              onClick={openChat}
              style={{ minWidth: 190, maxWidth: 230 }}
            >
              <div className="relative bg-white rounded-2xl shadow-2xl border border-black/8 px-4 py-3">
                <button
                  onClick={(e) => { e.stopPropagation(); dismissTeaser(); }}
                  aria-label="Dismiss"
                  className="absolute -top-2 -right-2 w-5 h-5 bg-slate-200 hover:bg-slate-300 rounded-full flex items-center justify-center shadow"
                >
                  <X className="w-3 h-3 text-slate-600" />
                </button>
                <p className="text-sm text-slate-700 leading-snug">
                  <span className="font-bold text-brand-blue">Hi, I'm Sal! 👋</span><br />
                  I can answer your questions about SDPS. Ask me anything!
                </p>
                <span
                  className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0"
                  style={{
                    borderTop: "8px solid transparent",
                    borderBottom: "8px solid transparent",
                    borderLeft: "10px solid white",
                  }}
                />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-brand-blue opacity-75 animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => (open ? setOpen(false) : openChat())}
          aria-label={open ? "Close assistant" : "Open SDPS assistant"}
          whileHover={{ scale: 1.05, y: -4 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="relative w-24 h-32 sm:w-36 sm:h-48 focus:outline-none"
          style={{ filter: "drop-shadow(0 10px 28px rgba(0,0,0,0.22))" }}
        >
          <AvatarBody className="w-full h-full" showEyes={true} />
          {open && (
            <span className="absolute top-2 right-0 w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center shadow-lg">
              <X className="w-4 h-4 text-white" />
            </span>
          )}
          {!open && (
            <span className="absolute top-2 right-0 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
