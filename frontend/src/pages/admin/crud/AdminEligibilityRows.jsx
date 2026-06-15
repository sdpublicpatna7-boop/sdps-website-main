import ResourceManager from "@/components/admin/ResourceManager";

export function AdminEligibilityRows() {
  return (
    <ResourceManager
      config={{
        title: "Admission Eligibility",
        endpoint: "/admin/eligibility-rows",
        fields: [
          {
            name: "class_name",
            label: "Class Name",
            required: true,
            placeholder: "e.g. Play Group, Nursery, Class I",
          },
          {
            name: "min_age",
            label: "Min Age",
            required: true,
            placeholder: "e.g. 2 Years",
          },
          {
            name: "max_age",
            label: "Max Age",
            required: true,
            placeholder: "e.g. 3 Years",
          },
          {
            name: "born_between",
            label: "Born Between",
            required: true,
            placeholder: "e.g. 01 April 2021 - 01 April 2023",
          },
          {
            name: "session",
            label: "Session",
            required: true,
            placeholder: "e.g. 2026-27",
          },
          { name: "order", label: "Order (for sorting)", type: "number" },
        ],
        columns: [
          { name: "class_name", label: "Class" },
          { name: "min_age", label: "Min Age" },
          { name: "max_age", label: "Max Age" },
          { name: "born_between", label: "Born Between" },
          { name: "session", label: "Session" },
        ],
      }}
    />
  );
}

export default AdminEligibilityRows;
