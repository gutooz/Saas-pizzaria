"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Printer, Bike, BarChart3, CreditCard, Wallet, Banknote, User, Loader2, 
  Clock, CalendarDays, Filter, ArrowUpCircle, ArrowDownCircle, AlertTriangle, FileText 
} from "lucide-react";

// Helper para converter data
function getDiaDaSemana(dateString: string) {
  const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const date = new Date(dateString + 'T12:00:00');
  return dias[date.getDay()];
}

// Converte "18:30" para minutos
function timeToMinutes(time: string) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export default function RelatoriosUnificado() {
  const [activeTab, setActiveTab] = useState("geral"); // geral | motoboys | financeiro
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split("T")[0]);
  const [turnoFiltro, setTurnoFiltro] = useState("todos"); 
  const [loading, setLoading] = useState(false);
  
  // DADOS DE CONFIGURAÇÃO
  const [turnosDisponiveis, setTurnosDisponiveis] = useState<any[]>([]);
  const [diaSemanaAtual, setDiaSemanaAtual] = useState("");

  // DADOS DE VENDAS
  const [listaVendas, setListaVendas] = useState<any[]>([]);
  const [resumoGeral, setResumoGeral] = useState({ totalVendido: 0, qtdPedidos: 0, ticketMedio: 0, pix: 0, dinheiro: 0, cartao: 0 });
  
  // DADOS DE MOTOBOYS
  const [relatorioMotos, setRelatorioMotos] = useState<any[]>([]);
  const [totaisMotos, setTotaisMotos] = useState({ entregas: 0, taxas: 0, diarias: 0 });

  // DADOS DE CAIXA (NOVO)
  const [listaSessoes, setListaSessoes] = useState<any[]>([]);
  const [resumoCaixa, setResumoCaixa] = useState({ totalEntradasManuais: 0, totalSangrias: 0, totalQuebra: 0 });

  async function carregarDados() {
    setLoading(true);
    const inicio = `${dataFiltro}T00:00:00`;
    const fim = `${dataFiltro}T23:59:59`;
    const pizzariaId = localStorage.getItem("pizzaria_id"); // Garante filtro multi-tenant

    // 1. CARREGA CONFIGURAÇÃO
    const { data: configLoja } = await supabase.from("loja_config").select("horarios").eq("pizzaria_id", pizzariaId).maybeSingle();
    
    const diaSemana = getDiaDaSemana(dataFiltro);
    setDiaSemanaAtual(diaSemana);
    
    let turnosDoDia: any[] = [];
    if (configLoja?.horarios) {
       const configDia = configLoja.horarios.find((d: any) => d.dia === diaSemana);
       if (configDia) turnosDoDia = configDia.turnos;
    }
    setTurnosDisponiveis(turnosDoDia);

    // 2. BUSCA VENDAS
    const { data: vendas } = await supabase
      .from("vendas")
      .select(`*, itens_venda (quantidade, cardapio ( nome ))`)
      .eq("pizzaria_id", pizzariaId)
      .gte("created_at", inicio)
      .lte("created_at", fim)
      .neq("status", "Cancelado")
      .order("created_at", { ascending: false });

    // 3. BUSCA MOTOBOYS
    const { data: drivers } = await supabase.from("drivers").select("id, name, daily_fee").eq("pizzaria_id", pizzariaId);

    // 4. BUSCA SESSÕES DE CAIXA (NOVO)
    const { data: sessoes } = await supabase
      .from("caixa_sessoes")
      .select(`*, usuarios ( nome )`)
      .eq("pizzaria_id", pizzariaId)
      .gte("aberto_em", inicio)
      .lte("aberto_em", fim)
      .order("aberto_em", { ascending: false });

    // 5. BUSCA MOVIMENTAÇÕES DE CAIXA (NOVO)
    const { data: movimentos } = await supabase
      .from("caixa_movimentacoes")
      .select("*")
      .eq("pizzaria_id", pizzariaId)
      .gte("criado_em", inicio)
      .lte("criado_em", fim);

    // --- FILTRAGEM UNIFICADA POR TURNO ---
    // Função auxiliar para checar se uma data/hora cai no turno selecionado
    const estaNoTurno = (dataString: string) => {
        if (turnoFiltro === "todos") return true;
        const turnoSelecionado = turnosDoDia.find(t => t.nome === turnoFiltro);
        if (!turnoSelecionado) return true;

        const dataObj = new Date(dataString);
        const minutos = dataObj.getHours() * 60 + dataObj.getMinutes();
        const inicioTurno = timeToMinutes(turnoSelecionado.abertura);
        const fimTurno = timeToMinutes(turnoSelecionado.fechamento);
        return minutos >= inicioTurno && minutos <= fimTurno;
    };

    // Filtra Vendas
    const vendasFiltradas = (vendas || []).filter(v => estaNoTurno(v.created_at));
    setListaVendas(vendasFiltradas);

    // Filtra Sessões de Caixa (Baseado na hora de abertura)
    const sessoesFiltradas = (sessoes || []).filter(s => estaNoTurno(s.aberto_em));
    setListaSessoes(sessoesFiltradas);

    // Filtra Movimentos
    const movimentosFiltrados = (movimentos || []).filter(m => estaNoTurno(m.criado_em));


    // --- CÁLCULO VENDAS ---
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

    // --- CÁLCULO MOTOBOYS ---
    const mapa: any = {};
    let somaEntregas = 0, somaTaxas = 0, somaDiarias = 0;
    const mapDriversTemp: any = {};
    drivers?.forEach((d: any) => { mapDriversTemp[d.id] = Number(d.daily_fee) || 0; });

    const vendasComMoto = vendasFiltradas.filter(v => v.driver_id);
    vendasComMoto.forEach((v) => {
        const id = v.driver_id;
        const taxa = Number(v.taxa_entrega) || 0;
        if (!mapa[id]) {
            const valorDiariaFixa = mapDriversTemp[id] || 0;
            mapa[id] = { id, nome: v.driver_name || "Motoboy", qtd: 0, taxas: 0, diaria: valorDiariaFixa };
            somaDiarias += valorDiariaFixa;
        }
        mapa[id].qtd++;
        mapa[id].taxas += taxa;
        somaEntregas++;
        somaTaxas += taxa;
    });
    setRelatorioMotos(Object.values(mapa));
    setTotaisMotos({ entregas: somaEntregas, taxas: somaTaxas, diarias: somaDiarias });

    // --- CÁLCULO FINANCEIRO CAIXA ---
    const entradasManuais = movimentosFiltrados.filter(m => m.tipo === 'suprimento').reduce((acc, m) => acc + Number(m.valor), 0);
    const sangrias = movimentosFiltrados.filter(m => ['sangria', 'saida'].includes(m.tipo)).reduce((acc, m) => acc + Number(m.valor), 0);
    const quebraTotal = sessoesFiltradas.reduce((acc, s) => acc + (Number(s.quebra_de_caixa) || 0), 0);

    setResumoCaixa({
        totalEntradasManuais: entradasManuais,
        totalSangrias: sangrias,
        totalQuebra: quebraTotal
    });

    setLoading(false);
  }

  useEffect(() => { carregarDados(); }, [dataFiltro, turnoFiltro]);

  const hora = (data: string) => new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit' });
  const BRL = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="p-8 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 className="text-red-600"/> Relatórios
            </h1>
            <p className="text-slate-500 text-sm flex items-center gap-1">
               Exibindo dados de: <Badge variant="secondary">{diaSemanaAtual}</Badge>
            </p>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                <CalendarDays size={16} className="text-slate-500"/>
                <Input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className="w-36 border-0 bg-transparent p-0 h-auto font-medium text-slate-700"/>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border">
                <Filter size={16} className="text-slate-500 ml-2"/>
                <Select value={turnoFiltro} onValueChange={setTurnoFiltro}>
                  <SelectTrigger className="w-[180px] border-0 bg-transparent focus:ring-0">
                    <SelectValue placeholder="Selecione o Turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Dia Completo</SelectItem>
                    {turnosDisponiveis.length > 0 ? (
                        turnosDisponiveis.map((t, idx) => (
                            <SelectItem key={idx} value={t.nome}>{t.nome} ({t.abertura} - {t.fechamento})</SelectItem>
                        ))
                    ) : (
                        <SelectItem value="sem_turnos" disabled>Sem turnos cadastrados</SelectItem>
                    )}
                  </SelectContent>
                </Select>
            </div>

            <Button onClick={carregarDados} variant="default" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : "Atualizar"}
            </Button>
        </div>
      </div>

      {/* NAVEGAÇÃO ENTRE ABAS */}
      <div className="flex gap-4 mb-6">
        <button onClick={() => setActiveTab("geral")} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === "geral" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-100"}`}>Vendas</button>
        <button onClick={() => setActiveTab("motoboys")} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === "motoboys" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-100"}`}><Bike size={20}/> Entregadores</button>
        <button onClick={() => setActiveTab("financeiro")} className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === "financeiro" ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-600 hover:bg-slate-100"}`}><Wallet size={20}/> Financeiro / Caixa</button>
      </div>

      {/* ABA 1: VENDAS GERAIS */}
      {activeTab === "geral" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-slate-900 text-white border-none shadow-xl"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold opacity-70">Faturamento Total</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{BRL(resumoGeral.totalVendido)}</div></CardContent></Card>
                <Card className="border-l-4 border-l-green-500"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-slate-500 flex gap-2"><Banknote size={14}/> Dinheiro</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-700">{BRL(resumoGeral.dinheiro)}</div></CardContent></Card>
                <Card className="border-l-4 border-l-purple-500"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-slate-500 flex gap-2"><Wallet size={14}/> PIX</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-700">{BRL(resumoGeral.pix)}</div></CardContent></Card>
                <Card className="border-l-4 border-l-blue-500"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-slate-500 flex gap-2"><CreditCard size={14}/> Cartão</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-slate-700">{BRL(resumoGeral.cartao)}</div></CardContent></Card>
            </div>

            <Card className="border shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b flex flex-row justify-between items-center py-4">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">Extrato de Pedidos</CardTitle>
                        <Badge variant="secondary">{listaVendas.length} pedidos</Badge>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-2"/> Imprimir Relatório</Button>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[80px]">Hora</TableHead>
                                <TableHead className="w-[80px]">ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Itens</TableHead>
                                <TableHead className="text-center">Pagamento</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {listaVendas.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">Nenhuma venda encontrada.</TableCell>
                                </TableRow>
                            )}
                            {listaVendas.map((venda) => (
                                <TableRow key={venda.id} className="hover:bg-slate-50 transition-colors">
                                    <TableCell className="font-mono text-xs text-slate-500"><div className="flex items-center gap-1"><Clock size={12}/> {hora(venda.created_at)}</div></TableCell>
                                    <TableCell className="font-bold">#{venda.id}</TableCell>
                                    <TableCell className="font-medium text-slate-700">{venda.cliente}</TableCell>
                                    <TableCell className="text-xs text-slate-500 max-w-[250px] truncate">{venda.itens_venda?.map((i: any) => `${i.quantidade}x ${i.cardapio?.nome || 'Item'}`).join(', ')}</TableCell>
                                    <TableCell className="text-center capitalize"><Badge variant="outline">{venda.metodo_pagamento}</Badge></TableCell>
                                    <TableCell className="text-center"><span className={`text-[10px] font-bold px-2 py-1 rounded-full ${venda.status === 'Entregue' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{venda.status}</span></TableCell>
                                    <TableCell className="text-right font-bold text-slate-800">{BRL(Number(venda.total))}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
      )}

      {/* ABA 2: MOTOBOYS */}
      {activeTab === "motoboys" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Entregas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totaisMotos.entregas}</div></CardContent></Card>
                <Card className="bg-orange-50 border-orange-200"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-700">Diárias</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-orange-700">{BRL(totaisMotos.diarias)}</div></CardContent></Card>
                <Card className="bg-green-50 border-green-200"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700">Total a Pagar</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-700">{BRL(totaisMotos.taxas + totaisMotos.diarias)}</div></CardContent></Card>
            </div>
            <Card>
                <CardHeader className="bg-white border-b flex justify-between items-center"><CardTitle>Fechamento por Motoboy</CardTitle><Button variant="outline" size="sm" onClick={() => window.print()}><Printer size={16} className="mr-2"/> Imprimir</Button></CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Motoboy</TableHead>
                            <TableHead className="text-center">Qtd.</TableHead>
                            <TableHead className="text-right">Taxas</TableHead>
                            <TableHead className="text-right">Diária</TableHead>
                            <TableHead className="text-right bg-slate-50">TOTAL</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {relatorioMotos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-400">Nenhum registro.</TableCell></TableRow>}
                        {relatorioMotos.map((m) => (
                            <TableRow key={m.id}>
                                <TableCell className="font-bold flex items-center gap-2"><div className="bg-slate-100 p-2 rounded-full"><User size={16}/></div>{m.nome}</TableCell>
                                <TableCell className="text-center"><Badge variant="outline">{m.qtd}</Badge></TableCell>
                                <TableCell className="text-right text-slate-600">{BRL(m.taxas)}</TableCell>
                                <TableCell className="text-right text-orange-600 font-medium">+ {BRL(m.diaria)}</TableCell>
                                <TableCell className="text-right font-bold text-green-700 text-lg bg-green-50">{BRL(m.taxas + m.diaria)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
      )}

      {/* ABA 3: FINANCEIRO / CAIXA (NOVO) */}
      {activeTab === "financeiro" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-green-500 bg-green-50/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 flex gap-2"><ArrowUpCircle size={16}/> Suprimentos (Entrada Manual)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-700">{BRL(resumoCaixa.totalEntradasManuais)}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500 bg-red-50/20">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-700 flex gap-2"><ArrowDownCircle size={16}/> Sangrias (Saídas)</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-700">{BRL(resumoCaixa.totalSangrias)}</div></CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500 bg-orange-50/30">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-700 flex gap-2"><AlertTriangle size={16}/> Quebra de Caixa (Diferenças)</CardTitle></CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${resumoCaixa.totalQuebra < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                            {BRL(resumoCaixa.totalQuebra)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="bg-white border-b"><CardTitle className="flex gap-2 items-center"><FileText size={20}/> Histórico de Turnos</CardTitle></CardHeader>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Horário</TableHead>
                            <TableHead>Operador</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Inicial</TableHead>
                            <TableHead className="text-right">Final Informado</TableHead>
                            <TableHead className="text-right bg-slate-50">Diferença</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {listaSessoes.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-400">Nenhum caixa aberto neste período.</TableCell></TableRow>}
                        {listaSessoes.map((s) => {
                            const quebra = Number(s.quebra_de_caixa);
                            return (
                                <TableRow key={s.id}>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="font-bold flex gap-1 items-center"><ArrowUpCircle size={12} className="text-green-500"/> {hora(s.aberto_em)}</span>
                                            {s.fechado_em && <span className="text-slate-500 flex gap-1 items-center"><ArrowDownCircle size={12} className="text-red-500"/> {hora(s.fechado_em)}</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">{s.usuarios?.nome || `User #${s.usuario_id}`}</TableCell>
                                    <TableCell>{s.status === 'aberto' ? <Badge className="bg-green-100 text-green-700 border-green-200">Aberto Agora</Badge> : <Badge variant="outline">Fechado</Badge>}</TableCell>
                                    <TableCell className="text-right text-slate-500">{BRL(s.saldo_inicial)}</TableCell>
                                    <TableCell className="text-right font-bold">{s.saldo_final ? BRL(s.saldo_final) : '-'}</TableCell>
                                    <TableCell className="text-right bg-slate-50">
                                        {s.status === 'aberto' ? '-' : (
                                            <span className={`font-bold ${quebra < -0.5 ? 'text-red-600' : quebra > 0.5 ? 'text-blue-600' : 'text-slate-400'}`}>
                                                {BRL(quebra)}
                                            </span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
      )}
    </div>
  );
}