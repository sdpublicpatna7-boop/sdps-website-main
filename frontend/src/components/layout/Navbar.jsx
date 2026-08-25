import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, X, ChevronDown, Phone, Mail } from "lucide-react";
import { optimizeCloudinary, parseImageTransform } from "@/lib/api";
import AdmissionBanner from "./AdmissionBanner";

const NAV = [
  { label: "Home", to: "/" },
  {
    label: "About",
    to: "/about",
    children: [
      { label: "About Us", to: "/about" },
      { label: "Administration Message", to: "/administration-message" },
      { label: "Demystified", to: "/demystified" },
    ],
  },
  {
    label: "Academics",
    to: "/academics",
    children: [
      { label: "Curriculum", to: "/academics" },
      { label: "Pre-School (Tiny Tots)", to: "/preschool" },
      { label: "Fee Structure", to: "/fee-structure" },
    ],
  },
  {
    label: "Admissions",
    to: "/admissions",
    children: [
      { label: "Admission Process", to: "/admissions" },
      { label: "Admission Eligibility", to: "/admission-eligibility" },
      { label: "Admission Enquiry", to: "/admission-enquiry" },
    ],
  },
  {
    label: "Campus Life",
    children: [
      { label: "Student Council", to: "/student-council" },
      { label: "News & Events", to: "/news" },
      { label: "Academic Calendar", to: "/calendar" },
      { label: "Notices & Circulars", to: "/notices" },
      { label: "Photo Gallery", to: "/gallery" },
      { label: "Videos", to: "/videos" },
      { label: "Hostel Facility", to: "/hostel" },
      { label: "House System", to: "/house-system" },
      { label: "SDPS × Khelo Patna", to: "/khelo-patna" },
    ],
  },
  {
    label: "Contact",
    children: [
      { label: "Contact Us", to: "/contact" },
      { label: "Alumni Network", to: "/alumni" },
      { label: "Careers", to: "/careers" },
    ],
  },
];

export default function Navbar({ settings, hideAdmissionBanner = false }) {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const logoUrl = settings?.logo_url || "";
  const { style: logoStyle, cleanUrl: cleanLogoUrl } = parseImageTransform(logoUrl);
  const rawLogo = cleanLogoUrl
    ? (cleanLogoUrl.startsWith("http") ? cleanLogoUrl : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanLogoUrl}`)
    : "";
  const formattedLogo = optimizeCloudinary(rawLogo, 120);

  return (
    <header className="sticky top-0 z-40">
      {/* Admission season announcement (settings-driven, dismissible) */}
      {!hideAdmissionBanner && <AdmissionBanner settings={settings} />}
      {/* Top utility bar */}
      <div className="bg-brand-blue-dark text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 opacity-90">
            <a href={`tel:${settings?.phone_primary || "+919955190262"}`} className="flex items-center gap-1.5 hover:text-brand-orange-light">
              <Phone className="w-3.5 h-3.5" /> {settings?.phone_primary || "+91 99551 90262"}
            </a>
            <a href={`mailto:${settings?.email || "helpdesk@sdpublic.org"}`} className="hidden sm:flex items-center gap-1.5 hover:text-brand-orange-light">
              <Mail className="w-3.5 h-3.5" /> {settings?.email || "helpdesk@sdpublic.org"}
            </a>
          </div>
          <div className="flex items-center gap-2" data-testid="quick-actions">
            <a
              href={settings?.erp_url || "https://sdpublic.gungunerp.in"}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition border border-white/20"
              data-testid="erp-login-btn"
            >
              ERP Login
            </a>
            <Link
              to="/fee-payment"
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition border border-white/20"
              data-testid="fee-payment-btn"
            >
              Fee Payment
            </Link>
            <Link
              to="/admission-enquiry"
              className="px-3 py-1.5 rounded-full bg-white text-brand-blue hover:bg-brand-gold-light transition"
              data-testid="admission-enquiry-btn"
            >
              Enquire Now
            </Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="glass-card border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3" data-testid="brand-logo-link">
            {formattedLogo ? (
              <div className="w-12 h-12 rounded-full ring-1 ring-brand-gold/40 overflow-hidden p-0.5 bg-white flex items-center justify-center relative shrink-0">
                <img
                  src={formattedLogo}
                  alt="SDPS"
                  style={logoStyle}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-slate-200/40 animate-pulse border border-white/10" />
            )}
            <div className="leading-tight">
              <div className="font-legacy text-2xl text-brand-blue">S.D. Public School</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-brand-orange font-headline">
                Empowering Generations Since 1994
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 font-headline text-sm">
            {NAV.map((item) =>
              item.children ? (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenMenu(item.label)}
                  onMouseLeave={() => setOpenMenu(null)}
                >
                  <button
                    className="px-3 py-2 rounded-full hover:bg-white/60 transition flex items-center gap-1"
                    data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    {item.label} <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {openMenu === item.label && (
                    <div className="absolute top-full left-0 pt-2">
                      <div className="glass-card rounded-2xl p-2 min-w-[200px] shadow-xl">
                        {item.children.map((c) => (
                          <NavLink
                            key={c.to + c.label}
                            to={c.to}
                            className={({ isActive }) =>
                              `block px-3 py-2 rounded-xl transition text-sm ${
                                isActive ? "bg-brand-blue text-white" : "hover:bg-brand-paper text-brand-ink"
                              }`
                            }
                          >
                            {c.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-full hover:bg-white/60 transition ${
                      isActive ? "text-brand-orange font-semibold" : "text-brand-ink"
                    }`
                  }
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/admissions"
              className="hidden sm:inline-block px-5 py-2.5 rounded-full bg-brand-orange text-white font-headline text-sm hover:bg-orange-600 transition shadow-md shadow-brand-orange/20"
              data-testid="header-admissions-btn"
            >
              Admissions Open
            </Link>
            <button
              onClick={() => setOpen(!open)}
              className="lg:hidden p-2 rounded-full hover:bg-white/60 text-brand-blue"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="lg:hidden glass-card border-b border-black/5 p-4 max-h-[80vh] overflow-y-auto">
          <nav className="flex flex-col gap-1 font-headline">
            {NAV.map((item) =>
              item.children ? (
                <div key={item.label} className="border-b border-black/5 pb-2 mb-2">
                  <div className="px-3 py-1 text-xs uppercase tracking-widest text-brand-orange font-bold">
                    {item.label}
                  </div>
                  {item.children.map((c) => (
                    <NavLink
                      key={c.to + c.label}
                      to={c.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `block px-4 py-2 rounded-lg text-sm ${
                          isActive ? "bg-brand-blue text-white" : "hover:bg-white text-brand-ink"
                        }`
                      }
                    >
                      {c.label}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm ${
                      isActive ? "bg-brand-blue text-white" : "hover:bg-white text-brand-ink"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              )
            )}
            <Link
              to="/admissions"
              onClick={() => setOpen(false)}
              className="mt-3 block text-center px-4 py-3 rounded-xl bg-brand-orange text-white font-bold"
            >
              Apply for Admission
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
