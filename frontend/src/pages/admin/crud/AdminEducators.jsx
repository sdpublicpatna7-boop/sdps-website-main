import ResourceManager from "@/components/admin/ResourceManager";
import { fullUrl } from "@/lib/admin";

export function AdminEducators() {
  return (
    <ResourceManager
      config={{
        title: "Educators",
        subtitle: "Manage teachers and staff for the school. Upload transparent PNG images to use them in the thumbnail generator.",
        endpoint: "/admin/educators",
        sub_dir: "educators",
        fields: [
          { name: "name", label: "Educator Name", type: "text", required: true, placeholder: "e.g. Saurav Suman" },
          { name: "role", label: "Role / Designation", type: "text", default: "SDPS Educator", placeholder: "e.g. Mathematics Incharge" },
          { name: "photo_url", label: "Educator Photo (Upload Transparent PNG)", type: "image", required: true },
        ],
        columns: [
          {
            name: "photo_url",
            label: "Photo Preview",
            render: (it) =>
              it.photo_url ? (
                <div className="w-14 h-14 bg-slate-900 rounded-xl p-1 flex items-center justify-center border border-slate-700/50 shadow-inner overflow-hidden">
                  <img
                    src={fullUrl(it.photo_url)}
                    alt={it.name}
                    className="max-w-full max-h-full object-contain filter drop-shadow-[0_2px_4px_rgba(255,255,255,0.15)]"
                  />
                </div>
              ) : (
                <span className="text-slate-400 text-xs">No photo</span>
              ),
          },
          { name: "name", label: "Name" },
          { name: "role", label: "Role / Designation" },
        ],
      }}
    />
  );
}

export default AdminEducators;
