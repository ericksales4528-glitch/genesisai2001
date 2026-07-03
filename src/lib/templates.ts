import { CompanyData, generateSiteHTML } from "./siteTemplate";
import { generateSiteHTMLCorporate } from "./siteTemplateCorporate";
import { generateSiteHTMLHigioral } from "./siteTemplateHigioral";

export type TemplateId = "institucional" | "corporativo" | "higioral";

export interface TemplateMeta {
  id: TemplateId;
  label: string;
  description: string;
  emoji: string;
  generate: (data: CompanyData) => string;
}

export const TEMPLATES: Record<TemplateId, TemplateMeta> = {
  institucional: {
    id: "institucional",
    label: "Institucional Clássico",
    description: "Layout editorial com seções, tabelas e políticas",
    emoji: "📄",
    generate: generateSiteHTML,
  },
  corporativo: {
    id: "corporativo",
    label: "Corporativo Azul",
    description: "Header azul, cards de Dados Legais e Contato",
    emoji: "🏢",
    generate: generateSiteHTMLCorporate,
  },
  higioral: {
    id: "higioral",
    label: "Split Institucional",
    description: "Hero em 2 colunas com card azul gradiente e mini-cards",
    emoji: "💠",
    generate: generateSiteHTMLHigioral,
  },
};

export const TEMPLATE_LIST: TemplateMeta[] = [TEMPLATES.higioral, TEMPLATES.institucional, TEMPLATES.corporativo];

export function renderTemplate(templateId: TemplateId, data: CompanyData): string {
  return (TEMPLATES[templateId] ?? TEMPLATES.institucional).generate(data);
}

