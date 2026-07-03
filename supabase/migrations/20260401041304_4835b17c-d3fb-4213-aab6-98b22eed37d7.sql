
CREATE TABLE public.sites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  project_name TEXT,
  published_url TEXT,
  razao_social TEXT,
  cnpj TEXT,
  cep TEXT,
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade_uf TEXT,
  telefone TEXT,
  whatsapp TEXT,
  email_domain TEXT,
  atividade_principal TEXT,
  segmento TEXT DEFAULT 'servicos',
  descricao TEXT,
  horario TEXT,
  fb_verification_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sites" ON public.sites
  FOR ALL USING (true) WITH CHECK (true);
