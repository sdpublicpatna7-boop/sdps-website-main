import { useLocation } from "react-router-dom";
import SEO from "./SEO";

const ROUTE_META_MAP = {
  // Public Pages
  "/": {
    title: "Best School in Patna | S.D. Public School (SDPS Patna)",
    desc: "S.D. Public School (Suryamuni Devi Public School), Patna — Ranked among the best schools in Patna, Bihar. Modern smart classes, sports facilities, experienced faculty & values since 1994.",
    keywords: "best school in patna, top school in patna, schools in patna, sd public school patna, suryamuni devi public school, top 10 schools in patna"
  },
  "/about": {
    title: "About Us & School History | Best School in Patna — SDPS",
    desc: "Learn about S.D. Public School Patna, our founder's vision, leadership, awards, 30+ year legacy, and academic ethos in Patna, Bihar.",
    keywords: "sd public school patna history, best school in patna legacy, suryamuni devi public school about"
  },
  "/academics": {
    title: "Academic Excellence & Curriculum | S.D. Public School, Patna",
    desc: "Explore curriculum, smart classrooms, science labs, computer labs, and holistic education standards at S.D. Public School Patna.",
    keywords: "curriculum patna, best academic school in patna, smart classes school patna"
  },
  "/house-system": {
    title: "House System & Co-Curricular Activities | S.D. Public School, Patna",
    desc: "Discover house competitions, student leadership, sports, arts, and extracurricular programs at S.D. Public School Patna.",
    keywords: "sports school in patna, co-curricular activities patna schools"
  },
  "/hostel": {
    title: "Best Boarding & Hostel School in Patna | S.D. Public School",
    desc: "Secure, comfortable, and nurturing boarding house and hostel accommodation facilities for boys and girls at S.D. Public School Patna.",
    keywords: "best hostel school in patna, boarding school in patna, school with hostel in patna"
  },
  "/demystified": {
    title: "SDPS Demystified | S.D. Public School, Patna",
    desc: "Comprehensive insights into school methodology, student discipline, values, and campus life at SDPS Patna.",
    keywords: "sdps demystified, sd public school patna values"
  },
  "/administration-message": {
    title: "Administration Messages | S.D. Public School, Patna",
    desc: "Read messages from the Principal, Chairman, Director, and Management Board of S.D. Public School Patna.",
    keywords: "sd public school principal message, sdps patna management"
  },
  "/preschool": {
    title: "Top Pre-School & Play School in Patna | S.D. Public School Junior Wing",
    desc: "Nurturing early childhood education, playgroup, nursery, LKG, and UKG at S.D. Public School Junior Wing, Patna.",
    keywords: "top preschool in patna, best play school in patna, nursery admission patna"
  },
  "/gallery": {
    title: "Photo Gallery & Events | S.D. Public School, Patna",
    desc: "Browse event photos, annual functions, sports days, cultural meets, and campus highlights at SDPS Patna.",
    keywords: "sd public school photos, sdps patna campus gallery"
  },
  "/videos": {
    title: "Video Gallery | S.D. Public School, Patna",
    desc: "Watch video highlights, event recordings, campus tours, and student performances at S.D. Public School Patna.",
    keywords: "sdps patna videos, sd public school event videos"
  },
  "/news": {
    title: "Latest News & Updates | S.D. Public School, Patna",
    desc: "Stay updated with recent news, press releases, achievements, and notices from S.D. Public School Patna.",
    keywords: "sd public school news, sdps patna achievements"
  },
  "/notices": {
    title: "Official Notices & Circulars | S.D. Public School, Patna",
    desc: "Important school circulars, exam notifications, fee guidelines, and official announcements for parents and students.",
    keywords: "sdps patna notices, sd public school circulars"
  },
  "/calendar": {
    title: "Academic Calendar & Events | S.D. Public School, Patna",
    desc: "View official school calendar, holidays schedule, exam dates, and upcoming events at SDPS Patna.",
    keywords: "sdps academic calendar, school holidays patna"
  },
  "/student-council": {
    title: "Student Council & House Captains | S.D. Public School, Patna",
    desc: "Meet the elected Student Council members, Head Boy, Head Girl, Sports Captains, and House Prefects at SDPS Patna.",
    keywords: "sdps student council, house captains sd public school"
  },
  "/admissions": {
    title: "Admissions Open 2026-27 | Best School in Patna | SDPS",
    desc: "Admissions open for 2026-27 academic session at S.D. Public School Patna (Playgroup to Class 8). Apply online or visit our campus at Maurya Colony, Patna.",
    keywords: "school admission in patna 2026-27, best school in patna admission"
  },
  "/admission-enquiry": {
    title: "Admission Enquiry 2026-27 | S.D. Public School, Patna",
    desc: "Submit your admission enquiry for S.D. Public School Patna. Get details on eligibility, fee structure, campus facilities, and admission process.",
    keywords: "sdps admission enquiry, admission process patna school"
  },
  "/admission-eligibility": {
    title: "Admissions Eligibility Criteria | S.D. Public School, Patna",
    desc: "View age criteria, class eligibility rules, document requirements, and admission guidelines for S.D. Public School Patna.",
    keywords: "admission age limit patna, school age criteria patna"
  },
  "/admission-form": {
    title: "Online Admission Application Form | S.D. Public School, Patna",
    desc: "Complete online application form for new student admission at S.D. Public School Patna.",
    keywords: "online school admission form patna, sdps application form"
  },
  "/fee-structure": {
    title: "Fee Structure 2026-27 | S.D. Public School Patna",
    desc: "Transparent and affordable fee structure for Playgroup, Nursery, LKG, UKG, and Classes 1 to 8 at S.D. Public School Patna.",
    keywords: "school fee structure patna, sd public school fees"
  },
  "/careers": {
    title: "Career & Teaching Vacancies | S.D. Public School, Patna",
    desc: "Join the dedicated teaching and administrative team at S.D. Public School Patna. View current job openings and apply online.",
    keywords: "teacher jobs in patna, school recruitment patna, teaching vacancy in school patna"
  },
  "/alumni": {
    title: "Alumni Association & Network | S.D. Public School, Patna",
    desc: "Connect with SDPS alumni across the globe, register in alumni directory, and view upcoming alumni meets.",
    keywords: "sdps alumni, sd public school alumni association"
  },
  "/tc-download": {
    title: "Transfer Certificate (TC) Verification | S.D. Public School, Patna",
    desc: "Verify and download student Transfer Certificates (TC) issued by S.D. Public School Patna.",
    keywords: "sdps tc download, transfer certificate sd public school"
  },
  "/fee-payment": {
    title: "Online Fee Payment Portal | S.D. Public School, Patna",
    desc: "Pay school tuition fees securely online using Razorpay payment gateway for S.D. Public School Patna.",
    keywords: "pay school fees online patna, sdps fee payment portal"
  },
  "/contact": {
    title: "Contact Us & Location Map | Best School in Patna — SDPS",
    desc: "Get in touch with S.D. Public School Patna. Find phone numbers, email addresses, office hours, and Google Maps directions.",
    keywords: "sd public school patna contact number, sdps patna location map, schools in patna contact"
  },
  "/terms": {
    title: "Terms of Service & Privacy Policy | S.D. Public School, Patna",
    desc: "Official terms of use, privacy policy, refund policy, and website guidelines for S.D. Public School Patna.",
    keywords: "sdps terms, sd public school privacy policy"
  },
  "/privacy": {
    title: "Privacy Policy | S.D. Public School, Patna",
    desc: "Privacy policy regarding data collection, student safety, and web security at S.D. Public School Patna.",
    keywords: "sdps privacy policy"
  },
  "/khelo-patna": {
    title: "Khelo Patna Inter-School Sports Fest | S.D. Public School, Patna",
    desc: "Inter-school sports tournament, matches, scores, galleries, and highlights of Khelo Patna organized by SDPS.",
    keywords: "khelo patna sports, inter school tournament patna"
  },
  "/review": {
    title: "Google Maps Reviews & Feedback | S.D. Public School, Patna",
    desc: "Leave a review or feedback for Junior and Senior Wings of S.D. Public School Patna on Google Maps.",
    keywords: "sd public school google reviews, sdps patna feedback"
  },
  "/apaar": {
    title: "APAAR ID Registration Portal | S.D. Public School, Patna",
    desc: "Automated Permanent Academic Account Registry (APAAR) student registration portal for SDPS Patna.",
    keywords: "apaar id registration patna, student apaar form sdps"
  },
  "/links": {
    title: "Official Links & Linktree | S.D. Public School, Patna",
    desc: "Direct access to admission form, prospectus, website, contact, and social media channels of SDPS Patna.",
    keywords: "sdps links, sd public school linktree"
  },
  "/elections": {
    title: "Student Council Elections Portal | S.D. Public School, Patna",
    desc: "Secure digital voting and elections portal for Student Council elections at S.D. Public School Patna.",
    keywords: "sdps elections portal"
  },


  // Admin Pages
  "/admin": { title: "Dashboard | SDPS Admin" },
  "/admin/login": { title: "Admin Login | SDPS Admin" },
  "/admin/forgot-password": { title: "Forgot Password | SDPS Admin" },
  "/admin/message-logs": { title: "Email & WhatsApp Logs | SDPS Admin" },
  "/admin/news": { title: "News Management | SDPS Admin" },
  "/admin/notices": { title: "Notices Management | SDPS Admin" },
  "/admin/gallery": { title: "Gallery Management | SDPS Admin" },
  "/admin/videos": { title: "Videos Management | SDPS Admin" },
  "/admin/calendar": { title: "Calendar Management | SDPS Admin" },
  "/admin/holidays": { title: "Holidays Management | SDPS Admin" },
  "/admin/administration-members": { title: "Administration Messages | SDPS Admin" },
  "/admin/testimonials": { title: "Testimonials Management | SDPS Admin" },
  "/admin/hostel-gallery": { title: "Hostel Gallery Management | SDPS Admin" },
  "/admin/khelo-patna-gallery": { title: "Khelo Patna Gallery | SDPS Admin" },
  "/admin/elections": { title: "Elections Control Panel | SDPS Admin" },
  "/admin/elections/results": { title: "Live Election Results Tally | SDPS Admin" },
  "/admin/elections/scheduler": { title: "Election Scheduler | SDPS Admin" },
  "/admin/council-members": { title: "Council Members & Captains | SDPS Admin" },
  "/admin/election-posters": { title: "Election Posters | SDPS Admin" },
  "/admin/council-results": { title: "Election Results Archive | SDPS Admin" },
  "/admin/admission-enquiries": { title: "Admission Enquiries | SDPS Admin" },
  "/admin/enquiry-questions": { title: "Enquiry Form Questions | SDPS Admin" },
  "/admin/admission-fields": { title: "Admission Form Builder | SDPS Admin" },
  "/admin/admissions": { title: "Full Applications | SDPS Admin" },
  "/admin/eligibility-rows": { title: "Eligibility Criteria | SDPS Admin" },
  "/admin/holiday-homework": { title: "Holiday Homework | SDPS Admin" },
  "/admin/career-posts": { title: "Vacant Posts | SDPS Admin" },
  "/admin/career-questions": { title: "Career Form Questions | SDPS Admin" },
  "/admin/career-applications": { title: "Job Applications | SDPS Admin" },
  "/admin/alumni-settings": { title: "Alumni Settings | SDPS Admin" },
  "/admin/alumni-questions": { title: "Alumni Form Questions | SDPS Admin" },
  "/admin/alumni-meets": { title: "Alumni Meets | SDPS Admin" },
  "/admin/alumni-members": { title: "Alumni Members | SDPS Admin" },
  "/admin/educators": { title: "Educators Database | SDPS Admin" },
  "/admin/thumbnail-generator": { title: "Thumbnail Generator | SDPS Admin" },
  "/admin/salary-slip": { title: "Salary Slip Generator | SDPS Admin" },
  "/admin/salary-certificate": { title: "Salary Certificate Generator | SDPS Admin" },
  "/admin/experience-certificate": { title: "Experience Certificate Generator | SDPS Admin" },
  "/admin/notice-maker": { title: "Notice Maker | SDPS Admin" },
  "/admin/omr-generator": { title: "OMR Generator | SDPS Admin" },
  "/admin/omr-roster": { title: "OMR Student Database | SDPS Admin" },
  "/admin/omr-checker": { title: "OMR Auto-Checker | SDPS Admin" },
  "/admin/tc-records": { title: "TC Records | SDPS Admin" },
  "/admin/popup": { title: "Welcome Popup Settings | SDPS Admin" },
  "/admin/contact-messages": { title: "Contact Messages | SDPS Admin" },
  "/admin/whatsapp-marketing": { title: "WhatsApp Marketing | SDPS Admin" },
  "/admin/fee-reminders": { title: "Fee Reminders | SDPS Admin" },
  "/admin/birthday-greetings": { title: "Birthday Greetings | SDPS Admin" },
  "/admin/site-settings": { title: "Site Settings | SDPS Admin" },
  "/admin/apaar": { title: "APAAR ID Manager | SDPS Admin" },
  "/admin/link-shortener": { title: "Link Shortener | SDPS Admin" },
  "/admin/linktree": { title: "Linktree Builder | SDPS Admin" },
  "/admin/integration-keys": { title: "Integration Keys | SDPS Admin" },
  "/admin/maps-review": { title: "Google Review QR | SDPS Admin" },
  "/admin/staff-users": { title: "Staff & Admin Users | SDPS Admin" }
};

export default function RouteSEOManager() {
  const location = useLocation();
  const path = location.pathname.toLowerCase().replace(/\/$/, "") || "/";

  let meta = ROUTE_META_MAP[path];

  if (!meta) {
    if (path.startsWith("/admin")) {
      meta = { title: "Admin Portal | SDPS Admin" };
    } else {
    }
  }

  return <SEO title={meta.title} description={meta.desc} keywords={meta.keywords} ogUrl={`https://sdpublic.org${path === "/" ? "" : path}`} />;
}


