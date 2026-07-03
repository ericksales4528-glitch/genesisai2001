import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const accounts = [
  { name: 'conta-1', id: Deno.env.get('CLOUDFLARE_ACCOUNT_ID'), email: Deno.env.get('CLOUDFLARE_EMAIL'), key: Deno.env.get('CLOUDFLARE_GLOBAL_API_KEY') },
  { name: 'conta-2', id: Deno.env.get('CF_ACCOUNT_2_ID'), email: Deno.env.get('CF_ACCOUNT_2_EMAIL'), key: Deno.env.get('CF_ACCOUNT_2_GLOBAL_KEY') },
  { name: 'conta-3', id: Deno.env.get('CF_ACCOUNT_3_ID'), email: Deno.env.get('CF_ACCOUNT_3_EMAIL'), key: Deno.env.get('CF_ACCOUNT_3_GLOBAL_KEY') },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const { account: accName, limit = 50 } = await req.json().catch(() => ({}))
  const acc = accounts.find(a => a.name === accName) || accounts[0]
  if (!acc.id || !acc.email || !acc.key) return new Response(JSON.stringify({ error: 'missing creds' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const headers = { 'X-Auth-Email': acc.email, 'X-Auth-Key': acc.key, 'Content-Type': 'application/json' }
  const listRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acc.id}/workers/scripts`, { headers })
  const listJson = await listRes.json()
  const scripts = (listJson.result || []).slice(0, limit)
  const results = await Promise.all(scripts.map(async (s: any) => {
    const del = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acc.id}/workers/scripts/${s.id}`, { method: 'DELETE', headers })
    return { id: s.id, ok: del.ok }
  }))
  const deleted = results.filter(r => r.ok).length
  return new Response(JSON.stringify({ account: acc.name, deleted, failed: results.length - deleted, remaining_batch: scripts.length }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})

