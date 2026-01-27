"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search, ShoppingCart, Trash2, CheckCircle, ChevronsUpDown, Check, 
  Pizza, Coffee, CircleDashed, Bike, PlusCircle, Loader2, 
  Wallet, Lock, ArrowUpCircle, ArrowDownCircle, DollarSign, History
} from "lucide-react";
import { cn } from "@/lib/utils";

import PizzaBuilder from "@/components/PizzaBuilder"; 

// CONSTANTES FIXAS
const DISTANCIA_MINIMA = 5; 
const PRECO_KM_EXTRA = 1.00; 

export default function CaixaPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loadingSistema, setLoadingSistema] = useState(true);
  
  // --- ESTADOS DO CAIXA (Sessão) ---
  const [sessao, setSessao] = useState<any>(null);
  const [valorAbertura, setValorAbertura] = useState("");
  const [modalCaixaOpen, setModalCaixaOpen] = useState(false);
  
  // Estados de Movimentação do Caixa
  const [tipoMovimento, setTipoMovimento] = useState<"sangria" | "suprimento">("sangria");
  const [valorMovimento, setValorMovimento] = useState("");
  const [descMovimento, setDescMovimento] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);

  // --- ESTADOS DO PDV (Vendas) ---
  const [cardapio, setCardapio] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [taxaBase, setTaxaBase] = useState(5.00); 
  const [lojaConfig, setLojaConfig] = useState<any>({}); 
  const [buscaProduto, setBuscaProduto] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [openCliente, setOpenCliente] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [processando, setProcessando] = useState(false);
  const [kmEntrega, setKmEntrega] = useState(0); 
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [modalPizzaAberto, setModalPizzaAberto] = useState(false);
  const [tipoMontagem, setTipoMontagem] = useState<'Grande' | 'Broto'>('Grande');

  useEffect(() => { setIsMounted(true); }, []);

 // 1. CARREGAR DADOS GERAIS E VERIFICAR SESSÃO
