import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// Check if Supabase should be active
const useSupabase = process.env.REACT_APP_SUPABASE_URL && process.env.REACT_APP_SUPABASE_URL !== "";
export let supabase = null;
if (useSupabase) {
  supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);
}

// Candidate backend bases, in priority order
const RAW_BASES = [
  process.env.REACT_APP_BACKEND_URL,
  process.env.REACT_APP_BACKEND_FALLBACK,
]
  .filter(Boolean)
  .map((s) => s.replace(/\/+$/, ""));

const BASES = RAW_BASES.filter((v, i, a) => a.indexOf(v) === i);
const DEFAULT_BASE = BASES[0] || "";

function pinnedBase() {
  try {
    const p = sessionStorage.getItem("sdps_api_base");
    return p && BASES.includes(p) ? p : null;
  } catch {
    return null;
  }
}

function orderedBases() {
  const p = pinnedBase();
  const list = BASES.length ? BASES : [DEFAULT_BASE];
  return p ? [p, ...list.filter((b) => b !== p)] : list;
}

export const API = `${DEFAULT_BASE}/api`;

let inMemoryToken = null;
try {
  inMemoryToken = localStorage.getItem("sdps_admin_token") || null;
} catch (e) {}

export function setAuthToken(token) {
  inMemoryToken = token || null;
  try {
    if (token) {
      localStorage.setItem("sdps_admin_token", token);
    } else {
      localStorage.removeItem("sdps_admin_token");
    }
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CLIENT DATABASE TRANSLATION ROUTER (Axios Adapter)
// ─────────────────────────────────────────────────────────────────────────────
async function handleSupabaseRequest(config) {
  const path = config.url.replace(/^\/?api\/?/, "").replace(/^\//, "");
  const method = (config.method || "get").toLowerCase();
  const data = config.data ? (typeof config.data === "string" ? JSON.parse(config.data) : config.data) : {};

  let supabaseData = null;
  let supabaseError = null;

  // 1. News & Notices
  if (path === "news" || path.startsWith("news/")) {
    if (method === "get") {
      if (path.includes("/")) {
        const id = path.split("/")[1];
        const { data: item, error } = await supabase.from("site_news").select("*").eq("id", id).maybeSingle();
        supabaseData = item; supabaseError = error;
      } else {
        const { data: list, error } = await supabase.from("site_news").select("*").order("date", { ascending: false });
        supabaseData = list; supabaseError = error;
      }
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("site_news").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    } else if (method === "delete") {
      const id = path.split("/")[1];
      const { error } = await supabase.from("site_news").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 2. Notices Only
  else if (path === "notices") {
    const { data: list, error } = await supabase.from("site_news").select("*").eq("category", "notice").order("date", { ascending: false });
    supabaseData = list; supabaseError = error;
  }

  // 3. Gallery
  else if (path === "gallery" || path.startsWith("gallery/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("site_gallery").select("*").order("created_at", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("site_gallery").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    }
  }

  // 4. Videos
  else if (path === "videos") {
    const { data: list, error } = await supabase.from("site_videos").select("*").order("created_at", { ascending: false });
    supabaseData = list; supabaseError = error;
  }

  // 5. Calendar
  else if (path === "calendar") {
    const { data: list, error } = await supabase.from("site_calendar").select("*");
    supabaseData = list; supabaseError = error;
  }

  // 6. Holidays
  else if (path === "holidays") {
    const { data: list, error } = await supabase.from("site_holidays").select("*").order("date");
    supabaseData = list; supabaseError = error;
  }

  // 7. Admissions
  else if (path === "admission/enquiry") {
    const { data: ins, error } = await supabase.from("admission_enquiries").insert(data).select().single();
    supabaseData = ins; supabaseError = error;
  } 
  else if (path === "admission/apply") {
    const { data: ins, error } = await supabase.from("admission_applications").insert(data).select().single();
    supabaseData = ins; supabaseError = error;
  }
  else if (path === "admissions") {
    const { data: list, error } = await supabase.from("admission_applications").select("*").order("created_at", { ascending: false });
    supabaseData = list; supabaseError = error;
  }

  // 8. Career
  else if (path === "career/apply") {
    const { data: ins, error } = await supabase.from("career_applications").insert(data).select().single();
    supabaseData = ins; supabaseError = error;
  }
  else if (path === "career-applications") {
    const { data: list, error } = await supabase.from("career_applications").select("*").order("created_at", { ascending: false });
    supabaseData = list; supabaseError = error;
  }

  // 9. Alumni
  else if (path === "alumni/register") {
    const { data: ins, error } = await supabase.from("alumni_members").insert(data).select().single();
    supabaseData = ins; supabaseError = error;
  }
  else if (path === "alumni-members") {
    const { data: list, error } = await supabase.from("alumni_members").select("*").order("created_at", { ascending: false });
    supabaseData = list; supabaseError = error;
  }
  else if (path === "alumni/meets") {
    const { data: list, error } = await supabase.from("alumni_meets").select("*").order("date", { ascending: false });
    supabaseData = list; supabaseError = error;
  }

  // 9b. Student Council (Profiles, Posters, and Election Results)
  else if (path === "council/profiles") {
    const { data: list, error } = await supabase.from("site_council_profiles").select("*");
    if (list) {
      supabaseData = list.map(p => ({
        id: p.id,
        name: p.name,
        position: p.post,
        photo_url: p.image_url,
        is_captain: p.post ? p.post.toLowerCase().includes("captain") : false,
        house: p.class_name,
        year: "2026-27",
        bio: ""
      }));
    }
    supabaseError = error;
  }
  else if (path === "council/posters") {
    const { data: list, error } = await supabase.from("site_council_posters").select("*");
    if (list) {
      supabaseData = list.map(p => ({
        id: p.id,
        candidate_name: p.candidate_name,
        position: p.post,
        poster_url: p.image_url,
        year: "2026-27",
        bio: ""
      }));
    }
    supabaseError = error;
  }
  else if (path === "council/results") {
    const { data: list, error: err1 } = await supabase.from("site_council_results").select("*");
    if (list && list.length > 0) {
      const groupedRows = {};
      list.forEach(row => {
        const key = `2026-27_${row.post}`;
        if (!groupedRows[key]) groupedRows[key] = [];
        groupedRows[key].push(row);
      });

      const compiledResults = [];
      Object.keys(groupedRows).forEach(key => {
        const rows = groupedRows[key];
        rows.sort((a, b) => b.votes - a.votes);
        const winnerRow = rows.find(r => r.is_winner) || rows[0];
        const runnerUpRow = rows.find(r => r !== winnerRow) || null;

        compiledResults.push({
          id: key,
          year: "2026-27",
          position: winnerRow.post,
          winner: winnerRow.candidate_name,
          runner_up: runnerUpRow ? runnerUpRow.candidate_name : "-",
          votes: winnerRow.votes
        });
      });
      supabaseData = compiledResults;
      supabaseError = err1;
    } else {
      const { data: archiveList, error: err2 } = await supabase.from("election_results_archive").select("*");
      if (archiveList) {
        const groupedRows = {};
        archiveList.forEach(row => {
          const key = `${row.session_name}_${row.post_title}`;
          if (!groupedRows[key]) groupedRows[key] = [];
          groupedRows[key].push(row);
        });

        const compiledResults = [];
        Object.keys(groupedRows).forEach(key => {
          const rows = groupedRows[key];
          rows.sort((a, b) => b.votes_count - a.votes_count);
          const winnerRow = rows.find(r => r.is_winner) || rows[0];
          const runnerUpRow = rows.find(r => r !== winnerRow) || null;

          compiledResults.push({
            id: key,
            year: winnerRow.session_name,
            position: winnerRow.post_title,
            winner: winnerRow.candidate_name,
            runner_up: runnerUpRow ? runnerUpRow.candidate_name : "-",
            votes: winnerRow.votes_count
          });
        });
        supabaseData = compiledResults;
      }
      supabaseError = err2;
    }
  }

  // 10. Testimonials
  else if (path === "testimonials") {
    const { data: list, error } = await supabase.from("site_testimonials").select("*").order("created_at", { ascending: false });
    supabaseData = list; supabaseError = error;
  }

  // 11. Transfer Certificates (TC)
  else if (path === "tc-records" || path === "tc/download") {
    if (method === "get") {
      const { data: list, error } = await supabase.from("tc_records").select("*").order("issue_date", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      if (path === "tc/download") {
        const { data: item, error } = await supabase.from("tc_records").select("*").eq("admission_no", data.admission_no).eq("status", "active").maybeSingle();
        supabaseData = item; supabaseError = error;
      } else {
        const { data: ins, error } = await supabase.from("tc_records").insert(data).select().single();
        supabaseData = ins; supabaseError = error;
      }
    }
  }

  // 12. Legal Pages
  else if (path.startsWith("legal/")) {
    const pageId = path.split("/")[1];
    const { data: page, error } = await supabase.from("site_legal_pages").select("*").eq("id", pageId).maybeSingle();
    supabaseData = page; supabaseError = error;
  }

  // 13. Site Settings
  else if (path === "site-settings") {
    const { data: settings, error } = await supabase.from("site_settings").select("*");
    if (settings) {
      // Map back to key-value object
      const mapped = {};
      settings.forEach(s => mapped[s.key] = s.value);
      supabaseData = mapped;
    }
    supabaseError = error;
  }

  // 14. Chat Assistant (Gemini)
  else if (path === "assistant/chat") {
    const { data: res, error } = await supabase.functions.invoke("chat-assistant", {
      body: { message: data.message }
    });
    supabaseData = res; supabaseError = error;
  }

  // 15. Razorpay Orders & Verification
  else if (path.endsWith("/create-order") || path.endsWith("/payment-confirm") || path.endsWith("/verify-payment")) {
    const action = path.split("/").pop();
    const { data: res, error } = await supabase.functions.invoke("razorpay-payments", {
      body: { action, ...data }
    });
    supabaseData = res; supabaseError = error;
  }

  if (supabaseError) {
    throw new Error(supabaseError.message);
  }

  return {
    data: supabaseData,
    status: 200,
    statusText: "OK",
    headers: {},
    config
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AXIOS CLIENT CONSTRUCT
// ─────────────────────────────────────────────────────────────────────────────
const api = axios.create({
  withCredentials: true,
  adapter: async (config) => {
    if (useSupabase) {
      // Routes handled natively by the FastAPI backend — bypass Supabase adapter
      const url = config.url || "";
      const isBackendRoute = /^\/?api\/(elections|auth|admin|upload|whatsapp|fee-reminder|birthday)/.test(url)
        || /\/(elections|auth|admin|upload|whatsapp|fee-reminder|birthday)/.test(url);

      if (!isBackendRoute) {
        try {
          return await handleSupabaseRequest(config);
        } catch (err) {
          return Promise.reject({
            message: err.message,
            response: {
              status: 400,
              data: { detail: err.message }
            },
            config
          });
        }
      }
    }
    
    // Default Axios fallback (backend server)
    const defaultAdapter = axios.defaults.adapter;
    const adapter = axios.getAdapter ? axios.getAdapter(defaultAdapter) : defaultAdapter;
    return adapter(config);
  }
});

api.interceptors.request.use((config) => {
  if (inMemoryToken) config.headers.Authorization = `Bearer ${inMemoryToken}`;
  if (!config.baseURL) {
    config.baseURL = `${orderedBases()[0]}/api`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => {
    try {
      const used = (res.config.baseURL || "").replace(/\/api$/, "");
      if (used) sessionStorage.setItem("sdps_api_base", used);
    } catch {
      /* ignore */
    }
    return res;
  },
  async (err) => {
    const config = err.config || {};
    if (!err.response && config && !config.__noRetry) {
      config.__tried = config.__tried || [];
      const current = (config.baseURL || "").replace(/\/api$/, "");
      if (current && !config.__tried.includes(current)) config.__tried.push(current);
      const next = orderedBases().find((b) => !config.__tried.includes(b));
      if (next) {
        config.baseURL = `${next}/api`;
        return api(config);
      }
    }

    if (
      err?.response?.status === 401 &&
      window.location.pathname.startsWith("/admin") &&
      !window.location.pathname.includes("/admin/login") &&
      !window.location.pathname.includes("/admin/forgot-password")
    ) {
      inMemoryToken = null;
      try {
        localStorage.removeItem("sdps_admin_session");
        localStorage.removeItem("sdps_admin_token");
      } catch (e) {}
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

export function optimizeCloudinary(url, width = null) {
  if (!url || typeof url !== "string") return url;
  if (url.includes("res.cloudinary.com")) {
    if (url.includes("/upload/q_auto")) return url;
    const params = ["q_auto", "f_auto"];
    if (width) {
      params.push(`w_${width}`);
    }
    const paramString = params.join(",");
    return url.replace("/upload/", `/upload/${paramString}/`);
  }
  return url;
}

export function parseImageTransform(urlStr) {
  if (!urlStr || typeof urlStr !== "string") return { style: {}, cleanUrl: urlStr };
  const parts = urlStr.split("?");
  const cleanUrl = parts[0];
  const query = parts[1];
  if (!query) return { style: {}, cleanUrl };
  const searchParams = new URLSearchParams(query);
  const scale = searchParams.get("scale");
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  if (!scale && !x && !y) return { style: {}, cleanUrl };
  return {
    style: {
      transform: `scale(${scale || 1}) translate(${x || 0}px, ${y || 0}px)`,
      transformOrigin: "center center",
    },
    cleanUrl,
  };
}

export default api;
