"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MapPin, Trash2, Zap, Loader2 } from "lucide-react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados do Formulário (Agora mais detalhado)
  const [open, setOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTelefone, setNovoTelefone] = useState("");
  
  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("Osasco"); // Já vem preenchido pra facilitar
  
  const [novaDistancia, setNovaDistancia] = useState("");
  const [calculando, setCalculando] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d)(\d{4})$/, "$1-$2");
    setNovoTelefone(value);
  };

  async function buscarClientes() {
    setLoading(true);
    const { data, error } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
    if (!error) setClientes(data || []);
    setLoading(false);
  }

  // --- CÁLCULO PRECISO ---
  async function calcularDistanciaAutomatica() {
    if (!rua) return alert("Digite a rua e número!");
    
    setCalculando(true);
    try {
      // Envia os dados separados para a API não se confundir
      const params = new URLSearchParams({
        rua: rua,
        bairro: bairro,
        cidade: cidade
      });

      const resposta = await fetch(`/api/calcular-distancia?${params.toString()}`);
      const dados = await resposta.json();

      if (dados.error) {
        alert("Ops: " + dados.error);
      } else {
        setNovaDistancia(dados.distancia);
      }
    } catch (error) {
      alert("Erro de conexão.");
    } finally {
      setCalculando(false);
    }
  }

  async function criarCliente() {
    if (!novoNome || !novoTelefone || !rua) return alert("Preencha os dados obrigatórios!");

    // Junta o endereço completo para salvar no banco em uma linha só
    const enderecoCompleto = `${rua} - ${bairro}, ${cidade}`;

    const { error } = await supabase.from("customers").insert({
      name: novoNome,
      phone: novoTelefone,
      address: enderecoCompleto, // Salva tudo junto
      distance: novaDistancia ? parseFloat(novaDistancia) : 0,
    });

    if (error) {
      alert("Erro ao cadastrar.");
    } else {
      // Limpa tudo
      setNovoNome(""); setNovoTelefone(""); 
      setRua(""); setBairro(""); setCidade("Osasco"); 
      setNovaDistancia("");
      setOpen(false);
      buscarClientes(); 
    }
  }

  async function deletarCliente(id: number) {
    if(!confirm("Tem certeza?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (!error) buscarClientes();
  }

  useEffect(() => { buscarClientes(); }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Clientes</h1>
          <p className="text-slate-500">Cadastro preciso com Bairro e Cidade.</p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 gap-2 text-white hover:bg-slate-800">
              <Plus size={18} /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Cliente</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Ex: Ana Souza" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input placeholder="(11) 99999-9999" value={novoTelefone} onChange={handlePhoneChange} maxLength={15} />
              </div>

              {/* --- ENDEREÇO DETALHADO --- */}
              <div className="space-y-2">
                <Label>Rua e Número</Label>
                <Input 
                    placeholder="Ex: Rua da Estação, 123" 
                    value={rua} 
                    onChange={(e) => setRua(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Bairro</Label>
                    <Input 
                        placeholder="Ex: Centro" 
                        value={bairro} 
                        onChange={(e) => setBairro(e.target.value)} 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input 
                        value={cidade} 
                        onChange={(e) => setCidade(e.target.value)} 
                    />
                </div>
              </div>
              {/* ------------------------- */}

              <div className="grid grid-cols-2 gap-2 items-end pt-2">
                <div className="space-y-2">
                    <Label>Distância (Km)</Label>
                    <Input 
                        type="number" 
                        placeholder="0.0" 
                        value={novaDistancia} 
                        onChange={(e) => setNovaDistancia(e.target.value)} 
                        className="font-bold bg-slate-50"
                    />
                </div>
                
                <Button 
                    variant="outline" 
                    onClick={calcularDistanciaAutomatica} 
                    disabled={calculando}
                    className="gap-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                >
                    {calculando ? (
                        <>
                            <Loader2 className="animate-spin" size={16}/>
                            <span>Calculando...</span>
                        </>
                    ) : (
                        <>
                            <Zap size={16} fill="currentColor" />
                            <span>Calcular Rota</span>
                        </>
                    )}
                </Button>
              </div>

              <Button onClick={criarCliente} className="w-full bg-slate-900 text-white mt-4">
                Salvar Cadastro
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Distância</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {clientes.map((cli) => (
                <TableRow key={cli.id}>
                  <TableCell>
                    <div className="font-medium text-slate-700">{cli.name}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[250px]">{cli.address}</div>
                  </TableCell>
                  <TableCell>{cli.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-slate-600 bg-slate-100 w-fit px-2 py-1 rounded">
                        <MapPin size={14} className="text-red-500"/> {cli.distance || 0} km
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deletarCliente(cli.id)}>
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}