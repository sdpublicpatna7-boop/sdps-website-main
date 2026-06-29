// Deno Edge Function for Claude Fable 5 AI (Groq gateway)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Empty prompt" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const groqKey = Deno.env.get("GROQ_API_KEY")
    const model = Deno.env.get("GROQ_MODEL") || "llama3-8b-8192"

    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY environment variable is not set." }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error("Groq API error:", errText)
      return new Response(
        JSON.stringify({ error: "Failed to fetch completions from Groq." }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || "No response generated."

    return new Response(
      JSON.stringify({ text }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Internal Edge Function Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
