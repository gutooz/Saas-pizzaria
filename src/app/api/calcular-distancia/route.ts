import { NextResponse } from "next/server";

const ORIGEM = "Rua Evaristo da Silva 113, Quitauna, Osasco - SP";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Agora pegamos os 3 pedaços separados
  const rua = searchParams.get("rua");
  const bairro = searchParams.get("bairro");
  const cidade = searchParams.get("cidade");

  if (!rua) {
    return NextResponse.json({ error: "Rua não informada" }, { status: 400 });
  }

  try {
    // 1. Pega coordenadas da PIZZARIA (Origem)
    const urlOrigem = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(ORIGEM)}&limit=1`;
    const resOrigem = await fetch(urlOrigem, { headers: { 'User-Agent': 'PizzaAdmin/1.0' } });
    const dadosOrigem = await resOrigem.json();

    if (!dadosOrigem[0]) throw new Error("Endereço da Pizzaria não encontrado.");
    const { lat: latOrigem, lon: lonOrigem } = dadosOrigem[0];

    // 2. Monta a busca PRECISA do Cliente
    // Ex: "Rua tal, Bairro tal, Osasco, Brasil"
    const buscaCliente = `${rua}, ${bairro || ""}, ${cidade || "Osasco"}, Brasil`;
    
    const urlCliente = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(buscaCliente)}&limit=1`;
    const resCliente = await fetch(urlCliente, { headers: { 'User-Agent': 'PizzaAdmin/1.0' } });
    const dadosCliente = await resCliente.json();

    if (!dadosCliente[0]) return NextResponse.json({ error: "Endereço não achado. Verifique o número." }, { status: 404 });
    const { lat: latCliente, lon: lonCliente } = dadosCliente[0];

    // 3. Calcula a Rota
    const urlRota = `http://router.project-osrm.org/route/v1/driving/${lonOrigem},${latOrigem};${lonCliente},${latCliente}?overview=false`;
    const resRota = await fetch(urlRota);
    const dadosRota = await resRota.json();

    if (dadosRota.routes && dadosRota.routes.length > 0) {
      const metros = dadosRota.routes[0].distance;
      const km = (metros / 1000).toFixed(1);

      return NextResponse.json({ distancia: km });
    } else {
      throw new Error("Rota não encontrada.");
    }

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: "Erro no mapa." }, { status: 500 });
  }
}