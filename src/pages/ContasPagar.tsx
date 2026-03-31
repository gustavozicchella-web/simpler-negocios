import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, AlertTriangle, Clock, CheckCircle2, Trash2, Edit, RefreshCw } from "lucide-react";
import { addMonths, addYears, format, parseISO, isBefore, isAfter, startOfMonth, endOfMonth } from "date-fns";

const CATEGORIAS = [
  "Luz", "Água", "Internet", "Telefone", "Aluguel",
  "Cartão de Crédito", "Impostos", "Seguros", "Manutenção", "Outros",
];

const RECORRENCIAS = [
  { value: "nenhuma", label: "Nenhuma (avulsa)" },
  { value: "mensal", label: "Mensal" },
  { value: "anual", label: "Anual" },
];

interface ContaPagar {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  categoria: string;
  recorrencia: string;
  status: string;
  pago_em: string | null;
  observacoes: string | null;
}

export default function ContasPagar() {
  const [contas, setContas] = useState<ContaPagar[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  // Form state
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [categoria, setCategoria] = useState("Outros");
  const [recorrencia, setRecorrencia] = useState("nenhuma");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContas();
  }, []);

  async function loadContas() {
    const { data, error } = await supabase
      .from("contas_pagar")
      .select("*")
      .order("data_vencimento", { ascending: true });

    if (data) {
      // Auto-update status for overdue bills
      const today = new Date().toISOString().split("T")[0];
      const updates: ContaPagar[] = [];

      for (const conta of data) {
        if (conta.status === "Pendente" && conta.data_vencimento < today) {
          updates.push(conta);
        }
      }

      if (updates.length > 0) {
        for (const conta of updates) {
          await supabase
            .from("contas_pagar")
            .update({ status: "Atrasada" })
            .eq("id", conta.id);
        }
        // Reload after updates
        const { data: refreshed } = await supabase
          .from("contas_pagar")
          .select("*")
          .order("data_vencimento", { ascending: true });
        setContas(refreshed ?? []);
      } else {
        setContas(data);
      }
    }
  }

  function resetForm() {
    setDescricao("");
    setValor("");
    setDataVencimento("");
    setCategoria("Outros");
    setRecorrencia("nenhuma");
    setObservacoes("");
    setEditId(null);
  }

  function openEdit(conta: ContaPagar) {
    setEditId(conta.id);
    setDescricao(conta.descricao);
    setValor(String(conta.valor));
    setDataVencimento(conta.data_vencimento);
    setCategoria(conta.categoria);
    setRecorrencia(conta.recorrencia);
    setObservacoes(conta.observacoes ?? "");
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const payload = {
      descricao,
      valor: parseFloat(valor),
      data_vencimento: dataVencimento,
      categoria,
      recorrencia,
      observacoes: observacoes || null,
    };

    if (editId) {
      const { error } = await supabase.from("contas_pagar").update(payload).eq("id", editId);
      if (error) toast.error("Erro ao atualizar: " + error.message);
      else toast.success("Conta atualizada!");
    } else {
      const { error } = await supabase.from("contas_pagar").insert(payload);
      if (error) toast.error("Erro ao criar: " + error.message);
      else toast.success("Conta cadastrada!");
    }

    setSaving(false);
    setOpen(false);
    resetForm();
    loadContas();
  }

  async function marcarPaga(id: string) {
    const conta = contas.find((c) => c.id === id);
    if (!conta) return;

    await supabase
      .from("contas_pagar")
      .update({ status: "Paga", pago_em: new Date().toISOString().split("T")[0] })
      .eq("id", id);

    // Generate next installment for recurring bills
    if (conta.recorrencia !== "nenhuma") {
      const vencimento = parseISO(conta.data_vencimento);
      const proximoVencimento =
        conta.recorrencia === "mensal"
          ? addMonths(vencimento, 1)
          : addYears(vencimento, 1);

      // Check if next installment already exists
      const { data: existing } = await supabase
        .from("contas_pagar")
        .select("id")
        .eq("descricao", conta.descricao)
        .eq("data_vencimento", format(proximoVencimento, "yyyy-MM-dd"))
        .eq("categoria", conta.categoria);

      if (!existing || existing.length === 0) {
        await supabase.from("contas_pagar").insert({
          descricao: conta.descricao,
          valor: conta.valor,
          data_vencimento: format(proximoVencimento, "yyyy-MM-dd"),
          categoria: conta.categoria,
          recorrencia: conta.recorrencia,
          observacoes: conta.observacoes,
        });
        toast.info("Próxima parcela gerada automaticamente!");
      }
    }

    toast.success("Conta marcada como paga!");
    loadContas();
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conta?")) return;
    await supabase.from("contas_pagar").delete().eq("id", id);
    toast.success("Conta excluída!");
    loadContas();
  }

  // Dashboard calculations
  const today = new Date();
  const mesInicio = startOfMonth(today);
  const mesFim = endOfMonth(today);

  const contasMes = contas.filter((c) => {
    const d = parseISO(c.data_vencimento);
    return !isBefore(d, mesInicio) && !isAfter(d, mesFim);
  });

  const totalMes = contasMes
    .filter((c) => c.status !== "Paga")
    .reduce((s, c) => s + c.valor, 0);

  const atrasadas = contas.filter((c) => c.status === "Atrasada");
  const totalAtrasado = atrasadas.reduce((s, c) => s + c.valor, 0);

  const proximas = contas
    .filter((c) => {
      if (c.status === "Paga") return false;
      const d = parseISO(c.data_vencimento);
      const em7dias = new Date();
      em7dias.setDate(em7dias.getDate() + 7);
      return !isBefore(d, today) && !isAfter(d, em7dias);
    });

  const pagas = contasMes.filter((c) => c.status === "Paga");
  const totalPago = pagas.reduce((s, c) => s + c.valor, 0);

  // Filtered list
  const contasFiltradas = contas.filter((c) => {
    if (filtroStatus !== "todos" && c.status !== filtroStatus) return false;
    if (filtroCategoria !== "todos" && c.categoria !== filtroCategoria) return false;
    return true;
  });

  function statusBadge(status: string) {
    switch (status) {
      case "Paga":
        return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Paga</Badge>;
      case "Atrasada":
        return <Badge variant="destructive">Atrasada</Badge>;
      default:
        return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30">Pendente</Badge>;
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              💳 A Pagar no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalMes)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ⚠️ Contas Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {atrasadas.length} ({formatCurrency(totalAtrasado)})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              🕐 Próximas (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-warning">{proximas.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ✅ Pagas no Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-success">{formatCurrency(totalPago)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-primary-foreground">💳 Contas a Pagar</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Paga">Paga</SelectItem>
              <SelectItem value="Atrasada">Atrasada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Categorias</SelectItem>
              {CATEGORIAS.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2" size={16} />Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? "Editar Conta" : "Nova Conta a Pagar"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição</label>
                  <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Conta de Luz - Março" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Valor (R$)</label>
                    <Input type="number" step="0.01" min="0.01" value={valor} onChange={(e) => setValor(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vencimento</label>
                    <Input type="date" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <Select value={categoria} onValueChange={setCategoria}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Recorrência</label>
                    <Select value={recorrencia} onValueChange={setRecorrencia}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECORRENCIAS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Observações</label>
                  <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : editId ? "Atualizar" : "Cadastrar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {contasFiltradas.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhuma conta encontrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasFiltradas.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.descricao}</TableCell>
                    <TableCell>{conta.categoria}</TableCell>
                    <TableCell>{formatCurrency(conta.valor)}</TableCell>
                    <TableCell>
                      {new Date(conta.data_vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {conta.recorrencia === "nenhuma" ? "—" : conta.recorrencia === "mensal" ? (
                        <span className="flex items-center gap-1"><RefreshCw size={12} /> Mensal</span>
                      ) : (
                        <span className="flex items-center gap-1"><RefreshCw size={12} /> Anual</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(conta.status)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {conta.status !== "Paga" && (
                          <Button variant="ghost" size="icon" title="Marcar como paga" onClick={() => marcarPaga(conta.id)}>
                            <CheckCircle2 size={16} className="text-green-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(conta)}>
                          <Edit size={16} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Excluir" onClick={() => handleDelete(conta.id)}>
                          <Trash2 size={16} className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
