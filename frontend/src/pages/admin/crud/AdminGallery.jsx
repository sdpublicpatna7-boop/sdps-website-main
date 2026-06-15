import ResourceManager from "@/components/admin/ResourceManager";
import { fullUrl } from "@/lib/admin";

export function AdminGallery() {
  return <ResourceManager config={{
    title: "Gallery",
    endpoint: "/admin/gallery",
    sub_dir: "gallery",
    subtitle: "Upload images of any aspect ratio - they're auto-compressed for performance.",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "category", label: "Category", type: "text", default: "general" },
      { name: "url", label: "Image", type: "image", required: true },
      { name: "order", label: "Order", type: "number", default: 0 },
    ],
    columns: [
      { name: "thumb", label: "Image", render: (it) => <img src={fullUrl(it.url)} alt="" className="w-16 h-12 object-cover rounded" /> },
      { name: "title", label: "Title" },
      { name: "category", label: "Category" },
      { name: "order", label: "Order" },
    ]
  }} />;
}

export default AdminGallery;
