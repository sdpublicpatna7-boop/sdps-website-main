import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Save } from "lucide-react";
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
            <span>💳</span> Fee Payment Portal URL
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
            <span>📄</span> Document Embeds, PDFs &amp; Site Images
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
            />
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
            />
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
