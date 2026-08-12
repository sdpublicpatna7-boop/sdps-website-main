import ResourceManager from "@/components/admin/ResourceManager";
import { QUESTION_FIELDS, QUESTION_COLUMNS } from "./shared";

export function AdminAlumniQuestions() {
  return (
    <ResourceManager
      config={{
        title: "Alumni Form Questions",
        endpoint: "/admin/alumni-questions",
        fields: QUESTION_FIELDS,
        columns: QUESTION_COLUMNS,
      }}
    />
  );
}

export default AdminAlumniQuestions;
