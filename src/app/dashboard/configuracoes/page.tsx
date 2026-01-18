"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Save, Store, MapPin, Phone, DollarSign, Clock, Loader2, Plus, Trash2, Calendar, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; // Se não tiver esse componente, use o Input ou html textarea
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Dias da semana fixos para gerar a lista
const DIAS_SEMANA = [
  "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"
];

interface Turno {
  nome: string;   // ex: Almoço, Jantar
  abertura: string; // 18:00
  fechamento: string; // 23:00
}

interface DiaFuncionamento {
  dia: string;
  turnos: Turno[];
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Estado com os dados da loja
  const [loja, setLoja] = useState({
    id: 0,
    nome_loja: "",
    endereco: "",
    telefone: "",
    cor_tema: "#e11d48", 
    taxa_entrega_padrao: "5.00",
    tempo_espera_minutos: "40",
    largura_impressao: "80mm", // Novo campo
    mensagem_rodape: "Obrigado pela preferência!", // Novo campo
    horarios: [] as DiaFuncionamento[]
  });

  // 1. CARREGAR DADOS
  useEffect(() => {
    async function fetchConfig() {
      const { data } = await supabase.from("loja_config").select("*").limit(1).single();
      
      if (data) {
        let horariosIniciais = data.horarios;
        
        if (!horariosIniciais || !Array.isArray(horariosIniciais) || horariosIniciais.length === 0) {
            horariosIniciais = DIAS_SEMANA.map(dia => ({ dia, turnos: [] }));
        }

        setLoja({
            ...data,
            taxa_entrega_padrao: data.taxa_entrega_padrao || "0.00",
            tempo_espera_minutos: data.tempo_espera_minutos || "40",
            largura_impressao: data.largura_impressao || "80mm",
            mensagem_rodape: data.mensagem_rodape || "Obrigado pela preferência!",
            horarios: horariosIniciais
        });
      }
      setLoading(false);
    }
    fetchConfig();
  }, []);

  // 2. SALVAR DADOS
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    const { error } = await supabase
      .from("loja_config")
      .update({
        nome_loja: loja.nome_loja,
        endereco: loja.endereco,
        telefone: loja.telefone,
        cor_tema: loja.cor_tema,
        taxa_entrega_padrao: Number(loja.taxa_entrega_padrao),
        tempo_espera_minutos: Number(loja.tempo_espera_minutos),
        largura_impressao: loja.largura_impressao, // Salva config impressora
        mensagem_rodape: loja.mensagem_rodape,     // Salva config impressora
        horarios: loja.horarios
      })
      .eq("id", loja.id);

