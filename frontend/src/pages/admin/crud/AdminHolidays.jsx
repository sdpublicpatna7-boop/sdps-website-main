import ResourceManager from "@/components/admin/ResourceManager";
import { fullUrl } from "@/lib/admin";

export function AdminHolidays() {
  return (
    <ResourceManager
      config={{
        title: "Holidays",
        endpoint: "/admin/holidays",
        sub_dir: "icons",
        fields: [
          { name: "name", label: "Holiday Name", type: "text", required: true },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "icon_url", label: "Icon (PNG)", type: "image" },
        ],
        columns: [
          {
            name: "icon",
            label: "Icon",
            render: (it) =>
              it.icon_url ? (
                <img src={fullUrl(it.icon_url)} alt="" className="w-8 h-8" />
              ) : (
                "-"
              ),
          },
          { name: "name", label: "Name" },
          { name: "date", label: "Date" },
        ],
      }}
    />
  );
}

export default AdminHolidays;
