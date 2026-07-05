import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";
import { Shield, FileText, Lock, Scale, CreditCard, Mail, Phone, BookOpen, Clock, HeartHandshake } from "lucide-react";
import api from "../../lib/api";
import PageHero from "@/components/layout/PageHero";

// High-quality, school-specific fallback content in case DB is unpopulated
const FALLBACK_TERMS = `
  <h3>1. Acceptance of Terms</h3>
  <p>Welcome to the Suryamuni Devi Public School (SDPS), Patna website, online portals, and administrative systems. By accessing or using our websites, online fee portals, student registries, or any services provided by S.D. Public School (collectively, "Services"), you agree to comply with and be bound by these Terms and Conditions. If you do not agree, please do not access or use our Services.</p>

  <h3>2. Admission Policies & Portal Registration</h3>
  <p>The admission portal is intended to facilitate student registrations. Submission of an admission form does not guarantee admission. Admissions are subject to eligibility verification, document check, fee clearance, and final decision by the school board according to CBSE guidelines.</p>
  <ul>
    <li>All information provided during admission must be truthful, complete, and accurate.</li>
    <li>Falsification of documents (including birth certificates and transfer certificates) will result in immediate cancellation of registration.</li>
  </ul>

  <h3>3. Fee Payments, Cancellations & Refund Rules</h3>
  <p>S.D. Public School provides online payment facilities through integrated payment gateways (Razorpay) for school fee collection, registration fees, and other charges.</p>
  <ul>
    <li><strong>Payment Gateway:</strong> All transactions are subject to the terms of the respective payment gateways. The school is not liable for transactions failing due to technical errors on the gateway's or bank's side.</li>
    <li><strong>Registration Fees:</strong> Admission registration fees are strictly non-refundable and non-transferable under any circumstances.</li>
    <li><strong>Refund Policy:</strong> Academic and hostel fees once paid are subject to the school board's official refund rules. Refund requests must be submitted in writing to the Principal's office.</li>
  </ul>

  <h3>4. Campus Facilities & Artificial Turf Rules</h3>
  <p>S.D. Public School provides dedicated infrastructure, including an artificial sports turf area and hostel facilities, to registered students.</p>
  <ul>
    <li>Use of the artificial sports turf ground is permitted only during designated school hours, physical education periods, or special training sessions (Cricket & Football).</li>
    <li>Students must comply with the guidelines, dress code (non-marking shoes), and safety rules. Damage to turf assets due to negligence will be subject to disciplinary action and restoration fees.</li>
    <li>Hostel facilities are governed by separate hostel rules and regulations signed during admission.</li>
  </ul>

  <h3>5. Code of Conduct & Account Security</h3>
  <p>Parents, guardians, and authorized staff are issued credentials to access private portals (ERP system). You are solely responsible for maintaining the confidentiality of your account credentials. Any activities under your account are your responsibility. Unacceptable behavior, hacking, scraping, or misuse of school IT infrastructure is strictly prohibited.</p>

  <h3>6. Limitation of Liability & Governing Law</h3>
  <p>The Services and all campus facilities are provided on an "as is" and "as available" basis. S.D. Public School is not liable for any indirect or consequential damages arising out of your access or inability to access our online services. These terms are governed by the laws of India, and any disputes are subject to the exclusive jurisdiction of the courts in Patna, Bihar.</p>
`;

