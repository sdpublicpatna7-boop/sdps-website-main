// Deno Edge Function for Supabase Auth and OTP verification
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
    const { action, username, otp, new_password } = await req.json()

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const waServiceUrl = Deno.env.get("WA_SERVICE_URL") || "https://sdps-website-main.onrender.com"

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Action 1: Forgot Password / Resend OTP
    if (action === 'forgot-password' || action === 'resend-otp') {
      if (!username) {
        return new Response(JSON.stringify({ error: "Username is required." }), { status: 400, headers: corsHeaders })
      }

      // 1. Find profile
      const { data: profile, error: profileErr } = await supabaseAdmin
        .from('qp_profiles')
        .select('id, phone, email')
        .eq('username', username)
        .maybeSingle()

      if (profileErr || !profile) {
        return new Response(JSON.stringify({ error: "User profile not found." }), { status: 404, headers: corsHeaders })
      }

      if (!profile.phone) {
        return new Response(JSON.stringify({ error: "No WhatsApp number configured on file. Contact admin." }), { status: 400, headers: corsHeaders })
      }

      // 2. Generate OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

      // 3. Upsert OTP
      const { error: otpErr } = await supabaseAdmin
        .from('qp_otps')
        .upsert({
          username: username,
          phone: profile.phone,
          code: code,
          expires_at: expiresAt
        })

      if (otpErr) {
        console.error("OTP database upsert failed:", otpErr)
        return new Response(JSON.stringify({ error: "Failed to generate verification code." }), { status: 500, headers: corsHeaders })
      }

      // 4. Send WhatsApp message via Render microservice
      console.log(`Sending OTP code ${code} to ${profile.phone} via ${waServiceUrl}...`)
      try {
        const waRes = await fetch(`${waServiceUrl}/api/qp/send-whatsapp-otp-direct`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseServiceKey}` // auth verification if any
          },
          body: JSON.stringify({
            phone: profile.phone,
            message: `Your S.D. Public School QP Portal security code is: ${code}. Valid for 10 minutes.`
          })
        })
        if (!waRes.ok) {
          console.warn("WhatsApp service returned status:", waRes.status)
        }
      } catch (waErr) {
        console.error("Failed to connect to Render WhatsApp microservice:", waErr)
      }

      // For debugging convenience, log to console
      console.warn(`[OTP DEBUG] User=${username} Code=${code}`)

      return new Response(JSON.stringify({ message: "Verification code sent to WhatsApp." }), { status: 200, headers: corsHeaders })
    }

    // Action 2: Reset/Set Password with OTP verification
    if (action === 'set-password' || action === 'reset-forgotten-password') {
      if (!username || !otp || !new_password) {
        return new Response(JSON.stringify({ error: "Missing required params: username, otp, and new_password." }), { status: 400, headers: corsHeaders })
      }

      // 1. Fetch OTP record
      const { data: otpRec, error: otpErr } = await supabaseAdmin
        .from('qp_otps')
        .select('*')
        .eq('username', username)
        .maybeSingle()

      if (otpErr || !otpRec) {
        return new Response(JSON.stringify({ error: "No active verification request found." }), { status: 400, headers: corsHeaders })
      }

      // 2. Validate code
      if (otpRec.code !== otp) {
        return new Response(JSON.stringify({ error: "Invalid verification code." }), { status: 400, headers: corsHeaders })
      }

      // 3. Check expiration
      if (new Date(otpRec.expires_at).getTime() < Date.now()) {
        return new Response(JSON.stringify({ error: "Verification code expired. Request a new one." }), { status: 400, headers: corsHeaders })
      }

      // 4. Fetch user profile
      const { data: profile } = await supabaseAdmin
        .from('qp_profiles')
        .select('id, email')
        .eq('username', username)
        .maybeSingle()

      if (!profile) {
        return new Response(JSON.stringify({ error: "User profile mismatch." }), { status: 400, headers: corsHeaders })
      }

      // 5. Update user password in auth.users
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        profile.id,
        { password: new_password }
      )

      if (updateErr) {
        console.error("Auth password update failed:", updateErr)
        return new Response(JSON.stringify({ error: updateErr.message }), { status: 400, headers: corsHeaders })
      }

      // 6. Update password_set state in qp_profiles
      await supabaseAdmin
        .from('qp_profiles')
        .update({ password_set: true })
        .eq('id', profile.id)

      // 7. Delete OTP record
      await supabaseAdmin
        .from('qp_otps')
        .delete()
        .eq('username', username)

      return new Response(JSON.stringify({ message: "Password updated successfully." }), { status: 200, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), { status: 400, headers: corsHeaders })

  } catch (error) {
    console.error("Auth Handler Edge Function Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
