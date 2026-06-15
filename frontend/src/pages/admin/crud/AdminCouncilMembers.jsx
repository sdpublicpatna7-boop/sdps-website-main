import ResourceManager from "@/components/admin/ResourceManager";
import { fullUrl } from "@/lib/admin";

export function AdminCouncilMembers() {
  return <ResourceManager config={{
    title: "Council Members & Captains",
    endpoint: "/admin/council-members",
    sub_dir: "profiles",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "position", label: "Position", type: "text", required: true, help: "e.g. Captain, Vice Captain, Sports Captain" },
      { name: "year", label: "Year", type: "text", required: true, default: new Date().getFullYear().toString() },
      { name: "house", label: "House", type: "text" },
      { name: "photo_url", label: "Photo", type: "image" },
      { name: "bio", label: "Short Bio", type: "textarea" },
      { name: "is_captain", label: "Is Captain?", type: "boolean", default: false, checkboxLabel: "Highlight as captain" },
      { name: "order", label: "Order", type: "number", default: 0 },
    ],
    columns: [
      { name: "thumb", label: "Photo", render: (it) => it.photo_url ? <img src={fullUrl(it.photo_url)} alt="" className="w-10 h-10 rounded-full object-cover" /> : "-" },
      { name: "name", label: "Name" },
      { name: "position", label: "Position" },
      { name: "year", label: "Year" },
      { name: "is_captain", label: "Captain" },
    ]
  }} />;
}

export default AdminCouncilMembers;
