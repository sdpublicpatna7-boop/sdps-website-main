import { useState } from "react";
import { Star, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
      // Simple fallback in client if API fails
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

    // Wait a brief moment then redirect to Google Maps
    setTimeout(() => {
      window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
    }, 1000);
  };

  return (
    <div className="relative min-h-[80vh] flex items-center justify-center py-12 px-4 overflow-hidden bg-slate-50">
      {/* Decorative floating blur circles */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="relative w-full max-w-md bg-white/70 backdrop-blur-md border border-white/80 rounded-2xl shadow-xl p-6 md:p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-brand-orange/10 rounded-full text-brand-orange">
            <Star className="w-8 h-8 fill-current" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
          SDPS Patna Review Hub
        </h1>
        <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto">
          Your feedback keeps us going! Share your experience on Google Maps by choosing a rating below.
        </p>

        {/* Star Selection Container */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
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
                className={`w-10 h-10 transition-colors duration-200 ${
                  star <= (hoverRating || rating)
                    ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]"
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
            <p className="text-xs font-semibold">Generating unique review...</p>
          </div>
        )}

        {/* Review Box & CTA */}
        {reviewText && !loading && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="text-left">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 ml-1">
                Generated Draft (You can edit this)
              </label>
              <textarea
                className="w-full min-h-[100px] p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange resize-y"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Write your review here..."
              />
            </div>

            <button
              type="button"
              onClick={handleCopyAndRedirect}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-200 ${
                copied
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                  : "bg-brand-orange hover:bg-brand-orange-hover text-white shadow-brand-orange/20 hover:shadow-brand-orange/30 hover:-translate-y-0.5"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copied! Opening Google Maps...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy Review & Go to Google Maps
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
              <p className="text-[11px] leading-relaxed text-slate-500">
                <span className="font-semibold text-slate-600 block mb-0.5">How it works:</span>
                1. Click the button above to copy the generated review.<br />
                2. S.D. Public School review page will open in a new tab.<br />
                3. Paste (Ctrl+V or long-press) in the review text box and submit!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MapsReview;
