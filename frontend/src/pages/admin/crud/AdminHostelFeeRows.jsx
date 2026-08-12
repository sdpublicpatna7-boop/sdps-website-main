import ResourceManager from "@/components/admin/ResourceManager";

export function AdminHostelFeeRows() {
  return (
    <ResourceManager
      config={{
        title: "Hostel Fee Structure",
        endpoint: "/admin/hostel-fee-rows",
        fields: [
          {
            name: "category",
            label: "Category / Class Range",
            required: true,
            placeholder: "e.g. Class VI-VIII",
          },
          { name: "monthly_fee", label: "Monthly Fee", placeholder: "e.g. ₹5,000" },
          { name: "annual_fee", label: "Annual Fee", placeholder: "e.g. ₹55,000" },
          { name: "admission_fee", label: "Hostel Admission Fee", placeholder: "e.g. ₹2,000" },
          { name: "note", label: "Note", placeholder: "e.g. Includes meals & laundry" },
          { name: "session", label: "Session", required: true, placeholder: "e.g. 2026-27" },
          { name: "order", label: "Order (for sorting)", type: "number" },
        ],
        columns: [
          { name: "category", label: "Category" },
          { name: "monthly_fee", label: "Monthly Fee" },
          { name: "annual_fee", label: "Annual Fee" },
          { name: "session", label: "Session" },
        ],
      }}
    />
  );
}

export default AdminHostelFeeRows;
