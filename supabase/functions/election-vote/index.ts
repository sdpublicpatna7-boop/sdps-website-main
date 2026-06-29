// Deno Edge Function for casting election votes securely
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { admission_no, selections } = await req.json()

    if (!admission_no || !selections) {
      return new Response(JSON.stringify({ error: "Missing voter details or selections" }), { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify election settings (is election open?)
    const { data: openSetting, error: errSetting } = await supabase
      .from("election_settings")
      .select("value")
      .eq("key", "election_open")
      .single()

    if (errSetting || !openSetting || openSetting.value !== "true") {
      return new Response(JSON.stringify({ error: "Voting is currently closed." }), { status: 403, headers: corsHeaders })
    }

    // 2. Fetch voter details
    const { data: voter, error: errVoter } = await supabase
      .from("election_voters")
      .select("*")
      .eq("admission_no", admission_no)
      .single()

    if (errVoter || !voter) {
      return new Response(JSON.stringify({ error: "Voter not found in registration database." }), { status: 404, headers: corsHeaders })
    }

    if (voter.already_voted) {
      return new Response(JSON.stringify({ error: "You have already casted your vote." }), { status: 400, headers: corsHeaders })
    }

    // 3. Cast Vote and update status (Perform as sequential queries)
    const { error: errVote } = await supabase
      .from("election_votes")
      .insert({
        voter_admission_no: admission_no,
        selections: selections
      })

    if (errVote) {
      console.error("Ballot insert error:", errVote)
      return new Response(JSON.stringify({ error: "Could not cast vote. It may already be recorded." }), { status: 500, headers: corsHeaders })
    }

    const { error: errUpdate } = await supabase
      .from("election_voters")
      .update({ already_voted: true })
      .eq("admission_no", admission_no)

    if (errUpdate) {
      console.error("Voter update error:", errUpdate)
      // Rollback vote if possible (delete from election_votes)
      await supabase.from("election_votes").delete().eq("voter_admission_no", admission_no)
      return new Response(JSON.stringify({ error: "Voter confirmation status failed. Please try again." }), { status: 500, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ success: true, message: "Vote cast successfully!" }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error("Secure Voting Edge Function Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
