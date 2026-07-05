import { useEffect, useState, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import api from "../../lib/api";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WelcomePopup from "./WelcomePopup";
import SalAssistant from "./SalAssistant";

function PublicLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
    </div>
  );
}

export default function PublicLayout() {
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("sdps_site_settings");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [popup, setPopup] = useState(() => {
    try {
      const cached = localStorage.getItem("sdps_welcome_popup");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const { pathname } = useLocation();

  // Hide distracting overlays on the review page
  const isReviewPage = pathname === "/review";

  useEffect(() => {
    api.get("/site-settings")
      .then((r) => {
        setSettings(r.data);
        try {
          localStorage.setItem("sdps_site_settings", JSON.stringify(r.data));
        } catch (e) {}
      })
      .catch(() => {});
    api.get("/popup")
      .then((r) => {
        setPopup(r.data);
        try {
          localStorage.setItem("sdps_welcome_popup", JSON.stringify(r.data));
        } catch (e) {}
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar settings={settings} hideAdmissionBanner={isReviewPage} />
      <main id="main-content" className="flex-1">
        <Suspense fallback={<PublicLoading />}>
          <Outlet context={{ settings }} />
        </Suspense>
      </main>
      <Footer settings={settings} />
      {!isReviewPage && <WelcomePopup popup={popup} />}
      {!isReviewPage && <SalAssistant />}
    </div>
  );
}
