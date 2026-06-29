// API Client adapter for School Elections (Supabase + Local FastAPI fallback)
import { supabase } from "./api";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";
const localApi = axios.create({ baseURL: BACKEND_URL.replace(/\/+$/, "") + "/api" });

export const getElectionSettings = async () => {
  if (supabase) {
    const { data } = await supabase.from("election_settings").select("*");
    const settings = {};
    if (data) {
      data.forEach(d => { settings[d.key] = d.value; });
    }
    return settings;
  }
  const { data } = await localApi.get("/settings");
  // Normalize settings map
  const settings = {};
  if (Array.isArray(data)) {
    data.forEach(d => { settings[d.key] = d.value; });
  } else if (data && typeof data === "object") {
    return data;
  }
  return settings;
};

export const getVoterDetails = async (admissionNo) => {
  if (supabase) {
    const { data, error } = await supabase
      .from("election_voters")
      .select("*")
      .eq("admission_no", admissionNo)
      .single();
    if (error || !data) throw new Error("Voter not found in database.");
    return {
      admission_no: data.admission_no,
      name: data.name,
      role: data.role,
      has_voted: data.already_voted,
      class_name: data.class_name,
      father_name: data.father_name
    };
  }
  const { data } = await localApi.get(`/users/${admissionNo}`);
  return data;
};

export const getElectionPosts = async () => {
  if (supabase) {
    const { data } = await supabase
      .from("election_posts")
      .select("*")
      .order("order_index", { ascending: true });
    // Map to the frontend expectations (posts need key, title, order)
    return (data || []).map(p => ({
      key: p.key,
      title: p.title,
      order: p.order_index
    }));
  }
  const { data } = await localApi.get("/posts");
  return data;
};

export const getElectionCandidates = async () => {
  if (supabase) {
    const { data } = await supabase
      .from("election_candidates")
      .select("*");
    // Map database properties (post_key -> post)
    return (data || []).map(c => ({
      id: c.id,
      post: c.post_key,
      name: c.name,
      photo: c.photo,
      symbol: c.symbol,
      symbol_image: c.symbol_image,
      adjustment: c.adjustment
    }));
  }
  const { data } = await localApi.get("/candidates");
  return data;
};

export const castVote = async (admissionNo, selections) => {
  if (supabase) {
    const { data, error } = await supabase.functions.invoke("election-vote", {
      body: { admission_no: admissionNo, selections }
    });
    if (error || (data && data.error)) {
      throw new Error(data?.error || error?.message || "Failed to cast vote.");
    }
    return data;
  }
  const { data } = await localApi.post("/ballot", { admission_no: admissionNo, selections });
  return data;
};

export const getElectionArchiveResults = async (sessionName) => {
  if (supabase) {
    const { data } = await supabase
      .from("election_results_archive")
      .select("*")
      .eq("session_name", sessionName);
    return data || [];
  }
  // Local fallback returns mock or empty
  return [];
};
