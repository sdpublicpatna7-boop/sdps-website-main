import ResourceManager from "@/components/admin/ResourceManager";

export function AdminAlumniMeets() {
  return (
    <ResourceManager
      config={{
        title: "Alumni Meets",
        endpoint: "/admin/alumni-meets",
        sub_dir: "alumni",
        fields: [
          { name: "title", label: "Meet Title", type: "text", required: true },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "location", label: "Location", type: "text" },
          { name: "description", label: "Description", type: "textarea" },
          { name: "image_url", label: "Cover Image", type: "image" },
        ],
        columns: [
          { name: "title", label: "Title" },
          { name: "date", label: "Date" },
          { name: "location", label: "Location" },
        ],
      }}
    />
  );
}

export default AdminAlumniMeets;
