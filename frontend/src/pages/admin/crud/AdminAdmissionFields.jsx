import ResourceManager from "@/components/admin/ResourceManager";
import { QUESTION_FIELDS, QUESTION_COLUMNS } from "./shared";

export function AdminAdmissionFields() {
  return (
    <ResourceManager
      config={{
        title: "Admission Form Builder",
        endpoint: "/admin/admission-fields",
        fields: QUESTION_FIELDS,
        columns: QUESTION_COLUMNS,
        subtitle: "Build the full admission form. Documents are uploaded separately by applicants.",
      }}
    />
  );
}

export default AdminAdmissionFields;
