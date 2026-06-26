import { Helmet } from "react-helmet-async";

export default function SEO({ title, description, keywords, ogImage, ogUrl, schema }) {
  const defaultTitle = "S.D. Public School, Patna | Empowering Generations Since 1994";
  const defaultDesc = "S.D. Public School (Suryamuni Devi Public School), Patna, Bihar — Empowering Generations Since 1994. Admissions open for 2026-27.";
  
  const fullTitle = title 
    ? (title.includes("S.D. Public School") || title.includes("SDPS") ? title : `${title} | S.D. Public School, Patna`) 
    : defaultTitle;
  const fullDesc = description || defaultDesc;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={fullDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* OpenGraph / Social Media Previews */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={fullDesc} />
      <meta property="og:type" content="website" />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogUrl && <meta property="og:url" content={ogUrl} />}

      {/* JSON-LD Schema Markup */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
    </Helmet>
  );
}
