import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/lib/auth";
import { VoteProvider } from "@/context/VoteContext";

import PublicLayout from "@/components/layout/PublicLayout";

// Lazy-loaded Public Pages
const Home = lazy(() => import("@/pages/public/Home"));
const About = lazy(() => import("@/pages/public/static/About"));
const Academics = lazy(() => import("@/pages/public/static/Academics"));
const HouseSystem = lazy(() => import("@/pages/public/static/HouseSystem"));
const Hostel = lazy(() => import("@/pages/public/static/Hostel"));
const Demystified = lazy(() => import("@/pages/public/static/Demystified"));
const AdministrationMessage = lazy(() => import("@/pages/public/static/AdministrationMessage"));
const NotFound = lazy(() => import("@/pages/public/static/NotFound"));

const Gallery = lazy(() => import("@/pages/public/Gallery"));
const Videos = lazy(() => import("@/pages/public/Videos"));
const NewsList = lazy(() => import("@/pages/public/NewsCalendar").then(m => ({ default: m.NewsList })));
const NoticesList = lazy(() => import("@/pages/public/NewsCalendar").then(m => ({ default: m.NoticesList })));
const CalendarPage = lazy(() => import("@/pages/public/NewsCalendar").then(m => ({ default: m.CalendarPage })));
const StudentCouncil = lazy(() => import("@/pages/public/StudentCouncil"));
const PreSchool = lazy(() => import("@/pages/public/PreSchool"));
const AdmissionEnquiry = lazy(() => import("@/pages/public/Admissions").then(m => ({ default: m.AdmissionEnquiry })));
const AdmissionForm = lazy(() => import("@/pages/public/Admissions").then(m => ({ default: m.AdmissionForm })));
const AdmissionsLanding = lazy(() => import("@/pages/public/Admissions").then(m => ({ default: m.AdmissionsLanding })));
const AdmissionsEligibility = lazy(() => import("@/pages/public/AdmissionsEligibility"));
const FeeStructure = lazy(() => import("@/pages/public/FeeStructure"));
const Career = lazy(() => import("@/pages/public/Career"));
const Alumni = lazy(() => import("@/pages/public/Alumni"));
const TCDownload = lazy(() => import("@/pages/public/TCDownload"));
const FeePayment = lazy(() => import("@/pages/public/FeePayment"));
const Contact = lazy(() => import("@/pages/public/Contact"));
const TermsPrivacy = lazy(() => import("@/pages/public/TermsPrivacy"));
const KheloPatna = lazy(() => import("@/pages/public/KheloPatna"));
const MapsReview = lazy(() => import("@/pages/public/MapsReview"));
const ApaarForm = lazy(() => import("@/pages/public/ApaarForm"));


const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const AdminLogin = lazy(() => import("@/pages/admin/AuthPages").then(module => ({ default: module.AdminLogin })));
const AdminForgotPassword = lazy(() => import("@/pages/admin/AuthPages").then(module => ({ default: module.AdminForgotPassword })));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));

// Lazy-loaded Elections Pages
const ElectionAuth = lazy(() => import("@/pages/elections/AuthPage"));
const ElectionConfirm = lazy(() => import("@/pages/elections/ConfirmPage"));
const ElectionVote = lazy(() => import("@/pages/elections/VotePage"));
const ElectionThankYou = lazy(() => import("@/pages/elections/ThankYouPage"));
const ElectionPublicResults = lazy(() => import("@/pages/elections/LiveResults"));
const ElectionBoard = lazy(() => import("@/pages/elections/NoticeBoard"));
const AdminElections = lazy(() => import("@/pages/admin/AdminElections"));
const AdminElectionsResults = lazy(() => import("@/pages/admin/AdminElectionsResults"));
const AdminElectionsScheduler = lazy(() => import("@/pages/admin/AdminElectionsScheduler"));
const ShortLinkRedirect = lazy(() => import("@/pages/ShortLinkRedirect"));
const AdminShortener = lazy(() => import("@/pages/admin/AdminShortener"));
const LinksPage = lazy(() => import("@/pages/public/LinksPage"));
const AdminLinktree = lazy(() => import("@/pages/admin/AdminLinktree"));
const NoticePreview = lazy(() => import("@/pages/public/NoticePreview"));



