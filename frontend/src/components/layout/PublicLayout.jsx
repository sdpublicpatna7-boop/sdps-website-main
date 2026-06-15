import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import api from "../../lib/api";
import Navbar from "./Navbar";
import Footer from "./Footer";
import WelcomePopup from "./WelcomePopup";
import SalAssistant from "./SalAssistant";

export default function PublicLayout() {
  const [settings, setSettings] = useState(null);
  const [popup, setPopup] = useState(null);

  useEffect(() => {
    api.get("/site-settings").then((r) => setSettings(r.data)).catch(() => {});
    api.get("/popup").then((r) => setPopup(r.data)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar settings={settings} />
      <main id="main-content" className="flex-1">
        <Outlet context={{ settings }} />
      </main>
      <Footer settings={settings} />
      <WelcomePopup popup={popup} />
      <SalAssistant />
    </div>
  );
}
