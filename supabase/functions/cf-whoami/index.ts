// Retorna informações da conta Cloudflare configurada
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const email = Deno.env.get("CLOUDFLARE_EMAIL") ?? "";
  const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID") ?? "";
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN") ?? "";
  const globalKey = Deno.env.get("CLOUDFLARE_GLOBAL_API_KEY") ?? "";

  let cfUser: any = null;
  try {
    const headers: Record<string, string> = globalKey && email
      ? { "X-Auth-Email": email, "X-Auth-Key": globalKey }
      : { Authorization: `Bearer ${token}` };
    const r = await fetch("https://api.cloudflare.com/client/v4/user", { headers });
    cfUser = await r.json();
  } catch (e) {
    cfUser = { error: String(e) };
  }

  return new Response(
    JSON.stringify({
      configured_email: email || "(não configurado)",
      account_id: accountId ? accountId.slice(0, 6) + "…" : "(não configurado)",
      has_token: !!token,
      has_global_key: !!globalKey,
      cloudflare_account: {
        email: cfUser?.result?.email,
        username: cfUser?.result?.username,
        id: cfUser?.result?.id,
        errors: cfUser?.errors,
      },
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
