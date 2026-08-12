import AdminReadOnlyList from "@/components/admin/AdminReadOnlyList";

export function AdminPayments() {
  return (
    <AdminReadOnlyList
      title="Fee Payments"
      endpoint="/admin/payments"
      columns={[
        { name: "student_name", label: "Student" },
        { name: "admission_number", label: "Admission #" },
        { name: "student_class", label: "Class" },
        { name: "fee_type", label: "Fee Type" },
        { name: "amount", label: "Amount", render: (it) => `₹${it.amount}` },
        { name: "status", label: "Status" },
        {
          name: "razorpay_payment_id",
          label: "Payment ID",
          render: (it) => it.razorpay_payment_id?.slice(0, 12) || "-",
        },
        {
          name: "created_at",
          label: "When",
          render: (it) => it.created_at?.slice(0, 16).replace("T", " "),
        },
      ]}
    />
  );
}

export default AdminPayments;
