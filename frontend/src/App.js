import "@/App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";

import PublicLayout from "@/components/layout/PublicLayout";
import Home from "@/pages/public/Home";
import { About, Academics, HouseSystem, Hostel, Demystified, AdministrationMessage, NotFound } from "@/pages/public/StaticPages";
import Gallery from "@/pages/public/Gallery";
import Videos from "@/pages/public/Videos";
import { NewsList, NoticesList, CalendarPage } from "@/pages/public/NewsCalendar";
import StudentCouncil from "@/pages/public/StudentCouncil";
import PreSchool from "@/pages/public/PreSchool";
import { AdmissionEnquiry, AdmissionForm, AdmissionsLanding } from "@/pages/public/Admissions";
import AdmissionsEligibility from "@/pages/public/AdmissionsEligibility";
import FeeStructure from "@/pages/public/FeeStructure";
import Career from "@/pages/public/Career";
import Alumni from "@/pages/public/Alumni";
import TCDownload from "@/pages/public/TCDownload";
import FeePayment from "@/pages/public/FeePayment";
import Contact from "@/pages/public/Contact";
import TermsPrivacy from "@/pages/public/TermsPrivacy";
import KheloPatna from "@/pages/public/KheloPatna";
import MapsReview from "@/pages/public/MapsReview";

const AdminLayout = lazy(() => import("@/components/admin/AdminLayout"));
const AdminLogin = lazy(() => import("@/pages/admin/AuthPages").then(module => ({ default: module.AdminLogin })));
const AdminForgotPassword = lazy(() => import("@/pages/admin/AuthPages").then(module => ({ default: module.AdminForgotPassword })));
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));

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
      <AuthProvider>
        <BrowserRouter>
          <Routes>
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
              <Route path="educators" element={<AdminEducators />} />
              <Route path="thumbnail-generator" element={<AdminThumbnailGenerator />} />
              <Route path="salary-slip" element={<AdminSalarySlip />} />
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
    </div>
  );
}

export default App;