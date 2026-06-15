import { useState, useRef } from "react";
import { QrCode, Printer, Download, ExternalLink, Info, Star } from "lucide-react";
import { toast } from "sonner";

export function AdminMapsReview() {
  const reviewUrl = `${window.location.origin}/review`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(reviewUrl)}`;
  const cardRef = useRef(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented printing. Please enable popups.");
      return;
    }

    printWindow.document.write(`
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
    `);
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
          Increase Google business ratings by printing a QR code card for receptions, PTMs, and circulars.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Preview Card */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 self-start">
            Printable Card Preview
          </span>
          <div
            ref={cardRef}
            className="w-full max-w-[360px] bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg transition-transform hover:scale-[1.01]"
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
        </div>

        {/* Configurations & Instructions */}
        <div className="lg:col-span-7 space-y-6">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
            System Actions & Info
          </span>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 mb-2">Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                >
                  <Printer className="w-4 h-4" /> Print Review Card
                </button>
                <button
                  onClick={handleDownloadQR}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                >
                  <Download className="w-4 h-4" /> Download QR Code Only
                </button>
                <a
                  href={reviewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-2 transition-all"
                >
                  Visit Public Page <ExternalLink className="w-3.5 h-3.5" />
                </a>
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
              <h4 className="font-bold text-blue-900">How the AI Review System Works:</h4>
              <p>
                1. **Scan QR Code:** When parents, students, or visitors scan this QR code, they are taken to the dynamic review hub on your website.
              </p>
              <p>
                2. **Choose Star Rating:** They select a rating from 1 to 5 stars depending on their experience.
              </p>
              <p>
                3. **AI Generation:** The page uses your configured **Groq AI Key** to instantly write a unique, natural-sounding, short review matching their selected star rating. Because it is generated dynamically with randomness, no two reviews are ever the same.
              </p>
              <p>
                4. **Copy & Paste on Google:** The system copies the generated text to the clipboard and redirects them to the school's Google Maps review page. They just paste the text and submit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminMapsReview;
