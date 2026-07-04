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

function jsonResponse(payload: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function readResponsePayload(res: Response): Promise<any> {
  const text = await res.text().catch(() => '');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function renderErrorMessage(payload: any, status: number): string {
  const raw = payload?.message || payload?.error || payload?.errors?.[0]?.message || JSON.stringify(payload || { status });
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

function renderUnavailableResponse(action: string, res: Response, payload: any): Response | null {
  const msg = renderErrorMessage(payload, res.status);
  const retryAfter = res.headers.get('retry-after');
  const rateLimited = res.status === 429 || /rate\s*limit|too many requests/i.test(msg);
  const transient = rateLimited || res.status >= 500;

  if (!transient) return null;

  return jsonResponse({
    success: false,
    fallback: true,
    error: rateLimited
      ? 'Limite da Render atingido. Aguarde alguns minutos ou use outra conta Render em Publicar site.'
      : 'A Render está temporariamente indisponível. Tente publicar novamente em alguns minutos.',
    code: rateLimited ? 'RENDER_RATE_LIMITED' : 'RENDER_SERVICE_UNAVAILABLE',
    provider: 'render',
    action,
    retryAfter,
  });
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
  const envRenderToken = Deno.env.get('RENDER_API_KEY');
  const envOwnerId = Deno.env.get('RENDER_OWNER_ID');

  if (!ghToken) {
    return jsonResponse({
      error: 'Faltando GITHUB_FINE_GRAINED_PERSONAL_ACCESS_TOKEN',
    }, 500);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const rawName = String(body.projectName || '').trim();
    const html = String(body.html || '');
    const extraFiles: { path: string; content: string }[] = Array.isArray(body.extraFiles) ? body.extraFiles : [];
    if (!rawName || !html) {
      return jsonResponse({ error: 'projectName e html são obrigatórios' }, 400);
    }

    const renderToken = body.renderApiKey ? String(body.renderApiKey).trim() : envRenderToken;
    const ownerId = body.renderOwnerId ? String(body.renderOwnerId).trim() : envOwnerId;

    if (!renderToken || !ownerId) {
      return jsonResponse({
        error: 'Faltando Render API Key e Owner ID. Adicione uma conta Render ou configure as variáveis de ambiente.',
      }, 400);
    }

    const slug = normalizeSlug(rawName);
    const repoName = `site-${slug}`;

    // 1) Descobrir usuário do GitHub
    const userRes = await ghFetch(ghToken, '/user');
    const userJson = await userRes.json();
    if (!userRes.ok) {
      return jsonResponse({ error: `GitHub /user: ${userJson?.message || userRes.status}` }, 500);
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
        return jsonResponse({ error: `GitHub criar repo: ${j?.message || createRes.status}` }, 500);
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
    const listJson = await readResponsePayload(listRes);
    if (!listRes.ok) {
      const fallback = renderUnavailableResponse('list_services', listRes, listJson);
      if (fallback) return fallback;

      return jsonResponse({
        success: false,
        error: `Render listar services: ${renderErrorMessage(listJson, listRes.status)}`,
        provider: 'render',
      });
    }
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
      const svcJson = await readResponsePayload(createSvc);
      if (!createSvc.ok) {
        const fallback = renderUnavailableResponse('create_service', createSvc, svcJson);
        if (fallback) return fallback;

        return jsonResponse({
          success: false,
          error: `Render criar service: ${renderErrorMessage(svcJson, createSvc.status)}`,
          provider: 'render',
        });
      }
      service = extractRenderService(svcJson);
    } else {
      // Dispara deploy imediato no commit exato (sem sleep, sem clear cache = mais rápido)
      const deployRes = await renderFetch(renderToken, `/services/${service.id}/deploys`, {
        method: 'POST',
        body: JSON.stringify({
          clearCache: 'do_not_clear',
          ...(newCommitSha ? { commitId: newCommitSha } : {}),
        }),
      });
      const deployJson = await readResponsePayload(deployRes);
      if (!deployRes.ok) {
        const fallback = renderUnavailableResponse('create_deploy', deployRes, deployJson);
        if (fallback) return fallback;

        return jsonResponse({
          success: false,
          error: `Render criar deploy: ${renderErrorMessage(deployJson, deployRes.status)}`,
          provider: 'render',
        });
      }
    }


    service = (await fetchRenderService(renderToken, service?.id)) || service;

    const url = resolveRenderUrl(service, repoName);

    return jsonResponse({
      success: true,
      provider: 'render',
      projectName: slug,
      url,
      repoUrl,
      serviceId: service?.id ?? null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    return jsonResponse({ error: msg }, 500);
  }
});
