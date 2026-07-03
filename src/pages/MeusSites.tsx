import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CompanyData } from "@/lib/siteTemplate";
import { toast } from "sonner";

interface SiteRecord {
  id: string;
  nome: string;
  project_name: string | null;
  published_url: string | null;
  created_at: string;
  updated_at: string;
  razao_social: string | null;
  cnpj: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade_uf: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email_domain: string | null;
  atividade_principal: string | null;
  segmento: string | null;
  descricao: string | null;
  horario: string | null;
  fb_verification_tag: string | null;
}

interface Props {
  onEdit: (data: CompanyData, siteId: string, projectName: string | null) => void;
}

function recordToCompanyData(r: SiteRecord): CompanyData {
  return {
    razaoSocial: r.razao_social || "",
    cnpj: r.cnpj || "",
    cep: r.cep || "",
    logradouro: r.logradouro || "",
    numero: r.numero || "",
    complemento: r.complemento || "",
    bairro: r.bairro || "",
    cidadeUf: r.cidade_uf || "",
    telefone: r.telefone || "",
    whatsapp: r.whatsapp || "",
    emailDomain: r.email_domain || "",
    atividadePrincipal: r.atividade_principal || "",
    segmento: r.segmento || "servicos",
    descricao: r.descricao || "",
    horario: r.horario || "Segunda a Sexta, das 08h às 18h",
    fbVerificationTag: r.fb_verification_tag || "",
  };
}

export default function MeusSites({ onEdit }: Props) {
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSites = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sites")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar sites salvos");
    } else {
      setSites(data as SiteRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Deletar "${nome}"?`)) return;
    const { error } = await supabase.from("sites").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao deletar");
    } else {
      toast.success("Site deletado");
      fetchSites();
    }
  };

  return (
    <div className="min-h-screen bg-surface p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Meus Sites</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus sites publicados. Edite dados e republique.</p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        ) : sites.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-lg font-semibold text-foreground mb-1">Nenhum site salvo</p>
            <p className="text-sm text-muted-foreground">Crie e publique um site na aba "Gerar Site" para vê-lo aqui.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sites.map((site) => (
              <div key={site.id} className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3 transition-shadow hover:shadow-md">
                <div>
                  <h3 className="font-display text-base font-bold text-foreground truncate">{site.nome}</h3>
                  {site.project_name && (
                    <p className="text-xs text-muted-foreground">/s/{site.project_name}</p>
                  )}
                </div>

                {site.published_url && (
                  <a
                    href={site.published_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-xs text-primary hover:underline break-all"
                  >
                    🔗 {site.published_url}
                  </a>
                )}

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  {site.cnpj && <p><span className="font-medium text-foreground/70">CNPJ:</span> {site.cnpj}</p>}
                  {site.telefone && <p><span className="font-medium text-foreground/70">Tel:</span> {site.telefone}</p>}
                  {site.cidade_uf && <p><span className="font-medium text-foreground/70">Cidade:</span> {site.cidade_uf}</p>}
                  {site.segmento && <p><span className="font-medium text-foreground/70">Segmento:</span> {site.segmento}</p>}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-muted-foreground">
                    Atualizado: {new Date(site.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(recordToCompanyData(site), site.id, site.project_name)}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      ✏ Editar
                    </button>
                    <button
                      onClick={() => handleDelete(site.id, site.nome)}
                      className="rounded-md bg-destructive/10 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
