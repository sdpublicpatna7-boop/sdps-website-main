import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  Compass, Maximize2, RotateCcw, Volume2, VolumeX, Sparkles, 
  MapPin, CheckCircle2, PhoneCall, ArrowRight, Video, Info, Play, Pause, ChevronRight
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import api from "../../lib/api";

const CATEGORIES = [
  { id: "all", label: "All Facilities" },
  { id: "classrooms", label: "Smart Classrooms" },
  { id: "labs", label: "Labs & Innovation" },
  { id: "library", label: "Digital Library" },
  { id: "sports", label: "Sports & Grounds" },
  { id: "hostel", label: "Residential Hostel" },
];

const DEFAULT_FACILITIES = [
  {
    id: "tour-smart-class",
    title: "Smart Digital Classroom",
    category: "classrooms",
    description: "Ergonomically designed, air-conditioned smart classroom equipped with 75-inch 4K Interactive Flat Panels (IFP), digital learning software, and high-speed Wi-Fi.",
    panorama_url: "https://sdpublic.org/assets/img/world_class.jpg",
    video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    audio_narrative: "Welcome to the SDPS Smart Digital Classroom. Every classroom features 4K interactive displays, dual-view whiteboards, and comfortable ergonomic seating.",
    hotspots: [
      { id: "h1", title: '75" 4K Interactive Display', x: 48, y: 38, detail: "Touch-enabled smart panel preloaded with animated 3D modules and live digital annotation software." },
      { id: "h2", title: "Ergonomic Modular Benches", x: 30, y: 68, detail: "Postural-support furniture designed for student comfort during long learning sessions." },
      { id: "h3", title: "Acoustic Insulation & CCTV", x: 75, y: 25, detail: "24/7 security surveillance and sound-softened acoustics for distraction-free learning." }
    ],
    equipment_list: ['75" 4K Touch IFP Display', "3D Animated Curriculum", "Ergonomic Seating", "High-Speed Wi-Fi 6", "24/7 HD CCTV Camera"],
    order: 1,
    is_active: true
  },
  {
    id: "tour-physics-lab",
    title: "Composite Science & Physics Lab",
    category: "labs",
    description: "Modern science laboratory equipped with optical benches, spectrometers, laser experiment kits, and electrical circuit boards for Class IX-XII practicals.",
    panorama_url: "https://sdpublic.org/assets/img/learning_beyond.png",
    video_url: "",
    audio_narrative: "Here is our State-of-the-Art Science Laboratory. Students conduct hands-on experiments in physics, chemistry, and biology with lab safety gear.",
    hotspots: [
      { id: "h4", title: "Optical Bench & Laser Setup", x: 42, y: 55, detail: "Precision optical ray tracks for Snell's law and focal length experiments." },
      { id: "h5", title: "Digital Oscilloscope & Meters", x: 62, y: 45, detail: "High-accuracy digital meters for advanced electrical experiments." }
    ],
    equipment_list: ["Laser Optical Benches", "Digital Multimeters", "Chemical Fume Hood", "Monocular Compound Microscopes", "Safety Eyewash Stations"],
    order: 2,
    is_active: true
  },
  {
    id: "tour-computer-lab",
    title: "High-Tech Computer & AI Lab",
    category: "labs",
    description: "State-of-the-art computer laboratory featuring 50+ Intel Core i7 workstations, optical fiber internet, Python/Scratch coding suites, and robotics kits.",
    panorama_url: "https://sdpublic.org/assets/img/demystified.jpg",
    video_url: "",
    audio_narrative: "Welcome to the Computer & AI Innovation Lab. Students learn Python programming, web development, and robotics under expert guidance.",
    hotspots: [
      { id: "h6", title: "Intel i7 Workstations", x: 50, y: 50, detail: "High-performance PCs equipped with Python, Scratch, Web Development IDEs, and Graphic Design tools." },
      { id: "h7", title: "Gigabit Fiber Backbone", x: 80, y: 30, detail: "Dedicated high-speed enterprise internet connection with firewall security filters." }
    ],
    equipment_list: ["50+ Intel Core i7 PCs", "1 Gbps Optical Fiber Net", "Robotics & Arduino Kits", "Python & Coding IDEs", "UPS Power Backup"],
    order: 3,
    is_active: true
  },
  {
    id: "tour-digital-library",
    title: "Central Digital Library & Reading Lounge",
    category: "library",
    description: "Richly stocked library containing 10,000+ academic books, NCERT reference guides, competitive examination journals (JEE/NEET/NTSE), and digital e-readers.",
    panorama_url: "https://sdpublic.org/assets/img/about_new.jpg",
    video_url: "",
    audio_narrative: "Explore the SDPS Central Library. Over 10,000 reference volumes, magazines, and quiet reading pods support deep academic research.",
    hotspots: [
      { id: "h8", title: "JEE/NEET Reference Wing", x: 35, y: 45, detail: "Dedicated shelf for competitive prep books, Olympiad guides, and previous years solved papers." },
      { id: "h9", title: "E-Reader Kiosk", x: 70, y: 50, detail: "Digital tablets with access to national digital libraries and e-journals." }
    ],
    equipment_list: ["10,000+ Books & Journals", "JEE/NEET Prep Section", "Quiet Study Pods", "E-Reader Tablets", "Daily English/Hindi Dailies"],
    order: 4,
    is_active: true
  },
  {
    id: "tour-sports-ground",
    title: "Sports Complex & Playgrounds (Khelo Patna)",
    category: "sports",
    description: "Spacious multi-sport grounds featuring synthetic badminton courts, cricket nets, football pitch, basketball court, and indoor table tennis hall.",
    panorama_url: "https://sdpublic.org/assets/img/banner.jpg",
    video_url: "",
    audio_narrative: "Welcome to our Sports Arena. SDPS places strong emphasis on physical fitness, sportsmanship, and inter-school championship training.",
    hotspots: [
      { id: "h10", title: "Cricket Practice Nets", x: 25, y: 60, detail: "Turf practice pitch with bowling machines for student cricket coaching." },
      { id: "h11", title: "Synthetic Badminton Court", x: 65, y: 55, detail: "All-weather indoor court built to BWF international standards." }
    ],
    equipment_list: ["Turf Cricket Nets", "Football Ground", "BWF Badminton Court", "Table Tennis Tables", "Physical Fitness Trainers"],
    order: 5,
    is_active: true
  },
  {
    id: "tour-hostel-lounge",
    title: "Residential Boarding & Hostel Complex",
    category: "hostel",
    description: "Safe and hygienic residential hostel for boys and girls with 24/7 warden supervision, air-cooled rooms, nutritious dining hall, and evening study hours.",
    panorama_url: "https://sdpublic.org/assets/img/feature.jpg",
    video_url: "",
    audio_narrative: "Discover SDPS Residential Hostel. A home away from home offering structured daily study hours, balanced meals, and 24/7 security.",
    hotspots: [
      { id: "h12", title: "Air-Cooled Dormitories", x: 40, y: 48, detail: "Spacious study desks, personal wardrobes, and comfortable bedding for boarders." },
      { id: "h13", title: "Hygienic Dining Hall", x: 70, y: 60, detail: "Four nutritious meals served daily under strict hygiene and dietary quality control." }
    ],
    equipment_list: ["24/7 Resident Wardens", "Structured Evening Study", "Nutritious 4-Meal Dining", "Doctor-on-Call Service", "24/7 CCTV & Security"],
    order: 6,
    is_active: true
  }
];

