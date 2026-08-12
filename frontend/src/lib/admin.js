import { useEffect, useState } from "react";
import api, { getBackendUrl } from "./api";

export function useAdminList(endpoint) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    try {
      const r = await api.get(endpoint);
      setItems(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, [endpoint]);
  return { items, loading, reload };
}

export async function uploadImage(file, sub_dir = "gallery") {
  const fd = new FormData();
  fd.append("sub_dir", sub_dir);
  fd.append("file", file);
  const r = await api.post("/admin/upload-image", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return r.data;
}

export async function uploadFile(file, sub_dir = "misc", max_mb = 5) {
  const fd = new FormData();
  fd.append("sub_dir", sub_dir);
  fd.append("max_mb", String(max_mb));
  fd.append("file", file);
  const r = await api.post("/admin/upload-file", fd, { headers: { "Content-Type": "multipart/form-data" } });
  return r.data;
}

export const fullUrl = (u) => {
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("data:")) return u;
  const BACKEND_URL = getBackendUrl();
  return `${BACKEND_URL.replace(/\/+$/, "")}${u.startsWith("/") ? u : "/" + u}`;
};
