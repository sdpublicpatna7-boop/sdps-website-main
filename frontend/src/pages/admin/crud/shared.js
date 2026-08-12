export const QUESTION_FIELDS = [
  { name: "label", label: "Question Label", type: "text", required: true },
  { name: "type", label: "Field Type", type: "select", options: ["text", "email", "tel", "textarea", "select", "date", "number"], required: true, default: "text" },
  { name: "required", label: "Required", type: "boolean", default: true, checkboxLabel: "Mandatory field" },
  { name: "options", label: "Options (for select)", type: "options-csv", help: "Comma-separated values, only for 'select' type" },
  { name: "placeholder", label: "Placeholder", type: "text" },
  { name: "order", label: "Order", type: "number", default: 0 },
];

export const QUESTION_COLUMNS = [
  { name: "label", label: "Label" },
  { name: "type", label: "Type" },
  { name: "required", label: "Required" },
  { name: "order", label: "Order" },
];
