import { useState } from "react";
import { CompanyData, normalizeFacebookVerificationTag } from "@/lib/siteTemplate";
import { TEMPLATE_LIST, TemplateId } from "@/lib/templates";
import { parseCnpjDump } from "@/lib/parseCnpjData";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    if (!value) {
      toast.error("Campo vazio");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      title="Copiar"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function LabelRow({ children, value }: { children: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="nexus-label">{children}</label>
      <CopyBtn value={value} />
    </div>
  );
}

interface Props {
  data: CompanyData;
  onChange: (data: CompanyData) => void;
  onGenerate: () => void;
  onClear: () => void;
  onDownload: () => void;
  onPublish: (projectName: string, provider: "vercel" | "cloudflare" | "render", customDomain?: string) => void;
  isPublishing: boolean;
  publishedUrl: string | null;
  projectName: string;
  defaultProjectName?: string;
  onProjectNameChange: (value: string) => void;
  provider: "vercel" | "cloudflare" | "render";
  onProviderChange: (provider: "vercel" | "cloudflare" | "render") => void;
  templateId: TemplateId;
  onTemplateChange: (id: TemplateId) => void;
}

const CUSTOM_DOMAIN = "batba.com.br";

export default function GeneratorForm({ data, onChange, onGenerate, onClear, onDownload, onPublish, isPublishing, publishedUrl, projectName, defaultProjectName, onProjectNameChange, provider, onProviderChange, templateId, onTemplateChange }: Props) {
  const set = (key: keyof CompanyData, value: string) => onChange({ ...data, [key]: value });
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [cnpjLookup, setCnpjLookup] = useState("");
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [useCustomDomain, setUseCustomDomain] = useState(true);

  const triggerPublish = () => {
    const normalizedProjectName = projectName.trim();
    if (!normalizedProjectName) {
      toast.error("Informe o nome do site antes de publicar");
      return;
    }

    const customDomain = provider === "cloudflare" && useCustomDomain ? CUSTOM_DOMAIN : undefined;
    onPublish(normalizedProjectName, provider, customDomain);
  };


  const lookupCnpj = async () => {
    const digits = cnpjLookup.replace(/\D/g, "");
    if (digits.length !== 14) {
      toast.error("CNPJ inválido. Digite os 14 dígitos.");
      return;
    }
    setCnpjLoading(true);
    try {
      // Busca em duas fontes públicas em paralelo e mescla pra cobrir campos faltantes
      const [brRes, wsRes] = await Promise.allSettled([
        fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`).then(r => r.ok ? r.json() : null),
        fetch(`https://publica.cnpj.ws/cnpj/${digits}`).then(r => r.ok ? r.json() : null),
      ]);
      const br = brRes.status === "fulfilled" ? brRes.value : null;
      const ws = wsRes.status === "fulfilled" ? wsRes.value : null;
      if (!br && !ws) {
        toast.error("CNPJ não encontrado");
        return;
      }
      const est = ws?.estabelecimento || {};

      const pick = (...vals: (string | undefined | null)[]) =>
        vals.map(v => (v ?? "").toString().trim()).find(v => v.length > 0) || "";

      const cnpjFormatted = digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

      const cepRaw = pick(br?.cep, est.cep);
      const cep = cepRaw.replace(/\D/g, "").replace(/^(\d{5})(\d{3})$/, "$1-$2");

      const tipoLog = pick(br?.descricao_tipo_de_logradouro, est.tipo_logradouro);
      const logradouroNome = pick(br?.logradouro, est.logradouro);
      const logradouro = [tipoLog, logradouroNome].filter(Boolean).join(" ");

      const cidade = pick(br?.municipio, est.cidade?.nome);
      const uf = pick(br?.uf, est.estado?.sigla);
      const cidadeUf = cidade && uf ? `${cidade} - ${uf}` : "";

      const formatTel = (d: string) => {
        const c = d.replace(/\D/g, "");
        if (c.length === 10) return c.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
        if (c.length === 11) return c.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
        return "";
      };
      const tel1 = pick(br?.ddd_telefone_1, est.ddd1 && est.telefone1 ? `${est.ddd1}${est.telefone1}` : "");
      const tel2 = pick(br?.ddd_telefone_2, est.ddd2 && est.telefone2 ? `${est.ddd2}${est.telefone2}` : "");
      const telefone = formatTel(tel1) || formatTel(tel2);
      const whatsapp = formatTel(tel2) && formatTel(tel2) !== telefone ? formatTel(tel2) : "";

      const email = pick(br?.email, est.email).toLowerCase();
      const emailDomain = email.includes("@") ? email.split("@")[1] : "";

      const cnaeCod = pick(br?.cnae_fiscal?.toString(), est.atividade_principal?.id);
      const cnaeDesc = pick(br?.cnae_fiscal_descricao, est.atividade_principal?.descricao);
      const cnae = cnaeDesc ? (cnaeCod ? `${cnaeCod} - ${cnaeDesc}` : cnaeDesc) : "";

      onChange({
        ...data,
        cnpj: cnpjFormatted,
        razaoSocial: pick(br?.razao_social, ws?.razao_social) || data.razaoSocial,
        cep: cep || data.cep,
        logradouro: logradouro || data.logradouro,
        numero: pick(br?.numero, est.numero) || data.numero,
        complemento: pick(br?.complemento, est.complemento) || data.complemento,
        bairro: pick(br?.bairro, est.bairro) || data.bairro,
        cidadeUf: cidadeUf || data.cidadeUf,
        telefone: telefone || data.telefone,
        whatsapp: whatsapp || data.whatsapp,
        emailDomain: emailDomain || data.emailDomain,
        atividadePrincipal: cnae || data.atividadePrincipal,
      });
      toast.success("Dados preenchidos automaticamente!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao consultar CNPJ");
    } finally {
      setCnpjLoading(false);
    }
  };


  const handleImport = () => {
    const parsed = parseCnpjDump(importText);
    const filledKeys = Object.keys(parsed).filter(k => (parsed as Record<string, string>)[k]);
    if (filledKeys.length === 0) {
      toast.error("Não consegui identificar nenhum campo. Confira o formato (chave: valor).");
      return;
    }
    onChange({ ...data, ...parsed });
    toast.success(`${filledKeys.length} campos preenchidos automaticamente`);
    setImportOpen(false);
    setImportText("");
  };

  const formatCnpj = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 14);
    return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  };

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 10);
    if (d.length <= 2) return d.replace(/^(\d{2})/, "($1");
    return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  };

  const formatWhatsapp = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d.replace(/^(\d{2})/, "($1");
    return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  };

  const formatCep = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.replace(/^(\d{5})(\d)/, "$1-$2");
  };

  const fetchCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) return;
      const json = await res.json();
      if (json.erro === true || json.erro === "true") return;
      onChange({
        ...data,
        cep,
        logradouro: json.logradouro || data.logradouro,
        bairro: json.bairro || data.bairro,
        cidadeUf: json.localidade && json.uf ? `${json.localidade} - ${json.uf}` : data.cidadeUf,
        complemento: json.complemento || data.complemento,
      });
    } catch (err) {
      console.error("Erro ao buscar CEP:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Configuração do negócio</h2>
        <p className="text-sm text-muted-foreground">Preencha os dados oficiais da empresa para a GENESIS AI gerar o site.</p>
      </div>

      <div className="rounded-lg border border-primary/40 bg-primary/5 p-3 space-y-2">
        <label className="nexus-label">🔎 Consultar CNPJ (preenchimento automático)</label>
        <div className="flex gap-2">
          <input
            className="nexus-input"
            placeholder="00.000.000/0000-00"
            maxLength={18}
            value={cnpjLookup}
            onChange={e => setCnpjLookup(formatCnpj(e.target.value))}
            onKeyDown={e => { if (e.key === "Enter") lookupCnpj(); }}
          />
          <button
            type="button"
            onClick={lookupCnpj}
            disabled={cnpjLoading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
          >
            {cnpjLoading ? "Buscando..." : "Buscar"}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">Consulta pública via BrasilAPI. Preenche razão social, endereço, telefone e atividade.</p>
      </div>

      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
        <button
          type="button"
          onClick={() => setImportOpen(v => !v)}
          className="flex w-full items-center justify-between text-left text-sm font-semibold text-primary"
        >
          <span>📋 Importar dados (colar consulta de CNPJ)</span>
          <span className="text-xs">{importOpen ? "▲" : "▼"}</span>
        </button>
        {importOpen && (
          <div className="mt-3 space-y-2">
            <textarea
              className="nexus-textarea font-mono text-xs"
              rows={10}
              placeholder={"Cole aqui o bloco completo. Ex:\n\nCNPJ:\n98762115000118\nRazão Social:\nIGREJA BATISTA...\nLogradouro:\nRUA NOROEGA\nNúmero:\n160\nBairro:\nVILA PASSO FEIJO\nCEP:\n94810-390\nMunicipio:\nALVORADA\nEstado:\nRS\nCNAE Principal:\n9491000 - Atividades de organizações religiosas"}
              value={importText}
              onChange={e => setImportText(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                ✨ Preencher campos automaticamente
              </button>
              <button
                onClick={() => { setImportText(""); }}
                className="rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
              >
                Limpar
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Aceita formato "Chave: valor" ou "Chave:" com o valor na linha seguinte. Reconhece CNPJ, Razão Social, Nome Fantasia, CEP, Logradouro, Número, Complemento, Bairro, Município, Estado, Telefone, WhatsApp, Email e CNAE Principal.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <LabelRow value={data.razaoSocial}>Razão Social</LabelRow>
          <input className="nexus-input" placeholder="Ex: Silva & Santos LTDA" value={data.razaoSocial} onChange={e => set("razaoSocial", e.target.value)} />
        </div>

        <div>
          <LabelRow value={data.cnpj}>CNPJ</LabelRow>
          <input className="nexus-input" placeholder="00.000.000/0000-00" maxLength={18} value={data.cnpj} onChange={e => set("cnpj", formatCnpj(e.target.value))} />
        </div>
        <div>
          <LabelRow value={data.cep}>CEP</LabelRow>
          <input className="nexus-input" placeholder="00000-000" maxLength={9} value={data.cep} onChange={e => { const formatted = formatCep(e.target.value); set("cep", formatted); fetchCep(formatted); }} />
        </div>

        <div className="col-span-2 grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <LabelRow value={data.logradouro}>Logradouro</LabelRow>
            <input className="nexus-input" placeholder="Rua, Av..." value={data.logradouro} onChange={e => set("logradouro", e.target.value)} />
          </div>
          <div>
            <LabelRow value={data.numero}>Nº</LabelRow>
            <input className="nexus-input" value={data.numero} onChange={e => set("numero", e.target.value)} />
          </div>
        </div>

        <div className="col-span-2">
          <LabelRow value={data.complemento}>Complemento</LabelRow>
          <input className="nexus-input" placeholder="Sala, Andar, Bloco..." value={data.complemento} onChange={e => set("complemento", e.target.value)} />
        </div>

        <div>
          <LabelRow value={data.bairro}>Bairro</LabelRow>
          <input className="nexus-input" placeholder="Bairro" value={data.bairro} onChange={e => set("bairro", e.target.value)} />
        </div>
        <div>
          <LabelRow value={data.cidadeUf}>Cidade / UF</LabelRow>
          <input className="nexus-input" placeholder="Cidade - UF" value={data.cidadeUf} onChange={e => set("cidadeUf", e.target.value)} />
        </div>

        <div>
          <LabelRow value={data.telefone}>Telefone</LabelRow>
          <input className="nexus-input" placeholder="(00) 0000-0000" maxLength={14} value={data.telefone} onChange={e => set("telefone", formatPhone(e.target.value))} />
        </div>
        <div>
          <LabelRow value={data.whatsapp}>WhatsApp</LabelRow>
          <input className="nexus-input" placeholder="(00) 00000-0000" maxLength={15} value={data.whatsapp} onChange={e => set("whatsapp", formatWhatsapp(e.target.value))} />
        </div>

        <div className="col-span-2">
          <LabelRow value={data.emailDomain ? `contato@${data.emailDomain}` : ""}>Domínio do E-mail</LabelRow>
          <div className="flex items-center gap-2">
            <span className="whitespace-nowrap text-sm text-muted-foreground">contato@</span>
            <input className="nexus-input" placeholder="empresa.com.br" value={data.emailDomain} onChange={e => set("emailDomain", e.target.value)} />
          </div>
        </div>

        <div className="col-span-2">
          <LabelRow value={data.atividadePrincipal}>Atividade Principal / CNAE</LabelRow>
          <input className="nexus-input" placeholder="Ex: Comércio varejista de artigos de vestuário" value={data.atividadePrincipal} onChange={e => set("atividadePrincipal", e.target.value)} />
        </div>

        <div className="col-span-2">
          <label className="nexus-label">
            Segmento <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground">(para geração de conteúdo)</span>
          </label>
          <select className="nexus-select" value={data.segmento} onChange={e => set("segmento", e.target.value)}>
            <option value="servicos">Prestação de Serviços</option>
            <option value="comercio">Comércio / Varejo</option>
            <option value="tecnologia">Tecnologia / Software</option>
            <option value="logistica">Logística / Transporte</option>
            <option value="industria">Indústria / Produção</option>
            <option value="saude">Saúde / Bem-estar</option>
            <option value="educacao">Educação / Ensino</option>
            <option value="alimentacao">Alimentação / Food Service</option>
          </select>
        </div>

        <div className="col-span-2">
          <LabelRow value={data.descricao}>
            Descrição Resumida <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground">(gerada automaticamente)</span>
          </LabelRow>
          <textarea className="nexus-textarea" rows={3} value={data.descricao} onChange={e => set("descricao", e.target.value)} />
        </div>

        <div className="col-span-2">
          <LabelRow value={data.horario}>Horário de Atendimento</LabelRow>
          <input className="nexus-input" value={data.horario} onChange={e => set("horario", e.target.value)} />
        </div>

        <div className="col-span-2">
          <LabelRow value={data.fbVerificationTag}>
            Meta Tag Facebook BM <span className="text-xs font-normal normal-case tracking-normal text-muted-foreground">(verificação de domínio)</span>
          </LabelRow>
          <input
            className="nexus-input"
            placeholder='Cole o content ou a tag completa do Facebook'
            value={data.fbVerificationTag}
            onChange={e => {
              set("fbVerificationTag", normalizeFacebookVerificationTag(e.target.value));
            }}
          />
          <p className="text-[11px] text-muted-foreground mt-1">Cole a tag completa ou só o valor do content. Ex: 17rv51i8bagplkgqz66izcz6xu9dt3</p>
        </div>

        <div className="col-span-2 rounded-lg border border-dashed border-border p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📄 Arquivo HTML Facebook (método alternativo)</p>
          <p className="text-[11px] text-muted-foreground">Se o meta tag falhar, use o método de arquivo. Baixe o `.html` no Business Manager, abra em bloco de notas e cole abaixo:</p>
          <div>
            <label className="nexus-label">Nome do arquivo</label>
            <input
              className="nexus-input"
              placeholder="ex: 1a2b3c4d5e6f.html"
              value={data.fbFileName || ""}
              onChange={e => set("fbFileName", e.target.value.trim().replace(/[^a-zA-Z0-9._-]/g, ""))}
            />
          </div>
          <div>
            <label className="nexus-label">Conteúdo do arquivo</label>
            <input
              className="nexus-input"
              placeholder="ex: 1a2b3c4d5e6f"
              value={data.fbFileContent || ""}
              onChange={e => set("fbFileContent", e.target.value.trim())}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={onClear} className="rounded-lg bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground transition-colors hover:bg-secondary/80">
          Limpar
        </button>
        <button onClick={onGenerate} className="rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90">
          Gerar Página
        </button>
      </div>

      <button onClick={onDownload} className="w-full rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
        ⬇ Download .ZIP
      </button>

      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        <label className="nexus-label">🎨 Template do Site</label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_LIST.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTemplateChange(t.id)}
              className={`rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                templateId === t.id
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className="block">{t.emoji} {t.label}</span>
              <span className="block text-[10px] font-normal opacity-70 mt-0.5">{t.description}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">O template escolhido é usado no preview, download e publicação.</p>
      </div>

      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <label className="nexus-label">Publicar site</label>

        <div>
          <label className="nexus-label">Provedor de Hospedagem</label>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">

            <button
              type="button"
              onClick={() => onProviderChange("cloudflare")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                provider === "cloudflare"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              ☁ Cloudflare
              <span className="block text-[10px] font-normal opacity-70">.pages.dev</span>
            </button>
            <button
              type="button"
              onClick={() => onProviderChange("vercel")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                provider === "vercel"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              ▲ Vercel
              <span className="block text-[10px] font-normal opacity-70">.vercel.app</span>
            </button>
            <button
              type="button"
              onClick={() => onProviderChange("render")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                provider === "render"
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              🟣 Render
              <span className="block text-[10px] font-normal opacity-70">.onrender.com</span>
            </button>
          </div>

        </div>

        <div className="flex gap-2">
          <input
            id="project-name"
            className="nexus-input"
            placeholder="nome-do-site (sem espaços)"
            value={projectName}
            onChange={e => onProjectNameChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                triggerPublish();
              }
            }}
          />
        </div>
        {defaultProjectName && (
          <p className="text-[11px] text-muted-foreground">Ao editar um site publicado, o mesmo nome do projeto é reutilizado para atualizar a publicação existente.</p>
        )}
        <p className="text-xs text-muted-foreground">
          O site ficará em <strong>{
            provider === "vercel" ? `${projectName || "nome-do-site"}.vercel.app` :
            provider === "cloudflare" ? (useCustomDomain ? `${projectName || "nome-do-site"}.${CUSTOM_DOMAIN}` : `${projectName || "nome-do-site"}.pages.dev`) :
            `site-${projectName || "nome-do-site"}.onrender.com`
          }</strong>
        </p>

        {provider === "cloudflare" && (
          <label className="flex items-start gap-2 rounded-md border border-emerald-700/40 bg-emerald-950/30 p-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={useCustomDomain}
              onChange={e => setUseCustomDomain(e.target.checked)}
              className="mt-0.5"
            />
            <div className="text-xs">
              <p className="font-semibold text-emerald-300">✅ Usar domínio próprio ({CUSTOM_DOMAIN})</p>
              <p className="text-emerald-200/70 mt-0.5">Aceito pelo Facebook Business. SSL leva 1-2 min pra ativar após publicar.</p>
            </div>
          </label>
        )}




        <div className="flex gap-2">
          <button
            disabled={isPublishing}
            onClick={triggerPublish}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {isPublishing ? "Publicando..." : "🚀 Publicar"}
          </button>
          <button
            disabled={isPublishing}
            onClick={triggerPublish}
            className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-amber-700 disabled:opacity-50"
          >
            {isPublishing ? "Atualizando..." : "🔄 Atualizar"}
          </button>
        </div>

        {publishedUrl && (
          <div className="rounded-md bg-emerald-950/50 border border-emerald-700 p-3 space-y-2">
            <p className="text-sm font-medium text-emerald-400">✅ Site publicado!</p>
            <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-300 underline break-all block">
              {publishedUrl}
            </a>

            {data.fbVerificationTag && (
              <div className="mt-2 rounded-md bg-blue-950/40 border border-blue-700 p-2.5 space-y-1.5">
                <p className="text-xs font-semibold text-blue-300">📘 Meta tag do Facebook embutida no site</p>
                <p className="text-[11px] text-blue-200/90">
                  A tag está dentro do HTML em <code className="bg-black/40 px-1 rounded">{publishedUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}</code>.
                </p>
              </div>
            )}

            {!data.fbVerificationTag && (
              <div className="mt-2 rounded-md bg-amber-950/40 border border-amber-700 p-2.5">
                <p className="text-xs text-amber-200">
                  ⚠ Site publicado <strong>sem a meta tag do Facebook</strong>. Cole a tag no campo acima e clique em Atualizar.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
