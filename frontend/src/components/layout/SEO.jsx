import { Helmet } from "react-helmet-async";

export default function SEO({ title, description, keywords, ogImage, ogUrl, schema }) {
  const defaultTitle = "Best CBSE School in Patna | S.D. Public School (SDPS Patna)";
  const defaultDesc = "S.D. Public School (Suryamuni Devi Public School), Patna, Bihar — Recognized as one of the best CBSE schools in Patna. Top academics, smart classes, sports, and holistic student development since 1994. Admissions open for 2026-27.";
  const defaultKeywords = "best school in patna, best cbse school in patna, top school in patna, cbse school in patna, schools in patna, sd public school patna, suryamuni devi public school patna, top 10 schools in patna, play school in patna, admission in cbse school patna";

  const fullTitle = title 
    ? (title.includes("S.D. Public School") || title.includes("SDPS") ? title : `${title} | S.D. Public School, Patna`) 
    : defaultTitle;
  const fullDesc = description || defaultDesc;
  const fullKeywords = keywords ? `${keywords}, ${defaultKeywords}` : defaultKeywords;

  // Default rich Schema.org School & LocalBusiness JSON-LD
  const defaultSchema = {
    "@context": "https://schema.org",
    "@type": "School",
    "name": "S.D. Public School",
    "alternateName": ["Suryamuni Devi Public School", "SDPS Patna"],
    "url": "https://sdpublic.org",
    "logo": "https://sdpublic.org/logo192.png",
    "image": ogImage || "https://sdpublic.org/logo192.png",
    "description": fullDesc,
    "telephone": "+91-9955190262",
    "email": "helpdesk@sdpublic.org",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Patna",
      "addressRegion": "Bihar",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "25.5941",
      "longitude": "85.1376"
    },
    "sameAs": [
      "https://www.facebook.com/sdpspatna",
      "https://www.youtube.com/@sdpublicschool"
    ]
  };

  const finalSchema = schema || defaultSchema;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDesc} />
      <meta name="keywords" content={fullKeywords} />
      
      {/* Canonical Link */}
      <link rel="canonical" href={ogUrl || "https://sdpublic.org/"} />

      {/* OpenGraph / Social Media Previews */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDesc} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="S.D. Public School Patna" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogUrl && <meta property="og:url" content={ogUrl} />}

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={fullDesc} />

      {/* JSON-LD Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify(finalSchema)}
      </script>
    </Helmet>
  );
}

