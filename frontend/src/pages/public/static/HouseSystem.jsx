import PageHero from "@/components/layout/PageHero";
import { Check } from "lucide-react";

export function HouseSystem() {
  const houses = [
    {
      name: "Aryabhatta House", army: "Red Army", color: "from-red-500 to-rose-700", border: "border-red-200",
      bg: "bg-red-50", text: "text-red-700",
      motto: "Knowledge · Wisdom · Discovery",
      desc: "Named after the legendary mathematician and astronomer Aryabhatta, this House represents curiosity, intellectual strength, and the relentless quest for learning. Students are encouraged to think innovatively, question intelligently, and lead with knowledge.",
      img: "/images/houses/aryabhatta.jpg",
    },
    {
      name: "Ashoka House", army: "Yellow Army", color: "from-amber-400 to-yellow-600", border: "border-amber-200",
      bg: "bg-amber-50", text: "text-amber-700",
      motto: "Strength · Courage · Compassion",
      desc: "Inspired by Emperor Ashoka, known for his journey from conquest to compassion, Ashoka House symbolises leadership with humility, peace, and moral courage. Students are taught to lead with wisdom, promote harmony, and uphold strong ethical values.",
      img: "/images/houses/ashoka.jpg",
    },
    {
      name: "Chanakya House", army: "Blue Army", color: "from-sky-500 to-blue-700", border: "border-sky-200",
      bg: "bg-sky-50", text: "text-sky-700",
      motto: "Wisdom · Strategy · Integrity",
      desc: "Named after Chanakya, the ancient strategist and scholar, Chanakya House stands for sharp intellect, strategic thinking, and decisive leadership. Students are motivated to think critically, act wisely, and plan ahead with vision and purpose.",
      img: "/images/houses/chanakya.jpg",
    },
    {
      name: "Gautam House", army: "Green Army", color: "from-emerald-500 to-green-700", border: "border-emerald-200",
      bg: "bg-emerald-50", text: "text-emerald-700",
      motto: "Kindness · Mindfulness · Compassion",
      desc: "Guided by the teachings of Gautam Buddha, Gautam House reflects compassion, inner peace, and respect for all living beings. Students are encouraged to cultivate kindness, emotional resilience, and contribute to a peaceful environment.",
      img: "/images/houses/gautam.jpg",
    },
  ];

  return (
    <>
      <PageHero pill="Building Team Spirit"
        title="Our House System"
        subtitle="Building Team Spirit, Leadership, and Healthy Competition — inspired by India's greatest minds." />

      {/* Intro */}
      <section className="py-12 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-lg text-brand-ink/70 leading-relaxed">
            At S.D. Public School, we believe that team spirit, leadership, and healthy competition are essential parts
            of a child's development. Our students are grouped into <strong>four Houses</strong> — each inspired by the great
            minds and leaders of India's glorious history. Every House instills values, pride, and a sense of belonging.
          </p>
        </div>
      </section>

      {/* Houses */}
      <section className="py-10 bg-brand-paper">
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          {houses.map((h, i) => (
            <div key={i} className={`bg-white rounded-3xl border ${h.border} overflow-hidden shadow-sm grid md:grid-cols-3 gap-0`}>
              {/* Image */}
              <div className="md:col-span-1 relative">
                <div className={`absolute inset-0 bg-gradient-to-br ${h.color} opacity-90`} />
                <img src={h.img} alt={h.name} className="w-full h-full object-cover mix-blend-overlay opacity-40 absolute inset-0"
                  onError={e => e.target.style.display = "none"} />
                <div className="relative p-8 flex flex-col justify-end h-full min-h-[200px] text-white">
                  <div className="text-xs uppercase tracking-widest opacity-80 mb-1">{h.army}</div>
                  <h3 className="font-legacy text-3xl leading-tight">{h.name}</h3>
                  <p className="italic text-sm opacity-90 mt-2">"{h.motto}"</p>
                </div>
              </div>
              {/* Content */}
              <div className="md:col-span-2 p-8 flex flex-col justify-center">
                <div className={`inline-flex items-center gap-1.5 ${h.bg} ${h.text} text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full w-fit mb-4`}>
                  {h.army}
                </div>
                <h4 className="font-headline text-xl font-semibold text-brand-ink mb-3">{h.name}</h4>
                <p className="text-brand-ink/70 text-sm leading-relaxed">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Why + Inter-house */}
      <section className="py-14 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8">
          <div className="bg-brand-paper rounded-3xl p-7">
            <h3 className="font-headline text-xl font-semibold text-brand-ink mb-4">Why We Introduced the House System</h3>
            <ul className="space-y-3">
              {[
                "To promote teamwork, responsibility, and leadership.",
                "To encourage healthy competition in academics, sports, arts, and co-curricular activities.",
                "To instill discipline, sportsmanship, and a sense of pride.",
                "To help students develop a sense of belonging and identity within the larger school community.",
                "To celebrate diversity, while building unity through House events and activities.",
              ].map((pt, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-brand-ink/70">
                  <Check className="w-4 h-4 text-brand-orange shrink-0 mt-0.5" />{pt}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-gradient-to-br from-brand-blue to-brand-blue/80 rounded-3xl p-7 text-white">
            <h3 className="font-headline text-xl font-semibold mb-3">Inter-House Competitions</h3>
            <p className="text-white/80 text-sm mb-5">
              Throughout the year, students participate in various Inter-House competitions — aiming not just for
              trophies, but for lifelong values of teamwork, resilience, and excellence!
            </p>
            <div className="grid grid-cols-2 gap-3">
              {["Sports & Athletics", "Academic Quiz", "Cultural Events", "Science Olympiad", "Music & Dance", "Debate & Elocution"].map((c, i) => (
                <div key={i} className="bg-white/10 rounded-xl px-3 py-2 text-xs font-semibold">{c}</div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default HouseSystem;