    if (error) {
      alert("Erro ao salvar!");
      console.error(error);
    } else {
      alert("Configurações atualizadas com sucesso!");
    }
    setSalvando(false);
  }

  // FUNÇÕES DE HORÁRIO
  function adicionarTurno(indexDia: number) {
    const novosHorarios = [...loja.horarios];
    novosHorarios[indexDia].turnos.push({ nome: "Jantar", abertura: "18:00", fechamento: "23:00" });
    setLoja({ ...loja, horarios: novosHorarios });
  }

  function removerTurno(indexDia: number, indexTurno: number) {
    const novosHorarios = [...loja.horarios];
    novosHorarios[indexDia].turnos.splice(indexTurno, 1);
    setLoja({ ...loja, horarios: novosHorarios });
  }

  function atualizarTurno(indexDia: number, indexTurno: number, campo: keyof Turno, valor: string) {
    const novosHorarios = [...loja.horarios];
    novosHorarios[indexDia].turnos[indexTurno][campo] = valor;
    setLoja({ ...loja, horarios: novosHorarios });
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando configurações...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-24">
      
      <div className="flex justify-between items-center border-b pb-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Store className="text-slate-600" /> Configurações da Loja
            </h1>
            <p className="text-slate-500">Gerencie dados, horários e preferências de impressão.</p>
        </div>
      </div>

      <form onSubmit={handleSalvar} className="space-y-8">
        
        {/* GRID SUPERIOR: DADOS E OPERAÇÃO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* DADOS GERAIS */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><MapPin size={20} /> Dados Gerais</CardTitle>
                    <CardDescription>Informações básicas do estabelecimento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-slate-700">Nome da Loja</label>
                        <Input value={loja.nome_loja} onChange={e => setLoja({...loja, nome_loja: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Endereço Completo</label>
                        <Input value={loja.endereco} onChange={e => setLoja({...loja, endereco: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
                        <Input value={loja.telefone} onChange={e => setLoja({...loja, telefone: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-slate-700">Cor do Tema (Sistema)</label>
                        <div className="flex gap-2 mt-1">
                            <div className="w-10 h-10 rounded border shadow-sm cursor-pointer overflow-hidden relative" style={{ backgroundColor: loja.cor_tema }}>
                                <input type="color" className="opacity-0 w-full h-full cursor-pointer absolute top-0 left-0" value={loja.cor_tema} onChange={e => setLoja({...loja, cor_tema: e.target.value})} />
                            </div>
                            <Input value={loja.cor_tema} onChange={e => setLoja({...loja, cor_tema: e.target.value})} className="uppercase flex-1"/>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* OPERAÇÃO E IMPRESSÃO */}
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Clock size={20} /> Operação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-700">Taxa Entrega (Base)</label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <Input type="number" className="pl-10" value={loja.taxa_entrega_padrao} onChange={e => setLoja({...loja, taxa_entrega_padrao: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-700">Tempo Médio (min)</label>
                                <div className="relative mt-1">
                                    <Clock className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                    <Input type="number" className="pl-10" value={loja.tempo_espera_minutos} onChange={e => setLoja({...loja, tempo_espera_minutos: e.target.value})} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* --- CONFIGURAÇÃO DE IMPRESSORA (NOVO) --- */}
                <Card className="border-slate-300 shadow-md">
                    <CardHeader className="bg-slate-50 border-b pb-3">
                        <CardTitle className="flex items-center gap-2 text-slate-800"><Printer size={20} /> Impressão do Pedido</CardTitle>
                        <CardDescription>Como o cupom sai na impressora térmica.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Largura do Papel</label>
                            <Select value={loja.largura_impressao} onValueChange={(val) => setLoja({...loja, largura_impressao: val})}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="80mm">80mm (Padrão Térmica)</SelectItem>
                                    <SelectItem value="58mm">58mm (Mini Impressora)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Mensagem de Rodapé</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                                {/* Se não tiver componente Textarea, use <textarea className="..." /> */}
                                <textarea 
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Ex: Obrigado pela preferência! Volte sempre."
                                    value={loja.mensagem_rodape}
                                    onChange={e => setLoja({...loja, mensagem_rodape: e.target.value})}
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Aparece no final do comprovante.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* HORÁRIOS DE FUNCIONAMENTO */}
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar size={20} /> Horários de Funcionamento</CardTitle>
                <CardDescription>Defina os turnos de abertura para cada dia da semana.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                    {loja.horarios && loja.horarios.map((diaInfo, indexDia) => (
                        <div key={diaInfo.dia} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-start gap-4">
                            
                            <div className="md:w-40 pt-1">
                                <span className="font-bold text-slate-700 block">{diaInfo.dia}</span>
                                <Button type="button" variant="outline" size="sm" onClick={() => adicionarTurno(indexDia)} className="text-xs h-7 border-slate-300 mt-2">
                                    <Plus size={14} className="mr-1"/> Add Turno
                                </Button>
                            </div>

                            <div className="flex-1 space-y-2">
                                {diaInfo.turnos.length === 0 && (
                                    <div className="text-xs text-slate-400 italic bg-slate-100 p-2 rounded inline-block px-4">Loja Fechada</div>
                                )}
                                
                                {diaInfo.turnos.map((turno, indexTurno) => (
                                    <div key={indexTurno} className="flex flex-wrap items-center gap-2 bg-white border p-2 rounded-lg shadow-sm">
                                        <div className="w-32">
                                            <Input 
                                                placeholder="Nome (ex: Jantar)" 
                                                className="h-8 text-xs font-medium"
                                                value={turno.nome}
                                                onChange={(e) => atualizarTurno(indexDia, indexTurno, 'nome', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Input 
                                                type="time" 
                                                className="h-8 w-24 text-xs"
                                                value={turno.abertura}
                                                onChange={(e) => atualizarTurno(indexDia, indexTurno, 'abertura', e.target.value)}
                                            />
                                            <span className="text-slate-400">-</span>
                                            <Input 
                                                type="time" 
                                                className="h-8 w-24 text-xs"
                                                value={turno.fechamento}
                                                onChange={(e) => atualizarTurno(indexDia, indexTurno, 'fechamento', e.target.value)}
                                            />
                                        </div>
                                        <Button 
                                            type="button" variant="ghost" size="icon" 
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 ml-auto"
                                            onClick={() => removerTurno(indexDia, indexTurno)}
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* BOTÃO FLUTUANTE PARA SALVAR */}
        <div className="fixed bottom-6 right-6 z-50">
            <Button 
                type="submit" 
                className="h-14 px-8 text-lg font-bold text-white shadow-2xl transition-all rounded-full flex items-center gap-2 hover:scale-105"
                style={{ backgroundColor: loja.cor_tema }}
                disabled={salvando}
            >
                {salvando ? <Loader2 className="animate-spin" /> : <><Save size={24} /> Salvar Alterações</>}
            </Button>
        </div>

      </form>
    </div>
  );
}