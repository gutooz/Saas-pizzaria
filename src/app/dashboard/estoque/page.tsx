"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Trash2, Search, Package, ChefHat, Loader2, 
  Settings, Save 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function EstoquePage() {
  // --- PREVINE ERRO DE HYDRATION (Tela piscando/travando) ---
  const [isMounted, setIsMounted] = useState(false);

  // --- ESTADOS GERAIS ---
  const [itens, setItens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  
  // --- CADASTRO DE ITEM ---
  const [novoItem, setNovoItem] = useState({ nome: "", quantidade: "", unidade: "un", custo: "", categoria: "mercearia" });
  
  // --- GESTÃO DE RECEITAS ---
  const [receitas, setReceitas] = useState<any[]>([]);
  const [modalReceitaOpen, setModalReceitaOpen] = useState(false);
  const [novaReceitaNome, setNovaReceitaNome] = useState("");
  const [itemDestino, setItemDestino] = useState(""); 
  const [rendimento, setRendimento] = useState("");   
  const [ingredientesTemp, setIngredientesTemp] = useState<any[]>([]); 
  const [ingredienteSel, setIngredienteSel] = useState("");
  const [qtdIngrediente, setQtdIngrediente] = useState("");

  // --- PRODUÇÃO ---
  const [modalProduzirOpen, setModalProduzirOpen] = useState(false);
  const [receitaParaProduzir, setReceitaParaProduzir] = useState("");
  const [qtdMultiplicador, setQtdMultiplicador] = useState("1");
  const [processando, setProcessando] = useState(false);

  useEffect(() => { 
    setIsMounted(true);
    fetchDados(); 
  }, []);

  async function fetchDados() {
    setLoading(true);
    const { data: est } = await supabase.from("estoque").select("*").order("nome");
    const { data: rec } = await supabase.from("receitas_estoque").select("*, item_destino:estoque(nome)"); 
    
    if (est) setItens(est);
    if (rec) setReceitas(rec);
    setLoading(false);
  }

  // --- CRUD ESTOQUE (COM CORREÇÃO DE ERROS) ---
  async function handleAddItem() {
    // 1. Validação básica
    if (!novoItem.nome || !novoItem.quantidade) {
        return alert("Por favor, preencha o Nome e a Quantidade!");
    }

    // 2. Tenta inserir no banco
    const { error } = await supabase.from("estoque").insert([{
      nome: novoItem.nome,
      quantidade: Number(novoItem.quantidade),
      unidade: novoItem.unidade,
      custo: novoItem.custo ? Number(novoItem.custo) : 0, 
      categoria: novoItem.categoria
    }]);

    // 3. Verifica erro (ex: RLS bloqueando)
    if (error) {
      console.error("Erro ao salvar:", error);
      return alert(`Erro ao salvar: ${error.message}\nVerifique as permissões (RLS) no Supabase.`);
    }

    // 4. Sucesso
    // alert("Item salvo com sucesso!"); // Pode descomentar se quiser o aviso
    setNovoItem({ nome: "", quantidade: "", unidade: "un", custo: "", categoria: "mercearia" });
    fetchDados();
  }

  async function handleDelete(id: number) {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;
    const { error } = await supabase.from("estoque").delete().eq("id", id);
    
    if (error) {
        alert("Erro ao excluir: " + error.message);
    } else {
        fetchDados();
    }
  }

  // --- RECEITAS ---
  function addIngredienteNaLista() {
    if (!ingredienteSel || !qtdIngrediente) return;
    const item = itens.find(i => i.id.toString() === ingredienteSel);
    if (!item) return;

    setIngredientesTemp([...ingredientesTemp, {
        id: item.id,
        nome: item.nome,
        unidade: item.unidade,
        qtd: Number(qtdIngrediente)
    }]);
    setIngredienteSel("");
    setQtdIngrediente("");
  }

  function removeIngredienteTemp(index: number) {
      const novaLista = [...ingredientesTemp];
      novaLista.splice(index, 1);
      setIngredientesTemp(novaLista);
  }

  async function salvarNovaReceita() {
    if (!novaReceitaNome || !itemDestino || !rendimento || ingredientesTemp.length === 0) {
        return alert("Preencha todos os campos da receita!");
    }

    const { data: receitaCriada, error } = await supabase.from("receitas_estoque").insert([{
        nome: novaReceitaNome,
        item_destino_id: Number(itemDestino),
        rendimento: Number(rendimento)
    }]).select().single();

    if (error || !receitaCriada) return alert("Erro ao criar receita: " + error?.message);

    const ingredientesFormatados = ingredientesTemp.map(i => ({
        receita_id: receitaCriada.id,
        ingrediente_id: i.id,
        quantidade: i.qtd
    }));

    const { error: errorIng } = await supabase.from("ingredientes_receita_estoque").insert(ingredientesFormatados);
    
    if (errorIng) {
        alert("Receita criada, mas houve erro nos ingredientes: " + errorIng.message);
    } else {
        alert("Receita salva com sucesso!");
        setModalReceitaOpen(false);
        setNovaReceitaNome(""); setItemDestino(""); setRendimento(""); setIngredientesTemp([]);
        fetchDados();
    }
  }

  async function deletarReceita(id: number) {
      if(!confirm("Apagar esta receita?")) return;
      await supabase.from("receitas_estoque").delete().eq("id", id);
      fetchDados();
  }

  // --- PRODUÇÃO ---
  async function handleProduzir() {
    if (!receitaParaProduzir) return alert("Selecione uma receita");
    setProcessando(true);
    
    const { error } = await supabase.rpc("realizar_producao", {
        id_receita: Number(receitaParaProduzir),
        qtd_vezes: Number(qtdMultiplicador)
    });

    if (error) {
        console.error(error);
        alert("Erro na produção: " + error.message);
    } else {
        alert("Produção realizada com sucesso! Estoque atualizado.");
        setModalProduzirOpen(false);
        fetchDados();
    }
    setProcessando(false);
  }

  // Helpers de Renderização
  const itensFiltrados = itens.filter(i => i.nome.toLowerCase().includes(busca.toLowerCase()));
  
  const TabelaEstoque = ({ categoria }: { categoria: string }) => {
    const lista = categoria === "todos" ? itensFiltrados : itensFiltrados.filter(i => i.categoria === categoria);
    return (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                    <tr><th className="p-3">Item</th><th className="p-3">Categoria</th><th className="p-3">Qtd Atual</th><th className="p-3 text-right">Ações</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {lista.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">Vazio.</td></tr>}
                    {lista.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                            <td className="p-3 font-medium text-slate-800">{item.nome}</td>
                            <td className="p-3"><Badge variant="secondary" className="text-[10px] uppercase">{item.categoria}</Badge></td>
                            <td className="p-3"><span className={`font-bold ${item.quantidade < 5 ? 'text-red-600' : 'text-slate-700'}`}>{item.quantidade} {item.unidade}</span></td>
                            <td className="p-3 text-right"><button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
  };

  if (!isMounted) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="text-red-600" /> Controle de Estoque
            </h1>
            <p className="text-slate-500">Gerencie ingredientes e produza seus itens.</p>
        </div>

        <div className="flex gap-2">
            
            {/* BOTÃO 1: CONFIGURAR RECEITAS */}
            <Dialog open={modalReceitaOpen} onOpenChange={setModalReceitaOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2 border-slate-300 text-slate-700">
                        <Settings size={18} /> Configurar Receitas
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Criar Nova Receita</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Nome</label>
                                <Input placeholder="Ex: Massa Padrão" value={novaReceitaNome} onChange={e => setNovaReceitaNome(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Item Produzido</label>
                                <Select value={itemDestino} onValueChange={setItemDestino}>
                                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>{itens.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.nome}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Rendimento</label>
                                <Input type="number" placeholder="Ex: 15" value={rendimento} onChange={e => setRendimento(e.target.value)} />
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-lg border space-y-3">
                            <label className="text-xs font-bold text-slate-700 block">Ingredientes</label>
                            <div className="flex gap-2 items-end">
                                <div className="flex-1">
                                    <Select value={ingredienteSel} onValueChange={setIngredienteSel}>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Ingrediente..." /></SelectTrigger>
                                        <SelectContent>{itens.map(i => <SelectItem key={i.id} value={i.id.toString()}>{i.nome} ({i.unidade})</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="w-24"><Input type="number" placeholder="Qtd" className="bg-white" value={qtdIngrediente} onChange={e => setQtdIngrediente(e.target.value)} /></div>
                                <Button onClick={addIngredienteNaLista} className="bg-green-600 hover:bg-green-700 text-white"><Plus size={16}/></Button>
                            </div>
                            <div className="space-y-2 mt-2">
                                {ingredientesTemp.map((ing, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border shadow-sm">
                                        <span>{ing.nome}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-red-600">-{ing.qtd} {ing.unidade}</span>
                                            <button onClick={() => removeIngredienteTemp(idx)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Button onClick={salvarNovaReceita} className="w-full bg-slate-900 text-white">Salvar Receita</Button>
                        
                        <div className="mt-6 border-t pt-4">
                            <h4 className="text-sm font-bold text-slate-700 mb-2">Receitas Cadastradas</h4>
                            <div className="space-y-2">
                                {receitas.map(r => (
                                    <div key={r.id} className="flex justify-between items-center bg-slate-100 p-2 rounded text-sm">
                                        <div><span className="font-bold">{r.nome}</span> <span className="text-slate-500 text-xs ml-2">&rarr; {r.rendimento}x {r.item_destino?.nome}</span></div>
                                        <button onClick={() => deletarReceita(r.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* BOTÃO 2: PRODUZIR */}
            <Dialog open={modalProduzirOpen} onOpenChange={setModalProduzirOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2">
                        <ChefHat size={18} /> Produzir
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader><DialogTitle>Produção</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Receita</label>
                            <Select value={receitaParaProduzir} onValueChange={setReceitaParaProduzir}>
                                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>{receitas.map(r => (<SelectItem key={r.id} value={r.id.toString()}>{r.nome}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700">Bateladas</label>
                            <Input type="number" value={qtdMultiplicador} onChange={e => setQtdMultiplicador(e.target.value)} />
                        </div>
                        <Button onClick={handleProduzir} disabled={processando} className="w-full bg-green-600 hover:bg-green-700 font-bold">
                            {processando ? <Loader2 className="animate-spin" /> : "Confirmar"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      {/* FORMULÁRIO RÁPIDO */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-500 uppercase font-bold">Novo Item</CardTitle></CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1 w-full space-y-1">
                    <label className="text-xs font-bold text-slate-400">Nome</label>
                    <Input placeholder="Ex: Mussarela" value={novoItem.nome} onChange={e => setNovoItem({...novoItem, nome: e.target.value})} className="bg-white" />
                </div>
                <div className="w-32 space-y-1">
                     <label className="text-xs font-bold text-slate-400">Categoria</label>
                     <Select value={novoItem.categoria} onValueChange={v => setNovoItem({...novoItem, categoria: v})}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mercearia">Mercearia</SelectItem>
                            <SelectItem value="frios">Frios</SelectItem>
                            <SelectItem value="hortifruti">Hortifruti</SelectItem>
                            <SelectItem value="massas">Massas</SelectItem>
                            <SelectItem value="embalagens">Embalagens</SelectItem>
                            <SelectItem value="bebidas">Bebidas</SelectItem>
                        </SelectContent>
                     </Select>
                </div>
                <div className="w-24 space-y-1">
                    <label className="text-xs font-bold text-slate-400">Qtd</label>
                    <Input type="number" placeholder="0" value={novoItem.quantidade} onChange={e => setNovoItem({...novoItem, quantidade: e.target.value})} className="bg-white" />
                </div>
                <div className="w-24 space-y-1">
                     <label className="text-xs font-bold text-slate-400">Unidade</label>
                     <Select value={novoItem.unidade} onValueChange={v => setNovoItem({...novoItem, unidade: v})}>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="kg">KG</SelectItem>
                            <SelectItem value="un">UN</SelectItem>
                            <SelectItem value="lt">Lt</SelectItem>
                            <SelectItem value="pct">Pct</SelectItem>
                        </SelectContent>
                     </Select>
                </div>
                <div className="w-28 space-y-1">
                    <label className="text-xs font-bold text-slate-400">Custo</label>
                    <Input type="number" placeholder="0.00" value={novoItem.custo} onChange={e => setNovoItem({...novoItem, custo: e.target.value})} className="bg-white" />
                </div>
                <Button onClick={handleAddItem} className="bg-slate-900 text-white hover:bg-slate-800 px-6">Salvar</Button>
            </div>
        </CardContent>
      </Card>

      {/* TABELAS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border w-full md:w-1/3">
            <Search className="text-slate-400" size={18} />
            <input placeholder="Buscar item..." className="outline-none text-sm w-full" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>

        <Tabs defaultValue="todos" className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-4 h-auto p-1 bg-slate-100">
                <TabsTrigger value="todos">Geral</TabsTrigger>
                <TabsTrigger value="frios">Frios</TabsTrigger>
                <TabsTrigger value="hortifruti">Hortifruti</TabsTrigger>
                <TabsTrigger value="mercearia">Mercearia</TabsTrigger>
                <TabsTrigger value="massas">Massas</TabsTrigger>
                <TabsTrigger value="embalagens">Embalagens</TabsTrigger>
            </TabsList>
            <TabsContent value="todos"><TabelaEstoque categoria="todos" /></TabsContent>
            <TabsContent value="frios"><TabelaEstoque categoria="frios" /></TabsContent>
            <TabsContent value="hortifruti"><TabelaEstoque categoria="hortifruti" /></TabsContent>
            <TabsContent value="mercearia"><TabelaEstoque categoria="mercearia" /></TabsContent>
            <TabsContent value="massas"><TabelaEstoque categoria="massas" /></TabsContent>
            <TabsContent value="embalagens"><TabelaEstoque categoria="embalagens" /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}