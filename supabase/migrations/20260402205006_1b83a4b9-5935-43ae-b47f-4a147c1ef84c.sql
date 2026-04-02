
-- funcionarios: drop old policies, create admin-only
DROP POLICY IF EXISTS "Authenticated read funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Authenticated insert funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Authenticated update funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Authenticated delete funcionarios" ON public.funcionarios;
CREATE POLICY "Admins manage funcionarios" ON public.funcionarios FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- pagamentos
DROP POLICY IF EXISTS "Authenticated read pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Authenticated insert pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Authenticated update pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Authenticated delete pagamentos" ON public.pagamentos;
CREATE POLICY "Admins manage pagamentos" ON public.pagamentos FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- vales
DROP POLICY IF EXISTS "Authenticated read vales" ON public.vales;
DROP POLICY IF EXISTS "Authenticated insert vales" ON public.vales;
DROP POLICY IF EXISTS "Authenticated update vales" ON public.vales;
DROP POLICY IF EXISTS "Authenticated delete vales" ON public.vales;
CREATE POLICY "Admins manage vales" ON public.vales FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- clientes
DROP POLICY IF EXISTS "Authenticated read clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated update clientes" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated delete clientes" ON public.clientes;
CREATE POLICY "Admins manage clientes" ON public.clientes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- contas_pagar
DROP POLICY IF EXISTS "Authenticated read contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Authenticated insert contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Authenticated update contas_pagar" ON public.contas_pagar;
DROP POLICY IF EXISTS "Authenticated delete contas_pagar" ON public.contas_pagar;
CREATE POLICY "Admins manage contas_pagar" ON public.contas_pagar FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- recebiveis
DROP POLICY IF EXISTS "Authenticated read recebiveis" ON public.recebiveis;
DROP POLICY IF EXISTS "Authenticated insert recebiveis" ON public.recebiveis;
DROP POLICY IF EXISTS "Authenticated update recebiveis" ON public.recebiveis;
DROP POLICY IF EXISTS "Authenticated delete recebiveis" ON public.recebiveis;
CREATE POLICY "Admins manage recebiveis" ON public.recebiveis FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
