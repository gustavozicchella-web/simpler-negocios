import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, downloadCSV, MESES } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Download } from "lucide-react";

type FolhaItem = {
  id: string;
  nome: string;
  salario_bruto: number;
  total_vales: number;
  salario_liquido: number;
};

export default function FolhaPagamento() {
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1));
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [folha, setFolha] = useState<FolhaItem[]>([]);
  const [jaProcessada, setJaProcessada] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => { load(); }, [mes, ano]);

  async function load() {
    const m = parseInt(mes);
    const a = parseInt(ano);

    // Check if already processed
    const { data: pagExist } = await supabase
      .from("pagamentos")
      .select("funcionario_id, salario_bruto, total_vales, salario_liquido")
      .eq("mes", m)
      .eq("ano", a);

    if (pagExist && pagExist.length > 0) {
      // Load func names
      const fIds = pagExist.map((p) => p.funcionario_id);
      const { data: funcs } = await supabase.from("funcionarios").select("id, nome").in("id", fIds);
      const fMap = new Map((funcs ?? []).map((f) => [f.id, f.nome]));
      setFolha(pagExist.map((p) => ({
        id: p.funcionario_id,
        nome: fMap.get(p.funcionario_id) ?? "—",
        salario_bruto: p.salario_bruto,
        total_vales: p.total_vales,
        salario_liquido: p.salario_liquido,
      })));
      setJaProcessada(true);
      return;
    }

    setJaProcessada(false);

    // Calculate preview
    const { data: funcs } = await supabase.from("funcionarios").select("id, nome, salario_bruto, valor_hora, horas_trabalhadas").eq("ativo", true).order("nome");
    if (!funcs || funcs.length === 0) { setFolha([]); return; }

    const { data: valesPend } = await supabase.from("vales").select("funcionario_id, valor").eq("descontado", false);
    const vMap = new Map<string, number>();
    (valesPend ?? []).forEach((v) => vMap.set(v.funcionario_id, (vMap.get(v.funcionario_id) ?? 0) + v.valor));

    setFolha(funcs.map((f) => {
      const tv = vMap.get(f.id) ?? 0;
      const salBruto = (f as any).valor_hora * (f as any).horas_trabalhadas;
      return { id: f.id, nome: f.nome, salario_bruto: salBruto, total_vales: tv, salario_liquido: Math.max(salBruto - tv, 0) };
    }));
  }

  async function processar() {
    if (!confirm("Confirma o processamento da folha? Os vales pendentes serão marcados como descontados.")) return;
    setProcessando(true);
    const m = parseInt(mes);
    const a = parseInt(ano);
    const hoje = new Date().toISOString().slice(0, 10);

    for (const item of folha) {
      await supabase.from("pagamentos").insert({
        funcionario_id: item.id, mes: m, ano: a,
        salario_bruto: item.salario_bruto, total_vales: item.total_vales,
        salario_liquido: item.salario_liquido, data_pagamento: hoje,
      });

      // Mark vales as descontado
      await supabase.from("vales").update({ descontado: true })
        .eq("funcionario_id", item.id).eq("descontado", false);
    }

    toast.success(`Folha de ${MESES[m - 1]}/${a} processada!`);
    setProcessando(false);
    load();
  }

  const totBruto = folha.reduce((s, f) => s + f.salario_bruto, 0);
  const totVales = folha.reduce((s, f) => s + f.total_vales, 0);
  const totLiquido = folha.reduce((s, f) => s + f.salario_liquido, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-primary-foreground">💼 Folha de Pagamento</h1>

      <div className="flex gap-4 items-end">
        <div className="grid gap-2">
          <label className="text-sm font-medium text-primary-foreground">Mês</label>
...
        </div>
        <div className="grid gap-2">
          <label className="text-sm font-medium text-primary-foreground">Ano</label>
          <Select value={ano} onValueChange={setAno}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => downloadCSV(folha.map(f => ({ Nome: f.nome, "Sal. Bruto": formatCurrency(f.salario_bruto), Vales: formatCurrency(f.total_vales), Líquido: formatCurrency(f.salario_liquido) })), `folha_${mes}_${ano}.csv`)}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
      </div>

      {jaProcessada && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-4">
            <p className="text-success font-medium">✅ Folha de {MESES[parseInt(mes) - 1]}/{ano} já processada!</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          {folha.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum funcionário ativo.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Salário Bruto</TableHead>
                  <TableHead>Vales a Descontar</TableHead>
                  <TableHead>Salário Líquido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folha.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell>{formatCurrency(f.salario_bruto)}</TableCell>
                    <TableCell>{formatCurrency(f.total_vales)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(f.salario_liquido)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {folha.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Bruto</CardTitle></CardHeader><CardContent><p className="text-xl font-bold">{formatCurrency(totBruto)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Vales</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-warning">{formatCurrency(totVales)}</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Líquido</CardTitle></CardHeader><CardContent><p className="text-xl font-bold text-success">{formatCurrency(totLiquido)}</p></CardContent></Card>
          </div>

          {!jaProcessada && (
            <Button size="lg" onClick={processar} disabled={processando} className="w-full">
              {processando ? "Processando..." : "✅ Processar Pagamento da Folha"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
