export interface CompanyData {
  razaoSocial: string;
  cnpj: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidadeUf: string;
  telefone: string;
  whatsapp: string;
  emailDomain: string;
  atividadePrincipal: string;
  segmento: string;
  descricao: string;
  horario: string;
  fbVerificationTag: string;
  fbFileName?: string;
  fbFileContent?: string;
}

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

const segmentoDescriptions: Record<string, string> = {
  servicos: "Empresa brasileira especializada em prestação de serviços, com foco em qualidade, eficiência e atendimento personalizado.",
  comercio: "Empresa do segmento de comércio e varejo, oferecendo produtos de qualidade com atendimento diferenciado.",
  tecnologia: "Empresa de tecnologia e software, desenvolvendo soluções para transformação digital de negócios.",
  logistica: "Empresa de logística e transporte, com entregas eficientes e seguras em todo o território nacional.",
  industria: "Empresa do setor industrial, com foco em produção de qualidade e processos otimizados.",
  saude: "Empresa do segmento de saúde e bem-estar, promovendo qualidade de vida com excelência no atendimento.",
  educacao: "Instituição comprometida com formação de qualidade e desenvolvimento contínuo.",
  alimentacao: "Empresa do setor de alimentação, oferecendo produtos e serviços gastronômicos de qualidade.",
};

export function getDefaultDescription(segmento: string): string {
  return segmentoDescriptions[segmento] || segmentoDescriptions.servicos;
}

