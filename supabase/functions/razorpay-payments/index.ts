// Deno Edge Function for Razorpay Payments handling
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { HmacSha256 } from "https://deno.land/std@0.160.0/hash/sha256.ts"

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
    const payload = await req.json()
    const { action } = payload

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // ── ACTION 1: CREATE ORDER ──
    if (action === "create-order") {
      const { application_id, kind } = payload
      
      let amount = 500; // default fee in INR
      let notes = {}

      if (kind === "admission") {
        const { data: app } = await supabase.from("admission_applications").select("id, student_name").eq("id", application_id).single()
        if (!app) {
          return new Response(JSON.stringify({ error: "Application not found" }), { status: 404, headers: corsHeaders })
        }
        notes = { kind: "admission", application_id }
      } else if (kind === "alumni") {
        const { data: member } = await supabase.from("alumni_members").select("id, name").eq("id", application_id).single()
        if (!member) {
          return new Response(JSON.stringify({ error: "Alumni record not found" }), { status: 404, headers: corsHeaders })
        }
        amount = 1000; // alumni fee
        notes = { kind: "alumni", member_id: application_id }
      }

      // Call Razorpay API
      const auth = btoa(`${razorpayKeyId}:${razorpaySecret}`)
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: amount * 100, // paise
          currency: "INR",
          receipt: `rcpt_${application_id}`,
          notes: notes
        })
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error("Razorpay order API error:", errText)
        throw new Error("Failed to create order on Razorpay.")
      }

      const order = await response.json()

      return new Response(JSON.stringify({
        order_id: order.id,
        amount: amount * 100,
        currency: "INR",
        key_id: razorpayKeyId
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ── ACTION 2: VERIFY PAYMENT / PAYMENT CONFIRM ──
    if (action === "verify-payment" || action === "payment-confirm") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, application_id, kind } = payload

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return new Response(JSON.stringify({ error: "Missing signatures or IDs" }), { status: 400, headers: corsHeaders })
      }

      // Verify signature
      const expectedText = `${razorpay_order_id}|${razorpay_payment_id}`
      const hmac = new HmacSha256(razorpaySecret)
      hmac.update(expectedText)
      const generatedSignature = hmac.toString()

      if (generatedSignature !== razorpay_signature) {
        return new Response(JSON.stringify({ error: "Payment signature mismatch. Verification failed." }), { status: 400, headers: corsHeaders })
      }

      // Save payment success status in PostgreSQL database
      if (kind === "admission") {
        await supabase
          .from("admission_applications")
          .update({
            payment_status: "paid",
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            status: "approved" // automatically approve admission registrations upon successful payment
          })
          .eq("id", application_id)
          
        // Asynchronously call the pdf-receipt generation Edge Function
        fetch(`${supabaseUrl}/functions/v1/pdf-receipt`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ application_id })
        }).catch(e => console.error("Async receipt generation invocation failed:", e))

      } else if (kind === "alumni") {
        await supabase
          .from("alumni_members")
          .update({
            payment_status: "paid",
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            approved: true
          })
          .eq("id", application_id)
      }

      return new Response(JSON.stringify({ confirmed: true, payment_id: razorpay_payment_id }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), { status: 400, headers: corsHeaders })

  } catch (error) {
    console.error("Razorpay Payments Error:", error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
