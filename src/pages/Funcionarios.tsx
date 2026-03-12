import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCPF, formatCurrency, downloadCSV } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Download, Plus } from "lucide-react";

type Funcionario = {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  salario_bruto: number;
  data_admissao: string;
  telefone: string | null;
  observacoes: string | null;
  vales_pendentes?: number;
};

export default function Funcionarios() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [editItem, setEditItem] = useState<Funcionario | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [cargo, setCargo] = useState("");
  const [salario, setSalario] = useState("");
  const [dataAdm, setDataAdm] = useState(new Date().toISOString().slice(0, 10));
  const [telefone, setTelefone] = useState("");
  const [obs, setObs] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: funcs } = await supabase
      .from("funcionarios")
      .select("*")
      .eq("ativo", true)
      .order("nome");

    const { data: vales } = await supabase
      .from("vales")
      .select("funcionario_id, valor")
      .eq("descontado", false);

    const valeMap = new Map<string, number>();
    (vales ?? []).forEach((v) => {
      valeMap.set(v.funcionario_id, (valeMap.get(v.funcionario_id) ?? 0) + v.valor);
    });

    setFuncionarios(
      (funcs ?? []).map((f) => ({ ...f, vales_pendentes: valeMap.get(f.id) ?? 0 }))
    );
  }

  function resetForm() {
    setNome("");
    setCpf("");
    setCargo("");
    setSalario("");
    setDataAdm(new Date().toISOString().slice(0, 10));
    setTelefone("");
    setObs("");
    setEditItem(null);
  }

  function openEdit(f: Funcionario) {
    setEditItem(f);
    setNome(f.nome);
    setCpf(f.cpf);
    setCargo(f.cargo);
    setSalario(String(f.salario_bruto));
    setDataAdm(f.data_admissao);
    setTelefone(f.telefone ?? "");
    setObs(f.observacoes ?? "");
    setDialogOpen(true);
  }

  function openNew() {
    resetForm();
    setDialogOpen(true);
  }

  async function handleSubmit() {
    const cpfLimpo = cpf.replace(/\D/g, "");
    if (!nome || !cpfLimpo || !cargo) {
      toast.error("Preencha nome, CPF e cargo.");
      return;
    }
    if (cpfLimpo.length !== 11) {
      toast.error("CPF deve conter 11 dígitos.");
      return;
    }
    const sal = parseFloat(salario);
    if (isNaN(sal) || sal < 0) {
      toast.error("Salário inválido.");
      return;
    }

    if (editItem) {
      const { error } = await supabase
        .from("funcionarios")
        .update({ nome, cpf: cpfLimpo, cargo, salario_bruto: sal, data_admissao: dataAdm, telefone: telefone || null, observacoes: obs || null })
        .eq("id", editItem.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Funcionário atualizado!");
    } else {
      const { error } = await supabase.from("funcionarios").insert({
        nome, cpf: cpfLimpo, cargo, salario_bruto: sal, data_admissao: dataAdm,
        telefone: telefone || null, observacoes: obs || null,
      });
      if (error) {
        toast.error(error.code === "23505" ? "CPF já cadastrado." : error.message);
        return;
      }
      toast.success("Funcionário cadastrado!");
    }
    setDialogOpen(false);
    resetForm();
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Desativar este funcionário?")) return;
    await supabase.from("funcionarios").update({ ativo: false }).eq("id", id);
    toast.success("Funcionário desativado.");
    load();
  }

  function exportCSV() {
    downloadCSV(
      funcionarios.map((f) => ({
        Nome: f.nome,
        CPF: formatCPF(f.cpf),
        Cargo: f.cargo,
        "Salário Bruto": formatCurrency(f.salario_bruto),
        "Vales Pendentes": formatCurrency(f.vales_pendentes ?? 0),
        Telefone: f.telefone ?? "",
      })),
      "funcionarios.csv"
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">👥 Funcionários</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Cadastrar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {funcionarios.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum funcionário cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Salário Bruto</TableHead>
                  <TableHead>Vales Pend.</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcionarios.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.nome}</TableCell>
                    <TableCell className="font-mono text-sm">{formatCPF(f.cpf)}</TableCell>
                    <TableCell>{f.cargo}</TableCell>
                    <TableCell>{formatCurrency(f.salario_bruto)}</TableCell>
                    <TableCell>{formatCurrency(f.vales_pendentes ?? 0)}</TableCell>
                    <TableCell>{f.telefone ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "✏️ Editar Funcionário" : "➕ Novo Funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Nome Completo</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>CPF</Label>
                <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Somente números" />
              </div>
              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Input value={cargo} onChange={(e) => setCargo(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Salário Bruto (R$)</Label>
                <Input type="number" min="0" step="100" value={salario} onChange={(e) => setSalario(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Data de Admissão</Label>
                <Input type="date" value={dataAdm} onChange={(e) => setDataAdm(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea value={obs} onChange={(e) => setObs(e.target.value)} />
            </div>
            <Button onClick={handleSubmit}>💾 Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
