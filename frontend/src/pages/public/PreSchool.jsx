import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Music, Palette, Puzzle, Heart, Sun, BookOpen, Smile } from "lucide-react";

const ACTIVITIES = [
  { icon: Palette, color: "bg-brand-lotus", label: "Art & Craft" },
  { icon: Music, color: "bg-brand-orange", label: "Songs & Rhymes" },
  { icon: Puzzle, color: "bg-brand-gold", label: "Puzzle Time" },
  { icon: Sun, color: "bg-emerald-400", label: "Outdoor Play" },
  { icon: Heart, color: "bg-rose-400", label: "Story Hour" },
  { icon: Sparkles, color: "bg-brand-blue", label: "Magic Moments" },
];

export default function PreSchool() {
  return (
    <div className="bg-preschool-grad relative overflow-hidden">
      {/* Floating shapes */}
      <motion.div animate={{ y: [0, -20, 0], rotate: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-20 left-[5%] w-20 h-20 rounded-full bg-brand-lotus/40 blur-xl" />
      <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ duration: 7, repeat: Infinity }}
        className="absolute top-40 right-[8%] w-32 h-32 rounded-full bg-brand-orange/30 blur-2xl" />
      <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 6, repeat: Infinity }}
        className="absolute bottom-32 left-[20%] w-24 h-24 rounded-full bg-brand-gold/40 blur-xl" />

      {/* HERO */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-brand-lotus/30 text-brand-lotus text-xs uppercase tracking-[0.2em] font-bold mb-6">
            <Smile className="inline-block w-4 h-4 mr-1.5 align-text-bottom text-brand-lotus" /> Tiny Tots World
          </div>
          <h1 className="font-playful text-6xl sm:text-7xl lg:text-8xl text-brand-blue leading-[1.05]">
            Hello, <span className="text-brand-orange">little</span><br />
            <span className="text-brand-lotus">explorers!</span> <Sparkles className="inline-block w-8 h-8 text-brand-orange animate-pulse" />
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-brand-ink/70 text-lg">
            A magical world of stories, songs, art and laughter — where every little step is a giant leap of joy.
          </p>
        </motion.div>

        {/* Floating color-themed vector icons */}
        <div className="absolute top-10 left-[15%] text-brand-lotus" style={{ fontSize: 40 }}>
          <motion.div animate={{ y: [0, -16, 0], rotate: [0, 12, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <Palette className="w-10 h-10 drop-shadow-md" />
          </motion.div>
        </div>
        <div className="absolute top-32 right-[12%] text-brand-orange" style={{ fontSize: 50 }}>
          <motion.div animate={{ y: [0, -20, 0], rotate: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity }}>
            <Sparkles className="w-12 h-12 drop-shadow-md" />
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-[8%] text-brand-blue" style={{ fontSize: 44 }}>
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity }}>
            <BookOpen className="w-11 h-11 drop-shadow-md" />
          </motion.div>
        </div>
      </section>

      {/* ACTIVITIES */}
      <section className="relative max-w-6xl mx-auto px-6 py-16">
        <h2 className="font-playful text-4xl sm:text-5xl text-center text-brand-blue mb-12 flex items-center justify-center gap-2">
          What We Love To Do! <Heart className="w-8 h-8 text-brand-lotus fill-current inline-block ml-2 animate-pulse" />
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {ACTIVITIES.map((a, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", bounce: 0.4, delay: i * 0.08 }}
              whileHover={{ scale: 1.05, rotate: -2 }}
              className="bg-white rounded-3xl p-8 text-center shadow-lg border-4 border-white relative"
              style={{ boxShadow: "0 20px 40px rgba(232,143,197,0.15)" }}
            >
              <motion.div
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.2 }}
                className={`w-20 h-20 mx-auto rounded-3xl ${a.color} flex items-center justify-center mb-4`}
              >
                <a.icon className="w-10 h-10 text-white" />
              </motion.div>
              <div className="font-playful text-2xl text-brand-ink">{a.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY US */}
      <section className="relative max-w-6xl mx-auto px-6 py-20">
        <div className="bg-white rounded-[3rem] p-10 sm:p-16 shadow-2xl border-4 border-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-brand-orange/20 blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-brand-lotus/20 blur-3xl" />
          <h2 className="relative font-playful text-4xl sm:text-5xl text-brand-blue">Why little hearts <span className="text-brand-orange">love</span> SDPS!</h2>
          <div className="relative grid sm:grid-cols-3 gap-6 mt-10">
            {[
              { icon: Smile, color: "text-brand-lotus bg-pink-50", title: "Caring Teachers", desc: "Warm, gentle and always smiling" },
              { icon: Sun, color: "text-brand-orange bg-orange-50", title: "Safe Play Areas", desc: "Bright, colorful and well-monitored" },
              { icon: Puzzle, color: "text-brand-gold bg-amber-50", title: "Joyful Learning", desc: "Songs, stories and lots of fun!" },
            ].map((c, i) => (
              <div key={i} className="bg-brand-paper rounded-3xl p-6 flex flex-col items-center text-center">
                <div className={`w-12 h-12 rounded-2xl ${c.color} flex items-center justify-center mb-4`}>
                  <c.icon className="w-6 h-6" />
                </div>
                <div className="font-playful text-xl text-brand-blue">{c.title}</div>
                <p className="text-sm text-brand-ink/70 mt-1">{c.desc}</p>
              </div>
            ))}
          </div>
          <Link to="/admission-enquiry" className="btn-secondary mt-10 inline-flex items-center justify-center gap-1.5" data-testid="preschool-enquire-btn">
            Enroll Your Little Star <Sparkles className="w-4 h-4 text-white" />
          </Link>
        </div>
      </section>
    </div>
  );
}
