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

export async function uploadImage(file, sub_dir = "gallery", isPublic = false) {
  const fd = new FormData();
  fd.append("sub_dir", sub_dir);
  fd.append("file", file);
  const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
  const endpoint = (!token || isPublic) ? "/public-upload-file" : "/admin/upload-image";
  const r = await api.post(endpoint, fd, { headers: { "Content-Type": "multipart/form-data" } });
  return r.data;
}

export async function uploadFile(file, sub_dir = "misc", max_mb = 5, isPublic = false) {
  const fd = new FormData();
  fd.append("sub_dir", sub_dir);
  fd.append("max_mb", String(max_mb));
  fd.append("file", file);
  const token = localStorage.getItem("admin_token") || localStorage.getItem("token");
  const endpoint = (!token || isPublic) ? "/public-upload-file" : "/admin/upload-file";
  const r = await api.post(endpoint, fd, { headers: { "Content-Type": "multipart/form-data" } });
  return r.data;
}

export const fullUrl = (u) => {
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("data:")) return u;
  const BACKEND_URL = getBackendUrl();
  return `${BACKEND_URL.replace(/\/+$/, "")}${u.startsWith("/") ? u : "/" + u}`;
};