// CrudPages
const AdminNews = lazy(() => import("@/pages/admin/crud/AdminNews"));
const AdminNotices = lazy(() => import("@/pages/admin/crud/AdminNotices"));
const AdminGallery = lazy(() => import("@/pages/admin/crud/AdminGallery"));
const AdminVideos = lazy(() => import("@/pages/admin/crud/AdminVideos"));
const AdminCouncilMembers = lazy(() => import("@/pages/admin/crud/AdminCouncilMembers"));
const AdminElectionPosters = lazy(() => import("@/pages/admin/crud/AdminElectionPosters"));
const AdminCouncilResults = lazy(() => import("@/pages/admin/crud/AdminCouncilResults"));
const AdminCareerPosts = lazy(() => import("@/pages/admin/crud/AdminCareerPosts"));
const AdminEnquiryQuestions = lazy(() => import("@/pages/admin/crud/AdminEnquiryQuestions"));
const AdminAdmissionFields = lazy(() => import("@/pages/admin/crud/AdminAdmissionFields"));
const AdminCareerQuestions = lazy(() => import("@/pages/admin/crud/AdminCareerQuestions"));
const AdminAlumniQuestions = lazy(() => import("@/pages/admin/crud/AdminAlumniQuestions"));
const AdminAlumniMeets = lazy(() => import("@/pages/admin/crud/AdminAlumniMeets"));
const AdminHolidays = lazy(() => import("@/pages/admin/crud/AdminHolidays"));
const AdminEligibilityRows = lazy(() => import("@/pages/admin/crud/AdminEligibilityRows"));
const AdminAdministrationMembers = lazy(() => import("@/pages/admin/crud/AdminAdministrationMembers"));
const AdminHostelGallery = lazy(() => import("@/pages/admin/crud/AdminHostelGallery"));
const AdminEducators = lazy(() => import("@/pages/admin/crud/AdminEducators"));
const AdminTestimonials = lazy(() => import("@/pages/admin/crud/AdminTestimonials"));

// SpecialPages
const AdminCalendar = lazy(() => import("@/pages/admin/special/AdminCalendar"));
const AdminTC = lazy(() => import("@/pages/admin/special/AdminTC"));
const AdminPopup = lazy(() => import("@/pages/admin/special/AdminPopup"));
const AdminSiteSettings = lazy(() => import("@/pages/admin/special/AdminSiteSettings"));
const AdminAlumniSettings = lazy(() => import("@/pages/admin/special/AdminAlumniSettings"));
const AdminEnquiries = lazy(() => import("@/pages/admin/special/AdminEnquiries"));
const AdminApplications = lazy(() => import("@/pages/admin/special/AdminApplications"));
const AdminCareerApps = lazy(() => import("@/pages/admin/special/AdminCareerApps"));
const AdminAlumniMembers = lazy(() => import("@/pages/admin/special/AdminAlumniMembers"));
const AdminContactMessages = lazy(() => import("@/pages/admin/special/AdminContactMessages"));
const AdminIntegrationKeys = lazy(() => import("@/pages/admin/special/AdminIntegrationKeys"));
const AdminKheloPatna = lazy(() => import("@/pages/admin/special/AdminKheloPatna"));
const AdminThumbnailGenerator = lazy(() => import("@/pages/admin/special/AdminThumbnailGenerator"));

// StaffModules
const AdminHolidayHomework = lazy(() => import("@/pages/admin/staff/AdminHolidayHomework"));
const AdminStaffUsers = lazy(() => import("@/pages/admin/staff/AdminStaffUsers"));

