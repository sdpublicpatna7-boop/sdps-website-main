import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import api from "@/lib/api";

export function Demystified() {
  const { settings } = useOutletContext() || {};
  const [siteSettings, setSiteSettings] = useState(null);
  useEffect(() => {
    api.get("/site-settings").then(r => setSiteSettings(r.data)).catch(() => {});
  }, []);
  const imgUrl = siteSettings?.demystified_image_url || settings?.demystified_image_url || "https://sdpublic.org/assets/img/demystified.jpg";

  return (
    <>
      <PageHero title="Demystified" subtitle="Know Us Better — everything about S.D. Public School explained at a glance." />
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Full image — object-contain so nothing is cropped */}
        <div className="rounded-3xl overflow-hidden shadow-xl bg-white border border-black/5">
          <img
            src={imgUrl}
            alt="Demystified — SDPS at a glance"
            className="w-full object-contain"
            style={{ maxHeight: "none", display: "block" }}
            onError={e => { e.target.style.display = "none"; }}
          />
        </div>
        <p className="text-brand-ink/50 text-xs text-center mt-4">
          For more information, contact{" "}
          <a href="tel:+919955190262" className="text-brand-blue hover:underline">+91 99551 90262</a>
        </p>
      </div>
    </>
  );
}

export default Demystified;
