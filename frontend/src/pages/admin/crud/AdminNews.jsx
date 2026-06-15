import ResourceManager from "@/components/admin/ResourceManager";

export function AdminNews() {
  return <ResourceManager config={{
    title: "News",
    endpoint: "/admin/news",
    sub_dir: "news",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "category", label: "Category", type: "text", default: "general" },
      { name: "content", label: "Content", type: "textarea", required: true },
      { name: "image_url", label: "Image", type: "image" },
      { name: "published", label: "Published", type: "boolean", default: true, checkboxLabel: "Show on website" },
    ],
    columns: [
      { name: "title", label: "Title" },
      { name: "date", label: "Date" },
      { name: "category", label: "Category" },
      { name: "published", label: "Published" },
    ]
  }} />;
}

export default AdminNews;
