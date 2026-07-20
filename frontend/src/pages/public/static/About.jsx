import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { Award, Compass, Shield, BookOpen, GraduationCap, MapPin, Mail, Phone, Landmark, Check } from "lucide-react";
import PageHero from "@/components/layout/PageHero";
import SEO from "@/components/layout/SEO";
import { optimizeCloudinary, parseImageTransform } from "@/lib/api";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};

export function About() {
  const { settings } = useOutletContext() || {};

  const trustLogoRaw = settings?.about_trust_logo_url || "";
  const { style: trustLogoStyle, cleanUrl: cleanTrustLogoUrl } = parseImageTransform(trustLogoRaw);
  const rawTrustLogo = cleanTrustLogoUrl
    ? (cleanTrustLogoUrl.startsWith("http") ? cleanTrustLogoUrl : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanTrustLogoUrl}`)
    : "";
  const trustLogoUrl = optimizeCloudinary(rawTrustLogo, 800);

  const schoolLogoRaw = settings?.logo_url || "";
  const rawSchoolLogo = schoolLogoRaw
    ? (schoolLogoRaw.startsWith("http") ? schoolLogoRaw : `${process.env.REACT_APP_BACKEND_URL || ""}${schoolLogoRaw}`)
    : "";
  const schoolLogoUrl = optimizeCloudinary(rawSchoolLogo, 160);

  return (
    <>
      <SEO 
        title="About Us"
        description="Learn about the history, vision, and legacy of S.D. Public School, Patna. Founded in 1994, standalone as a beacon of academic excellence and value-based education."
        keywords="About SDPS, S.D. Public School history, Suryamuni Devi Public School vision, Patna CBSE school about"
      />
      <PageHero
        overline="Our Story"
        title="About S.D. Public School"
        subtitle="Our Legacy, Your Future — Founded in 1994, standing tall as a beacon of holistic education."
        bgImage={trustLogoUrl}
      />

      <motion.div
        className="max-w-6xl mx-auto px-6 py-16"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Key Metrics / Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {[
            { value: "1994", label: "Year Founded", desc: "Est. 13 November", color: "from-brand-blue/10 to-brand-blue/5", textColor: "text-brand-blue" },
            { value: "30+", label: "Years of Legacy", desc: "Empowering Generations", color: "from-brand-orange/10 to-brand-orange/5", textColor: "text-brand-orange" },
            { value: "100%", label: "CBSE Curriculum", desc: "Holistic Academics", color: "from-emerald-500/10 to-emerald-500/5", textColor: "text-emerald-600" },
            { value: "Patna-07", label: "Campus Location", desc: "Maurya Colony", color: "from-purple-500/10 to-purple-500/5", textColor: "text-purple-600" }
          ].map((stat, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-black/5 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 shadow-sm relative overflow-hidden group">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-30 group-hover:opacity-60 transition-opacity duration-300`} />
              <div className="relative">
                <div className={`text-3xl font-extrabold font-headline ${stat.textColor} tracking-tight`}>{stat.value}</div>
                <div className="text-sm font-bold text-brand-ink mt-2">{stat.label}</div>
                <div className="text-xs text-brand-ink/60 mt-0.5">{stat.desc}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Main Content: Two Columns */}
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          
          {/* Left / Main Column */}
          <div className="lg:col-span-3 space-y-12">
            
            {/* Story Card */}
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/5 border border-brand-blue/10 rounded-full text-brand-blue text-xs font-bold uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" /> Our Heritage
              </div>
              <h2 className="text-3xl font-headline font-extrabold text-brand-blue leading-tight">
                Empowering Generations Since <span className="brand-gradient-text">1994</span>
              </h2>
              <div className="prose prose-brand text-brand-ink/85 leading-relaxed space-y-4">
                <p className="text-lg text-brand-ink/90 font-medium">
                  Suryamuni Devi Public School (SDPS) stands tall as an institution dedicated to holistic education, where academic rigour meets character building, leadership development, and a deep spirit of service.
                </p>
                <p>
                  Managed by the <strong>S.D. Foundation Trust</strong>, SDPS is committed to its core philosophy of fostering an environment where education inspires transformation. Rooted in the timeless values of integrity, inclusivity, and excellence, our school empowers every child to thrive and succeed in an ever-changing world.
                </p>
                <p>
                  At SDPS, we believe that learning begins the moment a child is born and continues throughout life. Our programmes are thoughtfully designed to nurture intellectual, emotional, and social growth, blending modern educational practices with rich cultural traditions. We encourage curiosity, discipline, and innovation — preparing our students to become responsible global citizens and future leaders.
                </p>
              </div>
            </motion.div>

            {/* Vision & Mission Cards */}
            <motion.div variants={itemVariants} className="grid md:grid-cols-2 gap-6">
              {/* Vision */}
              <div className="bg-gradient-to-br from-brand-blue/5 via-white to-white border border-brand-blue/10 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-blue/5 rounded-full blur-2xl" />
                <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue mb-5">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="font-headline text-xl font-bold text-brand-blue mb-3">Our Vision</h3>
                <p className="text-sm text-brand-ink/75 leading-relaxed">
                  To create an educational environment where every child discovers their true potential, fosters continuous curiosity, and grows into a compassionate, responsible global citizen.
                </p>
              </div>

              {/* Mission Summary Card */}
              <div className="bg-gradient-to-br from-brand-orange/5 via-white to-white border border-brand-orange/10 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full blur-2xl" />
                <div className="w-12 h-12 rounded-2xl bg-brand-orange/10 flex items-center justify-center text-brand-orange mb-5">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="font-headline text-xl font-bold text-brand-blue mb-3">Our Mission</h3>
                <p className="text-sm text-brand-ink/75 leading-relaxed">
                  To provide a balanced curriculum that integrates academic rigor with creative activities, moral values, and life skills, creating confident lifelong learners.
                </p>
              </div>
            </motion.div>

            {/* Mission Details Checklist */}
            <motion.div variants={itemVariants} className="bg-brand-paper rounded-3xl p-8 border border-black/5">
              <h3 className="font-headline text-lg font-bold text-brand-blue mb-6 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-orange" /> Key Mission Objectives
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Creativity & Inquiry", desc: "Foster intellectual curiosity, critical thinking, and confidence at every educational stage." },
                  { title: "Balanced Curriculum", desc: "Combine core academic programs with dynamic, hands-on extra-curricular activities." },
                  { title: "Ethical Leadership", desc: "Instill strong moral, ethical, and civic values to build upright future leaders." },
                  { title: "Lifelong Learners", desc: "Prepare students to face future global challenges with resilience and adaptability." }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-brand-orange/20 text-brand-orange flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-brand-ink">{item.title}</div>
                      <div className="text-xs text-brand-ink/70 mt-0.5 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

          </div>

          {/* Right Column / Sidebar */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* School Campus Photo Card */}
            <motion.div variants={itemVariants} className="rounded-3xl overflow-hidden shadow-lg border border-black/5 bg-white group relative">
              <div className="absolute inset-0 bg-brand-blue/5 opacity-0 group-hover:opacity-10 transition-opacity duration-300 z-10 pointer-events-none" />
              {trustLogoUrl ? (
                <img
                  src={trustLogoUrl}
                  alt="SDPS Campus / Trust Logo"
                  style={trustLogoStyle}
                  className="w-full object-contain max-h-72 bg-white p-4 transition-transform duration-500 group-hover:scale-[1.02]"
                  onError={e => { e.target.src = "https://sdpublic.org/img/feature.jpg"; }}
                />
              ) : (
                <div className="w-full h-72 bg-slate-100 animate-pulse" />
              )}
            </motion.div>

            {/* Identity Badge */}
            <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-brand-gold/10 rounded-full blur-xl group-hover:bg-brand-gold/20 transition-all duration-300" />
              <div className="flex items-center gap-5">
                {schoolLogoUrl ? (
                  <img
                    src={schoolLogoUrl}
                    alt="SDPS Logo"
                    className="w-16 h-16 rounded-full ring-4 ring-brand-gold/20 object-contain p-0.5 bg-white shadow-md"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-100 animate-pulse border border-slate-200" />
                )}
                <div>
                  <div className="font-headline font-extrabold text-brand-blue text-lg">S.D. Public School</div>
                  <div className="text-xs text-brand-ink/60 font-semibold mt-0.5">Suryamuni Devi Public School</div>
                  <div className="inline-block bg-brand-orange/10 text-brand-orange text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 uppercase tracking-wider">Est. 1994</div>
                </div>
              </div>
            </motion.div>

            {/* Quick Stats/Facts Card */}
            <motion.div variants={itemVariants} className="bg-white rounded-3xl border border-black/5 p-6 shadow-sm space-y-4">
              <div className="text-xs uppercase font-extrabold text-brand-orange tracking-widest border-b border-black/5 pb-2 mb-3">Quick Facts</div>
              {[
                { label: "Governing Body", value: "Suryamuni Devi Foundation Trust", icon: Landmark },
                { label: "Curriculum", value: "Central Board of Secondary Education (CBSE)", icon: GraduationCap },
                { label: "Campus Location", value: "Maurya Colony, Patna 800007", icon: MapPin },
                { label: "Admissions Desk", value: "+91 99551 90262", icon: Phone },
                { label: "Support Email", value: "helpdesk@sdpublic.org", icon: Mail },
              ].map((item, i) => (
                <div key={i} className="flex gap-3.5 items-start">
                  <div className="w-8 h-8 rounded-xl bg-brand-blue/5 text-brand-blue flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-brand-ink/50 tracking-wider">{item.label}</div>
                    <div className="text-sm text-brand-ink/80 font-medium mt-0.5">{item.value}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Core Values Tag Cloud */}
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-brand-blue/5 via-white to-white rounded-3xl border border-brand-blue/10 p-6 shadow-sm">
              <div className="text-xs uppercase font-extrabold text-brand-orange tracking-widest mb-4">Core Value Pillars</div>
              <div className="flex flex-wrap gap-2.5">
                {[
                  { text: "Integrity", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
                  { text: "Excellence", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
                  { text: "Empathy", color: "bg-rose-500/10 text-rose-700 border-rose-200" },
                  { text: "Innovation", color: "bg-purple-500/10 text-purple-700 border-purple-200" },
                  { text: "Discipline", color: "bg-emerald-500/10 text-emerald-700 border-emerald-200" }
                ].map(v => (
                  <span key={v.text} className={`text-xs font-semibold px-3 py-1.5 rounded-2xl border ${v.color}`}>
                    {v.text}
                  </span>
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </>
  );
}

export default About;
