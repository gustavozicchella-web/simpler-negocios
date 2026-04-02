
-- Drop all PUBLIC policies on funcionarios
DROP POLICY IF EXISTS "Public delete funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Public insert funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Public read funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Public update funcionarios" ON public.funcionarios;

-- Drop all PUBLIC policies on pagamentos
DROP POLICY IF EXISTS "Public delete pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Public insert pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Public read pagamentos" ON public.pagamentos;
DROP POLICY IF EXISTS "Public update pagamentos" ON public.pagamentos;

-- Drop all PUBLIC policies on vales
DROP POLICY IF EXISTS "Public delete vales" ON public.vales;
DROP POLICY IF EXISTS "Public insert vales" ON public.vales;
DROP POLICY IF EXISTS "Public read vales" ON public.vales;
DROP POLICY IF EXISTS "Public update vales" ON public.vales;

-- Drop all PUBLIC policies on clientes
DROP POLICY IF EXISTS "Public delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public insert clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public read clientes" ON public.clientes;
DROP POLICY IF EXISTS "Public update clientes" ON public.clientes;

-- Drop all PUBLIC policies on recebiveis
DROP POLICY IF EXISTS "Public delete recebiveis" ON public.recebiveis;
DROP POLICY IF EXISTS "Public insert recebiveis" ON public.recebiveis;
DROP POLICY IF EXISTS "Public read recebiveis" ON public.recebiveis;
DROP POLICY IF EXISTS "Public update recebiveis" ON public.recebiveis;

-- Create authenticated policies on funcionarios
CREATE POLICY "Authenticated read funcionarios" ON public.funcionarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert funcionarios" ON public.funcionarios FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update funcionarios" ON public.funcionarios FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete funcionarios" ON public.funcionarios FOR DELETE TO authenticated USING (true);

-- Create authenticated policies on pagamentos
CREATE POLICY "Authenticated read pagamentos" ON public.pagamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert pagamentos" ON public.pagamentos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update pagamentos" ON public.pagamentos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete pagamentos" ON public.pagamentos FOR DELETE TO authenticated USING (true);

-- Create authenticated policies on vales
CREATE POLICY "Authenticated read vales" ON public.vales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vales" ON public.vales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vales" ON public.vales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete vales" ON public.vales FOR DELETE TO authenticated USING (true);

-- Create authenticated policies on clientes
CREATE POLICY "Authenticated read clientes" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert clientes" ON public.clientes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update clientes" ON public.clientes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete clientes" ON public.clientes FOR DELETE TO authenticated USING (true);

-- Create authenticated policies on recebiveis
CREATE POLICY "Authenticated read recebiveis" ON public.recebiveis FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert recebiveis" ON public.recebiveis FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update recebiveis" ON public.recebiveis FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete recebiveis" ON public.recebiveis FOR DELETE TO authenticated USING (true);
