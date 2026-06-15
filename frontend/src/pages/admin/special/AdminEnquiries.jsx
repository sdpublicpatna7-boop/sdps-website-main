import AdminReadOnlyList from "@/components/admin/AdminReadOnlyList";

export function AdminEnquiries() {
  return (
    <AdminReadOnlyList
      title="Admission Enquiries"
      endpoint="/admin/admission-enquiries"
      columns={[
        { name: "parent_name", label: "Parent" },
        { name: "student_name", label: "Student" },
        { name: "student_class", label: "Class" },
        { name: "contact_phone", label: "Phone" },
        { name: "email", label: "Email" },
        { name: "status", label: "Status" },
        {
          name: "created_at",
          label: "When",
          render: (it) => it.created_at?.slice(0, 16).replace("T", " "),
        },
      ]}
    />
  );
}

export default AdminEnquiries;
