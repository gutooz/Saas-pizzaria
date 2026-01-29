"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Pizza, ShoppingCart, Clock, MapPin, Loader2, CheckCircle2, 
  Send, Plus, Trash2, User, Phone, Wallet, ChevronRight, ArrowLeft, AlertCircle, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function CardapioDigitalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [loja, setLoja] = useState<any>(null);
  
  // Dados do Cardápio
  const [categoriasOrdenadas, setCategoriasOrdenadas] = useState<string[]>([]);
  const [produtosPorCategoria, setProdutosPorCategoria] = useState<Record<string, any[]>>({});
  
  // Carrinho e Checkout
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [etapaCheckout, setEtapaCheckout] = useState(1); 
  
  // Status
  const [loading, setLoading] = useState(true);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [calculandoDistancia, setCalculandoDistancia] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [pedidoConcluido, setPedidoConcluido] = useState(false);
  const [vendaId, setVendaId] = useState<number | null>(null);

  // Dados do Cliente e Pedido
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

  // --- LÓGICA DE DISTÂNCIA VIA SUA API OSRM ---
  async function calcularFreteGPS() {
    if (cliente.endereco.length < 10) return;
    
    setCalculandoDistancia(true);
    setForaDoRaio(false);

    try {
        const res = await fetch(`/api/calcular-distancia?rua=${encodeURIComponent(cliente.endereco)}&pizzariaId=${loja.id}`);
        const data = await res.json();

        if (data.distancia !== undefined) {
            const km = data.distancia;
            setDistanciaDetectada(km);

            const raioMaximo = Number(loja.raio_entrega_km || 10);
            if (km > raioMaximo) {
                setForaDoRaio(true);
                setTaxaEntrega(0);
            } else {
                const taxaBase = Number(loja.taxa_entrega_padrao || 0);
                const precoKmExtra = Number(loja.preco_km_extra || 0);
                
                // --- ATUALIZAÇÃO BINGO: USA O LIMITE CONFIGURADO NO PAINEL ---
                const kmCarencia = Number(loja.km_limite_fixo || 0); 
                let novaTaxa = taxaBase;
                
                // Só cobra o adicional se a distância real for maior que o limite de carência
                if (km > kmCarencia && precoKmExtra > 0) {
                    novaTaxa += (km - kmCarencia) * precoKmExtra;
                }
                
                setTaxaEntrega(novaTaxa);
            }
        } else {
            console.error("Endereço não localizado pela API");
        }
    } catch (err) {
        console.error("Erro ao calcular frete:", err);
    } finally {
        setCalculandoDistancia(false);
    }
  }

  const adicionarAoCarrinho = (item: any) => {
      setCarrinho([...carrinho, { ...item, tempId: Math.random() }]);
      setIsCheckoutOpen(true); 
  };
  
  const totalProdutos = carrinho.reduce((acc, item) => acc + Number(item.preco), 0);
  const totalGeral = totalProdutos + taxaEntrega;

  async function verificarTelefone() {
      const telLimpo = limparTelefone(telefoneInput);
      if (telLimpo.length < 8) return alert("Digite um número válido com DDD.");
      
      setBuscandoCliente(true);
      const { data: clienteExistente } = await supabase
        .from("customers")
        .select("*")
        .eq("pizzaria_id", loja.id)
        .eq("phone", telLimpo)
        .maybeSingle();

      if (clienteExistente) {
          setCliente({
              id: clienteExistente.id,
              nome: clienteExistente.name,
              telefone: clienteExistente.phone,
              endereco: clienteExistente.address || ""
          });
          if (clienteExistente.address) {
              setTimeout(() => calcularFreteGPS(), 500);
          }
      } else {
          setCliente({ id: null, nome: "", telefone: telLimpo, endereco: "" });
      }
      setBuscandoCliente(false);
      setEtapaCheckout(2);
  }

  async function finalizarPedido() {
    if (foraDoRaio) return alert("Não entregamos neste endereço.");
    if (!formaPagamentoSelecionada) return alert("Selecione uma forma de pagamento.");
    setEnviandoPedido(true);

    try {
      await supabase.from("customers").upsert({
            pizzaria_id: loja.id,
            phone: cliente.telefone,
            name: cliente.nome,
            address: cliente.endereco,
            distance: distanciaDetectada 
        }, { onConflict: 'phone, pizzaria_id' });

      const { data, error } = await supabase.rpc("finalizar_venda", {
        itens_json: carrinho.map(i => ({ id: i.id, quantidade: 1, preco: Number(i.preco), obs: "" })),
        total_venda: totalGeral,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        endereco_entrega: cliente.endereco,
        taxa_entrega_valor: taxaEntrega,
        metodo_pgto: formaPagamentoSelecionada,
        pizzaria_id_param: loja.id
      });

      if (error) throw error;

      const itensTexto = carrinho.map(i => `• ${i.nome}`).join('%0A');
      const mensagemZap = `*NOVO PEDIDO #${data.venda_id}*%0A%0A*Cliente:* ${cliente.nome}%0A*Endereço:* ${cliente.endereco}%0A*Distância:* ${distanciaDetectada?.toFixed(1)}km%0A%0A*Itens:*%0A${itensTexto}%0A%0A*Pagamento:* ${formaPagamentoSelecionada}%0A*Taxa Entrega:* R$ ${taxaEntrega.toFixed(2)}%0A*TOTAL:* R$ ${totalGeral.toFixed(2)}`;
      const linkWhatsapp = `https://wa.me/55${loja.telefone.replace(/\D/g, '')}?text=${mensagemZap}`;
      
      setVendaId(data.venda_id);
      setPedidoConcluido(true);
      setCarrinho([]);
      window.open(linkWhatsapp, '_blank');
    } catch (error: any) {
      alert("Erro ao enviar: " + error.message);
    } finally {
      setEnviandoPedido(false);
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin" style={{ color: '#e11d48' }} size={40} /></div>;
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
                                <Button onClick={() => adicionarAoCarrinho(item)} className="w-full mt-4 rounded-[1.5rem] h-12 transition-all font-bold text-white shadow-lg hover:brightness-110 flex gap-2" style={{ backgroundColor: loja.cor_tema || '#000' }}><Plus size={18} /> Adicionar</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
      </div>

      {carrinho.length > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-0 left-0 w-full p-4 z-50 bg-gradient-to-t from-white via-white to-transparent pt-10">
            <Button onClick={() => setIsCheckoutOpen(true)} className="w-full max-w-xl mx-auto h-16 rounded-full shadow-2xl flex justify-between px-8 text-lg font-bold animate-in slide-in-from-bottom-full" style={{ backgroundColor: loja.cor_tema }}>
                <div className="flex items-center gap-2"><ShoppingCart /> <span>{carrinho.length} itens</span></div>
                <span>Ver Carrinho</span>
                <span>R$ {totalGeral.toFixed(2)}</span>
            </Button>
        </div>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-full sm:max-w-lg h-[90vh] sm:h-auto sm:rounded-[2rem] rounded-t-[2rem] p-6 flex flex-col shadow-2xl animate-in slide-in-from-bottom-10">
                
                <div className="flex justify-between items-center mb-6">
                    {etapaCheckout > 1 ? (
                        <Button variant="ghost" onClick={() => setEtapaCheckout(etapaCheckout - 1)}><ArrowLeft/></Button>
                    ) : (
                        <div/>
                    )}
                    <h2 className="font-black text-xl text-slate-800 uppercase">
                        {etapaCheckout === 1 ? "Identificação" : etapaCheckout === 2 ? "Entrega" : "Pagamento"}
                    </h2>
                    <Button variant="ghost" onClick={() => setIsCheckoutOpen(false)}><X size={20}/></Button>
                </div>

                <div className="flex-1 overflow-y-auto px-1 space-y-6">
                    {etapaCheckout === 1 && (
                        <div className="space-y-4">
                            <p className="text-slate-500 text-center">Informe seu WhatsApp para se identificar.</p>
                            <div className="space-y-2">
                                <Label>Seu WhatsApp com DDD</Label>
                                <div className="flex items-center border-2 rounded-xl px-4 py-3 focus-within:border-slate-800 transition-colors">
                                    <Phone className="text-slate-400 mr-3" />
                                    <input 
                                        type="tel" 
                                        className="flex-1 outline-none text-lg font-bold text-slate-800 placeholder:font-normal"
                                        placeholder="(11) 99999-9999"
                                        value={telefoneInput}
                                        onChange={e => setTelefoneInput(e.target.value)}
                                    />
                                </div>
                            </div>
                            <Button onClick={verificarTelefone} disabled={buscandoCliente} className="w-full h-14 rounded-xl text-lg font-bold" style={{ backgroundColor: loja.cor_tema }}>
                                {buscandoCliente ? <Loader2 className="animate-spin"/> : "Continuar"}
                            </Button>
                        </div>
                    )}

                    {etapaCheckout === 2 && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase"><User size={14}/> Dados Pessoais</div>
                                <Input placeholder="Seu Nome" value={cliente.nome} onChange={e => setCliente({...cliente, nome: e.target.value})} className="bg-white border-slate-200" />
                                <Input value={cliente.telefone} disabled className="bg-slate-100 text-slate-500 border-none" />
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl space-y-3 border border-slate-100">
                                <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase"><MapPin size={14}/> Endereço de Entrega</div>
                                <textarea 
                                    placeholder="Rua, Número, Bairro, Cidade e Estado" 
                                    value={cliente.endereco} 
                                    onBlur={calcularFreteGPS} 
                                    onChange={e => setCliente({...cliente, endereco: e.target.value})} 
                                    className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm min-h-[80px] resize-none outline-none focus:ring-2 focus:ring-slate-200"
                                />
                                
                                {calculandoDistancia && (
                                    <div className="flex items-center gap-2 text-blue-600 text-xs font-bold animate-pulse">
                                        <Loader2 className="animate-spin" size={12}/> Calculando distância real via GPS...
                                    </div>
                                )}

                                {distanciaDetectada && !foraDoRaio && (
                                    <div className="flex justify-between items-center text-sm font-medium text-slate-600 bg-white p-2 rounded-lg border border-green-100">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-400 uppercase">Distância</span>
                                            <span className="text-green-600 font-bold">{distanciaDetectada.toFixed(1)} km</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[10px] text-slate-400 uppercase">Taxa de Entrega</span>
                                            <span className="text-slate-900 font-black">R$ {taxaEntrega.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}

                                {foraDoRaio && (
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex items-center gap-2 text-red-700">
                                        <AlertCircle size={16}/>
                                        <span className="text-xs font-bold">Infelizmente o endereço está a {distanciaDetectada?.toFixed(1)}km e nosso limite é {loja.raio_entrega_km}km.</span>
                                    </div>
                                )}
                            </div>

                            <Button 
                                onClick={() => setEtapaCheckout(3)} 
                                disabled={foraDoRaio || !cliente.nome || !cliente.endereco || calculandoDistancia || !distanciaDetectada}
                                className="w-full h-14 rounded-xl text-lg font-bold flex justify-between px-6" 
                                style={{ backgroundColor: loja.cor_tema }}
                            >
                                <span>Ir para Pagamento</span> <ChevronRight/>
                            </Button>
                        </div>
                    )}

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
                                <div className="flex justify-between text-slate-500"><span>Taxa de Entrega ({distanciaDetectada?.toFixed(1)}km)</span><span>R$ {taxaEntrega.toFixed(2)}</span></div>
                                <div className="flex justify-between text-2xl font-black text-slate-900 mt-2"><span>TOTAL</span><span>R$ {totalGeral.toFixed(2)}</span></div>
                            </div>

                            <Button onClick={finalizarPedido} disabled={enviandoPedido} className="w-full h-16 rounded-2xl text-xl font-bold shadow-xl flex items-center justify-center gap-3" style={{ backgroundColor: loja.cor_tema }}>
                                {enviandoPedido ? <Loader2 className="animate-spin"/> : <><Send/> ENVIAR PEDIDO</>}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}