import { useAdminList } from "@/lib/admin";

export function AdminReadOnlyList({ title, endpoint, columns }) {
  const { items, loading } = useAdminList(endpoint);
  return (
    <div>
      <h1 className="font-headline text-2xl font-semibold mb-6">{title}</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-brand-ink/60">
              <tr>
                {columns.map((c) => (
                  <th key={c.name} className="text-left py-3 px-4">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  {columns.map((c) => (
                    <td key={c.name} className="py-3 px-4">
                      {c.render ? c.render(it) : String(it[c.name] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="py-8 text-center text-brand-ink/60">
                    No records yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminReadOnlyList;
