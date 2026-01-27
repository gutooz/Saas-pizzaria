"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, Trash2, UtensilsCrossed, Save, Package, 
  X, Edit3, Archive, Image as ImageIcon, Loader2 
} from "lucide-react";
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
  url_imagem: string;
  categoria: string;
  is_combo: boolean;
}

export default function CardapioPage() {
  const [pizzas, setPizzas] = useState<PizzaCardapio[]>([]);
  const [ingredientesDisponiveis, setIngredientesDisponiveis] = useState<IngredienteEstoque[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pizzaEditandoId, setPizzaEditandoId] = useState<number | null>(null);

  // Formulário
  const [nomePizza, setNomePizza] = useState("");
  const [precoPizza, setPrecoPizza] = useState("");
  const [descricaoPizza, setDescricaoPizza] = useState("");
  const [tamanhoPizza, setTamanhoPizza] = useState("Grande");
  const [urlImagem, setUrlImagem] = useState("");
  const [categoriaItem, setCategoriaItem] = useState("Pizza");
  const [isCombo, setIsCombo] = useState(false);

  // Ficha Técnica
  const [ingredienteSelecionado, setIngredienteSelecionado] = useState<IngredienteEstoque | null>(null);
  const [qtdIngrediente, setQtdIngrediente] = useState("");
  const [receitaAtual, setReceitaAtual] = useState<ItemReceita[]>([]);

  useEffect(() => {
    fetchPizzas();
    fetchEstoque();
  }, []);

  async function fetchPizzas() {
    const { data } = await supabase
      .from("cardapio")
      .select("*")
      .eq("ativo", true)
      .order("id", { ascending: false });
    if (data) setPizzas(data);
  }

  async function fetchEstoque() {
    const { data } = await supabase.from("estoque").select("id, nome, unidade, categoria").order("nome");
    if (data) setIngredientesDisponiveis(data);
  }

  // --- FUNÇÃO DE UPLOAD DE FOTO ---
  async function handleUploadPizza(file: File) {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-produto.${fileExt}`;
      const filePath = `cardapio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('pizzarias')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pizzarias')
        .getPublicUrl(filePath);

      setUrlImagem(publicUrl);
      
      // Se estiver editando, já salva no banco
      if (pizzaEditandoId) {
        await supabase.from("cardapio").update({ url_imagem: publicUrl }).eq("id", pizzaEditandoId);
      }
    } catch (error: any) {
      alert("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  // --- FUNÇÃO DE REMOVER FOTO (REAL) ---
  async function handleRemovePizzaImage() {
    if (!confirm("Deseja remover a foto deste produto?")) return;
    
    setUploading(true);
    try {
      if (pizzaEditandoId) {
        // Remove do banco de dados
        const { error } = await supabase
          .from("cardapio")
          .update({ url_imagem: "" })
          .eq("id", pizzaEditandoId);
        
        if (error) throw error;
      }
      
      setUrlImagem("");
      alert("Foto removida com sucesso!");
    } catch (error: any) {
      alert("Erro ao remover: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function carregarPizzaParaEdicao(pizza: PizzaCardapio) {
    setLoading(true);
    setPizzaEditandoId(pizza.id);
    setNomePizza(pizza.nome);
    setPrecoPizza(pizza.preco.toString());
    setDescricaoPizza(pizza.descricao || "");
    setTamanhoPizza(pizza.tamanho || "Grande");
    setUrlImagem(pizza.url_imagem || "");
    setCategoriaItem(pizza.categoria || "Pizza");
    setIsCombo(pizza.is_combo || false);

    const { data: ingredientesSalvos } = await supabase
      .from("ficha_tecnica")
      .select(`quantidade_usada, estoque:estoque_id (id, nome, unidade, categoria)`)
      .eq("cardapio_id", pizza.id);

    if (ingredientesSalvos) {
        setReceitaAtual(ingredientesSalvos.map((item: any) => ({
            estoque_id: item.estoque.id,
            nome: item.estoque.nome,
            unidade: item.estoque.unidade,
            categoria: item.estoque.categoria,
            quantidade_usada: item.quantidade_usada
        })));
    }
    setLoading(false);
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
        preco: Number(precoPizza.toString().replace(",", ".")), 
        descricao: descricaoPizza,
        tamanho: tamanhoPizza,
        url_imagem: urlImagem,
        categoria: categoriaItem,
        is_combo: isCombo,
        ativo: true 
    };

    let idPizzaSalva = pizzaEditandoId;

    if (pizzaEditandoId) {
        await supabase.from("cardapio").update(dadosPizza).eq("id", pizzaEditandoId);
        await supabase.from("ficha_tecnica").delete().eq("cardapio_id", pizzaEditandoId);
    } else {
        const { data } = await supabase.from("cardapio").insert([dadosPizza]).select().single();
        idPizzaSalva = data?.id;
    }

    if (receitaAtual.length > 0 && idPizzaSalva) {
      const ficha = receitaAtual.map(item => ({
        cardapio_id: idPizzaSalva,
        estoque_id: item.estoque_id,
        quantidade_usada: item.quantidade_usada
      }));
      await supabase.from("ficha_tecnica").insert(ficha);
    }

    alert("Salvo com sucesso!");
    cancelarEdicao();
    fetchPizzas();
    setLoading(false);
  }

  function cancelarEdicao() {
    setPizzaEditandoId(null);
    setNomePizza(""); setPrecoPizza(""); setDescricaoPizza(""); setUrlImagem("");
    setReceitaAtual([]); setTamanhoPizza("Grande"); setCategoriaItem("Pizza"); setIsCombo(false);
  }

  async function handleArquivarPizza() {
      if (!pizzaEditandoId || !confirm(`Arquivar "${nomePizza}"?`)) return;
      await supabase.from("cardapio").update({ ativo: false }).eq("id", pizzaEditandoId);
      cancelarEdicao();
      fetchPizzas();
  }

  function adicionarIngredienteNaReceita() {
    if (!ingredienteSelecionado || !qtdIngrediente) return;
    setReceitaAtual([...receitaAtual, {
      estoque_id: ingredienteSelecionado.id,
      nome: ingredienteSelecionado.nome,
      unidade: ingredienteSelecionado.unidade,
      categoria: ingredienteSelecionado.categoria,
      quantidade_usada: Number(qtdIngrediente)
    }]);
    setQtdIngrediente("");
  }

  return (
    <div className="flex flex-col gap-6 p-8 max-w-[1600px] mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
        <UtensilsCrossed className="text-red-600" /> Gerenciar Cardápio
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* FORMULÁRIO COM UPLOAD E DELETE */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`p-6 rounded-xl shadow-sm border ${pizzaEditandoId ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
            <div className="flex justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase">1. Informações do Produto</h3>
                {pizzaEditandoId && <button onClick={cancelarEdicao} className="text-xs text-red-500 font-bold flex items-center gap-1"><X size={14}/> Cancelar Edição</button>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* ÁREA DE FOTO COM REMOÇÃO */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-400 uppercase">Foto do Produto</label>
                    <div className="relative group w-full h-56 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden transition-all hover:bg-slate-100">
                        {uploading ? (
                            <Loader2 className="animate-spin text-red-600" size={32} />
                        ) : urlImagem ? (
                            <>
                                <img src={urlImagem} className="w-full h-full object-cover" alt="Preview" />
                                <button 
                                    type="button"
                                    onClick={handleRemovePizzaImage}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <div className="bg-red-600 p-2 rounded-full text-white shadow-lg">
                                        <X size={24} />
                                    </div>
                                </button>
                            </>
                        ) : (
                            <div className="text-center space-y-2">
                                <ImageIcon size={40} className="text-slate-300 mx-auto" />
                                <p className="text-[10px] text-slate-400">Escolher Foto</p>
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={(e) => e.target.files?.[0] && handleUploadPizza(e.target.files[0])}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* DADOS DO PRODUTO */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                            <select className="w-full border p-2 rounded bg-white text-sm" value={categoriaItem} onChange={e => setCategoriaItem(e.target.value)}>
                                <option value="Pizza">Pizza</option>
                                <option value="Bebida">Bebida</option>
                                <option value="Combo">Combo</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input type="checkbox" checked={isCombo} onChange={e => setIsCombo(e.target.checked)} className="w-4 h-4 rounded text-red-600" />
                            <span className="text-xs font-bold text-slate-600">Destaque Combo</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nome do Item</label>
                        <input className="w-full border p-2 rounded text-sm outline-none focus:ring-2 ring-red-100" placeholder="Ex: Margherita Premium" value={nomePizza} onChange={e => setNomePizza(e.target.value)} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Preço Venda (R$)</label>
                        <input type="number" step="0.01" className="w-full border p-2 rounded text-sm font-bold text-red-600" placeholder="0.00" value={precoPizza} onChange={e => setPrecoPizza(e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="mt-4">
                 <label className="text-xs font-bold text-slate-500 uppercase">Descrição / Ingredientes (Exibe no Cardápio Digital)</label>
                 <textarea className="w-full border p-2 rounded mt-1 h-20 text-sm resize-none" placeholder="Ingredientes detalhados..." value={descricaoPizza} onChange={e => setDescricaoPizza(e.target.value)} />
            </div>
          </div>

          {/* FICHA TÉCNICA */}
          {categoriaItem === "Pizza" && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 border-b pb-2">2. Ficha Técnica (Baixa de Estoque)</h3>
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex-1">
                        <select className="w-full border p-2 rounded text-sm" onChange={e => setIngredienteSelecionado(ingredientesDisponiveis.find(i => i.id === Number(e.target.value)) || null)}>
                            <option value="">Selecione um ingrediente...</option>
                            {ingredientesDisponiveis.map(ing => <option key={ing.id} value={ing.id}>{ing.nome} ({ing.unidade})</option>)}
                        </select>
                    </div>
                    <div className="w-24">
                        <input type="number" className="w-full border p-2 rounded text-sm" placeholder="Qtd" value={qtdIngrediente} onChange={e => setQtdIngrediente(e.target.value)} />
                    </div>
                    <button onClick={adicionarIngredienteNaReceita} className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"><Plus/></button>
                </div>
                {receitaAtual.length > 0 && (
                    <div className="mt-4 border rounded-xl overflow-hidden shadow-inner bg-slate-50">
                        {receitaAtual.map((item, idx) => (
                            <div key={idx} className="flex justify-between p-3 border-b last:border-0 items-center bg-white">
                                <span className="text-sm font-semibold text-slate-700">{item.nome}</span>
                                <div className="flex items-center gap-4">
                                    <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{item.quantidade_usada} {item.unidade}</span>
                                    <button onClick={() => {
                                        const n = [...receitaAtual]; n.splice(idx, 1); setReceitaAtual(n);
                                    }} className="text-slate-300 hover:text-red-600 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          )}

          <div className="flex gap-3">
              {pizzaEditandoId && (
                  <button onClick={handleArquivarPizza} className="w-1/3 bg-white border-2 border-red-100 text-red-600 font-bold py-4 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                      <Archive size={20} /> Arquivar Item
                  </button>
              )}
              <button onClick={handleSalvarPizza} disabled={loading || uploading} className={`flex-1 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] ${pizzaEditandoId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
                <Save size={20} /> {loading ? "Salvando Alterações..." : "Confirmar e Salvar no Cardápio"}
              </button>
          </div>
        </div>

        {/* LISTA LATERAL */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit max-h-[850px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-700">Itens Ativos</h2>
            <Badge className="bg-red-100 text-red-600 border-none">{pizzas.length} itens</Badge>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {pizzas.map(pizza => (
              <div key={pizza.id} onClick={() => carregarPizzaParaEdicao(pizza)} className={`p-3 border rounded-xl cursor-pointer flex gap-3 items-center transition-all ${pizzaEditandoId === pizza.id ? "bg-orange-50 border-orange-400 ring-2 ring-orange-100" : "hover:border-slate-300 hover:bg-slate-50"}`}>
                <div className="w-12 h-12 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border">
                    {pizza.url_imagem ? <img src={pizza.url_imagem} className="w-full h-full object-cover" /> : <UtensilsCrossed className="m-auto text-slate-300" size={20}/>}
                </div>
                <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-slate-800 text-[12px] truncate">{pizza.nome}</div>
                    <Badge className="text-[8px] bg-slate-100 text-slate-500 border-none px-1 h-4">{pizza.categoria}</Badge>
                </div>
                <div className="font-bold text-red-600 text-xs">R${Number(pizza.preco).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}