import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { toast, Toaster } from "sonner";
import {
  LayoutDashboard, Newspaper, Bell, Image as ImageIcon, Video,
  Calendar, PartyPopper, Crown, Vote, Trophy, Users, Briefcase,
  GraduationCap, Award, FileText, CreditCard, Settings, LogOut,
  MessageSquare, Megaphone, ScrollText, FilePlus, Home, Hotel,
  BookOpen, Shield, EyeOff, ClipboardList, BookMarked, UserCog,
  Menu, X, Star, Cake, Link2 as LinkIcon, Fingerprint, Lock
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { startPinger } from "../../lib/pinger";
import api from "../../lib/api";

// Full nav options with permission mapping
const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { section: "Content" },
  { to: "/admin/news", label: "News", icon: Newspaper, permission: "news" },
  { to: "/admin/notices", label: "Notices", icon: Bell, permission: "notices" },
  { to: "/admin/gallery", label: "Gallery", icon: ImageIcon, permission: "gallery" },
  { to: "/admin/videos", label: "Videos", icon: Video, permission: "gallery" },
  { to: "/admin/calendar", label: "Calendar", icon: Calendar, permission: "calendar" },
  { to: "/admin/holidays", label: "Holidays", icon: PartyPopper, permission: "calendar" },
  { section: "School Pages" },
  { to: "/admin/administration-members", label: "Administration Messages", icon: Users, permission: "site-settings" },
  { to: "/admin/testimonials", label: "Testimonials", icon: MessageSquare, permission: "site-settings" },
  { to: "/admin/hostel-gallery", label: "Hostel Gallery", icon: Hotel, permission: "hostel-gallery" },
  { to: "/admin/khelo-patna-gallery", label: "Khelo Patna Gallery", icon: Trophy, permission: "khelo-patna-gallery" },
  { section: "Elections" },
  { to: "/admin/elections", label: "Control Panel", icon: Vote, permission: "council", end: true },
  { to: "/admin/elections/results", label: "Live Results Tally", icon: Trophy, permission: "council" },
  { to: "/admin/elections/scheduler", label: "Publish Scheduler", icon: Calendar, permission: "council" },
  { section: "Student Council" },
  { to: "/admin/council-members", label: "Members & Captains", icon: Crown, permission: "council" },
  { to: "/admin/election-posters", label: "Election Posters", icon: Vote, permission: "council" },
  { to: "/admin/council-results", label: "Election Results Archive", icon: Trophy, permission: "council" },
  { section: "Admissions" },
  { to: "/admin/admission-enquiries", label: "Enquiries", icon: MessageSquare, permission: "admissions" },
  { to: "/admin/enquiry-questions", label: "Enquiry Questions", icon: FilePlus, permission: "admissions" },
  { to: "/admin/admission-fields", label: "Admission Form Builder", icon: FileText, permission: "admissions" },
  { to: "/admin/admissions", label: "Full Applications", icon: GraduationCap, permission: "admissions" },
  { to: "/admin/eligibility-rows", label: "Eligibility Criteria", icon: BookOpen, permission: "site-settings" },
  { section: "Academics" },
  { to: "/admin/holiday-homework", label: "Holiday Homework", icon: ClipboardList, permission: "academics" },
  { section: "Career" },
  { to: "/admin/career-posts", label: "Vacant Posts", icon: Briefcase, permission: "career" },
  { to: "/admin/career-questions", label: "Application Questions", icon: FilePlus, permission: "career" },
  { to: "/admin/career-applications", label: "Applications", icon: ScrollText, permission: "career" },
  { section: "Alumni" },
  { to: "/admin/alumni-settings", label: "Alumni Settings (Hide/Show)", icon: EyeOff, permission: "alumni" },
  { to: "/admin/alumni-questions", label: "Alumni Form Questions", icon: FilePlus, permission: "alumni" },
  { to: "/admin/alumni-meets", label: "Alumni Meets", icon: Users, permission: "alumni" },
  { to: "/admin/alumni-members", label: "Members", icon: Award, permission: "alumni" },
  { section: "Media Tools" },
  { to: "/admin/educators", label: "Educators", icon: Users, permission: "media-tools" },
  { to: "/admin/thumbnail-generator", label: "Thumbnail Generator", icon: ImageIcon, permission: "media-tools" },
  { to: "/admin/salary-slip", label: "Salary Slip Generator", icon: FileText, permission: "media-tools" },
  { to: "/admin/salary-certificate", label: "Salary Certificate", icon: FileText, permission: "media-tools" },
  { to: "/admin/experience-certificate", label: "Experience Certificate", icon: FileText, permission: "media-tools" },
  { to: "/admin/notice-maker", label: "Notice Maker", icon: FileText, permission: "media-tools" },
  { to: "/admin/omr-generator", label: "OMR Generator", icon: FileText, permission: "media-tools" },
  { section: "Other" },
  { to: "/admin/tc-records", label: "TC Records", icon: FileText, permission: "tc-records" },
  { to: "/admin/popup", label: "Welcome Popup", icon: Megaphone, permission: "popup" },
  { to: "/admin/contact-messages", label: "Contact Messages", icon: MessageSquare, permission: "contact-messages" },
  { to: "/admin/whatsapp-marketing", label: "WhatsApp Marketing", icon: Megaphone, permission: "whatsapp" },
  { to: "/admin/fee-reminders", label: "Fee Reminders", icon: CreditCard, permission: "whatsapp" },
  { to: "/admin/birthday-greetings", label: "Birthday Greetings", icon: Cake, permission: "whatsapp" },
  { to: "/admin/site-settings", label: "Site Settings", icon: Settings, permission: "site-settings" },
  { to: "/admin/apaar", label: "APAAR ID Manager", icon: Fingerprint, permission: "site-settings" },
  { to: "/admin/link-shortener", label: "Link Shortener", icon: LinkIcon, permission: "site-settings" },
  { to: "/admin/linktree", label: "Linktree Builder", icon: Award, permission: "site-settings" },
  { to: "/admin/integration-keys", label: "Integration Keys", icon: Settings, role: "superadmin" },
  { section: "Google Review" },
  { to: "/admin/maps-review", label: "Google Review QR", icon: Star, permission: "google-reviews" },
  { section: "User Management" },
  { to: "/admin/staff-users", label: "Staff & Admin Users", icon: UserCog, role: "superadmin" },
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const cached = localStorage.getItem("sdps_site_settings");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [logoUrl, setLogoUrl] = useState(() => {
    try {
      const cached = localStorage.getItem("sdps_site_settings");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.logo_url) {
          const rawUrl = parsed.logo_url;
          return rawUrl.startsWith("http")
            ? rawUrl
            : `${process.env.REACT_APP_BACKEND_URL || ""}${rawUrl}`;
        }
      }
    } catch (e) {}
    return "";
  });

  useEffect(() => {
    api.get("/site-settings")
      .then((r) => {
        setSettings(r.data);
        try {
          localStorage.setItem("sdps_site_settings", JSON.stringify(r.data));
        } catch (e) {}
        if (r.data?.logo_url) {
          const rawUrl = r.data.logo_url;
          const formatted = rawUrl.startsWith("http")
            ? rawUrl
            : `${process.env.REACT_APP_BACKEND_URL || ""}${rawUrl}`;
          setLogoUrl(formatted);
        }
      })
      .catch(() => {});
  }, []);

  const isStaff = user?.role === "staff";

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!loading && user) {
      const path = location.pathname;
      if (path === "/admin") return;

      const isAllowed = user.role === "superadmin" || NAV_ITEMS.some(item => {
        if (!item.to) return false;
        const matches = item.to === path || (item.to !== "/admin" && path.startsWith(item.to + "/")) || (item.to !== "/admin" && path === item.to);
        if (!matches) return false;
        if (item.role === "superadmin" && user.role !== "superadmin") return false;
        if (item.permission && !user.permissions?.includes(item.permission)) return false;
        return true;
      });

      if (!isAllowed) {
        navigate("/admin");
      }
    }
  }, [location.pathname, user, loading, navigate]);
  const checkNewUpdates = (currentStats) => {
    if (!currentStats) return;

    const lastEnquiries = localStorage.getItem("last_seen_enquiries");
    const lastCareerApps = localStorage.getItem("last_seen_career_applications");
    const lastAdmissions = localStorage.getItem("last_seen_admissions");
    const lastContactMsgs = localStorage.getItem("last_seen_contact_messages");

    const currEnquiries = currentStats.enquiries || 0;
    const currCareerApps = currentStats.career_applications || 0;
    const currAdmissions = currentStats.admissions || 0;
    const currContactMsgs = currentStats.contact_messages || 0;

    // Enquiries
    if (lastEnquiries !== null) {
      const diff = currEnquiries - parseInt(lastEnquiries, 10);
      if (diff > 0) {
        toast.info(`${diff} new admission ${diff === 1 ? 'enquiry' : 'enquiries'} received!`, {
          action: {
            label: 'View',
            onClick: () => navigate('/admin/admission-enquiries')
          },
          duration: 10000
        });
      }
    }
    localStorage.setItem("last_seen_enquiries", currEnquiries.toString());

    // Career Applications
    if (lastCareerApps !== null) {
      const diff = currCareerApps - parseInt(lastCareerApps, 10);
      if (diff > 0) {
        toast.info(`${diff} new teacher ${diff === 1 ? 'application' : 'applications'} received!`, {
          action: {
            label: 'View',
            onClick: () => navigate('/admin/career-applications')
          },
          duration: 10000
        });
      }
    }
    localStorage.setItem("last_seen_career_applications", currCareerApps.toString());

    // Full Admissions
    if (lastAdmissions !== null) {
      const diff = currAdmissions - parseInt(lastAdmissions, 10);
      if (diff > 0) {
        toast.info(`${diff} new admission ${diff === 1 ? 'application' : 'applications'} received!`, {
          action: {
            label: 'View',
            onClick: () => navigate('/admin/admissions')
          },
          duration: 10000
        });
      }
    }
    localStorage.setItem("last_seen_admissions", currAdmissions.toString());

    // Contact Messages
    if (lastContactMsgs !== null) {
      const diff = currContactMsgs - parseInt(lastContactMsgs, 10);
      if (diff > 0) {
        toast.info(`${diff} new contact ${diff === 1 ? 'message' : 'messages'} received!`, {
          action: {
            label: 'View',
            onClick: () => navigate('/admin/contact-messages')
          },
          duration: 10000
        });
      }
    }
    localStorage.setItem("last_seen_contact_messages", currContactMsgs.toString());
  };

  useEffect(() => {
    if (!user) return;
    
    // Sync counts immediately if currently viewing those pages
    api.get("/admin/stats")
      .then((r) => {
        const stats = r.data;
        if (location.pathname === "/admin/admission-enquiries") {
          localStorage.setItem("last_seen_enquiries", (stats.enquiries || 0).toString());
        }
        if (location.pathname === "/admin/career-applications") {
          localStorage.setItem("last_seen_career_applications", (stats.career_applications || 0).toString());
        }
        if (location.pathname === "/admin/admissions") {
          localStorage.setItem("last_seen_admissions", (stats.admissions || 0).toString());
        }
        if (location.pathname === "/admin/contact-messages") {
          localStorage.setItem("last_seen_contact_messages", (stats.contact_messages || 0).toString());
        }
      })
      .catch(() => {});
  }, [location.pathname, user]);

  useEffect(() => {
    if (!user) return;

    const fetchAndCheckStats = () => {
      api.get("/admin/stats")
        .then((r) => {
          checkNewUpdates(r.data);
        })
        .catch(() => {});
    };

    // Run once on load/mount with a small delay for UI layout rendering
    const timeoutId = setTimeout(fetchAndCheckStats, 1500);

    // Poll every 30 seconds
    const intervalId = setInterval(fetchAndCheckStats, 30000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [user]);
  useEffect(() => {
    startPinger();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  // Filter NAV items based on permissions.
  // We only show a section header if there's at least one visible item under it.
  const filteredNav = [];
  let currentSection = null;

  for (const item of NAV_ITEMS) {
    if (item.section) {
      currentSection = item;
    } else {
      const isAllowed =
        user.role === "superadmin" ||
        (item.role !== "superadmin" && (!item.permission || user.permissions?.includes(item.permission)));

      if (isAllowed) {
        if (currentSection) {
          filteredNav.push(currentSection);
          currentSection = null;
        }
        filteredNav.push(item);
      }
    }
  }

  const NAV = filteredNav;

  const renderNavLinks = (onItemClick) => (
    <nav className="py-4 text-sm space-y-1">
      {NAV.map((item, i) => item.section ? (
        <div key={i} className="px-6 pt-5 pb-1.5 text-[9px] uppercase tracking-[0.25em] text-slate-500 font-extrabold">{item.section}</div>
      ) : (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onItemClick}
          className={({ isActive }) => `flex items-center gap-3 mx-3 px-4 py-2.5 rounded-xl transition-all duration-200 group border ${
            isActive 
              ? "admin-link-active bg-gradient-to-r from-brand-orange/20 to-brand-gold/5 text-brand-orange-light font-medium border-brand-orange/25 shadow-[0_0_12px_rgba(248,125,14,0.1)]" 
              : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.03] border-transparent"
          }`}
          data-testid={`admin-nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <item.icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className="text-[13px]">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <Toaster position="top-right" richColors />
      {/* Mobile Top Bar Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="SDPS logo" className="w-8 h-8 rounded-full bg-white/10 p-0.5 shrink-0 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse shrink-0" />
            )}
            <div>
              <span className="font-headline font-bold text-sm tracking-tight">SDPS Admin</span>
              <span className="text-[9px] uppercase tracking-wider text-brand-gold font-semibold ml-2">
                {isStaff ? "Staff" : "Admin"}
              </span>
            </div>
          </div>
        </div>
        <div className="w-8 h-8 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange-light font-bold text-sm shrink-0">
          {user.name ? user.name.charAt(0).toUpperCase() : "A"}
        </div>
      </header>

      {/* Mobile Sidebar Navigation Drawer */}
      <div 
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop Overlay */}
        <div 
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
        {/* Drawer Container */}
        <aside 
          className={`absolute inset-y-0 left-0 w-66 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white border-r border-slate-800/80 flex flex-col justify-between transform transition-transform duration-300 ease-in-out overflow-y-auto no-scrollbar ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div>
            {/* Drawer Header with Close Button */}
            <div className="m-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {logoUrl ? (
                    <img src={logoUrl} alt="SDPS logo" className="w-10 h-10 rounded-full ring-2 ring-brand-gold/60 shadow-[0_0_12px_rgba(199,161,91,0.3)] bg-white/10 p-0.5 shrink-0 object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse ring-2 ring-brand-gold/60 shrink-0" />
                  )}
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
                </div>
                <div className="overflow-hidden">
                  <div className="font-headline font-bold text-sm tracking-tight text-white truncate">SDPS Admin</div>
                  <div className="text-[10px] uppercase tracking-[0.15em] text-brand-gold font-semibold truncate">
                    {isStaff ? "Staff Portal" : "Control Panel"}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Access level indicator */}
            <div className="px-6 py-2.5 flex items-center justify-between border-b border-white/[0.06] pb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Tier</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                isStaff 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                  : "bg-brand-orange/15 text-brand-orange-light border-brand-orange/30 shadow-[0_0_8px_rgba(248,125,14,0.1)]"
              }`}>
                {isStaff ? "Staff" : "Superadmin"}
              </span>
            </div>

            {renderNavLinks(() => setSidebarOpen(false))}
          </div>

          {/* Drawer Footer profile container */}
          <div className="p-4 m-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm flex flex-col gap-2.5 shrink-0 mt-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange-light font-bold text-sm shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : "A"}
              </div>
              <div className="overflow-hidden">
                <div className="text-[11px] font-semibold text-slate-200 truncate">{user.name}</div>
                <div className="text-[9px] text-slate-500 truncate">{user.email}</div>
              </div>
            </div>
            <button 
              onClick={() => {
                setSidebarOpen(false);
                logout();
              }} 
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
          </div>
        </aside>
      </div>

      {/* Desktop Sticky Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex w-66 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-white flex-shrink-0 sticky top-0 h-screen overflow-y-auto no-scrollbar border-r border-slate-800/80 flex-col justify-between">
        <div>
          {/* Brand header card */}
          <div className="m-4 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] backdrop-blur-md shadow-xl flex items-center gap-3">
            <div className="relative">
              {logoUrl ? (
                <img src={logoUrl} alt="SDPS logo" className="w-10 h-10 rounded-full ring-2 ring-brand-gold/60 shadow-[0_0_12px_rgba(199,161,91,0.3)] bg-white/10 p-0.5 shrink-0 object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse ring-2 ring-brand-gold/60 shrink-0" />
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full"></span>
            </div>
            <div className="overflow-hidden">
              <div className="font-headline font-bold text-sm tracking-tight text-white truncate">SDPS Admin</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-brand-gold font-semibold truncate">
                {isStaff ? "Staff Portal" : "Control Panel"}
              </div>
            </div>
          </div>

          {/* Access level indicator */}
          <div className="px-6 py-2.5 flex items-center justify-between border-b border-white/[0.06] pb-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Tier</span>
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              isStaff 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" 
                : "bg-brand-orange/15 text-brand-orange-light border-brand-orange/30 shadow-[0_0_8px_rgba(248,125,14,0.1)]"
            }`}>
              {isStaff ? "Staff" : "Superadmin"}
            </span>
          </div>

          {renderNavLinks()}
        </div>

        {/* Footer profile container */}
        <div className="p-4 m-3 rounded-2xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm flex flex-col gap-2.5 shrink-0 mt-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-brand-orange-light font-bold text-sm shrink-0">
              {user.name ? user.name.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="overflow-hidden">
              <div className="text-[11px] font-semibold text-slate-200 truncate">{user.name}</div>
              <div className="text-[9px] text-slate-500 truncate">{user.email}</div>
            </div>
          </div>
          <button 
            onClick={logout} 
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all"
            data-testid="admin-logout-btn"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-full overflow-x-hidden bg-slate-50/50">
        {isStaff && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-sm">
            <Lock className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-emerald-700">Staff Access</div>
              <div className="text-xs text-emerald-600 text-emerald-700/80">
                You have access to {user.permissions?.length || 0} module(s). Contact the superadmin to request access to other sections.
              </div>
            </div>
          </div>
        )}
        <Outlet context={{ settings }} />
      </main>
    </div>
  );
}
