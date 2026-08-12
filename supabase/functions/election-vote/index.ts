// Deno Edge Function for casting election votes securely
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Restrict CORS to configured origins. Set ALLOWED_ORIGINS as a
// comma-separated list of origins (e.g. "https://www.sdpspatna.com").
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin") || ""
  const allowed = ALLOWED_ORIGINS.length === 0
    ? origin // no allowlist configured: reflect origin (backwards compatible)
    : (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0])
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { admission_no, selections, access_code } = await req.json()

    if (!admission_no || !selections) {
      return new Response(JSON.stringify({ error: "Missing voter details or selections" }), { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify election settings (is election open? booth access code?)
    const { data: settingsRows, error: errSetting } = await supabase
      .from("election_settings")
      .select("key, value")
      .in("key", ["election_open", "voting_access_code"])

    const settings: Record<string, string> = {}
    for (const s of settingsRows || []) settings[s.key] = s.value

    if (errSetting || settings["election_open"] !== "true") {
      return new Response(JSON.stringify({ error: "Voting is currently closed." }), { status: 403, headers: corsHeaders })
    }

    // If a booth access code is configured, require it on every vote.
    const requiredCode = (settings["voting_access_code"] || "").trim()
    if (requiredCode) {
      const provided = (access_code || "").trim()
      if (!provided || !timingSafeEqual(provided, requiredCode)) {
        return new Response(JSON.stringify({ error: "Invalid voting access code." }), { status: 403, headers: corsHeaders })
      }
    }

    // 2. Atomically claim the voter: flip already_voted only if it is
    // currently false. The row filter makes this race-safe — two
    // concurrent requests cannot both claim the same voter.
    const { data: claimed, error: errClaim } = await supabase
      .from("election_voters")
      .update({ already_voted: true })
      .eq("admission_no", admission_no)
      .eq("already_voted", false)
      .select("admission_no")

    if (errClaim) {
      console.error("Voter claim error:", errClaim)
      return new Response(JSON.stringify({ error: "Could not cast vote. Please try again." }), { status: 500, headers: corsHeaders })
    }

    if (!claimed || claimed.length === 0) {
      // Either the voter does not exist or has already voted.
      const { data: voter } = await supabase
        .from("election_voters")
        .select("admission_no")
        .eq("admission_no", admission_no)
        .maybeSingle()

      if (voter) {
        return new Response(JSON.stringify({ error: "You have already casted your vote." }), { status: 400, headers: corsHeaders })
      }
      return new Response(JSON.stringify({ error: "Voter not found in registration database." }), { status: 404, headers: corsHeaders })
    }

    // 3. Record the ballot. The unique constraint on voter_admission_no is a
    // second line of defense against duplicate ballots.
    const { error: errVote } = await supabase
      .from("election_votes")
      .insert({
        voter_admission_no: admission_no,
        selections: selections,
      })

    if (errVote) {
      console.error("Ballot insert error:", errVote)
      // Roll back the claim so the voter can retry.
      await supabase
        .from("election_voters")
        .update({ already_voted: false })
        .eq("admission_no", admission_no)
      return new Response(JSON.stringify({ error: "Could not cast vote. It may already be recorded." }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true, message: "Vote cast successfully!" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Secure Voting Edge Function Error:", error)
    return new Response(JSON.stringify({ error: "Internal error." }), { status: 500, headers: corsHeaders })
  }
})
