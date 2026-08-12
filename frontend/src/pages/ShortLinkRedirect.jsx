import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import api from "../lib/api";

export default function ShortLinkRedirect() {
  const { code } = useParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    const resolveLink = async () => {
      try {
        const { data } = await api.get(`/s/${code}`);
        if (data && data.url) {
          // Perform instant redirection
          window.location.replace(data.url);
        } else {
          setError("Invalid destination URL");
        }
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.detail || "This shortened link does not exist or has expired.");
      }
    };

    resolveLink();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse duration-4000"></div>

      <div className="max-w-md w-full mx-4 p-8 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/5 shadow-2xl relative z-10 text-center space-y-6">
        {/* School Logo Shield */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
          <img src="/logo192.png" alt="SDPS Logo" className="w-10 h-10 object-contain rounded-lg" />
        </div>

        {!error ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Redirecting...</h1>
              <p className="text-sm text-slate-400 mt-1">Connecting you to school content portals</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 animate-in fade-in zoom-in duration-300">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-red-400">Link Unresolved</h1>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                {error}
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-200 text-sm font-semibold rounded-xl hover:bg-slate-850 hover:text-white transition-all shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
