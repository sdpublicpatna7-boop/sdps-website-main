import { useEffect, useState } from "react";
import api from "../../lib/api";
import { ExternalLink, CreditCard, Phone, Mail, AlertCircle } from "lucide-react";
import { useOutletContext } from "react-router-dom";

export default function FeePayment() {
  const { settings } = useOutletContext() || {};
  const [siteSettings, setSiteSettings] = useState(null);

  useEffect(() => {
    api.get("/site-settings").then(r => setSiteSettings(r.data)).catch(() => {});
  }, []);

  const feeUrl = siteSettings?.fee_payment_url || settings?.fee_payment_url || "";

  const handlePayNow = () => {
    if (feeUrl) {
      window.open(feeUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <section className="bg-hero-grad py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="overline mb-3">Online Payment</div>
          <h1 className="legacy-title brand-gradient-text">Fee Payment</h1>
          <p className="mt-4 text-brand-ink/70 max-w-xl mx-auto">
            Pay your child's school fees quickly and securely through our official payment portal.
          </p>
        </div>
      </section>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-white rounded-3xl border border-black/5 overflow-hidden shadow-sm">
          {/* Header stripe */}
          <div className="bg-gradient-to-r from-brand-blue to-brand-blue/80 px-8 py-6 text-white">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 opacity-90" />
              <div>
                <h2 className="font-headline text-xl font-semibold">S.D. Public School</h2>
                <p className="text-white/70 text-sm">Secure Online Fee Payment Portal</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            {/* Info cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-brand-paper rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-brand-blue" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-orange">Accepted Modes</div>
                  <p className="text-sm text-brand-ink/70 mt-1">UPI, Net Banking, Debit / Credit Cards, Wallets</p>
                </div>
              </div>
              <div className="bg-brand-paper rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-orange">Note</div>
                  <p className="text-sm text-brand-ink/70 mt-1">Keep your Admission Number & receipt handy.</p>
                </div>
              </div>
            </div>

            {/* Steps */}
            <div>
              <h3 className="font-headline font-semibold text-brand-ink mb-3">How to Pay</h3>
              <ol className="space-y-3">
                {[
                  "Click \"Pay Fees Online\" below — you'll be taken to our secure portal.",
                  "Enter your child's Admission Number and select the fee head.",
                  "Choose your preferred payment method and complete the transaction.",
                  "Download or note the transaction ID for your records.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-sm text-brand-ink/70">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* CTA */}
            {feeUrl ? (
              <button
                onClick={handlePayNow}
                data-testid="fee-pay-btn"
                className="btn-primary w-full flex items-center justify-center gap-2 text-base py-3"
              >
                <ExternalLink className="w-5 h-5" />
                Pay Fees Online
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
                <p className="text-sm text-amber-700 font-medium">Fee payment portal not configured yet.</p>
                <p className="text-xs text-amber-600 mt-1">Admin can set the payment URL in <strong>Admin → Site Settings → Fee Payment URL</strong>.</p>
              </div>
            )}

            {/* Help */}
            <div className="border-t border-black/5 pt-5 space-y-2">
              <p className="text-xs text-brand-ink/50 font-semibold uppercase tracking-wider">Need Help?</p>
              <div className="flex flex-wrap gap-4 text-sm text-brand-ink/60">
                <a href="tel:+919955190262" className="flex items-center gap-1.5 hover:text-brand-blue transition">
                  <Phone className="w-4 h-4" /> +91 99551 90262
                </a>
                <a href="mailto:helpdesk@sdpublic.org" className="flex items-center gap-1.5 hover:text-brand-blue transition">
                  <Mail className="w-4 h-4" /> helpdesk@sdpublic.org
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
