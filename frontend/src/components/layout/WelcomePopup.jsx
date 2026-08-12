import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import { optimizeCloudinary, parseImageTransform } from "@/lib/api";

export default function WelcomePopup({ popup }) {
  const [open, setOpen] = useState(false);
  const [imgLoading, setImgLoading] = useState(true);

  useEffect(() => {
    if (!popup?.enabled) return;
    const seen = sessionStorage.getItem("sdps_popup_seen");
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [popup]);

  const close = () => {
    sessionStorage.setItem("sdps_popup_seen", "1");
    setOpen(false);
  };

  if (!popup?.enabled) return null;

  const imageUrlRaw = popup.image_url;
  const { style: popupImgStyle, cleanUrl: cleanPopupImg } = parseImageTransform(imageUrlRaw || "");
  const rawImageUrl = cleanPopupImg
    ? (cleanPopupImg.startsWith("http") ? cleanPopupImg : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanPopupImg}`)
    : "";
  const formattedImageUrl = optimizeCloudinary(rawImageUrl, 600);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-brand-ink/40 backdrop-blur-sm"
          data-testid="welcome-popup"
        >
          <motion.div
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 10, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-brand-gold/30"
          >
            <button
              onClick={close}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white border border-black/5"
              data-testid="popup-close-btn"
            >
              <X className="w-4 h-4" />
            </button>
            {popup.image_url && (
              <div className="px-4 pt-5 pb-1 relative">
                {imgLoading && (
                  <div className="w-full h-48 bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-xs font-semibold">
                    Loading image...
                  </div>
                )}
                <img
                  src={formattedImageUrl}
                  alt=""
                  onLoad={() => setImgLoading(false)}
                  onError={() => setImgLoading(false)}
                  className={`w-full object-contain bg-white rounded-2xl border border-black/5 mx-auto transition-opacity duration-300 ${imgLoading ? "opacity-0 absolute h-0 w-0 overflow-hidden" : "opacity-100"}`}
                  style={{ ...popupImgStyle, maxHeight: "340px", display: "block" }}
                />
              </div>
            )}
            {!popup.image_url && (
              <div className="h-32 bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-orange relative">
                <div className="absolute inset-0 grain opacity-20" />
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-gold to-brand-gold-light" />
              </div>
            )}
            <div className="p-6">
              <div className="overline mb-2">SDPS Update</div>
              <h3 className="font-legacy text-3xl text-brand-blue mb-2">{popup.title}</h3>
              <p className="text-brand-ink/70 text-sm leading-relaxed mb-5">{popup.content}</p>
              {popup.button_text && popup.button_link && (
                <Link
                  to={popup.button_link}
                  onClick={close}
                  className="btn-primary inline-block"
                  data-testid="popup-cta-btn"
                >
                  {popup.button_text}
                </Link>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
