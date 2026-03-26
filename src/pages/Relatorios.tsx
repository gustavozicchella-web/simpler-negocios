import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatCPF, formatCpfCnpj, downloadCSV } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";

const TIPOS = [
  "Funcionários Ativos",
  "Clientes Ativos",
  "Recebíveis Pendentes",
  "Recebíveis Pagos",
  "Vales Pendentes",
  "Histórico de Pagamentos",
];

export default function Relatorios() {
  const [tipo, setTipo] = useState(TIPOS[0]);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  async function gerar() {
    setLoading(true);
    let result: Record<string, unknown>[] = [];

    if (tipo === "Funcionários Ativos") {
      const { data: funcs } = await supabase.from("funcionarios").select("*").eq("ativo", true).order("nome");
      const { data: vales } = await supabase.from("vales").select("funcionario_id, valor").eq("descontado", false);
      const vMap = new Map<string, number>();
      (vales ?? []).forEach((v) => vMap.set(v.funcionario_id, (vMap.get(v.funcionario_id) ?? 0) + v.valor));
      result = (funcs ?? []).map((f) => ({
        Nome: f.nome, CPF: formatCPF(f.cpf), Cargo: f.cargo,
        "Salário Bruto": formatCurrency(f.salario_bruto),
        "Vales Pendentes": formatCurrency(vMap.get(f.id) ?? 0),
        Telefone: f.telefone ?? "",
      }));
    } else if (tipo === "Clientes Ativos") {
      const { data: cls } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome");
      result = (cls ?? []).map((c) => ({
        Nome: c.nome, "CNPJ/CPF": formatCpfCnpj(c.cnpj_cpf),
        Endereço: c.endereco ?? "", Telefone: c.telefone ?? "", Email: c.email ?? "",
      }));
    } else if (tipo === "Recebíveis Pendentes" || tipo === "Recebíveis Pagos") {
      const status = tipo === "Recebíveis Pendentes" ? "Pendente" : "Pago";
      const { data: recs } = await supabase.from("recebiveis").select("*").eq("status", status).order("data_vencimento");
      const cIds = [...new Set((recs ?? []).map((r) => r.cliente_id))];
      const { data: cls } = cIds.length > 0 ? await supabase.from("clientes").select("id, nome").in("id", cIds) : { data: [] };
      const cMap = new Map((cls ?? []).map((c) => [c.id, c.nome]));
      result = (recs ?? []).map((r) => ({
        Cliente: cMap.get(r.cliente_id) ?? "—", Descrição: r.descricao,
        Valor: formatCurrency(r.valor), Emissão: r.data_emissao, Vencimento: r.data_vencimento,
      }));
    } else if (tipo === "Vales Pendentes") {
      const { data: vales } = await supabase.from("vales").select("*").eq("descontado", false).order("data");
      const fIds = [...new Set((vales ?? []).map((v) => v.funcionario_id))];
      const { data: funcs } = fIds.length > 0 ? await supabase.from("funcionarios").select("id, nome").in("id", fIds) : { data: [] };
      const fMap = new Map((funcs ?? []).map((f) => [f.id, f.nome]));
      result = (vales ?? []).map((v) => ({
        Funcionário: fMap.get(v.funcionario_id) ?? "—", Data: v.data,
        Valor: formatCurrency(v.valor), Motivo: v.motivo ?? "",
      }));
    } else if (tipo === "Histórico de Pagamentos") {
      const { data: pags } = await supabase.from("pagamentos").select("*").order("ano", { ascending: false });
      const fIds = [...new Set((pags ?? []).map((p) => p.funcionario_id))];
      const { data: funcs } = fIds.length > 0 ? await supabase.from("funcionarios").select("id, nome").in("id", fIds) : { data: [] };
      const fMap = new Map((funcs ?? []).map((f) => [f.id, f.nome]));
      result = (pags ?? []).map((p) => ({
        Nome: fMap.get(p.funcionario_id) ?? "—", Mês: p.mes, Ano: p.ano,
        "Sal. Bruto": formatCurrency(p.salario_bruto), Vales: formatCurrency(p.total_vales),
        Líquido: formatCurrency(p.salario_liquido), "Data Pgto": p.data_pagamento,
      }));
    }

    setData(result);
    setLoading(false);
  }

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-primary-foreground">📈 Relatórios</h1>

      <div className="flex gap-4 items-end">
        <div className="grid gap-2 flex-1">
          <label className="text-sm font-medium">Tipo de Relatório</label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={gerar} disabled={loading}>{loading ? "Gerando..." : "📊 Gerar"}</Button>
        {data.length > 0 && (
          <Button variant="outline" onClick={() => downloadCSV(data, `relatorio_${tipo.toLowerCase().replace(/ /g, "_")}.csv`)}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
        )}
      </div>

      {data.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => <TableHead key={h}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => <TableCell key={h}>{String(row[h] ?? "")}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {data.length === 0 && !loading && (
        <p className="text-muted-foreground text-sm text-center py-8">Selecione um relatório e clique em "Gerar".</p>
      )}
    </div>
  );
}
