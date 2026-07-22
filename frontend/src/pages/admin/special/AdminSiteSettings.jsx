import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Save, CreditCard, FileText, Download } from "lucide-react";
import { ImageOrUrlField, FileOrUrlField } from "@/components/admin/SharedFields";

export function AdminSiteSettings() {
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api.get("/admin/site-settings").then((r) => setData(r.data));
  }, []);
  if (!data) return <div>Loading...</div>;
  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/site-settings", data);
      toast.success("Saved");
    } catch {
      toast.error("Failed");
    } finally {
      setSaving(false);
    }
  };
  const SET_FIELD = (label, key, type = "text") => (
    <div>
      <label className="text-xs font-bold uppercase text-brand-ink/60">{label}</label>
      <input
        type={type}
        className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
        value={data[key] || ""}
        onChange={(e) => setData({ ...data, [key]: e.target.value })}
      />
    </div>
  );
  return (
    <div>
      <Toaster position="top-right" />
      <h1 className="font-headline text-2xl font-semibold mb-6">Site Settings</h1>
      <form
        onSubmit={save}
        className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-3xl"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          {SET_FIELD("School Name", "school_name")}
          {SET_FIELD("Tagline", "tagline")}
          {SET_FIELD("Phone Primary", "phone_primary")}
          {SET_FIELD("Phone Secondary", "phone_secondary")}
          {SET_FIELD("Email", "email", "email")}
          {SET_FIELD("ERP Login URL", "erp_url")}
          {SET_FIELD("Hero Video URL (embed)", "hero_video_url")}
          {SET_FIELD("Play Store URL", "play_store_url")}
          {SET_FIELD("YouTube Channel", "youtube_channel")}
          {SET_FIELD("Instagram URL", "instagram_url")}
          {SET_FIELD("Facebook URL", "facebook_url")}
          {SET_FIELD("QP Portal URL", "qp_portal_url")}
        </div>
        <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
          <h3 className="font-headline font-semibold text-amber-800 mb-1 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-700" /> Fee Payment Portal URL
          </h3>
          <p className="text-xs text-amber-700 mb-3">
            Students will be redirected to this external URL when they click "Pay Fees Online". Set
            this to your ERP fee portal, Razorpay payment page, or any payment link.
          </p>
          <input
            type="url"
            placeholder="https://your-fee-portal.com/pay"
            className="w-full px-3 py-2 border border-amber-300 rounded-lg bg-white focus:outline-none focus:border-brand-blue"
            value={data.fee_payment_url || ""}
            onChange={(e) => setData({ ...data, fee_payment_url: e.target.value })}
            data-testid="fee-payment-url-input"
          />
          {data.fee_payment_url && (
            <a
              href={data.fee_payment_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-blue mt-1 inline-block hover:underline"
            >
              ↗ Test this link
            </a>
          )}
        </div>

        {/* Document Embeds, PDFs & Images */}
        <div className="border border-brand-blue/20 bg-brand-blue/5 rounded-xl p-5 space-y-4">
          <h3 className="font-headline font-semibold text-brand-blue flex items-center gap-2">
            <FileText className="w-5 h-5" /> Document Embeds, PDFs &amp; Site Images
          </h3>
          <p className="text-xs text-brand-ink/60">
            Upload files/images from your device or paste a URL. These are shown inline or as design elements on public pages.
          </p>

          {/* Fee Structure PDF */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Fee Structure PDF
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              Shown on the Fee Structure page with an inline viewer.
            </p>
            <FileOrUrlField
              value={data.fee_structure_pdf_url || ""}
              onChange={(v) => setData({ ...data, fee_structure_pdf_url: v })}
              subDir="docs"
              maxMb={10}
            />
          </div>

          {/* Prospectus PDF */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              School Prospectus PDF
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              Shown below the fee table and also linked from the Admissions page.
            </p>
            <FileOrUrlField
              value={data.prospectus_pdf_url || ""}
              onChange={(v) => setData({ ...data, prospectus_pdf_url: v })}
              subDir="docs"
              maxMb={10}
            />
          </div>

          {/* Hostel Food Menu PDF */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Hostel Food Menu PDF
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              Shown embedded on the Hostel page under "Nutrition".
            </p>
            <FileOrUrlField
              value={data.hostel_food_menu_pdf_url || ""}
              onChange={(v) => setData({ ...data, hostel_food_menu_pdf_url: v })}
              subDir="docs"
              maxMb={10}
            />
          </div>

          {/* Hostel Student Checklist PDF */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Hostel Student Checklist PDF
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              Shown on Hostel page under "What to Bring". Leave blank to hide that section.
            </p>
            <FileOrUrlField
              value={data.hostel_checklist_pdf_url || ""}
              onChange={(v) => setData({ ...data, hostel_checklist_pdf_url: v })}
              subDir="docs"
              maxMb={10}
            />
          </div>

          {/* Demystified Image */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Demystified Page Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The full-size infographic shown on the Demystified page.
            </p>
            <ImageOrUrlField
              value={data.demystified_image_url || ""}
              onChange={(v) => setData({ ...data, demystified_image_url: v })}
              subDir="misc"
              aspect="demystified"
            />
          </div>

          {/* Preschool Banner Image */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Preschool Section Banner Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The banner/admissions graphic shown in the preschool section at the bottom of the home page.
            </p>
            <ImageOrUrlField
              value={data.preschool_banner_image_url || ""}
              onChange={(v) => setData({ ...data, preschool_banner_image_url: v })}
              subDir="misc"
              aspect="preschool"
            />
          </div>

          {/* Khelo Patna Hero Image */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Khelo Patna Hero Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The main partnership banner/hero image shown on the Khelo Patna page.
            </p>
            <ImageOrUrlField
              value={data.khelo_patna_hero_image_url || ""}
              onChange={(v) => setData({ ...data, khelo_patna_hero_image_url: v })}
              subDir="misc"
              aspect="khelo_patna"
            />
          </div>

          {/* School Logo */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              School Logo Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The school logo shown in the website header, footer, and emails.
            </p>
            <ImageOrUrlField
              value={data.logo_url || ""}
              onChange={(v) => setData({ ...data, logo_url: v })}
              subDir="misc"
              aspect="logo"
            />
          </div>

          {/* Download Official Brand Assets & Logos */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-brand-blue" />
              <h3 className="font-headline font-bold text-xs text-slate-800 uppercase tracking-wide">
                Download Official School Logos & Assets
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Download high-resolution official SDPS Real School Logo and SDG 1 Logo in PNG & Animated GIF formats anytime.
            </p>
            
            {/* Category 1: Real SDPS Official School Logo */}
            <div className="space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-brand-blue">
                1. SDPS Real Official School Logo
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Real Logo HD JPEG & PNG */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <img src="/logo-real-original.jpg" alt="Real Official Logo HD" className="w-10 h-10 object-contain rounded-lg border border-slate-100 p-0.5 bg-slate-50" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Real School Logo (HD)</div>
                      <div className="text-[10px] text-slate-400">Original JPEG / PNG · 1585×1600</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href="/logo-real-original.jpg"
                      download="SDPS_Real_School_Logo_HD.jpg"
                      className="px-2.5 py-1.5 bg-brand-blue text-white text-[11px] font-semibold rounded-lg hover:bg-brand-blue-light transition inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> JPG
                    </a>
                    <a
                      href="/logo-real-original.png"
                      download="SDPS_Real_School_Logo_HD.png"
                      className="px-2.5 py-1.5 bg-slate-800 text-white text-[11px] font-semibold rounded-lg hover:bg-slate-700 transition inline-flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" /> PNG
                    </a>
                  </div>
                </div>

                {/* Real Logo Animated GIF */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <img src="/logo-real-animated.gif" alt="Real Logo Animated GIF" className="w-10 h-10 object-contain rounded-lg border border-slate-100 p-0.5 bg-slate-50" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Real Logo Animated GIF</div>
                      <div className="text-[10px] text-slate-400">GIF Format · Bounce & Sweep</div>
                    </div>
                  </div>
                  <a
                    href="/logo-real-animated.gif"
                    download="SDPS_Real_School_Logo_Animated.gif"
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> GIF
                  </a>
                </div>
              </div>
            </div>

            {/* Category 2: SDPS SDG 1 Logo */}
            <div className="space-y-2 pt-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-brand-orange">
                2. SDPS SDG 1 Logo (With Sustainable Goals Ring)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* SDG PNG */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <img src="/logo512.png" alt="SDG Logo HD" className="w-10 h-10 object-contain rounded-lg border border-slate-100 p-0.5 bg-slate-50" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">SDG 1 Logo (HD)</div>
                      <div className="text-[10px] text-slate-400">PNG Format · SDG Ring</div>
                    </div>
                  </div>
                  <a
                    href="/logo512.png"
                    download="SDPS_SDG_Logo_HighRes.png"
                    className="px-3 py-1.5 bg-brand-blue text-white text-xs font-semibold rounded-lg hover:bg-brand-blue-light transition inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>

                {/* SDG Animated GIF */}
                <div className="p-3 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <img src="/logo-sdg-animated.gif" alt="SDG Logo Animated GIF" className="w-10 h-10 object-contain rounded-lg border border-slate-100 p-0.5 bg-slate-50" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">SDG 1 Animated GIF</div>
                      <div className="text-[10px] text-slate-400">GIF Format · Bounce & Sweep</div>
                    </div>
                  </div>
                  <a
                    href="/logo-sdg-animated.gif"
                    download="SDPS_SDG_Logo_Animated.gif"
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Homepage Hero Banner */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Homepage Hero Banner Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The primary hero background/banner image fallback.
            </p>
            <ImageOrUrlField
              value={data.hero_banner_url || ""}
              onChange={(v) => setData({ ...data, hero_banner_url: v })}
              subDir="misc"
              aspect="hero_banner"
            />
          </div>

          {/* Homepage Feature Image */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Homepage Hero Feature Image (Right side)
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The featured image showing next to the main headline on the homepage.
            </p>
            <ImageOrUrlField
              value={data.hero_feature_image_url || ""}
              onChange={(v) => setData({ ...data, hero_feature_image_url: v })}
              subDir="misc"
              aspect="hero_feature"
            />
          </div>

          {/* Admission Announcement Banner */}
          <div className="border border-brand-blue/15 bg-brand-blue/[0.03] rounded-xl p-4 space-y-3">
            <label className="text-xs font-bold uppercase text-brand-ink/60 block">
              Admission Announcement Banner
            </label>
            <p className="text-xs text-brand-ink/40">
              A slim announcement bar shown at the very top of every public page during admission season. Visitors can dismiss it for their session.
            </p>
            <label className="flex items-center gap-2 text-sm text-brand-ink/80 cursor-pointer">
              <input
                type="checkbox"
                checked={String(data.admissions_banner_enabled).toLowerCase() === "true"}
                onChange={(e) => setData({ ...data, admissions_banner_enabled: e.target.checked ? "true" : "false" })}
                className="w-4 h-4 accent-brand-blue"
              />
              Show the banner on the public site
            </label>
            <div>
              <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">Banner Text</label>
              <input
                type="text"
                value={data.admissions_banner_text || ""}
                onChange={(e) => setData({ ...data, admissions_banner_text: e.target.value })}
                placeholder="Admissions Open 2026-27 — Limited seats available"
                className="w-full rounded-lg border border-brand-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">Banner Link</label>
              <input
                type="text"
                value={data.admissions_banner_link || ""}
                onChange={(e) => setData({ ...data, admissions_banner_link: e.target.value })}
                placeholder="/admissions"
                className="w-full rounded-lg border border-brand-ink/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
          </div>

          {/* Admissions Page Open Button */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Admissions Page Open Button Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The banner graphic promoting open admissions on the admissions landing page.
            </p>
            <ImageOrUrlField
              value={data.admission_open_button_url || ""}
              onChange={(v) => setData({ ...data, admission_open_button_url: v })}
              subDir="misc"
              aspect="admission_open"
            />
          </div>

          {/* Preschool Ranked Badge */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Preschool Ranked Badge Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The top-ranked preschool seal displayed on the admissions landing page.
            </p>
            <ImageOrUrlField
              value={data.ranked_badge_url || ""}
              onChange={(v) => setData({ ...data, ranked_badge_url: v })}
              subDir="misc"
              aspect="ranked_badge"
            />
          </div>

          {/* Director's Photo */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Director's Photo
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The photo of the Director displayed on the Administration Message page.
            </p>
            <ImageOrUrlField
              value={data.director_photo_url || ""}
              onChange={(v) => setData({ ...data, director_photo_url: v })}
              subDir="misc"
              aspect="director"
            />
          </div>

          {/* Principal's Photo */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Principal's Photo
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The photo of the Principal displayed on the Administration Message page.
            </p>
            <ImageOrUrlField
              value={data.principal_photo_url || ""}
              onChange={(v) => setData({ ...data, principal_photo_url: v })}
              subDir="misc"
              aspect="principal"
            />
          </div>

          {/* About Page Trust Logo */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              About Page Trust Logo (Large)
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The large Trust Logo displayed on the About Us page.
            </p>
            <ImageOrUrlField
              value={data.about_trust_logo_url || ""}
              onChange={(v) => setData({ ...data, about_trust_logo_url: v })}
              subDir="misc"
              aspect="about_trust"
            />
          </div>

          {/* Academics Learning Image */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Academics Page Curriculum Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The "Learning Beyond Classrooms" graphic displayed on the Academics page.
            </p>
            <ImageOrUrlField
              value={data.academics_learning_image_url || ""}
              onChange={(v) => setData({ ...data, academics_learning_image_url: v })}
              subDir="misc"
              aspect="academics_learning"
            />
          </div>

          {/* Academics Facilities Image */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Academics Page Facilities Image
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The facilities infrastructure graphic displayed at the bottom of the Academics page.
            </p>
            <ImageOrUrlField
              value={data.academics_facilities_image_url || ""}
              onChange={(v) => setData({ ...data, academics_facilities_image_url: v })}
              subDir="misc"
              aspect="academics_facilities"
            />
          </div>

          {/* Careers Team Photo */}
          <div>
            <label className="text-xs font-bold uppercase text-brand-ink/60 block mb-1">
              Careers Page Faculty Team Photo
            </label>
            <p className="text-xs text-brand-ink/40 mb-2">
              The faculty team picture displayed on the Careers page.
            </p>
            <ImageOrUrlField
              value={data.career_hero_image_url || ""}
              onChange={(v) => setData({ ...data, career_hero_image_url: v })}
              subDir="misc"
              aspect="career_hero"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase text-brand-ink/60">Address</label>
          <textarea
            className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
            rows={2}
            value={data.address || ""}
            onChange={(e) => setData({ ...data, address: e.target.value })}
          />
        </div>



        <h3 className="font-headline font-semibold mt-2">Stats (Homepage)</h3>
        <div className="grid sm:grid-cols-4 gap-3">
          {["years", "educators", "students", "alumni"].map((k) => (
            <div key={k}>
              <label className="text-xs font-bold uppercase text-brand-ink/60">{k}</label>
              <input
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
                value={data.stats?.[k] || ""}
                onChange={(e) =>
                  setData({ ...data, stats: { ...data.stats, [k]: e.target.value } })
                }
              />
            </div>
          ))}
        </div>
        <button
          disabled={saving}
          className="bg-brand-blue text-white px-4 py-2 rounded-lg text-sm"
          data-testid="settings-save-btn"
        >
          <Save className="w-4 h-4 inline mr-1" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}

export default AdminSiteSettings;
