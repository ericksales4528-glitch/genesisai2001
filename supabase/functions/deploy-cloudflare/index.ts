// Edge function: deploy HTML como Cloudflare Pages em <project>.pages.dev
// Fluxo (Direct Upload):
//  1. Cria o projeto Pages se não existir
//  2. Obtém JWT: GET /accounts/{id}/pages/projects/{name}/upload-token
//  3. check-missing → upload assets → cria deployment com manifest

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CF_API = "https://api.cloudflare.com/client/v4";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 58);
}

function randomSuffix(len = 4) {
  return Math.random().toString(36).slice(2, 2 + len);
}

type CfAuth = { mode: "token"; token: string } | { mode: "global"; email: string; key: string };

function authHeaders(auth: CfAuth): Record<string, string> {
  if (auth.mode === "token") return { Authorization: `Bearer ${auth.token}` };
  return { "X-Auth-Email": auth.email, "X-Auth-Key": auth.key };
}

async function cfFetch(path: string, auth: CfAuth, init: RequestInit = {}) {
  const res = await fetch(`${CF_API}${path}`, {
    ...init,
    headers: {
      ...authHeaders(auth),
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

class ProjectLimitError extends Error {
  constructor(msg: string) { super(msg); this.name = "ProjectLimitError"; }
}

class PublishedUrlError extends Error {
  constructor(msg: string) { super(msg); this.name = "PublishedUrlError"; }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withRandomSuffix(base: string) {
  const suffix = randomSuffix(5);
  return `${base.slice(0, Math.max(1, 58 - suffix.length - 1))}-${suffix}`;
}

// Cria o projeto Pages (se não existir). Retorna o subdomínio (project.pages.dev)
async function ensureProject(accountId: string, name: string, auth: CfAuth): Promise<string> {
  const exists = await cfFetch(`/accounts/${accountId}/pages/projects/${name}`, auth);
  if (exists.ok) {
    const sub = (exists.data as { result?: { subdomain?: string } }).result?.subdomain;
    return sub || `${name}.pages.dev`;
  }
  const create = await cfFetch(`/accounts/${accountId}/pages/projects`, auth, {
    method: "POST",
    body: JSON.stringify({ name, production_branch: "main" }),
  });
  if (!create.ok) {
    const errs = (create.data as { errors?: Array<{ code?: number; message?: string }> })?.errors || [];
    const code = errs[0]?.code;
    // 8000000 range com "maximum" ou similares indicam limite
    const msg = errs.map((e) => `${e.code}:${e.message}`).join("; ") || JSON.stringify(create.data);
    if (/limit|maximum|quota/i.test(msg) || code === 8000031) {
      throw new ProjectLimitError(`Limite de projetos Pages atingido: ${msg}`);
    }
    throw new Error(`Falha ao criar projeto Pages: ${msg}`);
  }
  const sub = (create.data as { result?: { subdomain?: string } }).result?.subdomain;
  return sub || `${name}.pages.dev`;
}

async function getUploadJwt(accountId: string, name: string, auth: CfAuth): Promise<string> {
  const r = await cfFetch(`/accounts/${accountId}/pages/projects/${name}/upload-token`, auth);
  if (!r.ok) throw new Error(`Falha ao obter upload-token: ${JSON.stringify(r.data)}`);
  const jwt = (r.data as { result?: { jwt?: string } }).result?.jwt;
  if (!jwt) throw new Error("upload-token sem jwt");
  return jwt;
}

// Hash usado pelo Cloudflare Pages: sha256(content + extensão) hex, 32 primeiros chars
async function hashAsset(content: Uint8Array, ext: string): Promise<string> {
  const extBytes = new TextEncoder().encode(ext);
  const buf = new Uint8Array(content.length + extBytes.length);
  buf.set(content, 0);
  buf.set(extBytes, content.length);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function checkMissing(jwt: string, hashes: string[]): Promise<string[]> {
  const res = await fetch(`${CF_API}/pages/assets/check-missing`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ hashes }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`check-missing falhou: ${JSON.stringify(data)}`);
  return (data as { result?: string[] }).result || [];
}

async function uploadAssets(jwt: string, payload: Array<{ key: string; value: string; metadata: { contentType: string }; base64: true }>) {
  const res = await fetch(`${CF_API}/pages/assets/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`assets/upload falhou (${res.status}): ${text.slice(0, 400)}`);
}

async function createDeployment(accountId: string, name: string, auth: CfAuth, manifest: Record<string, string>): Promise<string> {
  const form = new FormData();
  form.append("manifest", JSON.stringify(manifest));
  form.append("branch", "main");
  const res = await fetch(`${CF_API}/accounts/${accountId}/pages/projects/${name}/deployments`, {
    method: "POST",
    headers: authHeaders(auth),
    body: form,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`create deployment falhou (${res.status}): ${text.slice(0, 500)}`);
  const data = JSON.parse(text);
  const url = data?.result?.url as string | undefined;
  return url || "";
}

async function deleteProject(accountId: string, name: string, auth: CfAuth) {
  const r = await cfFetch(`/accounts/${accountId}/pages/projects/${name}`, auth, { method: "DELETE" });
  if (!r.ok) console.error(`Falha ao remover Pages quebrado ${name}:`, JSON.stringify(r.data));
}

async function waitForPublishedUrl(url: string) {
  // 522 pode aparecer por alguns segundos logo após criar um Pages novo.
  // Só considera quebrado se continuar retornando 522 após várias tentativas.
  let saw522 = false;
  for (let attempt = 1; attempt <= 6; attempt++) {
    if (attempt > 1) await sleep(1500);
    try {
      const res = await fetch(`${url}?nexus_check=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache",
          "User-Agent": "NexusGenerator/1.0 (+publish-check)",
        },
      });
      const text = await res.text().catch(() => "");
      if (res.status === 522 || /error code 522/i.test(text)) {
        saw522 = true;
        continue;
      }
      // Qualquer outra resposta HTTP: considera publicado (200, 3xx, 404 durante warmup, etc.)
      return;
    } catch (err) {
      if (err instanceof PublishedUrlError) throw err;
      // DNS/network error = propagação ainda não terminou. Tenta de novo; se esgotar, aceita mesmo assim.
    }
  }
  if (saw522) throw new PublishedUrlError(`Cloudflare retornou 522 para ${url}`);
  // DNS não propagou dentro da edge function, mas o deploy foi criado com sucesso. Aceita.
  return;
}

async function waitForCustomDomainReady(url: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 6; attempt++) {
    if (attempt > 1) await sleep(2000);
    try {
      const res = await fetch(`${url}?nexus_custom_check=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache",
          "User-Agent": "NexusGenerator/1.0 (+custom-domain-check)",
        },
      });
      const text = await res.text().catch(() => "");
      if (res.status === 522 || /error code 522/i.test(text)) continue;
      return true;
    } catch {
      // DNS/SSL ainda propagando.
    }
  }
  return false;
}

type CfAccount = { label: string; accountId: string; auth: CfAuth };

function loadAccounts(): CfAccount[] {
  const accounts: CfAccount[] = [];
  const id1 = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
  const email1 = Deno.env.get("CLOUDFLARE_EMAIL");
  const gkey1 = Deno.env.get("CLOUDFLARE_GLOBAL_API_KEY");
  const tok1 = Deno.env.get("CLOUDFLARE_API_TOKEN");
  if (id1) {
    if (gkey1 && email1) accounts.push({ label: "conta-1", accountId: id1, auth: { mode: "global", email: email1, key: gkey1 } });
    else if (tok1) accounts.push({ label: "conta-1", accountId: id1, auth: { mode: "token", token: tok1 } });
  }
  for (let i = 2; i <= 10; i++) {
    const id = Deno.env.get(`CF_ACCOUNT_${i}_ID`);
    if (!id) continue;
    const email = Deno.env.get(`CF_ACCOUNT_${i}_EMAIL`);
    const gkey = Deno.env.get(`CF_ACCOUNT_${i}_GLOBAL_KEY`);
    const tok = Deno.env.get(`CF_ACCOUNT_${i}_TOKEN`);
    if (gkey && email) accounts.push({ label: `conta-${i}`, accountId: id, auth: { mode: "global", email, key: gkey } });
    else if (tok) accounts.push({ label: `conta-${i}`, accountId: id, auth: { mode: "token", token: tok } });
  }
  return accounts;
}

async function projectExists(accountId: string, name: string, auth: CfAuth): Promise<boolean> {
  const r = await cfFetch(`/accounts/${accountId}/pages/projects/${name}`, auth);
  return r.ok;
}

// Localiza a conta Cloudflare que hospeda a zona (domínio raiz)
async function findAccountForZone(accounts: CfAccount[], rootDomain: string): Promise<{ acc: CfAccount; zoneId: string } | null> {
  for (const acc of accounts) {
    const r = await cfFetch(`/zones?name=${encodeURIComponent(rootDomain)}`, acc.auth);
    if (!r.ok) continue;
    const result = (r.data as { result?: Array<{ id: string; name: string; status: string }> }).result || [];
    const zone = result.find((z) => z.name === rootDomain);
    if (zone) return { acc, zoneId: zone.id };
  }
  return null;
}

// Cria/atualiza CNAME <sub>.<root> → <project>.pages.dev (proxied). Idempotente.
async function ensureDnsCname(zoneId: string, fullDomain: string, target: string, auth: CfAuth): Promise<void> {
  const existing = await cfFetch(`/zones/${zoneId}/dns_records?name=${encodeURIComponent(fullDomain)}`, auth);
  const records = (existing.data as { result?: Array<{ id: string; type: string; content: string }> })?.result || [];
  const payload = { type: "CNAME", name: fullDomain, content: target, proxied: true, ttl: 1 };
  if (records.length > 0) {
    const rec = records[0];
    if (rec.type === "CNAME" && rec.content === target) return;
    const upd = await cfFetch(`/zones/${zoneId}/dns_records/${rec.id}`, auth, { method: "PUT", body: JSON.stringify(payload) });
    if (!upd.ok) throw new Error(`Falha ao atualizar CNAME: ${JSON.stringify(upd.data)}`);
    return;
  }
  const create = await cfFetch(`/zones/${zoneId}/dns_records`, auth, { method: "POST", body: JSON.stringify(payload) });
  if (!create.ok) throw new Error(`Falha ao criar CNAME: ${JSON.stringify(create.data)}`);
}

// Anexa o domínio custom ao projeto Pages. Idempotente.
async function attachCustomDomain(accountId: string, projectName: string, domain: string, auth: CfAuth): Promise<void> {
  const r = await cfFetch(`/accounts/${accountId}/pages/projects/${projectName}/domains`, auth, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
  if (r.ok) return;
  const errs = (r.data as { errors?: Array<{ code?: number; message?: string }> })?.errors || [];
  const msg = errs.map((e) => `${e.code}:${e.message}`).join("; ");
  // 8000000/8000007: already exists — tudo bem
  if (/already|exists|conflict/i.test(msg)) return;
  throw new Error(`Falha ao anexar domínio custom: ${msg || JSON.stringify(r.data)}`);
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const accounts = loadAccounts();
    if (accounts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhuma conta Cloudflare configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawName = (body.projectName || "").toString();
    const html = (body.html || "").toString();
    const extraFiles: { path: string; content: string }[] = Array.isArray(body.extraFiles) ? body.extraFiles : [];
    const customDomainRoot = (body.customDomain || "").toString().trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!rawName || !html) {
      return new Response(
        JSON.stringify({ success: false, error: "projectName e html são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let slug = slugify(rawName);
    if (!slug) slug = `site-${randomSuffix(6)}`;

    // Se um domínio custom foi solicitado, localiza a conta que hospeda a zona.
    let forcedAccount: { acc: CfAccount; zoneId: string } | null = null;
    if (customDomainRoot) {
      forcedAccount = await findAccountForZone(accounts, customDomainRoot);
      if (!forcedAccount) {
        return new Response(
          JSON.stringify({ success: false, error: `Domínio ${customDomainRoot} não encontrado em nenhuma conta Cloudflare configurada.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Se já existir esse projeto em alguma conta, prioriza (atualização in-place)
    let targetAccount: CfAccount | null = null;
    if (forcedAccount) {
      targetAccount = forcedAccount.acc;
    } else {
      for (const acc of accounts) {
        if (await projectExists(acc.accountId, slug, acc.auth)) { targetAccount = acc; break; }
      }
    }
    const tryOrder = forcedAccount
      ? [forcedAccount.acc]
      : (targetAccount ? [targetAccount, ...accounts.filter((a) => a !== targetAccount)] : accounts);


    // Prepara todos os assets (index.html + extras)
    type Asset = { path: string; hash: string; b64: string; contentType: string };
    const assetsList: Asset[] = [];
    async function addAsset(pathAbs: string, content: string, ext: string, ct: string) {
      const bytes = new TextEncoder().encode(content);
      const hash = await hashAsset(bytes, ext);
      assetsList.push({ path: pathAbs, hash, b64: toBase64(bytes), contentType: ct });
    }
    await addAsset("/index.html", html, "html", "text/html; charset=utf-8");
    for (const f of extraFiles) {
      const safePath = String(f.path || "").replace(/^\/+/, "").replace(/[^a-zA-Z0-9._/-]/g, "");
      if (!safePath || !f.content) continue;
      const ext = safePath.split(".").pop() || "html";
      const ct = ext === "html" ? "text/html; charset=utf-8" : ext === "txt" ? "text/plain; charset=utf-8" : "application/octet-stream";
      await addAsset(`/${safePath}`, String(f.content), ext, ct);
    }

    async function tryPublish(acc: CfAccount, publishSlug: string): Promise<Response> {
      const subdomain = await ensureProject(acc.accountId, publishSlug, acc.auth);
      const jwt = await getUploadJwt(acc.accountId, publishSlug, acc.auth);
      const missing = await checkMissing(jwt, assetsList.map((a) => a.hash));
      const toUpload = assetsList.filter((a) => missing.includes(a.hash));
      if (toUpload.length > 0) {
        await uploadAssets(jwt, toUpload.map((a) => ({
          key: a.hash, value: a.b64, metadata: { contentType: a.contentType }, base64: true,
        })));
      }
      const manifest: Record<string, string> = {};
      for (const a of assetsList) manifest[a.path] = a.hash;
      await createDeployment(acc.accountId, publishSlug, acc.auth, manifest);
      const domain = subdomain.replace(/^https?:\/\//, "");
      const pagesUrl = `https://${domain}`;

      // Se pediu domínio custom e essa conta é a dona da zona, anexa o subdomínio
      let finalUrl = pagesUrl;
      let customDomainFull: string | null = null;
      let warning: string | null = null;
      if (customDomainRoot && forcedAccount && forcedAccount.acc.accountId === acc.accountId) {
        customDomainFull = `${publishSlug}.${customDomainRoot}`;
        try {
          await waitForPublishedUrl(pagesUrl);
          // 1. Cria CNAME apontando o subdomínio pro projeto.pages.dev (proxied)
          await ensureDnsCname(forcedAccount.zoneId, customDomainFull, domain, acc.auth);
          // 2. Anexa o domínio ao projeto Pages
          await attachCustomDomain(acc.accountId, publishSlug, customDomainFull, acc.auth);
          finalUrl = `https://${customDomainFull}`;
          const customReady = await waitForCustomDomainReady(finalUrl);
          if (!customReady) warning = "Domínio próprio criado, mas o SSL/roteamento ainda está propagando. Aguarde 1 a 2 minutos e abra de novo.";
          console.log(`[${acc.label}] domínio custom anexado: ${customDomainFull}`);
        } catch (err) {
          console.error(`[${acc.label}] falha ao anexar domínio custom:`, err);
          // Não derruba o deploy — retorna URL do pages.dev
          customDomainFull = null;
          finalUrl = pagesUrl;
        }
      } else {
        // Só checa .pages.dev quando não estamos usando domínio custom (custom leva minutos p/ SSL)
        try {
          await waitForPublishedUrl(pagesUrl);
        } catch (err) {
          await deleteProject(acc.accountId, publishSlug, acc.auth);
          await sleep(2000);
          throw err;
        }
      }
      console.log(`[${acc.label}] Pages publicado: ${finalUrl}`);
      return new Response(
        JSON.stringify({
          success: true,
          url: finalUrl,
          pagesUrl,
          customDomain: customDomainFull,
          warning,
          projectName: publishSlug,
          domain,
          account: acc.label,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    let lastError: unknown = null;
    for (const acc of tryOrder) {
      try {
        return await tryPublish(acc, slug);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (err instanceof PublishedUrlError) {
          console.error(`[${acc.label}] falhou:`, msg);
          lastError = msg;
          break;
        }
        if (err instanceof ProjectLimitError) {
          console.log(`[${acc.label}] no limite de projetos Pages`);
        } else {
          console.error(`[${acc.label}] falhou:`, msg);
        }
        lastError = msg;
      }
    }

    // Fallback: se o subdomínio original ficou preso/quebrado no Cloudflare, cria outro slug limpo.
    for (const acc of accounts) {
      const fallbackSlug = withRandomSuffix(slug);
      try {
        return await tryPublish(acc, fallbackSlug);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[${acc.label}] fallback falhou:`, msg);
        lastError = msg;
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: `Falha em todas as contas. Último erro: ${lastError}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("deploy-cloudflare error:", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
