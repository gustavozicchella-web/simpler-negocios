import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";

interface DashboardData {
  totalReceber: number;
  totalFolha: number;
  totalVales: number;
  totalFuncionarios: number;
  recebiveisProximos: Array<{
    id: string;
    cliente_nome: string;
    descricao: string;
    valor: number;
    data_vencimento: string;
  }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData>({
    totalReceber: 0,
    totalFolha: 0,
    totalVales: 0,
    totalFuncionarios: 0,
    recebiveisProximos: []
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [recRes, funcRes, valesRes, proxRes] = await Promise.all([
    supabase.from("recebiveis").select("valor").eq("status", "Pendente"),
    supabase.from("funcionarios").select("salario_bruto").eq("ativo", true),
    supabase.from("vales").select("valor").eq("descontado", false),
    supabase.
    from("recebiveis").
    select("id, descricao, valor, data_vencimento, cliente_id").
    eq("status", "Pendente").
    order("data_vencimento", { ascending: true }).
    limit(10)]
    );

    const totalReceber = (recRes.data ?? []).reduce((s, r) => s + r.valor, 0);
    const funcs = funcRes.data ?? [];
    const totalFolha = funcs.reduce((s, f) => s + f.salario_bruto, 0);
    const totalVales = (valesRes.data ?? []).reduce((s, v) => s + v.valor, 0);

    // Get client names for proximos
    let recebiveisProximos: DashboardData["recebiveisProximos"] = [];
    if (proxRes.data && proxRes.data.length > 0) {
      const clientIds = [...new Set(proxRes.data.map((r) => r.cliente_id))];
      const { data: clientes } = await supabase.
      from("clientes").
      select("id, nome").
      in("id", clientIds);
      const clientMap = new Map((clientes ?? []).map((c) => [c.id, c.nome]));
      recebiveisProximos = proxRes.data.map((r) => ({
        id: r.id,
        cliente_nome: clientMap.get(r.cliente_id) ?? "—",
        descricao: r.descricao,
        valor: r.valor,
        data_vencimento: r.data_vencimento
      }));
    }

    setData({
      totalReceber,
      totalFolha,
      totalVales,
      totalFuncionarios: funcs.length,
      recebiveisProximos
    });
  }

  const cards = [
  { title: "Total a Receber", value: formatCurrency(data.totalReceber), emoji: "💰", color: "text-success" },
  { title: "Folha Líquida Est.", value: formatCurrency(Math.max(data.totalFolha - data.totalVales, 0)), emoji: "💸", color: "text-primary" },
  { title: "Funcionários Ativos", value: String(data.totalFuncionarios), emoji: "👥", color: "text-info" },
  { title: "Vales Pendentes", value: formatCurrency(data.totalVales), emoji: "📋", color: "text-warning" }];


  return (
    <div className="space-y-6 animate-fade-in min-h-full rounded-xl relative overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/bg-controle-financeiro.jpg')" }} />
      <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/75 to-background/90 backdrop-blur-[2px]" />
      <div className="relative z-10 space-y-6 p-6">
        <h1 className="text-2xl font-bold">📊ControleFinanceiro.C.A.V </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) =>
          <Card key={card.title}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.emoji} {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">⚠️ Recebíveis Próximos do Vencimento</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recebiveisProximos.length === 0 ?
            <p className="text-muted-foreground text-sm">Nenhum recebível pendente.</p> :

            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recebiveisProximos.map((r) =>
                <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.cliente_nome}</TableCell>
                      <TableCell>{r.descricao}</TableCell>
                      <TableCell>{formatCurrency(r.valor)}</TableCell>
                      <TableCell>{new Date(r.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    </TableRow>
                )}
                </TableBody>
              </Table>
            }
          </CardContent>
        </Card>
      </div>
    </div>);

}