// WhatsAppMarketing, FeeReminders and BirthdayGreetings
const WhatsAppMarketing = lazy(() => import("@/pages/admin/WhatsAppMarketing"));
const FeeReminders = lazy(() => import("@/pages/admin/FeeReminders"));
const BirthdayGreetings = lazy(() => import("@/pages/admin/BirthdayGreetings"));
const AdminMapsReview = lazy(() => import("@/pages/admin/special/AdminMapsReview"));
const AdminSalarySlip = lazy(() => import("@/pages/admin/special/AdminSalarySlip"));
const AdminSalaryCertificate = lazy(() => import("@/pages/admin/special/AdminSalaryCertificate"));
const AdminExperienceCertificate = lazy(() => import("@/pages/admin/special/AdminExperienceCertificate"));
const AdminNoticeMaker = lazy(() => import("@/pages/admin/special/AdminNoticeMaker"));
const AdminApaarManager = lazy(() => import("@/pages/admin/special/AdminApaarManager"));
const AdminOmrGenerator = lazy(() => import("@/pages/admin/special/AdminOmrGenerator"));
const AdminOmrRoster = lazy(() => import("@/pages/admin/special/AdminOmrRoster"));
const AdminOmrChecker = lazy(() => import("@/pages/admin/special/AdminOmrChecker"));
const AdminMessageLogs = lazy(() => import("@/pages/admin/special/AdminMessageLogs"));

