import AdminReadOnlyList from "@/components/admin/AdminReadOnlyList";

export function AdminContactMessages() {
  return (
    <AdminReadOnlyList
      title="Contact Messages"
      endpoint="/admin/contact-messages"
      columns={[
        { name: "name", label: "Name" },
        { name: "email", label: "Email" },
        { name: "phone", label: "Phone" },
        { name: "subject", label: "Subject" },
        {
          name: "message",
          label: "Message",
          render: (it) => <span className="line-clamp-3 max-w-md">{it.message}</span>,
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

export default AdminContactMessages;
