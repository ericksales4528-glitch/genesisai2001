// Lista quantos workers cada conta Cloudflare tem
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Acc = { label: string; id?: string; email?: string; key?: string; token?: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const accounts: Acc[] = [
    { label: "conta-1", id: Deno.env.get("CLOUDFLARE_ACCOUNT_ID"), email: Deno.env.get("CLOUDFLARE_EMAIL"), key: Deno.env.get("CLOUDFLARE_GLOBAL_API_KEY"), token: Deno.env.get("CLOUDFLARE_API_TOKEN") },
  ];
  for (let i = 2; i <= 10; i++) {
    const id = Deno.env.get(`CF_ACCOUNT_${i}_ID`);
    if (!id) continue;
    accounts.push({
      label: `conta-${i}`,
      id,
      email: Deno.env.get(`CF_ACCOUNT_${i}_EMAIL`),
      key: Deno.env.get(`CF_ACCOUNT_${i}_GLOBAL_KEY`),
      token: Deno.env.get(`CF_ACCOUNT_${i}_TOKEN`),
    });
  }

  const results = [];
  for (const a of accounts) {
    if (!a.id) { results.push({ account: a.label, status: "não configurada" }); continue; }
    const headers: Record<string, string> = a.key && a.email
      ? { "X-Auth-Email": a.email, "X-Auth-Key": a.key }
      : { "Authorization": `Bearer ${a.token}` };
    try {
      const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${a.id}/workers/scripts`, { headers });
      const j = await r.json();
      if (!r.ok) {
        results.push({ account: a.label, status: "erro", code: r.status, errors: j.errors });
        continue;
      }
      const count = j.result?.length ?? 0;
      results.push({
        account: a.label,
        workers: count,
        limit: 100,
        livres: 100 - count,
        cheia: count >= 100,
      });
    } catch (e) {
      results.push({ account: a.label, status: "exception", error: String(e) });
    }
  }

  const total = results.reduce((s, r: any) => s + (r.workers || 0), 0);
  return new Response(
    JSON.stringify({ total_workers: total, contas: results }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
