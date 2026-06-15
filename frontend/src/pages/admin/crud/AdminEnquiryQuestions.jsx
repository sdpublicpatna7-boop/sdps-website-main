import ResourceManager from "@/components/admin/ResourceManager";
import { QUESTION_FIELDS, QUESTION_COLUMNS } from "./shared";

export function AdminEnquiryQuestions() {
  return (
    <ResourceManager
      config={{
        title: "Admission Enquiry Questions",
        endpoint: "/admin/enquiry-questions",
        fields: QUESTION_FIELDS,
        columns: QUESTION_COLUMNS,
      }}
    />
  );
}

export default AdminEnquiryQuestions;
