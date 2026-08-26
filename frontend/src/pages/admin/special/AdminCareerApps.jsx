import { useState, useEffect } from "react";
import api from "@/lib/api";
import { fullUrl } from "@/lib/admin";
import { isDriveUrl, checkDrivePermission } from "@/lib/driveCheck";
import DrivePermissionModal from "@/components/admin/DrivePermissionModal";
import { CheckCircle2, Lock, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function AdminCareerApps() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [driveResults, setDriveResults] = useState({});
  const [checkingUrls, setCheckingUrls] = useState({});
  const [activeModalUrl, setActiveModalUrl] = useState(null);

  useEffect(() => {
    api
      .get("/admin/career-applications")
      .then((r) => setItems(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCheckDriveUrl = async (url) => {
    if (!url || !url.trim()) return;
    setCheckingUrls((prev) => ({ ...prev, [url]: true }));
    try {
      const res = await checkDrivePermission(url.trim());
      setDriveResults((prev) => ({ ...prev, [url]: res }));
      if (res?.is_public === false) {
        setActiveModalUrl(url);
      } else if (res?.is_public === true) {
        toast.success("Google Drive link is public and accessible!");
      }
    } catch (e) {
      toast.error("Failed to check permission");
    } finally {
      setCheckingUrls((prev) => ({ ...prev, [url]: false }));
    }
  };

  const parseAnswers = (raw) => {
    if (!raw) return {};
    if (typeof raw === "object") return raw;
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  };

  const FIELD_LABELS = {
    full_name: "Full Name",
    email: "Email",
    phone: "Mobile",
    whatsapp: "WhatsApp",
    dob: "Date of Birth",
    gender: "Gender",
    address: "Address",
    qualification: "Qualification",
    specialization: "Specialization",
    experience_years: "Experience",
    current_employer: "Current Employer",
    applying_for: "Applying For",
    subjects_can_teach: "Subjects",
    classes_can_teach: "Classes",
    expected_salary: "Expected Salary",
    joining_availability: "Joining",
    reference: "Reference Source",
    about_yourself: "About",
    resume_url: "Resume",
  };

  if (loading) return <div className="text-brand-ink/60 p-8">Loading applications...</div>;

  return (
    <div>
      <h1 className="font-headline text-2xl font-semibold mb-2">Career Applications</h1>
      <p className="text-sm text-brand-ink/60 mb-6">{items.length} application(s) received</p>
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-brand-ink/50">
          No applications yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((it) => {
            const answers = parseAnswers(it.answers);
            const isOpen = expanded === it.id;
            const name = it.name || answers.full_name || "—";
            const post = it.subject || answers.applying_for || "—";
            const phone = it.phone || answers.phone || "—";
            const resumeUrl = it.resume_url || answers.resume_url;

            return (
              <div key={it.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <button
                  onClick={() => setExpanded(isOpen ? null : it.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
                >
                  <div>
                    <div className="font-headline font-semibold text-brand-ink">{name}</div>
                    <div className="text-xs text-brand-ink/60 mt-0.5">
                      {post} · {phone} · {it.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-ink/40">{it.created_at?.slice(0, 10)}</span>
                    {resumeUrl && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <a
                          href={fullUrl(resumeUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-brand-blue text-xs font-bold hover:bg-blue-100 transition inline-flex items-center gap-1"
                        >
                          Resume <ExternalLink className="w-3 h-3" />
                        </a>
                        {isDriveUrl(resumeUrl) && (
                          <button
                            type="button"
                            onClick={() => handleCheckDriveUrl(resumeUrl)}
                            disabled={checkingUrls[resumeUrl]}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Check Drive Public Access"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${checkingUrls[resumeUrl] ? "animate-spin text-blue-600" : ""}`} />
                          </button>
                        )}
                      </div>
                    )}
                    <span className="text-brand-ink/40 text-lg">{isOpen ? "↑" : "↓"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 p-5 bg-slate-50/50">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries({
                        ...answers,
                        ...(it.resume_url ? { resume_url: it.resume_url } : {}),
                      })
                        .filter(([k, v]) => v && k !== "raw")
                        .map(([k, v]) => {
                          const label =
                            FIELD_LABELS[k] ||
                            k
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase());
                          const isUrl = typeof v === "string" && v.startsWith("http");
                          const isDrive = isUrl && isDriveUrl(v);
                          const driveCheck = driveResults[v];
                          const isChecking = checkingUrls[v];

                          return (
                            <div key={k} className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-3 shadow-2xs">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-ink/40 mb-1">
                                {label}
                              </div>
                              {isUrl ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-2">
                                    <a
                                      href={v}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-brand-blue text-xs font-bold underline truncate block max-w-[200px]"
                                    >
                                      {k === "resume_url" ? "Open Resume / Portfolio ↗" : "View Link ↗"}
                                    </a>
                                    {isDrive && (
                                      <button
                                        type="button"
                                        onClick={() => handleCheckDriveUrl(v)}
                                        disabled={isChecking}
                                        className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                                      >
                                        <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} /> Check
                                      </button>
                                    )}
                                  </div>

                                  {isDrive && driveCheck && (
                                    <div className="pt-0.5">
                                      {driveCheck.is_public ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Public Link
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => setActiveModalUrl(v)}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                                        >
                                          <Lock className="w-3 h-3 text-rose-600" /> Restricted Link (Click to view guide)
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm font-medium text-brand-ink break-words">
                                  {String(v)}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Popout Modal for HR */}
      {activeModalUrl && (
        <DrivePermissionModal
          isOpen={!!activeModalUrl}
          onClose={() => setActiveModalUrl(null)}
          url={activeModalUrl}
          checkResult={driveResults[activeModalUrl]}
          context="career"
          onUpdateUrl={() => {}}
        />
      )}
    </div>
  );
}

export default AdminCareerApps;
