import { useState } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import ResourceManager from "@/components/admin/ResourceManager";
import { fullUrl } from "@/lib/admin";

export function AdminCalendar() {
  const [importing, setImporting] = useState(false);
  const importExcel = async (file, target) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("target", target);
      const r = await api.post("/admin/calendar/import-excel", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Imported ${r.data.inserted} rows`);
      window.location.reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };
  return (
    <div>
      <Toaster position="top-right" />
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <FileUp className="w-5 h-5 text-amber-700 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">Excel Import</h3>
          <p className="text-xs text-brand-ink/70 mt-1">
            Excel must have columns: <strong>name, date</strong> (and optional: icon, type,
            description). Date format: YYYY-MM-DD or any Excel date.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs cursor-pointer hover:bg-amber-700 ${
                importing ? "opacity-50" : ""
              }`}
            >
              {importing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileUp className="w-3.5 h-3.5" />
              )}
              Import to Calendar
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                disabled={importing}
                onChange={(e) => e.target.files[0] && importExcel(e.target.files[0], "calendar")}
                data-testid="import-calendar-btn"
              />
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs cursor-pointer hover:bg-amber-700">
              <FileUp className="w-3.5 h-3.5" />
              Import to Holidays
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => e.target.files[0] && importExcel(e.target.files[0], "holidays")}
                data-testid="import-holidays-btn"
              />
            </label>
          </div>
        </div>
      </div>
      <ResourceManager
        config={{
          title: "Academic Calendar",
          endpoint: "/admin/calendar",
          sub_dir: "icons",
          fields: [
            { name: "name", label: "Event Name", type: "text", required: true },
            { name: "date", label: "Date", type: "date", required: true },
            {
              name: "type",
              label: "Type",
              type: "select",
              options: ["event", "exam", "vacation", "holiday", "celebration"],
              default: "event",
            },
            { name: "description", label: "Description", type: "textarea" },
            { name: "icon_url", label: "Icon", type: "image" },
          ],
          columns: [
            {
              name: "icon",
              label: "Icon",
              render: (it) =>
                it.icon_url ? <img src={fullUrl(it.icon_url)} alt="" className="w-8 h-8" /> : "-",
            },
            { name: "name", label: "Name" },
            { name: "date", label: "Date" },
            { name: "type", label: "Type" },
          ],
        }}
      />
    </div>
  );
}

export default AdminCalendar;
