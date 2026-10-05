import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Phone, Mail, Ticket, Sparkles, Menu, X, ArrowLeft, Calendar, ShieldCheck, Home } from "lucide-react";
import ToranGarland from "@/components/festive/ToranGarland";

const navLinks = [
  { id: "details", label: "Overview" },
  { id: "packages", label: "Packages" },
  { id: "how-it-works", label: "How It Works" },
  { id: "rules", label: "Rules & Entry" },
];

export default function NavrangNavbar({ activePage = "home" }) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const headerRef = useRef(null);

  const isSubdomain = typeof window !== "undefined" && (
    window.location.hostname.startsWith("navrang.") ||
    window.location.hostname.startsWith("navrang-") ||
    window.location.hostname === "navrang.localhost"
  );
  const landingPath = isSubdomain ? "/" : "/navrang";
  const isLanding = location.pathname === "/" || location.pathname === "/navrang";

  const resolvePath = (path) => {
    if (isSubdomain) return path;
    if (path === "/") return "/navrang";
    return path.startsWith("/navrang") ? path : `/navrang${path}`;
  };

  const scrollToSection = useCallback((id) => {
    if (!id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(id);
    if (!el) return;
    const headerH = headerRef.current ? headerRef.current.offsetHeight : 0;
    const top = el.getBoundingClientRect().top + window.scrollY - (headerH - 24);
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  const go = (e, id) => {
    e.preventDefault();
    setOpen(false);
    if (isLanding) {
      scrollToSection(id);
      window.history.replaceState(null, "", id ? `${landingPath}#${id}` : landingPath);
      if (!id) setActiveId(null);
    } else {
      navigate(landingPath, { state: { scrollTo: id } });
    }
  };

  // Scroll after arriving from another page (or on direct hash load)
  useEffect(() => {
    if (!isLanding) return;
    const target = location.state?.scrollTo || (location.hash ? location.hash.slice(1) : null);
    if (!target) return;
    const t = setTimeout(() => scrollToSection(target), 350);
    return () => clearTimeout(t);
  }, [location.key, isLanding, scrollToSection]);

  // Scroll-spy
  useEffect(() => {
    if (!isLanding) {
      setActiveId(null);
      return;
    }
    const onScroll = () => {
      const headerH = headerRef.current ? headerRef.current.offsetHeight : 0;
      const probe = window.scrollY + headerH + 80;
      let current = null;
      for (const l of navLinks) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= probe) current = l.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        current = navLinks[navLinks.length - 1].id;
      }
      setActiveId(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isLanding]);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 shadow-md">
      {/* Top utility bar — identical to school's original dark-navy topbar */}
      <div className="bg-brand-blue-dark text-white text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 opacity-90">
            <a href="tel:+919955190262" className="flex items-center gap-1.5 hover:text-brand-orange-light transition">
              <Phone className="w-3.5 h-3.5 text-brand-orange-light" />
              <span>+91 99551 90262</span>
            </a>
            <a href="mailto:helpdesk@sdpublic.org" className="hidden sm:flex items-center gap-1.5 hover:text-brand-orange-light transition">
              <Mail className="w-3.5 h-3.5 text-brand-orange-light" />
              <span>helpdesk@sdpublic.org</span>
            </a>
            <span className="hidden md:inline-flex items-center gap-1 text-amber-300/90 font-medium pl-2 border-l border-white/20">
              🎆 Navrang 2026 • Dandiya & Durga Puja Celebration Night
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://sdpublic.org"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 transition border border-white/20 text-white flex items-center gap-1 text-xs"
            >
              <Home className="w-3 h-3" />
              <span className="hidden sm:inline">School</span> Main Site
            </a>
            <Link
              to={resolvePath("/my-ticket")}
              className={`px-3 py-1 rounded-full transition border text-xs flex items-center gap-1 ${
                location.pathname.includes("my-ticket")
                  ? "bg-amber-400 text-slate-950 border-amber-300 font-semibold"
                  : "bg-white/10 hover:bg-white/20 border-white/20 text-white"
              }`}
            >
              <Ticket className="w-3 h-3" />
              <span>My Tickets</span>
            </Link>
            <Link
              to={resolvePath("/book")}
              className="px-3.5 py-1 rounded-full bg-brand-orange hover:bg-orange-600 transition text-white font-semibold flex items-center gap-1 text-xs shadow-sm"
            >
              <Sparkles className="w-3 h-3" />
              <span>Book Now</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main navigation bar — matching original school navbar styling with glass card */}
      <div className="bg-white/95 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* School Brand Logo & Title */}
          <Link to={resolvePath("/")} className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-full ring-2 ring-brand-gold/50 overflow-hidden p-0.5 bg-white flex items-center justify-center relative shrink-0 shadow-sm transition-transform group-hover:scale-105">
              <img
                src="https://res.cloudinary.com/drx3kb809/image/upload/q_auto,f_auto,w_120/v1782313772/sdps/misc/hffxigjkpw7cbc7cmdm5.jpg"
                alt="S.D. Public School"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/navrang-logo.png";
                }}
                className="w-full h-full object-contain rounded-full"
              />
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <div className="font-legacy text-2xl text-brand-blue tracking-tight">S.D. Public School</div>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-purple-500/15 text-purple-900 border border-amber-400/40">
                  🎆 Navrang 2026
                </span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-brand-orange font-headline font-bold">
                Empowering Generations Since 1994
              </div>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 font-headline text-sm">
            <a
              href={landingPath}
              onClick={(e) => go(e, null)}
              className={`px-3 py-2 rounded-full transition ${
                isLanding && !activeId
                  ? "text-brand-orange font-bold bg-brand-orange/10"
                  : "text-slate-700 hover:text-brand-blue hover:bg-slate-100"
              }`}
            >
              Home
            </a>

            {navLinks.map((item) => (
              <a
                key={item.id}
                href={`${landingPath}#${item.id}`}
                onClick={(e) => go(e, item.id)}
                className={`px-3 py-2 rounded-full transition ${
                  isLanding && activeId === item.id
                    ? "text-brand-orange font-bold bg-brand-orange/10"
                    : "text-slate-700 hover:text-brand-blue hover:bg-slate-100"
                }`}
              >
                {item.label}
              </a>
            ))}

            <Link
              to={resolvePath("/my-ticket")}
              className={`px-3 py-2 rounded-full transition flex items-center gap-1.5 ${
                location.pathname.includes("my-ticket")
                  ? "text-brand-orange font-bold bg-brand-orange/10"
                  : "text-slate-700 hover:text-brand-blue hover:bg-slate-100"
              }`}
            >
              <Ticket className="w-4 h-4 text-brand-orange" />
              <span>My Tickets</span>
            </Link>

            <Link
              to={resolvePath("/book")}
              className="ml-2 px-5 py-2.5 rounded-full bg-brand-orange hover:bg-orange-600 text-white font-headline font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Book Tickets</span>
            </Link>
          </nav>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <Link
              to={resolvePath("/book")}
              className="px-3 py-1.5 rounded-full bg-brand-orange text-white text-xs font-bold shadow-sm flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Book</span>
            </Link>
            <button
              className="p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              onClick={() => setOpen(!open)}
              aria-label="Toggle navigation menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {open && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 border border-amber-200 mb-2">
              <span className="text-xl">🎆</span>
              <div>
                <div className="text-xs font-bold text-amber-900">Navrang 2026 Dandiya Night</div>
                <div className="text-[10px] text-amber-700">Annual Cultural Celebration at SDPS Campus</div>
              </div>
            </div>

            <a
              href={landingPath}
              onClick={(e) => go(e, null)}
              className={`block px-3 py-2 rounded-xl font-medium ${
                isLanding && !activeId ? "bg-brand-orange/10 text-brand-orange" : "text-slate-800 hover:bg-slate-100"
              }`}
            >
              Event Home
            </a>

            {navLinks.map((item) => (
              <a
                key={item.id}
                href={`${landingPath}#${item.id}`}
                onClick={(e) => go(e, item.id)}
                className={`block px-3 py-2 rounded-xl ${
                  isLanding && activeId === item.id
                    ? "bg-brand-orange/10 text-brand-orange font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </a>
            ))}

            <Link
              to={resolvePath("/my-ticket")}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-800 font-medium hover:bg-slate-100"
            >
              <Ticket className="w-4 h-4 text-brand-orange" />
              <span>My Tickets (Lookup)</span>
            </Link>

            <div className="pt-2 border-t border-slate-100">
              <Link
                to={resolvePath("/book")}
                onClick={() => setOpen(false)}
                className="w-full py-3 rounded-xl bg-brand-orange text-white text-center font-bold font-headline flex items-center justify-center gap-2 shadow-md"
              >
                <Sparkles className="w-4 h-4" />
                <span>Book Tickets Now</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Marigold & Mango Leaf Toran */}
      <ToranGarland />
    </header>
  );
}
