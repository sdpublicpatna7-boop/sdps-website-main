import { useState } from "react";
import { Link } from "react-router-dom";
import { Megaphone, ArrowRight, X } from "lucide-react";

/**
 * Slim sticky banner promoting open admissions, driven by site settings:
 *  - admissions_banner_enabled: "true" to show
 *  - admissions_banner_text:    override the default message
 *  - admissions_banner_link:    override the default /admissions target
 * Dismissal is remembered for the browser session.
 */
export default function AdmissionBanner({ settings }) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("sdps_admission_banner_dismissed") === "1";
    } catch (e) {
      return false;
    }
  });

  const enabled = String(settings?.admissions_banner_enabled ?? "").toLowerCase() === "true";
  if (!enabled || dismissed) return null;

  const text = settings?.admissions_banner_text || "Admissions Open 2026-27 — Limited seats available";
  const link = settings?.admissions_banner_link || "/admissions";
  const isExternal = /^https?:\/\//i.test(link);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem("sdps_admission_banner_dismissed", "1");
    } catch (e) {}
  };

  const cta = (
    <span className="inline-flex items-center gap-1.5 font-headline font-bold underline underline-offset-4 decoration-white/40 hover:decoration-white transition-all shrink-0">
      Apply now <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
    </span>
  );

  return (
    <div className="bg-brand-blue text-white" role="region" aria-label="Admission announcement">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-3 text-xs sm:text-sm">
        <Megaphone className="w-4 h-4 text-brand-orange-light shrink-0" aria-hidden="true" />
        {isExternal ? (
          <a href={link} target="_blank" rel="noreferrer" className="flex items-center gap-3 min-w-0 text-white">
            <span className="truncate">{text}</span>
            {cta}
          </a>
        ) : (
          <Link to={link} className="flex items-center gap-3 min-w-0 text-white">
            <span className="truncate">{text}</span>
            {cta}
          </Link>
        )}
        <button
          onClick={handleDismiss}
          className="ml-1 p-1 rounded-full hover:bg-white/15 transition-colors shrink-0"
          aria-label="Dismiss admission announcement"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
