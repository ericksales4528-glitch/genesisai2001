import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GH_API = 'https://api.github.com';
const RENDER_API = 'https://api.render.com/v1';

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

function b64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

async function ghFetch(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${GH_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'nexus-generator',
      ...(init.headers || {}),
    },
  });
}

async function renderFetch(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${RENDER_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers || {}),
    },
  });
}

function extractRenderService(payload: any): any {
  return payload?.service || payload;
}

async function fetchRenderService(token: string, serviceId?: string): Promise<any | null> {
  if (!serviceId) return null;

  const res = await renderFetch(token, `/services/${serviceId}`);
  if (!res.ok) return null;

  const json = await res.json().catch(() => null);
  return extractRenderService(json);
}

function resolveRenderUrl(service: any, repoName: string): string {
  const rawUrl =
    service?.serviceDetails?.url ||
    service?.url ||
    service?.domains?.find?.((domain: any) => domain?.name)?.name ||
    (service?.slug ? `${service.slug}.onrender.com` : '') ||
    `${repoName}.onrender.com`;

  return String(rawUrl).startsWith('http') ? String(rawUrl) : `https://${rawUrl}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const ghToken = Deno.env.get('GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN');
  const renderToken = Deno.env.get('RENDER_API_KEY');
  const ownerId = Deno.env.get('RENDER_OWNER_ID');

  if (!ghToken || !renderToken || !ownerId) {
    return new Response(JSON.stringify({
      error: 'Faltando GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN, RENDER_API_KEY ou RENDER_OWNER_ID',
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
    const repoName = `site-${slug}`;

    // 1) Descobrir usuário do GitHub
    const userRes = await ghFetch(ghToken, '/user');
    const userJson = await userRes.json();
    if (!userRes.ok) {
      return new Response(JSON.stringify({ error: `GitHub /user: ${userJson?.message || userRes.status}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const ghLogin: string = userJson.login;

    // 2) Criar repo (se não existe)
    const repoCheck = await ghFetch(ghToken, `/repos/${ghLogin}/${repoName}`);
    let repoExists = repoCheck.ok;

    if (!repoExists) {
      const createRes = await ghFetch(ghToken, '/user/repos', {
        method: 'POST',
        body: JSON.stringify({
          name: repoName,
          private: false,
          auto_init: true,
          description: `Site institucional - ${slug}`,
        }),
      });
      if (!createRes.ok) {
        const j = await createRes.json();
        return new Response(JSON.stringify({ error: `GitHub criar repo: ${j?.message || createRes.status}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      await new Promise((r) => setTimeout(r, 1500));
      repoExists = true;
    }

    // Helper: upsert de arquivo no repo
    async function upsertFile(path: string, content: string): Promise<string | undefined> {
      const getRes = await ghFetch(ghToken, `/repos/${ghLogin}/${repoName}/contents/${encodeURIComponent(path)}?ref=main`);
      let sha: string | undefined;
      if (getRes.ok) sha = (await getRes.json())?.sha;
      const putRes = await ghFetch(ghToken, `/repos/${ghLogin}/${repoName}/contents/${encodeURIComponent(path)}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: sha ? `update ${path}` : `add ${path}`,
          content: b64(content),
          branch: 'main',
          ...(sha ? { sha } : {}),
        }),
      });
      if (!putRes.ok) {
        const j = await putRes.json();
        throw new Error(`GitHub upload ${path}: ${j?.message || putRes.status}`);
      }
      const j = await putRes.json();
      return j?.commit?.sha as string | undefined;
    }

    // 3) Upsert index.html
    let newCommitSha = await upsertFile('index.html', html);

    // 3b) Upsert arquivos extras (ex: verificação Facebook via HTML file)
    for (const f of extraFiles) {
      const safePath = String(f.path || '').replace(/^\/+/, '').replace(/[^a-zA-Z0-9._/-]/g, '');
      if (!safePath || !f.content) continue;
      newCommitSha = (await upsertFile(safePath, String(f.content))) || newCommitSha;
    }


    const repoUrl = `https://github.com/${ghLogin}/${repoName}`;

    // 4) Verificar se já existe um service no Render para esse repo/nome
    const listRes = await renderFetch(renderToken, `/services?name=${encodeURIComponent(repoName)}&limit=20`);
    const listJson = await listRes.json();
    let existing: any = null;
    if (Array.isArray(listJson)) {
      existing = listJson.find((it: any) => it?.service?.name === repoName)?.service || null;
    }

    let service: any = existing;
    if (!service) {
      // 5) Criar Static Site no Render
      const createSvc = await renderFetch(renderToken, '/services', {
        method: 'POST',
        body: JSON.stringify({
          type: 'static_site',
          name: repoName,
          ownerId,
          repo: repoUrl,
          branch: 'main',
          autoDeploy: 'yes',
          serviceDetails: {
            publishPath: './',
            buildCommand: '',
            pullRequestPreviewsEnabled: 'no',
          },
        }),
      });
      const svcJson = await createSvc.json();
      if (!createSvc.ok) {
        return new Response(JSON.stringify({
          error: `Render criar service: ${svcJson?.message || JSON.stringify(svcJson)}`,
        }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      service = extractRenderService(svcJson);
    } else {
      // Dispara deploy imediato no commit exato (sem sleep, sem clear cache = mais rápido)
      await renderFetch(renderToken, `/services/${service.id}/deploys`, {
        method: 'POST',
        body: JSON.stringify({
          clearCache: 'do_not_clear',
          ...(newCommitSha ? { commitId: newCommitSha } : {}),
        }),
      });
    }


    service = (await fetchRenderService(renderToken, service?.id)) || service;

    const url = resolveRenderUrl(service, repoName);

    return new Response(JSON.stringify({
      success: true,
      provider: 'render',
      projectName: slug,
      url,
      repoUrl,
      serviceId: service?.id ?? null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
