import ResourceManager from "@/components/admin/ResourceManager";
import { fullUrl } from "@/lib/admin";

const POSITIONS = [
  "School Captain",
  "Vice School Captain",
  "Sports Captain",
  "Vice Sports Captain",
  "Cultural Captain",
  "Vice Cultural Captain",
  "Discipline Head",
  "Vice Discipline Head",
  "House Captain",
  "Vice House Captain",
  "Head Boy",
  "Vice Head Boy",
  "Head Girl",
  "Vice Head Girl",
  "Literary Captain",
  "Vice Literary Captain",
  "Environment Captain",
  "Vice Environment Captain",
  "Tech Captain",
  "Vice Tech Captain",
];

export function AdminCouncilMembers() {
  return <ResourceManager config={{
    title: "Council Members & Captains",
    endpoint: "/admin/council-members",
    sub_dir: "profiles",
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "position", label: "Position", type: "select", required: true, options: POSITIONS },
      { name: "role_type", label: "Role Type", type: "select", required: true, options: ["Elected", "Appointed by Admin"], default: "Elected" },
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
      { name: "role_type", label: "Type" },
      { name: "year", label: "Year" },
      { name: "is_captain", label: "Captain" },
    ]
  }} />;
}

export default AdminCouncilMembers;
