import React from "react";
import { RefreshCw, AlertTriangle, Home } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Auto-reload on chunk load failures (which happen right after new deployments)
    const isChunkError = error && (
      error.name === "ChunkLoadError" ||
      error.message?.includes("Loading chunk") ||
      error.message?.includes("Importing a module script failed") ||
      error.message?.includes("Failed to fetch dynamically imported module")
    );

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("sdps_chunk_reload");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("sdps_chunk_reload", now.toString());
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    sessionStorage.removeItem("sdps_chunk_reload");
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 select-none">
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-orange/20 border border-brand-orange/30 text-brand-orange flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="font-headline font-extrabold text-xl text-white">
                Website Updated or Session Refresh Needed
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                The SDPS application was recently updated with new security or feature assets. Please reload the page to apply the latest version.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-brand-orange hover:bg-brand-orange-light text-white font-bold text-xs py-3.5 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reload Latest Version
              </button>

              <a
                href="/"
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 rounded-xl border border-slate-700 transition flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" /> Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
