import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Newspaper, Bell, Image as ImageIcon, Video,
  Calendar, PartyPopper, Crown, Vote, Trophy, Users, Briefcase,
  GraduationCap, Award, FileText, CreditCard, Settings, LogOut,
  MessageSquare, Megaphone, ScrollText, FilePlus, Home, Hotel,
  BookOpen, Shield, EyeOff, ClipboardList, BookMarked, UserCog,
  Menu, X, Star, Cake
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { startPinger } from "../../lib/pinger";

// Full nav — superadmin only
const SUPERADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { section: "Content" },
  { to: "/admin/news", label: "News", icon: Newspaper },
  { to: "/admin/notices", label: "Notices", icon: Bell },
  { to: "/admin/gallery", label: "Gallery", icon: ImageIcon },
  { to: "/admin/videos", label: "Videos", icon: Video },
  { to: "/admin/calendar", label: "Calendar", icon: Calendar },
  { to: "/admin/holidays", label: "Holidays", icon: PartyPopper },
  { section: "School Pages" },
  { to: "/admin/administration-members", label: "Administration Messages", icon: Users },
  { to: "/admin/hostel-gallery", label: "Hostel Gallery", icon: Hotel },
  { to: "/admin/khelo-patna-gallery", label: "Khelo Patna Gallery", icon: Trophy },
  { section: "Student Council" },
  { to: "/admin/council-members", label: "Members & Captains", icon: Crown },
  { to: "/admin/election-posters", label: "Election Posters", icon: Vote },
  { to: "/admin/council-results", label: "Election Results", icon: Trophy },
  { section: "Admissions" },
  { to: "/admin/admission-enquiries", label: "Enquiries", icon: MessageSquare },
  { to: "/admin/enquiry-questions", label: "Enquiry Questions", icon: FilePlus },
  { to: "/admin/admission-fields", label: "Admission Form Builder", icon: FileText },
  { to: "/admin/admissions", label: "Full Applications", icon: GraduationCap },
  { to: "/admin/eligibility-rows", label: "Eligibility Criteria", icon: BookOpen },
  { section: "Academics" },
  { to: "/admin/holiday-homework", label: "Holiday Homework", icon: ClipboardList },
  { section: "Career" },
  { to: "/admin/career-posts", label: "Vacant Posts", icon: Briefcase },
  { to: "/admin/career-questions", label: "Application Questions", icon: FilePlus },
  { to: "/admin/career-applications", label: "Applications", icon: ScrollText },
  { section: "Alumni" },
  { to: "/admin/alumni-settings", label: "Alumni Settings (Hide/Show)", icon: EyeOff },
  { to: "/admin/alumni-questions", label: "Alumni Form Questions", icon: FilePlus },
  { to: "/admin/alumni-meets", label: "Alumni Meets", icon: Users },
  { to: "/admin/alumni-members", label: "Members", icon: Award },
  { section: "Other" },
  { to: "/admin/tc-records", label: "TC Records", icon: FileText },
  { to: "/admin/popup", label: "Welcome Popup", icon: Megaphone },
  { to: "/admin/contact-messages", label: "Contact Messages", icon: MessageSquare },
  { to: "/admin/whatsapp-marketing", label: "WhatsApp Marketing", icon: Megaphone },
  { to: "/admin/fee-reminders", label: "Fee Reminders", icon: CreditCard },
  { to: "/admin/birthday-greetings", label: "Birthday Greetings", icon: Cake },
  { to: "/admin/site-settings", label: "Site Settings", icon: Settings },
  { to: "/admin/integration-keys", label: "Integration Keys", icon: Settings },
  { section: "Google Review" },
  { to: "/admin/maps-review", label: "Google Review QR", icon: Star },
  { section: "User Management" },
  { to: "/admin/staff-users", label: "Staff & Admin Users", icon: UserCog },
];

// Staff-only nav — restricted to Holiday Homework
const STAFF_NAV = [
  { section: "Academics" },
  { to: "/admin/holiday-homework", label: "Holiday Homework", icon: ClipboardList },
];

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/admin/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    startPinger();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;

  const isStaff = user.role === "staff";
  const NAV = isStaff ? STAFF_NAV : SUPERADMIN_NAV;

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
            <img src="https://sdpublic.org/assets/img/logo.png" alt="SDPS logo" className="w-8 h-8 rounded-full bg-white/10 p-0.5 shrink-0" />
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
                  <img src="https://sdpublic.org/assets/img/logo.png" alt="SDPS logo" className="w-10 h-10 rounded-full ring-2 ring-brand-gold/60 shadow-[0_0_12px_rgba(199,161,91,0.3)] bg-white/10 p-0.5 shrink-0" />
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
              <img src="https://sdpublic.org/assets/img/logo.png" alt="SDPS logo" className="w-10 h-10 rounded-full ring-2 ring-brand-gold/60 shadow-[0_0_12px_rgba(199,161,91,0.3)] bg-white/10 p-0.5 shrink-0" />
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
            <span className="text-emerald-600 text-lg">🔒</span>
            <div>
              <div className="text-sm font-semibold text-emerald-700">Staff Access</div>
              <div className="text-xs text-emerald-600 text-emerald-700/80">You can manage Exam Papers and Holiday Homework. Contact the admin for other changes.</div>
            </div>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
