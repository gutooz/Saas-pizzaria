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

  // --- FUNÇÃO DE IMPRESSÃO ATUALIZADA (COM ENDEREÇO E PAGAMENTO) ---
  const imprimirPedido = useCallback((pedido: any) => {
    const janelaImpressao = window.open('', '', 'width=300,height=600');
    if (!janelaImpressao) return alert("Permita pop-ups para imprimir!");

    // Monta o HTML dos itens com a observação (para casos de Meio a Meio ou sem cebola)
    const itensHtml = pedido.items.map((item: any) => `
        <div style="border-bottom: 1px dashed #ccc; padding-bottom: 5px; margin-bottom: 5px;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                <span>${item.qtd}x ${item.name}</span>
                <span>R$ ${Number(item.preco || 0).toFixed(2)}</span>
            </div>
            ${item.obs && item.obs !== item.name ? `<div style="font-size: 11px; margin-top: 2px;">OBS: ${item.obs}</div>` : ''}
        </div>
    `).join('');

    // HTML do Cupom (80mm) com as informações do cliente
    const htmlContent = `
      <html>
        <head>
            <title>Comanda #${pedido.id}</title>
            <style>
                @page { margin: 0; }
                body { font-family: 'Courier New', Courier, monospace; font-size: 12px; margin: 0; padding: 10px; width: 80mm; color: black; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .header { border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; text-align: center; }
                .titulo { font-size: 18px; font-weight: bold; display: block; margin-bottom: 5px; }
                .info { font-size: 11px; color: #333; }
                .section { border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .tag { background: #000; color: #fff; padding: 2px 5px; font-weight: bold; border-radius: 3px; font-size: 10px; display: inline-block; margin-top: 3px; }
                .total-box { margin-top: 10px; font-size: 14px; }
            </style>
        </head>
        <body>
          <div class="header">
            <span class="titulo">COMANDA #${pedido.id}</span>
            <span class="info">${new Date(pedido.created_at).toLocaleString('pt-BR')}</span>
          </div>
          
          <div class="section">
            <div class="bold" style="font-size: 14px;">CLIENTE: ${pedido.customer_name}</div>
            <div style="font-size: 13px; margin-top: 3px;">Tel: ${pedido.telefone || 'Não informado'}</div>
            
            ${pedido.status_original === 'producao' 
                ? '<div class="tag" style="background: green; margin-top: 5px;">RETIRADA NO BALCÃO</div>'
                : `
                <div class="bold" style="font-size: 13px; margin-top: 8px; background: black; color: white; padding: 3px; display: inline-block;">ENDEREÇO:</div>
                <div class="bold" style="font-size: 13px; margin-top: 5px;">${pedido.endereco || 'Endereço não informado'}</div>
                `
            }
          </div>

          <div class="section">
            <div class="center bold" style="font-size: 15px; margin-bottom: 10px;">--- ITENS ---</div>
            ${itensHtml}
          </div>

          <div class="total-box">
            <div style="display: flex; justify-content: space-between;">
              <span>Taxa Entrega:</span>
              <span>R$ ${Number(pedido.taxa_entrega || 0).toFixed(2)}</span>
            </div>
            <div class="bold" style="display: flex; justify-content: space-between; font-size: 16px; margin-top: 5px;">
              <span>TOTAL:</span>
              <span>R$ ${Number(pedido.total || 0).toFixed(2)}</span>
            </div>
            <div class="bold" style="margin-top: 8px; font-size: 13px; border: 1px solid black; padding: 4px; text-align: center;">
              Pgto: ${pedido.pagamento || 'Não informado'}
            </div>
            ${pedido.driver_name ? `<div style="margin-top:5px; text-align:center; font-size: 11px;"><b>Motoboy:</b> ${pedido.driver_name}</div>` : ''}
          </div>

          <div style="text-align:center; margin-top: 20px; font-size: 10px;">.</div>

          <script>
            window.onload = function() {
                window.print();
                setTimeout(function(){ window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;

    janelaImpressao.document.write(htmlContent);
    janelaImpressao.document.close(); 
    
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

    // A busca agora traz TODOS os campos necessários da venda principal
    const { data: dataVendas, error: errorVendas } = await supabase
      .from("vendas")
      .select(`
        *,
        itens_venda (
          quantidade,
          preco_unitario,
          observacao,
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

    // Formatando os dados da venda para o padrão que a tela e a impressora precisam
    const vendasFormatadas = (dataVendas || []).map((v: any) => {
        // Trata os itens dependendo de como eles estão salvos no banco
        // Se estiver em JSON na coluna 'itens_json' (Cardápio Digital)
        let itensParsed = [];
        if (v.itens_json) {
            if (typeof v.itens_json === 'string') {
                try { itensParsed = JSON.parse(v.itens_json); } catch(e) {}
            } else {
                itensParsed = v.itens_json;
            }
        } 
        // Se vier da tabela relacionada (PDV antigo)
        else if (v.itens_venda && v.itens_venda.length > 0) {
            itensParsed = v.itens_venda.map((item: any) => ({
                quantidade: item.quantidade,
                nome: item.cardapio?.nome || "Item",
                preco: item.preco_unitario,
                obs: item.observacao
            }));
        }

        return {
          id: v.id,
          customer_name: v.cliente_nome || v.cliente || "Cliente Balcão",
          telefone: v.cliente_telefone || "",
          endereco: v.endereco_entrega || "",
          pagamento: v.metodo_pgto || "",
          total: v.total_venda || 0,
          taxa_entrega: v.taxa_entrega_valor || 0,
          created_at: v.created_at,
          status_original: v.status, // Guarda o status real para saber se é produção(balcão)
          status: v.status || "Pendente",
          driver_name: v.driver_name,
          items: itensParsed.map((item: any) => ({
            qtd: item.quantidade || item.qtd || 1,
            name: item.nome,
            preco: item.preco || 0,
            obs: item.obs || ""
          }))
        };
    });

    // Impressão automática apenas para novos pedidos de balcão (status producao)
    vendasFormatadas.forEach(p => {
      if (p.status_original === "producao" && !pedidosImpressos.current.has(p.id)) {
        imprimirPedido(p);
      }
    });

    setPedidos(vendasFormatadas);
    setMotoboys(dataDrivers || []);
    setLoading(false);
  }, [pizzariaId, imprimirPedido]);

  useEffect(() => {
    if (!pizzariaId) return;

    // Carrega os dados na primeira vez
    carregarDados();
    
    // Fallback de segurança atualiza a tela a cada 10 segundos
    const intervalo = setInterval(carregarDados, 10000);

    // ESCUTADOR EM TEMPO REAL (Dispara o som na hora)
    const channel = supabase
      .channel('notificacao_cozinha')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'vendas', filter: `pizzaria_id=eq.${pizzariaId}` },
        (payload) => {
          // Tenta tocar o som
          try {
            const audio = new Audio('/som-pedido.mp3');
            audio.play().catch(err => {
              console.warn("Navegador bloqueou o som automático. É preciso clicar na tela pelo menos uma vez.");
            });
          } catch(e) {}

          // Atualiza a lista de pedidos na tela imediatamente
          carregarDados();
        }
      )
      .subscribe();

    // Limpeza ao sair da página
    return () => {
      clearInterval(intervalo);
      supabase.removeChannel(channel);
    };
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
                    <Button variant="outline" size="sm" onClick={() => imprimirPedido(pedido)} className="bg-white border-slate-200" title="Imprimir Comanda">
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
                    <Button variant="outline" size="sm" onClick={() => imprimirPedido(pedido)} className="bg-white border-slate-200" title="Imprimir Comanda">
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