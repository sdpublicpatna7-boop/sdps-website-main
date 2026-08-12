import ResourceManager from "@/components/admin/ResourceManager";

export function AdminTestimonials() {
  return (
    <ResourceManager
      config={{
        title: "Parents Testimonials",
        endpoint: "/admin/testimonials",
        sub_dir: "testimonials",
        fields: [
          { name: "parent_name", label: "Parent Name", type: "text", required: true },
          { name: "parent_info", label: "Parent Bio / Class Info", type: "text", required: true, placeholder: "e.g., Parent of Riya (Class II)" },
          {
            name: "type",
            label: "Testimonial Type",
            type: "select",
            options: ["text", "youtube", "instagram", "facebook"],
            required: true,
            default: "text"
          },
          { name: "text", label: "Testimonial Text", type: "textarea", required: true, placeholder: "What did the parent say about the school?" },
          { name: "video_url", label: "Social Video URL", type: "url", placeholder: "e.g., https://www.youtube.com/watch?v=..." },
          { name: "video_thumb_url", label: "Video Thumbnail Image", type: "image", aspect: "video", help: "Upload or paste URL. Click 'Adjust Position' to zoom/nudge." }
        ],
        columns: [
          { name: "parent_name", label: "Parent Name" },
          { name: "parent_info", label: "Bio / Class Info" },
          { name: "type", label: "Type" },
          {
            name: "video_url",
            label: "Video Link",
            render: (it) => it.video_url ? (
              <a href={it.video_url} target="_blank" rel="noreferrer" className="text-brand-blue underline truncate inline-block max-w-[200px]">
                {it.video_url}
              </a>
            ) : <span className="text-slate-400">—</span>
          }
        ]
      }}
    />
  );
}

export default AdminTestimonials;
