import { CompanyData } from "./siteTemplate";

const segmentoFromCnae = (cnae: string): string => {
  const c = cnae.toLowerCase();
  if (/saúde|saude|hospital|clínic|odonto|farm/.test(c)) return "saude";
  if (/educa|ensino|escola|curso/.test(c)) return "educacao";
  if (/aliment|restaurante|lanchonete|food|padaria|bar /.test(c)) return "alimentacao";
  if (/tecnolog|software|sistemas|informática|informatica|ti /.test(c)) return "tecnologia";
  if (/logístic|logistic|transporte|frete|entrega/.test(c)) return "logistica";
  if (/indúst|indust|fabrica|produção|producao/.test(c)) return "industria";
  if (/comérc|comerc|varejo|atacad|loja/.test(c)) return "comercio";
  return "servicos";
};

const formatCnpj = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 14);
  if (d.length !== 14) return v.trim();
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

const formatCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length !== 8) return v.trim();
  return d.replace(/^(\d{5})(\d{3})$/, "$1-$2");
};

const formatPhone = (v: string) => {
  const d = v.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return v.trim();
};

/**
 * Parse free-form CNPJ dump (chave: valor por linha) e devolve dados parciais.
 */
export function parseCnpjDump(raw: string): Partial<CompanyData> {
  const lines = raw.split(/\r?\n/).map(l => l.trim());
  const map: Record<string, string> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    // formato "chave: valor" inline
    const inline = line.match(/^([^:]{2,60}):\s*(.+)$/);
    if (inline) {
      map[inline[1].trim().toLowerCase()] = inline[2].trim();
      continue;
    }
    // formato "chave:" e valor na próxima linha não-vazia
    if (line.endsWith(":")) {
      const key = line.slice(0, -1).trim().toLowerCase();
      let j = i + 1;
      while (j < lines.length && !lines[j]) j++;
      if (j < lines.length && !lines[j].endsWith(":") && !lines[j].match(/^[^:]{2,60}:\s*.+$/)) {
        map[key] = lines[j].trim();
        i = j;
      } else {
        map[key] = "";
      }
    }
  }

  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const v = map[k.toLowerCase()];
      if (v && v !== "-") return v;
    }
    return "";
  };

  const cnae = get("cnae principal", "cnae", "atividade principal");
  const municipio = get("municipio", "município", "cidade");
  const estado = get("estado", "uf");
  const cidadeUf = municipio && estado ? `${municipio} - ${estado}` : municipio;
  const telefone = get("telefone", "fone");
  const whatsapp = get("whatsapp", "celular") || telefone;
  const email = get("email", "e-mail");
  const emailDomain = email.includes("@") ? email.split("@")[1] : "";

  const result: Partial<CompanyData> = {};
  const razao = get("razão social", "razao social", "nome empresarial");
  const fantasia = get("nome fantasia");
  if (razao) result.razaoSocial = fantasia && fantasia !== "-" ? fantasia : razao;
  const cnpj = get("cnpj");
  if (cnpj) result.cnpj = formatCnpj(cnpj);
  const cep = get("cep");
  if (cep) result.cep = formatCep(cep);
  const logr = get("logradouro", "endereço", "endereco");
  if (logr) result.logradouro = logr;
  const numero = get("número", "numero", "nº", "n°");
  if (numero) result.numero = numero;
  const complemento = get("complemento");
  if (complemento) result.complemento = complemento;
  const bairro = get("bairro");
  if (bairro) result.bairro = bairro;
  if (cidadeUf) result.cidadeUf = cidadeUf;
  if (telefone) result.telefone = formatPhone(telefone);
  if (whatsapp) result.whatsapp = formatPhone(whatsapp);
  if (emailDomain) result.emailDomain = emailDomain;
  if (cnae) {
    result.atividadePrincipal = cnae;
    result.segmento = segmentoFromCnae(cnae);
  }

  return result;
}
