import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import api from "../../lib/api";
import { toast, Toaster } from "sonner";
import { Loader2, KeyRound, Mail, Lock } from "lucide-react";

export function AdminLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-blue-dark flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing visual background orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-[100px] -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-orange/5 rounded-full blur-[100px] -ml-20 -mb-20"></div>
        
        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 text-white">
          <div className="text-center mb-8">
            <img src="https://sdpublic.org/assets/img/logo.png" alt="SDPS" className="w-16 h-16 mx-auto rounded-full ring-4 ring-brand-gold/20 shadow-[0_0_20px_rgba(199,161,91,0.3)] mb-4" />
            <h1 className="font-headline font-bold text-3xl tracking-tight text-white">SDPS Admin</h1>
            <p className="text-xs uppercase tracking-widest text-brand-gold font-semibold mt-1">Control Panel Login</p>
          </div>
          <form onSubmit={submit} className="space-y-5" data-testid="admin-login-form">
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required type="email" placeholder="Admin Email" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} data-testid="admin-login-email" />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required type="password" placeholder="Password" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all" value={password} onChange={e => setPassword(e.target.value)} data-testid="admin-login-password" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-orange to-brand-gold hover:from-brand-orange-light hover:to-brand-gold-light text-slate-950 font-bold tracking-wide transition-all shadow-[0_4px_20px_rgba(248,125,14,0.25)] hover:shadow-[0_4px_25px_rgba(248,125,14,0.4)] disabled:opacity-50 flex items-center justify-center" data-testid="admin-login-submit">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-950" /> : "Sign In"}
            </button>
            <Link to="/admin/forgot-password" className="text-sm text-slate-400 hover:text-white transition flex items-center gap-1.5 justify-center mt-5"><KeyRound className="w-3.5 h-3.5" /> Forgot password?</Link>
          </form>
        </div>
      </div>
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
    } catch { toast.error("Could not send OTP"); }
    finally { setLoading(false); }
  };

  const reset = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/admin/reset-password", { email, code, new_password: newPassword });
      toast.success("Password reset successful. Please sign in.");
      navigate("/admin/login");
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-brand-blue-dark flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing visual background orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/10 rounded-full blur-[100px] -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand-orange/5 rounded-full blur-[100px] -ml-20 -mb-20"></div>

        <div className="w-full max-w-md bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 text-white">
          <h1 className="font-headline font-bold text-3xl text-center text-white mb-6 tracking-tight">Reset Password</h1>
          {step === 1 ? (
            <form onSubmit={sendOtp} className="space-y-5">
              <input required type="email" placeholder="Admin Email" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all" value={email} onChange={e => setEmail(e.target.value)} data-testid="forgot-email" />
              <button disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-orange to-brand-gold hover:from-brand-orange-light hover:to-brand-gold-light text-slate-950 font-bold tracking-wide transition-all shadow-[0_4px_20px_rgba(248,125,14,0.25)] hover:shadow-[0_4px_25px_rgba(248,125,14,0.4)] disabled:opacity-50 flex items-center justify-center" data-testid="forgot-send-otp">{loading ? "Sending..." : "Send OTP"}</button>
              <Link to="/admin/login" className="block text-center text-sm text-slate-400 hover:text-white transition mt-4">Back to login</Link>
            </form>
          ) : (
            <form onSubmit={reset} className="space-y-5">
              <input required placeholder="Enter 6-digit OTP" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none tracking-widest text-center text-xl font-bold" value={code} onChange={e => setCode(e.target.value)} data-testid="forgot-otp" />
              <input required type="password" placeholder="New Password" className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-400 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange outline-none transition-all" value={newPassword} onChange={e => setNewPassword(e.target.value)} data-testid="forgot-newpw" />
              <button disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-orange to-brand-gold hover:from-brand-orange-light hover:to-brand-gold-light text-slate-950 font-bold tracking-wide transition-all shadow-[0_4px_20px_rgba(248,125,14,0.25)] hover:shadow-[0_4px_25px_rgba(248,125,14,0.4)] disabled:opacity-50 flex items-center justify-center" data-testid="forgot-submit">{loading ? "Resetting..." : "Reset Password"}</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
