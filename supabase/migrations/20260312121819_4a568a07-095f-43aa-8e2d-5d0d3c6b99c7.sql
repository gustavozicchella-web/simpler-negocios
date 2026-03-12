
-- Função para atualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Tabela de funcionários
CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  cargo TEXT NOT NULL,
  salario_bruto NUMERIC(12,2) NOT NULL CHECK (salario_bruto >= 0),
  data_admissao DATE NOT NULL,
  telefone TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read funcionarios" ON public.funcionarios FOR SELECT USING (true);
CREATE POLICY "Public insert funcionarios" ON public.funcionarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update funcionarios" ON public.funcionarios FOR UPDATE USING (true);
CREATE POLICY "Public delete funcionarios" ON public.funcionarios FOR DELETE USING (true);

CREATE TRIGGER update_funcionarios_updated_at BEFORE UPDATE ON public.funcionarios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj_cpf TEXT NOT NULL UNIQUE,
  endereco TEXT,
  telefone TEXT,
  email TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read clientes" ON public.clientes FOR SELECT USING (true);
CREATE POLICY "Public insert clientes" ON public.clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update clientes" ON public.clientes FOR UPDATE USING (true);
CREATE POLICY "Public delete clientes" ON public.clientes FOR DELETE USING (true);

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de recebíveis
CREATE TABLE public.recebiveis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  data_emissao DATE NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recebiveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read recebiveis" ON public.recebiveis FOR SELECT USING (true);
CREATE POLICY "Public insert recebiveis" ON public.recebiveis FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update recebiveis" ON public.recebiveis FOR UPDATE USING (true);
CREATE POLICY "Public delete recebiveis" ON public.recebiveis FOR DELETE USING (true);

CREATE TRIGGER update_recebiveis_updated_at BEFORE UPDATE ON public.recebiveis
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de vales (adiantamentos)
CREATE TABLE public.vales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  motivo TEXT,
  descontado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read vales" ON public.vales FOR SELECT USING (true);
CREATE POLICY "Public insert vales" ON public.vales FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update vales" ON public.vales FOR UPDATE USING (true);
CREATE POLICY "Public delete vales" ON public.vales FOR DELETE USING (true);

CREATE TRIGGER update_vales_updated_at BEFORE UPDATE ON public.vales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de pagamentos (folha)
CREATE TABLE public.pagamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano INTEGER NOT NULL CHECK (ano >= 2020),
  salario_bruto NUMERIC(12,2) NOT NULL,
  total_vales NUMERIC(12,2) NOT NULL DEFAULT 0,
  salario_liquido NUMERIC(12,2) NOT NULL,
  data_pagamento DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id, mes, ano)
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read pagamentos" ON public.pagamentos FOR SELECT USING (true);
CREATE POLICY "Public insert pagamentos" ON public.pagamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update pagamentos" ON public.pagamentos FOR UPDATE USING (true);
CREATE POLICY "Public delete pagamentos" ON public.pagamentos FOR DELETE USING (true);

CREATE TRIGGER update_pagamentos_updated_at BEFORE UPDATE ON public.pagamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
