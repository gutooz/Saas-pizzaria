"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, UtensilsCrossed, Save, Package, CircleDashed, Circle, X, Edit3, Archive } from "lucide-react"; // Adicionei o icone Archive
import { Badge } from "@/components/ui/badge"; 

// Tipos
interface IngredienteEstoque {
  id: number;
  nome: string;
  unidade: string;
  categoria: string;
}

interface ItemReceita {
  estoque_id: number;
  nome: string;
  unidade: string;
  categoria: string;
  quantidade_usada: number;
}

interface PizzaCardapio {
  id: number;
  nome: string;
  preco: number;
  descricao: string;
  tamanho: string;
}

export default function CardapioPage() {
  const [pizzas, setPizzas] = useState<PizzaCardapio[]>([]);
  const [ingredientesDisponiveis, setIngredientesDisponiveis] = useState<IngredienteEstoque[]>([]);
  
  const [pizzaEditandoId, setPizzaEditandoId] = useState<number | null>(null);

  // Formulário
  const [nomePizza, setNomePizza] = useState("");
  const [precoPizza, setPrecoPizza] = useState("");
  const [descricaoPizza, setDescricaoPizza] = useState("");
  const [tamanhoPizza, setTamanhoPizza] = useState("Grande");

  // Ficha Técnica
  const [filtroCategoria, setFiltroCategoria] = useState("todos");
  const [ingredienteSelecionado, setIngredienteSelecionado] = useState<IngredienteEstoque | null>(null);
  const [qtdIngrediente, setQtdIngrediente] = useState("");
  const [receitaAtual, setReceitaAtual] = useState<ItemReceita[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPizzas();
    fetchEstoque();
  }, []);

  async function fetchPizzas() {
    // --- ALTERAÇÃO: Só busca pizzas ativas ---
    const { data } = await supabase
      .from("cardapio")
      .select("*")
      .eq("ativo", true) // Filtro de ativo
      .order("id", { ascending: false });
      
    if (data) setPizzas(data);
  }

  async function fetchEstoque() {
    const { data } = await supabase.from("estoque").select("id, nome, unidade, categoria").order("nome");
    if (data) setIngredientesDisponiveis(data);
  }

  const categorias = ["todos", ...Array.from(new Set(ingredientesDisponiveis.map(i => i.categoria || "Sem Categoria")))];
  const ingredientesFiltrados = filtroCategoria === "todos" 
    ? ingredientesDisponiveis 
    : ingredientesDisponiveis.filter(i => (i.categoria || "Sem Categoria") === filtroCategoria);

  // --- FUNÇÕES DE EDIÇÃO E ARQUIVAMENTO ---

  async function carregarPizzaParaEdicao(pizza: PizzaCardapio) {
    setLoading(true);
    setPizzaEditandoId(pizza.id);
    setNomePizza(pizza.nome);
    setPrecoPizza(pizza.preco.toString());
    setDescricaoPizza(pizza.descricao || "");
    setTamanhoPizza(pizza.tamanho || "Grande");

    const { data: ingredientesSalvos, error } = await supabase
      .from("ficha_tecnica")
      .select(`quantidade_usada, estoque:estoque_id (id, nome, unidade, categoria)`)
      .eq("cardapio_id", pizza.id);

    if (error) {
        console.error("Erro ao carregar receita:", error);
    } else if (ingredientesSalvos) {
        const receitaFormatada: ItemReceita[] = ingredientesSalvos.map((item: any) => ({
            estoque_id: item.estoque.id,
            nome: item.estoque.nome,
            unidade: item.estoque.unidade,
            categoria: item.estoque.categoria,
            quantidade_usada: item.quantidade_usada
        }));
        setReceitaAtual(receitaFormatada);
    }
    setLoading(false);
  }

  function cancelarEdicao() {
    setPizzaEditandoId(null);
    limparFormulario();
  }

  // --- ALTERAÇÃO: ARQUIVAR (SOFT DELETE) ---
  async function handleArquivarPizza() {
      if (!pizzaEditandoId) return;
      if (!confirm(`Deseja arquivar a pizza "${nomePizza}"? Ela sumirá do cardápio mas continuará nos relatórios.`)) return;

      setLoading(true);

      // Apenas marca como inativo, não deleta nada
      const { error } = await supabase
        .from("cardapio")
        .update({ ativo: false })
        .eq("id", pizzaEditandoId);

      if (error) {
          alert("Erro ao arquivar: " + error.message);
      } else {
          alert("Pizza arquivada com sucesso!");
          cancelarEdicao();
          fetchPizzas();
      }
      setLoading(false);
  }
  // -----------------------------------------

  function adicionarIngredienteNaReceita() {
    if (!ingredienteSelecionado || !qtdIngrediente) return;
    const existe = receitaAtual.find(i => i.estoque_id === ingredienteSelecionado.id);
    if (existe) {
        alert("Ingrediente já na lista. Remova para alterar.");
        return;
    }
    const novoItem: ItemReceita = {
      estoque_id: ingredienteSelecionado.id,
      nome: ingredienteSelecionado.nome,
      unidade: ingredienteSelecionado.unidade,
      categoria: ingredienteSelecionado.categoria,
      quantidade_usada: Number(qtdIngrediente)
    };
    setReceitaAtual([...receitaAtual, novoItem]);
    setQtdIngrediente("");
    setIngredienteSelecionado(null);
  }

  function removerIngredienteDaReceita(index: number) {
    const novaReceita = [...receitaAtual];
    novaReceita.splice(index, 1);
    setReceitaAtual(novaReceita);
  }

  async function handleSalvarPizza(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (!nomePizza || !precoPizza) {
        alert("Preencha o nome e o preço!");
        setLoading(false);
        return;
    }

    const dadosPizza = { 
        nome: nomePizza, 
        preco: Number(precoPizza.replace(",", ".")), 
        descricao: descricaoPizza,
        tamanho: tamanhoPizza,
        ativo: true // Garante que ao salvar/editar ela fique ativa
    };

    let idPizzaSalva = pizzaEditandoId;

    if (pizzaEditandoId) {
        const { error } = await supabase.from("cardapio").update(dadosPizza).eq("id", pizzaEditandoId);
        if (error) { alert("Erro ao atualizar: " + error.message); setLoading(false); return; }
        await supabase.from("ficha_tecnica").delete().eq("cardapio_id", pizzaEditandoId);
    } else {
        const { data, error } = await supabase.from("cardapio").insert([dadosPizza]).select().single();
        if (error || !data) { alert("Erro ao criar: " + error?.message); setLoading(false); return; }
        idPizzaSalva = data.id;
    }

    if (receitaAtual.length > 0 && idPizzaSalva) {
      const ficha = receitaAtual.map(item => ({
        cardapio_id: idPizzaSalva,
        estoque_id: item.estoque_id,
        quantidade_usada: item.quantidade_usada
      }));
      await supabase.from("ficha_tecnica").insert(ficha);
    }

    alert(pizzaEditandoId ? "Pizza atualizada!" : "Pizza criada!");
    cancelarEdicao();
    fetchPizzas();
    setLoading(false);
  }

  function limparFormulario() {
    setNomePizza(""); setPrecoPizza(""); setDescricaoPizza("");
    setReceitaAtual([]); setIngredienteSelecionado(null); setQtdIngrediente("");
    setTamanhoPizza("Grande");
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-[1600px] mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
        <UtensilsCrossed className="text-red-600" /> Gerenciar Cardápio
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- COLUNA ESQUERDA: FORMULÁRIO --- */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                {pizzaEditandoId ? (<> <Edit3 size={24} className="text-orange-500"/> Editando Pizza #{pizzaEditandoId} </>) : (<> <Plus size={24} className="text-green-600"/> Cadastrar Nova Pizza </>)}
             </h2>
             {pizzaEditandoId && (
                 <button onClick={cancelarEdicao} className="text-sm text-red-500 hover:underline flex items-center gap-1"><X size={16}/> Cancelar Edição</button>
             )}
          </div>

          <div className={`p-6 rounded-xl shadow-sm border transition-colors ${pizzaEditandoId ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 border-b pb-2">1. Detalhes</h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Tamanho</label>
                <div className="flex gap-4">
                    <button onClick={() => setTamanhoPizza("Grande")} className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all font-bold ${tamanhoPizza === "Grande" ? "border-red-600 bg-white text-red-700 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                        <Circle size={18} fill={tamanhoPizza === "Grande" ? "currentColor" : "none"} /> Grande (8 Fat)
                    </button>
                    <button onClick={() => setTamanhoPizza("Broto")} className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 transition-all font-bold ${tamanhoPizza === "Broto" ? "border-red-600 bg-white text-red-700 shadow-sm" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                        <CircleDashed size={18} /> Broto (4 Fat)
                    </button>
                </div>
              </div>
              <div className="col-span-8">
                <label className="text-xs font-bold text-slate-500 uppercase">Nome do Sabor</label>
                <input className="w-full border p-2 rounded mt-1 bg-white focus:ring-2 ring-red-100 outline-none" placeholder="Ex: Frango com Catupiry" value={nomePizza} onChange={e => setNomePizza(e.target.value)} />
              </div>
              <div className="col-span-4">
                <label className="text-xs font-bold text-slate-500 uppercase">Preço Venda (R$)</label>
                <input type="number" className="w-full border p-2 rounded mt-1 bg-white focus:ring-2 ring-red-100 outline-none" placeholder="0.00" value={precoPizza} onChange={e => setPrecoPizza(e.target.value)} />
              </div>
              <div className="col-span-12">
                 <label className="text-xs font-bold text-slate-500 uppercase">Descrição</label>
                 <textarea className="w-full border p-2 rounded mt-1 bg-white focus:ring-2 ring-red-100 outline-none h-20 resize-none" placeholder="Ingredientes que aparecem para o cliente..." value={descricaoPizza} onChange={e => setDescricaoPizza(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 border-b pb-2">2. Ficha Técnica (Ingredientes)</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 custom-scrollbar">
                {categorias.map(cat => (
                    <button key={cat} onClick={() => setFiltroCategoria(cat)} className={`text-xs px-4 py-2 rounded-full font-bold whitespace-nowrap transition-all border ${filtroCategoria === cat ? "bg-slate-800 text-white border-slate-800 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                        {cat.toUpperCase()}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-[250px] overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-100 mb-4">
                {ingredientesFiltrados.map(ing => {
                    const isSelected = ingredienteSelecionado?.id === ing.id;
                    return (
                        <button key={ing.id} onClick={() => setIngredienteSelecionado(ing)} className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all ${isSelected ? "bg-green-50 border-green-500 ring-1 ring-green-500 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                            <span className={`text-sm font-bold line-clamp-1 ${isSelected ? "text-green-800" : "text-slate-700"}`}>{ing.nome}</span>
                            <span className="text-[10px] text-slate-400 uppercase mt-1 bg-slate-100 px-1 rounded">{ing.unidade}</span>
                        </button>
                    )
                })}
            </div>
            <div className="flex items-center gap-4 bg-slate-100 p-4 rounded-xl border border-slate-200">
                <div className="flex-1">
                    <span className="text-xs font-bold text-slate-500 uppercase block mb-1">Selecionado:</span>
                    <div className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        {ingredienteSelecionado ? (<><Package size={20} className="text-green-600"/> {ingredienteSelecionado.nome}</>) : (<span className="text-slate-400 italic font-normal">Clique acima para escolher</span>)}
                    </div>
                </div>
                <div className="w-32">
                    <label className="text-xs font-bold text-slate-500 uppercase">Qtd ({ingredienteSelecionado?.unidade || 'UN'})</label>
                    <input type="number" disabled={!ingredienteSelecionado} className="w-full border p-2 rounded mt-1 text-center font-bold outline-none focus:border-green-500 disabled:bg-slate-200" placeholder="0" value={qtdIngrediente} onChange={e => setQtdIngrediente(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && adicionarIngredienteNaReceita()} />
                </div>
                <button onClick={adicionarIngredienteNaReceita} disabled={!ingredienteSelecionado || !qtdIngrediente} className="bg-green-600 text-white h-[62px] px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 font-bold flex flex-col items-center justify-center min-w-[100px]">
                    <Plus size={24} /> <span className="text-[10px] uppercase">Adicionar</span>
                </button>
            </div>
            {receitaAtual.length > 0 && (
                <div className="mt-4 border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs">
                            <tr><th className="p-3">Ingrediente</th><th className="p-3 text-center">Qtd</th><th className="p-3 w-10"></th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {receitaAtual.map((item, index) => (
                                <tr key={index} className="bg-white hover:bg-slate-50">
                                    <td className="p-3 font-medium text-slate-800">{item.nome}</td>
                                    <td className="p-3 text-center bg-slate-50 font-mono font-bold text-slate-600">{item.quantidade_usada} <span className="text-[10px] font-normal">{item.unidade}</span></td>
                                    <td className="p-3 text-center"><button onClick={() => removerIngredienteDaReceita(index)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>

          <div className="flex gap-3">
              {pizzaEditandoId && (
                  <button onClick={handleArquivarPizza} disabled={loading} className="w-1/3 bg-white border-2 border-red-100 text-red-600 font-bold py-4 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                      <Archive size={20} /> Arquivar/Excluir
                  </button>
              )}
              <button onClick={handleSalvarPizza} disabled={loading} className={`flex-1 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-70 ${pizzaEditandoId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                <Save size={20} /> {loading ? "Processando..." : (pizzaEditandoId ? "Atualizar Dados da Pizza" : "Cadastrar Nova Pizza")}
              </button>
          </div>
        </div>

        {/* --- COLUNA DIREITA: LISTA --- */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit max-h-[800px] flex flex-col">
          <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center justify-between">
            <span>Cardápio Atual</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{pizzas.length} itens</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">Clique em uma pizza para editar.</p>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {pizzas.map(pizza => (
              <div key={pizza.id} onClick={() => carregarPizzaParaEdicao(pizza)} className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-all group ${pizzaEditandoId === pizza.id ? "bg-orange-50 border-orange-400 ring-1 ring-orange-400" : "bg-white hover:border-slate-400 hover:shadow-md"}`}>
                <div>
                    <div className="font-bold text-slate-800 text-sm">{pizza.nome}</div>
                    <div className="flex gap-2 items-center mt-1">
                        <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 bg-white">{pizza.tamanho || "Grande"}</Badge>
                    </div>
                </div>
                <div className="text-right">
                    <Badge variant="secondary" className="bg-green-50 text-green-700 font-bold border-green-100 mb-1 block">R$ {pizza.preco.toFixed(2)}</Badge>
                    {pizzaEditandoId === pizza.id && <span className="text-[10px] text-orange-600 font-bold uppercase">Editando</span>}
                </div>
              </div>
            ))}
            {pizzas.length === 0 && (<div className="text-center py-10 text-slate-300"><UtensilsCrossed size={40} className="mx-auto mb-2 opacity-20"/><p>Nenhuma pizza cadastrada.</p></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}