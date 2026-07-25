import { useState } from "react";
import { Star, Copy, Check, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { toast, Toaster } from "sonner";
import api from "@/lib/api";

export function MapsReview() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const googleMapsUrl = "https://share.google/lYeOGvQ12ODgOCwFH";

  const handleRatingSelect = async (selectedRating) => {
    setRating(selectedRating);
    setLoading(true);
    setCopied(false);
    setReviewText("");

    try {
      const res = await api.post("/generate-maps-review", { rating: selectedRating });
      if (res && res.data && res.data.text) {
        setReviewText(res.data.text);
      } else {
        toast.error("Failed to generate review. Please try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error generating review text. Using basic template.");
      const clientFallbacks = {
        5: "Outstanding school with a great learning atmosphere and supportive teachers. Highly recommend S.D. Public School!",
        4: "Very good school with dedicated teachers. The academic guidelines are excellent.",
        3: "Decent school with good academic focus. Hope they expand the playground and sports activities.",
        2: "Academic guidance is good, but transport coordination and administrative responsiveness need improvement.",
        1: "Very disappointed with the communication and student support. Needs immediate improvement."
      };
      setReviewText(clientFallbacks[selectedRating]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAndRedirect = () => {
    if (!reviewText) return;
    
    navigator.clipboard.writeText(reviewText);
    setCopied(true);
    toast.success("Review copied to clipboard!");

    setTimeout(() => {
      window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
    }, 1000);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center py-10 px-4 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-brand-blue-dark text-slate-800">
      <Toaster position="top-right" />

      {/* Decorative background glow circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-blue/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-orange/20 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: "2s" }} />

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl p-6 md:p-8 text-center my-auto">
        {/* School Branding Header */}
        <div className="flex flex-col items-center justify-center mb-6 border-b border-slate-100 pb-5">
          <img 
            src="/assets/img/logo.png" 
            alt="S.D. Public School" 
            className="w-16 h-16 object-contain mb-3 drop-shadow-md"
            onError={(e) => { e.target.style.display = "none"; }}
          />
          <h2 className="font-headline font-bold text-lg text-slate-900 tracking-tight">S.D. PUBLIC SCHOOL</h2>
          <span className="text-[11px] font-bold text-brand-orange uppercase tracking-widest mt-0.5">Patna • Review Hub</span>
        </div>

        <div className="flex justify-center mb-3">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-500 shadow-inner">
            <Star className="w-7 h-7 fill-current" />
          </div>
        </div>

        <h1 className="text-xl font-headline font-bold text-slate-800 tracking-tight mb-2">
          Share Your Experience
        </h1>
        <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">
          Your feedback helps us continuously improve! Choose a rating below to generate a quick Google Maps review.
        </p>

        {/* Star Selection Container */}
        <div className="flex items-center justify-center gap-2 mb-6 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className="p-1 transition-transform hover:scale-125 focus:outline-none"
              onClick={() => handleRatingSelect(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              title={`${star} Star${star > 1 ? "s" : ""}`}
            >
              <Star
                className={`w-9 h-9 transition-colors duration-200 ${
                  star <= (hoverRating || rating)
                    ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]"
                    : "text-slate-300"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-brand-orange mb-2" />
            <p className="text-xs font-semibold">Generating customized review...</p>
          </div>
        )}

        {/* Review Box & CTA */}
        {reviewText && !loading && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="text-left">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">
                Generated Review (Editable)
              </label>
              <textarea
                className="w-full min-h-[100px] p-3.5 text-xs sm:text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange leading-relaxed"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review here..."
              />
            </div>

            <button
              type="button"
              onClick={handleCopyAndRedirect}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                copied
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  : "bg-gradient-to-r from-brand-orange to-amber-500 hover:from-amber-600 hover:to-brand-orange text-white shadow-brand-orange/20 hover:shadow-brand-orange/30 hover:-translate-y-0.5"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copied! Opening Google Maps...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy Review & Open Google Maps
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
              <p className="text-[11px] leading-relaxed text-slate-500">
                <span className="font-bold text-slate-700 block mb-0.5">Quick Steps:</span>
                1. Click the button above to copy text.<br />
                2. Google Maps review box will open automatically.<br />
                3. Paste (Ctrl+V) and click post!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapsReview;