useEffect(() => {
  async function carregarDadosIniciais() {
    setLoadingSistema(true);
    
    // Garantir que o ID seja tratado como número se o seu banco for integer
    const storageId = localStorage.getItem("pizzaria_id");
    const pizzariaId = storageId ? Number(storageId) : null;
    const usuarioId = localStorage.getItem("usuario_id");

    if (!pizzariaId || !usuarioId) {
      console.error("IDs não encontrados no localStorage");
      setLoadingSistema(false);
      return;
    }

    try {
      // A. Verifica se tem CAIXA ABERTO
      const { data: sessaoAberta } = await supabase
        .from("caixa_sessoes")
        .select("*")
        .eq("pizzaria_id", pizzariaId)
        .eq("usuario_id", usuarioId)
        .eq("status", "aberto")
        .maybeSingle();

      setSessao(sessaoAberta);
      if (sessaoAberta) carregarMovimentacoes(sessaoAberta.id);

      // B. Carrega Produtos (O filtro deve ser o ID da pizzaria)
      const { data: itensCardapio, error: errProd } = await supabase
        .from("cardapio")
        .select("*")
        .eq("pizzaria_id", pizzariaId) // Certifique-se que na tabela cardapio a coluna chama pizzaria_id
        .eq("ativo", true)
        .order("nome");

      if (errProd) console.error("Erro Cardápio:", errProd);
      setCardapio(itensCardapio || []);

      // C. Carrega Clientes
      const { data: cli } = await supabase
        .from("customers")
        .select("*")
        .eq("pizzaria_id", pizzariaId);
      setClientes(cli || []);

      // D. Carrega Configurações da Loja 
      // IMPORTANTE: Aqui usamos .eq("id", pizzariaId) porque pizzariaId É o ID da config
      const { data: config } = await supabase
        .from("loja_config")
        .select("*")
        .eq("id", pizzariaId) 
        .single();

      if (config) {
        setTaxaBase(Number(config.taxa_entrega_padrao));
        setLojaConfig(config);
      }

    } catch (err) {
      console.error("Erro geral no carregamento:", err);
    } finally {
      setLoadingSistema(false);
    }
  }
  
  carregarDadosIniciais();
}, []);

  async function carregarMovimentacoes(sessaoId: number) {
      const { data } = await supabase
        .from("caixa_movimentacoes")
        .select("*")
        .eq("sessao_id", sessaoId)
        .order("criado_em", { ascending: false });
      setMovimentacoes(data || []);
  }

  // --- FUNÇÕES DE CAIXA (ABRIR, FECHAR, SANGRIA) ---

  async function abrirCaixa() {
    const pizzariaId = localStorage.getItem("pizzaria_id");
    const usuarioId = localStorage.getItem("usuario_id");
    
    if (!valorAbertura) return alert("Digite o valor inicial!");

    const { data, error } = await supabase.from("caixa_sessoes").insert({
        pizzaria_id: pizzariaId,
        usuario_id: usuarioId,
        saldo_inicial: parseFloat(valorAbertura),
        status: "aberto"
    }).select().single();

    if (error) {
        alert("Erro ao abrir caixa: " + error.message);
    } else {
        setSessao(data);
    }
  }

  async function fecharCaixa() {
    if (!valorFechamento) return alert("Informe o valor que está na gaveta!");
    
    // Calcula totais (Dinheiro conta para a quebra, outros só registro)
    // Filtramos apenas 'entrada' e 'venda' que sejam em DINHEIRO se tivessemos esse controle no banco
    // Por simplificação, vamos assumir que o usuario confere o total geral ou implementamos filtro depois
    
    const totalEntradas = movimentacoes.filter(m => ['venda', 'suprimento', 'entrada'].includes(m.tipo)).reduce((acc, m) => acc + m.valor, 0);
    const totalSaidas = movimentacoes.filter(m => ['sangria', 'saida'].includes(m.tipo)).reduce((acc, m) => acc + m.valor, 0);
    
    const saldoEsperado = (sessao.saldo_inicial + totalEntradas) - totalSaidas;
    const saldoInformado = parseFloat(valorFechamento);
    const quebra = saldoInformado - saldoEsperado;

    const { error } = await supabase.from("caixa_sessoes").update({
        status: "fechado",
        saldo_final: saldoInformado,
        saldo_esperado: saldoEsperado,
        quebra_de_caixa: quebra,
        fechado_em: new Date().toISOString()
    }).eq("id", sessao.id);

    if (!error) {
        alert(`Caixa Fechado! \nQuebra de Caixa: R$ ${quebra.toFixed(2)}`);
        setSessao(null); // Volta para tela de abertura
        setMovimentacoes([]);
        setModalCaixaOpen(false);
    }
  }

  async function realizarMovimentacao() {
    if (!valorMovimento || !descMovimento) return alert("Preencha tudo!");

    const { error } = await supabase.from("caixa_movimentacoes").insert({
        pizzaria_id: sessao.pizzaria_id,
        sessao_id: sessao.id,
        tipo: tipoMovimento,
        valor: parseFloat(valorMovimento),
        descricao: descMovimento
    });

    if (!error) {
        setValorMovimento("");
        setDescMovimento("");
        carregarMovimentacoes(sessao.id);
        alert("Movimentação registrada!");
    }
  }

  // --- CÁLCULO DE FRETE (Lógica do PDV Antigo) ---
  useEffect(() => {
    if (clienteSelecionado === "balcao" || !clienteSelecionado) {
        setKmEntrega(0);
        setTaxaEntrega(0);
        return;
    }
    const clienteEncontrado = clientes.find(c => c.id.toString() === clienteSelecionado);
    if (clienteEncontrado) {
        const distancia = Number(clienteEncontrado.distance) || 0;
        setKmEntrega(distancia);
        
        let valorFrete = 0;
        if (distancia > 0) {
            if (distancia <= DISTANCIA_MINIMA) {
                valorFrete = taxaBase; 
            } else {
                const excedente = distancia - DISTANCIA_MINIMA;
                valorFrete = taxaBase + (excedente * PRECO_KM_EXTRA); 
            }
        }
        setTaxaEntrega(valorFrete);
    }
  }, [clienteSelecionado, clientes, taxaBase]); 

  // --- FUNÇÕES DO PDV ---
  
  const imprimirCupom = (dadosVenda: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    // Gera linhas da tabela de itens
    const itensHtml = dadosVenda.itens.map((item: any) => `
        <tr>
            <td style="vertical-align: top;">${item.qtd}x</td>
            <td style="vertical-align: top;">
                ${item.nome}
                ${item.size ? `<div style="font-size: 9px; font-style: italic;">${item.size}</div>` : ''}
            </td>
            <td style="text-align: right; vertical-align: top;">
                ${Number(item.precoNumerico * item.qtd).toFixed(2).replace('.', ',')}
            </td>
        </tr>
    `).join('');

    const linhaTelefone = dadosVenda.telefone ? `<div><b>Tel:</b> ${dadosVenda.telefone}</div>` : '';
    const linhaEndereco = dadosVenda.endereco ? `<div style="margin-top: 2px; line-height: 1.2;"><b>End:</b> ${dadosVenda.endereco}</div>` : '';

    const htmlContent = `
        <html>
        <head>
            <title>Cupom</title>
            <style>
                body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; font-size: 12px; color: black; width: 80mm; }
                .container { padding: 5px 0; }
                .center { text-align: center; }
                .bold { font-weight: bold; }
                .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
                .border-top { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; }
                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                .small { font-size: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="center border-bottom">
                    <div class="bold" style="font-size: 14px; text-transform: uppercase;">${lojaConfig.nome_loja || "Pizzaria Letitona"}</div>
                    <div class="small">${lojaConfig.endereco || "Endereço"}</div>
                    <div class="bold" style="margin-top: 5px;">${dadosVenda.cliente === "Cliente Balcão" ? "VENDA BALCÃO" : "DELIVERY"}</div>
                </div>
                <div class="small border-bottom">
                    <div><b>Pedido:</b> #${dadosVenda.id}</div>
                    <div><b>Data:</b> ${dadosVenda.data}</div>
                    <div style="margin-top: 4px; border-top: 1px dotted #ccc; padding-top: 2px;">
                        <div style="font-size: 11px;"><b>Cliente:</b> ${dadosVenda.cliente}</div>
                        ${linhaTelefone}
                        ${linhaEndereco}
                    </div>
                </div>
                <table class="border-bottom">
                    <thead><tr style="text-align: left;"><th style="width: 25px;">Qtd</th><th>Item</th><th style="text-align: right;">R$</th></tr></thead>
                    <tbody>${itensHtml}</tbody>
                </table>
                <div style="margin-bottom: 2px;">
                    <div style="display: flex; justify-content: space-between;"><span>Subtotal:</span><span>R$ ${dadosVenda.subtotal.toFixed(2).replace('.', ',')}</span></div>
                    ${dadosVenda.taxa > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Entrega (${dadosVenda.km}km):</span><span>R$ ${dadosVenda.taxa.toFixed(2).replace('.', ',')}</span></div>` : ''}
                </div>
                <div class="border-top bold" style="font-size: 14px; display: flex; justify-content: space-between;">
                    <span>TOTAL:</span><span>R$ ${dadosVenda.total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="center border-top">
                    <div class="bold">Pgto: ${dadosVenda.pagamento}</div>
                    <div style="margin-top: 8px;">${lojaConfig.mensagem_rodape || "Obrigado pela preferência!"}</div>
                </div>
            </div>
        </body>
        </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => { document.body.removeChild(iframe); }, 2000);
    };
  };

  function adicionarAoCarrinho(item: any) {
    const itemExistente = carrinho.find((i) => i.id === item.id && !i.isCustom);
    if (itemExistente) {
      const novoCarrinho = carrinho.map((i) => i.id === item.id ? { ...i, qtd: i.qtd + 1 } : i);
      setCarrinho(novoCarrinho);
    } else {
      setCarrinho([...carrinho, { 
          id: item.id, nome: item.nome, categoria: item.categoria, qtd: 1, precoNumerico: Number(item.preco), isCustom: false 
        }]);
    }
  }

  function handleAdicionarPizzaMontada(itemBuilder: any) {
    const novoItem = {
      id: Math.floor(Math.random() * 999999),
      nome: `Pizza: ${itemBuilder.sabores.join(" / ")}`,
      categoria: itemBuilder.tamanho,
      size: `${itemBuilder.sabores.length} Sabores`,
      precoNumerico: itemBuilder.preco,
      qtd: 1,
      isCustom: true
    };
    setCarrinho([...carrinho, novoItem]);
  }

  function removerDoCarrinho(index: number) {
    const novoCarrinho = [...carrinho];
    novoCarrinho.splice(index, 1);
    setCarrinho(novoCarrinho);
  }

  const subtotalProdutos = carrinho.reduce((acc, item) => acc + (item.precoNumerico * item.qtd), 0);
  const totalFinal = subtotalProdutos + taxaEntrega;

  async function finalizarPedido() {
    if (carrinho.length === 0) return alert("Carrinho vazio!");
    setProcessando(true);

    // 1. Prepara dados do cliente
    let nomeCliente = "Cliente Balcão";
    let enderecoCliente = "";
    let telefoneCliente = "";

    if (clienteSelecionado && clienteSelecionado !== "balcao") {
      const cli = clientes.find(c => c.id.toString() === clienteSelecionado);
      if (cli) {
          nomeCliente = cli.name;
          telefoneCliente = cli.phone || cli.telefone || "";
          const rua = cli.street || cli.rua || cli.address || cli.endereco || "";
          const numero = cli.number || cli.numero || "";
          const bairro = cli.neighborhood || cli.bairro || "";
          const complemento = cli.complement || cli.complemento || "";
          const partes = [];
          if (rua) partes.push(rua);
          if (numero) partes.push(numero);
          if (bairro) partes.push(bairro);
          if (complemento) partes.push(`(${complemento})`);
          enderecoCliente = partes.join(", ");
      }
    }

    const itensParaEnviar = carrinho.map(item => ({
      id: item.isCustom ? null : item.id,
      quantidade: item.qtd,
      preco: item.precoNumerico,
      obs: item.isCustom ? item.nome : "" 
    }));

    try {
      // 2. Registra a Venda no Banco (Tabela Vendas e Itens)
      const { data, error } = await supabase.rpc("finalizar_venda", {
        itens_json: itensParaEnviar,
        total_venda: totalFinal,
        nome_cliente: nomeCliente,
        taxa_entrega_valor: taxaEntrega,
        metodo_pgto: formaPagamento,
        pizzaria_id_param: sessao.pizzaria_id // Importante passar o ID da pizzaria se a function pedir
      });

      if (error) throw error;

      // 3. REGISTRA NO CAIXA (NOVO!)
      // Isso conecta a venda com o fechamento do caixa
      await supabase.from("caixa_movimentacoes").insert({
          pizzaria_id: sessao.pizzaria_id,
          sessao_id: sessao.id,
          tipo: "venda",
          valor: totalFinal,
          descricao: `Venda #${data?.venda_id || '?'} - ${formaPagamento}`
      });
      // Atualiza a lista de movimentos
      carregarMovimentacoes(sessao.id);

      // 4. Imprime
      const dadosVenda = {
        id: data?.venda_id || Math.floor(Math.random() * 10000),
        data: new Date().toLocaleString("pt-BR"),
        cliente: nomeCliente,
        endereco: enderecoCliente,
        telefone: telefoneCliente, 
        itens: carrinho,
        subtotal: subtotalProdutos,
        taxa: taxaEntrega,
        km: kmEntrega,
        total: totalFinal,
        pagamento: formaPagamento
      };
      
      setCarrinho([]); 
      setClienteSelecionado(""); 
      setFormaPagamento("Pix"); 
      setKmEntrega(0); 
      setTaxaEntrega(0);
      
      imprimirCupom(dadosVenda);

    } catch (error) {
      console.error("Erro ao vender:", error);
      alert("Erro ao processar venda.");
    } finally {
      setProcessando(false);
    }
  }

  // Filtros de Produtos
  const produtosFiltradosGeral = cardapio.filter(p => p.nome.toLowerCase().includes(buscaProduto.toLowerCase()));
  const listaGrandes = produtosFiltradosGeral.filter(p => p.categoria === 'pizza' || (p.tamanho === 'Grande' && !p.categoria));
  const listaBrotos = produtosFiltradosGeral.filter(p => p.categoria === 'broto' || p.tamanho === 'Broto' || p.nome.toLowerCase().includes("broto"));
  const listaBebidas = produtosFiltradosGeral.filter(p => p.categoria === 'bebida');

  const ProdutoCard = ({ prod }: { prod: any }) => (
    <Card className="cursor-pointer hover:border-red-500 hover:shadow-md transition-all active:scale-95 group" onClick={() => adicionarAoCarrinho(prod)}>
      <CardContent className="p-3 flex flex-col justify-between h-full">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="font-bold text-slate-800 text-sm leading-tight">{prod.nome}</h3>
          </div>
          <p className="text-xs text-slate-400 mt-1 truncate capitalize">{prod.categoria || prod.tamanho}</p>
        </div>
        <div className="mt-3 flex justify-between items-center">
          <span className="font-bold text-green-700">R$ {Number(prod.preco).toFixed(2).replace('.', ',')}</span>
          <div className="bg-slate-50 group-hover:bg-red-50 p-1.5 rounded-full text-slate-400 group-hover:text-red-500 transition-colors"><ShoppingCart size={14} /></div>
        </div>
      </CardContent>
    </Card>
  );

  // --- RENDERIZAÇÃO ---

  if (!isMounted || loadingSistema) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-slate-400"/></div>;

  // TELA DE CAIXA FECHADO
  if (!sessao) {
      return (
        <div className="flex items-center justify-center min-h-[80vh] bg-slate-50 p-4">
            <Card className="w-full max-w-md border-2 border-slate-200 shadow-xl">
                <CardHeader className="text-center bg-slate-50 rounded-t-xl pb-6">
                    <div className="mx-auto bg-green-100 p-3 rounded-full w-fit mb-2">
                        <Wallet size={32} className="text-green-700" />
                    </div>
                    <CardTitle className="text-2xl">Abrir Caixa</CardTitle>
                    <CardDescription>Inicie seu turno informando o fundo de troco.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                        <Label>Saldo Inicial (Fundo de Troco)</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-slate-500">R$</span>
                            <Input 
                                type="number" 
                                className="pl-9 text-lg font-bold" 
                                placeholder="0.00"
                                value={valorAbertura}
                                onChange={e => setValorAbertura(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button onClick={abrirCaixa} className="w-full bg-green-600 hover:bg-green-700 text-lg py-6">
                        Abrir Meu Caixa
                    </Button>
                </CardContent>
            </Card>
        </div>
      );
  }

  // TELA PRINCIPAL DO PDV (COM SESSÃO ABERTA)
  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.4))] overflow-hidden gap-4 p-4 bg-slate-50/50">
      
      {/* BARRA DE TOPO (Gerenciamento do Caixa) */}
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border shadow-sm shrink-0">
          <div className="flex items-center gap-2">
              <div className="bg-green-100 text-green-700 p-2 rounded-full"><CheckCircle size={18} /></div>
              <div>
                  <h1 className="font-bold text-slate-800 text-sm">Caixa Aberto</h1>
                  <p className="text-xs text-slate-500">Operador: {localStorage.getItem("usuario_nome")}</p>
              </div>
          </div>
          
          <Dialog open={modalCaixaOpen} onOpenChange={setModalCaixaOpen}>
              <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2 border-slate-300">
                      <Wallet size={16}/> Gerenciar Caixa
                  </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                  <DialogHeader><DialogTitle>Gerenciamento Financeiro</DialogTitle></DialogHeader>
                  <Tabs defaultValue="acoes" className="w-full mt-2">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="acoes">Movimentações</TabsTrigger>
                        <TabsTrigger value="extrato">Extrato do Turno</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="acoes" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* SANGRIA / SUPRIMENTO */}
                            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
                                <h3 className="font-bold text-sm flex items-center gap-2"><DollarSign size={16}/> Sangria / Suprimento</h3>
                                <div className="flex gap-2">
                                    <Button size="sm" variant={tipoMovimento === 'sangria' ? 'destructive' : 'outline'} className="flex-1" onClick={() => setTipoMovimento('sangria')}>Saída</Button>
                                    <Button size="sm" variant={tipoMovimento === 'suprimento' ? 'default' : 'outline'} className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setTipoMovimento('suprimento')}>Entrada</Button>
                                </div>
                                <Input placeholder="Valor (R$)" type="number" value={valorMovimento} onChange={e => setValorMovimento(e.target.value)} />
                                <Input placeholder="Motivo (Ex: Gelo)" value={descMovimento} onChange={e => setDescMovimento(e.target.value)} />
                                <Button className="w-full" size="sm" onClick={realizarMovimentacao}>Confirmar</Button>
                            </div>

                            {/* FECHAMENTO */}
                            <div className="border rounded-lg p-4 space-y-3 bg-red-50 border-red-100">
                                <h3 className="font-bold text-sm text-red-700 flex items-center gap-2"><Lock size={16}/> Fechar Caixa</h3>
                                <p className="text-xs text-red-600">Conte o dinheiro físico na gaveta e digite abaixo.</p>
                                <Label className="text-red-700">Valor em Gaveta</Label>
                                <Input type="number" placeholder="0.00" className="bg-white border-red-200" value={valorFechamento} onChange={e => setValorFechamento(e.target.value)} />
                                <Button variant="destructive" className="w-full" onClick={fecharCaixa}>Encerrar Dia</Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="extrato" className="max-h-[300px] overflow-y-auto">
                        <div className="space-y-2 pt-2">
                            {movimentacoes.map(m => (
                                <div key={m.id} className="flex justify-between items-center text-sm border-b pb-2">
                                    <div>
                                        <div className="font-medium">{m.descricao}</div>
                                        <div className="text-xs text-slate-500">{new Date(m.criado_em).toLocaleTimeString()}</div>
                                    </div>
                                    <div className={`font-bold ${['sangria', 'saida'].includes(m.tipo) ? 'text-red-500' : 'text-green-500'}`}>
                                        {['sangria', 'saida'].includes(m.tipo) ? '-' : '+'} R$ {m.valor.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>
                  </Tabs>
              </DialogContent>
          </Dialog>
      </div>

      <div className="flex flex-1 overflow-hidden gap-4">
        {/* ESQUERDA: CATÁLOGO */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white p-3 rounded-xl border shadow-sm flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <Input placeholder="Buscar sabor ou bebida..." className="pl-10 h-10" value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
            <Tabs defaultValue="grandes" className="flex-1 flex flex-col">
              <div className="p-3 border-b bg-slate-50">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="grandes" className="gap-2"><Pizza size={16}/> Grandes</TabsTrigger>
                  <TabsTrigger value="brotos" className="gap-2"><CircleDashed size={16}/> Brotos</TabsTrigger>
                  <TabsTrigger value="bebidas" className="gap-2"><Coffee size={16}/> Bebidas</TabsTrigger>
                </TabsList>
              </div>
              <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50">
                
                <TabsContent value="grandes" className="mt-0 h-full">
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      <Card 
                          className="cursor-pointer border-dashed border-2 border-green-300 bg-green-50 hover:bg-green-100 transition-all active:scale-95 flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]"
                          onClick={() => { setTipoMontagem('Grande'); setModalPizzaAberto(true); }}
                      >
                          <PlusCircle className="text-green-600 mb-2" size={32} />
                          <h3 className="font-bold text-green-800 text-sm">Montar Pizza</h3>
                          <p className="text-xs text-green-600">2 ou 3 Sabores</p>
                      </Card>
                      {listaGrandes.map(prod => <ProdutoCard key={prod.id} prod={prod} />)}
                  </div>
                </TabsContent>

                <TabsContent value="brotos" className="mt-0 h-full">
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      <Card 
                          className="cursor-pointer border-dashed border-2 border-green-300 bg-green-50 hover:bg-green-100 transition-all active:scale-95 flex flex-col items-center justify-center p-4 text-center h-full min-h-[100px]"
                          onClick={() => { setTipoMontagem('Broto'); setModalPizzaAberto(true); }}
                      >
                          <PlusCircle className="text-green-600 mb-2" size={32} />
                          <h3 className="font-bold text-green-800 text-sm">Montar Broto</h3>
                          <p className="text-xs text-green-600">Até 2 Sabores</p>
                      </Card>
                      {listaBrotos.map(prod => <ProdutoCard key={prod.id} prod={prod} />)}
                  </div>
                </TabsContent>
                
                <TabsContent value="bebidas" className="mt-0 h-full">
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {listaBebidas.map(prod => <ProdutoCard key={prod.id} prod={prod} />)}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* DIREITA: CAIXA */}
        <div className="w-96 bg-white border-l shadow-xl flex flex-col rounded-l-xl border-y border-slate-200">
          
          <div className="p-4 bg-slate-50 border-b space-y-3">
            <h2 className="font-bold text-lg flex items-center gap-2"><ShoppingCart className="text-red-600" size={20} /> Pedido Atual</h2>
            <Popover open={openCliente} onOpenChange={setOpenCliente}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openCliente} className="w-full justify-between h-9 bg-white text-sm">
                    {clienteSelecionado ? (clienteSelecionado === "balcao" ? "Cliente Balcão" : clientes.find((c) => c.id.toString() === clienteSelecionado)?.name) : "Selecionar Cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput placeholder="Nome ou telefone..." />
                    <CommandList>
                      <CommandEmpty>Não encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem value="balcao avulso" onSelect={() => { setClienteSelecionado("balcao"); setOpenCliente(false); }}><Check className={cn("mr-2 h-4 w-4", clienteSelecionado === "balcao" ? "opacity-100" : "opacity-0")}/> Cliente Balcão</CommandItem>
                        {clientes.map((cliente) => (
                          <CommandItem key={cliente.id} value={`${cliente.name} ${cliente.phone}`} onSelect={() => { setClienteSelecionado(cliente.id.toString()); setOpenCliente(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", clienteSelecionado === cliente.id.toString() ? "opacity-100" : "opacity-0")}/>
                            <div className="flex flex-col"><span>{cliente.name}</span><span className="text-xs text-slate-500">{cliente.phone}</span></div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {carrinho.length === 0 ? <div className="text-center text-slate-400 mt-10"><ShoppingCart size={40} className="mx-auto mb-2 opacity-20" /><p className="text-sm">Carrinho vazio</p></div> : 
              carrinho.map((item, index) => (
                <div key={index} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0">
                  <div>
                      <div className="font-medium text-slate-800 text-sm">{item.qtd}x {item.nome}</div>
                      <div className="text-xs text-slate-500 capitalize">{item.categoria} {item.size ? `- ${item.size}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-700 text-sm">R$ {(item.precoNumerico * item.qtd).toFixed(2).replace(".", ",")}</span>
                      <button onClick={() => removerDoCarrinho(index)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))
            }
          </div>

          <div className="p-4 bg-slate-900 text-white mt-auto rounded-bl-xl space-y-4">
            <div className="bg-slate-800 p-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300 text-sm"><Bike size={18} /> Entrega ({kmEntrega} Km)</div>
                <span className="font-bold text-green-400">R$ {taxaEntrega.toFixed(2).replace(".", ",")}</span>
            </div>

            <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>R$ {subtotalProdutos.toFixed(2).replace(".", ",")}</span></div>
                <div className="flex justify-between items-end border-t border-slate-700 pt-2 mt-2"><span className="text-slate-200">Total Final</span><span className="text-2xl font-bold">R$ {totalFinal.toFixed(2).replace(".", ",")}</span></div>
            </div>

            <div className="space-y-2 pt-2">
              <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-10"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Crédito">Crédito</SelectItem><SelectItem value="Débito">Débito</SelectItem></SelectContent>
              </Select>
              <Button disabled={processando} onClick={finalizarPedido} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold h-10">
                  {processando ? <Loader2 className="animate-spin" /> : <><CheckCircle size={18} className="mr-2" /> Finalizar</>}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {modalPizzaAberto && (
        <PizzaBuilder 
          pizzasDisponiveis={tipoMontagem === 'Broto' ? listaBrotos : listaGrandes}
          tamanhoNome={tipoMontagem}
          maxSabores={tipoMontagem === 'Broto' ? 2 : 3}
          onClose={() => setModalPizzaAberto(false)}
          onAddToCart={handleAdicionarPizzaMontada}
        />
      )}

    </div>
  );
}