"use client";

import { useEffect, useState, use } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Pizza, ShoppingCart, Plus, Minus, Clock, MapPin, Loader2, CheckCircle2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CardapioDigitalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [loja, setLoja] = useState<any>(null);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [finalizando, setFinalizando] = useState(false);
  const [pedidoConcluido, setPedidoConcluido] = useState(false);

  const [sabor1, setSabor1] = useState<any>(null);
  const [sabor2, setSabor2] = useState<any>(null);
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

  const totalCarrinho = carrinho.reduce((acc, item) => acc + Number(item.preco), 0);

  async function finalizarPedido() {
    if (!cliente.nome || !cliente.endereco) return alert("Preencha nome e endereço!");
    setFinalizando(true);
    const { error } = await supabase.from("vendas").insert([{
      pizzaria_id: loja.id,
      cliente_nome: cliente.nome,
      cliente_telefone: cliente.telefone,
      endereco_entrega: cliente.endereco,
      itens: carrinho,
      valor_total: totalCarrinho + Number(loja.taxa_entrega_padrao),
      status: "pendente"
    }]);
    if (!error) { setPedidoConcluido(true); setCarrinho([]); }
    setFinalizando(false);
  }

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600" size={40} /></div>;
  if (!loja) return <div className="p-20 text-center font-bold italic text-slate-400">Pizzaria não encontrada.</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-44 relative overflow-hidden">
      
      {/* BACKGROUND ANIMADO DE PIZZAS (Apenas se não tiver capa) */}
      {!loja.url_capa && (
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0">
            {[...Array(10)].map((_, i) => (
                <Pizza 
                    key={i} 
                    size={120} 
                    className="absolute animate-bounce" 
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDuration: `${3 + Math.random() * 5}s`,
                        transform: `rotate(${Math.random() * 360}deg)`
                    }}
                />
            ))}
        </div>
      )}

      {/* HEADER */}
      <div className="relative w-full h-48 md:h-64 bg-slate-900 overflow-hidden shadow-sm">
        {loja.url_capa && <img src={loja.url_capa} className="w-full h-full object-cover opacity-60" />}
        
        {/* LOGO CENTRALIZADA */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-[6px] border-slate-50 bg-white shadow-2xl overflow-hidden flex items-center justify-center translate-y-1/2">
            {loja.url_logo ? (
                <img src={loja.url_logo} className="w-full h-full object-contain p-3" />
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
            <Badge className="bg-white border text-slate-700 h-8 rounded-full font-bold">
                <Clock size={14} className="mr-2 text-orange-500"/> {loja.tempo_espera_minutos} min
            </Badge>
            <Badge className="bg-white border text-slate-700 h-8 rounded-full font-bold">
                <MapPin size={14} className="mr-2 text-green-500"/> Entrega R$ {Number(loja.taxa_entrega_padrao).toFixed(2)}
            </Badge>
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {produtos.map((item) => (
            <Card key={item.id} className="overflow-hidden border-none shadow-xl rounded-[2rem] bg-white group">
              <div className="h-48 bg-slate-100 overflow-hidden relative">
                {item.url_imagem ? <img src={item.url_imagem} className="w-full h-full object-cover group-hover:scale-110 transition-duration-500" /> : <div className="w-full h-full flex items-center justify-center opacity-20"><Pizza size={48}/></div>}
                <Badge className="absolute top-4 right-4 bg-white/90 text-slate-900 font-black">R$ {Number(item.preco).toFixed(2)}</Badge>
              </div>
              <CardContent className="p-6">
                <h3 className="font-black text-slate-800 uppercase text-xl">{item.nome}</h3>
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.descricao}</p>
                <Button onClick={() => adicionarAoCarrinho(item)} className="w-full mt-6 bg-slate-900 hover:bg-red-600 rounded-2xl h-12 transition-all">
                  Adicionar ao Pedido
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CARRINHO */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t p-6 z-50 rounded-t-[3rem] shadow-2xl">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
               {carrinho.map((item) => (
                 <Badge key={item.tempId} variant="outline" className="bg-white py-1.5 pl-4 pr-1.5 border-slate-200 flex items-center gap-3 rounded-full">
                   <span className="text-[11px] font-black uppercase">{item.nome}</span>
                   <button onClick={() => removerDoCarrinho(item.tempId)} className="bg-slate-100 rounded-full p-1"><X size={12}/></button>
                 </Badge>
               ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input placeholder="Seu Nome" value={cliente.nome} onChange={e => setCliente({...cliente, nome: e.target.value})} className="rounded-2xl h-12 bg-slate-50 border-none" />
              <Input placeholder="Endereço" value={cliente.endereco} onChange={e => setCliente({...cliente, endereco: e.target.value})} className="rounded-2xl h-12 bg-slate-50 border-none" />
            </div>
            <Button onClick={finalizarPedido} disabled={finalizando} className="w-full h-16 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-2xl flex justify-between px-8">
              <div className="flex items-center gap-3">
                <ShoppingCart size={24} /> <span>{finalizando ? "Enviando..." : "Finalizar Pedido"}</span>
              </div>
              <span>R$ {(totalCarrinho + Number(loja.taxa_entrega_padrao)).toFixed(2)}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}