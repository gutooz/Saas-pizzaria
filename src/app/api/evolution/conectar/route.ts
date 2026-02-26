import { NextResponse } from "next/server";

// Função auxiliar para os Headers (evita repetição)
const getHeaders = (apiKey: string) => ({
  "Content-Type": "application/json",
  "apikey": apiKey,
  "Authorization": `Bearer ${apiKey}`
});

// --- NOVO MÉTODO GET: Para verificar o status sem gerar novo QR Code ---
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pizzariaId = searchParams.get("pizzariaId");
  
  const EVOLUTION_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, ""); 
  const API_KEY = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY;

  if (!pizzariaId || !API_KEY) {
    return NextResponse.json({ error: "Dados insuficientes" }, { status: 400 });
  }

  const instanceName = `pizzaria_${pizzariaId}_v6`;

  try {
    // Consulta o estado da instância na Evolution
    const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: getHeaders(API_KEY)
    });

    const data = await res.json();
    // Retorna o status real: "open", "connecting", "close", etc.
    return NextResponse.json({ status: data.instance?.state || data.state || "disconnected" });
  } catch (error) {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

// --- SEU MÉTODO POST ORIGINAL (COM MELHORIAS DE ESTABILIDADE) ---
export async function POST(request: Request) {
  const EVOLUTION_URL = process.env.EVOLUTION_API_URL?.replace(/\/$/, ""); 
  const API_KEY = process.env.EVOLUTION_API_KEY || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY;

  try {
    const { pizzariaId } = await request.json();

    if (!pizzariaId) {
      return NextResponse.json({ error: "ID da pizzaria é obrigatório" }, { status: 400 });
    }

    const instanceName = `pizzaria_${pizzariaId}_v6`;
    const headersAuth = getHeaders(API_KEY as string);

    console.log(`🚀 Iniciando processo para a instância: ${instanceName}`);

    // 1. Tenta CRIAR a instância primeiro
    const createRes = await fetch(`${EVOLUTION_URL}/instance/create`, {
      method: "POST",
      headers: headersAuth,
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      })
    });

    const createData = await createRes.json();
    console.log("📥 Resposta da Criação:", createData);

    // Se criou de primeira e já devolveu o QR Code
    if (createData?.qrcode?.base64 || createData?.base64) {
         return NextResponse.json({ 
            instance: instanceName, 
            qrCode: createData.qrcode?.base64 || createData.base64,
            status: "Aguardando Leitura"
        });
    }

    // 2. LOOP INSISTENTE
    console.log("⏳ Iniciando busca insistente do QR Code...");
    let tentativas = 0;

    while (tentativas < 5) {
        await new Promise(resolve => setTimeout(resolve, 2000)); 
        tentativas++;
        console.log(`📸 Tentativa ${tentativas} de buscar a imagem...`);

        const qrRes = await fetch(`${EVOLUTION_URL}/instance/connect/${instanceName}`, {
            method: "GET", 
            headers: headersAuth
        });
        
        const qrData = await qrRes.json();
        
        if (qrData?.base64 || qrData?.qrcode?.base64) {
            console.log("✅ QR Code recebido com sucesso!");
            return NextResponse.json({ 
                instance: instanceName, 
                qrCode: qrData.base64 || qrData.qrcode?.base64,
                status: "Aguardando Leitura" 
            });
        } else if (qrData?.instance?.state === "open" || qrData?.state === "open") {
            console.log("✅ O WhatsApp já está conectado!");
            return NextResponse.json({ instance: instanceName, status: "open" });
        }

        console.log("⚠️ A imagem ainda não estava pronta. Aguardando...");
    }

    return NextResponse.json({ error: "O WhatsApp demorou muito para gerar o QR Code." }, { status: 400 });

  } catch (error: any) {
    console.error("🚨 ERRO FATAL NA API:", error);
    return NextResponse.json({ error: "Erro interno: " + error.message }, { status: 500 });
  }
}