function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] w-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <HelmetProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Kiosk Elections Portal (no header/footer layout) */}
              <Route path="/elections" element={<VoteProvider><Suspense fallback={<div>Loading...</div>}><ElectionAuth /></Suspense></VoteProvider>} />
              <Route path="/elections/confirm" element={<VoteProvider><Suspense fallback={<div>Loading...</div>}><ElectionConfirm /></Suspense></VoteProvider>} />
              <Route path="/elections/vote" element={<VoteProvider><Suspense fallback={<div>Loading...</div>}><ElectionVote /></Suspense></VoteProvider>} />
              <Route path="/elections/thank-you" element={<VoteProvider><Suspense fallback={<div>Loading...</div>}><ElectionThankYou /></Suspense></VoteProvider>} />
              <Route path="/elections/results" element={<Suspense fallback={<div>Loading...</div>}><ElectionPublicResults /></Suspense>} />
              <Route path="/elections/board" element={<Suspense fallback={<div>Loading...</div>}><ElectionBoard /></Suspense>} />
              <Route path="/s/:code" element={<Suspense fallback={<div>Loading...</div>}><ShortLinkRedirect /></Suspense>} />
              <Route path="/links" element={<Suspense fallback={<div>Loading...</div>}><LinksPage /></Suspense>} />
              <Route path="/notice-preview/:id" element={<Suspense fallback={<div>Loading...</div>}><NoticePreview /></Suspense>} />
              <Route path="/apaar" element={<Suspense fallback={<AdminLoading />}><ApaarForm /></Suspense>} />

              {/* Public */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/academics" element={<Academics />} />
                <Route path="/house-system" element={<HouseSystem />} />
                <Route path="/hostel" element={<Hostel />} />
                <Route path="/demystified" element={<Demystified />} />
                <Route path="/administration-message" element={<AdministrationMessage />} />
                <Route path="/preschool" element={<PreSchool />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/news" element={<NewsList />} />
                <Route path="/notices" element={<NoticesList />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/student-council" element={<StudentCouncil />} />
                <Route path="/admissions" element={<AdmissionsLanding />} />
                <Route path="/admission-enquiry" element={<AdmissionEnquiry />} />
                <Route path="/admission-form" element={<AdmissionForm />} />
                <Route path="/admission-eligibility" element={<AdmissionsEligibility />} />
                <Route path="/fee-structure" element={<FeeStructure />} />
                <Route path="/careers" element={<Career />} />
                <Route path="/alumni" element={<Alumni />} />
                <Route path="/tc-download" element={<TCDownload />} />
                <Route path="/fee-payment" element={<FeePayment />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/terms" element={<TermsPrivacy />} />
                <Route path="/privacy" element={<TermsPrivacy />} />
                <Route path="/khelo-patna" element={<KheloPatna />} />
                <Route path="/review" element={<MapsReview />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Admin auth (no layout) */}
              <Route path="/admin/login" element={<Suspense fallback={<AdminLoading />}><AdminLogin /></Suspense>} />
              <Route path="/admin/forgot-password" element={<Suspense fallback={<AdminLoading />}><AdminForgotPassword /></Suspense>} />

              {/* Admin (protected) */}
              <Route path="/admin" element={<Suspense fallback={<AdminLoading />}><AdminLayout /></Suspense>}>
                <Route index element={<AdminDashboard />} />
                <Route path="link-shortener" element={<Suspense fallback={<AdminLoading />}><AdminShortener /></Suspense>} />
                <Route path="linktree" element={<Suspense fallback={<AdminLoading />}><AdminLinktree /></Suspense>} />
                <Route path="elections" element={<Suspense fallback={<AdminLoading />}><AdminElections /></Suspense>} />
                <Route path="elections/results" element={<Suspense fallback={<AdminLoading />}><AdminElectionsResults /></Suspense>} />
                <Route path="elections/scheduler" element={<Suspense fallback={<AdminLoading />}><AdminElectionsScheduler /></Suspense>} />
                <Route path="news" element={<AdminNews />} />
                <Route path="notices" element={<AdminNotices />} />
                <Route path="gallery" element={<AdminGallery />} />
                <Route path="videos" element={<AdminVideos />} />
                <Route path="calendar" element={<AdminCalendar />} />
                <Route path="holidays" element={<AdminHolidays />} />
                <Route path="council-members" element={<AdminCouncilMembers />} />
                <Route path="election-posters" element={<AdminElectionPosters />} />
                <Route path="council-results" element={<AdminCouncilResults />} />
                <Route path="admission-enquiries" element={<AdminEnquiries />} />
                <Route path="enquiry-questions" element={<AdminEnquiryQuestions />} />
                <Route path="admission-fields" element={<AdminAdmissionFields />} />
                <Route path="admissions" element={<AdminApplications />} />
                <Route path="eligibility-rows" element={<AdminEligibilityRows />} />
                <Route path="hostel-gallery" element={<AdminHostelGallery />} />
                <Route path="administration-members" element={<AdminAdministrationMembers />} />
                <Route path="testimonials" element={<AdminTestimonials />} />
                <Route path="career-posts" element={<AdminCareerPosts />} />
                <Route path="career-questions" element={<AdminCareerQuestions />} />
                <Route path="career-applications" element={<AdminCareerApps />} />
                <Route path="alumni-settings" element={<AdminAlumniSettings />} />
                <Route path="alumni-questions" element={<AdminAlumniQuestions />} />
                <Route path="alumni-meets" element={<AdminAlumniMeets />} />
                <Route path="alumni-members" element={<AdminAlumniMembers />} />
                <Route path="tc-records" element={<AdminTC />} />
                <Route path="popup" element={<AdminPopup />} />
                <Route path="contact-messages" element={<AdminContactMessages />} />
                <Route path="whatsapp-marketing" element={<WhatsAppMarketing />} />
                <Route path="fee-reminders" element={<FeeReminders />} />
                <Route path="birthday-greetings" element={<BirthdayGreetings />} />
                <Route path="message-logs" element={<Suspense fallback={<AdminLoading />}><AdminMessageLogs /></Suspense>} />
                <Route path="educators" element={<AdminEducators />} />
                <Route path="thumbnail-generator" element={<AdminThumbnailGenerator />} />
                <Route path="salary-slip" element={<AdminSalarySlip />} />
                <Route path="salary-certificate" element={<AdminSalaryCertificate />} />
                <Route path="experience-certificate" element={<AdminExperienceCertificate />} />
                <Route path="notice-maker" element={<AdminNoticeMaker />} />
                <Route path="omr-generator" element={<Suspense fallback={<AdminLoading />}><AdminOmrGenerator /></Suspense>} />
                <Route path="omr-roster" element={<Suspense fallback={<AdminLoading />}><AdminOmrRoster /></Suspense>} />
                <Route path="omr-checker" element={<Suspense fallback={<AdminLoading />}><AdminOmrChecker /></Suspense>} />
                <Route path="apaar" element={<Suspense fallback={<AdminLoading />}><AdminApaarManager /></Suspense>} />
                <Route path="site-settings" element={<AdminSiteSettings />} />
                <Route path="integration-keys" element={<AdminIntegrationKeys />} />
                <Route path="khelo-patna-gallery" element={<AdminKheloPatna />} />
                <Route path="holiday-homework" element={<AdminHolidayHomework />} />
                <Route path="staff-users" element={<AdminStaffUsers />} />
                <Route path="maps-review" element={<AdminMapsReview />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </HelmetProvider>
    </div>
  );
}

export default App;