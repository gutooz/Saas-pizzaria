"use client";

import { useState, useEffect, useCallback, useRef } from "react"; // Adicionado useRef
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, Zap, Save, Loader2, Power, PowerOff, Sparkles, CheckCircle2, LogOut } from "lucide-react"; // LogOut adicionado

export default function AgenteIAPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [pizzariaId, setPizzariaId] = useState<string | null>(null);
  
  // Estados do Agente
  const [iaAtiva, setIaAtiva] = useState(false);
  const [nomeAgente, setNomeAgente] = useState("Assistente Virtual");
  const [promptAgente, setPromptAgente] = useState("");

  // Estados da Evolution API (Conexão WhatsApp)
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [gerandoQr, setGerandoQr] = useState(false);
  const [statusConexao, setStatusConexao] = useState("Desconectado");
  const [desconectando, setDesconectando] = useState(false); // Novo estado para o botão de desconectar
  
  // Ref para controlar o intervalo de checagem de status
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Pega o ID da pizzaria
  useEffect(() => {
    const idSalvo = localStorage.getItem("pizzaria_id");
    if (!idSalvo) {
      router.push("/"); 
    } else {
      setPizzariaId(idSalvo);
    }
  }, [router]);

  // Função para verificar status da conexão (Polling)
  const checarStatusConexao = useCallback(async () => {
    if (!pizzariaId) return;

    try {
      const res = await fetch(`/api/evolution/conectar?pizzariaId=${pizzariaId}`);
      const data = await res.json();

      if (data.status === "open") {
        setStatusConexao("Conectado");
        setQrCodeBase64(null);
        // Se conectou, para de perguntar
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else if (data.status === "connecting" || data.status === "qrcode") {
        setStatusConexao("Aguardando Leitura");
      } else {
        setStatusConexao("Desconectado");
      }
    } catch (error) {
      console.error("Erro ao checar status:", error);
    }
  }, [pizzariaId]);

  // Inicia ou para o polling dependendo do status
  useEffect(() => {
    if (statusConexao === "Aguardando Leitura") {
      intervalRef.current = setInterval(checarStatusConexao, 5000); // Checa a cada 5 segundos
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [statusConexao, checarStatusConexao]);

  // 2. Carrega as configs
  const carregarConfiguracoesIA = useCallback(async () => {
    if (!pizzariaId) return;

    try {
      const { data, error } = await supabase
        .from("loja_config")
        .select("ia_ativa, ia_nome, ia_prompt")
        .eq("id", pizzariaId)
        .single();

      if (error) throw error;

      if (data) {
        setIaAtiva(data.ia_ativa || false);
        setNomeAgente(data.ia_nome || "Assistente Virtual");
        setPromptAgente(data.ia_prompt || "Você é o atendente virtual da nossa Pizzaria. Seja educado, use emojis e responda de forma curta e direta. Seu objetivo principal é enviar o link do cardápio digital para o cliente fazer o pedido.");
      }
      
      // Aproveita e checa se já está conectado na Evolution ao carregar a página
      checarStatusConexao();

    } catch (error) {
      console.error("Erro ao carregar IA:", error);
    } finally {
      setLoading(false);
    }
  }, [pizzariaId, checarStatusConexao]);

  useEffect(() => {
    carregarConfiguracoesIA();
  }, [carregarConfiguracoesIA]);

  // 3. Salva as configurações
  const salvarConfiguracoes = async () => {
    if (!pizzariaId) return;
    setSalvando(true);

    try {
      const { error } = await supabase
        .from("loja_config")
        .update({
          ia_ativa: iaAtiva,
          ia_nome: nomeAgente,
          ia_prompt: promptAgente
        })
        .eq("id", pizzariaId); 

      if (error) throw error;
      alert("Configurações da IA salvas com sucesso!");
    } catch (error: any) {
      alert("Erro ao salvar: " + error.message);
    } finally {
      setSalvando(false);
    }
  };

  const toggleIA = () => setIaAtiva(!iaAtiva);

  // 4. Conecta com a Evolution API e pede o QR Code
  const conectarWhatsApp = async () => {
    if (!pizzariaId) return;
    setGerandoQr(true);
    setStatusConexao("Gerando QR Code...");

    try {
      const res = await fetch("/api/evolution/conectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pizzariaId }),
      });
      const data = await res.json();

      if (data.qrCode) {
        setQrCodeBase64(data.qrCode);
        setStatusConexao("Aguardando Leitura");
      } else if (data.status === "open") {
        setStatusConexao("Conectado");
        setQrCodeBase64(null);
      } else if (data.error) {
         setStatusConexao("Erro");
         alert(data.error);
      }
    } catch (error) {
      alert("Erro ao conectar com o servidor do WhatsApp. Verifique se a Evolution API está rodando.");
      setStatusConexao("Erro na conexão");
    } finally {
      setGerandoQr(false);
    }
  };

  // 5. Desconecta o WhatsApp da Evolution API
  const desconectarWhatsApp = async () => {
    if (!pizzariaId) return;
    
    if (!confirm("Tem certeza que deseja desconectar o WhatsApp? Seu robô deixará de responder.")) return;

    setDesconectando(true);
    try {
      // Supondo que você crie/tenha uma rota na sua API para lidar com o Logout (ex: DELETE /api/evolution/desconectar)
      await fetch(`/api/evolution/desconectar?pizzariaId=${pizzariaId}`, {
        method: "DELETE",
      });
      
      // Atualiza o status visualmente logo após tentar desconectar
      setStatusConexao("Desconectado");
      setQrCodeBase64(null);
    } catch (error) {
      alert("Erro ao tentar desconectar o WhatsApp.");
      console.error(error);
    } finally {
      setDesconectando(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40}/></div>;

  return (
    <div className="p-8 max-w-[1200px] mx-auto min-h-screen bg-slate-50/50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Bot className="text-blue-600" size={32} />
            Agente de IA
            {iaAtiva ? (
               <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200 shadow-none gap-1">
                 <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online
               </Badge>
            ) : (
               <Badge variant="outline" className="text-slate-500 bg-white gap-1">
                 <span className="w-2 h-2 rounded-full bg-slate-400"></span> Offline
               </Badge>
            )}
          </h1>
          <p className="text-slate-500 mt-1">Configure o cérebro do seu atendimento automático no WhatsApp.</p>
        </div>
        <Button onClick={toggleIA} variant={iaAtiva ? "destructive" : "outline"} className={`gap-2 font-bold ${!iaAtiva && "bg-white text-green-600 border-green-200 hover:bg-green-50"}`}>
          {iaAtiva ? <><PowerOff size={18}/> Desativar Robô</> : <><Power size={18}/> Ligar Robô</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-white border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <Sparkles className="text-yellow-500" size={20}/> Personalidade do Agente
              </CardTitle>
              <CardDescription>Como a IA deve se comportar ao falar com seus clientes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6 bg-white">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nome do Assistente</label>
                <Input value={nomeAgente} onChange={(e) => setNomeAgente(e.target.value)} placeholder="Ex: LetiBot..." className="bg-slate-50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 flex justify-between">
                  <span>Prompt de Comando (O Cérebro)</span>
                  <span className="text-xs font-normal text-slate-400">Instruções para a IA</span>
                </label>
                <textarea value={promptAgente} onChange={(e) => setPromptAgente(e.target.value)} className="w-full min-h-[250px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-y text-sm leading-relaxed" placeholder="Descreva como a IA deve agir..." />
                <p className="text-xs text-slate-500">Dica: Diga à IA as formas de pagamento, o link do cardápio digital e o tom de voz.</p>
              </div>
              <Button onClick={salvarConfiguracoes} disabled={salvando} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 mt-4">
                {salvando ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18}/> Salvar Configurações</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-white border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800"><Zap className="text-blue-500" size={20}/> Integração</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 bg-white">
              
              {/* WhatsApp Evolution Box */}
              <div className={`flex flex-col p-4 border rounded-xl space-y-4 transition-all ${statusConexao === "Conectado" ? "bg-green-50 border-green-100" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${statusConexao === "Conectado" ? "bg-green-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                      {statusConexao === "Conectado" ? <CheckCircle2 size={20}/> : <MessageSquare size={20}/>}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">WhatsApp Oficial</div>
                      <div className="text-xs text-slate-500">
                        {statusConexao === "Conectado" ? "Instância Ativa" : "Requer pareamento"}
                      </div>
                    </div>
                  </div>
                  <Badge className={statusConexao === "Conectado" ? "bg-green-600 hover:bg-green-700" : "bg-white text-slate-600 border-slate-200"}>
                    {statusConexao}
                  </Badge>
                </div>

                {/* Área do QR Code Dinâmica */}
                {statusConexao !== "Conectado" && (
                    <div className="flex flex-col items-center justify-center pt-2 border-t border-slate-200 border-dashed">
                        {qrCodeBase64 ? (
                            <div className="space-y-3 flex flex-col items-center animate-in zoom-in-95 duration-300">
                                <div className="relative p-2 bg-white rounded-lg shadow-md">
                                  <img src={qrCodeBase64} alt="QR Code WhatsApp" className="w-48 h-48" />
                                </div>
                                <p className="text-xs text-slate-500 text-center font-medium px-4">Escaneie para conectar automaticamente.</p>
                                <Button onClick={conectarWhatsApp} variant="ghost" size="sm" className="text-blue-600 h-8">Atualizar QR Code</Button>
                            </div>
                        ) : (
                            <Button onClick={conectarWhatsApp} disabled={gerandoQr} variant="outline" className="w-full bg-white font-bold text-slate-700 mt-2 shadow-sm">
                                {gerandoQr ? <><Loader2 className="animate-spin mr-2" size={16}/> Gerando...</> : "Gerar QR Code"}
                            </Button>
                        )}
                    </div>
                )}

                {/* Botão de Desconectar (Aparece apenas quando conectado) */}
                {statusConexao === "Conectado" && (
                  <div className="pt-2 border-t border-green-200/50">
                    <Button 
                      onClick={desconectarWhatsApp} 
                      disabled={desconectando} 
                      variant="outline" 
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold"
                    >
                      {desconectando ? (
                        <><Loader2 className="animate-spin mr-2" size={16}/> Desconectando...</>
                      ) : (
                        <><LogOut className="mr-2" size={16}/> Desconectar WhatsApp</>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600"><Bot size={20}/></div>
                  <div><div className="font-bold text-sm text-slate-800">Modelo IA</div><div className="text-xs text-slate-500">Gemini Pro</div></div>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">Ativo</Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm border-slate-200 bg-blue-50/50 border-blue-100">
            <CardContent className="pt-6 text-sm text-blue-800">
              <p className="font-bold mb-3 flex items-center gap-2"><MessageSquare size={16}/> Exemplo de Atendimento:</p>
              <div className="space-y-3">
                <div className="bg-white p-3 rounded-xl rounded-tr-none shadow-sm ml-6 border border-slate-200 text-slate-700">Olá! Queria pedir uma pizza.</div>
                <div className="bg-blue-600 text-white p-3 rounded-xl rounded-tl-none shadow-sm mr-6">Olá! Sou o(a) {nomeAgente} 🍕 Para agilizar seu pedido, acesse nosso cardápio: seucardapio.com/...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}