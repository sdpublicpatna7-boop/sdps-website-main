import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import PageHero from "@/components/layout/PageHero";
import api, { parseImageTransform } from "@/lib/api";
import { User } from "lucide-react";

export function AdministrationMessage() {
  const { settings } = useOutletContext() || {};
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const directorPhoto = settings?.director_photo_url || "https://sdpublic.org/assets/img/AKT.png";
  const { style: directorStyle, cleanUrl: cleanDirectorUrl } = parseImageTransform(directorPhoto);
  const formattedDirector = cleanDirectorUrl.startsWith("http")
    ? cleanDirectorUrl
    : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanDirectorUrl}`;

  const principalPhoto = settings?.principal_photo_url || "https://sdpublic.org/assets/img/RT.jpg";
  const { style: principalStyle, cleanUrl: cleanPrincipalUrl } = parseImageTransform(principalPhoto);
  const formattedPrincipal = cleanPrincipalUrl.startsWith("http")
    ? cleanPrincipalUrl
    : `${process.env.REACT_APP_BACKEND_URL || ""}${cleanPrincipalUrl}`;

  useEffect(() => {
    api.get("/administration-members")
      .then(r => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero pill="From the Leadership"
        title="Administration's Message"
        subtitle="Messages from our Director and Principal" />

      <div className="max-w-5xl mx-auto px-6 py-16 space-y-10">
        {loading && (
          <div className="text-center text-brand-ink/50 py-10">Loading messages...</div>
        )}

        {!loading && members.length === 0 && (
          /* Fallback hardcoded if DB empty */
          <>
            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden grid md:grid-cols-3 gap-0">
              <div className="bg-gradient-to-br from-brand-blue/10 to-brand-orange/10 p-8 flex flex-col items-center justify-center text-center md:border-r border-black/5">
                <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-brand-gold mb-4 bg-white">
                  <img src={formattedDirector} alt="Director"
                    style={directorStyle}
                    className="w-full h-full object-contain bg-white"
                    onError={e => { e.target.style.display="none"; }} />
                </div>
                <div className="font-headline font-bold text-brand-ink">Dr. Akhilesh Kumar Tiwary</div>
                <div className="text-brand-orange text-xs font-semibold uppercase tracking-wider mt-1">Director</div>
              </div>
              <div className="md:col-span-2 p-8">
                <div className="text-xs uppercase font-bold tracking-wider text-brand-orange mb-3">Director's Message</div>
                <h3 className="font-headline text-lg font-semibold text-brand-blue mb-4">लक्ष्य एवं उद्देश्य</h3>
                <p className="text-brand-ink/70 text-sm leading-relaxed mb-4">
                  ज्ञान का प्रायोगिक रूप ही शिक्षा है। शिक्षा के बदौलत ही समाज में जागरूकता, सतर्कता और समृद्धि लाई जा सकती है। शिक्षा के बिना विकसित समाज की कल्पना नहीं की जा सकती है।
                </p>
                <p className="text-brand-ink/70 text-sm leading-relaxed">
                  आइये हम - आप मिलकर एक स्वस्थ समाज की संरचना तैयार करें। <strong>पढ़ाई ही समाज की हर बुराई की दवाई है।</strong>
                </p>
                <div className="mt-5 pt-4 border-t border-black/5">
                  <div className="font-headline font-semibold text-brand-ink text-sm">Dr. Akhilesh Kumar Tiwary</div>
                  <div className="text-xs text-brand-ink/50">Director, S.D. Public School</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden grid md:grid-cols-3 gap-0">
              <div className="bg-gradient-to-br from-brand-lotus/10 to-brand-gold/10 p-8 flex flex-col items-center justify-center text-center md:border-r border-black/5">
                <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-brand-lotus mb-4 bg-white">
                  <img src={formattedPrincipal} alt="Principal"
                    style={principalStyle}
                    className="w-full h-full object-cover"
                    onError={e => { e.target.style.display="none"; }} />
                </div>
                <div className="font-headline font-bold text-brand-ink">Mrs. Renu Tiwary</div>
                <div className="text-brand-orange text-xs font-semibold uppercase tracking-wider mt-1">Principal</div>
              </div>
              <div className="md:col-span-2 p-8">
                <div className="text-xs uppercase font-bold tracking-wider text-brand-orange mb-3">Principal's Message</div>
                <h3 className="font-headline text-lg font-semibold text-brand-blue mb-4">Dear Parents and Students,</h3>
                <p className="text-brand-ink/70 text-sm leading-relaxed mb-3">
                  Welcome to S.D. Public School, where education is not just about academics but about nurturing young minds with values, vision, and vitality.
                </p>
                <p className="text-brand-ink/70 text-sm leading-relaxed">
                  With a legacy of empowering generations since 1994, we are committed to fostering excellence in academics while building strong character and leadership qualities in every child.
                </p>
                <div className="mt-5 pt-4 border-t border-black/5">
                  <div className="font-headline font-semibold text-brand-ink text-sm">Mrs. Renu Tiwary</div>
                  <div className="text-xs text-brand-ink/50">Principal, S.D. Public School</div>
                </div>
              </div>
            </div>
          </>
        )}

        {members.map((m, i) => (
          <div key={m.id || i} className="bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden grid md:grid-cols-3 gap-0">
            <div className={`bg-gradient-to-br ${i % 2 === 0 ? "from-brand-blue/10 to-brand-orange/10" : "from-brand-lotus/10 to-brand-gold/10"} p-8 flex flex-col items-center justify-center text-center md:border-r border-black/5`}>
              <div className={`w-28 h-28 rounded-full overflow-hidden ring-4 ${i % 2 === 0 ? "ring-brand-gold" : "ring-brand-lotus"} mb-4 bg-white`}>
                {m.photo_url ? (
                  <img
                    src={m.photo_url.startsWith("http") ? m.photo_url : `${process.env.REACT_APP_BACKEND_URL || ""}${m.photo_url}`}
                    alt={m.name}
                    className="w-full h-full object-contain bg-white"
                    onError={e => { e.target.style.display="none"; }}
                  />
                ) : (
                  <div className="w-full h-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <User className="w-12 h-12" />
                  </div>
                )}
              </div>
              <div className="font-headline font-bold text-brand-ink">{m.name}</div>
              <div className="text-brand-orange text-xs font-semibold uppercase tracking-wider mt-1">{m.designation}</div>
            </div>
            <div className="md:col-span-2 p-8">
              <div className="text-xs uppercase font-bold tracking-wider text-brand-orange mb-3">{m.designation}'s Message</div>
              {m.message_heading && (
                <h3 className="font-headline text-lg font-semibold text-brand-blue mb-4">{m.message_heading}</h3>
              )}
              {m.message && (
                <p className="text-brand-ink/70 text-sm leading-relaxed whitespace-pre-line">{m.message}</p>
              )}
              <div className="mt-5 pt-4 border-t border-black/5">
                <div className="font-headline font-semibold text-brand-ink text-sm">{m.name}</div>
                <div className="text-xs text-brand-ink/50">{m.designation}, S.D. Public School</div>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-gradient-to-br from-brand-blue to-brand-blue/90 rounded-3xl p-8 text-white text-center">
          <h3 className="font-legacy text-3xl mb-3">Our Vision</h3>
          <p className="text-white/80 max-w-xl mx-auto text-base leading-relaxed">
            To create an educational environment where every child discovers their true potential and becomes a responsible global citizen.
          </p>
        </div>
      </div>
    </>
  );
}

export default AdministrationMessage;
