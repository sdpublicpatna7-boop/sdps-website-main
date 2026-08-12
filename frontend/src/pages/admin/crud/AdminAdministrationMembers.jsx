import ResourceManager from "@/components/admin/ResourceManager";
import { User } from "lucide-react";

export function AdminAdministrationMembers() {
  return (
    <ResourceManager
      config={{
        title: "Administration Members",
        subtitle:
          "Director, Principal and leadership messages. Upload photos with white/light background.",
        endpoint: "/admin/administration-members",
        sub_dir: "admin_members",
        fields: [
          {
            name: "name",
            label: "Full Name",
            required: true,
            placeholder: "e.g. Dr. Akhilesh Kumar Tiwary",
          },
          {
            name: "designation",
            label: "Designation",
            required: true,
            placeholder: "e.g. Director, S.D. Public School",
          },
          {
            name: "photo_url",
            label: "Photo (use white/light background)",
            type: "image",
            help: "Upload a professional photo with white or light background — no dark backgrounds",
          },
          {
            name: "message_heading",
            label: "Message Heading",
            placeholder: "e.g. Dear Parents and Students,",
          },
          {
            name: "message",
            label: "Message",
            type: "textarea",
            placeholder: "Enter the full message...",
          },
          { name: "order", label: "Order (lower = first)", type: "number" },
        ],
        columns: [
          {
            name: "photo_url",
            label: "Photo",
            render: (it) =>
              it.photo_url ? (
                <img
                  src={
                    it.photo_url.startsWith("http")
                      ? it.photo_url
                      : `${process.env.REACT_APP_BACKEND_URL}${it.photo_url}`
                  }
                  alt=""
                  className="w-10 h-10 rounded-full object-cover object-top border border-slate-200 bg-white"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <User className="w-5 h-5" />
                </div>
              ),
          },
          { name: "name", label: "Name" },
          { name: "designation", label: "Designation" },
          { name: "order", label: "Order" },
        ],
      }}
    />
  );
}

export default AdminAdministrationMembers;
