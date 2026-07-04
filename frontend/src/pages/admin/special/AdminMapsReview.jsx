import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { QrCode, Printer, Download, ExternalLink, Info, Star, Search, Copy, Smartphone, Laptop, Tablet, Calendar, Activity, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

export function AdminMapsReview() {
  const { settings } = useOutletContext() || {};
  const reviewUrl = `${window.location.origin}/review`;
  
  const logoUrl = settings?.logo_url || "";
  const formattedLogo = logoUrl
    ? (logoUrl.startsWith("http") ? logoUrl : `${process.env.REACT_APP_BACKEND_URL || ""}${logoUrl}`)
    : "";
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(reviewUrl)}`;
  const [previewType, setPreviewType] = useState("a4"); // "a4" | "card"
  const [activeTab, setActiveTab] = useState("poster"); // "poster" | "log"
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingLog, setLoadingLog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRating, setSelectedRating] = useState("all");

  const fetchReviewsAndStats = async () => {
    setLoadingLog(true);
    try {
      const [revRes, statsRes] = await Promise.all([
        api.get("/admin/maps-reviews"),
        api.get("/admin/maps-reviews/stats")
      ]);
      setReviews(revRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load generated reviews log.");
    } finally {
      setLoadingLog(false);
    }
  };

  useEffect(() => {
    if (activeTab === "log") {
      fetchReviewsAndStats();
    }
  }, [activeTab]);

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Review copied to clipboard!");
  };

  const filteredReviews = reviews.filter(rev => {
    const textMatch = rev.text?.toLowerCase().includes(searchQuery.toLowerCase());
    const ratingMatch = selectedRating === "all" || String(rev.rating) === selectedRating;
    return textMatch && ratingMatch;
  });

  const handlePrint = (type = "a4") => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented printing. Please enable popups.");
      return;
    }

    const htmlContent = type === "a4" ? `
      <html>
        <head>
          <title>Print Google Review Poster - SDPS Patna</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              background-color: #f1f5f9;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .a4-container {
              width: 210mm;
              height: 297mm;
              background: white;
              box-sizing: border-box;
              padding: 25mm 20mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              align-items: center;
              position: relative;
              border: 12px solid #0E3B91;
            }
            .a4-inner-border {
              position: absolute;
              top: 4mm;
              left: 4mm;
              right: 4mm;
              bottom: 4mm;
              border: 2px solid #C7A15B;
              pointer-events: none;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 20px;
              width: 100%;
              border-bottom: 3px double #C7A15B;
              padding-bottom: 20px;
            }
            .logo {
              width: 80px;
              height: 80px;
              border-radius: 50%;
              border: 2px solid #0E3B91;
              padding: 2px;
            }
            .school-info {
              text-align: left;
            }
            .school-name {
              font-size: 28px;
              font-weight: 900;
              color: #0E3B91;
              margin: 0;
              letter-spacing: -0.5px;
            }
            .school-tagline {
              font-size: 12px;
              color: #C7A15B;
              font-weight: 700;
              margin: 4px 0 0 0;
              text-transform: uppercase;
              letter-spacing: 1.5px;
            }
            .main-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              flex-grow: 1;
              width: 100%;
              padding: 20px 0;
            }
            .heading {
              font-size: 38px;
              font-weight: 900;
              color: #0F172A;
              margin: 0 0 10px 0;
              text-align: center;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .stars {
              display: flex;
              gap: 8px;
              margin-bottom: 25px;
            }
            .star {
              color: #F87D0E;
              font-size: 36px;
            }
            .description {
              font-size: 15px;
              color: #475569;
              text-align: center;
              max-width: 90%;
              margin-bottom: 35px;
              line-height: 1.6;
            }
            .qr-frame {
              background: white;
              border: 4px solid #0E3B91;
              border-radius: 24px;
              padding: 24px;
              box-shadow: 0 15px 30px rgba(14, 59, 145, 0.1);
              display: flex;
              flex-direction: column;
              align-items: center;
              margin-bottom: 35px;
            }
            .qr-image {
              width: 220px;
              height: 220px;
              display: block;
            }
            .qr-caption {
              font-size: 12px;
              font-weight: 800;
              color: #0E3B91;
              text-transform: uppercase;
              margin-top: 15px;
              letter-spacing: 1.5px;
            }
            .steps-container {
              width: 100%;
              max-width: 85%;
              background: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 18px;
              padding: 20px 25px;
            }
            .steps-title {
              font-size: 13px;
              font-weight: 800;
              color: #0F172A;
              margin: 0 0 12px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
              text-align: center;
            }
            .step-item {
              font-size: 12px;
              color: #475569;
              margin-bottom: 8px;
              display: flex;
              align-items: flex-start;
              gap: 10px;
              line-height: 1.5;
              text-align: left;
            }
            .step-item:last-child {
              margin-bottom: 0;
            }
            .step-number {
              background: #0E3B91;
              color: white;
              font-weight: bold;
              font-size: 10px;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              margin-top: 1px;
            }
            .footer {
              width: 100%;
              border-top: 1px solid #E2E8F0;
              padding-top: 15px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 10px;
              color: #64748B;
              font-weight: 500;
            }
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                background: white;
                padding: 0;
              }
              .a4-container {
                border: none;
                width: 210mm;
                height: 297mm;
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="a4-container">
            <div class="a4-inner-border"></div>
            <div class="header">
              <img class="logo" src="${formattedLogo}" alt="SDPS Logo" />
              <div class="school-info">
                <div class="school-name">S.D. Public School</div>
                <div class="school-tagline">Suryamuni Devi Public School, Patna</div>
              </div>
            </div>
            
            <div class="main-content">
              <div class="heading">Share Your Experience!</div>
              <div class="stars">
                <span class="star">★</span>
                <span class="star">★</span>
                <span class="star">★</span>
                <span class="star">★</span>
                <span class="star">★</span>
              </div>
              <div class="description">
                Your feedback helps us grow and serve our students better. Scan the QR code below to quickly rate and write a Google review for our school.
              </div>
              
              <div class="qr-frame">
                <img class="qr-image" src="${qrCodeUrl}" alt="Google Review QR Code" />
                <div class="qr-caption">Scan to Rate Us</div>
              </div>
              
              <div class="steps-container">
                <div class="steps-title">How to Review in 4 Easy Steps</div>
                <div class="step-item">
                  <span class="step-number">1</span>
                  <span>Open your phone's camera and scan the QR code.</span>
                </div>
                <div class="step-item">
                  <span class="step-number">2</span>
                  <span>Choose your star rating (1 to 5 stars) on the landing page.</span>
                </div>
                <div class="step-item">
                  <span class="step-number">3</span>
                  <span>Instantly copy the generated review description tailored to your rating.</span>
                </div>
                <div class="step-item">
                  <span class="step-number">4</span>
                  <span>Paste the review directly on our Google Maps profile and submit!</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <span>📍 Maurya Colony, Kumhrar, Patna</span>
              <span>📧 helpdesk@sdpublic.org</span>
              <span>🌐 www.sdpublic.org</span>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    ` : `
      <html>
        <head>
          <title>Print QR Code Card - SDPS Patna</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 40px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 90vh;
              background-color: #f8fafc;
            }
            .card {
              width: 380px;
              background: white;
              border: 2px solid #e2e8f0;
              border-radius: 24px;
              padding: 40px 30px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
              text-align: center;
            }
            .title {
              font-size: 24px;
              font-weight: 800;
              color: #0f172a;
              margin-bottom: 8px;
              letter-spacing: -0.025em;
            }
            .subtitle {
              font-size: 13px;
              color: #64748b;
              margin-bottom: 30px;
              line-height: 1.5;
            }
            .qr-container {
              display: inline-block;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 16px;
              margin-bottom: 30px;
            }
            .qr-img {
              width: 200px;
              height: 200px;
              display: block;
            }
            .footer-text {
              font-size: 11px;
              font-weight: 700;
              color: #ff6b00;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            @media print {
              body {
                background: white;
                padding: 0;
              }
              .card {
                border: none;
                box-shadow: none;
                margin: auto;
              }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="title">Rate Us on Google!</div>
            <div class="subtitle">Scan this QR code to quickly rate and review your experience with S.D. Public School, Patna.</div>
            <div class="qr-container">
              <img class="qr-img" src="${qrCodeUrl}" alt="Review QR Code" />
            </div>
            <div class="footer-text">⭐ S.D. Public School, Patna ⭐</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadQR = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sdps_google_review_qr.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("QR Code downloaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to download QR code. You can right-click the QR image to save it.");
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Google Maps Review System
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Increase Google business ratings by printing A4 posters or reception cards for parents and visitors.
        </p>
      </div>

      {/* Tab selection */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("poster")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "poster"
              ? "bg-brand-blue text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          🖨️ QR Poster & Printables
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
            activeTab === "log"
              ? "bg-brand-blue text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          📊 Generated Log & Device Stats
        </button>
      </div>

      {activeTab === "poster" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Preview Panel */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Design Preview
              </span>
              <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setPreviewType("a4")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                    previewType === "a4" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  A4 Poster
                </button>
                <button
                  onClick={() => setPreviewType("card")}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                    previewType === "card" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Compact Card
                </button>
              </div>
            </div>

            {previewType === "a4" ? (
              <div className="w-full max-w-[340px] aspect-[1/1.414] bg-white border-[10px] border-brand-blue rounded-3xl p-5 text-center shadow-lg relative flex flex-col justify-between overflow-hidden">
                {/* Inner gold border */}
                <div className="absolute top-1.5 left-1.5 right-1.5 bottom-1.5 border-2 border-brand-gold pointer-events-none rounded-xl"></div>
                
                <div className="relative z-10 flex flex-col justify-between h-full">
                  {/* Header */}
                  <div className="flex items-center gap-2 border-b border-brand-gold/30 pb-2.5 text-left">
                    {formattedLogo ? (
                      <img
                        src={formattedLogo}
                        alt="SDPS logo"
                        className="w-10 h-10 rounded-full border border-brand-blue/30 p-0.5"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 animate-pulse border border-slate-200" />
                    )}
                    <div>
                      <div className="text-sm font-black text-brand-blue leading-none">S.D. Public School</div>
                      <div className="text-[7px] uppercase tracking-wider text-brand-gold font-bold mt-1">Suryamuni Devi Public School, Patna</div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 flex flex-col justify-center items-center py-2">
                    <h2 className="text-base font-black text-slate-900 tracking-tight leading-none mb-1">
                      SHARE YOUR EXPERIENCE!
                    </h2>
                    <div className="flex gap-0.5 mb-2.5 text-brand-orange">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                    <p className="text-[9px] text-slate-500 leading-normal max-w-[92%] mb-3.5">
                      Your feedback helps us grow. Scan the QR code below to quickly rate and review our school.
                    </p>

                    <div className="bg-white border-2 border-brand-blue rounded-2xl p-3.5 shadow-sm mb-3.5">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code"
                        className="w-28 h-28 block rounded-md"
                      />
                      <div className="text-[8px] font-black text-brand-blue uppercase tracking-widest mt-1.5 leading-none">
                        Scan to Rate Us
                      </div>
                    </div>

                    {/* Steps */}
                    <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-left space-y-1">
                      <div className="text-[8px] font-extrabold text-slate-700 uppercase tracking-wide mb-1.5 text-center">
                        How to review in 4 steps
                      </div>
                      {[
                        "Scan the QR code using your phone camera.",
                        "Choose your star rating (1-5 stars).",
                        "Copy the generated review description.",
                        "Paste the review directly on Google Maps!",
                      ].map((step, idx) => (
                        <div key={idx} className="flex gap-1.5 items-start text-[7px] leading-tight text-slate-600">
                          <span className="bg-brand-blue text-white text-[7px] font-bold w-3 h-3 rounded-full flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-[7px] text-slate-400 font-semibold">
                    <span>📍 Kumhrar, Patna</span>
                    <span>📧 helpdesk@sdpublic.org</span>
                    <span>🌐 www.sdpublic.org</span>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="w-full max-w-[340px] bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg transition-transform hover:scale-[1.01]"
              >
                <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">
                  Rate Us on Google!
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">
                  Scan this QR code to quickly rate and review your experience with S.D. Public School, Patna.
                </p>
                <div className="inline-block bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code Preview"
                    className="w-48 h-48 block mx-auto rounded-lg"
                  />
                </div>
                <div className="text-[10px] font-bold text-brand-orange uppercase tracking-widest flex items-center justify-center gap-1.5">
                  <Star className="w-3 h-3 fill-current" /> S.D. Public School, Patna <Star className="w-3 h-3 fill-current" />
                </div>
              </div>
            )}
          </div>

          {/* Configurations & Instructions */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
              System Actions & Info
            </span>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div>
                <h3 className="text-base font-bold text-slate-800 mb-3">Print Actions</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePrint("a4")}
                      className="px-4 py-3 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                    >
                      <Printer className="w-4 h-4" /> Print A4 Poster (Ready to Hang)
                    </button>
                    <button
                      onClick={() => handlePrint("card")}
                      className="px-4 py-3 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                    >
                      <Printer className="w-4 h-4" /> Print Reception Card (3.5" x 5")
                    </button>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleDownloadQR}
                      className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                    >
                      <Download className="w-4 h-4" /> Download QR
                    </button>
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Hello! Please take a moment to share your feedback and review S.D. Public School, Kumhrar, Patna. Scan or click the link to rate us: ${reviewUrl}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-semibold rounded-xl shadow-md flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.455h.008c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>WhatsApp</span>
                    </a>
                    <a
                      href={reviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition-all"
                    >
                      Visit Page <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-base font-bold text-slate-800 mb-3">Public Portal Link</h3>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-3 select-all text-xs font-mono text-slate-600">
                  <QrCode className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{reviewUrl}</span>
                </div>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-5 flex gap-4">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-blue-800 space-y-2">
                <h4 className="font-bold text-blue-900">How the Review System Works:</h4>
                <p>
                  1. **Scan QR Code:** When parents, students, or visitors scan this QR code, they are taken to the dynamic review hub on your website.
                </p>
                <p>
                  2. **Choose Star Rating:** They select a rating from 1 to 5 stars depending on their experience.
                </p>
                <p>
                  3. **Draft Generation:** The page uses your configured **Groq Key** to instantly write a unique, natural-sounding, short review matching their selected star rating. Because it is generated dynamically with randomness, no two reviews are ever the same.
                </p>
                <p>
                  4. **Copy & Paste on Google:** The system copies the generated text to the clipboard and redirects them to the school's Google Maps review page. They just paste the text and submit.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "log" && (
        <div className="space-y-6">
          {/* KPI Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Generated</span>
                <span className="text-3xl font-black text-slate-900 mt-1 block">{stats?.total || 0}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Activity className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mobile vs Desktop</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  📱 {stats?.devices?.Mobile || 0} / 💻 {stats?.devices?.Desktop || 0}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rating Split</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  5★: {stats?.ratings?.["5"] || 0} / 4★: {stats?.ratings?.["4"] || 0}
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-600">
                <Star className="w-5 h-5 fill-current" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Unique IPs</span>
                <span className="text-3xl font-black text-slate-900 mt-1 block">{stats?.top_ips?.length || 0}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left side: Generated reviews log */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Generated Reviews List</h3>
                  <p className="text-xs text-slate-500">History of unique reviews generated by visitors</p>
                </div>
                <button
                  onClick={fetchReviewsAndStats}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search review content..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-transparent bg-slate-50"
                  />
                </div>
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none bg-slate-50 text-slate-600 font-semibold"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars only</option>
                  <option value="4">4 Stars only</option>
                </select>
              </div>

              {/* Log List */}
              {loadingLog ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
                </div>
              ) : filteredReviews.length === 0 ? (
                <p className="text-center text-xs text-slate-400 italic py-12">No matching reviews generated yet.</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {filteredReviews.map((rev) => (
                    <div key={rev.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 space-y-3 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-brand-orange fill-current" />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {new Date(rev.created_at).toLocaleString()}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-700 leading-relaxed pr-8 font-sans">{rev.text}</p>
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-200 px-2 py-0.5 rounded font-mono text-slate-600">IP: {rev.ip || "unknown"}</span>
                          <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-600">{rev.device || "Other"} ({rev.os || "Other"})</span>
                        </div>
                        <button
                          onClick={() => handleCopyText(rev.text)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg shadow-sm font-semibold transition"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right side: IP Device Stats and audits */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">IP Generation Leaderboard</h3>
                  <p className="text-xs text-slate-500">Find top source IPs generating reviews</p>
                </div>
                {loadingLog ? (
                  <div className="animate-pulse space-y-2 py-4">
                    <div className="h-6 bg-slate-100 rounded"></div>
                    <div className="h-6 bg-slate-100 rounded"></div>
                    <div className="h-6 bg-slate-100 rounded"></div>
                  </div>
                ) : !stats || stats.top_ips?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No IP data recorded yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {stats.top_ips.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-slate-700">{item.ip}</span>
                        </div>
                        <span className="bg-brand-orange/15 text-brand-orange font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {item.count} review{item.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Help & Audit Policy Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex gap-3">
                <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-slate-600 space-y-2">
                  <h4 className="font-bold text-slate-700">Audit & Spam Warning</h4>
                  <p>
                    If you see many reviews generated from the same IP address (e.g. more than 5-10 reviews in a short time), it may indicate a single device or user repeatedly hitting the generator.
                  </p>
                  <p>
                    Google Maps has strict spam detection and might block reviews originating from the exact same device/network if posted too rapidly. Monitor this dashboard to ensure organic review pacing!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminMapsReview;

