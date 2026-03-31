
-- Create contas_pagar table
CREATE TABLE public.contas_pagar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  recorrencia TEXT NOT NULL DEFAULT 'nenhuma',
  status TEXT NOT NULL DEFAULT 'Pendente',
  pago_em DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contas_pagar ENABLE ROW LEVEL SECURITY;

-- RLS policies - authenticated users only
CREATE POLICY "Authenticated read contas_pagar"
ON public.contas_pagar FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated insert contas_pagar"
ON public.contas_pagar FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated update contas_pagar"
ON public.contas_pagar FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Authenticated delete contas_pagar"
ON public.contas_pagar FOR DELETE TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_contas_pagar_updated_at
BEFORE UPDATE ON public.contas_pagar
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
