import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const VERCEL_API = 'https://api.vercel.com';

function slugify(input: string): string {
  return (input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52);
}

function normalizeSlug(raw: string): string {
  let s = slugify(raw);
  if (s.length < 3) s = (s + '-site').slice(0, 52);
  return s;
}

async function vercelFetch(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${VERCEL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const token = Deno.env.get('VERCEL_API_TOKEN');
  if (!token) {
    return new Response(JSON.stringify({ error: 'VERCEL_API_TOKEN não configurado' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawName = String(body.projectName || '').trim();
    const html = String(body.html || '');
    const extraFiles: { path: string; content: string }[] = Array.isArray(body.extraFiles) ? body.extraFiles : [];
    if (!rawName || !html) {
      return new Response(JSON.stringify({ error: 'projectName e html são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slug = normalizeSlug(rawName);

    const filesPayload: { file: string; data: string }[] = [
      { file: 'index.html', data: html },
    ];
    for (const f of extraFiles) {
      const safePath = String(f.path || '').replace(/^\/+/, '').replace(/[^a-zA-Z0-9._/-]/g, '');
      if (safePath && f.content) filesPayload.push({ file: safePath, data: String(f.content) });
    }

    // v13 deployments com arquivos inline (data)
    const deployRes = await vercelFetch(token, '/v13/deployments?forceNew=1', {
      method: 'POST',
      body: JSON.stringify({
        name: slug,
        project: slug,
        target: 'production',
        files: filesPayload,
        projectSettings: {
          framework: null,
        },
      }),
    });

    const deployJson = await deployRes.json();

    // Desativa Deployment Protection (SSO) do projeto — deixa o site público
    try {
      await vercelFetch(token, `/v9/projects/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ ssoProtection: null }),
      });
    } catch (_) { /* ignore */ }
    if (!deployRes.ok) {
      const msg = deployJson?.error?.message || JSON.stringify(deployJson);
      return new Response(JSON.stringify({ error: `Vercel: ${msg}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // URL: em target=production, Vercel cria alias <slug>.vercel.app automaticamente.
    // Preferimos ele (curto/limpo) em vez do deployment URL com hash (que o Facebook rejeita).
    const cleanProdUrl = `https://${slug}.vercel.app`;
    const aliasList: string[] = Array.isArray(deployJson?.alias) ? deployJson.alias : [];
    const aliasClean = aliasList.find((a) => a === `${slug}.vercel.app`);
    const url = aliasClean ? `https://${aliasClean}` : cleanProdUrl;

    // Poll rápido até deployment ficar READY (máx ~15s)
    const deploymentId = deployJson?.id;
    if (deploymentId) {
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const st = await vercelFetch(token, `/v13/deployments/${deploymentId}`);
        const sj = await st.json().catch(() => ({}));
        if (sj?.readyState === 'READY' || sj?.status === 'READY') break;
        if (sj?.readyState === 'ERROR' || sj?.status === 'ERROR') {
          return new Response(JSON.stringify({ error: `Vercel build ERROR: ${sj?.errorMessage || 'unknown'}` }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      provider: 'vercel',
      projectName: slug,
      url,
      deploymentId: deploymentId ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
