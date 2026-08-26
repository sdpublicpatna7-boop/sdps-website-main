import api from "./api";

/**
 * Check if a URL belongs to Google Drive, Docs, Sheets, Slides, OneDrive, Dropbox
 */
export function isDriveUrl(url) {
  if (!url || typeof url !== "string") return false;
  const u = url.trim().toLowerCase();
  return (
    u.includes("drive.google.com") ||
    u.includes("docs.google.com") ||
    u.includes("1drv.ms") ||
    u.includes("onedrive.live.com") ||
    u.includes("sharepoint.com") ||
    u.includes("dropbox.com")
  );
}

/**
 * Check drive permission status via backend probe
 */
export async function checkDrivePermission(url) {
  if (!url || !url.trim()) return null;
  const cleanUrl = url.trim();

  try {
    const res = await api.post("/utils/check-drive-permission", { url: cleanUrl });
    return res.data;
  } catch (err) {
    console.warn("Drive permission check failed:", err);
    return {
      url: cleanUrl,
      is_drive: isDriveUrl(cleanUrl),
      is_public: false,
      status: "unknown",
      message: "Could not automatically verify access. Please ensure link is public.",
    };
  }
}
