import ResourceManager from "@/components/admin/ResourceManager";

export function AdminFeeStructureRows() {
  return (
    <ResourceManager
      config={{
        title: "Fee Structure",
        endpoint: "/admin/fee-structure-rows",
        fields: [
          {
            name: "class_name",
            label: "Class Name",
            required: true,
            placeholder: "e.g. Nursery, Class I-V",
          },
          { name: "admission_fee", label: "Admission Fee", placeholder: "e.g. ₹5,000" },
          {
            name: "tuition_fee",
            label: "Tuition Fee (Monthly)",
            placeholder: "e.g. ₹1,200/month",
          },
          { name: "annual_charges", label: "Annual Charges", placeholder: "e.g. ₹3,000" },
          { name: "transport_fee", label: "Transport Fee", placeholder: "e.g. ₹500/month" },
          { name: "other_fees", label: "Other Fees", placeholder: "e.g. Lab fee, Activity fee" },
          { name: "session", label: "Session", required: true, placeholder: "e.g. 2026-27" },
          { name: "order", label: "Order (for sorting)", type: "number" },
        ],
        columns: [
          { name: "class_name", label: "Class" },
          { name: "admission_fee", label: "Admission Fee" },
          { name: "tuition_fee", label: "Tuition Fee" },
          { name: "session", label: "Session" },
        ],
      }}
    />
  );
}

export default AdminFeeStructureRows;
