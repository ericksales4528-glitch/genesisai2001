import { useState, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { supabase } from "@/integrations/supabase/client";
import GeneratorForm from "@/components/GeneratorForm";
import PreviewPanel from "@/components/PreviewPanel";
import { CompanyData, getDefaultDescription, normalizeFacebookVerificationTag } from "@/lib/siteTemplate";
import { renderTemplate, TemplateId } from "@/lib/templates";
import { toast } from "sonner";

const defaultData: CompanyData = {
  razaoSocial: "",
  cnpj: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidadeUf: "",
  telefone: "",
  whatsapp: "",
  emailDomain: "",
  atividadePrincipal: "",
  segmento: "servicos",
  descricao: "Empresa especializada em prestação de serviços com foco em qualidade, eficiência e atendimento personalizado.",
  horario: "Segunda a Sexta, das 08h às 18h",
  fbVerificationTag: "",
  fbFileName: "",
  fbFileContent: "",
};

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function companyDataToRow(data: CompanyData) {
  return {
    nome: data.razaoSocial || "Sem nome",
    razao_social: data.razaoSocial,
    cnpj: data.cnpj,
    cep: data.cep,
    logradouro: data.logradouro,
    numero: data.numero,
    complemento: data.complemento,
    bairro: data.bairro,
    cidade_uf: data.cidadeUf,
    telefone: data.telefone,
    whatsapp: data.whatsapp,
    email_domain: data.emailDomain,
    atividade_principal: data.atividadePrincipal,
    segmento: data.segmento,
    descricao: data.descricao,
    horario: data.horario,
    fb_verification_tag: normalizeFacebookVerificationTag(data.fbVerificationTag),
  };
}

export default function Index() {
  const location = useLocation();
  const editState = location.state as { data?: CompanyData; siteId?: string; projectName?: string | null } | null;
  const initialData = editState?.data || defaultData;

  const buildSuggestedProjectName = useCallback((companyData: CompanyData, existingProjectName?: string | null) => {
    if (existingProjectName) return existingProjectName;
    const suggested = slugify(companyData.razaoSocial || companyData.cnpj || companyData.emailDomain || "");
    return suggested;
  }, []);

  const [templateId, setTemplateId] = useState<TemplateId>("higioral");
  const [data, setData] = useState<CompanyData>(initialData);
  const [previewHtml, setPreviewHtml] = useState(() => renderTemplate(templateId, initialData));
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(editState?.siteId || null);
  const [editingProjectName, setEditingProjectName] = useState<string | null>(editState?.projectName || null);
  const [projectNameInput, setProjectNameInput] = useState<string>(() => buildSuggestedProjectName(initialData, editState?.projectName));
  const [provider, setProvider] = useState<"vercel" | "cloudflare" | "render">("render");

  useEffect(() => {
    const nextData = editState?.data || defaultData;
    setData(nextData);
    setPreviewHtml(renderTemplate(templateId, nextData));
    setPublishedUrl(null);
    setEditingSiteId(editState?.siteId || null);
    setEditingProjectName(editState?.projectName || null);
    setProjectNameInput(buildSuggestedProjectName(nextData, editState?.projectName));
  }, [buildSuggestedProjectName, editState?.data, editState?.projectName, editState?.siteId, location.key]);

  useEffect(() => {
    setPreviewHtml(renderTemplate(templateId, data));
  }, [data, templateId]);

  useEffect(() => {
    setProjectNameInput((current) => {
      if (current.trim().length > 0 || editingProjectName) return current;
      return buildSuggestedProjectName(data, editingProjectName);
    });
  }, [buildSuggestedProjectName, data, editingProjectName]);

  const handleChange = useCallback((newData: CompanyData) => {
    setData(newData);
  }, []);

  const handleSegmentoChange = useCallback((newData: CompanyData) => {
    if (newData.segmento !== data.segmento) {
      newData.descricao = getDefaultDescription(newData.segmento);
    }
    setData(newData);
  }, [data.segmento]);

  const handleGenerate = useCallback(() => {
    setPreviewHtml(renderTemplate(templateId, data));
  }, [data]);

  const handleClear = useCallback(() => {
    setData(defaultData);
    setPreviewHtml(renderTemplate(templateId, defaultData));
    setPublishedUrl(null);
    setEditingSiteId(null);
    setEditingProjectName(null);
    setProjectNameInput(buildSuggestedProjectName(defaultData));
  }, []);

  const handleDownload = useCallback(async () => {
    const html = renderTemplate(templateId, data);
    const zip = new JSZip();
    zip.file("index.html", html);
    const blob = await zip.generateAsync({ type: "blob" });
    const filename = data.razaoSocial
      ? `${data.razaoSocial.toLowerCase().replace(/\s+/g, "-")}.zip`
      : "site-institucional.zip";
    saveAs(blob, filename);
  }, [data]);

  const handlePublish = useCallback(async (projectName: string, selectedProvider: "vercel" | "cloudflare" | "render", customDomain?: string) => {
    const baseSlug = slugify(projectName);
    if (!baseSlug) {
      toast.error("Informe um nome válido para o site");
      return;
    }

    setIsPublishing(true);
    setPublishedUrl(null);
    try {
      const html = renderTemplate(templateId, data);

      // Arquivo extra de verificação Facebook (método alternativo)
      const extraFiles: { path: string; content: string }[] = [];
      const fbName = (data.fbFileName || "").trim();
      const fbContent = (data.fbFileContent || "").trim();
      if (fbName && fbContent) {
        const safeName = fbName.endsWith(".html") ? fbName : `${fbName}.html`;
        extraFiles.push({ path: safeName, content: fbContent });
      }

      // 1) Faz deploy no provedor escolhido
      const fnName =
        selectedProvider === "cloudflare" ? "deploy-cloudflare" :
        selectedProvider === "render" ? "deploy-render" :
        "deploy-vercel";



      const { data: deployRes, error: deployErr } = await supabase.functions.invoke(
        fnName,
        { body: { projectName: baseSlug, html, extraFiles, customDomain } },
      );

      if (deployErr) {
        const rawContext = (deployErr as { context?: unknown }).context;
        let backendMessage = "";

        if (typeof rawContext === "string") {
          try {
            const parsed = JSON.parse(rawContext) as { error?: string };
            backendMessage = parsed.error || "";
          } catch {
            backendMessage = rawContext;
          }
        } else if (rawContext && typeof rawContext === "object" && "error" in rawContext) {
          backendMessage = String((rawContext as { error?: string }).error || "");
        }

        throw new Error(backendMessage || deployErr.message);
      }
      if (!deployRes?.success) throw new Error(deployRes?.error || "Falha no deploy");

      const finalSlug: string = deployRes.projectName;
      const finalUrl: string = deployRes.url;

      // 2) Salva/atualiza no banco para aparecer em "Meus Sites"
      const row = {
        ...companyDataToRow(data),
        project_name: finalSlug,
        html_content: html,
        slug: finalSlug,
        published_url: finalUrl,
        updated_at: new Date().toISOString(),
      };

      if (editingSiteId) {
        const { error } = await supabase
          .from("sites")
          .update(row)
          .eq("id", editingSiteId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("sites")
          .insert(row)
          .select("id")
          .single();
        if (error) throw error;
        if (inserted) setEditingSiteId(inserted.id);
      }

      setPublishedUrl(finalUrl);
      setEditingProjectName(finalSlug);
      toast.success(`Publicado em ${finalUrl}`);
      if (deployRes.warning) toast.warning(deployRes.warning);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao publicar";
      toast.error(msg);
    } finally {
      setIsPublishing(false);
    }
  }, [data, editingSiteId]);


  const handleFormChange = useCallback((newData: CompanyData) => {
    if (newData.segmento !== data.segmento) {
      handleSegmentoChange(newData);
    } else {
      handleChange(newData);
    }
  }, [data.segmento, handleChange, handleSegmentoChange]);

  const domain = data.emailDomain ? `www.${data.emailDomain}` : "www.empresa.com.br";
  const title = data.razaoSocial ? `${data.razaoSocial} | Site Institucional` : "Nome da Empresa | Site Institucional";

  return (
    <div className="min-h-screen bg-surface p-4 md:p-8">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-4">
          {editingSiteId && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">✏ Editando site existente</p>
                <p className="text-xs text-muted-foreground">{editingProjectName ? `/s/${editingProjectName}` : data.razaoSocial}</p>
              </div>
              <button onClick={handleClear} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                ✕ Novo site
              </button>
            </div>
          )}
          <GeneratorForm
            data={data}
            onChange={handleFormChange}
            onGenerate={handleGenerate}
            onClear={handleClear}
            onDownload={handleDownload}
            onPublish={handlePublish}
            isPublishing={isPublishing}
            publishedUrl={publishedUrl}
            projectName={projectNameInput}
            defaultProjectName={editingProjectName || undefined}
            onProjectNameChange={setProjectNameInput}
            provider={provider}
            onProviderChange={setProvider}
            templateId={templateId}
            onTemplateChange={setTemplateId}
          />
        </div>
        <div className="lg:col-span-7" id="preview-panel">
          <PreviewPanel html={previewHtml} domain={domain} title={title} />
        </div>
      </div>
    </div>
  );
}
