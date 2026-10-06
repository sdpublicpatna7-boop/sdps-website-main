import React, { useState } from 'react';
import { Calendar, Download, ExternalLink, Sparkles, Check, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { getBackendUrl } from '@/lib/api';

/**
 * Generates direct Google Calendar web event URL
 */
function makeGoogleCalendarUrl(bookingId, booking = {}) {
  const title = encodeURIComponent(`🎆 Navrang 2026 Dandiya Night - Pass: ${bookingId}`);
  // Date: October 15, 2026, 17:30 IST to 22:00 IST (UTC: 12:00 to 16:30)
  const dates = "20261015T120000Z/20261015T163000Z";
  const parentName = booking?.parent_name || "Valued Guest";
  const pkg = booking?.package || "Dandiya Night";
  const qrToken = booking?.qr_token || bookingId;
  const details = encodeURIComponent(
    `Navrang 2026 Dandiya Night Official Event Entry Pass\n\n` +
    `Booking ID: ${bookingId}\n` +
    `Holder: ${parentName}\n` +
    `Package: ${pkg}\n` +
    `QR Token: ${qrToken}\n\n` +
    `View Live Pass: https://navrang.sdpublic.org/my-ticket\n` +
    `Venue: S.D. Public School, Maurya Colony, Near R.O.B Kumhrar, Patna 800007\n` +
    `Helpdesk: +91 99551 90262`
  );
  const location = encodeURIComponent("S.D. Public School, Maurya Colony, Near R.O.B Kumhrar, Patna 800007");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}

export default function WalletPassButton({ bookingId, booking = {}, compact = false, className = "" }) {
  const [downloading, setDownloading] = useState(null);
  const [showCalendarMenu, setShowCalendarMenu] = useState(false);

  if (!bookingId) return null;

  const getPassDownloadUrl = (type) => {
    const base = getBackendUrl() || "";
    return `${base}/api/navrang/pass/${type}/${encodeURIComponent(bookingId)}`;
  };

  const handleDownloadPass = (type, label) => {
    try {
      setDownloading(type);
      toast.info(`Preparing ${label}...`, { duration: 2500 });
      const passUrl = getPassDownloadUrl(type);
      
      // Use hidden link click for native browser/wallet handling
      const a = document.createElement('a');
      a.href = passUrl;
      a.download = `Navrang_Pass_${bookingId}.${type === 'calendar' ? 'ics' : 'pkpass'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => {
        setDownloading(null);
        toast.success(`${label} ready! Open with your Wallet app.`);
      }, 1000);
    } catch (err) {
      setDownloading(null);
      toast.error(`Could not download ${label}. Please try again.`);
    }
  };

  const handleOpenGoogleCalendar = () => {
    const url = makeGoogleCalendarUrl(bookingId, booking);
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowCalendarMenu(false);
    toast.success("Opening Google Calendar...");
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex flex-wrap items-center gap-2">
          {/* Apple Wallet Badge */}
          <button
            type="button"
            onClick={() => handleDownloadPass('apple', 'Apple Wallet Pass')}
            disabled={downloading === 'apple'}
            title="Add pass to Apple Wallet (iPhone / Apple Watch)"
            className="inline-flex items-center gap-1.5 bg-black hover:bg-neutral-800 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60 active:scale-95"
          >
            {/* Apple Icon */}
            <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.77-11.71-14.19-5.75-8.91-10.27-18.7-13.56-29.36-3.29-10.66-4.94-21.05-4.94-31.18 0-14.13 3.69-25.75 11.06-34.86 7.37-9.11 16.59-13.72 27.66-13.83 5.44 0 11.45 1.52 18.03 4.56 6.58 3.04 10.97 4.62 13.16 4.73 1.74-.11 6.35-1.74 13.83-4.9 7.48-3.15 13.43-4.56 17.86-4.24 13.6.87 24.32 5.92 32.17 15.16-11.97 7.28-17.84 17.28-17.61 30 0 10 3.8 18.42 11.41 25.27 7.61 6.85 16.96 10.65 28.05 11.41-2.4 7.28-5.44 14.78-9.12 22.5zM119.22 31.02c0-7.39 2.66-14.35 7.99-20.87 5.33-6.52 11.96-10.54 19.89-12.06.33 1.2.49 2.45.49 3.75 0 7.28-2.77 14.35-8.32 21.2-5.54 6.85-12.39 10.87-20.54 12.06.32-1.3.49-2.66.49-4.08z" />
            </svg>
            <span>Apple Wallet</span>
          </button>

          {/* Google Wallet Badge */}
          <button
            type="button"
            onClick={() => handleDownloadPass('google', 'Google Wallet Pass')}
            disabled={downloading === 'google'}
            title="Add pass to Google Wallet (Android / Pixel)"
            className="inline-flex items-center gap-1.5 bg-[#1F1F1F] hover:bg-black text-white px-3 py-1.5 rounded-xl text-xs font-semibold border border-neutral-700/80 shadow-xs transition-all cursor-pointer disabled:opacity-60 active:scale-95"
          >
            {/* Google Wallet 4-color icon */}
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.99 1-1.72V9c0-.73-.41-1.37-1-1.72z" fill="#34A853" />
              <path d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v2.5h16.5c.6 0 1.1.3 1.5.78z" fill="#4285F4" />
              <path d="M20 9H13c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h7c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1zm-4.5 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" fill="#FBBC05" />
              <circle cx="15.5" cy="11.5" r="1" fill="#EA4335" />
            </svg>
            <span>Google Wallet</span>
          </button>

          {/* Samsung Wallet Badge */}
          <button
            type="button"
            onClick={() => handleDownloadPass('samsung', 'Samsung Wallet Pass')}
            disabled={downloading === 'samsung'}
            title="Add pass to Samsung Wallet (Galaxy phones & Watch)"
            className="inline-flex items-center gap-1.5 bg-[#0654BA] hover:bg-[#003c8f] text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60 active:scale-95"
          >
            <span className="font-black text-[11px] tracking-tight bg-white text-[#0654BA] px-1 py-0.2 rounded font-mono">S</span>
            <span>Samsung Wallet</span>
          </button>

          {/* Calendar Dropdown Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCalendarMenu(!showCalendarMenu)}
              title="Add event to Calendar (Google, Apple, Samsung)"
              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-slate-300 shadow-2xs transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>Calendar</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showCalendarMenu ? 'rotate-180' : ''}`} />
            </button>

            {showCalendarMenu && (
              <div className="absolute right-0 bottom-full mb-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs">
                <button
                  type="button"
                  onClick={handleOpenGoogleCalendar}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 text-slate-800 flex items-center justify-between font-medium cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> Google Calendar
                  </span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCalendarMenu(false);
                    handleDownloadPass('calendar', 'Calendar Event (.ics)');
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50 text-slate-800 flex items-center justify-between font-medium cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Apple / Samsung (.ics)
                  </span>
                  <Download className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full / Featured View (Confirmation page or dedicated pass view)
  return (
    <div className={`bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-purple-500/20 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Digital Mobile Pass</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Add Pass to Mobile Wallet
          </h4>
          <p className="text-xs text-purple-200/80 mt-0.5">
            Store your Navrang 2026 pass offline on your phone for quick lock-screen gate check-in.
          </p>
        </div>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Apple Wallet Badge */}
        <button
          type="button"
          onClick={() => handleDownloadPass('apple', 'Apple Wallet Pass')}
          disabled={downloading === 'apple'}
          className="group flex items-center gap-3 bg-black hover:bg-neutral-800 active:scale-98 border border-white/20 p-3 rounded-2xl transition-all cursor-pointer shadow-md text-left disabled:opacity-60"
        >
          <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 170 170">
              <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.6-7.77-11.71-14.19-5.75-8.91-10.27-18.7-13.56-29.36-3.29-10.66-4.94-21.05-4.94-31.18 0-14.13 3.69-25.75 11.06-34.86 7.37-9.11 16.59-13.72 27.66-13.83 5.44 0 11.45 1.52 18.03 4.56 6.58 3.04 10.97 4.62 13.16 4.73 1.74-.11 6.35-1.74 13.83-4.9 7.48-3.15 13.43-4.56 17.86-4.24 13.6.87 24.32 5.92 32.17 15.16-11.97 7.28-17.84 17.28-17.61 30 0 10 3.8 18.42 11.41 25.27 7.61 6.85 16.96 10.65 28.05 11.41-2.4 7.28-5.44 14.78-9.12 22.5zM119.22 31.02c0-7.39 2.66-14.35 7.99-20.87 5.33-6.52 11.96-10.54 19.89-12.06.33 1.2.49 2.45.49 3.75 0 7.28-2.77 14.35-8.32 21.2-5.54 6.85-12.39 10.87-20.54 12.06.32-1.3.49-2.66.49-4.08z" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Add to</div>
            <div className="text-xs sm:text-sm font-extrabold text-white leading-tight">Apple Wallet</div>
            <div className="text-[10px] text-neutral-400 truncate">iPhone & Watch</div>
          </div>
        </button>

        {/* Google Wallet Badge */}
        <button
          type="button"
          onClick={() => handleDownloadPass('google', 'Google Wallet Pass')}
          disabled={downloading === 'google'}
          className="group flex items-center gap-3 bg-[#1A1A1A] hover:bg-neutral-800 active:scale-98 border border-neutral-700/80 p-3 rounded-2xl transition-all cursor-pointer shadow-md text-left disabled:opacity-60"
        >
          <div className="w-9 h-9 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
              <path d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.28c.59-.35 1-.99 1-1.72V9c0-.73-.41-1.37-1-1.72z" fill="#34A853" />
              <path d="M21 7.28V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v2.5h16.5c.6 0 1.1.3 1.5.78z" fill="#4285F4" />
              <path d="M20 9H13c-.55 0-1 .45-1 1v4c0 .55.45 1 1 1h7c.55 0 1-.45 1-1v-4c0-.55-.45-1-1-1zm-4.5 3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" fill="#FBBC05" />
              <circle cx="15.5" cy="11.5" r="1" fill="#EA4335" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Save to</div>
            <div className="text-xs sm:text-sm font-extrabold text-white leading-tight">Google Wallet</div>
            <div className="text-[10px] text-neutral-400 truncate">Android & Pixel</div>
          </div>
        </button>

        {/* Samsung Wallet Badge */}
        <button
          type="button"
          onClick={() => handleDownloadPass('samsung', 'Samsung Wallet Pass')}
          disabled={downloading === 'samsung'}
          className="group flex items-center gap-3 bg-[#0654BA] hover:bg-[#003c8f] active:scale-98 border border-blue-400/30 p-3 rounded-2xl transition-all cursor-pointer shadow-md text-left disabled:opacity-60"
        >
          <div className="w-9 h-9 rounded-xl bg-[#033c87] border border-blue-300/30 flex items-center justify-center shrink-0">
            <span className="font-black text-sm tracking-tight text-white font-mono">S</span>
          </div>
          <div className="min-w-0">
            <div className="text-[10px] uppercase font-bold text-blue-200 tracking-wider">Add to</div>
            <div className="text-xs sm:text-sm font-extrabold text-white leading-tight">Samsung Wallet</div>
            <div className="text-[10px] text-blue-200/80 truncate">Galaxy Devices</div>
          </div>
        </button>
      </div>

      {/* Calendar & Extras Bar */}
      <div className="mt-3.5 pt-3 border-t border-purple-500/20 flex flex-wrap items-center justify-between gap-2.5 text-xs text-purple-200/90">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Also sync reminder:</span>
          <button
            type="button"
            onClick={handleOpenGoogleCalendar}
            className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3 h-3 text-amber-300" />
            <span>Google Calendar</span>
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPass('calendar', 'Calendar Event (.ics)')}
            className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3 text-amber-300" />
            <span>.ICS File</span>
          </button>
        </div>

        <div className="text-[11px] text-amber-300/90 font-medium">
          🔔 Automatic 2-hour event alarm included
        </div>
      </div>
    </div>
  );
}