export function normalizeFacebookVerificationTag(value: string): string {
  const trimmed = value.trim();
  const contentMatch = trimmed.match(/content\s*=\s*["']([^"']+)["']/i);
  const rawValue = contentMatch?.[1] ?? trimmed;
  return rawValue.replace(/[<>"']/g, "").replace(/\/\s*$/g, "").trim();
}

export function generateSiteHTML(data: CompanyData): string {
  const esc = (s: string) => (s || "").replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nome = data.razaoSocial || "Nome da Empresa";
  const email = `contato@${data.emailDomain || "empresa.com.br"}`;
  const ouvidoria = `ouvidoria@${data.emailDomain || "empresa.com.br"}`;
  const dpoEmail = `dpo@${data.emailDomain || "empresa.com.br"}`;
  const waDigits = (data.whatsapp || "").replace(/\D/g, "");
  const whatsappLink = waDigits
    ? `https://wa.me/55${waDigits}?text=${encodeURIComponent("Olá, gostaria de falar com a " + nome + ".")}`
    : `mailto:${email}`;
  const segLabel = segmentoLabels[data.segmento] || "Serviços";
  const endereco = [data.logradouro, data.numero].filter(Boolean).join(", ");
  const enderecoCompleto = data.complemento ? `${endereco} - ${data.complemento}` : endereco;
  const cidade = (data.cidadeUf || "").split("-")[0]?.trim() || "Brasil";
  const uf = (data.cidadeUf || "").split("-")[1]?.trim() || "";
  const domain = data.emailDomain || "empresa.com.br";
  const cnpjDigits = (data.cnpj || "").replace(/\D/g, "");
  const cnpjConsultaUrl = cnpjDigits
    ? `https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp?cnpj=${cnpjDigits}`
    : "https://solucoes.receita.fazenda.gov.br/Servicos/cnpjreva/Cnpjreva_Solicitacao.asp";
  const ano = new Date().getFullYear();
  const anoFundacao = ano - 6;

  const cleanFbTag = normalizeFacebookVerificationTag(data.fbVerificationTag);
  const fbMetaTag = cleanFbTag
    ? `<meta name="facebook-domain-verification" content="${cleanFbTag}" />`
    : "";

  const siteUrl = `https://${domain}`;
  const ogDesc = data.descricao || segmentoDescriptions[data.segmento] || segmentoDescriptions.servicos;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: nome,
    legalName: nome,
    description: ogDesc,
    url: siteUrl,
    email,
    telephone: data.telefone || undefined,
    taxID: data.cnpj || undefined,
    foundingDate: `${anoFundacao}-01-01`,
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
    <meta name="author" content="${esc(nome)}">
    <title>${esc(nome)} — ${esc(segLabel)}${cidade !== "Brasil" ? " · " + esc(cidade) : ""}</title>
    <meta name="description" content="${esc(ogDesc)}">
    <meta property="og:type" content="website">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:site_name" content="${esc(nome)}">
    <meta property="og:title" content="${esc(nome)}">
    <meta property="og:description" content="${esc(ogDesc)}">
    <script type="application/ld+json">${JSON.stringify(localBusiness)}</script>
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#1f1f1f;background:#fff;line-height:1.6;font-size:16px}
        .container{max-width:1000px;margin:0 auto;padding:0 24px}
        a{color:#0a4d8c;text-decoration:none}
        a:hover{text-decoration:underline}
        .topbar{background:#1f1f1f;color:#ddd;font-size:13px;padding:8px 0}
        .topbar-row{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}
        .topbar a{color:#9cc3ed}
        header{background:#fff;border-bottom:1px solid #e5e5e5;padding:18px 0;position:sticky;top:0;z-index:10}
        .header-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px}
        .brand{font-size:20px;font-weight:700;color:#1f1f1f}
        .brand small{display:block;font-size:12px;color:#666;font-weight:400;margin-top:2px}
        nav a{color:#444;margin-left:20px;font-size:14px}
        .hero{padding:56px 0 40px;border-bottom:1px solid #eee;background:#fafafa}
        .hero h1{font-size:30px;font-weight:700;margin-bottom:14px;color:#1f1f1f;line-height:1.25}
        .hero p{font-size:17px;color:#555;max-width:720px}
        .btn{display:inline-block;background:#0a4d8c;color:#fff;padding:11px 22px;border-radius:4px;font-weight:600;font-size:15px;margin-top:22px}
        .btn:hover{background:#083d6f;text-decoration:none;color:#fff}
        section{padding:48px 0;border-bottom:1px solid #eee}
        section h2{font-size:22px;font-weight:700;margin-bottom:18px;color:#1f1f1f}
        section h3{font-size:17px;font-weight:600;margin:18px 0 8px;color:#1f1f1f}
        section p{margin-bottom:14px;color:#444;max-width:780px}
        .info-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:15px}
        .info-table th,.info-table td{text-align:left;padding:12px 14px;border-bottom:1px solid #eee;vertical-align:top}
        .info-table th{width:210px;color:#555;font-weight:600;background:#fafafa}
        .info-table td{color:#1f1f1f}
        .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:18px}
        .card{border:1px solid #e5e5e5;border-radius:6px;padding:20px;background:#fff}
        .card h4{font-size:15px;font-weight:700;margin-bottom:8px;color:#1f1f1f}
        .card p{font-size:14px;color:#555;margin-bottom:0}
        ul.bullets{list-style:disc;padding-left:22px;color:#444}
        ul.bullets li{margin-bottom:8px}
        details{border:1px solid #e5e5e5;border-radius:6px;padding:14px 18px;margin-top:10px;background:#fafafa}
        details summary{cursor:pointer;font-weight:600;color:#1f1f1f;font-size:14px}
        details[open]{background:#fff}
        details p{font-size:13.5px;color:#555;margin:10px 0 0;line-height:1.65}
        footer{background:#1f1f1f;color:#bbb;padding:32px 0;font-size:13px}
        footer .container{max-width:1000px}
        footer p{margin-bottom:6px}
        footer strong{color:#fff}
        footer a{color:#9cc3ed}
        @media(max-width:640px){
            .hero h1{font-size:24px}
            .info-table th{width:140px;font-size:13px}
            nav a{margin-left:12px;font-size:13px}
            .grid-2{grid-template-columns:1fr}
            .topbar-row{font-size:12px}
        }
    </style>
</head>
<body>
    <div class="topbar">
        <div class="container topbar-row">
            <span>CNPJ <a href="${cnpjConsultaUrl}" target="_blank" rel="noopener">${esc(data.cnpj || "—")}</a></span>
            <span>${esc(data.horario || "Seg a Sex · 09h às 18h")} · <a href="mailto:${email}">${email}</a></span>
        </div>
    </div>

    <header>
        <div class="container header-row">
            <div class="brand">
                ${esc(nome)}
                <small>${esc(segLabel)}${cidade !== "Brasil" ? " · " + esc(cidade) + (uf ? "/" + esc(uf) : "") : ""}</small>
            </div>
            <nav>
                <a href="#sobre">Sobre</a>
                <a href="#servicos">Serviços</a>
                <a href="#empresa">Dados</a>
                <a href="#politicas">Políticas</a>
                <a href="#contato">Contato</a>
            </nav>
        </div>
    </header>

    <main>
        <section class="hero">
            <div class="container">
                <h1>${esc(nome)}</h1>
                <p>${esc(ogDesc)}</p>
                <a href="${whatsappLink}" target="_blank" rel="noopener" class="btn">Entrar em contato</a>
            </div>
        </section>

        <section id="sobre">
            <div class="container">
                <h2>Sobre a empresa</h2>
                <p>A <strong>${esc(nome)}</strong> é uma empresa brasileira do segmento de ${esc(segLabel.toLowerCase())}, com sede em ${esc(cidade)}${uf ? "/" + esc(uf) : ""} e atendimento em todo o território nacional. Atuamos com foco em qualidade, atendimento direto e transparência em todas as etapas.</p>
                <p>Nossa operação está devidamente registrada junto aos órgãos competentes. Os dados cadastrais da empresa podem ser consultados publicamente na Receita Federal através do CNPJ informado nesta página.</p>
            </div>
        </section>

        <section id="servicos">
            <div class="container">
                <h2>Atuação e serviços</h2>
                <p>Atendimento empresarial e particular no segmento de ${esc(segLabel.toLowerCase())}:</p>
                <ul class="bullets">
                    <li>${esc(data.atividadePrincipal || "Atendimento especializado em " + segLabel.toLowerCase())}</li>
                    <li>Consultoria e orientação personalizada</li>
                    <li>Suporte por e-mail, telefone e WhatsApp em horário comercial</li>
                    <li>Atendimento corporativo com proposta formal e contrato</li>
                </ul>
                <div class="grid-2">
                    <div class="card"><h4>Atendimento direto</h4><p>Ponto focal único, sem terceirizações, com resposta em até 24h úteis.</p></div>
                    <div class="card"><h4>Processos transparentes</h4><p>Escopo, prazos e valores definidos por contrato e nota fiscal.</p></div>
                    <div class="card"><h4>Continuidade operacional</h4><p>Suporte após a entrega, com SLA e relacionamento de longo prazo.</p></div>
                    <div class="card"><h4>Conformidade legal</h4><p>Operação regularizada, em conformidade com a legislação brasileira aplicável.</p></div>
                </div>
            </div>
        </section>

        <section id="empresa">
            <div class="container">
                <h2>Dados institucionais</h2>
                <p>Documentação corporativa pública. Os dados abaixo podem ser conferidos diretamente nos órgãos oficiais.</p>
                <table class="info-table">
                    <tbody>
                        <tr><th>Razão social</th><td>${esc(nome)}</td></tr>
                        <tr><th>CNPJ</th><td><a href="${cnpjConsultaUrl}" target="_blank" rel="noopener">${esc(data.cnpj || "—")}</a><br><small style="color:#777">Clique para consulta pública na Receita Federal</small></td></tr>
                        <tr><th>Atividade principal</th><td>${esc(data.atividadePrincipal || segLabel)}</td></tr>
                        <tr><th>Endereço</th><td>${esc(enderecoCompleto || "—")}${data.bairro ? "<br>" + esc(data.bairro) : ""}<br>${esc(cidade)}${uf ? " - " + esc(uf) : ""}${data.cep ? " · CEP " + esc(data.cep) : ""}</td></tr>
                        <tr><th>Início das atividades</th><td>${anoFundacao}</td></tr>
                        <tr><th>Cobertura</th><td>Atendimento em todo o território nacional</td></tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section id="contato">
            <div class="container">
                <h2>Canais de atendimento</h2>
                <table class="info-table">
                    <tbody>
                        <tr><th>Telefone</th><td>${esc(data.telefone || "—")}</td></tr>
                        <tr><th>WhatsApp</th><td>${data.whatsapp ? `<a href="${whatsappLink}" target="_blank" rel="noopener">${esc(data.whatsapp)}</a>` : "—"}</td></tr>
                        <tr><th>E-mail comercial</th><td><a href="mailto:${email}">${email}</a></td></tr>
                        <tr><th>Ouvidoria</th><td><a href="mailto:${ouvidoria}">${ouvidoria}</a></td></tr>
                        <tr><th>Encarregado de dados (DPO)</th><td><a href="mailto:${dpoEmail}">${dpoEmail}</a></td></tr>
                        <tr><th>Horário de atendimento</th><td>${esc(data.horario || "Segunda a sexta, das 09h às 18h")}</td></tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section id="politicas">
            <div class="container">
                <h2>Políticas e conformidade</h2>
                <p>A ${esc(nome)} atua em conformidade com a legislação brasileira, incluindo a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e o Código de Defesa do Consumidor.</p>

                <details>
                    <summary>Política de Privacidade (LGPD)</summary>
                    <p>Os dados pessoais coletados pela ${esc(nome)} são utilizados exclusivamente para finalidades relacionadas à prestação dos serviços, comunicação com clientes e cumprimento de obrigações legais. Não compartilhamos dados com terceiros sem base legal. O titular pode, a qualquer momento, solicitar acesso, correção ou exclusão de seus dados pelo e-mail <a href="mailto:${dpoEmail}">${dpoEmail}</a>.</p>
                </details>

                <details>
                    <summary>Termos de Uso</summary>
                    <p>Este site é mantido pela ${esc(nome)}, CNPJ ${esc(data.cnpj || "—")}, e tem caráter institucional. As informações apresentadas são de boa-fé e podem ser atualizadas a qualquer momento. O uso indevido das informações, marca ou conteúdo deste site sujeita o infrator às sanções legais cabíveis.</p>
                </details>

                <details>
                    <summary>Ouvidoria e atendimento ao consumidor</summary>
                    <p>Manifestações, dúvidas, reclamações ou sugestões podem ser encaminhadas para <a href="mailto:${ouvidoria}">${ouvidoria}</a>. O prazo de resposta é de até 5 dias úteis, conforme as melhores práticas de atendimento ao consumidor.</p>
                </details>
            </div>
        </section>
    </main>

    <footer>
        <div class="container">
            <p><strong>${esc(nome)}</strong>${data.cnpj ? " · CNPJ " + esc(data.cnpj) : ""}</p>
            <p>${esc(enderecoCompleto)}${enderecoCompleto && cidade ? " · " : ""}${esc(cidade)}${uf ? "/" + esc(uf) : ""}${data.cep ? " · CEP " + esc(data.cep) : ""}</p>
            <p><a href="mailto:${email}">${email}</a>${data.telefone ? " · " + esc(data.telefone) : ""}</p>
            <p style="margin-top:14px;color:#888">© ${ano} ${esc(nome)}. Todos os direitos reservados.</p>
        </div>
    </footer>
</body>
</html>`;
}
