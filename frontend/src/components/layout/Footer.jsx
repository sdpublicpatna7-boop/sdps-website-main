import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Youtube, Instagram, Facebook } from "lucide-react";

export default function Footer({ settings }) {
  const s = settings || {};
  return (
    <footer className="bg-gradient-to-br from-brand-blue-dark via-brand-blue to-brand-blue-light text-white relative overflow-hidden grain">
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-orange/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-brand-lotus/15 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <div className="flex items-center gap-3 mb-4">
            <img src="https://sdpublic.org/assets/img/logo.png" alt="SDPS" className="w-14 h-14 rounded-full ring-2 ring-brand-gold" />
            <div>
              <div className="font-legacy text-3xl">S.D. Public School</div>
              <div className="text-xs tracking-widest opacity-80">EMPOWERING GENERATIONS</div>
            </div>
          </div>
          <p className="text-sm opacity-80 leading-relaxed">
            "Suryamuni Devi Public School", established 13-11-1994, operated by The Suryamuni Devi Foundation Trust.
          </p>
          <div className="flex gap-3 mt-5">
            {s.youtube_channel && (
              <a href={s.youtube_channel} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-brand-orange transition" data-testid="social-youtube">
                <Youtube className="w-4 h-4" />
              </a>
            )}
            {s.instagram_url && (
              <a href={s.instagram_url} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-brand-orange transition" data-testid="social-instagram">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {s.facebook_url && (
              <a href={s.facebook_url} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-white/10 hover:bg-brand-orange transition" data-testid="social-facebook">
                <Facebook className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        <div className="md:col-span-3">
          <h4 className="text-sm uppercase tracking-[0.2em] text-brand-orange-light mb-4 font-headline">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">About</Link></li>
            <li><Link to="/academics" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Academics</Link></li>
            <li><Link to="/admissions" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Admissions</Link></li>
            <li><Link to="/gallery" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Gallery</Link></li>
            <li><Link to="/student-council" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Student Council</Link></li>
            <li><Link to="/alumni" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Alumni</Link></li>
          </ul>
        </div>

        <div className="md:col-span-3">
          <h4 className="text-sm uppercase tracking-[0.2em] text-brand-orange-light mb-4 font-headline">Services</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/tc-download" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Download TC</Link></li>
            <li><Link to="/fee-payment" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Fee Payment</Link></li>
            <li><Link to="/careers" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Careers</Link></li>
            <li><Link to="/admission-enquiry" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">Admission Enquiry</Link></li>
            <li><a href={s.erp_url} target="_blank" rel="noreferrer" className="opacity-80 hover:opacity-100 hover:text-brand-orange-light">ERP Login</a></li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="text-sm uppercase tracking-[0.2em] text-brand-orange-light mb-4 font-headline">Get in Touch</h4>
          <div className="space-y-3 text-sm opacity-90">
            <div className="flex gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" /> {s.address || "Maurya Colony, Gulzarbagh Road, Patna 800007"}</div>
            <div className="flex gap-2"><Phone className="w-4 h-4 mt-0.5 shrink-0" /> {s.phone_primary || "+91 99551 90262"}</div>
            <div className="flex gap-2"><Mail className="w-4 h-4 mt-0.5 shrink-0" /> {s.email || "helpdesk@sdpublic.org"}</div>
          </div>
          {s.play_store_url && (
            <a href={s.play_store_url} target="_blank" rel="noreferrer" className="mt-4 inline-block">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                alt="Play Store"
                className="h-10"
              />
            </a>
          )}
        </div>
      </div>

      <div className="border-t border-white/10 py-5 text-center text-xs opacity-70">
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <span>© {new Date().getFullYear()} S.D. Public School. All Rights Reserved.</span>
          <span className="hidden sm:inline opacity-40">|</span>
          <a href="/terms" className="hover:opacity-100 hover:underline transition">Terms & Conditions</a>
          <span className="opacity-40">|</span>
          <a href="/privacy" className="hover:opacity-100 hover:underline transition">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}
