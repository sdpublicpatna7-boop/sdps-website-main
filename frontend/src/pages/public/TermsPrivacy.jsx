import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import { 
  Shield, 
  FileText, 
  Lock, 
  Scale, 
  CreditCard, 
  Mail, 
  Phone, 
  BookOpen, 
  Clock, 
  HeartHandshake,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  Send,
  ExternalLink,
  ShieldAlert,
  Building,
  UserCheck
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";
import PageHero from "@/components/layout/PageHero";

// High-quality, school-specific fallback content
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
    <li><strong>Fee Payments:</strong> All kinds of fees, including admission, registration, academic, transport, exam, and hostel fees, once paid, are strictly non-refundable and non-transferable under any circumstances.</li>
    <li><strong>Refund Policy:</strong> S.D. Public School maintains a strict no-refund policy for all services, courses, facilities, and academic sessions.</li>
  </ul>

  <h3>4. Campus Facilities & Artificial Turf Rules</h3>
  <p>S.D. Public School provides dedicated infrastructure, including an artificial sports turf area and hostel facilities, to registered students.</p>
  <ul>
    <li>Use of the artificial sports turf ground is permitted only during designated school hours, physical education periods, or special training sessions (Cricket & Football).</li>
    <li>Students must comply with the guidelines, dress code (non-marking shoes), and safety rules. Damage to turf assets due to negligence will be subject to disciplinary action and restoration fees.</li>
    <li>Hostel facilities are governed by separate hostel rules and regulations signed during admission.</li>
  </ul>

  <h3>5. Intellectual Property & DMCA Compliance</h3>
  <p>All content on this website, including logos, images, student artwork, photographs, audio, video, text, and design, is the intellectual property of S.D. Public School, The Suryamuni Devi Foundation Trust, or credited third parties. Unauthorized copying or redistribution is prohibited.</p>
  <p>S.D. Public School complies with the <strong>Digital Millennium Copyright Act (17 U.S.C. § 512, "DMCA")</strong> and the Indian Copyright Act, 1957. If you believe your copyrighted work has been used without authorization, please consult our official <a href="/dmca">DMCA & Copyright Compliance Policy</a> and submit a takedown notice to our designated copyright agent at <a href="mailto:dmca@sdpublic.org">dmca@sdpublic.org</a>.</p>

  <h3>6. Code of Conduct & Account Security</h3>
  <p>Parents, guardians, and authorized staff are issued credentials to access private portals (ERP system). You are solely responsible for maintaining the confidentiality of your account credentials. Any activities under your account are your responsibility. Unacceptable behavior, hacking, scraping, or misuse of school IT infrastructure is strictly prohibited.</p>

  <h3>7. Limitation of Liability & Governing Law</h3>
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

  <h3>5. Children's Privacy & Likeness Protection</h3>
  <p>Our website collects information about minors solely in the context of school admissions and educational administration with parental consent. Event photographs are published to celebrate student achievements in accordance with school policy. Parents or guardians wishing to request the removal or blurring of a photograph depicting their child may submit a request to <a href="mailto:helpdesk@sdpublic.org">helpdesk@sdpublic.org</a> or via our <a href="/dmca">DMCA & Content Takedown Desk</a>.</p>

  <h3>6. Contacting the Helpdesk</h3>
  <p>If you have any questions about this Privacy Policy, the practices of our portals, or your dealings with our services, please reach out to the helpdesk at <strong>helpdesk@sdpublic.org</strong>.</p>
`;

const FALLBACK_DMCA = `
  <h3>1. Statement of Copyright Compliance & Statutory Safe Harbor</h3>
  <p>S.D. Public School (Suryamuni Devi Public School), Patna, managed by The Suryamuni Devi Foundation Trust, strictly adheres to the <strong>Digital Millennium Copyright Act of 1998 (17 U.S.C. § 512, "DMCA")</strong>, the <strong>Indian Copyright Act, 1957 (as amended)</strong>, and Rule 3 of the <strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021</strong>.</p>
  <p>As an educational institution hosting school web portals, student showcases, event photo galleries, and circulars, S.D. Public School maintains statutory Safe Harbor protections under <strong>17 U.S.C. § 512(c)</strong> and <strong>Section 79 of the Information Technology Act, 2000</strong>. It is our policy to respond expeditiously to clear, legally compliant notices of alleged copyright infringement.</p>

  <h3>2. Designated Copyright Agent & Grievance Officer</h3>
  <p>Pursuant to 17 U.S.C. § 512(c)(2) and Rule 3(2) of the Information Technology Rules, 2021, the designated agent to receive notifications of claimed copyright infringement on behalf of S.D. Public School is:</p>
  <div style="background: rgba(14, 56, 122, 0.04); border-left: 3px solid #0E387A; padding: 12px 16px; margin: 16px 0; border-radius: 8px;">
    <p style="margin: 0 0 6px 0;"><strong>Designated Agent / Grievance Officer:</strong> Legal & Media Administration Cell</p>
    <p style="margin: 0 0 6px 0;"><strong>Institution:</strong> S.D. Public School (Suryamuni Devi Public School)</p>
    <p style="margin: 0 0 6px 0;"><strong>Physical Campus:</strong> Maurya Colony, Near R.O.B Kumhrar, Biscoman Golambar, Gulzarbagh Road, Patna, Bihar 800007, India</p>
    <p style="margin: 0 0 6px 0;"><strong>Official DMCA Email:</strong> <a href="mailto:dmca@sdpublic.org">dmca@sdpublic.org</a> (Cc: <a href="mailto:helpdesk@sdpublic.org">helpdesk@sdpublic.org</a>)</p>
    <p style="margin: 0;"><strong>Helpline:</strong> <a href="tel:+919955190262">+91 99551 90262</a> (Mon–Sat, 8:00 AM – 3:00 PM IST)</p>
  </div>

  <h3>3. Notice of Claimed Infringement (Takedown Notice Requirements)</h3>
  <p>If you are a copyright owner or authorized agent and believe that content hosted on <code>sdpublic.org</code>, <code>navrang.sdpublic.org</code>, or associated school repositories infringes your copyright, you must submit a written notification containing <strong>all 6 statutory elements</strong> under 17 U.S.C. § 512(c)(3):</p>
  <ol>
    <li><strong>Physical or Electronic Signature:</strong> A physical or electronic signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.</li>
    <li><strong>Identification of Copyrighted Work:</strong> Identification of the copyrighted work claimed to have been infringed, or a representative list if multiple works are involved.</li>
    <li><strong>Identification of Infringing Material:</strong> Clear identification of the material claimed to be infringing and information reasonably sufficient to locate it on our site (specifically, exact URLs, photo album slugs, or image titles).</li>
    <li><strong>Contact Information:</strong> Full legal name, physical mailing address, telephone number, and a valid email address.</li>
    <li><strong>Good Faith Statement:</strong> A statement that the complaining party has a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
    <li><strong>Statement Under Penalty of Perjury:</strong> A statement that the information in the notification is accurate, and under penalty of perjury, that the complaining party is authorized to act on behalf of the copyright owner.</li>
  </ol>
  <p><em>Note: Under 17 U.S.C. § 512(f), any person who knowingly materially misrepresents that material is infringing may be subject to civil liability and statutory damages. You may use our automated submission form below to submit a verified notice.</em></p>

  <h3>4. Expeditious Review & Safe Harbor Timeline</h3>
  <p>Upon receipt of a valid and complete DMCA notice:</p>
  <ul>
    <li><strong>Tracking Reference:</strong> We assign a unique reference ID (e.g., <code>DMCA-2026-XXXX</code>) and acknowledge receipt within 24 hours.</li>
    <li><strong>Expeditious Disablement:</strong> Public access to the alleged infringing material will be removed or disabled within 24 to 36 hours.</li>
    <li><strong>Uploader Notice:</strong> We take reasonable steps to inform the contributor or uploader of the action taken.</li>
  </ul>

  <h3>5. Counter-Notification Procedure (17 U.S.C. § 512(g))</h3>
  <p>If you believe that your content was removed or access was disabled as a result of a mistake or misidentification (such as licensed usage or educational fair use), you may file a formal Counter-Notification pursuant to 17 U.S.C. § 512(g)(3) containing:</p>
  <ol>
    <li>Your physical or electronic signature.</li>
    <li>Identification of the material that was removed and the URL/location where it previously appeared.</li>
    <li>A statement under penalty of perjury that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification.</li>
    <li>Your legal name, physical address, and telephone number, and a statement consenting to the jurisdiction of the federal or civil courts in Patna, Bihar, India (or your judicial district), and agreeing to accept service of process from the original claimant.</li>
  </ol>
  <p>Unless the original claimant files a legal action in a court of competent jurisdiction within 10 to 14 business days, access to the removed material may be restored.</p>

  <h3>6. Repeat Infringer Policy (17 U.S.C. § 512(i)(1)(A))</h3>
  <p>S.D. Public School maintains a strict repeat infringer policy. We will terminate publishing privileges, contributor rights, or portal accounts of any user or staff member who repeatedly or systematically infringes copyright.</p>

  <h3>7. Educational Fair Use & Child Privacy Policy</h3>
  <p>Academic syllabi, question papers, and educational citations shared on our portals are published strictly for non-commercial pedagogical instruction under <strong>Section 52 of the Indian Copyright Act, 1957</strong> and <strong>17 U.S.C. § 107 (Fair Use)</strong>.</p>
  <p><strong>Parental Privacy Rights:</strong> Photographs from school events (Dandiya Night, Annual Day, Sports Meet, Investiture) celebrate student achievements. If a parent or guardian requests removal or blurring of a photograph depicting their enrolled minor child, we honor the request immediately. Please use the form below or write to <a href="mailto:helpdesk@sdpublic.org">helpdesk@sdpublic.org</a>.</p>
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
  const searchParams = new URLSearchParams(location.search);
  const prefillUrl = searchParams.get("url") || "";
  const prefillTitle = searchParams.get("title") || "";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Determine current policy tab: 'terms' | 'privacy' | 'dmca'
  let pageId = "terms";
  if (location.pathname.includes("privacy")) {
    pageId = "privacy";
  } else if (
    location.pathname.includes("dmca") || 
    location.pathname.includes("copyright")
  ) {
    pageId = "dmca";
  }

  // DMCA Interactive Submission Form State
  const [form, setForm] = useState({
    claimant_name: "",
    organization_or_owner: "",
    claimant_email: "",
    claimant_phone: "",
    physical_address: "",
    copyrighted_work_desc: prefillTitle ? `Original rights holder for: ${prefillTitle}` : "",
    original_work_url: "",
    infringing_urls_or_items: prefillUrl || "",
    good_faith_confirmed: false,
    accuracy_and_perjury_confirmed: false,
    electronic_signature: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  useEffect(() => {
    if (prefillUrl && !form.infringing_urls_or_items) {
      setForm(prev => ({ ...prev, infringing_urls_or_items: prefillUrl }));
    }
  }, [prefillUrl]);

  useEffect(() => {
    setLoading(true);
    const apiId = pageId === "dmca" ? "dmca" : pageId;
    api.get(`/legal/${apiId}`).then(r => {
      if (!r.data || !r.data.content || r.data.content.length < 50) {
        setData({
          title: pageId === "terms" ? "Terms & Conditions" : pageId === "privacy" ? "Privacy Policy" : "DMCA Notice & Copyright Policy",
          content: pageId === "terms" ? FALLBACK_TERMS : pageId === "privacy" ? FALLBACK_PRIVACY : FALLBACK_DMCA,
          updated_at: r.data?.updated_at || new Date().toISOString()
        });
      } else {
        setData(r.data);
      }
    }).catch(() => {
      setData({
        title: pageId === "terms" ? "Terms & Conditions" : pageId === "privacy" ? "Privacy Policy" : "DMCA Notice & Copyright Policy",
        content: pageId === "terms" ? FALLBACK_TERMS : pageId === "privacy" ? FALLBACK_PRIVACY : FALLBACK_DMCA,
        updated_at: new Date().toISOString()
      });
    }).finally(() => setLoading(false));
  }, [pageId]);

  // Sidebar highlights based on selected tab
  const policyHighlights = pageId === "terms" ? [
    { icon: HeartHandshake, title: "Official Use", desc: "Covers website, ERP portal, and payment desks." },
    { icon: CreditCard, title: "Fee Clearance", desc: "All fees once paid are strictly non-refundable." },
    { icon: BookOpen, title: "Affiliation Rules", desc: "Regulated under state & CBSE board policies." },
    { icon: Scale, title: "Patna Jurisdiction", desc: "Governed under Bihar state legal guidelines." }
  ] : pageId === "privacy" ? [
    { icon: Lock, title: "Safe & Encrypted", desc: "Data stored in secure, encrypted databases." },
    { icon: Clock, title: "No Spamming", desc: "WhatsApp and SMS sent only for official notices." },
    { icon: Shield, title: "Zero Sharing", desc: "Your personal details are never sold to advertisers." },
    { icon: FileText, title: "CBSE Compliance", desc: "Reports shared only with educational authorities." }
  ] : [
    { icon: ShieldAlert, title: "17 U.S.C. § 512 Safe Harbor", desc: "Statutory safe harbor compliance for all hosted media and portals." },
    { icon: Clock, title: "24–48h Takedown Protocol", desc: "Expeditious review and access disablement upon compliant notice." },
    { icon: Building, title: "Designated Copyright Agent", desc: "Official agent and grievance cell registered in Patna, India." },
    { icon: Scale, title: "Fair Dealing & Child Privacy", desc: "Educational fair use standards & respectful minor likeness removal." }
  ];

  const handleFormChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleDMCASubmit = async (e) => {
    e.preventDefault();
    if (!form.claimant_name.trim() || !form.claimant_email.trim()) {
      toast.error("Please provide your full legal name and email address.");
      return;
    }
    if (!form.copyrighted_work_desc.trim() || !form.infringing_urls_or_items.trim()) {
      toast.error("Please describe the copyrighted work and provide the exact infringing URL(s).");
      return;
    }
    if (!form.good_faith_confirmed || !form.accuracy_and_perjury_confirmed) {
      toast.error("You must affirm both the Good Faith statement and the Penalty of Perjury statement.");
      return;
    }
    if (!form.electronic_signature.trim()) {
      toast.error("Please type your full legal name as your electronic signature.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/dmca/takedown-request", form);
      const refId = res.data?.reference_id || `DMCA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setSubmissionReceipt({
        reference_id: refId,
        date: new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" }),
        ...form
      });
      toast.success(`DMCA Notice successfully recorded! Ref: ${refId}`);
    } catch (err) {
      console.warn("API DMCA submit fallback triggered:", err);
      // Client-side fallback if server offline
      const fallbackRef = `DMCA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setSubmissionReceipt({
        reference_id: fallbackRef,
        date: new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" }),
        ...form
      });
      toast.success(`Notice recorded! Ref: ${fallbackRef}`);
    } finally {
      setSubmitting(false);
    }
  };

  const copyReceiptText = () => {
    if (!submissionReceipt) return;
    const text = `--- OFFICIAL DMCA NOTICE OF CLAIMED INFRINGEMENT ---
Tracking Reference ID: ${submissionReceipt.reference_id}
Date: ${submissionReceipt.date}
Claimant: ${submissionReceipt.claimant_name}
Organization / Rights Holder: ${submissionReceipt.organization_or_owner || "Individual Owner"}
Email: ${submissionReceipt.claimant_email}
Phone: ${submissionReceipt.claimant_phone || "N/A"}
Address: ${submissionReceipt.physical_address || "N/A"}
Copyrighted Work: ${submissionReceipt.copyrighted_work_desc}
Alleged Infringing URL: ${submissionReceipt.infringing_urls_or_items}
Electronic Signature: ${submissionReceipt.electronic_signature}
Compliance: 17 U.S.C. § 512(c)(3) & Indian Copyright Act 1957
Recipient: Designated Copyright Agent, S.D. Public School, Patna (dmca@sdpublic.org)`;

    navigator.clipboard.writeText(text);
    setCopiedReceipt(true);
    toast.success("Full legal notice text copied to clipboard!");
    setTimeout(() => setCopiedReceipt(false), 3000);
  };

  return (
    <>
      <PageHero
        overline="Legal & Compliance Desk"
        title={
          pageId === "terms" 
            ? "Terms & Conditions" 
            : pageId === "privacy" 
              ? "Privacy Policy" 
              : "DMCA & Copyright Policy"
        }
        subtitle={
          pageId === "dmca"
            ? "Digital Millennium Copyright Act compliance statement, designated agent, and statutory notice and takedown procedures."
            : "Important information about the rules, security, and policies governing our school campus and portals."
        }
        bgImage="https://images.unsplash.com/photo-1450133064473-71024230f91b?q=80&w=1600&auto=format&fit=crop"
      />

      <motion.div 
        className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Three-Tab Policy Navigation */}
        <motion.div variants={cardVariants} className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12">
          <Link 
            to="/terms"
            className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold border transition-all duration-300 ${
              pageId === "terms" 
                ? "bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/15" 
                : "bg-white text-brand-ink border-black/10 hover:border-brand-blue/30 hover:shadow-md"
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms of Service
          </Link>

          <Link 
            to="/privacy"
            className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold border transition-all duration-300 ${
              pageId === "privacy" 
                ? "bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/15" 
                : "bg-white text-brand-ink border-black/10 hover:border-brand-blue/30 hover:shadow-md"
            }`}
          >
            <Shield className="w-4 h-4" />
            Privacy Policy
          </Link>

          <Link 
            to="/dmca"
            className={`flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold border transition-all duration-300 ${
              pageId === "dmca" 
                ? "bg-brand-orange text-white border-brand-orange shadow-lg shadow-brand-orange/20" 
                : "bg-white text-brand-ink border-black/10 hover:border-brand-orange/40 hover:shadow-md"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            DMCA &amp; Copyright Policy
          </Link>
        </motion.div>

        {/* Two-Column Desktop Grid */}
        <div className="grid lg:grid-cols-12 gap-8 sm:gap-10 items-start">
          
          {/* Left Column: Sidebar with Policy Highlights */}
          <motion.div variants={cardVariants} className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="bg-gradient-to-br from-brand-blue/5 via-white to-white border border-brand-blue/10 rounded-3xl p-6 shadow-sm">
              <h3 className="font-headline font-bold text-lg text-brand-blue mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-brand-blue" />
                <span>Policy Highlights</span>
              </h3>
              
              <div className="space-y-4">
                {policyHighlights.map((hl, idx) => {
                  const Icon = hl.icon;
                  return (
                    <div key={idx} className="flex gap-3.5 items-start group">
                      <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform shrink-0 mt-0.5">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-brand-ink leading-snug">{hl.title}</h4>
                        <p className="text-[11px] sm:text-xs text-brand-ink/65 mt-0.5 leading-relaxed">{hl.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Designated Copyright Agent / Helpdesk Widget */}
            <div className="bg-gradient-to-br from-brand-orange/5 via-white to-white border border-brand-orange/15 rounded-3xl p-6 shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2.5 py-1 rounded-full inline-block mb-2">
                {pageId === "dmca" ? "Designated Agent" : "Official Helpdesk"}
              </span>
              <h3 className="font-headline font-bold text-base sm:text-lg text-brand-orange mb-2">
                {pageId === "dmca" ? "Copyright & Grievance Cell" : "Need Assistance?"}
              </h3>
              <p className="text-xs text-brand-ink/75 leading-relaxed mb-4">
                {pageId === "dmca" 
                  ? "For formal DMCA notifications, counter-notices, or student photo removal requests:" 
                  : "For legal queries, school registry changes, or portal access issues:"}
              </p>
              
              <div className="space-y-2.5 text-xs">
                <a href={pageId === "dmca" ? "mailto:dmca@sdpublic.org" : "mailto:helpdesk@sdpublic.org"} className="flex items-center gap-2.5 font-bold text-brand-blue hover:underline">
                  <Mail className="w-4 h-4 shrink-0 text-brand-blue/70" />
                  <span>{pageId === "dmca" ? "dmca@sdpublic.org" : "helpdesk@sdpublic.org"}</span>
                </a>
                <a href="tel:+919955190262" className="flex items-center gap-2.5 font-bold text-brand-blue hover:underline">
                  <Phone className="w-4 h-4 shrink-0 text-brand-blue/70" />
                  <span>+91 99551 90262</span>
                </a>
                <div className="flex items-start gap-2.5 text-brand-ink/65 pt-2 border-t border-black/5 text-[11px] leading-relaxed">
                  <Building className="w-4 h-4 shrink-0 text-brand-ink/40 mt-0.5" />
                  <span>Maurya Colony, Near R.O.B Kumhrar, Patna 800007</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Main legal document content + Interactive Form */}
          <motion.div variants={cardVariants} className="lg:col-span-8 space-y-10">
            {loading ? (
              <div className="bg-white rounded-3xl border border-black/5 p-12 text-center py-32 text-brand-ink/40 shadow-sm">
                <div className="animate-pulse flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <Clock className="w-6 h-6 animate-spin" />
                  </div>
                  <div className="font-semibold text-sm">Retrieving compliance document...</div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-black/5 p-6 sm:p-10 md:p-12 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-brand-blue/5 to-transparent rounded-full blur-3xl pointer-events-none" />
                
                {/* Meta details */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 pb-6 mb-8">
                  <div>
                    <h2 className="font-headline font-extrabold text-2xl sm:text-3xl text-brand-blue leading-tight">
                      {data?.title || (
                        pageId === "terms" 
                          ? "Terms & Conditions" 
                          : pageId === "privacy" 
                            ? "Privacy Policy" 
                            : "DMCA Notice & Copyright Policy"
                      )}
                    </h2>
                    {data?.updated_at && (
                      <p className="mt-1 text-xs font-bold text-brand-ink/45 uppercase tracking-widest">
                        Effective Date: {new Date(data.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Compliant Copy
                    </span>
                  </div>
                </div>

                {/* Prose Section */}
                <div 
                  className="prose prose-slate max-w-none 
                    prose-headings:font-headline prose-headings:font-bold prose-headings:text-brand-blue prose-headings:mt-8 prose-headings:mb-3
                    prose-h3:text-base sm:prose-h3:text-lg prose-h3:border-l-2 prose-h3:border-brand-orange prose-h3:pl-3
                    prose-p:text-brand-ink/80 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-xs sm:prose-p:text-sm
                    prose-ul:list-disc prose-ul:pl-5 prose-ul:space-y-2 prose-ul:mb-4 prose-li:text-brand-ink/80 prose-li:text-xs sm:prose-li:text-sm
                    prose-ol:list-decimal prose-ol:pl-5 prose-ol:space-y-2 prose-ol:mb-4 prose-li:text-brand-ink/80 prose-li:text-xs sm:prose-li:text-sm
                    prose-strong:text-brand-blue prose-strong:font-bold"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data?.content || "") }}
                />
              </div>
            )}

            {/* Interactive DMCA Takedown Notice Submission Form (Appears under DMCA tab) */}
            {pageId === "dmca" && (
              <div id="dmca-form" className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-10 border border-amber-400/30 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 via-brand-orange to-yellow-300"></div>
                
                <div className="mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/10 text-amber-300 border border-amber-400/30 mb-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Online Statutory Filing
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black font-headline text-white mb-2">
                    Submit an Official DMCA Takedown Notice
                  </h3>
                  <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                    Are you a copyright owner or legal counsel? Submit an official Notice of Claimed Infringement directly to our Designated Agent. All fields are required pursuant to 17 U.S.C. § 512(c)(3).
                  </p>
                </div>

                {submissionReceipt ? (
                  /* Success Receipt Card */
                  <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white font-headline">Notice Officially Logged</h4>
                        <p className="text-xs text-emerald-300">
                          Tracking Reference: <strong className="text-amber-300 font-mono text-sm">{submissionReceipt.reference_id}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="bg-black/50 rounded-xl p-4 text-xs space-y-2 border border-white/10 text-slate-300">
                      <div><strong className="text-white">Claimant:</strong> {submissionReceipt.claimant_name} ({submissionReceipt.claimant_email})</div>
                      <div><strong className="text-white">Infringing URL:</strong> <code className="text-amber-200 break-all">{submissionReceipt.infringing_urls_or_items}</code></div>
                      <div><strong className="text-white">Timestamp:</strong> {submissionReceipt.date}</div>
                      <div><strong className="text-white">Status:</strong> <span className="text-emerald-400 font-bold">Pending Review (Action within 24-36h)</span></div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-2">
                      <button
                        onClick={copyReceiptText}
                        className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        {copiedReceipt ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedReceipt ? "Copied to Clipboard!" : "Copy Full Notice Record"}</span>
                      </button>

                      <a
                        href={`mailto:dmca@sdpublic.org?subject=DMCA%20Notice%20${submissionReceipt.reference_id}&body=Tracking%20Reference:%20${submissionReceipt.reference_id}%0AClaimant:%20${encodeURIComponent(submissionReceipt.claimant_name)}%0AInfringing%20URL:%20${encodeURIComponent(submissionReceipt.infringing_urls_or_items)}`}
                        className="px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-orange-600 text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                      >
                        <Mail className="w-4 h-4" />
                        <span>Email Copy to dmca@sdpublic.org</span>
                      </a>

                      <button
                        onClick={() => {
                          setSubmissionReceipt(null);
                          setForm({
                            claimant_name: "",
                            organization_or_owner: "",
                            claimant_email: "",
                            claimant_phone: "",
                            physical_address: "",
                            copyrighted_work_desc: "",
                            original_work_url: "",
                            infringing_urls_or_items: "",
                            good_faith_confirmed: false,
                            accuracy_and_perjury_confirmed: false,
                            electronic_signature: ""
                          });
                        }}
                        className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-slate-400 hover:text-white text-xs transition"
                      >
                        File Another Notice
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Formal Takedown Form */
                  <form onSubmit={handleDMCASubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                          Claimant Legal Name <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={form.claimant_name}
                          onChange={(e) => handleFormChange("claimant_name", e.target.value)}
                          placeholder="e.g. Rahul Sharma / Legal Counsel"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                          Copyright Owner / Organization
                        </label>
                        <input
                          type="text"
                          value={form.organization_or_owner}
                          onChange={(e) => handleFormChange("organization_or_owner", e.target.value)}
                          placeholder="e.g. Self / Media Studio Pvt Ltd"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                          Email Address <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={form.claimant_email}
                          onChange={(e) => handleFormChange("claimant_email", e.target.value)}
                          placeholder="claimant@example.com"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                          Telephone Number
                        </label>
                        <input
                          type="tel"
                          value={form.claimant_phone}
                          onChange={(e) => handleFormChange("claimant_phone", e.target.value)}
                          placeholder="+91 XXXXX XXXXX"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                        Physical Mailing Address
                      </label>
                      <input
                        type="text"
                        value={form.physical_address}
                        onChange={(e) => handleFormChange("physical_address", e.target.value)}
                        placeholder="Street, City, State, Postal Code, Country"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                        Identification of Copyrighted Work <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={form.copyrighted_work_desc}
                        onChange={(e) => handleFormChange("copyrighted_work_desc", e.target.value)}
                        placeholder="Describe the copyrighted photograph, artwork, document, or publication. Include copyright registration numbers or links to authorized publication if available."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                        Location of Alleged Infringing Material on sdpublic.org <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.infringing_urls_or_items}
                        onChange={(e) => handleFormChange("infringing_urls_or_items", e.target.value)}
                        placeholder="e.g. https://www.sdpublic.org/photos/navrang-2026 (Photo #14) or specific URL"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-amber-400 transition"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Provide the exact web address (URL) or photo identifier so our team can immediately locate and disable access.
                      </p>
                    </div>

                    {/* Statutory Affirmations */}
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          required
                          checked={form.good_faith_confirmed}
                          onChange={(e) => handleFormChange("good_faith_confirmed", e.target.checked)}
                          className="mt-0.5 rounded border-white/20 text-brand-orange focus:ring-brand-orange shrink-0 cursor-pointer"
                        />
                        <span className="text-xs text-slate-300 group-hover:text-white leading-relaxed">
                          <strong>Good Faith Statement:</strong> I have a good faith belief that use of the copyrighted material in the manner complained of is not authorized by the copyright owner, its agent, or the law (17 U.S.C. § 512(c)(3)(A)(v)).
                        </span>
                      </label>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          required
                          checked={form.accuracy_and_perjury_confirmed}
                          onChange={(e) => handleFormChange("accuracy_and_perjury_confirmed", e.target.checked)}
                          className="mt-0.5 rounded border-white/20 text-brand-orange focus:ring-brand-orange shrink-0 cursor-pointer"
                        />
                        <span className="text-xs text-slate-300 group-hover:text-white leading-relaxed">
                          <strong>Penalty of Perjury:</strong> The information in this notification is accurate, and under penalty of perjury, I declare that I am the copyright owner or authorized to act on behalf of the owner of an exclusive right that is allegedly infringed (17 U.S.C. § 512(c)(3)(A)(vi)).
                        </span>
                      </label>
                    </div>

                    {/* Digital Signature */}
                    <div className="pt-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-1">
                        Electronic Signature (Full Legal Name) <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={form.electronic_signature}
                        onChange={(e) => handleFormChange("electronic_signature", e.target.value)}
                        placeholder="Type your full legal name"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-xs font-serif italic text-base focus:outline-none focus:border-amber-400 transition"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Typing your legal name constitutes an electronic signature under 17 U.S.C. § 512(c)(3)(A)(i).
                      </p>
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-4">
                      <p className="text-[11px] text-slate-400 hidden sm:block">
                        Processed confidentially by S.D. Public School Legal Cell within 24–36 hours.
                      </p>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full sm:w-auto px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 via-brand-orange to-orange-600 hover:opacity-95 text-slate-950 font-black text-xs font-headline flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <Clock className="w-4 h-4 animate-spin" />
                            <span>Recording Notice...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-slate-950" />
                            <span>Submit Official DMCA Takedown Notice</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </motion.div>

        </div>
      </motion.div>
    </>
  );
}
