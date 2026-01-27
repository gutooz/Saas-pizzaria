"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Save, Store, MapPin, Phone, DollarSign, Clock, Loader2, 
  Trash2, Printer, ShieldCheck, 
  LayoutDashboard, UtensilsCrossed, Users, Package, Bike, BarChart3, Settings,
  Globe, Edit2, Upload, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const MODULOS_ACESSO = [
  { id: "dashboard", label: "Dashboard / Cozinha", icon: <LayoutDashboard size={14}/> },
  { id: "caixa", label: "Caixa", icon: <DollarSign size={14}/> },
  { id: "cardapio", label: "Cardápio", icon: <UtensilsCrossed size={14}/> },
  { id: "clientes", label: "Clientes", icon: <Users size={14}/> },
  { id: "estoque", label: "Estoque", icon: <Package size={14}/> },
  { id: "motoboys", label: "Motoboys", icon: <Bike size={14}/> },
  { id: "relatorios", label: "Relatórios", icon: <BarChart3 size={14}/> },
  { id: "configuracoes", label: "Configurações", icon: <Settings size={14}/> },
];

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [equipe, setEquipe] = useState<any[]>([]);
  
  const [loja, setLoja] = useState({
    id: 0, nome_loja: "", endereco: "", telefone: "", cor_tema: "#e11d48",
    taxa_entrega_padrao: "5.00", tempo_espera_minutos: "40",
    largura_impressao: "80mm", mensagem_rodape: "Obrigado!",
    slug: "", url_logo: ""
  });

  const [novoMembro, setNovoMembro] = useState({
    nome: "", email: "", senha: "", perfil: "atendente", permissoes: [] as string[]
  });

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase.from("loja_config").select("*").limit(1).single();
    if (data) {
      setLoja({
        ...data,
        url_logo: data.url_logo || ""
      });
    }
    setLoading(false);
  }, []);

  const fetchEquipe = useCallback(async () => {
    const pizzariaId = localStorage.getItem("pizzaria_id");
    if (!pizzariaId) return;
    const { data } = await supabase.from("usuarios").select("*").eq("pizzaria_id", pizzariaId);
    if (data) setEquipe(data);
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchEquipe();
  }, [fetchConfig, fetchEquipe]);

  async function handleUpload(file: File) {
    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `lojas/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('pizzarias').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('pizzarias').getPublicUrl(filePath);
      
      await supabase.from("loja_config").update({ url_logo: publicUrl }).eq("id", loja.id);

      setLoja(prev => ({ ...prev, url_logo: publicUrl }));
      alert("Logo carregada!");
    } catch (error: any) {
      alert("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleRemoveLogo() {
    if (!confirm("Deseja remover o logo?")) return;
    try {
      setUploading(true);
      await supabase.from("loja_config").update({ url_logo: "" }).eq("id", loja.id);
      setLoja(prev => ({ ...prev, url_logo: "" }));
    } catch (error: any) {
      alert("Erro ao remover: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSalvarLoja(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const { error } = await supabase.from("loja_config").update({
      nome_loja: loja.nome_loja,
      endereco: loja.endereco, 
      telefone: loja.telefone,
      cor_tema: loja.cor_tema, 
      slug: loja.slug.toLowerCase().trim(),
      url_logo: loja.url_logo,
      largura_impressao: loja.largura_impressao,
      mensagem_rodape: loja.mensagem_rodape,
      taxa_entrega_padrao: Number(loja.taxa_entrega_padrao),
      tempo_espera_minutos: Number(loja.tempo_espera_minutos)
    }).eq("id", loja.id);

    if (!error) alert("Configurações salvas!");
    else alert("Erro ao salvar: " + error.message);
    setSalvando(false);
  }

  async function cadastrarMembro() {
    const pizzariaId = localStorage.getItem("pizzaria_id");
    if (equipe.length >= 3) return alert("Limite de 3 usuários atingido.");
    const { error } = await supabase.from("usuarios").insert([{
      nome: novoMembro.nome, email: novoMembro.email, senha_hash: novoMembro.senha,
      pizzaria_id: pizzariaId, perfil: novoMembro.perfil, permissoes: novoMembro.permissoes
    }]);
    if (!error) { 
        alert("Membro cadastrado!"); 
        setNovoMembro({ nome: "", email: "", senha: "", perfil: "atendente", permissoes: [] });
        fetchEquipe(); 
    }
  }

  const togglePermissao = (id: string) => {
    setNovoMembro(prev => ({
      ...prev,
      permissoes: prev.permissoes.includes(id) ? prev.permissoes.filter(p => p !== id) : [...prev.permissoes, id]
    }));
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-500 font-medium"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 pb-32">
      <header>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2"><Store /> Configurações</h1>
          <p className="text-slate-500">Gerencie a identidade e acessos da sua pizzaria.</p>
      </header>

      <form onSubmit={handleSalvarLoja} className="space-y-8">
        <Card className="border-red-100 shadow-md">
            <CardHeader className="bg-red-50/50">
                <CardTitle className="text-lg flex items-center gap-2"><Globe className="text-red-600" size={20}/> Identidade Visual</CardTitle>
                <CardDescription>Logo e link do seu cardápio digital.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <div className="flex flex-col md:flex-row gap-12 items-start">
                    <div className="space-y-3">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Logo Marca</label>
                        <div className="w-32">
                          <div className="h-32 w-32 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                              {loja.url_logo ? (
                                  <img src={loja.url_logo} className="w-full h-full object-contain p-2" alt="Logo" />
                              ) : (
                                  <label className="cursor-pointer flex flex-col items-center text-slate-400 hover:text-red-600 transition-colors">
                                      <Upload size={20} />
                                      <span className="text-[9px] font-bold mt-1 uppercase">Enviar</span>
                                      <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                                  </label>
                              )}
                              {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-red-600"/></div>}
                          </div>
                          {loja.url_logo && !uploading && (
                            <div className="flex gap-1 mt-2">
                                <label className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 h-8 rounded-md flex items-center justify-center cursor-pointer transition-colors">
                                    <Edit2 size={14} />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} />
                                </label>
                                <button type="button" onClick={handleRemoveLogo} className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 h-8 rounded-md flex items-center justify-center transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                          )}
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-xs">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Link (URL) do Cardápio</label>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-sm">/</span>
                          <Input 
                            value={loja.slug} 
                            onChange={e => setLoja({...loja, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} 
                            placeholder="ex: pizzaria-do-guto"
                            className="h-10 font-medium"
                          />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Store size={18}/> Contato</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Input placeholder="Nome da Loja" value={loja.nome_loja} onChange={e => setLoja({...loja, nome_loja: e.target.value})} />
                    <Input placeholder="Telefone" value={loja.telefone} onChange={e => setLoja({...loja, telefone: e.target.value})} />
                    <Input placeholder="Endereço" value={loja.endereco} onChange={e => setLoja({...loja, endereco: e.target.value})} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Printer size={18}/> Sistema</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <Select value={loja.largura_impressao} onValueChange={(v) => setLoja({...loja, largura_impressao: v})}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="80mm">80mm</SelectItem>
                          <SelectItem value="58mm">58mm</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                       <Input type="number" placeholder="Taxa R$" value={loja.taxa_entrega_padrao} onChange={e => setLoja({...loja, taxa_entrega_padrao: e.target.value})} />
                       <Input type="number" placeholder="Espera min" value={loja.tempo_espera_minutos} onChange={e => setLoja({...loja, tempo_espera_minutos: e.target.value})} />
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="fixed bottom-8 right-8 z-[100]">
            <Button type="submit" className="h-16 px-10 text-base font-black text-white shadow-2xl rounded-full" style={{ backgroundColor: loja.cor_tema }} disabled={salvando || uploading}>
                {salvando ? <Loader2 className="animate-spin" /> : <Save />} {salvando ? "SALVANDO..." : "SALVAR TUDO"}
            </Button>
        </div>
      </form>
    </div>
  );
}