"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; 
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Flame, Bike, CheckCircle, RefreshCw, Archive, Flag } from "lucide-react";

export default function DashboardCozinha() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pizzariaId, setPizzariaId] = useState<string | null>(null);

  // Controle do Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<number | null>(null);
  const [motoboyEscolhido, setMotoboyEscolhido] = useState("");

  // --- 0. VERIFICAÇÃO DE LOGIN ---
  useEffect(() => {
    const idSalvo = localStorage.getItem("pizzaria_id");
    if (!idSalvo) {
      router.push("/");
    } else {
      setPizzariaId(idSalvo);
    }
  }, [router]);

  // --- 1. CARREGAR DADOS ---
  // Usamos useCallback para poder colocar essa função nas dependências do useEffect sem loop infinito
  const carregarDados = useCallback(async () => {
    if (!pizzariaId) return;

    // A. Busca Pedidos
    // IMPORTANTE: Certifique-se que as tabelas 'itens_venda' e 'cardapio' estão conectadas no Supabase (Foreign Keys)
    const { data: dataVendas, error: errorVendas } = await supabase
      .from("vendas")
      .select(`
        *,
        itens_venda (
          quantidade,
          preco_unitario,
          cardapio ( nome )
        )
      `)
      .eq("pizzaria_id", pizzariaId)
      .neq("status", "Arquivado") // Não traz os arquivados para não pesar a busca
      .order("created_at", { ascending: true });

    if (errorVendas) {
      console.error("ERRO CRÍTICO AO BUSCAR VENDAS:", errorVendas.message, errorVendas.details);
    }

    // B. Busca Motoboys
    const { data: dataDrivers, error: errorDrivers } = await supabase
      .from("drivers")
      .select("*")
      .eq("status", "Ativo");
      // .eq("pizzaria_id", pizzariaId); // Descomente se seus drivers forem por pizzaria

    if (errorDrivers) {
      console.error("Erro ao buscar motoboys:", errorDrivers.message);
    }

    // Formata os dados para o Front-end
    const vendasFormatadas = (dataVendas || []).map((v: any) => ({
      id: v.id,
      customer_name: v.cliente || "Cliente Balcão",
      created_at: v.created_at,
      status: v.status || "Pendente",
      driver_name: v.driver_name,
      // O map abaixo protege contra produtos deletados (v.cardapio pode ser null)
      items: v.itens_venda ? v.itens_venda.map((item: any) => ({
        qtd: item.quantidade,
        name: item.cardapio?.nome || "Item excluído/personalizado"
      })) : []
    }));

    setPedidos(vendasFormatadas);
    setMotoboys(dataDrivers || []);
    setLoading(false);
  }, [pizzariaId]);

  // Loop de atualização automática (Poling)
  useEffect(() => {
    if (pizzariaId) {
      carregarDados(); // Carrega a primeira vez
      const intervalo = setInterval(carregarDados, 5000); // Atualiza a cada 5s
      return () => clearInterval(intervalo);
    }
  }, [pizzariaId, carregarDados]);

  // --- 2. AÇÕES DO SISTEMA ---
  async function avancarStatus(id: number, statusAtual: string) {
    if (statusAtual === "Preparando") {
        setPedidoSelecionado(id);
        setModalOpen(true);
        return;
    }

    let novoStatus = "";
    if (statusAtual === "Pendente") novoStatus = "Preparando";
    if (statusAtual === "Em Rota") novoStatus = "Entregue";

    if (novoStatus) {
        await executarAtualizacao(id, { status: novoStatus });
    }
  }

  async function arquivarPedido(id: number) {
     await executarAtualizacao(id, { status: "Arquivado" });
  }

  async function confirmarSaidaEntrega() {
    if (!pedidoSelecionado || !motoboyEscolhido) return alert("Selecione um motoqueiro!");

    const motoboy = motoboys.find(m => m.id.toString() === motoboyEscolhido);
    
    await executarAtualizacao(pedidoSelecionado, {
        status: "Em Rota",
        driver_id: motoboy.id,
        driver_name: motoboy.name
    });

    setModalOpen(false);
    setPedidoSelecionado(null);
    setMotoboyEscolhido("");
  }

  async function executarAtualizacao(id: number, camposParaAtualizar: any) {
    const { error } = await supabase.from("vendas").update(camposParaAtualizar).eq("id", id);
    
    if (!error) {
        // Atualização Otimista (Atualiza a tela antes de buscar do banco de novo)
        if (camposParaAtualizar.status === "Arquivado") {
            setPedidos(prev => prev.filter(p => p.id !== id));
        } else {
            setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...camposParaAtualizar } : p));
        }
    } else {
        console.error("Erro ao atualizar:", error.message);
        alert("Erro ao atualizar pedido. Verifique o console.");
    }
  }

  // Filtros das Colunas
  const novos = pedidos.filter(p => p.status === "Pendente");
  const preparando = pedidos.filter(p => p.status === "Preparando");
  const entrega = pedidos.filter(p => p.status === "Em Rota");
  const entregues = pedidos.filter(p => p.status === "Entregue");

  const hora = (data: string) => new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          Cozinha Inteligente
          {loading && <RefreshCw className="animate-spin text-slate-400" size={20}/>}
        </h1>
        <div className="flex gap-4 items-center">
            <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => {
                localStorage.clear();
                router.push("/");
            }}>
                Sair
            </Button>
            <Button onClick={carregarDados} variant="outline" className="gap-2 bg-white">
                <RefreshCw size={16} /> Atualizar
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1. NOVOS */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 p-2 bg-slate-50 rounded-lg uppercase tracking-wide">
            <Bell className={novos.length > 0 ? "text-red-500 animate-pulse" : "text-slate-400"} size={16} /> 
            Novos <Badge variant="secondary" className="ml-auto">{novos.length}</Badge>
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {novos.map((pedido) => (
              <Card key={pedido.id} className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-all">
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                  <span className="font-bold text-sm">#{pedido.id}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{hora(pedido.created_at)}</span>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <div className="text-sm font-medium text-slate-800 mb-2 truncate">{pedido.customer_name}</div>
                  <div className="text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded border border-slate-100">
                    {pedido.items.map((item: any, i: number) => (
                        <div key={i} className="flex gap-1 mb-1 last:mb-0">
                            <span className="font-bold">{item.qtd}x</span> <span className="truncate">{item.name}</span>
                        </div>
                    ))}
                  </div>
                  <Button size="sm" className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={() => avancarStatus(pedido.id, "Pendente")}>
                    Preparar
                  </Button>
                </CardContent>
              </Card>
            ))}
            {novos.length === 0 && <div className="text-center text-slate-400 text-xs py-10">Nenhum pedido novo</div>}
          </div>
        </div>

        {/* 2. FORNO */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 p-2 bg-slate-50 rounded-lg uppercase tracking-wide">
            <Flame className="text-orange-500" size={16} /> 
            No Forno <Badge variant="secondary" className="ml-auto">{preparando.length}</Badge>
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {preparando.map((pedido) => (
              <Card key={pedido.id} className="border-l-4 border-l-orange-500 shadow-sm">
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                  <span className="font-bold text-sm">#{pedido.id}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{hora(pedido.created_at)}</span>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <div className="text-sm font-medium text-slate-800 mb-2 truncate">{pedido.customer_name}</div>
                  <div className="text-xs text-slate-600 mb-3 bg-slate-50 p-2 rounded border border-slate-100">
                    {pedido.items.map((item: any, i: number) => (
                        <div key={i} className="flex gap-1 mb-1 last:mb-0">
                            <span className="font-bold">{item.qtd}x</span> <span className="truncate">{item.name}</span>
                        </div>
                    ))}
                  </div>
                  <Button size="sm" className="w-full bg-orange-500 hover:bg-orange-600 text-white shadow-sm" onClick={() => avancarStatus(pedido.id, "Preparando")}>
                    Despachar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 3. EM ROTA */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm min-h-[500px] flex flex-col">
          <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 p-2 bg-slate-50 rounded-lg uppercase tracking-wide">
            <Bike className="text-green-500" size={16} /> 
            Em Rota <Badge variant="secondary" className="ml-auto">{entrega.length}</Badge>
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {entrega.map((pedido) => (
              <Card key={pedido.id} className="border-l-4 border-l-green-500 shadow-sm">
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                  <span className="font-bold text-sm">#{pedido.id}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 max-w-[100px] truncate">
                      <Bike size={10} /> {pedido.driver_name || "Motoboy"}
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <div className="text-sm font-medium text-slate-800 mb-2 truncate">{pedido.customer_name}</div>
                  <Button size="sm" variant="outline" className="w-full border-green-200 text-green-700 hover:bg-green-50 shadow-sm" onClick={() => avancarStatus(pedido.id, "Em Rota")}>
                    <CheckCircle size={14} className="mr-2" /> Entregue
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 4. ENTREGUES */}
        <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 shadow-inner min-h-[500px] flex flex-col">
          <h2 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2 p-2 bg-white rounded-lg uppercase tracking-wide border border-slate-200">
            <Flag className="text-blue-500" size={16} /> 
            Entregues <Badge variant="secondary" className="ml-auto">{entregues.length}</Badge>
          </h2>
          <div className="space-y-3 flex-1 overflow-y-auto pr-1">
            {entregues.map((pedido) => (
              <Card key={pedido.id} className="border-l-4 border-l-blue-400 shadow-sm opacity-80 hover:opacity-100 transition-opacity bg-white">
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                  <span className="font-bold text-sm text-slate-600 line-through decoration-slate-400">#{pedido.id}</span>
                  <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1 rounded">CONCLUÍDO</span>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <div className="text-sm font-medium text-slate-600 mb-1 truncate">{pedido.customer_name}</div>
                  <div className="text-[10px] text-slate-400 mb-2">Entregue por: {pedido.driver_name || "Balcão"}</div>
                  
                  <Button size="sm" variant="ghost" className="w-full h-7 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => arquivarPedido(pedido.id)}>
                    <Archive size={12} className="mr-1" /> Arquivar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>

      {/* --- MODAL --- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Quem vai levar o Pedido #{pedidoSelecionado}?</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Selecione o Entregador:</label>
                    <Select value={motoboyEscolhido} onValueChange={setMotoboyEscolhido}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            {motoboys.map((m) => (
                                <SelectItem key={m.id} value={m.id.toString()}>
                                    {m.name}
                                </SelectItem>
                            ))}
                            {motoboys.length === 0 && <SelectItem value="0" disabled>Nenhum motoboy cadastrado</SelectItem>}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={confirmarSaidaEntrega} className="w-full bg-slate-900 text-white hover:bg-slate-800">
                    Confirmar Saída 🏍️
                </Button>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}