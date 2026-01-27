"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Pizza, ShoppingCart, Clock, MapPin, Loader2, CheckCircle2, X, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function CardapioDigitalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [loja, setLoja] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [pedidoConcluido, setPedidoConcluido] = useState(false);
  const [vendaId, setVendaId] = useState<number | null>(null);

  const [cliente, setCliente] = useState({ nome: "", telefone: "", endereco: "" });

  useEffect(() => {
    async function loadCardapio() {
      const { data: dataLoja } = await supabase.from("loja_config").select("*").eq("slug", slug).maybeSingle();
      if (dataLoja) {
        setLoja(dataLoja);
        const { data: dataProdutos } = await supabase
          .from("cardapio")
          .select("*")
          .eq("pizzaria_id", dataLoja.id) 
          .eq("ativo", true)
          .order('categoria', { ascending: true });
        setProdutos(dataProdutos || []);
      }
      setLoading(false);
    }
    loadCardapio();
  }, [slug]);

  const adicionarAoCarrinho = (item: any) => setCarrinho([...carrinho, { ...item, tempId: Math.random() }]);
  const removerDoCarrinho = (tempId: number) => setCarrinho(carrinho.filter(item => item.tempId !== tempId));

  const totalProdutos = carrinho.reduce((acc, item) => acc + Number(item.preco), 0);
  const totalGeral = totalProdutos + Number(loja?.taxa_entrega_padrao || 0);

  async function finalizarPedido() {
    if (!cliente.nome || !cliente.endereco || !cliente.telefone) {
      return alert("Preencha todos os dados (Nome, Telefone e Endereço)!");
    }
    
    setFinalizando(true);

    // Formata os itens para a função 'finalizar_venda' do banco (RPC)
    // Isso garante que os itens entrem na tabela 'itens_venda'
    const itensParaBanco = carrinho.map(item => ({
      id: item.id,
      quantidade: 1,
      preco: Number(item.preco),
      obs: ""
    }));

    try {
      // 1. Envia para a função RPC do banco de dados
      // Esta função deve criar o registro em 'vendas' e em 'itens_venda'
      const { data, error } = await supabase.rpc("finalizar_venda", {
        itens_json: itensParaBanco,
        total_venda: totalGeral,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        endereco_entrega: cliente.endereco,
        taxa_entrega_valor: Number(loja.taxa_entrega_padrao),
        metodo_pgto: "Cardápio Online",
        pizzaria_id_param: loja.id
      });

      if (error) throw error;

      // 2. Prepara a mensagem do WhatsApp (SÓ APÓS GRAVAR NO BANCO)
      const itensTexto = carrinho.map(i => `- ${i.nome}`).join('%0A');
      const mensagemZap = `*Novo Pedido!* 🍕%0A%0A*Pedido:* #${data.venda_id}%0A*Cliente:* ${cliente.nome}%0A*Endereço:* ${cliente.endereco}%0A%0A*Itens:*%0A${itensTexto}%0A%0A*Total:* R$ ${totalGeral.toFixed(2)}`;
      
      const linkWhatsapp = `https://wa.me/55${loja.telefone.replace(/\D/g, '')}?text=${mensagemZap}`;
      
      setVendaId(data.venda_id);
      setPedidoConcluido(true);
      setCarrinho([]);

      // 3. Abre o WhatsApp
      window.open(linkWhatsapp, '_blank');

    } catch (error: any) {
      console.error("Erro ao processar:", error);
      alert("Erro ao enviar pedido para a cozinha: " + error.message);
    } finally {
      setFinalizando(false);
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40} /></div>;
  if (!loja) return <div className="p-20 text-center font-bold italic text-slate-400">Pizzaria não encontrada.</div>;

  if (pedidoConcluido) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-bounce">
          <CheckCircle2 size={60} />
        </div>
        <h1 className="text-3xl font-black text-slate-900">PEDIDO #${vendaId} RECEBIDO!</h1>
        <p className="text-slate-500 max-w-xs">Já estamos preparando sua pizza! O resumo também foi enviado para nosso WhatsApp.</p>
        <Button onClick={() => setPedidoConcluido(false)} className="rounded-full px-8">Fazer novo pedido</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-44 relative overflow-hidden">
      {/* HEADER */}
      <div className="relative w-full h-48 md:h-64 bg-slate-900 overflow-hidden shadow-sm">
        {loja.url_capa && <img src={loja.url_capa} className="w-full h-full object-cover opacity-60" />}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-[6px] border-slate-50 bg-white shadow-2xl overflow-hidden flex items-center justify-center translate-y-1/2">
            {loja.url_logo ? (
                <img src={loja.url_logo} className="w-full h-full object-contain p-3" alt="Logo" />
            ) : (
                <div className="flex flex-col items-center text-slate-300"><Pizza size={40} /></div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="mt-24 text-center border-b border-slate-200 pb-8">
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{loja.nome_loja}</h1>
          <p className="text-slate-500 text-sm mt-2 flex items-center justify-center gap-2">
            <MapPin size={14}/> {loja.endereco}
          </p>
          <div className="flex justify-center gap-3 mt-4">
            <Badge variant="outline" className="bg-white text-slate-700 h-8 rounded-full font-bold">
                <Clock size={14} className="mr-2 text-orange-500"/> {loja.tempo_espera_minutos} min
            </Badge>
            <Badge variant="outline" className="bg-white text-slate-700 h-8 rounded-full font-bold">
                <MapPin size={14} className="mr-2 text-green-500"/> Entrega R$ {Number(loja.taxa_entrega_padrao).toFixed(2)}
            </Badge>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {produtos.map((item) => (
            <Card key={item.id} className="overflow-hidden border-none shadow-xl rounded-[2rem] bg-white group">
              <div className="h-48 bg-slate-100 overflow-hidden relative">
                {item.url_imagem && <img src={item.url_imagem} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.nome} />}
                <Badge className="absolute top-4 right-4 bg-white/90 text-slate-900 font-black">R$ {Number(item.preco).toFixed(2)}</Badge>
              </div>
              <CardContent className="p-6">
                <h3 className="font-black text-slate-800 uppercase text-xl">{item.nome}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.descricao}</p>
                <Button 
                    onClick={() => adicionarAoCarrinho(item)} 
                    className="w-full mt-6 text-white rounded-2xl h-12 transition-all font-bold"
                    style={{ backgroundColor: loja.cor_tema }}
                >
                  Adicionar ao Pedido
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t p-6 z-50 rounded-t-[3rem] shadow-2xl">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Seu Nome" value={cliente.nome} onChange={e => setCliente({...cliente, nome: e.target.value})} className="rounded-2xl h-12 bg-slate-50 border-none" />
              <Input placeholder="WhatsApp" value={cliente.telefone} onChange={e => setCliente({...cliente, telefone: e.target.value})} className="rounded-2xl h-12 bg-slate-50 border-none" />
              <Input placeholder="Endereço de Entrega" value={cliente.endereco} onChange={e => setCliente({...cliente, endereco: e.target.value})} className="rounded-2xl h-12 bg-slate-50 border-none" />
            </div>

            <Button 
                onClick={finalizarPedido} 
                disabled={finalizando} 
                className="w-full h-16 text-white font-black text-xl rounded-2xl flex justify-between px-8 shadow-lg hover:brightness-110"
                style={{ backgroundColor: loja.cor_tema }}
            >
              <div className="flex items-center gap-3">
                {finalizando ? <Loader2 className="animate-spin" /> : <Send size={24} />} 
                <span>{finalizando ? "ENVIANDO..." : "FECHAR PEDIDO"}</span>
              </div>
              <span>R$ {totalGeral.toFixed(2)}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}