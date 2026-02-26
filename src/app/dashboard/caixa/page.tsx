"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Search, ShoppingCart, Trash2, CheckCircle, ChevronsUpDown, 
  PlusCircle, Loader2, Wallet, User, Phone, X 
} from "lucide-react";

import PizzaBuilder from "@/components/PizzaBuilder"; 

// CONSTANTES FIXAS
const DISTANCIA_MINIMA = 5; 
const PRECO_KM_EXTRA = 1.00; 

export default function CaixaPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [loadingSistema, setLoadingSistema] = useState(true);
  
  // --- ESTADOS DO CAIXA ---
  const [sessao, setSessao] = useState<any>(null);
  const [valorAbertura, setValorAbertura] = useState("");
  const [modalCaixaOpen, setModalCaixaOpen] = useState(false);
  
  const [tipoMovimento, setTipoMovimento] = useState<"sangria" | "suprimento">("sangria");
  const [valorMovimento, setValorMovimento] = useState("");
  const [descMovimento, setDescMovimento] = useState("");
  const [valorFechamento, setValorFechamento] = useState("");
  const [movimentacoes, setMovimentacoes] = useState<any[]>([]);

  // --- ESTADOS DO PDV ---
  const [cardapio, setCardapio] = useState<any[]>([]);
  const [categoriasAbas, setCategoriasAbas] = useState<string[]>(["Pizza", "Bebida"]); 
  
  const [clientes, setClientes] = useState<any[]>([]);
  const [carrinho, setCarrinho] = useState<any[]>([]);
  const [taxaBase, setTaxaBase] = useState(5.00); 
  const [lojaConfig, setLojaConfig] = useState<any>({}); 
  
  // Busca de Produtos
  const [buscaProduto, setBuscaProduto] = useState("");
  
  // Busca de Clientes
  const [termoBuscaCliente, setTermoBuscaCliente] = useState("");
  
  const [formaPagamento, setFormaPagamento] = useState("Pix");
  const [openCliente, setOpenCliente] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>("");
  const [processando, setProcessando] = useState(false);
  const [kmEntrega, setKmEntrega] = useState(0); 
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [modalPizzaAberto, setModalPizzaAberto] = useState(false);
  const [tipoMontagem, setTipoMontagem] = useState<'Grande' | 'Broto'>('Grande');

  useEffect(() => { setIsMounted(true); }, []);

  const normalize = (str: string) => str ? str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

  useEffect(() => {
    async function carregarDadosIniciais() {
      setLoadingSistema(true);
      const storageId = localStorage.getItem("pizzaria_id");
      const pizzariaId = storageId ? Number(storageId) : null;
      const usuarioId = localStorage.getItem("usuario_id");

      if (!pizzariaId || !usuarioId) {
        setLoadingSistema(false);
        return;
      }

      try {
        const { data: sessaoAberta } = await supabase
          .from("caixa_sessoes")
          .select("*")
          .eq("pizzaria_id", pizzariaId)
          .eq("usuario_id", usuarioId)
          .eq("status", "aberto")
          .maybeSingle();

        setSessao(sessaoAberta);
        if (sessaoAberta) carregarMovimentacoes(sessaoAberta.id);

        const { data: itensCardapio } = await supabase
          .from("cardapio")
          .select("*")
          .eq("pizzaria_id", pizzariaId)
          .eq("ativo", true)
          .order("nome");
        
        setCardapio(itensCardapio || []);

        const { data: cli } = await supabase
            .from("customers")
            .select("*")
            .eq("pizzaria_id", pizzariaId)
            .order("name");
        
        setClientes(cli || []);

        const { data: config } = await supabase.from("loja_config").select("*").eq("id", pizzariaId).single();
        if (config) {
          setTaxaBase(Number(config.taxa_entrega_padrao));
          setLojaConfig(config);
          if (config.ordem_categorias && Array.isArray(config.ordem_categorias) && config.ordem_categorias.length > 0) {
             setCategoriasAbas(config.ordem_categorias);
          }
        }
      } catch (err) {
        console.error("Erro no carregamento:", err);
      } finally {
        setLoadingSistema(false);
      }
    }
    carregarDadosIniciais();
  }, []);

  const carregarMovimentacoes = useCallback(async (sessaoId: number) => {
      const { data } = await supabase.from("caixa_movimentacoes").select("*").eq("sessao_id", sessaoId).order("criado_em", { ascending: false });
      setMovimentacoes(data || []);
  }, []);

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
    if (error) alert("Erro ao abrir caixa: " + error.message);
    else setSessao(data);
  }

  async function fecharCaixa() {
    if (!valorFechamento) return alert("Informe o valor que está na gaveta!");
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
        // CORREÇÃO DA LINHA 163 AQUI:
        alert(`Caixa Fechado! \nQuebra de Caixa: R$ ${quebra.toFixed(2)}`);
        setSessao(null);
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

  useEffect(() => {
    if (clienteSelecionado === "balcao" || !clienteSelecionado) {
        setKmEntrega(0); setTaxaEntrega(0); return;
    }
    const clienteEncontrado = clientes.find(c => c.id.toString() === clienteSelecionado);
    if (clienteEncontrado) {
        const distancia = Number(clienteEncontrado.distance) || 0;
        setKmEntrega(distancia);
        let valorFrete = (distancia <= DISTANCIA_MINIMA) ? taxaBase : taxaBase + ((distancia - DISTANCIA_MINIMA) * PRECO_KM_EXTRA);
        setTaxaEntrega(valorFrete);
    }
  }, [clienteSelecionado, clientes, taxaBase]); 

  const imprimirCupom = (dadosVenda: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    const itensHtml = dadosVenda.itens.map((item: any) => `
        <tr>
            <td style="vertical-align: top;">${item.qtd}x</td>
            <td style="vertical-align: top;">${item.nome}${item.size ? `<br/><small><i>${item.size}</i></small>` : ''}</td>
            <td style="text-align: right; vertical-align: top;">${Number(item.precoNumerico * item.qtd).toFixed(2).replace('.', ',')}</td>
        </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <style>
            body { margin: 0; padding: 5px; font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 80mm; color: black; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .border-b { border-bottom: 1px dashed black; padding-bottom: 5px; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; }
            .flex { display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="center border-b">
            <div class="bold" style="font-size: 16px;">${lojaConfig.nome_loja || "PIZZARIA"}</div>
            <div>${lojaConfig.endereco || ""}</div>
            <div class="bold" style="margin-top:5px;">${dadosVenda.cliente === "Cliente Balcão" ? "VENDA BALCÃO" : "DELIVERY"}</div>
          </div>
          <div class="border-b">
            <div>Pedido: #${dadosVenda.id}</div>
            <div>Data: ${dadosVenda.data}</div>
            <div style="margin-top:5px;">Cliente: ${dadosVenda.cliente}</div>
            ${dadosVenda.telefone ? `<div>Tel: ${dadosVenda.telefone}</div>` : ''}
            ${dadosVenda.endereco ? `<div>End: ${dadosVenda.endereco}</div>` : ''}
          </div>
          <table>
            <thead><tr style="text-align:left;"><th>Qtd</th><th>Item</th><th style="text-align:right;">R$</th></tr></thead>
            <tbody>${itensHtml}</tbody>
          </table>
          <div style="border-top: 1px dashed black; margin-top:5px; padding-top:5px;">
            <div class="flex"><span>Subtotal:</span><span>R$ ${dadosVenda.subtotal.toFixed(2).replace('.', ',')}</span></div>
            ${dadosVenda.taxa > 0 ? `<div class="flex"><span>Entrega:</span><span>R$ ${dadosVenda.taxa.toFixed(2).replace('.', ',')}</span></div>` : ''}
            <div class="flex bold" style="font-size:14px; margin-top:5px;"><span>TOTAL:</span><span>R$ ${dadosVenda.total.toFixed(2).replace('.', ',')}</span></div>
          </div>
          <div class="center" style="margin-top:10px;">
            <div class="bold">Pgto: ${dadosVenda.pagamento}</div>
            <div style="margin-top:5px;">${lojaConfig.mensagem_rodape || "Obrigado!"}</div>
          </div>
        </body>
      </html>
    `;
    doc.open(); doc.write(htmlContent); doc.close();
    iframe.onload = () => { iframe.contentWindow?.print(); document.body.removeChild(iframe); };
  };

  function adicionarAoCarrinho(item: any) {
    const itemExistente = carrinho.find((i) => i.id === item.id && !i.isCustom);
    if (itemExistente) setCarrinho(carrinho.map((i) => i.id === item.id ? { ...i, qtd: i.qtd + 1 } : i));
    else setCarrinho([...carrinho, { id: item.id, nome: item.nome, categoria: item.categoria, qtd: 1, precoNumerico: Number(item.preco), isCustom: false }]);
  }

  function handleAdicionarPizzaMontada(itemBuilder: any) {
    setCarrinho([...carrinho, { id: Math.floor(Math.random() * 999999), nome: `Pizza: ${itemBuilder.sabores.join(" / ")}`, categoria: itemBuilder.tamanho, size: `${itemBuilder.sabores.length} Sabores`, precoNumerico: itemBuilder.preco, qtd: 1, isCustom: true }]);
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
          const partes = [];
          if (rua) partes.push(rua); if (numero) partes.push(numero); if (bairro) partes.push(bairro);
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
      const { data, error } = await supabase.rpc("finalizar_venda", {
        itens_json: itensParaEnviar,
        total_venda: totalFinal,
        cliente_nome: nomeCliente, 
        cliente_telefone: telefoneCliente,
        endereco_entrega: enderecoCliente,
        taxa_entrega_valor: taxaEntrega,
        metodo_pgto: formaPagamento,
        pizzaria_id_param: Number(sessao.pizzaria_id)
      });
      if (error) throw error;
      await supabase.from("caixa_movimentacoes").insert({
          pizzaria_id: sessao.pizzaria_id,
          sessao_id: sessao.id,
          tipo: "venda",
          valor: totalFinal,
          descricao: `Venda PDV - ${formaPagamento}`
      });
      carregarMovimentacoes(sessao.id);
      imprimirCupom({
        id: data?.venda_id || "000",
        data: new Date().toLocaleString("pt-BR"),
        cliente: nomeCliente,
        endereco: enderecoCliente,
        telefone: telefoneCliente, 
        itens: carrinho,
        subtotal: subtotalProdutos,
        taxa: taxaEntrega,
        total: totalFinal,
        pagamento: formaPagamento
      });
      setCarrinho([]); setClienteSelecionado(""); setFormaPagamento("Pix"); setKmEntrega(0); setTaxaEntrega(0);
      alert("Pedido finalizado!");
    } catch (error: any) {
      alert("Erro ao processar: " + error.message);
    } finally {
      setProcessando(false);
    }
  }

  const produtosFiltrados = cardapio.filter(p => normalize(p.nome).includes(normalize(buscaProduto)));
  const getProdutosPorCategoria = (catNome: string) => produtosFiltrados.filter(p => normalize(p.categoria) === normalize(catNome));
  const listaPizzasParaMontar = cardapio.filter(p => normalize(p.categoria) === 'pizza');
  const listaBrotosParaMontar = cardapio.filter(p => normalize(p.categoria) === 'broto');

  const clientesFiltrados = useMemo(() => {
      const termo = normalize(termoBuscaCliente);
      if (!termo) return clientes;
      return clientes.filter(c => {
          const nome = normalize(c.name);
          const telefone = c.phone ? c.phone.replace(/\D/g, "") : "";
          return nome.includes(termo) || telefone.includes(termo);
      });
  }, [clientes, termoBuscaCliente]);

  const ProdutoCard = ({ prod }: { prod: any }) => (
    <Card className="cursor-pointer hover:border-red-500 transition-all active:scale-95" onClick={() => adicionarAoCarrinho(prod)}>
      <CardContent className="p-3 flex flex-col justify-between h-full">
        <div><h3 className="font-bold text-sm">{prod.nome}</h3><p className="text-xs text-slate-400 truncate">{prod.categoria}</p></div>
        <div className="mt-3 flex justify-between items-center"><span className="font-bold text-green-700">R$ {Number(prod.preco).toFixed(2)}</span><ShoppingCart size={14} className="text-slate-300" /></div>
      </CardContent>
    </Card>
  );

  if (!isMounted || loadingSistema) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;

  if (!sessao) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center"><Wallet size={40} className="mx-auto text-green-600 mb-2"/><CardTitle>Abrir Caixa</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input type="number" placeholder="Valor Inicial R$" value={valorAbertura} onChange={e => setValorAbertura(e.target.value)} />
          <Button onClick={abrirCaixa} className="w-full bg-green-600 h-12">Iniciar Turno</Button>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden p-4 bg-slate-50 gap-4">
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2"><CheckCircle className="text-green-500"/><h1 className="font-bold">Caixa Aberto</h1></div>
        <Dialog open={modalCaixaOpen} onOpenChange={setModalCaixaOpen}>
          <DialogTrigger asChild><Button variant="outline"><Wallet className="mr-2" size={16}/> Gerenciar</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Gerenciamento de Caixa</DialogTitle></DialogHeader>
            <Tabs defaultValue="acoes">
              <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="acoes">Movimentos</TabsTrigger><TabsTrigger value="extrato">Extrato</TabsTrigger></TabsList>
              <TabsContent value="acoes" className="grid grid-cols-2 gap-4 mt-4">
                <div className="border p-4 rounded-lg space-y-3">
                  <h3 className="font-bold">Sangria / Suprimento</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant={tipoMovimento === 'sangria' ? 'destructive' : 'outline'} className="flex-1" onClick={() => setTipoMovimento('sangria')}>Saída</Button>
                    <Button size="sm" variant={tipoMovimento === 'suprimento' ? 'default' : 'outline'} className="flex-1" onClick={() => setTipoMovimento('suprimento')}>Entrada</Button>
                  </div>
                  <Input type="number" placeholder="Valor" value={valorMovimento} onChange={e => setValorMovimento(e.target.value)} />
                  <Input placeholder="Motivo" value={descMovimento} onChange={e => setDescMovimento(e.target.value)} />
                  <Button onClick={realizarMovimentacao} className="w-full">Confirmar</Button>
                </div>
                <div className="border p-4 rounded-lg space-y-3 bg-red-50">
                  <h3 className="font-bold text-red-700">Fechar Caixa</h3>
                  <Input type="number" placeholder="Valor em Gaveta" value={valorFechamento} onChange={e => setValorFechamento(e.target.value)} />
                  <Button variant="destructive" onClick={fecharCaixa} className="w-full">Encerrar</Button>
                </div>
              </TabsContent>
              <TabsContent value="extrato" className="max-h-64 overflow-auto">
                {movimentacoes.map(m => (<div key={m.id} className="flex justify-between border-b py-2"><div>{m.descricao}<br/><small>{new Date(m.criado_em).toLocaleTimeString()}</small></div><div className={m.tipo === 'sangria' ? 'text-red-500' : 'text-green-500'}>R$ {m.valor.toFixed(2)}</div></div>))}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-1 overflow-hidden gap-4">
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="bg-white p-3 rounded-xl border flex gap-4"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 text-slate-400" size={18}/><Input className="pl-10" placeholder="Buscar..." value={buscaProduto} onChange={e => setBuscaProduto(e.target.value)}/></div></div>
          <div className="flex-1 bg-white rounded-xl border overflow-hidden flex flex-col">
            <Tabs defaultValue={categoriasAbas[0] || "todos"} className="flex-1 flex flex-col">
              <div className="overflow-x-auto border-b">
                  <TabsList className="flex w-max m-3 h-auto p-1">
                      {categoriasAbas.map(cat => (
                          <TabsTrigger key={cat} value={cat} className="px-4 py-2">{cat}</TabsTrigger>
                      ))}
                      <TabsTrigger value="todos" className="text-xs bg-slate-200 data-[state=active]:bg-slate-800 data-[state=active]:text-white">TODOS</TabsTrigger>
                  </TabsList>
              </div>
              <div className="flex-1 overflow-auto p-3">
                {categoriasAbas.map(cat => (
                    <TabsContent key={cat} value={cat} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-0">
                        {normalize(cat) === 'pizza' && (
                            <Card className="cursor-pointer border-dashed border-2 border-green-300 bg-green-50 flex flex-col items-center justify-center p-4" onClick={() => { setTipoMontagem('Grande'); setModalPizzaAberto(true); }}><PlusCircle className="text-green-600 mb-1"/><span className="font-bold text-sm">Montar Pizza</span></Card>
                        )}
                        {normalize(cat) === 'broto' && (
                            <Card className="cursor-pointer border-dashed border-2 border-green-300 bg-green-50 flex flex-col items-center justify-center p-4" onClick={() => { setTipoMontagem('Broto'); setModalPizzaAberto(true); }}><PlusCircle className="text-green-600 mb-1"/><span className="font-bold text-sm">Montar Broto</span></Card>
                        )}
                        {getProdutosPorCategoria(cat).map(p => <ProdutoCard key={p.id} prod={p}/>)}
                        {getProdutosPorCategoria(cat).length === 0 && normalize(cat) !== 'pizza' && normalize(cat) !== 'broto' && (
                            <div className="col-span-full text-center text-slate-400 py-10 text-sm">Nenhum item nesta categoria.</div>
                        )}
                    </TabsContent>
                ))}
                <TabsContent value="todos" className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-0">
                    {produtosFiltrados.map(p => <ProdutoCard key={p.id} prod={p}/>)}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        <div className="w-96 bg-white border rounded-xl shadow-xl flex flex-col overflow-hidden">
          <div className="p-4 bg-slate-50 border-b space-y-3">
            <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={18}/> Pedido Atual</h2>
            <Popover open={openCliente} onOpenChange={setOpenCliente}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-9 text-sm">
                    {clienteSelecionado ? (clienteSelecionado === "balcao" ? "Cliente Balcão" : clientes.find(c => c.id.toString() === clienteSelecionado)?.name) : "Selecionar Cliente..."}
                    <ChevronsUpDown size={14}/>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3" align="start">
                <div className="space-y-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 text-slate-400" size={14} />
                        <Input placeholder="Buscar nome ou telefone..." value={termoBuscaCliente} onChange={(e) => setTermoBuscaCliente(e.target.value)} className="pl-8 h-9 text-sm" autoFocus />
                        {termoBuscaCliente && (<button onClick={() => setTermoBuscaCliente("")} className="absolute right-2 top-2.5 text-slate-400 hover:text-red-500"><X size={14}/></button>)}
                    </div>
                    <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1">
                        <div className="p-2 text-sm rounded cursor-pointer hover:bg-slate-100 flex items-center gap-2" onClick={() => { setClienteSelecionado("balcao"); setOpenCliente(false); }}><User size={14}/> Cliente Balcão</div>
                        {clientesFiltrados.length === 0 ? (<div className="text-center text-xs text-slate-400 py-4">Nenhum cliente encontrado</div>) : (
                            clientesFiltrados.map(c => (<div key={c.id} className="p-2 text-sm rounded cursor-pointer hover:bg-slate-100 border-b border-slate-50 last:border-0" onClick={() => { setClienteSelecionado(c.id.toString()); setOpenCliente(false); }}><div className="font-bold text-slate-700">{c.name}</div><div className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10}/> {c.phone || "Sem telefone"}</div></div>))
                        )}
                    </div>
                    <div className="text-[10px] text-center text-slate-300 border-t pt-1">Exibindo {clientesFiltrados.length} de {clientes.length} clientes</div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {carrinho.map((item, index) => (<div key={index} className="flex justify-between items-center text-sm border-b pb-1"><div><b>{item.qtd}x</b> {item.nome}</div><div className="flex items-center gap-2"><b>R$ {(item.precoNumerico*item.qtd).toFixed(2)}</b><button onClick={() => removerDoCarrinho(index)} className="text-red-400"><Trash2 size={12}/></button></div></div>))}
          </div>
          <div className="p-4 bg-slate-900 text-white space-y-4">
            <div className="flex justify-between text-sm"><span>Subtotal</span><span>R$ {subtotalProdutos.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span>Entrega</span><span>R$ {taxaEntrega.toFixed(2)}</span></div>
            <div className="flex justify-between text-xl font-bold border-t pt-2"><span>TOTAL</span><span>R$ {totalFinal.toFixed(2)}</span></div>
            <Select value={formaPagamento} onValueChange={setFormaPagamento}><SelectTrigger className="bg-slate-800 border-none"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="Pix">Pix</SelectItem><SelectItem value="Dinheiro">Dinheiro</SelectItem><SelectItem value="Crédito">Crédito</SelectItem><SelectItem value="Débito">Débito</SelectItem></SelectContent></Select>
            <Button disabled={processando} onClick={finalizarPedido} className="w-full bg-green-500 font-bold h-12">{processando ? <Loader2 className="animate-spin"/> : "Finalizar Pedido"}</Button>
          </div>
        </div>
      </div>
      {modalPizzaAberto && (<PizzaBuilder pizzasDisponiveis={tipoMontagem === 'Broto' ? listaBrotosParaMontar : listaPizzasParaMontar} tamanhoNome={tipoMontagem} maxSabores={tipoMontagem === 'Broto' ? 2 : 3} onClose={() => setModalPizzaAberto(false)} onAddToCart={handleAdicionarPizzaMontada} />)}
    </div>
  );
}