import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import api from "../../lib/api";

export default function TermsPrivacy() {
  const { page } = useParams(); // "terms" or "privacy"
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const pageId = page === "privacy" ? "privacy" : "terms";

  useEffect(() => {
    api.get(`/legal/${pageId}`).then(r => setData(r.data)).catch(() => {
      setData({
        title: pageId === "terms" ? "Terms & Conditions" : "Privacy Policy",
        content: "<p>This page is being updated. Please check back soon.</p>",
        updated_at: new Date().toISOString()
      });
    }).finally(() => setLoading(false));
  }, [pageId]);

  return (
    <>
      <section className="bg-hero-grad py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="overline mb-3">Legal</div>
          <h1 className="legacy-title brand-gradient-text">{data?.title || (pageId === "terms" ? "Terms & Conditions" : "Privacy Policy")}</h1>
          {data?.updated_at && (
            <p className="mt-3 text-brand-ink/50 text-sm">
              Last updated: {new Date(data.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          )}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Toggle */}
        <div className="flex gap-2 mb-8">
          <Link to="/terms"
            className={`px-5 py-2 rounded-xl text-sm font-semibold border transition ${pageId === "terms" ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-brand-ink border-black/10 hover:border-brand-blue"}`}>
            Terms & Conditions
          </Link>
          <Link to="/privacy"
            className={`px-5 py-2 rounded-xl text-sm font-semibold border transition ${pageId === "privacy" ? "bg-brand-blue text-white border-brand-blue" : "bg-white text-brand-ink border-black/10 hover:border-brand-blue"}`}>
            Privacy Policy
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-brand-ink/40">Loading...</div>
        ) : (
          <div className="bg-white rounded-3xl border border-black/5 p-8 shadow-sm">
            <div
              className="prose prose-lg max-w-none prose-headings:text-brand-blue prose-headings:font-headline prose-a:text-brand-blue"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data?.content || "") }}
            />
          </div>
        )}

        {/* Contact note */}
        <div className="mt-8 bg-brand-paper rounded-2xl border border-black/5 p-5 text-sm text-brand-ink/60 text-center">
          Questions? Contact us at{" "}
          <a href="mailto:helpdesk@sdpublic.org" className="text-brand-blue hover:underline">helpdesk@sdpublic.org</a>
          {" "}or{" "}
          <a href="tel:+919955190262" className="text-brand-blue hover:underline">+91 99551 90262</a>
        </div>
      </div>
    </>
  );
}
