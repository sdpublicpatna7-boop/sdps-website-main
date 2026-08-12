import ResourceManager from "@/components/admin/ResourceManager";

export function AdminVideos() {
  return <ResourceManager config={{
    title: "Videos",
    endpoint: "/admin/videos",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "url", label: "Video URL (YouTube/Instagram/etc.)", type: "url", required: true },
      { name: "platform", label: "Platform", type: "select", options: ["youtube", "instagram", "facebook", "other"], default: "youtube" },
      { name: "thumbnail_url", label: "Custom Thumbnail (optional)", type: "image" },
      { name: "description", label: "Description", type: "textarea" },
    ],
    columns: [
      { name: "title", label: "Title" },
      { name: "platform", label: "Platform" },
      { name: "url", label: "URL", render: (it) => <a href={it.url} target="_blank" rel="noreferrer" className="text-brand-blue underline truncate inline-block max-w-[260px]">{it.url}</a> },
    ]
  }} />;
}

export default AdminVideos;
