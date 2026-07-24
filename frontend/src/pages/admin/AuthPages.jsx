import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Loader2, KeyRound, Mail, Lock } from "lucide-react";

const ANIMATION_STYLES = `
  @keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-15px) rotate(3deg); }
  }
  @keyframes glow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 0.9; transform: scale(1.08); }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(40px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes rise {
    0% { transform: translateY(100%) scale(0.3); opacity: 0; }
    15% { opacity: 0.6; }
    85% { opacity: 0.6; }
    100% { transform: translateY(-110vh) scale(1.2); opacity: 0; }
  }
  .animate-bg-shift {
    background-size: 200% 200%;
    animation: gradientShift 15s ease infinite;
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-glow-1 {
    animation: glow 8s ease-in-out infinite alternate;
  }
  .animate-glow-2 {
    animation: glow 12s ease-in-out infinite alternate-reverse;
  }
  .animate-card {
    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .particle {
    position: absolute;
    bottom: -100px;
    background: radial-gradient(circle, rgba(248, 125, 14, 0.1) 0%, rgba(199, 161, 91, 0.04) 50%, rgba(255, 255, 255, 0) 70%);
    border-radius: 50%;
    pointer-events: none;
    animation: rise infinite linear;
  }
`;

function LoginWrapper({ children }) {
  const [particles] = useState(() =>
    Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      size: Math.random() * 120 + 40,
      left: Math.random() * 100 + "%",
      duration: Math.random() * 10 + 10 + "s",
      delay: Math.random() * -10 + "s",
    }))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden animate-bg-shift select-none">
      <style>{ANIMATION_STYLES}</style>
      
      {/* Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: p.size,
              height: p.size,
              left: p.left,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Glowing visual background orbs */}
      <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-brand-gold/10 rounded-full blur-[120px] -mr-40 -mt-40 pointer-events-none z-0 animate-glow-1"></div>
      <div className="absolute bottom-0 left-0 w-[35rem] h-[35rem] bg-brand-orange/5 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none z-0 animate-glow-2"></div>
      
      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] hover:shadow-[0_8px_40px_0_rgba(248,125,14,0.15)] transition-all duration-500 relative z-10 text-white animate-card">
        {children}
      </div>
    </div>
  );
}

