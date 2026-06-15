import ResourceManager from "@/components/admin/ResourceManager";

export function AdminNotices() {
  return <ResourceManager config={{
    title: "Notices",
    endpoint: "/admin/notices",
    sub_dir: "notices",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "file_url", label: "Attachment (PDF/Doc)", type: "file", file_max_mb: 5 },
      { name: "pinned", label: "Pinned", type: "boolean", default: false, checkboxLabel: "Pin to top" },
    ],
    columns: [
      { name: "title", label: "Title" },
      { name: "date", label: "Date" },
      { name: "pinned", label: "Pinned" },
    ]
  }} />;
}

export default AdminNotices;
