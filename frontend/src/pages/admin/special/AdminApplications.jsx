import { useState, useEffect } from "react";
import api from "@/lib/api";

export function AdminApplications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api
      .get("/admin/admissions")
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
    student_name: "Student Name",
    dob: "Date of Birth",
    gender: "Gender",
    blood_group: "Blood Group",
    applying_class: "Applying For Class",
    previous_school: "Previous School",
    previous_class: "Last Class Passed",
    father_name: "Father's Name",
    father_occupation: "Father's Occupation",
    father_phone: "Father's Phone",
    father_email: "Father's Email",
    mother_name: "Mother's Name",
    mother_occupation: "Mother's Occupation",
    mother_phone: "Mother's Phone",
    residential_address: "Address",
    city: "City",
    pincode: "PIN Code",
    medical_condition: "Medical Condition",
    transport_required: "Transport",
    hostel_required: "Hostel",
    siblings_in_school: "Siblings in SDPS",
    how_did_you_hear: "How Heard",
    reference_name: "Reference",
    photo_url: "Photo",
    birth_certificate_url: "Birth Certificate",
    prev_marksheet_url: "Marksheet",
  };

  const SKIP_KEYS = new Set(["raw"]);

  if (loading) return <div className="text-brand-ink/60 p-8">Loading applications...</div>;

  return (
    <div>
      <h1 className="font-headline text-2xl font-semibold mb-2">Admission Applications</h1>
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
            const name = answers.student_name || it.name || "—";
            const cls = answers.applying_class || "—";
            const phone = answers.father_phone || "—";
            const email = answers.father_email || "—";
            return (
              <div key={it.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : it.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
                >
                  <div className="flex items-center gap-4">
                    {answers.photo_url && (
                      <img
                        src={answers.photo_url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    )}
                    <div>
                      <div className="font-headline font-semibold text-brand-ink">{name}</div>
                      <div className="text-xs text-brand-ink/60 mt-0.5">
                        {cls} · {phone} · {email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-brand-ink/40">{it.created_at?.slice(0, 10)}</span>
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        it.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-brand-blue/10 text-brand-blue"
                      }`}
                    >
                      {it.status || "pending"}
                    </span>
                    <span className="text-brand-ink/40 text-lg">{isOpen ? "↑" : "↓"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 p-5">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(answers)
                        .filter(([k]) => !SKIP_KEYS.has(k))
                        .map(([k, v]) => {
                          if (!v) return null;
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
                                  View File ↗
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

export default AdminApplications;
