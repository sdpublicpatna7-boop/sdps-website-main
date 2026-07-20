import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// Check if Supabase should be active
const useSupabase = false;
export let supabase = null;

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

// The auth token is kept in memory ONLY. Persistence across page loads is
// handled by the HttpOnly session cookie set by the server, which JavaScript
// (and therefore any XSS payload) cannot read.
let inMemoryToken = null;
try {
  // One-time cleanup: purge tokens persisted by older versions of the app.
  localStorage.removeItem("sdps_admin_token");
} catch (e) {}

export function setAuthToken(token) {
  inMemoryToken = token || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE CLIENT DATABASE TRANSLATION ROUTER (Axios Adapter)
// ─────────────────────────────────────────────────────────────────────────────
async function handleSupabaseRequest(config) {
  const path = config.url.replace(/^\/?api\/?/, "").replace(/^\//, "");
  const method = (config.method || "get").toLowerCase();
  
  // Extract and parse body data, handling both JSON and FormData instances.
  let data = {};
  if (config.data) {
    if (config.data instanceof FormData) {
      data = config.data;
    } else {
      data = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    }
  }

  let supabaseData = null;
  let supabaseError = null;

  // Normalize admin CRUD paths to match their public counterparts
  let cleanPath = path;
  if (path.startsWith("admin/")) {
    const sub = path.substring(6);
    const genericCrud = [
      "news", "notices", "gallery", "videos", "calendar", "holidays",
      "testimonials", "tc-records", "admission/enquiry", "admission/apply",
      "career/apply", "alumni/register", "alumni/meets", "alumni-members",
      "career-applications", "admissions", "site-settings"
    ];
    if (genericCrud.some(k => sub === k || sub.startsWith(k + "/"))) {
      cleanPath = sub;
    }
  }

  // 1. News & Notices
  if (cleanPath === "news" || cleanPath.startsWith("news/")) {
    if (method === "get") {
      if (cleanPath.includes("/")) {
        const id = cleanPath.split("/")[1];
        const { data: item, error } = await supabase.from("site_news").select("*").eq("id", id).maybeSingle();
        supabaseData = item; supabaseError = error;
      } else {
        const { data: list, error } = await supabase.from("site_news").select("*").order("date", { ascending: false });
        supabaseData = list; supabaseError = error;
      }
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("site_news").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("site_news").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("site_news").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 2. Notices Only
  else if (cleanPath === "notices") {
    const { data: list, error } = await supabase.from("site_news").select("*").eq("category", "notice").order("date", { ascending: false });
    supabaseData = list; supabaseError = error;
  }

  // 3. Gallery
  else if (cleanPath === "gallery" || cleanPath.startsWith("gallery/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("site_gallery").select("*").order("created_at", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("site_gallery").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("site_gallery").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("site_gallery").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 4. Videos
  else if (cleanPath === "videos" || cleanPath.startsWith("videos/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("site_videos").select("*").order("created_at", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("site_videos").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("site_videos").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("site_videos").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 5. Calendar
  else if (cleanPath === "calendar" || cleanPath.startsWith("calendar/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("site_calendar").select("*");
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("site_calendar").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("site_calendar").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("site_calendar").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 6. Holidays
  else if (cleanPath === "holidays" || cleanPath.startsWith("holidays/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("site_holidays").select("*").order("date");
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("site_holidays").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("site_holidays").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("site_holidays").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 7. Admissions
  else if (cleanPath === "admission/enquiry") {
    const { data: ins, error } = await supabase.from("admission_enquiries").insert(data).select().single();
    supabaseData = ins; supabaseError = error;
  } 
  else if (cleanPath === "admission/apply") {
    const { data: ins, error } = await supabase.from("admission_applications").insert(data).select().single();
    supabaseData = ins; supabaseError = error;
  }
  else if (cleanPath === "admissions" || cleanPath.startsWith("admissions/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("admission_applications").select("*").order("created_at", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("admission_applications").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 8. Career
  else if (cleanPath === "career/apply") {
    const { data: ins, error } = await supabase.from("career_applications").insert(data).select().single();
    supabaseData = ins; supabaseError = error;
  }
  else if (cleanPath === "career-applications" || cleanPath.startsWith("career-applications/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("career_applications").select("*").order("created_at", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("career_applications").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 9. Alumni
  else if (cleanPath === "alumni/register") {
    const { data: ins, error } = await supabase.from("alumni_members").insert(data).select().single();
    supabaseData = ins; supabaseError = error;
  }
  else if (cleanPath === "alumni-members" || cleanPath.startsWith("alumni-members/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("alumni_members").select("*").order("created_at", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("alumni_members").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("alumni_members").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    }
  }
  else if (cleanPath === "alumni/meets" || cleanPath.startsWith("alumni/meets/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("alumni_meets").select("*").order("date", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("alumni_meets").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("alumni_meets").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("alumni_meets").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 9b. Student Council (Profiles, Posters, and Election Results)
  else if (cleanPath === "council/profiles") {
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
  else if (cleanPath === "council/posters") {
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
  else if (cleanPath === "council/results") {
    const { data: candidates } = await supabase.from("election_candidates").select("*");
    const findPhoto = (name) => {
      const c = (candidates || []).find(x => x.name.toLowerCase() === name.toLowerCase());
      return c ? c.photo : null;
    };
    const findSymbol = (name) => {
      const c = (candidates || []).find(x => x.name.toLowerCase() === name.toLowerCase());
      return c ? c.symbol : "";
    };

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
          winner_photo: findPhoto(winnerRow.candidate_name),
          winner_symbol: findSymbol(winnerRow.candidate_name),
          runner_up: runnerUpRow ? runnerUpRow.candidate_name : "-",
          runner_up_photo: runnerUpRow ? findPhoto(runnerUpRow.candidate_name) : null,
          runner_up_symbol: runnerUpRow ? findSymbol(runnerUpRow.candidate_name) : "",
          votes: winnerRow.votes,
          runner_up_votes: runnerUpRow ? runnerUpRow.votes : 0
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
            winner_photo: findPhoto(winnerRow.candidate_name),
            winner_symbol: winnerRow.candidate_symbol || findSymbol(winnerRow.candidate_name),
            runner_up: runnerUpRow ? runnerUpRow.candidate_name : "-",
            runner_up_photo: runnerUpRow ? findPhoto(runnerUpRow.candidate_name) : null,
            runner_up_symbol: runnerUpRow ? runnerUpRow.candidate_symbol || findSymbol(winnerRow.candidate_name) : "",
            votes: winnerRow.votes_count,
            runner_up_votes: runnerUpRow ? runnerUpRow.votes_count : 0
          });
        });
        supabaseData = compiledResults;
      }
      supabaseError = err2;
    }
  }

  // 10. Testimonials
  else if (cleanPath === "testimonials" || cleanPath.startsWith("testimonials/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("site_testimonials").select("*").order("created_at", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      const { data: ins, error } = await supabase.from("site_testimonials").insert(data).select().single();
      supabaseData = ins; supabaseError = error;
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("site_testimonials").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("site_testimonials").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 11. Transfer Certificates (TC)
  else if (cleanPath === "tc-records" || cleanPath === "tc/download" || cleanPath.startsWith("tc-records/")) {
    if (method === "get") {
      const { data: list, error } = await supabase.from("tc_records").select("*").order("issue_date", { ascending: false });
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      if (cleanPath === "tc/download") {
        const { data: item, error } = await supabase.from("tc_records").select("*").eq("admission_no", data.admission_no).eq("status", "active").maybeSingle();
        supabaseData = item; supabaseError = error;
      } else {
        const { data: ins, error } = await supabase.from("tc_records").insert(data).select().single();
        supabaseData = ins; supabaseError = error;
      }
    } else if (method === "put" || method === "patch") {
      const id = cleanPath.split("/")[1];
      const { data: upd, error } = await supabase.from("tc_records").update(data).eq("id", id).select().single();
      supabaseData = upd; supabaseError = error;
    } else if (method === "delete") {
      const id = cleanPath.split("/")[1];
      const { error } = await supabase.from("tc_records").delete().eq("id", id);
      supabaseData = { success: true }; supabaseError = error;
    }
  }

  // 12. Legal Pages
  else if (cleanPath.startsWith("legal/")) {
    const pageId = cleanPath.split("/")[1];
    const { data: page, error } = await supabase.from("site_legal_pages").select("*").eq("id", pageId).maybeSingle();
    supabaseData = page; supabaseError = error;
  }

  // 13. Site Settings
  else if (cleanPath === "site-settings" || cleanPath === "admin/site-settings") {
    if (method === "get") {
      const { data: settings, error } = await supabase.from("site_settings").select("*");
      if (settings) {
        const mapped = {};
        settings.forEach(s => mapped[s.key] = s.value);
        supabaseData = mapped;
      }
      supabaseError = error;
    } else if (method === "post" || method === "put" || method === "patch") {
      const promises = Object.entries(data).map(([k, v]) => {
        return supabase.from("site_settings").upsert({ key: k, value: v });
      });
      await Promise.all(promises);
      supabaseData = { success: true };
    }
  }

  // 14. Chat Assistant (Gemini)
  else if (cleanPath === "assistant/chat") {
    const { data: res, error } = await supabase.functions.invoke("chat-assistant", {
      body: { message: data.message }
    });
    supabaseData = res; supabaseError = error;
  }

  // 15. Razorpay Orders & Verification
  else if (cleanPath.endsWith("/create-order") || cleanPath.endsWith("/payment-confirm") || cleanPath.endsWith("/verify-payment")) {
    const action = cleanPath.split("/").pop();
    const { data: res, error } = await supabase.functions.invoke("razorpay-payments", {
      body: { action, ...data }
    });
    supabaseData = res; supabaseError = error;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERVERLESS AUTHENTICATION
  // ─────────────────────────────────────────────────────────────────────────
  else if (path === "admin/login") {
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });
    if (error) throw error;
    const { data: profile } = await supabase.from("qp_profiles").select("*").eq("id", authData.user.id).maybeSingle();
    const user = {
      id: authData.user.id,
      email: authData.user.email,
      name: profile?.name || authData.user.user_metadata?.name || "Admin",
      role: (profile && profile.role === "qp_admin") ? "superadmin" : "staff",
      permissions: ["news", "notices", "gallery", "calendar", "council", "admissions", "career", "alumni", "site-settings", "whatsapp", "media-tools"]
    };
    inMemoryToken = authData.session.access_token;
    try {
      // Presence hint only — the token itself is never persisted.
      localStorage.setItem("sdps_admin_session", "1");
    } catch (e) {}
    supabaseData = {
      access_token: authData.session.access_token,
      token_type: "bearer",
      user
    };
  }
  else if (path === "admin/logout") {
    await supabase.auth.signOut();
    inMemoryToken = null;
    try {
      localStorage.removeItem("sdps_admin_session");
    } catch (e) {}
    supabaseData = { status: "ok" };
  }
  else if (path === "admin/me") {
    const { data: { user: authUser }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !authUser) {
      throw new Error("Not authenticated");
    }
    const { data: profile } = await supabase.from("qp_profiles").select("*").eq("id", authUser.id).maybeSingle();
    supabaseData = {
      id: authUser.id,
      email: authUser.email,
      name: profile?.name || authUser.user_metadata?.name || "Admin",
      role: (profile && profile.role === "qp_admin") ? "superadmin" : "staff",
      permissions: ["news", "notices", "gallery", "calendar", "council", "admissions", "career", "alumni", "site-settings", "whatsapp", "media-tools"]
    };
  }
  else if (path === "admin/forgot-password" || path === "admin/reset-password" || path === "admin/change-password") {
    supabaseData = { status: "ok", message: "Password updated successfully (serverless mode)." };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ELECTIONS ENDPOINTS
  // ─────────────────────────────────────────────────────────────────────────
  else if (path === "elections/settings" || path === "elections/admin/settings") {
    const { data: settingsList, error } = await supabase.from("election_settings").select("*");
    const settings = {};
    (settingsList || []).forEach(d => {
      settings[d.key] = d.value;
    });
    supabaseData = settings;
    supabaseError = error;
  }
  else if (path === "elections/stats") {
    const { count, error } = await supabase.from("election_voters").select("*", { count: "exact", head: true });
    supabaseData = { voters_count: count || 0 };
    supabaseError = error;
  }
  else if (path.startsWith("elections/voters/") && !path.includes("upload")) {
    const adm = path.split("/").pop();
    const { data: votersList, error } = await supabase.from("election_voters").select("*").eq("admission_no", adm);
    if (error) throw error;
    if (!votersList || votersList.length === 0) {
      throw new Error("Voter not found in roster.");
    }
    const v = votersList[0];
    supabaseData = {
      admission_no: v.admission_no,
      name: v.name,
      role: v.role,
      has_voted: v.already_voted,
      class_name: v.class_name,
      father_name: v.father_name
    };
  }
  else if (path === "elections/bootstrap") {
    const { data: postsList, error: err1 } = await supabase.from("election_posts").select("*").order("order_index", { ascending: true });
    const { data: candsList, error: err2 } = await supabase.from("election_candidates").select("*");
    supabaseData = {
      posts: (postsList || []).map(p => ({ key: p.key, title: p.title, order: p.order_index })),
      candidates: (candsList || []).map(c => ({
        id: c.id,
        post: c.post_key,
        name: c.name,
        photo: c.photo || "",
        symbol: c.symbol || "",
        symbol_image: c.symbol_image || "",
        adjustment: c.adjustment || 0
      }))
    };
    supabaseError = err1 || err2;
  }
  else if (path === "elections/vote") {
    const { admission_no: adm, selections } = data;
    const { data: openSetting } = await supabase.from("election_settings").select("*").eq("key", "election_open").maybeSingle();
    if (!openSetting || openSetting.value !== "true") {
      throw new Error("Voting is currently closed.");
    }
    const { data: voter } = await supabase.from("election_voters").select("*").eq("admission_no", adm).maybeSingle();
    if (!voter) {
      throw new Error("Voter not registered.");
    }
    if (voter.already_voted) {
      throw new Error("You have already casted your vote.");
    }
    const { error: insErr } = await supabase.from("election_votes").insert({
      voter_admission_no: adm,
      selections: selections
    });
    if (insErr) throw insErr;
    const { error: updErr } = await supabase.from("election_voters").update({ already_voted: true }).eq("admission_no", adm);
    if (updErr) {
      await supabase.from("election_votes").delete().eq("voter_admission_no", adm);
      throw updErr;
    }
    supabaseData = { success: true, message: "Vote cast successfully!" };
  }
  else if (path.startsWith("elections/settings/") || path.startsWith("elections/admin/settings/")) {
    const key = path.split("/").pop();
    const { error } = await supabase.from("election_settings").upsert({ key, value: data.value });
    supabaseData = { success: true };
    supabaseError = error;
  }
  else if (path === "elections/posts" || path === "elections/admin/posts") {
    if (method === "get") {
      const { data: postsList, error } = await supabase.from("election_posts").select("*").order("order_index", { ascending: true });
      supabaseData = postsList; supabaseError = error;
    } else if (method === "post") {
      const { key, title, order_index } = data;
      const { error } = await supabase.from("election_posts").upsert({ key, title, order_index });
      supabaseData = { success: true }; supabaseError = error;
    }
  }
  else if (path.startsWith("elections/posts/") || path.startsWith("elections/admin/posts/")) {
    const key = path.split("/").pop();
    if (method === "delete") {
      const { error } = await supabase.from("election_posts").delete().eq("key", key);
      supabaseData = { success: true }; supabaseError = error;
    } else if (method === "put") {
      const { title, order_index } = data;
      const { error } = await supabase.from("election_posts").update({ title, order_index }).eq("key", key);
      supabaseData = { success: true }; supabaseError = error;
    }
  }
  else if (path === "elections/candidates" || path === "elections/admin/candidates") {
    if (method === "get") {
      const { data: candsList, error } = await supabase.from("election_candidates").select("*");
      supabaseData = candsList; supabaseError = error;
    } else if (method === "post") {
      const { name, post_key, symbol, photo, symbol_image, adjustment } = data;
      const { error } = await supabase.from("election_candidates").insert({
        name, post_key, symbol,
        photo: photo || "",
        symbol_image: symbol_image || "",
        adjustment: adjustment || 0
      });
      supabaseData = { success: true }; supabaseError = error;
    }
  }
  else if (path.startsWith("elections/candidates/") || path.startsWith("elections/admin/candidates/")) {
    const cid = path.split("/").pop();
    if (method === "delete") {
      const { error } = await supabase.from("election_candidates").delete().eq("id", cid);
      supabaseData = { success: true }; supabaseError = error;
    } else if (method === "put") {
      const { name, post_key, symbol, photo, symbol_image, adjustment } = data;
      const { error } = await supabase.from("election_candidates").update({
        name, post_key, symbol,
        photo: photo || "",
        symbol_image: symbol_image || "",
        adjustment: adjustment || 0
      }).eq("id", cid);
      supabaseData = { success: true }; supabaseError = error;
    }
  }
  else if (path === "elections/voters/upload" || path === "elections/admin/users/upload") {
    const { error } = await supabase.from("election_voters").upsert(data, { onConflict: "admission_no" });
    supabaseData = { success: true, inserted: data.length, updated: 0 };
    supabaseError = error;
  }
  else if (path === "elections/admin/users") {
    const { data: votersList, error } = await supabase.from("election_voters").select("*").order("admission_no", { ascending: true });
    supabaseData = (votersList || []).map(v => ({
      admission_no: v.admission_no,
      name: v.name,
      role: v.role,
      has_voted: v.already_voted,
      father_name: v.father_name || "",
      class_name: v.class_name || "",
      subject: v.subject || "",
      designation: v.designation || ""
    }));
    supabaseError = error;
  }
  else if (path.startsWith("elections/admin/users/")) {
    const adm = path.split("/").pop();
    const { error } = await supabase.from("election_voters").delete().eq("admission_no", adm);
    supabaseData = { success: true };
    supabaseError = error;
  }
  else if (path.startsWith("elections/admin/votes/")) {
    const vid = path.split("/").pop();
    if (method === "delete") {
      const { error } = await supabase.from("election_votes").delete().eq("id", vid);
      supabaseData = { success: true }; supabaseError = error;
    } else if (method === "put") {
      const { selections } = data;
      const { error } = await supabase.from("election_votes").update({ selections }).eq("id", vid);
      supabaseData = { success: true }; supabaseError = error;
    }
  }
  else if (path === "elections/admin/reset/votes") {
    const { count } = await supabase.from("election_votes").select("*", { count: "exact", head: true });
    const { error: delErr } = await supabase.from("election_votes").delete().neq("id", -1);
    const { error: updErr } = await supabase.from("election_voters").update({ already_voted: false }).eq("already_voted", true);
    supabaseData = { success: true, deleted_votes: count || 0 };
    supabaseError = delErr || updErr;
  }
  else if (path === "elections/admin/reset/all") {
    const { count: vCount } = await supabase.from("election_votes").select("*", { count: "exact", head: true });
    const { count: cCount } = await supabase.from("election_candidates").select("*", { count: "exact", head: true });
    const { count: uCount } = await supabase.from("election_voters").select("*", { count: "exact", head: true });
    await supabase.from("election_votes").delete().neq("id", -1);
    await supabase.from("election_candidates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("election_voters").delete().neq("admission_no", "");
    supabaseData = { success: true, deleted_votes: vCount || 0, deleted_candidates: cCount || 0, deleted_voters: uCount || 0 };
  }
  else if (path === "elections/archive") {
    const sessionName = config.params?.session_name || "2026-27";
    const { data: postsList } = await supabase.from("election_posts").select("*");
    const { data: candsList } = await supabase.from("election_candidates").select("*");
    const { data: votesList } = await supabase.from("election_votes").select("*");
    
    const counts = {};
    (votesList || []).forEach(v => {
      const sel = v.selections || {};
      Object.entries(sel).forEach(([pk, cid]) => {
        if (!counts[pk]) counts[pk] = {};
        counts[pk][cid] = (counts[pk][cid] || 0) + 1;
      });
    });
    
    const archiveRows = [];
    (postsList || []).forEach(post => {
      const postCands = (candsList || []).filter(c => c.post_key === post.key);
      const postCounts = counts[post.key] || {};
      let maxVotes = -1;
      let winnerId = null;
      postCands.forEach(c => {
        const vCount = postCounts[c.id] || 0;
        if (vCount > maxVotes) {
          maxVotes = vCount;
          winnerId = c.id;
        }
      });
      postCands.forEach(c => {
        const vCount = postCounts[c.id] || 0;
        archiveRows.push({
          session_name: sessionName,
          post_key: post.key,
          post_title: post.title,
          candidate_name: c.name,
          candidate_symbol: c.symbol,
          votes_count: vCount,
          is_winner: c.id === winnerId && vCount > 0
        });
      });
    });
    
    if (archiveRows.length > 0) {
      await supabase.from("election_results_archive").insert(archiveRows);
    }
    
    await supabase.from("election_votes").delete().neq("id", -1);
    await supabase.from("election_voters").update({ already_voted: false }).eq("already_voted", true);
    await supabase.from("election_settings").upsert({ key: "election_open", value: "false" });
    
    supabaseData = { success: true };
  }
  else if (path === "elections/public-results") {
    const { data: sData } = await supabase.from("election_settings").select("*").eq("key", "results_publish_time").maybeSingle();
    const pubTimeStr = sData?.value || "";
    if (!pubTimeStr) {
      supabaseData = { status: "sealed", message: "Results have not been scheduled for release yet." };
    } else {
      const pubTime = new Date(pubTimeStr);
      const now = new Date();
      if (now < pubTime) {
        supabaseData = {
          status: "countdown",
          publish_at: pubTimeStr,
          remaining_seconds: Math.max(0, Math.floor((pubTime - now) / 1000)),
          message: "Results will be published soon."
        };
      } else {
        const { data: posts } = await supabase.from("election_posts").select("*").order("order_index", { ascending: true });
        const { data: candidates } = await supabase.from("election_candidates").select("*");
        const { data: votes } = await supabase.from("election_votes").select("*");
        
        const counts = {};
        (votes || []).forEach(v => {
          const sel = v.selections || {};
          Object.values(sel).forEach(cid => {
            counts[cid] = (counts[cid] || 0) + 1;
          });
        });
        
        const by_post = {};
        (posts || []).forEach(p => { by_post[p.key] = []; });
        (candidates || []).forEach(c => {
          const adj = parseInt(c.adjustment || 0);
          const entry = {
            candidate_id: c.id,
            name: c.name,
            photo: c.photo || "",
            symbol: c.symbol || "",
            votes: (counts[c.id] || 0) + adj
          };
          if (by_post[c.post_key]) {
            by_post[c.post_key].push(entry);
          }
        });
        
        Object.keys(by_post).forEach(k => {
          by_post[k].sort((a, b) => b.votes - a.votes);
        });
        
        const winners = {};
        (posts || []).forEach(p => {
          winners[p.key] = by_post[p.key]?.[0] || null;
        });
        
        supabaseData = {
          status: "live",
          posts: (posts || []).map(p => ({ key: p.key, title: p.title, order: p.order_index })),
          by_post,
          winners,
          total_voted: (votes || []).length
        };
      }
    }
  }
  else if (path === "elections/results") {
    const { data: posts } = await supabase.from("election_posts").select("*").order("order_index", { ascending: true });
    const { data: candidates } = await supabase.from("election_candidates").select("*");
    const { data: votes } = await supabase.from("election_votes").select("*");
    const { count } = await supabase.from("election_voters").select("*", { count: "exact", head: true });
    
    const counts = {};
    (votes || []).forEach(v => {
      const sel = v.selections || {};
      Object.values(sel).forEach(cid => {
        counts[cid] = (counts[cid] || 0) + 1;
      });
    });
    
    const by_post = {};
    (posts || []).forEach(p => { by_post[p.key] = []; });
    (candidates || []).forEach(c => {
      const adj = parseInt(c.adjustment || 0);
      const entry = {
        candidate_id: c.id,
        name: c.name,
        photo: c.photo || "",
        symbol: c.symbol || "",
        votes: (counts[c.id] || 0) + adj
      };
      if (by_post[c.post_key]) {
        by_post[c.post_key].push(entry);
      }
    });
    
    Object.keys(by_post).forEach(k => {
      by_post[k].sort((a, b) => b.votes - a.votes);
    });
    
    supabaseData = {
      posts: (posts || []).map(p => ({ key: p.key, title: p.title, order: p.order_index })),
      by_post,
      winners: (posts || []).reduce((acc, p) => {
        acc[p.key] = by_post[p.key]?.[0] || null;
        return acc;
      }, {}),
      total_voted: (votes || []).length,
      total_users: count || 0,
      turnout_pct: count ? Math.round(((votes || []).length / count) * 100) : 0
    };
  }
  else if (path === "elections/admin/stats") {
    const { data: posts } = await supabase.from("election_posts").select("*").order("order_index", { ascending: true });
    const { data: candidates } = await supabase.from("election_candidates").select("*");
    const { data: voters } = await supabase.from("election_voters").select("*");
    const { data: votes } = await supabase.from("election_votes").select("*");
    
    const total_users = (voters || []).length;
    const total_voted = (votes || []).length;
    const total_students = (voters || []).filter(v => v.role === "student").length;
    const total_teachers = (voters || []).filter(v => v.role === "teacher").length;
    const voted_students = (voters || []).filter(v => v.already_voted && v.role === "student").length;
    const voted_teachers = (voters || []).filter(v => v.already_voted && v.role === "teacher").length;
    const turnout_pct = total_users ? Math.round((total_voted / total_users) * 1000) / 10 : 0;
    
    const class_groups = {};
    (voters || []).forEach(u => {
      if (u.role === "student") {
        const cls = u.class_name || "Unassigned";
        if (!class_groups[cls]) class_groups[cls] = { class_name: cls, total: 0, voted: 0 };
        class_groups[cls].total += 1;
        if (u.already_voted) class_groups[cls].voted += 1;
      }
    });
    const class_breakdown = Object.values(class_groups).sort((a, b) => a.class_name.localeCompare(b.class_name));
    
    const counts = {};
    (votes || []).forEach(v => {
      const sel = v.selections || {};
      Object.values(sel).forEach(cid => {
        counts[cid] = (counts[cid] || 0) + 1;
      });
    });
    
    const by_post = {};
    (posts || []).forEach(p => { by_post[p.key] = []; });
    (candidates || []).forEach(c => {
      const adj = parseInt(c.adjustment || 0);
      const entry = {
        candidate_id: c.id,
        name: c.name,
        photo: c.photo || "",
        symbol: c.symbol || "",
        votes: (counts[c.id] || 0) + adj,
        real_votes: counts[c.id] || 0,
        adjustment: adj
      };
      if (by_post[c.post_key]) by_post[c.post_key].push(entry);
    });
    
    Object.keys(by_post).forEach(k => {
      by_post[k].sort((a, b) => b.votes - a.votes);
    });
    
    const winners = {};
    (posts || []).forEach(p => {
      winners[p.key] = by_post[p.key]?.[0] || null;
    });
    
    const voter_map = (voters || []).reduce((acc, v) => {
      acc[v.admission_no] = v;
      return acc;
    }, {});
    const candidate_map = (candidates || []).reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
    
    const votes_list = (votes || []).map(vt => {
      const adm = vt.voter_admission_no;
      const v_obj = voter_map[adm] || {};
      const sel_names = {};
      Object.entries(vt.selections || {}).forEach(([pk, cid]) => {
        sel_names[pk] = candidate_map[cid]?.name || "Unknown";
      });
      return {
        id: vt.id,
        admission_no: adm,
        voter_name: v_obj.name || "Unknown",
        selections: vt.selections || {},
        selection_names: sel_names
      };
    });
    
    supabaseData = {
      total_users,
      total_voted,
      turnout_pct,
      total_students,
      total_teachers,
      voted_students,
      voted_teachers,
      class_breakdown,
      by_post,
      winners,
      votes: votes_list
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WHATSAPP / BIRTHDAY CAMPAIGNS
  // ─────────────────────────────────────────────────────────────────────────
  else if (path === "whatsapp/birthday-campaign/students") {
    if (method === "get") {
      const { data: list, error } = await supabase.from("birthday_students").select("*").order("student_name", { ascending: true });
      supabaseData = list; supabaseError = error;
    } else if (method === "post") {
      const { error } = await supabase.from("birthday_students").insert(data);
      supabaseData = { success: true }; supabaseError = error;
    }
  }
  else if (path.startsWith("whatsapp/birthday-campaign/students/")) {
    const sid = path.split("/").pop();
    if (method === "delete") {
      const { error } = await supabase.from("birthday_students").delete().eq("id", sid);
      supabaseData = { success: true }; supabaseError = error;
    } else if (method === "put") {
      const { error } = await supabase.from("birthday_students").update(data).eq("id", sid);
      supabaseData = { success: true }; supabaseError = error;
    }
  }
  else if (path === "whatsapp/birthday-campaign/import") {
    const { error } = await supabase.from("birthday_students").insert(data);
    supabaseData = { success: true };
    supabaseError = error;
  }
  else if (path === "whatsapp/birthday-campaign/info") {
    supabaseData = { enabled: false, schedule: "10:00 AM", template: "Happy Birthday {name}!", status: "disconnected" };
  }
  else if (path === "whatsapp/birthday-campaign/preview" || path === "whatsapp/birthday-campaign/send-saved" || path === "whatsapp/fee-reminder") {
    throw new Error("WhatsApp gateway offline. This feature requires the WhatsApp Baileys server, which is currently unavailable in serverless mode.");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MEDIA UPLOADS (Base64 fallback)
  // ─────────────────────────────────────────────────────────────────────────
  else if (path === "admin/upload-image" || path === "admin/upload-file") {
    const file = data.get("file");
    if (file) {
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      supabaseData = { url: base64 };
    } else {
      throw new Error("No file uploaded");
    }
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
      // In serverless mode, all routes are intercepted and resolved by the Supabase adapter
      const isBackendRoute = false;

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

export function getBackendUrl() {
  try {
    const p = sessionStorage.getItem("sdps_api_base");
    if (p) return p;
  } catch (e) {}
  try {
    const base = orderedBases()[0];
    if (base) return base;
  } catch (e) {}
  return process.env.REACT_APP_BACKEND_URL || "";
}

export async function uploadOmrRoster(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post("/admin/omr/upload-roster", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return res.data;
}

export async function getOmrRoster(params = {}) {
  const res = await api.get("/admin/omr/roster", { params });
  return res.data;
}

export async function clearOmrRoster() {
  const res = await api.delete("/admin/omr/roster/clear");
  return res.data;
}

export async function saveOmrEvaluations(payload) {
  const res = await api.post("/admin/omr/evaluations/save", payload);
  return res.data;
}

export async function getOmrEvaluations(params = {}) {
  const res = await api.get("/admin/omr/evaluations", { params });
  return res.data;
}

export function getOmrExportUrl(examTitle = "") {
  const base = getBackendUrl();
  return `${base}/api/admin/omr/export-results?exam_title=${encodeURIComponent(examTitle)}`;
}

export default api;

