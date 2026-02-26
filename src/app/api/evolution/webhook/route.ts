import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai"; // 👈 NOVO: Importando a biblioteca do Gemini

// 📍 FUNÇÃO DE CALCULAR DISTÂNCIA (Usando seu OpenStreetMap + OSRM)
async function calcularFrete(origem: string, destino: string, precoKm: number) {
  try {
    // 1. Coordenadas da Pizzaria (Origem)
    const urlOrigem = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origem)}&limit=1`;
    const resOrigem = await fetch(urlOrigem, { headers: { 'User-Agent': 'GestorPro/1.0' } });
    const dadosOrigem = await resOrigem.json();
    
    if (!dadosOrigem || dadosOrigem.length === 0) {
        return { sucesso: false };
    }
    const { lat: latOrigem, lon: lonOrigem } = dadosOrigem[0];

    // 2. Coordenadas do Cliente (Destino) - Adicionamos "Brasil" para focar a busca
    const buscaCliente = `${destino}, Brasil`;
    const urlCliente = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(buscaCliente)}&limit=1`;
    const resCliente = await fetch(urlCliente, { headers: { 'User-Agent': 'GestorPro/1.0' } });
    const dadosCliente = await resCliente.json();
    
    if (!dadosCliente || dadosCliente.length === 0) {
        return { sucesso: false };
    }
    const { lat: latCliente, lon: lonCliente } = dadosCliente[0];

    // 3. Calcula a Rota Real de carro (OSRM)
    const urlRota = `http://router.project-osrm.org/route/v1/driving/${lonOrigem},${latOrigem};${lonCliente},${latCliente}?overview=false`;
    const resRota = await fetch(urlRota);
    const dadosRota = await resRota.json();

    if (dadosRota.routes && dadosRota.routes.length > 0) {
      const metros = dadosRota.routes[0].distance;
      const distanciaKm = metros / 1000;
      const valorFrete = distanciaKm * precoKm;

      return {
        distancia: distanciaKm.toFixed(1),
        valorFrete: valorFrete.toFixed(2),
        sucesso: true
      };
    }
    return { sucesso: false };
  } catch (error) {
    console.error("Erro na API de Distância (Nominatim/OSRM):", error);
    return { sucesso: false };
  }
}

