import ResourceManager from "@/components/admin/ResourceManager";

export function AdminCareerPosts() {
  return <ResourceManager config={{
    title: "Career - Vacant Posts",
    endpoint: "/admin/career-posts",
    fields: [
      { name: "title", label: "Job Title", type: "text", required: true },
      { name: "subject", label: "Subject / Department", type: "text" },
      { name: "description", label: "Description", type: "textarea", required: true },
      { name: "qualifications", label: "Qualifications", type: "textarea" },
      { name: "status", label: "Status", type: "select", options: ["open", "closed"], default: "open" },
    ],
    columns: [
      { name: "title", label: "Title" },
      { name: "subject", label: "Subject" },
      { name: "status", label: "Status" },
    ]
  }} />;
}

export default AdminCareerPosts;
