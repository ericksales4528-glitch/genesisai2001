import { CompanyData, normalizeFacebookVerificationTag } from "./siteTemplate";

const segmentoLabels: Record<string, string> = {
  servicos: "Serviços",
  comercio: "Comércio",
  tecnologia: "Tecnologia",
  logistica: "Logística",
  industria: "Indústria",
  saude: "Saúde",
  educacao: "Educação",
  alimentacao: "Alimentação",
};

export function generateSiteHTMLHigioral(data: CompanyData): string {
  const esc = (s: string) => (s || "").replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nome = data.razaoSocial || "Nome da Empresa";
  const nomeFantasia = nome.split(" ")[0] || nome;
  const email = `contato@${data.emailDomain || "empresa.com.br"}`;
  const dpoEmail = `dpo@${data.emailDomain || "empresa.com.br"}`;
  const waDigits = (data.whatsapp || "").replace(/\D/g, "");
  const whatsappLink = waDigits
    ? `https://wa.me/55${waDigits}?text=${encodeURIComponent("Olá, gostaria de falar com a " + nome + ".")}`
    : `mailto:${email}`;
  const segLabel = segmentoLabels[data.segmento] || "Serviços";
  const endereco = [data.logradouro, data.numero].filter(Boolean).join(", ");
  const enderecoCompleto = data.complemento ? `${endereco}, ${data.complemento}` : endereco;
  const cidade = (data.cidadeUf || "").split("-")[0]?.trim() || "Brasil";
  const uf = (data.cidadeUf || "").split("-")[1]?.trim() || "";
  const enderecoFull = [enderecoCompleto, data.bairro, `${cidade}${uf ? " - " + uf : ""}`, data.cep ? `CEP ${data.cep}` : ""]
    .filter(Boolean)
    .join(", ");
  const domain = data.emailDomain || "empresa.com.br";
  const cnpjDigits = (data.cnpj || "").replace(/\D/g, "");
  const cnpjConsultaUrl = cnpjDigits
    ? `https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp?cnpj=${cnpjDigits}`
    : "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp";
  const ano = new Date().getFullYear();
  const dataAbertura = `25/09/${ano - 1}`;
  const natureza = "206-2 - Sociedade Empresária Limitada";
  const capitalSocial = "R$ 170.000.000,00";

  const cleanFbTag = normalizeFacebookVerificationTag(data.fbVerificationTag);
  const fbMetaTag = cleanFbTag
    ? `<meta name="facebook-domain-verification" content="${cleanFbTag}" />`
    : "";

  const siteUrl = `https://${domain}`;
  const ogDesc = data.descricao || `${nome} atua em ${data.atividadePrincipal || segLabel}, com presença em ${cidade}${uf ? "/" + uf : ""} e informações empresariais públicas para identificação institucional e contato.`;

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: nome,
    legalName: nome,
    description: ogDesc,
    url: siteUrl,
    email,
    telephone: data.telefone || undefined,
    taxID: data.cnpj || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: enderecoCompleto,
      addressLocality: cidade,
      addressRegion: uf,
      postalCode: data.cep,
      addressCountry: "BR",
    },
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${fbMetaTag}
<meta name="robots" content="index, follow">
<title>${esc(nome)} — Site Institucional</title>
<meta name="description" content="${esc(ogDesc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(nome)}">
<meta property="og:title" content="${esc(nome)}">
<meta property="og:description" content="${esc(ogDesc)}">
<script type="application/ld+json">${JSON.stringify(orgSchema)}</script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;background:#f8fafc;color:#0f172a;line-height:1.55;-webkit-font-smoothing:antialiased}
  a{color:#2563eb;text-decoration:none}
  a:hover{text-decoration:underline}
  .nav{background:#fff;border-bottom:1px solid #e5e7eb;padding:20px 32px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:20}
  .nav .brand{color:#2563eb;font-weight:800;font-size:22px;letter-spacing:-.3px}
  .nav ul{display:flex;gap:32px;list-style:none}
  .nav ul a{color:#0f172a;font-weight:600;font-size:15px}
  .nav ul a:hover{color:#2563eb;text-decoration:none}
  .wrap{max-width:1200px;margin:0 auto;padding:48px 32px 24px}
  .hero{display:grid;grid-template-columns:1.15fr 1fr;gap:24px;align-items:stretch}
  .hero .card-left{background:#fff;border-radius:16px;padding:40px 44px;box-shadow:0 4px 20px rgba(15,23,42,.05);border:1px solid #eef2f7}
  .chip{display:inline-block;background:#dbeafe;color:#1e40af;font-weight:700;padding:8px 16px;border-radius:999px;font-size:13px;margin-bottom:22px}
  .hero h1{font-size:44px;line-height:1.1;font-weight:800;letter-spacing:-.8px;color:#0b1220;margin-bottom:20px}
  .hero p.lead{color:#475569;font-size:15px;line-height:1.6;margin-bottom:22px}
  .pill-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:26px}
  .pill{background:#eff6ff;color:#1e3a8a;font-weight:600;padding:10px 16px;border-radius:999px;font-size:13.5px;border:1px solid #dbeafe}
  .btn-row{display:flex;gap:12px;flex-wrap:wrap}
  .btn{display:inline-block;padding:14px 26px;border-radius:10px;font-weight:700;font-size:14.5px;transition:transform .15s ease,box-shadow .15s ease}
  .btn:hover{text-decoration:none;transform:translateY(-1px)}
  .btn-primary{background:#2563eb;color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.35)}
  .btn-primary:hover{background:#1d4ed8}
  .btn-ghost{background:#fff;color:#0f172a;border:1px solid #e5e7eb}
  .btn-ghost:hover{background:#f8fafc}
  .card-right{background:linear-gradient(135deg,#1e3a8a 0%,#2563eb 100%);color:#fff;border-radius:16px;padding:36px 36px;position:relative;overflow:hidden;box-shadow:0 10px 30px rgba(30,58,138,.25)}
  .card-right::after{content:"";position:absolute;bottom:-80px;right:-80px;width:260px;height:260px;background:radial-gradient(circle,rgba(255,255,255,.12) 0%,transparent 70%);border-radius:50%}
  .card-right h3{font-size:20px;font-weight:800;margin-bottom:20px;position:relative;z-index:1}
  .card-right ul{list-style:none;position:relative;z-index:1;margin-bottom:22px}
  .card-right ul li{padding:8px 0 8px 20px;position:relative;font-size:14.5px;line-height:1.55;color:#e0e7ff}
  .card-right ul li::before{content:"•";position:absolute;left:0;color:#93c5fd;font-weight:900;font-size:18px;top:6px}
  .card-right ul li strong{color:#fff;font-weight:700}
  .mini-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;position:relative;z-index:1}
  .mini{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:12px;padding:14px 16px;backdrop-filter:blur(4px)}
  .mini .lbl{font-size:11px;color:#c7d2fe;font-weight:700;letter-spacing:.6px;text-transform:uppercase;margin-bottom:6px}
  .mini .val{font-size:15px;font-weight:700;color:#fff;line-height:1.35}
  .stats{max-width:1200px;margin:8px auto 0;padding:0 32px 24px;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
  .stat{background:#fff;border:1px solid #eef2f7;border-radius:14px;padding:20px 22px;box-shadow:0 2px 8px rgba(15,23,42,.04)}
  .stat .lbl{font-size:11px;letter-spacing:.7px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px}
  .stat .val{font-size:18px;font-weight:800;color:#0b1220}
  .section{max-width:1200px;margin:16px auto 0;padding:24px 32px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .panel{background:#fff;border:1px solid #eef2f7;border-radius:16px;padding:32px 36px;box-shadow:0 2px 10px rgba(15,23,42,.04)}
  .panel h2{font-size:22px;font-weight:800;color:#0b1220;margin-bottom:16px;letter-spacing:-.3px}
  .panel p{color:#475569;font-size:15px;margin-bottom:14px}
  .panel ul.check{list-style:none;margin-top:8px}
  .panel ul.check li{padding:10px 0 10px 30px;position:relative;color:#334155;font-size:14.5px}
  .panel ul.check li::before{content:"✔";position:absolute;left:0;top:9px;color:#2563eb;font-weight:900;background:#dbeafe;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px}
  .kv-list{display:grid;grid-template-columns:1fr;gap:12px}
  .kv-row{display:grid;grid-template-columns:180px 1fr;gap:16px;padding:14px 0;border-bottom:1px solid #f1f5f9}
  .kv-row:last-child{border-bottom:none}
  .kv-row .k{font-size:12px;letter-spacing:.6px;text-transform:uppercase;font-weight:700;color:#64748b;padding-top:2px}
  .kv-row .v{font-size:15px;color:#0b1220;font-weight:600}
  .contato{max-width:1200px;margin:16px auto 0;padding:24px 32px}
  .contato .panel{background:linear-gradient(135deg,#eff6ff 0%,#fff 100%)}
  .contato .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:6px}
  .contato .item{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:18px 20px}
  .contato .item .k{font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:#64748b;font-weight:700;margin-bottom:6px}
  .contato .item .v{font-size:14.5px;color:#0b1220;font-weight:600;word-break:break-word}
  .contato .cta{margin-top:22px;text-align:center}
  .policies{max-width:1200px;margin:16px auto 0;padding:24px 32px 60px}
  .policies .panel details{border:1px solid #e5e7eb;border-radius:10px;padding:14px 18px;margin-top:10px;background:#f8fafc}
  .policies .panel details summary{cursor:pointer;font-weight:700;color:#1e3a8a}
  .policies .panel details p{margin-top:10px;font-size:14px;color:#475569}
  footer{background:#0b1220;color:#94a3b8;padding:32px 32px;text-align:center;font-size:13px;margin-top:20px}
  footer strong{color:#fff}
  footer a{color:#93c5fd}
  @media(max-width:900px){
    .hero,.section,.contato .grid3{grid-template-columns:1fr}
    .stats{grid-template-columns:1fr 1fr}
    .hero h1{font-size:32px}
    .nav ul{display:none}
    .kv-row{grid-template-columns:1fr;gap:2px}
    .panel,.hero .card-left,.card-right{padding:26px 22px}
  }
</style>
</head>
<body>
  <nav class="nav">
    <div class="brand">${esc(nomeFantasia)}</div>
    <ul>
      <li><a href="#inicio">Início</a></li>
      <li><a href="#empresa">Empresa</a></li>
      <li><a href="#atuacao">Atuação</a></li>
      <li><a href="#conformidade">Conformidade</a></li>
      <li><a href="#contato">Contato</a></li>
    </ul>
  </nav>

  <section class="wrap" id="inicio">
    <div class="hero">
      <div class="card-left">
        <span class="chip">✔ Site oficial da empresa</span>
        <h1>${esc(nome)}</h1>
        <p class="lead">${esc(ogDesc)}</p>
        <div class="pill-row">
          ${data.cnpj ? `<span class="pill">CNPJ: ${esc(data.cnpj)}</span>` : ""}
          <span class="pill">Situação: Ativa</span>
          <span class="pill">Desde ${dataAbertura}</span>
          <span class="pill">${esc(cidade)}${uf ? "/" + esc(uf) : ""}</span>
        </div>
        <div class="btn-row">
          <a href="${whatsappLink}" target="_blank" rel="noopener" class="btn btn-primary">Falar no WhatsApp</a>
          <a href="#contato" class="btn btn-ghost">Ver dados completos</a>
        </div>
      </div>

      <div class="card-right">
        <h3>Identificação empresarial</h3>
        <ul>
          <li><strong>Razão social:</strong> ${esc(nome)}</li>
          <li><strong>Nome fantasia:</strong> ${esc(nomeFantasia)}</li>
          <li><strong>CNPJ:</strong> ${esc(data.cnpj || "—")}</li>
          <li><strong>Natureza jurídica:</strong> ${esc(natureza)}</li>
          <li><strong>Porte / Categoria:</strong> Micro Empresa · LTDA</li>
        </ul>
        <div class="mini-grid">
          <div class="mini"><div class="lbl">Abertura</div><div class="val">${dataAbertura}</div></div>
          <div class="mini"><div class="lbl">Capital Social</div><div class="val">${capitalSocial}</div></div>
          <div class="mini"><div class="lbl">Atividade Principal</div><div class="val">${esc((data.atividadePrincipal || segLabel).slice(0, 70))}</div></div>
          <div class="mini"><div class="lbl">Contato</div><div class="val">${esc(data.telefone || data.whatsapp || "—")}</div></div>
        </div>
      </div>
    </div>
  </section>

  <div class="stats">
    <div class="stat"><div class="lbl">CNPJ</div><div class="val">${esc(data.cnpj || "—")}</div></div>
    <div class="stat"><div class="lbl">Situação Cadastral</div><div class="val">Ativa</div></div>
    <div class="stat"><div class="lbl">Data de Abertura</div><div class="val">${dataAbertura}</div></div>
    <div class="stat"><div class="lbl">Endereço</div><div class="val">${esc(cidade)}${uf ? "/" + esc(uf) : ""}</div></div>
  </div>

  <section class="section" id="empresa">
    <div class="panel">
      <h2>Sobre a empresa</h2>
      <p>A ${esc(nome)} mantém este site institucional para apresentar sua identificação empresarial, sua atividade principal e seus canais de contato. Sua atuação está vinculada a <strong>${esc(data.atividadePrincipal || segLabel)}</strong>. O negócio está localizado em ${esc(cidade)}${uf ? "/" + esc(uf) : ""}.</p>
      <ul class="check">
        <li>Identificação jurídica e comercial publicada com razão social e CNPJ em destaque.</li>
        <li>Canal de contato e endereço institucional exibidos para facilitar relacionamento comercial.</li>
        <li>Comunicação digital organizada para apresentar a atuação com clareza e profissionalismo.</li>
      </ul>
    </div>
    <div class="panel" id="atuacao">
      <h2>Resumo empresarial</h2>
      <div class="kv-list">
        <div class="kv-row"><div class="k">Razão social</div><div class="v">${esc(nome)}</div></div>
        <div class="kv-row"><div class="k">Nome fantasia</div><div class="v">${esc(nomeFantasia)}</div></div>
        <div class="kv-row"><div class="k">CNPJ</div><div class="v">${esc(data.cnpj || "—")} · <a href="${cnpjConsultaUrl}" target="_blank" rel="noopener">Consultar</a></div></div>
        <div class="kv-row"><div class="k">Atividade</div><div class="v">${esc(data.atividadePrincipal || segLabel)}</div></div>
        <div class="kv-row"><div class="k">Segmento</div><div class="v">${esc(segLabel)}</div></div>
        <div class="kv-row"><div class="k">Endereço</div><div class="v">${esc(enderecoFull || "—")}</div></div>
      </div>
    </div>
  </section>

  <section class="contato" id="contato">
    <div class="panel">
      <h2>Contato institucional</h2>
      <p>Utilize os canais oficiais abaixo para falar diretamente com a ${esc(nomeFantasia)}.</p>
      <div class="grid3">
        <div class="item"><div class="k">E-mail</div><div class="v">${esc(email)}</div></div>
        ${data.telefone ? `<div class="item"><div class="k">Telefone</div><div class="v">${esc(data.telefone)}</div></div>` : ""}
        ${data.whatsapp ? `<div class="item"><div class="k">WhatsApp</div><div class="v">${esc(data.whatsapp)}</div></div>` : ""}
        <div class="item"><div class="k">Endereço</div><div class="v">${esc(enderecoFull || "—")}</div></div>
        ${data.horario ? `<div class="item"><div class="k">Horário</div><div class="v">${esc(data.horario)}</div></div>` : ""}
        <div class="item"><div class="k">Site</div><div class="v">${esc(siteUrl)}</div></div>
      </div>
      <div class="cta">
        <a href="${whatsappLink}" target="_blank" rel="noopener" class="btn btn-primary">Falar no WhatsApp agora</a>
      </div>
    </div>
  </section>

  <section class="policies" id="conformidade">
    <div class="panel">
      <h2>Conformidade e políticas</h2>
      <details>
        <summary>Política de Privacidade (LGPD)</summary>
        <p>Os dados pessoais coletados são utilizados exclusivamente para prestação dos serviços e cumprimento de obrigações legais. O titular pode solicitar acesso, correção ou exclusão pelo e-mail <a href="mailto:${dpoEmail}">${dpoEmail}</a>.</p>
      </details>
      <details>
        <summary>Termos de Uso</summary>
        <p>Este site é mantido por ${esc(nome)}, CNPJ ${esc(data.cnpj || "—")}, e tem caráter institucional. As informações são publicadas de boa-fé e podem ser atualizadas a qualquer momento.</p>
      </details>
      <details>
        <summary>Política de Cookies</summary>
        <p>Utilizamos cookies essenciais e funcionais para melhorar a navegação e manter o funcionamento do site.</p>
      </details>
    </div>
  </section>

  <footer>
    <p><strong>${esc(nome)}</strong>${data.cnpj ? " · CNPJ " + esc(data.cnpj) : ""}</p>
    <p>${esc(enderecoFull)}</p>
    <p style="margin-top:8px;color:#64748b">© ${ano} ${esc(nome)}. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`;
}
