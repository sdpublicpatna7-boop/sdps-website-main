import { useOutletContext } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import SEO from "@/components/layout/SEO";

export function Academics() {
  const { settings } = useOutletContext() || {};

  const learningRaw = settings?.academics_learning_image_url || "https://sdpublic.org/assets/img/learning_beyond.png";
  const learningUrl = learningRaw.startsWith("http")
    ? learningRaw
    : `${process.env.REACT_APP_BACKEND_URL || ""}${learningRaw}`;

  const facilitiesRaw = settings?.academics_facilities_image_url || "https://sdpublic.org/assets/img/world_class.jpg";
  const facilitiesUrl = facilitiesRaw.startsWith("http")
    ? facilitiesRaw
    : `${process.env.REACT_APP_BACKEND_URL || ""}${facilitiesRaw}`;
  return (
    <>
      <SEO 
        title="Academics & Curriculum"
        description="Explore the curriculum, pedagogical approach, and academic facilities at S.D. Public School, Patna. Standout CBSE education combining learning with character development."
        keywords="SDPS academics, S.D. Public School curriculum, CBSE curriculum Patna, learning beyond classrooms"
      />
      <PageHero overline="Curriculum" title="Academics at SDPS"
        subtitle="Learning Beyond Classrooms — we integrate experiential learning, project-based activities, and critical thinking at every level." />

      {/* Approach */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="overline mb-3">Our Approach</div>
            <h2 className="section-title mb-4">Learning Beyond <span className="brand-gradient-text">Classrooms</span></h2>
            <p className="text-brand-ink/70 mb-5">At SDPS, learning is not confined to textbooks. We integrate experiential learning, project-based activities, and critical thinking tasks at every level.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: "🎨", label: "Holistic Development", desc: "Balancing academics with creativity and character" },
                { icon: "🔬", label: "Experiential Learning", desc: "Hands-on activities that bring concepts to life" },
              ].map((f, i) => (
                <div key={i} className="bg-brand-paper rounded-2xl p-4">
                  <div className="text-2xl mb-2">{f.icon}</div>
                  <div className="font-headline font-semibold text-sm">{f.label}</div>
                  <div className="text-xs text-brand-ink/60 mt-1">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl">
            <img src={learningUrl} alt="Experiential Learning at SDPS"
              className="w-full object-contain max-h-72 bg-white"
              onError={e => { e.target.src = "https://sdpublic.org/img/feature.jpg"; }} />
          </div>
        </div>
      </section>

      {/* Programs */}
      <section className="py-14 bg-brand-paper">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Our Programs</div>
          <h2 className="section-title text-center mb-10">Academic Divisions</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: "Pre-School — SDPS Curious Minds", grade: "Playgroup · Nursery · KG-I · KG-II", emoji: "🌱", desc: "Top-ranked Pre-School in Patna, focusing on play-based, joyful learning for young learners.", features: ["Montessori-inspired learning", "Sensory development activities", "Social-emotional learning"] },
              { title: "Primary School", grade: "Class I – V", emoji: "📚", desc: "Building strong fundamentals in literacy, numeracy, and social awareness through child-centric education.", features: ["Interactive learning methods", "Language development", "Foundational STEM concepts"] },
              { title: "Middle School", grade: "Class VI – VIII", emoji: "🔭", desc: "Developing critical thinking and problem-solving skills through interdisciplinary learning.", features: ["Subject specialisation", "Research projects", "Leadership opportunities"] },
              { title: "Beyond Academics", grade: "All Classes", emoji: "🏆", desc: "Sports, arts, music, robotics, debates and much more — co-curricular excellence.", features: ["Annual sports day", "Cultural programs", "Inter-house competitions"] },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-black/5 beam-card hover:-translate-y-1 hover:shadow-lg transition-all">
                <div className="text-3xl mb-3">{c.emoji}</div>
                <div className="text-xs uppercase font-bold text-brand-orange tracking-wider mb-1">{c.grade}</div>
                <h3 className="font-headline font-semibold text-lg text-brand-blue mb-2">{c.title}</h3>
                <p className="text-sm text-brand-ink/70 mb-3">{c.desc}</p>
                <ul className="space-y-1">
                  {c.features.map((f, j) => <li key={j} className="text-xs text-brand-ink/60 flex items-center gap-1.5"><span className="text-brand-orange">✓</span>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="overline mb-3 text-center">Our Infrastructure</div>
          <h2 className="section-title text-center mb-10">World-Class Facilities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { icon: "🖥️", label: "Smart Classrooms" },
              { icon: "💻", label: "Computer Lab" },
              { icon: "🔬", label: "Science Laboratories" },
              { icon: "📖", label: "Library" },
              { icon: "🎵", label: "Music & Art Rooms" },
              { icon: "🚌", label: "Transport Facility" },
              { icon: "🏠", label: "Hostel Accommodation" },
              { icon: "⚽", label: "Sports Ground" },
            ].map((f, i) => (
              <div key={i} className="bg-brand-paper rounded-2xl p-4 text-center hover:bg-white hover:shadow-md transition-all border border-black/5">
                <div className="text-3xl mb-2">{f.icon}</div>
                <div className="text-sm font-headline font-semibold text-brand-ink">{f.label}</div>
              </div>
            ))}
          </div>
          <div className="rounded-3xl overflow-hidden shadow-xl">
            <img src={facilitiesUrl} alt="SDPS Facilities"
              className="w-full object-contain max-h-64 bg-white"
              onError={e => { e.target.style.display = "none"; }} />
          </div>
        </div>
      </section>
    </>
  );
}

export default Academics;