const FALLBACK_PRIVACY = `
  <h3>1. Information We Collect</h3>
  <p>Suryamuni Devi Public School (SDPS) collects personal data from parents, guardians, students, and staff members to facilitate administrative, educational, and communication services. This includes:</p>
  <ul>
    <li><strong>Student Information:</strong> Name, date of birth, class, previous academic records, photographs, and medical history.</li>
    <li><strong>Parent/Guardian Information:</strong> Name, contact numbers, email address, profession, residential address, and billing details.</li>
    <li><strong>Portal usage details:</strong> Logins, page views, fee transaction logs, and IP addresses when using the ERP or payment desk.</li>
  </ul>

  <h3>2. How We Use Your Data</h3>
  <p>Your data is collected strictly for the following purposes:</p>
  <ul>
    <li>Processing admissions, generating report cards, and tracking academic progress.</li>
    <li>Processing fee payments securely via integrated gateway partners (Razorpay).</li>
    <li>Sending circulars, emergency alerts, fee reminders, and attendance updates via SMS and official WhatsApp messaging channels.</li>
    <li>Complying with administrative requirements of CBSE and state education authorities.</li>
  </ul>

  <h3>3. Data Retention and Security</h3>
  <p>We implement a range of security measures (including secure hosting, data firewalls, and restricted admin access tokens) to maintain the safety of your personal information.</p>
  <ul>
    <li>All sensitive transaction data is encrypted and processed via secure servers. No payment card details are stored directly on the school's servers.</li>
    <li>Student and academic files are kept for the duration of the student's enrollment and as required by educational board regulations.</li>
  </ul>

  <h3>4. Sharing of Information</h3>
  <p>We do not sell, trade, or rent personal identification info to third-party marketing companies. Data is shared only with:</p>
  <ul>
    <li>Educational authorities (CBSE, Department of Education) for registration and board exams.</li>
    <li>Trusted third-party service providers (SMS operators, ERP developers, Payment gateways) who assist us in operating our school portals, provided they agree to keep all data confidential.</li>
  </ul>

  <h3>5. Use of Cookies</h3>
  <p>Our website uses standard session cookies to remember portal logins, secure user sessions, and gather anonymous analytics regarding site performance. You can disable cookies in your browser settings, but some features of the admin/parent portal may not function correctly.</p>

  <h3>6. Contacting the Helpdesk</h3>
  <p>If you have any questions about this Privacy Policy, the practices of our portals, or your dealings with our services, please reach out to the helpdesk at <strong>helpdesk@sdpublic.org</strong>.</p>
`;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function TermsPrivacy() {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const pageId = location.pathname.includes("privacy") ? "privacy" : "terms";

  useEffect(() => {
    setLoading(true);
    api.get(`/legal/${pageId}`).then(r => {
      // If server returns empty content, use fallback
      if (!r.data || !r.data.content || r.data.content.length < 50) {
        setData({
          title: pageId === "terms" ? "Terms & Conditions" : "Privacy Policy",
          content: pageId === "terms" ? FALLBACK_TERMS : FALLBACK_PRIVACY,
          updated_at: r.data?.updated_at || new Date().toISOString()
        });
      } else {
        setData(r.data);
      }
    }).catch(() => {
      setData({
        title: pageId === "terms" ? "Terms & Conditions" : "Privacy Policy",
        content: pageId === "terms" ? FALLBACK_TERMS : FALLBACK_PRIVACY,
        updated_at: new Date().toISOString()
      });
    }).finally(() => setLoading(false));
  }, [pageId]);

  // Sidebar highlights based on selected tab
  const policyHighlights = pageId === "terms" ? [
    { icon: HeartHandshake, title: "Official Use", desc: "Covers website, ERP portal, and payment desks." },
    { icon: CreditCard, title: "Fee Clearance", desc: "Registration fees are non-refundable." },
    { icon: BookOpen, title: "Affiliation Rules", desc: "Regulated under state & CBSE board policies." },
    { icon: Scale, title: "Patna Jurisdiction", desc: "Governed under Bihar state legal guidelines." }
  ] : [
    { icon: Lock, title: "Safe & Encrypted", desc: "Data stored in secure, encrypted databases." },
    { icon: Clock, title: "No Spamming", desc: "WhatsApp and SMS sent only for official notices." },
    { icon: Shield, title: "Zero Sharing", desc: "Your personal details are never sold to advertisers." },
    { icon: FileText, title: "CBSE Compliance", desc: "Reports shared only with educational authorities." }
  ];

  return (
    <>
      <PageHero
        overline="Legal & Privacy Desk"
        title={pageId === "terms" ? "Terms & Conditions" : "Privacy Policy"}
        subtitle="Important information about the rules, security, and policies governing our school campus and portals."
        bgImage="https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1600&auto=format&fit=crop"
      />

      <motion.div 
        className="max-w-6xl mx-auto px-6 py-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Toggle Nav */}
        <motion.div variants={cardVariants} className="flex justify-center gap-4 mb-12">
          <Link to="/terms"
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border transition-all duration-300 ${
              pageId === "terms" 
                ? "bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/15" 
                : "bg-white text-brand-ink border-black/10 hover:border-brand-blue/30 hover:shadow-md"
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms of Service
          </Link>
          <Link to="/privacy"
            className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold border transition-all duration-300 ${
              pageId === "privacy" 
                ? "bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/15" 
                : "bg-white text-brand-ink border-black/10 hover:border-brand-blue/30 hover:shadow-md"
            }`}
          >
            <Shield className="w-4 h-4" />
            Privacy Policy
          </Link>
        </motion.div>

        {/* Two-Column Desktop Grid */}
        <div className="grid lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Sidebar with Policy Highlights */}
          <motion.div variants={cardVariants} className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="bg-gradient-to-br from-brand-blue/5 via-white to-white border border-brand-blue/10 rounded-3xl p-6 shadow-sm">
              <h3 className="font-headline font-bold text-lg text-brand-blue mb-4">
                Policy Highlights
              </h3>
              
              <div className="space-y-5">
                {policyHighlights.map((hl, idx) => {
                  const Icon = hl.icon;
                  return (
                    <div key={idx} className="flex gap-4 items-start group">
                      <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-brand-ink">{hl.title}</h4>
                        <p className="text-xs text-brand-ink/60 mt-0.5 leading-relaxed">{hl.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Contact Widget */}
            <div className="bg-gradient-to-br from-brand-orange/5 via-white to-white border border-brand-orange/10 rounded-3xl p-6 shadow-sm">
              <h3 className="font-headline font-bold text-lg text-brand-orange mb-3">
                Need Help?
              </h3>
              <p className="text-xs text-brand-ink/70 leading-relaxed mb-4">
                For legal queries, school registry changes, or portal access issues, contact the administration helpdesk:
              </p>
              
              <div className="space-y-2.5">
                <a href="mailto:helpdesk@sdpublic.org" className="flex items-center gap-3 text-xs font-semibold text-brand-blue hover:underline">
                  <Mail className="w-4 h-4 shrink-0 text-brand-blue/70" />
                  helpdesk@sdpublic.org
                </a>
                <a href="tel:+919955190262" className="flex items-center gap-3 text-xs font-semibold text-brand-blue hover:underline">
                  <Phone className="w-4 h-4 shrink-0 text-brand-blue/70" />
                  +91 99551 90262
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Main legal document content */}
          <motion.div variants={cardVariants} className="lg:col-span-8">
            {loading ? (
              <div className="bg-white rounded-3xl border border-black/5 p-12 text-center py-32 text-brand-ink/40 shadow-sm">
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <Clock className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="font-semibold text-sm">Retrieving policy document...</div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-black/5 p-8 md:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                
                {/* Meta details */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-6 mb-8">
                  <div>
                    <h2 className="font-headline font-extrabold text-2xl text-brand-blue leading-tight">
                      {data?.title || (pageId === "terms" ? "Terms & Conditions" : "Privacy Policy")}
                    </h2>
                    {data?.updated_at && (
                      <p className="mt-1 text-xs font-bold text-brand-ink/45 uppercase tracking-widest">
                        Effective Date: {new Date(data.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="px-3.5 py-1 bg-brand-blue/5 border border-brand-blue/10 rounded-full text-brand-blue text-xs font-bold uppercase tracking-wider">
                    School Copy
                  </div>
                </div>

                {/* Prose Section */}
                <div 
                  className="prose prose-slate max-w-none 
                    prose-headings:font-headline prose-headings:font-bold prose-headings:text-brand-blue prose-headings:mt-8 prose-headings:mb-4
                    prose-h3:text-lg prose-h3:border-l-2 prose-h3:border-brand-orange prose-h3:pl-3
                    prose-p:text-brand-ink/80 prose-p:leading-relaxed prose-p:mb-5 prose-p:text-sm
                    prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-2 prose-ul:mb-5 prose-li:text-brand-ink/80 prose-li:text-sm
                    prose-strong:text-brand-blue prose-strong:font-bold"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data?.content || "") }}
                />
              </div>
            )}
          </motion.div>

        </div>
      </motion.div>
    </>
  );
}