export async function POST(request: Request) {
  const API_KEY = process.env.EVOLUTION_API_KEY;
  const EVOLUTION_URL = process.env.EVOLUTION_API_URL;

  try {
    const body = await request.json();
    
    // 🚨 NOSSA CÂMERA DE SEGURANÇA AQUI:
    console.log("📥 DADO BRUTO RECEBIDO DA EVOLUTION:");
    console.log(JSON.stringify(body, null, 2));

    const remoteJid = body.data?.key?.remoteJid || "";

    // 🛡️ TRAVA DE SEGURANÇA MASTER
    // Ignora: mensagens de mim mesmo e tudo que NÃO for um chat privado padrão (@s.whatsapp.net)
    // Isso resolve o erro 400 bloqueando Grupos (@g.us), Status (@broadcast) e iPhones sincronizados (@lid)
    if (
      body.event !== "messages.upsert" || 
      body.data?.key?.fromMe ||
      !remoteJid.endsWith("@s.whatsapp.net")
    ) {
      console.log(`🛑 Mensagem ignorada pelo formato do ID de origem: ${remoteJid}`);
      return NextResponse.json({ ok: true });
    }

    const mensagemOriginal = body.data?.message?.conversation || 
                             body.data?.message?.extendedTextMessage?.text || "";
    const numeroCliente = remoteJid.split("@")[0];
    const instanceName = body.instance;

    // 1. Identificar a Pizzaria (SaaS Seguro)
    const pizzariaId = instanceName.split("_")[1];
    if (!pizzariaId) return NextResponse.json({ error: "Instância inválida" }, { status: 400 });

    // Buscar configurações da pizzaria para o frete
    const { data: configPizzaria } = await supabase
      .from("loja_config") // Ou "pizzarias", ajuste para o nome da sua tabela
      .select("endereco_base, preco_por_km, distancia_maxima")
      .eq("id", pizzariaId)
      .single();

    // 2. Buscar o Cliente
    let { data: cliente } = await supabase
      .from("clientes")
      .select("*")
      .eq("telefone", numeroCliente)
      .eq("pizzaria_id", pizzariaId)
      .single();

    let respostaIA = "";

    // 3. Lógica de Atendimento
    if (!cliente) {
      // Cria o cliente e pede o endereço
      await supabase.from("clientes").insert([{ 
        telefone: numeroCliente, 
        pizzaria_id: pizzariaId,
        fase_pedido: "aguardando_endereco" // Mudamos a fase aqui!
      }]);
      
      respostaIA = "Olá! Bem-vindo à nossa Pizzaria. 🍕 Para começarmos, você poderia me enviar o seu endereço com número ou o CEP para eu calcular a taxa de entrega?";
    
    } else if (cliente.fase_pedido === "aguardando_endereco") {
      // 🛵 O cliente respondeu o endereço, vamos calcular!
      if (configPizzaria && configPizzaria.endereco_base) {
        const resultado = await calcularFrete(
          configPizzaria.endereco_base, 
          mensagemOriginal, 
          configPizzaria.preco_por_km || 2 // R$ 2 por KM como padrão, se não tiver no banco
        );

        if (resultado.sucesso) {
          if (Number(resultado.distancia) > (configPizzaria.distancia_maxima || 15)) {
            respostaIA = `Poxa, vi que você está a ${resultado.distancia}km de nós. Infelizmente nossa entrega vai apenas até ${configPizzaria.distancia_maxima || 15}km. 😔`;
          } else {
            respostaIA = `Endereço localizado! 📍 Distância: ${resultado.distancia}km. A taxa de entrega fica R$ ${resultado.valorFrete}. \n\nAqui está nosso cardápio: [LINK DO CARDAPIO]. O que vai querer hoje?`;
            
            // Atualiza a fase do cliente
            await supabase.from("clientes").update({ 
              endereco: mensagemOriginal, 
              valor_entrega: resultado.valorFrete,
              fase_pedido: "escolhendo_produtos"
            }).eq("id", cliente.id);
          }
        } else {
          respostaIA = "Não consegui localizar esse endereço. Poderia conferir o nome da rua e número, ou enviar apenas o CEP?";
        }
      } else {
         respostaIA = "Nossa pizzaria ainda não configurou o endereço base no sistema para calcular o frete.";
      }

    } else {
      // 🧠 O CÉREBRO DO GEMINI ENTRA AQUI! 
      const apiKeyGemini = process.env.GEMINI_API_KEY;
      
      if (!apiKeyGemini) {
        respostaIA = "Nosso sistema de inteligência está em manutenção no momento. 🛠️";
      } else {
        const genAI = new GoogleGenerativeAI(apiKeyGemini);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

        const promptSistema = `
          Você é o atendente virtual super simpático da Letitona Pizzaria.
          O telefone do cliente atual é ${cliente.telefone}.
          Ele já informou o endereço: ${cliente.endereco} (O valor do frete dele deu R$ ${cliente.valor_entrega}).
          
          Regras:
          1. Seja curto, direto e use emojis (formato de mensagem de WhatsApp).
          2. Não invente sabores que não existem. Peça para ele aguardar o cardápio ou pergunte o que ele prefere.
          3. Nunca diga que você é uma IA, aja como um garçom humano.
          
          O cliente acabou de mandar esta mensagem: "${mensagemOriginal}"
          
          Como você responde?
        `;

        try {
          const resultado = await model.generateContent(promptSistema);
          respostaIA = resultado.response.text();
        } catch (erro) {
          console.error("❌ Erro no Gemini:", erro);
          respostaIA = "Desculpe, tive um pequeno branco aqui. Pode repetir o que você disse?";
        }
      }
    }

    // 4. Enviar a resposta via WhatsApp
    console.log(`🚀 Tentando enviar mensagem para: ${remoteJid}`);
    
    const respostaEnvio = await fetch(`${EVOLUTION_URL}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": API_KEY!
      },
      body: JSON.stringify({
        number: remoteJid, 
        text: respostaIA
      })
    });

    const jsonEnvio = await respostaEnvio.json();
    console.log("📬 Status do Envio na Evolution:", jsonEnvio);

    return NextResponse.json({ status: "SUCCESS" });
  } catch (error: any) {
    console.error("❌ Erro fatal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}