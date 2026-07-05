import api, { getBackendUrl } from "./api";

// Public Endpoints
export const getElectionSettings = async () => {
  const { data } = await api.get("/elections/settings");
  return data;
};

export const getVoterDetails = async (admissionNo) => {
  const { data } = await api.get(`/elections/voters/${admissionNo}`);
  return data;
};

export const getElectionStats = async () => {
  const { data } = await api.get("/elections/stats");
  return data;
};

export const getElectionPosts = async () => {
  const { data } = await api.get("/elections/bootstrap");
  return data.posts || [];
};

export const getElectionCandidates = async () => {
  const { data } = await api.get("/elections/bootstrap");
  return data.candidates || [];
};

export const castVote = async (admissionNo, selections, accessCode = "") => {
  const { data } = await api.post("/elections/vote", {
    admission_no: admissionNo,
    selections,
    access_code: accessCode || "",
  });
  return data;
};

export const photoUrl = (photo) => {
  if (!photo) return null;
  if (/^(https?:|data:)/i.test(photo)) return photo;
  const BACKEND_URL = getBackendUrl();
  if (photo.startsWith("/")) return `${BACKEND_URL.replace(/\/+$/, "")}${photo}`;
  return photo;
};

// Admin Endpoints
export const saveElectionSetting = async (key, value) => {
  const { data } = await api.post(`/elections/settings/${key}`, { value });
  return data;
};

export const createElectionPost = async (key, title, orderIndex) => {
  const { data } = await api.post("/elections/posts", { key, title, order_index: orderIndex });
  return data;
};

export const deleteElectionPost = async (key) => {
  const { data } = await api.delete(`/elections/posts/${key}`);
  return data;
};

export const nominateCandidate = async (name, postKey, symbol, photo = "", symbolImage = "") => {
  const { data } = await api.post("/elections/candidates", {
    name,
    post_key: postKey,
    symbol,
    photo,
    symbol_image: symbolImage
  });
  return data;
};

export const deleteCandidate = async (id) => {
  const { data } = await api.delete(`/elections/candidates/${id}`);
  return data;
};

export const uploadVotersRoster = async (votersList) => {
  const { data } = await api.post("/elections/voters/upload", votersList);
  return data;
};

export const archiveElectionResults = async (sessionName) => {
  const { data } = await api.post("/elections/archive", null, { params: { session_name: sessionName } });
  return data;
};

export const getPublicResults = async () => {
  const { data } = await api.get("/elections/public-results");
  return data;
};

export const scheduleResultsPublish = async (isoTime) => {
  const { data } = await api.post("/elections/settings/results_publish_time", { value: isoTime });
  return data;
};

export function parseCandidateTransform(urlStr) {
  const defaultStyle = { objectPosition: "center top", objectFit: "cover" };
  if (!urlStr || typeof urlStr !== "string") return { style: defaultStyle, cleanUrl: urlStr };
  const parts = urlStr.split("?");
  const cleanUrl = parts[0];
  const query = parts[1];
  if (!query) return { style: defaultStyle, cleanUrl };
  const searchParams = new URLSearchParams(query);
  const scaleStr = searchParams.get("scale");
  const xStr = searchParams.get("x");
  const yStr = searchParams.get("y");

  if (!scaleStr && !xStr && !yStr) {
    return { style: defaultStyle, cleanUrl };
  }

  const scale = parseFloat(scaleStr) || 1;
  const x = parseFloat(xStr) || 0;
  const y = parseFloat(yStr) || 0;
  
  // Convert pixel offsets (calibrated on 192px mockup) to percentage-based object-position.
  // Default center is 50% 50%. Each pixel of offset maps to ~0.52% (100/192).
  const posX = 50 - (x / 192) * 100;
  const posY = 50 - (y / 192) * 100;
  
  return {
    style: {
      objectFit: "cover",
      objectPosition: `${posX.toFixed(1)}% ${posY.toFixed(1)}%`,
      transform: scale !== 1 ? `scale(${scale})` : undefined,
    },
    cleanUrl,
  };
}

