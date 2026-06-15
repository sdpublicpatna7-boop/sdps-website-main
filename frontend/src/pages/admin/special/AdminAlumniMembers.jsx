import AdminReadOnlyList from "@/components/admin/AdminReadOnlyList";

export function AdminAlumniMembers() {
  return (
    <AdminReadOnlyList
      title="Alumni Members"
      endpoint="/admin/alumni-members"
      columns={[
        { name: "name", label: "Name" },
        { name: "email", label: "Email" },
        { name: "phone", label: "Phone" },
        { name: "year_passed", label: "Year" },
        { name: "amount", label: "Amount", render: (it) => `₹${it.amount}` },
        { name: "payment_status", label: "Payment" },
      ]}
    />
  );
}

export default AdminAlumniMembers;
