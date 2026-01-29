"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; 
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Flame, Bike, CheckCircle, RefreshCw, Archive, Flag, Printer } from "lucide-react";

export default function DashboardCozinha() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pizzariaId, setPizzariaId] = useState<string | null>(null);

  const pedidosImpressos = useRef<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<number | null>(null);
  const [motoboyEscolhido, setMotoboyEscolhido] = useState("");

  // --- NOVA FUNÇÃO DE IMPRESSÃO (INFALÍVEL) ---
  const imprimirPedido = useCallback((pedido: any) => {
    // 1. Abre uma nova janela em branco
    const janelaImpressao = window.open('', '', 'width=300,height=600');
    if (!janelaImpressao) return alert("Permita pop-ups para imprimir!");

    // 2. Monta o HTML do cupom
    const itensHtml = pedido.items.map((item: any) => `
        <tr style="border-bottom: 1px dashed #ccc;">
            <td style="padding: 5px 0; font-weight: bold; width: 30px;">${item.qtd}x</td>
            <td style="padding: 5px 0;">${item.name}</td>
        </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
            <title>Pedido #${pedido.id}</title>
            <style>
                @page { margin: 0; }
                body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; width: 80mm; }
                .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .titulo { font-size: 16px; font-weight: bold; display: block; margin-bottom: 5px; }
                .info { font-size: 11px; color: #333; }
                table { width: 100%; border-collapse: collapse; }
                .footer { border-top: 2px dashed #000; margin-top: 15px; padding-top: 10px; font-size: 13px; }
                .tag { background: #000; color: #fff; padding: 2px 5px; font-weight: bold; border-radius: 3px; font-size: 10px; }
            </style>
        </head>
        <body>
          <div class="header">
            <span class="titulo">COZINHA #${pedido.id}</span>
            <span class="info">${new Date().toLocaleString('pt-BR')}</span>
          </div>
          
          <table>
            <tbody>
                ${itensHtml}
            </tbody>
          </table>

          <div class="footer">
            <div style="margin-bottom: 5px;">
                <b>Cliente:</b> ${pedido.customer_name}
            </div>
            <div>
                <b>Tipo:</b> ${pedido.status === 'producao' ? '<span class="tag">BALCÃO</span>' : '<span class="tag">DELIVERY</span>'}
            </div>
             ${pedido.driver_name ? `<div style="margin-top:5px"><b>Motoboy:</b> ${pedido.driver_name}</div>` : ''}
          </div>
          <script>
            // 3. Manda imprimir assim que carregar e fecha a janela depois
            window.onload = function() {
                window.print();
                setTimeout(function(){ window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    // 3. Escreve o conteúdo na janela e finaliza
    janelaImpressao.document.write(htmlContent);
    janelaImpressao.document.close(); // Importante para navegadores terminarem o carregamento
    
    // Marca como impresso para não imprimir 2x sozinho
    pedidosImpressos.current.add(pedido.id);

  }, []);

  useEffect(() => {
    const idSalvo = localStorage.getItem("pizzaria_id");
    if (!idSalvo) {
      router.push("/");
    } else {
      setPizzariaId(idSalvo);
    }
  }, [router]);

  const carregarDados = useCallback(async () => {
    if (!pizzariaId) return;

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
      .neq("status", "Arquivado")
      .order("created_at", { ascending: true });

    if (errorVendas) {
      console.error("ERRO AO BUSCAR VENDAS:", errorVendas.message);
    }

    const { data: dataDrivers } = await supabase
      .from("drivers")
      .select("*")
      .eq("status", "Ativo");

    const vendasFormatadas = (dataVendas || []).map((v: any) => ({
      id: v.id,
      customer_name: v.cliente_nome || v.cliente || "Cliente Balcão",
      created_at: v.created_at,
      status: v.status || "Pendente",
      driver_name: v.driver_name,
      items: v.itens_venda ? v.itens_venda.map((item: any) => ({
        qtd: item.quantidade,
        name: item.cardapio?.nome || "Item personalizado"
      })) : []
    }));

    vendasFormatadas.forEach(p => {
      if (p.status === "producao" && !pedidosImpressos.current.has(p.id)) {
        imprimirPedido(p);
      }
    });

    setPedidos(vendasFormatadas);
    setMotoboys(dataDrivers || []);
    setLoading(false);
  }, [pizzariaId, imprimirPedido]);

  useEffect(() => {
    if (pizzariaId) {
      carregarDados();
      const intervalo = setInterval(carregarDados, 5000);
      return () => clearInterval(intervalo);
    }
  }, [pizzariaId, carregarDados]);

  async function avancarStatus(id: number, statusAtual: string) {
    if (statusAtual === "Preparando" || statusAtual === "producao") {
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
        if (camposParaAtualizar.status === "Arquivado") {
            setPedidos(prev => prev.filter(p => p.id !== id));
        } else {
            setPedidos(prev => prev.map(p => p.id === id ? { ...p, ...camposParaAtualizar } : p));
        }
    }
  }

  const novos = pedidos.filter(p => p.status === "Pendente");
  const preparando = pedidos.filter(p => p.status === "Preparando" || p.status === "producao");
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => imprimirPedido(pedido)} className="bg-white border-slate-200" title="Imprimir">
                      <Printer size={14} />
                    </Button>
                    <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-sm" onClick={() => avancarStatus(pedido.id, "Pendente")}>
                        Preparar
                    </Button>
                  </div>
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
              <Card key={pedido.id} className={`border-l-4 shadow-sm ${pedido.status === 'producao' ? 'border-l-green-500 bg-green-50/30' : 'border-l-orange-500'}`}>
                <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between space-y-0">
                  <span className="font-bold text-sm">#{pedido.id}</span>
                  <div className="flex items-center gap-2">
                    {pedido.status === 'producao' && <Badge className="bg-green-600 text-[9px] h-4">BALCÃO</Badge>}
                    <span className="text-[10px] text-slate-400 font-mono">{hora(pedido.created_at)}</span>
                  </div>
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
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => imprimirPedido(pedido)} className="bg-white border-slate-200" title="Imprimir">
                      <Printer size={14} />
                    </Button>
                    <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600 text-white shadow-sm" onClick={() => avancarStatus(pedido.id, pedido.status)}>
                      Despachar
                    </Button>
                  </div>
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
                  
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => imprimirPedido(pedido)} className="bg-white border-slate-200" title="Imprimir">
                      <Printer size={14} />
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 border-green-200 text-green-700 hover:bg-green-50 shadow-sm" onClick={() => avancarStatus(pedido.id, "Em Rota")}>
                        <CheckCircle size={14} className="mr-2" /> Entregue
                    </Button>
                  </div>
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
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => imprimirPedido(pedido)} className="bg-white border-slate-200" title="Imprimir">
                      <Printer size={14} />
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 h-9 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => arquivarPedido(pedido.id)}>
                        <Archive size={12} className="mr-1" /> Arquivar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>

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