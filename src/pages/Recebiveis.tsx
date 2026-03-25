import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, downloadCSV } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, Plus, Check } from "lucide-react";

type Recebivel = {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  descricao: string;
  valor: number;
  data_emissao: string;
  data_vencimento: string;
  status: string;
};

type ClienteOption = { id: string; nome: string };

export default function Recebiveis() {
  const [recebiveis, setRecebiveis] = useState<Recebivel[]>([]);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [filtro, setFiltro] = useState("Todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().slice(0, 10));
  const [dataVencimento, setDataVencimento] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { load(); loadClientes(); }, [filtro]);

  async function loadClientes() {
    const { data } = await supabase.from("clientes").select("id, nome").eq("ativo", true).order("nome");
    setClientes(data ?? []);
  }

  async function load() {
    let query = supabase.from("recebiveis").select("*").order("data_vencimento", { ascending: false });
    if (filtro !== "Todos") query = query.eq("status", filtro);
    const { data: recs } = await query;

    if (recs && recs.length > 0) {
      const cIds = [...new Set(recs.map((r) => r.cliente_id))];
      const { data: cls } = await supabase.from("clientes").select("id, nome").in("id", cIds);
      const cMap = new Map((cls ?? []).map((c) => [c.id, c.nome]));
      setRecebiveis(recs.map((r) => ({ ...r, cliente_nome: cMap.get(r.cliente_id) ?? "—" })));
    } else {
      setRecebiveis([]);
    }
  }

  async function toggleStatus(id: string, statusAtual: string) {
    const novoStatus = statusAtual === "Pago" ? "Pendente" : "Pago";
    await supabase.from("recebiveis").update({ status: novoStatus }).eq("id", id);
    toast.success(`Status alterado para ${novoStatus}!`);
    load();
  }

  async function handleSubmit() {
    if (!clienteId || !descricao) { toast.error("Preencha cliente e descrição."); return; }
    const v = parseFloat(valor);
    if (isNaN(v) || v <= 0) { toast.error("Valor inválido."); return; }

    const { error } = await supabase.from("recebiveis").insert({
      cliente_id: clienteId, descricao, valor: v,
      data_emissao: dataEmissao, data_vencimento: dataVencimento,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Recebível registrado!");
    setDialogOpen(false);
    setDescricao(""); setValor(""); setClienteId("");
    load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">💰 Recebíveis</h1>
        <div className="flex gap-2">
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Pago">Pago</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(recebiveis.map(r => ({ Cliente: r.cliente_nome ?? "", Descrição: r.descricao, Valor: formatCurrency(r.valor), Emissão: r.data_emissao, Vencimento: r.data_vencimento, Status: r.status })), "recebiveis.csv")}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Registrar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {recebiveis.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum recebível encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recebiveis.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.cliente_nome}</TableCell>
                    <TableCell>{r.descricao}</TableCell>
                    <TableCell>{formatCurrency(r.valor)}</TableCell>
                    <TableCell>{new Date(r.data_emissao + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{new Date(r.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "Pago" ? "default" : "secondary"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === "Pendente" && (
                        <Button variant="ghost" size="icon" onClick={() => marcarPago(r.id)} title="Marcar como pago">
                          <Check className="w-4 h-4 text-success" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>➕ Novo Recebível</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Descrição do Serviço</Label><Input value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Valor (R$)</Label><Input type="number" min="0.01" step="100" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Data de Emissão</Label><Input type="date" value={dataEmissao} onChange={(e) => setDataEmissao(e.target.value)} /></div>
              <div className="grid gap-2"><Label>Data de Vencimento</Label><Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} /></div>
            </div>
            <Button onClick={handleSubmit}>💾 Registrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
