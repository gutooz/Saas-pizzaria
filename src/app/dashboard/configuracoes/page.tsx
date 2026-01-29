"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Save, Store, Globe, Edit2, Upload, Trash2, Loader2, 
  Printer, Copy, ExternalLink, Settings, Truck, Wallet, Palette, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const PAGAMENTOS_DISPONIVEIS = [
  "Pix", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Vale Refeição"
];

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [loja, setLoja] = useState({
    id: 0, 
    nome_loja: "", 
    endereco: "", 
    telefone: "", 
    cor_tema: "#e11d48",
    taxa_entrega_padrao: "5.00", 
    tempo_espera_minutos: "40",
    raio_entrega_km: "7", 
    preco_km_extra: "1.50",
    km_limite_fixo: "3", // NOVO CAMPO: Limite de carência para taxa fixa
    formas_pagamento: [] as string[],
    largura_impressao: "80mm", 
    mensagem_rodape: "Obrigado!",
    slug: "", 
    url_logo: ""
  });

  const gerarSlug = (texto: string) => {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim();
  };

  const formatarTelefone = (valor: string) => {
    const limpo = valor.replace(/\D/g, ""); 
    if (limpo.length <= 11) {
      if (limpo.length <= 10) {
        return limpo.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
      }
      return limpo.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return valor;
  };

  const fetchConfig = useCallback(async () => {
    const pizzariaId = localStorage.getItem("pizzaria_id");
    if (!pizzariaId) return setLoading(false);

    const { data } = await supabase
      .from("loja_config")
      .select("*")
      .eq("pizzaria_id", pizzariaId)
      .single();

    if (data) {
      setLoja({
        ...data,
        url_logo: data.url_logo || "",
        telefone: formatarTelefone(data.telefone || ""),
        taxa_entrega_padrao: String(data.taxa_entrega_padrao || "0.00"),
        tempo_espera_minutos: String(data.tempo_espera_minutos || "40"),
        raio_entrega_km: String(data.raio_entrega_km || "7"),
        preco_km_extra: String(data.preco_km_extra || "1.50"),
        km_limite_fixo: String(data.km_limite_fixo || "3"), // Carrega valor do banco
        formas_pagamento: data.formas_pagamento || []
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleNomeChange = (novoNome: string) => {
    setLoja(prev => ({
      ...prev,
      nome_loja: novoNome,
      slug: gerarSlug(novoNome)
    }));
  };

  const togglePagamento = (forma: string) => {
    const atual = loja.formas_pagamento;
    const novo = atual.includes(forma) 
      ? atual.filter((f: string) => f !== forma)
      : [...atual, forma];
    setLoja({ ...loja, formas_pagamento: novo });
  };

  const handleCopiarLink = () => {
    const urlCompleta = `${window.location.origin}/cardapio-digital/${loja.slug}`;
    navigator.clipboard.writeText(urlCompleta);
    alert("Link copiado!");
  };

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${loja.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('pizzarias').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('pizzarias').getPublicUrl(filePath);
      setLoja(prev => ({ ...prev, url_logo: publicUrl }));
    } catch (error: any) {
      alert("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSalvarLoja(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from("loja_config").update({
      nome_loja: loja.nome_loja,
      slug: loja.slug,
      endereco: loja.endereco, 
      telefone: loja.telefone.replace(/\D/g, ""), 
      cor_tema: loja.cor_tema, 
      url_logo: loja.url_logo,
      largura_impressao: loja.largura_impressao,
      mensagem_rodape: loja.mensagem_rodape,
      taxa_entrega_padrao: Number(loja.taxa_entrega_padrao),
      tempo_espera_minutos: Number(loja.tempo_espera_minutos),
      raio_entrega_km: Number(loja.raio_entrega_km),
      preco_km_extra: Number(loja.preco_km_extra),
      km_limite_fixo: Number(loja.km_limite_fixo), // Salva o novo campo
      formas_pagamento: loja.formas_pagamento
    }).eq("id", loja.id);

    if (!error) alert("Configurações salvas com sucesso!");
    else alert("Erro ao salvar: " + error.message);
    setSalvando(false);
  }

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 font-medium"><Loader2 className="animate-spin mr-2"/> Sincronizando dados...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 pb-32">
      <header>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="text-red-600"/> {loja.nome_loja || "Configurações da Pizzaria"}
          </h1>
          <p className="text-slate-500">Gerencie a identidade visual e as regras de {loja.nome_loja || "sua unidade"}.</p>
      </header>

      <form onSubmit={handleSalvarLoja} className="space-y-8">
        <Card className="border-red-100 shadow-md">
            <CardHeader className="bg-red-50/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="text-red-600" size={20}/> Link e Identidade
                </CardTitle>
                <CardDescription>Gerencie o acesso público de {loja.nome_loja}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
                <div className="flex flex-col md:flex-row gap-12 items-start">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Logo da Pizzaria</label>
                        <div className="w-32">
                          <div className="h-32 w-32 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group transition-all hover:border-red-300">
                              {loja.url_logo ? (
                                  <img src={loja.url_logo} className="w-full h-full object-contain p-2" alt="Logo" />
                              ) : (
                                  <label className="cursor-pointer flex flex-col items-center text-slate-400 hover:text-red-600">
                                      <Upload size={20} />
                                      <span className="text-[9px] font-bold mt-1 uppercase">Enviar</span>
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                                  </label>
                              )}
                              {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-red-600"/></div>}
                          </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-md">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Link do Cardápio de {loja.nome_loja}</label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg group hover:border-red-200 transition-colors">
                            <Globe size={16} className="text-slate-400" />
                            <span className="flex-1 text-sm font-medium text-slate-600 truncate">
                              {typeof window !== 'undefined' ? window.location.host : 'localhost:3000'}/cardapio-digital/<span className="text-red-600 font-bold">{loja.slug}</span>
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" onClick={handleCopiarLink} variant="outline" className="flex-1 gap-2 text-xs font-bold uppercase tracking-tight">
                              <Copy size={14} /> COPIAR
                            </Button>
                            <Button 
                              type="button"
                              onClick={() => window.open(`/cardapio-digital/${loja.slug}`, '_blank')}
                              variant="outline"
                              className="flex-1 gap-2 text-xs font-bold uppercase tracking-tight border-red-100 text-red-600 hover:bg-red-50"
                            >
                              <ExternalLink size={14} /> ABRIR
                            </Button>
                          </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-md">
                <CardHeader className="bg-slate-50/50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Store size={18} className="text-slate-600"/> Dados da Unidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Nome da Pizzaria</Label>
                      <Input value={loja.nome_loja} onChange={e => handleNomeChange(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp para Pedidos</Label>
                      <Input value={loja.telefone} onChange={e => setLoja({...loja, telefone: formatarTelefone(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Endereço da Sede (Cálculo GPS)</Label>
                      <Input placeholder="Ex: Rua Tal, 123, Osasco - SP" value={loja.endereco} onChange={e => setLoja({...loja, endereco: e.target.value})} />
                      <p className="text-[9px] text-orange-600 font-bold flex items-center gap-1 mt-1"><MapPin size={10}/> Ponto de partida para o cálculo de rota.</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Cor do Tema</Label>
                      <div className="flex gap-2">
                        <Input type="color" className="w-12 h-10 p-1 cursor-pointer" value={loja.cor_tema} onChange={e => setLoja({...loja, cor_tema: e.target.value})} />
                        <Input value={loja.cor_tema} onChange={e => setLoja({...loja, cor_tema: e.target.value})} />
                      </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-md">
                <CardHeader className="bg-slate-50/50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck size={18} className="text-slate-600"/> Logística de Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Taxa Base (R$)</Label>
                          <Input type="number" step="0.01" value={loja.taxa_entrega_padrao} onChange={e => setLoja({...loja, taxa_entrega_padrao: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Espera (min)</Label>
                          <Input type="number" value={loja.tempo_espera_minutos} onChange={e => setLoja({...loja, tempo_espera_minutos: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Raio Máximo (KM)</Label>
                          <Input type="number" value={loja.raio_entrega_km} onChange={e => setLoja({...loja, raio_entrega_km: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-slate-400 uppercase">Adicional KM (R$)</Label>
                          <Input type="number" step="0.10" value={loja.preco_km_extra} onChange={e => setLoja({...loja, preco_km_extra: e.target.value})} />
                        </div>
                    </div>
                    
                    {/* NOVO CAMPO: LIMITE DE CARÊNCIA KM */}
                    <div className="space-y-1 pt-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Cobrar adicional após (KM)</Label>
                      <Input type="number" value={loja.km_limite_fixo} onChange={e => setLoja({...loja, km_limite_fixo: e.target.value})} />
                    </div>

                    <p className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded border italic">
                      O sistema cobrará o Adicional KM automaticamente após os primeiros {loja.km_limite_fixo}km de distância real.
                    </p>
                </CardContent>
            </Card>
        </div>

        <Card className="shadow-md">
            <CardHeader className="bg-slate-50/50">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet size={18} className="text-slate-600"/> Formas de Pagamento
              </CardTitle>
              <CardDescription>Selecione quais métodos os clientes verão no cardápio digital.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {PAGAMENTOS_DISPONIVEIS.map(forma => (
                    <div key={forma} className="flex items-center space-x-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => togglePagamento(forma)}>
                      <Checkbox 
                        id={forma} 
                        checked={loja.formas_pagamento.includes(forma)}
                        onCheckedChange={() => togglePagamento(forma)}
                      />
                      <label htmlFor={forma} className="text-sm font-bold text-slate-700 cursor-pointer">{forma}</label>
                    </div>
                  ))}
                </div>
            </CardContent>
        </Card>

        <div className="fixed bottom-8 right-8 z-[100]">
            <Button 
              type="submit" 
              className="h-16 px-10 text-base font-black text-white shadow-2xl rounded-full transition-transform hover:scale-105 active:scale-95 flex items-center gap-2" 
              style={{ backgroundColor: loja.cor_tema }} 
              disabled={salvando}
            >
                {salvando ? <Loader2 className="animate-spin" size={20} /> : <Save size={20}/>} 
                <span className="uppercase">{salvando ? "SALVANDO..." : `SALVAR ${loja.nome_loja}`}</span>
            </Button>
        </div>
      </form>
    </div>
  );
}