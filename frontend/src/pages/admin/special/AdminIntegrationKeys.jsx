import { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast, Toaster } from "sonner";
import { Loader2, Plug, CheckCircle2, Wifi, RefreshCw } from "lucide-react";

const STATUS_META = {
  ok: { label: "Connected", cls: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  configured: { label: "Configured", cls: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  down: { label: "Down", cls: "bg-red-100 text-red-700", dot: "bg-red-500" },
  not_configured: { label: "Not set", cls: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
};

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.not_configured;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${m.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} /> {m.label}
    </span>
  );
}

export function AdminIntegrationKeys() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // WhatsApp connection (QR + link/unlink) lives here.
  const [wa, setWa] = useState({ connected: false, qr: null, user: null });
  const [waLoading, setWaLoading] = useState(true);

  // Audio Tunnel Nodes
  const [tunnelNodes, setTunnelNodes] = useState([]);
  const [tunnelLoading, setTunnelLoading] = useState(false);

  const fetchTunnelList = () => {
    setTunnelLoading(true);
    api.get("/admin/audio/tunnel/list")
      .then(res => {
        setTunnelNodes(res.data?.tunnels || []);
      })
      .catch(() => {})
      .finally(() => setTunnelLoading(false));
  };

  const handleSelectPrimary = (hostname) => {
    setTunnelLoading(true);
    api.post("/admin/audio/tunnel/select-primary", { hostname })
      .then(() => {
        toast.success(`Primary Audio Tunnel switched to PC '${hostname}'!`);
        fetchTunnelList();
      })
      .catch(err => {
        toast.error(`Failed to promote node: ${err.message}`);
      })
      .finally(() => setTunnelLoading(false));
  };

  const loadStatus = async () => {
    setRefreshing(true);
    try {
      const r = await api.get("/admin/integration-status");
      setData(r.data);
    } catch {
      toast.error("Could not load integration status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadWa = async () => {
    try {
      const r = await api.get("/whatsapp/status");
      setWa(r.data);
    } catch {
      setWa({ connected: false, qr: null, user: null });
    } finally {
      setWaLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadWa();
    fetchTunnelList();
  }, []);

  // Refresh the QR / connection while not yet linked.
  useEffect(() => {
    const id = setInterval(loadWa, wa.connected ? 20000 : 5000);
    return () => clearInterval(id);
  }, [wa.connected]);

  const disconnectWa = async () => {
    if (
      !window.confirm(
        "Log out / disconnect WhatsApp? You'll need to scan the QR again to relink."
      )
    )
      return;
    try {
      await api.post("/whatsapp/disconnect");
      toast.success("WhatsApp disconnected. A new QR will appear shortly.");
      setWa({ connected: false, qr: null, user: null });
      loadWa();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Disconnect failed");
    }
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading integrations…
      </div>
    );

  const integrations = data?.integrations || [];

  return (
    <div className="max-w-3xl">
      <Toaster position="top-right" richColors />
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-headline text-2xl font-semibold">Integrations & Health</h1>
        <button
          onClick={loadStatus}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-black/10 hover:bg-slate-50 disabled:opacity-50"
        >
          {refreshing && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Re-check
        </button>
      </div>
      <p className="text-sm text-brand-ink/60 mb-6">
        Live status of every service. Values are read from environment variables — sensitive
        credentials are partially masked. Last checked:{" "}
        {data?.checked_at ? new Date(data.checked_at).toLocaleTimeString() : "—"}.
      </p>

      <div className="space-y-4">
        {integrations.map((ig) => (
          <div key={ig.key} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-base">
                  {ig.icon || <Plug className="w-5 h-5 text-slate-500" />}
                </div>
                <div>
                  <h3 className="font-headline font-semibold text-brand-ink leading-tight">
                    {ig.label}
                  </h3>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">
                    {ig.group}
                  </div>
                </div>
              </div>
              <StatusBadge status={ig.status} />
            </div>

            {ig.detail && <div className="text-xs text-slate-500 mb-2">{ig.detail}</div>}

            <div className="divide-y divide-slate-100">
              {ig.fields.map((f) => (
                <div key={f.name} className="flex items-center justify-between py-2 gap-4">
                  <div className="text-xs font-mono font-semibold text-slate-600 flex items-center gap-1.5">
                    {f.name}
                    {f.sensitive && (
                      <span className="text-[9px] bg-slate-100 text-slate-400 px-1 rounded">
                        secret
                      </span>
                    )}
                  </div>
                  <code className="text-xs bg-slate-100 px-2.5 py-1.5 rounded font-mono shrink-0 max-w-[55%] truncate">
                    {f.value || <em className="text-red-500 not-italic">not set</em>}
                  </code>
                </div>
              ))}
            </div>

            {/* WhatsApp connection controls live inside its card */}
            {ig.manageable && ig.key === "whatsapp" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {waLoading ? (
                  <div className="text-xs text-slate-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Checking link…
                  </div>
                ) : wa.connected ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Linked
                      {wa.user?.id
                        ? ` · ${wa.user.id.split(":")[0].replace("@s.whatsapp.net", "")}`
                        : ""}
                    </div>
                    <button
                      onClick={disconnectWa}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                    >
                      Log out / Disconnect
                    </button>
                  </div>
                ) : wa.qr ? (
                  <div className="flex flex-col items-center text-center">
                    <img
                      src={wa.qr}
                      alt="WhatsApp QR"
                      className="w-48 h-48 rounded-xl border border-black/10"
                    />
                    <p className="text-[11px] text-slate-500 mt-2 max-w-xs">
                      WhatsApp → <strong>Linked Devices</strong> → <strong>Link a Device</strong> →
                      scan this code. It refreshes automatically.
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    Waiting for the WhatsApp service to produce a QR… ensure the service is running
                    and reachable.
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── REGISTERED AUDIO TUNNEL NODES & STANDBY REDUNDANCY ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mt-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-brand-navy">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline font-semibold text-lg text-slate-900">
                School Audio Hardware Cloudflare Tunnels
              </h2>
              <p className="text-xs text-slate-500">
                Registered active & standby tunnel nodes connecting school PCs to hardware controller (192.168.29.252).
              </p>
            </div>
          </div>
          <button
            onClick={fetchTunnelList}
            disabled={tunnelLoading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${tunnelLoading ? "animate-spin" : ""}`} /> Refresh Nodes
          </button>
        </div>

        {/* ── 1-LINE TUNNEL SETUP COMMANDS FOR MAC & WINDOWS ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                🍎 macOS Master Setup Command (Terminal)
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("curl -sL https://api.sdpublic.org/api/audio/setup-mac.sh | sudo bash");
                  toast.success("macOS command copied!");
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-md transition-colors"
              >
                Copy Mac Cmd
              </button>
            </div>
            <code className="block font-mono text-[11px] text-emerald-400 bg-slate-950 p-2.5 rounded-lg overflow-x-auto select-all">
              curl -sL https://api.sdpublic.org/api/audio/setup-mac.sh | sudo bash
            </code>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                🪟 Windows Master Setup Command (PowerShell Admin)
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-RestMethod https://api.sdpublic.org/api/audio/setup-win.ps1 | iex");
                  toast.success("Windows command copied!");
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-md transition-colors"
              >
                Copy Win Cmd
              </button>
            </div>
            <code className="block font-mono text-[11px] text-sky-400 bg-slate-950 p-2.5 rounded-lg overflow-x-auto select-all">
              [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-RestMethod https://api.sdpublic.org/api/audio/setup-win.ps1 | iex
            </code>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs align-middle">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Node Hostname</th>
                <th className="py-3 px-4 whitespace-nowrap">Tunnel URL</th>
                <th className="py-3 px-4 whitespace-nowrap">Target IP</th>
                <th className="py-3 px-4 whitespace-nowrap">Last Ping</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {tunnelNodes.length > 0 ? (
                tunnelNodes.map((node, idx) => (
                  <tr key={idx} className={`hover:bg-slate-50/80 transition-colors align-middle ${node.is_primary ? "bg-emerald-50/30" : ""}`}>
                    <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${node.is_primary ? "bg-emerald-500" : "bg-amber-500"}`} />
                        <span>{node.hostname}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 truncate max-w-[240px] whitespace-nowrap">
                      {node.tunnel_url}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">{node.target_ip}</td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {node.last_ping ? new Date(node.last_ping).toLocaleTimeString() : "Never"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        node.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : node.status === "STANDBY"
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : "bg-rose-100 text-rose-800 border border-rose-300"
                      }`}>
                        {node.status_label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {!node.is_primary && node.status !== "OFFLINE" ? (
                        <button
                          onClick={() => handleSelectPrimary(node.hostname)}
                          disabled={tunnelLoading}
                          className="px-3.5 py-1.5 bg-brand-navy hover:bg-brand-blue text-white font-bold rounded-xl text-xs transition-all shadow-xs whitespace-nowrap"
                        >
                          Promote to Active
                        </button>
                      ) : node.is_primary ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active Primary
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 whitespace-nowrap">Offline</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 font-semibold">
                    No registered tunnel nodes found. Run the setup script on a school PC to add a node!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 mt-6">
        <strong>To change any value:</strong> update the environment variable on the backend service
        and restart it. Credentials are never stored in the database — always read from the
        environment.
      </div>
    </div>
  );
}

export default AdminIntegrationKeys;
