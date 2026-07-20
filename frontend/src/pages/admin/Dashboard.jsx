import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../lib/auth";
import {
  Newspaper, Bell, Image as ImageIcon, Video, MessageSquare,
  GraduationCap, Briefcase, Users, FileText, CreditCard,
  Sparkles, Settings, Database
} from "lucide-react";

const STAT_ITEMS = [
  { key: "news", label: "News Updates", icon: Newspaper, color: "from-blue-500 to-indigo-600", desc: "School newsfeed articles", badge: "Press", badgeColor: "bg-blue-50/80 text-blue-600 border border-blue-100" },
  { key: "notices", label: "Notices", icon: Bell, color: "from-amber-500 to-orange-600", desc: "Active bulletin board alerts", badge: "Important", badgeColor: "bg-amber-50/80 text-amber-600 border border-amber-100" },
  { key: "gallery", label: "Gallery Images", icon: ImageIcon, color: "from-pink-500 to-rose-600", desc: "Media asset album files", badge: "Photos", badgeColor: "bg-pink-50/80 text-pink-600 border border-pink-100" },
  { key: "videos", label: "Videos", icon: Video, color: "from-rose-500 to-red-600", desc: "Featured YouTube streams", badge: "Video", badgeColor: "bg-red-50/80 text-red-600 border border-red-100" },
  { key: "enquiries", label: "Enquiries", icon: MessageSquare, color: "from-emerald-500 to-teal-600", desc: "Admission enquiry leads", badge: "CRM", badgeColor: "bg-emerald-50/80 text-emerald-600 border border-emerald-100" },
  { key: "admissions", label: "Applications", icon: GraduationCap, color: "from-violet-500 to-purple-600", desc: "Form registrations", badge: "Admissions", badgeColor: "bg-violet-50/80 text-violet-600 border border-violet-100" },
  { key: "career_applications", label: "Career Apps", icon: Briefcase, color: "from-cyan-500 to-blue-600", desc: "Job applicant submissions", badge: "Hiring", badgeColor: "bg-cyan-50/80 text-cyan-600 border border-cyan-100" },
  { key: "alumni_members", label: "Alumni Members", icon: Users, color: "from-orange-500 to-amber-600", desc: "Graduates directories", badge: "Alumni", badgeColor: "bg-orange-50/80 text-orange-600 border border-orange-100" },
  { key: "tc_records", label: "TC Records", icon: FileText, color: "from-teal-500 to-emerald-600", desc: "Transfer certificates", badge: "Records", badgeColor: "bg-teal-50/80 text-teal-600 border border-teal-100" },
  { key: "payments_paid", label: "Successful Payments", icon: CreditCard, color: "from-green-500 to-emerald-600", desc: "Razorpay transactions", badge: "Finance", badgeColor: "bg-green-50/80 text-green-600 border border-green-100" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({});
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).catch(() => {});
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const adminName = user?.name || "Admin";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-brand-blue-dark p-6 md:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-brand-orange/5 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10">
          <h1 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
            {greeting}, <span className="text-brand-orange-light">{adminName}</span> <Sparkles className="w-7 h-7 text-brand-gold animate-pulse" />
          </h1>
          <p className="text-slate-300 text-sm md:text-base mt-2 max-w-xl">
            Here's a live overview of S.D. Public School's web portal activity and content modules.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white/[0.07] backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl shrink-0 relative z-10 self-start md:self-center">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            System Online
          </span>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-headline font-bold text-lg text-slate-800 tracking-tight">Activity Overview</h2>
          <span className="text-xs text-slate-400 font-medium">Real-time stats</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
          {STAT_ITEMS.map((s) => (
            <div 
              key={s.key} 
              className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-[0_12px_40px_rgba(14,59,145,0.05)] hover:-translate-y-1 hover:border-slate-200 transition-all duration-300 group relative overflow-hidden flex flex-col justify-between" 
              data-testid={`stat-${s.key}`}
            >
              {/* Card accent bg blur glow */}
              <div className={`absolute -right-6 -bottom-6 w-16 h-16 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-full blur-xl`}></div>
              
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${s.color} text-white flex items-center justify-center shadow-lg shadow-indigo-500/5 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300`}>
                    <s.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.badgeColor}`}>
                    {s.badge}
                  </span>
                </div>
                
                <div className="text-4xl font-headline font-bold text-slate-800 tracking-tight">
                  {stats[s.key] ?? 0}
                </div>
                
                <div className="text-sm font-semibold text-slate-700 mt-1.5">
                  {s.label}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 mt-3 border-t border-slate-50 pt-2.5 truncate">
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action Operations Hub */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
        <div className="mb-6">
          <h2 className="font-headline font-bold text-xl text-slate-800 tracking-tight">School Operations Hub</h2>
          <p className="text-sm text-slate-400 mt-1">Quick insights and operation guidelines for the admin panel.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 transition duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-orange-light to-brand-orange text-white flex items-center justify-center mb-4 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-headline font-bold text-base text-slate-800">Dynamic Content Hub</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Manage news articles, school circulars, events, and image galleries dynamically. All uploaded images undergo auto-compression to ensure blazing-fast portal speeds.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              News & Galleries
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 transition duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue-light to-brand-blue text-white flex items-center justify-center mb-4 shadow-sm">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="font-headline font-bold text-base text-slate-800">System Integrations</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Ensure environment variables are configured with active Resend email API keys, BulkSMS keys, and Razorpay endpoints to enable instant email receipts, SMS alerts, and fees.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              APIs & Payments
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 transition duration-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-gold-light to-brand-gold text-white flex items-center justify-center mb-4 shadow-sm">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-headline font-bold text-base text-slate-800">Bulk Imports & Alerts</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Use formatted Excel sheets (columns: name, date, icon, type) to import school calendar events and holidays. Leverage the Home Popup module for key notices.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Excel & Popups
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
