import ResourceManager from "@/components/admin/ResourceManager";

export function AdminHostelGallery() {
  return (
    <ResourceManager
      config={{
        title: "Hostel Gallery",
        subtitle: "Upload photos or paste image URLs — shown on the Hostel page gallery.",
        endpoint: "/admin/hostel-gallery",
        sub_dir: "hostel_gallery",
        fields: [
          { name: "image_url", label: "Photo", type: "image", required: true },
          {
            name: "caption",
            label: "Caption (optional)",
            placeholder: "e.g. Hostel dining hall, Boys dormitory",
          },
          { name: "order", label: "Order (lower = first)", type: "number", default: 0 },
        ],
        columns: [
          {
            name: "image_url",
            label: "Photo",
            render: (it) =>
              it.image_url ? (
                <img
                  src={
                    it.image_url.startsWith("http")
                      ? it.image_url
                      : `${process.env.REACT_APP_BACKEND_URL}${it.image_url}`
                  }
                  alt=""
                  className="h-12 w-20 object-cover rounded"
                />
              ) : (
                "—"
              ),
          },
          { name: "caption", label: "Caption" },
          { name: "order", label: "Order" },
        ],
      }}
    />
  );
}

export default AdminHostelGallery;
