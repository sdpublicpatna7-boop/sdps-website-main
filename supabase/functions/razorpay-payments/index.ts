// Deno Edge Function for Razorpay Payments handling
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

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
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

const FEES_INR: Record<string, number> = {
  admission: 500,
  alumni: 1000,
}

serve(async (req) => {
  const corsHeaders = corsHeadersFor(req)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { action } = payload

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID")!
    const razorpaySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const razorpayAuth = btoa(`${razorpayKeyId}:${razorpaySecret}`)

    // ── ACTION 1: CREATE ORDER ──
    if (action === "create-order") {
      const { application_id, kind } = payload

      if (kind !== "admission" && kind !== "alumni") {
        return new Response(JSON.stringify({ error: "Invalid payment kind." }), { status: 400, headers: corsHeaders })
      }

      const amount = FEES_INR[kind]
      const table = kind === "admission" ? "admission_applications" : "alumni_members"

      const { data: record } = await supabase
        .from(table)
        .select("id, payment_status")
        .eq("id", application_id)
        .single()

      if (!record) {
        return new Response(JSON.stringify({ error: "Record not found" }), { status: 404, headers: corsHeaders })
      }
      if (record.payment_status === "paid") {
        return new Response(JSON.stringify({ error: "Payment already completed for this record." }), { status: 400, headers: corsHeaders })
      }

      const notes = kind === "admission"
        ? { kind: "admission", application_id }
        : { kind: "alumni", member_id: application_id }

      // Call Razorpay API
      const response = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${razorpayAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount * 100, // paise
          currency: "INR",
          receipt: `rcpt_${application_id}`,
          notes: notes,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error("Razorpay order API error:", errText)
        throw new Error("Failed to create order on Razorpay.")
      }

      const order = await response.json()

      // Bind the order to the record so verification can enforce the pairing.
      await supabase.from(table).update({ order_id: order.id }).eq("id", application_id)

      return new Response(JSON.stringify({
        order_id: order.id,
        amount: amount * 100,
        currency: "INR",
        key_id: razorpayKeyId,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── ACTION 2: VERIFY PAYMENT / PAYMENT CONFIRM ──
    if (action === "verify-payment" || action === "payment-confirm") {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, application_id, kind } = payload

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !application_id) {
        return new Response(JSON.stringify({ error: "Missing signatures or IDs" }), { status: 400, headers: corsHeaders })
      }
      if (kind !== "admission" && kind !== "alumni") {
        return new Response(JSON.stringify({ error: "Invalid payment kind." }), { status: 400, headers: corsHeaders })
      }

      // 1. Verify the Razorpay signature.
      const expectedText = `${razorpay_order_id}|${razorpay_payment_id}`
      const generatedSignature = await hmacSha256Hex(razorpaySecret, expectedText)

      if (!timingSafeEqual(generatedSignature, razorpay_signature)) {
        return new Response(JSON.stringify({ error: "Payment signature mismatch. Verification failed." }), { status: 400, headers: corsHeaders })
      }

      // 2. Fetch the order from Razorpay and confirm it was created for this
      // exact record, kind, and amount (prevents signature replay against a
      // different application).
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
        headers: { "Authorization": `Basic ${razorpayAuth}` },
      })
      if (!orderRes.ok) {
        console.error("Razorpay order fetch error:", await orderRes.text())
        return new Response(JSON.stringify({ error: "Could not verify order with Razorpay." }), { status: 400, headers: corsHeaders })
      }
      const order = await orderRes.json()

      const notes = order.notes || {}
      const boundId = kind === "admission" ? notes.application_id : notes.member_id
      const expectedAmount = FEES_INR[kind] * 100

      if (notes.kind !== kind || String(boundId) !== String(application_id) || Number(order.amount) !== expectedAmount) {
        console.error("Order/application mismatch:", { notes, kind, application_id, amount: order.amount })
        return new Response(JSON.stringify({ error: "Order does not match this application." }), { status: 400, headers: corsHeaders })
      }

      // 3. The record's stored order_id must also match (bound at create time).
      const table = kind === "admission" ? "admission_applications" : "alumni_members"
      const { data: record } = await supabase
        .from(table)
        .select("id, order_id, payment_status")
        .eq("id", application_id)
        .single()

      if (!record) {
        return new Response(JSON.stringify({ error: "Record not found." }), { status: 404, headers: corsHeaders })
      }
      if (record.order_id && record.order_id !== razorpay_order_id) {
        return new Response(JSON.stringify({ error: "Order does not match this application." }), { status: 400, headers: corsHeaders })
      }

      // 4. Save payment success status.
      if (kind === "admission") {
        await supabase
          .from("admission_applications")
          .update({
            payment_status: "paid",
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            status: "approved", // automatically approve admission registrations upon successful payment
          })
          .eq("id", application_id)

        // Asynchronously call the pdf-receipt generation Edge Function
        fetch(`${supabaseUrl}/functions/v1/pdf-receipt`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ application_id }),
        }).catch((e) => console.error("Async receipt generation invocation failed:", e))
      } else {
        await supabase
          .from("alumni_members")
          .update({
            payment_status: "paid",
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            approved: true,
          })
          .eq("id", application_id)
      }

      return new Response(JSON.stringify({ confirmed: true, payment_id: razorpay_payment_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    return new Response(JSON.stringify({ error: "Invalid action." }), { status: 400, headers: corsHeaders })
  } catch (error) {
    console.error("Razorpay Payments Error:", error)
    return new Response(JSON.stringify({ error: "Internal error." }), { status: 500, headers: corsHeaders })
  }
})
