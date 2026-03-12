import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, downloadCSV } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";

type FuncOption = { id: string; nome: string };
type Vale = {
  id: string;
  funcionario_id: string;
  func_nome?: string;
  data: string;
  valor: number;
  motivo: string | null;
  descontado: boolean;
};

export default function Vales() {
  const [vales, setVales] = useState<Vale[]>([]);
  const [funcionarios, setFuncionarios] = useState<FuncOption[]>([]);
  const [filtroFunc, setFiltroFunc] = useState("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [funcId, setFuncId] = useState("");
  const [dataVale, setDataVale] = useState(new Date().toISOString().slice(0, 10));
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [resumo, setResumo] = useState<{ nome: string; total: number }[]>([]);

  useEffect(() => { loadFuncs(); }, []);
  useEffect(() => { load(); }, [filtroFunc]);

  async function loadFuncs() {
    const { data } = await supabase.from("funcionarios").select("id, nome").eq("ativo", true).order("nome");
    setFuncionarios(data ?? []);
  }

  async function load() {
    let query = supabase.from("vales").select("*").order("data", { ascending: false });
    if (filtroFunc !== "Todos") query = query.eq("funcionario_id", filtroFunc);
    const { data: valesData } = await query;

    if (valesData && valesData.length > 0) {
      const fIds = [...new Set(valesData.map((v) => v.funcionario_id))];
      const { data: fs } = await supabase.from("funcionarios").select("id, nome").in("id", fIds);
      const fMap = new Map((fs ?? []).map((f) => [f.id, f.nome]));
      setVales(valesData.map((v) => ({ ...v, func_nome: fMap.get(v.funcionario_id) ?? "—" })));
    } else {
      setVales([]);
    }

    // Resumo
    const { data: allVales } = await supabase.from("vales").select("funcionario_id, valor").eq("descontado", false);
    const { data: allFuncs } = await supabase.from("funcionarios").select("id, nome").eq("ativo", true).order("nome");
    const vMap = new Map<string, number>();
    (allVales ?? []).forEach((v) => vMap.set(v.funcionario_id, (vMap.get(v.funcionario_id) ?? 0) + v.valor));
    setResumo((allFuncs ?? []).map((f) => ({ nome: f.nome, total: vMap.get(f.id) ?? 0 })).sort((a, b) => b.total - a.total));
  }

  async function handleSubmit() {
    if (!funcId) { toast.error("Selecione um funcionário."); return; }
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) { toast.error("Valor inválido."); return; }

    const { error } = await supabase.from("vales").insert({
      funcionario_id: funcId, data: dataVale, valor: v, motivo: motivo || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Vale emitido!");
    setDialogOpen(false); setValor(""); setMotivo(""); setFuncId("");
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📋 Vales / Adiantamentos</h1>
        <div className="flex gap-2">
          <Select value={filtroFunc} onValueChange={setFiltroFunc}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(vales.map(v => ({ Funcionário: v.func_nome ?? "", Data: v.data, Valor: formatCurrency(v.valor), Motivo: v.motivo ?? "", Situação: v.descontado ? "Descontado" : "Pendente" })), "vales.csv")}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Emitir Vale
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {vales.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum vale encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Situação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vales.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.func_nome}</TableCell>
                    <TableCell>{new Date(v.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{formatCurrency(v.valor)}</TableCell>
                    <TableCell>{v.motivo ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={v.descontado ? "default" : "secondary"}>
                        {v.descontado ? "Descontado" : "Pendente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">📊 Saldo de Vales Pendentes por Funcionário</CardTitle></CardHeader>
        <CardContent>
          {resumo.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum dado.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Funcionário</TableHead><TableHead>Total Pendente</TableHead></TableRow></TableHeader>
              <TableBody>
                {resumo.map((r) => (
                  <TableRow key={r.nome}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>{formatCurrency(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>➕ Emitir Vale</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Funcionário</Label>
              <Select value={funcId} onValueChange={setFuncId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Data</Label><Input type="date" value={dataVale} onChange={(e) => setDataVale(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Valor (R$)</Label><Input type="number" min="0.01" step="50" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
            </div>
            <div className="grid gap-2"><Label>Motivo (opcional)</Label><Input value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
            <Button onClick={handleSubmit}>💾 Emitir Vale</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
