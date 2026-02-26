"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Pizza, ShoppingCart, Clock, MapPin, Loader2, CheckCircle2, 
  Send, Plus, Trash2, User, Phone, Wallet, ChevronRight, ArrowLeft, AlertCircle, X, Check, Split
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// --- FUNÇÃO DE MÁSCARA (SEGURANÇA) ---
const mascararDados = (texto: string) => {
  if (!texto || texto.length < 5) return texto;
  const partes = texto.split(" ");
  return partes.map(p => p[0] + "****").join(" ");
};

export default function CardapioDigitalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [loja, setLoja] = useState<any>(null);
  
  // Dados do Cardápio
  const [categoriasOrdenadas, setCategoriasOrdenadas] = useState<string[]>([]);
  const [produtosPorCategoria, setProdutosPorCategoria] = useState<Record<string, any[]>>({});
  const [todosProdutos, setTodosProdutos] = useState<any[]>([]);
  
  // Carrinho e Checkout
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [etapaCheckout, setEtapaCheckout] = useState(1); 
  
  // --- ESTADOS PARA MEIO A MEIO ---
  const [isMeioAMeioOpen, setIsMeioAMeioOpen] = useState(false);
  const [primeiroSabor, setPrimeiroSabor] = useState<any>(null);
  const [segundoSabor, setSegundoSabor] = useState<any>(null);
  const [categoriaSelecionadaParaMeio, setCategoriaSelecionadaParaMeio] = useState("");
  
  // Status
  const [loading, setLoading] = useState(true);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [calculandoDistancia, setCalculandoDistancia] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedidoConcluido, setPedidoConcluido] = useState(false);
  const [vendaId, setVendaId] = useState<number | null>(null);

  // Variáveis de Segurança e Cliente Novo
  const [enderecoRealOculto, setEnderecoRealOculto] = useState(""); 
  const [nomeRealOculto, setNomeRealOculto] = useState("");
  const [dadosConfirmados, setDadosConfirmados] = useState(false);
  const [isNovoCliente, setIsNovoCliente] = useState(false); // NOVO: Controle de cliente novo
  const [enderecoForm, setEnderecoForm] = useState({ rua: "", numero: "", bairro: "", cidade: "" }); // NOVO: Formulário de endereço

  // Dados do Cliente
  const [telefoneInput, setTelefoneInput] = useState("");
  const [cliente, setCliente] = useState({ id: null, nome: "", telefone: "", endereco: "" });
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [distanciaDetectada, setDistanciaDetectada] = useState<number | null>(null);
  const [foraDoRaio, setForaDoRaio] = useState(false);
  const [formaPagamentoSelecionada, setFormaPagamentoSelecionada] = useState("");
  const [opcoesPagamento, setOpcoesPagamento] = useState<string[]>([]);

  // Helpers
  const normalize = (str: string) => str ? str.toLowerCase().trim() : "";
  const limparTelefone = (tel: string) => tel.replace(/\D/g, "");

  useEffect(() => {
    async function loadCardapio() {
      const { data: dataLoja } = await supabase.from("loja_config").select("*").eq("slug", slug).maybeSingle();
      
      if (dataLoja) {
        setLoja(dataLoja);
        setTaxaEntrega(Number(dataLoja.taxa_entrega_padrao));
        
        if (dataLoja.formas_pagamento && Array.isArray(dataLoja.formas_pagamento) && dataLoja.formas_pagamento.length > 0) {
            setOpcoesPagamento(dataLoja.formas_pagamento);
        } else {
            setOpcoesPagamento(["Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito"]);
        }

        const { data: dataProdutos } = await supabase
          .from("cardapio")
          .select("*")
          .eq("pizzaria_id", dataLoja.id) 
          .eq("ativo", true);

        if (dataProdutos) {
            setTodosProdutos(dataProdutos); 
            const agrupados: Record<string, any[]> = {};
            dataProdutos.forEach(prod => {
                const cat = prod.categoria ? prod.categoria.trim() : "Outros";
                if (!agrupados[cat]) agrupados[cat] = [];
                agrupados[cat].push(prod);
            });
            setProdutosPorCategoria(agrupados);

            const ordemPreferida: string[] = dataLoja.ordem_categorias || ["Combo", "Pizza", "Broto", "Bebida"];
            const categoriasReais = Object.keys(agrupados);
            const categoriasFinais = [
                ...ordemPreferida.filter(c => categoriasReais.includes(c)),
                ...categoriasReais.filter(c => !ordemPreferida.includes(c))
            ];
            setCategoriasOrdenadas(categoriasFinais);
        }
      }
      setLoading(false);
    }
    loadCardapio();
  }, [slug]);

  // --- LÓGICA DE DISTÂNCIA ---
  async function calcularFreteGPS(enderecoParaCalculo?: string) {
    let enderecoFinal = enderecoParaCalculo || enderecoRealOculto || cliente.endereco;

    // Se for cliente novo, junta os campos para a API
    if (isNovoCliente) {
        if (!enderecoForm.rua || !enderecoForm.numero || !enderecoForm.bairro || !enderecoForm.cidade) {
            alert("Preencha todos os campos do endereço (Rua, Número, Bairro e Cidade) para calcular a taxa.");
            return;
        }
        enderecoFinal = `${enderecoForm.rua}, ${enderecoForm.numero}, ${enderecoForm.bairro}, ${enderecoForm.cidade}`;
        setCliente(prev => ({...prev, endereco: enderecoFinal}));
    } else {
        // Se for cliente recorrente, mas ele editou o campo na mão tirando a máscara
        if (!cliente.endereco.includes("****") && cliente.endereco.length > 10) {
            enderecoFinal = cliente.endereco;
        }
    }

    if (enderecoFinal.includes("****") || enderecoFinal.length < 10) return;
    
    setCalculandoDistancia(true);
    setForaDoRaio(false);

    try {
        const res = await fetch(`/api/calcular-distancia?rua=${encodeURIComponent(enderecoFinal)}&pizzariaId=${loja.id}`);
        const data = await res.json();

        if (data.distancia !== undefined) {
            const km = data.distancia;
            setDistanciaDetectada(km);
            setDadosConfirmados(true);

            const raioMaximo = Number(loja.raio_entrega_km || 10);
            if (km > raioMaximo) {
                setForaDoRaio(true);
                setTaxaEntrega(0);
            } else {
                const taxaBase = Number(loja.taxa_entrega_padrao || 0);
                const precoKmExtra = Number(loja.preco_km_extra || 0);
                const kmCarencia = Number(loja.km_limite_fixo || 0); 
                let novaTaxa = taxaBase;
                if (km > kmCarencia && precoKmExtra > 0) {
                    novaTaxa += (km - kmCarencia) * precoKmExtra;
                }
                setTaxaEntrega(novaTaxa);
            }
        }
    } catch (err) { console.error(err); } finally { setCalculandoDistancia(false); }
  }

  const abrirOpcoesProduto = (item: any) => {
    const categoriaLower = item.categoria?.toLowerCase() || "";
    if (categoriaLower.includes("pizza") || categoriaLower.includes("broto") || categoriaLower.includes("gigante")) {
        setPrimeiroSabor(item);
        setSegundoSabor(null);
        setCategoriaSelecionadaParaMeio(item.categoria); 
        setIsMeioAMeioOpen(true);
    } else {
        adicionarAoCarrinho(item);
    }
  };

  const confirmarMeioAMeio = () => {
      if (!primeiroSabor) return;
      
      if (segundoSabor) {
          const precoFinal = Math.max(Number(primeiroSabor.preco), Number(segundoSabor.preco));
          const itemMeioAMeio = {
              id: primeiroSabor.id, 
              nome: `1/2 ${primeiroSabor.nome} + 1/2 ${segundoSabor.nome}`,
              preco: precoFinal,
              descricao: "Pizza Meio a Meio",
              tempId: Math.random(),
              url_imagem: primeiroSabor.url_imagem 
          };
          setCarrinho([...carrinho, itemMeioAMeio]);
      } else {
          adicionarAoCarrinho(primeiroSabor);
      }
      setIsMeioAMeioOpen(false);
      setPrimeiroSabor(null);
      setSegundoSabor(null);
      setIsCheckoutOpen(true);
  };

  const adicionarAoCarrinho = (item: any) => {
      setCarrinho([...carrinho, { ...item, tempId: Math.random() }]);
      setIsCheckoutOpen(true); 
  };
  
  const removerDoCarrinho = (tempId: number) => {
    setCarrinho(carrinho.filter(item => item.tempId !== tempId));
  };

  const totalProdutos = carrinho.reduce((acc, item) => acc + Number(item.preco), 0);
  const totalGeral = totalProdutos + taxaEntrega;

  async function verificarTelefone() {
      const telLimpo = limparTelefone(telefoneInput);
      if (telLimpo.length < 8) return alert("Digite um número válido.");
      setBuscandoCliente(true);
      setDadosConfirmados(false); 
      setDistanciaDetectada(null); 

      let deviceId = localStorage.getItem("gestor_pro_device_id");
      if (!deviceId) {
          deviceId = crypto.randomUUID();
          localStorage.setItem("gestor_pro_device_id", deviceId);
      }

      const { data: clienteExistente } = await supabase.from("customers").select("*").eq("pizzaria_id", loja.id).eq("phone", telLimpo).maybeSingle();

      if (clienteExistente) {
          setIsNovoCliente(false); // É cliente recorrente
          const isMesmoAparelho = clienteExistente.device_id === deviceId;
          
          if (clienteExistente.address) setEnderecoRealOculto(clienteExistente.address);
          else setEnderecoRealOculto("");

          if (clienteExistente.name) setNomeRealOculto(clienteExistente.name);
          else setNomeRealOculto("");

          setCliente({
              id: clienteExistente.id,
              nome: isMesmoAparelho ? clienteExistente.name : mascararDados(clienteExistente.name),
              telefone: clienteExistente.phone,
              endereco: isMesmoAparelho ? (clienteExistente.address || "") : mascararDados(clienteExistente.address || "")
          });

          if (clienteExistente.address && isMesmoAparelho) {
              setTimeout(() => calcularFreteGPS(clienteExistente.address), 500);
          }
      } else {
          setIsNovoCliente(true); // É cliente novo
          setEnderecoRealOculto(""); 
          setNomeRealOculto("");
          setCliente({ id: null, nome: "", telefone: telLimpo, endereco: "" });
          setEnderecoForm({ rua: "", numero: "", bairro: "", cidade: "" });
      }
      setBuscandoCliente(false);
      setEtapaCheckout(2);
  }

  async function finalizarPedido() {
    if (foraDoRaio) return alert("Não entregamos neste endereço.");
    if (!formaPagamentoSelecionada) return alert("Selecione uma forma de pagamento.");
    setEnviandoPedido(true);

    const enderecoParaSalvar = isNovoCliente 
        ? `${enderecoForm.rua}, ${enderecoForm.numero}, ${enderecoForm.bairro}, ${enderecoForm.cidade}`
        : (cliente.endereco.includes("*") ? enderecoRealOculto : cliente.endereco);
        
    const nomeParaSalvar = cliente.nome.includes("*") ? (nomeRealOculto || "Cliente") : cliente.nome;

    try {
      const deviceId = localStorage.getItem("gestor_pro_device_id");

      await supabase.from("customers").upsert({
            pizzaria_id: loja.id,
            phone: cliente.telefone,
            name: nomeParaSalvar,
            address: enderecoParaSalvar, 
            distance: distanciaDetectada,
            device_id: deviceId 
        }, { onConflict: 'phone, pizzaria_id' });

      const { data, error } = await supabase.rpc("finalizar_venda", {
        itens_json: carrinho.map(i => ({ 
            id: i.id, 
            quantidade: 1, 
            preco: Number(i.preco), 
            nome: i.nome,
            obs: i.nome.includes("1/2") ? i.nome : "" 
        })), 
        total_venda: totalGeral,
        cliente_nome: nomeParaSalvar, 
        cliente_telefone: cliente.telefone,
        endereco_entrega: enderecoParaSalvar,
        taxa_entrega_valor: taxaEntrega,
        metodo_pgto: formaPagamentoSelecionada,
        pizzaria_id_param: loja.id
      });

      if (error) throw error;

      const itensTexto = carrinho.map(i => `• ${i.nome} (R$ ${Number(i.preco).toFixed(2)})`).join('%0A');
      
      const mensagemZap = `*NOVO PEDIDO #${data.venda_id}*%0A%0A*Cliente:* ${nomeParaSalvar}%0A*Endereço:* ${enderecoParaSalvar}%0A%0A*Itens:*%0A${itensTexto}%0A%0A*Pagamento:* ${formaPagamentoSelecionada}%0A*Taxa Entrega:* R$ ${taxaEntrega.toFixed(2)}%0A*TOTAL:* R$ ${totalGeral.toFixed(2)}`;
      
      setVendaId(data.venda_id);
      setPedidoConcluido(true);
      setCarrinho([]);
      window.open(`https://wa.me/55${loja.telefone.replace(/\D/g, '')}?text=${mensagemZap}`, '_blank');
    } catch (error: any) {
      alert("Erro ao enviar: " + error.message);
    } finally {
      setEnviandoPedido(false);
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin" size={40} /></div>;
  if (!loja) return <div className="p-20 text-center font-bold italic text-slate-400">Cardápio indisponível.</div>;

  if (pedidoConcluido) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center space-y-8 bg-white">
        <div className="w-32 h-32 bg-green-50 rounded-full flex items-center justify-center text-green-500 animate-in zoom-in duration-500"><CheckCircle2 size={80} /></div>
        <div className="space-y-2"><h1 className="text-4xl font-black text-slate-900">Pedido Recebido!</h1><p className="text-slate-500 text-lg">Número do pedido: <span className="font-bold text-slate-800">#{vendaId}</span></p></div>
        <Button onClick={() => { setPedidoConcluido(false); setIsCheckoutOpen(false); setEtapaCheckout(1); }} className="rounded-2xl px-12 h-14 text-lg font-bold shadow-xl transition-all hover:scale-105" style={{ backgroundColor: loja.cor_tema }}>Fazer Novo Pedido</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="relative w-full h-64 md:h-80 bg-slate-900 overflow-hidden">
        {loja.url_capa ? <img src={loja.url_capa} className="w-full h-full object-cover opacity-50 blur-[2px]" /> : <div className="w-full h-full bg-gradient-to-br from-slate-800 to-black opacity-80" />}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border-[4px] border-white bg-white shadow-2xl overflow-hidden mb-4 transition-transform hover:scale-105 duration-300">
            {loja.url_logo ? <img src={loja.url_logo} className="w-full h-full object-contain p-4" /> : <div className="w-full h-full flex items-center justify-center text-slate-200 bg-slate-100"><Pizza size={50} /></div>}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-10 relative z-20">
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/60 border border-slate-50 text-center">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 uppercase">{loja.nome_loja}</h1>
          <div className="flex flex-wrap justify-center gap-4 text-slate-500 text-sm font-medium"><span className="flex items-center gap-1.5"><MapPin size={16} className="text-red-500"/> {loja.endereco}</span></div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-16 space-y-16">
        {categoriasOrdenadas.map((categoria) => (
            <div key={categoria} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                        {categoria}
                        <span className="text-sm font-normal bg-slate-100 text-slate-500 px-3 py-1 rounded-full">{produtosPorCategoria[categoria].length}</span>
                    </h2>
                    <div className="flex-1 h-[2px] bg-slate-100"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {produtosPorCategoria[categoria].map((item: any) => (
                        <div key={item.id} className="group relative bg-white rounded-[2.5rem] border border-slate-100 p-4 transition-all hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1">
                            {item.is_combo && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-[2.5rem] z-10">OFERTA</div>}
                            <div className="h-56 bg-slate-50 rounded-[2rem] overflow-hidden relative mb-6">
                                {item.url_imagem ? <img src={item.url_imagem} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Pizza size={40}/></div>}
                                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur shadow-lg px-4 py-1.5 rounded-full text-slate-900 font-black text-sm">R$ {Number(item.preco).toFixed(2)}</div>
                            </div>
                            <div className="px-2 space-y-2">
                                <h3 className="font-black text-slate-800 uppercase text-xl group-hover:text-red-600 transition-colors">{item.nome}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed line-clamp-2 min-h-[40px]">{item.descricao}</p>
                                <Button onClick={() => abrirOpcoesProduto(item)} className="w-full mt-4 rounded-[1.5rem] h-12 transition-all font-bold text-white shadow-lg hover:brightness-110 flex gap-2" style={{ backgroundColor: loja.cor_tema || '#000' }}><Plus size={18} /> Adicionar</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>

      {carrinho.length > 0 && !isCheckoutOpen && !isMeioAMeioOpen && (
        <div className="fixed bottom-0 left-0 w-full p-4 z-50 bg-gradient-to-t from-white via-white to-transparent pt-10">
            <Button onClick={() => setIsCheckoutOpen(true)} className="w-full max-w-xl mx-auto h-16 rounded-full shadow-2xl flex justify-between px-8 text-lg font-bold animate-in slide-in-from-bottom-full" style={{ backgroundColor: loja.cor_tema }}>
                <div className="flex items-center gap-2"><ShoppingCart /> <span>{carrinho.length} itens</span></div>
                <span>Ver Carrinho</span>
                <span>R$ {totalGeral.toFixed(2)}</span>
            </Button>
        </div>
      )}

      {/* --- MODAL MEIO A MEIO --- */}
      {isMeioAMeioOpen && primeiroSabor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
            <div className="bg-white w-full max-w-md rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-black text-xl text-slate-800 uppercase flex items-center gap-2">
                        <Split size={20}/> Montar Pizza
                    </h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsMeioAMeioOpen(false)}><X/></Button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {/* Seleção 1 */}
                    <div className="space-y-2">
                        <Label className="text-slate-500 uppercase text-xs font-bold">1º Sabor (Já escolhido)</Label>
                        <div className="p-4 border-2 border-slate-800 bg-slate-50 rounded-xl font-bold text-slate-900 flex justify-between items-center">
                            <span>{primeiroSabor.nome}</span>
                            <span className="text-sm bg-slate-200 px-2 py-1 rounded">R$ {Number(primeiroSabor.preco).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Seleção 2 */}
                    <div className="space-y-2">
                        <Label className="text-slate-500 uppercase text-xs font-bold">2º Sabor (Opcional)</Label>
                        {segundoSabor ? (
                            <div className="p-4 border-2 border-slate-800 bg-slate-50 rounded-xl font-bold text-slate-900 flex justify-between items-center relative group cursor-pointer" onClick={() => setSegundoSabor(null)}>
                                <span>{segundoSabor.nome}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm bg-slate-200 px-2 py-1 rounded">R$ {Number(segundoSabor.preco).toFixed(2)}</span>
                                    <X size={16} className="text-red-500"/>
                                </div>
                                <div className="absolute inset-0 bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-red-600 font-bold text-xs uppercase">Clique para remover</div>
                            </div>
                        ) : (
                            <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 text-center text-sm font-medium">
                                Escolha abaixo o segundo sabor para fazer meio a meio.
                            </div>
                        )}
                    </div>

                    {/* Lista de Sabores Disponíveis */}
                    {!segundoSabor && (
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-slate-400">Sabores Disponíveis em {categoriaSelecionadaParaMeio}</Label>
                            <div className="grid gap-2">
                                {produtosPorCategoria[categoriaSelecionadaParaMeio]
                                    ?.filter(p => p.id !== primeiroSabor.id) 
                                    .map(sabor => (
                                    <div key={sabor.id} onClick={() => setSegundoSabor(sabor)} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50 cursor-pointer active:scale-95 transition-all">
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-800 text-sm">{sabor.nome}</div>
                                            <div className="text-xs text-slate-500 line-clamp-1">{sabor.descricao}</div>
                                        </div>
                                        <div className="font-bold text-slate-900 text-sm">R$ {Number(sabor.preco).toFixed(2)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500 font-medium">Preço Final:</span>
                        <span className="text-xl font-black text-slate-900">
                            R$ {segundoSabor 
                                ? Math.max(Number(primeiroSabor.preco), Number(segundoSabor.preco)).toFixed(2) 
                                : Number(primeiroSabor.preco).toFixed(2)
                            }
                        </span>
                    </div>
                    <Button onClick={confirmarMeioAMeio} className="w-full h-12 rounded-xl text-lg font-bold" style={{ backgroundColor: loja.cor_tema }}>
                        {segundoSabor ? "Adicionar Meio a Meio" : "Adicionar Inteira"}
                    </Button>
                </div>
            </div>
        </div>
      )}

      {/* CHECKOUT */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full sm:max-w-lg h-[90vh] sm:h-auto sm:rounded-[2rem] rounded-t-[2rem] p-6 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
                
                <div className="flex justify-between items-center mb-6">
                    {etapaCheckout > 1 ? (<Button variant="ghost" onClick={() => setEtapaCheckout(etapaCheckout - 1)}><ArrowLeft/></Button>) : (<div/>)}
                    <h2 className="font-black text-xl text-slate-800 uppercase">{etapaCheckout === 1 ? "Identificação" : etapaCheckout === 2 ? "Entrega" : "Pagamento"}</h2>
                    <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)}><X size={20}/></Button>
                </div>

                <div className="flex-1 overflow-y-auto px-1 space-y-6">
                    {/* ETAPA 1: CARRINHO E WHATSAPP */}
                    {etapaCheckout === 1 && carrinho.length > 0 && (
                        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                             <h3 className="font-bold text-slate-700 mb-3 text-sm uppercase flex items-center gap-2"><ShoppingCart size={14}/> Resumo do Pedido</h3>
                             <div className="space-y-3">
                                {carrinho.map(item => (
                                    <div key={item.tempId} className="flex justify-between items-start text-sm">
                                        <span className="text-slate-600 flex-1 pr-2">{item.nome}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-slate-900">R$ {Number(item.preco).toFixed(2)}</span>
                                            <button onClick={() => removerDoCarrinho(item.tempId)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                             <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between font-black text-slate-800">
                                 <span>Subtotal</span>
                                 <span>R$ {totalProdutos.toFixed(2)}</span>
                             </div>
                        </div>
                    )}

                    {etapaCheckout === 1 && (
                        <div className="space-y-4">
                            <p className="text-slate-500 text-center">Informe seu WhatsApp para se identificar.</p>
                            <div className="space-y-2">
                                <Label>Seu WhatsApp com DDD</Label>
                                <div className="flex items-center border-2 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors">
                                    <Phone className="text-slate-400 mr-3" />
                                    <input type="tel" className="flex-1 outline-none text-lg font-bold text-slate-800 placeholder:font-normal" placeholder="(11) 99999-9999" value={telefoneInput} onChange={e => setTelefoneInput(e.target.value)} />
                                </div>
                            </div>
                            <Button onClick={verificarTelefone} disabled={buscandoCliente} className="w-full h-14 rounded-xl text-lg font-bold" style={{ backgroundColor: loja.cor_tema }}>{buscandoCliente ? <Loader2 className="animate-spin"/> : "Continuar"}</Button>
                        </div>
                    )}

                    {/* ETAPA 2: ENTREGA */}
                    {etapaCheckout === 2 && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase"><User size={14}/> Dados Pessoais</div>
                                <Input placeholder="Seu Nome" value={cliente.nome} onChange={e => setCliente({...cliente, nome: e.target.value})} className="bg-white border-slate-200" />
                                <Input value={cliente.telefone} disabled className="bg-slate-100 text-slate-500 border-none" />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase"><MapPin size={14}/> Endereço de Entrega</div>
                                
                                {/* CONTROLE: CLIENTE NOVO MOSTRA CAMPOS SEPARADOS */}
                                {isNovoCliente ? (
                                    <div className="space-y-3 mt-2">
                                        <Input placeholder="Rua / Avenida" value={enderecoForm.rua} onChange={e => setEnderecoForm({...enderecoForm, rua: e.target.value})} className="bg-white" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input placeholder="Número" value={enderecoForm.numero} onChange={e => setEnderecoForm({...enderecoForm, numero: e.target.value})} className="bg-white" />
                                            <Input placeholder="Bairro" value={enderecoForm.bairro} onChange={e => setEnderecoForm({...enderecoForm, bairro: e.target.value})} className="bg-white" />
                                        </div>
                                        <Input placeholder="Cidade e Estado (Ex: Osasco - SP)" value={enderecoForm.cidade} onChange={e => setEnderecoForm({...enderecoForm, cidade: e.target.value})} className="bg-white" />
                                        
                                        {!distanciaDetectada && !calculandoDistancia && (
                                            <Button onClick={() => calcularFreteGPS()} variant="outline" className="w-full mt-2 font-bold gap-2">
                                                <MapPin size={16}/> Calcular Taxa
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    // CLIENTE RECORRENTE MANTÉM TEXTAREA
                                    <textarea placeholder="Rua, Número, Bairro, Cidade e Estado" value={cliente.endereco} onBlur={() => calcularFreteGPS()} onChange={e => setCliente({...cliente, endereco: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm min-h-[80px] resize-none outline-none focus:ring-2 focus:ring-slate-200" />
                                )}

                                {calculandoDistancia && (<div className="flex items-center gap-2 text-blue-600 text-xs font-bold animate-pulse mt-2"><Loader2 className="animate-spin" size={12}/> Calculando taxa de entrega...</div>)}

                                {distanciaDetectada && !foraDoRaio ? (
                                    <div className="flex justify-between items-center text-sm font-medium text-slate-600 bg-white p-3 rounded-lg border border-green-100 mt-2">
                                        <span className="text-[11px] text-slate-500 uppercase font-bold">Taxa de Entrega</span>
                                        <span className="text-slate-900 font-black text-lg">R$ {taxaEntrega.toFixed(2)}</span>
                                    </div>
                                ) : (
                                    !isNovoCliente && enderecoRealOculto && !dadosConfirmados ? (
                                        <Button onClick={() => calcularFreteGPS()} variant="outline" className="w-full border-dashed border-2 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 mt-2 gap-2">
                                            <Check size={16}/> Confirmar meus dados e Ver Taxa
                                        </Button>
                                    ) : null
                                )}

                                {foraDoRaio && (<div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2 text-red-700 mt-2"><AlertCircle size={16}/><span className="text-xs font-bold">Infelizmente o endereço está fora do nosso limite de entrega ({loja.raio_entrega_km}km).</span></div>)}
                            </div>

                            <Button onClick={() => setEtapaCheckout(3)} disabled={foraDoRaio || !cliente.nome || !distanciaDetectada} className="w-full h-14 rounded-xl text-lg font-bold flex justify-between px-6" style={{ backgroundColor: loja.cor_tema }}><span>Ir para Pagamento</span> <ChevronRight/></Button>
                        </div>
                    )}

                    {/* ETAPA 3: PAGAMENTO */}
                    {etapaCheckout === 3 && (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Wallet size={18}/> Pagamento na Entrega</h3>
                                <RadioGroup value={formaPagamentoSelecionada} onValueChange={setFormaPagamentoSelecionada} className="gap-3">
                                    {opcoesPagamento.map((forma) => (
                                        <div key={forma} className={`flex items-center space-x-3 border p-4 rounded-xl cursor-pointer transition-all ${formaPagamentoSelecionada === forma ? 'border-slate-800 bg-white shadow-md' : 'border-slate-200 hover:bg-white'}`}>
                                            <RadioGroupItem value={forma} id={forma} />
                                            <Label htmlFor={forma} className="flex-1 cursor-pointer font-medium">{forma}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <div className="space-y-2 py-4 border-t border-dashed">
                                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>R$ {totalProdutos.toFixed(2)}</span></div>
                                <div className="flex justify-between text-slate-500"><span>Taxa de Entrega</span><span>R$ {taxaEntrega.toFixed(2)}</span></div>
                                <div className="flex justify-between text-2xl font-black text-slate-900 mt-2"><span>TOTAL</span><span>R$ {totalGeral.toFixed(2)}</span></div>
                            </div>
                            <Button onClick={finalizarPedido} disabled={enviandoPedido} className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl flex items-center justify-center gap-3" style={{ backgroundColor: loja.cor_tema }}>{enviandoPedido ? <Loader2 className="animate-spin"/> : <><Send/> ENVIAR PEDIDO</>}</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}