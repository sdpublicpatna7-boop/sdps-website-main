import ResourceManager from "@/components/admin/ResourceManager";

export function AdminCouncilResults() {
  return <ResourceManager config={{
    title: "Election Results",
    endpoint: "/admin/council-results",
    fields: [
      { name: "year", label: "Year", type: "text", required: true },
      { name: "position", label: "Position", type: "text", required: true },
      { name: "winner", label: "Winner", type: "text", required: true },
      { name: "runner_up", label: "Runner-Up", type: "text" },
      { name: "votes", label: "Votes (winner)", type: "number" },
      { name: "notes", label: "Notes", type: "textarea" },
    ],
    columns: [
      { name: "year", label: "Year" },
      { name: "position", label: "Position" },
      { name: "winner", label: "Winner" },
      { name: "runner_up", label: "Runner-Up" },
      { name: "votes", label: "Votes" },
    ]
  }} />;
}

export default AdminCouncilResults;
