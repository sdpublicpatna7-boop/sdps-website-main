import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

export default function AdmissionsEligibility() {
  const [rows, setRows] = useState([]);
  const [session, setSession] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/eligibility-rows").then(r => {
      const data = r.data;
      setRows(data);
      const uniqueSessions = [...new Set(data.map(row => row.session).filter(Boolean))];
      setSessions(uniqueSessions);
      if (uniqueSessions.length > 0) setSession(uniqueSessions[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const displayed = session ? rows.filter(r => r.session === session) : rows;

  const defaultRows = [
    { id: "1", class_name: "Play Group", min_age: "2 Years", max_age: "3 Years", born_between: "01 April 2021 - 01 April 2023" },
    { id: "2", class_name: "Nursery", min_age: "3 Years", max_age: "5 Years", born_between: "01 April 2019 - 01 April 2022" },
    { id: "3", class_name: "KG-I", min_age: "4 Years", max_age: "6 Years", born_between: "01 April 2018 - 01 April 2021" },
    { id: "4", class_name: "KG-II", min_age: "5 Years", max_age: "7 Years", born_between: "01 April 2017 - 01 April 2020" },
    { id: "5", class_name: "Class I", min_age: "6 Years", max_age: "8 Years", born_between: "01 April 2017 - 01 April 2019" },
    { id: "6", class_name: "Class II", min_age: "7 Years", max_age: "9 Years", born_between: "01 April 2016 - 01 April 2018" },
    { id: "7", class_name: "Class III", min_age: "8 Years", max_age: "10 Years", born_between: "01 April 2015 - 01 April 2017" },
    { id: "8", class_name: "Class IV", min_age: "8 Years", max_age: "10 Years", born_between: "01 April 2014 - 01 April 2016" },
    { id: "9", class_name: "Class V", min_age: "9 Years", max_age: "11 Years", born_between: "01 April 2013 - 01 April 2015" },
    { id: "10", class_name: "Class VI", min_age: "10 Years", max_age: "12 Years", born_between: "01 April 2012 - 01 April 2014" },
    { id: "11", class_name: "Class VII", min_age: "11 Years", max_age: "13 Years", born_between: "01 April 2011 - 01 April 2013" },
    { id: "12", class_name: "Class VIII", min_age: "12 Years", max_age: "14 Years", born_between: "01 April 2010 - 01 April 2012" },
  ];

  const tableData = displayed.length > 0 ? displayed : defaultRows;

  return (
    <>
      <section className="bg-hero-grad py-16">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-blue/10 text-brand-blue text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full mb-4">Age Criteria</div>
          <h1 className="legacy-title brand-gradient-text">Admission Eligibility</h1>
          <p className="mt-4 text-brand-ink/70 max-w-xl mx-auto">Who Can Apply? Age criteria per class is listed below — updated each session by administration.</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Session selector */}
        {sessions.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {sessions.map(s => (
              <button key={s} onClick={() => setSession(s)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${session === s ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-brand-ink border-black/10 hover:border-brand-blue"}`}>
                Session {s}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-brand-ink/40">Loading eligibility criteria...</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl shadow-sm border border-black/5">
            <table className="w-full bg-white">
              <thead>
                <tr className="bg-brand-blue text-white text-sm">
                  <th className="px-5 py-4 text-left font-semibold">Class</th>
                  <th className="px-5 py-4 text-left font-semibold">Min Age</th>
                  <th className="px-5 py-4 text-left font-semibold">Max Age</th>
                  <th className="px-5 py-4 text-left font-semibold">Born Between</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, i) => (
                  <tr key={row.id} className={`border-t border-black/5 ${i % 2 === 0 ? "bg-white" : "bg-brand-paper"}`}>
                    <td className="px-5 py-3.5 font-semibold text-brand-blue text-sm">{row.class_name}</td>
                    <td className="px-5 py-3.5 text-sm text-brand-ink/70">{row.min_age}</td>
                    <td className="px-5 py-3.5 text-sm text-brand-ink/70">{row.max_age}</td>
                    <td className="px-5 py-3.5 text-sm text-brand-ink/60">{row.born_between}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Important Notes */}
        <div className="mt-8 grid md:grid-cols-2 gap-5">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="font-headline font-semibold text-amber-800 mb-2">⚠️ Important Notes</div>
            <p className="text-sm text-amber-700">The minimum age limit to appear for the CBSE Class 10th board exam is <strong>14 years</strong>, which means the candidate must have completed 14 years of age as on <strong>31st December</strong> of the year of examination.</p>
            <p className="text-sm text-amber-700 mt-2">Admission is open to all, subject to seat availability and school norms.</p>
          </div>
          <div className="bg-white border border-black/5 rounded-2xl p-5 space-y-3">
            <div className="font-headline font-semibold text-brand-blue">Have Questions?</div>
            <p className="text-sm text-brand-ink/60">Contact our admission office for any queries regarding eligibility or the admission process.</p>
            <div className="flex flex-col gap-2">
              <a href="tel:+919955190262" className="btn-primary text-sm text-center">📞 Call Now: +91 99551 90262</a>
              <Link to="/admission-form" className="btn-glass text-sm text-center">Apply Now →</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
