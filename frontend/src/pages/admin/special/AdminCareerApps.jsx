import { useState, useEffect } from "react";
import api from "@/lib/api";
import { fullUrl } from "@/lib/admin";

export function AdminCareerApps() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api
      .get("/admin/career-applications")
      .then((r) => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
            return (
              <div key={it.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : it.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
                >
                  <div>
                    <div className="font-headline font-semibold text-brand-ink">{name}</div>
                    <div className="text-xs text-brand-ink/60 mt-0.5">
                      {post} · {phone} · {it.email}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-ink/40">{it.created_at?.slice(0, 10)}</span>
                    {it.resume_url && (
                      <a
                        href={fullUrl(it.resume_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-blue underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Resume ↗
                      </a>
                    )}
                    <span className="text-brand-ink/40 text-lg">{isOpen ? "↑" : "↓"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 p-5">
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
                          return (
                            <div key={k} className="bg-slate-50 rounded-xl px-3 py-2.5">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-brand-ink/40 mb-1">
                                {label}
                              </div>
                              {isUrl ? (
                                <a
                                  href={v}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand-blue text-xs underline"
                                >
                                  View ↗
                                </a>
                              ) : (
                                <div className="text-sm font-medium text-brand-ink">
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
    </div>
  );
}

export default AdminCareerApps;
