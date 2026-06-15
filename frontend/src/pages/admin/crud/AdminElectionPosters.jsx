import ResourceManager from "@/components/admin/ResourceManager";
import { fullUrl } from "@/lib/admin";

export function AdminElectionPosters() {
  return <ResourceManager config={{
    title: "Pre-Election Posters",
    endpoint: "/admin/election-posters",
    sub_dir: "posters",
    fields: [
      { name: "candidate_name", label: "Candidate Name", type: "text", required: true },
      { name: "position", label: "Position", type: "text", required: true },
      { name: "year", label: "Year", type: "text", required: true },
      { name: "poster_url", label: "Poster Image", type: "image", required: true },
      { name: "bio", label: "Bio / Slogan", type: "textarea" },
    ],
    columns: [
      { name: "poster", label: "Poster", render: (it) => <img src={fullUrl(it.poster_url)} alt="" className="w-12 h-16 object-cover rounded" /> },
      { name: "candidate_name", label: "Name" },
      { name: "position", label: "Position" },
      { name: "year", label: "Year" },
    ]
  }} />;
}

export default AdminElectionPosters;
