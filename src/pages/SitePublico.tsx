import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function SitePublico() {
  const { slug } = useParams<{ slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("html_content, nome")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data || !data.html_content) {
        setNotFound(true);
        return;
      }
      document.title = data.nome || "Site";
      setHtml(data.html_content);
    })();
  }, [slug]);

  useEffect(() => {
    if (!html) return;
    // Substitui o documento inteiro pelo HTML salvo (sem iframe, mesma origem)
    document.open();
    document.write(html);
    document.close();
  }, [html]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Site não encontrado</h1>
          <p className="text-muted-foreground">O endereço /s/{slug} não existe ou foi removido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Carregando site...
    </div>
  );
}
