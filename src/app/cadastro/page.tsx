"use client";

import { Check, Pizza, Zap, Star, Crown, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const planos = [
  {
    nome: "Bronze",
    preco: "R$ 49",
    descricao: "Ideal para quem está começando.",
    icon: <Zap className="text-orange-500" size={32} />,
    recursos: ["Até 100 pedidos/mês", "Cardápio Digital", "Suporte via Email"],
    cor: "border-slate-200"
  },
  {
    nome: "Prata",
    preco: "R$ 99",
    descricao: "O melhor custo-benefício.",
    icon: <Star className="text-red-600" size={32} />,
    recursos: ["Pedidos ilimitados", "Gestão de Motoboys", "Relatórios Financeiros", "Suporte WhatsApp"],
    cor: "border-red-500 shadow-lg scale-105",
    destaque: true
  },
  {
    nome: "Ouro",
    preco: "R$ 199",
    descricao: "Para grandes redes de pizzaria.",
    icon: <Crown className="text-yellow-500" size={32} />,
    recursos: ["Múltiplas unidades", "API de Integração", "Consultoria de Gestão", "Suporte 24h"],
    cor: "border-slate-200"
  }
];

export default function PlanosPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4">
      {/* Botão para voltar para a Home */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link href="/" className="text-slate-500 hover:text-red-600 flex items-center gap-2 transition-colors w-fit">
          <ArrowLeft size={20} /> Voltar ao início
        </Link>
      </div>

      <div className="max-w-6xl mx-auto text-center mb-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Escolha o plano ideal para sua Pizzaria</h1>
        <p className="text-slate-600 text-lg">Comece agora e transforme a gestão do seu negócio.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
        {planos.map((plano) => (
          <Card key={plano.nome} className={`relative bg-white border-2 transition-all duration-300 ${plano.cor}`}>
            {plano.destaque && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold shadow-md">
                MAIS POPULAR
              </span>
            )}
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">{plano.icon}</div>
              <CardTitle className="text-2xl font-bold text-slate-800">{plano.nome}</CardTitle>
              <CardDescription>{plano.descricao}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-900">{plano.preco}</span>
                <span className="text-slate-500">/mês</span>
              </div>
              <ul className="space-y-3 text-left">
                {plano.recursos.map((rec) => (
                  <li key={rec} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check size={16} className="text-green-500 flex-shrink-0" /> {rec}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              {/* AQUI ESTÁ A MUDANÇA: O Link envolve o botão e manda para /cadastro/registro */}
              <Link href={`/cadastro/registro?plano=${plano.nome.toLowerCase()}`} className="w-full">
                <Button className={`w-full h-11 font-bold ${plano.destaque ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                  Assinar Plano {plano.nome}
                </Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}