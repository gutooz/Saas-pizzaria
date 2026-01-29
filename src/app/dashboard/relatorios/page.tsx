"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, Bike, BarChart3, Wallet, Banknote, User, Loader2, 
  CalendarDays, Filter, ArrowUpCircle, ArrowDownCircle, AlertTriangle 
} from "lucide-react";

// Helper para converter data
function getDiaDaSemana(dateString: string) {
  const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const date = new Date(dateString + 'T12:00:00');
  return dias[date.getDay()];
}

function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default function RelatoriosUnificado() {
  const [activeTab, setActiveTab] = useState("geral");
  const [periodoFiltro, setPeriodoFiltro] = useState("dia"); // dia | todos
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split("T")[0]);
  const [turnoFiltro, setTurnoFiltro] = useState("todos"); 
  const [loading, setLoading] = useState(false);
  
  const [turnosDisponiveis, setTurnosDisponiveis] = useState<any[]>([]);
  const [diaSemanaAtual, setDiaSemanaAtual] = useState("");
  const [listaVendas, setListaVendas] = useState<any[]>([]);
  const [resumoGeral, setResumoGeral] = useState({ totalVendido: 0, qtdPedidos: 0, ticketMedio: 0, pix: 0, dinheiro: 0, cartao: 0 });
  const [relatorioMotos, setRelatorioMotos] = useState<any[]>([]);
  const [totaisMotos, setTotaisMotos] = useState({ entregas: 0, taxas: 0, diarias: 0 });
  const [listaSessoes, setListaSessoes] = useState<any[]>([]);
  const [resumoCaixa, setResumoCaixa] = useState({ totalEntradasManuais: 0, totalSangrias: 0, totalQuebra: 0 });

  const carregarDados = useCallback(async () => {
    setLoading(true);
    const pizzariaId = localStorage.getItem("pizzaria_id");
    if (!pizzariaId) return;

    const inicio = `${dataFiltro}T00:00:00`;
    const fim = `${dataFiltro}T23:59:59`;

    // 1. CARREGA CONFIGURAÇÃO (TURNOS)
    const { data: configLoja } = await supabase.from("loja_config").select("horarios").eq("pizzaria_id", pizzariaId).maybeSingle();
    const diaSemana = getDiaDaSemana(dataFiltro);
    setDiaSemanaAtual(diaSemana);
    
    let turnosDoDia: any[] = [];
    if (configLoja?.horarios) {
       const configDia = configLoja.horarios.find((d: any) => d.dia === diaSemana);
       if (configDia) turnosDoDia = configDia.turnos;
    }
    setTurnosDisponiveis(turnosDoDia);

    // 2. BUSCA VENDAS (Ajustado para histórico)
    let queryVendas = supabase
      .from("vendas")
      .select(`*, itens_venda (quantidade, cardapio ( nome ))`)
      .eq("pizzaria_id", pizzariaId)
      .neq("status", "Cancelado");

    if (periodoFiltro === "dia") {
        queryVendas = queryVendas.gte("created_at", inicio).lte("created_at", fim);
    }
    const { data: vendas } = await queryVendas.order("created_at", { ascending: false });

    // 3. BUSCA MOTOBOYS
    const { data: drivers } = await supabase.from("drivers").select("id, name, daily_fee").eq("pizzaria_id", pizzariaId);

    // 4. BUSCA SESSÕES DE CAIXA
    let querySessoes = supabase.from("caixa_sessoes").select(`*, usuarios ( nome )`).eq("pizzaria_id", pizzariaId);
    if (periodoFiltro === "dia") {
        querySessoes = querySessoes.gte("aberto_em", inicio).lte("aberto_em", fim);
    }
    const { data: sessoes } = await querySessoes.order("aberto_em", { ascending: false });

    // 5. BUSCA MOVIMENTAÇÕES
    let queryMov = supabase.from("caixa_movimentacoes").select("*").eq("pizzaria_id", pizzariaId);
    if (periodoFiltro === "dia") {
        queryMov = queryMov.gte("criado_em", inicio).lte("criado_em", fim);
    }
    const { data: movimentos } = await queryMov;

    // --- FILTRAGEM POR TURNO (Apenas se for filtro diário) ---
    const estaNoTurno = (dataString: string) => {
        if (turnoFiltro === "todos" || periodoFiltro === "todos") return true;
        const turnoSelecionado = turnosDoDia.find(t => t.nome === turnoFiltro);
        if (!turnoSelecionado) return true;
        const dataObj = new Date(dataString);
        const minutos = dataObj.getHours() * 60 + dataObj.getMinutes();
        return minutos >= timeToMinutes(turnoSelecionado.abertura) && minutos <= timeToMinutes(turnoSelecionado.fechamento);
    };

    const vendasFiltradas = (vendas || []).filter(v => estaNoTurno(v.created_at));
    setListaVendas(vendasFiltradas);

    const sessoesFiltradas = (sessoes || []).filter(s => estaNoTurno(s.aberto_em));
    setListaSessoes(sessoesFiltradas);
    const movimentosFiltrados = (movimentos || []).filter(m => estaNoTurno(m.criado_em));

    // --- CÁLCULOS ---
    let total = 0, qtd = 0, pix = 0, din = 0, cart = 0;
    vendasFiltradas.forEach(v => {
        const valor = Number(v.total) || 0;
        const metodo = v.metodo_pagamento?.toLowerCase() || "";
        total += valor; qtd++;
        if (metodo.includes("pix")) pix += valor;
        else if (metodo.includes("dinheiro")) din += valor;
        else cart += valor;
    });
    setResumoGeral({ totalVendido: total, qtdPedidos: qtd, ticketMedio: qtd > 0 ? total/qtd : 0, pix, dinheiro: din, cartao: cart });

    const mapa: any = {};
    let somaEntregas = 0, somaTaxas = 0, somaDiarias = 0;
    const mapDriversTemp: any = {};
    drivers?.forEach((d: any) => { mapDriversTemp[d.id] = Number(d.daily_fee) || 0; });

    vendasFiltradas.filter(v => v.driver_id).forEach((v) => {
        const id = v.driver_id;
        const taxa = Number(v.taxa_entrega) || 0;
        if (!mapa[id]) {
            mapa[id] = { id, nome: v.driver_name || "Motoboy", qtd: 0, taxas: 0, diaria: periodoFiltro === 'dia' ? (mapDriversTemp[id] || 0) : 0 };
            if (periodoFiltro === 'dia') somaDiarias += (mapDriversTemp[id] || 0);
        }
        mapa[id].qtd++;
        mapa[id].taxas += taxa;
        somaEntregas++;
        somaTaxas += taxa;
    });
    setRelatorioMotos(Object.values(mapa));
    setTotaisMotos({ entregas: somaEntregas, taxas: somaTaxas, diarias: somaDiarias });

    setResumoCaixa({
        totalEntradasManuais: movimentosFiltrados.filter(m => m.tipo === 'suprimento').reduce((acc, m) => acc + Number(m.valor), 0),
        totalSangrias: movimentosFiltrados.filter(m => ['sangria', 'saida'].includes(m.tipo)).reduce((acc, m) => acc + Number(m.valor), 0),
        totalQuebra: sessoesFiltradas.reduce((acc, s) => acc + (Number(s.quebra_de_caixa) || 0), 0)
    });

    setLoading(false);
  }, [dataFiltro, turnoFiltro, periodoFiltro]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const BRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatarData = (dataStr: string) => {
      if (!dataStr) return "-";
      const d = new Date(dataStr);
      return periodoFiltro === "dia" 
        ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' })
        : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + " " + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="text-red-600"/> Relatórios
            </h1>
            <p className="text-slate-500 text-sm flex items-center gap-1">
               {periodoFiltro === "dia" ? `Exibindo: ${diaSemanaAtual}` : "Exibindo Todo o Histórico"}
            </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
            {/* NOVO SELETOR DE PERÍODO */}
            <Select value={periodoFiltro} onValueChange={setPeriodoFiltro}>
                <SelectTrigger className="w-[160px] bg-slate-900 text-white font-bold">
                    <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="dia">Por Dia</SelectItem>
                    <SelectItem value="todos">Todo o Histórico</SelectItem>
                </SelectContent>
            </Select>

            {periodoFiltro === "dia" && (
                <>
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                        <CalendarDays size={16} className="text-slate-500"/>
                        <Input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="w-36 border-0 bg-transparent p-0 h-auto font-medium text-slate-700"/>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border">
                        <Filter size={16} className="text-slate-500 ml-2"/>
                        <Select value={turnoFiltro} onValueChange={setTurnoFiltro}>
                          <SelectTrigger className="w-[180px] border-0 bg-transparent focus:ring-0">
                            <SelectValue placeholder="Turno" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Dia Completo</SelectItem>
                            {turnosDisponiveis.map((t, idx) => (
                                <SelectItem key={idx} value={t.nome}>{t.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            <Button onClick={carregarDados} variant="outline" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Atualizar"}
            </Button>
        </div>
      </div>

      {/* ABAS */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab("geral")} className={`px-6 py-3 rounded-lg font-bold transition-all ${activeTab === "geral" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>Vendas</button>
        <button onClick={() => setActiveTab("motoboys")} className={`px-6 py-3 rounded-lg font-bold transition-all ${activeTab === "motoboys" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>Entregadores</button>
        <button onClick={() => setActiveTab("financeiro")} className={`px-6 py-3 rounded-lg font-bold transition-all ${activeTab === "financeiro" ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>Caixa</button>
      </div>

      {/* CONTEÚDO VENDAS */}
      {activeTab === "geral" && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 text-white"><CardHeader className="pb-2"><CardTitle className="text-xs opacity-70">Faturamento</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{BRL(resumoGeral.totalVendido)}</div></CardContent></Card>
                <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Dinheiro</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{BRL(resumoGeral.dinheiro)}</div></CardContent></Card>
                <Card className="border-l-4 border-l-purple-500"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">PIX</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{BRL(resumoGeral.pix)}</div></CardContent></Card>
                <Card className="border-l-4 border-l-blue-500"><CardHeader className="pb-2"><CardTitle className="text-xs text-slate-500">Cartão</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{BRL(resumoGeral.cartao)}</div></CardContent></Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-lg">Extrato de Pedidos <Badge variant="secondary" className="ml-2">{listaVendas.length}</Badge></CardTitle>
                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-2"/> Imprimir</Button>
                </CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>ID</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Itens</TableHead>
                            <TableHead className="text-center">Pagamento</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {listaVendas.map((venda) => (
                            <TableRow key={venda.id}>
                                <TableCell className="text-xs text-slate-500 font-mono">{formatarData(venda.created_at)}</TableCell>
                                <TableCell className="font-bold">#{venda.id}</TableCell>
                                <TableCell>{venda.cliente_nome}</TableCell>
                                <TableCell className="text-xs truncate max-w-[200px]">{venda.itens_venda?.map((i: any) => `${i.quantidade}x ${i.cardapio?.nome}`).join(', ')}</TableCell>
                                <TableCell className="text-center capitalize"><Badge variant="outline">{venda.metodo_pagamento}</Badge></TableCell>
                                <TableCell className="text-right font-bold">{BRL(Number(venda.total))}</TableCell>
                            </TableRow>
                        ))}
                        {listaVendas.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">Nenhum pedido encontrado.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </Card>
        </div>
      )}

      {/* CONTEÚDO MOTOBOYS (COMPLETADO COM DADOS REAIS) */}
      {activeTab === "motoboys" && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-medium text-slate-500">Total Taxas</CardTitle>
                        <Bike size={16} className="text-slate-400" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{BRL(totaisMotos.taxas)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-medium text-slate-500">Total Diárias</CardTitle>
                        <User size={16} className="text-slate-400" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{BRL(totaisMotos.diarias)}</div></CardContent>
                </Card>
                <Card className="bg-slate-900 text-white border-0">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-medium text-slate-300">Total a Pagar</CardTitle>
                        <Wallet size={16} className="text-slate-300" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{BRL(totaisMotos.taxas + totaisMotos.diarias)}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Detalhamento por Entregador</CardTitle></CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Entregador</TableHead>
                            <TableHead className="text-center">Qtd. Entregas</TableHead>
                            <TableHead className="text-right">Total Taxas</TableHead>
                            <TableHead className="text-right">Diária</TableHead>
                            <TableHead className="text-right">Total Geral</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {relatorioMotos.map((moto) => (
                            <TableRow key={moto.id}>
                                <TableCell className="font-medium">{moto.nome}</TableCell>
                                <TableCell className="text-center">{moto.qtd}</TableCell>
                                <TableCell className="text-right">{BRL(moto.taxas)}</TableCell>
                                <TableCell className="text-right">{BRL(moto.diaria)}</TableCell>
                                <TableCell className="text-right font-bold text-slate-900">{BRL(moto.taxas + moto.diaria)}</TableCell>
                            </TableRow>
                        ))}
                        {relatorioMotos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-10 text-slate-400">Nenhuma entrega no período.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </Card>
        </div>
      )}

      {/* CONTEÚDO FINANCEIRO (COMPLETADO COM DADOS REAIS) */}
      {activeTab === "financeiro" && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-medium text-slate-500">Entradas (Suprimentos)</CardTitle>
                        <ArrowUpCircle size={16} className="text-green-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-700">+ {BRL(resumoCaixa.totalEntradasManuais)}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-medium text-slate-500">Saídas (Sangrias)</CardTitle>
                        <ArrowDownCircle size={16} className="text-red-500" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-700">- {BRL(resumoCaixa.totalSangrias)}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs font-medium text-slate-500">Quebra de Caixa</CardTitle>
                        <AlertTriangle size={16} className="text-yellow-500" />
                    </CardHeader>
                    <CardContent><div className={`text-2xl font-bold ${resumoCaixa.totalQuebra < 0 ? 'text-red-600' : 'text-green-600'}`}>{BRL(resumoCaixa.totalQuebra)}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>Sessões de Caixa</CardTitle></CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Operador</TableHead>
                            <TableHead>Abertura</TableHead>
                            <TableHead>Fechamento</TableHead>
                            <TableHead className="text-right">Saldo Inicial</TableHead>
                            <TableHead className="text-right">Saldo Final</TableHead>
                            <TableHead className="text-right">Diferença</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {listaSessoes.map((sessao) => (
                            <TableRow key={sessao.id}>
                                <TableCell className="font-medium">{sessao.usuarios?.nome || "Usuário"}</TableCell>
                                <TableCell className="text-xs">{formatarData(sessao.aberto_em)}</TableCell>
                                <TableCell className="text-xs">{sessao.fechado_em ? formatarData(sessao.fechado_em) : <Badge className="bg-green-500">Aberto</Badge>}</TableCell>
                                <TableCell className="text-right">{BRL(Number(sessao.saldo_inicial))}</TableCell>
                                <TableCell className="text-right">{BRL(Number(sessao.saldo_final))}</TableCell>
                                <TableCell className={`text-right font-bold ${Number(sessao.quebra_de_caixa) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                    {sessao.fechado_em ? BRL(Number(sessao.quebra_de_caixa)) : "-"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {listaSessoes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-400">Nenhum caixa registrado no período.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </Card>
        </div>
      )}
      
    </div>
  );
}