export function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(() => {
    try {
      const cached = localStorage.getItem("sdps_site_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.logo_url) {
          const rawUrl = parsed.logo_url;
          return rawUrl.startsWith("http")
            ? rawUrl
            : `${process.env.REACT_APP_BACKEND_URL || ""}${rawUrl}`;
        }
      }
    } catch (e) {}
    return "";
  });

  useEffect(() => {
    api.get("/site-settings")
      .then((r) => {
        if (r.data?.logo_url) {
          const rawUrl = r.data.logo_url;
          const formatted = rawUrl.startsWith("http")
            ? rawUrl
            : `${process.env.REACT_APP_BACKEND_URL || ""}${rawUrl}`;
          setLogoUrl(formatted);
          try {
            localStorage.setItem("sdps_site_settings", JSON.stringify(r.data));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <LoginWrapper>
        <div className="text-center mb-8">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="SDPS"
              className="w-16 h-16 mx-auto rounded-full ring-4 ring-brand-gold/20 shadow-[0_0_20px_rgba(199,161,91,0.3)] mb-4 animate-float object-contain"
            />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-full bg-slate-800/80 animate-pulse border border-slate-700 ring-4 ring-brand-gold/20 mb-4" />
          )}
          <h1 className="font-headline font-bold text-3xl tracking-tight text-white">SDPS Admin</h1>
          <p className="text-xs uppercase tracking-widest text-brand-gold font-semibold mt-1">Control Panel Login</p>
        </div>
        <form onSubmit={submit} className="space-y-5" data-testid="admin-login-form">
          <div className="relative group">
            <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-orange group-focus-within:scale-110 transition-all duration-200" />
            <input
              required
              type="text"
              placeholder="Admin Email or Username"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange/60 focus:bg-white/[0.05] focus:ring-1 focus:ring-brand-orange outline-none transition-all duration-300 shadow-inner text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="admin-login-email"
            />
          </div>
          <div className="relative group">
            <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-orange group-focus-within:scale-110 transition-all duration-200" />
            <input
              required
              type="password"
              placeholder="Password"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange/60 focus:bg-white/[0.05] focus:ring-1 focus:ring-brand-orange outline-none transition-all duration-300 shadow-inner text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="admin-login-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-orange to-brand-gold hover:from-brand-orange-light hover:to-brand-gold-light text-slate-950 font-bold tracking-wide transition-all duration-300 shadow-[0_4px_20px_rgba(248,125,14,0.2)] hover:shadow-[0_4px_25px_rgba(248,125,14,0.45)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center text-sm"
            data-testid="admin-login-submit"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-950" /> : "Sign In"}
          </button>
          <Link
            to="/admin/forgot-password"
            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5 justify-center mt-6 hover:underline"
          >
            <KeyRound className="w-3.5 h-3.5" /> Forgot password?
          </Link>
        </form>
      </LoginWrapper>
    </>
  );
}

export function AdminForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post("/admin/forgot-password", { email });
      if (r.data?.email_status?.mocked) {
        toast.warning("Email service is not configured. Check backend logs for OTP.");
      } else {
        toast.success("OTP sent to your email");
      }
      setStep(2);
    } catch {
      toast.error("Could not send OTP");
    } finally {
      setLoading(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/admin/reset-password", { email, code, new_password: newPassword });
      toast.success("Password reset successful. Please sign in.");
      navigate("/admin/login");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <LoginWrapper>
        <h1 className="font-headline font-bold text-3xl text-center text-white mb-2 tracking-tight">Reset Password</h1>
        <p className="text-xs text-slate-400 text-center mb-8 uppercase tracking-widest">Admin Account Recovery</p>
        {step === 1 ? (
          <form onSubmit={sendOtp} className="space-y-5">
            <div className="relative group">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-orange group-focus-within:scale-110 transition-all duration-200" />
              <input
                required
                type="text"
                placeholder="Admin Email or Username"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange/60 focus:bg-white/[0.05] focus:ring-1 focus:ring-brand-orange outline-none transition-all duration-300 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="forgot-email"
              />
            </div>
            <button
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-orange to-brand-gold hover:from-brand-orange-light hover:to-brand-gold-light text-slate-950 font-bold tracking-wide transition-all duration-300 shadow-[0_4px_20px_rgba(248,125,14,0.2)] hover:shadow-[0_4px_25px_rgba(248,125,14,0.45)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center text-sm"
              data-testid="forgot-send-otp"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : "Send OTP"}
            </button>
            <Link to="/admin/login" className="block text-center text-xs text-slate-400 hover:text-white transition mt-4 hover:underline">Back to login</Link>
          </form>
        ) : (
          <form onSubmit={reset} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-brand-gold block text-center font-bold">Verification Code</label>
              <input
                required
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none tracking-widest text-center text-xl font-bold transition-all duration-300"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                data-testid="forgot-otp"
              />
            </div>
            <div className="space-y-2">
              <div className="relative group">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-orange group-focus-within:scale-110 transition-all duration-200" />
                <input
                  required
                  type="password"
                  placeholder="New Password"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange/60 focus:bg-white/[0.05] focus:ring-1 focus:ring-brand-orange outline-none transition-all duration-300 text-sm"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  data-testid="forgot-newpw"
                />
              </div>
              {newPassword ? (
                <div className="text-[11px] bg-white/[0.04] border border-white/10 p-3 rounded-xl space-y-1 text-left">
                  <div className="font-semibold text-slate-300 mb-1">Strong Password Policy Checklist:</div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                    <span className={newPassword.length >= 8 ? "text-emerald-400 font-semibold flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
                      {newPassword.length >= 8 ? "✓" : "○"} 8+ chars
                    </span>
                    <span className={/[A-Z]/.test(newPassword) ? "text-emerald-400 font-semibold flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
                      {/[A-Z]/.test(newPassword) ? "✓" : "○"} Uppercase (A-Z)
                    </span>
                    <span className={/[a-z]/.test(newPassword) ? "text-emerald-400 font-semibold flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
                      {/[a-z]/.test(newPassword) ? "✓" : "○"} Lowercase (a-z)
                    </span>
                    <span className={/[0-9]/.test(newPassword) ? "text-emerald-400 font-semibold flex items-center gap-1" : "text-slate-500 flex items-center gap-1"}>
                      {/[0-9]/.test(newPassword) ? "✓" : "○"} Number (0-9)
                    </span>
                    <span className={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/]/.test(newPassword) ? "text-emerald-400 font-semibold col-span-2 flex items-center gap-1" : "text-slate-500 col-span-2 flex items-center gap-1"}>
                      {/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?/]/.test(newPassword) ? "✓" : "○"} Special Symbol (!@#$%^&*)
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 text-center">
                  Password must contain 8+ chars with uppercase, lowercase, number & symbol.
                </p>
              )}
            </div>
            <button
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-orange to-brand-gold hover:from-brand-orange-light hover:to-brand-gold-light text-slate-950 font-bold tracking-wide transition-all duration-300 shadow-[0_4px_20px_rgba(248,125,14,0.25)] hover:shadow-[0_4px_25px_rgba(248,125,14,0.45)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center text-sm"
              data-testid="forgot-submit"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : "Reset Password"}
            </button>
          </form>
        )}
      </LoginWrapper>
    </>
  );
}

