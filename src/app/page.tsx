"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pizza, ArrowRight, CheckCircle2, LayoutDashboard, Utensils } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navegação */}
      <nav className="flex items-center justify-between p-6 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Pizza className="text-red-600" size={32} />
          <span className="text-xl font-bold text-slate-800 tracking-tight">Pizza SaaS</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-slate-600">Entrar</Button>
          </Link>
          <Link href="/cadastro">
            <Button className="bg-red-600 hover:bg-red-700 text-white">Criar Conta</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
          O sistema de gestão para <br />
          <span className="text-red-600">Pizzarias Inteligentes</span>
        </h1>
        <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
          Controle seu estoque, pedidos, motoboys e tenha um cardápio digital moderno. 
          Tudo o que você precisa para crescer em um só lugar.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
          <Link href="/login">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 h-14 text-lg gap-2">
              Acessar meu Sistema <ArrowRight size={20} />
            </Button>
          </Link>
          <Link href="/cadastro">
            <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 px-8 h-14 text-lg">
              Cadastrar Pizzaria
            </Button>
          </Link>
        </div>

        {/* Features Rápidas */}
        <div className="grid md:grid-cols-3 gap-8 text-left mt-10">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <LayoutDashboard className="text-red-600 mb-4" size={30} />
            <h3 className="font-bold text-lg mb-2">Painel de Controle</h3>
            <p className="text-slate-500 text-sm">Visualize vendas e lucro em tempo real com gráficos intuitivos.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <Utensils className="text-red-600 mb-4" size={30} />
            <h3 className="font-bold text-lg mb-2">Cardápio Digital</h3>
            <p className="text-slate-500 text-sm">Seu cliente pede pelo celular e o pedido cai direto no seu caixa.</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <CheckCircle2 className="text-red-600 mb-4" size={30} />
            <h3 className="font-bold text-lg mb-2">Gestão de Motoboys</h3>
            <p className="text-slate-500 text-sm">Organize entregas e pagamentos de forma automatizada.</p>
          </div>
        </div>
      </main>

      <footer className="py-10 border-t border-slate-200 text-center text-slate-400 text-sm">
        © 2026 Pizza SaaS - Todos os direitos reservados.
      </footer>
    </div>
  );
}