import ResourceManager from "@/components/admin/ResourceManager";
import { QUESTION_FIELDS, QUESTION_COLUMNS } from "./shared";

export function AdminCareerQuestions() {
  return (
    <ResourceManager
      config={{
        title: "Career - Application Questions",
        endpoint: "/admin/career-questions",
        fields: QUESTION_FIELDS,
        columns: QUESTION_COLUMNS,
        subtitle: "Add subject-related or general questions for teacher applicants.",
      }}
    />
  );
}

export default AdminCareerQuestions;
