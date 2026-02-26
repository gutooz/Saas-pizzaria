import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Configuração do Supabase dentro da API
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // O frontend agora envia o endereço montado (Rua, Número, Bairro, Cidade) no parâmetro "rua"
  const enderecoCompleto = searchParams.get("rua");
  const pizzariaId = searchParams.get("pizzariaId");

  if (!enderecoCompleto || !pizzariaId) {
    return NextResponse.json({ error: "Dados insuficientes (Endereço ou ID da Pizzaria)" }, { status: 400 });
  }

  try {
    // 1. Busca o endereço da PIZZARIA no banco de dados
    const { data: loja } = await supabase
      .from("loja_config")
      .select("endereco")
      .eq("id", pizzariaId)
      .single();

    if (!loja || !loja.endereco) throw new Error("Pizzaria não encontrada ou sem endereço.");

    // 2. Coordenadas da Pizzaria (Origem)
    const urlOrigem = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(loja.endereco)}&limit=1`;
    const resOrigem = await fetch(urlOrigem, { headers: { 'User-Agent': 'GestorPro/1.0' } });
    const dadosOrigem = await resOrigem.json();
    
    if (!dadosOrigem || dadosOrigem.length === 0) {
        throw new Error("Endereço da Pizzaria não localizado no mapa.");
    }
    const { lat: latOrigem, lon: lonOrigem } = dadosOrigem[0];

    // 3. Coordenadas do Cliente (Destino)
    // Adicionamos ", Brasil" para garantir que a API não busque em outro país
    const buscaCliente = `${enderecoCompleto}, Brasil`;
    const urlCliente = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(buscaCliente)}&limit=1`;
    const resCliente = await fetch(urlCliente, { headers: { 'User-Agent': 'GestorPro/1.0' } });
    const dadosCliente = await resCliente.json();
    
    if (!dadosCliente || dadosCliente.length === 0) {
        return NextResponse.json({ error: "Endereço do cliente não encontrado." }, { status: 404 });
    }
    const { lat: latCliente, lon: lonCliente } = dadosCliente[0];

    // 4. Calcula a Rota Real (OSRM)
    const urlRota = `http://router.project-osrm.org/route/v1/driving/${lonOrigem},${latOrigem};${lonCliente},${latCliente}?overview=false`;
    const resRota = await fetch(urlRota);
    const dadosRota = await resRota.json();

    if (dadosRota.routes && dadosRota.routes.length > 0) {
      const metros = dadosRota.routes[0].distance;
      const km = (metros / 1000).toFixed(1);
      return NextResponse.json({ distancia: parseFloat(km) });
    } else {
      throw new Error("Não foi possível traçar uma rota entre os pontos.");
    }

  } catch (error: any) {
    console.error("Erro na API de distância:", error);
    return NextResponse.json({ error: error.message || "Erro no cálculo de distância." }, { status: 500 });
  }
}