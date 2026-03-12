import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatCpfCnpj, validateCpfCnpj, downloadCSV } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Download, Plus } from "lucide-react";

type Cliente = {
  id: string;
  nome: string;
  cnpj_cpf: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [editItem, setEditItem] = useState<Cliente | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [doc, setDoc] = useState("");
  const [endereco, setEndereco] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome");
    setClientes(data ?? []);
  }

  function resetForm() {
    setNome(""); setDoc(""); setEndereco(""); setTelefone(""); setEmail(""); setEditItem(null);
  }

  function openEdit(c: Cliente) {
    setEditItem(c); setNome(c.nome); setDoc(c.cnpj_cpf); setEndereco(c.endereco ?? "");
    setTelefone(c.telefone ?? ""); setEmail(c.email ?? ""); setDialogOpen(true);
  }

  async function handleSubmit() {
    const docLimpo = doc.replace(/\D/g, "");
    if (!nome || !docLimpo) { toast.error("Preencha nome e CNPJ/CPF."); return; }
    if (!validateCpfCnpj(doc)) { toast.error("CNPJ/CPF inválido (11 ou 14 dígitos)."); return; }

    const payload = { nome, cnpj_cpf: docLimpo, endereco: endereco || null, telefone: telefone || null, email: email || null };

    if (editItem) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Cliente atualizado!");
    } else {
      const { error } = await supabase.from("clientes").insert(payload);
      if (error) { toast.error(error.code === "23505" ? "CNPJ/CPF já cadastrado." : error.message); return; }
      toast.success("Cliente cadastrado!");
    }
    setDialogOpen(false); resetForm(); load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Desativar este cliente?")) return;
    await supabase.from("clientes").update({ ativo: false }).eq("id", id);
    toast.success("Cliente desativado."); load();
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🏢 Clientes</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadCSV(clientes.map(c => ({ Nome: c.nome, "CNPJ/CPF": formatCpfCnpj(c.cnpj_cpf), Endereço: c.endereco ?? "", Telefone: c.telefone ?? "", Email: c.email ?? "" })), "clientes.csv")}>
            <Download className="w-4 h-4 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Cadastrar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {clientes.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum cliente cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Razão Social</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="font-mono text-sm">{formatCpfCnpj(c.cnpj_cpf)}</TableCell>
                    <TableCell>{c.endereco ?? "—"}</TableCell>
                    <TableCell>{c.telefone ?? "—"}</TableCell>
                    <TableCell>{c.email ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
            <DialogTitle>{editItem ? "✏️ Editar Cliente" : "➕ Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome / Razão Social</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="grid gap-2"><Label>CNPJ/CPF (somente números)</Label><Input value={doc} onChange={(e) => setDoc(e.target.value)} /></div>
            <div className="grid gap-2"><Label>Endereço</Label><Input value={endereco} onChange={(e) => setEndereco(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
              <div className="grid gap-2"><Label>E-mail</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </div>
            <Button onClick={handleSubmit}>💾 Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
