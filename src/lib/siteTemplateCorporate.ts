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

function parseNaturezaFromCnae(_atividade: string): string {
  return "213-5 - Empresário (Individual)";
}

export function generateSiteHTMLCorporate(data: CompanyData): string {
  const esc = (s: string) => (s || "").replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nome = (data.razaoSocial || "Nome da Empresa").toUpperCase();
  const email = `contato@${data.emailDomain || "empresa.com.br"}`;
  const dpoEmail = `dpo@${data.emailDomain || "empresa.com.br"}`;
  const waDigits = (data.whatsapp || "").replace(/\D/g, "");
  const whatsappLink = waDigits
    ? `https://wa.me/55${waDigits}?text=${encodeURIComponent("Olá, gostaria de falar com a " + data.razaoSocial + ".")}`
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
  const dataAbertura = `01/01/${ano - 2}`;

  const cleanFbTag = normalizeFacebookVerificationTag(data.fbVerificationTag);
  const fbMetaTag = cleanFbTag
    ? `<meta name="facebook-domain-verification" content="${cleanFbTag}" />`
    : "";

  const siteUrl = `https://${domain}`;
  const ogDesc = data.descricao || `${data.razaoSocial} - ${data.atividadePrincipal || segLabel}`;
  const natureza = parseNaturezaFromCnae(data.atividadePrincipal);

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: data.razaoSocial,
    legalName: data.razaoSocial,
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
<title>${esc(data.razaoSocial)} — Dados Institucionais</title>
<meta name="description" content="${esc(ogDesc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(data.razaoSocial)}">
<meta property="og:title" content="${esc(data.razaoSocial)}">
<meta property="og:description" content="${esc(ogDesc)}">
<script type="application/ld+json">${JSON.stringify(orgSchema)}</script>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#f3f4f6;color:#1f2937;line-height:1.55}
  a{color:#1e3a8a;text-decoration:none}
  a:hover{text-decoration:underline}
  .hero{background:#163172;color:#fff;padding:56px 24px 64px;text-align:center}
  .hero h1{font-size:34px;font-weight:800;letter-spacing:.5px;margin-bottom:18px}
  .hero .meta{font-size:15px;margin-top:6px;color:#e5edff}
  .hero .meta strong{color:#fff;font-weight:700;margin-left:4px}
  .container{max-width:980px;margin:-32px auto 0;padding:0 24px 60px}
  .card{background:#fff;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.06);padding:32px 36px;margin-bottom:24px}
  .card h2{color:#163172;font-size:20px;font-weight:800;border-bottom:3px solid #163172;padding-bottom:8px;display:inline-block;margin-bottom:22px}
  table.kv{width:100%;border-collapse:separate;border-spacing:0}
  table.kv tr{}
  table.kv th,table.kv td{padding:16px 20px;vertical-align:top;font-size:15px;text-align:left}
  table.kv th{width:220px;font-weight:700;color:#374151;background:#f3f4f6;border-top-left-radius:6px;border-bottom-left-radius:6px}
  table.kv td{color:#1f2937;background:#fff}
  table.kv tr+tr th,table.kv tr+tr td{border-top:1px solid #e5e7eb}
  table.kv td strong{font-weight:700}
  .contato-card{background:#163172;color:#fff;border-radius:10px;padding:36px 36px;text-align:center}
  .contato-card .item{font-size:17px;margin:8px 0;color:#fff}
  .contato-card .item a{color:#fff;text-decoration:underline}
  .contato-card .btn{display:inline-block;margin-top:18px;background:#22c55e;color:#fff;padding:12px 26px;border-radius:6px;font-weight:700;font-size:15px}
  .contato-card .btn:hover{background:#16a34a;text-decoration:none}
  .politicas details{border:1px solid #e5e7eb;border-radius:6px;padding:14px 18px;margin-top:10px;background:#f9fafb}
  .politicas details summary{cursor:pointer;font-weight:700;color:#163172}
  .politicas details p{margin-top:10px;font-size:14px;color:#4b5563}
  footer{background:#0f172a;color:#9ca3af;padding:26px 24px;text-align:center;font-size:13px}
  footer strong{color:#fff}
  footer a{color:#93c5fd}
  @media(max-width:640px){
    .hero h1{font-size:24px}
    .card{padding:24px 20px}
    table.kv th{width:120px;font-size:13px;padding:12px}
    table.kv td{font-size:13px;padding:12px}
  }
</style>
</head>
<body>
  <section class="hero">
    <h1>${esc(nome)}</h1>
    <div class="meta">CNPJ: <strong>${esc(data.cnpj || "—")}</strong></div>
    <div class="meta">Data de Abertura: <strong>${dataAbertura}</strong></div>
  </section>

  <main class="container">
    <div class="card">
      <h2>Dados Legais</h2>
      <table class="kv">
        <tbody>
          <tr><th>Razão Social</th><td>${esc(data.razaoSocial || "—")}</td></tr>
          <tr><th>CNPJ</th><td><strong>${esc(data.cnpj || "—")}</strong> · <a href="${cnpjConsultaUrl}" target="_blank" rel="noopener">Consulta Receita Federal</a></td></tr>
          <tr><th>Data de Abertura</th><td><strong>${dataAbertura}</strong></td></tr>
          <tr><th>Natureza Jurídica</th><td>${esc(natureza)}</td></tr>
          <tr><th>Atividade</th><td>${esc(data.atividadePrincipal || segLabel)}</td></tr>
          <tr><th>Endereço</th><td>${esc(enderecoFull || "—")}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Sobre a Empresa</h2>
      <p style="font-size:15px;color:#374151;margin-bottom:10px">${esc(ogDesc)}</p>
      <p style="font-size:15px;color:#374151">Empresa regularizada com atuação no segmento de <strong>${esc(segLabel.toLowerCase())}</strong>${cidade !== "Brasil" ? ` em <strong>${esc(cidade)}${uf ? "/" + esc(uf) : ""}</strong>` : ""}. Atendimento direto, transparência e conformidade legal em todas as operações.</p>
    </div>

    <div class="contato-card">
      <h2 style="color:#fff;border-color:#fff;margin-bottom:18px">Contato</h2>
      ${data.telefone ? `<div class="item">${esc(data.telefone)}</div>` : ""}
      ${data.whatsapp ? `<div class="item"><a href="${whatsappLink}" target="_blank" rel="noopener">${esc(data.whatsapp)}</a></div>` : ""}
      <div class="item">${esc(email.toUpperCase())}</div>
      ${data.horario ? `<div class="item" style="font-size:14px;color:#cbd5e1;margin-top:14px">${esc(data.horario)}</div>` : ""}
      ${data.whatsapp ? `<a href="${whatsappLink}" target="_blank" rel="noopener" class="btn">Falar no WhatsApp</a>` : `<a href="mailto:${email}" class="btn">Enviar E-mail</a>`}
    </div>

    <div class="card politicas">
      <h2>Políticas</h2>
      <details>
        <summary>Política de Privacidade (LGPD)</summary>
        <p>Os dados pessoais coletados são utilizados exclusivamente para a prestação dos serviços e cumprimento de obrigações legais. O titular pode solicitar acesso, correção ou exclusão pelo e-mail <a href="mailto:${dpoEmail}">${dpoEmail}</a>.</p>
      </details>
      <details>
        <summary>Termos de Uso</summary>
        <p>Este site é mantido por ${esc(data.razaoSocial)}, CNPJ ${esc(data.cnpj || "—")}, e tem caráter institucional. As informações são de boa-fé e podem ser atualizadas a qualquer momento.</p>
      </details>
    </div>
  </main>

  <footer>
    <p><strong>${esc(data.razaoSocial)}</strong>${data.cnpj ? " · CNPJ " + esc(data.cnpj) : ""}</p>
    <p>${esc(enderecoFull)}</p>
    <p style="margin-top:8px;color:#6b7280">© ${ano} ${esc(data.razaoSocial)}. Todos os direitos reservados.</p>
  </footer>
</body>
</html>`;
}
