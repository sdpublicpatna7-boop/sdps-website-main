// Deno Edge Function for Admissions Receipt Email (MailerCloud integration)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Restrict CORS to configured origins. Set ALLOWED_ORIGINS as a
// comma-separated list of origins (e.g. "https://www.sdpublic.org").
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

const TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #334155; line-height: 1.6; margin: 0; padding: 20px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 600px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: #1e3a8a; padding: 24px; text-align: center; color: #ffffff; }
    .header h2 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px; }
    .content { padding: 32px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    .label { font-weight: 600; color: #475569; width: 40%; background: #f8fafc; }
    .value { color: #0f172a; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h2>S.D. PUBLIC SCHOOL</h2>
    </div>
    <div class="content">
      <p>Dear Parent,</p>
      <p>Thank you for applying to <strong>S.D. Public School, Patna</strong>. We have successfully received your registration fee payment.</p>
      
      <table>
        <tr>
          <td class="label">Student Name</td>
          <td class="value">{student_name}</td>
        </tr>
        <tr>
          <td class="label">Application ID</td>
          <td class="value">{application_id}</td>
        </tr>
        <tr>
          <td class="label">Payment ID</td>
          <td class="value">{payment_id}</td>
        </tr>
        <tr>
          <td class="label">Registration Fee</td>
          <td class="value" style="color: #059669; font-weight: 700;">₹{amount} — Paid</td>
        </tr>
      </table>

      <p>Our admissions team will review your application and contact you within <strong>2 working days</strong>.</p>
    </div>
    <div class="footer">
      Maurya Colony, Near R.O.B. Kumhrar, biscoman Golambar, Gulzarbagh Road, Patna 800007<br>
      For queries: <a href="tel:+919955190262">+91 99551 90262</a> | <a href="mailto:helpdesk@sdpublic.org">helpdesk@sdpublic.org</a>
    </div>
  </div>
</body>
</html>
`

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { application_id } = await req.json()
    if (!application_id) {
      return new Response(JSON.stringify({ error: "Application ID is required" }), { status: 400, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const mailerKey = Deno.env.get("MAILERCLOUD_API_KEY")
    const senderEmail = Deno.env.get("SENDER_EMAIL") || "noreply@sdpublic.org"
    const senderName = Deno.env.get("SENDER_NAME") || "S.D. Public School"

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Fetch application details
    const { data: app, error: appErr } = await supabase
      .from("admission_applications")
      .select("*")
      .eq("id", application_id)
      .single()

    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "Application record not found" }), { status: 404, headers: corsHeaders })
    }

    if (app.payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "Payment has not been completed for this application" }), { status: 400, headers: corsHeaders })
    }

    // 2. Build email content
    const htmlBody = TEMPLATE
      .replace("{student_name}", app.student_name)
      .replace("{application_id}", app.id)
      .replace("{payment_id}", app.payment_id || "N/A")
      .replace("{amount}", app.amount_inr.toString())

    if (!mailerKey) {
      console.warn(`[EMAIL MOCK] To: ${app.email} | Subject: Admission Registration Fee Receipt`)
      return new Response(JSON.stringify({ mock: true, message: "Email mocked (no API key)" }), { status: 200, headers: corsHeaders })
    }

    // 3. Send via MailerCloud API
    const response = await fetch("https://email-api.mailercloud.com/email", {
      method: "POST",
      headers: {
        "Authorization": mailerKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: "1.0",
        email: {
          from: senderEmail,
          fromName: senderName,
          subject: "Admission Registration Fee Receipt — S.D. Public School",
          html: htmlBody,
          recipients: {
            to: [{ name: app.student_name, email: app.email }]
          }
        },
        metadata: {
          campaignType: "TRANSACTIONAL"
        }
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("MailerCloud API error:", errText)
      throw new Error("Failed to send receipt email via MailerCloud.")
    }

    // Update status in database
    await supabase
      .from("admission_applications")
      .update({ receipt_sent: true })
      .eq("id", application_id)

    return new Response(JSON.stringify({ sent: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error("PDF Receipt Email Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
