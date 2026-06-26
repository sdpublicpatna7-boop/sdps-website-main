import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { Menu, X, ChevronDown, Phone, Mail } from "lucide-react";
import { optimizeCloudinary } from "@/lib/api";

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
      { label: "Fee Structure", to: "/fee-structure" },
      { label: "Admission Eligibility", to: "/admission-eligibility" },
    ],
  },
  { label: "Pre-School", to: "/preschool" },
  { label: "Admissions", to: "/admissions" },
  {
    label: "Campus Life",
    children: [
      { label: "House System", to: "/house-system" },
      { label: "Hostel", to: "/hostel" },
      { label: "Student Council", to: "/student-council" },
      { label: "Gallery", to: "/gallery" },
      { label: "Videos", to: "/videos" },
      { label: "SDPS × Khelo Patna", to: "/khelo-patna" },
    ],
  },
  {
    label: "Updates",
    children: [
      { label: "News", to: "/news" },
      { label: "Notices", to: "/notices" },
      { label: "Calendar", to: "/calendar" },
    ],
  },
  { label: "Career", to: "/careers" },
  { label: "Alumni", to: "/alumni" },
  { label: "Contact", to: "/contact" },
];

export default function Navbar({ settings }) {
  const [open, setOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const logoUrl = settings?.logo_url || "";
  const rawLogo = logoUrl
    ? (logoUrl.startsWith("http") ? logoUrl : `${process.env.REACT_APP_BACKEND_URL || ""}${logoUrl}`)
    : "";
  const formattedLogo = optimizeCloudinary(rawLogo, 120);

  return (
    <header className="sticky top-0 z-40">
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
              className="px-3 py-1.5 rounded-full bg-brand-orange hover:bg-orange-600 transition"
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
              <img
                src={formattedLogo}
                alt="SDPS"
                className="w-12 h-12 rounded-full ring-1 ring-brand-gold/40 object-contain p-0.5 bg-white"
              />
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
                            key={c.to}
                            to={c.to}
                            className={({ isActive }) =>
                              `block px-4 py-2 rounded-xl hover:bg-brand-orange/10 ${isActive ? "text-brand-orange" : "text-brand-ink"}`
                            }
                            data-testid={`nav-sub-${c.label.toLowerCase().replace(" ", "-")}`}
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
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-full hover:bg-white/60 transition ${isActive ? "text-brand-orange font-semibold" : ""}`
                  }
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  {item.label}
                </NavLink>
              )
            )}
          </nav>

          <button
            className="lg:hidden p-2 rounded-full bg-white/70 border border-black/5"
            onClick={() => setOpen(!open)}
            data-testid="mobile-menu-toggle"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="lg:hidden border-t border-black/5 px-4 py-4 bg-white/95 max-h-[70vh] overflow-y-auto" data-testid="mobile-menu">
            {NAV.map((item) =>
              item.children ? (
                <div key={item.label} className="py-2">
                  <div className="text-xs uppercase tracking-widest text-brand-orange font-bold mb-1">{item.label}</div>
                  {item.children.map((c) => (
                    <Link key={c.to} to={c.to} onClick={() => setOpen(false)} className="block py-1.5 pl-2 text-sm">
                      {c.label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className="block py-2 font-medium">
                  {item.label}
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </header>
  );
}
