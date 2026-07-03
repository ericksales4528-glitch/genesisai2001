import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import GeneratorForm from "@/components/GeneratorForm";
import PreviewPanel from "@/components/PreviewPanel";
import { CompanyData, getDefaultDescription } from "@/lib/siteTemplate";
import { renderTemplate, TemplateId } from "@/lib/templates";

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
};

function buildWorkerScript(html: string): string {
  const safe = html.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return `const HTML = \`${safe}\`;
export default {
  async fetch() {
    return new Response(HTML, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
        "cache-control": "public, max-age=300"
      }
    });
  }
};
`;
}

export default function CloudflareCode() {
  const [templateId, setTemplateId] = useState<TemplateId>("higioral");
  const [data, setData] = useState<CompanyData>(defaultData);
  const [previewHtml, setPreviewHtml] = useState(() => renderTemplate(templateId, defaultData));
  const [workerCode, setWorkerCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState("");
  const [provider, setProvider] = useState<"render">("render");

  useEffect(() => {
    const html = renderTemplate(templateId, data);
    setPreviewHtml(html);
    // Se já foi gerado uma vez, mantém o código sincronizado automaticamente
    // (inclui alterações na meta tag do Facebook após a primeira geração)
    setWorkerCode(prev => (prev ? buildWorkerScript(html) : prev));
  }, [data, templateId]);

  const handleChange = useCallback((newData: CompanyData) => {
    if (newData.segmento !== data.segmento) {
      newData.descricao = getDefaultDescription(newData.segmento);
    }
    setData(newData);
  }, [data.segmento]);

  const handleGenerate = useCallback(() => {
    const html = renderTemplate(templateId, data);
    setPreviewHtml(html);
    setWorkerCode(buildWorkerScript(html));
    toast.success("Código do Worker gerado!");
    setTimeout(() => {
      document.getElementById("worker-code-output")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [data, templateId]);

  const handleClear = useCallback(() => {
    setData(defaultData);
    setWorkerCode("");
    setProjectNameInput("");
  }, []);

  const handleDownload = useCallback(() => {
    const code = buildWorkerScript(renderTemplate(templateId, data));
    const blob = new Blob([code], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "worker.js";
    a.click();
    URL.revokeObjectURL(url);
  }, [data, templateId]);

  // Reaproveita o botão "Publicar" do GeneratorForm para gerar o código
  const handlePublish = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const copyWorker = async () => {
    if (!workerCode) return;
    try {
      await navigator.clipboard.writeText(workerCode);
      setCopied(true);
      toast.success("Código copiado! Cole no editor do Cloudflare Worker.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const domain = data.emailDomain ? `www.${data.emailDomain}` : "www.empresa.com.br";
  const title = data.razaoSocial ? `${data.razaoSocial} | Site Institucional` : "Nome da Empresa | Site Institucional";

  return (
    <div className="min-h-screen bg-surface p-4 md:p-8">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <h1 className="font-display text-lg font-bold text-foreground">☁️ Gerador de Código Cloudflare Worker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha os dados da empresa e clique em <strong>Publicar</strong> para gerar o código.
            Depois copie e cole no <strong>Edit Code</strong> do seu Worker no Cloudflare Dashboard.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="lg:col-span-5 space-y-4">
            <GeneratorForm
              data={data}
              onChange={handleChange}
              onGenerate={handleGenerate}
              onClear={handleClear}
              onDownload={handleDownload}
              onPublish={handlePublish}
              isPublishing={false}
              publishedUrl={null}
              projectName={projectNameInput}
              onProjectNameChange={setProjectNameInput}
              provider={provider}
              onProviderChange={setProvider}
              templateId={templateId}
              onTemplateChange={setTemplateId}
            />
          </div>
          <div className="lg:col-span-7">
            <PreviewPanel html={previewHtml} domain={domain} title={title} />
          </div>
        </div>

        {workerCode && (
          <div id="worker-code-output" className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">📋 Código do Worker (worker.js)</h2>
                <p className="text-xs text-muted-foreground">
                  Cole este código inteiro no editor do Cloudflare Worker (substitua todo o conteúdo existente) e clique em <strong>Deploy</strong>. O código atualiza automaticamente ao editar qualquer campo — incluindo a <strong>Meta Tag do Facebook</strong>. Basta copiar de novo e redeployar.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  title="Regera o worker.js com os dados atuais (incluindo a Meta Tag do Facebook)"
                >
                  🔄 Atualizar código
                </button>
                <button
                  onClick={copyWorker}
                  className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar código"}
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={workerCode}
              onFocus={(e) => e.currentTarget.select()}
              className="h-96 w-full resize-y rounded-md border border-border bg-muted p-3 font-mono text-xs text-foreground"
            />
            <div className="mt-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Como usar:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Acesse o Cloudflare Dashboard → Workers &amp; Pages</li>
                <li>Crie um novo Worker (ou abra um existente) e clique em <strong>Edit Code</strong></li>
                <li>Apague todo o conteúdo do editor e cole o código acima</li>
                <li>Clique em <strong>Save and Deploy</strong></li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
