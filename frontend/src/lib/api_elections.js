import api from "./api";

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

export const castVote = async (admissionNo, selections) => {
  const { data } = await api.post("/elections/vote", { admission_no: admissionNo, selections });
  return data;
};

export const photoUrl = (photo) => {
  if (!photo) return null;
  if (/^(https?:|data:)/i.test(photo)) return photo;
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
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

export const archiveElectionResults = async (archiveRows) => {
  const { data } = await api.post("/elections/archive", archiveRows);
  return data;
};