export default function CampusTour() {
  const [facilities, setFacilities] = useState(DEFAULT_FACILITIES);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeFacilityIndex, setActiveFacilityIndex] = useState(0);
  
  // Interactive Viewport Controls
  const [panX, setPanX] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const res = await api.get("/public/campus-tour/facilities");
      const list = res.data?.facilities || [];
      if (list.length > 0) {
        setFacilities(list);
      }
    } catch (err) {
      console.error("Using default campus facilities:", err);
    }
  };

  const filteredFacilities = selectedCategory === "all"
    ? facilities
    : facilities.filter((f) => f.category === selectedCategory);

  const currentFacility = filteredFacilities[activeFacilityIndex] || facilities[0] || DEFAULT_FACILITIES[0];

  // Auto-Rotation Timer
  useEffect(() => {
    if (!isAutoRotating || isDraggingRef.current) return;
    const interval = setInterval(() => {
      setPanX((prev) => (prev + 0.15) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [isAutoRotating]);

  // Handle Mouse / Touch Drag Panning
  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    setIsAutoRotating(false);
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const deltaX = (currentX - startXRef.current) * 0.1;
    setPanX((prev) => (prev - deltaX + 100) % 100);
    startXRef.current = currentX;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Audio Guide Voiceover (Speech Synthesis)
  const toggleAudioNarrative = () => {
    if (!("speechSynthesis" in window) || !currentFacility) return;

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToSpeak = currentFacility.audio_narrative || currentFacility.description;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.pitch = 1.0;
    utterance.rate = 0.95;
    utterance.lang = "en-IN";

    utterance.onstart = () => setIsPlayingAudio(true);
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    window.speechSynthesis.speak(utterance);
  };

  // Switch facility reset
  const handleSelectFacility = (idx) => {
    setActiveFacilityIndex(idx);
    setPanX(0);
    setZoomLevel(1);
    setActiveHotspot(null);
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsPlayingAudio(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <Helmet>
        <title>Interactive 360° Virtual Campus Tour | S.D. Public School Patna</title>
        <meta 
          name="description" 
          content="Experience the interactive 360° virtual campus tour of S.D. Public School Patna. Explore smart classrooms, science labs, computer lab, library, sports complex, and residential hostel facilities." 
        />
      </Helmet>

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-brand-blue-dark border-b border-slate-800 py-8 px-4 sm:px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-orange/20 text-brand-orange px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-brand-orange/30 mb-3">
              <Compass className="w-3.5 h-3.5 animate-spin" /> Interactive 360° Virtual Experience
            </div>
            <h1 className="font-headline font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
              S.D. Public School Campus Tour
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
              Explore our world-class infrastructure, smart digital classrooms, state-of-the-art labs, sports arena, and residential hostel facilities in 360° pan-view.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/admission-form"
              className="bg-brand-orange hover:bg-brand-orange-light text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg transition flex items-center gap-2"
            >
              Apply for Admission <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/video-call"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-lg transition flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4" /> Sal AI Voice Support
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Category Bar */}
      <div className="bg-slate-950/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setActiveFacilityIndex(0);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? "bg-brand-blue text-white shadow-md"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tour Section */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {currentFacility && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Left 2-Cols: Interactive 360° Pan Viewport */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative flex flex-col">
                
                {/* 360 Viewport Header Info */}
                <div className="p-4 bg-gradient-to-b from-slate-950/90 to-transparent absolute top-0 left-0 right-0 z-20 flex items-center justify-between pointer-events-none">
                  <div className="pointer-events-auto flex items-center gap-2.5">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> 360° Live View
                    </span>
                    <h3 className="font-headline font-bold text-white text-sm sm:text-base drop-shadow-md">
                      {currentFacility.title}
                    </h3>
                  </div>

                  <div className="pointer-events-auto flex items-center gap-2">
                    {currentFacility.video_url && (
                      <button
                        onClick={() => setShowVideoModal(true)}
                        className="bg-brand-orange/90 hover:bg-brand-orange text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md"
                      >
                        <Video className="w-3.5 h-3.5" /> Video Preview
                      </button>
                    )}
                    <button
                      onClick={toggleAudioNarrative}
                      className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                        isPlayingAudio ? "bg-red-600 text-white animate-pulse" : "bg-slate-800/90 text-slate-200 hover:bg-slate-800"
                      }`}
                      title="Listen to Voice Guide"
                    >
                      {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 360 Canvas Viewport */}
                <div
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                  className="w-full h-[450px] sm:h-[540px] relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
                >
                  {/* Panorama Image Layer with Pan Movement */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-75"
                    style={{
                      backgroundImage: `url(${currentFacility.panorama_url})`,
                      transform: `scale(${zoomLevel}) scaleX(1.15)`,
                      backgroundPosition: `${panX}% center`,
                    }}
                  />

                  {/* Dark Vignette Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

                  {/* Hotspots Overlay Pins */}
                  {currentFacility.hotspots && currentFacility.hotspots.map((hs) => (
                    <div
                      key={hs.id}
                      style={{ top: `${hs.y}%`, left: `${hs.x}%` }}
                      className="absolute z-20 transform -translate-x-1/2 -translate-y-1/2"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHotspot(activeHotspot?.id === hs.id ? null : hs);
                        }}
                        className="relative group flex items-center justify-center"
                      >
                        <span className="w-8 h-8 rounded-full bg-brand-orange/40 animate-ping absolute" />
                        <span className="w-7 h-7 rounded-full bg-brand-orange text-white flex items-center justify-center shadow-lg border-2 border-white font-bold text-xs hover:scale-125 transition-transform">
                          <Info className="w-3.5 h-3.5" />
                        </span>
                      </button>

                      {/* Hotspot Popover Tooltip */}
                      {activeHotspot?.id === hs.id && (
                        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-64 bg-slate-900/95 backdrop-blur-xl border border-brand-orange/40 rounded-2xl p-3.5 text-white shadow-2xl z-30 space-y-1">
                          <h5 className="font-headline font-bold text-xs text-brand-orange flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> {hs.title}
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {hs.detail}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Viewport Control Bar */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsAutoRotating(!isAutoRotating)}
                      className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                        isAutoRotating ? "bg-brand-blue/20 text-brand-blue-light border border-brand-blue/30" : "bg-slate-900 text-slate-400"
                      }`}
                    >
                      {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {isAutoRotating ? "Auto Rotate ON" : "Auto Rotate OFF"}
                    </button>

                    <span className="hidden sm:inline-block text-[11px]">
                      Drag mouse/touch to pan 360° view
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoomLevel((prev) => Math.min(prev + 0.2, 1.8))}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg font-bold"
                      title="Zoom In"
                    >
                      +
                    </button>
                    <button
                      onClick={() => setZoomLevel((prev) => Math.max(prev - 0.2, 1))}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg font-bold"
                      title="Zoom Out"
                    >
                      -
                    </button>
                    <button
                      onClick={() => {
                        setPanX(0);
                        setZoomLevel(1);
                      }}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg"
                      title="Reset View"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Equipment Specifications & Feature Badges */}
              <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 space-y-4">
                <h4 className="font-headline font-bold text-sm text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-brand-orange" /> Infrastructure & Equipment Highlights
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentFacility.equipment_list && currentFacility.equipment_list.map((eq, i) => (
                    <div key={i} className="flex items-center gap-2.5 bg-slate-900 p-3 rounded-xl border border-slate-800/80">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-200">{eq}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 1-Col: Facility Selector Drawer & Action Card */}
            <div className="space-y-6">
              
              {/* Facility Selection List */}
              <div className="bg-slate-950 rounded-3xl p-6 border border-slate-800 space-y-4">
                <h4 className="font-headline font-bold text-sm text-white flex items-center justify-between">
                  <span>Campus Locations</span>
                  <span className="text-xs text-brand-orange font-mono font-normal">
                    {filteredFacilities.length} Venues
                  </span>
                </h4>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 no-scrollbar">
                  {filteredFacilities.map((fac, idx) => (
                    <button
                      key={fac.id}
                      onClick={() => handleSelectFacility(idx)}
                      className={`w-full p-3.5 rounded-2xl text-left transition border flex items-center justify-between ${
                        activeFacilityIndex === idx
                          ? "bg-gradient-to-r from-brand-blue to-brand-blue-dark text-white border-brand-blue shadow-lg"
                          : "bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-850"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-headline font-bold text-xs sm:text-sm">{fac.title}</div>
                        <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
                          {fac.category}
                        </span>
                      </div>
                      <ChevronRight className={`w-4 h-4 ${activeFacilityIndex === idx ? "text-white" : "text-slate-500"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Admissions & Physical Visit Booking Card */}
              <div className="bg-gradient-to-br from-brand-blue-dark via-slate-900 to-slate-950 rounded-3xl p-6 border border-brand-blue/30 space-y-4 text-white shadow-xl">
                <div className="w-10 h-10 rounded-2xl bg-brand-orange/20 border border-brand-orange/30 text-brand-orange flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <h4 className="font-headline font-bold text-base text-white">Visit SDPS Patna Campus</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Schedule a personal guided tour of our Maurya Colony campus or speak with our admissions team live.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Link
                    to="/admission-form"
                    className="w-full bg-brand-orange hover:bg-brand-orange-light text-white font-bold text-xs py-3 rounded-xl shadow-md transition flex items-center justify-center gap-2"
                  >
                    Fill Online Admission Form
                  </Link>

                  <Link
                    to="/video-call"
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-3 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <PhoneCall className="w-4 h-4 text-emerald-400" /> Talk to Sal AI Voice Agent
                  </Link>
                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      {/* Video Preview Modal */}
      {showVideoModal && currentFacility?.video_url && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden w-full max-w-3xl shadow-2xl relative">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-white">
              <h4 className="font-headline font-bold text-sm flex items-center gap-2">
                <Video className="w-4 h-4 text-brand-orange" /> {currentFacility.title} — Video Tour
              </h4>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video w-full">
              <iframe
                src={currentFacility.video_url}
                title={currentFacility.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
